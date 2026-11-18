'use strict';
/* অ্যাকাউন্ট সিঙ্ক ও অটো-ব্যাকআপের টেস্ট: node sync-test.js
   ১) মার্জ নিয়ম (public/sync-core.js)  ২) ZIP লেখা-পড়া, ব্যাকআপ, রিটেনশন, রিস্টোর  ৩) আসল সার্ভারে সিঙ্ক ও ব্যাকআপ API (অস্থায়ী কপিতে, আপনার data/ ছোঁয়া হয় না) */
const fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert'), cp = require('child_process'), http = require('http');
const C = require('./public/sync-core.js');
let pass = 0, fail = 0; const pending = [];
const t = (name, fn) => pending.push([name, fn]);
const J = x => JSON.parse(JSON.stringify(x));

/* ================= ১) মার্জ ================= */
t('hist: দুই ডিভাইসের ইতিহাস মিলে যায়, id একই হলে একবার, ৫০০-র সীমা', () => {
  const a = [{ id: 'a', ts: 1 }, { id: 'c', ts: 5 }], b = [{ id: 'b', ts: 3 }, { id: 'c', ts: 5 }];
  const r = C.merge('geb_hist', a, b); assert(r.ok); assert.deepStrictEqual(r.value.map(x => x.id), ['a', 'b', 'c']);
  const big = Array.from({ length: 400 }, (_, i) => ({ id: 'x' + i, ts: i })), big2 = Array.from({ length: 400 }, (_, i) => ({ id: 'y' + i, ts: 1000 + i }));
  const m = C.merge('geb_hist', big, big2).value; assert.strictEqual(m.length, 500); assert.strictEqual(m[499].id, 'y399');
});
t('wrong: একই প্রশ্নে নতুন (last) জেতে, wrongCount বেশিটা', () => {
  const a = [{ k: 'q1', last: 10, streak: 1, wrongCount: 2 }], b = [{ k: 'q1', last: 20, streak: 0, wrongCount: 3 }, { k: 'q2', last: 1 }];
  const v = C.merge('geb_wrong', a, b).value; assert.strictEqual(v.length, 2); const q1 = v.find(x => x.k === 'q1'); assert.strictEqual(q1.streak, 0); assert.strictEqual(q1.wrongCount, 3);
});
t('stars/grades/saved', () => {
  assert.deepStrictEqual(C.merge('geb_stars', ['a', 'b'], ['b', 'c']).value, ['a', 'b', 'c']);
  assert.deepStrictEqual(C.merge('geb_grades', { s1: 2, s2: 1 }, { s2: 5, s3: 0 }).value, { s3: 0, s1: 2, s2: 1 });   // এই ডিভাইস জেতে
  assert.strictEqual(C.merge('geb_saved', [{ name: 'S1', sgpa: 3, cr: 10, pts: 30 }], [{ name: 'S1', sgpa: 2, cr: 10, pts: 20 }, { name: 'S2', sgpa: 4, cr: 9, pts: 36 }]).value.length, 2);
});
t('game: XP/স্কোর বেশিটা, ব্যাজ ও দিন মিলে যায়, আগের ব্যাজের সময় রাখে', () => {
  const a = { xp: 100, sessions: 3, quizBest: 5, days: ['2026-11-01', '2026-11-03'], badges: { b1: 500 }, mutDone: { m1: { ts: 9, perfect: false } }, wrongQ: [1], pending: [], daily: {}, today: { day: '2026-11-03', xp: 20 }, prefs: { n: 8 } };
  const b = { xp: 140, sessions: 2, quizBest: 9, days: ['2026-11-02', '2026-11-03'], badges: { b1: 300, b2: 700 }, mutDone: { m1: { ts: 5, perfect: true }, m2: { ts: 1, perfect: false } }, wrongQ: [1, 2], pending: [], daily: {}, today: { day: '2026-11-03', xp: 35 }, prefs: { n: 10, timer: 30 } };
  const v = C.merge('geb_game_v1', a, b).value;
  assert.strictEqual(v.xp, 140); assert.strictEqual(v.sessions, 3); assert.strictEqual(v.quizBest, 9);
  assert.deepStrictEqual(v.days, ['2026-11-01', '2026-11-02', '2026-11-03']); assert.deepStrictEqual(v.badges, { b1: 300, b2: 700 });
  assert.deepStrictEqual(v.mutDone.m1, { ts: 5, perfect: true }); assert(v.mutDone.m2); assert.strictEqual(v.today.xp, 35); assert.strictEqual(v.prefs.n, 8); assert.strictEqual(v.prefs.timer, 30); assert.deepStrictEqual(v.wrongQ, [1, 2]);
});
t('vlab ও dx: বেশিটা রাখে', () => {
  const v = C.merge('geb_vlab_v1', { done: { e1: { st: 2, n: 1, ts: 5 } } }, { done: { e1: { st: 3, n: 4, ts: 2 }, e2: { st: 1, n: 1, ts: 1 } } }).value;
  assert.deepStrictEqual(v.done.e1, { st: 3, n: 4, ts: 5 }); assert(v.done.e2);
  const d = C.merge('geb_dx_v1', { ts: { c1: { best: 60, n: 2 } }, fo: {}, dx: {} }, { ts: { c1: { best: 80, n: 1 }, c2: { best: 50, n: 1 } }, fo: { f1: { best: 90, n: 1 } }, dx: {} }).value;
  assert.deepStrictEqual(d.ts.c1, { best: 80, n: 2 }); assert(d.ts.c2); assert(d.fo.f1);
});
const P = (o) => Object.assign({ courses: [], slots: [], att: {}, exams: [], skills: {}, custom: [], cv: {}, target: 75, sample: false, nid: 1 }, o);
t('planner: আলাদা আইটেম মিলে যায়, উপস্থিতি/স্কিল/CV', () => {
  const a = P({ courses: [{ id: 'x1', code: 'A', name: 'A' }], att: { '2026-11-01|x2': { r: 'p', c: 'x1' } }, skills: { Python: 1, R: 3 }, cv: { name: 'Rafi' }, nid: 3 });
  const b = P({ courses: [{ id: 'x1', code: 'A', name: 'A' }, { id: 'x5', code: 'B', name: 'B' }], att: { '2026-11-02|x2': { r: 'a', c: 'x1' } }, skills: { Python: 2 }, cv: { name: 'X', email: 'e@x' }, nid: 9, custom: [{ name: 'Cloning' }] });
  const r = C.merge('geb_planner_v1', a, b); assert(r.ok); const v = r.value;
  assert.strictEqual(v.courses.length, 2); assert.strictEqual(Object.keys(v.att).length, 2); assert.deepStrictEqual(v.skills, { Python: 2, R: 3 });
  assert.strictEqual(v.cv.name, 'Rafi'); assert.strictEqual(v.cv.email, 'e@x'); assert.strictEqual(v.nid, 9); assert.strictEqual(v.custom.length, 1);
});
t('planner: একই id দুই রকম হলে (base ছাড়া) বাছাই চাওয়া হয়, কিছু নিজে নিজে ফেলে না', () => {
  const a = P({ courses: [{ id: 'x1', code: 'A', name: 'ক' }] }), b = P({ courses: [{ id: 'x1', code: 'B', name: 'খ' }] });
  const r = C.merge('geb_planner_v1', a, b); assert.strictEqual(r.ok, false); assert.strictEqual(r.why, 'planner');
});
t('planner: base থাকলে শুধু একদিকে বদলালে নিজে মেলে, দুই দিকে বদলালে বাছাই', () => {
  const orig = { id: 'x1', code: 'A', name: 'পুরনো' }, base = C.itemHashes('geb_planner_v1', P({ courses: [orig] }));
  const edited = { id: 'x1', code: 'A', name: 'নতুন' };
  let r = C.merge('geb_planner_v1', P({ courses: [orig], skills: { R: 1 } }), P({ courses: [edited] }), base); assert(r.ok); assert.strictEqual(r.value.courses[0].name, 'নতুন');
  r = C.merge('geb_planner_v1', P({ courses: [edited] }), P({ courses: [orig], skills: { R: 1 } }), base); assert(r.ok); assert.strictEqual(r.value.courses[0].name, 'নতুন');
  r = C.merge('geb_planner_v1', P({ courses: [edited] }), P({ courses: [{ id: 'x1', code: 'A', name: 'তৃতীয়' }] }), base); assert.strictEqual(r.ok, false);
});
t('planner: এক পাশে শুধু নমুনা রুটিন থাকলে আসলটাই থাকে', () => {
  const sample = P({ sample: true, courses: [{ id: 'x1', code: 'S', name: 'S' }] }), real = P({ courses: [{ id: 'x1', code: 'R', name: 'R' }, { id: 'x2', code: 'Q', name: 'Q' }] });
  assert.strictEqual(C.merge('geb_planner_v1', sample, real).value.courses[0].code, 'R'); assert.strictEqual(C.merge('geb_planner_v1', real, sample).value.courses[0].code, 'R');
});
t('notebook: নতুন এন্ট্রি মেলে, দুই দিকে বদলালে কপি, id-সংঘর্ষে কপি, nid সামলানো', () => {
  const e = (id, title) => ({ id, date: '2026-11-01', title, type: 'PCR', imgs: [] });
  const a = { entries: [e('n2', 'A2'), e('n1', 'A1')], meta: {}, nid: 3 }, b = { entries: [e('n2', 'B2 অন্য'), e('n3', 'B3')], meta: {}, nid: 4 };
  const v = C.merge('geb_notebook_v1', a, b).value;
  assert.strictEqual(v.entries.length, 4); assert(v.entries.some(x => x.title === 'B3')); assert(v.entries.some(x => /অন্য ডিভাইস/.test(x.title)));
  assert.strictEqual(new Set(v.entries.map(x => x.id)).size, 4); assert(v.nid >= 5);
  const base = C.itemHashes('geb_notebook_v1', { entries: [e('n1', 'A1')] });
  const r = C.merge('geb_notebook_v1', { entries: [e('n1', 'A1')], nid: 2 }, { entries: [e('n1', 'A1 সম্পাদিত')], nid: 2 }, base).value;
  assert.strictEqual(r.entries.length, 1); assert.strictEqual(r.entries[0].title, 'A1 সম্পাদিত');
});
t('ধরন ভুল হলে মার্জ ফেরায় না', () => { assert.strictEqual(C.merge('geb_hist', {}, []).ok, false); assert.strictEqual(C.merge('nokey', [], []).ok, false); });
t('মার্জ idempotent: নিজের সাথে মেলালে বদলায় না; দুই দিক থেকে মেলালে একই ফল (বাছাই-ছাড়া কীগুলোতে)', () => {
  const g = { xp: 5, sessions: 1, correct: 1, answered: 2, pairs: 0, matchPerfect: 0, quizBest: 0, quizWins: 0, quizNoLife: 0, warDays: 0, days: ['2026-11-01'], badges: {}, mutDone: {}, wrongQ: [], pending: [], daily: {}, today: { day: '2026-11-01', xp: 5 }, prefs: {} };
  assert.strictEqual(C.canon(C.merge('geb_game_v1', g, J(g)).value), C.canon(g));
  const a = { done: { e1: { st: 1, n: 1, ts: 1 } } }, b = { done: { e1: { st: 2, n: 3, ts: 9 }, e2: { st: 1, n: 1, ts: 2 } } };
  assert.strictEqual(C.canon(C.merge('geb_vlab_v1', a, b).value), C.canon(C.merge('geb_vlab_v1', b, a).value));
  const h1 = [{ id: 'a', ts: 1 }], h2 = [{ id: 'b', ts: 2 }]; assert.strictEqual(C.canon(C.merge('geb_hist', h1, h2).value), C.canon(C.merge('geb_hist', h2, h1).value));
});
t('hash ও canon', () => { assert.strictEqual(C.canon({ b: 1, a: [1, { d: 1, c: 2 }] }), C.canon({ a: [1, { c: 2, d: 1 }], b: 1 })); assert.notStrictEqual(C.hash('abc'), C.hash('abd')); assert(C.isEmpty(null) && C.isEmpty([]) && C.isEmpty({}) && !C.isEmpty({ a: 1 })); });

