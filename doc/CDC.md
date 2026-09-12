# Cahier des charges — KadenceLab (PWA de suivi & entraînement trail)
*Version 6 — remplace la v5, conservée pour historique*

## Ce qui change par rapport à la v5

- **`programId`, `sessionId` et `stepId` retirés du JSON** (voir `programme-structure-v8.md`) : aucun n'est référencé ailleurs à l'intérieur du JSON, ils ne servaient qu'au suivi interne de l'app — désormais générés par l'app elle-même à l'import plutôt que par l'IA (évite tout risque de collision ou de format incohérent).
- **Nom du programme** : plus de champ JSON dédié, l'app le calcule à partir de `raceGoal.name` + année de la course, déjà connus avant l'appel à l'IA.
- **Exemple de rapport d'erreur (5.4) corrigé** : référence désormais la séance par sa position (semaine + jour) plutôt que par `sessionId`, qui n'existe plus.

---

## 1. Contexte et objectif

**KadenceLab** est une application personnelle (PWA) de préparation à une course de trail (24km / 700m D+), pensée pour être utilisable seul dans un premier temps, puis prêtable à d'autres utilisateurs sans refonte majeure.

Deux briques principales :
- **Suivi objectif** via synchronisation Google Health API (ex-Google Fit) pour récupérer les données réelles des sorties, analysées **après coup** — l'app ne pilote rien en temps réel, elle indique quoi faire avant la séance et analyse une fois la séance terminée et synchronisée.
- **Programme d'entraînement** généré par une IA externe (sans appel API/token pour le moment), sous forme d'un JSON structuré, importé dans l'app.

*Documents liés : `README.md` (roadmap et setup), `programme-structure-v8.md` (schéma JSON détaillé du programme).*

---

## 2. Lexique

| Terme | Définition |
|---|---|
| **FC** | Fréquence cardiaque, en battements par minute (bpm). |
| **Zone FC (Z1 à Z5)** | Découpage en 5 tranches d'intensité, propre à chaque utilisateur **et à son capteur** (voir 5.2 — ce n'est jamais une formule théorique générique). |
| **RPE** | *Rate of Perceived Exertion* — échelle de ressenti d'effort de 1 à 10, remplie par l'utilisateur après chaque séance. |
| **VAM** | Vitesse Ascensionnelle Moyenne — mètres de dénivelé positif grimpés par heure (m/h). |
| **D+ / D-** | Dénivelé positif / négatif cumulé, en mètres. |
| **Découplage cardiaque** | Sur un effort à allure stable, écart entre le ratio allure/FC de la 1ère et de la 2ème moitié de la sortie. Un faible découplage (<5%) traduit une bonne endurance fondamentale. |
| **ACWR** | Ratio charge aiguë (7j) / charge chronique (28j). Détecte un risque de surcharge (>1.5) ou de sous-entraînement (<0.8). |
| **Seuil (lactique)** | Intensité au-delà de laquelle l'effort devient difficile à tenir longtemps. |
| **Affûtage (taper)** | Réduction progressive du volume avant la course. |
| **Brick (triathlon)** | Enchaînement de deux disciplines sans pause. |
| **GPX** | Format standard de tracé GPS + profil altimétrique. |
| **Talk-test** | Méthode de repère d'intensité basée sur la capacité à parler pendant l'effort (phrases complètes → essoufflé → silence forcé). |

*Lexique détaillé des zones Z1-Z5 (repères perceptifs, à afficher côté app) : voir `programme-structure-v8.md`, section 8.*

---

## 3. Utilisateurs et périmètre

- **Périmètre initial** : usage personnel, un seul profil.
- **Périmètre cible** : multi-utilisateurs — chaque utilisateur a son propre compte, sa propre connexion Google Health, ses propres bilans et programmes. Modèle de données pensé multi-user **dès le MVP**.
- Sports couverts à terme : course à pied (trail), vélo, natation (triathlon) — seuls les types de séances sont posés dès maintenant ; intégration fonctionnelle complète en itération ultérieure.

---

## 4. Architecture technique

- **Frontend** : Nuxt (`@vite-pwa/nuxt` pour PWA — installable, notifications, cache offline ciblé)
- **Backend** : Nuxt/Nitro (server routes) + **Drizzle ORM** + PostgreSQL, plutôt qu'un CMS headless séparé (Directus/Strapi), pour garder la logique métier custom (moteur de règles, rapprochement plan/réalisé, validation du schéma JSON, découpage du bilan) directement en TypeScript, typée de bout en bout.
    - Alternatives envisagées : **Prisma** (plus complet mais plus lourd, moins adapté à un self-host léger) ; **Kysely** (plus bas niveau, moins d'outillage prêt à l'emploi) ; **db0** (couche native Nuxt/Nitro, encore jeune). Drizzle retenu pour l'équilibre simplicité/typage/outillage.
