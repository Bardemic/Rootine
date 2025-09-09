import { betterAuth } from "better-auth";
import { Pool } from "pg";

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'rootine',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5437'),
});

pool.on('connect', (client) => {
  client.query('SET search_path TO auth;');
});

export const auth = betterAuth({
    database: pool,
    emailAndPassword: {
        enabled: true,
    },
    trustedOrigins: [
        process.env.FRONTEND_URL || 'http://localhost:7000',
    ],
});


