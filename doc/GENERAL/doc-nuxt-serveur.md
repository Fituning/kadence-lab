# Le serveur Nuxt (Nitro) — structure, routes auto-déclarées, et quand coder où

## L'idée générale

Analogie : ton app, c'est un restaurant.
- **Le serveur (`server/`)** = la cuisine. C'est là que se passent les trucs qu'on ne veut pas montrer en salle : la recette secrète (logique métier), le frigo (la base de données), le fournisseur (les API externes comme Google). Le client en salle ne voit jamais ce qui se passe en cuisine, il reçoit juste l'assiette (la réponse JSON).
- **Les pages (`app/pages/`, `app/components/`)** = la salle. On y affiche ce que le client a commandé, on prend ses interactions (clics, formulaires), mais on ne cuisine rien nous-mêmes — on passe la commande en cuisine et on attend l'assiette.

Nitro, c'est le moteur qui fait tourner la partie "cuisine" de Nuxt. Il tourne en Node.js, jamais dans le navigateur.

## Structure : `server/api/` vs `server/routes/`

Deux dossiers, une nuance :

- **`server/api/`** → chaque fichier devient une route préfixée automatiquement par `/api`. C'est le dossier que tu utiliseras dans 95% des cas pour ta propre logique (récupérer les séances, valider un programme, etc.).
- **`server/routes/`** → chaque fichier devient une route **sans** préfixe `/api`. Utile pour des routes qui doivent avoir une URL "propre" imposée de l'extérieur — typiquement ton callback OAuth Google, qui doit répondre exactement sur `/auth/google` parce que c'est cette URL-là que tu as déclarée dans la console Google Cloud. Tu ne peux pas dire à Google "en fait c'est `/api/auth/google`", donc ce cas précis sort du dossier `api/`.

Dans ton projet, `server/routes/auth/google.get.ts` et `server/routes/auth/logout.get.ts` sont dans `routes/` pour cette raison précise. Tout le reste (séances, programme, notifications...) ira dans `server/api/`.

## L'auto-déclaration des routes : le nom de fichier fait tout

Pas besoin d'un fichier central où tu listes "route X → méthode Y → handler Z" (pas de `router.get('/foo', ...)` à la Express). Nitro lit l'arborescence de `server/` et déclare les routes tout seul, à partir du **chemin du fichier** et de son **suffixe**.

```
server/
  api/
    programs/
      index.get.ts        →  GET    /api/programs
      index.post.ts        →  POST   /api/programs
      [id].get.ts           →  GET    /api/programs/:id
      [id].put.ts           →  PUT    /api/programs/:id
      [id].delete.ts        →  DELETE /api/programs/:id
    sessions/
      [id]/
        photos.post.ts      →  POST   /api/sessions/:id/photos
  routes/
    auth/
      google.get.ts         →  GET    /auth/google
      logout.get.ts          →  GET    /auth/logout
```

Le suffixe avant `.ts` (`.get`, `.post`, `.put`, `.delete`, `.patch`) dit à Nitro quelle méthode HTTP écouter. Sans suffixe (juste `programs.ts`), la route répond à **toutes** les méthodes — utile seulement si tu gères le routage `event.method` toi-même à l'intérieur, ce qui est rarement le plus lisible.

Les crochets `[id]` créent un **paramètre dynamique** dans l'URL, récupérable avec `getRouterParam(event, 'id')`.

### Comment ranger ça sans que ce soit le bordel

La règle qui marche bien : **un sous-dossier par domaine métier**, pas par type technique. Pour KadenceLab par exemple :

```
server/
  api/
    programs/       → tout ce qui touche au programme d'entraînement
    sessions/        → séances planifiées et réalisées
    assessments/      → bilans de forme
    auth/             → si tu as d'autres routes auth que le OAuth (ex: upsert user)
  routes/
    auth/
      google.get.ts
      logout.get.ts
  utils/            → fonctions partagées, PAS des routes (voir plus bas)
  database/
    schema/
  tasks/
    reminders/
```

`index.get.ts` = "la route de base du dossier" (liste tout), `[id].get.ts` = "un élément précis". C'est la même logique que le routage des pages Nuxt, donc si tu es déjà à l'aise avec ça côté `app/pages/`, c'est transposable tel quel.

## `server/utils/` : des helpers, pas des routes

Tout fichier dans `server/utils/` (comme ton `server/utils/db.ts` avec `useDb()`) est **auto-importé** dans tout le reste de `server/` — pas besoin d'`import`. Ce n'est **pas** une route, personne ne peut l'appeler depuis le navigateur. C'est l'équivalent des `composables/` côté client, mais réservé à la cuisine.

