# 📋 Spécification Frontend - Shopizi Dashboard

> **Pour IA frontend / développeur React/Vue/etc.**  
> **Backend:** API Node.js/Express - Shopizi (SaaS e-commerce pour commerçants Burkina Faso)  
> **Base URL API:** `http://localhost:3000/api/v1` (développement)  
> **Format réponse:** `{ success: bool, data: any, meta?: {...}, error?: {...} }`

---

## 🔐 Auth - JWT Bearer Token

Toutes les routes protégées requièrent : `Authorization: Bearer <access_token>`

**Token:**
- **Access token:** 15 minutes, stocké en mémoire
- **Refresh token:** 7 jours, stocké dans localStorage ou cookie httponly (au choix)

---

## 🧑‍💼 Types d'utilisateurs

| Rôle | Description |
|------|-------------|
| `merchant` | Commerçant classique (dashboard produits, commandes, etc.) |
| `admin` | Super-admin (accès panel admin complet) |

---

## 📄 PAGES & FLOWS COMPLETS

### 🔑 1. AUTHENTIFICATION (7 pages)

| # | Page | Route Frontend | API Endpoint | Méthode | Description |
|---|------|---------------|-------------|---------|-------------|
| 1.1 | **Login** | `/login` | `/auth/login` | `POST` | Email + password → retourne `{ accessToken, refreshToken, user }` |
| 1.2 | **Register** | `/register` | `/auth/register` | `POST` | Formulaire: `email`, `password`, `full_name`, `phone_number` |
| 1.3 | **Forgot Password** | `/forgot-password` | `/auth/forgot-password` | `POST` | Email → envoi lien reset |
| 1.4 | **Reset Password** | `/reset-password` | `/auth/reset-password` | `POST` | Token (depuis URL) + new password |
| 1.5 | **Logout** | (redirection) | `/auth/logout` | `POST` | Authentifié - invalid le refresh token |
| 1.6 | **Profile Settings** | `/settings/profile` | `GET /auth/me` + `PUT /auth/me` | - | Affichage et modification du profil |
| 1.7 | **Change Password** | `/settings/password` | `PUT /auth/me/password` | `PUT` | Current password + new password |

**Note Register:** La création de compte crée automatiquement un `shop` vide + abonnement `Free`.

---

### 🏪 2. SHOP / BOUTIQUE (5 pages vues)

| # | Page | Route Frontend | API Endpoint | Méthode | Description |
|---|------|---------------|-------------|---------|-------------|
| 2.1 | **My Shop** | `/shop` (ou `/dashboard`) | `GET /shops/my` | `GET` | Vue d'ensemble de la boutique |
| 2.2 | **Create Shop** | `/shop/create` | `POST /shops` | `POST` | Formulaire initial: `subdomain`, `name`, `category` (shop/restaurant/...), `whatsapp_number` |
| 2.3 | **Edit Shop** | `/shop/edit` | `GET /shops/my` + `PUT/PATCH /shops/my` | - | Modification des infos boutique: nom, description, couleurs, WhatsApp, etc. |
| 2.4 | **Publish Shop** | `/shop/publish` | `PATCH /shops/my/publish` | `PATCH` | Publier/dépublier la boutique en ligne |
| 2.5 | **Shop Stats** | `/shop/stats` | `GET /shops/my/stats` | `GET` | Statistiques du dashboard commerçant |
| 2.6 | **Custom Domain** (Pro+) | `/shop/domain` | `POST /shops/my/verify-domain` | `POST` | Vérification domaine personnalisé (Business plan) |

**Champs clés Shop:**
- `subdomain` (unique, ex: "maboutique")
- `name`, `description`, `category`, `whatsapp_number`
- `theme` (couleurs), `logo`, `banner`
- `is_published` (bool)
- Le mini-site public sera sur: `https://{subdomain}.shopizi.bf`

---

### 📦 3. PRODUITS (CRUD Complet - 6+ pages)

