import {date, integer, pgTable, text, timestamp, uuid} from 'drizzle-orm/pg-core';
import {userLevel, weekDay} from "#shared/database/enums";

export const users = pgTable('users', {
    id: uuid().defaultRandom().primaryKey(),
    sub: text('sub').notNull().unique(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email').notNull().unique(),
    picture: text('picture'),

    level: userLevel().default('beginner'),// indicative user level, todo: update after a certain number of completed races or once a scoring system is implemented.
    dateOfBirth: date('date_of_birth'),
    preferredWeeklyAvailability : weekDay('preferred_weekly_availability').array(),// document that this is just an indication the user would like respected; an empty list means no preference
    preferredWeeklySessions: integer('preferred_weekly_sessions'),// document that this is just an indication the user would like respected; if more or fewer sessions are needed, that's for the AI to decide

    logisticalConstraints : text('logistical_constraints'),
    injuryOrPainConcerns : text('injury_or_pain_concerns'),
    plannedLifeEvents : text('planned_life_events'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const googleHealthTokens = pgTable('google_health_tokens', {
    userId: uuid('user_id').primaryKey().references(() => users.id),
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token').notNull(), // encrypt before insert
    expiresAt: timestamp('expires_at').notNull(),
})