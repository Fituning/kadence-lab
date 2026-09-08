# KadenceLab

PWA de suivi et d'entraînement pour trail (et triathlon à terme), avec synchronisation Google Health et programme d'entraînement généré par IA (import JSON, sans appel API dans un premier temps).

Cahier des charges complet : voir `cahier-des-charges-KadenceLab-v2.md`.

---

## Roadmap

Objectif : avoir une boucle fonctionnelle utilisable en conditions réelles le plus vite possible, quitte à ce que certaines étapes soient simplifiées au départ. Le reste (photos, exports, notifications) se fait **après**, pendant la prépa, sans pression.

### Semaine 1 — Fondations
- [ ] Setup Nuxt + Nitro + Drizzle + PostgreSQL + Docker Compose
- [ ] Modèle de données initial : `users`, `programs`, `planned_sessions`, `actual_sessions`, `assessments`
- [ ] Connexion Google Health API (OAuth + test de récupération d'une activité réelle)
- [ ] Import manuel d'un JSON de programme + affichage brut en liste
- [ ] Script de déploiement automatique : webhook sur push `main` → `git pull` + rebuild + redémarrage des conteneurs sur le serveur
- **Objectif fin semaine 1** : programme JSON importé et visible, Google Health connecté, déploiement automatisé sur push.

### Semaine 2 — Cœur fonctionnel
- [ ] Formulaire de ciblage (génération du prompt IA) + bouton "Copier la demande"
- [ ] Bilan `test_zones` : version simplifiée acceptable au départ (saisie manuelle assistée si le découpage auto complet prend trop de temps)
- [ ] Calendrier des séances prévues (vue simple)
- [ ] Rapprochement plan/réalisé — version simple d'abord (date + sport + durée)
- **Objectif fin semaine 2** : programme visible en calendrier, séances réelles synchronisées et rapprochées.

### Semaine 3 — Utilisable en vrai
- [ ] Questionnaire post-séance (questions systématiques uniquement)
- [ ] Moteur de règles basique : matrice FC×RPE + séances manquées — ACWR si le temps permet
- [ ] Dashboard minimal : courbe allure/FC + calendrier de complétion
- **Objectif fin semaine 3** : app utilisable pour la suite de la préparation.

### Ensuite, au fil de l'eau (sans deadline, pendant la prépa)
- [ ] Photos par séance + export PNG (séance et récap final)
- [ ] Notifications de rappel
- [ ] Mode hors-ligne minimal (consultation du jour)
- [ ] `test_hill`, retests comparés, ACWR affiné
- [ ] Flag automatique douleur récurrente
- [ ] Recalibration capteur
- [ ] Toggle "Programme adaptatif" (brut vs adapté)

### V3 (après la course)
- [ ] Triathlon (vélo/natation) fonctionnel
- [ ] Appel IA direct via API
- [ ] Suivi matériel (chaussures)
- [ ] Parsing GPX avancé

---

## Stack technique

- **Frontend** : Nuxt + Nuxt UI (Tailwind CSS v4 inclus)
- **Backend** : Nitro (server routes) + Drizzle ORM + PostgreSQL
- **PWA** : `@vite-pwa/nuxt`
- **Auth** : `nuxt-auth-utils` (session + OAuth Google)
- **Graphiques** : `nuxt-charts`
- **Carte (détail de séance)** : Leaflet + `@vue-leaflet/vue-leaflet`
- **Tracé (aperçus/liste)** : SVG dessiné à la main
- **Parsing GPX** : `gpxparser`
- **Export image** : `html-to-image`
- **Dates** : `date-fns`
- **Notifications push** : `web-push`
- **Tâches planifiées** : tâches natives Nitro (`scheduledTasks`)
- **Validation de schéma** : `zod`
- **Hébergement** : self-hosted, Docker Compose + Nginx Proxy Manager

Détail du setup et des choix de config : voir `/doc/setup-stack.md`.

---

## Variables d'environnement

À définir dans un fichier `.env` (non versionné) :

```
DATABASE_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NUXT_SESSION_PASSWORD=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

---

## Installation locale

```bash
pnpm install
docker compose up -d          # PostgreSQL
pnpm drizzle-kit push         # applique le schéma
pnpm dev
```

---

## Déploiement

Self-hosted via Docker Compose + Nginx Proxy Manager. Un webhook déclenché sur push vers `main` déclenche automatiquement un `git pull` + rebuild + redémarrage des conteneurs sur le serveur — pas de déploiement manuel (voir Semaine 1 de la roadmap).

---

## Documentation

- `cahier-des-charges-KadenceLab-v2.md` — spécifications fonctionnelles complètes (protocoles de bilan, moteur de règles, structure JSON du programme, etc.)
- `/doc/setup-stack.md` — détail de l'installation et de la configuration de chaque dépendance (généré lors du setup initial)