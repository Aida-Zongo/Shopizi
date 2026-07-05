# Shopizi - Backend API & Site Generator

Plateforme SaaS permettant aux petits commerçants du Burkina Faso de crer une boutique en ligne en quelques minutes.

## Architecture

* API Node.js/Express - Auth, CRUD, payments, subscriptions
* Gnrateur Python - Gnre des mini-sites statiques via Jinja2
* PostgreSQL - Donnes structures
* Redis - Cache & Bull queues
* Nginx - Sous-domaines wildcard *..endswith

## Structure

```
shopizi/
  api/                # Backend Express.js
    src/              # Routes, services, middleware
  generator/          # Gnrateur Python de mini-sites
    src/templates/    # Templates Jinja2 (HTML/CSS)
  nginx/              # Config wildcard
  docker/             # docker-compose.yml
```

## Installation rapide

```bash
# 1. Backend
cd api
npm install
cp .env.example .env      # Configurer DB, JWT, SMTP, CinetPay
npm run migrate           # Cre les 15 tables
npm run seed              # Insre plans + templates email
npm run dev               # Lance le serveur (port 3000)

# 2. Gnrateur Python (optionnel, pour les mini-sites)
cd ../generator
pip install -r requirements.txt

# 3. PostgreSQL & Redis
docker compose -f docker/docker-compose.yml up -d
```

## Commandes de test

```bash
# Health check
curl http://localhost:3000/health

# Crer un compte
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@bf", "password":"test1234", "full_name":"Test", "phone_number":"+226XXXXXXX"}'

# Connexion
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@bf", "password":"test1234"}'

# Crer une boutique (ncessite le token de l'tape login)
curl -X POST http://localhost:3000/api/v1/shops \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"subdomain":"maboutique", "name":"Ma Boutique", "category":"shop", "whatsapp_number":"+226XXXXXXXX"}'
```

## Nginx (gnration des sites)

Configurer `nginx/nginx.conf` puis :

```bash
sudo cp nginx/nginx.conf /etc/nginx/sites-available/shopizi
sudo ln -s /etc/nginx/sites-available/shopizi /etc/nginx/sites-enabled/
sudo nginx -s reload
```

Le gnrateur crit dans `/var/www/shops/<subdomain>/` et Nginx les sert via les sous-domaines.

## Dploiement avec Docker

```bash
docker compose -f docker/docker-compose.yml up --build -d
```

## Fonctionnalits cls

* **Auth** : JWT, refresh tokens, reset password
* **CRUD** : Boutiques, produits, catgories, commandes
* **Uploads** : Images optimises avec Sharp (thumbnails 200/400/1200px)
* **Paiements** : CinetPay Mobile Money (Orange/Moov)
* **Plans** : Free, Pro (7500 FCFA/mois), Business (20000 FCFA/mois)
* **Emails** : Templates Handlebars + file d'attente Bull
* **Mini-sites** : Gnration Jinja2 + CSS mobile-first + WhatsApp

---

## Run in this project  

```cd
```
