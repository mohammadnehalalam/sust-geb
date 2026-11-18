/* GEB Hub: জরুরি দক্ষতা (v3.20)
   চারটি অংশ: ১) CPR ও ACLS (চাপের তাল, শকযোগ্য-শকহীন রিদম, কেস) ২) ট্রমা ATLS (ABCDE) ৩) বিষক্রিয়া, সাপের কামড় ও পোড়া
   ৪) ম্যাস ক্যাজুয়ালটি ট্রায়াজ (START)। ব্যাজ ও সার্টিফিকেট ক্যারিয়ারে যোগ হয়। সব কেস কাল্পনিক ও শেখার জন্য সরলীকৃত। */
(function () {
  'use strict';
  var K = window.GEBHospKit, C = window.GEBCareer, M = window.GEBHospEmerg, D = window.GEBHospDuty, E = window.GEBHospECG;
  if (!K || !C || !M || !D) return;
  var esc = K.esc, bn = K.bn, $ = K.$, $$ = K.$$, S = C.S, shuffle = C.shuffle;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- অবস্থা: P.cr.em (আগের সংরক্ষণের সাথে মিলিয়ে নেওয়া) ---------- */
  function merge(dst, src) { Object.keys(src).forEach(function (k) { if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k])) { if (!dst[k] || typeof dst[k] !== 'object') dst[k] = {}; merge(dst[k], src[k]); } else if (dst[k] === undefined) dst[k] = src[k]; }); return dst; }
  S.em = merge(S.em || {}, M.freshState());
  var EM = S.em;

  /* ব্যাজ ও সার্টিফিকেট ক্যারিয়ারে যোগ (গ্র্যান্ড সার্টিফিকেটের আগে বসে) */
  M.BADGES.forEach(function (b) { if (!D.BADGES.some(function (x) { return x.id === b.id; })) D.BADGES.push(b); });
  if (!D.CERTS.some(function (c) { return c.id === M.CERT.id; })) { var gi = -1; D.CERTS.forEach(function (c, i) { if (c.id === 'grand') gi = i; }); D.CERTS.splice(gi < 0 ? D.CERTS.length : gi, 0, M.CERT); }

  var area = null, sub = { cpr: 'learn', atls: 'learn', tox: 'anti', mci: 'learn' };

  /* ---------- ছোট সহায়ক ---------- */
  function cnt(o) { return Object.keys(o || {}).length; }
  function stars(n) { return K.starHtml(n); }
  function gotHtml(got) { return got.length ? '<p class="hd-got">' + got.map(esc).join('<br>') + '</p>' : ''; }
  function list(items, ordered) { var t = ordered ? 'ol' : 'ul'; return '<' + t + ' class="em-ol">' + items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</' + t + '>'; }
  function caseCard(c, key, doneMap) {
    var d = doneMap[c.id];
    return '<button type="button" class="hp-case" data-c="' + c.id + '" data-k="' + key + '"><div class="th">' + c.ic + (d ? '<em>✔ ' + stars(d) + '</em>' : '') + '</div><div class="bd"><b>' + esc(c.n) + '</b><span>' + esc(c.d) + '</span><div class="ft">' + esc(c.lvl) + '</div></div></button>';
  }

  /* ---------- মনিটর (ECG-র সিগন্যাল-জেনারেটর থেকে) ---------- */
  var uid = 0;
  function monitor(cv, id, o) {
    o = o || {}; if (!E || !E.ecgSignal) { cv.parentNode.hidden = true; return; }
    var sig = E.ecgSignal(id, { seed: o.seed || 3, dur: 5, fs: 250 }), W = 600, H = o.h || 130, dpr = Math.min(2, window.devicePixelRatio || 1), x = cv.getContext('2d'), my = ++uid;
    var pps = W / sig.dur, mv = o.mv || 34, y0 = H / 2 + (id === 'asystole' ? 0 : 6);
    cv.width = W * dpr; cv.height = H * dpr; cv.dataset.uid = my; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', o.alt || 'মনিটরে ECG');
    function paint(xmax) {
      x.setTransform(dpr, 0, 0, dpr, 0, 0); x.fillStyle = '#07140f'; x.fillRect(0, 0, W, H);
      x.strokeStyle = 'rgba(80,200,140,.14)'; x.lineWidth = 1; x.beginPath(); for (var g = 0; g <= W; g += 30) { x.moveTo(g + .5, 0); x.lineTo(g + .5, H); } for (g = 0; g <= H; g += 30) { x.moveTo(0, g + .5); x.lineTo(W, g + .5); } x.stroke();
      x.strokeStyle = '#39ff88'; x.lineWidth = 2; x.lineJoin = 'round'; x.beginPath(); var st = false;
      for (var i = 0; i < sig.n; i++) { var px = i / sig.fs * pps; if (px > xmax) break; var py = y0 - sig.y[i] * mv; if (!st) { x.moveTo(px, py); st = true; } else x.lineTo(px, py); }
      x.stroke(); x.font = '12px system-ui,sans-serif'; x.fillStyle = 'rgba(160,255,200,.8)'; x.textAlign = 'left'; x.fillText(o.label || 'লিড II', 8, 16);
    }
    if (o.sweep !== false && !reduce) { var t0 = null, dur = 1400; (function step(ts) { if (!cv.isConnected || cv.dataset.uid !== String(my)) return; if (t0 === null) t0 = ts; var f = Math.min(1, (ts - t0) / dur); paint(f * W); if (f < 1) requestAnimationFrame(step); })(performance.now()); }
    else paint(W + 10);
  }
  function monHtml() { return '<div class="em-mon"><canvas class="em-cv"></canvas></div>'; }

  /* ---------- প্রশ্নের ধারা (কুইজ) ---------- */
  function seqQuiz(o) {
    C.top(); var body = $('#hpBody'), qs = o.qs, i = 0, mistakes = 0;
    body.innerHTML = C.roleBar() + '<button type="button" class="hp-back" id="emBk">← ' + esc(o.backLabel) + '</button><div class="hp-card"><h4>' + esc(o.title) + '</h4>' + (o.intro ? '<p class="hp-mut">' + esc(o.intro) + '</p>' : '') + '<div id="emQz"></div></div>';
    C.bindRoleBar(body); $('#emBk').onclick = o.back;
    function nextQ() {
      var el = $('#emQz'); if (i >= qs.length) return fin();
      el.innerHTML = '<div class="hp-steps">' + qs.map(function (x, k) { return '<i class="' + (k < i ? 'd' : '') + '"></i>'; }).join('') + '</div><p class="hp-sn">প্রশ্ন ' + bn(i + 1) + '/' + bn(qs.length) + '</p><div id="emQq"></div>';
      C.ask($('#emQq'), qs[i], 'em', function (first) {
        if (!first) mistakes++; var nb = document.createElement('div'); nb.className = 'hp-nav'; nb.innerHTML = '<button type="button" class="hp-btn pri">' + (i === qs.length - 1 ? 'ফল দেখুন' : 'পরবর্তী ▶') + '</button>';
        $('#emQq').appendChild(nb); nb.firstChild.onclick = function () { i++; nextQ(); };
      });
    }
    function fin() {
      var f = K.award(o.id, mistakes, o.xp || 40); if (o.after) o.after(mistakes); K.save(); var got = C.done(f.st);
      $('#emQz').innerHTML = '<div class="hp-res"><h3>🎉 শেষ</h3><div class="big">' + stars(f.st) + '</div><p>ভুল: <b>' + bn(mistakes) + '</b> · <b>+' + bn(f.xp) + ' XP</b>' + (f.first ? '' : ' (আবার করার জন্য কম XP)') + '</p>' + gotHtml(got) + '<div class="hp-nav"><button type="button" class="hp-btn pri" id="emAg">↻ আবার</button><button type="button" class="hp-btn" id="emLs">← ফিরুন</button></div></div>';
      $('#emAg').onclick = o.again; $('#emLs').onclick = o.back;
    }
    nextQ();
  }

  /* ---------- কেসের ধারা (ACLS, ট্রমা, বিষ, সাপ, পোড়া) ---------- */
  var ABC = [['x', 'C!'], ['A', 'A'], ['B', 'B'], ['C', 'C'], ['D', 'D'], ['E', 'E']];
  function abcRibbon(k, hasX) { return '<div class="em-abc" aria-label="ABCDE ধাপ">' + ABC.filter(function (a) { return hasX || a[0] !== 'x'; }).map(function (a) { return '<span class="' + (a[0] === k ? 'on' : '') + '"' + (a[0] === 'x' ? ' title="মারাত্মক বাহ্যিক রক্তক্ষরণ আগে"' : '') + '>' + a[1] + '</span>'; }).join('') + '</div>'; }
  function runCase(o) {
    C.top(); var c = o.c, steps = c.steps, i = 0, mistakes = 0, body = $('#hpBody');
    body.innerHTML = C.roleBar() + '<button type="button" class="hp-back" id="emBkC">← ' + esc(o.backLabel) + '</button><div class="hp-card"><h3>' + c.ic + ' ' + esc(c.n) + '</h3><p class="hp-mut">' + esc(c.d) + '</p></div><div id="emStep"></div>';
    C.bindRoleBar(body); $('#emBkC').onclick = o.back;
    function show() {
      if (i >= steps.length) return fin();
      var s = steps[i], el = $('#emStep'), txt = s.find || s.say || '';
      el.innerHTML = '<div class="hp-steps">' + steps.map(function (x, k) { return '<i class="' + (k < i ? 'd' : '') + '"></i>'; }).join('') + '</div><p class="hp-sn">ধাপ ' + bn(i + 1) + '/' + bn(steps.length) + (s.t ? ' · ' + esc(s.t) : '') + '</p>' +
        (o.abc ? abcRibbon(s.k, steps.some(function (z) { return z.k === 'x'; })) : '') + (txt || s.mon ? '<div class="hp-card em-find">' + (txt ? '<p>' + esc(txt) + '</p>' : '') + (s.mon ? monHtml() : '') + '</div>' : '') + '<div id="emQ" class="hp-card"></div>';
      if (s.mon) monitor($('.em-cv', el), s.mon, { alt: txt });
      C.ask($('#emQ'), s.q, 'em', function (first) {
        if (!first) mistakes++; var nb = document.createElement('div'); nb.className = 'hp-nav'; nb.innerHTML = '<button type="button" class="hp-btn pri">' + (i === steps.length - 1 ? 'শেষ করুন' : 'পরবর্তী ▶') + '</button>';
        $('#emQ').appendChild(nb); nb.firstChild.onclick = function () { i++; show(); };
      });
    }
    function fin() {
      var f = K.award('em_' + o.bucket + '_' + c.id, mistakes, o.xp || 90); EM[o.bucket][c.id] = Math.max(EM[o.bucket][c.id] || 0, f.st); K.save(); var got = C.done(f.st);
      body.innerHTML = C.roleBar() + '<div class="hp-card hp-res"><h3>🎉 কেস শেষ: ' + esc(c.n) + '</h3><div class="big">' + stars(f.st) + '</div><p>ভুল: <b>' + bn(mistakes) + '</b> · <b>+' + bn(f.xp) + ' XP</b>' + (f.first ? '' : ' (আবার করার জন্য কম XP)') + '</p>' + gotHtml(got) +
        '<h4>শিক্ষা</h4><ul class="hf-take">' + c.lesson.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul><div class="hp-nav"><button type="button" class="hp-btn" id="emAg">↻ আবার</button><button type="button" class="hp-btn pri" id="emLs">← ফিরুন</button></div></div>';
      C.bindRoleBar(body); $('#emAg').onclick = function () { runCase(o); }; $('#emLs').onclick = o.back;
    }
    show();
  }
  function wireCases(box, defs) { box.onclick = function (e) { var b = e.target.closest('.hp-case'); if (!b) return; var d = defs[b.dataset.k]; var c = d.cases.filter(function (x) { return String(x.id) === b.dataset.c; })[0]; if (c) d.run(c); }; }

  /* ---------- হোম ---------- */
  var AREAS = [
    ['cpr', '🫀', 'CPR ও ACLS', 'চাপের তাল, শকযোগ্য ও শকহীন রিদম, ৩টি অ্যারেস্ট-কেস'],
    ['atls', '🚑', 'ট্রমা (ATLS)', 'রোড অ্যাক্সিডেন্টে ABCDE ধরে প্রাথমিক মূল্যায়ন, ৩টি কেস'],
    ['tox', '☠️', 'বিষক্রিয়া, সাপ ও পোড়া', 'প্রতিষেধক বাছা, সাপের কামড়, পোড়ার তরল-হিসাব'],
    ['mci', '🚌', 'ম্যাস ক্যাজুয়ালটি ট্রায়াজ', 'অনেক আহত একসাথে, START পদ্ধতিতে রঙিন ট্যাগ']
  ];
  function meta(k) {
    if (k === 'cpr') return 'ACLS কেস ' + bn(cnt(EM.acls)) + '/' + bn(M.N.acls) + (EM.tempo ? ' · ⏱ তাল ✔' : '');
    if (k === 'atls') return 'কেস ' + bn(cnt(EM.atls)) + '/' + bn(M.N.atls);
    if (k === 'tox') return 'বিষ ' + bn(cnt(EM.tox)) + '/' + bn(M.N.tox) + ' · সাপ ' + bn(cnt(EM.snake)) + '/' + bn(M.N.snake) + ' · পোড়া ' + bn(cnt(EM.burn)) + '/' + bn(M.N.burn);
    return 'পরিস্থিতি ' + bn(cnt(EM.mci)) + '/' + bn(M.N.mci);
  }
  function home() {
    area = null; K.clearTimers(); var body = $('#hpBody'), p = D.certProgress(M.CERT, S), got = S.certs && S.certs[M.CERT.id], acc = EM.n ? Math.round(100 * EM.ok / EM.n) : 0;
    body.innerHTML = C.roleBar() + '<div class="hp-card hp-intro"><div><h3>🚨 জরুরি দক্ষতা</h3><p class="hp-mut">জীবন-মৃত্যুর মুহূর্তে কী করবেন: ধাপ ধরে, কারণসহ। নির্ভুলতা: <b>' + (EM.n ? bn(acc) + '%' : '—') + '</b> (' + bn(EM.n) + ' উত্তর)</p></div></div>' +
      '<div class="hf-grid">' + AREAS.map(function (a) { return '<button type="button" class="hf-jc" data-a="' + a[0] + '"><span class="ic">' + a[1] + '</span><b>' + esc(a[2]) + '</b><small>' + esc(a[3]) + '</small><span class="hf-meta">' + meta(a[0]) + '</span></button>'; }).join('') + '</div>' +
      '<div class="hp-card"><h4>' + M.CERT.ic + ' ' + esc(M.CERT.n) + (got ? ' <span class="hp-mut">· অর্জিত, ক্যারিয়ার ট্যাবে নামান</span>' : '') + '</h4><ul class="em-req">' + p.rows.map(function (r) { return '<li class="' + (r.ok ? 'ok' : '') + '">' + (r.ok ? '✔ ' : '○ ') + esc(r.t) + ' <span class="hp-mut">(' + bn(r.cur) + '/' + bn(r.max) + ')</span></li>'; }).join('') + '</ul></div>' +
      '<p class="hp-mut em-note">এটি শিক্ষামূলক সিমুলেশন। বাস্তব জরুরি অবস্থায় স্থানীয় প্রোটোকল, চিকিৎসক ও প্রশিক্ষিত দল (BLS/ACLS/ATLS কোর্স) মানুন; মাত্রা ও পদ্ধতি প্রতিষ্ঠানভেদে ভিন্ন হতে পারে।</p>';
    C.bindRoleBar(body);
    body.onclick = function (e) { var b = e.target.closest('.hf-jc'); if (b) { body.onclick = null; open(b.dataset.a); } };
  }
  function open(a) { area = a; ({ cpr: viewCpr, atls: viewAtls, tox: viewTox, mci: viewMci })[a](); }

  function shell(key, title, subs, fns) {
    C.top(); K.clearTimers(); var body = $('#hpBody'), cur = sub[key];
    body.innerHTML = C.roleBar() + '<button type="button" class="hp-back" id="emHome">← জরুরি দক্ষতা</button><div class="seg tabs hd-sub" role="tablist" aria-label="' + esc(title) + '">' +
      subs.map(function (t) { return '<button type="button" role="tab" data-s="' + t[0] + '" aria-selected="' + (t[0] === cur) + '">' + t[1] + '</button>'; }).join('') + '</div><div id="emBox" class="hp-body"></div>';
    C.bindRoleBar(body); $('#emHome').onclick = home; body.onclick = null;
    $('.hd-sub', body).onclick = function (e) { var b = e.target.closest('button'); if (b) { sub[key] = b.dataset.s; shell(key, title, subs, fns); } };
    fns[cur]($('#emBox'));
  }

  /* =====================================================================
     ১) CPR ও ACLS
     ===================================================================== */
  function viewCpr() { shell('cpr', 'CPR ও ACLS', [['learn', '📖 শিখুন'], ['tempo', '🎵 চাপের তাল'], ['acls', '⚡ ACLS কেস'], ['quiz', '🧠 কুইজ']], { learn: cprLearn, tempo: cprTempo, acls: cprCases, quiz: cprQuiz }); }

  function cprLearn(box) {
    var P = M.CPR, rh = [['vf', 'VF', 'শকযোগ্য', 'yes'], ['vt', 'পালসহীন VT', 'শকযোগ্য', 'yes'], ['asystole', 'অ্যাসিস্টোল', 'শকহীন', 'no'], ['nsr', 'PEA', 'শকহীন (রিদম আছে, নাড়ি নেই)', 'no']];
    box.innerHTML = '<div class="hp-card"><h4>📖 CPR-র মূল কথা (প্রাপ্তবয়স্ক)</h4><div class="em-facts">' + P.FACTS.map(function (f) { return '<div class="em-fact"><span class="ic">' + f[0] + '</span><div><b>' + esc(f[1]) + '</b><p>' + esc(f[2]) + '</p></div></div>'; }).join('') + '</div></div>' +
      '<div class="hp-card"><h4>📈 রিদম এক নজরে: শক দেব কি?</h4><div class="em-rh">' + rh.map(function (r, k) { return '<div class="em-rh-i"><div class="em-mon">' + '<canvas class="em-cv" data-r="' + r[0] + '" data-k="' + k + '"></canvas></div><p><b>' + esc(r[1]) + '</b> <span class="em-chip ' + r[3] + '">' + esc(r[2]) + '</span></p></div>'; }).join('') + '</div></div>' +
      '<div class="em-two"><div class="hp-card"><h4>⚡ শকযোগ্য পথ (VF, পালসহীন VT)</h4>' + list(P.SHOCKABLE, true) + '</div><div class="hp-card"><h4>➖ শকহীন পথ (অ্যাসিস্টোল, PEA)</h4>' + list(P.NONSHOCK, true) + '</div></div>' +
      '<div class="hp-card"><h4>🔍 বিপরীতযোগ্য কারণ: ৫ H ও ৫ T</h4><div class="em-two"><div><b>H</b>' + list(P.HT.H) + '</div><div><b>T</b>' + list(P.HT.T) + '</div></div></div>' +
      '<div class="hp-card"><h4>❤️‍🩹 নাড়ি ফিরলে (ROSC)</h4><p>' + esc(P.POST) + '</p></div>';
    $$('.em-cv', box).forEach(function (cv) { var id = cv.dataset.r; monitor(cv, id, { sweep: false, h: 100, mv: id === 'vt' ? 26 : id === 'nsr' ? 30 : 34, seed: 4, label: id === 'nsr' ? 'নিয়মিত রিদম, কিন্তু নাড়ি নেই' : '' }); });
  }

  /* চাপের তাল: টেপ করে হার ও ছন্দ মাপা; ঐচ্ছিক মেট্রোনোম */
  function cprTempo(box) {
    var P = M.CPR, taps = [], metro = false, mtimer = 0;
    box.innerHTML = '<div class="hp-card"><h4>🎵 চাপের তাল (' + bn(P.BPM[0]) + '–' + bn(P.BPM[1]) + ' / মিনিট)</h4><p class="hp-mut">মেট্রোনোম (প্রায় ' + bn(P.TARGET) + '/মিনিট) চালিয়ে বোতামে তালে তালে চাপুন, তারপর বন্ধ করে নিজের তালে। ' + bn(P.TAPS) + 'টি টেপের পর হার ও ছন্দ মাপা হবে। শব্দ চাইলে হাসপাতালের শব্দ-সেটিং চালু রাখুন; দৃশ্য-স্পন্দন সবসময় আছে।</p>' +
      '<div class="em-tapbox"><button type="button" class="em-tap" id="emTap" aria-label="চাপ"><span class="em-ring" id="emRing"></span>🫀<b id="emTapN">০</b></button><div class="em-stat"><p>বর্তমান হার: <b id="emRate">—</b></p><p id="emVerdict" class="hp-fb" role="status">শুরু করতে বোতামে চাপুন।</p><div class="hp-nav"><button type="button" class="hp-btn" id="emMetro">🔔 মেট্রোনোম চালু</button><button type="button" class="hp-btn" id="emReset">↻ নতুন করে</button></div></div></div></div>';
    var tap = $('#emTap'), ring = $('#emRing'), done = false;
    function pulse() { ring.classList.remove('go'); void ring.offsetWidth; ring.classList.add('go'); }
    function tick() { if (!metro || !box.isConnected) return; pulse(); K.beep(880, 50, .06); mtimer = K.later(tick, 60000 / P.TARGET); }
    function stopMetro() { metro = false; clearTimeout(mtimer); $('#emMetro').textContent = '🔔 মেট্রোনোম চালু'; }
    $('#emMetro').onclick = function () { if (metro) { stopMetro(); return; } metro = true; $('#emMetro').textContent = '🔕 মেট্রোনোম বন্ধ'; tick(); };
    function reset() { taps = []; done = false; $('#emTapN').textContent = bn(0); $('#emRate').textContent = '—'; var v = $('#emVerdict'); v.className = 'hp-fb'; v.textContent = 'শুরু করতে বোতামে চাপুন।'; }
    $('#emReset').onclick = reset;
    function press() {
      if (done) return; taps.push(performance.now()); pulse(); $('#emTapN').textContent = bn(taps.length);
      if (taps.length >= 4) { var w = taps.slice(-9), r = Math.round(60000 / ((w[w.length - 1] - w[0]) / (w.length - 1))); $('#emRate').textContent = bn(r) + '/মিনিট'; }
      if (taps.length >= P.TAPS) finish();
    }
    function finish() {
      done = true; var res = M.tempoVerdict(taps), v = $('#emVerdict'); v.className = 'hp-fb ' + (res.ok ? 'good' : 'bad');
      v.textContent = (res.ok ? '✔ ' : '✘ ') + M.TEMPO_MSG[res.v] + ' (হার ' + bn(res.rate) + '/মিনিট, ছন্দের তারতম্য ' + bn(res.cv) + '%)';
      C.ans('em', res.ok);
      if (res.ok) { var f = K.award('em_tempo', 0, 30); EM.tempo++; K.save(); var got = C.done(f.st); v.innerHTML += ' · <b>+' + bn(f.xp) + ' XP</b>' + (got.length ? '<br>' + got.map(esc).join('<br>') : ''); }
    }
    tap.addEventListener('pointerdown', function (e) { e.preventDefault(); press(); });
    tap.addEventListener('click', function (e) { if (e.detail === 0) press(); });
  }

  function cprCases(box) {
    box.innerHTML = '<div class="hp-card hp-intro"><div><h3>⚡ ACLS কেস</h3><p class="hp-mut">মনিটর দেখে রিদম চিনুন, প্রতি ধাপে সঠিক পদক্ষেপ বাছুন। সম্পন্ন: <b>' + bn(cnt(EM.acls)) + '/' + bn(M.N.acls) + '</b></p></div></div><div class="hp-grid">' + M.ACLS.map(function (c) { return caseCard(c, 'acls', EM.acls); }).join('') + '</div>';
    wireCases(box, { acls: { cases: M.ACLS, run: function (c) { runCase({ bucket: 'acls', c: c, xp: 90, backLabel: 'ACLS কেস', back: viewCpr }); } } });
  }
  function cprQuiz(box) {
    box.innerHTML = '<div class="hp-card"><h4>🧠 CPR কুইজ</h4><p class="hp-mut">১১টি প্রশ্নের ভাণ্ডার থেকে এলোমেলো ৬টি। ভুল ছাড়া শেষ করলে বাড়তি XP।</p><button type="button" class="hp-btn pri" id="emGo">▶ শুরু</button></div>';
    $('#emGo').onclick = function go() { seqQuiz({ title: '🧠 CPR কুইজ', qs: shuffle(M.CPR.QUIZ).slice(0, 6), id: 'em_cprq', xp: 40, backLabel: 'কুইজ', back: viewCpr, again: go, after: function (m) { if (m === 0) EM.cprq++; } }); };
  }

  /* =====================================================================
     ২) ট্রমা (ATLS)
     ===================================================================== */
  function viewAtls() { shell('atls', 'ট্রমা (ATLS)', [['learn', '📖 শিখুন'], ['cases', '🚑 কেস']], { learn: atlsLearn, cases: atlsCases }); }
  function atlsLearn(box) {
    var A = M.ATLS;
    box.innerHTML = '<div class="hp-card"><h4>📖 প্রাথমিক মূল্যায়ন: ABCDE</h4><p class="hp-mut">জীবনের হুমকি যে ক্রমে মারে, সে ক্রমে খুঁজুন ও সঙ্গে সঙ্গে ঠিক করুন। প্রতিটি ধাপ শেষ না করে পরেরটিতে যাবেন না; অবস্থা বদলালে আবার A থেকে।</p><div class="em-facts">' + A.ABCDE.map(function (a) { return '<div class="em-fact"><span class="ic em-ltr">' + (a.k === 'x' ? 'C!' : a.k) + '</span><div><b>' + esc(a.n) + '</b><p>' + esc(a.d) + '</p></div></div>'; }).join('') + '</div></div>' +
      '<div class="hp-card"><h4>🩸 রক্তক্ষরণের শ্রেণি</h4><div class="em-tbwrap"><table class="em-tb"><thead><tr><th>শ্রেণি</th><th>রক্তহারা</th><th>লক্ষণ</th></tr></thead><tbody>' + A.SHOCK.map(function (r) { return '<tr><td><b>' + r[0] + '</b></td><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>'; }).join('') + '</tbody></table></div></div>' +
      '<div class="hp-card"><h4>🧠 GCS (৩–১৫)</h4>' + list(A.GCS) + '<p class="hp-mut">উদাহরণ: ডাকলে চোখ খোলে (৩) + বিভ্রান্ত কথা (৪) + ব্যথার জায়গা চেনে (৫) = ১২। GCS ≤ ৮ = শ্বাসপথ নিরাপদ করার ভাবনা।</p></div>' +
      '<div class="hp-card"><h4>📝 দ্বিতীয় মূল্যায়ন</h4><p>' + esc(A.AMPLE) + '</p></div><div class="hp-card"><h4>💡 মনে রাখুন</h4>' + list(A.TIPS) + '</div>';
  }
  function atlsCases(box) {
    box.innerHTML = '<div class="hp-card hp-intro"><div><h3>🚑 ট্রমা-কেস</h3><p class="hp-mut">রোড অ্যাক্সিডেন্টে ধাপে ধাপে ABCDE: প্রতিটি অক্ষরে রোগীর অবস্থা দেখে সঠিক কাজ বাছুন। সম্পন্ন: <b>' + bn(cnt(EM.atls)) + '/' + bn(M.N.atls) + '</b></p></div></div><div class="hp-grid">' + M.ATLS_CASES.map(function (c) { return caseCard(c, 'atls', EM.atls); }).join('') + '</div>';
    wireCases(box, { atls: { cases: M.ATLS_CASES, run: function (c) { runCase({ bucket: 'atls', c: c, xp: 90, abc: true, backLabel: 'ট্রমা-কেস', back: viewAtls }); } } });
  }

  /* =====================================================================
     ৩) বিষক্রিয়া, সাপ ও পোড়া
     ===================================================================== */
  function viewTox() { shell('tox', 'বিষক্রিয়া, সাপ ও পোড়া', [['anti', '💊 প্রতিষেধক'], ['tox', '☠️ বিষক্রিয়া কেস'], ['snake', '🐍 সাপ'], ['burn', '🔥 পোড়া']], { anti: toxAnti, tox: toxCases, snake: toxSnake, burn: toxBurn }); }

  function toxAnti(box) {
    var T = M.TOX;
    box.innerHTML = '<div class="hp-card"><h4>💊 প্রতিষেধক মিলান</h4><p class="hp-mut">১৬টি বিষের ভাণ্ডার থেকে এলোমেলো ৬টি প্রশ্ন: কোন বিষে কোন প্রতিষেধক বা মূল নির্দিষ্ট চিকিৎসা।</p><button type="button" class="hp-btn pri" id="emGo">▶ শুরু</button></div>' +
      '<div class="hp-card"><h4>💡 বিষক্রিয়ার সাধারণ নিয়ম</h4>' + list(T.TIPS) + '</div>' +
      '<details class="hp-card em-det"><summary><b>📚 সব প্রতিষেধকের তালিকা (পড়ে নিতে)</b></summary><div class="em-tbwrap"><table class="em-tb"><thead><tr><th>বিষ</th><th>প্রতিষেধক</th></tr></thead><tbody>' + M.ANTIDOTES.map(function (a) { return '<tr><td>' + esc(a.tox) + '</td><td>' + esc(a.ant) + '</td></tr>'; }).join('') + '</tbody></table></div></details>';
    $('#emGo').onclick = function go() { seqQuiz({ title: '💊 প্রতিষেধক মিলান', qs: M.antidoteSet(Math.floor(Math.random() * 100000) + 1), id: 'em_anti', xp: 50, backLabel: 'প্রতিষেধক', back: viewTox, again: go, after: function (m) { if (m === 0) EM.anti++; } }); };
  }
  function toxCases(box) {
    box.innerHTML = '<div class="hp-card hp-intro"><div><h3>☠️ বিষক্রিয়া কেস</h3><p class="hp-mut">লক্ষণ থেকে সিন্ড্রোম চিনুন, প্রতিষেধক ও ডোজ-কৌশল ঠিক করুন। সম্পন্ন: <b>' + bn(cnt(EM.tox)) + '/' + bn(M.N.tox) + '</b></p></div></div><div class="hp-grid">' + M.TOX_CASES.map(function (c) { return caseCard(c, 'tox', EM.tox); }).join('') + '</div>';
    wireCases(box, { tox: { cases: M.TOX_CASES, run: function (c) { runCase({ bucket: 'tox', c: c, xp: 80, backLabel: 'বিষক্রিয়া কেস', back: viewTox }); } } });
  }
  function toxSnake(box) {
    var Sn = M.SNAKE;
    box.innerHTML = '<div class="hp-card"><h4>🐍 দুই ধরনের বিষ</h4><div class="em-facts">' + Sn.TYPES.map(function (t) { return '<div class="em-fact"><span class="ic">' + t[0] + '</span><div><b>' + esc(t[1]) + '</b><p>' + esc(t[2]) + '</p></div></div>'; }).join('') + '</div></div>' +
      '<div class="em-two"><div class="hp-card"><h4>✅ করুন</h4>' + list(Sn.DO) + '</div><div class="hp-card"><h4>❌ করবেন না</h4>' + list(Sn.DONT) + '</div></div>' +
      '<div class="hp-card"><h4>🏥 হাসপাতালে</h4>' + list(Sn.HOSP) + '</div>' +
      '<div class="hp-card hp-intro"><div><h3>কেস ও কুইজ</h3><p class="hp-mut">সম্পন্ন: <b>' + bn(cnt(EM.snake)) + '/' + bn(M.N.snake) + '</b></p></div></div><div class="hp-grid">' + M.SNAKE_CASES.map(function (c) { return caseCard(c, 'snake', EM.snake); }).join('') + '<button type="button" class="hp-case" data-k="sq" data-c="sq"><div class="th">🧠</div><div class="bd"><b>সাপ কুইজ</b><span>প্রাথমিক চিকিৎসা, 20WBCT, ASV ও বিপদ-সংকেত (৫টি প্রশ্ন)।</span></div></button></div>';
    wireCases(box, {
      snake: { cases: M.SNAKE_CASES, run: function (c) { runCase({ bucket: 'snake', c: c, xp: 80, backLabel: 'সাপ', back: viewTox }); } },
      sq: { cases: [{ id: 'sq' }], run: function () { (function go() { seqQuiz({ title: '🧠 সাপ কুইজ', qs: shuffle(M.SNAKE_QUIZ), id: 'em_snakeq', xp: 40, backLabel: 'সাপ', back: viewTox, again: go }); })(); } }
    });
  }

  function toxBurn(box) {
    var B = M.BURN;
    box.innerHTML = '<div class="hp-card"><h4>🔥 পোড়ার প্রাথমিক চিকিৎসা</h4>' + list(B.FIRST, true) + '</div>' +
      '<div class="hp-card"><h4>🧮 পোড়ার শতাংশ (rule of nines, প্রাপ্তবয়স্ক)</h4><p class="hp-mut">পুড়েছে এমন অংশে ট্যাপ করুন। শুধু দ্বিতীয় ও তৃতীয় মাত্রার (ফোসকা বা গভীর) পোড়া গুনুন; শুধু লালচে (প্রথম মাত্রা) নয়। শিশুতে ভিন্ন চার্ট (Lund-Browder)।</p><div class="em-parts" id="emParts">' + B.NINES.map(function (p) { return '<button type="button" class="em-part" data-p="' + p[0] + '" aria-pressed="false">' + esc(p[1]) + ' <b>' + bn(p[2]) + '%</b></button>'; }).join('') + '</div><p class="em-sum">মোট TBSA: <b id="emTb">০</b>%</p></div>' +
      '<div class="hp-card"><h4>💧 Parkland তরল-ক্যালকুলেটর</h4><p class="hp-mut">' + esc(B.FLUID) + '</p><div class="em-calc"><label>ওজন (কেজি)<input type="number" id="emKg" inputmode="decimal" min="10" max="200" value="60"></label><label>পোড়া (% TBSA)<input type="number" id="emPc" inputmode="decimal" min="1" max="100" value="30"></label><label>আঘাতের পর কত ঘণ্টা কেটেছে<input type="number" id="emHr" inputmode="decimal" min="0" max="8" step="0.5" value="0"></label></div><div id="emOut" class="em-out" role="status"></div></div>' +
      '<div class="hp-card"><h4>ℹ️ বার্ন-ইউনিটে পাঠান</h4><p>' + esc(B.REF[0]) + '</p><p>' + esc(B.INHAL) + '</p></div>' +
      '<div class="hp-card hp-intro"><div><h3>কেস ও হিসাব</h3><p class="hp-mut">সম্পন্ন: <b>' + bn(cnt(EM.burn)) + '/' + bn(M.N.burn) + '</b></p></div></div><div class="hp-grid">' + M.BURN_CASES.map(function (c) { return caseCard(c, 'burn', EM.burn); }).join('') + '<button type="button" class="hp-case" data-k="pk" data-c="pk"><div class="th">🧮</div><div class="bd"><b>Parkland হিসাব-প্রশ্ন</b><span>এলোমেলো ওজন ও শতাংশে ৪টি প্রশ্ন, আঘাতের পর দেরিতে আসা রোগীসহ।</span><div class="ft">ভুল ছাড়া শেষ করলে ব্যাজ</div></div></button></div>';
    var sel = {};
    $('#emParts', box).onclick = function (e) { var b = e.target.closest('.em-part'); if (!b) return; var p = b.dataset.p; sel[p] = !sel[p]; b.setAttribute('aria-pressed', String(!!sel[p])); b.classList.toggle('on', !!sel[p]); $('#emTb', box).textContent = bn(M.tbsa(Object.keys(sel).filter(function (k) { return sel[k]; }))); };
    function calc() {
      var kg = parseFloat($('#emKg', box).value), pc = parseFloat($('#emPc', box).value), hr = parseFloat($('#emHr', box).value) || 0, out = $('#emOut', box);
      if (!(kg > 0) || !(pc > 0) || pc > 100 || hr < 0 || hr > 8) { out.innerHTML = '<span class="hp-mut">ওজন, শতাংশ (১–১০০) ও ঘণ্টা (০–৮) ঠিকভাবে দিন।</span>'; return; }
      var r = M.parkland(kg, pc, hr);
      out.innerHTML = '<p>২৪ ঘণ্টার মোট: <b>' + bn(Math.round(r.total)) + ' মিলি</b> (৪ × ' + bn(kg) + ' × ' + bn(pc) + ')</p><p>প্রথম ৮ ঘণ্টায় অর্ধেক: <b>' + bn(Math.round(r.half)) + ' মিলি</b>' + (r.left > 0 ? ' · বাকি ' + bn(r.left) + ' ঘণ্টায় প্রায় <b>' + bn(r.rate1) + ' মিলি/ঘণ্টা</b>' : ' · প্রথম ৮ ঘণ্টা পার: দ্রুত বাকি হিসাব ও প্রস্রাব দেখে সামঞ্জস্য করুন') + '</p><p>পরের ১৬ ঘণ্টায় অর্ধেক: প্রায় <b>' + bn(r.rate2) + ' মিলি/ঘণ্টা</b></p><p>প্রস্রাব লক্ষ্য: প্রায় <b>' + bn(r.uo) + ' মিলি/ঘণ্টা</b> (০.৫ মিলি/কেজি/ঘণ্টা)। এ হিসাব শুরুর অনুমান, প্রস্রাব দেখে সামঞ্জস্য করুন।</p>';
    }
    ['emKg', 'emPc', 'emHr'].forEach(function (id) { $('#' + id, box).oninput = calc; }); calc();
    wireCases(box, {
      burn: { cases: M.BURN_CASES, run: function (c) { runCase({ bucket: 'burn', c: c, xp: 80, backLabel: 'পোড়া', back: viewTox }); } },
      pk: { cases: [{ id: 'pk' }], run: function () { (function go() { seqQuiz({ title: '🧮 Parkland হিসাব', intro: 'কাগজ-কলমে হিসাব করুন (ওপরের ক্যালকুলেটর ছাড়াই), তারপর উত্তর বাছুন।', qs: M.parklandSet(Math.floor(Math.random() * 100000) + 1), id: 'em_parkland', xp: 50, backLabel: 'পোড়া', back: viewTox, again: go, after: function (m) { if (m === 0) EM.parkland++; } }); })(); } }
    });
  }

  /* =====================================================================
     ৪) ম্যাস ক্যাজুয়ালটি ট্রায়াজ (START)
     ===================================================================== */
  function viewMci() { shell('mci', 'ম্যাস ক্যাজুয়ালটি ট্রায়াজ', [['learn', '📖 শিখুন'], ['drill', '🚌 অনুশীলন'], ['quiz', '🧠 কুইজ']], { learn: mciLearn, drill: mciDrill, quiz: mciQuiz }); }
  function tagBadge(k) { var t = M.TAGS[k]; return '<span class="em-tg em-t-' + k + '">' + t.ic + ' ' + esc(t.n) + '</span>'; }
  function mciLearn(box) {
    box.innerHTML = '<div class="hp-card"><h4>📖 START: Simple Triage And Rapid Treatment</h4><p class="hp-mut">অনেক আহত, সম্পদ কম। প্রতিজনকে ৩০–৬০ সেকেন্ডে ৪ রঙের একটিতে ফেলুন।</p><ol class="em-flow">' + M.START_FLOW.map(function (s) { return '<li><span class="ic">' + s[0] + '</span><div><b>' + esc(s[1]) + '</b><p>' + esc(s[2]) + '</p></div></li>'; }).join('') + '</ol></div>' +
      '<div class="hp-card"><h4>🎨 চার রঙের অর্থ</h4><div class="em-tags">' + ['R', 'Y', 'G', 'B'].map(function (k) { return '<div class="em-tagrow">' + tagBadge(k) + '<span>' + esc(M.TAGS[k].d) + '</span></div>'; }).join('') + '</div></div>' +
      '<div class="hp-card"><h4>💡 মনে রাখুন</h4>' + list(M.START_INFO) + '</div>';
  }
  function mciDrill(box) {
    box.innerHTML = '<div class="hp-card hp-intro"><div><h3>🚌 ট্রায়াজ অনুশীলন</h3><p class="hp-mut">প্রতিজন আহতের তথ্য দেখে START-এর ধাপ ধরে ট্যাগ বাছুন। সম্পন্ন: <b>' + bn(cnt(EM.mci)) + '/' + bn(M.N.mci) + '</b></p></div></div><div class="hp-grid">' + M.SCENARIOS.map(function (c) { return caseCard(c, 'mci', EM.mci); }).join('') + '</div>';
    wireCases(box, { mci: { cases: M.SCENARIOS, run: runMci } });
  }
  function chips(c) {
    var r = [['চলাফেরা', c.walk ? 'হাঁটতে পারে' : 'হাঁটতে পারে না']];
    if (!c.walk) { r.push(['শ্বাস', c.br === 0 ? 'শ্বাসপথ খুলেও নেই' : c.br === 1 ? 'শ্বাসপথ খুললে শুরু' : 'নিজে নেয়']); if (c.br === 2) { r.push(['শ্বাসের হার', bn(c.rr)]); r.push(['কবজির নাড়ি', c.rad ? 'আছে' : 'নেই']); r.push(['ক্যাপিলারি রিফিল', bn(c.crt) + ' সে.']); r.push(['আদেশ', c.cmd ? 'মানে' : 'মানে না']); } }
    return r.map(function (x) { return '<span class="hd-chip"><i>' + x[0] + '</i> ' + x[1] + '</span>'; }).join('');
  }
  function runMci(sc) {
    C.top(); var i = 0, mistakes = 0, body = $('#hpBody'), done = [];
    body.innerHTML = C.roleBar() + '<button type="button" class="hp-back" id="emBkM">← অনুশীলন</button><div class="hp-card"><h3>' + sc.ic + ' ' + esc(sc.n) + '</h3><p class="hp-mut">' + esc(sc.d) + '</p></div><div id="emMc"></div>';
    C.bindRoleBar(body); $('#emBkM').onclick = viewMci;
    function show() {
      if (i >= sc.c.length) return fin();
      var c = sc.c[i], el = $('#emMc');
      el.innerHTML = '<div class="hp-steps">' + sc.c.map(function (x, k) { return '<i class="' + (k < i ? 'd' : '') + '"></i>'; }).join('') + '</div><p class="hp-sn">আহত ' + bn(i + 1) + '/' + bn(sc.c.length) + '</p><div class="hp-card"><div class="hd-pt-h"><span class="hd-av">' + c.ic + '</span><div><b>' + esc(c.t) + '</b></div></div><p>' + esc(c.desc) + '</p><div class="hd-vit">' + chips(c) + '</div></div>' +
        '<div class="hp-card"><b>কোন ট্যাগ?</b><div class="em-tagbtns">' + ['R', 'Y', 'G', 'B'].map(function (k) { return '<button type="button" class="em-tgb em-t-' + k + '" data-t="' + k + '">' + M.TAGS[k].ic + ' ' + esc(M.TAGS[k].n) + '</button>'; }).join('') + '</div><p class="hp-fb" id="emMf" role="status"></p><div class="hp-nav" id="emMn" hidden><button type="button" class="hp-btn pri">' + (i === sc.c.length - 1 ? 'ফলাফল দেখুন' : 'পরবর্তী ▶') + '</button></div></div>';
      var right = M.start(c), first = true, fin1 = false, f = $('#emMf', el);
      el.onclick = function (e) {
        var b = e.target.closest('.em-tgb'); if (!b || fin1 || b.disabled) return;
        if (b.dataset.t === right) { fin1 = true; b.classList.add('ok'); f.className = 'hp-fb good'; f.textContent = '✔ ' + M.startWhy(c); C.ans('em', first); $$('.em-tgb', el).forEach(function (x) { x.disabled = true; }); done.push(right); var n = $('#emMn', el); n.hidden = false; n.firstChild.onclick = function () { i++; show(); }; }
        else { first = false; mistakes++; b.disabled = true; b.classList.add('no'); C.ans('em', false); f.className = 'hp-fb bad'; f.textContent = '✘ ঠিক হয়নি। START-এর ধাপগুলো ক্রমে মিলিয়ে নিন: হাঁটা → শ্বাস → শ্বাসের হার → রক্তসঞ্চালন → চেতনা।'; }
      };
    }
    function fin() {
      var f = K.award('em_mci_' + sc.id, mistakes, 100), t = M.tally(sc); EM.mci[sc.id] = Math.max(EM.mci[sc.id] || 0, f.st); K.save(); var got = C.done(f.st);
      body.innerHTML = C.roleBar() + '<div class="hp-card hp-res"><h3>🎉 ট্রায়াজ শেষ: ' + esc(sc.n) + '</h3><div class="big">' + stars(f.st) + '</div><p>ভুল: <b>' + bn(mistakes) + '</b> · <b>+' + bn(f.xp) + ' XP</b>' + (f.first ? '' : ' (আবার করার জন্য কম XP)') + '</p>' + gotHtml(got) +
        '<h4>বোর্ড</h4><div class="em-board">' + ['R', 'Y', 'G', 'B'].map(function (k) { return '<div class="em-col em-t-' + k + '"><b>' + M.TAGS[k].ic + ' ' + esc(M.TAGS[k].n) + ' (' + bn(t[k]) + ')</b><ul>' + sc.c.filter(function (c) { return M.start(c) === k; }).map(function (c) { return '<li>' + bn(c.id) + '. ' + esc(c.t) + '</li>'; }).join('') + '</ul></div>'; }).join('') + '</div>' +
        '<p class="hp-mut">সরানোর ক্রম: লাল → হলুদ → সবুজ, কালো শেষে (অবস্থা বদলালে আবার ট্রায়াজ)।</p><h4>শিক্ষা</h4><ul class="hf-take">' + sc.lesson.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul><div class="hp-nav"><button type="button" class="hp-btn" id="emAg">↻ আবার</button><button type="button" class="hp-btn pri" id="emLs">← অনুশীলন</button></div></div>';
      C.bindRoleBar(body); $('#emAg').onclick = function () { runMci(sc); }; $('#emLs').onclick = viewMci;
    }
    show();
  }
  function mciQuiz(box) {
    box.innerHTML = '<div class="hp-card"><h4>🧠 ট্রায়াজ কুইজ</h4><p class="hp-mut">START-এর নিয়ম, রঙের অর্থ ও ট্রায়াজ-নীতি: ৬টি প্রশ্ন।</p><button type="button" class="hp-btn pri" id="emGo">▶ শুরু</button></div>';
    $('#emGo').onclick = function go() { seqQuiz({ title: '🧠 ট্রায়াজ কুইজ', qs: shuffle(M.MCI_QUIZ).slice(0, 6), id: 'em_mciq', xp: 40, backLabel: 'কুইজ', back: viewMci, again: go, after: function (m) { if (m === 0) EM.mciq++; } }); };
  }

  /* হোম-ট্যাবে ফিরলে (ট্যাব বদলে আবার এলে) সবসময় শুরুর পর্দা */
  K.addTab('emerg', '🚨 জরুরি দক্ষতা', home);
  window.GEBEmerg = { home: home };
})();
