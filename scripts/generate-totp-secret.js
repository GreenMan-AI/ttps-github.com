// ══════════════════════════════════════════════════
//  generate-totp-secret.js
//  Palaid ŠO VIENU REIZI SAVĀ DATORĀ (nevis Render!), lai izveidotu
//  savu personīgo 2FA atslēgu.
//
//  Palaišana:
//    npm install otpauth qrcode
//    node scripts/generate-totp-secret.js
//
//  Rezultāts:
//    1. Secret vērtība — ievieto to Render → Environment → ADMIN_TOTP_SECRET
//    2. QR kods (qr-code.png) — ieskenē ar Google Authenticator / Authy /
//       Microsoft Authenticator lietotni savā telefonā.
//
//  SVARĪGI: šo secret NEKAD nesūti nevienam citam un neielādē GitHub —
//  tas ir tavas personīgās 2FA piekļuves pamats. Tikai tu (caur Render
//  Environment, kur pieeja ir tikai tev) to iestati serverim.
// ══════════════════════════════════════════════════
const OTPAuth = require('otpauth');
const QRCode = require('qrcode');

const secret = new OTPAuth.Secret({ size: 20 });

const totp = new OTPAuth.TOTP({
  issuer: 'SoundPulse',
  label: process.env.ADMIN_USER || 'admin',
  algorithm: 'SHA1',
  digits: 6,
  period: 30,
  secret,
});

const uri = totp.toString();

console.log('\n══════════════════════════════════════════');
console.log(' TAVA JAUNĀ 2FA ATSLĒGA (ADMIN_TOTP_SECRET)');
console.log('══════════════════════════════════════════');
console.log(secret.base32);
console.log('══════════════════════════════════════════');
console.log('\n1. Ievieto AUGŠĒJO vērtību Render → Environment → ADMIN_TOTP_SECRET');
console.log('2. Skenē zemāk saglabāto qr-code.png ar Google Authenticator / Authy\n');

QRCode.toFile('qr-code.png', uri, { width: 300 }, (err) => {
  if (err) {
    console.error('Neizdevās izveidot QR attēlu:', err.message);
    console.log('Vari ievadīt arī manuāli — atslēgu (augšā) ieraksti autentifikatora appā "Enter code manually".');
  } else {
    console.log('✅ qr-code.png saglabāts šajā mapē — atver un ieskenē ar telefonu.');
  }
});
