import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pages = {
  '/': 'index.html',
  '/clients': 'clients/index.html',
  '/cmo': 'cmo/index.html',
  '/methods': 'methods/index.html',
  '/belt': 'belt/index.html',
  '/start': 'start/index.html',
};
// A motion page is a static page. These two are not in the nav; /cmo, /methods and /belt link to them.
const motion = {
  '/video': 'video/index.html',
  '/methods/video-social': 'methods/video-social/index.html',
};
const commands = [
  'npm i -g @hyperdag/trustshell@1.4.0',
  'trustshell verify "paste your own claim"',
  'trustshell repid trinity-shofet',
];
const mediaFile = /\.(mp4|webm|mov|m4v|mkv|avi|ogv|gif)$/i;

function html(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function tbodies(doc) {
  return doc.split('<tbody>').slice(1).map((part) => part.split('</tbody>')[0]);
}

function rowsOf(body) {
  return body.split('<tr>').slice(1);
}

// '/video#record' -> video/index.html. '/assets/site.css' -> assets/site.css. Query and fragment are dropped.
function fileForLocal(href) {
  const path = href.split('#')[0].split('?')[0];
  if (path === '/') return 'index.html';
  const clean = path.replace(/^\//, '').replace(/\/$/, '');
  return extname(clean) ? clean : `${clean}/index.html`;
}

function walk(dir, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'probes') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, found);
    else found.push(relative(root, full));
  }
  return found;
}

test('six static pages do not store text', () => {
  const all = Object.values(pages).map(html).join('\n');
  for (const route of Object.keys(pages)) {
    assert.equal(all.includes(`href="${route}"`) || route === '/', true);
  }
  assert.equal(/<form[\s>]/i.test(all), false);
  assert.equal(/<input[\s>]/i.test(all), false);
  assert.equal(/<textarea[\s>]/i.test(all), false);
  assert.equal(/<video[\s>]/i.test(all), false);
  assert.equal(/<iframe[\s>]/i.test(all), false);
  assert.equal(/<script[\s>]/i.test(all), false);
  assert.equal(/wallet/i.test(all), false);
  assert.equal(/stake/i.test(all), false);
  assert.equal(/localStorage/.test(all), false);
});

test('start links to TrustShell.dev and prints the three commands', () => {
  const start = html(pages['/start']);
  assert.match(start, /href="https:\/\/trustshell\.dev"/);
  assert.match(start, />TrustShell\.dev</);
  const block = start.split('<pre><code>')[1].split('</code></pre>')[0].trim();
  assert.deepEqual(block.split('\n'), commands);
});

test('belt rows with no link print NOT_CHECKED', () => {
  const belt = html(pages['/belt']);
  const bodies = tbodies(belt);
  assert.equal(bodies.length, 2);
  assert.deepEqual(bodies.map((body) => rowsOf(body).length), [6, 5]);
  for (const body of bodies) {
    for (const row of rowsOf(body)) {
      if (!row.includes('<a ')) assert.equal(row.includes('NOT_CHECKED'), true);
      if (row.includes('<a ')) assert.equal(row.includes('NOT_CHECKED'), false);
    }
  }
});

test('every expert name is labeled method', () => {
  const methods = html(pages['/methods']);
  assert.match(methods, /It is not an endorsement\./);
  const body = tbodies(methods)[0];
  const rows = rowsOf(body);
  assert.equal(rows.length, 3);
  for (const row of rows) {
    assert.match(row, /<td>method<\/td>/);
    assert.equal(/endors/i.test(row), false);
  }
});

