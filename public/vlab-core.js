/* GEB Hub: ভার্চুয়াল ল্যাবের হিসাব ও নিয়ম (v3.5), DOM ছাড়া, তাই Node-এ টেস্ট করা যায়।
   কেমিস্ট্রির প্রতিক্রিয়া ইঞ্জিন, গ্রাম স্টেইনের ফল, সিরিয়াল ডাইলুশন ও কলোনি গণনা, কালচার মিডিয়া, স্ট্রিক প্লেট ও ডাইকোটোমাস কি। */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./vlab-data.js'));
  else root.VLCore = factory(root.VLData);
})(typeof self !== 'undefined' ? self : this, function (D) {
  'use strict';
  if (D && D.VLData) D = D.VLData;
  if (!D && typeof globalThis !== 'undefined') D = globalThis.VLData;

  /* ---------- র‍্যান্ডম ---------- */
  function rng(seed) { var a = (typeof seed === 'number' ? seed : Date.now()) >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function gauss(r) { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function poisson(lambda, r) {
    if (lambda > 60) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * gauss(r)));
    var L = Math.exp(-lambda), k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1;
  }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }

  /* ================= কেমিস্ট্রি ================= */
  var NONE = 'কোনো নির্ণায়ক পরিবর্তন নেই';
  function pack(a, diag) { return { t: a[0], c: a[1] || null, p: a[2] || null, amt: a[3] || 0, gas: a[4] || null, extra: a[5] || null, diag: diag }; }
  /* kind: 'cat' | 'an'; ফেরত: {t, c(দ্রবণের নতুন রং), p(অধঃক্ষেপ), amt, gas, extra, diag} */
  function chemResult(kind, reagentId, ionId) {
    var list = kind === 'cat' ? D.CREAG : D.AREAG, r = byId(list, reagentId); if (!r) return null;
    var a = r.res[ionId]; return a ? pack(a, true) : { t: NONE, c: null, p: null, amt: 0, gas: null, extra: null, diag: false };
  }
  /* অতিরিক্ত রিএজেন্ট (শুধু ক্যাটায়নের NaOH, NH₄OH) */
  function chemExcess(reagentId, ionId) {
    var r = byId(D.CREAG, reagentId); if (!r || !r.base) return null;
    var a = r.xsRes && r.xsRes[ionId]; if (a) return { t: a[0], c: a[1] || null, p: null, amt: 0, dissolved: true, diag: true };
    var first = r.res[ionId]; if (!first || !first[2]) return { t: NONE, c: null, p: null, amt: 0, dissolved: false, keep: false, diag: false };
    return { t: r.xsDef, c: null, p: first[2], amt: first[3], dissolved: false, keep: true, diag: true };
  }
  function chemFollow(reagentId, followId, ionId) {
    var arr = D.AFOLLOW[reagentId] || [], f = byId(arr, followId); if (!f) return null;
    var a = f.res[ionId]; return a ? { t: a[0], act: a[1], diag: true } : { t: NONE, act: 'none', diag: false };
  }
  function chemGasTest(gasTest, ionId) { var g = D.AGAS[gasTest]; var a = g.res[ionId]; return a ? { t: a[0], c: a[1], diag: true } : { t: g.def, c: null, diag: false }; }
  function flame(ionId) { var c = byId(D.CAT, ionId); return c ? { t: c.flame[0], c: c.flame[1] } : null; }
  function heatNaOH(ionId) { return ionId === 'NH4' ? { t: 'ঝাঁঝালো গন্ধযুক্ত গ্যাস NH₃ বের হলো; ভেজা লাল লিটমাস নীল হলো', diag: true } : { t: 'গ্যাস বের হলো না', diag: false }; }
  /* অজানা লবণ: দ্রবণীয় ক্যাটায়ন + অ্যানায়ন জোড়া */
  function pickSalt(r) {
    r = r || Math.random; var c = D.CAT[Math.floor(r() * D.CAT.length)], an = c.anions === 'all' ? D.AN.map(function (a) { return a.id; }) : c.anions;
    var a = an[Math.floor(r() * an.length)]; return { cat: c.id, an: a };
  }
  /* শিক্ষার্থীর অনুমান ভুল হলে: কোন পরীক্ষার ফল মিলছে না তার তালিকা। log: [{kind, reagent, xs?, follow?, gas?}] */
  function explainGuess(kind, guessId, truthId, log) {
    var out = [];
    (log || []).forEach(function (e) {
      if (e.kind !== kind) return; var obs, exp, name = e.name || e.reagent;
      if (e.type === 'flame') { obs = flame(truthId); exp = flame(guessId); }
      else if (e.type === 'heat') { obs = heatNaOH(truthId); exp = heatNaOH(guessId); }
      else if (e.type === 'xs') { obs = chemExcess(e.reagent, truthId); exp = chemExcess(e.reagent, guessId); }
      else if (e.type === 'follow') { obs = chemFollow(e.reagent, e.follow, truthId); exp = chemFollow(e.reagent, e.follow, guessId); }
      else if (e.type === 'gas') { obs = chemGasTest(e.gas, truthId); exp = chemGasTest(e.gas, guessId); }
      else { obs = chemResult(kind, e.reagent, truthId); exp = chemResult(kind, e.reagent, guessId); }
      if (obs && exp && obs.t !== exp.t) out.push({ name: name, observed: obs.t, expected: exp.t });
    });
    return out;
  }

  /* ================= গ্রাম স্টেইন ================= */
  var PURPLE = '#5b2a8a', PINK = '#e0558a';
  /* p: {fixed, overheat, cv, iodine, decolor (সেকেন্ড), safranin} */
  function gramAppear(org, p) {
    var gp = org.gram === '+', under = p.decolor < 8, over = p.decolor > 25, res = { color: null, label: '', note: [], verdict: 'ok', sparse: false, distort: false };
    if (!p.fixed) { res.sparse = true; res.note.push('তাপ-ফিক্সেশন হয়নি, তাই ধোয়ার সময় বেশিরভাগ কোষ স্মিয়ার থেকে ভেসে গেছে।'); }
    if (p.overheat) { res.distort = true; res.note.push('বেশি তাপে কোষ কুঁচকে গেছে ও আকৃতি নষ্ট হয়েছে।'); }
    if (!p.cv) { res.color = p.safranin ? PINK : null; res.label = p.safranin ? 'গোলাপি' : 'প্রায় অদৃশ্য'; res.note.push('ক্রিস্টাল ভায়োলেট দেওয়া হয়নি।'); res.verdict = gp ? 'false-neg' : 'ok'; return res; }
    var keepCV;
    if (gp) { keepCV = p.iodine ? !over : !(p.decolor >= 8); if (!p.iodine) res.note.push('আয়োডিন (মর্ড্যান্ট) না দেওয়ায় ক্রিস্টাল ভায়োলেট-আয়োডিন কমপ্লেক্স হয়নি, রং ধুয়ে গেছে।'); if (over) res.note.push('ডিকালারাইজার বেশিক্ষণ (' + p.decolor + ' সেকেন্ড) রাখায় Gram-ধনাত্মক কোষের রংও ধুয়ে গেছে (over-decolorization)।'); }
    else { keepCV = under; if (under) res.note.push('ডিকালারাইজার খুব কম সময় (' + p.decolor + ' সেকেন্ড) রাখায় Gram-ঋণাত্মক কোষের ক্রিস্টাল ভায়োলেট পুরো ধোয়নি (under-decolorization)।'); }
    if (keepCV) { res.color = PURPLE; res.label = 'বেগুনি'; } else if (p.safranin) { res.color = PINK; res.label = 'গোলাপি/লাল'; } else { res.color = null; res.label = 'প্রায় বর্ণহীন'; res.note.push('সেফ্রানিন (counterstain) দেওয়া হয়নি, তাই বর্ণহীন কোষ প্রায় দেখা যায় না।'); }
    var truthPurple = gp; if (res.color === PURPLE && !gp) res.verdict = 'false-pos'; else if (res.color !== PURPLE && gp) res.verdict = 'false-neg'; else if (!res.color) res.verdict = 'invisible'; else res.verdict = 'ok';
    return res;
  }
  function gramIdeal() { return { lo: 10, hi: 20 }; }

  /* ================= কালচার মিডিয়া ================= */
  function powderFor(m, volMl) { return Math.round(m.powder * volMl / 1000 * 100) / 100; }
  function checkWeight(entered, needed) { var d = Math.abs(entered - needed) / needed; return d <= .03 ? { ok: true } : { ok: false, low: entered < needed, pct: Math.round(d * 100) }; }
  function autoclaveVerdict(t, psi, min, volMl) {
    var need = volMl > 500 ? 20 : 15;
    if (t < 115 || min < 10) return { ok: false, why: 'under', msg: 'তাপমাত্রা বা সময় অপর্যাপ্ত: স্পোর ও জীবাণু মরেনি, মিডিয়া দূষিত থাকবে।' };
    if (t > 126 || min > 30) return { ok: false, why: 'over', msg: 'অতিরিক্ত তাপ বা সময়: অ্যাগার ভেঙে যাবে, শর্করা কারামেল হয়ে মিডিয়া কালচে ও জমাট বাঁধতে অক্ষম হবে।' };
    if (Math.abs(t - 121) > 3 || Math.abs(psi - 15) > 2) return { ok: false, why: 'setting', msg: 'প্রমিত সেটিং হলো ১২১ °C ও ১৫ psi। দুটোই মিলিয়ে সেট করো (এই তাপমাত্রা শুধু ১৫ psi চাপেই আসে)।' };
    if (min < need) return { ok: false, why: 'short', msg: 'এই আয়তনের জন্য সময় একটু কম; ' + need + ' মিনিট রাখো।' };
    return { ok: true, msg: 'সঠিক: ১২১ °C, ১৫ psi, ' + min + ' মিনিট।' };
  }
  function pourVerdict(tC) { if (tC > 60) return { ok: false, msg: 'অ্যাগার বেশি গরম (' + tC + ' °C): ঢাকনায় পানির ফোঁটা জমবে, প্লেট নষ্ট হবে। ৪৫–৫০ °C-এ ঢালো।' }; if (tC < 42) return { ok: false, msg: 'অ্যাগার বেশি ঠান্ডা (' + tC + ' °C): ঢালার আগেই জমাট বেঁধে যাবে। ৪৫–৫০ °C-এ ঢালো।' }; return { ok: true }; }

  /* ================= সিরিয়াল ডাইলুশন ও কলোনি গণনা ================= */
  function expectedColonies(stockCfuPerMl, exp, volMl) { return stockCfuPerMl * Math.pow(10, -exp) * volMl; }
  function plateCount(stockCfuPerMl, exp, volMl, r) { return poisson(expectedColonies(stockCfuPerMl, exp, volMl), r || Math.random); }
  function cfuFrom(count, exp, volMl) { return count / (volMl * Math.pow(10, -exp)); }
  function countStatus(n) { return n > 300 ? 'tntc' : n < 30 ? 'tftc' : 'ok'; }
  function sci(x) { if (!isFinite(x) || x <= 0) return '0'; var e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e); return (Math.round(m * 100) / 100) + ' × 10^' + e; }
  /* শিক্ষার্থীর উত্তর যাচাই: সহনশীলতা ±১৫% (সাধারণ সংখ্যায় ও "a × 10^b"-তে) */
  function parseSci(s) {
    s = String(s || '').replace(/[০-৯]/g, function (d) { return '০১২৩৪৫৬৭৮৯'.indexOf(d); }).replace(/\s+/g, '').replace(/,/g, '').toLowerCase();
    var m = /^([0-9.]+)(?:x|\*|×)10\^?([\-+]?[0-9]+)$/.exec(s); if (m) return parseFloat(m[1]) * Math.pow(10, parseFloat(m[2]));
    var m2 = /^([0-9.]+)e([\-+]?[0-9]+)$/.exec(s); if (m2) return parseFloat(m2[1]) * Math.pow(10, parseFloat(m2[2]));
    var v = parseFloat(s); return isNaN(v) ? NaN : v;
  }
  function checkCfu(ans, truth, tol) { var v = typeof ans === 'number' ? ans : parseSci(ans); if (isNaN(v) || v <= 0) return { ok: false, bad: true }; var d = Math.abs(v - truth) / truth; return { ok: d <= (tol || .15), off: d, orderOff: Math.abs(Math.log10(v / truth)) >= .7 }; }

  /* ================= স্ট্রিক প্লেট ================= */
  /* sectors: [{len, crossed}], flames[i] = i-তম ও (i+1)-তম সেক্টরের মাঝে লুপ জীবাণুমুক্ত করা হয়েছে কি না।
     ফেরত: প্রতি সেক্টরের কলোনি ঘনত্ব (প্রতি একক দৈর্ঘ্যে), isolated = শেষ সেক্টরে আলাদা কলোনি পাওয়া যাবে কি না */
  function streakOutcome(sectors, flames) {
    var dens = [], prev = 0, ok = true, notes = [];
    sectors.forEach(function (s, i) {
      var d;
      if (i === 0) d = s.len > 0 ? 3 : 0;
      else if (!s.crossed || !s.len) { d = 0; if (s.len) notes.push('সেক্টর ' + (i + 1) + ': আগের সেক্টর থেকে শুরু করোনি, তাই জীবাণু পৌঁছায়নি।'); }
      else if (flames[i - 1]) d = prev * .2;
      else { d = prev * .9; notes.push('সেক্টর ' + (i + 1) + ': মাঝে লুপ জ্বালিয়ে জীবাণুমুক্ত করোনি, তাই জীবাণু পাতলা হয়নি।'); }
      dens.push(d); prev = d;
    });
    var last = dens[dens.length - 1]; var isolated = last > 0 && last <= .45;
    if (!isolated) ok = false;
    return { dens: dens, isolated: isolated, ok: ok, notes: notes };
  }

  /* ================= ডাইকোটোমাস কি ================= */
  function keyPath(leafId, node, acc) {
    node = node || 'Q1'; acc = acc || []; var n = D.KEY[node]; if (!n) return null;
    var tryDir = function (dir) { var nx = n[dir]; if (nx === 'L:' + leafId) return acc.concat([[node, dir]]); if (nx.charAt(0) === 'Q') return keyPath(leafId, nx, acc.concat([[node, dir]])); return null; };
    return tryDir('y') || tryDir('n');
  }
  function keyAnswer(specId, nodeId) { var p = keyPath(specId); if (!p) return null; for (var i = 0; i < p.length; i++) if (p[i][0] === nodeId) return p[i][1]; return null; }

  return { rng: rng, poisson: poisson, byId: byId, NONE: NONE,
    chemResult: chemResult, chemExcess: chemExcess, chemFollow: chemFollow, chemGasTest: chemGasTest, flame: flame, heatNaOH: heatNaOH, pickSalt: pickSalt, explainGuess: explainGuess,
    gramAppear: gramAppear, gramIdeal: gramIdeal, PURPLE: PURPLE, PINK: PINK,
    powderFor: powderFor, checkWeight: checkWeight, autoclaveVerdict: autoclaveVerdict, pourVerdict: pourVerdict,
    expectedColonies: expectedColonies, plateCount: plateCount, cfuFrom: cfuFrom, countStatus: countStatus, sci: sci, parseSci: parseSci, checkCfu: checkCfu,
    streakOutcome: streakOutcome, keyPath: keyPath, keyAnswer: keyAnswer };
});
