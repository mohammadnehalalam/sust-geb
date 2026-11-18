#!/usr/bin/env node
'use strict';
/* ব্যাকআপ ZIP থেকে data/ ফোল্ডার ফেরানো।
   ব্যবহার:  node restore.js <ব্যাকআপ.zip> [--yes] [--clean]
   - আগে সার্ভার বন্ধ করুন (নইলে চলতি সার্ভার পুরনো ডেটা আবার লিখে দিতে পারে)।
   - --yes না দিলে শুধু কী কী হবে তা দেখায়, কিছু বদলায় না।
   - শুরুর আগে বর্তমান data/ ফোল্ডারের একটি নিরাপত্তা-ব্যাকআপ (geb-before-restore-*.zip) নেওয়া হয়।
   - ডিফল্টে ব্যাকআপে নেই এমন ফাইল (যেমন ব্যাকআপের পরে আসা আপলোড) থেকে যায়। --clean দিলে সেগুলোও মোছা হয় (backups ফোল্ডার ছাড়া)।
   - BACKUP_DIR আর DATA_DIR (ডিফল্ট ./data) পরিবেশ ভেরিয়েবল সার্ভারের মতোই। */
const fs = require('fs'), path = require('path');
const { openZip, ZipWriter } = require('./zip');

const args = process.argv.slice(2), flags = new Set(args.filter(a => a.startsWith('--'))), file = args.find(a => !a.startsWith('--'));
const DATA = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const BDIR = path.resolve(process.env.BACKUP_DIR || path.join(DATA, 'backups'));
const die = m => { console.error('ত্রুটি: ' + m); process.exit(1); };
if (!file) die('ব্যবহার: node restore.js <ব্যাকআপ.zip> [--yes] [--clean]');
if (!fs.existsSync(file)) die('ফাইল পাওয়া যায়নি: ' + file);

/* ZIP-এর ভেতরের পথ নিরাপদ কি না: ভেতর থেকে বেরিয়ে যাওয়া পথ, পুরো পথ, ব্যাকআপ ফোল্ডার বাদ */
function target(name) {
  if (!name || name.startsWith('_manifest') || name.endsWith('/')) return null;
  if (name.includes('\\') || name.includes('\0') || path.isAbsolute(name)) return 'bad';
  const full = path.resolve(DATA, name);
  if (full !== DATA && !full.startsWith(DATA + path.sep)) return 'bad';
  if (full === BDIR || full.startsWith(BDIR + path.sep)) return null;
  return full;
}
function walk(dir, out) { let ents = []; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) {} for (const e of ents) { const f = path.join(dir, e.name); if (f === BDIR || /\.(tmp|partial)$/.test(e.name)) continue; e.isDirectory() ? walk(f, out) : out.push(f); } return out; }

const z = openZip(file);
let manifest = null; const jobs = [];
for (const en of z.entries) {
  if (en.name === '_manifest.json') { try { manifest = JSON.parse(z.read(en).toString('utf8')); } catch (_) {} continue; }
  const t = target(en.name); if (t === 'bad') die('ZIP-এ অনিরাপদ পথ আছে, থামানো হলো: ' + en.name); if (t) jobs.push({ en, t });
}
if (!manifest || manifest.app !== 'geb-hub') die('এটা GEB হাব-এর ব্যাকআপ ফাইল নয় (_manifest.json নেই)');
const has = new Set(jobs.map(j => j.t)), extra = flags.has('--clean') ? walk(DATA, []).filter(f => !has.has(f)) : [];
console.log(`ব্যাকআপ: ${path.basename(file)}  (${manifest.at}, ${jobs.length} ফাইল)`);
console.log(`গন্তব্য: ${DATA}`);
if (extra.length) console.log(`--clean: ব্যাকআপে নেই এমন ${extra.length} টি ফাইল মোছা হবে`);
if (!flags.has('--yes')) { console.log('\nএটি শুধু পূর্বরূপ। সত্যিই ফেরাতে শেষে --yes যোগ করুন।'); z.close(); process.exit(0); }

/* নিরাপত্তা-ব্যাকআপ */
fs.mkdirSync(BDIR, { recursive: true });
const safe = path.join(BDIR, 'geb-before-restore-' + new Date().toISOString().replace(/[:.]/g, '-') + '.zip'), zw = new ZipWriter(safe);
for (const f of walk(DATA, [])) { try { zw.add(path.relative(DATA, f).split(path.sep).join('/'), fs.readFileSync(f), fs.statSync(f).mtime); } catch (_) {} }
zw.add('_manifest.json', Buffer.from(JSON.stringify({ app: 'geb-hub', kind: 'before-restore', at: new Date().toISOString() }))); zw.close();
console.log('নিরাপত্তা-ব্যাকআপ: ' + safe);

let n = 0;
for (const j of jobs) {
  const buf = z.read(j.en);                                   // CRC মিলিয়ে নেয়; নষ্ট ফাইল হলে এখানেই থামে
  fs.mkdirSync(path.dirname(j.t), { recursive: true });
  const tmp = j.t + '.restoring'; fs.writeFileSync(tmp, buf); fs.renameSync(tmp, j.t); n++;
}
extra.forEach(f => { try { fs.unlinkSync(f); } catch (_) {} });
z.close();
console.log(`ফেরানো হয়েছে: ${n} ফাইল। এখন সার্ভার চালু করুন।`);
