'use strict';
/* AI ল্যাব সহায়কের টেস্ট: node lab-chat-test.js
   নকল Gemini/Groq সার্ভার দিয়ে: প্রসঙ্গ AI-তে পৌঁছায় কি, ফ্রি সীমা শেষ হলে পরের প্রদানকারীতে যায় কি, রেট লিমিট, যাচাই, আর ক্লায়েন্টের fmt/chips/push।
   ⚠️ আসল AI-এর উত্তরের মান বা ব্রাউজারের চ্যাট প্যানেল এখানে পরীক্ষা হয় না; সেটা আসল key দিয়ে হাতে দেখে নিন। */
const fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert'), cp = require('child_process'), http = require('http');
const C = require('./public/vlab-ai-core.js');
let pass = 0, fail = 0; const tests = [], t = (n, f) => tests.push([n, f]);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gebc-')), sleep = ms => new Promise(r => setTimeout(r, ms));
function call(port, method, p, body) {
  return new Promise((ok, no) => {
    const data = body === undefined ? null : JSON.stringify(body), h = {}; if (data) { h['Content-Type'] = 'application/json'; h['Content-Length'] = Buffer.byteLength(data); }
    const r = http.request({ host: '127.0.0.1', port, method, path: p, headers: h }, res => { const ch = []; res.on('data', c => ch.push(c)); res.on('end', () => { let j = null; try { j = JSON.parse(Buffer.concat(ch).toString('utf8')); } catch (_) { } ok({ status: res.statusCode, json: j }); }); });
    r.on('error', no); if (data) r.write(data); r.end();
  });
}
function fake(handler) {   // নকল AI সার্ভার; পাওয়া অনুরোধগুলো seen-এ জমে
  const seen = [], srv = http.createServer((q, s) => { const ch = []; q.on('data', c => ch.push(c)); q.on('end', () => { let b = {}; try { b = JSON.parse(Buffer.concat(ch).toString()); } catch (_) { } seen.push({ url: q.url, headers: q.headers, body: b }); const [code, out] = handler(b, seen.length); s.writeHead(code, { 'Content-Type': 'application/json' }); s.end(JSON.stringify(out)); }); });
  return new Promise(ok => srv.listen(0, '127.0.0.1', () => ok({ srv, seen, base: 'http://127.0.0.1:' + srv.address().port }))); 
}
async function startApp(name, env) {
  const dir = path.join(tmp, name); fs.mkdirSync(dir);
  for (const f of fs.readdirSync(__dirname)) if (/\.(js|json)$/.test(f) && fs.statSync(path.join(__dirname, f)).isFile()) fs.copyFileSync(path.join(__dirname, f), path.join(dir, f));
  fs.cpSync(path.join(__dirname, 'public'), path.join(dir, 'public'), { recursive: true }); fs.mkdirSync(path.join(dir, 'data')); fs.copyFileSync(path.join(__dirname, 'data', 'seed.json'), path.join(dir, 'data', 'seed.json'));
  const app = { port: 20000 + Math.floor(Math.random() * 20000) };
  const clean = Object.assign({}, process.env); ['GEMINI_API_KEY', 'GROQ_API_KEY', 'ANTHROPIC_API_KEY'].forEach(k => delete clean[k]);
  app.srv = cp.spawn(process.execPath, ['server.js'], { cwd: dir, env: Object.assign(clean, { ADMIN_PASSWORD: 'testpw-123', BACKUP_EVERY_HOURS: '0', PORT: String(app.port) }, env), stdio: 'ignore' });
  for (let i = 0; i < 80; i++) { try { await call(app.port, 'GET', '/api/me'); break; } catch (_) { await sleep(100); } }
  app.stop = async () => { const p = new Promise(r => app.srv.once('exit', r)); app.srv.kill('SIGTERM'); await Promise.race([p, sleep(2000)]); };
  return app;
}
const CTX = { lab: 'জেনারেল কেমিস্ট্রি', exp: 'অজানা লবণ শনাক্তকরণ', step: 'ফ্লেম টেস্ট করুন', stepNo: 2, total: 5, steps: ['লবণ নিন', 'ফ্লেম টেস্ট করুন', 'AgNO3 দিন'], input: 'একটি রিএজেন্ট বাছুন', msg: 'ভুল রিএজেন্ট', isErr: true };
const ask = (port, q, extra) => call(port, 'POST', '/api/lab-chat', Object.assign({ messages: [{ r: 'u', t: q }], ctx: CTX }, extra || {}));

