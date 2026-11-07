// Fixed notices selectable via ?notice=key (no user text in URLs).
export const NOTICES = {
  sent: { type: 'success', text: 'Thanks — your message has been sent. We usually reply within one business day.' },
  invalid: { type: 'error', text: 'Please fill in your name, a valid email and a message.' },
  accounts: { type: 'info', text: 'Online accounts are being moved to our new website. Please contact us and we’ll help you straight away.' },
  notfound: { type: 'error', text: 'We couldn’t find an order with that number and email. Check both and try again.' },
};
