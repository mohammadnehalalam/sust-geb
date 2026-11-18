'use strict';
/* লাইভ রুম: ভয়েস/ভিডিও কল (WebRTC) এর সিগন্যালিং সার্ভার।
   - মিডিয়া (ভয়েস/ভিডিও) সার্ভারের ওপর দিয়ে যায় না, ব্রাউজারগুলো সরাসরি (peer-to-peer) যোগাযোগ করে। সার্ভার শুধু "কে কাকে কী বলছে" (SDP/ICE) পৌঁছে দেয়।
   - Socket.io লাগে না: সার্ভার→ব্রাউজার Server-Sent Events (SSE), ব্রাউজার→সার্ভার সাধারণ POST। কোনো npm প্যাকেজ নেই।
   - mesh পদ্ধতি: প্রতিজন বাকি সবার সাথে আলাদা সংযোগ করে, তাই ছোট দলের জন্য (ভিডিওতে ডিফল্ট সর্বোচ্চ ৬, শুধু ভয়েসে ১২)।
     পুরো ক্লাস (৩০+) বা শিক্ষক→সবাই সম্প্রচারের জন্য SFU (LiveKit, mediasoup ইত্যাদি) লাগে, এটি তা নয়।
   - STUN ডিফল্টে Google-এর পাবলিক সার্ভার। মোবাইল ডেটা/CGNAT-এ অনেক কল TURN ছাড়া জোড়া লাগে না: ICE_SERVERS (JSON) বা TURN_URLS + TURN_SECRET (coturn static-auth-secret) দিন।
   - রুম মেমরিতে থাকে (সার্ভার রিস্টার্টে মুছে যায়); কিছু ডিস্কে লেখা হয় না, রেকর্ডিং নেই। শুধু অ্যাডমিনের সেটিং data/rooms.json-এ। */
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const MODES = { voice: 'শুধু ভয়েস', video: 'ভয়েস ও ভিডিও' };
const ID_RE = /^[0-9a-f]{10}$/, PID_RE = /^[0-9a-f]{16}$/;
const AWAY_MS = 12000, EMPTY_MS = 2 * 60000, MAX_AGE = 12 * 3600000, QUEUE_MAX = 200, HEARTBEAT = 15000;

