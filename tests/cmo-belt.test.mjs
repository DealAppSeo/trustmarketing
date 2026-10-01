import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadRows } from '../scripts/cmo-belt.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const beltPath = path.join(root, 'belts', 'cmo.json');
const keys = ['id', 'what', 'install', 'cost', 'status'];

test('cmo belt has three rows and no probe is committed', () => {
  const raw = fs.readFileSync(beltPath, 'utf8');
  const rows = JSON.parse(raw);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((row) => row.id), ['openmontage', 'phone-clips', 'ffmpeg']);
  for (const row of rows) {
    assert.deepEqual(Object.keys(row), keys);
    assert.equal(row.status, 'NOT_CHECKED');
  }
  assert.equal(/install automatically/i.test(raw), false);
  assert.equal(/\bwallet\b/i.test(raw), false);
  assert.equal(/\bstake\b/i.test(raw), false);
  assert.equal(/\bvideo\b/i.test(raw), false);
  assert.equal(/\bpartner\b/i.test(raw), false);
  assert.equal(fs.existsSync(path.join(root, 'probes')), false);
});

test('status stays NOT_CHECKED unless that row has a local probe file', () => {
  const missing = fs.mkdtempSync(path.join(os.tmpdir(), 'cmo-belt-'));
  const absent = loadRows(missing);
  assert.deepEqual(absent.map((row) => row.status), ['NOT_CHECKED', 'NOT_CHECKED', 'NOT_CHECKED']);

  const present = fs.mkdtempSync(path.join(os.tmpdir(), 'cmo-belt-'));
  fs.writeFileSync(path.join(present, 'ffmpeg.json'), '{"status":"LOCAL"}\n');
  const rows = loadRows(present);
  assert.equal(rows.find((row) => row.id === 'ffmpeg').status, 'LOCAL');
  assert.equal(rows.find((row) => row.id === 'openmontage').status, 'NOT_CHECKED');
  assert.equal(rows.find((row) => row.id === 'phone-clips').status, 'NOT_CHECKED');

  fs.writeFileSync(path.join(present, 'openmontage.json'), '{"status":"PARTNER"}\n');
  assert.equal(loadRows(present).find((row) => row.id === 'openmontage').status, 'NOT_CHECKED');
});
