# Documentation base de données — KadenceLab

Décrit le schéma Drizzle réel sous `shared/database/` : tables, enums, relations, et surtout les points d'attention à reproduire dans les schémas Zod utilisés à l'import du JSON généré par l'IA (voir `doc-json.md` pour le contrat JSON lui-même).

Cette doc suit le code, pas l'inverse : si tu modifies un fichier sous `shared/database/`, mets cette page à jour dans la foulée.

---

## 1. Schéma relationnel

```
users ──< programs >── races
  │           │
  │           └──< weeks ──< sessions
  │
  └──1:1── google_health_tokens
```

- `programs.user_id` → `users.id`
- `programs.race_id` → `races.id`
- `weeks.program_id` → `programs.id`
- `sessions.week_id` → `weeks.id`
- `google_health_tokens.user_id` → `users.id`

---

## 2. Stratégie d'identifiants (uuid vs serial)

Règle appliquée : **uuid pour une ressource de premier niveau, potentiellement accédée par son id seul en dehors de son parent (route publique/API, id renvoyé au client) ; serial pour une ressource toujours accédée en cascade via son parent**, où le risque d'énumération n'a pas d'enjeu et où un entier plus léger suffit.

| Table | Id | Pourquoi |
|---|---|---|
| `users` | `uuid` | identité de premier niveau, liée à l'auth (`sub` Google) |
| `programs` | `uuid` | accédée directement par id (`/programs/:id`) |
| `races` | `uuid` | idem, potentiellement listée/consultée par id indépendamment d'un programme |
| `sessions` | `uuid` | le détail d'une séance sera accédé directement par son id, pas uniquement via `weekId` |
| `weeks` | `serial` | toujours consultée en cascade via `programId`, pas de route `/weeks/:id` prévue |

