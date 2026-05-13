const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://postgres:Iamback@326474@db.zhtyvjvqcdybsjgvpqqp.supabase.co:5432/postgres",
});

async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Connected to Supabase!');
    console.log('Current time:', result.rows[0].now);
    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();