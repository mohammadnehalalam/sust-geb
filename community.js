'use strict';
/* কমিউনিটি মডিউল: স্টুডেন্ট অ্যাকাউন্ট, প্রোফাইল, পোস্ট/লাইক/কমেন্ট, প্রশ্নোত্তর, রিপোর্ট, নোটিফিকেশন।
   ডেটা: data/community.json (ডিপার্টমেন্ট-স্কেলের জন্য যথেষ্ট; বড় হলে ডেটাবেসে সরানো যাবে)। কোনো npm প্যাকেজ লাগে না। */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const usersync = require('./usersync'), jobsMod = require('./jobs'), roomsMod = require('./rooms');

module.exports = function (env) {
  const { send, readBody, bad, str, parseCookies, isAdmin, clientIp } = env;
  const FILE = path.join(env.DATA, 'community.json');
  const sync = usersync(env);   // অ্যাকাউন্ট সিঙ্ক (ঐচ্ছিক): data/sync/
  let C = { users: [], posts: [], comments: [], reports: [], notifs: [], sessions: {}, meta: { nextId: 1 } };
  try { C = { ...C, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }; } catch (_) {}
C.game = { days: {}, tot: {}, prof: {}, ...(C.game || {}) };   // গেম: দৈনিক ব্যাচ-ওয়ার স্কোর (days), মোট (tot), লেভেল/ব্যাজ (prof)
  let timer = null;
  const save = () => { clearTimeout(timer); timer = setTimeout(flush, 250); };
  function flush() { const tmp = FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(C)); fs.renameSync(tmp, FILE); }
  const nid = () => C.meta.nextId++;
  const cs = () => env.settings().community;
  const now = () => Date.now();
  /* ---------- নতুন: হারানো-প্রাপ্তি ও ব্যাচ জীবনবৃত্তান্ত ----------
     C.lf = হারানো/পাওয়া পোস্ট (ছবি ফাইল হিসেবে data/cimg/-এ থাকে, JSON ফুলে ওঠে না)
     C.stories = প্রতি সদস্যের একটি প্রোফাইল কার্ড + সাস্টে আসার জার্নি + প্রথম অনুভূতি (লুকানো যায়) */
  C.lf = C.lf || []; C.stories = C.stories || [];
  /* ---------- v3.7: নোট শেয়ারিং, পোল ও সার্ভে, ভাইভা জমা, জন্মদিনের উইশ ----------
     C.notes (ফাইল data/notes/), C.polls, C.vsubs (অডিও data/viva/), C.wishes */
  C.notes = C.notes || []; C.polls = C.polls || []; C.vsubs = C.vsubs || []; C.wishes = C.wishes || [];
  const NOTES = path.join(env.DATA, 'notes'), VIVA = path.join(env.DATA, 'viva');
  [NOTES, VIVA].forEach(d => { try { fs.mkdirSync(d, { recursive: true }); } catch (_) {} });
  const rmFile = (dir, n) => { if (/^[a-f0-9]{24}\.[a-z0-9]{2,5}$/.test(n || '')) fs.unlink(path.join(dir, n), () => {}); };
  const bnum = n => String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
  const WISH = ['🎂 শুভ জন্মদিন!', '🎉 জন্মদিনের অনেক অনেক শুভেচ্ছা!', '💚 দিনটি দারুণ কাটুক, সুস্থ ও সুন্দর থাকো।', '🥳 নতুন বছর হোক সাফল্যের!', '🌟 স্বপ্নগুলো সত্যি হোক, শুভ জন্মদিন!'];
  const NOTE_EXT = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.docx', '.pptx', '.xlsx', '.txt']);
  const NOTE_MIME = { '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.txt': 'text/plain; charset=utf-8' };
  function noteOk(buf, ext) {
    const h = buf.subarray(0, 8);
    if (ext === '.pdf') return buf.subarray(0, 5).toString('latin1') === '%PDF-';
    if (ext === '.png') return h.toString('hex') === '89504e470d0a1a0a';
    if (ext === '.jpg' || ext === '.jpeg') return h[0] === 0xFF && h[1] === 0xD8;
    if (['.docx', '.pptx', '.xlsx'].includes(ext)) return h[0] === 0x50 && h[1] === 0x4B;
    if (ext === '.txt') return !buf.subarray(0, 4000).includes(0);
    return false;
  }
  function sniffAudio(b) {
    if (b.length < 12) return null;
    const h4 = b.subarray(0, 4).toString('latin1');
    if (b[0] === 0x1A && b[1] === 0x45 && b[2] === 0xDF && b[3] === 0xA3) return { mime: 'audio/webm', ext: 'webm' };
    if (h4 === 'OggS') return { mime: 'audio/ogg', ext: 'ogg' };
    if (b.subarray(4, 8).toString('latin1') === 'ftyp') return { mime: 'audio/mp4', ext: 'm4a' };
    if (h4 === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WAVE') return { mime: 'audio/wav', ext: 'wav' };
    if (b.subarray(0, 3).toString('latin1') === 'ID3' || (b[0] === 0xFF && (b[1] & 0xE0) === 0xE0)) return { mime: 'audio/mpeg', ext: 'mp3' };
    return null;
  }
  function sendBuf(req, res, buf, mime, extra) {   // Range সহ (অডিও এগোনো-পেছানোর জন্য)
    const h = { 'Content-Type': mime, 'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, max-age=3600', ...(extra || {}) };
    const r = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (r && (r[1] || r[2])) {
      const a = r[1] === '' ? Math.max(0, buf.length - (+r[2])) : +r[1], b = (r[1] === '' || r[2] === '') ? buf.length - 1 : Math.min(+r[2], buf.length - 1);
      if (a > b || a >= buf.length) { res.writeHead(416, { 'Content-Range': 'bytes */' + buf.length }); return res.end(); }
      res.writeHead(206, { ...h, 'Content-Range': `bytes ${a}-${b}/${buf.length}`, 'Content-Length': b - a + 1 }); return res.end(buf.subarray(a, b + 1));
    }
    res.writeHead(200, { ...h, 'Content-Length': buf.length }); res.end(buf);
  }
  const dobOk = d => !!d && Number.isInteger(d.m) && Number.isInteger(d.d) && d.m >= 1 && d.m <= 12 && d.d >= 1 && d.d <= [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][d.m - 1];
  function isBirthdayToday(x) {   // জন্মদিন দেখানো হয় শুধু যদি সদস্য নিজে অনুমতি দেন (ডিরেক্টরিতে নাম দেখানোর অনুমতিসহ)
    if (!dobOk(x.dob) || !priv(x).bday || !priv(x).directory) return false;
    const t = dhakaDay(now()), y = +t.slice(0, 4), m = +t.slice(5, 7), d = +t.slice(8, 10), leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    if (x.dob.m === 2 && x.dob.d === 29 && !leap) return m === 2 && d === 28;
    return x.dob.m === m && x.dob.d === d;
  }
  const pOpen = p => !p.closed && (!p.closes || p.closes > now());
  const IMG = path.join(env.DATA, 'cimg'); try { fs.mkdirSync(IMG, { recursive: true }); } catch (_) {}
  function saveImg(d) {
    const mm = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(typeof d === 'string' ? d : '');
    if (!mm || mm[1].length > 330000) throw bad('ছবি ঠিক নেই বা বেশি বড় (প্রায় ২৫০ KB-এর মধ্যে হতে হবে)');
    const buf = Buffer.from(mm[1], 'base64');
    if (buf.length < 100 || buf[0] !== 0xFF || buf[1] !== 0xD8 || buf[2] !== 0xFF) throw bad('শুধু JPEG ছবি নেওয়া হয়');
    const name = crypto.randomBytes(12).toString('hex') + '.jpg';
    fs.writeFileSync(path.join(IMG, name), buf); return name;
  }
  const rmImgs = list => (list || []).forEach(n => { if (/^[a-f0-9]{24}\.jpg$/.test(n)) fs.unlink(path.join(IMG, n), () => {}); });
const dhakaDay = ts => new Date(ts + 6 * 3600000).toISOString().slice(0, 10);   // বাংলাদেশের তারিখ (UTC+6)
/* সূত্র game-core.js-এর warPoints-এর সাথে এক: সঠিক ×১০, সবগুলো ঠিক হলে +২০, ১৫ সেকেন্ডের বেশি ও ২ মিনিটের কম সময়ে ≥৭ ঠিক হলে +১০ */
const warPts = (c, t, ms) => c * 10 + (c === t ? 20 : 0) + (c >= 7 && ms >= 15000 && ms < 120000 ? 10 : 0);
  const SESSION_MS = 30 * 86400000;
  Object.keys(C.sessions).forEach(k => { if (C.sessions[k].exp < now()) delete C.sessions[k]; });

  /* ---------- রেট লিমিট ---------- */
  const hits = new Map();
  function limited(key, max, ms) { const t = now(), l = (hits.get(key) || []).filter(x => t - x < ms); if (l.length >= max) { hits.set(key, l); return true; } l.push(t); hits.set(key, l); return false; }
  setInterval(() => { const t = now(); hits.forEach((l, k) => { const f = l.filter(x => t - x < 3600000); f.length ? hits.set(k, f) : hits.delete(k); }); }, 600000).unref();

  /* ---------- পাসওয়ার্ড ও সেশন ---------- */
  const scrypt = (pw, salt) => new Promise((ok, no) => crypto.scrypt(pw, salt, 32, (e, k) => e ? no(e) : ok(k)));
  async function hashPw(pw) { const salt = crypto.randomBytes(16); return { s: salt.toString('hex'), h: (await scrypt(pw, salt)).toString('hex') }; }
  async function checkPw(pw, rec) { const salt = Buffer.from(rec ? rec.s : '00'.repeat(16), 'hex'), k = await scrypt(pw, salt); return !!rec && crypto.timingSafeEqual(k, Buffer.from(rec.h, 'hex')); }
  const sha = t => crypto.createHash('sha256').update(t).digest('hex');
  function startSession(res, uid) {
    const tok = crypto.randomBytes(32).toString('hex'); C.sessions[sha(tok)] = { uid, exp: now() + SESSION_MS }; save();
    return `geb_u=${tok}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MS / 1000}`;
  }
  function me(req) {
    const t = parseCookies(req).geb_u; if (!t) return null;
    const s = C.sessions[sha(t)]; if (!s || s.exp < now()) return null;
    const u = C.users.find(x => x.id === s.uid); return u && u.status === 'active' ? u : null;
  }
  const dropSessions = uid => { Object.keys(C.sessions).forEach(k => { if (C.sessions[k].uid === uid) delete C.sessions[k]; }); };

  /* ---------- আউটপুট হেল্পার ---------- */
  const priv = u => ({ bday: !(u.privacy && u.privacy.bday === false), directory: !(u.privacy && u.privacy.directory === false), email: !!(u.privacy && u.privacy.email), phone: !!(u.privacy && u.privacy.phone) });
  const brief = u => u ? { id: u.id, name: u.name, batch: u.batch, role: u.role, avatar: u.avatar || '' } : { id: 0, name: 'মুছে ফেলা সদস্য', batch: '', role: 'student', avatar: '' };
  const gameOut = id => { const g = C.game.prof[id]; return g ? { lvl: g.lvl, badges: g.badges } : null; };
const profile = (u, self) => ({ ...brief(u), bio: u.bio || '', joined: u.created, game: gameOut(u.id), ...(self || priv(u).email ? { email: u.email || '' } : {}), ...(self || priv(u).phone ? { phone: u.phone || '' } : {}) });
  const selfOut = u => ({ ...profile(u, true), dob: u.dob || null, sid: u.sid, privacy: priv(u), status: u.status });
  const isMod = u => u && u.role === 'mod';
  const courseOk = id => !!env.subjects()[id];
  const visible = (p, u) => !p.hidden && (p.scope === 'batch' ? (p.batch === u.batch || isMod(u)) : true);
  function notify(uid, text, pid, go) { if (!uid) return; C.notifs.push({ id: nid(), uid, text: str(text, 200), pid: pid || 0, go: go || '', created: now(), read: false }); const mine = C.notifs.filter(n => n.uid === uid); if (mine.length > 60) { const drop = new Set(mine.slice(0, mine.length - 60).map(n => n.id)); C.notifs = C.notifs.filter(n => !drop.has(n.id)); } }
  const counts = () => { const m = {}; C.comments.forEach(c => { if (!c.hidden) m[c.pid] = (m[c.pid] || 0) + 1; }); return m; };
  function postOut(p, u, cnt) {
    const a = C.users.find(x => x.id === p.uid);
    return { id: p.id, author: brief(a), text: p.text, type: p.type, scope: p.scope, batch: p.batch || '', created: p.created, likes: p.likes.length, liked: p.likes.includes(u.id), comments: cnt[p.id] || 0, solved: !!p.accepted, pinned: !!p.pinned, mine: p.uid === u.id, canDelete: p.uid === u.id || isMod(u), canPin: isMod(u) };
  }
  function commentOut(c, u, post) {
    return { id: c.id, pid: c.pid, author: brief(C.users.find(x => x.id === c.uid)), text: c.text, created: c.created, likes: c.likes.length, liked: c.likes.includes(u.id), accepted: post.accepted === c.id, canDelete: c.uid === u.id || isMod(u), canAccept: post.type === 'question' && (post.uid === u.id || isMod(u)) };
  }
  const lfOut = (x, u) => ({ id: x.id, kind: x.kind, title: x.title, text: x.text, place: x.place, when: x.when, contact: x.contact, photos: x.photos.map(n => '/api/c/img/' + n), status: x.status, created: x.created, author: brief(C.users.find(y => y.id === x.uid)), mine: x.uid === u.id, canManage: x.uid === u.id || isMod(u) });
  const storyOut = (s, u) => { const mine = s.uid === u.id, hide = !!s.hideFeeling && !mine; return { id: s.id, author: brief(C.users.find(y => y.id === s.uid)), hobby: s.hobby || '', dream: s.dream || '', course: s.course || '', journey: s.journey || '', feeling: hide ? '' : (s.feeling || ''), hasFeeling: !!s.feeling, feelingHidden: !!s.hideFeeling, likes: s.likes.length, liked: s.likes.includes(u.id), mine, canDelete: mine || isMod(u), updated: s.updated }; };
  const cleanText = (v, max) => str(v, max + 50).replace(/\r/g, '').replace(/\n{4,}/g, '\n\n\n').trim().slice(0, max);


  /* ---------- v3.7 আউটপুট হেল্পার ---------- */
  const noteOut = (n, u) => ({ id: n.id, title: n.title, desc: n.desc, c: n.c, tags: n.tags, ext: n.ext, size: n.size, status: n.status, reason: n.reason || '', created: n.created, author: brief(C.users.find(y => y.id === n.uid)), votes: n.votes.length, voted: !!u && n.votes.includes(u.id), mine: !!u && n.uid === u.id, canManage: !!u && (n.uid === u.id || isMod(u)), canReview: !!u && isMod(u) && n.status === 'pending', dl: n.dl || 0 });
  function pollResults(p, full) {
    return p.qs.map(q => {
      const as = p.answers.map(a => a.a[q.id]).filter(v => v !== null && v !== undefined && v !== ''), r = { n: as.length };
      if (q.t === 'single') r.counts = q.opts.map((_, i) => as.filter(v => v === i).length);
      else if (q.t === 'multi') r.counts = q.opts.map((_, i) => as.filter(v => Array.isArray(v) && v.includes(i)).length);
      else if (q.t === 'rating') { r.counts = [1, 2, 3, 4, 5].map(k => as.filter(v => v === k).length); r.avg = as.length ? Math.round(as.reduce((a, b) => a + b, 0) / as.length * 10) / 10 : 0; }
      else if (full) r.texts = as.slice(-100).reverse();
      return r;
    });
  }
  const pollOut = (p, u, adm) => {
    const mine = !!adm || (!!u && p.uid === u.id), voted = !adm && !!u && p.voters.includes(u.id), open = pOpen(p);
    const showRes = mine || (p.show === 'after' && voted) || (p.show === 'close' && !open);
    return { id: p.id, title: p.title, desc: p.desc, by: p.by, qs: p.qs, target: p.target, anon: p.anon, show: p.show, closes: p.closes, open, created: p.created, total: p.voters.length, voted, mine, results: showRes ? pollResults(p, mine) : null,
      people: mine && !p.anon ? p.voters.map(id => { const x = C.users.find(y => y.id === id); return x ? { name: x.name, batch: x.batch } : null; }).filter(Boolean) : undefined };
  };
  function makePoll(b, by, uid, target) {
    const title = cleanText(b.title, 120).replace(/\s+/g, ' '); if (title.length < 3) throw bad('পোলের শিরোনাম দিন (অন্তত ৩ অক্ষর)');
    const qs = (Array.isArray(b.qs) ? b.qs : []).slice(0, 12).map((x, i) => {
      const t = ['single', 'multi', 'text', 'rating'].includes(x && x.t) ? x.t : 'single', q = cleanText(x && x.q, 200).replace(/\s+/g, ' '); if (!q) throw bad('প্রশ্ন ' + bnum(i + 1) + ' খালি আছে');
      const o = { id: i, t, q };
      if (t === 'single' || t === 'multi') { o.opts = (Array.isArray(x.opts) ? x.opts : []).map(y => cleanText(y, 80).replace(/\s+/g, ' ')).filter(Boolean).slice(0, 10); if (o.opts.length < 2) throw bad('প্রশ্ন ' + bnum(i + 1) + '-এ অন্তত ২টি অপশন দিন'); }
      return o;
    });
    if (!qs.length) throw bad('অন্তত একটি প্রশ্ন দিন');
    let closes = 0; if (b.closes) { const t = Date.parse(b.closes); if (!(t > now())) throw bad('শেষ সময় ভবিষ্যতের হতে হবে'); closes = t; }
    return { id: nid(), uid, by, title, desc: cleanText(b.desc, 300), qs, target, anon: b.anon !== false, show: ['after', 'close', 'creator'].includes(b.show) ? b.show : 'after', closes, closed: false, created: now(), voters: [], answers: [] };
  }
  const pollTargets = p => C.users.filter(x => x.status === 'active' && (!p.target.length || p.target.includes(x.batch)));
  function announcePoll(p, exceptUid) { pollTargets(p).forEach(x => { if (x.id !== exceptUid) notify(x.id, '📊 নতুন ' + (p.qs.length > 1 ? 'সার্ভে' : 'পোল') + ': ' + p.title, 0, 'polls'); }); }
  const vOut = (s, adm) => ({ id: s.id, c: s.c, title: s.title, created: s.created, status: s.status, max: s.max, total: s.total || 0, comment: s.comment || '', markedAt: s.markedAt || 0,
    ...(adm ? (() => { const x = C.users.find(y => y.id === s.uid); return { who: x ? x.name : 'মুছে ফেলা সদস্য', batch: x ? x.batch : '', sid: x ? x.sid : '' }; })() : {}),
    items: s.refs.map((r, i) => { const it = s.items.find(z => z.idx === i); return { idx: i, q: r.q, stage: r.stage, max: r.max, got: s.marks && s.marks[i] != null ? s.marks[i] : null, url: it ? (adm ? '/api/admin/c/viva/audio/' : '/api/c/viva/audio/') + it.file : '', dur: it ? it.dur : 0 }; }) });
  const noteFileSend = (req, res, n, dl) => {
    let buf; try { buf = fs.readFileSync(path.join(NOTES, n.file)); } catch (_) { throw bad('ফাইল পাওয়া যায়নি', 404); }
    const inline = !dl && ['.pdf', '.png', '.jpg', '.jpeg', '.txt'].includes(n.ext);
    sendBuf(req, res, buf, NOTE_MIME[n.ext] || 'application/octet-stream', { 'Content-Disposition': (inline ? 'inline' : 'attachment') + "; filename*=UTF-8''" + encodeURIComponent(n.name || ('note' + n.ext)) });
  };

  /* ---------- রাউটার ---------- */
  /* জব সেক্টর (jobs.js): সার্কুলার, মডারেশন, ফিড */
  const jobs = jobsMod({ DATA: env.DATA, send, readBody, bad, str, cleanText, isMod, notify: (...a) => { notify(...a); save(); }, limited, userBrief: id => { const x = C.users.find(y => y.id === id); return x ? brief(x) : null; } });
  /* লাইভ রুম (rooms.js): ভয়েস/ভিডিও কলের সিগন্যালিং */
  const rooms = roomsMod({ DATA: env.DATA, send, readBody, bad, str, limited, userBrief: id => { const x = C.users.find(y => y.id === id); return x ? brief(x) : null; } });
  async function handle(req, res, url) {
    const m = req.method, p = url.pathname, admin = isAdmin(req); let mt;
    if (m !== 'GET') {
      if (req.headers.origin) { try { if (new URL(req.headers.origin).host !== req.headers.host) throw 0; } catch (_) { return send(res, 403, { error: 'অনুরোধ গ্রহণযোগ্য নয়' }); } }
      if (m !== 'DELETE' && !/application\/json/.test(req.headers['content-type'] || '')) throw bad('Content-Type: application/json দরকার', 415);
    }
    /* ---- অ্যাডমিন ---- */
    if (p.startsWith('/api/admin/c/')) {
      if (!admin) return send(res, 401, { error: 'লগইন দরকার' });
      if (p === '/api/admin/c/jobs' || p.startsWith('/api/admin/c/jobs/')) return jobs.admin(req, res, url);
      if (p === '/api/admin/c/rooms' || p.startsWith('/api/admin/c/rooms/')) return rooms.admin(req, res, url);
      if (m === 'GET' && p === '/api/admin/c/overview') {
        const users = C.users.map(u => ({ id: u.id, sid: u.sid, name: u.name, batch: u.batch, role: u.role, status: u.status, email: u.email || '', phone: u.phone || '', created: u.created, posts: C.posts.filter(x => x.uid === u.id).length }));
        const reports = C.reports.filter(r => r.status === 'open').map(r => ({ ...r, reporter: (C.users.find(u => u.id === r.uid) || {}).name || '?' }));
        return send(res, 200, { users, reports, notesPending: C.notes.filter(n => n.status === 'pending').length, jobsPending: jobs.pendingCount(), vivaFresh: C.vsubs.filter(x => x.status === 'new' && x.items.length).length, stats: { users: C.users.length, pending: C.users.filter(u => u.status === 'pending').length, posts: C.posts.length, comments: C.comments.length } });
      }
      if (m === 'POST' && p === '/api/admin/c/game-reset') {   // ব্যাচ ওয়ারের সব স্কোর মুছে নতুন সিজন শুরু (লেভেল/ব্যাজের তথ্য থাকে)
        const b = await readBody(req, 1000); if (b.confirm !== true) throw bad('confirm: true দিন');
        const n = Object.keys(C.game.tot).length; C.game.days = {}; C.game.tot = {}; save(); return send(res, 200, { ok: true, cleared: n });
      }
      if (m === 'POST' && p === '/api/admin/c/approve-all') { let n = 0; C.users.forEach(u => { if (u.status === 'pending') { u.status = 'active'; n++; } }); save(); return send(res, 200, { ok: true, n }); }
      if ((mt = p.match(/^\/api\/admin\/c\/users\/(\d+)$/))) {
        const u = C.users.find(x => x.id === +mt[1]); if (!u) throw bad('সদস্য পাওয়া যায়নি', 404);
        if (m === 'PUT') {
          const b = await readBody(req, 4000);
          if (['pending', 'active', 'blocked'].includes(b.status)) { u.status = b.status; if (b.status !== 'active') { dropSessions(u.id); rooms.dropUser(u.id); } }
          if (['student', 'mod', 'teacher', 'cr'].includes(b.role)) u.role = b.role;
          if (typeof b.name === 'string' && b.name.trim()) u.name = str(b.name, 60).trim();
          if (typeof b.batch === 'string' && cs().batches.includes(b.batch)) u.batch = b.batch;
          save(); return send(res, 200, { ok: true });
        }
        if (m === 'DELETE') { sync.remove(u.id); jobs.dropUser(u.id); rooms.dropUser(u.id); dropSessions(u.id); C.lf.filter(x => x.uid === u.id).forEach(x => rmImgs(x.photos)); C.lf = C.lf.filter(x => x.uid !== u.id); C.stories = C.stories.filter(x => x.uid !== u.id); C.notes.filter(x => x.uid === u.id).forEach(x => rmFile(NOTES, x.file)); C.notes = C.notes.filter(x => x.uid !== u.id); C.notes.forEach(x => { x.votes = x.votes.filter(v => v !== u.id); }); C.vsubs.filter(x => x.uid === u.id).forEach(x => x.items.forEach(i => rmFile(VIVA, i.file))); C.vsubs = C.vsubs.filter(x => x.uid !== u.id); C.polls = C.polls.filter(x => x.uid !== u.id); C.wishes = C.wishes.filter(w => w.to !== u.id && w.from !== u.id); const pids = new Set(C.posts.filter(x => x.uid === u.id).map(x => x.id)); C.posts = C.posts.filter(x => x.uid !== u.id); C.comments = C.comments.filter(c => c.uid !== u.id && !pids.has(c.pid)); C.notifs = C.notifs.filter(n => n.uid !== u.id); C.users = C.users.filter(x => x.id !== u.id); save(); return send(res, 200, { ok: true }); }
      }
      if (m === 'POST' && (mt = p.match(/^\/api\/admin\/c\/users\/(\d+)\/password$/))) {
        const u = C.users.find(x => x.id === +mt[1]); if (!u) throw bad('সদস্য পাওয়া যায়নি', 404);
        const b = await readBody(req, 1000), pw = str(b.password, 100); if (pw.length < 6) throw bad('পাসওয়ার্ড অন্তত ৬ অক্ষর');
        u.pass = await hashPw(pw); dropSessions(u.id); save(); return send(res, 200, { ok: true });
      }
      if (m === 'PUT' && (mt = p.match(/^\/api\/admin\/c\/reports\/(\d+)$/))) {
        const r = C.reports.find(x => x.id === +mt[1]); if (!r) throw bad('রিপোর্ট পাওয়া যায়নি', 404);
        const act = (await readBody(req, 500)).action;
        const target = r.kind === 'post' ? C.posts.find(x => x.id === r.tid) : r.kind === 'note' ? C.notes.find(x => x.id === r.tid) : C.comments.find(x => x.id === r.tid);
        if (act === 'hide' && target) target.hidden = true;
        else if (act === 'restore' && target) { target.hidden = false; delete target.autoHidden; }
        else if (act === 'delete') { if (r.kind === 'note') { const nn = C.notes.find(x => x.id === r.tid); if (nn) rmFile(NOTES, nn.file); C.notes = C.notes.filter(x => x.id !== r.tid); } else if (r.kind === 'post') { C.posts = C.posts.filter(x => x.id !== r.tid); C.comments = C.comments.filter(c => c.pid !== r.tid); } else C.comments = C.comments.filter(x => x.id !== r.tid); }
        else if (act !== 'dismiss') throw bad('অজানা কাজ');
        C.reports.forEach(x => { if (x.kind === r.kind && x.tid === r.tid) x.status = 'done'; }); save(); return send(res, 200, { ok: true });
      }

      /* ---- নোট মডারেশন ---- */
      if (m === 'GET' && p === '/api/admin/c/notes') {
        const list = [...C.notes].sort((a, b) => (b.status === 'pending') - (a.status === 'pending') || b.id - a.id).slice(0, 200).map(n => ({ ...noteOut(n, null), who: (C.users.find(y => y.id === n.uid) || {}).name || '?', hidden: !!n.hidden }));
        return send(res, 200, { notes: list, pending: C.notes.filter(n => n.status === 'pending').length });
      }
      if ((mt = p.match(/^\/api\/admin\/c\/notes\/(\d+)(?:\/(review|file))?$/))) {
        const n = C.notes.find(x => x.id === +mt[1]); if (!n) throw bad('নোট পাওয়া যায়নি', 404);
        if (m === 'GET' && mt[2] === 'file') return noteFileSend(req, res, n, url.searchParams.get('dl') === '1');
        if (m === 'POST' && mt[2] === 'review') {
          const b = await readBody(req, 1000), act = b.action;
          if (act === 'approve') { n.status = 'approved'; n.reason = ''; n.hidden = false; notify(n.uid, '✅ আপনার নোট "' + n.title + '" অনুমোদিত হয়েছে, সবাই এখন দেখতে পাচ্ছে', 0, 'files'); }
          else if (act === 'reject') { n.status = 'rejected'; n.reason = str(b.reason, 200).trim(); notify(n.uid, '❌ আপনার নোট "' + n.title + '" অনুমোদন হয়নি' + (n.reason ? ': ' + n.reason : ''), 0, 'files'); }
          else if (act === 'restore') { n.hidden = false; C.reports.forEach(r => { if (r.kind === 'note' && r.tid === n.id) r.status = 'done'; }); }
          else throw bad('অজানা কাজ');
          save(); return send(res, 200, { ok: true });
        }
        if (m === 'DELETE' && !mt[2]) { rmFile(NOTES, n.file); C.notes = C.notes.filter(x => x !== n); C.reports.forEach(r => { if (r.kind === 'note' && r.tid === n.id) r.status = 'done'; }); save(); return send(res, 200, { ok: true }); }
      }
      /* ---- পোল ও সার্ভে (অ্যাডমিন) ---- */
      if (m === 'GET' && p === '/api/admin/c/polls') return send(res, 200, { polls: [...C.polls].sort((a, b) => b.id - a.id).map(x => pollOut(x, null, true)), batches: cs().batches });
      if (m === 'POST' && p === '/api/admin/c/polls') {
        const b = await readBody(req, 20000), target = (Array.isArray(b.target) ? b.target : []).filter(x => cs().batches.includes(x));
        const po = makePoll(b, 'অ্যাডমিন', 0, target); C.polls.push(po); announcePoll(po, 0); save(); return send(res, 201, pollOut(po, null, true));
      }
      if ((mt = p.match(/^\/api\/admin\/c\/polls\/(\d+)(?:\/(close))?$/))) {
        const po = C.polls.find(x => x.id === +mt[1]); if (!po) throw bad('পোল পাওয়া যায়নি', 404);
        if (m === 'POST' && mt[2] === 'close') { if (po.closed || !pOpen(po)) { po.closed = false; po.closes = 0; } else po.closed = true; save(); return send(res, 200, pollOut(po, null, true)); }
        if (m === 'DELETE' && !mt[2]) { C.polls = C.polls.filter(x => x !== po); save(); return send(res, 200, { ok: true }); }
      }
      /* ---- ভাইভা জমা: শুনে নম্বর দেওয়া ---- */
      if (m === 'GET' && p === '/api/admin/c/viva') return send(res, 200, { subs: [...C.vsubs].filter(x => x.items.length).sort((a, b) => (b.status === 'new') - (a.status === 'new') || b.id - a.id).slice(0, 150).map(x => vOut(x, true)), fresh: C.vsubs.filter(x => x.status === 'new' && x.items.length).length });
      if (m === 'GET' && (mt = p.match(/^\/api\/admin\/c\/viva\/audio\/([a-f0-9]{24}\.[a-z0-9]{2,5})$/))) {
        let it = null; C.vsubs.forEach(x => x.items.forEach(i => { if (i.file === mt[1]) it = i; }));
        if (!it) throw bad('অডিও পাওয়া যায়নি', 404);
        let buf; try { buf = fs.readFileSync(path.join(VIVA, it.file)); } catch (_) { throw bad('অডিও ফাইল নেই', 404); }
        return sendBuf(req, res, buf, it.mime);
      }
      if ((mt = p.match(/^\/api\/admin\/c\/viva\/(\d+)$/))) {
        const sub = C.vsubs.find(x => x.id === +mt[1]); if (!sub) throw bad('জমা পাওয়া যায়নি', 404);
        if (m === 'PUT') {
          const b = await readBody(req, 6000), mk = b.marks && typeof b.marks === 'object' ? b.marks : {}; sub.marks = sub.marks || {};
          sub.refs.forEach((r, i) => { if (mk[i] !== undefined && mk[i] !== null && mk[i] !== '') sub.marks[i] = Math.round(Math.max(0, Math.min(r.max, +mk[i] || 0)) * 2) / 2; });
          sub.total = Object.values(sub.marks).reduce((a, v) => a + v, 0); sub.comment = cleanText(b.comment, 600); sub.status = 'marked'; sub.markedAt = now();
          notify(sub.uid, '🎤 আপনার ভাইভা "' + sub.title + '"-এর নম্বর এসেছে: ' + bnum(sub.total) + '/' + bnum(sub.max), 0, 'viva'); save(); return send(res, 200, vOut(sub, true));
        }
        if (m === 'DELETE') { sub.items.forEach(i => rmFile(VIVA, i.file)); C.vsubs = C.vsubs.filter(x => x !== sub); save(); return send(res, 200, { ok: true }); }
      }
      throw bad('অজানা API', 404);
    }

    /* ---- নিবন্ধন / লগইন (লগইন ছাড়াই) ---- */
    const S = cs();
    if (m === 'GET' && p === '/api/c/me') {
      const u = me(req), pub = { open: S.open, needApproval: S.needApproval, codeRequired: !!S.joinCode, batches: S.batches };
      return send(res, 200, u ? { user: selfOut(u), unread: C.notifs.filter(n => n.uid === u.id && !n.read).length, settings: pub } : { user: null, settings: pub }, { 'Cache-Control': 'no-store' });
    }
    if (m === 'POST' && p === '/api/c/register') {
      if (!S.open) throw bad('এখন নতুন নিবন্ধন বন্ধ আছে', 403);
      if (limited('reg:' + clientIp(req), 6, 3600000)) throw bad('অনেকবার চেষ্টা হয়েছে, পরে আবার চেষ্টা করুন', 429);
      const b = await readBody(req, 4000), sid = str(b.sid, 30).trim().toLowerCase(), name = str(b.name, 80).trim(), pw = str(b.password, 100), batch = str(b.batch, 40);
      if (!/^[a-z0-9][a-z0-9._-]{2,19}$/.test(sid)) throw bad('রোল/আইডি ৩–২০ অক্ষরের হতে হবে (ইংরেজি অক্ষর, সংখ্যা, - _ .)');
      if (name.length < 2) throw bad('নাম দিন');
      if (!S.batches.includes(batch)) throw bad('ব্যাচ বাছুন');
      if (pw.length < 6) throw bad('পাসওয়ার্ড অন্তত ৬ অক্ষর');
      if (S.joinCode && str(b.code, 60).trim() !== S.joinCode) throw bad('জয়েন কোড ভুল', 403);
      if (C.users.some(u => u.sid === sid)) throw bad('এই রোল/আইডি দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে', 409);
      const u = { id: nid(), sid, name, batch, role: 'student', status: S.needApproval ? 'pending' : 'active', pass: await hashPw(pw), bio: '', avatar: '', email: '', phone: '', privacy: { directory: true, email: false, phone: false }, created: now() };
      C.users.push(u); save();
      return send(res, 201, { ok: true, status: u.status }, u.status === 'active' ? { 'Set-Cookie': startSession(res, u.id) } : {});
    }
    if (m === 'POST' && p === '/api/c/login') {
      const b = await readBody(req, 2000), sid = str(b.sid, 30).trim().toLowerCase();
      if (limited('lg:' + clientIp(req) + sid, 8, 60000)) throw bad('অনেকবার ভুল চেষ্টা হয়েছে, এক মিনিট পরে আবার চেষ্টা করুন', 429);
      const u = C.users.find(x => x.sid === sid), okPw = await checkPw(str(b.password, 100), u && u.pass);
      if (!u || !okPw) throw bad('রোল/আইডি বা পাসওয়ার্ড ভুল', 401);
      if (u.status === 'pending') throw bad('আপনার অ্যাকাউন্ট এখনো অনুমোদনের অপেক্ষায় আছে', 403);
      if (u.status === 'blocked') throw bad('এই অ্যাকাউন্ট বন্ধ করা হয়েছে', 403);
      return send(res, 200, { ok: true }, { 'Set-Cookie': startSession(res, u.id) });
    }
    if (m === 'POST' && p === '/api/c/logout') { const t = parseCookies(req).geb_u; if (t) { delete C.sessions[sha(t)]; save(); } return send(res, 200, { ok: true }, { 'Set-Cookie': 'geb_u=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' }); }


    /* ---- জব সেক্টর: তালিকা সবাই দেখতে পারে (লগইন ছাড়াও); জমা, রিভিউ, রিপোর্ট লগইন করা সদস্য ---- */
    if (p === '/api/c/jobs' || p.startsWith('/api/c/jobs/')) return jobs.handle(req, res, url, me(req));

    /* ---- আজকের জন্মদিন (হোমপেজ): লগইন ছাড়া শুধু সংখ্যা, অ্যাডমিন চাইলে সেটিং থেকে সবার জন্য খোলা যায় ---- */
    if (m === 'GET' && p === '/api/c/birthdays/today') {
      const v = me(req), yr = dhakaDay(now()).slice(0, 4), list = C.users.filter(x => x.status === 'active' && isBirthdayToday(x)), show = !!v || !!S.birthdayPublic, wc = {};
      C.wishes.forEach(w => { if (w.y === yr) wc[w.to] = (wc[w.to] || 0) + 1; });
      return send(res, 200, { day: dhakaDay(now()), count: list.length, login: !!v, public: !!S.birthdayPublic, msgs: WISH,
        list: show ? list.slice(0, 24).map(x => ({ id: x.id, name: x.name, batch: x.batch, avatar: x.avatar || '', wishes: wc[x.id] || 0, wished: !!v && C.wishes.some(w => w.y === yr && w.to === x.id && w.from === v.id), self: !!v && v.id === x.id })) : [] }, { 'Cache-Control': 'no-store' });
    }

    /* ---- এখান থেকে নিচে লগইন করা সদস্য ---- */
    const u = me(req); if (!u) return send(res, 401, { error: 'লগইন দরকার' });
    u.last = now();
    if (p === '/api/c/sync' || p.startsWith('/api/c/sync/')) return sync.handle(req, res, url, u);
    if (p === '/api/c/rooms' || p.startsWith('/api/c/rooms/')) return rooms.handle(req, res, url, u);

    if (m === 'PUT' && p === '/api/c/me') {
      const b = await readBody(req, 60000);
      if (typeof b.name === 'string' && b.name.trim().length >= 2) u.name = str(b.name, 80).trim();
      if (typeof b.bio === 'string') u.bio = str(b.bio, 200).trim();
      if (typeof b.email === 'string') u.email = /^[^\s@]{1,64}@[^\s@]{1,120}$/.test(b.email.trim()) ? b.email.trim() : '';
      if (typeof b.phone === 'string') u.phone = str(b.phone, 20).replace(/[^\d+\- ]/g, '').trim();
      if (b.privacy && typeof b.privacy === 'object') u.privacy = { directory: b.privacy.directory !== false, email: !!b.privacy.email, phone: !!b.privacy.phone, bday: b.privacy.bday !== false };
      if (b.dob === null) u.dob = null; else if (b.dob && typeof b.dob === 'object') { const d = { m: Math.floor(+b.dob.m), d: Math.floor(+b.dob.d) }; if (!dobOk(d)) throw bad('জন্মদিনের তারিখ ঠিক নেই'); u.dob = d; }
      if (typeof b.avatar === 'string') { if (b.avatar === '') u.avatar = ''; else if (/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(b.avatar) && b.avatar.length < 45000) u.avatar = b.avatar; else throw bad('ছবি ঠিক নেই বা বেশি বড়'); }
      save(); return send(res, 200, selfOut(u));
    }
    if (m === 'POST' && p === '/api/c/password') {
      const b = await readBody(req, 1000), np = str(b.new, 100);
      if (np.length < 6) throw bad('নতুন পাসওয়ার্ড অন্তত ৬ অক্ষর');
      if (!(await checkPw(str(b.old, 100), u.pass))) throw bad('বর্তমান পাসওয়ার্ড ভুল', 403);
      u.pass = await hashPw(np); const keep = sha(parseCookies(req).geb_u); Object.keys(C.sessions).forEach(k => { if (C.sessions[k].uid === u.id && k !== keep) delete C.sessions[k]; }); save(); return send(res, 200, { ok: true });
    }

    /* ---- ফিড ---- */
    if (m === 'GET' && p === '/api/c/feed') {
      const q = url.searchParams, type = q.get('type'), scope = q.get('scope') || 'all', before = parseInt(q.get('before')) || Infinity, term = str(q.get('q'), 60).toLowerCase().trim();
      let list = C.posts.filter(x => visible(x, u));
      if (type === 'question') list = list.filter(x => x.type === 'question'); if (q.get('unsolved') === '1') list = list.filter(x => x.type === 'question' && !x.accepted);
      if (scope === 'batch') list = list.filter(x => x.scope === 'batch'); else if (scope !== 'all') list = list.filter(x => x.scope === scope);
      if (term) list = list.filter(x => x.text.toLowerCase().includes(term));
      list.sort((a, b) => b.id - a.id);
      const first = before === Infinity, pinned = first && !term ? list.filter(x => x.pinned) : [], rest = list.filter(x => x.id < before && !(first && !term && x.pinned)), page = rest.slice(0, 20), cnt = counts();
      return send(res, 200, { posts: [...pinned, ...page].map(x => postOut(x, u, cnt)), more: rest.length > 20, next: page.length ? page[page.length - 1].id : 0 });
    }
    if (m === 'POST' && p === '/api/c/posts') {
      if (limited('post:' + u.id, 12, 3600000)) throw bad('একসাথে অনেক পোস্ট হয়ে গেছে, একটু পরে আবার দিন', 429);
      const b = await readBody(req, 12000), text = cleanText(b.text, S.maxPost || 3000); if (text.length < 2) throw bad('কিছু লিখুন');
      const type = b.type === 'question' ? 'question' : 'post', sc = str(b.scope, 20) || 'all';
      if (sc !== 'all' && sc !== 'batch' && !courseOk(sc)) throw bad('ভুল গ্রুপ');
      const po = { id: nid(), uid: u.id, text, type, scope: sc, batch: sc === 'batch' ? u.batch : '', created: now(), likes: [], accepted: 0, pinned: false, hidden: false };
      C.posts.push(po); save(); return send(res, 201, postOut(po, u, counts()));
    }
    if ((mt = p.match(/^\/api\/c\/posts\/(\d+)$/)) && m === 'DELETE') {
      const po = C.posts.find(x => x.id === +mt[1]); if (!po) throw bad('পাওয়া যায়নি', 404);
      if (po.uid !== u.id && !isMod(u)) throw bad('অনুমতি নেই', 403);
      C.posts = C.posts.filter(x => x !== po); C.comments = C.comments.filter(c => c.pid !== po.id); save(); return send(res, 200, { ok: true });
    }
    if ((mt = p.match(/^\/api\/c\/posts\/(\d+)\/(like|pin)$/)) && m === 'POST') {
      const po = C.posts.find(x => x.id === +mt[1]); if (!po || !visible(po, u)) throw bad('পাওয়া যায়নি', 404);
      if (mt[2] === 'like') { const i = po.likes.indexOf(u.id); i >= 0 ? po.likes.splice(i, 1) : po.likes.push(u.id); }
      else { if (!isMod(u)) throw bad('অনুমতি নেই', 403); po.pinned = !po.pinned; }
      save(); return send(res, 200, postOut(po, u, counts()));
    }
    if ((mt = p.match(/^\/api\/c\/posts\/(\d+)\/comments$/))) {
      const po = C.posts.find(x => x.id === +mt[1]); if (!po || !visible(po, u)) throw bad('পাওয়া যায়নি', 404);
      if (m === 'GET') return send(res, 200, { comments: C.comments.filter(c => c.pid === po.id && !c.hidden).sort((a, b) => (po.accepted === b.id) - (po.accepted === a.id) || a.id - b.id).map(c => commentOut(c, u, po)) });
      if (m === 'POST') {
        if (limited('cm:' + u.id, 40, 3600000)) throw bad('অনেক কমেন্ট হয়ে গেছে, একটু পরে আবার চেষ্টা করুন', 429);
        if (C.comments.filter(c => c.pid === po.id).length >= 300) throw bad('এই পোস্টে আর কমেন্ট নেওয়া হচ্ছে না');
        const text = cleanText((await readBody(req, 4000)).text, 1500); if (!text) throw bad('কিছু লিখুন');
        const c = { id: nid(), pid: po.id, uid: u.id, text, created: now(), likes: [], hidden: false }; C.comments.push(c);
        if (po.uid !== u.id) notify(po.uid, u.name + (po.type === 'question' ? ' আপনার প্রশ্নের উত্তর দিয়েছেন' : ' আপনার পোস্টে কমেন্ট করেছেন'), po.id);
        save(); return send(res, 201, commentOut(c, u, po));
      }
    }
    if ((mt = p.match(/^\/api\/c\/comments\/(\d+)(?:\/(like|accept))?$/))) {
      const c = C.comments.find(x => x.id === +mt[1]); if (!c) throw bad('পাওয়া যায়নি', 404);
      const po = C.posts.find(x => x.id === c.pid); if (!po || !visible(po, u)) throw bad('পাওয়া যায়নি', 404);
      if (m === 'DELETE' && !mt[2]) { if (c.uid !== u.id && !isMod(u)) throw bad('অনুমতি নেই', 403); C.comments = C.comments.filter(x => x !== c); if (po.accepted === c.id) po.accepted = 0; save(); return send(res, 200, { ok: true }); }
      if (m === 'POST' && mt[2] === 'like') { const i = c.likes.indexOf(u.id); i >= 0 ? c.likes.splice(i, 1) : c.likes.push(u.id); save(); return send(res, 200, commentOut(c, u, po)); }
      if (m === 'POST' && mt[2] === 'accept') {
        if (po.type !== 'question' || (po.uid !== u.id && !isMod(u))) throw bad('অনুমতি নেই', 403);
        po.accepted = po.accepted === c.id ? 0 : c.id; if (po.accepted && c.uid !== u.id) notify(c.uid, 'আপনার উত্তরটি সঠিক উত্তর হিসেবে মার্ক হয়েছে', po.id);
        save(); return send(res, 200, { accepted: po.accepted });
      }
    }
    if (m === 'POST' && p === '/api/c/report') {
      const b = await readBody(req, 2000), kind = b.kind === 'comment' ? 'comment' : b.kind === 'note' ? 'note' : 'post', tid = +b.id;
      const target = kind === 'post' ? C.posts.find(x => x.id === tid) : kind === 'note' ? C.notes.find(x => x.id === tid && x.status === 'approved') : C.comments.find(x => x.id === tid); if (!target) throw bad('পাওয়া যায়নি', 404);
      if (limited('rp:' + u.id, 8, 3600000)) throw bad('অনেক রিপোর্ট হয়ে গেছে, পরে চেষ্টা করুন', 429);
      if (C.reports.some(r => r.kind === kind && r.tid === tid && r.uid === u.id && r.status === 'open')) throw bad('আপনি আগেই রিপোর্ট করেছেন');
      C.reports.push({ id: nid(), kind, tid, uid: u.id, reason: str(b.reason, 200).trim(), text: str(target.text || target.title, 300), author: (C.users.find(x => x.id === target.uid) || {}).name || '?', status: 'open', created: now() });
      const open = new Set(C.reports.filter(r => r.kind === kind && r.tid === tid && r.status === 'open').map(r => r.uid));
      if (open.size >= 3 && !target.hidden) { target.hidden = true; target.autoHidden = true; }   // ৩ জন আলাদা সদস্য রিপোর্ট করলে অ্যাডমিন দেখা পর্যন্ত লুকানো
      save(); return send(res, 200, { ok: true });
    }

    /* ---- হারানো-প্রাপ্তি (ছবিসহ পোস্ট) ---- */
    if (m === 'GET' && (mt = p.match(/^\/api\/c\/img\/([a-f0-9]{24}\.jpg)$/))) {
      let buf; try { buf = fs.readFileSync(path.join(IMG, mt[1])); } catch (_) { return send(res, 404, { error: 'ছবি পাওয়া যায়নি' }); }
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Content-Length': buf.length, 'Cache-Control': 'private, max-age=86400', 'X-Content-Type-Options': 'nosniff' });
      return res.end(buf);
    }
    if (m === 'GET' && p === '/api/c/lf') {
      const q = url.searchParams, kind = q.get('kind'), done = q.get('status') === 'resolved', before = parseInt(q.get('before')) || Infinity, term = str(q.get('q'), 60).toLowerCase().trim();
      const list = C.lf.filter(x => (done ? x.status === 'resolved' : x.status !== 'resolved') && ((kind === 'lost' || kind === 'found') ? x.kind === kind : true) && (!term || (x.title + ' ' + x.text + ' ' + x.place).toLowerCase().includes(term))).sort((a, b) => b.id - a.id);
      const rest = list.filter(x => x.id < before), page = rest.slice(0, 12);
      return send(res, 200, { items: page.map(x => lfOut(x, u)), more: rest.length > 12, next: page.length ? page[page.length - 1].id : 0 });
    }
    if (m === 'POST' && p === '/api/c/lf') {
      if (limited('lf:' + u.id, 6, 3600000)) throw bad('একসাথে অনেক পোস্ট হয়ে গেছে, একটু পরে আবার দিন', 429);
      const b = await readBody(req, 1250000), title = cleanText(b.title, 80).replace(/\s+/g, ' '), text = cleanText(b.text, 600);
      if (title.length < 2) throw bad('কী হারিয়েছে বা পেয়েছেন তার নাম লিখুন');
      const saved = []; try { (Array.isArray(b.photos) ? b.photos.slice(0, 3) : []).forEach(d => saved.push(saveImg(d))); } catch (e) { rmImgs(saved); throw e; }
      const x = { id: nid(), uid: u.id, kind: b.kind === 'found' ? 'found' : 'lost', title, text, place: str(b.place, 80).trim(), when: str(b.when, 40).trim(), contact: str(b.contact, 80).trim(), photos: saved, status: 'open', created: now() };
      C.lf.push(x); save(); return send(res, 201, lfOut(x, u));
    }
    if ((mt = p.match(/^\/api\/c\/lf\/(\d+)(?:\/(status|claim))?$/))) {
      const x = C.lf.find(y => y.id === +mt[1]); if (!x) throw bad('পোস্টটি পাওয়া যায়নি', 404);
      if (m === 'DELETE' && !mt[2]) { if (x.uid !== u.id && !isMod(u)) throw bad('অনুমতি নেই', 403); rmImgs(x.photos); C.lf = C.lf.filter(y => y !== x); save(); return send(res, 200, { ok: true }); }
      if (m === 'POST' && mt[2] === 'status') { if (x.uid !== u.id && !isMod(u)) throw bad('অনুমতি নেই', 403); x.status = x.status === 'resolved' ? 'open' : 'resolved'; save(); return send(res, 200, lfOut(x, u)); }
      if (m === 'POST' && mt[2] === 'claim') {
        if (x.uid === u.id) throw bad('এটা আপনারই পোস্ট');
        if (x.status === 'resolved') throw bad('এই পোস্টটি আগেই সমাধান হয়ে গেছে');
        if (limited('lfc:' + u.id + ':' + x.id, 1, 3600000) || limited('lfc:' + u.id, 10, 3600000)) throw bad('একটু আগেই জানানো হয়েছে, কিছুক্ষণ পরে আবার চেষ্টা করুন', 429);
        const note = cleanText((await readBody(req, 2000)).note, 120);
        notify(x.uid, u.name + ' (' + u.batch + ') আপনার "' + x.title + '" পোস্ট নিয়ে যোগাযোগ করতে চান' + (note ? ': ' + note : ''), 0);
        save(); return send(res, 200, { ok: true });
      }
    }

    /* ---- ব্যাচ জীবনবৃত্তান্ত ---- */
    if (m === 'GET' && p === '/api/c/stories') {
      const bq = str(url.searchParams.get('batch'), 40), batch = S.batches.includes(bq) ? bq : u.batch;
      const inB = C.users.filter(x => x.status === 'active' && x.batch === batch && (priv(x).directory || x.id === u.id)), ids = new Set(inB.map(x => x.id));
      const list = C.stories.filter(s => ids.has(s.uid)).map(s => storyOut(s, u)).sort((a, b) => (b.mine - a.mine) || a.author.name.localeCompare(b.author.name, 'bn'));
      const mine = C.stories.find(s => s.uid === u.id);
      return send(res, 200, { batch, stories: list, missing: inB.length - list.length, mine: mine ? storyOut(mine, u) : null });
    }
    if (m === 'PUT' && p === '/api/c/story') {
      if (limited('st:' + u.id, 30, 3600000)) throw bad('অনেকবার সেভ হয়েছে, একটু পরে চেষ্টা করুন', 429);
      const b = await readBody(req, 30000), course = str(b.course, 20);
      const f = { hobby: cleanText(b.hobby, 100).replace(/\s*\n\s*/g, ', '), dream: cleanText(b.dream, 200), course: courseOk(course) ? course : '', journey: cleanText(b.journey, 2000), feeling: cleanText(b.feeling, 1000) };
      if (!f.hobby && !f.dream && !f.course && !f.journey && !f.feeling) throw bad('অন্তত একটি ঘর পূরণ করুন');
      let s = C.stories.find(x => x.uid === u.id); if (!s) { s = { id: nid(), uid: u.id, likes: [], created: now() }; C.stories.push(s); }
      Object.assign(s, f, { hideFeeling: !!b.hideFeeling, updated: now() }); save(); return send(res, 200, storyOut(s, u));
    }
    if ((mt = p.match(/^\/api\/c\/stories\/(\d+)(?:\/(like))?$/))) {
      const s = C.stories.find(x => x.id === +mt[1]); if (!s) throw bad('কার্ডটি পাওয়া যায়নি', 404);
      if (m === 'POST' && mt[2] === 'like') { const i = s.likes.indexOf(u.id); i >= 0 ? s.likes.splice(i, 1) : s.likes.push(u.id); save(); return send(res, 200, storyOut(s, u)); }
      if (m === 'DELETE' && !mt[2]) { if (s.uid !== u.id && !isMod(u)) throw bad('অনুমতি নেই', 403); C.stories = C.stories.filter(x => x !== s); save(); return send(res, 200, { ok: true }); }
    }
    if (m === 'DELETE' && p === '/api/c/story') { C.stories = C.stories.filter(x => x.uid !== u.id); save(); return send(res, 200, { ok: true }); }

    /* ---- সদস্য তালিকা ও প্রোফাইল ---- */
    if (m === 'GET' && p === '/api/c/members') {
      const q = url.searchParams, term = str(q.get('q'), 60).toLowerCase().trim(), batch = q.get('batch') || '';
      const list = C.users.filter(x => x.status === 'active' && priv(x).directory && (!batch || x.batch === batch) && (!term || x.name.toLowerCase().includes(term))).sort((a, b) => a.name.localeCompare(b.name, 'bn')).slice(0, 300);
      return send(res, 200, { members: list.map(x => ({ ...profile(x, x.id === u.id), posts: C.posts.filter(pp => pp.uid === x.id && !pp.hidden && pp.scope !== 'batch').length })) });
    }
    if (m === 'GET' && (mt = p.match(/^\/api\/c\/users\/(\d+)$/))) {
      const x = C.users.find(y => y.id === +mt[1] && y.status === 'active'); if (!x || (!priv(x).directory && x.id !== u.id)) throw bad('পাওয়া যায়নি', 404);
      return send(res, 200, profile(x, x.id === u.id));
    }
    /* ---- নোট শেয়ারিং ---- */
    if (m === 'GET' && p === '/api/c/notes') {
      const q = url.searchParams, scope = q.get('scope') || 'all', c = str(q.get('c'), 20), term = str(q.get('q'), 60).toLowerCase().trim(), tag = str(q.get('tag'), 30), sort = q.get('sort') === 'new' ? 'new' : 'helpful', off = Math.max(0, parseInt(q.get('off')) || 0);
      const pub = C.notes.filter(n => n.status === 'approved' && !n.hidden);
      let list;
      if (scope === 'pending') { if (!isMod(u)) throw bad('অনুমতি নেই', 403); list = C.notes.filter(n => n.status === 'pending'); }
      else if (scope === 'mine') list = C.notes.filter(n => n.uid === u.id); else list = pub;
      if (c) list = list.filter(n => n.c === c); if (tag) list = list.filter(n => n.tags.includes(tag));
      if (term) list = list.filter(n => (n.title + ' ' + n.desc + ' ' + n.tags.join(' ')).toLowerCase().includes(term));
      list = [...list].sort(sort === 'new' || scope !== 'all' ? (a, b) => b.id - a.id : (a, b) => b.votes.length - a.votes.length || b.id - a.id);
      const tc = {}; pub.forEach(n => n.tags.forEach(t => { tc[t] = (tc[t] || 0) + 1; }));
      return send(res, 200, { items: list.slice(off, off + 24).map(n => noteOut(n, u)), more: off + 24 < list.length, total: list.length, pending: isMod(u) ? C.notes.filter(n => n.status === 'pending').length : 0, tags: Object.keys(tc).sort((a, b) => tc[b] - tc[a]).slice(0, 14), canReview: isMod(u) }, { 'Cache-Control': 'no-store' });
    }
    if (m === 'POST' && p === '/api/c/notes') {
      if (limited('nt:' + u.id, 5, 3600000)) throw bad('একসাথে অনেক নোট আপলোড হয়ে গেছে, একটু পরে আবার দিন', 429);
      if (C.notes.filter(n => n.uid === u.id && n.status === 'pending').length >= 8) throw bad('আপনার ৮টি নোট এখনো অনুমোদনের অপেক্ষায় আছে, অনুমোদন হলে আবার দিন');
      const b = await readBody(req, 12 * 1024 * 1024), title = cleanText(b.title, 100).replace(/\s+/g, ' '); if (title.length < 3) throw bad('নোটের শিরোনাম দিন (অন্তত ৩ অক্ষর)');
      const c = str(b.c, 20); if (!courseOk(c)) throw bad('কোর্স বাছুন');
      const name = path.basename(str(b.name, 150)), ext = path.extname(name).toLowerCase(); if (!NOTE_EXT.has(ext)) throw bad('শুধু ' + [...NOTE_EXT].map(x => x.slice(1)).join(', ') + ' ফাইল চলবে');
      const buf = Buffer.from(str(b.data, 12 * 1024 * 1024), 'base64'); if (!buf.length) throw bad('ফাইল খালি'); if (buf.length > 8 * 1024 * 1024) throw bad('ফাইল ৮ MB-এর বেশি', 413);
      if (!noteOk(buf, ext)) throw bad('ফাইলের ভেতরের ধরন এক্সটেনশনের সাথে মেলে না');
      const tags = [...new Set((Array.isArray(b.tags) ? b.tags : []).map(x => cleanText(x, 24).replace(/\s+/g, ' ')).filter(Boolean))].slice(0, 5);
      const file = crypto.randomBytes(12).toString('hex') + ext; fs.writeFileSync(path.join(NOTES, file), buf);
      const n = { id: nid(), uid: u.id, title, desc: cleanText(b.desc, 400), c, tags, file, name, ext, size: buf.length, status: isMod(u) ? 'approved' : 'pending', votes: [], dl: 0, created: now() };
      C.notes.push(n); save(); return send(res, 201, noteOut(n, u));
    }
    if ((mt = p.match(/^\/api\/c\/notes\/(\d+)(?:\/(file|vote|review))?$/))) {
      const n = C.notes.find(x => x.id === +mt[1]); if (!n) throw bad('নোট পাওয়া যায়নি', 404);
      const live = n.status === 'approved' && !n.hidden;
      if (m === 'GET' && mt[2] === 'file') {
        if (!live && n.uid !== u.id && !isMod(u)) throw bad('নোট পাওয়া যায়নি', 404);
        if (live && n.uid !== u.id) { n.dl = (n.dl || 0) + 1; save(); }
        return noteFileSend(req, res, n, url.searchParams.get('dl') === '1');
      }
      if (m === 'POST' && mt[2] === 'vote') {
        if (!live) throw bad('এই নোটে ভোট দেওয়া যাবে না'); if (n.uid === u.id) throw bad('নিজের নোটে ভোট দেওয়া যায় না');
        if (limited('nv:' + u.id, 120, 3600000)) throw bad('একটু পরে চেষ্টা করুন', 429);
        const i = n.votes.indexOf(u.id); i >= 0 ? n.votes.splice(i, 1) : n.votes.push(u.id); save(); return send(res, 200, noteOut(n, u));
      }
      if (m === 'POST' && mt[2] === 'review') {
        if (!isMod(u)) throw bad('শুধু মডারেটর অনুমোদন দিতে পারেন', 403); if (n.status !== 'pending') throw bad('নোটটি আগেই দেখা হয়ে গেছে');
        const b = await readBody(req, 1000);
        if (b.action === 'approve') { n.status = 'approved'; n.reason = ''; notify(n.uid, '✅ আপনার নোট "' + n.title + '" অনুমোদিত হয়েছে, সবাই এখন দেখতে পাচ্ছে', 0, 'files'); }
        else if (b.action === 'reject') { n.status = 'rejected'; n.reason = str(b.reason, 200).trim(); notify(n.uid, '❌ আপনার নোট "' + n.title + '" অনুমোদন হয়নি' + (n.reason ? ': ' + n.reason : ''), 0, 'files'); }
        else throw bad('অজানা কাজ');
        save(); return send(res, 200, noteOut(n, u));
      }
      if (m === 'DELETE' && !mt[2]) { if (n.uid !== u.id && !isMod(u)) throw bad('অনুমতি নেই', 403); rmFile(NOTES, n.file); C.notes = C.notes.filter(x => x !== n); save(); return send(res, 200, { ok: true }); }
    }

    /* ---- পোল ও সার্ভে ---- */
    if (m === 'GET' && p === '/api/c/polls') {
      const list = C.polls.filter(x => x.uid === u.id || !x.target.length || x.target.includes(u.batch)).sort((a, b) => pOpen(b) - pOpen(a) || b.id - a.id).slice(0, 40);
      return send(res, 200, { polls: list.map(x => pollOut(x, u)), canCreate: u.role === 'cr' }, { 'Cache-Control': 'no-store' });
    }
    if (m === 'POST' && p === '/api/c/polls') {
      if (u.role !== 'cr') throw bad('শুধু ক্লাস রিপ্রেজেন্টেটিভ (CR) পোল বা সার্ভে দিতে পারেন। CR হতে অ্যাডমিনকে বলুন।', 403);
      if (limited('pl:' + u.id, 6, 3600000)) throw bad('একসাথে অনেক পোল হয়ে গেছে, একটু পরে আবার দিন', 429);
      if (C.polls.filter(x => x.uid === u.id && pOpen(x)).length >= 6) throw bad('একসাথে ৬টির বেশি চালু পোল রাখা যায় না, আগেরগুলো বন্ধ করুন');
      const po = makePoll(await readBody(req, 20000), u.name + ' (CR)', u.id, [u.batch]); C.polls.push(po); announcePoll(po, u.id); save(); return send(res, 201, pollOut(po, u));
    }
    if ((mt = p.match(/^\/api\/c\/polls\/(\d+)(?:\/(vote|close))?$/))) {
      const po = C.polls.find(x => x.id === +mt[1]); if (!po || !(po.uid === u.id || !po.target.length || po.target.includes(u.batch))) throw bad('পোল পাওয়া যায়নি', 404);
      if (m === 'POST' && mt[2] === 'vote') {
        if (!pOpen(po)) throw bad('এই পোল বন্ধ হয়ে গেছে'); if (po.voters.includes(u.id)) throw bad('আপনি আগেই উত্তর দিয়েছেন');
        if (limited('pv:' + u.id, 60, 3600000)) throw bad('একটু পরে চেষ্টা করুন', 429);
        const b = await readBody(req, 8000), raw = Array.isArray(b.a) ? b.a : [], ans = [];
        po.qs.forEach((q, i) => {
          const v = raw[i];
          if (v === null || v === undefined || v === '') return void ans.push(null);
          if (q.t === 'single') { const k = Math.floor(+v); if (!(k >= 0 && k < q.opts.length)) throw bad('অপশন ঠিক নেই'); ans.push(k); }
          else if (q.t === 'multi') { const ks = [...new Set((Array.isArray(v) ? v : []).map(x => Math.floor(+x)).filter(x => x >= 0 && x < q.opts.length))]; ans.push(ks.length ? ks : null); }
          else if (q.t === 'rating') { const k = Math.floor(+v); if (!(k >= 1 && k <= 5)) throw bad('রেটিং ১–৫ হতে হবে'); ans.push(k); }
          else { const t = cleanText(v, 300); ans.push(t || null); }
        });
        if (ans.every(x => x === null)) throw bad('অন্তত একটি প্রশ্নের উত্তর দিন');
        po.voters.push(u.id); po.answers.push({ a: ans }); save(); return send(res, 200, pollOut(po, u));
      }
      if (m === 'DELETE' && !mt[2]) { if (po.uid !== u.id) throw bad('অনুমতি নেই', 403); C.polls = C.polls.filter(x => x !== po); save(); return send(res, 200, { ok: true }); }
      if (m === 'POST' && mt[2] === 'close') { if (po.uid !== u.id) throw bad('অনুমতি নেই', 403); if (po.closed || !pOpen(po)) { po.closed = false; po.closes = 0; } else po.closed = true; save(); return send(res, 200, pollOut(po, u)); }
    }

    /* ---- ভাইভা প্র্যাকটিস: নিজের অডিও জমা দিয়ে অ্যাডমিনের কাছ থেকে নম্বর ---- */
    if (m === 'GET' && p === '/api/c/viva/subs') return send(res, 200, { subs: C.vsubs.filter(x => x.uid === u.id).sort((a, b) => b.id - a.id).slice(0, 40).map(x => vOut(x, false)) }, { 'Cache-Control': 'no-store' });
    if (m === 'POST' && p === '/api/c/viva/sub') {
      if (limited('vs:' + u.id, 8, 3600000)) throw bad('একসাথে অনেক ভাইভা জমা হয়ে গেছে, একটু পরে আবার চেষ্টা করুন', 429);
      if (C.vsubs.filter(x => x.uid === u.id).length >= 30) throw bad('আপনার ৩০টি জমা আছে, পুরনো কিছু মুছে ফেলুন');
      const b = await readBody(req, 8000), sets = env.viva(), refs = [];
      (Array.isArray(b.refs) ? b.refs : []).slice(0, 30).forEach(r => { const st = sets.find(x => x.id === +r[0]), q = st && st.qs[+r[1]]; if (q) refs.push({ setId: st.id, qi: +r[1], c: st.c, q: q.q, stage: q.stage || '', max: q.m }); });
      if (!refs.length) throw bad('ভাইভা সেট পাওয়া যায়নি');
      const cset = [...new Set(refs.map(r => r.c))], sub = { id: nid(), uid: u.id, c: cset.length === 1 ? cset[0] : 'mix', title: str(b.title, 100).trim() || 'ভাইভা', created: now(), status: 'new', refs, items: [], marks: {}, max: refs.reduce((a, r) => a + r.max, 0) };
      C.vsubs.push(sub); save(); return send(res, 201, vOut(sub, false));
    }
    if (m === 'GET' && (mt = p.match(/^\/api\/c\/viva\/audio\/([a-f0-9]{24}\.[a-z0-9]{2,5})$/))) {
      let it = null; C.vsubs.forEach(x => { if (x.uid === u.id) x.items.forEach(i => { if (i.file === mt[1]) it = i; }); });
      if (!it) throw bad('অডিও পাওয়া যায়নি', 404);
      let buf; try { buf = fs.readFileSync(path.join(VIVA, it.file)); } catch (_) { throw bad('অডিও ফাইল নেই', 404); }
      return sendBuf(req, res, buf, it.mime);
    }
    if ((mt = p.match(/^\/api\/c\/viva\/sub\/(\d+)(?:\/(audio))?$/))) {
      const sub = C.vsubs.find(x => x.id === +mt[1] && x.uid === u.id); if (!sub) throw bad('জমা পাওয়া যায়নি', 404);
      if (m === 'POST' && mt[2] === 'audio') {
        if (sub.status !== 'new') throw bad('নম্বর দেওয়া হয়ে গেছে, আর বদলানো যাবে না');
        if (limited('va:' + u.id, 80, 3600000)) throw bad('একটু পরে চেষ্টা করুন', 429);
        const b = await readBody(req, 4600000), idx = Math.floor(+b.idx); if (!(idx >= 0 && idx < sub.refs.length)) throw bad('প্রশ্ন নম্বর ভুল');
        const buf = Buffer.from(str(b.data, 4500000), 'base64'); if (!buf.length) throw bad('অডিও খালি'); if (buf.length > 3 * 1024 * 1024) throw bad('অডিও ৩ MB-এর বেশি; ছোট করে রেকর্ড করুন', 413);
        const kind = sniffAudio(buf); if (!kind) throw bad('শুধু অডিও ফাইল (webm, ogg, m4a, mp3, wav) চলবে');
        const old = sub.items.find(z => z.idx === idx); if (old) { rmFile(VIVA, old.file); sub.items = sub.items.filter(z => z !== old); }
        const file = crypto.randomBytes(12).toString('hex') + '.' + kind.ext; fs.writeFileSync(path.join(VIVA, file), buf);
        sub.items.push({ idx, file, mime: kind.mime, dur: Math.max(0, Math.min(900, Math.floor(+b.dur) || 0)) }); save(); return send(res, 200, vOut(sub, false));
      }
      if (m === 'DELETE' && !mt[2]) { sub.items.forEach(i => rmFile(VIVA, i.file)); C.vsubs = C.vsubs.filter(x => x !== sub); save(); return send(res, 200, { ok: true }); }
    }

    /* ---- জন্মদিনের উইশ ---- */
    if (m === 'POST' && p === '/api/c/wish') {
      const b = await readBody(req, 1000), to = C.users.find(x => x.id === +b.to && x.status === 'active'), yr = dhakaDay(now()).slice(0, 4);
      if (!to || !isBirthdayToday(to)) throw bad('আজ এই সদস্যের জন্মদিন নয়'); if (to.id === u.id) throw bad('নিজেকে নিজে উইশ করা যায় না 😄');
      if (C.wishes.some(w => w.y === yr && w.to === to.id && w.from === u.id)) throw bad('আপনি আগেই উইশ করেছেন');
      if (limited('ws:' + u.id, 40, 3600000)) throw bad('একটু পরে চেষ্টা করুন', 429);
      const text = typeof b.text === 'string' && b.text.trim() ? cleanText(b.text, 80) : WISH[Math.max(0, Math.min(WISH.length - 1, parseInt(b.msg) || 0))];
      C.wishes = C.wishes.filter(w => w.y === yr); C.wishes.push({ id: nid(), to: to.id, from: u.id, y: yr, text, created: now() });
      const cnt = C.wishes.filter(w => w.to === to.id && w.y === yr).length, msg = '🎉 ' + bnum(cnt) + ' জন আপনাকে জন্মদিনের শুভেচ্ছা জানিয়েছে', k = 'bd' + yr;
      const old = C.notifs.find(x => x.uid === to.id && x.k === k);
      if (old) { old.text = msg; old.read = false; old.created = now(); } else { notify(to.id, msg, 0, 'wishes'); C.notifs[C.notifs.length - 1].k = k; }
      save(); return send(res, 200, { ok: true, wishes: cnt });
    }
    if (m === 'GET' && p === '/api/c/wishes') {
      const yr = dhakaDay(now()).slice(0, 4);
      return send(res, 200, { wishes: C.wishes.filter(w => w.to === u.id && w.y === yr).sort((a, b) => b.id - a.id).map(w => { const f = C.users.find(x => x.id === w.from); return { name: f ? f.name : 'মুছে ফেলা সদস্য', batch: f ? f.batch : '', text: w.text, created: w.created }; }) }, { 'Cache-Control': 'no-store' });
    }

    /* ---- নোটিফিকেশন ---- */
    if (m === 'GET' && p === '/api/c/notifs') return send(res, 200, { notifs: C.notifs.filter(n => n.uid === u.id).sort((a, b) => b.id - a.id).slice(0, 30) });
    if (m === 'POST' && p === '/api/c/notifs/read') { C.notifs.forEach(n => { if (n.uid === u.id) n.read = true; }); save(); return send(res, 200, { ok: true }); }
    /* ---- গেম: ব্যাচ ওয়ার ----
       প্রশ্ন ও উত্তর ব্রাউজারে থাকে, তাই এটি বন্ধুত্বপূর্ণ প্রতিযোগিতা (সম্মানের ভিত্তিতে)। সার্ভার শুধু সীমা মানায়:
       প্রতিজন প্রতিদিন একবার, ১০ প্রশ্ন, আজ বা গতকালের তারিখ (ঢাকার সময়), পয়েন্ট সার্ভারেই হিসাব হয়। */
    if (m === 'POST' && p === '/api/c/game/daily') {
      const b = await readBody(req, 2000), today = dhakaDay(now()), yest = dhakaDay(now() - 86400000);
      const day = str(b.day, 12), correct = Math.floor(+b.correct), total = Math.floor(+b.total), ms = Math.max(0, Math.min(3600000, Math.floor(+b.ms) || 0));
      if (day !== today && day !== yest) throw bad('এই তারিখের কুইজ আর জমা নেওয়া হবে না');
      if (total !== 10 || !(correct >= 0 && correct <= 10)) throw bad('ফলাফল ঠিক নয়');
      if (limited('gm:' + u.id, 20, 3600000)) throw bad('একটু পরে চেষ্টা করুন', 429);
      const dd = C.game.days[day] || (C.game.days[day] = {});
      if (dd[u.id]) return send(res, 200, { ok: true, already: true, rec: dd[u.id] });
      const pts = warPts(correct, total, ms), rec = { pts, c: correct, t: total, ms, b: u.batch, ts: now() };
      dd[u.id] = rec;
      const t = C.game.tot[u.id] || (C.game.tot[u.id] = {}), tb = t[u.batch] || (t[u.batch] = { pts: 0, days: 0, c: 0 });
      tb.pts += pts; tb.days += 1; tb.c += correct;
      const lvl = Math.max(1, Math.min(10, Math.floor(+b.lvl) || 1)), badges = (Array.isArray(b.badges) ? b.badges : []).filter(x => typeof x === 'string' && /^[a-z0-9]{2,12}$/.test(x)).slice(0, 40);
      C.game.prof[u.id] = { lvl, badges };
      Object.keys(C.game.days).forEach(k => { if (k < dhakaDay(now() - 70 * 86400000)) delete C.game.days[k]; });   // পুরনো দিনের খুঁটিনাটি মুছি, মোট (tot) থাকে
      save(); return send(res, 200, { ok: true, pts, rec });
    }
    if (m === 'GET' && p === '/api/c/game/war') {
      const scope = url.searchParams.get('scope') === 'all' ? 'all' : 'week', today = dhakaDay(now());
      const last7 = []; for (let i = 6; i >= 0; i--) last7.push(dhakaDay(now() - i * 86400000));
      const active = new Map(C.users.filter(x => x.status === 'active').map(x => [x.id, x]));
      const B = {}, bat = k => B[k] || (B[k] = { batch: k, size: 0, players: 0, pts: 0, correct: 0, answered: 0 });
      cs().batches.forEach(k => bat(k)); active.forEach(x => { bat(x.batch).size++; });
      const per = new Map();   // uid -> {pts, days, b}
      const add = (uid, b, pts, days, c) => { const x = active.get(uid); if (!x) return; const e = per.get(uid) || { uid, pts: 0, days: 0, b }; e.pts += pts; e.days += days; per.set(uid, e); const t = bat(b); t.pts += pts; t.correct += c; t.answered += 10 * days; };
      if (scope === 'week') last7.forEach(d => { const dd = C.game.days[d] || {}; Object.keys(dd).forEach(k => add(+k, dd[k].b, dd[k].pts, 1, dd[k].c)); });
      else Object.keys(C.game.tot).forEach(k => { const t = C.game.tot[k]; Object.keys(t).forEach(b => add(+k, b, t[b].pts, t[b].days, t[b].c)); });
      const seen = {}; per.forEach(e => { const key = e.b + '|' + e.uid; if (!seen[key]) { seen[key] = 1; bat(e.b).players++; } });
      const batches = Object.values(B).filter(x => x.size || x.players).map(x => ({ ...x, avg: x.players ? Math.round(x.pts / x.players * 10) / 10 : 0, acc: x.answered ? Math.round(x.correct / x.answered * 100) : 0 })).sort((a, b) => b.pts - a.pts);
      const daily = last7.map(d => { const dd = C.game.days[d] || {}, o = { day: d, by: {}, n: {} }; Object.keys(dd).forEach(k => { if (active.has(+k)) { o.by[dd[k].b] = (o.by[dd[k].b] || 0) + dd[k].pts; o.n[dd[k].b] = (o.n[dd[k].b] || 0) + 1; } }); return o; });
      const ranked = [...per.values()].sort((a, b) => b.pts - a.pts || b.days - a.days);
      const row = (e, i) => { const x = active.get(e.uid), g = C.game.prof[e.uid] || {}; return { rank: i + 1, id: x.id, name: priv(x).directory || x.id === u.id ? x.name : 'গোপন সদস্য', batch: e.b, pts: e.pts, days: e.days, lvl: g.lvl || 1, badges: (g.badges || []).length, me: x.id === u.id }; };
      const mineIdx = ranked.findIndex(e => e.uid === u.id), td = (C.game.days[today] || {})[u.id] || null;
      return send(res, 200, { scope, today, doneToday: !!td, mineToday: td, batches, daily, top: ranked.slice(0, 10).map(row), mine: mineIdx >= 0 ? row(ranked[mineIdx], mineIdx) : null, myBatch: u.batch, players: ranked.length }, { 'Cache-Control': 'no-store' });
    }
    throw bad('অজানা API', 404);
  }
  return { handle, flush: () => { flush(); jobs.flush(); }, jobsStart: jobs.start };
};