- **Hébergement** : self-hosted, Docker Compose + Nginx Proxy Manager
- **Stockage fichiers** (photos, exports PNG) : volume Docker ou S3-compatible (MinIO)
- **Intégration externe** : Google Health API (REST)
- **Génération du programme** : hors app pour le moment, prompt copié vers une IA externe → import du JSON produit. Évolution prévue vers un appel API direct (V3).

**Modules/librairies retenus :**
- `@nuxt/ui` (inclut Tailwind CSS v4, personnalisable via tokens `@theme`)
- `@nuxtjs/i18n` (langue)
- `@vite-pwa/nuxt` (PWA)
- `@nuxt/image` (images optimisées)
- `nuxt-charts` (graphiques — courbes allure/FC, VAM, charge hebdo)
- `leaflet` + `@vue-leaflet/vue-leaflet` (carte détaillée d'une séance)
- Tracé en aperçu/liste : SVG dessiné à la main (pas de dépendance carte pour les mini-vignettes, cohérent avec le style épuré des graphiques)
- `nuxt-auth-utils` (authentification, session + OAuth Google)
- `drizzle-orm` + `drizzle-kit` (accès base de données)
- `zod` (validation du schéma JSON du programme importé, 5.4)
- `gpxparser` (extraction D+/D-, pente, points de tracé depuis un GPX, 5.3)
- `html-to-image` (export PNG "story", 5.8/5.10)
- `date-fns` (manipulation de dates/semaines — ACWR, fenêtres de tolérance, retests)
- `web-push` (envoi effectif des notifications, 5.11)
- Déclenchement planifié des rappels/calculs hebdo : tâches planifiées natives de Nitro (`scheduledTasks`), pas de dépendance externe
- **Stockage des photos** : volume Docker local pour le MVP (bascule possible vers Google Cloud Storage plus tard si besoin)

---

## 5. Fonctionnalités détaillées

### 5.1 Comptes & profils utilisateurs
- **Authentification** : connexion via compte Google (OAuth login), distincte de l'autorisation Google Health API qui est demandée séparément dans le flow (un utilisateur peut se connecter à l'app sans forcément autoriser Google Health tout de suite).
- **Onboarding** : libre-service — n'importe qui peut créer un compte et utiliser l'app directement, sans invitation ni validation manuelle.
- Isolation stricte des données entre comptes.
- Chaque profil stocke : ses zones FC personnelles, son bilan, son capteur, ses programmes, son historique.

### 5.2 Bilan initial — protocole complet (`test_zones`)

**Principe fondamental** : le test ne vérifie pas si la FC affichée par la montre est "juste" par rapport à une formule théorique (220-âge etc.). Il **cartographie ce que TA montre affiche réellement** pendant un effort d'intensité connue et reconnaissable. Si le capteur affiche 170bpm pendant un effort clairement Z2 (respiration nasale, aucune gêne), alors la Z2 de cet utilisateur, avec ce capteur, **est** 160-175bpm — même si une formule théorique donnerait autre chose. Le programme utilisera toujours cette plage mesurée, jamais une plage théorique générique. C'est cette philosophie qui justifie tout le protocole ci-dessous.

