// Test the admin attendance endpoint to verify polling will work
const BACKEND_URL = 'https://faithly-backend.onrender.com';

async function test() {
  const jwt = (await import('jsonwebtoken')).default;
  // Generate admin token
  const token = jwt.sign(
    { email: 'admin@faithly.com', role: 'admin' }, 
    'faithly_secret_key_2024_secure', 
    { expiresIn: '1h' }
  );

  console.log('--- Testing admin attendance query ---');
  const res = await fetch(`${BACKEND_URL}/api/admin/attendance?session=SESS-2026-0005&limit=10`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));
}

test().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
