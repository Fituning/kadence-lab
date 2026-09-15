import {date, integer, numeric, pgTable, text, time, uuid} from "drizzle-orm/pg-core";
import {terrainType} from "#shared/database/enums";


export const races = pgTable('race', {
    id : uuid().defaultRandom().primaryKey(),
    name: text('name').notNull(),
    date: date('date').notNull(),
    distance: numeric('distance', { precision: 5, scale: 2 }).notNull(),
    elevationGainM : integer('elevation_gain_m').notNull(),
    location : text('location'),
    terrain: terrainType().array(),
    startTime : time('start_time'),
    targetTime : integer('target_time'),
    gpxRef : text('gpx_ref'),

})