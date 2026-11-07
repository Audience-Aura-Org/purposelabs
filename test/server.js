// Starts the built app with `next start` on a free port, isolated data dir and
// file-based mail outbox. Requires `npm run build` first.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const freePort = () => new Promise((res) => {
  const s = net.createServer().listen(0, () => { const { port } = s.address(); s.close(() => res(port)); });
});

export async function startServer(extraEnv = {}) {
  if (!fs.existsSync('.next/BUILD_ID')) throw new Error('Run `npm run build` before the tests.');
  const port = await freePort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pl-test-'));
  const env = {
    ...process.env, PORT: String(port), DATA_DIR: dataDir, MAIL_TRANSPORT: 'file',
    STORE_EMAIL: 'orders@store.test', COOKIE_SECRET: 'test-secret', NODE_ENV: 'production', ...extraEnv,
  };
  const nextBin = path.join('node_modules', 'next', 'dist', 'bin', 'next');
  const child = spawn(process.execPath, [nextBin, 'start', '-p', String(port)], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(base + '/robots.txt')).ok) break; } catch { /* not up yet */ }
    if (child.exitCode !== null) throw new Error('next start exited:\n' + log);
    await new Promise((r) => setTimeout(r, 150));
  }
  return {
    base, dataDir,
    log: () => log,
    outbox: () => {
      const f = path.join(dataDir, 'outbox.jsonl');
      return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
    },
    async stop() {
      child.kill();
      await new Promise((r) => (child.exitCode !== null ? r() : child.once('exit', r)));
      fs.rmSync(dataDir, { recursive: true, force: true });
    },
  };
}

/** fetch with a cookie jar and no auto-redirects. */
export function client(base) {
  const jar = new Map();
  return async function req(url, { method = 'GET', form, json, headers: extra = {} } = {}) {
    const headers = { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '), ...extra };
    let body;
    if (form) { headers['content-type'] = 'application/x-www-form-urlencoded'; body = new URLSearchParams(form).toString(); }
    if (json) headers.accept = 'application/json';
    const res = await fetch(base + url, { method, headers, body, redirect: 'manual' });
    for (const c of res.headers.getSetCookie()) {
      const [kv] = c.split(';');
      const i = kv.indexOf('=');
      const k = kv.slice(0, i), v = kv.slice(i + 1);
      if (!v || /Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(c)) jar.delete(k); else jar.set(k, v);
    }
    const text = await res.text();
    return { status: res.status, location: res.headers.get('location'), text, json: () => JSON.parse(text) };
  };
}
