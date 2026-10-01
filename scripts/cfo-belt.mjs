import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const banned = /WALLET|STAKE|VIDEO|PARTNER|AUTOMATIC/;

export function loadRows(probeDir = path.join(root, 'probes', 'cfo')) {
  const file = path.join(root, 'belts', 'cfo.json');
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
  return rows.map((row) => ({
    id: row.id,
    what: row.what,
    install: row.install,
    cost: row.cost,
    status: statusFor(row.id, probeDir),
  }));
}

function statusFor(id, probeDir) {
  const file = path.join(probeDir, `${id}.json`);
  if (!fs.existsSync(file)) return 'NOT_CHECKED';
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return 'NOT_CHECKED';
  }
  const status = parsed && parsed.status;
  if (typeof status !== 'string') return 'NOT_CHECKED';
  if (!/^[A-Z][A-Z_]{0,31}$/.test(status)) return 'NOT_CHECKED';
  if (banned.test(status)) return 'NOT_CHECKED';
  return status;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  process.stdout.write(`${JSON.stringify(loadRows(), null, 2)}\n`);
}