| # | Page | Route Frontend | API Endpoint | Méthode | Description |
|---|------|---------------|-------------|---------|-------------|
| 3.1 | **Product List** | `/products` | `GET /products` | `GET` | Liste paginée avec recherche/filtres |
| 3.2 | **Add Product** | `/products/new` | `POST /products` | `POST` | Formulaire création produit |
| 3.3 | **Edit Product** | `/products/:id/edit` | `GET /products/:id` + `PUT /products/:id` | - | Modification produit |
| 3.4 | **Product Detail** | `/products/:id` | `GET /products/:id` | `GET` | Vue détail du produit |
| 3.5 | **Upload Images** | Modal sur product form | `POST /products/:id/images` | `POST` | Upload multiple images (Multer) |
| 3.6 | **Manage Variants** | `/products/:id/variants` | `POST/PUT/DELETE /products/:id/variants/:vid` | - | Gestion tailles/couleurs/prix variant |

**Champs Produit:**
- `name`, `slug`, `description`, `price_xof` (int), `stock_quantity`, `status` (in_stock, out_of_stock...)
- `category_id`, `is_featured`, `sort_order`
- **Images:** upload via multipart/form-data, retourne URLs de 3 tailles (1200px, 400px, 200px)
- **Variants:** `attribute_name` (ex: "Couleur"), `attribute_value` (ex: "Rouge"), `price_adjustment_xof`, `stock_quantity`

**Limites par plan (afficher des upgrade prompts):**
- Free: 15 produits, 3 images/produit, 0 variantes
- Pro: 100 produits, 8 images/produit, 6 variantes
- Business: 500 produits, 20 images/produit, 50 variantes

---

### 🏷️ 4. CATÉGORIES (4 pages)

| # | Page | Route Frontend | API Endpoint | Méthode | Description |
|---|------|---------------|-------------|---------|-------------|
| 4.1 | **Category List** | `/categories` | `GET /categories` | `GET` | Liste avec compteur de produits |
| 4.2 | **Add Category** | `/categories/new` | `POST /categories` | `POST` | Nom, description, catégorie parente |
| 4.3 | **Edit Category** | `/categories/:id/edit` | `PUT /categories/:id` | `PUT` | Modification |
| 4.4 | **Delete** | (action) | `DELETE /categories/:id` | `DELETE` | Soft-delete (products deviennent sans catégorie) |

**Hierarchie:** Support parent/child (catégorie parente optionnelle).

---

### 📋 5. COMMANDES / ORDERS (5 pages)

| # | Page | Route Frontend | API Endpoint | Méthode | Description |
|---|------|---------------|-------------|---------|-------------|
| 5.1 | **Order List** | `/orders` | `GET /orders` | `GET` | Liste avec filtres (statut, recherche), pagination |
| 5.2 | **Order Detail** | `/orders/:id` | `GET /orders/:id` | `GET` | Détail commande + items |
| 5.3 | **Create Order** | `/orders/new` | `POST /orders` | `POST` | Création manuelle depuis le dashboard |
| 5.4 | **Update Status** | Modal | `PATCH /orders/:id/status` | `PATCH` | Changement de statut avec validation |
| 5.5 | **Order Stats** | `/orders/stats` | `GET /orders/stats` | `GET` | Compteur par statut (new, confirmed, etc.) |

**Workflow des statuts (avec validation de transition):**
```
new → confirmed → processing → ready → delivered → completed
      ↓              ↓          ↓         ↓
   cancelled     cancelled  cancelled  cancelled
```

---

### 💳 6. ABONNEMENTS / SUBSCRIPTIONS (4 pages)

