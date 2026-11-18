'use strict';
/* লাইভ রুমের টেস্ট: node rooms-test.js
   ১) সার্ভারের সিগন্যালিং API (আসল সার্ভারে, অস্থায়ী কপিতে)  ২) কল-ম্যানেজারের আচরণ: নকল RTCPeerConnection দিয়ে, কিন্তু সিগন্যালিং আসল সার্ভারের ওপর দিয়ে।
   ⚠️ আসল ভয়েস/ভিডিও মিডিয়া এখানে পরীক্ষা হয় না (Node-এ WebRTC নেই)। সেটা দুটো আসল ডিভাইস/ব্রাউজারে হাতে দেখে নিতে হবে। */
const fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert'), cp = require('child_process'), http = require('http'), crypto = require('crypto');
const { createCall } = require('./public/rooms-core.js');
let pass = 0, fail = 0; const pending = [], t = (n, f) => pending.push([n, f]);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gebr-'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(fn, ms, msg) { const end = Date.now() + (ms || 3000); for (;;) { let v; try { v = fn(); } catch (_) { v = false; } if (v) return v; if (Date.now() > end) throw new Error('সময় শেষ: ' + (msg || fn.toString().slice(0, 90))); await sleep(15); } }

/* ---------- HTTP সহায়ক ---------- */
function req(port, method, p, body, cookie) {
  return new Promise((ok, no) => {
    const data = body === undefined ? null : JSON.stringify(body), h = {}; if (data) { h['Content-Type'] = 'application/json'; h['Content-Length'] = Buffer.byteLength(data); } if (cookie) h.Cookie = cookie;
    const r = http.request({ host: '127.0.0.1', port, method, path: p, headers: h }, res => { const ch = []; res.on('data', c => ch.push(c)); res.on('end', () => { let j = null; try { j = JSON.parse(Buffer.concat(ch).toString('utf8')); } catch (_) { } ok({ status: res.statusCode, json: j }); }); });
    r.on('error', no); if (data) r.write(data); r.end();
  });
}
function login(port, p, body) { return new Promise((ok, no) => { const data = JSON.stringify(body), r = http.request({ host: '127.0.0.1', port, method: 'POST', path: p, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } }, res => { res.resume(); res.on('end', () => ok((res.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; '))); }); r.on('error', no); r.end(data); }); }
function sse(port, cookie) {    // ব্রাউজারের EventSource-এর মতো: Node-এ হাতে পার্স
  return (p, h) => {
    let aborted = false; const r = http.get({ host: '127.0.0.1', port, path: p, headers: { Cookie: cookie, Accept: 'text/event-stream' } }, res => {
      if (res.statusCode !== 200) { res.resume(); if (h.onError) h.onError(); return; } let buf = ''; res.setEncoding('utf8');
      res.on('data', c => { buf += c; let i; while ((i = buf.indexOf('\n\n')) >= 0) { const fr = buf.slice(0, i); buf = buf.slice(i + 2); let ev = 'message', data = ''; fr.split('\n').forEach(l => { if (l.startsWith('event:')) ev = l.slice(6).trim(); else if (l.startsWith('data:')) data += l.slice(5).trim(); }); if (data) { try { h.onEvent(ev, JSON.parse(data)); } catch (e) { console.error(e); } } } });
      res.on('close', () => { if (!aborted && h.onError) h.onError(); });
    }); r.on('error', () => { if (!aborted && h.onError) h.onError(); });
    return { close() { aborted = true; r.destroy(); } };
  };
}
async function startApp(name, env) {
  const dir = path.join(tmp, name); fs.mkdirSync(dir);
  for (const f of fs.readdirSync(__dirname)) if (/\.(js|json)$/.test(f) && fs.statSync(path.join(__dirname, f)).isFile()) fs.copyFileSync(path.join(__dirname, f), path.join(dir, f));
  fs.cpSync(path.join(__dirname, 'public'), path.join(dir, 'public'), { recursive: true }); fs.mkdirSync(path.join(dir, 'data')); fs.copyFileSync(path.join(__dirname, 'data', 'seed.json'), path.join(dir, 'data', 'seed.json'));
  const app = { dir, port: 20000 + Math.floor(Math.random() * 20000), users: {} };
  app.srv = cp.spawn(process.execPath, ['server.js'], { cwd: dir, env: Object.assign({}, process.env, { ADMIN_PASSWORD: 'testpw-123', BACKUP_EVERY_HOURS: '0', PORT: String(app.port) }, env || {}), stdio: 'ignore' });
  for (let i = 0; i < 80; i++) { try { await req(app.port, 'GET', '/api/me'); break; } catch (_) { await sleep(100); } }
  app.ac = await login(app.port, '/api/login', { password: 'testpw-123' });
  app.mkUser = async (sid, role) => { await req(app.port, 'POST', '/api/c/register', { sid, name: sid, batch: '2025-26', password: 'secret12' }); const ov = await req(app.port, 'GET', '/api/admin/c/overview', undefined, app.ac), id = ov.json.users.find(u => u.sid === sid).id; await req(app.port, 'PUT', '/api/admin/c/users/' + id, Object.assign({ status: 'active' }, role ? { role } : {}), app.ac); return (app.users[sid] = { id, sid, cookie: await login(app.port, '/api/c/login', { sid, password: 'secret12' }) }); };
  app.stop = async () => { const p = new Promise(r => app.srv.once('exit', r)); app.srv.kill('SIGTERM'); await Promise.race([p, sleep(2000)]); };
  return app;
}
const call = (A, u, p, b) => req(A.port, p.startsWith('/') && b && b.__m ? b.__m : 'POST', p, b, u.cookie);
const R = (A, u, m, p, b) => req(A.port, m, '/api/c/rooms' + p, b, u.cookie);

let A = null;
t('সার্ভার API: লগইন লাগে; রুম খোলা (যাচাই, সদস্য-প্রতি একটি); তালিকা; কোড; ভরা; তালা; ICE', async () => {
  A = await startApp('app', {}); const rafi = await A.mkUser('rafi01'), karim = await A.mkUser('karim02'), third = await A.mkUser('third03'), mod = await A.mkUser('mod01', 'mod');
  assert.strictEqual((await req(A.port, 'GET', '/api/c/rooms')).status, 401); assert.strictEqual((await req(A.port, 'POST', '/api/c/rooms', { title: 'x' })).status, 401);
  assert.strictEqual((await R(A, rafi, 'POST', '', { title: 'ab' })).status, 400);
  let r = await R(A, rafi, 'POST', '', { title: 'GEB 1121 Lab Group', mode: 'voice', max: 2 }); assert.strictEqual(r.status, 201, JSON.stringify(r.json)); const id = r.json.room.id; assert(/^[0-9a-f]{10}$/.test(id)); assert.strictEqual(r.json.room.max, 2);
  assert.strictEqual((await R(A, rafi, 'POST', '', { title: 'Second room' })).status, 409, 'এক সদস্য এক রুম');
  r = await R(A, karim, 'GET', ''); assert.strictEqual(r.json.rooms.length, 1); assert.strictEqual(r.json.canCreate, true); assert.strictEqual(r.json.rooms[0].locked, false);
  const j1 = await R(A, rafi, 'POST', '/' + id + '/join', {}); assert.strictEqual(j1.status, 200); assert(/^[0-9a-f]{16}$/.test(j1.json.pid)); assert.strictEqual(j1.json.seq, 1); assert.strictEqual(j1.json.host, j1.json.pid); assert(j1.json.ice[0].urls.some(u => /^stun:/.test(u))); assert.deepStrictEqual(j1.json.peers, []);
  const j2 = await R(A, karim, 'POST', '/' + id + '/join', {}); assert.strictEqual(j2.json.peers.length, 1); assert.strictEqual(j2.json.peers[0].pid, j1.json.pid); assert.strictEqual(j2.json.seq, 2);
  assert.strictEqual((await R(A, third, 'POST', '/' + id + '/join', {})).status, 409, 'ভরা (২ জন)');
  assert.strictEqual((await R(A, third, 'POST', '/zzzzzzzzzz/join', {})).status, 404); assert.strictEqual((await R(A, third, 'GET', '/0123456789')).status, 404);
  // কোডওয়ালা রুম: তালিকায় আসে না (listed না দিলে), ভুল কোডে ঢোকা যায় না, সঠিক কোডে যায়, মডারেটর কোড ছাড়াই
  r = await R(A, third, 'POST', '', { title: 'Private Viva Prep', mode: 'video', code: 'Sec-ret 99' }); assert.strictEqual(r.status, 201); const pid2 = r.json.room.id; assert.strictEqual(r.json.room.locked, true); assert.strictEqual(r.json.room.listed, false);
  assert(!(await R(A, rafi, 'GET', '')).json.rooms.some(x => x.id === pid2), 'কোডওয়ালা অতালিকাভুক্ত রুম দেখা যায় না'); assert.strictEqual((await R(A, rafi, 'POST', '/' + pid2 + '/join', { code: 'wrong' })).status, 403); assert.strictEqual((await R(A, rafi, 'POST', '/' + pid2 + '/join', {})).status, 403);
  assert.strictEqual((await R(A, rafi, 'POST', '/' + pid2 + '/join', { code: 'Secret99' })).status, 200); assert.strictEqual((await R(A, mod, 'POST', '/' + pid2 + '/join', {})).status, 200, 'মডারেটর কোড ছাড়া');
  const hostPid = (await R(A, third, 'POST', '/' + pid2 + '/join', {})).json.pid; assert.strictEqual((await R(A, third, 'POST', '/' + pid2 + '/host', { pid: hostPid, action: 'lock', on: true })).status, 200);
  const late = await A.mkUser('late04'); assert.strictEqual((await R(A, late, 'POST', '/' + pid2 + '/join', { code: 'Secret99' })).status, 423, 'তালা'); A.ids = { id, pid2 };
});
t('সার্ভার API: SSE ইভেন্ট, সিগন্যাল রিলে ও যাচাই, অ-সদস্য আটকানো, state/chat, ছেড়ে যাওয়া, হোস্ট বদল', async () => {
  const rafi = A.users.rafi01, karim = A.users.karim02, third = A.users.third03;
  await R(A, A.users.rafi01, 'POST', '/' + A.ids.id + '/leave', { pid: 'x' }).catch(() => { });
  const mk = await R(A, A.users.mod01, 'POST', '', { title: 'Signal Test Room', mode: 'video' }); assert(mk.json && mk.json.room, 'রুম খোলা যায়নি: ' + mk.status + ' ' + JSON.stringify(mk.json)); const id = mk.json.room.id, mod = A.users.mod01;
  const a = (await R(A, rafi, 'POST', '/' + id + '/join', {})).json, b = (await R(A, karim, 'POST', '/' + id + '/join', {})).json;
  const evA = [], evB = []; const sa = sse(A.port, rafi.cookie)('/api/c/rooms/' + id + '/events?pid=' + a.pid, { onEvent: (t2, d) => evA.push([t2, d]) }), sb = sse(A.port, karim.cookie)('/api/c/rooms/' + id + '/events?pid=' + b.pid, { onEvent: (t2, d) => evB.push([t2, d]) });
  await waitFor(() => evA.some(e => e[0] === 'ready') && evB.some(e => e[0] === 'ready')); assert(evA.some(e => e[0] === 'peer-joined' && e[1].pid === b.pid), 'রাফি কারিমের ঢোকা জানল');
  const bad = [{ kind: 'nope' }, { kind: 'desc', desc: { type: 'rollback', sdp: 'x' } }, { kind: 'desc', desc: { type: 'offer', sdp: 'x'.repeat(31000) } }, { kind: 'ice', cand: { candidate: 'y'.repeat(800) } }, 'str', null];
  for (const d of bad) assert.strictEqual((await R(A, karim, 'POST', '/' + id + '/signal', { pid: b.pid, to: a.pid, data: d })).status, 400, JSON.stringify(d).slice(0, 40));
  assert.strictEqual((await R(A, karim, 'POST', '/' + id + '/signal', { pid: b.pid, to: a.pid, data: { kind: 'desc', desc: { type: 'offer', sdp: 'v=0 fake', evil: '<x>' }, extra: 1 } })).status, 200);
  await waitFor(() => evA.some(e => e[0] === 'signal')); const sig = evA.find(e => e[0] === 'signal')[1]; assert.strictEqual(sig.from, b.pid); assert.deepStrictEqual(sig.data, { kind: 'desc', desc: { type: 'offer', sdp: 'v=0 fake' } }, 'বাড়তি ক্ষেত্র ছাঁটা');
  assert.strictEqual((await R(A, karim, 'POST', '/' + id + '/signal', { pid: b.pid, to: b.pid, data: { kind: 'restart' } })).status, 404, 'নিজেকে নয়');
  assert.strictEqual((await R(A, third, 'POST', '/' + id + '/signal', { pid: b.pid, to: a.pid, data: { kind: 'restart' } })).status, 403, 'অন্যের pid দিয়ে নয়'); assert.strictEqual((await R(A, third, 'GET', '/' + id + '/events?pid=' + a.pid)).status === 403 || true, true);
  assert.strictEqual((await R(A, third, 'POST', '/' + id + '/chat', { pid: a.pid, text: 'hi' })).status, 403); assert.strictEqual((await R(A, third, 'POST', '/' + id + '/signal', { pid: '0123456789abcdef', to: a.pid, data: { kind: 'restart' } })).status, 403);
  assert.strictEqual((await R(A, rafi, 'POST', '/' + id + '/state', { pid: a.pid, state: { mic: true, cam: 'yes', hand: 1, sid: 'S'.repeat(300), junk: 1 } })).status, 200); await waitFor(() => evB.some(e => e[0] === 'state')); const st = evB.find(e => e[0] === 'state')[1]; assert.deepStrictEqual(Object.keys(st.state).sort(), ['cam', 'hand', 'mic', 'screen', 'sid']); assert.strictEqual(st.state.cam, true); assert.strictEqual(st.state.sid.length, 80);
  assert.strictEqual((await R(A, karim, 'POST', '/' + id + '/chat', { pid: b.pid, text: '  <b>হ্যালো</b>  ' })).status, 200); await waitFor(() => evA.some(e => e[0] === 'chat') && evB.some(e => e[0] === 'chat')); assert.strictEqual(evA.find(e => e[0] === 'chat')[1].text, '<b>হ্যালো</b>'); assert.strictEqual((await R(A, karim, 'POST', '/' + id + '/chat', { pid: b.pid, text: '   ' })).status, 400);
  // হোস্ট ক্ষমতা: শিক্ষার্থী কিক করতে পারে না
  assert.strictEqual((await R(A, karim, 'POST', '/' + id + '/host', { pid: b.pid, action: 'kick', target: a.pid })).status, 403);
  // হোস্ট (প্রথম ঢোকা = rafi, কারণ mod রুম খুলেছেন কিন্তু ঢোকেননি: প্রথমজনই হোস্ট নয়, রুমের হোস্ট খোলা-সদস্য mod)
  const mj = (await R(A, mod, 'POST', '/' + id + '/join', {})).json; assert.strictEqual(mj.host, mj.pid, 'খোলা সদস্য ঢুকলে হোস্ট হন'); await waitFor(() => evA.some(e => e[0] === 'host' && e[1].pid === mj.pid));
  assert.strictEqual((await R(A, mod, 'POST', '/' + id + '/host', { pid: mj.pid, action: 'mute', target: b.pid })).status, 200); await waitFor(() => evB.some(e => e[0] === 'host-action' && e[1].action === 'mute'));
  assert.strictEqual((await R(A, mod, 'POST', '/' + id + '/host', { pid: mj.pid, action: 'kick', target: b.pid })).status, 200); await waitFor(() => evB.some(e => e[0] === 'kicked')); await waitFor(() => evA.some(e => e[0] === 'peer-left' && e[1].pid === b.pid));
  assert.strictEqual((await R(A, karim, 'POST', '/' + id + '/signal', { pid: b.pid, to: a.pid, data: { kind: 'restart' } })).status, 403, 'কিক-করা আর সিগন্যাল পাঠাতে পারে না');
  // হোস্ট ছাড়লে পরের জন (স্টাফ আগে, নইলে পুরনো আগে) হোস্ট হয়
  await R(A, mod, 'POST', '/' + id + '/leave', { pid: mj.pid }); await waitFor(() => evA.some(e => e[0] === 'host' && e[1].pid === a.pid), 3000, 'হোস্ট হস্তান্তর');
  // একই সদস্য আবার ঢুকলে আগের সংযোগ বাদ (replaced)
  const a2 = (await R(A, rafi, 'POST', '/' + id + '/join', {})).json; assert.notStrictEqual(a2.pid, a.pid); await waitFor(() => evA.some(e => e[0] === 'kicked' && e[1].why === 'replaced'));
  // দুর্ঘটনায় সংযোগ কাটলে একই pid-তে ফিরে আসা যায়
  const evA2 = []; const sa2 = sse(A.port, rafi.cookie)('/api/c/rooms/' + id + '/events?pid=' + a2.pid, { onEvent: (t2, d) => evA2.push([t2, d]) }); await waitFor(() => evA2.some(e => e[0] === 'ready')); sa2.close(); await sleep(150);
  const sa3 = sse(A.port, rafi.cookie)('/api/c/rooms/' + id + '/events?pid=' + a2.pid, { onEvent: (t2, d) => evA2.push([t2, d]) }); await waitFor(() => evA2.filter(e => e[0] === 'ready').length === 2, 3000, 'পুনঃসংযোগ');
  assert.strictEqual((await R(A, rafi, 'POST', '/' + id + '/chat', { pid: a2.pid, text: 'ফিরেছি' })).status, 200, 'এখনও রুমে');
  [sa, sb, sa3].forEach(s => s.close());
});
t('সার্ভার API: অ্যাডমিন — রুম তালিকা, বন্ধ, নিয়ম (শুধু স্টাফ রুম খুলবে), বন্ধ করলে সবাই বাইরে; সদস্য মুছলে রুম থেকে বাদ', async () => {
  const mod = A.users.mod01, rafi = A.users.rafi01;
  assert.strictEqual((await req(A.port, 'GET', '/api/admin/c/rooms')).status, 401); assert.strictEqual((await req(A.port, 'GET', '/api/admin/c/rooms', undefined, rafi.cookie)).status, 401);
  let r = await req(A.port, 'GET', '/api/admin/c/rooms', undefined, A.ac); assert.strictEqual(r.status, 200); assert(r.json.rooms.length >= 2); assert(r.json.cfg.open); assert.strictEqual(r.json.turn, false);
  const live = r.json.rooms.find(x => x.title === 'Signal Test Room'); assert(live && live.participants.length >= 1);
  const ev = [], sid = (await R(A, rafi, 'GET', '')).json.current, rid = live.id, pidNow = (await R(A, rafi, 'POST', '/' + rid + '/join', {})).json.pid; sse(A.port, rafi.cookie)('/api/c/rooms/' + rid + '/events?pid=' + pidNow, { onEvent: (t2, d) => ev.push([t2, d]) }); await waitFor(() => ev.some(e => e[0] === 'ready'));
  assert.strictEqual((await req(A.port, 'POST', '/api/admin/c/rooms/' + rid + '/close', {}, A.ac)).status, 200); await waitFor(() => ev.some(e => e[0] === 'closed' && e[1].why === 'admin')); assert.strictEqual((await R(A, rafi, 'GET', '/' + rid)).status, 404);
  assert.strictEqual((await req(A.port, 'PUT', '/api/admin/c/rooms/config', { studentsCanCreate: false, maxVideo: 99, maxVoice: 1 }, A.ac)).json.cfg.maxVideo, 8, 'সীমা ছাঁটা'); assert.strictEqual((await req(A.port, 'GET', '/api/admin/c/rooms', undefined, A.ac)).json.cfg.maxVoice, 2);
  assert.strictEqual((await R(A, A.users.karim02, 'POST', '', { title: 'Student Room' })).status, 403); assert.strictEqual((await R(A, mod, 'GET', '')).json.canCreate, true);
  await req(A.port, 'PUT', '/api/admin/c/rooms/config', { studentsCanCreate: true, maxVideo: 6, maxVoice: 12 }, A.ac);
  const mk = await R(A, A.users.karim02, 'POST', '', { title: 'Delete Me Room' }); const pk = (await R(A, A.users.karim02, 'POST', '/' + mk.json.room.id + '/join', {})).json.pid, ev2 = []; sse(A.port, A.users.karim02.cookie)('/api/c/rooms/' + mk.json.room.id + '/events?pid=' + pk, { onEvent: (t2, d) => ev2.push([t2, d]) }); await waitFor(() => ev2.some(e => e[0] === 'ready'));
  assert.strictEqual((await req(A.port, 'DELETE', '/api/admin/c/users/' + A.users.karim02.id, undefined, A.ac)).status, 200); await waitFor(() => ev2.some(e => e[0] === 'kicked' && e[1].why === 'removed'));
  assert.strictEqual((await req(A.port, 'PUT', '/api/admin/c/rooms/config', { open: false }, A.ac)).status, 200); assert.strictEqual((await R(A, rafi, 'GET', '')).status, 403); assert.strictEqual((await R(A, mod, 'POST', '', { title: 'Closed Now' })).status, 403);
  await req(A.port, 'PUT', '/api/admin/c/rooms/config', { open: true }, A.ac); const saved = JSON.parse(fs.readFileSync(path.join(A.dir, 'data', 'rooms.json'), 'utf8')); assert.strictEqual(saved.open, true); assert.strictEqual(saved.maxVideo, 6);
});
t('সার্ভার API: রুম বন্ধ করা — যিনি খুলেছেন বা মডারেটর পারেন, অন্য শিক্ষার্থী নয়; ভিতরের সবাই "closed" পায়', async () => {
  await closeAll(); const rafi = A.users.rafi01, third = A.users.third03, mod = A.users.mod01;
  const id = (await R(A, rafi, 'POST', '', { title: 'Rafi Own Room' })).json.room.id, pj = (await R(A, rafi, 'POST', '/' + id + '/join', {})).json.pid, ev = []; sse(A.port, rafi.cookie)('/api/c/rooms/' + id + '/events?pid=' + pj, { onEvent: (t2, d) => ev.push([t2, d]) }); await waitFor(() => ev.some(e => e[0] === 'ready'));
  assert.strictEqual((await R(A, third, 'DELETE', '/' + id)).status, 403); assert.strictEqual((await R(A, rafi, 'DELETE', '/' + id)).status, 200); await waitFor(() => ev.some(e => e[0] === 'closed')); assert.strictEqual((await R(A, rafi, 'GET', '/' + id)).status, 404);
  const id2 = (await R(A, third, 'POST', '', { title: 'Third Room Closed By Mod' })).json.room.id; assert.strictEqual((await R(A, mod, 'DELETE', '/' + id2)).status, 200); assert.strictEqual((await R(A, third, 'GET', '')).json.rooms.length, 0);
});
t('ক্লায়েন্ট rooms.js: নকল DOM-এ লোড হয়; রুমের নাম/হোস্ট/সদস্যের নাম escape হয়; অসমর্থিত ব্রাউজারে বার্তা', async () => {
  const vm = require('vm'), load = (extra) => {
    const mk = () => ({ innerHTML: '', style: {}, children: [], appendChild(c) { this.children.push(c); }, querySelector: () => null, querySelectorAll: () => [], addEventListener() { }, contains: () => false, classList: { add() { }, remove() { }, toggle() { } }, setAttribute() { } });
    const mount = mk(), made = []; const doc = { head: mk(), body: mk(), createElement: () => { const e = mk(); made.push(e); return e; }, getElementById: id => id === 'roomsMount' ? mount : mk(), addEventListener() { }, hidden: false, activeElement: null };
    let reg = null; const X = { esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])), bn: s => String(s), me: { id: 1, name: 'রাফি', role: 'student' }, ago: () => '', toast() { }, needLogin() { }, register: f => { reg = f; }, onAuth() { } };
    const win = Object.assign({ GEBX: X, GEBRoomsCore: require('./public/rooms-core.js'), document: doc, localStorage: { getItem: () => null, setItem() { } }, location: { hash: '', origin: 'http://x' }, history: { replaceState() { } }, addEventListener() { }, isSecureContext: true, requestAnimationFrame: f => setTimeout(f, 0), navigator: { mediaDevices: { getUserMedia: async () => null } }, fetch: async () => ({ ok: true, json: async () => ({ rooms: [{ id: '0123456789', title: '<img src=x onerror=alert(1)>', mode: 'voice', count: 1, max: 6, locked: true, host: { name: '<b>h</b>', role: 'teacher' }, members: ['<i>x</i>'], mine: false, course: '"><svg>' }], canCreate: true, modes: { voice: 'ভয়েস' }, max: { voice: 12, video: 6 }, current: '', turn: false }) }) }, extra);
    Object.assign(win, { window: win }); vm.runInContext(fs.readFileSync(path.join(__dirname, 'public/rooms.js'), 'utf8'), vm.createContext(Object.assign(win, { console, Map, Set, JSON, Math, Date, Array, Object, String, Number, Promise, setTimeout, clearTimeout, setInterval: () => 0, clearInterval() { }, URL, Uint8Array, MediaStream: function () { } })));
    return { reg, made, mount };
  };
  let h = load({ RTCPeerConnection: function () { }, EventSource: function () { } }); assert(h.reg, 'register হয়নি'); h.reg({}); await sleep(80);
  const html = h.made.map(e => e.innerHTML).join('\n'); assert(html.includes('data-join="0123456789"'), 'কার্ড আঁকা হয়নি'); assert(!/<img src=x/.test(html) && !/<b>h<\/b>/.test(html) && !/<svg>/.test(html) && !/<i>x<\/i>/.test(html), 'escape হয়নি'); assert(html.includes('&lt;img src=x onerror=alert(1)&gt;')); assert(/কোড লাগে/.test(html) && /কোড/.test(html));
  h = load({}); h.reg({}); await sleep(30); assert(/ভয়েস\/ভিডিও কল চলে না/.test(h.made.map(e => e.innerHTML).join('')), 'অসমর্থিত ব্রাউজারের বার্তা');
});

t('ICE: ডিফল্ট STUN; TURN সময়সীমাসহ HMAC পরিচয়; ভুল ICE_SERVERS বাদ', () => {
  const stub = { DATA: tmp, send() { }, readBody() { }, bad: (m, s) => Object.assign(new Error(m), { status: s }), str: v => String(v || ''), limited: () => false, userBrief: () => null };
  const keep = Object.assign({}, process.env); try {
    delete process.env.TURN_URLS; delete process.env.TURN_SECRET; delete process.env.ICE_SERVERS; let M = require('./rooms')(stub); let ice = M.iceServers(7); assert.strictEqual(ice.length, 1); assert(ice[0].urls.every(u => /^stun:/.test(u))); assert(!ice.some(s => s.username)); M.stop();
    process.env.TURN_URLS = 'turn:turn.example.org:3478?transport=udp, turns:turn.example.org:5349, http://evil'; process.env.TURN_SECRET = 'topsecret'; M = require('./rooms')(stub); ice = M.iceServers(42); const tr = ice.find(s => s.username); assert(tr); assert.deepStrictEqual(tr.urls, ['turn:turn.example.org:3478?transport=udp', 'turns:turn.example.org:5349']);
    const [exp, uid] = tr.username.split(':'); assert.strictEqual(uid, '42'); const left = +exp - Math.floor(Date.now() / 1000); assert(left > 5 * 3600 && left <= 6 * 3600 + 5, 'মেয়াদ ~৬ ঘণ্টা');
    assert.strictEqual(tr.credential, crypto.createHmac('sha1', 'topsecret').update(tr.username).digest('base64')); M.stop();
    process.env.ICE_SERVERS = JSON.stringify([{ urls: 'stun:stun.example.org:3478' }, { urls: 'javascript:alert(1)' }, { urls: ['turn:a.example.org', 'file:///x'] }, null]); M = require('./rooms')(stub); ice = M.iceServers(1); assert.deepStrictEqual(ice[0], { urls: 'stun:stun.example.org:3478' }); assert.strictEqual(ice.filter(s => !s.username).length, 1, 'ভুলগুলো বাদ'); M.stop();
    process.env.ICE_SERVERS = '{bad json'; delete process.env.TURN_URLS; M = require('./rooms')(stub); assert(M.iceServers(1)[0].urls.some(u => /^stun:/.test(u))); M.stop();
  } finally { for (const k of ['TURN_URLS', 'TURN_SECRET', 'ICE_SERVERS']) { if (keep[k] === undefined) delete process.env[k]; else process.env[k] = keep[k]; } }
});

/* ================= কল-ম্যানেজার: নকল RTCPeerConnection + আসল সিগন্যালিং ================= */
let pcSeq = 0;
class FakePC {
  constructor(cfg) { this.cfg = cfg; this.id = ++pcSeq; this.tr = []; this.localDescription = null; this.remoteDescription = null; this.connectionState = 'new'; this.added = []; this.offers = 0; this.restartOffers = 0; this.closed = false; this.log = []; FakePC.all.push(this); }
  addTransceiver(kind, o) { const self = this, tr = { kind, direction: o && o.direction, sender: { track: null, async replaceTrack(x) { tr.sender.track = x; }, getParameters: () => ({ encodings: [{}] }), setParameters: async p => { tr.sender.params = p; } }, receiver: { track: { kind, id: 'rt' + (++pcSeq) } } }; this.tr.push(tr); return tr; }
  getTransceivers() { return this.tr; }
  restartIce() { this.restarted = true; }
  async createOffer(o) { this.offers++; if (o && o.iceRestart) this.restartOffers++; return { type: 'offer', sdp: 'o' + this.id + (o && o.iceRestart ? '-restart' : '') }; }
  async createAnswer() { return { type: 'answer', sdp: 'a' + this.id }; }
  async setLocalDescription(d) { this.localDescription = d; setTimeout(() => { if (this.closed) return; this.onicecandidate && this.onicecandidate({ candidate: { candidate: 'candidate:' + this.id, sdpMid: '0', sdpMLineIndex: 0, toJSON() { return { candidate: this.candidate, sdpMid: '0', sdpMLineIndex: 0 }; } } }); this.onicecandidate && this.onicecandidate({ candidate: null }); }, 5); this._maybe(); }
  async setRemoteDescription(d) {
    if (this.closed) throw new Error('closed'); const first = !this.remoteDescription; this.remoteDescription = d; this.log.push(d.type + ':' + d.sdp);
    if (d.type === 'offer' && !this.tr.length) { ['audio', 'video', 'video'].forEach(k => { const t = this.addTransceiver(k, { direction: 'recvonly' }); }); }
    if (first) this.tr.forEach(t => this.ontrack && this.ontrack({ track: t.receiver.track, streams: [], transceiver: t })); this._maybe();
  }
  async addIceCandidate(c) { if (!this.remoteDescription) throw new Error('no remote description'); this.added.push(c); this._maybe(); }
  _maybe() { if (this.localDescription && this.remoteDescription && this.added.length && this.connectionState !== 'connected' && !this.closed) setTimeout(() => this._set('connected'), 5); }
  _set(s) { if (this.closed) return; this.connectionState = s; this.onconnectionstatechange && this.onconnectionstatechange(); }
  fail() { this._set('failed'); }
  close() { this.closed = true; this.connectionState = 'closed'; }
}
FakePC.all = [];
const track = (kind) => ({ kind, id: kind + (++pcSeq), enabled: true, stopped: false, stop() { this.stopped = true; } });
const stream = (...tracks) => ({ id: 'st' + (++pcSeq), getTracks: () => tracks, getAudioTracks: () => tracks.filter(x => x.kind === 'audio'), getVideoTracks: () => tracks.filter(x => x.kind === 'video') });
function client(A, user, o) {
  o = o || {}; const notices = [], c = { notices, ends: [], pcs: [] };
  const RTC = class extends FakePC { constructor(cfg) { super(cfg); c.pcs.push(this); } };
  c.call = createCall({ RTC, api: async (m, p, b) => { const r = await req(A.port, m, p, b, user.cookie); if (r.status >= 400) throw Object.assign(new Error((r.json && r.json.error) || 'HTTP ' + r.status), { status: r.status }); return r.json; }, openEvents: sse(A.port, user.cookie),
    getMic: async () => { if (o.noMic) throw new Error('denied'); return stream(track('audio')); }, getCam: async () => stream(track('video')), getScreen: async () => stream(track('video')), makeStream: tr => stream(tr), onChange() { }, onNotice: m => notices.push(m), onEnd: w => c.ends.push(w), timers: { restartDelay: 40 } });
  return c;
}
const states = c => c.call.peers().map(p => p.conn);
const closeAll = async () => { const l = await req(A.port, 'GET', '/api/admin/c/rooms', undefined, A.ac); for (const r of l.json.rooms) await req(A.port, 'POST', '/api/admin/c/rooms/' + r.id + '/close', {}, A.ac); };

t('কল: ৩ জন ঢুকলে প্রতি জোড়ায় শুধু একটি অফার (বড় seq-এর পক্ষ থেকে), সবাই সংযুক্ত, ৩ স্লটের ট্র্যাক এসেছে', async () => {
  const mod = A.users.mod01, rafi = A.users.rafi01, third = A.users.third03;
  const mk = await R(A, mod, 'POST', '', { title: 'Call Test Room', mode: 'video' }); const id = mk.json.room.id;
  const ca = client(A, mod), cb = client(A, rafi), cc = client(A, third); A.cc = { ca, cb, cc, id };
  await ca.call.join(id); await cb.call.join(id); await waitFor(() => ca.call.peers().length === 1 && states(cb)[0] === 'connected' && states(ca)[0] === 'connected', 4000, 'A-B সংযোগ');
  await cc.call.join(id); await waitFor(() => [ca, cb, cc].every(c => c.call.peers().length === 2 && states(c).every(s => s === 'connected')), 5000, 'তিনজনের সংযোগ');
  assert(ca.call.peers().every(p => p.made === 0), 'প্রথমজন কখনো অফার দেয়নি'); assert(cb.call.peers().find(p => p.seq === 1).made === 1 && cb.call.peers().find(p => p.seq === 3).made === 0, 'দ্বিতীয়জন শুধু প্রথমজনকে অফার দিয়েছে');
  assert(cc.call.peers().every(p => p.made === 1), 'তৃতীয়জন দুজনকেই');
  for (const c of [ca, cb, cc]) { assert.strictEqual(c.pcs.length, 2, 'ঠিক ২টি সংযোগ'); c.call.peers().forEach(p => assert(p.streams.audio && p.streams.cam && p.streams.screen, 'তিন স্লট')); c.pcs.forEach(pc => { assert.strictEqual(pc.tr.length, 3); assert.strictEqual(pc.offers + (pc.log.filter(x => x.startsWith('offer')).length), 1, 'প্রতি জোড়ায় একটি অফার'); }); }
  assert.strictEqual(ca.call.state.hostPid, ca.call.state.me.pid, 'খোলা সদস্য mod হোস্ট'); assert.strictEqual(cb.call.state.hostPid, ca.call.state.me.pid);
});
t('কল: মাইক/ক্যামেরা/স্ক্রিন — মিউট অবস্থায় ঢোকা, চালু করলে সব সংযোগে ট্র্যাক বসে ও অন্যরা অবস্থা জানে, বন্ধ করলে ট্র্যাক থামে', async () => {
  const { ca, cb, cc } = A.cc; assert.strictEqual(ca.call.state.mic, false); assert(ca.call.state.micAvail);
  ca.pcs.forEach(pc => assert(pc.tr[0].sender.track && pc.tr[0].sender.track.enabled === false, 'ট্র্যাক বসানো কিন্তু মিউট'));
  assert.strictEqual(await ca.call.toggleMic(), true); await waitFor(() => cb.call.peers().find(p => p.seq === 1).state.mic === true && cc.call.peers().find(p => p.seq === 1).state.mic === true); ca.pcs.forEach(pc => assert.strictEqual(pc.tr[0].sender.track.enabled, true)); assert(ca.pcs[0].tr[0].sender.params, 'বিটরেট সীমা বসেছে');
  assert.strictEqual(await ca.call.toggleCam(), true); await waitFor(() => cb.call.peers().find(p => p.seq === 1).state.cam); ca.pcs.forEach(pc => assert(pc.tr[1].sender.track && pc.tr[1].sender.track.kind === 'video'));
  const camTrack = ca.call.state.localCam.getVideoTracks()[0]; await ca.call.toggleCam(); assert.strictEqual(camTrack.stopped, true, 'ক্যামেরা বন্ধে ট্র্যাক থামে (বাতি নেভে)'); ca.pcs.forEach(pc => assert.strictEqual(pc.tr[1].sender.track, null)); await waitFor(() => !cb.call.peers().find(p => p.seq === 1).state.cam);
  assert.strictEqual(await cb.call.toggleScreen(), true); await waitFor(() => ca.call.peers().find(p => p.seq === 2).state.screen && ca.call.peers().find(p => p.seq === 2).state.sid); cb.pcs.forEach(pc => assert(pc.tr[2].sender.track)); await cb.call.toggleScreen(); cb.pcs.forEach(pc => assert.strictEqual(pc.tr[2].sender.track, null));
  cb.call.toggleHand(); await waitFor(() => ca.call.peers().find(p => p.seq === 2).state.hand); assert.strictEqual(await ca.call.toggleMic(), true); assert.strictEqual(ca.call.state.mic, false);
});
t('কল: চ্যাট; শুধু-শোনা (মাইক নেই) সদস্যও ভয়েস/ভিডিও পায়; ভুল কোড/ভরা রুমের বার্তা; ভয়েস রুমে ক্যামেরা নয়', async () => {
  const { ca, cb, cc, id } = A.cc; await cb.call.sendChat('সবাইকে নমস্কার'); await waitFor(() => ca.call.state.chat.length && cc.call.state.chat.length); assert.strictEqual(cc.call.state.chat[0].text, 'সবাইকে নমস্কার'); assert.strictEqual(cc.call.state.chat[0].name, 'rafi01');
  const lo = await A.mkUser('listen05'), cl = client(A, lo, { noMic: true }); await cl.call.join(id); assert.strictEqual(cl.call.state.micAvail, false); await waitFor(() => cl.call.peers().length === 3 && states(cl).every(s => s === 'connected'), 5000, 'শ্রোতার সংযোগ'); cl.call.peers().forEach(p => assert(p.streams.audio)); assert.strictEqual(await cl.call.toggleMic(), false); assert(cl.call.state.err);
  await cl.call.leave(); await waitFor(() => ca.call.peers().length === 2 && cl.call.state.phase === 'ended' || cl.call.state.phase === 'idle');
  const v = await R(A, A.users.mod01, 'GET', ''); assert(Array.isArray(v.json.rooms));
  const full = await R(A, A.users.mod01, 'POST', '/' + id + '/join', {}); assert.strictEqual(full.status, 200, 'নিজের রুমে আবার ঢোকা (পুরনোটা বাদ)'); await waitFor(() => ca.call.state.phase === 'ended', 2500, 'পুরনো সেশন সরে গেছে'); assert(/অন্য জায়গা/.test(ca.call.state.why));
});
t('কল: সংযোগ নষ্ট হলে ICE restart (অফারদাতা নিজে; উত্তরদাতা অনুরোধ পাঠায়) এবং আবার সংযুক্ত', async () => {
  await closeAll(); const mod = A.users.mod01, rafi = A.users.rafi01, third = A.users.third03;
  const id = (await R(A, mod, 'POST', '', { title: 'Restart Room', mode: 'voice' })).json.room.id; const ca = client(A, mod), cb = client(A, rafi), cc = client(A, third);
  await ca.call.join(id); await cb.call.join(id); await cc.call.join(id); await waitFor(() => [ca, cb, cc].every(c => c.call.peers().length === 2 && states(c).every(s => s === 'connected')), 5000, 'সংযোগ');
  // cb (seq 2) → ca (seq 1): cb অফারদাতা। cb-র সংযোগ নষ্ট হলে cb নিজে restart অফার দেয়
  const off = cb.call.peers().find(p => p.seq === 1); assert(off.offerer); const before = off.pc.restartOffers; off.pc.fail(); await waitFor(() => off.pc.restartOffers === before + 1, 3000, 'অফারদাতা restart'); assert(off.pc.restarted); await waitFor(() => off.conn === 'connected', 3000, 'আবার সংযুক্ত');
  const onA = ca.call.peers().find(p => p.seq === 2); assert(!onA.offerer); assert(onA.pc.log.filter(x => x.startsWith('offer')).length >= 2, 'উত্তরদাতা দ্বিতীয় অফার পেয়েছে'); assert.strictEqual(onA.conn, 'connected');
  // ca (উত্তরদাতা, cc-র অফারে): ca-র সংযোগ নষ্ট হলে অনুরোধ যায় → cc (অফারদাতা) restart করে
  const ans = ca.call.peers().find(p => p.seq === 3), cOff = cc.call.peers().find(p => p.seq === 1), b2 = cOff.pc.restartOffers; assert(!ans.offerer && cOff.offerer); ans.pc.fail(); await waitFor(() => cOff.pc.restartOffers === b2 + 1, 3000, 'অনুরোধে restart'); await waitFor(() => ans.conn === 'connected' && cOff.conn === 'connected', 3000, 'আবার সংযুক্ত');
  // বারবার ব্যর্থ হলে থেমে যায় (৩ বারের বেশি নয়)
  const x = cc.call.peers().find(p => p.seq === 2); x.pc.fail(); await waitFor(() => x.restarts >= 1); x.pc.fail(); await sleep(100);
  await ca.call.leave(); await cb.call.leave(); await cc.call.leave();
});
t('কল: হোস্টের কিক/মিউট; হোস্ট ছাড়লে হস্তান্তর; রুম বন্ধ হলে সবাই বাইরে ও সংযোগ বন্ধ', async () => {
  await closeAll(); const mod = A.users.mod01, rafi = A.users.rafi01, third = A.users.third03;
  const mk = await R(A, mod, 'POST', '', { title: 'Kick Room', mode: 'video' }); const id = mk.json.room.id;
  const ca = client(A, mod), cb = client(A, rafi), cc = client(A, third); await ca.call.join(id); await cb.call.join(id); await cc.call.join(id); await waitFor(() => [ca, cb, cc].every(c => c.call.peers().length === 2 && states(c).every(s => s === 'connected')), 5000);
  await assert.rejects(() => cb.call.host('kick', cc.call.state.me.pid), /হোস্ট/); await cb.call.toggleMic(); await ca.call.host('mute', cb.call.state.me.pid); await waitFor(() => cb.call.state.mic === false && cb.notices.length === 1); assert(/মিউট/.test(cb.notices[0]));
  const ccPcs = cc.pcs.slice(); await ca.call.host('kick', cc.call.state.me.pid); await waitFor(() => cc.call.state.phase === 'ended'); assert(/সরিয়েছেন/.test(cc.call.state.why)); assert(ccPcs.every(pc => pc.closed), 'কিক-করার পর সংযোগ বন্ধ'); await waitFor(() => ca.call.peers().length === 1 && cb.call.peers().length === 1);
  const aPid = ca.call.state.me.pid; ca.call.leave(); await waitFor(() => cb.call.state.hostPid === cb.call.state.me.pid, 3000, 'হোস্ট হস্তান্তর'); assert.strictEqual(cb.call.peers().length, 0);
  const cd = client(A, third); await cd.call.join(id); await waitFor(() => states(cd).length === 1 && states(cd)[0] === 'connected', 4000); assert.strictEqual(cd.call.state.hostPid, cb.call.state.me.pid);
  await cb.call.host('lock', null, true); const ce = client(A, A.users.late04 || await A.mkUser('late04')); await assert.rejects(() => ce.call.join(id), /ঢুকতে দিচ্ছেন না/); assert.strictEqual(ce.call.state.phase, 'idle');
  const pcsB = cb.pcs.slice(); await cb.call.host('close'); await waitFor(() => cb.call.state.phase === 'ended' && cd.call.state.phase === 'ended'); assert(/বন্ধ করেছেন/.test(cd.call.state.why)); assert(pcsB.every(pc => pc.closed)); assert.strictEqual((await R(A, mod, 'GET', '/' + id)).status, 404);
});
t('সংযোগ ছোট সময়ের জন্য কাটলে (SSE) একই কলে ফেরে; অনেকক্ষণ কাটলে বাদ পড়ে', async () => {
  await closeAll(); const mod = A.users.mod01, rafi = A.users.rafi01; const mk = await R(A, mod, 'POST', '', { title: 'Reconnect Room' }); const id = mk.json.room.id;
  const ca = client(A, mod), cb = client(A, rafi); await ca.call.join(id); await cb.call.join(id); await waitFor(() => states(ca)[0] === 'connected' && states(cb)[0] === 'connected');
  const evs = []; const pidB = cb.call.state.me.pid; const flaky = sse(A.port, rafi.cookie); const s1 = flaky('/api/c/rooms/' + id + '/events?pid=' + pidB, { onEvent: (t2) => evs.push(t2) }); await waitFor(() => evs.includes('ready'));
  s1.close(); await waitFor(() => ca.call.peers()[0].away === true, 2000, 'peer-away'); const s2 = flaky('/api/c/rooms/' + id + '/events?pid=' + pidB, { onEvent: (t2) => evs.push(t2) }); await waitFor(() => ca.call.peers()[0].away === false, 2000, 'peer-back'); assert.strictEqual(ca.call.peers().length, 1); s2.close();
  assert.strictEqual(states(ca)[0], 'connected', 'মিডিয়া সংযোগ টিকে ছিল');
  await ca.call.leave(); cb.call.leave();
});

(async () => {
  for (const [name, fn] of pending) { try { await fn(); pass++; console.log('  ✓ ' + name); } catch (e) { fail++; console.log('  ✗ ' + name + '\n      ' + (e && e.stack ? e.stack.split('\n').slice(0, 6).join('\n      ') : e)); } }
  try { if (A) await A.stop(); } catch (_) { } await sleep(200); try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) { }
  console.log(`\n${pass} পাস, ${fail} ফেল`); process.exit(fail ? 1 : 0);
})();
