# Grem’s — E‑commerce Starter (Framer + Stripe + Supabase + Vercel)

Ce pack transforme ta maquette **Framer** en boutique prête à encaisser : panier côté Framer, paiement **Stripe**, commandes en **Supabase**, et **email** avec **lien magique** (page de suivi publique).

## Structure
```
api/                      # Fonctions serverless Vercel
  create-checkout-session.ts
  stripe-webhook.ts
  order.ts
framer/
  framer-ecommerce.tsx    # Code Component à coller dans Framer
sample/
  products.json           # Exemple de catalogue pour ProductGrid
supabase-schema.sql       # Schéma Postgres (Supabase)
.env.example              # Variables d'environnement (copie -> .env)
package.json, tsconfig.json, vercel.json
```

## Déploiement rapide
1. **Supabase** → DB vide, exécute `supabase-schema.sql`.
2. **Stripe** → récupère `STRIPE_SECRET_KEY`. Crée un **Webhook** `checkout.session.completed` vers `https://<ton-vercel>/api/stripe-webhook` et copie `STRIPE_WEBHOOK_SECRET`.
3. **Resend** → clé `RESEND_API_KEY`, valide le domaine d’envoi (ex: `orders@gremscookies.com`).
4. **Vercel** → déploie ce dossier. Ajoute **ENV** :  
   `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`,  
   `APP_BASE_URL`, `API_CORS_ORIGIN` (= ton domaine Framer), et côté **Framer** `NEXT_PUBLIC_API_BASE_URL`.
5. **Framer** → colle `framer/fram er-ecommerce.tsx` dans un Code Component. Utilise `CartProvider`, `ProductGrid`, `CheckoutButton`, `OrderStatus`.
6. **Pages Framer** : `/` (listing), `/panier` (CartDrawer), `/merci`, `/statut-de-commande` (OrderStatus).
7. Teste via Stripe **mode test** puis passe en live.

## Sécurité & vie privée
- Le lien de suivi contient un **token** non réversible (stocké hashé en DB).
- Les infos personnelles sont limitées à l’**email** pour l’envoi du lien.

Bon déploiement !
