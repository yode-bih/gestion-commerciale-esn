# Project TODO - Funnel Commercial ESN

## Authentication
- [x] Magic Link auth system (email-first)
- [x] Auto-approbation pour @rubix-consulting.com
- [x] Approbation manuelle admin pour autres domaines
- [x] Page Login (onglets Magic Link / Mot de passe / Inscription)
- [x] Page VerifyMagicLink (vérification token email)
- [x] Email service via Microsoft Graph API

## Database Schema
- [x] Table users (étendue avec password hash)
- [x] Table magic_links (tokens, expiration)
- [x] Table account_requests (demandes de compte)
- [x] Table quotation_status_weights (pondération statuts devis)
- [x] Table opportunity_status_weights (pondération statuts opportunités)
- [x] Table nicoka_sync_cache (cache données Nicoka)

## Backend - API Nicoka Integration
- [x] Service Nicoka : authentification JWT
- [x] Endpoint récupération devis (/quotations)
- [x] Endpoint récupération commandes (/orders)
- [x] Endpoint récupération opportunités (/opportunities)
- [x] Logique de dédoublonnage (opportunités sans devis/commande)
- [x] Calcul atterrissage CA avec pondérations

## Backend - Calcul d'atterrissage
- [x] Agrégation commandes (montant certain)
- [x] Agrégation devis pondérés par statut
- [x] Agrégation opportunités pondérées par statut (dédoublonnées)
- [x] Calcul atterrissage total = commandes + devis pondérés + opportunités pondérées
- [x] Simulation multi-années (2026+)
- [ ] Filtrage par client, commercial, période

## Frontend - Design & Layout
- [x] Design system Apple-inspired (violet/indigo, Inter, animations)
- [x] DashboardLayout avec sidebar navigation
- [x] Theme light cohérent

## Frontend - Dashboard
- [x] KPI cards (atterrissage, commandes, devis pondéré, opportunités pondéré)
- [x] Graphique funnel (barres horizontales brut vs pondéré)
- [x] Graphique composition atterrissage (donut)
- [x] Taux de conversion global
- [ ] Filtres (client, commercial, période, année)

## Frontend - Atterrissage détaillé
- [x] Tableaux détaillés commandes
- [x] Tableaux détaillés devis (sans commande)
- [x] Tableaux détaillés opportunités (dédoublonnées)

## Frontend - Simulation
- [x] Page simulation avec sliders de pondération
- [x] Comparaison actuel vs simulation (barres empilées)
- [x] Résultats simulés avec écart vs actuel

## Frontend - Administration
- [x] Page admin : gestion pondérations statuts devis (CRUD)
- [x] Page admin : gestion pondérations statuts opportunités (CRUD)
- [x] Page admin : approbation des demandes de compte

## Secrets & Configuration
- [x] NICOKA_API_TOKEN (JWT Nicoka)
- [x] NICOKA_SUBDOMAIN (rubix-consulting)
- [x] AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID, AZURE_MAIL_FROM

## Tests
- [x] Tests vitest funnel (calcul atterrissage, dédoublonnage, pondérations)
- [x] Tests vitest emailAuth (auto-approbation, magic token, URL building)
- [x] Tests vitest nicoka-token (validation API)
- [x] Tests vitest auth.logout

## Deployment
- [ ] Push vers GitHub (yode-bih/gestion-commerciale-esn)
- [ ] Configuration Vercel

## Admin Users
- [x] Ajouter yode.bih@rubix-consulting.com en admin
- [x] Ajouter maxime.chatelain@rubix-consulting.com en admin
