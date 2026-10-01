import { Database } from "bun:sqlite";

const db = new Database(process.env.DATABASE_PATH ?? "color.sqlite", {
  create: true,
});

db.run("PRAGMA journal_mode = WAL");

db.run(`
  CREATE TABLE IF NOT EXISTS member_roles (
    guild_id TEXT NOT NULL,
    user_id  TEXT NOT NULL,
    role_id  TEXT NOT NULL,
    PRIMARY KEY (guild_id, user_id)
  )
`);

const selectRole = db.query(
  "SELECT role_id FROM member_roles WHERE guild_id = ? AND user_id = ?"
);

const upsertRole = db.query(`
  INSERT INTO member_roles (guild_id, user_id, role_id)
  VALUES (?, ?, ?)
  ON CONFLICT (guild_id, user_id) DO UPDATE SET role_id = excluded.role_id
`);

const removeRole = db.query(
  "DELETE FROM member_roles WHERE guild_id = ? AND user_id = ?"
);

/**
 * The id of the role this bot created for a member, if any.
 */
export function getRoleId(guildId, userId) {
  return selectRole.get(guildId, userId)?.role_id ?? null;
}

export function saveRoleId(guildId, userId, roleId) {
  upsertRole.run(guildId, userId, roleId);
}

export function deleteRoleRecord(guildId, userId) {
  removeRole.run(guildId, userId);
}