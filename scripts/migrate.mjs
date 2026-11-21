import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error(
    "SUPABASE_DB_URL is missing. Copy the Session pooler connection string from Supabase → Project Settings → Database.",
  );
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

try {
  await client.query(`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const dir = path.join(process.cwd(), "supabase", "migrations");
  const files = (await readdir(dir)).filter((file) => file.endsWith(".sql")).sort();

  for (const file of files) {
    const { rows } = await client.query(
      "select 1 from schema_migrations where name = $1",
      [file],
    );
    if (rows.length > 0) {
      console.log(`skip ${file}`);
      continue;
    }

    const sql = await readFile(path.join(dir, file), "utf8");
    console.log(`apply ${file}`);
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into schema_migrations (name) values ($1)", [file]);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }

  console.log("migrations complete");
} finally {
  await client.end();
}