## Ce qu'une route renvoie

Un handler de route, c'est toujours la même forme :

```ts
// server/api/sessions/[id].get.ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const db = useDb()

  const session = await db.query.sessions.findFirst({ where: eq(schema.sessions.id, id) })

  if (!session) {
    throw createError({ statusCode: 404, statusMessage: 'Séance introuvable' })
  }

  return session // Nitro sérialise automatiquement en JSON
})
```

Points clés :
- ce que tu `return` devient le corps de la réponse HTTP, sérialisé en JSON automatiquement (pas de `res.json(...)` à la Express) ;
- `throw createError({ statusCode, statusMessage })` = la bonne façon de renvoyer une erreur propre (404, 400, 500...) plutôt qu'un `return { error: '...' }` avec un status 200 trompeur ;
- pour lire les infos de la requête : `getRouterParam(event, 'id')` (params d'URL), `getQuery(event)` (`?foo=bar`), `await readBody(event)` (corps JSON d'un POST/PUT).

## Comment appeler ces routes depuis une page

Deux outils, deux usages différents. C'est le deuxième piège classique après le `.env`.

### `useFetch` — pour l'affichage initial d'une page

```vue
<script setup>
// Dans une page/composant, au chargement
const { data: session, status, error } = await useFetch(`/api/sessions/${id}`)
</script>
```

`useFetch` est conscient du SSR : il joue le fetch côté serveur pendant le rendu de la page, puis **réutilise ce résultat** côté client au lieu de refaire l'appel (pas de double appel visible dans l'onglet réseau). C'est ton premier réflexe pour "afficher des données au chargement d'une page".

### `$fetch` — pour une action déclenchée par l'utilisateur

```vue
<script setup>
async function marquerCommeFaite() {
  await $fetch(`/api/sessions/${id}/complete`, {
    method: 'POST',
    body: { feedback },
  })
}
</script>
```

`$fetch` est le fetch "brut", sans la mécanique SSR/cache de `useFetch`. Tu l'utilises quand l'appel part d'un événement (clic sur un bouton, soumission de formulaire) — pas au chargement de la page. Utiliser `useFetch` pour ça serait inutile (et parfois buggé, car `useFetch` est pensé pour tourner pendant le rendu du composant, pas dans un handler de clic).

Règle pratique : **chargement de page → `useFetch`. Réaction à une interaction → `$fetch`.**

## Quand mettre la logique côté serveur vs côté script de page

Le critère n'est presque jamais "c'est plus simple à écrire ici", mais **"est-ce que ça touche à un secret, une donnée sensible, ou une source de vérité partagée ?"**

**Toujours côté serveur (`server/`) :**
- tout ce qui touche un secret : clé API, mot de passe, token OAuth (sinon n'importe qui peut l'extraire depuis le navigateur) ;
- tout accès à la base de données — un composant Vue ne doit jamais parler directement à Postgres ;
- toute logique métier qui doit être fiable même si l'utilisateur triche côté client (ex : le calcul de l'ACWR, la validation du programme JSON — si tu le fais juste en JS dans le navigateur, un utilisateur un peu malin peut modifier la valeur avant envoi) ;
- tout appel à une API tierce qui nécessite une clé (Google Health API, `web-push`) ;
- tout ce qui doit tourner même sans que personne ait de page ouverte (tes tâches planifiées Nitro dans `server/tasks/`).

**Côté script de page (`app/`) :**
- l'état de l'UI (un formulaire ouvert ou fermé, un onglet actif) ;
- une transformation d'affichage pure à partir de données déjà reçues (formater une date pour l'affichage, trier une liste côté client) ;
- tout ce qui a besoin du DOM ou du navigateur : ton export PNG avec `html-to-image`, l'affichage de la carte Leaflet, la demande de permission notifications au navigateur ;
- l'appel à tes propres routes API (`useFetch`/`$fetch`) pour récupérer ou envoyer des données — le script de page orchestre, il ne fait pas le travail sensible lui-même.

Exemple concret avec ton projet : le flow Google OAuth. L'échange du `code` contre un token, avec le `clientSecret`, se passe entièrement dans `server/routes/auth/google.get.ts` — jamais dans une page. La page, elle, se contente d'un lien `<a href="/auth/google">Se connecter</a>` et de lire ensuite `useUserSession()` pour savoir si l'utilisateur est connecté. Elle ne voit et ne manipule jamais le secret.
