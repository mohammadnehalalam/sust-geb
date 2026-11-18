'use strict';
/* জব সেক্টর: চাকরি, ইন্টার্নশিপ, রিসার্চ/RA ও স্কলারশিপের সার্কুলার।
   ডেটা: data/jobs.json (ডিপার্টমেন্ট-স্কেলের জন্য যথেষ্ট; অটো-ব্যাকআপে আপনিই আসে)।
   তিন উপায়ে সার্কুলার আসে:
   ১) সদস্য লিংকসহ জমা দেন → মডারেটর/অ্যাডমিন অনুমোদন দিলে সবাই দেখে (মডারেটরের নিজের জমা সরাসরি চালু)
   ২) অ্যাডমিন সরাসরি যোগ করেন
   ৩) অ্যাডমিন যেকোনো RSS/Atom ফিডের লিংক দিলে নিজে থেকে নতুন সার্কুলার আনে (ফিড-প্রতি কীওয়ার্ড ফিল্টার, ডিফল্টে "অনুমোদনের অপেক্ষায়")
   Bdjobs-এর মতো সাইটের HTML স্ক্র্যাপ করা হয় না: ওদের পাবলিক API/RSS নেই, স্ক্র্যাপ করা তাদের শর্তবিরোধী ও ঠুনকো। সার্কুলারের লিংক সবসময় মূল সাইটে যায়,
   আমরা শুধু শিরোনাম, সংস্থা, শেষ তারিখ আর লিংক রাখি (ফিড থেকে আসলে ছোট সারাংশ), মূল লেখা কপি করি না।
   কোনো npm প্যাকেজ লাগে না। */
const fs = require('fs'), path = require('path'), dns = require('dns'), net = require('net'), http = require('http'), https = require('https');

const TYPES = { job: 'চাকরি', internship: 'ইন্টার্নশিপ', research: 'রিসার্চ / RA', scholarship: 'স্কলারশিপ / ফেলোশিপ' };
const CATS = { research: 'রিসার্চ ও ল্যাব', pharma: 'ফার্মা ও ইন্ডাস্ট্রি', academic: 'শিক্ষকতা ও একাডেমিক', health: 'হেলথ ও ডায়াগনস্টিক', agri: 'কৃষি ও ফুড', govt: 'সরকারি / NGO', other: 'অন্যান্য' };
const WHERE = { bd: 'বাংলাদেশ', abroad: 'বিদেশ' };
const MAX_JOBS = 3000, PAGE = 24, DAY = 86400000;

/* ---------- হেল্পার ---------- */
const dhakaDay = ts => new Date(ts + 6 * 3600000).toISOString().slice(0, 10);
const dayNum = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAY : NaN; };
function dateOk(s) { if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false; const d = new Date(s + 'T00:00:00Z'); return !isNaN(d) && d.toISOString().slice(0, 10) === s && +s.slice(0, 4) >= 2020 && +s.slice(0, 4) <= 2100; }
const TRACK = /^(utm_[a-z]+|fbclid|gclid|mc_cid|mc_eid|igshid|ref_src)$/i;
/* লিংক সাফ: শুধু http/https, ইউজার-পাসওয়ার্ড নেই, ট্র্যাকিং প্যারামিটার বাদ, # বাদ */
function normLink(raw) {
  let u; try { u = new URL(String(raw || '').trim()); } catch (_) { return ''; }
  if (!/^https?:$/.test(u.protocol) || u.username || u.password || !u.hostname.includes('.')) return '';
  u.hash = ''; u.hostname = u.hostname.toLowerCase();
  [...u.searchParams.keys()].forEach(k => { if (TRACK.test(k)) u.searchParams.delete(k); });
  let s = u.toString(); if (u.pathname.length > 1 && s.endsWith('/') && !u.search) s = s.slice(0, -1);
  return s.length <= 500 ? s : '';
}
const hostOf = l => { try { return new URL(l).hostname.replace(/^www\./, ''); } catch (_) { return ''; } };
/* Google Alerts-এর লিংক google.com/url?url=আসল... আসলটা বের করি */
function unwrapGoogle(l) { try { const u = new URL(l); if (/(^|\.)google\.[a-z.]+$/.test(u.hostname) && u.pathname === '/url') { const t = u.searchParams.get('url') || u.searchParams.get('q'); if (t) return t; } } catch (_) { } return l; }

