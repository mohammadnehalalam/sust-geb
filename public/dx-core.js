/* GEB Hub: ডায়াগনস্টিক ল্যাবের হিসাব-নিকাশ (v3.8)
   ১) PCR ও জেল সিমুলেটর (ট্রাবলশুটিং): প্রাইমার Tm, অ্যানিলিং, Mg²⁺, ডাইমার, টেমপ্লেট, এক্সটেনশন, জেলের শর্ত থেকে ব্যান্ড বের করে
   ২) ফরেনসিক STR: জেনোটাইপ ফ্রিকোয়েন্সি (NRC II 4.10), match probability, মিশ্র নমুনা, পিতৃত্ব সূচক (PI)
   ৩) রোগ নির্ণয়ের স্কোর
   এখানে কোনো DOM নেই, তাই Node-এও টেস্ট চলে (node dx-test.js)। UI: dx.js, ডেটা: dx-data.js */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./bio-core.js'));
  else root.GEBDx = factory(root.GEBBio);
})(typeof self !== 'undefined' ? self : this, function (Bio) {
  'use strict';
  var BN = '০১২৩৪৫৬৭৮৯';
  function bn(n) { return String(n).replace(/\d/g, function (d) { return BN[d]; }); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function copy(o) { return JSON.parse(JSON.stringify(o)); }
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rngFrom(seed) {   // mulberry32
    var a = (typeof seed === 'string' ? hashStr(seed) : seed) >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function shuffle(arr, rng) { var a = arr.slice(), i, j, t; for (i = a.length - 1; i > 0; i--) { j = Math.floor(rng() * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* =====================================================================
     ১. জেল ইলেক্ট্রোফোরেসিস
     ===================================================================== */
  var LADDERS = {
    bp100: [100, 200, 300, 400, 500, 600, 800, 1000, 1500, 2000],
    kb1: [250, 500, 750, 1000, 1500, 2000, 3000, 4000, 6000, 8000, 10000]
  };
  /* ৫ V/cm × ৪৫ মিনিট = ১ একক। বেশি % = ধীর, বেশি ছোট ফ্র্যাগমেন্ট = দ্রুত (log-রৈখিক সরলীকরণ) */
  function runUnits(vcm, mins) { return (vcm * mins) / (5 * 45); }
  function migration(bp, pct, run) { return (0.9 - 0.36 * (Math.log(bp) / Math.LN10 - 2)) * Math.pow(1 / pct, 0.5) * run; }

  /* lanes: [{name, bands:[{bp,i,kind}], smear:{lo,hi,i}|null}]; G: {pct,vcm,mins,stain,buffer,loadUl,ladder}
     ফেরত: { lanes (pos সহ), run, flags, issues } */
  function runGel(lanes, G, ladderKey) {
    var run = runUnits(G.vcm, G.mins), issues = [], flags = { visible: true, offGel: false, compressed: false, smile: false, noMigrate: false, overload: false, faint: false };
    var ladder = LADDERS[ladderKey || 'bp100'];
    if (!G.stain) { flags.visible = false; issues.push('stain'); }
    if (G.buffer === 'water') { flags.noMigrate = true; issues.push('buffer'); }
    if (G.vcm > 10) { flags.smile = true; issues.push('volt'); }
    if (G.loadUl > 15) { flags.overload = true; issues.push('load'); }
    if (G.loadUl < 1.5) { flags.faint = true; issues.push('loadlow'); }
    var loadF = G.loadUl > 15 ? 1.6 : G.loadUl < 1.5 ? 0.15 : 1;
    function place(b) {
      var pos = flags.noMigrate ? 0.04 : migration(b.bp, G.pct, run);
      return { bp: b.bp, i: clamp(b.i * loadF, 0, 1.4), kind: b.kind, pos: pos, off: pos > 0.97, stuck: pos < 0.1 };
    }
    var out = [{ name: 'Ladder', ladder: true, bands: ladder.map(function (bp) { return place({ bp: bp, i: 0.7 }); }), smear: null }];
    lanes.forEach(function (ln) {
      out.push({ name: ln.name, key: ln.key, bands: ln.bands.map(place), smear: ln.smear, well: ln.well || 0, dimer: ln.dimer });
    });
    // ল্যাডারের কতটা ব্যান্ড পৃথকভাবে দেখা যায়
    var lv = out[0].bands.filter(function (b) { return !b.off && !b.stuck; });
    if (lv.some(function (b) { return b.off; }) || out[0].bands.some(function (b) { return b.off; })) { flags.offGel = true; if (issues.indexOf('offgel') < 0) issues.push('offgel'); }
    if (run < 0.45 || (lv.length >= 2 && (lv[0].pos - lv[lv.length - 1].pos) < 0.22)) { flags.compressed = true; if (issues.indexOf('compressed') < 0) issues.push('compressed'); }
    if (G.pct > 2.6 && run < 1) { flags.compressed = true; if (issues.indexOf('compressed') < 0) issues.push('compressed'); }
    return { lanes: out, run: run, flags: flags, issues: issues, ladderKey: ladderKey || 'bp100', G: G };
  }

  /* =====================================================================
     PCR সিমুলেটর
     P: প্যারামিটার, C: কেসের পরিবেশ (প্রাইমার, আকার, টেমপ্লেটের সমস্যা ইত্যাদি)
     ===================================================================== */
  var GOOD = { primerSet: 'orig', tplNg: 50, tplClean: false, tplFresh: false, mg: 1.5, dntp: 200, primer: 0.4, taq: 1.25, dmso: 0,
    denT: 95, denS: 30, ta: 55, taS: 30, extT: 72, extS: 45, cycles: 30, clean: false, ctrl: false,
    gel: { pct: 1.5, vcm: 5, mins: 45, stain: true, buffer: 'tae', loadUl: 5 } };

  function tmOf(seq, P) { return Bio.tmNN(seq, { mg: P.mg, dntp: 4 * P.dntp / 1000, conc: P.primer * 1000 }); }
  function freeMg(P) { return P.mg - 4 * P.dntp / 1000; }
  function dimerPot(pr) { return Math.max(Bio.dimer(pr.f, pr.r).k3, Bio.dimer(pr.f, pr.f).k3, Bio.dimer(pr.r, pr.r).k3); }

  /* kind: 'sample' | 'pc' (পজিটিভ কন্ট্রোল) | 'ntc' (টেমপ্লেট ছাড়া) */
  function pcrLane(P, C, kind) {
    var pr = C.primers[P.primerSet] || C.primers.orig, notes = [];
    var tmF = tmOf(pr.f, P), tmR = tmOf(pr.r, P), tmMin = Math.min(tmF, tmR), eff = 0.95, spec = 1, dT = P.ta - tmMin;
    var size = C.size, free = freeMg(P), tplKind = C.tplKind || 'genomic';
    /* অ্যানিলিং */
    if (dT > 1) { eff *= Math.exp(-(dT - 1) / 2.2); notes.push('anneal_hot'); }
    spec -= clamp((tmMin - 8 - P.ta) * 0.1, 0, 0.9); if (tmMin - 8 - P.ta > 2) notes.push('anneal_cold');
    if (Math.abs(tmF - tmR) > 6) { eff *= 0.55; notes.push('tm_gap'); }
    if (P.taS < 5) eff *= 0.5;
    /* Mg ও dNTP */
    if (free < 0.3) { eff *= 0.05; notes.push('mg_low'); } else if (free < 0.6) { eff *= 0.5; notes.push('mg_low'); }
    if (free > 2.2) { spec -= clamp((free - 2.2) * 0.25, 0, 0.8); notes.push('mg_high'); }
    if (free > 4.5) eff *= 0.6;
    if (P.dntp < 20) eff *= 0.3; else if (P.dntp < 50) eff *= 0.7; if (P.dntp > 1000) eff *= 0.5;
    /* প্রাইমার ঘনত্ব */
    if (P.primer < 0.05) eff *= 0.4; else if (P.primer < 0.1) eff *= 0.8;
    if (P.primer > 1) { spec -= clamp((P.primer - 1) * 0.15, 0, 0.4); notes.push('primer_high'); } if (P.primer > 2) eff *= 0.7;
    /* এনজাইম */
    if (P.taq <= 0) { eff = 0; notes.push('taq_missing'); } else if (P.taq < 0.3) eff *= 0.3;
    if (P.taq > 3) { spec -= clamp((P.taq - 3) * 0.1, 0, 0.5); notes.push('taq_high'); }
    /* ডিনেচারেশন */
    if (P.denT < 90) { eff *= 0.02; notes.push('den_low'); } else if (P.denT < 93) { eff *= 0.35; notes.push('den_low'); } else if (P.denT > 99) eff *= 0.5;
    if (P.denS < 5) eff *= 0.4;
    /* এক্সটেনশন */
    var need = size / 1000 * 60;
    if (P.extS < need * 0.4) { eff *= 0.05; notes.push('ext_short'); } else if (P.extS < need * 0.75) { eff *= 0.3; notes.push('ext_short'); } else if (P.extS < need) eff *= 0.8;
    if (P.extT < 65 || P.extT > 76) eff *= 0.3;
    /* GC-সমৃদ্ধ টেমপ্লেট */
    if (C.gcRich && kind !== 'ntc') {
      var helped = P.dmso >= 3 || P.denT >= 98;
      if (!helped) { eff *= 0.08; spec -= 0.3; notes.push('gc_rich'); }
    }
    if (P.dmso > 10) eff *= 0.3; else if (!C.gcRich && P.dmso > 8) eff *= 0.5;
    /* প্রাইমার ডাইমার */
    var pot = dimerPot(pr), dimerBase = pot >= 4 ? 1 : pot === 3 ? 0.35 : 0.08;
    /* টেমপ্লেটের পরিমাণ */
    var ng = P.tplNg, cpn = C.copiesPerNg || 300, copies = 0, tplHigh = C.tplHigh || (tplKind === 'plasmid' ? 50 : 500);
    var inhib = 0;
    if (kind === 'sample') {
      if (C.mismatch && C.mismatch.indexOf(P.primerSet) >= 0) { eff *= 0.01; notes.push('primer_mismatch'); }
      if (C.targetAbsent) { copies = 0; notes.push('target_absent'); }
      else copies = ng * cpn;
      if (C.inhibPerNg && !P.tplClean) { inhib = C.inhibPerNg * ng; if (inhib > 1) { eff *= 1 / (1 + (inhib - 1) * 3); notes.push('tpl_inhibitor'); } }
      if (C.degLen && !P.tplFresh) { copies *= Math.exp(-size / C.degLen); notes.push('tpl_degraded'); }
      if (ng > tplHigh) { spec -= 0.4; eff *= ng > tplHigh * 4 ? 0.2 : 0.5; notes.push('tpl_high'); }
      if (ng < (tplKind === 'plasmid' ? 0.001 : 0.1) && ng > 0) notes.push('tpl_low');
      if (ng <= 0) copies = 0;
    } else if (kind === 'pc') {
      var pc = C.pc || { ng: 10, copiesPerNg: 300 }; copies = pc.ng * pc.copiesPerNg;
    } else {   // ntc
      copies = (C.contam && !P.clean) ? 1e5 : 0;
      if (C.contam && !P.clean) notes.push('contam');
    }
    /* ডাইমার (NTC-তেও তৈরি হতে পারে) */
    var cyc = P.cycles, dI = clamp(dimerBase * (P.primer / 0.5) * clamp((cyc - 15) / 18, 0, 1.2) * (copies < 1e4 ? 1.4 : 0.8), 0, 1);
    if (kind === 'ntc' && !(C.contam && !P.clean)) dI = clamp(dI * 0.9, 0, 1);
    if (dI > 0.25) notes.push('primer_dimer');
    eff *= (1 - 0.6 * dI);
    if (cyc > 35) { spec -= (cyc - 35) * 0.03; notes.push('cycles_high'); }
    var L = copies > 0 ? Math.log(copies) / Math.LN10 + cyc * Math.log(1 + eff) / Math.LN10 : 0;
    if (cyc < 22 && copies > 0) notes.push('cycles_low');
    var inten = copies > 0 ? clamp((L - 9.3) / 2.7, 0, 1) : 0;
    /* ন্যান-স্পেসিফিক ব্যান্ড ও স্মিয়ার (টেমপ্লেট না থাকলে নেই, কিন্তু প্রাইমার একা দুর্বল প্রোডাক্ট দিতে পারে) */
    var ns = copies > 0 ? clamp(1 - spec, 0, 1) * clamp((L - 8.5) / 2.7, 0, 1) : 0;
    if (kind === 'ntc' && !(C.contam && !P.clean)) ns = 0;
    var rng = rngFrom((C.seed || 'x') + ':' + kind), bands = [];
    if (inten > 0.02) bands.push({ bp: size, i: inten, kind: 'target' });
    var nb = Math.round(ns * 5) + (ns > 0.15 ? 1 : 0);
    for (var k = 0; k < nb; k++) bands.push({ bp: Math.round(180 + rng() * (Math.max(size * 2.2, 1500) - 180)), i: clamp(ns * (0.5 + rng() * 0.7) * 0.9, 0.02, 0.9), kind: 'ns' });
    var smear = null, smI = clamp((ns - 0.3) * 1.5, 0, 1);
    if (ng > tplHigh && kind === 'sample') smI = Math.max(smI, clamp(0.3 + 0.2 * Math.log(ng / tplHigh) / Math.LN10 * 2, 0, 0.9));
    if (smI > 0.05) smear = { lo: 150, hi: Math.max(size * 3, 2500), i: smI };
    if (dI > 0.04 && kind !== 'pc' || (kind === 'pc' && dI > 0.12)) bands.push({ bp: 45, i: dI, kind: 'dimer' });
    var m = { tmF: tmF, tmR: tmR, tmMin: tmMin, dT: dT, free: free, eff: eff, spec: spec, L: L, inten: inten, ns: ns, dI: dI, pot: pot, inhib: inhib, copies: copies, need: need };
    return { name: kind === 'sample' ? 'নমুনা' : kind === 'pc' ? 'পজিটিভ কন্ট্রোল' : 'NTC (টেমপ্লেট ছাড়া)', key: kind, bands: bands, smear: smear, notes: notes, m: m };
  }

  /* পুরো এক্সপেরিমেন্ট: PCR লেন + জেল */
  function simulate(P, C) {
    var show = P.ctrl || C.showCtrl, lanes = [pcrLane(P, C, 'sample')];
    var pc = pcrLane(P, C, 'pc'), ntc = pcrLane(P, C, 'ntc');
    if (show) { lanes.push(pc); lanes.push(ntc); }
    var gel = runGel(lanes, P.gel, C.ladder || 'bp100');
    return { lanes: lanes, gel: gel, sample: lanes[0], pc: pc, ntc: ntc, showCtrl: !!show, P: P, C: C };
  }

  /* সফল কি না: কারণসহ। gel.flags বিবেচনায় নিয়ে */
  function judge(res) {
    var C = res.C, why = [], s = res.sample, g = res.gel, fl = g.flags;
    var gs = g.lanes[1], tb = null;
    gs.bands.forEach(function (b) { if (b.kind === 'target') tb = b; });
    if (!fl.visible) why.push('gel_stain');
    if (fl.noMigrate) why.push('gel_buffer');
    if (fl.offGel) why.push('gel_off');
    if (fl.compressed) why.push('gel_compressed');
    if (fl.smile) why.push('gel_volt');
    if (fl.overload) why.push('gel_load');
    if (fl.faint) why.push('gel_loadlow');
    if (C.targetAbsent) { if (res.pc.m.inten < 0.45) why.push('pc_fail'); return { ok: !why.length, why: why, trueNeg: true }; }
    if (!tb || tb.i < 0.4) why.push(tb ? 'weak' : 'noband');
    else if (tb.off || tb.stuck) why.push('gel_off');
    var extra = s.bands.filter(function (b) { return b.kind === 'ns' && b.i > 0.15; });
    if (extra.length) why.push('nonspecific');
    if (s.smear && s.smear.i > 0.15) why.push('smear');
    if (s.m.dI > 0.3) why.push('dimer');
    if (res.ntc.bands.some(function (b) { return b.kind !== 'dimer' && b.i > 0.05; })) why.push('ntc');
    if (res.pc.m.inten < 0.4 && (res.pc.notes.length || res.showCtrl)) why.push('pc_fail');
    return { ok: why.length === 0, why: why };
  }

  /* =====================================================================
     ২. ফরেনসিক STR
     ===================================================================== */
  var LOCI = [
    { id: 'TH01', base: 70, f: { 6: .22, 7: .18, 8: .10, 9: .16, 9.3: .30, 10: .04 } },
    { id: 'D3S1358', base: 90, f: { 14: .10, 15: .27, 16: .24, 17: .22, 18: .13, 19: .04 } },
    { id: 'D5S818', base: 120, f: { 9: .04, 10: .05, 11: .38, 12: .37, 13: .14, 14: .02 } },
    { id: 'D13S317', base: 150, f: { 8: .12, 9: .09, 10: .07, 11: .32, 12: .25, 13: .10, 14: .05 } },
    { id: 'D7S820', base: 180, f: { 8: .17, 9: .10, 10: .26, 11: .30, 12: .14, 13: .03 } },
    { id: 'D8S1179', base: 210, f: { 10: .06, 11: .07, 12: .14, 13: .30, 14: .22, 15: .15, 16: .06 } },
    { id: 'CSF1PO', base: 240, f: { 9: .03, 10: .22, 11: .30, 12: .35, 13: .10 } },
    { id: 'vWA', base: 270, f: { 14: .09, 15: .10, 16: .22, 17: .28, 18: .21, 19: .08, 20: .02 } },
    { id: 'D21S11', base: 310, f: { 27: .04, 28: .16, 29: .21, 30: .27, 31: .10, 32: .12, 33: .07, 34: .03 } },
    { id: 'D18S51', base: 360, f: { 12: .12, 13: .14, 14: .17, 15: .15, 16: .14, 17: .12, 18: .09, 19: .07 } },
    { id: 'FGA', base: 420, f: { 19: .07, 20: .14, 21: .18, 22: .19, 23: .15, 24: .14, 25: .09, 26: .04 } }
  ];
  LOCI.forEach(function (L) { var s = 0, k; for (k in L.f) s += L.f[k]; for (k in L.f) L.f[k] = L.f[k] / s; L.alleles = Object.keys(L.f).map(Number).sort(function (a, b) { return a - b; }); });
  var LOCUS = {}; LOCI.forEach(function (L) { LOCUS[L.id] = L; });
  function alleleBp(L, a) { return L.base + 4 * Math.floor(a) + Math.round((a % 1) * 10); }
  function cmpA(a, b) { return a - b; }
  function pickAllele(L, rng) { var r = rng(), c = 0, i; for (i = 0; i < L.alleles.length; i++) { c += L.f[L.alleles[i]]; if (r <= c) return L.alleles[i]; } return L.alleles[L.alleles.length - 1]; }

  /* প্রোফাইল: { sex:'XY', g: { locusId: [a,b] } } */
  function randProfile(seed, sex) {
    var rng = rngFrom(seed), g = {};
    LOCI.forEach(function (L) { g[L.id] = [pickAllele(L, rng), pickAllele(L, rng)].sort(cmpA); });
    return { sex: sex || (rng() < 0.5 ? 'XY' : 'XX'), g: g };
  }
  /* n-টি লোকাসে অ্যালিল বদলে ভিন্ন প্রোফাইল (বাকিগুলো মূলের মতোই, তাই "কাছাকাছি" ডিকয়) */
  function diffProfile(p, n, seed, keepIds) {
    var rng = rngFrom(seed), q = copy(p), ids = shuffle(LOCI.map(function (L) { return L.id; }).filter(function (i) { return !keepIds || keepIds.indexOf(i) < 0; }), rng).slice(0, n);
    ids.forEach(function (id) {
      var L = LOCUS[id], cur = p.g[id], opts = L.alleles.filter(function (a) { return cur.indexOf(a) < 0; });
      var a = opts[Math.floor(rng() * opts.length)], b = rng() < 0.5 ? a : opts[Math.floor(rng() * opts.length)];
      q.g[id] = [a, b].sort(cmpA);
    });
    q.sex = p.sex; return q;
  }
  function gametes(p, id, rng) { return p.g[id][rng() < 0.5 ? 0 : 1]; }
  function childOf(m, f, seed, o) {
    o = o || {}; var rng = rngFrom(seed), g = {};
    LOCI.forEach(function (L) { g[L.id] = [gametes(m, L.id, rng), gametes(f, L.id, rng)].sort(cmpA); });
    var sex = o.sex || (rng() < 0.5 ? 'XX' : 'XY');
    return { sex: sex, g: g };
  }
  function siblingPair(seed) {
    var mom = randProfile(seed + 'm', 'XX'), dad = randProfile(seed + 'd', 'XY');
    return { mom: mom, dad: dad, a: childOf(mom, dad, seed + 'a', { sex: 'XY' }), b: childOf(mom, dad, seed + 'b', { sex: 'XY' }) };
  }
  function degrade(p, cutoff, partialId) {   // cutoff bp-এর বেশি লোকাস নেই; partialId-তে একটি অ্যালিল ড্রপআউট
    var q = { sex: p.sex, g: {}, meta: {} };
    LOCI.forEach(function (L) {
      if (L.base > cutoff) { q.g[L.id] = null; q.meta[L.id] = 'nodata'; }
      else if (L.id === partialId && p.g[L.id][0] !== p.g[L.id][1]) { q.g[L.id] = [p.g[L.id][0]]; q.meta[L.id] = 'partial'; }
      else q.g[L.id] = p.g[L.id].slice();
    });
    return q;
  }
  function mixture(a, b) {   // দুইজনের অ্যালিল-সেট
    var q = { sex: a.sex === b.sex ? a.sex : 'XY', g: {}, mix: true };
    LOCI.forEach(function (L) { var s = {}; a.g[L.id].concat(b.g[L.id]).forEach(function (x) { s[x] = 1; }); q.g[L.id] = Object.keys(s).map(Number).sort(cmpA); });
    return q;
  }

  /* তুলনা: প্রতিটি লোকাসে ফল */
  function compareLocus(ev, sus, id) {
    var e = ev.g[id], s = sus.g[id]; if (!e) return 'nodata';
    if (ev.meta && ev.meta[id] === 'partial') return e.indexOf(s[0]) >= 0 || e.indexOf(s[1]) >= 0 ? 'partial' : 'mismatch';
    if (ev.mix) {   // মিশ্র: সন্দেহভাজনের সব অ্যালিল মিশ্রণে আছে কি না
      return s.every(function (a) { return e.indexOf(a) >= 0; }) ? 'incl' : 'mismatch';
    }
    var same = e.length === s.length && e.every(function (a, i) { return a === s[i]; });
    if (same) return 'match';
    return e.some(function (a) { return s.indexOf(a) >= 0; }) ? 'share' : 'mismatch';
  }
  function compareProfile(ev, sus) {
    var res = {}, n = { match: 0, share: 0, mismatch: 0, nodata: 0, partial: 0, incl: 0 };
    LOCI.forEach(function (L) { var r = compareLocus(ev, sus, L.id); res[L.id] = r; n[r]++; });
    var sexMis = !ev.mix && ev.sex && sus.sex && ev.sex !== sus.sex;
    var excluded = (ev.mix ? n.mismatch : n.mismatch + n.share) >= 1 || sexMis, typed = LOCI.length - n.nodata;
    return { per: res, n: n, excluded: excluded, typed: typed, sexMis: sexMis, verdict: excluded ? 'excl' : (typed >= 8 ? 'incl' : 'inconc') };
  }
  /* মিশ্র নমুনা: জানা কন্ট্রিবিউটর (ভিকটিম) বাদ দিয়ে বাকি অ্যালিল */
  function remainder(mix, known) { var o = {}; LOCI.forEach(function (L) { o[L.id] = mix.g[L.id].filter(function (a) { return known.g[L.id].indexOf(a) < 0; }); }); return o; }
  function mixConsistent(mix, known, sus) {
    var res = {}, ok = true;
    LOCI.forEach(function (L) {
      var m = mix.g[L.id], k = known.g[L.id], s = sus.g[L.id], inM = s.every(function (a) { return m.indexOf(a) >= 0; });
      var covered = m.every(function (a) { return k.indexOf(a) >= 0 || s.indexOf(a) >= 0; });
      res[L.id] = inM && covered; if (!(inM && covered)) ok = false;
    });
    return { per: res, ok: ok };
  }

  /* জেনোটাইপ ফ্রিকোয়েন্সি, NRC II 4.10 (θ = সাবপপুলেশন সংশোধন) */
  function genoFreq(id, g, theta) {
    var L = LOCUS[id], th = theta == null ? 0.01 : theta, p = L.f[g[0]], q = L.f[g[1]], d = (1 + th) * (1 + 2 * th);
    if (g[0] === g[1]) return (2 * th + (1 - th) * p) * (3 * th + (1 - th) * p) / d;
    return 2 * (th + (1 - th) * p) * (th + (1 - th) * q) / d;
  }
  function rmp(profile, ids, theta) {
    var prod = 1, used = 0;
    (ids || LOCI.map(function (L) { return L.id; })).forEach(function (id) { var g = profile.g[id]; if (!g || g.length < 2) return; prod *= genoFreq(id, g, theta); used++; });
    return { p: prod, oneIn: prod > 0 ? 1 / prod : Infinity, loci: used };
  }
  function sci(x) {   // "১ in ৩.৪ × ১০⁸"
    if (!isFinite(x)) return '∞';
    if (x < 1000) return bn(Math.round(x).toLocaleString('en-US'));
    var e = Math.floor(Math.log(x) / Math.LN10), m = x / Math.pow(10, e), sup = '⁰¹²³⁴⁵⁶⁷⁸⁹';
    return bn(m.toFixed(1)) + ' × ১০' + String(e).replace(/\d/g, function (d) { return sup[d]; });
  }

  /* সহোদরের সাথে মিলে যাওয়ার সম্ভাবনা (পূর্ণ ভাই-বোন): হোমোজাইগাস (1+p)²/4, হেটেরোজাইগাস (1+pa+pb+2papb)/4 */
  function sibRmp(profile, ids) {
    var prod = 1;
    (ids || LOCI.map(function (L) { return L.id; })).forEach(function (id) {
      var g = profile.g[id]; if (!g || g.length < 2) return; var f = LOCUS[id].f, pa = f[g[0]], pb = f[g[1]];
      prod *= g[0] === g[1] ? Math.pow(1 + pa, 2) / 4 : (1 + pa + pb + 2 * pa * pb) / 4;
    });
    return { p: prod, oneIn: 1 / prod };
  }

  /* পিতৃত্ব: P(সন্তান | মা, X) */
  function childProb(c, m, f, id, mode) {   // mode 'af' = সন্দেহভাজন বাবা, 'rand' = এলোমেলো পুরুষ
    var L = LOCUS[id], tot = 0, ma, fa, key = c.slice().sort(cmpA).join(','), mg = m, fAll;
    mg.forEach(function (x) {
      if (mode === 'af') { f.forEach(function (y) { if ([x, y].sort(cmpA).join(',') === key) tot += 0.25; }); }
      else L.alleles.forEach(function (y) { if ([x, y].sort(cmpA).join(',') === key) tot += 0.5 * L.f[y]; });
    });
    return tot;
  }
  function paternity(child, mom, af) {
    var per = {}, pi = 1, mism = 0;
    LOCI.forEach(function (L) {
      var c = child.g[L.id], m = mom.g[L.id], f = af.g[L.id], a = childProb(c, m, f, L.id, 'af'), b = childProb(c, m, f, L.id, 'rand');
      var r = { pi: b > 0 ? a / b : 0, excl: a === 0 }; per[L.id] = r; if (a === 0) mism++; else pi *= r.pi;
    });
    return { per: per, mism: mism, pi: pi, prob: pi / (pi + 1) };
  }

  /* ইলেক্ট্রোফেরোগ্রামের পিক (SVG-র জন্য): হাইট RFU, স্টাটার, নয়েজ */
  function peaks(profile, seed, o) {
    o = o || {}; var rng = rngFrom(seed), out = {};
    LOCI.forEach(function (L) {
      var g = profile.g[L.id]; if (!g) { out[L.id] = []; return; }
      var ps = [], hom = g.length === 2 && g[0] === g[1], low = profile.meta && profile.meta[L.id] === 'partial';
      var ratio = o.ratio || null;
      g.forEach(function (a, i) {
        var h = (hom ? 2600 : 1500) * (0.8 + rng() * 0.4);
        if (profile.mix) { var vic = o.knownAlleles && o.knownAlleles[L.id] && o.knownAlleles[L.id].indexOf(a) >= 0; h = (vic ? 2000 : 700) * (0.8 + rng() * 0.4); }
        if (o.scale) h *= o.scale;
        if (low) h = 90 + rng() * 30;
        ps.push({ a: a, h: Math.round(h), st: false });
        if (h > 250) ps.push({ a: a - 1, h: Math.round(h * 0.07 * (0.7 + rng() * 0.6)), st: true });   // স্টাটার
      });
      out[L.id] = ps;
    });
    return out;
  }

  /* =====================================================================
     ৩. রোগ নির্ণয়ের স্কোর
     ===================================================================== */
  function dxScore(c, st) {   // c: কেস; st: {tests:[id], dx:'id', costOf:{id:cost}}
    var done = st.tests || [], cost = 0, waste = 0, need = c.confirm || [], useful = (c.useful || []).concat(need);
    done.forEach(function (t) { var k = st.costOf[t] || 0; cost += k; if (useful.indexOf(t) < 0) waste += k; });
    var confirmed = need.length ? need.some(function (t) { return done.indexOf(t) >= 0; }) : true;
    var correct = st.dx === c.answer, budget = c.budget || 6000;
    var eff = clamp(20 - Math.round(waste / budget * 40), 0, 20);
    var score = (correct ? 60 : 0) + (confirmed ? 20 : 0) + eff;
    return { score: score, correct: correct, confirmed: confirmed, cost: cost, waste: waste, eff: eff, wasted: done.filter(function (t) { return useful.indexOf(t) < 0; }) };
  }

  /* PCR ট্রাবলশুটিং স্কোর */
  function tsScore(st) {   // st: {clues, diagWrong, diagMissed, runs, solved, accepted}
    var s = 100 - 6 * (st.clueCost || 0) - 7 * (st.diagWrong || 0) - 5 * (st.diagMissed || 0) - 5 * Math.max(0, (st.runs || 1) - 1) - 10 * (st.badAccept || 0);
    return st.solved ? clamp(s, 25, 100) : 0;
  }

  return {
    bn: bn, clamp: clamp, copy: copy, rngFrom: rngFrom, shuffle: shuffle, hashStr: hashStr,
    LADDERS: LADDERS, runUnits: runUnits, migration: migration, runGel: runGel,
    GOOD: GOOD, tmOf: tmOf, freeMg: freeMg, dimerPot: dimerPot, pcrLane: pcrLane, simulate: simulate, judge: judge,
    LOCI: LOCI, LOCUS: LOCUS, alleleBp: alleleBp, randProfile: randProfile, diffProfile: diffProfile, childOf: childOf, siblingPair: siblingPair,
    degrade: degrade, mixture: mixture, compareLocus: compareLocus, compareProfile: compareProfile, remainder: remainder, mixConsistent: mixConsistent,
    genoFreq: genoFreq, rmp: rmp, sibRmp: sibRmp, sci: sci, paternity: paternity, peaks: peaks,
    dxScore: dxScore, tsScore: tsScore
  };
});