| # | Page | Route Frontend | API Endpoint | Méthode | Description |
|---|------|---------------|-------------|---------|-------------|
| 6.1 | **Plans Page** | `/pricing` | `GET /subscriptions/plans` | `GET` | Public - comparatif 3 plans |
| 6.2 | **My Subscription** | `/subscription` | `GET /subscriptions/my` | `GET` | Statut, plan actuel, date expiration |
| 6.3 | **Subscribe/Upgrade** | Modal sur /pricing | `POST /subscriptions/subscribe` | `POST` | Choix plan (si payant → redirect paiement) |
| 6.4 | **Cancel Subscription** | Modal | `POST /subscriptions/cancel` | `POST` | Annulation (reste actif jusqu'à fin période) |
| 6.5 | **Usage Dashboard** | `/subscription/usage` | `GET /subscriptions/usage` | `GET` | Consommation vs limites du plan |

**3 Plans:**
| Plan | Prix/mois | Produits | Images/Prod | Variantes | Stockage | Extras |
|------|-----------|----------|-------------|-----------|----------|--------|
| **Gratuit** | 0 XOF | 15 | 3 | 0 | 50 MB | Basique |
| **Pro** | 7 500 XOF | 100 | 8 | 6 | 500 MB | Analytics, couleurs custom |
| **Business** | 20 000 XOF | 500 | 20 | 50 | 5 GB | Domaine custom, no branding, support prio |

---

### 💰 7. PAIEMENTS (3 pages)

| # | Page | Route Frontend | API Endpoint | Méthode | Description |
|---|------|---------------|-------------|---------|-------------|
| 7.1 | **Payment History** | `/payments/history` | `GET /payments/history` | `GET` | Historique paginé des transactions |
| 7.2 | **Initiate Payment** | `/payments/checkout` | `POST /payments/initiate` | `POST` | Choix méthode (Orange Money, Moov Money, CinetPay), téléphone |
| 7.3 | **Payment Status** | `/payments/:id/status` | `GET /payments/:id/status` | `GET` | Polling statut paiement |

**Note:** Le paiement mobile money envoie un push USSD au téléphone du client. Le frontend doit montrer un écran d'attente avec instructions.

---

### 📁 8. MÉDIA / UPLOADS (2 pages vues)

| # | Page | Route Frontend | API Endpoint | Méthode | Description |
|---|------|---------------|-------------|---------|-------------|
| 8.1 | **Media Library** | `/media` | `GET /media` | `GET` | Galerie de tous les fichiers uploadés |
| 8.2 | **Upload** | Modal | `POST /media/upload` | `POST` | Upload fichier (multipart/form-data) |
| 8.3 | **Storage Usage** | `/media/usage` | `GET /media/usage` | `GET` | Espace utilisé vs limite plan |

---

### 🌐 9. SITE / GÉNÉRATION (2 pages)

| # | Page | Route Frontend | API Endpoint | Méthode | Description |
|---|------|---------------|-------------|---------|-------------|
| 9.1 | **Generate Site** | `/site/generate` | `POST /sites/generate` | `POST` | Déclencer regénération manuelle du mini-site |
| 9.2 | **Generation Status** | `/site/status` | `GET /sites/status` | `GET` | Historique des générations (queued, running, success, failed) |

**Note:** Le mini-site public est généré automatiquement et servi sur le sous-domaine `https://{subdomain}.shopizi.bf`.

---

### 👨‍💼 10. ADMIN PANEL (4 pages - accès admin uniquement)

| # | Page | Route Frontend | API Endpoint | Méthode | Description |
|---|------|---------------|-------------|---------|-------------|
| 10.1 | **Admin Dashboard** | `/admin` | `GET /admin/dashboard` | `GET` | Stats globales: total merchants, MRR, nouveaux inscrits |
| 10.2 | **Merchants List** | `/admin/merchants` | `GET /admin/merchants` | `GET` | Liste paginée avec recherche, statut, plan |
| 10.3 | **Toggle Merchant** | (action) | `PATCH /admin/merchants/:id` | `PATCH` | Activer/désactiver un commerçant (`is_active`) |
| 10.4 | **Admin Payments** | `/admin/payments` | `GET /admin/payments` | `GET` | Tous les paiements pour reconciliation |

---

## 🔗 ENDPOINTS DÉTAILLÉS (RÉFÉRENCE)

### Auth
```
POST   /api/v1/auth/register              → { email, password, full_name, phone_number }
POST   /api/v1/auth/login                 → { email, password }
POST   /api/v1/auth/refresh               → { refreshToken }
POST   /api/v1/auth/logout                → Authentifié
POST   /api/v1/auth/forgot-password       → { email }
POST   /api/v1/auth/reset-password        → { token, newPassword }
GET    /api/v1/auth/me                    → Authentifié
PUT    /api/v1/auth/me                    → Authentifié (update profile)
PUT    /api/v1/auth/me/password           → Authentifié (change password)
```

### Shops
```
POST   /api/v1/shops                      → Authentifié (create)
GET    /api/v1/shops/my                   → Authentifié
PUT    /api/v1/shops/my                   → Authentifié (full update)
PATCH  /api/v1/shops/my                   → Authentifié (partial update)
PATCH  /api/v1/shops/my/publish           → Authentifié
POST   /api/v1/shops/my/verify-domain     → Authentifié + subscriptionGate
GET    /api/v1/shops/my/stats               → Authentifié
GET    /api/v1/shops/:subdomain/public       → Public (données pour générator)
```

### Products
```
GET    /api/v1/products                   → Authentifié (list, pagination)
POST   /api/v1/products                  → Authentifié + gate
GET    /api/v1/products/:id               → Authentifié
PUT    /api/v1/products/:id              → Authentifié
DELETE /api/v1/products/:id              → Authentifié
POST   /api/v1/products/:id/images        → Authentifié + gate
DELETE /api/v1/products/:id/images/:imgId  → Authentifié
PATCH  /api/v1/products/:id/images/:imgId/primary → Authentifié
POST   /api/v1/products/:id/variants      → Authentifié + gate
PUT    /api/v1/products/:id/variants/:vid → Authentifié
DELETE /api/v1/products/:id/variants/:vid → Authentifié
POST   /api/v1/products/reorder            → Authentifié
```

### Categories
```
GET    /api/v1/categories                 → Authentifié
POST   /api/v1/categories                → Authentifié + gate
GET    /api/v1/categories/:id              → Authentifié
PUT    /api/v1/categories/:id             → Authentifié
DELETE /api/v1/categories/:id            → Authentifié
```

### Orders
```
GET    /api/v1/orders                     → Authentifié (list, search, filter status)
POST   /api/v1/orders                    → Authentifié (create manual)
GET    /api/v1/orders/:id                → Authentifié
PATCH  /api/v1/orders/:id/status          → Authentifié (status change)
GET    /api/v1/orders/stats               → Authentifié
POST   /api/v1/orders/webhook             → Public (no auth, x-webhook-secret)
```

### Subscriptions
```
GET    /api/v1/subscriptions/plans          → Public
GET    /api/v1/subscriptions/my             → Authentifié
POST   /api/v1/subscriptions/subscribe      → Authentifié
POST   /api/v1/subscriptions/cancel         → Authentifié
GET    /api/v1/subscriptions/usage          → Authentifié
```

### Payments
```
POST   /api/v1/payments/initiate            → Authentifié
GET    /api/v1/payments/:id/status          → Authentifié
POST   /api/v1/payments/webhook/cinetpay    → Public (webhook externe)
GET    /api/v1/payments/history             → Authentifié
```

### Media
```
POST   /api/v1/media/upload                → Authentifié (multipart)
GET    /api/v1/media                        → Authentifié
DELETE /api/v1/media/:id                   → Authentifié
GET    /api/v1/media/usage                  → Authentifié
```

### Sites
```
POST   /api/v1/sites/generate             → Authentifié
GET    /api/v1/sites/status                 → Authentifié
```

### Admin
```
GET    /api/v1/admin/dashboard             → Admin only
GET    /api/v1/admin/merchants            → Admin only
PATCH  /api/v1/admin/merchants/:id         → Admin only
GET    /api/v1/admin/payments             → Admin only
```

---

## 🎨 UX/UI IMPORTANTES

### Barres de progression / Limites
- Afficher les limites du plan actuel dans les pages produits, catégories, médias
- Messages upgrade friendly: "*Vous utilisez 14/15 produits. Passez au plan Pro pour en ajouter plus.*"
- Bloquer les boutons d'ajout quand la limite est atteinte avec lien vers `/pricing`

### Paiement Mobile Money
- Écran d'attente après initiation avec instructions: "*Validez le paiement sur votre téléphone (USSD push)*"
- Polling toutes les 3 secondes sur `/payments/:id/status`
- 3 états: `pending` → `processing` → `completed` (ou `failed`)

### Commandes - Workflow Visuel
- Utiliser un stepper horizontal pour le statut de la commande
- Ne permettre que les transitions valides (voir ORDER_TRANSITIONS en backend)
- Boutons contextuels selon le statut actuel

### Génération du Mini-Site
- Bouton "Publier mon site" qui déclenche `/sites/generate`
- Toast/notification de statut (success/failed)
- Lien direct vers le mini-site public: `https://{subdomain}.shopizi.bf`

---

## 🏗️ ARCHITECTURE FRONTEND SUGGÉRÉE

### Layouts
```
- AuthLayout       (login, register, forgot-password, reset-password)
- DashboardLayout  (sidebar nav: Produits, Commandes, Boutique, Abonnement, Médias, Paramètres)
- AdminLayout      (sidebar nav: Dashboard, Merchants, Paiements)
- PublicLayout     (non applicable ici - c'est le mini-site généré)
```

### Structure de fichiers suggérée (React)
```
frontend/
  src/
    layouts/
      AuthLayout.tsx
      DashboardLayout.tsx
      AdminLayout.tsx
    pages/
      auth/
      dashboard/
      products/
      categories/
      orders/
      shop/
      subscription/
      payments/
      media/
      admin/
    components/
      common/
      forms/
      ui/
    hooks/
    services/
      api.ts         (Axios interceptor pour JWT + refresh)
    types/
      index.ts
```

### Gestion d'erreurs API standardisée
Le backend retourne toujours :  `{ success: false, data: null, error: { message: "...", statusCode: 400 } }`  
Gérer globalement : `401` → redirect login, `403` → forbidden, `429` → rate limit, etc.

### States d'abonnement importantes à afficher
- **Trial:** Bandeau orange "*X jours d'essai restants*"
- **Past_due:** Bandeau rouge "*Paiement en retard - renouvelez votre abonnement*"
- **Expired:** Redirection forcée vers `/pricing`
- **Cancelled:** Bandeau jaune "*Votre abonnement se termine le DD/MM/YYYY*"

---

## 📊 CHAMPS CLÉS PAR ENTITÉ

### User (Merchant)
```ts
interface User {
  id: string;           // UUID
  email: string;
  full_name: string;
  phone_number: string;
  role: 'merchant' | 'admin';
  is_active: boolean;
  created_at: string;
}
```

### Shop
```ts
interface Shop {
  id: string;           // UUID
  subdomain: string;    // ex: "maboutique"
  name: string;
  description?: string;
  category: 'shop' | 'restaurant' | 'pharmacy' | 'artisan' | 'service' | 'other';
  whatsapp_number: string;
  theme?: object;       // couleurs
  logo_url?: string;
  banner_url?: string;
  is_published: boolean;
  created_at: string;
}
```

### Product
```ts
interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price_xof: number;    // integer, prix en FCFA
  stock_quantity: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'on_order' | 'discontinued';
  category_id?: string;
  is_featured: boolean;
  sort_order: number;
  images: ProductImage[];
  variants: ProductVariant[];
}
```

---

## ⚠️ IMPORANT - GATES & ERREURS

Le backend retourne les erreurs de limite de plan avec un format spécifique :
```
HTTP 403 - { "success": false, "error": { "message": "Limite de produits atteinte (15/15)", "code": "SUBSCRIPTION_LIMIT" } }
```

Ces erreurs doivent être interceptées et affichées comme "Upgrade needed" avec un CTA vers la page de pricing.

---

*Document généré pour le développement des interfaces frontend du projet Shopizi.*
