/// <reference types="node" />
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

function getDatabaseUrl() {
    if (process.env.DATABASE_URL) {
        return process.env.DATABASE_URL
    }

    const user = encodeURIComponent(process.env.DATABASE_USER);
    const password = encodeURIComponent(process.env.DATABASE_PASSWORD);
    const host = process.env.DATABASE_HOST;
    const port = process.env.DATABASE_PORT;
    const database = process.env.DATABASE_NAME;

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
