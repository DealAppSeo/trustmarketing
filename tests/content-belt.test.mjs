import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadRows } from '../scripts/content-belt.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const beltPath = path.join(root, 'belts', 'content.json');
const keys = ['id', 'what', 'install', 'cost', 'status'];
const ids = ['read-passport', 'write-docs', 'own-grant'];

test('content belt has three rows and no probe is committed', () => {
  const raw = fs.readFileSync(beltPath, 'utf8');
  const rows = JSON.parse(raw);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((row) => row.id), ids);
  for (const row of rows) {
    assert.deepEqual(Object.keys(row), keys);
    assert.equal(row.status, 'NOT_CHECKED');
  }
  assert.equal(/install automatically/i.test(raw), false);
  assert.equal(/\bautomatically\b/i.test(raw), false);
  assert.equal(/\bwallet\b/i.test(raw), false);
  assert.equal(/\bstake\b/i.test(raw), false);
  assert.equal(/\bvideo\b/i.test(raw), false);
  assert.equal(/\bpartner\b/i.test(raw), false);
  assert.equal(fs.existsSync(path.join(root, 'probes')), false);
});

test('status stays NOT_CHECKED unless probes/content/<id>.json exists', () => {
  const missing = fs.mkdtempSync(path.join(os.tmpdir(), 'content-belt-'));
  assert.deepEqual(loadRows(missing).map((row) => row.status), ['NOT_CHECKED', 'NOT_CHECKED', 'NOT_CHECKED']);

  const present = fs.mkdtempSync(path.join(os.tmpdir(), 'content-belt-'));
  fs.writeFileSync(path.join(present, 'own-grant.json'), '{"status":"LOCAL"}\n');
  const rows = loadRows(present);
  assert.equal(rows.find((row) => row.id === 'own-grant').status, 'LOCAL');
  assert.equal(rows.find((row) => row.id === 'read-passport').status, 'NOT_CHECKED');
  assert.equal(rows.find((row) => row.id === 'write-docs').status, 'NOT_CHECKED');

  fs.writeFileSync(path.join(present, 'read-passport.json'), '{"status":"PARTNER"}\n');
  assert.equal(loadRows(present).find((row) => row.id === 'read-passport').status, 'NOT_CHECKED');
});
