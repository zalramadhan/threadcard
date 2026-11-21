import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);

function argValue(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const file = argValue("--file", ".env.production.local");
const appUrlOverride = argValue("--app-url", "");
const allowLocalhost = args.includes("--allow-localhost");

if (!existsSync(file)) {
  console.error(
    `Missing ${file}. Copy .env.production.example to ${file}, fill it in, then run this script again.`,
  );
  process.exit(1);
}

const values = new Map();
for (const rawLine of readFileSync(file, "utf8").split("\n")) {
  const line = rawLine.trim();
  if (!line || line.startsWith("#")) continue;
  const separator = line.indexOf("=");
  if (separator <= 0) continue;
  const key = line.slice(0, separator).trim();
  let value = line.slice(separator + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  values.set(key, value);
}

if (appUrlOverride) values.set("APP_URL", appUrlOverride);

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "APP_URL",
];

const optional = [
  "ADMIN_EMAIL",
  "WHATSAPP_NUMBER",
  "LIFETIME_PRICE",
  "THREADCARD_PASSWORD",
  "THREADCARD_USER",
];

const missing = required.filter((key) => !values.get(key));
if (missing.length > 0) {
  console.error(`Missing values in ${file}: ${missing.join(", ")}`);
  process.exit(1);
}

const appUrl = values.get("APP_URL") || "";
if (!/^https:\/\//.test(appUrl)) {
  console.error("APP_URL must be an https:// production URL.");
  process.exit(1);
}
if (!allowLocalhost && /localhost|127\.0\.0\.1/.test(appUrl)) {
  console.error(
    "APP_URL still points at localhost. Deploy once, then pass --app-url https://your-project.vercel.app (or set the custom domain).",
  );
  process.exit(1);
}

const serviceKey = values.get("SUPABASE_SERVICE_ROLE_KEY") || "";
if (serviceKey.startsWith("eyJ")) {
  try {
    const payload = JSON.parse(
      Buffer.from(serviceKey.split(".")[1] ?? "", "base64url").toString(),
    );
    if (payload.role !== "service_role") {
      console.error(
        `SUPABASE_SERVICE_ROLE_KEY is a "${payload.role ?? "unknown"}" key, not service_role.`,
      );
      process.exit(1);
    }
  } catch {
    console.error("SUPABASE_SERVICE_ROLE_KEY does not look like a valid key.");
    process.exit(1);
  }
}

function vercel(argsForCli, options = {}) {
  return spawnSync("npx", ["--yes", "vercel", ...argsForCli], {
    stdio: options.input ? ["pipe", "inherit", "inherit"] : "inherit",
    input: options.input,
    encoding: "utf8",
  });
}

const whoami = spawnSync("npx", ["--yes", "vercel", "whoami"], {
  encoding: "utf8",
});
if (whoami.status !== 0) {
  console.error(
    "Vercel CLI is not signed in. Run `npx vercel login`, then `npx vercel link` inside this folder and try again.",
  );
  process.exit(1);
}

console.log(`Pushing production variables to Vercel (${whoami.stdout.trim()})…`);

const keys = [...required, ...optional];
for (const key of keys) {
  const value = values.get(key);
  if (!value) {
    console.log(`skip ${key} (empty)`);
    continue;
  }

  // Adding a name that already exists fails, so replace it.
  vercel(["env", "rm", key, "production", "--yes"]);
  const result = vercel(["env", "add", key, "production"], {
    input: `${value}\n`,
  });
  if (result.status !== 0) {
    console.error(`Failed to set ${key}.`);
    process.exit(1);
  }
  console.log(`set ${key}`);
}

console.log("\nDone. Redeploy for the new values to take effect: npx vercel --prod");
