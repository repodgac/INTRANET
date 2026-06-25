import { Pool } from "pg";
import { env } from "../config/env";

const connectionString = env.databaseUrl.trim();

export const db = connectionString
  ? new Pool({
      connectionString,
    })
  : new Pool({
      host: env.databaseHost,
      port: env.databasePort,
      database: env.databaseName,
      user: env.databaseUser,
      password: env.databasePassword,
    });
