const { Router } = require('express');
const crypto = require('crypto');
const { query } = require('../../db/pool');
const { authenticate } = require('../../middleware/authenticate');
const asyncHandler = require('../../middleware/asyncHandler');
const { digitalUpload } = require('../../middleware/upload');
const { successResponse, paginationMeta } = require('../../utils/response');
const { parsePagination } = require('../../utils/pagination');
const { AppError, NotFoundError, BadRequestError, ForbiddenError, PaymentError } = require('../../utils/errors');
const { cloudinary, isCloudinaryEnabled, uploadBuffer } = require('../../services/cloudinary.service');
const paymentService = require('../payments/payment.service');
const logger = require('../../config/logger');

const router = Router();

// Commission Shopizi sur chaque vente de produit digital.
const COMMISSION_RATE = 0.05;
// Durée de validité du lien de téléchargement après achat.
const DOWNLOAD_TTL_HOURS = 48;

/**
 * multer expose une API callback ; asyncHandler attend une promesse.
 * Sans ce pont, une erreur multer (type interdit, fichier trop gros) serait
 * levée hors de la chaîne Express et ferait tomber le process.
 */
function runUpload(req, res) {
  return new Promise((resolve, reject) => {
    digitalUpload(req, res, (err) => (err ? reject(err) : resolve()));
  });
}

async function getShopIdOfUser(userId) {
  const res = await query('SELECT id FROM shops WHERE user_id = $1', [userId]);
  if (res.rows.length === 0) throw new ForbiddenError('Aucune boutique associée à ce compte');
  return res.rows[0].id;
}

/**
 * Catégorie Cloudinary du fichier, telle qu'affichée côté client (badge
 * PDF/VIDÉO/AUDIO/ZIP). Déduite du MIME type reçu à l'upload.
 */
function resolveFileType(mimetype) {
  if (mimetype === 'application/pdf') return 'pdf';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.includes('zip')) return 'zip';
  if (mimetype.includes('word')) return 'word';
  return 'autre';
}

/**
 * Cloudinary ne sait rendre la page d'un document que sur un asset stocké en
 * resource_type 'image' : les PDF y sont donc rangés là, les autres formats
 * restant en 'raw'.
 *
 * Le type retenu est enregistré en base (file_resource_type) et jamais redéduit
 * au téléchargement : les produits publiés avant ce changement ont leur PDF en
 * 'raw', et les relire en 'image' pointerait vers un asset inexistant.
 */
function resolveResourceType(fileType) {
  return fileType === 'pdf' ? 'image' : 'raw';
}

/**
 * Couverture = première page du document, rendue en JPEG par Cloudinary.
 *
 * Le rendu est récupéré via une URL signée (l'asset vendu est en diffusion
 * 'authenticated'), puis re-publié en image publique. Stocker directement
 * l'URL signée serait plus court, mais elle est calculée avec le secret API :
 * toute rotation du secret casserait les couvertures déjà en base.
 *
 * Un échec ici ne doit jamais empêcher la publication : on retombe sur l'icône
 * de type de fichier côté client.
 */
async function buildCoverFromFirstPage(uploaded, shopId) {
  // Cloudinary ne renvoie 'pages' que s'il a su paginer le document.
  if (!uploaded.pages) return null;
  try {
    const rendered = cloudinary.url(uploaded.public_id, {
      resource_type: 'image',
      type: 'authenticated',
      sign_url: true,
      format: 'jpg',
      page: 1,
      width: 400,
      height: 560,
      crop: 'fit', // 'fit' et non 'fill' : la page entière, sans rien rogner
      quality: 'auto',
    });
    const response = await fetch(rendered);
    if (!response.ok) {
      logger.warn(`Rendu de la page 1 refusé par Cloudinary (HTTP ${response.status}) pour ${uploaded.public_id}`);
      return null;
    }
    const cover = await uploadBuffer(Buffer.from(await response.arrayBuffer()), {
      folder: `shopizi/covers/${shopId}`,
    });
    return cover.secure_url;
  } catch (err) {
    logger.warn(`Couverture automatique impossible pour ${uploaded.public_id} : ${err.message}`);
    return null;
  }
}

