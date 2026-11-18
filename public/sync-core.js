/* অ্যাকাউন্ট সিঙ্কের হিসাব (DOM ছাড়া, Node-এ টেস্ট করা যায়: node sync-test.js)।
   এখানে আছে: কোন key সিঙ্ক হয়, হ্যাশ, আর দুই ডিভাইসের ডেটা মেলানোর (merge) নিয়ম।
   মূল নীতি: মার্জে কিছু হারায় না। বাড়ে এমন জিনিস (XP, স্কোর, ব্যাজ) বেশিটা, তালিকা হলে দুই দিকের মিলিয়ে।
   সীমা: দুই ডিভাইসে একই সময়ে বদলালে (মার্জের পথে) কিছু মুছে ফেলা জিনিস ফিরে আসতে পারে। মোছা তখনই ছড়ায় যখন একটি ডিভাইসেই বদল হয়েছে। */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); else root.GEBSyncCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  /* key -> ধরন (arr/obj)। সার্ভারের usersync.js-এর KEYS-এর সাথে মিল রাখুন। */
  const KEYS = { geb_hist: 'arr', geb_wrong: 'arr', geb_stars: 'arr', geb_grades: 'obj', geb_saved: 'arr', geb_planner_v1: 'obj', geb_notebook_v1: 'obj', geb_game_v1: 'obj', geb_vlab_v1: 'obj', geb_dx_v1: 'obj', geb_jobs_saved: 'arr' };
  const LABEL = { geb_hist: 'পরীক্ষার ইতিহাস', geb_wrong: 'ভুল খাতা', geb_stars: 'তারা দেওয়া প্রশ্ন', geb_grades: 'GPA (গ্রেড)', geb_saved: 'GPA (সেভ করা সেমিস্টার)', geb_planner_v1: 'প্ল্যানার', geb_notebook_v1: 'ল্যাব নোটবুক', geb_game_v1: 'গেম জোন', geb_vlab_v1: 'ভার্চুয়াল ল্যাব', geb_dx_v1: 'ডায়াগনস্টিক ল্যাব', geb_jobs_saved: 'সেভ করা সার্কুলার' };

  const jclone = x => JSON.parse(JSON.stringify(x));
  const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  /* চাবির ক্রম নির্বিশেষে একই লেখা */
  function canon(x) {
    if (Array.isArray(x)) return '[' + x.map(canon).join(',') + ']';
    if (isObj(x)) return '{' + Object.keys(x).sort().map(k => JSON.stringify(k) + ':' + canon(x[k])).join(',') + '}';
    return JSON.stringify(x === undefined ? null : x);
  }
  /* FNV-1a, দৈর্ঘ্যসহ (বড় লেখার জন্যও দ্রুত) */
  function hash(s) { s = String(s); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return s.length.toString(36) + ':' + (h >>> 0).toString(36); }
  const isEmpty = v => v == null || (Array.isArray(v) ? v.length === 0 : isObj(v) ? Object.keys(v).length === 0 : false);
  const typeOk = (key, v) => KEYS[key] === 'arr' ? Array.isArray(v) : isObj(v);

  /* ---- সাধারণ হেল্পার ---- */
  const unionArr = (a, b) => { const seen = new Set(), out = []; a.concat(b).forEach(x => { const k = canon(x); if (!seen.has(k)) { seen.add(k); out.push(x); } }); return out; };
  const unionObj = (a, b) => Object.assign({}, b || {}, a || {});          // দুই দিকে একই key হলে a (এই ডিভাইস) জেতে
  const maxNum = (a, b) => Math.max(Number(a) || 0, Number(b) || 0);

  /* ---- প্রতিটি key-র নিয়ম ---- */
  function mHist(a, b) {
    const m = new Map(); a.concat(b).forEach(x => { if (!x || typeof x !== 'object') return; const id = x.id || canon(x); if (!m.has(id)) m.set(id, x); });
    return Array.from(m.values()).sort((x, y) => (x.ts || 0) - (y.ts || 0)).slice(-500);
  }
  function mWrong(a, b) {
    const m = new Map(); a.forEach(x => { if (x && x.k) m.set(x.k, x); });
    b.forEach(y => {
      if (!y || !y.k) return; const x = m.get(y.k); if (!x) { m.set(y.k, y); return; }
      const win = (y.last || 0) > (x.last || 0) ? y : x; m.set(y.k, Object.assign({}, win, { wrongCount: Math.max(x.wrongCount || 1, y.wrongCount || 1) }));
    });
    return Array.from(m.values());
  }
  const mStars = unionArr;
  const mGrades = unionObj;
  function mSaved(a, b) { const m = new Map(); a.concat(b).forEach(x => { if (!x) return; const id = (x && x.name) || canon(x); if (!m.has(id)) m.set(id, x); }); return Array.from(m.values()); }

  /* আইটেমের হ্যাশ-তালিকা: তিন-পক্ষের (base) তুলনার জন্য ব্রাউজার শেষ সিঙ্কের সময়ে এটি রাখে */
  function itemHashes(key, v) {
    const o = {}; if (!isObj(v)) return o;
    if (key === 'geb_planner_v1') ['courses', 'slots', 'exams'].forEach(k => (v[k] || []).forEach(x => { if (x && x.id) o[k + ':' + x.id] = hash(canon(x)); }));
    if (key === 'geb_notebook_v1') (v.entries || []).forEach(x => { if (x && x.id) o['e:' + x.id] = hash(canon(x)); });
    return o;
  }
  /* একই id-র আইটেম দুই দিকে আলাদা হলে: কে বদলেছে? base থাকলে জানা যায়। ফেরত: 'local' | 'remote' | 'both' */
  function whoChanged(base, bk, x, y) {
    const bh = base && base[bk]; if (bh === undefined) return 'both';
    const lc = hash(canon(x)) !== bh, rc = hash(canon(y)) !== bh;
    return lc && rc ? 'both' : rc ? 'remote' : 'local';
  }

  function mPlanner(a, b, base) {
    /* কোনো একদিকে শুধু নমুনা রুটিন থাকলে অন্যটিই আসল */
    if (a.sample && !b.sample && (b.courses || []).length) return { ok: true, value: jclone(b) };
    if (b.sample && !a.sample && (a.courses || []).length) return { ok: true, value: jclone(a) };
    const o = jclone(a); ['courses', 'slots', 'exams', 'custom'].forEach(k => { o[k] = o[k] || []; }); o.att = o.att || {}; o.skills = o.skills || {}; o.cv = o.cv || {};
    for (const k of ['courses', 'slots', 'exams']) {
      const idx = new Map(o[k].map((x, i) => [x.id, i]));
      for (const y of (b[k] || [])) {
        if (!y || !y.id) continue; const i = idx.get(y.id);
        if (i === undefined) { o[k].push(jclone(y)); idx.set(y.id, o[k].length - 1); continue; }
        const x = o[k][i]; if (canon(x) === canon(y)) continue;
        const w = whoChanged(base, k + ':' + y.id, x, y);
        if (w === 'remote') o[k][i] = jclone(y); else if (w === 'both') return { ok: false, why: 'planner' };   // একই id, দুই রকম: কোনটা রাখবেন সদস্য ঠিক করবেন
      }
    }
    const names = new Set(o.custom.map(c => c && c.name)); (b.custom || []).forEach(c => { if (c && !names.has(c.name)) o.custom.push(jclone(c)); });
    Object.keys(b.att || {}).forEach(k => { if (!(k in o.att)) o.att[k] = b.att[k]; });
    Object.keys(b.skills || {}).forEach(k => { o.skills[k] = maxNum(o.skills[k], b.skills[k]); });
    Object.keys(b.cv || {}).forEach(k => { if (!o.cv[k] && b.cv[k]) o.cv[k] = b.cv[k]; });
    o.nid = maxNum(a.nid, b.nid) || 1; o.sample = !!(a.sample && b.sample);
    if (typeof o.target !== 'number' && typeof b.target === 'number') o.target = b.target;
    return { ok: true, value: o };
  }

  function mNotebook(a, b, base) {
    const o = jclone(a); o.entries = o.entries || []; o.meta = unionObj(a.meta, b.meta);
    let nid = maxNum(a.nid, b.nid) || 1; const idx = new Map(o.entries.map((e, i) => [e.id, i]));
    (b.entries || []).forEach(y => {
      if (!y || !y.id) return; const i = idx.get(y.id);
      if (i === undefined) { o.entries.push(jclone(y)); idx.set(y.id, o.entries.length - 1); return; }
      const x = o.entries[i]; if (canon(x) === canon(y)) return;
      const w = whoChanged(base, 'e:' + y.id, x, y);
      if (w === 'remote') o.entries[i] = jclone(y);
      else if (w === 'both') { const copy = Object.assign(jclone(y), { id: 'n' + (nid++), title: (y.title || '') + ' (অন্য ডিভাইস)' }); o.entries.push(copy); idx.set(copy.id, o.entries.length - 1); }
    });
    /* নতুন id যেন কোনো পুরনো 'n<সংখ্যা>' id-র সাথে না মেলে */
    o.entries.forEach(e => { const m = /^n(\d+)$/.exec(e.id || ''); if (m && +m[1] >= nid) nid = +m[1] + 1; }); o.nid = nid;
    return { ok: true, value: o };
  }

  function mGame(a, b) {
    const o = jclone(a);
    ['xp', 'sessions', 'correct', 'answered', 'pairs', 'matchPerfect', 'quizBest', 'quizWins', 'quizNoLife', 'warDays'].forEach(k => { o[k] = maxNum(a[k], b[k]); });
    o.days = Array.from(new Set((a.days || []).concat(b.days || []))).sort().slice(-120);
    const earlier = (x, y) => { const t = [x, y].filter(Boolean); return t.length ? Math.min.apply(null, t) : 0; };
    o.badges = Object.assign({}, b.badges || {}, a.badges || {});
    Object.keys(b.badges || {}).forEach(k => { if ((a.badges || {})[k]) o.badges[k] = earlier(a.badges[k], b.badges[k]); });
    o.mutDone = Object.assign({}, b.mutDone || {}, a.mutDone || {});
    Object.keys(b.mutDone || {}).forEach(k => { const x = (a.mutDone || {})[k], y = b.mutDone[k]; if (x && y) o.mutDone[k] = { ts: earlier(x.ts, y.ts), perfect: !!(x.perfect || y.perfect) }; });
    o.wrongQ = unionArr(a.wrongQ || [], b.wrongQ || []); o.pending = unionArr(a.pending || [], b.pending || []); o.daily = unionObj(a.daily, b.daily);
    const ta = a.today || { day: '', xp: 0 }, tb = b.today || { day: '', xp: 0 };
    o.today = ta.day === tb.day ? { day: ta.day, xp: maxNum(ta.xp, tb.xp) } : (ta.day > tb.day ? ta : tb);
    o.prefs = unionObj(a.prefs, b.prefs);
    return { ok: true, value: o };
  }

  function mVlab(a, b) {
    const o = Object.assign({}, b, a); o.done = Object.assign({}, (b.done || {}), (a.done || {}));
    Object.keys(b.done || {}).forEach(k => { const x = (a.done || {})[k], y = b.done[k]; if (x && y) o.done[k] = { st: maxNum(x.st, y.st), n: maxNum(x.n, y.n), ts: maxNum(x.ts, y.ts) }; });
    return { ok: true, value: o };
  }
  function mDx(a, b) {
    const o = jclone(a);
    ['ts', 'fo', 'dx'].forEach(k => {
      o[k] = Object.assign({}, (b[k] || {}), (a[k] || {}));
      Object.keys(b[k] || {}).forEach(id => { const x = (a[k] || {})[id], y = b[k][id]; if (x && y) o[k][id] = { best: maxNum(x.best, y.best), n: maxNum(x.n, y.n) }; });
    });
    return { ok: true, value: o };
  }

  /* local = এই ডিভাইসের, remote = সার্ভারের, base = শেষ সিঙ্কের আইটেম-হ্যাশ (ঐচ্ছিক)।
     ফেরত: {ok:true, value} বা {ok:false, why} (ok:false হলে সদস্যকে বাছতে হয়) */
  function merge(key, local, remote, base) {
    if (!KEYS[key]) return { ok: false, why: 'key' };
    if (!typeOk(key, local) || !typeOk(key, remote)) return { ok: false, why: 'type' };
    switch (key) {
      case 'geb_hist': return { ok: true, value: mHist(local, remote) };
      case 'geb_wrong': return { ok: true, value: mWrong(local, remote) };
      case 'geb_stars': case 'geb_jobs_saved': return { ok: true, value: mStars(local, remote) };
      case 'geb_grades': return { ok: true, value: mGrades(local, remote) };
      case 'geb_saved': return { ok: true, value: mSaved(local, remote) };
      case 'geb_planner_v1': return mPlanner(local, remote, base);
      case 'geb_notebook_v1': return mNotebook(local, remote, base);
      case 'geb_game_v1': return mGame(local, remote);
      case 'geb_vlab_v1': return mVlab(local, remote);
      case 'geb_dx_v1': return mDx(local, remote);
    }
    return { ok: false, why: 'key' };
  }

  return { KEYS, LABEL, hash, canon, isEmpty, typeOk, merge, itemHashes, jclone };
});
