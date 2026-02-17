require('dotenv').config();
const pool = require('./config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
console.log('JWT_SECRET set:', !!JWT_SECRET);

async function testLogin() {
  const email = 'test@test.no';
  const password = 'Test1234!';

  try {
    console.log('1. Querying user...');
    const result = await pool.query(
      `SELECT id, email, password_hash, full_name, role, company_id, is_active
       FROM users
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      console.log('User not found!');
      process.exit(1);
    }

    const user = result.rows[0];
    console.log('2. User found:', user.email);

    if (!user.is_active) {
      console.log('User not active!');
      process.exit(1);
    }

    console.log('3. Verifying password...');
    const validPassword = await bcrypt.compare(password, user.password_hash);
    console.log('   Password valid:', validPassword);

    if (!validPassword) {
      console.log('Wrong password!');
      process.exit(1);
    }

    console.log('4. Generating JWT...');
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      company_id: user.company_id,
      full_name: user.full_name,
      iat: Math.floor(Date.now() / 1000)
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    console.log('   Token generated:', token.substring(0, 50) + '...');

    console.log('5. Updating last_login...');
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );
    console.log('   Done!');

    console.log('\n✅ LOGIN SUCCESS!');
    console.log('Token:', token);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

testLogin();