module.exports = function (env) {
  const { send, readBody, bad, str } = env, now = () => Date.now(), log = env.log || console.log;
  const CFG_FILE = path.join(env.DATA, 'rooms.json');
  let cfg = { open: true, studentsCanCreate: true, maxVideo: 6, maxVoice: 12, maxRooms: 30 };
  try { Object.assign(cfg, JSON.parse(fs.readFileSync(CFG_FILE, 'utf8'))); } catch (_) { }
  const clampCfg = () => { cfg.open = cfg.open !== false; cfg.studentsCanCreate = cfg.studentsCanCreate !== false; cfg.maxVideo = Math.max(2, Math.min(8, Math.floor(+cfg.maxVideo) || 6)); cfg.maxVoice = Math.max(2, Math.min(16, Math.floor(+cfg.maxVoice) || 12)); cfg.maxRooms = Math.max(1, Math.min(100, Math.floor(+cfg.maxRooms) || 30)); };
  clampCfg();
  const saveCfg = () => { const tmp = CFG_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(cfg)); fs.renameSync(tmp, CFG_FILE); };

  const rooms = new Map(), byUser = new Map();   // roomId -> room;  uid -> {roomId, pid}
  const rid = () => crypto.randomBytes(5).toString('hex'), pidNew = () => crypto.randomBytes(8).toString('hex');
  const isStaff = u => !!u && u.role && u.role !== 'student';
  const cap = r => r.mode === 'video' ? cfg.maxVideo : cfg.maxVoice;
  const tsEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

  /* ---- ICE (STUN/TURN) ---- */
  function iceServers(uid) {
    let list = null; try { list = process.env.ICE_SERVERS ? JSON.parse(process.env.ICE_SERVERS) : null; } catch (_) { list = null; }
    const okUrl = u => typeof u === 'string' && /^(stun|stuns|turn|turns):/i.test(u);
    if (Array.isArray(list)) list = list.filter(s => s && (Array.isArray(s.urls) ? s.urls.every(okUrl) : okUrl(s.urls))); else list = null;
    if (!list || !list.length) list = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
    if (process.env.TURN_URLS && process.env.TURN_SECRET) {          // coturn "use-auth-secret": সময়সীমাসহ অস্থায়ী ইউজার/পাসওয়ার্ড
      const urls = process.env.TURN_URLS.split(',').map(s => s.trim()).filter(okUrl), username = (Math.floor(now() / 1000) + 6 * 3600) + ':' + uid;
      if (urls.length) list = list.concat([{ urls, username, credential: crypto.createHmac('sha1', process.env.TURN_SECRET).update(username).digest('base64') }]);
    }
    return list;
  }

  /* ---- আউটপুট ---- */
  const partOut = p => ({ pid: p.pid, name: p.name, role: p.role, seq: p.seq, state: p.state, away: !p.conn });
  const summary = (r, viewer) => ({ id: r.id, title: r.title, course: r.course, mode: r.mode, count: r.parts.size, max: Math.min(cap(r), r.max), locked: !!r.code, closedToNew: r.lock, listed: r.listed, host: { name: r.hostName, role: r.hostRole }, created: r.created, mine: !!viewer && r.hostUid === viewer.id, members: r.parts.size ? Array.from(r.parts.values()).slice(0, 8).map(p => p.name) : [] });

  /* ---- ইভেন্ট পাঠানো ---- */
  function emit(p, type, data) {
    const frame = 'event: ' + type + '\ndata: ' + JSON.stringify(data) + '\n\n';
    if (p.conn) { try { p.conn.write(frame); } catch (_) { } }
    else { p.queue.push(frame); if (p.queue.length > QUEUE_MAX) p.queue.shift(); }
  }
  const broadcast = (r, type, data, exceptPid) => r.parts.forEach(p => { if (p.pid !== exceptPid) emit(p, type, data); });

  function dropPart(r, p, why) {
    if (!r.parts.has(p.pid)) return;
    clearTimeout(p.away); if (p.hb) clearInterval(p.hb); r.parts.delete(p.pid);
    if (byUser.get(p.uid) && byUser.get(p.uid).pid === p.pid) byUser.delete(p.uid);
    if (p.conn) { try { if (why) p.conn.write('event: ' + why.type + '\ndata: ' + JSON.stringify(why.data || {}) + '\n\n'); p.conn.end(); } catch (_) { } p.conn = null; }
    broadcast(r, 'peer-left', { pid: p.pid, name: p.name });
    if (r.hostPid === p.pid) pickHost(r);
    r.lastActive = now();
  }
  function pickHost(r) {
    const arr = Array.from(r.parts.values()); if (!arr.length) { r.hostPid = ''; return; }
    arr.sort((a, b) => (isStaff(b) - isStaff(a)) || a.seq - b.seq); const h = arr[0];
    r.hostPid = h.pid; r.hostUid = h.uid; r.hostName = h.name; r.hostRole = h.role; broadcast(r, 'host', { pid: h.pid, name: h.name });
  }
  function closeRoom(r, why) { broadcast(r, 'closed', { why: why || 'host' }); r.parts.forEach(p => { clearTimeout(p.away); if (p.hb) clearInterval(p.hb); if (p.conn) { try { p.conn.end(); } catch (_) { } } if (byUser.get(p.uid) && byUser.get(p.uid).pid === p.pid) byUser.delete(p.uid); }); r.parts.clear(); rooms.delete(r.id); }

  /* ---- যাচাই ---- */
  function getRoom(id) { if (!ID_RE.test(id || '')) throw bad('রুম পাওয়া যায়নি', 404); const r = rooms.get(id); if (!r) throw bad('রুম পাওয়া যায়নি বা শেষ হয়ে গেছে', 404); return r; }
  function getPart(r, pid, u) { const p = PID_RE.test(pid || '') && r.parts.get(pid); if (!p || p.uid !== u.id) throw bad('আপনি এই রুমে নেই', 403); return p; }
  const sanState = s => { s = s || {}; return { mic: !!s.mic, cam: !!s.cam, screen: !!s.screen, hand: !!s.hand, sid: typeof s.sid === 'string' ? s.sid.slice(0, 80) : '' }; };
  function sanSignal(d) {
    if (!d || typeof d !== 'object') throw bad('সিগন্যাল ঠিক নয়');
    if (d.kind === 'desc') { const x = d.desc; if (!x || (x.type !== 'offer' && x.type !== 'answer') || typeof x.sdp !== 'string' || x.sdp.length > 30000) throw bad('SDP ঠিক নয়'); return { kind: 'desc', desc: { type: x.type, sdp: x.sdp } }; }
    if (d.kind === 'ice') {
      if (d.cand === null) return { kind: 'ice', cand: null }; const c = d.cand; if (!c || typeof c.candidate !== 'string' || c.candidate.length > 700) throw bad('ICE ঠিক নয়');
      return { kind: 'ice', cand: { candidate: c.candidate, sdpMid: typeof c.sdpMid === 'string' ? c.sdpMid.slice(0, 40) : null, sdpMLineIndex: Number.isInteger(c.sdpMLineIndex) ? c.sdpMLineIndex : null, usernameFragment: typeof c.usernameFragment === 'string' ? c.usernameFragment.slice(0, 80) : undefined } };
    }
    if (d.kind === 'restart') return { kind: 'restart' };
    throw bad('সিগন্যালের ধরন ঠিক নয়');
  }

  /* ---- SSE সংযোগ ---- */
  function attach(r, p, req, res) {
    if (p.conn) { try { p.conn.end(); } catch (_) { } }
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.write('retry: 2000\n\n'); p.conn = res; clearTimeout(p.away); p.away = null;
    emit(p, 'ready', { pid: p.pid }); const q = p.queue; p.queue = []; q.forEach(f => { try { res.write(f); } catch (_) { } });
    if (p.hb) clearInterval(p.hb); p.hb = setInterval(() => { try { res.write(': ping\n\n'); } catch (_) { } }, HEARTBEAT); p.hb.unref();
    broadcast(r, 'peer-back', { pid: p.pid }, p.pid);
    res.on('close', () => {   // ক্লায়েন্ট সংযোগ ছাড়লে (req নয়, res-এর close-ই নির্ভরযোগ্য)
      if (p.conn !== res) return; p.conn = null; if (p.hb) { clearInterval(p.hb); p.hb = null; }
      if (!r.parts.has(p.pid)) return;
      broadcast(r, 'peer-away', { pid: p.pid }, p.pid);
      p.away = setTimeout(() => { if (!p.conn) dropPart(r, p); }, AWAY_MS); p.away.unref();   // কিছুক্ষণ সময় দিই: নেট ঝিলিক দিলে একই কলে ফেরা যায় (মিডিয়া সংযোগ আলাদা, টিকে থাকে)
    });
  }

  async function handle(req, res, url, u) {
    const m = req.method, p = url.pathname, NS = { 'Cache-Control': 'no-store' };
    if (!u) return send(res, 401, { error: 'লগইন দরকার' });
    if (!cfg.open && !(m === 'POST' && /\/leave$/.test(p))) throw bad('লাইভ রুম এখন বন্ধ আছে', 403);
    if (p === '/api/c/rooms' && m === 'GET') {
      const list = Array.from(rooms.values()).filter(r => r.listed || r.parts.size && Array.from(r.parts.values()).some(x => x.uid === u.id) || r.hostUid === u.id).sort((a, b) => b.created - a.created).map(r => summary(r, u));
      const cur = byUser.get(u.id);
      return send(res, 200, { rooms: list, canCreate: cfg.studentsCanCreate || isStaff(u), modes: MODES, max: { voice: cfg.maxVoice, video: cfg.maxVideo }, current: cur ? cur.roomId : '', turn: !!(process.env.TURN_URLS && process.env.TURN_SECRET) }, NS);
    }
    if (p === '/api/c/rooms' && m === 'POST') {
      if (!cfg.studentsCanCreate && !isStaff(u)) throw bad('রুম খুলতে পারেন শিক্ষক, CR বা মডারেটর', 403);
      if (env.limited('rc:' + u.id, 10, 86400000)) throw bad('আজ অনেকগুলো রুম খোলা হয়েছে, কাল আবার চেষ্টা করুন', 429);
      if (rooms.size >= cfg.maxRooms) throw bad('এখন অনেকগুলো রুম চালু আছে, একটু পরে চেষ্টা করুন', 503);
      const mine = Array.from(rooms.values()).find(r => r.createdBy === u.id); if (mine) throw bad('আপনার একটি রুম আগেই চালু আছে। আগে সেটা বন্ধ করুন', 409);
      const b = await readBody(req, 2000), title = str(b.title, 80).replace(/\s+/g, ' ').trim(); if (title.length < 3) throw bad('রুমের একটি নাম দিন (অন্তত ৩ অক্ষর)');
      const mode = MODES[b.mode] ? b.mode : 'voice', code = str(b.code, 20).trim().replace(/[^\p{L}\p{N}]/gu, ''), course = str(b.course, 20).trim();
      const max = Math.max(2, Math.min(mode === 'video' ? cfg.maxVideo : cfg.maxVoice, Math.floor(+b.max) || (mode === 'video' ? cfg.maxVideo : cfg.maxVoice)));
      const r = { id: rid(), title, course, mode, code, listed: code ? b.listed === true : b.listed !== false, lock: false, created: now(), lastActive: now(), createdBy: u.id, hostUid: u.id, hostPid: '', hostName: u.name, hostRole: u.role, parts: new Map(), seq: 0, chat: [] };
      r.max = max; rooms.set(r.id, r); return send(res, 201, { ok: true, room: summary(r, u) }, NS);
    }
    let mt = p.match(/^\/api\/c\/rooms\/([0-9a-f]{10})(?:\/([a-z]+))?$/);
    if (!mt) throw bad('অজানা API', 404);
    const r = getRoom(mt[1]), act = mt[2] || '';
    if (!act && m === 'GET') return send(res, 200, { room: summary(r, u) }, NS);
    if (!act && m === 'DELETE') { if (r.createdBy !== u.id && u.role !== 'mod') throw bad('শুধু রুম খোলা সদস্য বা মডারেটর বন্ধ করতে পারেন', 403); closeRoom(r, 'host'); return send(res, 200, { ok: true }); }

    if (act === 'join' && m === 'POST') {
      if (env.limited('rj:' + u.id, 30, 60000)) throw bad('একটু পরে চেষ্টা করুন', 429);
      const b = await readBody(req, 500);
      if (r.code && !isStaff(u) && r.createdBy !== u.id && !tsEq(String(b.code || '').trim(), r.code)) throw bad('রুমের কোড ঠিক নয়', 403);
      const prev = byUser.get(u.id); if (prev) { const pr = rooms.get(prev.roomId), pp = pr && pr.parts.get(prev.pid); if (pp) dropPart(pr, pp, { type: 'kicked', data: { why: 'replaced' } }); if (pr && pr !== r && !pr.parts.size) pr.lastActive = now(); }
      if (r.lock && r.createdBy !== u.id && !isStaff(u)) throw bad('হোস্ট এখন নতুন কাউকে ঢুকতে দিচ্ছেন না', 423);
      if (r.parts.size >= cap(r) || r.parts.size >= r.max) throw bad('রুম ভরে গেছে (সর্বোচ্চ ' + Math.min(cap(r), r.max) + ' জন)', 409);
      const bt = env.userBrief(u.id) || {}, me = { pid: pidNew(), uid: u.id, name: bt.name || u.name || '?', role: u.role, seq: ++r.seq, state: sanState({}), conn: null, queue: [], away: null, hb: null };
      me.away = setTimeout(() => { if (!me.conn) dropPart(r, me); }, 20000); me.away.unref();   // জয়েনের পর ২০ সেকেন্ডে সংযোগ না এলে বাদ
      const others = Array.from(r.parts.values()).map(partOut); r.parts.set(me.pid, me); byUser.set(u.id, { roomId: r.id, pid: me.pid });
      if (!r.hostPid || r.createdBy === u.id) { const was = r.hostPid; r.hostPid = me.pid; r.hostUid = u.id; r.hostName = me.name; r.hostRole = me.role; if (was && was !== me.pid) broadcast(r, 'host', { pid: me.pid, name: me.name }, me.pid); }   // রুম যিনি খুলেছেন তিনি ঢুকলে হোস্ট তিনিই
      r.lastActive = now(); broadcast(r, 'peer-joined', partOut(me), me.pid);
      return send(res, 200, { ok: true, pid: me.pid, seq: me.seq, host: r.hostPid, peers: others, ice: iceServers(u.id), room: summary(r, u), chat: r.chat.slice(-30), lockedNew: r.lock }, NS);
    }
    if (act === 'events' && m === 'GET') {
      const pt = getPart(r, url.searchParams.get('pid'), u); attach(r, pt, req, res); return;
    }
    const b = m === 'POST' ? await readBody(req, 40000) : {};
    const me = getPart(r, b.pid, u); r.lastActive = now();
    if (act === 'signal' && m === 'POST') {
      if (env.limited('rs:' + u.id, 1500, 60000)) throw bad('অনেক দ্রুত সিগন্যাল, একটু থামুন', 429);
      const to = PID_RE.test(b.to || '') && r.parts.get(b.to); if (!to || to.pid === me.pid) throw bad('গ্রহীতা রুমে নেই', 404);
      emit(to, 'signal', { from: me.pid, data: sanSignal(b.data) }); return send(res, 200, { ok: true });
    }
    if (act === 'state' && m === 'POST') {
      if (env.limited('rt:' + u.id, 120, 60000)) throw bad('একটু পরে চেষ্টা করুন', 429);
      me.state = sanState(b.state); broadcast(r, 'state', { pid: me.pid, state: me.state }, me.pid); return send(res, 200, { ok: true });
    }
    if (act === 'chat' && m === 'POST') {
      if (env.limited('rm:' + u.id, 25, 60000)) throw bad('অনেক দ্রুত মেসেজ, একটু থামুন', 429);
      const text = str(b.text, 450).replace(/\r/g, '').trim(); if (!text) throw bad('মেসেজ ফাঁকা');
      const msg = { from: me.pid, name: me.name, text, ts: now() }; r.chat.push(msg); if (r.chat.length > 60) r.chat.shift(); broadcast(r, 'chat', msg); return send(res, 200, { ok: true });
    }
    if (act === 'leave' && m === 'POST') { dropPart(r, me); return send(res, 200, { ok: true }); }
    if (act === 'host' && m === 'POST') {
      const power = me.pid === r.hostPid || me.role === 'mod'; if (!power) throw bad('শুধু হোস্ট বা মডারেটর পারেন', 403);
      const tg = PID_RE.test(b.target || '') && r.parts.get(b.target);
      if (b.action === 'close') { closeRoom(r, 'host'); return send(res, 200, { ok: true }); }
      if (b.action === 'lock') { r.lock = !!b.on; broadcast(r, 'room', { lock: r.lock }); return send(res, 200, { ok: true }); }
      if (!tg) throw bad('সদস্য পাওয়া যায়নি', 404);
      if (b.action === 'kick') { if (tg.pid === me.pid) throw bad('নিজেকে বাদ দেওয়া যায় না'); dropPart(r, tg, { type: 'kicked', data: { why: 'host' } }); return send(res, 200, { ok: true }); }
      if (b.action === 'mute') { emit(tg, 'host-action', { action: 'mute', by: me.name }); return send(res, 200, { ok: true }); }
      if (b.action === 'makehost') { if (me.pid !== r.hostPid && me.role !== 'mod') throw bad('অনুমতি নেই', 403); r.hostPid = tg.pid; r.hostUid = tg.uid; r.hostName = tg.name; r.hostRole = tg.role; broadcast(r, 'host', { pid: tg.pid, name: tg.name }); return send(res, 200, { ok: true }); }
      throw bad('অ্যাকশন ঠিক নয়');
    }
    throw bad('অজানা API', 404);
  }

  /* ---- অ্যাডমিন ---- */
  async function admin(req, res, url) {
    const m = req.method, p = url.pathname, NS = { 'Cache-Control': 'no-store' };
    if (p === '/api/admin/c/rooms' && m === 'GET') return send(res, 200, { cfg, rooms: Array.from(rooms.values()).map(r => Object.assign(summary(r, null), { participants: Array.from(r.parts.values()).map(x => ({ name: x.name, role: x.role, away: !x.conn })), age: now() - r.created })), turn: !!(process.env.TURN_URLS && process.env.TURN_SECRET), ice: iceServers(0).map(s => ({ urls: s.urls, turn: !!s.username })) }, NS);
    if (p === '/api/admin/c/rooms/config' && m === 'PUT') { const b = await readBody(req, 500); ['open', 'studentsCanCreate'].forEach(k => { if (typeof b[k] === 'boolean') cfg[k] = b[k]; }); ['maxVideo', 'maxVoice', 'maxRooms'].forEach(k => { if (b[k] !== undefined) cfg[k] = b[k]; }); clampCfg(); saveCfg(); if (!cfg.open) Array.from(rooms.values()).forEach(r => closeRoom(r, 'admin')); return send(res, 200, { ok: true, cfg }); }
    const mt = p.match(/^\/api\/admin\/c\/rooms\/([0-9a-f]{10})\/close$/);
    if (mt && m === 'POST') { const r = rooms.get(mt[1]); if (!r) throw bad('রুম পাওয়া যায়নি', 404); closeRoom(r, 'admin'); return send(res, 200, { ok: true }); }
    throw bad('অজানা API', 404);
  }

  /* ---- পরিষ্কার-পরিচ্ছন্নতা ---- */
  const sweep = setInterval(() => { const t = now(); rooms.forEach(r => { if (t - r.created > MAX_AGE) closeRoom(r, 'timeout'); else if (!r.parts.size && t - r.lastActive > EMPTY_MS) rooms.delete(r.id); }); }, 30000); sweep.unref();
  const dropUser = uid => { const c = byUser.get(uid); if (!c) return; const r = rooms.get(c.roomId), p = r && r.parts.get(c.pid); if (p) dropPart(r, p, { type: 'kicked', data: { why: 'removed' } }); Array.from(rooms.values()).filter(x => x.createdBy === uid && !x.parts.size).forEach(x => rooms.delete(x.id)); };
  return { handle, admin, dropUser, iceServers, _rooms: rooms, _cfg: () => cfg, stop() { clearInterval(sweep); rooms.forEach(r => closeRoom(r, 'stop')); } };
};
Object.assign(module.exports, { MODES });
