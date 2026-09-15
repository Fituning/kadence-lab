import {pgEnum} from "drizzle-orm/pg-core";

export const userLevel = pgEnum('user_level', ['beginner','intermediate','advanced'])

export const weekDay = pgEnum('week_day',['mon','tue', 'wed', 'thu', 'fri','sat','sun'])

export const weekPhase = pgEnum('week_phase', ['base','build','peak','taper','recovery']);

export const sportEnum = pgEnum('sport', ['RUNNING', 'BIKING', 'SWIMMING'])

export const sessionType = pgEnum('session_type', [
    'recovery',
    'long_run',
    'interval',
    'tempo',
    'threshold',
    'hill_repeats',
    'fartlek',
    'technical_descent',
    'race_simulation',
    'race_recon',
    'test_zones',
    'test_hill',
    'cross_training',
    'rest',
    'custom',
])

export const sessionPriority = pgEnum('session_priority', ['core','optional'])

export const terrainType = pgEnum('terrain_type', ['road','technical','trail', 'river' ])

export const heartRateZone = pgEnum('heart_rate_zone', ['Z1','Z2','Z3','Z4', 'Z5'])

