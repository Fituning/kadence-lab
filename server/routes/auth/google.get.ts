import {db} from "#server/utils/db.ts";
import {users} from "#shared/database/schema/user.ts";
import {eq} from "drizzle-orm";


export default defineOAuthGoogleEventHandler({
    config: {
        scope: ['openid', 'email', 'profile']
    },
    async onSuccess(event, {user, tokens}){
        let dbUser = await db.select().from(users).where(eq(users.sub, user.sub))
        if (dbUser.length === 0) {
            dbUser = await db.insert(users).values({
                sub: user.sub,
                firstName: user.given_name,
                lastName: user.family_name,
                email: user.email,
                picture: user.picture,
            }).returning()
        }
        await setUserSession(event, {
            user: {
                id: dbUser[0]!.id,
            }
        })
        return sendRedirect(event, '/')
    },
    onError(event, error) {
        console.error('Google OAuth error:', error)
        return sendRedirect(event, '/')
    },
})