test('the motion pages are static: no form, script, media element, handler, wallet or stake', () => {
  const all = Object.values(motion).map(html).join('\n');
  for (const tag of ['form', 'input', 'textarea', 'video', 'audio', 'iframe', 'script', 'embed', 'object', 'source', 'track', 'img', 'canvas']) {
    assert.equal(new RegExp(`<${tag}[\\s>]`, 'i').test(all), false, `<${tag}>`);
  }
  assert.equal(/\son[a-z]+\s*=/i.test(all), false);
  assert.equal(/http-equiv/i.test(all), false);
  assert.equal(/wallet/i.test(all), false);
  assert.equal(/stake/i.test(all), false);
  assert.equal(/localStorage|sessionStorage|fetch\(|XMLHttpRequest/.test(all), false);
  assert.equal(/<svg[\s>]/i.test(html(motion['/video'])), true);
});

test('the promo page makes no outside request: two same-site stylesheets and nothing else', () => {
  const page = html(motion['/video']);
  const hrefs = [...page.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
  assert.deepEqual(
    hrefs.map((tag) => /href="([^"]+)"/.exec(tag)?.[1]),
    ['/assets/site.css', '/assets/video.css'],
  );
  for (const tag of hrefs) assert.match(tag, /rel="stylesheet"/);
  for (const href of ['/assets/site.css', '/assets/video.css']) {
    assert.equal(existsSync(join(root, fileForLocal(href))), true, href);
  }
  // No scheme, no protocol-relative URL, and no attribute that loads anything.
  assert.equal(/https?:|\/\/|\bsrc\s*=|srcset|xlink:href|<image[\s>]|<use[\s>]|style\s*=/i.test(page), false);

  const css = html('assets/video.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.equal(/@import|@font-face|url\(|https?:|\/\//i.test(css), false);
  assert.equal(/@import/.test('@import "x";'), true);
  assert.equal(/url\(/.test('background: url(a.png)'), true);
});

test('no video or animated image file is committed', () => {
  assert.equal(mediaFile.test('clip.mp4'), true);
  assert.equal(mediaFile.test('loop.GIF'), true);
  assert.equal(mediaFile.test('video/index.html'), false);

  const files = walk(root);
  assert.equal(files.includes(join('video', 'index.html')), true);
  assert.deepEqual(files.filter((file) => mediaFile.test(file)), []);
});

test('the promo is CSS and SVG motion that stops for reduced motion', () => {
  const css = html('assets/video.css');
  assert.equal((css.match(/@keyframes\s/g) ?? []).length >= 8, true);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /animation:\s*none\s*!important/);
  assert.match(css, /stroke-dashoffset/);
});

test('the promo types the command that /start prints', () => {
  const command = commands[1];
  const page = html(motion['/video']);
  assert.equal(page.includes(`<span class="type">${command}</span>`), true);
  const css = html('assets/video.css');
  assert.equal(css.includes(`--chars: ${command.length}ch;`), true);
  assert.equal(css.includes(`steps(${command.length}, end)`), true);
});

test('every promo scene is labeled fact or story, and only the Start command is a fact', () => {
  const page = html(motion['/video']);
  const scenes = page.split('<div class="scene').slice(1).map((part) => part.split('</div>\n\n')[0]);
  assert.equal(scenes.length, 4);
  const tags = scenes.map((scene) => /<p class="tag">(fact|story)<\/p>/.exec(scene)?.[1] ?? null);
  assert.deepEqual(tags, ['story', 'fact', 'story', null]);
  for (const [i, scene] of scenes.entries()) {
    assert.equal(scene.includes('trustshell verify'), tags[i] === 'fact', `scene ${i}`);
  }
});

test('the receipt line ships as NOT_CHECKED, so a made-up line cannot be committed', () => {
  const receipt = (doc) => /<p class="receipt-line">([^<]*)<\/p>/.exec(doc)?.[1];
  assert.notEqual(receipt('<p class="receipt-line">receipt: sha256:abc123</p>'), 'receipt: NOT_CHECKED');
  assert.equal(receipt('<p>none</p>'), undefined);

  const page = html(motion['/video']);
  assert.equal((page.match(/class="receipt-line"/g) ?? []).length, 1);
  assert.equal(receipt(page), 'receipt: NOT_CHECKED');
});

test('the method page links the real promo, and /cmo, /methods and /belt link the method', () => {
  const method = html(motion['/methods/video-social']);
  assert.match(method, /It is not an endorsement/);
  assert.match(method, /href="\/video"/);
  assert.match(method, /href="\/start"/);
  assert.match(method, /No relationship with Metricool is claimed\./);
  assert.match(method, /NOT_CHECKED/);
  assert.equal(/\bpost(s|ed)? it for you\b|\bauto-?post/i.test(method), false);

  for (const route of ['/cmo', '/methods', '/belt']) {
    assert.match(html(pages[route]), /href="\/methods\/video-social"/, route);
  }
  assert.match(html(pages['/cmo']), /href="\/video"/);
});

test('every local link on every page resolves to a file in this repo', () => {
  const all = { ...pages, ...motion };
  let checked = 0;
  for (const [route, rel] of Object.entries(all)) {
    for (const match of html(rel).matchAll(/href="(\/[^"]*)"/g)) {
      checked += 1;
      assert.equal(existsSync(join(root, fileForLocal(match[1]))), true, `${route} -> ${match[1]}`);
    }
  }
  assert.equal(checked > 40, true);
});

test('the video belt rows on /belt match belts/cmo.json and every link on them is real', () => {
  const rows = JSON.parse(html('belts/cmo.json')).filter((row) => row.id.startsWith('video-'));
  const body = tbodies(html(pages['/belt']))[1];
  const printed = rowsOf(body);
  assert.deepEqual(
    printed.map((row) => /<th scope="row">([^<]*)<\/th>/.exec(row)?.[1]),
    rows.map((row) => row.what),
  );
  let linked = 0;
  for (const row of printed) {
    const href = /<a href="([^"]+)"/.exec(row)?.[1];
    if (!href) {
      assert.equal(row.includes('NOT_CHECKED'), true);
      continue;
    }
    linked += 1;
    if (href.startsWith('/')) assert.equal(existsSync(join(root, fileForLocal(href))), true, href);
    else assert.match(href, /^https:\/\//);
  }
  assert.equal(linked >= 1, true);
  assert.equal(tbodies(html(pages['/belt']))[1].includes('href="/video"'), true);
});

test('README keeps the discipline lines and no longer says a bare "No video."', () => {
  const readme = html('README.md');
  assert.match(readme, /No account\. No form\. No wallet\. No video file\./);
  assert.equal(/No video\./.test(readme), false);
  assert.match(readme, /A belt row with no link prints `NOT_CHECKED`\./);
  assert.match(readme, /A name on `\/methods` is a method\./);
  assert.match(readme, /A motion page is a static page/);
  for (const route of ['/video', '/methods/video-social']) assert.equal(readme.includes(`\`${route}\``), true, route);
});
