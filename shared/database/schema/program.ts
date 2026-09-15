import {date, pgTable, text, uuid} from "drizzle-orm/pg-core";
import {users} from "#shared/database/schema/user";
import {races} from "#shared/database/schema/race";

export const programs = pgTable('programs',{
    id : uuid().defaultRandom().primaryKey(),
    name : text().notNull(),
    userId : uuid('user_id').notNull().references(() => users.id),
    raceId : uuid('race_id').notNull().references(() => races.id),
    generatedAt: date('generated_at').defaultNow().notNull(),
    startDate: date('start_date').defaultNow().notNull(),

});