// Upload d'un produit digital (marchand)
router.post('/upload', authenticate, asyncHandler(async (req, res) => {
  if (!isCloudinaryEnabled()) {
    throw new AppError('Stockage des fichiers indisponible (Cloudinary non configuré)', 503);
  }

  await runUpload(req, res);

  const file = req.file;
  if (!file) throw new BadRequestError('Fichier du produit requis');

  const { name, description, price_xof, category } = req.body;
  if (!name) throw new BadRequestError('Nom du produit requis');
  const price = parseInt(price_xof, 10);
  if (!Number.isInteger(price) || price <= 0) throw new BadRequestError('Prix invalide');

  const shopId = await getShopIdOfUser(req.user.userId);
  const fileType = resolveFileType(file.mimetype);
  const resourceType = resolveResourceType(fileType);

  // type: 'authenticated' (et non access_mode) : c'est le type de diffusion qui
  // rend l'asset inaccessible sans URL signée. Un asset 'upload' avec
  // access_mode 'authenticated' exige un cookie/token, pas une simple signature,
  // et nos liens de téléchargement signés ne fonctionneraient pas.
  const uploaded = await uploadBuffer(file.buffer, {
    folder: `shopizi/digital/${shopId}`,
    resource_type: resourceType,
    type: 'authenticated',
    use_filename: true,
    unique_filename: true,
    // uploadBuffer applique par défaut quality/fetch_format. Sans objet sur un
    // asset raw, mais sur un PDF stocké en 'image' cette transformation est
    // appliquée A L'UPLOAD : Cloudinary aplatit le document en PNG et le
    // fichier vendu n'est plus le PDF d'origine. Ne jamais retirer.
    transformation: undefined,
  });

  const coverUrl = await buildCoverFromFirstPage(uploaded, shopId);

  const result = await query(
    `INSERT INTO digital_products
       (shop_id, name, description, price_xof, file_url, file_public_id, file_type,
        file_resource_type, file_size_bytes, cover_image_url, category, is_published)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true) RETURNING *`,
    [
      shopId, name, description || null, price,
      uploaded.secure_url, uploaded.public_id, fileType, resourceType,
      file.size, coverUrl, category || null,
    ]
  );

  const product = result.rows[0];
  // Le fichier n'est servi que via un lien signé à l'achat : ne jamais exposer
  // l'URL brute ni le public_id Cloudinary.
  delete product.file_url;
  delete product.file_public_id;

  return successResponse(res, product, null, 201);
}));

// Marketplace publique
router.get('/marketplace', asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);
  const { category, q } = req.query;

  const filters = ['dp.is_published = true'];
  const params = [];

  if (category && category !== 'Tous') {
    params.push(category);
    filters.push(`dp.category = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    filters.push(`(dp.name ILIKE $${params.length} OR dp.description ILIKE $${params.length})`);
  }
  const where = `WHERE ${filters.join(' AND ')}`;

  const countRes = await query(`SELECT COUNT(*) FROM digital_products dp ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);

  const result = await query(
    `SELECT dp.id, dp.name, dp.description, dp.price_xof, dp.file_type,
            dp.file_size_bytes, dp.cover_image_url, dp.category, dp.total_sales,
            dp.created_at, s.name AS shop_name, s.subdomain AS shop_subdomain
     FROM digital_products dp
     JOIN shops s ON s.id = dp.shop_id
     ${where}
     ORDER BY dp.total_sales DESC, dp.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return successResponse(res, result.rows, paginationMeta(page, limit, total));
}));

// Achats digitaux du client connecté
router.get('/my-purchases', authenticate, asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT pu.id, pu.amount_paid, pu.download_token, pu.download_expires_at,
            pu.download_count, pu.payment_status, pu.created_at,
            dp.name AS product_name, dp.file_type, dp.cover_image_url,
            s.name AS shop_name
     FROM digital_purchases pu
     JOIN digital_products dp ON dp.id = pu.digital_product_id
     JOIN shops s ON s.id = dp.shop_id
     WHERE pu.customer_id = $1
     ORDER BY pu.created_at DESC`,
    [req.user.userId]
  );
  return successResponse(res, result.rows);
}));

// Produits digitaux du marchand connecté, avec ventes et revenus
router.get('/merchant/products', authenticate, asyncHandler(async (req, res) => {
  const shopId = await getShopIdOfUser(req.user.userId);
  const result = await query(
    `SELECT dp.id, dp.name, dp.description, dp.price_xof, dp.file_type,
            dp.file_size_bytes, dp.cover_image_url, dp.category, dp.is_published,
            dp.total_sales, dp.created_at,
            COUNT(pu.id) FILTER (WHERE pu.payment_status = 'completed') AS ventes,
            COALESCE(SUM(pu.merchant_amount) FILTER (WHERE pu.payment_status = 'completed'), 0) AS revenus_xof
     FROM digital_products dp
     LEFT JOIN digital_purchases pu ON pu.digital_product_id = dp.id
     WHERE dp.shop_id = $1
     GROUP BY dp.id
     ORDER BY dp.created_at DESC`,
    [shopId]
  );
  return successResponse(res, result.rows);
}));

