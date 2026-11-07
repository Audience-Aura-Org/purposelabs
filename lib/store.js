// JSON-file persistence for orders and contact messages. Writes are
// serialised and atomic. Swap for a database when volume grows.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { dataDir } from './config.js';

let queue = Promise.resolve();
const serial = (fn) => (queue = queue.then(fn, fn));

function file(name) {
  fs.mkdirSync(dataDir(), { recursive: true });
  return path.join(dataDir(), name);
}
function readJson(name, fallback) {
  try { return JSON.parse(fs.readFileSync(file(name), 'utf8')); } catch { return fallback; }
}
function writeJson(name, data) {
  const f = file(name);
  const tmp = `${f}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, f);
}

export function createOrder(order) {
  return serial(() => {
    const orders = readJson('orders.json', []);
    const id = orders.reduce((m, o) => Math.max(m, o.id), 5000) + 1;
    const rec = { id, key: crypto.randomBytes(12).toString('hex'), status: 'on-hold', createdAt: new Date().toISOString(), ...order };
    orders.push(rec);
    writeJson('orders.json', orders);
    return rec;
  });
}

export function findOrder(id, { key, email } = {}) {
  const o = readJson('orders.json', []).find((x) => x.id === Number(id));
  if (!o) return null;
  if (key && o.key === key) return o;
  if (email && o.billing?.email?.toLowerCase() === String(email).trim().toLowerCase()) return o;
  return null;
}

export function saveMessage(msg) {
  return serial(() => {
    const all = readJson('messages.json', []);
    all.push({ ...msg, at: new Date().toISOString() });
    writeJson('messages.json', all);
  });
}

export const ORDER_STATUS = {
  'on-hold': 'Awaiting bank transfer',
  pending: 'Pending payment',
  processing: 'Processing',
  completed: 'Dispatched',
  cancelled: 'Cancelled',
};
