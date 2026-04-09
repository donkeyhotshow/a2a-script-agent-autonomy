/**
 * One-off repro for POST /next 500 — run with Client API up: node tests/direct-tests/_debug-next-repro.mjs
 */
const CLIENT_API_URL = process.env.CLIENT_API_URL || 'http://localhost:5173';

const r = await fetch(`${CLIENT_API_URL}/api/a2a/sessions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'merged client API schema', task: 'ping' }),
});
const created = await r.json();
const sessionId = created.session?.id || created.id;
console.log('sessionId', sessionId);

const n = await fetch(`${CLIENT_API_URL}/api/a2a/sessions/${sessionId}/next`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ result: { message: 'typed result.message' } }),
});
const text = await n.text();
console.log('next status', n.status, text);
