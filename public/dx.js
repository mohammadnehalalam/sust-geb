/* GEB Hub: ডায়াগনস্টিক ল্যাব UI (v3.8)
   তিনটি মোড: (১) PCR ট্রাবলশুটিং, (২) ফরেনসিক DNA কেস, (৩) রোগ নির্ণয়
   হিসাব: dx-core.js, ডেটা: dx-data.js, স্টাইল: dx.css। সব কেস কাল্পনিক, শেখার জন্য সরলীকৃত। */
(function () {
  'use strict';
  var D = window.GEBDx, X = window.GEBDxData, root = document.getElementById('dxMount');
  if (!D || !X || !root) return;
  var bn = D.bn, KEY = 'geb_dx_v1';

  /* ---------- সংরক্ষণ ---------- */
  function load() { try { var o = JSON.parse(localStorage.getItem(KEY) || '{}'); return { ts: o.ts || {}, fo: o.fo || {}, dx: o.dx || {} }; } catch (e) { return { ts: {}, fo: {}, dx: {} }; } }
  var DB = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fix1(n) { return bn((Math.round(n * 10) / 10).toString()); }
  function stars(n) { return '★★★'.slice(0, n) + '☆☆☆'.slice(0, 3 - n); }
  function award(kind, id, score) {
    var rec = DB[kind][id] || { best: 0, n: 0 }, first = !rec.n;
    var xp = first ? 15 + Math.round(score / 4) : Math.max(0, Math.round((score - rec.best) / 5));
    rec.n++; rec.best = Math.max(rec.best, score); DB[kind][id] = rec; save();
    if (window.GEBGM) { var r = GEBGM.award({ xp: xp, session: first }); return GEBGM.awardHtml(r); }
    return '<div class="gm-award"><b>+' + bn(xp) + ' XP</b></div>';
  }
  function doneCount(kind, list) { return list.filter(function (c) { return DB[kind][c.id] && DB[kind][c.id].n; }).length; }

  /* ---------- জেল SVG ---------- */
  function gelSvg(gel) {
    var lanes = gel.lanes, n = lanes.length, lw = 54, gx = 48, W = gx + n * lw + 12, top = 22, H = 250, fl = gel.flags, o = [];
    o.push('<svg viewBox="0 0 ' + W + ' ' + (H + top + 30) + '" width="' + Math.min(W * 1.2, 420) + '" role="img" aria-label="অ্যাগারোজ জেল">');
    o.push('<defs><filter id="gblur"><feGaussianBlur stdDeviation="1.1"/></filter><filter id="gblur2"><feGaussianBlur stdDeviation="2.4"/></filter><linearGradient id="gsm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#38F5B4" stop-opacity="0"/><stop offset=".5" stop-color="#38F5B4" stop-opacity="1"/><stop offset="1" stop-color="#38F5B4" stop-opacity="0"/></linearGradient></defs>');
    o.push('<rect x="' + (gx - 6) + '" y="' + (top - 8) + '" width="' + (n * lw + 12) + '" height="' + (H + 14) + '" rx="6" fill="#0F2237" stroke="#1d3a57"/>');
    lanes.forEach(function (ln, i) {
      var x = gx + i * lw + 6, w = lw - 14;
      o.push('<rect x="' + x + '" y="' + (top - 6) + '" width="' + w + '" height="8" rx="2" fill="#050C14" stroke="#2a4a6a"/>');
      var lab = ln.ladder ? 'ল্যাডার' : ln.key === 'pc' ? 'পজি. কন্ট্রোল' : ln.key === 'ntc' ? 'NTC' : 'নমুনা';
      o.push('<text x="' + (x + w / 2) + '" y="' + (top + H + 18) + '" font-size="9.5" text-anchor="middle" fill="#9fb4c4">' + lab + '</text>');
      if (!fl.visible) return;
      if (fl.noMigrate) { o.push('<rect x="' + x + '" y="' + (top + 2) + '" width="' + w + '" height="14" fill="#38F5B4" opacity="' + (ln.ladder ? .35 : .25) + '" filter="url(#gblur2)"/>'); return; }
      if (ln.smear && ln.smear.i > 0.03) {
        var y1 = top + 8 + H * Math.max(0.04, D.migration(ln.smear.hi, gel.G.pct, gel.run)), y2 = top + 8 + H * Math.min(0.96, D.migration(ln.smear.lo, gel.G.pct, gel.run));
        if (y2 > y1) o.push('<rect x="' + x + '" y="' + y1 + '" width="' + w + '" height="' + (y2 - y1) + '" fill="url(#gsm)" opacity="' + Math.min(0.75, ln.smear.i * 0.9) + '" filter="url(#gblur)"/>');
      }
      ln.bands.forEach(function (b) {
        if (b.off || b.pos > 0.97) return;
        var y = top + 8 + H * Math.max(0.02, b.pos), thick = fl.overload && !ln.ladder ? 6 : 2.6, op = Math.min(1, Math.max(0.05, b.i));
        if (b.kind === 'dimer') { op *= 0.9; }
        var col = ln.ladder ? '#9ee6ff' : '#38F5B4';
        if (fl.smile && !ln.ladder) o.push('<path d="M' + x + ',' + (y - 3) + ' Q' + (x + w / 2) + ',' + (y + 4) + ' ' + (x + w) + ',' + (y - 3) + '" stroke="' + col + '" stroke-width="' + (thick + 1) + '" fill="none" opacity="' + op + '" filter="url(#gblur)"/>');
        else o.push('<rect x="' + x + '" y="' + (y - thick / 2) + '" width="' + w + '" height="' + thick + '" rx="1.3" fill="' + col + '" opacity="' + op + '" filter="url(#gblur)"/>');
        if (ln.ladder) o.push('<text x="' + (x - 4) + '" y="' + (y + 3) + '" font-size="8" text-anchor="end" fill="#7da3bd">' + bn(b.bp >= 1000 ? (b.bp / 1000) + 'k' : b.bp) + '</text>');
      });
    });
    o.push('<text x="' + (gx - 6) + '" y="' + (top - 12) + '" font-size="8" fill="#5f87a3">− ক্যাথোড</text><text x="' + (gx - 6) + '" y="' + (top + H + 28) + '" font-size="8" fill="#5f87a3">+ অ্যানোড</text>');
    o.push('</svg>');
    return o.join('');
  }
  function gelFlagsHtml(gel) {
    var m = { stain: 'স্টেইন নেই', buffer: 'বাফার নেই', volt: 'বেশি ভোল্টেজ', load: 'নমুনা বেশি', loadlow: 'নমুনা খুব কম', offgel: 'ব্যান্ড জেলের বাইরে', compressed: 'ব্যান্ড চাপা' };
    return gel.issues.length ? '<div class="dx-flags">' + gel.issues.map(function (i) { return '<span class="dx-chip sig">' + esc(m[i] || i) + '</span>'; }).join('') + '</div>' : '';
  }

  /* ---------- ইলেক্ট্রোফেরোগ্রাম SVG (লোকাস-প্রতি প্যানেল) ---------- */
  var DYE = ['#4aa3ff', '#34c759', '#f2c230', '#ff6b6b'];
  function epSvg(profile, seed, o) {
    o = o || {}; var pk = D.peaks(profile, seed, o), out = ['<div class="dx-ep">'];
    D.LOCI.forEach(function (L, idx) {
      var w = 120, h = 66, base = 54, ps = pk[L.id], amin = L.alleles[0] - 1.2, amax = L.alleles[L.alleles.length - 1] + 1.2, col = DYE[idx % 4], s = [];
      function X0(a) { return 8 + (a - amin) / (amax - amin) * (w - 16); }
      s.push('<svg viewBox="0 0 ' + w + ' ' + h + '"><line x1="4" y1="' + base + '" x2="' + (w - 4) + '" y2="' + base + '" stroke="#35506b"/>');
      s.push('<line x1="4" y1="' + (base - 150 / 3000 * 46) + '" x2="' + (w - 4) + '" y2="' + (base - 150 / 3000 * 46) + '" stroke="#5a7a96" stroke-dasharray="2 2" stroke-width=".6"/>');
      if (!ps || !ps.length) s.push('<text x="' + (w / 2) + '" y="' + (h / 2) + '" font-size="9" text-anchor="middle" fill="#5f87a3">' + (o.empty || 'তথ্য নেই') + '</text>');
      else ps.forEach(function (p) {
        var x = X0(p.a), ph = Math.min(48, p.h / 3000 * 46 + 1), hw = 3.2;
        s.push('<path d="M' + (x - hw) + ',' + base + ' L' + x + ',' + (base - ph) + ' L' + (x + hw) + ',' + base + '" fill="' + col + '" opacity="' + (p.st ? .45 : .95) + '"/>');
        if (!p.st) s.push('<text x="' + x + '" y="' + (base - ph - 2) + '" font-size="8.5" text-anchor="middle" fill="#dbe8f2" font-weight="700">' + esc(p.a) + '</text>');
      });
      s.push('</svg>'); out.push('<figure>' + s.join('') + '<figcaption>' + esc(L.id) + '</figcaption></figure>');
    });
    var sx = profile.sex, am = ['<svg viewBox="0 0 120 66"><line x1="4" y1="54" x2="116" y2="54" stroke="#35506b"/>'];
    am.push('<path d="M34,54 L38,12 L42,54" fill="#ff6b6b"/><text x="38" y="9" font-size="8.5" text-anchor="middle" fill="#dbe8f2" font-weight="700">X</text>');
    if (sx === 'XY') am.push('<path d="M74,54 L78,22 L82,54" fill="#ff6b6b"/><text x="78" y="19" font-size="8.5" text-anchor="middle" fill="#dbe8f2" font-weight="700">Y</text>');
    am.push('</svg>'); out.push('<figure>' + am.join('') + '<figcaption>AMEL (লিঙ্গ)</figcaption></figure></div>');
    return out.join('');
  }

  /* ---------- রাউটার ---------- */
  var V = { tab: 'ts', id: null, st: null, scroll: 0 };
  function head() {
    var t = [['ts', 'ল্যাব ট্রাবলশুটিং', 'PCR ও জেল সমস্যার কারণ খুঁজুন'], ['fo', 'ফরেনসিক DNA কেস', 'প্রমাণ থেকে অপরাধী শনাক্ত'], ['dx', 'রোগ নির্ণয়', 'রোগীর কেস থেকে আণবিক পরীক্ষা']];
    var tot = X.TS.length + X.FOR.length + X.DX.length, dn = doneCount('ts', X.TS) + doneCount('fo', X.FOR) + doneCount('dx', X.DX);
    return '<div class="dx-tabs" role="tablist">' + t.map(function (x) { return '<button class="dx-tab" role="tab" data-a="tab" data-v="' + x[0] + '" aria-selected="' + (V.tab === x[0]) + '">' + x[1] + '<small>' + x[2] + '</small></button>'; }).join('') + '</div>' +
      '<div class="dx-sum"><span class="dx-chip">সম্পন্ন ' + bn(dn) + '/' + bn(tot) + '</span><span class="dx-chip mut">সব কেস কাল্পনিক · শেখার জন্য সরলীকৃত · আসল ডায়াগনসিস বা আইনি মত নয়</span></div>';
  }
  function render() {
    var body = '';
    if (V.id) body = V.tab === 'ts' ? tsView() : V.tab === 'fo' ? foView() : dxView();
    else body = V.tab === 'ts' ? tsList() : V.tab === 'fo' ? foList() : dxList();
    root.innerHTML = '<div class="dx">' + head() + body + '</div>';
  }
  function listCards(kind, list, label) {
    return '<div class="dx-grid">' + list.map(function (c) {
      var r = DB[kind][c.id], d = r && r.n;
      return '<button class="dx-case' + (d ? ' done' : '') + '" data-a="open" data-id="' + c.id + '"><span class="dx-lvl">' + stars(c.lvl || 1) + '</span><b>' + esc(c.title) + '</b><span class="st">' + (d ? 'সেরা স্কোর ' + bn(r.best) + ' · ' + bn(r.n) + ' বার' : label) + '</span></button>';
    }).join('') + '</div>';
  }

  /* =====================================================================
     ১. PCR / জেল ট্রাবলশুটিং
     ===================================================================== */
  var FIELDS = [
    ['মিক্স', [['tplNg', 'টেমপ্লেট (ng)', .1, 0, 5000], ['mg', 'MgCl₂ (mM)', .1, 0, 10], ['dntp', 'dNTP (µM/প্রতিটি)', 10, 0, 2000], ['primer', 'প্রাইমার (µM/প্রতিটি)', .05, 0, 5], ['taq', 'Taq (ইউনিট)', .05, 0, 6], ['dmso', 'DMSO (%)', 1, 0, 15]]],
    ['প্রোগ্রাম', [['denT', 'ডিনেচারেশন (°C)', 1, 60, 105], ['denS', 'ডিনেচারেশন (সেকেন্ড)', 1, 0, 120], ['ta', 'অ্যানিলিং (°C)', .5, 30, 80], ['taS', 'অ্যানিলিং (সেকেন্ড)', 1, 0, 120], ['extT', 'এক্সটেনশন (°C)', 1, 50, 85], ['extS', 'এক্সটেনশন (সেকেন্ড)', 5, 0, 600], ['cycles', 'সাইকেল', 1, 5, 60]]],
    ['জেল', [['gel.pct', 'অ্যাগারোজ (%)', .1, .3, 4], ['gel.vcm', 'ভোল্টেজ (V/cm)', .5, 1, 20], ['gel.mins', 'সময় (মিনিট)', 5, 5, 180], ['gel.loadUl', 'ঢালা নমুনা (µL)', .5, 0, 30]]]
  ];
  var WHY = { noband: 'নমুনার লেনে কোনো ব্যান্ড নেই।', weak: 'ব্যান্ড আছে কিন্তু খুব ক্ষীণ।', nonspecific: 'আসল ব্যান্ডের পাশে অতিরিক্ত ব্যান্ড আছে।', smear: 'লেনে ঝাপসা স্মিয়ার।', dimer: 'নিচে প্রাইমার-ডাইমারের উজ্জ্বল ব্যান্ড।', ntc: 'NTC (টেমপ্লেট ছাড়া) লেনেও ব্যান্ড, দূষণের ইঙ্গিত।', pc_fail: 'পজিটিভ কন্ট্রোলও ঠিকমতো আসেনি।', gel_stain: 'জেলে কিছুই দেখা যাচ্ছে না, ল্যাডারও না।', gel_buffer: 'ডিএনএ ওয়েলের কাছেই ঝাপসা, জেল চলেনি।', gel_off: 'ব্যান্ড জেল ছেড়ে চলে গেছে বা প্রান্তে।', gel_compressed: 'ব্যান্ডগুলো ওয়েলের কাছে চাপা, আলাদা হয়নি।', gel_volt: 'ব্যান্ড বাঁকা ও ঝাপসা (ভোল্টেজ বেশি)।', gel_load: 'ব্যান্ড মোটা ও ঝাপসা (বেশি ঢালা হয়েছে)।', gel_loadlow: 'ব্যান্ড খুব ফিকে (খুব অল্প ঢালা)।' };
  var CLUES = [['mix', 'PCR মিক্স রেসিপি', 1], ['cycle', 'থার্মোসাইক্লার প্রোগ্রাম', 1], ['primer', 'প্রাইমার রিপোর্ট', 1], ['tpl', 'টেমপ্লেটের মান', 1], ['log', 'ল্যাব লগ', 1], ['ctrl', 'কন্ট্রোল লেন যোগ করুন', 2]];

  function getK(P, k) { return k.indexOf('gel.') === 0 ? P.gel[k.slice(4)] : P[k]; }
  function setK(P, k, v) { if (k.indexOf('gel.') === 0) P.gel[k.slice(4)] = v; else P[k] = v; }
  function tsList() {
    return '<p class="dx-intro">একটি "ব্যর্থ" PCR বা জেল আপনার সামনে। ক্লু সংগ্রহ করুন (প্রতিটির সামান্য খরচ আছে), সম্ভাব্য কারণ বাছুন, প্যারামিটার ঠিক করে আবার রান করুন। কম ক্লু আর কম চেষ্টায় সফল হলে বেশি স্কোর। প্রাইমারের Tm আর ডাইমার হিসাব আপনার বায়োটেক টুলবক্সের ইঞ্জিন থেকেই আসছে।</p>' + listCards('ts', X.TS, 'সমস্যা খুঁজুন');
  }
  function tsOpen(id) {
    var c = X.TS.filter(function (x) { return x.id === id; })[0], rng = D.rngFrom('opt' + id), others = Object.keys(X.CAUSES).filter(function (k) { return c.causes.indexOf(k) < 0; });
    var opts = D.shuffle(c.causes.concat(D.shuffle(others, rng).slice(0, 7)), rng);
    V.id = id; V.st = { c: c, P: D.copy(c.P0), clues: {}, clueCost: 0, opts: opts, picked: {}, subm: 0, diagWrong: 0, diagMissed: 0, diagOK: false, reveal: false, diagMsg: '', runs: 0, last: null, solved: false, badAccept: 0, msg: '', award: '', score: 0, open: {} };
    if (c.ctx.showCtrl) V.st.P.ctrl = true;
  }
  function gc(seq) { var n = 0; for (var i = 0; i < seq.length; i++) if (/[GC]/.test(seq[i])) n++; return Math.round(n / seq.length * 100); }
  function clueBody(s, key) {
    var c = s.c, P = c.P0, pr = c.ctx.primers.orig, h = '';
    if (key === 'mix') { var free = D.freeMg(P); h = '<h5>PCR মিক্স (২৫ µL বিক্রিয়া)</h5><table><tr><td>টেমপ্লেট</td><td><b>' + fix1(P.tplNg) + ' ng</b></td><td>MgCl₂</td><td><b>' + fix1(P.mg) + ' mM</b></td></tr><tr><td>dNTP</td><td><b>' + bn(P.dntp) + ' µM প্রতিটি</b></td><td>প্রাইমার</td><td><b>' + fix1(P.primer) + ' µM প্রতিটি</b></td></tr><tr><td>Taq</td><td><b>' + fix1(P.taq) + ' U</b></td><td>DMSO</td><td><b>' + bn(P.dmso) + '%</b></td></tr></table><p>মুক্ত Mg²⁺ ≈ মোট Mg − (৪ × dNTP) = <b>' + fix1(free) + ' mM</b></p>'; }
    else if (key === 'cycle') { h = '<h5>থার্মোসাইক্লার</h5><table><tr><td>ডিনেচারেশন</td><td><b>' + bn(P.denT) + '°C · ' + bn(P.denS) + ' সে.</b></td></tr><tr><td>অ্যানিলিং</td><td><b>' + fix1(P.ta) + '°C · ' + bn(P.taS) + ' সে.</b></td></tr><tr><td>এক্সটেনশন</td><td><b>' + bn(P.extT) + '°C · ' + bn(P.extS) + ' সে.</b></td></tr><tr><td>সাইকেল</td><td><b>' + bn(P.cycles) + '</b></td></tr></table><p>প্রত্যাশিত প্রোডাক্ট <b>' + bn(c.ctx.size) + ' bp</b>। Taq-এর গতি ≈ ১ মিনিট/kb, অর্থাৎ ন্যূনতম এক্সটেনশন ≈ <b>' + bn(Math.round(c.ctx.size / 1000 * 60)) + ' সে.</b></p>'; }
    else if (key === 'primer') {
      var P1 = D.copy(P), tf = D.tmOf(pr.f, P1), tr = D.tmOf(pr.r, P1), pot = D.dimerPot(pr);
      h = '<h5>প্রাইমার রিপোর্ট' + (c.ctx.primers['new'] ? ' (মূল জোড়া)' : '') + '</h5><table><tr><td>ফরোয়ার্ড</td><td class="mono">' + esc(pr.f) + '</td></tr><tr><td></td><td>Tm ≈ <b>' + fix1(tf) + '°C</b>, GC ' + bn(gc(pr.f)) + '%</td></tr><tr><td>রিভার্স</td><td class="mono">' + esc(pr.r) + '</td></tr><tr><td></td><td>Tm ≈ <b>' + fix1(tr) + '°C</b>, GC ' + bn(gc(pr.r)) + '%</td></tr></table><p>Tm-এর পার্থক্য ' + fix1(Math.abs(tf - tr)) + '°C। প্রস্তাবিত অ্যানিলিং ≈ <b>' + fix1(Math.min(tf, tr) - 5) + '°C</b> (নিচের Tm − ৫)।</p><p>৩′ প্রান্তের পরিপূরকতা: <b>' + bn(pot) + ' বেস</b> ' + (pot >= 4 ? '<span class="dx-chip sig">ডাইমারের ঝুঁকি</span>' : '<span class="dx-chip">ঝুঁকি কম</span>') + '</p>';
      if (c.ctx.primers['new']) { var pn = c.ctx.primers['new']; h += '<p>বিকল্প জোড়া ("বিকল্প প্রাইমার" অপশন): Tm ≈ ' + fix1(D.tmOf(pn.f, P1)) + ' / ' + fix1(D.tmOf(pn.r, P1)) + '°C, ৩′ পরিপূরকতা ' + bn(D.dimerPot(pn)) + ' বেস।</p>'; }
    }
    else if (key === 'tpl') { var inh = !!c.ctx.inhibPerNg, deg = !!c.ctx.degLen; h = '<h5>টেমপ্লেট ডিএনএ-র মান</h5><table><tr><td>প্রকার</td><td><b>' + (c.ctx.tplKind === 'plasmid' ? 'প্লাজমিড' : 'জিনোমিক ডিএনএ') + '</b></td></tr><tr><td>A260/A280</td><td><b>' + (inh ? '১.৭৪' : '১.৮৮') + '</b></td></tr><tr><td>A260/A230</td><td><b>' + (inh ? '০.৮৫ (কম)' : '২.১৫') + '</b></td></tr><tr><td>জেলে</td><td><b>' + (deg ? 'নিচের দিকে স্মিয়ার (ভাঙা)' : 'একটি উচ্চ-আণবিক ওজনের ব্যান্ড (অক্ষত)') + '</b></td></tr></table><p class="dx-gel-cap">A260/A230 ≈ ২.০–২.২ হলে ফেনল, গুয়ানিডিন বা ইথানল ক্যারিওভার নেই বলে ধরা হয়।</p>'; }
    else if (key === 'log') { h = '<h5>ল্যাব লগ</h5><ul>' + (c.logs || []).map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>'; }
    else if (key === 'ctrl') { h = '<h5>কন্ট্রোল লেন</h5><p><b>পজিটিভ কন্ট্রোল</b>: জানা ভালো টেমপ্লেট। এটা ব্যর্থ হলে সমস্যা মিক্স বা প্রোগ্রামে। <b>NTC</b>: টেমপ্লেট ছাড়া। এতে ব্যান্ড মানে দূষণ বা ডাইমার। উপরের জেলে দুটি লেন যোগ হয়েছে।</p>'; }
    return '<div class="dx-panel">' + h + '</div>';
  }
  function tsView() {
    var s = V.st, c = s.c, P0 = D.copy(c.P0); P0.ctrl = !!(s.clues.ctrl || c.ctx.showCtrl);
    var r0 = D.simulate(P0, c.ctx); r0.gel.G = P0.gel;
    var h = '<button class="dx-btn sm dx-back" data-a="back">← সব কেস</button><div class="dx-card"><span class="dx-lvl">' + stars(c.lvl) + '</span><h3>' + esc(c.title) + '</h3><p>' + esc(c.story) + '</p></div>';
    h += '<div class="dx-split"><div><div class="dx-card"><h4>আপনার প্রথম রানের জেল</h4><div class="dx-gel">' + gelSvg(r0.gel) + '</div>' + gelFlagsHtml(r0.gel) + '<p class="dx-gel-cap">প্রত্যাশিত প্রোডাক্ট: ' + bn(c.ctx.size) + ' bp। ল্যাডার ' + (c.ctx.ladder === 'kb1' ? '১ kb' : '১০০ bp') + '।</p></div>';
    h += '<div class="dx-card"><h4>ক্লু সংগ্রহ <span class="dx-chip mut">খরচ: ' + bn(s.clueCost) + ' পয়েন্ট</span></h4><div class="dx-clues">' + CLUES.map(function (k) { var on = s.clues[k[0]]; return '<button class="dx-clue' + (on ? ' on' : '') + '" data-a="clue" data-k="' + k[0] + '">' + k[1] + '<small>' + (on ? 'দেখা হয়েছে' : (k[0] === 'ctrl' && c.ctx.showCtrl ? 'ইতিমধ্যে যোগ' : 'খরচ ' + bn(k[2]))) + '</small></button>'; }).join('') + '</div>';
    CLUES.forEach(function (k) { if (s.clues[k[0]]) h += clueBody(s, k[0]); }); h += '</div></div>';
    /* ডান: রোগ নির্ণয় + ঠিক করা */
    h += '<div><div class="dx-card"><h4>১) কারণ নির্ণয়</h4><p>কী কী কারণে এই ফল হয়েছে? (একাধিক হতে পারে)</p><div class="dx-opts">' + s.opts.map(function (k) {
      var cls = '', mark = ''; if (s.subm && (s.picked[k] !== undefined)) { var pick = s.picked[k]; if (pick) { cls = c.causes.indexOf(k) >= 0 ? ' ok' : ' bad'; mark = c.causes.indexOf(k) >= 0 ? ' ✔' : ' ✘'; } }
      if (s.reveal && c.causes.indexOf(k) >= 0) { cls = ' ok'; mark = ' ✔ (সঠিক কারণ)'; }
      return '<label class="dx-opt' + cls + '"><input type="checkbox" data-a="pick" data-k="' + k + '"' + (s.picked[k] ? ' checked' : '') + '><span>' + esc(X.CAUSES[k]) + mark + '</span></label>';
    }).join('') + '</div><div class="dx-row" style="margin-top:10px"><button class="dx-btn ink" data-a="diag"' + (s.diagOK ? ' disabled' : '') + '>কারণ জমা দিন</button></div>' + (s.diagMsg ? '<div class="dx-msg ' + (s.diagOK ? 'ok' : 'warn') + '">' + s.diagMsg + '</div>' : '') + '</div>';
    if (s.subm) {
      h += '<div class="dx-card"><h4>২) ঠিক করুন ও আবার রান করুন</h4>';
      if (c.ctx.primers['new']) h += '<div class="dx-form" style="margin-bottom:8px"><label>প্রাইমার জোড়া<select data-a="set" data-k="primerSet"><option value="orig"' + (s.P.primerSet === 'orig' ? ' selected' : '') + '>মূল জোড়া</option><option value="new"' + (s.P.primerSet === 'new' ? ' selected' : '') + '>বিকল্প জোড়া</option></select></label></div>';
      FIELDS.forEach(function (g) { var op = s.open[g[0]] !== undefined ? s.open[g[0]] : g[0] !== 'জেল'; h += '<details data-g="' + g[0] + '"' + (op ? ' open' : '') + '><summary>' + g[0] + '</summary><div class="dx-form">' + g[1].map(function (f) { return '<label>' + f[1] + '<input type="number" data-a="set" data-k="' + f[0] + '" step="' + f[2] + '" min="' + f[3] + '" max="' + f[4] + '" value="' + getK(s.P, f[0]) + '"></label>'; }).join('') + (g[0] === 'জেল' ? '<label>স্টেইন<select data-a="set" data-k="gel.stain"><option value="1"' + (s.P.gel.stain ? ' selected' : '') + '>দেওয়া হয়েছে</option><option value="0"' + (!s.P.gel.stain ? ' selected' : '') + '>দেওয়া হয়নি</option></select></label><label>বাফার<select data-a="set" data-k="gel.buffer"><option value="tae"' + (s.P.gel.buffer === 'tae' ? ' selected' : '') + '>TAE আছে</option><option value="water"' + (s.P.gel.buffer === 'water' ? ' selected' : '') + '>বাফার নেই</option></select></label>' : '') + '</div></details>'; });
      h += '<div class="dx-checks"><label><input type="checkbox" data-a="chk" data-k="tplClean"' + (s.P.tplClean ? ' checked' : '') + '>টেমপ্লেট আবার পিউরিফাই করেছি</label><label><input type="checkbox" data-a="chk" data-k="tplFresh"' + (s.P.tplFresh ? ' checked' : '') + '>নতুন/তাজা টেমপ্লেট নিয়েছি</label><label><input type="checkbox" data-a="chk" data-k="clean"' + (s.P.clean ? ' checked' : '') + '>নতুন রিএজেন্ট অ্যালিকোট + ফিল্টার টিপ + আলাদা প্রি-PCR জায়গা</label><label><input type="checkbox" data-a="chk" data-k="ctrl"' + (s.P.ctrl ? ' checked' : '') + (c.ctx.showCtrl ? ' disabled' : '') + '>পজিটিভ কন্ট্রোল ও NTC লেন চালান</label></div>';
      h += '<div class="dx-row"><button class="dx-btn pri" data-a="run"' + (s.solved ? ' disabled' : '') + '>▶ আবার রান করুন</button><button class="dx-btn" data-a="accept"' + (s.solved ? ' disabled' : '') + '>ফলাফল ঠিকই আছে, কিছু বদলানোর নেই</button><span class="dx-chip mut">রান: ' + bn(s.runs) + '</span></div>' + (s.msg ? '<div class="dx-msg warn">' + s.msg + '</div>' : '') + '</div>';
    }
    h += '</div></div>';
    if (s.last) { var L = s.last; h += '<div class="dx-card"><h4>রান #' + bn(s.runs) + ' এর ফল</h4><div class="dx-gel">' + gelSvg(L.res.gel) + '</div>' + gelFlagsHtml(L.res.gel) + (L.j.ok ? '<div class="dx-msg ok">' + (c.trueNeg ? 'কন্ট্রোল ঠিক আছে, নমুনায় ব্যান্ড নেই: আসল (নেগেটিভ) ফলাফল হতে পারে।' : 'পরিষ্কার একক ব্যান্ড, কন্ট্রোল ঠিক।') + '</div>' : '<div class="dx-msg bad"><b>এখনও সমস্যা:</b><ul>' + L.j.why.map(function (w) { return '<li>' + esc(WHY[w] || w) + '</li>'; }).join('') + '</ul></div>') + '</div>'; }
    if (s.solved) {
      h += '<div class="dx-card"><div class="dx-row"><div class="dx-score">' + bn(s.score) + '</div><div><b>সমাধান!</b><br><span class="dx-chip mut">ক্লু ' + bn(s.clueCost) + ' · রান ' + bn(s.runs) + ' · ভুল নির্বাচন ' + bn(s.diagWrong + s.diagMissed) + '</span></div></div>' + s.award + '<h4>শেখার পয়েন্ট</h4><ul>' + c.causes.map(function (k) { return '<li><b>' + esc(X.CAUSES[k]) + '।</b> ' + esc(X.CAUSE_LEARN[k]) + '</li>'; }).join('') + '</ul><div class="dx-row"><button class="dx-btn pri" data-a="next">পরের কেস →</button><button class="dx-btn" data-a="back">তালিকায় ফিরুন</button></div></div>';
    }
    return h;
  }
  function tsDiag() {
    var s = V.st, c = s.c, picked = s.opts.filter(function (k) { return s.picked[k]; });
    if (!picked.length) { s.diagMsg = 'অন্তত একটি কারণ বাছুন।'; return; }
    s.subm++; var wrong = picked.filter(function (k) { return c.causes.indexOf(k) < 0; }), missed = c.causes.filter(function (k) { return picked.indexOf(k) < 0; });
    s.opts.forEach(function (k) { if (s.picked[k] === undefined) s.picked[k] = false; });
    if (!wrong.length && !missed.length) { s.diagOK = true; s.diagMsg = '✔ সব কারণ ঠিক। এবার নিচে সমাধান করে রান করুন।'; return; }
    s.diagWrong += wrong.length; s.diagMissed += missed.length;
    s.diagMsg = (wrong.length ? 'কিছু বাছাই ভুল (লাল)। ' : '') + (missed.length ? 'আরও ' + bn(missed.length) + 'টি কারণ বাকি আছে। ' : '') + (s.subm >= 3 ? 'সঠিক কারণগুলো দেখানো হলো।' : 'আবার চেষ্টা করুন, অথবা ক্লু দেখুন।');
    if (s.subm >= 3) s.reveal = true;
  }
  function tsRun() {
    var s = V.st, c = s.c; s.runs++; s.msg = '';
    var P = D.copy(s.P); P.ctrl = !!P.ctrl || !!c.ctx.showCtrl;
    ['tplNg', 'mg', 'dntp', 'primer', 'taq', 'dmso', 'denT', 'denS', 'ta', 'taS', 'extT', 'extS', 'cycles'].forEach(function (k) { P[k] = +P[k] || 0; });
    P.gel.stain = !!+P.gel.stain || P.gel.stain === true;
    var res = D.simulate(P, c.ctx); res.gel.G = P.gel; var j = D.judge(res); s.last = { res: res, j: j };
    if (j.ok && !c.trueNeg) tsSolve();
  }
  function tsSolve() { var s = V.st; s.solved = true; s.score = D.tsScore({ clueCost: s.clueCost, diagWrong: s.diagWrong, diagMissed: s.diagMissed, runs: s.runs, solved: true, badAccept: s.badAccept }); s.award = award('ts', s.c.id, s.score); }
  function tsAccept() {
    var s = V.st; if (s.c.trueNeg) { if (!s.last) s.runs = Math.max(s.runs, 1); tsSolve(); s.msg = ''; }
    else { s.badAccept++; s.msg = 'না, এই ফলাফল গ্রহণযোগ্য নয়: সমস্যা এখনও আছে। জেল ও কন্ট্রোল আবার খেয়াল করুন।'; }
  }

  /* =====================================================================
     ২. ফরেনসিক DNA কেস
     ===================================================================== */
  var FO_STEPS = [['brief', 'প্রমাণ বাছাই'], ['lab', 'ল্যাব'], ['analysis', 'বিশ্লেষণ'], ['prob', 'সম্ভাবনা'], ['done', 'রিপোর্ট']];
  var VD = { excl: 'বাদ (অন্তত একটি লোকাসে স্পষ্ট অমিল)', incl: 'অন্তর্ভুক্ত (প্রমাণ সঙ্গত)', inconc: 'অনির্ণীত (তথ্য অপর্যাপ্ত)', notexcl: 'বাদ যায় না (সম্ভাব্য পিতা)' };
  function foList() {
    return '<p class="dx-intro">কাল্পনিক অপরাধের প্রমাণ থেকে ডিএনএ প্রোফাইল তৈরি হয়। সঠিক প্রমাণ বাছুন, ল্যাবের QC দেখুন, ইলেক্ট্রোফেরোগ্রাম ও অ্যালিল টেবিল পড়ুন, প্রতিটি সন্দেহভাজন সম্পর্কে সিদ্ধান্ত নিন, তারপর ম্যাচ প্রবাবিলিটির সঠিক ব্যাখ্যা বাছুন। ১১টি STR লোকাস ও লিঙ্গ-মার্কার ব্যবহার হয়েছে; অ্যালিল ফ্রিকোয়েন্সি শেখার জন্য কাল্পনিক।</p>' + listCards('fo', X.FOR, 'তদন্ত শুরু করুন');
  }
  function foOpen(id) {
    var c = X.FOR.filter(function (x) { return x.id === id; })[0], rng = D.rngFrom('mcq' + id), idx = D.shuffle(c.mcq.opts.map(function (_, i) { return i; }), rng);
    V.id = id; V.st = { c: c, step: 'brief', picked: {}, irrel: 0, runIdx: 0, verdict: {}, vsubm: 0, vWrong: 0, vOK: false, vMsg: '', hints: false, mcqIdx: idx, mcqAns: null, mcqWrong: 0, contamAcc: 0, msg: '', score: 0, award: '', reveal: false };
  }
  function curProfile(s) { var c = s.c; return c.type === 'contam' ? (s.runIdx === 0 ? c.profiles.E : c.profiles.E2) : c.profiles[c.ev]; }
  function foStepper(s) {
    var at = FO_STEPS.map(function (x) { return x[0]; }).indexOf(s.step);
    return '<div class="dx-steps">' + FO_STEPS.map(function (x, i) { return '<span class="' + (i === at ? 'on' : i < at ? 'dn' : '') + '">' + bn(i + 1) + '. ' + x[1] + '</span>'; }).join('') + '</div>';
  }
  function foView() {
    var s = V.st, c = s.c, h = '<button class="dx-btn sm dx-back" data-a="back">← সব কেস</button>' + foStepper(s);
    if (s.step === 'brief') h += foBrief(s);
    else if (s.step === 'lab') h += foLab(s);
    else if (s.step === 'analysis') h += foAnalysis(s);
    else if (s.step === 'prob') h += foProb(s);
    else h += foDone(s);
    return h;
  }
  function foBrief(s) {
    var c = s.c;
    return '<div class="dx-card"><span class="dx-lvl">' + stars(c.lvl) + '</span><h3>' + esc(c.title) + '</h3><p>' + esc(c.story) + '</p></div><div class="dx-split"><div class="dx-card"><h4>প্রমাণ: ল্যাবে কোনগুলো পাঠাবেন?</h4><p class="dx-gel-cap">সব প্রমাণ বিশ্লেষণ সমান মূল্যবান নয়। সময় ও খরচ বাঁচান।</p>' + c.evidence.map(function (e) { return '<label class="dx-ev"><input type="checkbox" data-a="evpick" data-k="' + e.id + '"' + (s.picked[e.id] ? ' checked' : '') + '><span><b>' + esc(e.name) + '</b><small>' + esc(e.note) + '</small></span></label>'; }).join('') + (s.msg ? '<div class="dx-msg warn">' + s.msg + '</div>' : '') + '<div class="dx-row" style="margin-top:10px"><button class="dx-btn pri" data-a="fo-send">ল্যাবে পাঠান →</button></div></div><div class="dx-card"><h4>সন্দেহভাজন</h4>' + c.suspects.map(function (u) { return '<div class="dx-panel"><b>' + esc(u.name) + '</b> (' + esc(u.role) + ')<br>' + esc(u.bio) + '</div>'; }).join('') + '</div></div>';
  }
  function ntcProfile(c) { var g = {}; D.LOCI.forEach(function (L) { g[L.id] = c.ntcRun1[L.id] ? c.ntcRun1[L.id].slice() : null; }); return { sex: 'XX', g: g }; }
  function foLab(s) {
    var c = s.c, chosen = c.evidence.filter(function (e) { return s.picked[e.id]; }), h = '<div class="dx-card"><h3>ল্যাব রিপোর্ট</h3><p class="dx-gel-cap">ধাপ: ডিএনএ নিষ্কাশন → পরিমাপ → STR PCR (২৯ সাইকেল) → ক্যাপিলারি ইলেক্ট্রোফোরেসিস।</p>';
    h += '<div class="dx-scroll"><table class="dx-tbl"><thead><tr><th>নমুনা</th><th>ডিএনএ (ng/µL)</th><th>ডিগ্রেডেশন সূচক</th><th>মন্তব্য</th></tr></thead><tbody>' + chosen.map(function (e) { var di = e.qc.di, note = di > 3 ? 'ডিগ্রেডেড' : e.qc.ng < 0.1 ? 'খুব কম' : 'ভালো'; return '<tr><td>' + esc(e.name) + '</td><td>' + fix1(e.qc.ng) + '</td><td>' + fix1(di) + '</td><td>' + note + '</td></tr>'; }).join('') + '</tbody></table></div>';
    var contam = c.type === 'contam' && s.runIdx === 0;
    h += '<h4>কন্ট্রোল</h4><p>পজিটিভ কন্ট্রোল: <b>ঠিক</b> · NTC: <b>' + (contam ? 'পিক পাওয়া গেছে!' : 'পরিষ্কার') + '</b>' + (c.type === 'contam' && s.runIdx === 1 ? ' (নতুন রিএজেন্টে পুনরায় চালানো হয়েছে)' : '') + '</p>';
    if (contam) h += '<div class="dx-msg bad"><b>NTC-তে অ্যালিল-পিক আছে (D3S1358, vWA, FGA)।</b> টেমপ্লেট ছাড়া পিক আসা মানে দূষণ।</div><div class="dx-ep-wrap">' + epSvg(ntcProfile(c), 'ntc-' + c.id, { scale: 0.35, empty: 'পিক নেই' }) + '</div>';
    chosen.forEach(function (e) {
      if (!e.relevant) h += '<div class="dx-panel"><b>' + esc(e.name) + ':</b> প্রোফাইল পাওয়া গেছে, কিন্তু ' + esc(e.why) + '</div>';
    });
    var ev = curProfile(s), known = c.known ? c.profiles[c.known] : null;
    if (c.type !== 'paternity') h += '<h4>' + esc(c.evidence.filter(function (e) { return e.relevant && !e.ref; })[0].name) + ': ইলেক্ট্রোফেরোগ্রাম</h4><div class="dx-ep-wrap">' + epSvg(ev, c.id + s.runIdx, { knownAlleles: known ? known.g : null, scale: c.type === 'degraded' ? 0.4 : 1 }) + '</div><p class="dx-gel-cap">ডটেড লাইন = স্টোকাস্টিক থ্রেশহোল্ড (১৫০ RFU)। ক্ষীণ ছায়া-পিক = স্টাটার। পিক-উচ্চতা অ্যালিলের পরিমাণের ইঙ্গিত দেয়।</p>';
    if (contam) h += '<div class="dx-msg warn">নিচের পিকগুলো প্রথম রানের। দূষণ থাকলে এগুলো বিশ্বাসযোগ্য নয়।</div><div class="dx-row"><button class="dx-btn pri" data-a="fo-rerun">রান বাতিল করে নতুন রিএজেন্টে পুনরায় চালান</button><button class="dx-btn" data-a="fo-accept">এই ফল দিয়েই এগোই</button></div>' + (s.msg ? '<div class="dx-msg bad">' + s.msg + '</div>' : '');
    else h += '<div class="dx-row" style="margin-top:12px"><button class="dx-btn pri" data-a="fo-go">বিশ্লেষণে যান →</button></div>';
    return h + '</div>';
  }
  function cellTxt(g, meta) { if (!g) return '—'; if (meta === 'partial') return g[0] + '*'; return g.join(', '); }
  var CMAP = { match: 'm-match', share: 'm-share', mismatch: 'm-mis', nodata: 'm-nodata', partial: 'm-part', incl: 'm-incl' };
  function foTable(s) {
    var c = s.c, ev = curProfile(s), type = c.type, known = c.known ? c.profiles[c.known] : null, mom = c.mom ? c.profiles[c.mom] : null, su = c.suspects, pat = null, rem = null;
    var th = '<th>লোকাস</th><th>' + (type === 'paternity' ? 'শিশু' : type === 'mixture' ? 'নমুনা (মিশ্র)' : 'প্রমাণ') + '</th>' + (known ? '<th>ভিকটিম</th><th>অজানা (অবশিষ্ট)</th>' : '') + (mom ? '<th>মা</th>' : '') + su.map(function (u) { return '<th>' + esc(u.name) + '</th>'; }).join('');
    if (known) rem = D.remainder(ev, known);
    var cmp = su.map(function (u) { return type === 'paternity' ? D.paternity(ev, mom, u.key) : type === 'mixture' ? D.mixConsistent(ev, known, u.key) : null; });
    var rows = D.LOCI.map(function (L) {
      var r = '<tr><td>' + L.id + '</td><td class="ev">' + cellTxt(ev.g[L.id], ev.meta && ev.meta[L.id]) + (ev.mix ? '' : '') + '</td>';
      if (known) r += '<td>' + cellTxt(known.g[L.id]) + '</td><td>' + (rem[L.id].length ? rem[L.id].join(', ') : 'ঢাকা পড়ে থাকতে পারে') + '</td>';
      if (mom) r += '<td>' + cellTxt(mom.g[L.id]) + '</td>';
      su.forEach(function (u, i) {
        var cls = '';
        if (s.hints) { if (type === 'paternity') cls = cmp[i].per[L.id].excl ? 'm-mis' : 'm-match'; else if (type === 'mixture') cls = cmp[i].per[L.id] ? 'm-incl' : 'm-mis'; else cls = CMAP[D.compareLocus(ev, u.key, L.id)] || ''; }
        r += '<td class="' + cls + '">' + cellTxt(u.key.g[L.id]) + '</td>';
      }); return r + '</tr>';
    });
    var sx = '<tr><td>লিঙ্গ (AMEL)</td><td class="ev">' + (ev.sex || '—') + '</td>' + (known ? '<td>' + known.sex + '</td><td></td>' : '') + (mom ? '<td>' + mom.sex + '</td>' : '') + su.map(function (u) { return '<td>' + u.key.sex + '</td>'; }).join('') + '</tr>';
    return '<div class="dx-scroll"><table class="dx-tbl"><thead><tr>' + th + '</tr></thead><tbody>' + rows.join('') + sx + '</tbody></table></div>' + (ev.meta ? '<p class="dx-gel-cap">* একটি অ্যালিলের পিক স্টোকাস্টিক থ্রেশহোল্ডের নিচে: অন্য অ্যালিল ড্রপআউট হতে পারে। "—" = ওই লোকাসে তথ্য নেই।</p>' : '');
  }
  function foAnalysis(s) {
    var c = s.c, types = c.type === 'paternity' ? ['excl', 'notexcl'] : ['excl', 'incl', 'inconc'];
    var h = '<div class="dx-card"><h3>অ্যালিল তুলনা</h3><div class="dx-row"><label class="dx-opt" style="padding:4px 10px"><input type="checkbox" data-a="hints"' + (s.hints ? ' checked' : '') + '><span>রং-সংকেত দেখান (সবুজ = মিল, হলুদ = এক অ্যালিল মিল, লাল = অমিল)</span></label></div>' + foTable(s);
    if (c.type === 'paternity') h += '<p class="dx-gel-cap">শিশুর দুইটি অ্যালিলের একটি মায়ের, অন্যটি পিতার। মায়ের অ্যালিল বাদ দিয়ে বাকিটা পিতার হতে হবে।</p>';
    if (c.type === 'mixture') h += '<p class="dx-gel-cap">মিশ্র নমুনা: সন্দেহভাজনের সব অ্যালিল মিশ্রণে থাকতে হবে এবং মিশ্রণের প্রতিটি অ্যালিল ভিকটিম বা সন্দেহভাজনের হতে হবে।</p>';
    h += '<h4>আপনার সিদ্ধান্ত</h4><div class="dx-vd">' + c.suspects.map(function (u) {
      var cls = s.vsubm ? (s.verdict[u.id] === c.answer[u.id] ? ' ok' : ' bad') : '';
      return '<div class="row' + cls + '"><b>' + esc(u.name) + '</b>' + types.map(function (t) { return '<label><input type="radio" name="vd-' + u.id + '" data-a="vd" data-k="' + u.id + '" data-v="' + t + '"' + (s.verdict[u.id] === t ? ' checked' : '') + '>' + VD[t] + '</label>'; }).join('') + '</div>';
    }).join('') + '</div>' + (s.vMsg ? '<div class="dx-msg ' + (s.vOK ? 'ok' : 'bad') + '">' + s.vMsg + '</div>' : '') + '<div class="dx-row" style="margin-top:10px">' + (s.vOK ? '<button class="dx-btn pri" data-a="fo-prob">সম্ভাবনা হিসাব →</button>' : '<button class="dx-btn ink" data-a="fo-verdict">সিদ্ধান্ত জমা দিন</button>') + '</div></div>';
    return h;
  }
  function locusTable(profile, ids) {
    var rows = ids.map(function (id) { var g = profile.g[id]; return '<tr><td>' + id + '</td><td>' + g.join(', ') + '</td><td>' + (g[0] === g[1] ? 'হোমোজাইগাস' : 'হেটেরোজাইগাস') + '</td><td>' + bn(D.genoFreq(id, g).toExponential(2)) + '</td></tr>'; });
    return '<div class="dx-scroll"><table class="dx-tbl" style="min-width:420px"><thead><tr><th>লোকাস</th><th>জেনোটাইপ</th><th>ধরন</th><th>ফ্রিকোয়েন্সি</th></tr></thead><tbody>' + rows.join('') + '</tbody></table></div>';
  }
  function foProbData(s) {
    var c = s.c, target = c.suspects.filter(function (u) { return c.answer[u.id] === 'incl' || c.answer[u.id] === 'notexcl'; })[0] || c.suspects.filter(function (u) { return c.answer[u.id] === 'inconc'; })[0], out = { target: target };
    if (c.type === 'paternity') { out.pat = D.paternity(c.profiles.C, c.profiles.M, target.key); out.oneIn = out.pat.pi; return out; }
    var prof = c.profiles.Efull || (c.profiles[c.ev2 || 'E2'] && c.type === 'contam' ? c.profiles.E2 : (c.type === 'mixture' ? target.key : c.profiles[c.ev]));
    var ids = D.LOCI.map(function (L) { return L.id; });
    if (c.type === 'degraded') ids = ids.filter(function (id) { var e = c.profiles.E; return e.g[id] && !(e.meta && e.meta[id]); });
    out.prof = prof; out.ids = ids; out.r = D.rmp(prof, ids); out.oneIn = out.r.oneIn; if (c.type === 'siblings') out.sib = D.sibRmp(prof, ids);
    return out;
  }
  function foProb(s) {
    var c = s.c, d = foProbData(s), h = '<div class="dx-card"><h3>পরিসংখ্যানগত ওজন</h3>';
    if (c.type === 'paternity') {
      var pt = d.pat, ids = D.LOCI.map(function (L) { return L.id; });
      h += '<p>' + esc(d.target.name) + '-এর ক্ষেত্রে প্রতিটি লোকাসে <b>পিতৃত্ব সূচক (PI)</b> = P(এই সন্তান | মা ও ঐ পুরুষ পিতা) ÷ P(এই সন্তান | মা ও এলোমেলো পুরুষ পিতা)।</p><div class="dx-scroll"><table class="dx-tbl" style="min-width:380px"><thead><tr><th>লোকাস</th><th>PI</th></tr></thead><tbody>' + ids.map(function (id) { var r = pt.per[id]; return '<tr><td>' + id + '</td><td' + (r.excl ? ' class="m-mis"' : '') + '>' + (r.excl ? 'অমিল (০)' : bn(r.pi.toFixed(2))) + '</td></tr>'; }).join('') + '</tbody></table></div><p>অমিল ' + bn(pt.mism) + 'টি লোকাস বাদ দিয়ে সম্মিলিত PI ≈ <b>' + D.sci(pt.pi) + '</b>। প্রাথমিক সম্ভাবনা ৫০% ধরলে পিতৃত্বের সম্ভাবনা ≈ <b>' + bn((pt.prob * 100).toFixed(4)) + '%</b>।</p>' + (pt.mism ? '<p class="dx-gel-cap">অমিলযুক্ত লোকাসকে মিউটেশন ধরে আলাদা সংশোধনী সূচক বসানোর নিয়মও আছে। এখানে সরলভাবে বাদ রাখা হয়েছে।</p>' : '');
    } else {
      h += '<p>' + (c.type === 'mixture' ? 'আততায়ীর প্রোফাইলের' : c.type === 'degraded' ? 'পাওয়া ' + bn(d.ids.length) + 'টি লোকাসের' : 'প্রোফাইলের') + ' ম্যাচ প্রবাবিলিটি (এলোমেলো অসম্পর্কিত ব্যক্তির সাথে মিলে যাওয়ার সম্ভাবনা), প্রতি লোকাসে NRC II ৪.১০ সূত্রে (θ = ০.০১)। এখানে ' + bn(d.r.loci) + 'টি লোকাস ব্যবহৃত।</p><p style="font-size:20px"><b>১ in ' + D.sci(d.oneIn) + '</b></p>';
      if (c.type === 'siblings') h += '<div class="dx-msg warn">একই বাবা-মায়ের সহোদরের জন্য একই প্রোফাইলের সম্ভাবনা অনেক বেশি: প্রায় <b>১ in ' + D.sci(d.sib.oneIn) + '</b>। ম্যাচ প্রবাবিলিটি সাধারণত অসম্পর্কিত ব্যক্তির জন্য হিসাব করা।</div>';
      if (c.type === 'degraded') h += '<div class="dx-msg warn">লোকাস কম, তাই ওজনও কম। সব লোকাসের বদলে মাত্র ' + bn(d.r.loci) + 'টি দিয়ে হিসাব।</div>';
      h += '<details><summary>লোকাস-প্রতি ফ্রিকোয়েন্সি দেখুন</summary>' + locusTable(d.prof, d.ids) + '</details>';
    }
    var m = c.mcq, rep = D.sci(d.oneIn);
    h += '<h4>ব্যাখ্যার প্রশ্ন</h4><p>' + esc(m.q.replace('{X}', rep)) + '</p><div class="dx-opts">' + s.mcqIdx.map(function (oi, k) {
      var cls = ''; if (s.mcqAns !== null && s.mcqAns === k) cls = oi === m.ans ? ' ok' : ' bad';
      return '<label class="dx-opt' + cls + '"><input type="radio" name="mcq" data-a="mcq" data-k="' + k + '"' + (s.mcqAns === k ? ' checked' : '') + '><span>' + esc(m.opts[oi].replace('{X}', rep)) + '</span></label>';
    }).join('') + '</div>' + (s.msg ? '<div class="dx-msg bad">' + s.msg + '</div>' : '') + '<div class="dx-row" style="margin-top:10px"><button class="dx-btn pri" data-a="fo-finish">রিপোর্ট জমা দিন</button></div></div>';
    return h;
  }
  function foDone(s) {
    var c = s.c, d = foProbData(s);
    return '<div class="dx-card"><div class="dx-row"><div class="dx-score">' + bn(s.score) + '</div><div><b>তদন্ত শেষ</b><br><span class="dx-chip mut">অপ্রয়োজনীয় প্রমাণ ' + bn(s.irrel) + ' · ভুল সিদ্ধান্ত ' + bn(s.vWrong) + ' · ব্যাখ্যা-ভুল ' + bn(s.mcqWrong) + '</span></div></div>' + s.award +
      '<h4>ফলাফল</h4><ul>' + c.suspects.map(function (u) { return '<li><b>' + esc(u.name) + ':</b> ' + esc(VD[c.answer[u.id]]) + '</li>'; }).join('') + '</ul><h4>কেন গুরুত্বপূর্ণ</h4><p>' + esc(c.mcq.exp) + '</p><div class="dx-row"><button class="dx-btn pri" data-a="next">পরের কেস →</button><button class="dx-btn" data-a="back">তালিকায় ফিরুন</button></div></div>';
  }
  function foSend() {
    var s = V.st, c = s.c, need = c.evidence.filter(function (e) { return e.relevant; }), miss = need.filter(function (e) { return !s.picked[e.id]; });
    if (miss.length) { s.msg = 'গুরুত্বপূর্ণ প্রমাণ বাদ পড়েছে: ' + miss.map(function (e) { return esc(e.name); }).join(', ') + '। ওগুলো ছাড়া বিশ্লেষণ সম্ভব নয়।'; return; }
    s.irrel = c.evidence.filter(function (e) { return !e.relevant && s.picked[e.id]; }).length; s.msg = ''; s.step = 'lab';
  }
  function foVerdict() {
    var s = V.st, c = s.c; if (c.suspects.some(function (u) { return !s.verdict[u.id]; })) { s.vMsg = 'প্রত্যেক সন্দেহভাজনের জন্য একটি সিদ্ধান্ত বাছুন।'; return; }
    s.vsubm++; var wrong = c.suspects.filter(function (u) { return s.verdict[u.id] !== c.answer[u.id]; });
    if (!wrong.length) { s.vOK = true; s.vMsg = '✔ সব সিদ্ধান্ত সঠিক।'; return; }
    s.vWrong += wrong.length; s.vMsg = bn(wrong.length) + 'টি সিদ্ধান্ত সঠিক নয় (লাল)। ' + (s.vsubm >= 3 ? 'সঠিক সিদ্ধান্ত দেখানো হলো।' : 'টেবিলে লোকাস ধরে ধরে মিলিয়ে আবার চেষ্টা করুন।');
    if (s.vsubm >= 3) { c.suspects.forEach(function (u) { s.verdict[u.id] = c.answer[u.id]; }); s.vOK = true; }
  }
  function foFinish() {
    var s = V.st, c = s.c; if (s.mcqAns === null) { s.msg = 'একটি উত্তর বাছুন।'; return; }
    if (s.mcqIdx[s.mcqAns] !== c.mcq.ans) { s.mcqWrong++; s.msg = 'এটি সঠিক ব্যাখ্যা নয়। আবার ভাবুন।'; s.mcqAns = null; return; }
    s.msg = ''; s.score = Math.max(20, Math.min(100, 100 - 5 * s.irrel - 8 * s.vWrong - 10 * s.contamAcc - 10 * s.mcqWrong));
    s.award = award('fo', c.id, s.score); s.step = 'done';
  }

  /* =====================================================================
     ৩. রোগ নির্ণয়
     ===================================================================== */
  var DXCOST = {}; Object.keys(X.TESTS).forEach(function (k) { DXCOST[k] = X.TESTS[k].cost; });
  function taka(n) { return '৳' + bn(Math.round(n).toLocaleString('en-US')); }
  function hrsTxt(h) { return h < 24 ? bn(h) + ' ঘণ্টা' : bn(Math.round(h / 24)) + ' দিন'; }
  function dxList() {
    return '<p class="dx-intro">একজন রোগী: উপসর্গ, ইতিহাস, পরীক্ষা। আপনি পরীক্ষা অর্ডার করবেন (প্রতিটির খরচ ও সময় আছে), ফল পড়বেন এবং রোগ নির্ণয় করবেন। অপ্রয়োজনীয় পরীক্ষা মানেই রোগীর টাকা ও সময় নষ্ট, তাই স্কোর কমবে। কিন্তু নির্ণায়ক পরীক্ষা বাদ দিলে নিশ্চিত হওয়া যাবে না।</p>' + listCards('dx', X.DX, 'রোগী দেখুন');
  }
  function dxOpen(id) {
    var c = X.DX.filter(function (x) { return x.id === id; })[0], rng = D.rngFrom('dx' + id);
    V.id = id; V.st = { c: c, tests: [], hx: {}, opts: D.shuffle(c.dd, rng), pick: null, tries: 0, done: false, sc: null, award: '', msg: '', open: {} };
  }
  function dxView() {
    var s = V.st, c = s.c, pt = c.pt, cost = 0, hmax = 0;
    s.tests.forEach(function (t) { cost += X.TESTS[t].cost; hmax = Math.max(hmax, X.TESTS[t].hrs); });
    var h = '<button class="dx-btn sm dx-back" data-a="back">← সব কেস</button><div class="dx-split"><div><div class="dx-card"><span class="dx-lvl">' + stars(c.lvl) + '</span><h3>' + esc(c.title) + '</h3><div class="dx-pt"><b>' + esc(pt.name) + ', ' + esc(pt.age) + '</b><span class="cc">' + esc(pt.cc) + '</span>' + (c.day ? '<span class="dx-chip sig">অসুস্থতার ' + bn(c.day) + 'তম দিন</span>' : '') + '</div><h4>পরীক্ষা (examination)</h4><ul>' + c.exam.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul><h4>ইতিহাস জিজ্ঞাসা করুন</h4><div class="dx-clues">' + c.hx.map(function (q, i) { return '<button class="dx-clue' + (s.hx[i] ? ' on' : '') + '" data-a="hx" data-k="' + i + '">' + esc(q[0]) + '</button>'; }).join('') + '</div>' + c.hx.map(function (q, i) { return s.hx[i] ? '<div class="dx-panel"><b>' + esc(q[0]) + '</b><br>' + esc(q[1]) + '</div>' : ''; }).join('') + '</div>';
    /* ফল */
    h += '<div class="dx-card"><h4>অর্ডার করা পরীক্ষার ফল</h4>' + (s.tests.length ? s.tests.slice().reverse().map(function (t) { var r = c.res[t] || [X.TESTS[t].norm, 'norm']; return '<div class="dx-res ' + (r[1] === 'key' ? 'key' : r[1] === 'abn' ? 'abn' : r[1] === 'warn' ? 'warn' : '') + '"><b>' + esc(X.TESTS[t].n) + '</b>' + esc(r[0]) + '</div>'; }).join('') : '<p class="dx-gel-cap">এখনও কোনো পরীক্ষা অর্ডার করা হয়নি।</p>') + '</div></div>';
    /* ডান: পরীক্ষার মেনু */
    var cats = {}; Object.keys(X.TESTS).forEach(function (k) { var ct = X.TESTS[k].cat; (cats[ct] = cats[ct] || []).push(k); });
    h += '<div><div class="dx-card"><h4>পরীক্ষা অর্ডার করুন</h4><div class="dx-row"><span class="dx-chip">খরচ ' + taka(cost) + '</span><span class="dx-chip mut">সময় ' + (hmax ? hrsTxt(hmax) : '০') + '</span><span class="dx-chip mut">পরীক্ষা ' + bn(s.tests.length) + 'টি</span></div>';
    Object.keys(cats).forEach(function (ct) { var op = s.open[ct] !== undefined ? s.open[ct] : true; h += '<details data-g="' + esc(ct) + '"' + (op ? ' open' : '') + '><summary>' + esc(ct) + '</summary><div class="dx-tests">' + cats[ct].map(function (k) { var T = X.TESTS[k], on = s.tests.indexOf(k) >= 0; return '<button class="dx-test' + (on ? ' on' : '') + '" data-a="order" data-k="' + k + '"' + (on || s.done ? ' disabled' : '') + '>' + esc(T.n) + '<small>' + taka(T.cost) + ' · ' + hrsTxt(T.hrs) + '</small></button>'; }).join('') + '</div></details>'; });
    h += '</div>';
    if (!s.done) h += '<div class="dx-card"><h4>আপনার নির্ণয়</h4><div class="dx-opts">' + s.opts.map(function (d) { return '<label class="dx-opt"><input type="radio" name="dxp" data-a="dxpick" data-k="' + d + '"' + (s.pick === d ? ' checked' : '') + '><span>' + esc(X.DIS[d]) + '</span></label>'; }).join('') + '</div>' + (s.msg ? '<div class="dx-msg warn">' + s.msg + '</div>' : '') + '<div class="dx-row" style="margin-top:10px"><button class="dx-btn pri" data-a="dxsubmit">নির্ণয় জমা দিন</button></div></div>';
    h += '</div></div>';
    if (s.done) h += dxResult(s);
    return h;
  }
  function dxResult(s) {
    var c = s.c, sc = s.sc, keyNotDone = c.confirm.filter(function (t) { return s.tests.indexOf(t) < 0; });
    return '<div class="dx-card"><div class="dx-row"><div class="dx-score">' + bn(s.score) + '</div><div><b>' + (sc.correct ? '✔ সঠিক নির্ণয়: ' : '✘ সঠিক নির্ণয় হলো: ') + esc(X.DIS[c.answer]) + '</b><br><span class="dx-chip ' + (sc.confirmed ? '' : 'sig') + '">' + (sc.confirmed ? 'নির্ণায়ক পরীক্ষা করা হয়েছে' : 'নির্ণায়ক পরীক্ষা করা হয়নি') + '</span> <span class="dx-chip mut">খরচ ' + taka(sc.cost) + '</span>' + (sc.waste ? ' <span class="dx-chip sig">অপ্রয়োজনীয় খরচ ' + taka(sc.waste) + '</span>' : ' <span class="dx-chip">অপচয় নেই</span>') + '</div></div>' + s.award +
      (sc.wasted.length ? '<h4>যেগুলো এই কেসে লাগেনি</h4><p>' + sc.wasted.map(function (t) { return esc(X.TESTS[t].n); }).join(', ') + '</p>' : '') +
      (keyNotDone.length ? '<h4>নির্ণায়ক পরীক্ষা (আপনি করেননি)</h4><p>' + c.confirm.map(function (t) { return esc(X.TESTS[t].n); }).join(' অথবা ') + '</p>' : '') +
      '<h4>অন্য সম্ভাবনা কেন নয়?</h4><ul>' + c.dd.filter(function (d) { return d !== c.answer; }).map(function (d) { return '<li><b>' + esc(X.DIS[d]) + ':</b> ' + esc(c.why[d] || 'লক্ষণ ও ফলাফলের সামগ্রিক চিত্রে এটি কম সম্ভাব্য।') + '</li>'; }).join('') + '</ul><h4>শেখার পয়েন্ট</h4><p>' + esc(c.learn) + '</p><div class="dx-row"><button class="dx-btn pri" data-a="next">পরের কেস →</button><button class="dx-btn" data-a="back">তালিকায় ফিরুন</button></div></div>';
  }
  function dxSubmit() {
    var s = V.st, c = s.c; if (!s.pick) { s.msg = 'একটি রোগ বাছুন।'; return; }
    if (s.pick !== c.answer && s.tries < 1) { s.tries++; s.msg = 'এই নির্ণয় রোগীর লক্ষণ ও ফলের সাথে পুরো মেলে না। আরও ইতিহাস বা পরীক্ষা দেখে আবার ভাবুন (একবারই সুযোগ বাকি)।'; s.pick = null; return; }
    var sc = D.dxScore(c, { tests: s.tests, dx: s.pick, costOf: DXCOST }); s.sc = sc; s.score = Math.max(0, sc.score - 10 * s.tries); s.done = true; s.msg = '';
    s.award = award('dx', c.id, s.score);
  }

  /* =====================================================================
     ইভেন্ট
     ===================================================================== */
  function listFor(tab) { return tab === 'ts' ? X.TS : tab === 'fo' ? X.FOR : X.DX; }
  function openCase(id) { (V.tab === 'ts' ? tsOpen : V.tab === 'fo' ? foOpen : dxOpen)(id); }
  function toTop() { var sec = document.getElementById('dxlab'); if (sec && sec.scrollIntoView) sec.scrollIntoView({ block: 'start' }); }
  root.addEventListener('click', function (e) {
    var t = e.target.closest('[data-a]'); if (!t || t.tagName !== 'BUTTON') return;
    var a = t.getAttribute('data-a'), k = t.getAttribute('data-k'), s = V.st, redraw = true;
    switch (a) {
      case 'tab': V.tab = t.getAttribute('data-v'); V.id = null; V.st = null; break;
      case 'open': openCase(t.getAttribute('data-id')); toTop(); break;
      case 'back': V.id = null; V.st = null; toTop(); break;
      case 'next': { var l = listFor(V.tab), i = l.map(function (c) { return c.id; }).indexOf(V.id); if (i >= 0 && i < l.length - 1) { openCase(l[i + 1].id); } else { V.id = null; V.st = null; } toTop(); break; }
      /* ট্রাবলশুটিং */
      case 'clue': if (!s.clues[k]) { var cost = CLUES.filter(function (x) { return x[0] === k; })[0][2]; if (k === 'ctrl' && s.c.ctx.showCtrl) cost = 0; s.clues[k] = true; s.clueCost += cost; if (k === 'ctrl') s.P.ctrl = true; } break;
      case 'diag': tsDiag(); break;
      case 'run': tsRun(); break;
      case 'accept': tsAccept(); break;
      /* ফরেনসিক */
      case 'fo-send': foSend(); break;
      case 'fo-rerun': s.runIdx = 1; s.msg = ''; break;
      case 'fo-accept': s.contamAcc++; s.msg = 'NTC-তে পিক থাকলে পুরো ব্যাচের ফল অবিশ্বাসযোগ্য। ঝুঁকি না নিয়ে নতুন রিএজেন্টে পুনরায় চালান।'; break;
      case 'fo-go': s.step = 'analysis'; break;
      case 'fo-verdict': foVerdict(); break;
      case 'fo-prob': s.step = 'prob'; s.msg = ''; break;
      case 'fo-finish': foFinish(); break;
      /* রোগ নির্ণয় */
      case 'hx': s.hx[k] = true; break;
      case 'order': if (s.tests.indexOf(k) < 0 && !s.done) s.tests.push(k); break;
      case 'dxsubmit': dxSubmit(); break;
      default: redraw = false;
    }
    if (redraw) render();
  });
  root.addEventListener('change', function (e) {
    var t = e.target, a = t.getAttribute && t.getAttribute('data-a'); if (!a || t.tagName === 'BUTTON') return;
    var k = t.getAttribute('data-k'), s = V.st, redraw = false;
    switch (a) {
      case 'pick': s.picked[k] = t.checked; break;
      case 'chk': s.P[k] = t.checked; break;
      case 'set': { var v = t.value; if (k === 'gel.stain') v = v === '1'; else if (k === 'primerSet' || k === 'gel.buffer') { } else v = parseFloat(v); if (typeof v === 'number' && isNaN(v)) v = 0; setK(s.P, k, v); break; }
      case 'evpick': s.picked[k] = t.checked; break;
      case 'hints': s.hints = t.checked; redraw = true; break;
      case 'vd': s.verdict[k] = t.getAttribute('data-v'); break;
      case 'mcq': s.mcqAns = +k; break;
      case 'dxpick': s.pick = k; break;
    }
    if (redraw) render();
  });
  root.addEventListener('toggle', function (e) { var d = e.target; if (d && d.tagName === 'DETAILS' && V.st && V.st.open) V.st.open[d.getAttribute('data-g')] = d.open; }, true);
  render();
  window.GEBDxUI = { stats: function () { return { ts: doneCount('ts', X.TS), fo: doneCount('fo', X.FOR), dx: doneCount('dx', X.DX) }; } };
})();