// Détail d'un achat depuis son token, pour la page de téléchargement.
// Ne renvoie ni public_id ni URL Cloudinary : seulement de quoi afficher.
router.get('/purchase/:token', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT pu.payment_status, pu.download_expires_at, pu.download_count, pu.amount_paid,
            dp.name AS product_name, dp.file_type, dp.file_size_bytes, dp.cover_image_url,
            s.name AS shop_name
     FROM digital_purchases pu
     JOIN digital_products dp ON dp.id = pu.digital_product_id
     JOIN shops s ON s.id = dp.shop_id
     WHERE pu.download_token = $1`,
    [req.params.token]
  );
  if (result.rows.length === 0) throw new NotFoundError('Lien de téléchargement invalide');
  return successResponse(res, result.rows[0]);
}));

// Téléchargement via le token d'achat (le token EST le secret : pas d'auth)
router.get('/download/:token', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT pu.id, pu.payment_status, pu.download_expires_at,
            dp.file_public_id, dp.file_resource_type, dp.name
     FROM digital_purchases pu
     JOIN digital_products dp ON dp.id = pu.digital_product_id
     WHERE pu.download_token = $1`,
    [req.params.token]
  );
  if (result.rows.length === 0) throw new NotFoundError('Lien de téléchargement invalide');
  const purchase = result.rows[0];

  if (purchase.payment_status !== 'completed') {
    throw new PaymentError("Le paiement de cet achat n'est pas confirmé");
  }
  if (new Date(purchase.download_expires_at) < new Date()) {
    throw new AppError('Ce lien de téléchargement a expiré', 410);
  }

  // Lien Cloudinary signé, valable 1h : même si l'URL fuite, elle périme vite.
  // Le type de stockage est relu en base, jamais redéduit : les PDF publiés
  // avant la couverture automatique sont en 'raw' (cf. migration 040).
  // Un asset 'image' porte son extension dans le champ format et non dans le
  // public_id ; un asset 'raw' l'a déjà dans son public_id.
  const signedUrl = cloudinary.utils.private_download_url(
    purchase.file_public_id,
    purchase.file_resource_type === 'image' ? 'pdf' : '',
    {
      resource_type: purchase.file_resource_type,
      type: 'authenticated',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    }
  );

  await query('UPDATE digital_purchases SET download_count = download_count + 1 WHERE id = $1', [purchase.id]);

  return res.redirect(signedUrl);
}));

// Produits digitaux publiés d'une boutique
router.get('/shop/:shopId', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT id, name, description, price_xof, file_type, file_size_bytes,
            cover_image_url, category, total_sales, created_at
     FROM digital_products
     WHERE shop_id = $1 AND is_published = true
     ORDER BY created_at DESC`,
    [req.params.shopId]
  );
  return successResponse(res, result.rows);
}));

// Achat d'un produit digital
router.post('/:id/purchase', authenticate, asyncHandler(async (req, res) => {
  const productRes = await query(
    'SELECT * FROM digital_products WHERE id = $1 AND is_published = true',
    [req.params.id]
  );
  if (productRes.rows.length === 0) throw new NotFoundError('Produit digital introuvable');
  const product = productRes.rows[0];

  // digital_purchases.customer_email est NOT NULL et le token JWT ne porte pas
  // l'email : on le lit en base, avec repli sur l'email fourni par le client.
  const userRes = await query('SELECT email FROM users WHERE id = $1', [req.user.userId]);
  const email = userRes.rows[0]?.email || req.body.customer_email;
  if (!email) throw new BadRequestError('Email requis pour recevoir le lien de téléchargement');

  const commission = Math.round(product.price_xof * COMMISSION_RATE);
  const merchantAmount = product.price_xof - commission;
  const downloadToken = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + DOWNLOAD_TTL_HOURS * 60 * 60 * 1000);

  const purchaseRes = await query(
    `INSERT INTO digital_purchases
       (digital_product_id, customer_id, customer_email, amount_paid,
        shopizi_commission, merchant_amount, download_token, download_expires_at, payment_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending') RETURNING *`,
    [product.id, req.user.userId, email, product.price_xof, commission, merchantAmount, downloadToken, expiresAt]
  );
  const purchase = purchaseRes.rows[0];

  const payment = await paymentService.initiatePayment({
    type: 'digital_product',
    amount: product.price_xof,
    customerId: req.user.userId,
    shopId: product.shop_id,
    metadata: {
      purchase_id: purchase.id,
      digital_product_id: product.id,
      product_name: product.name,
      customer_phone: req.body.customer_phone || '',
    },
  });

  await query('UPDATE digital_purchases SET transaction_id = $1 WHERE id = $2', [payment.transaction_id, purchase.id]);

  logger.info(`Achat digital initié: ${product.name} (${payment.transaction_id})`);

  return successResponse(res, {
    purchase_id: purchase.id,
    payment,
    expires_at: purchase.download_expires_at,
    // En sandbox il n'y a pas de vraie page de paiement : on rend le token tout
    // de suite pour permettre le test de bout en bout.
    download_token: payment.mode === 'sandbox' ? downloadToken : undefined,
  }, null, 201);
}));

module.exports = router;
