// One-shot script to pre-create dev quick-login users via the Supabase Admin API.
// Bypasses email signup rate limits. Run once: `node scripts/create-dev-users.mjs`
// Safe to re-run — idempotent.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://cvoilvhdqczdhpijutyt.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("Set SUPABASE_SERVICE_ROLE_KEY env var first.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const users = [
  { email: "dev-therapist@bondable.local", password: "DevPass123!", first_name: "Dev", last_name: "Therapist", role: "therapist" },
  { email: "dev-client@bondable.local",    password: "DevPass123!", first_name: "Dev", last_name: "Client",    role: "client"    },
];

for (const u of users) {
  const { data, error } = await admin.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { first_name: u.first_name, last_name: u.last_name, role: u.role, full_name: `${u.first_name} ${u.last_name}` },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already") || error.message.toLowerCase().includes("registered")) {
      console.log(`• ${u.email} — already exists, ensuring profile role...`);
    } else {
      console.error(`✗ ${u.email}: ${error.message}`);
      continue;
    }
  } else {
    console.log(`✓ Created ${u.email} (id=${data.user.id})`);
  }

  // Ensure the profile row has the correct role (trigger might not fire on admin create in all versions)
  const { data: found } = await admin.auth.admin.listUsers();
  const match = found?.users?.find((x) => x.email === u.email);
  if (!match) continue;

  const { error: upsertErr } = await admin
    .from("profiles")
    .upsert({ id: match.id, email: u.email, first_name: u.first_name, last_name: u.last_name, role: u.role }, { onConflict: "id" });

  if (upsertErr) console.error(`  profile upsert: ${upsertErr.message}`);
  else console.log(`  profile ready (role=${u.role})`);
}

console.log("\nDone. Use the Dev quick-login buttons on the Login page.");