**L'app n'utilise jamais la classification de zones calculée automatiquement par Google Health** (leur découpage en 4 zones — basse/modérée/intense/max — repose sur une formule générique qui peut être largement décalée par rapport à la réalité physiologique de l'utilisateur, exactement le problème que ce protocole cherche à éviter). Seul le flux brut FC/GPS seconde par seconde est récupéré depuis Google Health ; les zones 1 à 5 utilisées dans tout KadenceLab sont exclusivement calculées à partir de ce protocole.

**Avant de commencer** : terrain plat dégagé, repos les 24-48h précédentes si possible. *Avertissement : ce test comprend un effort maximal court. En cas d'antécédents cardiaques, de reprise de sport après une longue pause, ou de doute, consulter un médecin avant de le faire. Arrêter immédiatement en cas de douleur thoracique, vertige ou malaise.*

**Déroulé (ordre strict, à suivre à la lettre) :**

| # | Phase | Durée totale | Fenêtre exploitée pour le calcul | Instruction affichée dans l'app | Zone capturée |
|---|---|---|---|---|---|
| 1 | Échauffement | 8-10 min | — (non exploitée) | Marche puis trottinement progressif, mobilisations chevilles/genoux/hanches | — |
| 2 | FC repos actif | 2 min | 2 min entières | Marche normale | Référence basse |
| 3 | Palier nasal | **6 min** | dernières ~4,5 min (exclusion des 90 premières sec, le temps que la FC se stabilise) | Cours à allure basse/moyenne, en respirant uniquement par le nez, bouche fermée. Si tu dois ouvrir la bouche, ralentis | **Z2** |
| 4 | Transition | 1-2 min | — | Marche, redescente douce | — |
| 5 | Palier soutenu | **3 min** | dernières ~90 sec (exclusion des 60-75 premières sec) | Rythme difficile à tenir, impossible de dire plus de 2-3 mots d'affilée | **Z4** |
| 6 | Récupération active | 5 min | dernières 3 min | Marche rapide, pour revenir au calme en bougeant | Z1 "en mouvement" |
| 7 | Effort maximal | **1 min (objectif), 30 sec minimum** | dernières ~15-20 sec si l'effort dure 30 sec, dernières ~40-45 sec s'il dure la minute complète (exclusion des 10-15 premières sec de montée en régime dans tous les cas) | Vitesse la plus rapide que tu peux maintenir, en visant 1 minute complète. Si tu ne tiens pas jusqu'au bout, arrête-toi dès que tu craques — même 30 secondes suffisent, le résultat sera juste un peu moins précis. Ce n'est pas un sprint de départ mais un effort maximal soutenu sur la durée. Stop immédiat en cas de vertige ou malaise | **Z5** |
| 8 | Retour au calme | 5-8 min | — | Marche + étirements légers | — |

**Zone 3** : non testée directement — trop peu de repère perceptif fiable entre Z2 et Z4 pour un protocole autonome. Elle est **interpolée mathématiquement** entre le haut de Z2 et le bas de Z4 mesurés par ce même test. C'est la pratique standard et ça évite de demander à l'utilisateur de "doser" une nuance qu'il ne peut pas ressentir clairement.

**Segmentation des phases (après synchronisation Google Health)** :
1. **Lap de montre** si disponible dans les données Google Health (utilisé en priorité s'il existe, mais non requis — l'utilisateur n'a pas à s'en préoccuper).
2. **Détection de changement de rythme soutenu** en fallback : l'app repère les ruptures d'allure significatives et durables (pas un pic isolé) dans la courbe.
3. **Écran de validation systématique** dans tous les cas : la courbe FC/allure est affichée avec les bornes détectées superposées, ajustables au doigt si l'auto-détection s'est trompée.

**Traitement des artefacts capteur** : la détection ne sert **qu'à repérer les sauts brusques ponctuels à l'intérieur d'une phase** (ex : un pic isolé à 210bpm au milieu d'un palier stable à 165bpm = artefact GPS/optique à exclure du calcul). Elle ne sert **jamais** à juger si la moyenne globale d'un palier "a du sens" par rapport à une formule théorique — ce serait contraire au principe fondamental énoncé plus haut. Le calcul par palier utilise la **médiane** (plus robuste qu'une moyenne aux valeurs aberrantes) sur la fenêtre exploitée, après exclusion des sauts ponctuels.

**Résultat exploitable** : pour chaque palier, un couple **FC médiane stabilisée × allure moyenne** sur la fenêtre retenue. C'est ce couple, stocké par palier et par bilan, qui alimente le graphe de progression du dashboard (5.7) — permettant de voir, par exemple, qu'à allure égale (5:34 min/km) la FC a baissé de 5bpm quatre semaines plus tard. Une **FC de récupération à 60 secondes** après la fin du palier Z5 (pendant le retour au calme) est également capturée — marqueur cardiovasculaire classique, gratuit à extraire puisque cette phase suit déjà immédiatement le Z5 dans le protocole.

**Bilan sans capteur FC** : le protocole fonctionne à l'identique pour un utilisateur qui ne s'entraîne qu'avec un GPS/téléphone — les mêmes instructions (respiration nasale, talk-test, effort maximal) s'appliquent, seule l'**allure** est alors obligatoire par palier, la FC devient `null`. Le système de zones 1-5 reste inchangé pour tout le monde (le programme continue de parler en "Z2"/"Z4" comme d'habitude) ; c'est uniquement le **signal utilisé pour vérifier si une séance réelle respecte sa cible** (moteur de règles, section 7) qui bascule sur l'écart d'allure plutôt que l'écart de FC quand aucune FC n'est disponible.

