const { Router } = require('express');
const { query } = require('../../db/pool');
const { successResponse } = require('../../utils/response');
const { BadRequestError } = require('../../utils/errors');
const rateLimit = require('express-rate-limit');

const router = Router();

// Strict rate limiter for Kèra AI (protects Gemini API quota)
const aiLimiter = rateLimit({
  windowMs: 60000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, data: null, error: { message: 'Trop de messages à Kèra. Réessayez dans 1 minute.', statusCode: 429 } },
});

// Post message to AI assistant
router.post('/chat', aiLimiter, async (req, res, next) => {
  try {
    const { message, city_name } = req.body;
    if (!message) {
      throw new BadRequestError('Le message est requis');
    }

    // Fetch all active products and shops
    const dbRes = await query(
      `SELECT p.id, p.name, p.price_xof, p.description, s.name AS shop_name, s.city_name, s.subdomain
       FROM products p
       JOIN shops s ON p.shop_id = s.id
       WHERE p.is_published = true AND s.is_published = true`
    );
    const products = dbRes.rows;

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      try {
        // Send request to Gemini API
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
        const systemInstruction = `Tu es Kèra, l'assistante shopping de Shopizi, la marketplace digitale du Burkina Faso. Tu aides les clients à trouver des produits chez les commerçants locaux. Tu parles français simplement, tu connais les villes du Burkina (Ouaga, Bobo, Koudougou, Banfora...). Tu ne parles JAMAIS d'autres plateformes. Tu retournes uniquement des produits pertinents avec leurs liens /shops/[subdomain].

Voici la liste en temps réel des produits disponibles sur Shopizi :
${JSON.stringify(products, null, 2)}

Instructions STRICTES :
1. PERTINENCE : Retourne UNIQUEMENT les produits dont le nom ou la catégorie correspond à ce que l'utilisateur demande. Ne retourne jamais de produits hors sujet. Si aucun produit ne correspond, dis-le clairement de manière amicale (ex: "C'est bon ! Mais je n'ai pas trouvé...").
2. GÉOGRAPHIE :
   - Extrais la ville mentionnée par l'utilisateur (ou utilise le contexte de ville : "${city_name || 'non spécifiée'}").
   - Affiche EN PREMIER les résultats dans la ville demandée.
   - Si tu proposes des produits situés dans une autre ville, ajoute OBLIGATOIREMENT la mention explicite : "⚠️ Cette boutique est à [Ville de la boutique] (livraison à confirmer)".
   - Si le client ne précise AUCUNE ville, tu DOIS préciser la ville de chaque produit proposé à côté de la boutique (ex: chez [Nom Boutique] (📍 [Ville])).
3. FORMAT DE RÉPONSE ATTENDU :
   Si ville demandée :
   1. [Nom Produit] - [Prix] FCFA chez [Nom Boutique] 👉 /shops/[subdomain]
   
   Si aucune ville demandée ou pour les autres villes :
   2. [Nom Produit] - [Prix] FCFA chez [Nom Boutique] (📍 [Ville de la boutique]) 👉 /shops/[subdomain]
4. LIENS : Le lien doit être EXACTEMENT /shops/[subdomain] — JAMAIS d'UUID, JAMAIS de tiret suivi de chiffres ou lettres aléatoires après le subdomain. Exemple CORRECT : /shops/kadi-modes. Exemple INTERDIT : /shops/kadi-modes-42d729f1.`;

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemInstruction}\n\nClient : ${message}` }]
              }
            ]
          })
        });

        const data = await response.json();
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
          const aiResponse = data.candidates[0].content.parts[0].text;
          return successResponse(res, { text: aiResponse, source: 'gemini' });
        }
      } catch (geminiErr) {
        console.error('Gemini API Error, falling back to local search engine:', geminiErr);
      }
    }

    // Fallback: Rule-based local semantic matcher
    // Normalize: remove accents, lowercase
    const normalizeText = (str) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const normalizedMessage = normalizeText(message);
    const keywords = normalizedMessage.split(/\s+/).filter(w => w.length > 2);
    // Extraire la ville potentielle du message
    const detectedCity = ['ouaga', 'ouagadougou', 'bobo', 'koudougou'].find(c => normalizedMessage.includes(c)) || city_name?.toLowerCase();
    
    let matchedProducts = [];

    // Simple search scoring
    for (const p of products) {
      let score = 0;
      const productNameNorm = normalizeText(p.name);
      const shopNameNorm = normalizeText(p.shop_name);
      const descNorm = normalizeText(p.description);
      const productCity = normalizeText(p.city_name);
      
      let hasKeywordMatch = false;
      for (const kw of keywords) {
        if (productNameNorm.includes(kw)) {
          score += 10; // High score for name match
          hasKeywordMatch = true;
        } else if (shopNameNorm.includes(kw) || descNorm.includes(kw)) {
          score += 2;
          hasKeywordMatch = true;
        }
      }
      
      // Only include if it actually matches what the user is asking
      if (!hasKeywordMatch && keywords.length > 0) continue;

      let isLocal = false;
      if (detectedCity) {
        if (productCity.includes(detectedCity) || (detectedCity === 'ouaga' && productCity.includes('ouagadougou'))) {
          score += 50; // Huge boost for same city
          isLocal = true;
        }
      }

      if (score > 0) {
        matchedProducts.push({ product: p, score, isLocal });
      }
    }

    // Sort by score
    matchedProducts.sort((a, b) => b.score - a.score);
    const topMatches = matchedProducts.slice(0, 4);

    let textResponse = '';
    if (topMatches.length > 0) {
      const localMatches = topMatches.filter(m => m.isLocal || !detectedCity);
      const remoteMatches = topMatches.filter(m => !m.isLocal && detectedCity);

      if (detectedCity && localMatches.length === 0) {
        textResponse = `Aucune boutique à ${detectedCity} pour ce produit, voici les plus proches :\n\n`;
      } else if (localMatches.length > 0) {
        textResponse = detectedCity ? `Résultats à ${detectedCity} :\n` : `Voici les produits trouvés :\n`;
        localMatches.forEach((m, idx) => {
          const p = m.product;
          const cityDisplay = detectedCity ? '' : ` (📍 ${p.city_name || 'Ville inconnue'})`;
          textResponse += `${idx + 1}. **${p.name}** - *${(p.price_xof || 0).toLocaleString()} FCFA* chez **${p.shop_name}**${cityDisplay} 👉 /shops/${p.subdomain}\n`;
        });
        textResponse += '\n';
      }

      if (remoteMatches.length > 0) {
        textResponse += `Autres villes :\n`;
        remoteMatches.forEach((m, idx) => {
          const p = m.product;
          textResponse += `${localMatches.length + idx + 1}. **${p.name}** chez **${p.shop_name}** ⚠️ ${p.city_name || 'Autre ville'} 👉 /shops/${p.subdomain}\n`;
        });
      }
    } else {
      textResponse = `Désolé, je n'ai trouvé aucun produit correspondant exactement à "${message}".`;
    }

    return successResponse(res, { text: textResponse, source: 'fallback' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