/* ---------- RSS / Atom পার্সার (ছোট, নির্ভরতা ছাড়া) ---------- */
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = s => String(s || '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => { if (e[0] === '#') { const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ''; } return ENT[e.toLowerCase()] !== undefined ? ENT[e.toLowerCase()] : m; });
const stripTags = s => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
/* ফিডের লেখা কখনো এক, কখনো দুবার escape করা থাকে: দুই ধাপে entity খুলে ও ট্যাগ ছেঁটে সাদা লেখা বানাই */
const plain = s => stripTags(decode(stripTags(decode(s))));
function tag(block, name) {
  const re = new RegExp('<' + name.replace(':', '\\:') + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + name.replace(':', '\\:') + '>', 'i'), m = re.exec(block); if (!m) return '';
  return m[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1');
}
function parseFeed(xml) {
  const items = [], blocks = String(xml).match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) || [];
  for (const b of blocks.slice(0, 150)) {
    let link = '';
    const alt = [...b.matchAll(/<link\b([^>]*)>/gi)].map(m => m[1]).find(a => /href=/i.test(a) && (!/rel=/i.test(a) || /rel=["']alternate["']/i.test(a)));
    if (alt) link = decode((/href=["']([^"']+)["']/i.exec(alt) || [])[1] || '');
    if (!link) link = decode(stripTags(tag(b, 'link'))).trim();
    if (!link) { const g = decode(stripTags(tag(b, 'guid') || tag(b, 'id'))).trim(); if (/^https?:\/\//i.test(g)) link = g; }
    const title = plain(tag(b, 'title')), dateRaw = (tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date')).trim();
    const desc = plain(tag(b, 'description') || tag(b, 'summary') || tag(b, 'content:encoded') || tag(b, 'content')), t = Date.parse(dateRaw);
    if (title && link) items.push({ title, link, desc, ts: Number.isFinite(t) ? t : 0 });
  }
  return items;
}

/* ---------- নিরাপদ ফিড ডাউনলোড (SSRF ঠেকাতে) ---------- */
function isPrivateIp(ip) {
  if (net.isIPv4(ip)) { const [a, b] = ip.split('.').map(Number); return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224; }
  if (net.isIPv6(ip)) { const l = ip.toLowerCase(); const m = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(l); if (m) return isPrivateIp(m[1]); return l === '::1' || l === '::' || /^f[cd]/.test(l) || /^fe[89ab]/.test(l); }
  return true;
}
async function resolveAll(host) {
  if (net.isIP(host)) return [{ address: host, family: net.isIP(host) }];
  const r = await dns.promises.lookup(host, { all: true }); if (!r.length) throw new Error('ঠিকানা মেলেনি'); return r;
}
function getOnce(u, addr, maxBytes, timeout) {
  return new Promise((ok, no) => {
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request({ protocol: u.protocol, hostname: u.hostname, port: u.port || undefined, path: u.pathname + u.search, method: 'GET', timeout,
      headers: { 'User-Agent': 'GEBHub-JobFeed/1.0', Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5', 'Accept-Encoding': 'identity' },
      lookup: (h, o, cb) => (o && o.all) ? cb(null, [{ address: addr.address, family: addr.family }]) : cb(null, addr.address, addr.family) }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) { res.resume(); return ok({ redirect: res.headers.location }); }
      if (res.statusCode !== 200) { res.resume(); return no(new Error('সাইট থেকে HTTP ' + res.statusCode + ' এসেছে')); }
      const ch = []; let n = 0;
      res.on('data', c => { n += c.length; if (n > maxBytes) { req.destroy(new Error('ফিড অনেক বড় (১.৫ MB-এর বেশি)')); } else ch.push(c); });
      res.on('end', () => ok({ body: Buffer.concat(ch).toString('utf8') })); res.on('error', no);
    });
    req.on('timeout', () => req.destroy(new Error('সাইট সময়মতো সাড়া দেয়নি'))); req.on('error', no); req.end();
  });
}
async function safeGet(url0, opt) {
  opt = opt || {}; let u; try { u = new URL(url0); } catch (_) { throw new Error('লিংক ঠিক নয়'); }
  for (let i = 0; i <= 3; i++) {
    if (!/^https?:$/.test(u.protocol)) throw new Error('শুধু http/https লিংক চলবে'); if (u.username || u.password) throw new Error('লিংকে ইউজার/পাসওয়ার্ড দেওয়া যাবে না');
    const addrs = await resolveAll(u.hostname);
    if (!opt.allowPrivate && addrs.some(a => isPrivateIp(a.address))) throw new Error('এই লিংক সার্ভারের ভেতরের ঠিকানায় যায়, অনুমোদিত নয়');
    const r = await getOnce(u, addrs[0], opt.maxBytes || 1.5 * 1024 * 1024, opt.timeout || 15000);
    if (r.redirect) { u = new URL(r.redirect, u); continue; } return r.body;
  }
  throw new Error('অনেকবার রিডাইরেক্ট');
}

/* ---------- মডিউল ---------- */
module.exports = function (env) {
  const { send, readBody, bad, str } = env, DATA = env.DATA, now = () => Date.now();
  const FILE = path.join(DATA, 'jobs.json'), log = env.log || console.log;
  const allowPrivate = process.env.JOBS_ALLOW_PRIVATE_FEEDS === '1';   // শুধু লোকাল টেস্টের জন্য
  const EVERY_H = Math.max(1, Math.min(168, Number(process.env.JOBS_FEED_EVERY_HOURS) || 6));
  let J = { jobs: [], feeds: [], meta: { nextId: 1 } };
  try { J = Object.assign(J, JSON.parse(fs.readFileSync(FILE, 'utf8'))); } catch (_) { }
  J.jobs = J.jobs || []; J.feeds = J.feeds || []; J.meta = J.meta || { nextId: 1 };
  let timer = null; const save = () => { clearTimeout(timer); timer = setTimeout(flush, 250); };
  function flush() { clearTimeout(timer); const tmp = FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(J)); fs.renameSync(tmp, FILE); }
  const nid = () => J.meta.nextId++;
  const cleanText = env.cleanText || ((v, max) => str(v, max + 50).replace(/\r/g, '').trim().slice(0, max));
  const oneLine = (v, max) => cleanText(v, max).replace(/\s+/g, ' ');

  /* ---- দৃশ্যমানতা ---- */
  const FEED_FRESH_DAYS = 45;
  function expired(j, today) {
    if (j.deadline) return j.deadline < today;
    return now() - j.created > FEED_FRESH_DAYS * DAY;
  }
  const liveJob = (j, today) => j.status === 'approved' && !expired(j, today);

  /* ---- আউটপুট ---- */
  function out(j, v, today) {
    const mine = !!v && j.uid === v.id, mod = !!v && env.isMod(v), left = j.deadline ? Math.round(dayNum(j.deadline) - dayNum(today)) : null;
    return { id: j.id, title: j.title, org: j.org, loc: j.loc, where: j.where, type: j.type, cat: j.cat, deadline: j.deadline, left, link: j.link, host: hostOf(j.link), note: j.note, source: j.source || '', feed: !!j.feedId,
      created: j.created, status: j.status, reason: mine || mod ? (j.reason || '') : '', flagged: mod && (j.rep || []).length > 0, expired: expired(j, today), mine, canDelete: mine || mod, by: j.uid ? (env.userBrief(j.uid) || { name: 'মুছে ফেলা সদস্য' }).name : '' };
  }
  function clean(b, o) {
    const title = oneLine(b.title, 150), link = normLink(b.link);
    if (title.length < 4) throw bad('শিরোনাম দিন (অন্তত ৪ অক্ষর)'); if (!link) throw bad('আবেদনের লিংক দিন (https://… দিয়ে শুরু, ঠিক ঠিকানা)');
    const deadline = str(b.deadline, 12).trim(); if (deadline && !dateOk(deadline)) throw bad('শেষ তারিখ ঠিক নয় (YYYY-MM-DD)');
    return { title, org: oneLine(b.org, 100), loc: oneLine(b.loc, 80), where: WHERE[b.where] ? b.where : 'bd', type: TYPES[b.type] ? b.type : 'job', cat: CATS[b.cat] ? b.cat : 'other', deadline, link, note: cleanText(b.note, 400) };
  }
  const dupLink = (link, exceptId) => J.jobs.some(x => x.id !== exceptId && x.status !== 'rejected' && normLink(x.link) === link);
  function prune() {
    const t = now(), today = dhakaDay(t), old = J.jobs.length;
    J.jobs = J.jobs.filter(j => {
      if (j.status === 'rejected') return t - (j.reviewed || j.created) < 14 * DAY;
      if (j.deadline) return dayNum(today) - dayNum(j.deadline) <= 60;
      return t - j.created < 90 * DAY;
    });
    if (J.jobs.length > MAX_JOBS) { const keep = J.jobs.filter(j => !j.feedId); const feedItems = J.jobs.filter(j => j.feedId).sort((a, b) => b.created - a.created).slice(0, Math.max(0, MAX_JOBS - keep.length)); J.jobs = keep.concat(feedItems); }
    if (J.jobs.length !== old) save();
  }

  /* ---- তালিকা ---- */
  function list(v, q) {
    const today = dhakaDay(now()), mod = !!v && env.isMod(v);
    let items; const scope = ['all', 'mine', 'pending'].includes(q.scope) ? q.scope : 'all';
    if (q.ids) { const ids = new Set(String(q.ids).split(',').map(Number).filter(Boolean).slice(0, 100)); items = J.jobs.filter(j => ids.has(j.id) && j.status === 'approved'); }
    else if (scope === 'mine') { if (!v) throw bad('লগইন দরকার', 401); items = J.jobs.filter(j => j.uid === v.id); }
    else if (scope === 'pending') { if (!mod) throw bad('শুধু মডারেটর', 403); items = J.jobs.filter(j => j.status === 'pending'); }
    else items = J.jobs.filter(j => liveJob(j, today));
    if (!q.ids && scope === 'all') {
      if (TYPES[q.type]) items = items.filter(j => j.type === q.type); if (CATS[q.cat]) items = items.filter(j => j.cat === q.cat); if (WHERE[q.where]) items = items.filter(j => j.where === q.where);
      const w = Math.floor(Number(q.within)); if (w > 0) items = items.filter(j => j.deadline && dayNum(j.deadline) - dayNum(today) <= w);
    }
    const s = String(q.q || '').trim().toLowerCase().slice(0, 60); if (s) items = items.filter(j => (j.title + ' ' + j.org + ' ' + j.loc + ' ' + j.note).toLowerCase().includes(s));
    if (q.sort === 'new' || scope !== 'all') items = items.slice().sort((a, b) => b.created - a.created);
    else items = items.slice().sort((a, b) => (a.deadline && b.deadline) ? (a.deadline < b.deadline ? -1 : a.deadline > b.deadline ? 1 : b.created - a.created) : a.deadline ? -1 : b.deadline ? 1 : b.created - a.created);
    const off = Math.max(0, Math.floor(Number(q.off)) || 0), page = items.slice(off, off + PAGE);
    return { jobs: page.map(j => out(j, v, today)), total: items.length, more: off + PAGE < items.length, pending: mod ? J.jobs.filter(j => j.status === 'pending').length : 0, canReview: mod, types: TYPES, cats: CATS, where: WHERE, today };
  }

  /* ---- সদস্যদের API (v = লগইন করা সদস্য বা null) ---- */
  async function handle(req, res, url, v) {
    const m = req.method, p = url.pathname, NS = { 'Cache-Control': 'no-store' }, q = Object.fromEntries(url.searchParams);
    if (p === '/api/c/jobs' && m === 'GET') return send(res, 200, list(v, q), NS);
    if (!v) return send(res, 401, { error: 'লগইন দরকার' });
    if (p === '/api/c/jobs' && m === 'POST') {
      if (env.limited('jb:' + v.id, env.isMod(v) ? 60 : 10, DAY)) throw bad('আজকের জন্য অনেকগুলো জমা হয়ে গেছে, কাল আবার চেষ্টা করুন', 429);
      const b = await readBody(req, 6000), c = clean(b); if (dupLink(c.link)) throw bad('এই লিংকের সার্কুলার আগেই আছে', 409);
      if (J.jobs.length >= MAX_JOBS) throw bad('সার্কুলারের তালিকা এখন ভরা, পরে চেষ্টা করুন', 503);
      const mod = env.isMod(v), j = Object.assign({ id: nid(), uid: v.id, source: '', status: mod ? 'approved' : 'pending', created: now(), rep: [] }, c); J.jobs.push(j); save();
      return send(res, 201, { ok: true, job: out(j, v, dhakaDay(now())) }, NS);
    }
    let mt;
    if ((mt = p.match(/^\/api\/c\/jobs\/(\d+)$/)) && m === 'DELETE') {
      const j = J.jobs.find(x => x.id === +mt[1]); if (!j) throw bad('পাওয়া যায়নি', 404); if (j.uid !== v.id && !env.isMod(v)) throw bad('অনুমতি নেই', 403);
      J.jobs = J.jobs.filter(x => x !== j); save(); return send(res, 200, { ok: true });
    }
    if ((mt = p.match(/^\/api\/c\/jobs\/(\d+)\/review$/)) && m === 'POST') {
      if (!env.isMod(v)) throw bad('শুধু মডারেটর', 403);
      const j = J.jobs.find(x => x.id === +mt[1]); if (!j) throw bad('পাওয়া যায়নি', 404); const b = await readBody(req, 1000);
      if (b.action === 'approve') { j.status = 'approved'; j.reason = ''; j.rep = []; j.reviewed = now(); if (j.uid) env.notify(j.uid, 'আপনার জমা দেওয়া সার্কুলার অনুমোদিত হয়েছে: ' + j.title, 0, 'jobs'); }
      else if (b.action === 'reject') { j.status = 'rejected'; j.reason = oneLine(b.reason, 200); j.reviewed = now(); if (j.uid) env.notify(j.uid, 'আপনার সার্কুলার নেওয়া হয়নি: ' + j.title + (j.reason ? ' (' + j.reason + ')' : ''), 0, 'jobs'); }
      else throw bad('action ঠিক নয়');
      save(); return send(res, 200, { ok: true });
    }
    if ((mt = p.match(/^\/api\/c\/jobs\/(\d+)\/report$/)) && m === 'POST') {
      const j = J.jobs.find(x => x.id === +mt[1] && x.status === 'approved'); if (!j) throw bad('পাওয়া যায়নি', 404);
      if (env.limited('jr:' + v.id, 30, DAY)) throw bad('একটু পরে চেষ্টা করুন', 429);
      j.rep = j.rep || []; if (!j.rep.includes(v.id)) j.rep.push(v.id);
      if (j.rep.length >= 3) { j.status = 'pending'; j.reason = ''; }   // ৩ জন রিপোর্ট করলে আবার মডারেটরের যাচাইয়ে যায়
      save(); return send(res, 200, { ok: true });
    }
    throw bad('অজানা API', 404);
  }

  /* ---- ফিড আনা ---- */
  const cleanFeed = (b, old) => {
    const name = oneLine(b.name, 60), url = String(b.url || '').trim().slice(0, 500);
    if (!name) throw bad('ফিডের একটি নাম দিন'); let u; try { u = new URL(url); } catch (_) { throw bad('ফিডের লিংক ঠিক নয়'); } if (!/^https?:$/.test(u.protocol)) throw bad('শুধু http/https লিংক');
    const kw = (Array.isArray(b.keywords) ? b.keywords : String(b.keywords || '').split(/[,\n]/)).map(x => oneLine(x, 40).toLowerCase()).filter(Boolean).slice(0, 30);
    return { name, url: u.toString(), enabled: b.enabled !== false, auto: b.auto === 'approve' ? 'approve' : 'pending', where: WHERE[b.where] ? b.where : 'bd', type: TYPES[b.type] ? b.type : 'job', cat: CATS[b.cat] ? b.cat : 'other', keywords: kw, max: Math.max(1, Math.min(100, Math.floor(Number(b.max)) || 30)) };
  };
  let feedBusy = false;
  async function runFeed(f) {
    f.lastRun = now(); f.lastErr = ''; f.lastNew = 0; f.lastSeen = 0;
    try {
      const xml = await safeGet(f.url, { allowPrivate }), items = parseFeed(xml); f.lastSeen = items.length;
      if (!items.length) throw new Error('ফিডে কোনো সার্কুলার পাওয়া যায়নি (RSS/Atom তো?)');
      const have = new Set(J.jobs.map(j => normLink(j.link))); let n = 0; const cutoff = now() - FEED_FRESH_DAYS * DAY;
      for (const it of items) {
        if (n >= f.max) break; const link = normLink(unwrapGoogle(it.link)); if (!link || have.has(link)) continue;
        if (it.ts && it.ts < cutoff) continue;
        if (f.keywords.length) { const hay = (it.title + ' ' + it.desc).toLowerCase(); if (!f.keywords.some(k => hay.includes(k))) continue; }
        if (J.jobs.length >= MAX_JOBS) break;
        J.jobs.push({ id: nid(), uid: 0, feedId: f.id, source: f.name, title: it.title.slice(0, 150), org: '', loc: '', where: f.where, type: f.type, cat: f.cat, deadline: '', link, note: it.desc.slice(0, 200), status: f.auto === 'approve' ? 'approved' : 'pending', created: Math.min(now(), it.ts || now()), rep: [] });
        have.add(link); n++;
      }
      f.lastNew = n; f.lastOk = now();
    } catch (e) { f.lastErr = String(e.message || e).slice(0, 200); log('জব ফিড ব্যর্থ (' + f.name + '): ' + f.lastErr); }
    save();
  }
  async function runDue(force) {
    if (feedBusy) return; feedBusy = true;
    try { for (const f of J.feeds) if (f.enabled && (force || now() - (f.lastRun || 0) >= EVERY_H * 3600000)) await runFeed(f); prune(); }
    finally { feedBusy = false; }
  }
  function start() { setTimeout(() => runDue(false).catch(() => { }), 90000).unref(); const t = setInterval(() => runDue(false).catch(() => { }), 30 * 60000); t.unref(); }

  /* ---- অ্যাডমিন API ---- */
  const feedOut = f => ({ id: f.id, name: f.name, url: f.url, enabled: f.enabled, auto: f.auto, where: f.where, type: f.type, cat: f.cat, keywords: f.keywords, max: f.max, lastRun: f.lastRun || 0, lastOk: f.lastOk || 0, lastErr: f.lastErr || '', lastNew: f.lastNew || 0, lastSeen: f.lastSeen || 0, count: J.jobs.filter(j => j.feedId === f.id).length });
  async function admin(req, res, url) {
    const m = req.method, p = url.pathname, NS = { 'Cache-Control': 'no-store' }; let mt;
    if (p === '/api/admin/c/jobs' && m === 'GET') {
      const st = url.searchParams.get('status') || '', today = dhakaDay(now()), items = J.jobs.filter(j => !st || j.status === st).sort((a, b) => b.created - a.created).slice(0, 400);
      return send(res, 200, { jobs: items.map(j => Object.assign(out(j, null, today), { uid: j.uid, feedId: j.feedId || 0 })), total: J.jobs.length, pending: J.jobs.filter(j => j.status === 'pending').length, types: TYPES, cats: CATS, where: WHERE, feeds: J.feeds.map(feedOut), everyHours: EVERY_H }, NS);
    }
    if (p === '/api/admin/c/jobs' && m === 'POST') {
      const c = clean(await readBody(req, 6000)); if (dupLink(c.link)) throw bad('এই লিংকের সার্কুলার আগেই আছে', 409);
      const j = Object.assign({ id: nid(), uid: 0, source: 'অ্যাডমিন', status: 'approved', created: now(), rep: [] }, c); J.jobs.push(j); save(); return send(res, 201, { ok: true, id: j.id });
    }
    if ((mt = p.match(/^\/api\/admin\/c\/jobs\/(\d+)$/))) {
      const j = J.jobs.find(x => x.id === +mt[1]); if (!j) throw bad('পাওয়া যায়নি', 404);
      if (m === 'DELETE') { J.jobs = J.jobs.filter(x => x !== j); save(); return send(res, 200, { ok: true }); }
      if (m === 'PUT') {
        const b = await readBody(req, 6000);
        if (b.title !== undefined || b.link !== undefined) { const c = clean(Object.assign({}, j, b)); if (dupLink(c.link, j.id)) throw bad('এই লিংকের সার্কুলার আগেই আছে', 409); Object.assign(j, c); }
        if (['approved', 'pending', 'rejected'].includes(b.status)) { j.status = b.status; j.reviewed = now(); if (b.status === 'approved') j.rep = []; }
        save(); return send(res, 200, { ok: true });
      }
    }
    if (p === '/api/admin/c/jobs/prune' && m === 'POST') { prune(); return send(res, 200, { ok: true, total: J.jobs.length }); }
    if (p === '/api/admin/c/jobs/feeds' && m === 'POST') {
      if (J.feeds.length >= 20) throw bad('সর্বোচ্চ ২০টি ফিড'); const f = Object.assign({ id: nid() }, cleanFeed(await readBody(req, 4000))); J.feeds.push(f); save(); return send(res, 201, { ok: true, id: f.id });
    }
    if (p === '/api/admin/c/jobs/feeds/run' && m === 'POST') { await runDue(true); return send(res, 200, { ok: true, feeds: J.feeds.map(feedOut) }); }
    if ((mt = p.match(/^\/api\/admin\/c\/jobs\/feeds\/(\d+)(?:\/(run))?$/))) {
      const f = J.feeds.find(x => x.id === +mt[1]); if (!f) throw bad('ফিড পাওয়া যায়নি', 404);
      if (m === 'DELETE') { J.feeds = J.feeds.filter(x => x !== f); if (url.searchParams.get('items') === '1') J.jobs = J.jobs.filter(j => j.feedId !== f.id); save(); return send(res, 200, { ok: true }); }
      if (m === 'PUT') { Object.assign(f, cleanFeed(Object.assign({}, f, await readBody(req, 4000)))); save(); return send(res, 200, { ok: true }); }
      if (m === 'POST' && mt[2] === 'run') { if (feedBusy) throw bad('আরেকটি ফিড আনা চলছে', 409); feedBusy = true; try { await runFeed(f); } finally { feedBusy = false; } return send(res, 200, { ok: !f.lastErr, feed: feedOut(f) }); }
    }
    throw bad('অজানা API', 404);
  }
  const dropUser = uid => { J.jobs = J.jobs.filter(j => !(j.uid === uid && j.status !== 'approved')); J.jobs.forEach(j => { if (j.uid === uid) j.uid = 0; }); save(); };
  const pendingCount = () => J.jobs.filter(j => j.status === 'pending').length;
  prune();
  return { handle, admin, flush, start, dropUser, pendingCount, _runFeed: runFeed, _data: () => J };
};
Object.assign(module.exports, { parseFeed, normLink, isPrivateIp, safeGet, unwrapGoogle, dateOk, TYPES, CATS });
