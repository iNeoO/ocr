import "dotenv/config";
import { env } from "@ocr/infra/configs";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";

export { schema };

export const db = drizzle(env.PG_URL, { schema });
export type Database = typeof db;
