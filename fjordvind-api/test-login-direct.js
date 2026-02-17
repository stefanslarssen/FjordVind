const pool = require('./config/database');
const bcrypt = require('bcryptjs');

async function testLogin() {
  const email = 'test@test.no';
  const password = 'Test1234!';

  try {
    console.log('Testing login for:', email);
    console.log('Password:', password);

    const result = await pool.query(
      `SELECT id, email, password_hash, full_name, role, company_id, is_active
       FROM users
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    console.log('Query result rows:', result.rows.length);

    if (result.rows.length === 0) {
      console.log('User not found!');
      process.exit(1);
    }

    const user = result.rows[0];
    console.log('User found:', {
      id: user.id,
      email: user.email,
      is_active: user.is_active,
      password_hash: user.password_hash
    });

    if (!user.is_active) {
      console.log('User is not active!');
      process.exit(1);
    }

    console.log('Comparing password...');
    const validPassword = await bcrypt.compare(password, user.password_hash);
    console.log('Password valid:', validPassword);

    if (validPassword) {
      console.log('LOGIN SUCCESS!');
    } else {
      console.log('LOGIN FAILED - wrong password');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error during login test:', err);
    process.exit(1);
  }
}

testLogin();
