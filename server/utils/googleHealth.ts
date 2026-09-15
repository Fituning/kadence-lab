import {googleHealthTokens} from "#shared/database/schema/user.ts";
import {eq} from "drizzle-orm";
import {decrypt} from "#server/utils/crypto.ts";

export async function getValidAccessToken(userId: string) {
    const config = useRuntimeConfig()
    const [row] = await db.select().from(googleHealthTokens).where(eq(googleHealthTokens.userId, userId))
    if (!row) throw new Error('Google Health non connecté pour cet utilisateur')

    if (new Date() < row.expiresAt) return row.accessToken

    const refreshed = await $fetch<{ access_token: string; expires_in: number }>(
        'https://oauth2.googleapis.com/token',
        {
            method: 'POST',
            body: {
                client_id: config.google.health.clientId,
                client_secret: config.google.health.clientSecret,
                refresh_token: decrypt(row.refreshToken),
                grant_type: 'refresh_token',
            },
        },
    )

    await db.update(googleHealthTokens)
        .set({ accessToken: refreshed.access_token, expiresAt: new Date(Date.now() + refreshed.expires_in * 1000) })
        .where(eq(googleHealthTokens.userId, userId))

    return refreshed.access_token
}
