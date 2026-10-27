const { Pool } = require('pg');

const projectRef = 'vxstcdhbjpfzykqdkjob';
const pass = 'Sanika@21122';
const encodedPass = encodeURIComponent(pass);

const hosts = [
  'aws-0-eu-central-1.pooler.supabase.com',
  'aws-1-eu-central-1.pooler.supabase.com',
  'eu-central-1.pooler.supabase.com'
];

const ports = [6543, 5432];
const users = [`postgres.${projectRef}`, 'postgres'];

async function test(host, port, user) {
  const uri = `postgresql://${user}:${encodedPass}@${host}:${port}/postgres`;
  const pool = new Pool({
    connectionString: uri,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 3000
  });
  try {
    const res = await pool.query('SELECT NOW() as now');
    console.log(`SUCCESS! Host: ${host}, Port: ${port}, User: ${user} -> Result: ${res.rows[0].now}`);
    await pool.end();
    return true;
  } catch (err) {
    console.log(`Failed: ${host}:${port} user=${user} -> ${err.message}`);
    await pool.end();
    return false;
  }
}

(async () => {
  for (const h of hosts) {
    for (const p of ports) {
      for (const u of users) {
        const ok = await test(h, p, u);
        if (ok) return;
      }
    }
  }
})();
