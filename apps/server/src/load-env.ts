// Loads apps/server/.env in local development. Railway injects real env vars in production.
try {
  process.loadEnvFile();
} catch {
  // no .env file — fine
}
