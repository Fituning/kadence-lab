import {integer, pgTable, serial, uuid} from "drizzle-orm/pg-core";
import {programs} from "#shared/database/schema/program";
import {weekPhase} from "#shared/database/enums";


export const weeks = pgTable('weeks',{
    id : serial().primaryKey(),
    programId : uuid('program_id').notNull().references(() => programs.id),
    weekIndex : integer('week_index').notNull(),
    phase: weekPhase().notNull(),
})