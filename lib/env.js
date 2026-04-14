const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

let loaded = false;

function loadEnv() {
  if (loaded) {
    return;
  }

  const candidates = [".env.local", ".env"];

  for (const fileName of candidates) {
    const fullPath = path.join(process.cwd(), fileName);
    if (fs.existsSync(fullPath)) {
      dotenv.config({ path: fullPath });
    }
  }

  loaded = true;
}

function requireEnv(name) {
  loadEnv();

  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

module.exports = {
  loadEnv,
  requireEnv
};