/* ---------- ক্লায়েন্টের কোর ---------- */
t('fmt: নিরাপদ HTML, মোটা, তালিকা, <script> এস্কেপ', () => {
  const h = C.fmt('**ফ্লেম** টেস্ট <script>alert(1)</script>\n- এক\n- দুই\n1. প্রথম\n2. দ্বিতীয়');
  assert(/<b>ফ্লেম<\/b>/.test(h)); assert(!/<script/.test(h)); assert(/&lt;script&gt;/.test(h));
  assert(/<ul><li>এক<\/li><li>দুই<\/li><\/ul>/.test(h)); assert(/<ol><li>প্রথম<\/li><li>দ্বিতীয়<\/li><\/ol>/.test(h));
});
t('fmt: খালি/ননস্ট্রিং ঠিক আছে', () => { assert.strictEqual(C.fmt(''), ''); assert.strictEqual(C.fmt(null), ''); });
t('chips: ভুল থাকলে "ভুলটা কেন হলো?" প্রথমে; পরীক্ষণ না খুললে সাধারণ বাটন', () => {
  assert.strictEqual(C.chips({ exp: 'X', isErr: true })[0].l, 'ভুলটা কেন হলো?'); assert(!C.chips({ exp: 'X' }).some(c => /ভুলটা/.test(c.l)));
  assert(C.chips({}).length === 3 && C.chips({}).every(c => c.q.length > 10));
});
t('push: user দিয়ে শুরু, পাশাপাশি একই ভূমিকা জোড়া, সর্বোচ্চ ১২', () => {
  assert.deepStrictEqual(C.push([], 'a', 'hi'), []);
  let h = C.push([], 'u', 'এক'); h = C.push(h, 'u', 'দুই'); assert.strictEqual(h.length, 1); assert.strictEqual(h[0].t, 'এক\nদুই');
  h = []; for (let i = 0; i < 20; i++) h = C.push(h, i % 2 ? 'a' : 'u', 'm' + i); assert(h.length <= 12 && h[0].r === 'u');
});

