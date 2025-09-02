import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { serverEnv } from "@cap/env";

function createDrizzle() {
  const connection = mysql.createPool({
    uri: serverEnv().DATABASE_URL,
  });

  return drizzle(connection);
}

console.log('DATABASE_URL:', serverEnv().DATABASE_URL);

let _cached: ReturnType<typeof createDrizzle> | undefined = undefined;

export const db = () => {
  if (!_cached) {
    _cached = createDrizzle();
  }
  return _cached;
};
