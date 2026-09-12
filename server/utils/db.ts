import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const config = useRuntimeConfig()
const client = postgres({
    host: config.postgres.host,
    port: Number(config.postgres.port),
    database: config.postgres.db,
    username: config.postgres.user,
    password: config.postgres.password,
})

export const db = drizzle(client)