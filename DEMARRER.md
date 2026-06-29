# Gaming Actions Web — Démarrage

## 1. Installer les dépendances
```bash
cd "Mes Projets/GamingActionsWeb"
npm install
```

## 2. Lancer en développement
```bash
npm run dev
```
Ouvre http://localhost:3000

## 3. Build production
```bash
npm run build
npm start
```

## 4. Déployer sur Vercel
```bash
npx vercel --prod
```
(Les variables .env.local sont déjà configurées avec les clés Firebase)

## Pages disponibles
- `/` — Feed vidéos
- `/rankings` — Classement
- `/auth` — Connexion / Inscription
- `/profile/[userId]` — Profil utilisateur
- `/video/[videoId]` — Lecteur vidéo + commentaires
- `/fanbox/[creatorId]` — Chat groupe FanBox
- `/creator` — Studio créateur (upload, analytics, annonces)
- `/subscription` — Plans Legendary
- `/search?q=...` — Recherche
