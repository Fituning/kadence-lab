# Structure JSON du programme d'entraînement — KadenceLab (v8)

Remplace la v7 sur les points ci-dessous. v1 à v7 conservées pour l'historique, ne pas les modifier.

## Ce qui change par rapport à la v7

- **`programId`, `sessionId` et `stepId` retirés du JSON.** Aucun de ces identifiants n'est référencé ailleurs à l'intérieur du JSON (tout est imbriqué positionnellement, pas de clé étrangère interne) — ils ne servent qu'à l'app après import, pour son propre suivi. Les laisser à l'IA créait un risque de collision et de format incohérent. L'app génère désormais ses propres identifiants (UUID) en parcourant l'arbre à l'import.
- **`Program.name` retiré** (n'a jamais existé formellement dans le schéma mais était sous-entendu) : l'app le calcule elle-même à partir de `raceGoal.name` + année de `raceGoal.date`, qu'elle connaît déjà avant l'appel à l'IA — pas besoin d'un champ JSON.

---

## 1. Arborescence générale

```
Program (startDate = ancre du calendrier, choisie par l'IA dans une borne minimale imposée ; id/name générés par l'app)
 └─ weeks[]
     └─ Week
         └─ sessions[] (id généré par l'app)
             └─ Session
                 ├─ priority
                 ├─ why (optionnel)
                 ├─ testDifficultyLevel (uniquement si type = test_zones / test_hill)
                 └─ steps[] (absent si type = test_zones / test_hill ; id généré par l'app)
                     └─ Step (peut contenir des children[] si stepType = "repeat")
```

---

## 2. Objet `Program` (racine)

| Champ | Type | Description |
|---|---|---|
| `generatedAt` | date ISO | Date de génération du programme par l'IA |
| `startDate` | date ISO | Ancre de démarrage du programme (lundi de la semaine 1), **choisie par l'IA**. Source de vérité unique pour le calendrier — chaque semaine/séance se déduit de cette date + `weekIndex` + `suggestedDayOfWeek`. Contrainte transmise par instruction de prompt (5.3 du cahier des charges) : ne peut pas être antérieure à la date du jour, sauf si l'utilisateur indique avoir déjà commencé son entraînement (la borne minimale devient alors cette date passée). Au-delà de cette borne, l'IA est libre de retarder le départ si elle estime que moins de temps de préparation suffit. |
| `weeks` | Week[] | Liste ordonnée des semaines du programme |

`programId` n'existe pas dans le JSON — généré par l'app à l'import (UUID), comme `sessionId`/`stepId` (voir sections 4 et 5). `raceGoal` n'est plus dans le JSON importé non plus — voir annexe (section 9) : payload envoyé à l'IA dans le prompt, déjà connu de l'app, pas une donnée à faire revenir. `Program.name` n'existe pas non plus : l'app le calcule à partir de `raceGoal.name` + année de `raceGoal.date`, déjà connus avant l'appel à l'IA.

---

## 3. Objet `Week`

| Champ | Type | Description |
|---|---|---|
| `weekIndex` | int | Compteur séquentiel du programme (1, 2, 3…) — ne dépend pas du calendrier. Combiné à `Program.startDate`, permet à l'app de déduire la date calendaire réelle de la semaine. |
| `phase` | enum | `base` \| `build` \| `peak` \| `taper` \| `recovery` |
| `sessions` | Session[] | Séances de la semaine |

---

## 4. Objet `Session`

| Champ | Type | Description |
|---|---|---|
| `suggestedDayOfWeek` | enum | `lundi` \| `mardi` \| `mercredi` \| `jeudi` \| `vendredi` \| `samedi` \| `dimanche` — jour indicatif au sein de la semaine, le plan n'étant pas suivi jour pour jour dans l'usage réel |
| `sport` | enum | `RUNNING` \| `BIKING` \| `SWIMMING` |
| `type` | enum | Voir liste complète ci-dessous |
| `title` | string | Titre affiché |
| `priority` | enum | `core` \| `optional` — `optional` = à sacrifier en premier si la semaine est trop chargée, `core` = ne jamais sacrifier, pèse double dans le calcul des séances manquées |
| `testDifficultyLevel` | int (1-3) \| null | **Uniquement si `type` = `test_zones` ou `test_hill`.** Toujours `1` pour l'instant (protocole unique) — prévu pour évoluer plus tard vers des variantes plus exigeantes (ex : niveau 2 à partir du 3ème retest) une fois ces variantes définies côté app. |
| `suggestedTerrainType` | string[] \| null | Optionnel, indicatif — un ou plusieurs parmi `route` \| `sentier` \| `technique` \| `rivière` (même enum que `raceGoal.terrainType`). Ne reflète pas forcément ce que l'IA voudrait idéalement, mais ce à quoi l'utilisateur a accès ou ce qu'il souhaite éviter (ex : `["route", "sentier"]` pour écarter le technique par prudence). |
| `why` | string \| null | Phrase de contexte sur l'intérêt de la séance — voir brief en section 6. `null` si non pertinent, et toujours `null` pour `test_zones`/`test_hill` (le "pourquoi" d'un bilan est géré nativement par l'app, pas par l'IA). |
| `steps` | Step[] \| null | Déroulé détaillé — **null si `type` = `test_zones` ou `test_hill`**, l'app substitue automatiquement son propre protocole prédéfini. |
| `customDescription` | string \| null | Obligatoire uniquement si `type = "custom"` |
| `routeSegment` | object \| null | Obligatoire uniquement si `type = "race_recon"` — `name`, `gpxRef`, `distanceKm`, `elevationGainM` |

