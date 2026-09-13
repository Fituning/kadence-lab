// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
    modules: ['@nuxt/ui', 'nuxt-auth-utils'],
    css: ['~/assets/css/main.css'],
    colorMode: {
        preference: 'system', // garde la détection auto (déjà le défaut)
        fallback: 'dark'       // mais si indétectable, dark plutôt que light
    },
    runtimeConfig: {
        session : {
            password : '',
        },
        oauth: {
            google: {
                clientId: '',
                clientSecret: '',
                redirectUrl: '',
            }
        },
        google : {
            health : {
                clientId: '',
                clientSecret: '',
                redirectUrl: '',
            }
        },
        postgres:{
            user:'',
            password:'',
            db:'',
            host:'',
            port:''
        },
        encryptionKey : ''
        // public : {}
    }
})