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
const toolIds = ['openmontage', 'phone-clips', 'ffmpeg'];
const videoIds = [
  'video-motion-page',
  'video-caption-draft',
  'video-receipt-line',
  'video-screen-record',
  'video-schedule-free-tier',
];
const ids = [...toolIds, ...videoIds];
const mediaFile = /\.(mp4|webm|mov|m4v|mkv|avi|ogv|gif)\b/i;

const words = (row) => [row.what, row.install, row.cost].join(' ');
// The route /video (and /video#record) is a page of this site, not a claim. "no video file" is the one allowed denial.
const claimsVideo = (text) => /\bvideo\b/i.test(text.replace(/\/video\b(#[a-z]+)?/g, '').replace(/no video file/gi, ''));

test('cmo belt has the three tool rows and the five video-social rows, and no probe is committed', () => {
  const raw = fs.readFileSync(beltPath, 'utf8');
  const rows = JSON.parse(raw);
  assert.equal(rows.length, 8);
  assert.deepEqual(rows.map((row) => row.id), ids);
  for (const row of rows) {
    assert.deepEqual(Object.keys(row), keys);
    assert.equal(row.status, 'NOT_CHECKED');
  }
  assert.equal(/install automatically/i.test(raw), false);
  assert.equal(/\bautomatic/i.test(raw), false);
  assert.equal(/\bwallet\b/i.test(raw), false);
  assert.equal(/\bstake\b/i.test(raw), false);
  assert.equal(/\bpartner\b/i.test(raw), false);
  assert.equal(fs.existsSync(path.join(root, 'probes')), false);
});

test('a belt row may say video only to deny a video file, and no row names a media file', () => {
  const rows = JSON.parse(fs.readFileSync(beltPath, 'utf8'));
  assert.equal(claimsVideo('Render a video.'), true);
  assert.equal(claimsVideo('Generate video clips on this machine.'), true);
  assert.equal(claimsVideo('No video file is made.'), false);
  assert.equal(claimsVideo('Open /video in a browser. Record /video#record.'), false);
  assert.equal(mediaFile.test('clip.mp4'), true);
  assert.equal(mediaFile.test('/video#record'), false);

  for (const row of rows) {
    assert.equal(claimsVideo(words(row)), false, row.id);
    assert.equal(mediaFile.test(words(row)), false, row.id);
  }
});

test('every page a video-social row points at exists in this repo', () => {
  const rows = JSON.parse(fs.readFileSync(beltPath, 'utf8')).filter((row) => row.id.startsWith('video-'));
  assert.deepEqual(rows.map((row) => row.id), videoIds);
  const local = /(?<![\w.:/])\/([a-z]+(?:\/[a-z-]+)*)(?=[#\s.,]|$)/g;
  let seen = 0;
  for (const row of rows) {
    for (const match of row.install.matchAll(local)) {
      seen += 1;
      assert.equal(fs.existsSync(path.join(root, match[1], 'index.html')), true, `${row.id}: /${match[1]}`);
    }
  }
  assert.equal(seen >= 3, true);
});

test('status stays NOT_CHECKED unless that row has a local probe file', () => {
  const missing = fs.mkdtempSync(path.join(os.tmpdir(), 'cmo-belt-'));
  const absent = loadRows(missing);
  assert.deepEqual(absent.map((row) => row.id), ids);
  assert.deepEqual(absent.map((row) => row.status), ids.map(() => 'NOT_CHECKED'));

  const present = fs.mkdtempSync(path.join(os.tmpdir(), 'cmo-belt-'));
  fs.writeFileSync(path.join(present, 'ffmpeg.json'), '{"status":"LOCAL"}\n');
  const rows = loadRows(present);
  assert.equal(rows.find((row) => row.id === 'ffmpeg').status, 'LOCAL');
  assert.equal(rows.find((row) => row.id === 'openmontage').status, 'NOT_CHECKED');
  assert.equal(rows.find((row) => row.id === 'phone-clips').status, 'NOT_CHECKED');
  assert.equal(rows.find((row) => row.id === 'video-motion-page').status, 'NOT_CHECKED');

  fs.writeFileSync(path.join(present, 'openmontage.json'), '{"status":"PARTNER"}\n');
  assert.equal(loadRows(present).find((row) => row.id === 'openmontage').status, 'NOT_CHECKED');
});

test('a video-social row reads its own probe file, and a banned status still prints NOT_CHECKED', () => {
  const present = fs.mkdtempSync(path.join(os.tmpdir(), 'cmo-belt-'));
  fs.writeFileSync(path.join(present, 'video-motion-page.json'), '{"status":"LOCAL"}\n');
  fs.writeFileSync(path.join(present, 'video-screen-record.json'), '{"status":"VIDEO"}\n');
  fs.writeFileSync(path.join(present, 'video-schedule-free-tier.json'), '{"status":"AUTOMATIC"}\n');
  const rows = loadRows(present);
  assert.equal(rows.find((row) => row.id === 'video-motion-page').status, 'LOCAL');
  assert.equal(rows.find((row) => row.id === 'video-screen-record').status, 'NOT_CHECKED');
  assert.equal(rows.find((row) => row.id === 'video-schedule-free-tier').status, 'NOT_CHECKED');
  assert.equal(rows.find((row) => row.id === 'video-receipt-line').status, 'NOT_CHECKED');
});
