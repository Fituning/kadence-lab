


export default defineOAuthGoogleEventHandler({
    config: {
        scope: ['openid', 'email', 'profile']
    },
    async onSuccess(event, {user, tokens}){
        await setUserSession(event, {
            user: {
                google: user.sub
            }
        })
        return sendRedirect(event, '/')
    },
    onError(event, error) {
        console.error('Google OAuth error:', error)
        return sendRedirect(event, '/')
    },
})