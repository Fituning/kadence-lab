import {googleHealthTokens} from "#shared/database/schema/user.ts";
import {encrypt} from "#server/utils/crypto.ts";

export default defineEventHandler(async (event) => {
    const { code, error } = getQuery(event)
    const config = useRuntimeConfig()
    const { user } = await requireUserSession(event)

    if(error || !code) return sendRedirect(event,'/?health_auth_error=1')
    try {
        const tokens = await $fetch<{
            access_token: string
            refresh_token: string
            expires_in: number
        }>('https://oauth2.googleapis.com/token', {
            method: 'POST',
            body: {
                code,
                client_id: config.google.health.clientId,
                client_secret: config.google.health.clientSecret,
                redirect_uri: config.google.health.redirectUrl,
                grant_type: 'authorization_code',
            },
        })

        await db.insert(googleHealthTokens).values({
            userId : user.id,
            accessToken: tokens.access_token,
            refreshToken: encrypt(tokens.refresh_token),
            expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        }).onConflictDoUpdate({
            target: googleHealthTokens.userId,
            set: { accessToken: tokens.access_token, expiresAt: new Date(Date.now() + tokens.expires_in * 1000) },
        })

        return sendRedirect(event, '/')
    }catch(e){
        console.error(e)
        throw e;
    }


})