**Capteur & recalibration** : chaque bilan stocke le type de capteur utilisé (montre optique / ceinture pectorale / aucun, GPS seul / modèle). En cas de changement de matériel, l'utilisateur peut relancer ce même protocole, marqué comme **recalibration** plutôt que comme nouveau bilan initial — l'historique des bilans reste cohérent, et le dashboard peut distinguer visuellement un vrai progrès d'un simple changement d'appareil.

**Calcul des plages de zones à partir des 3 points mesurés** : le bilan donne 3 points de mesure (FC repos actif, FC médiane Z2, FC médiane Z4, FC médiane Z5) mais pas directement des plages min/max. Méthode retenue — **chaque point mesuré devient le centre de sa zone**, et les frontières entre zones adjacentes se placent au **milieu de l'écart entre deux points voisins** :

- Z1 = [FC repos actif, milieu(FC repos actif, FC_Z2)]
- Z2 = [borne haute de Z1, milieu(FC_Z2, FC_Z3 interpolée)]
- Z3 (interpolée, FC_Z3 = milieu(FC_Z2, FC_Z4)) = [borne haute de Z2, milieu(FC_Z3, FC_Z4)]
- Z4 = [borne haute de Z3, milieu(FC_Z4, FC_Z5)]
- Z5 = [borne haute de Z4, FC_Z5 mesurée + marge de sécurité (+5 à 8 bpm)] — bornée haute approximative puisqu'un effort d'1 min n'est pas garanti être la FC max absolue de l'utilisateur ; à traiter comme une borne indicative plutôt qu'un plafond strict.

Cette méthode est simple à coder, déterministe, et cohérente avec le principe "mesuré, pas théorique" : elle ne recale jamais sur une formule externe, uniquement sur les 3 points capturés par ce test précis.

**Évolution des zones entre deux bilans** : les zones ne sont **jamais recalculées automatiquement** à partir des séances d'entraînement courantes (FC/RPE des sorties réelles) — ce serait une inférence indirecte et peu fiable comparée à une vraie mesure. En revanche, un signal répété (ex : plusieurs séances ciblant Z2 où le ressenti déclaré est systématiquement "trop facile" alors que la FC reste dans la plage Z2 mesurée) déclenche une **suggestion de retest anticipé** (`test_zones`) plutôt qu'une réduction du délai fixe de 3-4 semaines — les zones restent donc toujours issues d'un protocole mesuré explicitement, mais la fréquence de mesure s'adapte à l'évolution réelle de la forme.

### 5.2bis Test de côte (`test_hill`)
- Séance séparée, en conditions normales (pas enchaînée avec le test de zones), planifiée par l'IA en **semaine 1 ou 2 du programme réel** — pas un prérequis avant de démarrer l'entraînement.
- Comme `test_zones`, l'IA ne décrit jamais le contenu de cette séance (pas de `steps`/`objectives`) — elle se contente de la positionner dans le calendrier avec un niveau de difficulté (`testDifficultyLevel`, figé à 1 pour l'instant, prévu pour évoluer vers des variantes plus exigeantes une fois définies côté app).

**Déroulé :**
1. **Échauffement — 8-10 min** : marche puis trottinement progressif, mobilisations.
2. **Choix du segment** : une côte régulière et continue (éviter les portions plates intercalées), d'environ 3 à 8 minutes d'effort — l'utilisateur la définit dans l'app en la décrivant ou en la sélectionnant sur une carte/activité passée. Ce segment devient sa référence pour tous les futurs `test_hill`.
3. **Montée du segment** : effort maximal soutenable sur toute la durée du segment (pas un sprint de départ — un effort géré du début à la fin, "le plus vite possible en tenant jusqu'en haut"). Capture : temps total, D+, FC moyenne (exclusion des 30-45 premières sec, montée en régime), VAM = D+ / temps.
4. **Redescente en récupération** : non chronométrée, retour au calme actif jusqu'en bas.
5. **Second passage (optionnel mais recommandé)** : après récupération complète (5-8 min), un deuxième passage sur le même segment permet de vérifier la cohérence de la mesure (VAM et FC doivent être proches entre les deux passages, à une marge près) — sert de garde-fou contre un passage faussé (vent, faux départ, imprévu).
6. **Retour au calme — 5-8 min.**

- Même logique de validation (écran de correction des bornes) que 5.2.

### 5.3 Formulaire de génération du programme (ciblage)

