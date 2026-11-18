/* GEB Hub: গেম জোনের হিসাব (v3.4), DOM ছাড়া, তাই Node-এ টেস্ট করা যায়।
   XP ও লেভেল, স্ট্রিক, ব্যাজের অগ্রগতি, কুইজ সেট বানানো, লাইফলাইন, দৈনিক ব্যাচ-ওয়ার সেট, জিন-ম্যাচের ডেক, মিউটেশনের বিশ্লেষণ। */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GEBGame = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- র‍্যান্ডম (বীজ দিয়ে একই ক্রম পাওয়া যায়) ---------- */
  function hashStr(s) { s = String(s); var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rngFrom(seed) { var a = typeof seed === 'number' ? seed >>> 0 : hashStr(seed); return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffle(arr, rng) { var a = arr.slice(), r = rng || Math.random; for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pick(arr, n, rng) { return shuffle(arr, rng).slice(0, n); }

  /* ---------- তারিখ, স্ট্রিক ---------- */
  var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
  function isoOf(d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  function dayNum(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000) : NaN; }
  /* days: খেলা হয়েছে এমন তারিখের তালিকা ('YYYY-MM-DD')। ফেরত: cur = আজ বা গতকাল পর্যন্ত চলমান ধারা, best = সর্বোচ্চ ধারা */
  function streak(days, todayIsoStr) {
    var set = {}, u = [], i;
    (days || []).forEach(function (d) { var n = dayNum(d); if (!isNaN(n) && !set[n]) { set[n] = 1; u.push(n); } });
    u.sort(function (a, b) { return a - b; });
    var best = 0, run = 0, prev = null;
    for (i = 0; i < u.length; i++) { run = (prev !== null && u[i] === prev + 1) ? run + 1 : 1; if (run > best) best = run; prev = u[i]; }
    var t = dayNum(todayIsoStr), cur = 0;
    if (!isNaN(t)) { var k = set[t] ? t : (set[t - 1] ? t - 1 : null); if (k !== null) { cur = 0; while (set[k]) { cur++; k--; } } }
    return { cur: cur, best: Math.max(best, cur), playedToday: !!set[t] };
  }

  /* ---------- XP ও লেভেল ---------- */
  function levelInfo(xp, LEVELS) {
    xp = Math.max(0, xp | 0); var lv = 0, i;
    for (i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i][0]) lv = i;
    var cur = LEVELS[lv], nxt = LEVELS[lv + 1] || null;
    return { lv: lv + 1, name: cur[1], from: cur[0], to: nxt ? nxt[0] : null, nextName: nxt ? nxt[1] : null, pct: nxt ? Math.round((xp - cur[0]) / (nxt[0] - cur[0]) * 100) : 100, left: nxt ? nxt[0] - xp : 0, max: !nxt };
  }

  /* ---------- ব্যাজ ----------
     stats: {sessions, bestStreak, correct, pairs, matchPerfect, quizBest, quizWins, quizNoLife, mutSolved, warDays} + ext: {labEntries, exams}
     mutSolved-এর লক্ষ্য ≥ 99 মানে "সবগুলো কেস" (mutall), তখন লক্ষ্য = mutTotal */
  function badgeProgress(stats, ext, BADGES, mutTotal) {
    var s = Object.assign({}, stats || {}, ext || {});
    return BADGES.map(function (b) {
      var target = (b[4] === 'mutSolved' && b[5] >= 99 ? mutTotal : b[5]), val = +s[b[4]] || 0;
      return { id: b[0], icon: b[1], name: b[2], desc: b[3], key: b[4], val: Math.min(val, target), target: target, done: val >= target };
    });
  }

  /* ---------- কুইজ শো ---------- */
  var PRIZES = [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 1000000];
  var CHECKPOINTS = [4, 9];   // সূচক: ৫ম ও ১০ম প্রশ্ন পার করলে এই পুরস্কার নিশ্চিত
  var LEVEL_OF_STEP = function (i) { return i < 5 ? 1 : i < 10 ? 2 : 3; };
  function safePrize(stepsCleared) {   // stepsCleared = কয়টি প্রশ্ন সঠিক
    var best = 0; CHECKPOINTS.forEach(function (c) { if (stepsCleared > c) best = PRIZES[c]; }); return best;
  }
  function makeQ(row, idx, rng) {   // row: [q, correct, w1, w2, w3, exp, level]
    var order = shuffle([0, 1, 2, 3], rng), opts = order.map(function (o) { return row[1 + o]; });
    return { id: idx, q: row[0], opts: opts, ans: order.indexOf(0), exp: row[5] || '', level: row[6] };
  }
  /* bank: GEBGameData.QUIZ; extra: অ্যাডমিনের MCQ [{q,opts,ans,exp}] (মাঝারি লেভেলে যোগ হয়) */
  function buildLadder(bank, rng, extra) {
    var by = { 1: [], 2: [], 3: [] }, out = [], spare = {};
    bank.forEach(function (r, i) { by[r[6]].push(makeQ(r, i, rng)); });
    (extra || []).forEach(function (e, i) { if (e && e.opts && e.opts.length >= 4 && e.ans >= 0) { var ord = shuffle(e.opts.map(function (_, k) { return k; }), rng).slice(0, 4); if (ord.indexOf(e.ans) < 0) ord[0] = e.ans; ord = shuffle(ord, rng); by[2].push({ id: 'x' + i, q: e.q, opts: ord.map(function (k) { return e.opts[k]; }), ans: ord.indexOf(e.ans), exp: e.exp || '', level: 2 }); } });
    [1, 2, 3].forEach(function (L) { var s = shuffle(by[L], rng); out = out.concat(s.slice(0, 5)); spare[L] = s.slice(5); });
    return { steps: out, spare: spare };
  }
  /* ৫০:৫০, ভুল অপশনের দুটি লুকাবে */
  function fifty(q, hidden, rng) {
    var wrong = [0, 1, 2, 3].filter(function (i) { return i !== q.ans && hidden.indexOf(i) < 0; });
    return shuffle(wrong, rng).slice(0, 2);
  }
  /* দর্শক ভোট: কঠিন প্রশ্নে সঠিক উত্তরের ভোট কম। এটি সিমুলেশন, আসল ভোট নয় */
  function poll(q, step, hidden, rng) {
    var r = rng || Math.random, base = q.level === 1 ? 0.78 : q.level === 2 ? 0.58 : 0.42;
    base = Math.max(0.2, Math.min(0.92, base - step * 0.008 + (r() - 0.5) * 0.18));
    var alive = [0, 1, 2, 3].filter(function (i) { return hidden.indexOf(i) < 0; }), w = {}, rest = 0;
    alive.forEach(function (i) { if (i !== q.ans) { w[i] = 0.3 + r(); rest += w[i]; } });
    var out = [0, 0, 0, 0], left = 100, k = alive.filter(function (i) { return i !== q.ans; });
    out[q.ans] = Math.round(base * 100); left -= out[q.ans];
    k.forEach(function (i, n) { out[i] = n === k.length - 1 ? left : Math.round(left * w[i] / rest); left -= out[i]; });
    return out;
  }
  function xpQuiz(correct, won) { return correct * 10 + (won ? 100 : 0); }

  /* ---------- ব্যাচ ওয়ার: সবার জন্য একই ১০ প্রশ্ন (তারিখ থেকে বীজ) ----------
     ৩টি সহজ, ৪টি মাঝারি, ৩টি কঠিন; অপশনের ক্রমও সবার জন্য এক */
  var WAR_MIX = [3, 4, 3];
  function dailySet(day, bank) {
    var out = [];
    [1, 2, 3].forEach(function (L, li) {
      var ids = []; bank.forEach(function (r, i) { if (r[6] === L) ids.push(i); });
      ids.sort(function (a, b) { return hashStr(day + ':' + a) - hashStr(day + ':' + b) || a - b; });
      ids.slice(0, WAR_MIX[li]).forEach(function (i) { out.push(makeQ(bank[i], i, rngFrom(day + '#' + i))); });
    });
    return out;
  }
  /* সার্ভারের সূত্রের সাথে এক (community.js): সঠিক ×১০, সবগুলো ঠিক হলে +২০, ১৫ সেকেন্ডের বেশি ও ২ মিনিটের কম সময়ে ≥৭ ঠিক হলে +১০ */
  function warPoints(correct, total, ms) {
    correct = Math.max(0, Math.min(total, correct | 0)); var p = correct * 10;
    if (total > 0 && correct === total) p += 20;
    if (correct >= 7 && ms >= 15000 && ms < 120000) p += 10;
    return p;
  }

  /* ---------- জিন-ম্যাচ ---------- */
  /* PAIRS: {key:{name,items:[[term,desc],...]}}; cat = 'mix' হলে সব ক্যাটাগরি থেকে */
  function matchDeck(PAIRS, cat, n, rng) {
    var pool = [];
    Object.keys(PAIRS).forEach(function (k) { if (cat === 'mix' || cat === k) PAIRS[k].items.forEach(function (it) { pool.push({ t: it[0], d: it[1], cat: k }); }); });
    return pick(pool, Math.min(n, pool.length), rng).map(function (p, i) { return { id: i, t: p.t, d: p.d, cat: p.cat }; });
  }
  function xpMatch(pairs, mistakes, mode, moves) {
    var x = pairs * 4;
    if (mode === 'memory') { if (moves <= Math.ceil(pairs * 1.5)) x += 10; } else if (mistakes === 0) x += 10;
    return x;
  }

  /* ---------- মিউটেশন ---------- */
  var BASES = 'TCAG', AAS = 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG', CT = {};
  for (var a = 0; a < 4; a++) for (var b = 0; b < 4; b++) for (var c = 0; c < 4; c++) CT[BASES[a] + BASES[b] + BASES[c]] = AAS[a * 16 + b * 4 + c];
  function codons(seq) { var o = []; for (var i = 0; i < seq.length; i += 3) o.push(seq.substr(i, 3)); return o; }
  function aaOf(cod) { return cod.length === 3 ? (CT[cod] || 'X') : '·'; }
  function translate(seq) { return codons(seq).map(aaOf).join(''); }
  function classify(wt, mut, hasRepeat) {
    if (hasRepeat) return 'repeat';
    if (wt.length === mut.length) {
      var k = -1; for (var i = 0; i < wt.length; i++) if (wt[i] !== mut[i]) { k = Math.floor(i / 3); break; }
      if (k < 0) return 'none';
      var x = aaOf(wt.substr(k * 3, 3)), y = aaOf(mut.substr(k * 3, 3));
      return x === y ? 'silent' : (y === '*' ? 'nonsense' : 'missense');
    }
    return Math.abs(wt.length - mut.length) % 3 === 0 ? 'inframe' : 'frameshift';
  }
  function firstDiff(wt, mut) { var n = Math.min(wt.length, mut.length); for (var i = 0; i < n; i++) if (wt[i] !== mut[i]) return Math.floor(i / 3); return Math.floor(n / 3); }
  /* রোগীর DNA-র কোন কোডনে চাপ দিলে সঠিক ধরা হবে (ইনসার্ট/ডিলিশনে পরের ঘরও ঠিক) */
  function acceptCodons(cs) { var f = cs.first; return (cs.type === 'inframe' || cs.type === 'frameshift') ? [f, f + 1] : [f]; }
  var TYPE_LABEL = { missense: ['Missense', 'মিসসেন্স (অ্যামিনো অ্যাসিড বদলায়)'], nonsense: ['Nonsense', 'নন্সেন্স (stop কোডন আসে)'], silent: ['Silent', 'সাইলেন্ট (অ্যামিনো অ্যাসিড একই)'], frameshift: ['Frameshift', 'ফ্রেমশিফট (পড়ার ফ্রেম সরে যায়)'], inframe: ['In-frame deletion/insertion', 'ইন-ফ্রেম ডিলিশন/ইনসার্শন'], repeat: ['Repeat expansion', 'রিপিট এক্সপানশন (ট্রিনিউক্লিওটাইড পুনরাবৃত্তি বাড়ে)'] };
  function typeOptions(type, rng) { var others = Object.keys(TYPE_LABEL).filter(function (k) { return k !== type; }); return shuffle([type].concat(pick(others, 3, rng)), rng); }
  function diseaseOptions(correct, pool, rng) { var others = pool.filter(function (d) { return d !== correct; }); return shuffle([correct].concat(pick(others, 3, rng)), rng); }
  function repeatOptions(correct, rng) { var s = {}; s[correct] = 1; [correct - 12, correct - 6, correct + 8, correct + 14, correct - 3, 36].forEach(function (v) { if (v > 5 && !s[v] && Object.keys(s).length < 4) s[v] = 1; }); return shuffle(Object.keys(s).map(Number), rng); }
  /* ধাপ অনুযায়ী XP: ১ম চেষ্টায় সঠিক হলে বেশি। steps = [{ok, tries}] ×৩ (পজিশন, ধরন, রোগ), hints = সংকেত নেওয়া হয়েছে কি না */
  function xpMut(steps, hints, repeatSolve) {
    var full = [5, 5, 10], half = [2, 2, 4], x = 0, perfect = true;
    steps.forEach(function (s, i) { if (s.ok) x += s.tries === 1 ? full[i] : half[i]; if (!s.ok || s.tries !== 1) perfect = false; });
    if (perfect && !hints) x += 5;
    return { xp: x, perfect: perfect && !hints };
  }

  return {
    hashStr: hashStr, rngFrom: rngFrom, shuffle: shuffle, pick: pick,
    isoOf: isoOf, dayNum: dayNum, streak: streak, levelInfo: levelInfo, badgeProgress: badgeProgress,
    PRIZES: PRIZES, CHECKPOINTS: CHECKPOINTS, levelOfStep: LEVEL_OF_STEP, safePrize: safePrize, makeQ: makeQ, buildLadder: buildLadder, fifty: fifty, poll: poll, xpQuiz: xpQuiz,
    dailySet: dailySet, warPoints: warPoints, WAR_MIX: WAR_MIX, matchDeck: matchDeck, xpMatch: xpMatch,
    CT: CT, codons: codons, aaOf: aaOf, translate: translate, classify: classify, firstDiff: firstDiff, acceptCodons: acceptCodons, TYPE_LABEL: TYPE_LABEL, typeOptions: typeOptions, diseaseOptions: diseaseOptions, repeatOptions: repeatOptions, xpMut: xpMut
  };
});
