// Verifies the Titan (or any SMTP) login and sends a test email.
//   npm run mail:test                 -> sends to STORE_EMAIL / SMTP_USER
//   npm run mail:test -- you@x.com    -> sends to that address
// Reads .env.local automatically.
import { mail } from '../lib/config.js';
import { verifyMail, sendTestEmail } from '../lib/mail.js';

const to = process.argv[2] || mail.storeEmail;
console.log(`SMTP  ${mail.host || '(none)'}:${mail.port} ${mail.secure ? 'SSL' : 'STARTTLS'}`);
console.log(`Login ${mail.user || '(none)'}`);
console.log(`From  ${mail.from}`);

if (!mail.user || !mail.pass) {
  console.error('\nSet SMTP_USER and SMTP_PASS in .env.local first (see .env.example).');
  process.exit(1);
}

const v = await verifyMail();
if (!v.ok) {
  console.error(`\n✖ Login failed: ${v.reason}`);
  console.error('  Check the mailbox password in Titan, and that SMTP_USER is the full email address.');
  process.exit(1);
}
console.log('\n✔ Logged in to SMTP');

if (!to) { console.log('No recipient (set STORE_EMAIL or pass an address).'); process.exit(0); }
try {
  const info = await sendTestEmail(to);
  console.log(`✔ Test email sent to ${to} (${info.messageId})`);
  process.exit(0);
} catch (err) {
  console.error(`✖ Send failed: ${err.message}`);
  process.exit(1);
}