**Pas de `sessionId`** : l'app génère son propre identifiant (UUID) pour chaque séance à l'import, en se basant sur sa position dans l'arbre (`weekIndex` + index dans `sessions[]`) — pas besoin que l'IA en fournisse un.

**Pas de `objectives` ni de `targetHeartRateZone` au niveau `Session`** : un total (distance/durée/D+) ou une "zone principale" écrits par l'IA en plus des `steps[]` seraient des données dérivées, potentiellement incohérentes avec le détail réel (ex : si le nombre de répétitions change sans recalcul manuel, ou si une séance mélange plusieurs zones comme un fractionné). L'app calcule ces informations dynamiquement à l'affichage en sommant/analysant `steps[]` — une seule source de vérité, jamais de résumé qui pourrait diverger du détail.

### Types de séance (`type`)

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
| `race_recon` | Reconnaissance d'un tronçon du parcours réel — nécessite `routeSegment` |
| `test_zones` | Bilan/retest de calibration des zones FC — protocole fixe injecté par l'app, `steps` non utilisé (les champs `objectives`/`targetHeartRateZone` n'existent plus au niveau `Session`, voir plus haut), `testDifficultyLevel` requis |
| `test_hill` | Bilan/retest de VAM en côte — même logique que `test_zones` |
| `cross_training` | Vélo/natation en complément |
| `rest` | Jour de repos explicite |
| `custom` | Séance libre, nécessite `customDescription` |

---

## 5. Objet `Step`

| Champ | Type | Description |
|---|---|---|
| `stepType` | enum | `warmup` \| `active` \| `cooldown` \| `repeat` |
| `title` | string | Titre court de l'étape |
| `tip` | string \| null | Conseil pratique libre et optionnel, distinct du `title` (ex : "respire par grandes inspirations pendant la marche de récup") — utile surtout pour les débutants, à ne pas surcharger sur les étapes qui n'en ont pas besoin |
| `durationMin` | number \| null | Durée en minutes (étape pilotée par le temps) |
| `distanceKm` | number \| null | Distance en km (étape pilotée par la distance) — une étape n'a jamais les deux à la fois |
| `targetPace` | object \| null | `minPerKm`, `maxPerKm` |
| `targetHeartRateZone` | int (1-5) \| null | Zone cible de l'étape, même logique qu'au niveau `Session` |
| `targetVAM` | object \| null | `minMh`, `maxMh` — vitesse ascensionnelle moyenne cible, pertinent pour les portions en côte (`hill_repeats`, `race_recon`, montées dans `race_simulation`) |
| `repeatCount` | int \| null | Uniquement si `stepType = "repeat"` |
| `children` | Step[] \| null | Sous-étapes répétées, uniquement si `stepType = "repeat"` |

**Pas de `stepId`** : même logique que `sessionId` — l'app génère son propre identifiant à l'import à partir de la position de l'étape dans l'arbre.

---

## 6. Champ `why` — brief pour l'IA

1. **Longueur** : 1 à 2 phrases max, ~250 caractères.
2. **Ton** : pédagogue, direct, sans jargon non expliqué.
3. **Contenu autorisé uniquement** : le rôle physiologique de la séance et son lien avec `raceGoal` — rien d'autre.
4. **Interdits** : inventer des chiffres hors de ce qui est déjà présent dans `steps[]` (durée, allure, zone), donner un conseil médical/nutritionnel, répéter les stats déjà affichées ailleurs dans l'UI.
5. **Génération sélective** : mettre `null` par défaut sur les séances répétitives à faible enjeu pédagogique (typiquement `recovery`) ; réserver le texte aux séances où il apporte une vraie valeur (`long_run`, `interval`, `tempo`, `race_recon`). Toujours `null` sur `test_zones`/`test_hill`.

---

## 7. Points encore ouverts

- Détail des métriques biomécaniques à demander à Google Health (cadence, oscillation verticale…) — sujet BDD/API, pas JSON d'import.
- Champs spécifiques `BIKING` / `SWIMMING` une fois ces sports fonctionnellement intégrés.
- Variantes de difficulté du protocole `test_zones`/`test_hill` (niveau 2, niveau 3) — pas encore définies côté app, `testDifficultyLevel` reste à `1` en pratique tant que ça n'existe pas.

---

## 8. Lexique des zones (à afficher côté app)

Repères perceptifs, utiles que l'utilisateur ait un capteur FC ou non — cohérents avec les instructions du protocole `test_zones`.

