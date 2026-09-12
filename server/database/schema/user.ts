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