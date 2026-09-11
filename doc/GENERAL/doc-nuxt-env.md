# Le `.env` avec Nuxt — comprendre `runtimeConfig` (public vs privé)

## Le problème que ça résout

Imagine que ton app a besoin de deux types d'infos :
- des trucs **secrets** : la clé pour parler à Google OAuth, le mot de passe de la base de données, la clé privée VAPID pour les notifications push. Si ça fuite, quelqu'un peut se faire passer pour ton serveur ou lire ta base.
- des trucs **publics** : par exemple la clé publique VAPID, dont le navigateur a besoin pour s'abonner aux notifications. Ce n'est pas un secret, tout le monde qui inspecte ton site peut la voir de toute façon.

Le piège classique du débutant : mettre une clé secrète dans le code qui tourne côté navigateur. Nuxt a un système pensé exactement pour éviter ça, c'est `runtimeConfig`.

Analogie : `runtimeConfig` c'est comme une réception d'hôtel. Le personnel (le serveur) a accès à toutes les infos, y compris les codes du coffre-fort. Les clients (le navigateur) n'ont accès qu'au tableau d'affichage public dans le hall (horaires du petit-déj, wifi). Ce que tu mets sur le tableau d'affichage, tout le monde le voit — donc jamais de code de coffre dessus.

## Les deux étages de `runtimeConfig`

Dans `nuxt.config.ts`, tu déclares :

```ts
export default defineNuxtConfig({
  runtimeConfig: {
    // 🔒 Privé — accessible SEULEMENT côté serveur
    databaseUrl: '',
    oauth: {
      google: {
        clientId: '',
        clientSecret: '',
        redirectURL: '',
      },
    },
    vapid: {
      subject: '',
      publicKey: '',
      privateKey: '',
    },

    // 🌍 Public — accessible côté serveur ET côté navigateur
    public: {
      vapidPublicKey: '',
    },
  },
})
```

Règle simple : **tout ce qui n'est pas dans `public` est privé**. Nuxt ne l'envoie jamais au navigateur, même en payload caché — il est physiquement retiré du bundle client au build.

## La nomenclature dans le `.env`

C'est le point qui perd le plus de monde au début. Nuxt fait le lien entre une variable du `.env` et une clé de `runtimeConfig` **automatiquement**, à condition de respecter une convention de nommage :

- toujours commencer par `NUXT_`
- puis le chemin de la clé dans `runtimeConfig`, en `SCREAMING_SNAKE_CASE`
- pour une clé publique, on insère `PUBLIC_` juste après `NUXT_`
- une clé imbriquée (`oauth.google.clientId`) devient `NUXT_OAUTH_GOOGLE_CLIENT_ID` — chaque niveau d'imbrication = un `_`, et le camelCase devient des mots séparés par `_`

| Clé dans `runtimeConfig` | Variable `.env` correspondante |
|---|---|
| `databaseUrl` | `NUXT_DATABASE_URL` |
| `oauth.google.clientId` | `NUXT_OAUTH_GOOGLE_CLIENT_ID` |
| `oauth.google.clientSecret` | `NUXT_OAUTH_GOOGLE_CLIENT_SECRET` |
| `vapid.privateKey` | `NUXT_VAPID_PRIVATE_KEY` |
| `public.vapidPublicKey` | `NUXT_PUBLIC_VAPID_PUBLIC_KEY` |

Donc ton `.env` (jamais commité) ressemble à ça :

```bash
NUXT_SESSION_PASSWORD=une-chaine-aleatoire-de-32-caracteres-minimum
NUXT_DATABASE_URL=postgres://user:pass@localhost:5432/kadencelab

NUXT_OAUTH_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
NUXT_OAUTH_GOOGLE_CLIENT_SECRET=xxxx

NUXT_VAPID_SUBJECT=mailto:toi@exemple.com
NUXT_VAPID_PUBLIC_KEY=xxxx
NUXT_VAPID_PRIVATE_KEY=xxxx
NUXT_PUBLIC_VAPID_PUBLIC_KEY=xxxx
```

