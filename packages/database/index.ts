import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { serverEnv } from "@cap/env";
import { sql } from "drizzle-orm";
import type { AnyMySqlColumn } from "drizzle-orm/mysql-core";

function createDrizzle() {
  const databaseUrl = serverEnv().DATABASE_URL;
  
  // Log the database URL for debugging (without password)
  console.log("DATABASE_URL:", databaseUrl.replace(/:[^:@]+@/, ':***@'));
  
  // Parse the DATABASE_URL to check if it's using socket connection
  const isSocketConnection = databaseUrl.includes('?socket=') || databaseUrl.includes('socketPath=');
  
  let connection;
  if (isSocketConnection) {
    // Extract socket path and other connection details
    const url = new URL(databaseUrl);
    const socketPath = url.searchParams.get('socket') || url.searchParams.get('socketPath');
    const [user, password] = url.username && url.password 
      ? [url.username, url.password]
      : ['', ''];
    const database = url.pathname.replace('/', '');
    
    console.log(`🔌 Using Unix socket connection: ${socketPath}`);
    
    connection = mysql.createPool({
      user,
      password,
      database,
      socketPath: socketPath || undefined,
      // DO NOT set host when using socketPath - forces socket-only connection
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 60000, // 60 seconds
    });
  } else {
    // Use standard URI connection
    connection = mysql.createPool({
      uri: databaseUrl,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 60000, // 60 seconds
    });
  }

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

// Use the incoming value if one exists, else fallback to the DBs existing value.
export const updateIfDefined = <T>(v: T | undefined, col: AnyMySqlColumn) =>
	sql`COALESCE(${v === undefined ? sql`NULL` : v}, ${col})`;