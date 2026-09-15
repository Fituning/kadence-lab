import {date, integer, jsonb, pgTable, text, uuid} from "drizzle-orm/pg-core";
import {sessionPriority, sessionType, sportEnum, terrainType, weekDay} from "#shared/database/enums";
import {weeks} from "#shared/database/schema/weeks";


export const sessions = pgTable('sessions', {
    id : uuid().defaultRandom().primaryKey(),
    weekId : integer('week_id').notNull().references(() => weeks.id),
    suggestedDayOfWeek : weekDay('suggested_day_of_week').notNull(),
    scheduledDate : date('scheduled_date').notNull(),
    sport : sportEnum().notNull().default("RUNNING"),
    type: sessionType().notNull(),
    title : text('session_title').notNull(),
    priority : sessionPriority().notNull(),
    testDifficultyLevel : integer('test_difficulty_level'),
    suggestedTerrainType : terrainType('suggested_terrain_type').array(),
    why : text('why'),
    customDescription: text('custom_description'),// required if type = "custom"
    steps : jsonb(), // null if type = test_zones or test_hill (predefined sessions)
    routeSegment : jsonb('route_segment'), // required only if type = "race_recon"
})