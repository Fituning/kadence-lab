

export default defineEventHandler((event) => {
    const config = useRuntimeConfig()
    const params = new URLSearchParams({
        client_id: config.google.health.clientId,
        redirect_uri: config.google.health.redirectUrl,
        response_type: 'code',
        access_type: 'offline',
        prompt: 'consent',
        include_granted_scopes: 'true',
        scope: 'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly',
    })
    return sendRedirect(event, `https://accounts.google.com/o/oauth2/v2/auth?${params}`)
})