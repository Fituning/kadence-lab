import {pgTable, text, timestamp, uuid} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: uuid().defaultRandom().primaryKey(),
    sub: text('sub').notNull().unique(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email').notNull().unique(),
    picture: text('picture'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
});

// server/db/schema.ts
export const googleHealthTokens = pgTable('google_health_tokens', {
    userId: uuid('user_id').primaryKey().references(() => users.id),
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token').notNull(), // à chiffrer avant insert
    expiresAt: timestamp('expires_at').notNull(),
})