/* ================= ২) ZIP, ব্যাকআপ, রিটেনশন, রিস্টোর ================= */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gebt-'));
const { ZipWriter, openZip } = require('./zip');
t('zip: লেখা-পড়া, বাংলা নাম, কমপ্রেসড ও স্টোরড, খালি ফাইল, CRC', () => {
  const f = path.join(tmp, 'a.zip'), w = new ZipWriter(f);
  const big = Buffer.from('জিন '.repeat(5000)), png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4, 5, 6, 7, 8]);
  w.add('db.json', big); w.add('নোট/ফাইল 1.pdf', png); w.add('empty.txt', Buffer.alloc(0)); const info = w.close(); assert.strictEqual(info.files, 3);
  const z = openZip(f); assert.deepStrictEqual(z.entries.map(e => e.name), ['db.json', 'নোট/ফাইল 1.pdf', 'empty.txt']);
  assert(z.entries[0].csize < z.entries[0].usize / 2); assert(z.read(z.entries[0]).equals(big)); assert(z.read(z.entries[1]).equals(png)); assert.strictEqual(z.read(z.entries[2]).length, 0);
  z.close();
  const raw = fs.readFileSync(f); const i = raw.indexOf(Buffer.from([1, 2, 3, 4])); raw[i] ^= 0xff; fs.writeFileSync(f + '2', raw);
  const z2 = openZip(f + '2'); assert.throws(() => z2.read(z2.entries[1]), /CRC/); z2.close();
  if (process.platform !== 'win32') { try { cp.execSync('unzip -tq ' + JSON.stringify(f), { stdio: 'pipe' }); } catch (e) { if (!/not found|No such/.test(String(e.stderr || e.message))) throw new Error('বাইরের unzip ফাইলটি বৈধ মানছে না: ' + e.stderr); } }
});
const mkData = d => {
  fs.mkdirSync(path.join(d, 'uploads'), { recursive: true }); fs.mkdirSync(path.join(d, 'sync'), { recursive: true }); fs.mkdirSync(path.join(d, 'notes'), { recursive: true });
  fs.writeFileSync(path.join(d, 'db.json'), JSON.stringify({ hello: 'বাংলা', n: 1 })); fs.writeFileSync(path.join(d, 'community.json'), '{"users":[]}');
  fs.writeFileSync(path.join(d, 'uploads', 'x.pdf'), Buffer.from('%PDF-1.4 fake')); fs.writeFileSync(path.join(d, 'sync', 'u1.json'), '{"keys":{}}');
  fs.writeFileSync(path.join(d, 'notes', 'half.tmp'), 'ignore me');
};
t('backup: ZIP হয়, backups ও .tmp বাদ, আবার চালালে নিজের আগেরটা ঢোকে না', async () => {
  const d = path.join(tmp, 'data1'); mkData(d); let flushed = 0;
  const B = require('./backup')({ DATA: d, flushAll: () => { flushed++; }, log: () => {} });
  const r = await B.run('test'); assert(flushed >= 1); assert(/^geb-backup-\d{4}-\d{2}-\d{2}-\d{4}\.zip$/.test(r.name));
  const z = openZip(B.pathOf(r.name)), names = z.entries.map(e => e.name).sort();
  assert.deepStrictEqual(names, ['_manifest.json', 'community.json', 'db.json', 'sync/u1.json', 'uploads/x.pdf']); z.close();
  assert.strictEqual(B.status().list.length, 1); assert.strictEqual(B.nameOk('../x.zip'), false); assert.strictEqual(B.nameOk(r.name), true);
});
t('backup: একসাথে দুটো চালানো যায় না', async () => {
  const d = path.join(tmp, 'data2'); mkData(d); const B = require('./backup')({ DATA: d, log: () => {} });
  const p1 = B.run('x'); await assert.rejects(() => B.run('y'), /চলছে/); await p1;
});
t('retention: নতুন ৭টি + সপ্তাহ-প্রতি একটি (সর্বোচ্চ ৪ সপ্তাহ), বাকি মোছা; ব্যাকআপ ছাড়া ফাইলে হাত পড়ে না', () => {
  process.env.BACKUP_DIR = path.join(tmp, 'bk'); fs.mkdirSync(process.env.BACKUP_DIR, { recursive: true });
  const day = 86400000, base = Date.UTC(2026, 10, 7, 12, 0), mk = at => { const d = new Date(at), p = n => String(n).padStart(2, '0'); const nm = `geb-backup-${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}.zip`; fs.writeFileSync(path.join(process.env.BACKUP_DIR, nm), 'x'); return nm; };
  for (let i = 0; i < 60; i++) mk(base - i * day);
  fs.writeFileSync(path.join(process.env.BACKUP_DIR, 'geb-before-restore-keep.zip'), 'safety'); fs.writeFileSync(path.join(process.env.BACKUP_DIR, 'notes.txt'), 'mine');
  const d = path.join(tmp, 'data3'); mkData(d); const B = require('./backup')({ DATA: d, log: () => {} });
  // run() শেষে prune হয়; এখানে সরাসরি নতুন ব্যাকআপ বানিয়ে prune দেখি
  return B.run('t').then(() => {
    const left = B.list(); assert(left.length >= 7 && left.length <= 7 + 4 + 1, 'বাকি ' + left.length);
    assert(fs.existsSync(path.join(process.env.BACKUP_DIR, 'geb-before-restore-keep.zip'))); assert(fs.existsSync(path.join(process.env.BACKUP_DIR, 'notes.txt')));
    assert(left.slice(0, 7).every((x, i, a) => i === 0 || a[i - 1].at >= x.at)); delete process.env.BACKUP_DIR;
  });
});
t('restore.js: পূর্বরূপ কিছু বদলায় না; --yes দিলে নিরাপত্তা-ব্যাকআপসহ ফেরায়; --clean বাড়তি মোছে; অনিরাপদ পথ আটকায়', async () => {
  const d = path.join(tmp, 'data4'); mkData(d); const B = require('./backup')({ DATA: d, log: () => {} }); const r = await B.run('t');
  const zipf = B.pathOf(r.name), env = Object.assign({}, process.env, { DATA_DIR: d }), run = a => cp.spawnSync(process.execPath, [path.join(__dirname, 'restore.js'), ...a], { env, encoding: 'utf8' });
  fs.writeFileSync(path.join(d, 'db.json'), '{"changed":true}'); fs.writeFileSync(path.join(d, 'uploads', 'new.pdf'), 'later');
  let o = run([zipf]); assert.strictEqual(o.status, 0, o.stderr); assert(/পূর্বরূপ/.test(o.stdout)); assert(fs.readFileSync(path.join(d, 'db.json'), 'utf8').includes('changed'));
  o = run([zipf, '--yes']); assert.strictEqual(o.status, 0, o.stderr + o.stdout); assert.strictEqual(JSON.parse(fs.readFileSync(path.join(d, 'db.json'), 'utf8')).hello, 'বাংলা');
  assert(fs.existsSync(path.join(d, 'uploads', 'new.pdf'))); assert(fs.readdirSync(path.join(d, 'backups')).some(n => n.startsWith('geb-before-restore-')));
  o = run([zipf, '--yes', '--clean']); assert.strictEqual(o.status, 0, o.stderr); assert(!fs.existsSync(path.join(d, 'uploads', 'new.pdf'))); assert(fs.existsSync(path.join(d, 'backups')));
  const evil = path.join(tmp, 'evil.zip'), w = new ZipWriter(evil); w.add('_manifest.json', Buffer.from('{"app":"geb-hub","at":"x"}')); w.add('../escape.txt', Buffer.from('boom')); w.close();
  o = run([evil, '--yes']); assert.notStrictEqual(o.status, 0); assert(/অনিরাপদ/.test(o.stderr)); assert(!fs.existsSync(path.join(tmp, 'escape.txt')));
  const nm = path.join(tmp, 'nomani.zip'), w2 = new ZipWriter(nm); w2.add('db.json', Buffer.from('{}')); w2.close(); assert.notStrictEqual(run([nm, '--yes']).status, 0);
});

