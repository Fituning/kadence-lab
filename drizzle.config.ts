import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

function getDatabaseUrl() {
    const user = encodeURIComponent(process.env.NUXT_POSTGRES_USER);
    const password = encodeURIComponent(process.env.NUXT_POSTGRES_PASSWORD);
    const host = process.env.NUXT_POSTGRES_HOST;
    const port = process.env.NUXT_POSTGRES_PORT;
    const database = process.env.NUXT_POSTGRES_DB;

    return `postgres://${user}:${password}@${host}:${port}/${database}`;
}

export default defineConfig({
    out: './server/database/drizzle',
    schema: './server/database/schema/*',
    dialect: 'postgresql',
    dbCredentials: {
        url: getDatabaseUrl(),
    },
});