/* ---------- সার্ভার ---------- */
t('key নেই: status on:false, চ্যাট ৫০৩', async () => {
  const app = await startApp('nokey', {}); try {
    const s = await call(app.port, 'GET', '/api/lab-chat-status'); assert.strictEqual(s.json.on, false);
    assert.strictEqual((await ask(app.port, 'হ্যালো')).status, 503);
  } finally { await app.stop(); }
});
t('Gemini: উত্তর আসে, প্রসঙ্গ+ইতিহাস+সিস্টেম প্রম্পট পৌঁছায়, JSON-মোড নেই, key হেডারে', async () => {
  const g = await fake(() => [200, { candidates: [{ content: { parts: [{ text: 'আগে ফ্লেমের রং দেখুন।' }] } }] }]);
  const app = await startApp('gem', { GEMINI_API_KEY: 'k-gem', GEMINI_BASE: g.base }); try {
    assert.strictEqual((await call(app.port, 'GET', '/api/lab-chat-status')).json.on, true);
    const r = await ask(app.port, 'আমি আটকে গেছি', { messages: [{ r: 'a', t: 'ignored-leading-assistant' }, { r: 'u', t: 'প্রথম প্রশ্ন' }, { r: 'a', t: 'প্রথম উত্তর' }, { r: 'u', t: 'আমি আটকে গেছি' }] });
    assert.strictEqual(r.status, 200); assert.strictEqual(r.json.reply, 'আগে ফ্লেমের রং দেখুন।'); assert.strictEqual(r.json.by, 'Gemini');
    const q = g.seen[0]; assert.strictEqual(q.headers['x-goog-api-key'], 'k-gem'); assert(!q.body.generationConfig.responseMimeType);
    const sys = q.body.systemInstruction.parts[0].text; assert(/GEB Lab Assistant/.test(sys)); assert(/অজানা লবণ শনাক্তকরণ/.test(sys)); assert(/ফ্লেম টেস্ট করুন/.test(sys)); assert(/MISTAKE/.test(sys)); assert(/step 2 of 5/.test(sys));
    assert.deepStrictEqual(q.body.contents.map(c => c.role), ['user', 'model', 'user']); assert(!JSON.stringify(q.body.contents).includes('ignored-leading-assistant'));
  } finally { await app.stop(); g.srv.close(); }
});
t('Gemini-র ফ্রি সীমা (429) শেষ হলে Groq-এ নিজে চলে যায়', async () => {
  const g = await fake(() => [429, { error: { message: 'quota' } }]), q = await fake(() => [200, { choices: [{ message: { content: 'Groq থেকে উত্তর' } }] }]);
  const app = await startApp('fb', { GEMINI_API_KEY: 'a', GEMINI_BASE: g.base, GROQ_API_KEY: 'b', GROQ_BASE: q.base }); try {
    const r = await ask(app.port, 'প্রশ্ন'); assert.strictEqual(r.status, 200); assert.strictEqual(r.json.reply, 'Groq থেকে উত্তর'); assert.strictEqual(r.json.by, 'Groq');
    assert.strictEqual(g.seen.length, 1); assert.strictEqual(q.seen[0].headers.authorization, 'Bearer b');
    assert.deepStrictEqual(q.seen[0].body.messages.map(m => m.role), ['system', 'user']);
  } finally { await app.stop(); g.srv.close(); q.srv.close(); }
});
t('সব প্রদানকারী ব্যর্থ: ৫০২ + বাংলা বার্তা, আর সীমা গণনায় ধরা হয় না', async () => {
  const g = await fake(() => [500, { error: 'x' }]);
  const app = await startApp('allfail', { GEMINI_API_KEY: 'a', GEMINI_BASE: g.base, CHAT_PER_IP_HOUR: '2' }); try {
    for (let i = 0; i < 3; i++) { const r = await ask(app.port, 'প্রশ্ন'); assert.strictEqual(r.status, 502); assert(r.json.error); }
  } finally { await app.stop(); g.srv.close(); }
});
t('যাচাই: খালি প্রশ্ন, assistant-এ শেষ, ৮০০+ অক্ষর, ভুল Content-Type', async () => {
  const g = await fake(() => [200, { candidates: [{ content: { parts: [{ text: 'ok' }] } }] }]);
  const app = await startApp('val', { GEMINI_API_KEY: 'a', GEMINI_BASE: g.base }); try {
    assert.strictEqual((await call(app.port, 'POST', '/api/lab-chat', { messages: [] })).status, 400);
    assert.strictEqual((await call(app.port, 'POST', '/api/lab-chat', { messages: [{ r: 'u', t: 'a' }, { r: 'a', t: 'b' }] })).status, 400);
    assert.strictEqual((await ask(app.port, 'ক'.repeat(801))).status, 400);
    const raw = await new Promise(ok => { const r = http.request({ host: '127.0.0.1', port: app.port, method: 'POST', path: '/api/lab-chat', headers: { 'Content-Type': 'text/plain' } }, res => { res.resume(); ok(res.statusCode); }); r.end('hi'); });
    assert.strictEqual(raw, 415); assert.strictEqual(g.seen.length, 0);
  } finally { await app.stop(); g.srv.close(); }
});
t('প্রসঙ্গ ছাঁটা: বিশাল/ভুল ধরনের ctx এ ক্র্যাশ নেই, প্রম্পট সীমিত', async () => {
  const g = await fake(() => [200, { candidates: [{ content: { parts: [{ text: 'ok' }] } }] }]);
  const app = await startApp('ctx', { GEMINI_API_KEY: 'a', GEMINI_BASE: g.base }); try {
    assert.strictEqual((await ask(app.port, 'প্রশ্ন', { ctx: 'not-an-object' })).status, 200);
    assert.strictEqual((await ask(app.port, 'প্রশ্ন', { ctx: { exp: 'x'.repeat(5000), steps: new Array(40).fill('y'.repeat(900)), msg: 'z'.repeat(9000), total: 'abc' } })).status, 200);
    assert(g.seen[1].body.systemInstruction.parts[0].text.length < 12000);
    await call(app.port, 'POST', '/api/lab-chat', { messages: [{ r: 'u', t: 'x' }], ctx: { steps: new Array(500).fill('y'.repeat(900)) } }).catch(() => null);   // ৬৪KB-এর বেশি: কেটে দেওয়া হয়, সার্ভার টিকে থাকে
    assert.strictEqual((await ask(app.port, 'প্রশ্ন')).status, 200);
  } finally { await app.stop(); g.srv.close(); }
});
t('রেট লিমিট: IP প্রতি ঘণ্টায় সীমা পেরোলে ৪২৯', async () => {
  const g = await fake(() => [200, { candidates: [{ content: { parts: [{ text: 'ok' }] } }] }]);
  const app = await startApp('rl', { GEMINI_API_KEY: 'a', GEMINI_BASE: g.base, CHAT_PER_IP_HOUR: '2' }); try {
    assert.strictEqual((await ask(app.port, '১')).status, 200); assert.strictEqual((await ask(app.port, '২')).status, 200);
    const r = await ask(app.port, '৩'); assert.strictEqual(r.status, 429); assert(/ঘণ্টা/.test(r.json.error)); assert.strictEqual(g.seen.length, 2);
  } finally { await app.stop(); g.srv.close(); }
});
t('দৈনিক সীমা: পুরো সাইটে CHAT_PER_DAY পেরোলে ৪২৯', async () => {
  const g = await fake(() => [200, { candidates: [{ content: { parts: [{ text: 'ok' }] } }] }]);
  const app = await startApp('day', { GEMINI_API_KEY: 'a', GEMINI_BASE: g.base, CHAT_PER_DAY: '1' }); try {
    assert.strictEqual((await ask(app.port, '১')).status, 200); assert.strictEqual((await ask(app.port, '২')).status, 429);
  } finally { await app.stop(); g.srv.close(); }
});
t('পেজ ও SW: স্ক্রিপ্ট লোড হয়, অফলাইন ক্যাশে আছে', () => {
  const h = fs.readFileSync(path.join(__dirname, 'public/index.html'), 'utf8'), sw = fs.readFileSync(path.join(__dirname, 'public/sw.js'), 'utf8');
  assert(h.indexOf('/vlab-ai-core.js') > 0 && h.indexOf('/vlab-ai-core.js') < h.indexOf('/vlab-ai.js')); assert(sw.includes("'/vlab-ai.js'") && sw.includes("'/vlab-ai-core.js'"));
});

(async () => {
  for (const [n, f] of tests) { try { await f(); pass++; console.log('  ✓', n); } catch (e) { fail++; console.log('  ✗', n, '\n     ', e.message); } }
  console.log(`\nAI ল্যাব সহায়ক: ${pass} পাস, ${fail} ফেল`); try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) { }
  process.exit(fail ? 1 : 0);
})();
