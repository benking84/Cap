import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { serverEnv } from "@cap/env";
import { sql } from "drizzle-orm";
import type { AnyMySqlColumn } from "drizzle-orm/mysql-core";

function createDrizzle() {
  const connection = mysql.createPool({
    uri: serverEnv().DATABASE_URL,
  });

	return drizzle(connection);
}

let _cached: ReturnType<typeof createDrizzle> | undefined;

export const db = () => {
	if (!_cached) {
		_cached = createDrizzle();
	}
	return _cached;
};

// Use the incoming value if one exists, else fallback to the DBs existing value.
export const updateIfDefined = <T>(v: T | undefined, col: AnyMySqlColumn) =>
	sql`COALESCE(${v === undefined ? sql`NULL` : v}, ${col})`;