**Questions posées :**
- Date de la course
- Distance et D+ de la course
- Caractéristiques du parcours : type de terrain (route / sentier / technique), profil général
- **GPX du parcours (optionnel)** : si fourni, l'app extrait D+/D- total, altitude min/max, plus longue montée continue, pente moyenne/max — c'est ce résumé chiffré qui est injecté dans la demande, pas le GPX brut.
- Nombre de séances par semaine que l'utilisateur est prêt à faire
- Jours de la semaine disponibles / contraintes
- Nombre de séances et volume hebdomadaire **actuels** (habitude présente, distincte de la disponibilité future — permet de repérer un décalage entre le niveau perçu et la réalité mesurée, ex : quelqu'un qui court très souvent mais reste lent, visible directement dans les allures du bilan)
- Âge (optionnel — contexte général pour le jugement de programmation, jamais utilisé pour calculer une zone FC théorique)
- Niveau d'expérience trail (débutant / intermédiaire / confirmé)
- **Objectif** : champ libre et volontairement simple/hypothétique (ex : "finir en moins de 3h", "ne pas souffrir en montée") — l'IA traduit cette formulation en objectifs chiffrés exploitables (zones FC cibles, allures min/km, VAM cible), pas l'utilisateur.
- Accès à du dénivelé à l'entraînement (oui/non) et à quel type de terrain
- **Contraintes logistiques** (accès au dénivelé, horaires serrés, etc.) et **douleurs/gênes physiques actuelles** (ex : "genoux sensibles"), demandées séparément — l'IA doit tenir compte des secondes pour une progression de charge plus prudente et éviter les séances à fort impact sur la zone concernée en début de programme, non conservées comme donnée de santé structurée en base au-delà du texte transmis à l'IA
- **Événements de vie prévus pendant la préparation** susceptibles d'affecter la récupération (ex : "fête des vendanges à environ 1/3 de la prépa"), optionnel — permet à l'IA de positionner une semaine plus légère en amont plutôt que de le découvrir après coup
- **As-tu déjà commencé à t'entraîner pour cette course ?** Si oui, depuis quand (date) — sert à fixer la borne minimale de `startDate` (voir instructions systématiques ci-dessous)

**Instructions systématiquement ajoutées au prompt (non visibles comme "question" pour l'utilisateur, injectées automatiquement) :**
- *"Le bilan initial de calibration des zones FC (`test_zones`) est déjà réalisé et fourni ci-dessous — ne le replanifie pas en semaine 1."*
- *"Planifie une séance `test_hill` en semaine 1 ou 2."*
- *"Planifie des séances de retest `test_zones` tous les 3-4 semaines tout au long du programme."*
- *"Le champ `priority` est indicatif, pas une obligation stricte : `core` signale les séances à privilégier si l'utilisateur ne peut pas toutes les faire dans la semaine (ex : privilégier la sortie longue et le fractionné clé plutôt qu'une séance de récup)."*
- *"`Program.startDate` ne peut pas être antérieure à [date du jour, ou la date indiquée par l'utilisateur s'il a déjà commencé son entraînement] — au-delà de cette borne, tu es libre de choisir la date de départ la plus pertinente selon le temps de préparation nécessaire."*

**Fonctionnement :**
- Réponses sauvegardées, automatiquement complétées par le dernier bilan (5.2/5.2bis) et les zones FC personnelles de l'utilisateur.
- Assemblage en un **prompt complet et unique**, bouton **"Copier la demande"**.
- Évolution prévue : appel API direct (V3).

### 5.4 Import du programme d'entraînement
- Import du JSON (copier-coller ou upload), validation de schéma (structure, champs obligatoires, types reconnus).
- **En cas d'erreur de schéma** : pas de rejet silencieux ni d'import partiel — l'app génère un **rapport d'erreurs lisible**, ligne par ligne (ex : "semaine 3, séance de mardi : `type` invalide, valeur reçue `'fartleck'`, valeurs attendues : ..."), avec un bouton **"Copier le rapport"** à recoller dans l'échange avec l'IA pour qu'elle corrige les lignes concernées. Rien n'est importé tant que le JSON n'est pas valide.
- Devient la référence affichée dans le calendrier de l'app.

**Types de séances (`type`) — course à pied / trail :**

| Type | Description |
|---|---|
| `recovery` | Récupération active |
| `long_run` | Sortie longue, endurance fondamentale |
| `interval` | Fractionné court/explosif sur plat |
| `tempo` | Allure seuil soutenue, continue |
| `threshold` | Proche du tempo, plus long, intensité légèrement inférieure |
| `hill_repeats` | Fractionné en côte |
| `fartlek` | Jeu d'allure libre |
| `technical_descent` | Travail spécifique de la descente |
| `race_simulation` | Sortie longue avec profil proche de la course |
| `race_recon` | Reconnaissance d'un tronçon du parcours réel |
| `test_zones` | Bilan/retest de calibration des zones FC (protocole 5.2) — l'IA ne décrit jamais son contenu (`steps`/`objectives` non utilisés), l'app injecte automatiquement son propre protocole ; exclu du moteur de règles standard |
| `test_hill` | Bilan/retest de VAM en côte (protocole 5.2bis) — même logique que `test_zones`, exclu du moteur de règles standard |
| `cross_training` | Vélo/natation en complément |
| `rest` | Jour de repos explicite |
| `custom` | Séance libre, avec `customLabel` pour préciser |

**Types de séances — vélo (triathlon, à intégrer plus tard) :** `bike_endurance`, `bike_interval`, `bike_tempo`, `brick`

**Types de séances — natation (triathlon, à intégrer plus tard) :** `pool_swim`, `open_water_swim`, `swim_technique`, `swim_interval`

### 5.5 Suivi des séances réelles & liaison plan ↔ réalisé
- Rapprochement par score composite (sport, fenêtre temporelle élargie, durée, D+, cohérence FC), pas par correspondance stricte au jour prévu.
- Auto-match au-dessus d'un seuil de confiance (annulable/réassignable en un tap), sinon rapprochement manuel proposé.
- Une séance planifiée n'est déclarée "manquée" qu'à l'expiration d'une fenêtre de tolérance (fin de semaine + grâce), jamais le jour même.
- Séances réelles non rapprochées = "hors programme", neutres pour l'adaptation mais comptées dans la charge globale (ACWR).

### 5.6 Questionnaire post-séance
Déclenché après chaque séance rapprochée. Volontairement court.

**Systématique (toutes séances) :**
1. RPE global (échelle visuelle simplifiée : facile / modéré / difficile / très difficile)
2. Perception vs plan : trop facile / adaptée / trop dure
3. Douleur ou gêne physique : oui/non (+ zone en texte libre si oui)

**Sorties longues/intenses (`long_run`, `tempo`, `threshold`, `hill_repeats`, `race_simulation`, `race_recon`) — questions additionnelles :**
4. Qualité du sommeil la veille (1 à 5)
5. Hydratation/alimentation pendant la séance : ok / insuffisante

**Fractionné (`interval`, `hill_repeats`) — question additionnelle :**
6. Toutes les répétitions prévues ont-elles été réalisées ? oui/non (+ combien si non)

**Flag automatique** : une douleur/gêne signalée sur le même point du corps à 3 reprises en 2 semaines déclenche une alerte "à surveiller / envisager un avis médical" (pas de diagnostic).

### 5.7 Dashboard principal
- Courbe allure/FC dans le temps, construite à partir des couples FC×allure capturés à chaque `test_zones` (5.2) et enrichie par les sorties réelles — permet de voir la progression de l'efficience cardio.
- Courbe VAM dans le temps (issue des `test_hill` et des séances réelles en côte).
- Charge d'entraînement hebdomadaire (volume/intensité) + ACWR.
- Calendrier de complétion du programme.

### 5.8 Détail par séance (données étendues)
- Données brutes stockées même si non affichées en dashboard principal : splits par km, courbe FC complète, D+/D-, cadence si disponible, découplage cardiaque calculé.
- **Photos** : 2-3 photos par sortie (façon Strava).
- **Export image (PNG)** : tracé + infos clés (distance, D+, allure, FC moyenne), format "story" vertical.

### 5.9 Retests périodiques
- Le protocole `test_zones` (5.2) est réutilisable à tout moment (retest tous les 3-4 semaines recommandé, planifié automatiquement par l'IA — cf. 5.3).
- Historique des bilans comparables entre eux, avec le capteur utilisé affiché à chaque bilan pour contextualiser les écarts.

### 5.10 Récapitulatif de fin de préparation
- Résumé complet de la préparation (progression FC/allure, VAM, volume total, D+ cumulé, taux de complétion, séances par type) + export PNG, même logique que 5.8.

### 5.11 Notifications
- Rappel de la séance du jour · rappel en cas d'absence de séance depuis plusieurs jours · rappel de retest arrivé à échéance.

### 5.12 Mode hors-ligne minimal (consultation)
- Pas de mode hors-ligne complet (usage principal en fin de séance, à la maison).
- Cache léger côté PWA gardant le détail de la séance du jour (et éventuellement des jours proches) disponible en lecture seule sans réseau. Pas de saisie/synchronisation en offline, uniquement de la consultation.

---

## 6. Structure JSON du programme

Le schéma JSON complet est maintenu dans un document dédié, **`programme-structure-v8.md`**, seule source de vérité sur ce point.

Rappel des principes structurants qui y sont détaillés :
- Le JSON est **à usage unique** : il ne sert qu'à l'import initial, aucun état vivant (statut réel, résultats, ressenti) n'y est stocké — tout ça vit en base après import.
- `athlete` et `raceGoal` ne sont **plus dans le JSON importé** : ce sont des données envoyées à l'IA dans le prompt, mais déjà connues de l'app, qui n'a pas besoin qu'elles reviennent.
- **Terrain unifié** : un seul enum (`route`/`sentier`/`technique`/`rivière`) partagé entre le parcours réel de la course et les suggestions de terrain d'entraînement.
- **`Session.objectives` et `Session.targetHeartRateZone` n'existent plus** : ces totaux/zones résumés sont désormais calculés par l'app à partir des `steps[]`, jamais écrits par l'IA — une seule source de vérité.
- `Program.startDate` reste dans le JSON, **choisi par l'IA** dans une borne minimale imposée par instruction de prompt (aujourd'hui, ou la date indiquée par l'utilisateur s'il a déjà commencé son entraînement) — les séances portent un `suggestedDayOfWeek` (pas une date fixe), cohérent avec le fait que le plan n'est pas suivi jour pour jour dans l'usage réel.
- `priority` (`core`/`optional`) reste indicatif, pas une contrainte stricte.
- `targetVAM` complète `targetHeartRateZone`/`targetPace` au niveau `Step`, pour les portions en côte.
- **Point encore ouvert** (détaillé dans le document dédié) : les allures cibles du JSON restent figées au moment de la génération — contrairement aux zones FC, elles ne se recalculent pas automatiquement après un retest positif ; à trancher entre régénération complète du programme ou recalcul dynamique côté app.

---

## 7. Moteur de règles d'adaptation (combiné)

**Seuils numériques de départ** (valeurs proposées à ajuster empiriquement une fois l'app utilisée en conditions réelles — pas de science exacte derrière, juste un point de départ raisonnable) :
- **"FC trop haute vs cible"** : FC moyenne de la séance dépasse la borne haute de la zone cible de plus de **+5 bpm** (petite marge tolérée pour absorber le bruit du capteur).
- **"RPE élevé"** : réponse "difficile" ou "très difficile" sur l'échelle à 4 niveaux (question 1 du questionnaire, 5.6). La réponse "trop dure" à la question 2 (perception vs plan) est un signal encore plus direct, à prioriser si les deux se contredisent.
- **"Seuil de confiance du matching"** (rapprochement plan/réalisé, 5.5) : score composite ≥ 70% → auto-match ; en dessous → rapprochement manuel proposé.
- **ACWR décharge** : > 1.5 (déjà posé).
- **ACWR sous-charge** : < 0.8 (déjà posé).

### 7.1 Matrice FC objective × ressenti subjectif

Le signal objectif utilisé est la **FC si disponible, l'allure sinon** (utilisateur sans capteur FC, cf. 5.2) — même matrice, même logique `core`/`optional`, seule la donnée de comparaison change.

| FC (ou allure) réelle vs cible | Ressenti déclaré | Action |
|---|---|---|
| Conforme | Normal | Aucune adaptation |
| Trop haute (ou trop rapide) | Facile (RPE bas) | Aucune adaptation — écart loggé, sans conséquence |
| Trop haute (ou trop rapide) | Difficile (RPE élevé) | Séance suivante du même `type` allégée de ~20%, pas de progression d'intensité tant que le ressenti ne redescend pas |
| Conforme | Difficile (RPE élevé) | Flag "à surveiller", confirmation utilisateur avant d'agir |
| Trop basse (ou trop lente) | Facile | Signal positif — pris en compte pour la progression du bloc suivant |

*(Ne s'applique pas aux séances `test_zones` / `test_hill`, exclues du moteur de règles.)*

### 7.2 Séances manquées
- 1 séance manquée → décalée au jour suivant compatible, sans réduction de charge.
- ≥2 séances manquées dans la semaine → pas de rattrapage, réduction du volume de la semaine suivante (~20%).
- Séances `priority: "core"` pèsent double par rapport aux `optional`.
- Séances manquées + RPE moyen déjà élevé → réduction de volume plus marquée.

### 7.3 Charge globale (ACWR)
- ACWR > 1.5 → semaine de décharge automatique proposée.
- ACWR < 0.8 sur plusieurs semaines → alerte de sous-charge (pas d'action automatique).

### 7.4 Séances de fractionné/qualité
- Répétitions non terminées → même logique que "trop haute + difficile", même si la FC captée était dans la cible.

### 7.5 Bascule "Programme adaptatif" (toggle)
Le moteur de règles n'écrase jamais le programme importé : ses ajustements (séance allégée, décharge ACWR, etc.) sont calculés comme une **couche superposée** au-dessus du plan brut, jamais une modification en place — ce qui permet de garder les deux versions accessibles en permanence.

Un toggle (accessible depuis le calendrier ou les réglages) bascule entre :
- **OFF** : affiche exactement le programme tel que généré/importé par l'IA, sans aucune adaptation automatique.
- **ON** (par défaut) : affiche le programme avec les ajustements du moteur de règles appliqués.

Permet de comprendre ce que l'app a modifié et pourquoi, et de désactiver temporairement les adaptations automatiques si elles se révèlent mal calibrées, sans perdre le plan d'origine.

---

## 8. Confidentialité et données de santé

- Isolation stricte des données de santé par utilisateur, pas de mutualisation entre comptes.
- Export et suppression des données possibles par chaque utilisateur.
- Écran de consentement explicite à la connexion Google Health.
- **Rétention** : conservation des données brutes (courbes FC/GPS détaillées, 5.8) sans limite de durée par défaut. Suppression uniquement sur demande explicite de l'utilisateur (compte ou données spécifiques) — pas de purge automatique programmée pour l'instant.

---

## 9. Points laissés de côté volontairement (backlog / à surveiller)

- **Matériel (usure chaussures)** : idée gardée en tête, pas de développement dédié pour le moment — modèle de données extensible pour l'ajouter facilement plus tard (V3).
- **Météo** : pas de système automatisé — un ressenti "il faisait chaud" déclaré dans le questionnaire post-séance suffit.
- **Partage de position en temps réel** : hors périmètre, usage post-entraînement uniquement.

---

## 10. Roadmap (2-3 semaines, soirs + week-ends)

### Semaine 1 — Fondations
- [ ] Setup Nuxt + Nitro + Drizzle + PostgreSQL + Docker Compose
- [ ] Modèle de données initial : `users`, `programs`, `planned_sessions`, `actual_sessions`, `assessments`
- [ ] Connexion Google Health API (OAuth + test de récupération d'une activité réelle)
- [ ] Import manuel d'un JSON de programme + affichage brut en liste
- [ ] **Script de déploiement automatique** : webhook déclenché sur push vers `main` → le serveur exécute un `git pull` + rebuild + redémarrage des conteneurs concernés (ex : petit serveur d'écoute webhook côté `zouzhomeserver` recevant l'événement GitHub, ou action GitHub qui SSH sur le serveur pour lancer le script `git pull && docker compose up -d --build`). Objectif : ne plus jamais avoir à déployer à la main.
- **Objectif fin semaine 1** : programme JSON importé et visible, Google Health connecté, déploiement automatisé sur push.

### Semaine 2 — Cœur fonctionnel
- [ ] Formulaire de ciblage (5.3) + génération du prompt copiable
- [ ] Bilan `test_zones` : version simplifiée acceptable au départ (saisie manuelle assistée si le découpage auto complet prend trop de temps, affiné en V2)
- [ ] Calendrier des séances prévues (vue simple)
- [ ] Rapprochement plan/réalisé — version simple d'abord (date + sport + durée)
- **Objectif fin semaine 2** : programme visible en calendrier, séances réelles synchronisées et rapprochées.

### Semaine 3 — Utilisable en vrai
- [ ] Questionnaire post-séance (questions systématiques uniquement)
- [ ] Moteur de règles basique : matrice FC×RPE (7.1) + séances manquées (7.2) — ACWR (7.3) si le temps permet
- [ ] Dashboard minimal : courbe allure/FC + calendrier de complétion
- **Objectif fin semaine 3** : app utilisable pour la suite de la préparation.

### Ensuite, au fil de l'eau (sans deadline, pendant la prépa)
- Photos par séance + export PNG (séance et récap final)
- Notifications de rappel
- Mode hors-ligne minimal (consultation du jour)
- `test_hill`, retests comparés, ACWR affiné
- Flag automatique douleur récurrente (5.6)
- Recalibration capteur (5.2)

### V3 (après la course)
- Triathlon (vélo/natation) fonctionnel
- Appel IA direct via API
- Suivi matériel (chaussures)
- Parsing GPX avancé