Remarque : `NUXT_VAPID_PUBLIC_KEY` et `NUXT_PUBLIC_VAPID_PUBLIC_KEY` ont la même valeur mais existent en double exprès — une pour l'usage serveur (`vapid.publicKey`), une copie pour le client (`public.vapidPublicKey`). C'est normal, ce n'est pas une erreur de copier-coller.

`.env.example` : c'est le fichier qu'on commite à la place du vrai `.env`. Il liste les mêmes clés mais vides ou avec des valeurs bidon, pour que n'importe qui qui clone le repo sache quoi renseigner sans jamais voir tes vrais secrets.

## Comment les récupérer dans le code

### Côté serveur (dans `server/`)

Partout dans une route serveur, un middleware ou une tâche planifiée, tu appelles `useRuntimeConfig()` (auto-importé, pas besoin de l'importer à la main). Tu as accès à **tout**, privé compris :

```ts
// server/utils/db.ts
export function useDb() {
  const config = useRuntimeConfig()
  const url = config.databaseUrl // clé privée, dispo car on est côté serveur
  if (!url) {
    throw createError({ statusCode: 500, statusMessage: 'NUXT_DATABASE_URL manquante' })
  }
  return postgres(url, { prepare: false })
}
```

Si tu es dans une route (`defineEventHandler`), tu peux aussi faire `useRuntimeConfig(event)` en lui passant l'event — c'est la forme recommandée dans un handler, elle permet à Nuxt de gérer certains cas avancés (contextes multi-tenant). Pour un projet solo comme le tien, `useRuntimeConfig()` tout court fonctionne très bien aussi.

### Côté page / composant (dans `app/`)

Là, `useRuntimeConfig()` fonctionne aussi, mais **il ne renvoie que la partie `public`**. Le reste (`databaseUrl`, `oauth.*`, `vapid.privateKey`...) sera `undefined` — pas par bug, c'est le but recherché.

```vue
<script setup>
const config = useRuntimeConfig()

console.log(config.public.vapidPublicKey) // ✅ OK, c'est public
console.log(config.databaseUrl)           // ❌ undefined, et heureusement
</script>
```

Concrètement pour KadenceLab : c'est comme ça que ton composant d'abonnement aux notifications push récupérera `vapidPublicKey` pour créer la `PushSubscription` dans le navigateur, sans jamais toucher à la clé privée qui reste planquée côté serveur.

## Les pièges classiques

- **Oublier le préfixe `NUXT_`** : si ta variable s'appelle juste `DATABASE_URL` dans le `.env`, Nuxt ne la reliera à rien automatiquement (sauf cas particulier, voir plus bas). Elle restera lisible via `process.env.DATABASE_URL` côté serveur, mais ne sera jamais dans `runtimeConfig` ni accessible côté client.
- **Redémarrer après modif du `.env`** : Nuxt lit les variables d'env au démarrage du process. Si tu modifies le `.env` pendant que `nuxt dev` tourne, il faut relancer.
- **Cas `drizzle-kit`** : dans ton projet, `drizzle-kit` (le CLI de migration) tourne *en dehors* de Nuxt, donc il ne connaît pas `runtimeConfig`. C'est pour ça qu'on garde en double `NUXT_DATABASE_URL` (lu par l'app) et `DATABASE_URL` (lu directement par `drizzle-kit` via `process.env`). Les deux doivent rester synchronisés à la main.
- **Ne jamais mettre un secret dans `public`** : même par erreur de nommage. Tout ce qui atterrit dans `runtimeConfig.public` finit dans le JS envoyé au navigateur, visible en clair par n'importe qui via les devtools.
- **En prod (Docker)** : tu passes ces variables via la section `environment:` de ton `docker-compose.yml`, ou un fichier `.env` monté/chargé par Docker. Le nom des variables ne change pas, seule la façon de les injecter change.
