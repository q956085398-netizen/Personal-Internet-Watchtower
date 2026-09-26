import type { DatabaseSync } from "node:sqlite";

/** Runs `fn` inside a transaction; rolls back and rethrows on failure. */
export function withTransaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
