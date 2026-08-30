// server/scripts/setup-admin.js
//
// Interactive one-time setup for the admin account. Run with:
//   npm run setup-admin
//
require('dotenv').config();
const readline = require('readline');
const { mutate, readDb } = require('../lib/store');
const { hashPassword, generateTotpSecret, totpQrDataUrl } = require('../lib/auth');

function ask(rl, question, hidden = false) {
  return new Promise((resolve) => {
    if (!hidden) {
      rl.question(question, resolve);
      return;
    }
    // Minimal masked input for the password prompt.
    const stdin = process.stdin;
    process.stdout.write(question);
    let input = '';
    const onData = (char) => {
      char = char.toString();
      if (char === '\n' || char === '\r' || char === '\u0004') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(input);
        return;
      }
      if (char === '\u0003') process.exit(1); // Ctrl+C
      if (char === '\u007f') { input = input.slice(0, -1); return; }
      input += char;
    };
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

(async function main() {
  const db = readDb();
  if (db.admin) {
    console.log('An admin account already exists. To reset it, delete the "admin" entry from data/db.json and run this script again.');
    process.exit(0);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('\n=== WAVE — Admin account setup ===\n');
  const username = (await ask(rl, 'Username: ')).trim() || 'admin';
  const password = await ask(rl, 'Password (at least 10 characters): ', true);
  rl.close();

  if (password.length < 10) {
    console.error('\nThe password must be at least 10 characters long. Please start over.');
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const totp = generateTotpSecret(username);

  await mutate((d) => {
    d.admin = {
      username,
      passwordHash,
      totpSecret: totp.base32,
      totpEnabled: true
    };
  });

  const qrDataUrl = await totpQrDataUrl(totp.otpauth_url);

  console.log('\n✅ Admin account created.\n');
  console.log('Add this key to your authenticator app (Google Authenticator, Authy, etc.):\n');
  console.log(`   Manual key: ${totp.base32}\n`);
  console.log('Or paste this QR data URL into a browser to scan it:\n');
  console.log(qrDataUrl);
  console.log('\nSecret word to open the admin login on the site (changeable later in the panel): "polaris"');
  console.log('\nAll set! Start the server with: npm start\n');
  process.exit(0);
})();