/* ================= ৩) আসল সার্ভারে API ================= */
function req(port, method, p, body, cookie, raw) {
  return new Promise((ok, no) => {
    const data = body === undefined ? null : JSON.stringify(body), h = {}; if (data) { h['Content-Type'] = 'application/json'; h['Content-Length'] = Buffer.byteLength(data); } if (cookie) h.Cookie = cookie;
    const r = http.request({ host: '127.0.0.1', port, method, path: p, headers: h }, res => { const ch = []; res.on('data', c => ch.push(c)); res.on('end', () => { const b = Buffer.concat(ch); let j = null; if (!raw) { try { j = JSON.parse(b.toString('utf8')); } catch (_) {} } ok({ status: res.statusCode, json: j, buf: b, headers: res.headers }); }); });
    r.on('error', no); if (data) r.write(data); r.end();
  });
}
const cookieOf = r => (r.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
t('সার্ভার: সিঙ্ক API (লগইন, সংস্করণ, 409, কোটা, মুছে ফেলা) ও অ্যাডমিন ব্যাকআপ API', async () => {
  const dir = path.join(tmp, 'app'); fs.mkdirSync(dir);
  for (const f of fs.readdirSync(__dirname)) if (/\.(js|json)$/.test(f) && fs.statSync(path.join(__dirname, f)).isFile()) fs.copyFileSync(path.join(__dirname, f), path.join(dir, f));
  fs.cpSync(path.join(__dirname, 'public'), path.join(dir, 'public'), { recursive: true }); fs.mkdirSync(path.join(dir, 'data')); fs.copyFileSync(path.join(__dirname, 'data', 'seed.json'), path.join(dir, 'data', 'seed.json'));
  const port = 20000 + Math.floor(Math.random() * 20000);
  const srv = cp.spawn(process.execPath, ['server.js'], { cwd: dir, env: Object.assign({}, process.env, { PORT: String(port), ADMIN_PASSWORD: 'testpw-123', BACKUP_EVERY_HOURS: '0' }), stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; srv.stdout.on('data', d => log += d); srv.stderr.on('data', d => log += d);
  try {
    for (let i = 0; i < 60; i++) { try { await req(port, 'GET', '/api/me'); break; } catch (_) { await new Promise(r => setTimeout(r, 100)); } }
    const adm = await req(port, 'POST', '/api/login', { password: 'testpw-123' }); assert.strictEqual(adm.status, 200); const ac = cookieOf(adm);
    const reg = await (async () => { const r = await req(port, 'POST', '/api/c/register', { sid: 'rafi01', name: 'Rafi', batch: '2025-26', password: 'secret12' }); return r; })(); assert.strictEqual(reg.status, 201, JSON.stringify(reg.json));
    const ov = await req(port, 'GET', '/api/admin/c/overview', undefined, ac), uid = ov.json.users.find(u => u.sid === 'rafi01').id;
    assert.strictEqual((await req(port, 'PUT', '/api/admin/c/users/' + uid, { status: 'active' }, ac)).status, 200);
    const lg = await req(port, 'POST', '/api/c/login', { sid: 'rafi01', password: 'secret12' }); assert.strictEqual(lg.status, 200); const uc = cookieOf(lg);
    // লগইন ছাড়া
    assert.strictEqual((await req(port, 'GET', '/api/c/sync')).status, 401);
    // খালি
    let r = await req(port, 'GET', '/api/c/sync', undefined, uc); assert.strictEqual(r.status, 200); assert.deepStrictEqual(r.json.keys, {});
    r = await req(port, 'GET', '/api/c/sync/geb_wrong', undefined, uc); assert.strictEqual(r.json.v, 0);
    // PUT: base 0
    const wrong = [{ k: 'q1', last: 5 }]; r = await req(port, 'PUT', '/api/c/sync/geb_wrong', { base: 0, data: wrong }, uc); assert.strictEqual(r.status, 200); assert.strictEqual(r.json.v, 1);
    r = await req(port, 'PUT', '/api/c/sync/geb_wrong', { base: 1, data: [{ k: 'q1', last: 5 }, { k: 'q2' }] }, uc); assert.strictEqual(r.json.v, 2);
    // ভুল base => 409 + বর্তমান ডেটা
    r = await req(port, 'PUT', '/api/c/sync/geb_wrong', { base: 1, data: [] }, uc); assert.strictEqual(r.status, 409); assert.strictEqual(r.json.v, 2); assert.strictEqual(r.json.data.length, 2);
    // ধরন/key/আকার
    assert.strictEqual((await req(port, 'PUT', '/api/c/sync/geb_wrong', { base: 2, data: { a: 1 } }, uc)).status, 400);
    assert.strictEqual((await req(port, 'PUT', '/api/c/sync/geb_planner_v1', { base: 0, data: [] }, uc)).status, 400);
    assert.strictEqual((await req(port, 'PUT', '/api/c/sync/geb_evil', { base: 0, data: {} }, uc)).status, 404);
    assert.strictEqual((await req(port, 'GET', '/api/c/sync/..%2F..%2Fdb', undefined, uc)).status, 404);
    assert.strictEqual((await req(port, 'PUT', '/api/c/sync/geb_hist', { data: [] }, uc)).status, 400);
    const huge = { entries: [{ id: 'n1', imgs: ['x'.repeat(4.05 * 1024 * 1024)] }], nid: 2 }; r = await req(port, 'PUT', '/api/c/sync/geb_notebook_v1', { base: 0, data: huge }, uc); assert([413].includes(r.status), 'status ' + r.status);
    // মোট কোটা (৮ MB): তিনটি ~৩ MB
    const chunk = n => ({ entries: [{ id: 'n1', imgs: ['y'.repeat(n)] }], nid: 2 });
    assert.strictEqual((await req(port, 'PUT', '/api/c/sync/geb_notebook_v1', { base: 0, data: chunk(3.5 * 1024 * 1024) }, uc)).status, 200);
    assert.strictEqual((await req(port, 'PUT', '/api/c/sync/geb_planner_v1', { base: 0, data: { pad: 'z'.repeat(3.5 * 1024 * 1024) } }, uc)).status, 200);
    r = await req(port, 'PUT', '/api/c/sync/geb_game_v1', { base: 0, data: { pad: 'q'.repeat(2 * 1024 * 1024) } }, uc); assert.strictEqual(r.status, 413, 'কোটা: ' + r.status);
    // অন্য সদস্য আমার ডেটা দেখে না
    const reg2 = await req(port, 'POST', '/api/c/register', { sid: 'karim02', name: 'Karim', batch: '2025-26', password: 'secret34' }); assert.strictEqual(reg2.status, 201);
    const ov2 = await req(port, 'GET', '/api/admin/c/overview', undefined, ac), uid2 = ov2.json.users.find(u => u.sid === 'karim02').id; await req(port, 'PUT', '/api/admin/c/users/' + uid2, { status: 'active' }, ac);
    const uc2 = cookieOf(await req(port, 'POST', '/api/c/login', { sid: 'karim02', password: 'secret34' }));
    r = await req(port, 'GET', '/api/c/sync', undefined, uc2); assert.deepStrictEqual(r.json.keys, {});
    // Origin না মিললে (CSRF) আটকায়
    const bad = await new Promise(ok => { const q = http.request({ host: '127.0.0.1', port, method: 'PUT', path: '/api/c/sync/geb_stars', headers: { 'Content-Type': 'application/json', Cookie: uc, Origin: 'http://evil.example' } }, res => { res.resume(); res.on('end', () => ok(res.statusCode)); }); q.end(JSON.stringify({ base: 0, data: [] })); });
    assert.strictEqual(bad, 403);
    // সার্ভারে ফাইল ও নিজের ডেটা মুছে ফেলা
    assert(fs.existsSync(path.join(dir, 'data', 'sync', 'u' + uid + '.json')));
    assert.strictEqual((await req(port, 'DELETE', '/api/c/sync', undefined, uc)).status, 200); assert.deepStrictEqual((await req(port, 'GET', '/api/c/sync', undefined, uc)).json.keys, {}); assert(!fs.existsSync(path.join(dir, 'data', 'sync', 'u' + uid + '.json')));
    await req(port, 'PUT', '/api/c/sync/geb_stars', { base: 0, data: ['a'] }, uc);

    // ---- অ্যাডমিন ব্যাকআপ API ----
    assert.strictEqual((await req(port, 'GET', '/api/admin/backups')).status, 401); assert.strictEqual((await req(port, 'GET', '/api/admin/backups', undefined, uc)).status, 401);
    let b = await req(port, 'GET', '/api/admin/backups', undefined, ac); assert.strictEqual(b.status, 200); assert.strictEqual(b.json.list.length, 0);
    b = await req(port, 'POST', '/api/admin/backups', {}, ac); assert.strictEqual(b.status, 201, JSON.stringify(b.json)); const name = b.json.made.name;
    assert.strictEqual((await req(port, 'GET', '/api/admin/backups/..%2F..%2Fserver.js', undefined, ac)).status, 404);
    const dl = await req(port, 'GET', '/api/admin/backups/' + name, undefined, ac, true); assert.strictEqual(dl.status, 200); assert(/zip/.test(dl.headers['content-type'])); fs.writeFileSync(path.join(tmp, 'dl.zip'), dl.buf);
    const z = openZip(path.join(tmp, 'dl.zip')), names = z.entries.map(e => e.name); assert(names.includes('db.json') && names.includes('community.json') && names.includes('sync/u' + uid + '.json'), names.join(','));
    assert(!names.some(n => n.startsWith('backups/'))); const com = JSON.parse(z.read(z.entries.find(e => e.name === 'community.json')).toString('utf8')); assert(com.users.some(u => u.sid === 'rafi01'), 'ব্যাকআপে নতুন সদস্য নেই (flush হয়নি?)'); z.close();
    assert.strictEqual((await req(port, 'DELETE', '/api/admin/backups/' + name, undefined, ac)).status, 200); assert.strictEqual((await req(port, 'GET', '/api/admin/backups', undefined, ac)).json.list.length, 0);
    // অ্যাডমিন সদস্য মুছলে তার সিঙ্ক ফাইলও যায়
    assert.strictEqual((await req(port, 'DELETE', '/api/admin/c/users/' + uid, undefined, ac)).status, 200); assert(!fs.existsSync(path.join(dir, 'data', 'sync', 'u' + uid + '.json')));
  } catch (e) { e.message += '\n--- সার্ভারের লগ ---\n' + log.slice(-1500); throw e; } finally { srv.kill(); }
});


/* ================= ৪) ব্রাউজারের সিঙ্ক ইঞ্জিন, আসল সার্ভারের সাথে (একাধিক "ডিভাইস") ================= */
const Lib = require('./public/sync.js');
let APP = null;
async function startApp() {
  if (APP) return APP;
  const dir = path.join(tmp, 'app2'); fs.mkdirSync(dir);
  for (const f of fs.readdirSync(__dirname)) if (/\.(js|json)$/.test(f) && fs.statSync(path.join(__dirname, f)).isFile()) fs.copyFileSync(path.join(__dirname, f), path.join(dir, f));
  fs.cpSync(path.join(__dirname, 'public'), path.join(dir, 'public'), { recursive: true }); fs.mkdirSync(path.join(dir, 'data')); fs.copyFileSync(path.join(__dirname, 'data', 'seed.json'), path.join(dir, 'data', 'seed.json'));
  const port = 20000 + Math.floor(Math.random() * 20000);
  const srv = cp.spawn(process.execPath, ['server.js'], { cwd: dir, env: Object.assign({}, process.env, { PORT: String(port), ADMIN_PASSWORD: 'testpw-123', BACKUP_EVERY_HOURS: '0' }), stdio: 'ignore' });
  for (let i = 0; i < 80; i++) { try { await req(port, 'GET', '/api/me'); break; } catch (_) { await new Promise(r => setTimeout(r, 100)); } }
  const ac = cookieOf(await req(port, 'POST', '/api/login', { password: 'testpw-123' })), users = {};
  for (const sid of ['rafi01', 'karim02']) {
    await req(port, 'POST', '/api/c/register', { sid, name: sid, batch: '2025-26', password: 'secret12' });
    const ov = await req(port, 'GET', '/api/admin/c/overview', undefined, ac), id = ov.json.users.find(u => u.sid === sid).id;
    await req(port, 'PUT', '/api/admin/c/users/' + id, { status: 'active' }, ac);
    users[sid] = { id, sid, cookie: cookieOf(await req(port, 'POST', '/api/c/login', { sid, password: 'secret12' })) };
  }
  APP = { port, dir, srv, users, ac, stop() { try { srv.kill(); } catch (_) {} } }; return APP;
}
function device(app, who) {
  const mem = new Map(), store = { get: k => mem.has(k) ? mem.get(k) : null, set: (k, v) => { mem.set(k, String(v)); }, remove: k => { mem.delete(k); } };
  const d = { store, mem, reloads: [], auto: true, notifies: 0, offline: false, user: who, cookie: who.cookie };
  const fetchJson = async (method, p, body) => {
    if (d.offline) throw new Error('ইন্টারনেট নেই');
    const r = await fetch('http://127.0.0.1:' + app.port + p, { method, headers: Object.assign(body !== undefined ? { 'Content-Type': 'application/json' } : {}, d.cookie ? { Cookie: d.cookie } : {}), body: body !== undefined ? JSON.stringify(body) : undefined });
    return { status: r.status, json: await r.json().catch(() => ({})) };
  };
  d.boot = (u) => { d.engine = Lib.createEngine({ core: C, store, fetchJson, canAutoReload: () => d.auto, reload: w => d.reloads.push(w), notify: () => { d.notifies++; } }); return d.engine.setUser(u === undefined ? d.user : u); };
  d.put = (k, v) => store.set(k, JSON.stringify(v)); d.get = k => { const r = store.get(k); return r == null ? null : JSON.parse(r); };
  d.state = () => d.engine.state();
  return d;
}
const manifest = async (app, who) => (await req(app.port, 'GET', '/api/c/sync', undefined, who.cookie)).json;
const PL = o => Object.assign({ courses: [], slots: [], att: {}, exams: [], skills: {}, custom: [], cv: {}, target: 75, sample: false, nid: 1 }, o);

t('ইঞ্জিন: প্রথম ডিভাইস চালু করলে আপলোড, দ্বিতীয় ডিভাইস নামায় ও রিলোড চায়; পরের সিঙ্কে কিছু বদলায় না', async () => {
  const app = await startApp(), u = app.users.rafi01, d1 = device(app, u), d2 = device(app, u);
  d1.put('geb_planner_v1', PL({ courses: [{ id: 'x1', code: 'GEB 1121', name: 'Intro' }], nid: 2 })); d1.put('geb_wrong', [{ k: 'q1', last: 1 }]); d1.put('geb_game_v1', { xp: 100, sessions: 2, badges: { b1: 5 }, days: ['2026-11-01'], today: { day: '2026-11-01', xp: 10 }, prefs: {} });
  await d1.boot(); assert.strictEqual(d1.state().on, false); assert.strictEqual(d1.state().invite, false);
  const r = await d1.engine.enable(); assert(r.ok, JSON.stringify(r)); assert.strictEqual(d1.reloads.length, 0, 'আপলোডে রিলোড লাগে না');
  const man = await manifest(app, u); assert.deepStrictEqual(Object.keys(man.keys).sort(), ['geb_game_v1', 'geb_planner_v1', 'geb_wrong']); assert.strictEqual(man.keys.geb_wrong.v, 1);
  await d2.boot(); assert.strictEqual(d2.state().invite, true, 'অ্যাকাউন্টে ডেটা আছে, আমন্ত্রণ আসা উচিত');
  await d2.engine.enable(); assert.strictEqual(d2.reloads.length, 1); assert.deepStrictEqual(d2.get('geb_planner_v1'), d1.get('geb_planner_v1')); assert.deepStrictEqual(d2.get('geb_wrong'), [{ k: 'q1', last: 1 }]);
  const before = JSON.stringify([...d2.mem.entries()].filter(([k]) => C.KEYS[k]));
  await d2.boot(); const r2 = await d2.engine.syncNow(); assert(r2.ok); assert.strictEqual(JSON.stringify([...d2.mem.entries()].filter(([k]) => C.KEYS[k])), before); assert.strictEqual(d2.reloads.length, 1);
  assert.strictEqual((await manifest(app, u)).keys.geb_wrong.v, 1, 'অকারণে সংস্করণ বাড়েনি');
});
t('ইঞ্জিন: অন্য ডিভাইসের বদল — পেজ খোলার সময় নিজে বসে, কাজের মাঝে ব্যানার আসে ও "এখনই নিন" দিলে বসে', async () => {
  const app = await startApp(), u = app.users.rafi01, d1 = device(app, u), d2 = device(app, u);
  await d1.boot(); await d1.engine.enable().catch(() => {}); // d1 খালি: সার্ভারের ডেটা নামাবে
  await d2.boot(); await d2.engine.enable();
  d2.put('geb_wrong', (d2.get('geb_wrong') || []).concat([{ k: 'q2', last: 9 }])); await d2.engine.syncNow('change');
  d1.auto = false; await d1.boot(); assert(d1.state().pending, 'ব্যানার আসা উচিত'); assert.strictEqual(d1.get('geb_wrong').length, 1, 'ব্যানারের সময় ডেটা বদলানো যাবে না');
  const rl = d1.reloads.length; await d1.engine.accept(); assert.strictEqual(d1.get('geb_wrong').length, 2); assert.strictEqual(d1.reloads.length, rl + 1); assert.strictEqual(d1.state().pending, null);
  d2.put('geb_wrong', d2.get('geb_wrong').concat([{ k: 'q3', last: 10 }])); await d2.engine.syncNow('change'); d1.auto = true; await d1.boot(); assert.strictEqual(d1.get('geb_wrong').length, 3, 'বুটের সময় নিজে বসে');
});
t('ইঞ্জিন: দুই ডিভাইসে একসাথে বদল — মার্জ হয়, কিছু হারায় না, শেষে দুই ডিভাইস একই', async () => {
  const app = await startApp(), u = app.users.rafi01, d1 = device(app, u), d2 = device(app, u);
  await d1.boot(); await d1.engine.enable(); await d2.boot(); await d2.engine.enable(); await d2.boot(); await d1.boot();
  d1.put('geb_game_v1', Object.assign(d1.get('geb_game_v1'), { xp: 150, days: ['2026-11-01', '2026-11-05'] })); d1.put('geb_hist', [{ id: 'h1', ts: 1, got: 5 }]);
  d2.put('geb_game_v1', Object.assign(d2.get('geb_game_v1'), { xp: 130, badges: { b1: 5, b9: 8 } })); d2.put('geb_hist', [{ id: 'h2', ts: 2, got: 7 }]);
  await d2.engine.syncNow('change'); await d1.engine.syncNow('change');           // d1-এ দুই দিকেই বদল: মার্জ
  assert(d1.reloads.length >= 1); await d1.boot();                                  // "রিলোড" → আপলোড
  await d2.boot(); await d1.boot(); await d2.boot();
  for (const k of ['geb_game_v1', 'geb_hist']) assert.strictEqual(C.canon(d1.get(k)), C.canon(d2.get(k)), k + ' দুই ডিভাইসে আলাদা');
  const g = d1.get('geb_game_v1'); assert.strictEqual(g.xp, 150); assert.deepStrictEqual(Object.keys(g.badges).sort(), ['b1', 'b9']); assert.deepStrictEqual(g.days, ['2026-11-01', '2026-11-05']);
  assert.deepStrictEqual(d1.get('geb_hist').map(x => x.id).sort(), ['h1', 'h2']);
});
t('ইঞ্জিন: প্ল্যানারে একই id দুই রকম — সদস্যকে বাছতে বলে; অ্যাকাউন্টেরটা বাছলে আগেরটা "ফিরুন" দিয়ে ফেরে; এই ডিভাইসেরটা বাছলে সার্ভারে যায়', async () => {
  const app = await startApp(), u = app.users.karim02, d1 = device(app, u), d2 = device(app, u);
  d1.put('geb_planner_v1', PL({ courses: [{ id: 'x1', code: 'A', name: 'A' }], nid: 2 })); await d1.boot(); await d1.engine.enable(); await d2.boot(); await d2.engine.enable(); await d2.boot();
  d1.put('geb_planner_v1', PL({ courses: [{ id: 'x1', code: 'A', name: 'A' }, { id: 'x9', code: 'D1', name: 'ডিভাইস-১' }], nid: 10 }));
  d2.put('geb_planner_v1', PL({ courses: [{ id: 'x1', code: 'A', name: 'A' }, { id: 'x9', code: 'D2', name: 'ডিভাইস-২' }], nid: 10 }));
  await d1.engine.syncNow('change'); const own2 = d2.mem.get('geb_planner_v1'); await d2.engine.syncNow('change');
  assert(d2.state().pending && d2.state().pending.ask.includes('geb_planner_v1'), 'বাছাইয়ের প্রশ্ন আসা উচিত'); assert.strictEqual(d2.mem.get('geb_planner_v1'), own2, 'বাছার আগে কিছু বদলায়নি');
  await d2.engine.accept({ geb_planner_v1: 'remote' }); assert(d2.get('geb_planner_v1').courses.some(c => c.code === 'D1')); assert(d2.state().undoAt > 0);
  d2.engine.undo(); assert.strictEqual(d2.mem.get('geb_planner_v1'), own2, 'ফেরত এসেছে');
  await d2.boot(); await d2.engine.syncNow('after-undo'); assert.strictEqual((await req(app.port, 'GET', '/api/c/sync/geb_planner_v1', undefined, u.cookie)).json.data.courses.find(c => c.id === 'x9').code, 'D2', 'ফেরানোর পর সার্ভারেও এই ডিভাইসেরটা');
  // base-সহ দুই দিকে বদল: "এই ডিভাইসেরটা রাখব"
  await d1.boot(); await d1.engine.syncNow('x'); await d1.boot();
  d1.put('geb_planner_v1', Object.assign(d1.get('geb_planner_v1'), { courses: d1.get('geb_planner_v1').courses.map(c => c.id === 'x9' ? Object.assign({}, c, { name: 'P' }) : c) }));
  d2.put('geb_planner_v1', Object.assign(d2.get('geb_planner_v1'), { courses: d2.get('geb_planner_v1').courses.map(c => c.id === 'x9' ? Object.assign({}, c, { name: 'Q' }) : c) }));
  await d1.engine.syncNow('change'); await d2.engine.syncNow('change'); assert(d2.state().pending && d2.state().pending.ask.length === 1);
  await d2.engine.accept({ geb_planner_v1: 'local' }); assert.strictEqual(d2.state().pending, null); assert.strictEqual((await req(app.port, 'GET', '/api/c/sync/geb_planner_v1', undefined, u.cookie)).json.data.courses.find(c => c.id === 'x9').name, 'Q');
  d1.auto = true; await d1.boot(); assert.strictEqual(d1.get('geb_planner_v1').courses.find(c => c.id === 'x9').name, 'Q', 'd1 সার্ভারের নতুনটা নিয়েছে');
});
t('ইঞ্জিন: ইতিহাস মোছা (খালি তালিকা) অন্য ডিভাইসে পৌঁছায়', async () => {
  const app = await startApp(), u = app.users.karim02, d1 = device(app, u), d2 = device(app, u);
  d1.put('geb_hist', [{ id: 'a', ts: 1 }, { id: 'b', ts: 2 }]); await d1.boot(); await d1.engine.enable(); await d2.boot(); await d2.engine.enable(); await d2.boot();
  assert.strictEqual(d2.get('geb_hist').length, 2); d1.put('geb_hist', []); await d1.engine.syncNow('change'); await d2.boot(); assert.deepStrictEqual(d2.get('geb_hist'), []);
});
t('ইঞ্জিন: অন্য সদস্য ঢুকলে আগের সদস্যের সিঙ্ক করা ডেটা এই ব্রাউজার থেকে সরে যায়, নতুন সদস্যের অ্যাকাউন্টে মেশে না', async () => {
  const app = await startApp(), a = app.users.rafi01, b = app.users.karim02, d = device(app, a);
  d.put('geb_wrong', [{ k: 'secret-of-a', last: 1 }]); await d.boot(); await d.engine.enable(); assert(d.get('geb_wrong'));
  d.cookie = b.cookie; d.user = b; await d.boot(); assert.strictEqual(d.get('geb_wrong'), null, 'আগের সদস্যের ডেটা মুছে গেছে'); assert(d.reloads.includes('switch')); assert.strictEqual(d.state().on, false);
  const bm = await manifest(app, b); assert(!bm.keys.geb_wrong || !JSON.stringify((await req(app.port, 'GET', '/api/c/sync/geb_wrong', undefined, b.cookie)).json).includes('secret-of-a'), 'B-র অ্যাকাউন্টে A-র ডেটা ঢোকেনি');
  const d0 = device(app, a); d0.put('geb_stars', ['anon']); await d0.boot(); assert.strictEqual(d0.get('geb_stars')[0], 'anon', 'কারও নয় এমন (অচেনা) ডেটা থাকে');
});
t('ইঞ্জিন: নেট না থাকলে ত্রুটি বলে কিন্তু ডেটা অক্ষত, পরে আবার চললে সেরে যায়; লগইন না থাকলে স্পষ্ট বার্তা; বড় ডেটা সিঙ্ক হয় না কিন্তু বাকিগুলো হয়', async () => {
  const app = await startApp(), u = app.users.rafi01, d = device(app, u);
  d.put('geb_stars', ['s1']); await d.boot(); await d.engine.enable(); d.put('geb_stars', ['s1', 's2']); d.offline = true;
  let r = await d.engine.syncNow('change'); assert.strictEqual(r.ok, false); assert(/ইন্টারনেট/.test(d.state().err)); assert.deepStrictEqual(d.get('geb_stars'), ['s1', 's2']);
  d.offline = false; r = await d.engine.syncNow('retry'); assert(r.ok); assert.deepStrictEqual((await req(app.port, 'GET', '/api/c/sync/geb_stars', undefined, u.cookie)).json.data, ['s1', 's2']);
  d.cookie = null; r = await d.engine.syncNow('x'); assert.strictEqual(r.ok, false); assert(/লগইন/.test(d.state().err)); d.cookie = u.cookie;
  d.put('geb_notebook_v1', { entries: [{ id: 'n1', imgs: ['z'.repeat(4.3 * 1024 * 1024)] }], meta: {}, nid: 2 }); d.put('geb_stars', ['s1', 's2', 's3']);
  r = await d.engine.syncNow('big'); assert(r.ok); assert(d.state().tooBig.geb_notebook_v1 > 4 * 1024 * 1024); assert(!(await manifest(app, u)).keys.geb_notebook_v1); assert.strictEqual((await req(app.port, 'GET', '/api/c/sync/geb_stars', undefined, u.cookie)).json.data.length, 3);
});
t('ইঞ্জিন: সার্ভার থেকে মুছলে এই ডিভাইস বন্ধ হয়; আর চালু থাকা অন্য ডিভাইস নিজের ডেটা আবার তোলে', async () => {
  const app = await startApp(), u = app.users.karim02, d1 = device(app, u), d2 = device(app, u);
  d1.put('geb_stars', ['k1']); await d1.boot(); await d1.engine.enable(); await d2.boot(); await d2.engine.enable(); await d2.boot();
  await d1.engine.deleteRemote(); assert.strictEqual(d1.state().on, false); assert.deepStrictEqual((await manifest(app, u)).keys, {});
  assert(d1.get('geb_stars'), 'এই ডিভাইসের ডেটা থাকে'); await d2.engine.syncNow('x'); assert.deepStrictEqual((await req(app.port, 'GET', '/api/c/sync/geb_stars', undefined, u.cookie)).json.data, ['k1']);
});

(async () => {
  for (const [name, fn] of pending) { try { await fn(); pass++; console.log('  ✓ ' + name); } catch (e) { fail++; console.log('  ✗ ' + name + '\n      ' + (e && e.stack ? e.stack.split('\n').slice(0, 4).join('\n      ') : e)); } }
  if (APP) APP.stop(); await new Promise(r => setTimeout(r, 200));
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) {}
  console.log(`\n${pass} পাস, ${fail} ফেল`); process.exit(fail ? 1 : 0);
})();
