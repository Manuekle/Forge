import postgres from "postgres"

async function main() {
  const url = process.env.DATABASE_URL!.replace(":6543", ":5432").replace(/[?&]pgbouncer=true/, "")
  const sql = postgres(url, { prepare: false, max: 1 })
  const trig = await sql`select tgname from pg_trigger where tgname = 'on_auth_user_created'`
  const fk = await sql`select conname from pg_constraint where conname = 'users_id_auth_users_fk'`
  const cols = await sql`select column_name from information_schema.columns where table_schema='public' and table_name='users' and column_name='password_hash'`
  const dropped = await sql`select table_name from information_schema.tables where table_schema='public' and table_name in ('accounts','sessions','verification_tokens')`
  const pubUsers = await sql`select count(*)::int as n from public.users`
  const authUsers = await sql`select count(*)::int as n from auth.users`
  console.log({
    trigger: trig.length > 0,
    fk: fk.length > 0,
    password_hash_dropped: cols.length === 0,
    adapter_tables_remaining: dropped.map((r) => r.table_name),
    public_users: pubUsers[0].n,
    auth_users: authUsers[0].n,
  })
  await sql.end()
}

main().catch((e) => {
  console.error(e?.message || e)
  process.exit(1)
})