Si une future route expose `weeks` individuellement par id, repasser sa PK en `uuid` à ce moment-là — pas avant, pour ne pas payer le coût (taille d'index, pas de tri naturel) sans besoin réel.

**Rappel important (déjà dans `doc-json.md`)** : aucun id (`programId`, `sessionId`, `stepId`) ne vient du JSON généré par l'IA — l'app génère systématiquement ses propres uuid à l'import en parcourant l'arbre. Un schéma Zod côté import ne doit donc **jamais accepter/valider un champ `id` envoyé par l'IA** sur `Program`, `Week`, `Session` ou `Step`.

---

## 3. Enums (`shared/database/enums.ts`)

| Enum | Colonne pg | Valeurs | Notes |
|---|---|---|---|
| `userLevel` | `user_level` | `beginner`, `intermediate`, `advanced` | niveau déclaré/perçu de l'utilisateur (`users.level`) |
| `weekDay` | `week_day` | `mon`, `tue`, `wed`, `thu`, `fri`, `sat`, `sun` | correspond exactement aux valeurs du JSON (`doc-json.md` §4) — l'IA émet directement ces codes anglais, aucune conversion à l'import |
| `weekPhase` | `week_phase` | `base`, `build`, `peak`, `taper`, `recovery` | correspond exactement aux valeurs du JSON (`doc-json.md` §3) |
| `sportEnum` | `sport` | `RUNNING`, `BIKING`, `SWIMMING` | correspond exactement au JSON (`doc-json.md` §4) |
| `sessionType` | `session_type` | `recovery`, `long_run`, `interval`, `tempo`, `threshold`, `hill_repeats`, `fartlek`, `technical_descent`, `race_simulation`, `race_recon`, `test_zones`, `test_hill`, `cross_training`, `rest`, `custom` | correspond exactement au JSON (`doc-json.md` §4) |
| `sessionPriority` | `session_priority` | `core`, `optional` | correspond exactement au JSON |
| `terrainType` | `terrain_type` | `road`, `technical`, `trail`, `river` | correspond exactement aux valeurs du JSON (`doc-json.md` §4 et §9, champs `Session.suggestedTerrainType` et `raceGoal.terrainType`) — l'IA émet directement ces valeurs anglaises |
| `heartRateZone` | `heart_rate_zone` | `Z1`…`Z5` | pas encore consommé par une colonne dédiée (les zones cibles vivent aujourd'hui dans le JSONB `sessions.steps`) ; sert de vocabulaire partagé, notamment pour le lexique affiché à l'utilisateur (`doc-json.md` §8) |

**Point d'attention Zod** : `weekDay` et `terrainType` peuvent être validés directement avec les enums Drizzle (mêmes valeurs anglaises des deux côtés) — un `z.enum` construit sur `weekDay.enumValues`/`terrainType.enumValues` suffit, aucune étape de traduction à prévoir. Le lexique en français de la section 8 de `doc-json.md` (`Récupération`, `Endurance fondamentale`…) est un texte d'affichage UI, pas un enum du contrat JSON — à ne pas confondre.

---

## 4. Tables

### `users`

| Colonne | Type | Contraintes | Notes |
|---|---|---|---|
| `id` | uuid | PK, `defaultRandom()` | |
| `sub` | text | not null, unique | identifiant Google (OAuth) |
| `first_name` | text | not null | |
| `last_name` | text | not null | |
| `email` | text | not null, unique | |
| `picture` | text | nullable | |
| `level` | `user_level` | nullable, défaut `beginner` | |
| `date_of_birth` | date | nullable | remplace `athlete.age` de l'annexe JSON (§9) — choix volontaire, plus précis, l'app calcule l'âge si besoin |
| `preferred_weekly_availability` | `week_day[]` | nullable | tableau vide = pas de préférence (à documenter côté UI) |
| `preferred_weekly_sessions` | integer | nullable | indicatif, l'IA reste libre d'ajuster |
| `logistical_constraints` | text | nullable | |
| `injury_or_pain_concerns` | text | nullable | |
| `planned_life_events` | text | nullable | |
| `created_at` | timestamp | not null, `defaultNow()` | |

**Attention Zod** : `athlete.currentWeeklySessions` et `currentWeeklyVolumeKm` (annexe JSON §9) ne sont **pas persistés** sur `users` — ce sont des valeurs ponctuelles saisies/mesurées au moment de la génération d'un programme, pas un attribut de profil. Si tu veux les garder en base, ils doivent aller sur `programs` (ou une table d'assessment dédiée), pas sur `users`.

`initialAssessment` (bilan `test_zones`, §9) n'a **aucune table dédiée pour l'instant** (décision : "on verra plus tard"). Pas de Zod à écrire pour la persistance de ce bloc tant que ce n'est pas tranché — uniquement pour son usage dans le prompt envoyé à l'IA.

### `google_health_tokens`

| Colonne | Type | Contraintes | Notes |
|---|---|---|---|
| `user_id` | uuid | PK, FK → `users.id` | relation 1:1 avec `users` |
| `access_token` | text | not null | |
| `refresh_token` | text | not null | ⚠️ à chiffrer avant insert — actuellement stocké en clair par le schéma, le chiffrement doit être fait côté application avant l'écriture |
| `expires_at` | timestamp | not null | |

### `race`

| Colonne | Type | Contraintes | Notes |
|---|---|---|---|
| `id` | uuid | PK, `defaultRandom()` | |
| `name` | text | not null | |
| `date` | date | not null | |
| `distance` | numeric(5,2) | not null | en km — ⚠️ plafond `999.99`, largement suffisant pour du trail/ultra mais à garder en tête si un jour on stocke une distance cumulée de programme |
| `elevation_gain_m` | integer | not null | |
| `location` | text | nullable | |
| `terrain` | `terrain_type[]` | nullable | valeurs alignées sur le JSON, voir §3 enums |
| `start_time` | time | nullable | correspond à `raceGoal.startTime` (§9) |
| `target_time` | integer | nullable | correspond à `raceGoal.targetTime` (§9) — à documenter clairement dans le code : secondes, probablement |
| `gpx_ref` | text | nullable | correspond à `raceGoal.gpxRef` (§9) |

**Attention Zod** : aucune validation de cohérence terrain/distance n'existe en DB (ex : `terrain` incluant `river` avec `elevation_gain_m` à 0) — à faire au niveau applicatif si pertinent, pas un sujet Zod strict.

### `programs`

| Colonne | Type | Contraintes | Notes |
|---|---|---|---|
| `id` | uuid | PK, `defaultRandom()` | jamais fourni par l'IA |
| `name` | text | not null | calculé par l'app depuis `raceGoal.name` + année de `raceGoal.date` (`doc-json.md` §2) — jamais dans le JSON |
| `user_id` | uuid | not null, FK → `users.id` | |
| `race_id` | uuid | not null, FK → `races.id` | |
| `generated_at` | date | not null, `defaultNow()` | correspond à `Program.generatedAt` (§2) — date de génération par l'IA |
| `start_date` | date | not null, `defaultNow()` | correspond à `Program.startDate` (§2), ancre du calendrier ; **borne minimale imposée par le prompt** (pas dans le passé, sauf entraînement déjà commencé) — cette contrainte métier n'est pas vérifiable en DB, à valider côté Zod/service au moment de l'import si tu veux la faire respecter strictement |

### `weeks`

| Colonne | Type | Contraintes | Notes |
|---|---|---|---|
| `id` | serial | PK | |
| `program_id` | uuid | not null, FK → `programs.id` | |
| `week_index` | integer | not null | correspond à `Week.weekIndex` (§3) — compteur séquentiel, **pas garanti unique/consécutif par la DB** ; à valider en Zod/service à l'import (1, 2, 3… sans trou, par programme) si l'app en dépend pour le calcul de calendrier |
| `phase` | `week_phase` | not null | |

### `sessions`

| Colonne | Type | Contraintes | Notes |
|---|---|---|---|
| `id` | uuid | PK, `defaultRandom()` | jamais fourni par l'IA ; détail de séance accédé directement par id |
| `week_id` | integer | not null, FK → `weeks.id` | |
| `suggested_day_of_week` | `week_day` | not null | valeurs alignées sur le JSON, voir §3 enums |
| `scheduled_date` | date | not null | ⚠️ **absent du JSON** (`doc-json.md` dit explicitement que la date se déduit de `startDate + weekIndex + suggestedDayOfWeek`, jamais stockée). Colonne ajoutée volontairement pour trier/requêter sans recomposer la date à chaque fois. **Risque à documenter** : si `programs.startDate` change après coup, `scheduled_date` doit être recalculée sur toutes les sessions du programme, sinon désynchro silencieuse — prévoir un endpoint/job de recalcul le jour où l'édition de `startDate` est possible après génération. |
| `sport` | `sport` | not null, défaut `RUNNING` | |
| `type` | `session_type` | not null | pilote plusieurs champs conditionnels ci-dessous |
| `session_title` | text | not null | |
| `priority` | `session_priority` | not null | |
| `test_difficulty_level` | integer | nullable | **requis seulement si** `type ∈ {test_zones, test_hill}` (§4). Non contraint en DB (pas de `CHECK`) — à valider en Zod avec un `.superRefine`/discriminated union sur `type`. Toujours `1` en pratique aujourd'hui (§7). |
| `suggested_terrain_type` | `terrain_type[]` | nullable | valeurs alignées sur le JSON, voir §3 enums |
| `why` | text | nullable | toujours `null` pour `test_zones`/`test_hill` (§4, §6) — même remarque : pas de contrainte DB, à faire respecter côté Zod/génération si tu veux le garantir strictement |
| `custom_description` | text | nullable | **requis seulement si** `type = "custom"` — idem, contrainte conditionnelle à porter par Zod, pas par la DB |
| `steps` | jsonb | nullable | **`null` si `type ∈ {test_zones, test_hill}`**, sinon un tableau de `Step` (§5, structure récursive avec `children[]` pour `stepType = "repeat"`). Stocké en JSONB plutôt qu'en tables normalisées — choix volontaire pour éviter une FK auto-référentielle sur un arbre récursif. **Le schéma `Step` n'est validé nulle part au niveau DB** : il faut un schéma Zod récursif dédié (miroir de `doc-json.md` §5) appliqué avant insert, DB uniquement gardienne du "c'est bien du JSON". |
| `route_segment` | jsonb | nullable | **requis seulement si** `type = "race_recon"` — objet `{name, gpxRef, distanceKm, elevationGainM}` (§4). Même remarque : Zod doit porter la contrainte conditionnelle et la forme de l'objet, la DB ne valide que "c'est du JSON". |

---

## 5. Récapitulatif — ce qu'une validation Zod à l'import doit porter (et que la DB ne porte pas)

1. **Champs conditionnellement requis** selon `Session.type` :
   - `testDifficultyLevel` requis (et `steps`/`routeSegment` null) si `type ∈ {test_zones, test_hill}`
   - `customDescription` requis si `type = "custom"`
   - `routeSegment` requis si `type = "race_recon"`
   - `why` forcé à `null` si `type ∈ {test_zones, test_hill}`
2. **Aucun id accepté depuis le JSON** (`Program`, `Week`, `Session`, `Step`) — toujours généré à l'import.
3. **`Step[]` récursif** (`steps` JSONB) : schéma Zod récursif complet à écrire, y compris la règle "jamais `durationMin` et `distanceKm` en même temps" (§5) et "`repeatCount`/`children` uniquement si `stepType = "repeat"`".
4. **Bornes numériques** non vérifiées par la DB : `testDifficultyLevel` (1-3, aujourd'hui toujours 1), zones FC (1-5 / `Z1`-`Z5`), `z5.effortDurationSec` (30-60, cf. annexe §9).
5. **`Program.startDate`** : la borne métier ("pas avant aujourd'hui, sauf si déjà commencé") n'est pas une contrainte DB — à valider en amont de l'insert si on veut la faire respecter strictement.
6. **`weekIndex`** : unicité/continuité par programme non garantie par la DB — à valider si l'app dépend du calcul de calendrier.

---

## 6. Historique

- **v1 (2026-09-14)** : premier jet, aligné sur `doc-json.md` v8 et le schéma Drizzle post-corrections (FK `serial()`→`integer()`/`uuid()`, `generatedAt`, `weekIndex`, `startTime`, `gpxRef`, `routeSegment` singulier/nullable, `steps` nullable, enums traduits en anglais).
- **v2 (2026-09-14)** : colonnes FK passées en `snake_case` explicite (`user_id`, `race_id`, `program_id`, `week_id`, `suggested_terrain_type`, `route_segment`, `date_of_birth`, `preferred_weekly_sessions`). Correction de fond : le contrat JSON (`doc-json.md`) émet directement les enums en anglais — supprimé toute mention d'un mapping FR → EN à l'import, qui n'existe pas/plus.
