'use strict';
/* জব সেক্টরের টেস্ট: node jobs-test.js
   ফিড পার্সার, লিংক সাফ, SSRF-সুরক্ষা, আর আসল সার্ভারে জমা/অনুমোদন/ফিল্টার/ফিড/রিপোর্ট/সংরক্ষণ (অস্থায়ী কপিতে চলে, আপনার data/ ছোঁয়া হয় না)। */
const fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert'), cp = require('child_process'), http = require('http');
const Jobs = require('./jobs');
let pass = 0, fail = 0; const pending = [], t = (n, f) => pending.push([n, f]);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gebj-'));

/* ================= পার্সার ও সাফ-সুতরো ================= */
const RSS = `<?xml version="1.0"?><rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>X</title>
<item><title><![CDATA[Research Assistant &amp; Lab Tech]]></title><link>https://example.org/jobs/1?utm_source=rss</link><pubDate>Mon, 02 Nov 2026 10:00:00 +0000</pubDate><description>&lt;p&gt;Molecular &lt;b&gt;biology&lt;/b&gt; lab in Dhaka &amp;amp; Sylhet&lt;/p&gt;</description></item>
<item><title>বায়োটেকনোলজিস্ট নিয়োগ</title><link>https://example.org/jobs/2</link><description>Pharma company</description></item>
<item><title>No link here</title><description>skip me</description></item>
<item><title>Guid only</title><guid isPermaLink="true">https://example.org/jobs/3</guid></item>
</channel></rss>`;
const ATOM = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title type="html">Genetics &lt;b&gt;Intern&lt;/b&gt;</title><link rel="self" href="https://self.example/x"/><link rel="alternate" href="https://www.google.com/url?rct=j&amp;sa=t&amp;url=https://careers.example.com/p/9%3Futm_medium%3Dx&amp;ct=ga"/><published>2026-11-03T08:00:00Z</published><content type="html">Great &amp;lt;i&amp;gt;role&amp;lt;/i&amp;gt;</content></entry></feed>`;
t('RSS পার্স: CDATA, entity, ট্যাগ-ছাঁটা সারাংশ, link-ছাড়া বাদ, guid-লিংক', () => {
  const it = Jobs.parseFeed(RSS); assert.strictEqual(it.length, 3);
  assert.strictEqual(it[0].title, 'Research Assistant & Lab Tech'); assert.strictEqual(it[0].link, 'https://example.org/jobs/1?utm_source=rss'); assert(/Molecular biology lab in Dhaka & Sylhet/.test(it[0].desc), it[0].desc); assert(it[0].ts > 0);
  assert.strictEqual(it[1].title, 'বায়োটেকনোলজিস্ট নিয়োগ'); assert.strictEqual(it[2].link, 'https://example.org/jobs/3');
});
t('Atom পার্স: rel=alternate লিংক, HTML ছাঁটা; Google Alerts-এর মোড়ক খুলে আসল লিংক', () => {
  const it = Jobs.parseFeed(ATOM); assert.strictEqual(it.length, 1); assert.strictEqual(it[0].title, 'Genetics Intern'); assert(/google\.com\/url/.test(it[0].link)); assert(/Great role/.test(it[0].desc));
  assert.strictEqual(Jobs.unwrapGoogle(it[0].link), 'https://careers.example.com/p/9?utm_medium=x'); assert.strictEqual(Jobs.normLink(Jobs.unwrapGoogle(it[0].link)), 'https://careers.example.com/p/9');
  assert.deepStrictEqual(Jobs.parseFeed('<html>not a feed</html>'), []); assert.deepStrictEqual(Jobs.parseFeed(''), []);
});
t('লিংক সাফ: ট্র্যাকিং বাদ, # বাদ, শুধু http(s), ইউজার-পাসওয়ার্ড/javascript:/ছোট হোস্ট বাতিল', () => {
  assert.strictEqual(Jobs.normLink('https://Jobs.Example.com/a/?utm_source=x&id=5&fbclid=z#top'), 'https://jobs.example.com/a/?id=5'); assert.strictEqual(Jobs.normLink('https://x.org/a/'), 'https://x.org/a');
  for (const bad of ['javascript:alert(1)', 'data:text/html,hi', 'ftp://x.org/a', 'https://user:pw@x.org/a', 'https://localhost/a', 'not a url', '', 'https://x.org/' + 'a'.repeat(600)]) assert.strictEqual(Jobs.normLink(bad), '', bad);
});
t('তারিখ যাচাই', () => { assert(Jobs.dateOk('2026-12-31')); for (const b of ['2026-02-30', '2026-13-01', '26-1-1', '', 'abc', '2019-01-01']) assert(!Jobs.dateOk(b), b); });
t('SSRF: ভেতরের ঠিকানা চেনা ও safeGet আটকায়', async () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '0.0.0.0', '100.64.0.1', '::1', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1']) assert(Jobs.isPrivateIp(ip), ip);
  for (const ip of ['8.8.8.8', '1.1.1.1', '172.32.0.1', '2606:4700:4700::1111']) assert(!Jobs.isPrivateIp(ip), ip);
  for (const u of ['http://127.0.0.1:1/x', 'http://localhost/x', 'http://[::1]/x', 'http://169.254.169.254/latest/meta-data', 'http://10.0.0.5/', 'file:///etc/passwd', 'ftp://x.org/', 'http://u:p@8.8.8.8/']) await assert.rejects(() => Jobs.safeGet(u, {}), undefined, u);
});

/* ================= আসল সার্ভার ================= */
function req(port, method, p, body, cookie, raw) {
  return new Promise((ok, no) => {
    const data = body === undefined ? null : JSON.stringify(body), h = {}; if (data) { h['Content-Type'] = 'application/json'; h['Content-Length'] = Buffer.byteLength(data); } if (cookie) h.Cookie = cookie;
    const r = http.request({ host: '127.0.0.1', port, method, path: p, headers: h }, res => { const ch = []; res.on('data', c => ch.push(c)); res.on('end', () => { const b = Buffer.concat(ch); let j = null; if (!raw) { try { j = JSON.parse(b.toString('utf8')); } catch (_) { } } ok({ status: res.statusCode, json: j, buf: b }); }); });
    r.on('error', no); if (data) r.write(data); r.end();
  });
}
const cookieOf = r => ({}).constructor && (r.headers ? '' : '');
function login(port, p, body) { return new Promise((ok, no) => { const data = JSON.stringify(body), r = http.request({ host: '127.0.0.1', port, method: 'POST', path: p, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } }, res => { res.resume(); res.on('end', () => ok({ status: res.statusCode, cookie: (res.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ') })); }); r.on('error', no); r.end(data); }); }
async function startApp(name, env) {
  const dir = path.join(tmp, name); fs.mkdirSync(dir);
  for (const f of fs.readdirSync(__dirname)) if (/\.(js|json)$/.test(f) && fs.statSync(path.join(__dirname, f)).isFile()) fs.copyFileSync(path.join(__dirname, f), path.join(dir, f));
  fs.cpSync(path.join(__dirname, 'public'), path.join(dir, 'public'), { recursive: true }); fs.mkdirSync(path.join(dir, 'data')); fs.copyFileSync(path.join(__dirname, 'data', 'seed.json'), path.join(dir, 'data', 'seed.json'));
  const app = { dir, port: 20000 + Math.floor(Math.random() * 20000), env: Object.assign({ ADMIN_PASSWORD: 'testpw-123', BACKUP_EVERY_HOURS: '0' }, env || {}) };
  app.start = async () => { app.srv = cp.spawn(process.execPath, ['server.js'], { cwd: dir, env: Object.assign({}, process.env, app.env, { PORT: String(app.port) }), stdio: 'ignore' }); for (let i = 0; i < 80; i++) { try { await req(app.port, 'GET', '/api/me'); return; } catch (_) { await new Promise(r => setTimeout(r, 100)); } } throw new Error('সার্ভার চালু হয়নি'); };
  app.stop = async () => { if (!app.srv) return; const p = new Promise(r => app.srv.once('exit', r)); app.srv.kill('SIGTERM'); await Promise.race([p, new Promise(r => setTimeout(r, 2000))]); app.srv = null; };
  await app.start(); app.ac = (await login(app.port, '/api/login', { password: 'testpw-123' })).cookie; app.users = {};
  app.mkUser = async (sid, role) => {
    await req(app.port, 'POST', '/api/c/register', { sid, name: sid, batch: '2025-26', password: 'secret12' });
    const ov = await req(app.port, 'GET', '/api/admin/c/overview', undefined, app.ac), id = ov.json.users.find(u => u.sid === sid).id;
    await req(app.port, 'PUT', '/api/admin/c/users/' + id, Object.assign({ status: 'active' }, role ? { role } : {}), app.ac);
    return (app.users[sid] = { id, sid, cookie: (await login(app.port, '/api/c/login', { sid, password: 'secret12' })).cookie });
  };
  return app;
}
const today = () => new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10), plus = n => new Date(Date.now() + 6 * 3600000 + n * 86400000).toISOString().slice(0, 10);
const J = (o) => Object.assign({ title: 'Research Assistant', org: 'ABC Lab', loc: 'ঢাকা', link: 'https://example.org/job/' + Math.random().toString(36).slice(2), type: 'research', cat: 'research', where: 'bd', deadline: plus(10), note: '' }, o);

let A = null;
t('জব API: লগইন ছাড়া তালিকা চলে, জমা চলে না; সদস্যের জমা অপেক্ষমাণ, অনুমোদনের পর সবার কাছে; বিজ্ঞপ্তি যায়', async () => {
  A = await startApp('app', {}); const P = A.port, rafi = await A.mkUser('rafi01'), mod = await A.mkUser('mod01', 'mod'), karim = await A.mkUser('karim02');
  let r = await req(P, 'GET', '/api/c/jobs'); assert.strictEqual(r.status, 200); assert.strictEqual(r.json.total, 0); assert(r.json.types.job && r.json.cats.research);
  assert.strictEqual((await req(P, 'POST', '/api/c/jobs', J())).status, 401);
  r = await req(P, 'POST', '/api/c/jobs', J({ title: 'Lab Technician (PCR)', link: 'https://jobs.bdjobs.com/details/123?utm_source=fb' }), rafi.cookie); assert.strictEqual(r.status, 201, JSON.stringify(r.json)); assert.strictEqual(r.json.job.status, 'pending'); const id = r.json.job.id;
  assert.strictEqual((await req(P, 'GET', '/api/c/jobs')).json.total, 0, 'অপেক্ষমাণ জনসমক্ষে নয়');
  assert.strictEqual((await req(P, 'GET', '/api/c/jobs?scope=mine', undefined, rafi.cookie)).json.total, 1); assert.strictEqual((await req(P, 'GET', '/api/c/jobs?scope=pending', undefined, karim.cookie)).status, 403);
  r = await req(P, 'GET', '/api/c/jobs?scope=pending', undefined, mod.cookie); assert.strictEqual(r.json.total, 1); assert.strictEqual(r.json.canReview, true); assert.strictEqual(r.json.pending, 1);
  assert.strictEqual((await req(P, 'POST', '/api/c/jobs/' + id + '/review', { action: 'approve' }, karim.cookie)).status, 403);
  assert.strictEqual((await req(P, 'POST', '/api/c/jobs/' + id + '/review', { action: 'approve' }, mod.cookie)).status, 200);
  r = await req(P, 'GET', '/api/c/jobs'); assert.strictEqual(r.json.total, 1); assert.strictEqual(r.json.jobs[0].host, 'jobs.bdjobs.com'); assert(!/utm_/.test(r.json.jobs[0].link));
  const nf = await req(P, 'GET', '/api/c/notifs', undefined, rafi.cookie); assert(nf.json.notifs.some(n => n.go === 'jobs' && /অনুমোদিত/.test(n.text)), JSON.stringify(nf.json));
  const ov = await req(P, 'GET', '/api/admin/c/overview', undefined, A.ac); assert.strictEqual(ov.json.jobsPending, 0);
});
t('জব API: যাচাই — ভুল লিংক/তারিখ/ছোট শিরোনাম বাতিল, একই লিংক দ্বিতীয়বার নয় (ট্র্যাকিং-সহ হলেও), মডারেটরের জমা সরাসরি চালু', async () => {
  const P = A.port, rafi = A.users.rafi01, mod = A.users.mod01;
  for (const bad of [{ link: 'javascript:alert(1)' }, { link: 'https://x' }, { deadline: '2026-02-30' }, { title: 'ab' }, { link: '' }]) assert.strictEqual((await req(P, 'POST', '/api/c/jobs', J(bad), rafi.cookie)).status, 400, JSON.stringify(bad));
  assert.strictEqual((await req(P, 'POST', '/api/c/jobs', J({ link: 'https://jobs.bdjobs.com/details/123/' }), rafi.cookie)).status, 409);
  const r = await req(P, 'POST', '/api/c/jobs', J({ title: '<img src=x onerror=alert(1)> Intern', type: 'bogus', cat: 'bogus', where: 'mars' }), mod.cookie); assert.strictEqual(r.json.job.status, 'approved'); assert.strictEqual(r.json.job.type, 'job'); assert.strictEqual(r.json.job.cat, 'other'); assert.strictEqual(r.json.job.where, 'bd');
  assert(/<img/.test(r.json.job.title), 'ডেটা যেমন আছে তেমন, escape ক্লায়েন্টে হয়');   // সার্ভার JSON ফেরায়; HTML escape ক্লায়েন্টের esc() করে
});
t('জব API: ফিল্টার, সার্চ, শেষ তারিখ অনুযায়ী সাজানো, মেয়াদ শেষ লুকানো, ৭ দিন, ids, পাতা', async () => {
  const P = A.port, mod = A.users.mod01, mk = o => req(P, 'POST', '/api/c/jobs', J(o), mod.cookie);
  await mk({ title: 'Soon Job', deadline: plus(2), type: 'job', cat: 'pharma', where: 'bd' }); await mk({ title: 'Late Job', deadline: plus(40), cat: 'pharma' }); await mk({ title: 'No Deadline Job', deadline: '' });
  await mk({ title: 'Abroad PhD Fellowship', type: 'scholarship', cat: 'research', where: 'abroad', deadline: plus(20), loc: 'Germany' }); await mk({ title: 'Expired Job', deadline: plus(-3) }); await mk({ title: 'Today Job', deadline: today() });
  let r = await req(P, 'GET', '/api/c/jobs'); const titles = r.json.jobs.map(j => j.title); assert(!titles.includes('Expired Job'), 'মেয়াদ শেষ লুকানো');
  const ds = r.json.jobs.filter(j => j.deadline).map(j => j.deadline); assert.deepStrictEqual(ds, [...ds].sort(), 'শেষ তারিখ কাছেরটা আগে'); assert.strictEqual(r.json.jobs[r.json.jobs.length - 1].deadline, '', 'তারিখহীনেরা শেষে');
  const soon = r.json.jobs.find(j => j.title === 'Soon Job'); assert.strictEqual(soon.left, 2); assert.strictEqual(r.json.jobs.find(j => j.title === 'Today Job').left, 0);
  assert.deepStrictEqual((await req(P, 'GET', '/api/c/jobs?type=scholarship')).json.jobs.map(j => j.title), ['Abroad PhD Fellowship']); assert.strictEqual((await req(P, 'GET', '/api/c/jobs?where=abroad')).json.total, 1);
  assert((await req(P, 'GET', '/api/c/jobs?cat=pharma')).json.jobs.every(j => j.cat === 'pharma')); assert.strictEqual((await req(P, 'GET', '/api/c/jobs?q=germany')).json.total, 1); assert.strictEqual((await req(P, 'GET', '/api/c/jobs?q=zzzz')).json.total, 0);
  r = await req(P, 'GET', '/api/c/jobs?within=7'); assert(r.json.jobs.length >= 2 && r.json.jobs.every(j => j.deadline && j.left <= 7)); assert(!r.json.jobs.some(j => j.title === 'Late Job'));
  const all = (await req(P, 'GET', '/api/c/jobs')).json.jobs, one = all[0].id, exp = (await req(P, 'GET', '/api/admin/c/jobs', undefined, A.ac)).json.jobs.find(j => j.title === 'Expired Job');
  r = await req(P, 'GET', '/api/c/jobs?ids=' + one + ',' + exp.id + ',99999'); assert.strictEqual(r.json.jobs.length, 2, 'সেভ করা তালিকায় মেয়াদ-শেষও আসে, অজানা বাদ'); assert(r.json.jobs.find(j => j.id === exp.id).expired);
  for (let i = 0; i < 28; i++) await mk({ title: 'Bulk ' + i, deadline: plus(50 + i) }).then(x => assert(x.status === 201 || x.status === 429, 'bulk ' + x.status));
  r = await req(P, 'GET', '/api/c/jobs'); assert(r.json.jobs.length <= 24); if (r.json.total > 24) { assert(r.json.more); const r2 = await req(P, 'GET', '/api/c/jobs?off=24'); assert(r2.json.jobs.length > 0); assert(!r2.json.jobs.some(j => r.json.jobs.some(k => k.id === j.id)), 'পাতা মিলে যায়নি'); }
});
t('জব API: রিপোর্ট (৩ জনে আবার যাচাইয়ে), মোছার অনুমতি, জমার সীমা (দিনে ১০)', async () => {
  const P = A.port, mod = A.users.mod01, c = [A.users.rafi01, A.users.karim02]; const r0 = await req(P, 'POST', '/api/c/jobs', J({ title: 'Suspicious Offer' }), mod.cookie), id = r0.json.job.id;
  const c3 = await A.mkUser('third03'); assert.strictEqual((await req(P, 'POST', '/api/c/jobs/' + id + '/report', {})).status, 401);
  await req(P, 'POST', '/api/c/jobs/' + id + '/report', {}, c[0].cookie); await req(P, 'POST', '/api/c/jobs/' + id + '/report', {}, c[0].cookie); assert((await req(P, 'GET', '/api/c/jobs?q=suspicious')).json.total === 1, 'একই জনের দুবারে একবার গোনা হয়');
  await req(P, 'POST', '/api/c/jobs/' + id + '/report', {}, c[1].cookie); await req(P, 'POST', '/api/c/jobs/' + id + '/report', {}, c3.cookie);
  assert.strictEqual((await req(P, 'GET', '/api/c/jobs?q=suspicious')).json.total, 0, '৩ রিপোর্টে জনসমক্ষ থেকে সরে'); const pend = (await req(P, 'GET', '/api/c/jobs?scope=pending', undefined, mod.cookie)).json.jobs.find(j => j.id === id); assert(pend && pend.flagged);
  await req(P, 'POST', '/api/c/jobs/' + id + '/review', { action: 'reject', reason: 'ভুয়া' }, mod.cookie); const mineMod = (await req(P, 'GET', '/api/c/jobs?scope=mine', undefined, mod.cookie)).json.jobs.find(j => j.id === id); assert.strictEqual(mineMod.status, 'rejected'); assert.strictEqual(mineMod.reason, 'ভুয়া');
  const rj = await req(P, 'POST', '/api/c/jobs', J({ title: 'Mine to delete' }), c[0].cookie), jid = rj.json.job.id;
  assert.strictEqual((await req(P, 'DELETE', '/api/c/jobs/' + jid, undefined, c[1].cookie)).status, 403); assert.strictEqual((await req(P, 'DELETE', '/api/c/jobs/' + jid, undefined, c[0].cookie)).status, 200);
  let last = 0; for (let i = 0; i < 12; i++) { last = (await req(P, 'POST', '/api/c/jobs', J({ title: 'Spam ' + i }), c3.cookie)).status; } assert.strictEqual(last, 429, 'দিনে ১০-এর বেশি জমা আটকায়');
});
t('জব API: অ্যাডমিন — যোগ/সম্পাদনা/লুকানো/মোছা, এবং আগের সদস্য মুছলে তার অপেক্ষমাণ যায়, অনুমোদিত থাকে', async () => {
  const P = A.port, ac = A.ac;
  assert.strictEqual((await req(P, 'GET', '/api/admin/c/jobs')).status, 401); assert.strictEqual((await req(P, 'GET', '/api/admin/c/jobs', undefined, A.users.mod01.cookie)).status, 401);
  let r = await req(P, 'POST', '/api/admin/c/jobs', J({ title: 'Admin Added', link: 'https://example.org/admin-1' }), ac); assert.strictEqual(r.status, 201); const id = r.json.id;
  assert.strictEqual((await req(P, 'POST', '/api/admin/c/jobs', J({ link: 'https://example.org/admin-1' }), ac)).status, 409);
  assert.strictEqual((await req(P, 'PUT', '/api/admin/c/jobs/' + id, { title: 'Admin Edited', deadline: plus(5) }, ac)).status, 200); assert.strictEqual((await req(P, 'GET', '/api/c/jobs?q=' + encodeURIComponent('admin edited'))).json.jobs[0].deadline, plus(5));
  assert.strictEqual((await req(P, 'PUT', '/api/admin/c/jobs/' + id, { link: 'javascript:1' }, ac)).status, 400);
  await req(P, 'PUT', '/api/admin/c/jobs/' + id, { status: 'pending' }, ac); assert.strictEqual((await req(P, 'GET', '/api/c/jobs?q=' + encodeURIComponent('admin edited'))).json.total, 0); await req(P, 'PUT', '/api/admin/c/jobs/' + id, { status: 'approved' }, ac); assert.strictEqual((await req(P, 'GET', '/api/c/jobs?q=' + encodeURIComponent('admin edited'))).json.total, 1);
  const k = A.users.karim02, ka = await req(P, 'POST', '/api/c/jobs', J({ title: 'Karim pending' }), k.cookie), kb = await req(P, 'POST', '/api/admin/c/jobs', J({ title: 'Karim approved', link: 'https://example.org/k2' }), ac);
  await req(P, 'POST', '/api/c/jobs/' + (await req(P, 'GET', '/api/admin/c/jobs?status=pending', undefined, ac)).json.jobs.find(j => j.title === 'Karim pending').id + '/review', { action: 'approve' }, A.users.mod01.cookie);
  const kp = await req(P, 'POST', '/api/c/jobs', J({ title: 'Karim second pending' }), k.cookie); assert.strictEqual(kp.status, 201);
  assert.strictEqual((await req(P, 'DELETE', '/api/admin/c/users/' + k.id, undefined, ac)).status, 200);
  const all = (await req(P, 'GET', '/api/admin/c/jobs', undefined, ac)).json.jobs.map(j => j.title); assert(!all.includes('Karim second pending'), 'অপেক্ষমাণ গেছে'); assert(all.includes('Karim pending'), 'অনুমোদিত থাকে'); assert.strictEqual((await req(P, 'DELETE', '/api/admin/c/jobs/' + id, undefined, ac)).status, 200);
});
t('ফিড: ডিফল্টে লোকাল/ভেতরের ঠিকানার ফিড আটকায় (SSRF); ফিড যাচাই', async () => {
  const P = A.port, ac = A.ac;
  for (const bad of [{ name: '', url: 'https://x.org/f' }, { name: 'x', url: 'javascript:1' }, { name: 'x', url: 'file:///etc/passwd' }]) assert.strictEqual((await req(P, 'POST', '/api/admin/c/jobs/feeds', bad, ac)).status, 400, JSON.stringify(bad));
  const r = await req(P, 'POST', '/api/admin/c/jobs/feeds', { name: 'Local', url: 'http://127.0.0.1:9/feed.xml' }, ac); assert.strictEqual(r.status, 201); const run = await req(P, 'POST', '/api/admin/c/jobs/feeds/' + r.json.id + '/run', {}, ac);
  assert.strictEqual(run.json.ok, false); assert(/অনুমোদিত নয়|ভেতরের/.test(run.json.feed.lastErr), run.json.feed.lastErr); assert.strictEqual((await req(P, 'DELETE', '/api/admin/c/jobs/feeds/' + r.json.id, undefined, ac)).status, 200);
  A.stopApp = true;
});
t('ফিড: আসল ফিড থেকে আনা — কীওয়ার্ড ছাঁকনি, ডুপ্লিকেট এড়ানো, অনুমোদনের অপেক্ষায়/নিজে প্রকাশ, ত্রুটি রেকর্ড, ফিড মুছলে সার্কুলার', async () => {
  await A.stop(); const B = await startApp('app2', { JOBS_ALLOW_PRIVATE_FEEDS: '1' }), P = B.port, ac = B.ac;
  const old = new Date(Date.now() - 100 * 86400000).toUTCString(), fresh = new Date().toUTCString();
  let body = `<rss><channel><item><title>Molecular Biologist wanted</title><link>https://example.org/f/1?utm_campaign=a</link><pubDate>${fresh}</pubDate><description>Genetics lab</description></item><item><title>Bank Teller</title><link>https://example.org/f/2</link><pubDate>${fresh}</pubDate><description>Retail banking</description></item><item><title>Old Genetics post</title><link>https://example.org/f/3</link><pubDate>${old}</pubDate></item><item><title>Genetic Counsellor</title><link>https://example.org/f/4</link><pubDate>${fresh}</pubDate></item></channel></rss>`; let status = 200;
  const fsrv = http.createServer((q, s) => { if (q.url.startsWith('/redir')) { s.writeHead(302, { Location: '/feed.xml' }); return s.end(); } if (status !== 200) { s.writeHead(status); return s.end('x'); } s.writeHead(200, { 'Content-Type': 'application/rss+xml' }); s.end(body); }); await new Promise(r => fsrv.listen(0, '127.0.0.1', r)); const fp = fsrv.address().port;
  try {
    const mk = await req(P, 'POST', '/api/admin/c/jobs/feeds', { name: 'Test Feed', url: `http://127.0.0.1:${fp}/redir`, keywords: 'genetic, molecular', type: 'research', cat: 'research', where: 'abroad', auto: 'pending' }, ac); assert.strictEqual(mk.status, 201, JSON.stringify(mk.json)); const fid = mk.json.id;
    let run = await req(P, 'POST', '/api/admin/c/jobs/feeds/' + fid + '/run', {}, ac); assert.strictEqual(run.json.ok, true, JSON.stringify(run.json)); assert.strictEqual(run.json.feed.lastNew, 2, 'কীওয়ার্ড মেলা ২টি (ব্যাংক ও পুরনোটা নয়)'); assert.strictEqual(run.json.feed.lastSeen, 4);
    let pend = (await req(P, 'GET', '/api/admin/c/jobs?status=pending', undefined, ac)).json.jobs; assert.strictEqual(pend.length, 2); assert(pend.every(j => j.feed && j.where === 'abroad' && j.type === 'research' && j.link.startsWith('https://example.org/f/') && !/utm_/.test(j.link)));
    assert.strictEqual((await req(P, 'GET', '/api/c/jobs')).json.total, 0, 'অপেক্ষমাণ জনসমক্ষে নয়');
    run = await req(P, 'POST', '/api/admin/c/jobs/feeds/' + fid + '/run', {}, ac); assert.strictEqual(run.json.feed.lastNew, 0, 'ডুপ্লিকেট আনেনি');
    await req(P, 'PUT', '/api/admin/c/jobs/feeds/' + fid, { auto: 'approve', keywords: [] }, ac); body = body.replace('</channel>', `<item><title>New Bank Job</title><link>https://example.org/f/9</link><pubDate>${fresh}</pubDate></item></channel>`);
    run = await req(P, 'POST', '/api/admin/c/jobs/feeds/run', {}, ac); assert.strictEqual(run.json.feeds[0].lastNew, 2, 'কীওয়ার্ড ছাড়া: ব্যাংক ও নতুনটা (পুরনোটা পুরনো বলে নয়)');
    assert.strictEqual((await req(P, 'GET', '/api/c/jobs')).json.total, 2, 'নিজে-প্রকাশ ফিডের সার্কুলার চালু');
    status = 404; run = await req(P, 'POST', '/api/admin/c/jobs/feeds/' + fid + '/run', {}, ac); assert.strictEqual(run.json.ok, false); assert(/404/.test(run.json.feed.lastErr)); status = 200; body = 'not xml at all'; run = await req(P, 'POST', '/api/admin/c/jobs/feeds/' + fid + '/run', {}, ac); assert(/RSS\/Atom/.test(run.json.feed.lastErr));
    const total = (await req(P, 'GET', '/api/admin/c/jobs', undefined, ac)).json.total; assert.strictEqual(total, 4);
    // সংরক্ষণ: সার্ভার SIGTERM-এ ডেটা লেখে, আবার চালু হলে থাকে
    await B.stop(); await B.start(); B.ac = (await login(B.port, '/api/login', { password: 'testpw-123' })).cookie; const again = await req(B.port, 'GET', '/api/admin/c/jobs', undefined, B.ac); assert.strictEqual(again.json.total, 4, 'রিস্টার্টের পর আছে'); assert.strictEqual(again.json.feeds.length, 1); assert(again.json.feeds[0].lastRun > 0);
    assert.strictEqual((await req(B.port, 'DELETE', '/api/admin/c/jobs/feeds/' + fid + '?items=1', undefined, B.ac)).status, 200); assert.strictEqual((await req(B.port, 'GET', '/api/admin/c/jobs', undefined, B.ac)).json.total, 0);
    // ব্যাকআপে jobs.json আসে
    const bk = await req(B.port, 'POST', '/api/admin/backups', {}, B.ac); assert.strictEqual(bk.status, 201);
    const { openZip } = require('./zip'); const f = path.join(tmp, 'b.zip'); fs.writeFileSync(f, (await req(B.port, 'GET', '/api/admin/backups/' + bk.json.made.name, undefined, B.ac, true)).buf); const z = openZip(f); assert(z.entries.some(e => e.name === 'jobs.json')); z.close();
  } finally { fsrv.close(); await B.stop(); }
});
t('ক্লায়েন্ট jobs.js: নকল DOM-এ লোড হয়, কার্ড escape করে, বিপজ্জনক লিংক ঠেকায়', async () => {
  const vm = require('vm'); const els = {}; const mk = () => ({ innerHTML: '', style: {}, addEventListener() { }, appendChild() { }, contains: () => true });
  const mount = Object.assign(mk(), { id: 'jobsMount' }); const byId = {}, doc = { head: mk(), createElement: () => mk(), getElementById: id => id === 'jobsMount' ? mount : (byId[id] = byId[id] || mk()) };
  let reg = null; const ls = new Map(); const X = { esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])), bn: s => String(s), me: null, ago: () => 'এইমাত্র', toast() { }, needLogin() { }, register: f => { reg = f; }, onAuth() { }, api: async () => ({ jobs: [{ id: 1, title: '<script>alert(1)</script>', org: 'A"B', loc: '', where: 'bd', type: 'job', cat: 'other', deadline: plus(2), left: 2, link: 'javascript:alert(1)', host: 'x.org', note: '', source: '', created: 1, status: 'approved', mine: false, canDelete: false, by: '', expired: false }], total: 1, more: false, pending: 0, canReview: false, types: { job: 'চাকরি' }, cats: { other: 'অন্যান্য' }, where: { bd: 'বাংলাদেশ' } }) };
  const win = { GEBX: X, document: doc, localStorage: { getItem: k => ls.get(k) || null, setItem: (k, v) => ls.set(k, v) } }; Object.assign(win, { window: win });
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'public/jobs.js'), 'utf8'), vm.createContext(Object.assign(win, { console, URLSearchParams, JSON, Math, Date, Number, String, Array, Object, Promise, setTimeout, clearTimeout })));
  assert(reg, 'register হয়নি'); reg({}); await new Promise(r => setTimeout(r, 50));
  const html = byId.jbList.innerHTML; assert(html.length > 100, 'কার্ড আঁকা হয়নি'); assert(!/<script>alert/.test(html), 'শিরোনাম escape হয়নি'); assert(/&lt;script&gt;/.test(html)); assert(!/href="javascript:/.test(html), 'javascript: লিংক'); assert(/href="#"/.test(html)); assert(/noopener noreferrer nofollow/.test(html)); assert(/2 দিন বাকি/.test(html), 'ডেডলাইন লেখা');
});

(async () => {
  for (const [name, fn] of pending) { try { await fn(); pass++; console.log('  ✓ ' + name); } catch (e) { fail++; console.log('  ✗ ' + name + '\n      ' + (e && e.stack ? e.stack.split('\n').slice(0, 5).join('\n      ') : e)); } }
  try { if (A) await A.stop(); } catch (_) { } await new Promise(r => setTimeout(r, 200)); try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) { }
  console.log(`\n${pass} পাস, ${fail} ফেল`); process.exit(fail ? 1 : 0);
})();
