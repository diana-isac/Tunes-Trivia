const { createClient } = require("@supabase/supabase-js");
const { loadEnv, requireEnv } = require("./env");

let adminClient = null;
let browserConfig = null;

function getSupabaseAdminClient() {
  if (adminClient) {
    return adminClient;
  }

  loadEnv();

  adminClient = createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  return adminClient;
}

function getSupabaseBrowserConfig() {
  if (browserConfig) {
    return browserConfig;
  }

  loadEnv();

  browserConfig = {
    url: requireEnv("SUPABASE_URL"),
    anonKey: requireEnv("SUPABASE_ANON_KEY")
  };

  return browserConfig;
}

module.exports = {
  getSupabaseAdminClient,
  getSupabaseBrowserConfig
};
