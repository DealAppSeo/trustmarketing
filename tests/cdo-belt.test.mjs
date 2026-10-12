import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadRows } from '../scripts/cdo-belt.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const beltPath = path.join(root, 'belts', 'cdo.json');
const keys = ['id', 'what', 'install', 'cost', 'status'];
const ids = ['read-ui', 'design-proposal', 'static-mockup', 'accessibility-note', 'repo-grant'];

test('cdo belt has five rows and no probe is committed', () => {
  const raw = fs.readFileSync(beltPath, 'utf8');
  const rows = JSON.parse(raw);
  assert.equal(rows.length, 5);
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

test('status stays NOT_CHECKED unless probes/cdo/<id>.json exists', () => {
  const missing = fs.mkdtempSync(path.join(os.tmpdir(), 'cdo-belt-'));
  assert.deepEqual(loadRows(missing).map((row) => row.status), ids.map(() => 'NOT_CHECKED'));

  const present = fs.mkdtempSync(path.join(os.tmpdir(), 'cdo-belt-'));
  fs.writeFileSync(path.join(present, 'repo-grant.json'), '{"status":"LOCAL"}\n');
  const rows = loadRows(present);
  assert.equal(rows.find((row) => row.id === 'repo-grant').status, 'LOCAL');
  assert.equal(rows.find((row) => row.id === 'read-ui').status, 'NOT_CHECKED');
  assert.equal(rows.find((row) => row.id === 'design-proposal').status, 'NOT_CHECKED');

  fs.writeFileSync(path.join(present, 'read-ui.json'), '{"status":"PARTNER"}\n');
  assert.equal(loadRows(present).find((row) => row.id === 'read-ui').status, 'NOT_CHECKED');
});
