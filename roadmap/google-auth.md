Voici la démarche complète, à partir de maintenant (variables d'env déjà réglées), sans DB pour l'instant.

## 1. Installer et activer le module

```bash
npm install nuxt-auth-utils
```

Puis l'ajouter dans `modules` de `nuxt.config.ts` (ou utiliser `npx nuxi module add auth-utils` vu sur ton screenshot, qui fait les deux étapes en une).

## 2. Déclarer la config OAuth dans `runtimeConfig`

Dans `nuxt.config.ts`, ajoute le bloc `runtimeConfig.oauth.google` avec `clientId` et `clientSecret` vides (comme vu dans le cours sur les env vars — ce sont ces clés qui seront écrasées par `NUXT_OAUTH_GOOGLE_CLIENT_ID` / `NUXT_OAUTH_GOOGLE_CLIENT_SECRET` au runtime).

## 3. Créer le handler de callback

Fichier : `server/routes/auth/google.get.ts`

Utilise `defineOAuthGoogleEventHandler` (auto-importé). Points à regarder dans la doc (https://nuxt-auth-utils.vercel.app/providers/google) :
- `scope: ['openid', 'email', 'profile']`
- `onSuccess(event, { user })` → **sans DB pour l'instant**, appelle directement `setUserSession(event, { user: { email: user.email, name: user.name, picture: user.picture } })`, puis redirige vers `/` avec `sendRedirect`
- `onError(event, error)` → log + redirection vers `/?auth_error=google`

## 4. Créer la route de déconnexion

Fichier : `server/routes/auth/logout.get.ts` — utilise `clearUserSession(event)` puis redirige vers `/`.

## 5. Créer la page de login

Fichier : `app/pages/login.vue` — un simple lien `<a href="/auth/google">`. Pas de composant OAuth côté client, c'est une redirection HTTP classique gérée par ta route serveur de l'étape 3.

## 6. Créer le middleware de protection

Fichier : `app/middleware/auth.global.ts` (le suffixe `.global` = appliqué à toutes les routes sans avoir à le déclarer page par page).

Dedans, utilise `useUserSession()` (auto-importé côté client/universel) pour checker `loggedIn.value`. Logique à coder :
- Si `loggedIn.value` est `false` **et** que la route ciblée n'est pas `/login` (ni `/auth/google`, `/auth/logout`) → `return navigateTo('/login')`
- Sinon, laisser passer

Doc middleware Nuxt : https://nuxt.com/docs/guide/directory-structure/app/middleware — regarde la différence entre `to`/`from` (les paramètres reçus par le middleware) pour savoir comparer la route courante.

## 7. Afficher l'état de connexion dans l'UI

N'importe où (header, page d'accueil…), utilise `useUserSession()` pour afficher conditionnellement `user.value?.name` ou un bouton de connexion/déconnexion.

## 8. Tester le flow complet

Dans l'ordre :
1. `npm run dev`
2. Va sur `/` sans être connecté → le middleware doit te rediriger vers `/login`
3. Clique sur le lien Google → passe par l'écran de consentement Google → redirige vers `/auth/google` → `onSuccess` s'exécute → session créée → redirige vers `/`
4. Vérifie que `useUserSession()` reflète bien `loggedIn: true` et affiche ton nom
5. Teste `/auth/logout` → vérifie que tu es bien redirigé vers `/login`

---

Ce qui reste volontairement **hors scope** pour l'instant (tu l'as bien identifié) : persister l'utilisateur en base — ce sera une session à part, avec Docker Postgres + Drizzle, une fois ce flow validé visuellement.

Dis-moi où tu bloques en codant ces étapes.