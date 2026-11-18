'use strict';
/* অ্যাকাউন্ট সিঙ্ক (ঐচ্ছিক): লগইন করা সদস্যের ব্রাউজারের ডেটা (প্ল্যানার, ভুল খাতা, নোটবুক, গেম, ইত্যাদি) সার্ভারে রাখে,
   যাতে ফোন বদলালে বা ব্রাউজার ক্লিয়ার করলেও ফেরত পাওয়া যায়।
   - সদস্য নিজে চালু করলে তবেই ব্রাউজার থেকে ডেটা আসে (public/sync.js)।
   - ডেটা: data/sync/u<id>.json, প্রতি সদস্যের একটি ফাইল (data/ ফোল্ডারের অটো-ব্যাকআপে আপনিই আসে)।
   - প্রতিটি key-র একটি সংস্করণ (v) থাকে; PUT-এ base মিলতে হয়, নইলে 409 ও সার্ভারের বর্তমান ডেটা ফেরত যায় (মার্জ ব্রাউজারে হয়)।
   - শুধু ওই সদস্য নিজের ডেটা পড়তে পারে। অ্যাডমিন সার্ভারের ফাইলে চাইলে দেখতে পারেন। */
const fs = require('fs'), path = require('path');

/* key -> ধরন (arr/obj)। public/sync-core.js-এর KEYS-এর সাথে মিল রাখুন। */
const KEYS = { geb_hist: 'arr', geb_wrong: 'arr', geb_stars: 'arr', geb_grades: 'obj', geb_saved: 'arr', geb_planner_v1: 'obj', geb_notebook_v1: 'obj', geb_game_v1: 'obj', geb_vlab_v1: 'obj', geb_dx_v1: 'obj', geb_jobs_saved: 'arr' };
const MAX_KEY = 4 * 1024 * 1024, MAX_TOTAL = 8 * 1024 * 1024, PUT_PER_HOUR = 240;

module.exports = function (env) {
  const { send, readBody, bad } = env;
  const DIR = path.join(env.DATA, 'sync'); try { fs.mkdirSync(DIR, { recursive: true }); } catch (_) {}
  const file = uid => path.join(DIR, 'u' + (Number(uid) | 0) + '.json');
  const now = () => Date.now();
  function read(uid) { try { const d = JSON.parse(fs.readFileSync(file(uid), 'utf8')); if (d && typeof d.keys === 'object') return d; } catch (_) {} return { keys: {} }; }
  function write(uid, doc) { const f = file(uid), tmp = f + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(doc)); fs.renameSync(tmp, f); }
  const total = (doc, except) => Object.keys(doc.keys).reduce((a, k) => a + (k === except ? 0 : doc.keys[k].size || 0), 0);

  const hits = new Map();
  function limited(uid) { const t = now(), l = (hits.get(uid) || []).filter(x => t - x < 3600000); if (l.length >= PUT_PER_HOUR) { hits.set(uid, l); return true; } l.push(t); hits.set(uid, l); return false; }
  setInterval(() => { const t = now(); hits.forEach((l, k) => { const f = l.filter(x => t - x < 3600000); f.length ? hits.set(k, f) : hits.delete(k); }); }, 600000).unref();

  async function handle(req, res, url, u) {
    const m = req.method, p = url.pathname, NS = { 'Cache-Control': 'no-store' };
    if (p === '/api/c/sync') {
      if (m === 'GET') {
        const doc = read(u.id), keys = {};
        Object.keys(doc.keys).forEach(k => { if (KEYS[k]) keys[k] = { v: doc.keys[k].v, ts: doc.keys[k].ts, size: doc.keys[k].size }; });
        return send(res, 200, { keys, total: total(doc), max: { key: MAX_KEY, total: MAX_TOTAL } }, NS);
      }
      if (m === 'DELETE') { try { fs.unlinkSync(file(u.id)); } catch (_) {} return send(res, 200, { ok: true }, NS); }
      throw bad('অজানা API', 404);
    }
    const mt = p.match(/^\/api\/c\/sync\/([a-z0-9_]{3,40})$/), key = mt && mt[1];
    if (!key || !KEYS[key]) throw bad('এই ডেটা সিঙ্ক করা যায় না', 404);
    if (m === 'GET') {
      const e = read(u.id).keys[key];
      return send(res, 200, e ? { v: e.v, ts: e.ts, data: e.data } : { v: 0, ts: 0, data: null }, NS);
    }
    if (m === 'PUT') {
      if (limited(u.id)) throw bad('অনেকবার সিঙ্ক হয়েছে, একটু পরে আবার চেষ্টা করুন', 429);
      const b = await readBody(req, MAX_KEY + 65536), base = Math.floor(Number(b.base));
      if (!(base >= 0)) throw bad('base সংস্করণ দরকার');
      const d = b.data, isArr = Array.isArray(d);
      if (d === null || typeof d !== 'object' || (KEYS[key] === 'arr') !== isArr) throw bad('ডেটার ধরন ঠিক নয়');
      const size = Buffer.byteLength(JSON.stringify(d));
      if (size > MAX_KEY) throw bad('এই ডেটা সিঙ্কের জন্য বেশি বড় (সর্বোচ্চ ৪ MB)। নোটবুকের ছবি কমান বা পুরনো এন্ট্রি মুছুন।', 413);
      const doc = read(u.id), cur = doc.keys[key] || { v: 0 };
      if (cur.v !== base) return send(res, 409, { error: 'অন্য ডিভাইসে ডেটা বদলেছে', conflict: true, v: cur.v, ts: cur.ts || 0, data: cur.data === undefined ? null : cur.data }, NS);
      if (total(doc, key) + size > MAX_TOTAL) throw bad('সিঙ্কের মোট জায়গা (৮ MB) ভরে গেছে। বড় ডেটা (যেমন নোটবুকের ছবি) কমান।', 413);
      doc.keys[key] = { v: cur.v + 1, ts: now(), size, data: d }; write(u.id, doc);
      return send(res, 200, { ok: true, v: doc.keys[key].v, ts: doc.keys[key].ts }, NS);
    }
    throw bad('অজানা API', 404);
  }
  const remove = uid => { try { fs.unlinkSync(file(uid)); } catch (_) {} };
  return { handle, remove, KEYS };
};
module.exports.KEYS = KEYS;
