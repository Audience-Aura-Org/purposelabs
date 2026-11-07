import { after } from 'next/server';
import { saveMessage } from '@/lib/store';
import { sendContactEmail } from '@/lib/mail';
import { formOf, seeOther, str } from '@/lib/http';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req) {
  const f = await formOf(req);
  // Honeypot: pretend success, store nothing.
  if (f.pl_contact_website) return seeOther(req, '/contact/?notice=sent#contact-form');
  const msg = {
    name: str(f.pl_contact_name, 100), email: str(f.pl_contact_email, 200), topic: str(f.pl_contact_topic, 20),
    order: str(f.pl_contact_order, 20), message: str(f.pl_contact_message, 5000),
  };
  if (!msg.name || !EMAIL.test(msg.email) || !msg.message) return seeOther(req, '/contact/?notice=invalid#contact-form');
  await saveMessage(msg);
  after(() => sendContactEmail(msg));
  return seeOther(req, '/contact/?notice=sent#contact-form');
}