| Zone | Nom courant | Repère perceptif |
|---|---|---|
| Z1 | Récupération | Marche ou trottinement très facile, aucune gêne respiratoire |
| Z2 | Endurance fondamentale | Allure confortable, respiration nasale possible sans effort |
| Z3 | Modérée (interpolée) | Rythme "normal" de course, entre confortable et soutenu — rarement ciblée volontairement à l'entraînement |
| Z4 | Soutenue / seuil | Rythme difficile à tenir, impossible de dire plus de 2-3 mots d'affilée |
| Z5 | Maximale | Effort maximal, quelques dizaines de secondes à 1-2 minutes tout au plus |

---

## 9. Annexe — Payload envoyé à l'IA (hors JSON d'import)

Ce document décrivait auparavant `athlete` et `raceGoal` comme faisant partie du schéma d'import. Ils ne le sont plus : ces structures restent utilisées pour construire le **prompt envoyé à l'IA** (section 5.3 du cahier des charges), mais l'app les possède déjà et n'a pas besoin qu'elles reviennent dans la réponse. Conservées ici à titre de référence pour ne pas perdre cette documentation.

**Garde-fou** : si un futur champ de `raceGoal` doit être déduit/enrichi par l'IA elle-même (pas juste recopié depuis le formulaire ou un GPX déjà traité par l'app), il faudra le sortir de cette annexe et le remettre dans le JSON d'import (section 2/3) à ce moment-là.

### `athlete`

| Champ | Type | Description |
|---|---|---|
| `name` | string | Prénom |
| `level` | enum | `débutant` \| `intermédiaire` \| `confirmé` — niveau perçu/déclaré |
| `age` | int \| null | Optionnel — contexte général pour le jugement de programmation, jamais utilisé pour calculer une zone FC théorique |
| `weeklyAvailability` | string[] | Jours de la semaine disponibles pour s'entraîner |
| `currentWeeklySessions` | int \| null | Nombre de séances/semaine actuelles |
| `currentWeeklyVolumeKm` | number \| null | Volume hebdomadaire actuel |
| `initialAssessment` | object | Résultat du bilan `test_zones` — voir ci-dessous |
| `logisticalConstraints` | string \| null | Contraintes pratiques (accès au dénivelé, horaires serrés, etc.) |
| `injuryOrPainConcerns` | string \| null | Douleurs ou gênes actuelles (ex : "genoux sensibles") — l'IA en tient compte pour une progression de charge plus prudente |
| `plannedLifeEvents` | string \| null | Événements de vie prévus pendant la préparation susceptibles d'affecter la récupération (ex : "fête des vendanges à environ 1/3 de la prépa, forte probabilité de moins bien récupérer cette semaine-là") — l'IA peut positionner une semaine plus légère autour de cette période plutôt que de le découvrir après coup via un mauvais ressenti |

### `initialAssessment`

Reflète le protocole `test_zones` (FC repos actif → palier Z2 6min → palier Z4 3min → récup → effort Z5 1min visé/30sec minimum → retour au calme). Aucune valeur théorique : tout est mesuré. **L'app n'utilise jamais la classification de zones calculée par Google Health** — uniquement le flux brut, retraité par ce protocole.

| Champ | Type | Description |
|---|---|---|
| `assessmentDate` | date ISO | Date du bilan |
| `sensorType` | string \| null | `"montre optique"` \| `"ceinture pectorale"` \| `"aucun (GPS seul)"` \| modèle libre |
| `restingHeartRateBpm` | int \| null | FC repos actif — `null` si pas de capteur FC |
| `elevationGainM` | number \| null | Dénivelé cumulé pendant le bilan — informatif |
| `z2` | object | `paceMinPerKm` (obligatoire), `heartRateBpm` (nullable) |
| `z4` | object | Mêmes champs que `z2` |
| `z5` | object | `heartRateBpm` (nullable), `effortDurationSec` (30-60) |
| `recoveryHeartRate60s` | int \| null | FC à 60 sec post-Z5 — marqueur de récupération cardiovasculaire |

Pas de `z3` (interpolée). Pour un utilisateur sans capteur FC, le système de zones 1-5 reste identique — seul le signal de vérification (côté moteur de règles) bascule sur l'allure.

### `raceGoal`

| Champ | Type | Description |
|---|---|---|
| `name` | string | Nom de la course |
| `date` | date ISO | Date de l'échéance |
| `distanceKm` | number | Distance de la course |
| `elevationGainM` | number | Dénivelé positif de la course |
| `location` | string \| null | Optionnel — lieu de la course |
| `terrainType` | string[] \| null | Optionnel — description factuelle du parcours réel, un ou plusieurs parmi `route` \| `sentier` \| `technique` \| `rivière` (même enum que `Session.suggestedTerrainType`, sens différent : ici c'est ce que la course traverse réellement, pas une suggestion) |
| `startTime` | string \| null | Optionnel — heure de départ prévue |
| `cutoffTimeMin` | int \| null | Optionnel — temps limite de l'épreuve, si pertinent pour caler l'allure cible |
| `gpxRef` | string \| null | Optionnel — référence vers le GPX du parcours de la course, donné à l'IA quand disponible pour affiner le plan (notamment les séances `race_recon`) |