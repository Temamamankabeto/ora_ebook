import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function q(text, params) {
  return pool.query(text, params);
}
