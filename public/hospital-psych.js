/* GEB Hub: সাইকোলজি (v3.21)
   চারটি অংশ: ১) মানসিক অবস্থা পরীক্ষা (MSE) ২) স্কেল ও স্কোরিং (PHQ-9, GAD-7, AUDIT, PC-PTSD-5)
   ৩) ডায়াগনস্টিক কেস ৪) মানসিক জরুরি অবস্থা। ব্যাজ ও সার্টিফিকেট ক্যারিয়ারে যোগ হয়।
   সাধারণ আকৃতি (em-*) hospital-emerg.css থেকে, নতুন অংশ (ps-*) hospital-psych.css-এ। */
(function () {
  'use strict';
  var K = window.GEBHospKit, C = window.GEBCareer, M = window.GEBHospPsych, D = window.GEBHospDuty;
  if (!K || !C || !M || !D) return;
  var esc = K.esc, bn = K.bn, $ = K.$, $$ = K.$$, S = C.S, shuffle = C.shuffle;

  function merge(dst, src) { Object.keys(src).forEach(function (k) { if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k])) { if (!dst[k] || typeof dst[k] !== 'object') dst[k] = {}; merge(dst[k], src[k]); } else if (dst[k] === undefined) dst[k] = src[k]; }); return dst; }
  S.psy = merge(S.psy || {}, M.freshState());
  var PS = S.psy;

  M.BADGES.forEach(function (b) { if (!D.BADGES.some(function (x) { return x.id === b.id; })) D.BADGES.push(b); });
  if (!D.CERTS.some(function (c) { return c.id === M.CERT.id; })) { var gi = -1; D.CERTS.forEach(function (c, i) { if (c.id === 'grand') gi = i; }); D.CERTS.splice(gi < 0 ? D.CERTS.length : gi, 0, M.CERT); }

  var sub = { mse: 'learn', scale: 'tools', dx: 'learn', emg: 'learn' };

  function cnt(o) { return Object.keys(o || {}).length; }
  function stars(n) { return K.starHtml(n); }
  function gotHtml(got) { return got.length ? '<p class="hd-got">' + got.map(esc).join('<br>') + '</p>' : ''; }
  function list(items, ordered) { var t = ordered ? 'ol' : 'ul'; return '<' + t + ' class="em-ol">' + items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</' + t + '>'; }
  function caseCard(c, key, doneMap) {
    var d = doneMap[c.id];
    return '<button type="button" class="hp-case" data-c="' + c.id + '" data-k="' + key + '"><div class="th">' + c.ic + (d ? '<em>✔ ' + stars(d) + '</em>' : '') + '</div><div class="bd"><b>' + esc(c.n) + '</b><span>' + esc(c.d.length > 110 ? c.d.slice(0, 108) + '…' : c.d) + '</span><div class="ft">' + esc(c.lvl) + '</div></div></button>';
  }
  function wireCases(box, defs) { box.onclick = function (e) { var b = e.target.closest('.hp-case'); if (!b) return; var d = defs[b.dataset.k]; var c = d.cases.filter(function (x) { return String(x.id) === b.dataset.c; })[0]; if (c) d.run(c); }; }
  function rangeText(s, i) { var lo = i === 0 ? 0 : s.bands[i - 1][0] + 1, hi = s.bands[i][0]; return bn(lo) + (hi > lo ? '–' + bn(hi) : ''); }

  /* ---------- কুইজের ধারা ---------- */
  function seqQuiz(o) {
    C.top(); var body = $('#hpBody'), qs = o.qs, i = 0, mistakes = 0;
    body.innerHTML = C.roleBar() + '<button type="button" class="hp-back" id="psBk">← ' + esc(o.backLabel) + '</button><div class="hp-card"><h4>' + esc(o.title) + '</h4>' + (o.intro ? '<p class="hp-mut">' + esc(o.intro) + '</p>' : '') + '<div id="psQz"></div></div>';
    C.bindRoleBar(body); $('#psBk').onclick = o.back;
    function nextQ() {
      var el = $('#psQz'); if (i >= qs.length) return fin();
      el.innerHTML = '<div class="hp-steps">' + qs.map(function (x, k) { return '<i class="' + (k < i ? 'd' : '') + '"></i>'; }).join('') + '</div><p class="hp-sn">প্রশ্ন ' + bn(i + 1) + '/' + bn(qs.length) + '</p><div id="psQq"></div>';
      C.ask($('#psQq'), qs[i], 'psy', function (first) {
        if (!first) mistakes++; var nb = document.createElement('div'); nb.className = 'hp-nav'; nb.innerHTML = '<button type="button" class="hp-btn pri">' + (i === qs.length - 1 ? 'ফল দেখুন' : 'পরবর্তী ▶') + '</button>';
        $('#psQq').appendChild(nb); nb.firstChild.onclick = function () { i++; nextQ(); };
      });
    }
    function fin() {
      var f = K.award(o.id, mistakes, o.xp || 40); if (o.after) o.after(mistakes); K.save(); var got = C.done(f.st);
      $('#psQz').innerHTML = '<div class="hp-res"><h3>🎉 শেষ</h3><div class="big">' + stars(f.st) + '</div><p>ভুল: <b>' + bn(mistakes) + '</b> · <b>+' + bn(f.xp) + ' XP</b>' + (f.first ? '' : ' (আবার করার জন্য কম XP)') + '</p>' + gotHtml(got) + '<div class="hp-nav"><button type="button" class="hp-btn pri" id="psAg">↻ আবার</button><button type="button" class="hp-btn" id="psLs">← ফিরুন</button></div></div>';
      $('#psAg').onclick = o.again; $('#psLs').onclick = o.back;
    }
    nextQ();
  }

  /* ---------- কেসের ধারা ---------- */
  function runCase(o) {
    C.top(); var c = o.c, steps = c.steps, i = 0, mistakes = 0, body = $('#hpBody');
    body.innerHTML = C.roleBar() + '<button type="button" class="hp-back" id="psBkC">← ' + esc(o.backLabel) + '</button><div class="hp-card"><h3>' + c.ic + ' ' + esc(c.n) + '</h3><p class="ps-vig">' + esc(c.d) + '</p></div><div id="psStep"></div>';
    C.bindRoleBar(body); $('#psBkC').onclick = o.back;
    function show() {
      if (i >= steps.length) return fin();
      var s = steps[i], el = $('#psStep');
      el.innerHTML = '<div class="hp-steps">' + steps.map(function (x, k) { return '<i class="' + (k < i ? 'd' : '') + '"></i>'; }).join('') + '</div><p class="hp-sn">ধাপ ' + bn(i + 1) + '/' + bn(steps.length) + (s.t ? ' · ' + esc(s.t) : '') + '</p><div id="psQ" class="hp-card"></div>';
      C.ask($('#psQ'), s.q, 'psy', function (first) {
        if (!first) mistakes++; var nb = document.createElement('div'); nb.className = 'hp-nav'; nb.innerHTML = '<button type="button" class="hp-btn pri">' + (i === steps.length - 1 ? 'শেষ করুন' : 'পরবর্তী ▶') + '</button>';
        $('#psQ').appendChild(nb); nb.firstChild.onclick = function () { i++; show(); };
      });
    }
    function fin() {
      var f = K.award('ps_' + o.bucket + '_' + c.id, mistakes, o.xp || 80); PS[o.bucket][c.id] = Math.max(PS[o.bucket][c.id] || 0, f.st); K.save(); var got = C.done(f.st);
      body.innerHTML = C.roleBar() + '<div class="hp-card hp-res"><h3>🎉 কেস শেষ: ' + esc(c.n) + '</h3><div class="big">' + stars(f.st) + '</div><p>ভুল: <b>' + bn(mistakes) + '</b> · <b>+' + bn(f.xp) + ' XP</b>' + (f.first ? '' : ' (আবার করার জন্য কম XP)') + '</p>' + gotHtml(got) +
        '<h4>শিক্ষা</h4><ul class="hf-take">' + c.lesson.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul><div class="hp-nav"><button type="button" class="hp-btn" id="psAg">↻ আবার</button><button type="button" class="hp-btn pri" id="psLs">← ফিরুন</button></div></div>';
      C.bindRoleBar(body); $('#psAg').onclick = function () { runCase(o); }; $('#psLs').onclick = o.back;
    }
    show();
  }

  /* ---------- হোম ---------- */
  var AREAS = [
    ['mse', '🔎', 'মানসিক অবস্থা পরীক্ষা (MSE)', 'আট ডোমেইন, শব্দকোষ, তিনটি সাক্ষাৎকার-কেস'],
    ['scale', '📊', 'স্কেল ও স্কোরিং', 'PHQ-9, GAD-7, AUDIT, PC-PTSD-5: নিজে পূরণ করে স্কোর ও করণীয়'],
    ['dx', '🩺', 'ডায়াগনস্টিক কেস', 'বিষণ্নতা থেকে অটিজম: ৮টি কেস, মানদণ্ড ও চিকিৎসা'],
    ['emg', '🛟', 'মানসিক জরুরি অবস্থা', 'আত্মহত্যার ঝুঁকি, উত্তেজিত রোগী, ডিলিরিয়াম, প্রত্যাহার']
  ];
  function meta(k) {
    if (k === 'mse') return 'কেস ' + bn(cnt(PS.mse)) + '/' + bn(M.N.mse);
    if (k === 'scale') return 'ব্যবহৃত স্কেল ' + bn(cnt(PS.scale)) + '/' + bn(M.N.scale);
    if (k === 'dx') return 'কেস ' + bn(cnt(PS.dx)) + '/' + bn(M.N.dx);
    return 'কেস ' + bn(cnt(PS.emg)) + '/' + bn(M.N.emg);
  }
  function home() {
    K.clearTimers(); var body = $('#hpBody'), p = D.certProgress(M.CERT, S), got = S.certs && S.certs[M.CERT.id], acc = PS.n ? Math.round(100 * PS.ok / PS.n) : 0;
    body.innerHTML = C.roleBar() + '<div class="hp-card hp-intro"><div><h3>🧠 সাইকোলজি</h3><p class="hp-mut">মন বোঝা, মাপা, নির্ণয় ও জরুরি সামাল: ধাপে ধাপে, কারণসহ। নির্ভুলতা: <b>' + (PS.n ? bn(acc) + '%' : '—') + '</b> (' + bn(PS.n) + ' উত্তর)</p></div></div>' +
      '<div class="hf-grid">' + AREAS.map(function (a) { return '<button type="button" class="hf-jc" data-a="' + a[0] + '"><span class="ic">' + a[1] + '</span><b>' + esc(a[2]) + '</b><small>' + esc(a[3]) + '</small><span class="hf-meta">' + meta(a[0]) + '</span></button>'; }).join('') + '</div>' +
      '<div class="hp-card"><h4>' + M.CERT.ic + ' ' + esc(M.CERT.n) + (got ? ' <span class="hp-mut">· অর্জিত, ক্যারিয়ার ট্যাবে নামান</span>' : '') + '</h4><ul class="em-req">' + p.rows.map(function (r) { return '<li class="' + (r.ok ? 'ok' : '') + '">' + (r.ok ? '✔ ' : '○ ') + esc(r.t) + ' <span class="hp-mut">(' + bn(r.cur) + '/' + bn(r.max) + ')</span></li>'; }).join('') + '</ul></div>' +
      '<p class="hp-mut em-note">এটি শিক্ষামূলক সিমুলেশন। স্কেল শুধু স্ক্রিনিং, রোগনির্ণয় নয়। আসল রোগী বা ঝুঁকির পরিস্থিতিতে স্থানীয় প্রোটোকল, তত্ত্বাবধায়ক ও বিশেষজ্ঞ মানুন; নিজে বা কেউ বিপদে থাকলে স্থানীয় জরুরি সেবা (৯৯৯) বা নিকটস্থ হাসপাতাল।</p>';
    C.bindRoleBar(body); body.onchange = null;
    body.onclick = function (e) { var b = e.target.closest('.hf-jc'); if (b) { body.onclick = null; ({ mse: viewMse, scale: viewScale, dx: viewDx, emg: viewEmg })[b.dataset.a](); } };
  }
  function shell(key, title, subs, fns) {
    C.top(); K.clearTimers(); var body = $('#hpBody'), cur = sub[key];
    body.innerHTML = C.roleBar() + '<button type="button" class="hp-back" id="psHome">← সাইকোলজি</button><div class="seg tabs hd-sub" role="tablist" aria-label="' + esc(title) + '">' +
      subs.map(function (t) { return '<button type="button" role="tab" data-s="' + t[0] + '" aria-selected="' + (t[0] === cur) + '">' + t[1] + '</button>'; }).join('') + '</div><div id="psBox" class="hp-body"></div>';
    C.bindRoleBar(body); $('#psHome').onclick = home; body.onclick = null; body.onchange = null;
    $('.hd-sub', body).onclick = function (e) { var b = e.target.closest('button'); if (b) { sub[key] = b.dataset.s; shell(key, title, subs, fns); } };
    fns[cur]($('#psBox'));
  }

  /* =====================================================================
     ১) MSE
     ===================================================================== */
  function viewMse() { shell('mse', 'মানসিক অবস্থা পরীক্ষা', [['learn', '📖 শিখুন'], ['cases', '🔎 কেস'], ['quiz', '🧠 কুইজ']], { learn: mseLearn, cases: mseCases, quiz: mseQuiz }); }
  function mseLearn(box) {
    box.innerHTML = '<div class="hp-card"><h4>📖 MSE: আট ডোমেইন</h4><p class="hp-mut">MSE সাক্ষাৎকারের মুহূর্তের "ছবি": যা দেখলেন ও শুনলেন, সেটাই লিখুন; ব্যাখ্যা ও রোগনির্ণয় আলাদা। সাথে সবসময় ঝুঁকি-মূল্যায়ন (আত্মহত্যা ও অন্যের ক্ষতি)।</p><div class="em-facts">' +
      M.MSE.DOMAINS.map(function (d, i) { return '<div class="em-fact"><span class="ic">' + d[0] + '</span><div><b>' + bn(i + 1) + '. ' + esc(d[1]) + '</b><p>' + esc(d[2]) + '</p></div></div>'; }).join('') + '</div></div>' +
      '<details class="hp-card em-det"><summary><b>📚 শব্দকোষ (' + bn(M.MSE.GLOSS.length) + 'টি পরিভাষা)</b></summary><div class="em-tbwrap"><table class="em-tb"><thead><tr><th>পরিভাষা</th><th>মানে</th></tr></thead><tbody>' + M.MSE.GLOSS.map(function (g) { return '<tr><td><b>' + esc(g[0]) + '</b></td><td>' + esc(g[1]) + '</td></tr>'; }).join('') + '</tbody></table></div></details>';
  }
  function mseCases(box) {
    box.innerHTML = '<div class="hp-card hp-intro"><div><h3>🔎 MSE কেস</h3><p class="hp-mut">সাক্ষাৎকারের বিবরণ পড়ে আট ডোমেইনের প্রতিটিতে সঠিক ফল বাছুন। সম্পন্ন: <b>' + bn(cnt(PS.mse)) + '/' + bn(M.N.mse) + '</b></p></div></div><div class="hp-grid">' + M.MSE_CASES.map(function (c) { return caseCard(c, 'mse', PS.mse); }).join('') + '</div>';
    wireCases(box, { mse: { cases: M.MSE_CASES, run: function (c) { runCase({ bucket: 'mse', c: c, xp: 90, backLabel: 'MSE কেস', back: viewMse }); } } });
  }
  function mseQuiz(box) {
    box.innerHTML = '<div class="hp-card"><h4>🧠 MSE কুইজ</h4><p class="hp-mut">পরিভাষা ও ডোমেইনের ১১টি প্রশ্নের ভাণ্ডার থেকে এলোমেলো ৬টি।</p><button type="button" class="hp-btn pri" id="psGo">▶ শুরু</button></div>';
    $('#psGo').onclick = function go() { seqQuiz({ title: '🧠 MSE কুইজ', qs: shuffle(M.MSE.QUIZ).slice(0, 6), id: 'ps_mseq', xp: 40, backLabel: 'কুইজ', back: viewMse, again: go, after: function (m) { if (m === 0) PS.mseq++; } }); };
  }

  /* =====================================================================
     ২) স্কেল ও স্কোরিং
     ===================================================================== */
  function viewScale() { shell('scale', 'স্কেল ও স্কোরিং', [['tools', '📊 স্কেল-টুল'], ['practice', '🎯 স্কোরিং অনুশীলন'], ['ref', '📖 কাট-অফ']], { tools: scaleTools, practice: scalePractice, ref: scaleRef }); }
  function scaleTools(box) {
    box.innerHTML = '<div class="hp-card"><h4>📊 স্কেল-টুল</h4><p class="hp-mut">রোগীর (বা অনুশীলনের জন্য কাল্পনিক) উত্তর বাছুন: স্কোর, মাত্রা ও করণীয় দেখুন। ' + esc(M.SCALE_NOTE) + '</p></div><div class="hp-grid">' +
      Object.keys(M.SCALES).map(function (id) { var s = M.SCALES[id]; return '<button type="button" class="hp-case" data-s="' + id + '"><div class="th">' + s.ic + (PS.scale[id] ? '<em>✔ ব্যবহৃত</em>' : '') + '</div><div class="bd"><b>' + esc(s.n) + '</b><span>' + esc(s.full) + '</span><div class="ft">' + bn(s.items.length) + ' প্রশ্ন</div></div></button>'; }).join('') + '</div>';
    box.onclick = function (e) { var b = e.target.closest('.hp-case'); if (b) scaleForm(b.dataset.s); };
  }
  function scaleForm(id) {
    var s = M.SCALES[id], body = $('#hpBody'), gate = id === 'pcptsd';
    var items = s.items.map(function (_, i) {
      var o = M.itemOpts(s, i);
      return '<fieldset class="ps-item" data-i="' + i + '"><legend>' + bn(i + 1) + '. ' + esc(M.itemText(s, i)) + '</legend><div class="ps-opts">' + o.map(function (x) { return '<label class="ps-opt"><input type="radio" name="q' + i + '" value="' + x[0] + '"><span>' + esc(x[1]) + '</span></label>'; }).join('') + '</div></fieldset>';
    }).join('');
    body.innerHTML = C.roleBar() + '<button type="button" class="hp-back" id="psBkS">← স্কেল-টুল</button><div class="hp-card"><h3>' + s.ic + ' ' + esc(s.n) + '</h3><p class="hp-mut">' + esc(s.full) + '</p><p>' + esc(s.period) + '</p>' + items + '<div class="hp-nav"><button type="button" class="hp-btn pri" id="psCalc">স্কোর দেখুন</button><button type="button" class="hp-btn" id="psClr">↻ মুছুন</button></div><div id="psOut" role="status"></div></div>';
    C.bindRoleBar(body); $('#psBkS').onclick = viewScale;
    function setGate() { if (!gate) return; var no = ($('input[name=q0]:checked', body) || {}).value === '0'; $$('.ps-item', body).forEach(function (f, i) { if (i > 0) { f.disabled = no; f.classList.toggle('off', no); } }); }
    body.onchange = setGate;
    $('#psClr').onclick = function () { $$('input[type=radio]', body).forEach(function (r) { r.checked = false; }); setGate(); $('#psOut').innerHTML = ''; };
    $('#psCalc').onclick = function () {
      var ans = [], miss = 0, out = $('#psOut'), no = gate && ($('input[name=q0]:checked', body) || {}).value === '0';
      s.items.forEach(function (_, i) { var r = $('input[name=q' + i + ']:checked', body); if (r) ans.push(parseInt(r.value, 10)); else if (no && i > 0) ans.push(0); else { ans.push(null); miss++; } });
      if (miss) { out.innerHTML = '<p class="hp-fb bad">' + bn(miss) + 'টি প্রশ্নের উত্তর বাকি।</p>'; return; }
      var r = M.scoreScale(id, ans); if (r.err) { out.innerHTML = '<p class="hp-fb bad">উত্তর পড়া যায়নি, আবার চেষ্টা করুন।</p>'; return; }
      var f = K.award('ps_scale_' + id, 0, 20); PS.scale[id] = 1; K.save(); var got = C.done(f.st);
      out.innerHTML = '<div class="ps-res ' + r.band.cls + '"><div class="ps-score">' + (r.na ? '—' : bn(r.total) + '<small>/' + bn(r.max) + '</small>') + '</div><div><b>' + esc(r.band.label) + '</b><p>' + esc(r.band.advice) + '</p></div></div>' +
        r.flags.map(function (x) { return '<p class="ps-flag">⚠️ ' + esc(x) + '</p>'; }).join('') + '<p class="hp-mut">' + esc(M.SCALE_NOTE) + '</p>' + (f.first ? '<p><b>+' + bn(f.xp) + ' XP</b></p>' : '') + gotHtml(got);
    };
  }
  function scalePractice(box) {
    box.innerHTML = '<div class="hp-card"><h4>🎯 স্কোরিং অনুশীলন</h4><p class="hp-mut">এলোমেলো উত্তর-সেট থেকে PHQ-9, GAD-7 ও AUDIT-এর মোট স্কোর ও মাত্রা মিলান, সাথে ব্যাখ্যার প্রশ্ন। ভুল ছাড়া শেষ করলে ব্যাজ।</p><button type="button" class="hp-btn pri" id="psGo">▶ শুরু (৬ প্রশ্ন)</button></div>';
    $('#psGo').onclick = function go() { seqQuiz({ title: '🎯 স্কোরিং অনুশীলন', intro: 'কাগজে যোগ করুন, তারপর বাছুন।', qs: M.scaleQuizSet(Math.floor(Math.random() * 100000) + 1), id: 'ps_sq', xp: 60, backLabel: 'অনুশীলন', back: viewScale, again: go, after: function (m) { if (m === 0) PS.sq++; } }); };
  }
  function scaleRef(box) {
    box.innerHTML = Object.keys(M.SCALES).map(function (id) {
      var s = M.SCALES[id];
      return '<div class="hp-card"><h4>' + s.ic + ' ' + esc(s.n) + ' <span class="hp-mut">· ইতিবাচক স্ক্রিন: ≥ ' + bn(s.cut) + '</span></h4><div class="em-tbwrap"><table class="em-tb"><thead><tr><th>স্কোর</th><th>মাত্রা</th><th>করণীয়</th></tr></thead><tbody>' + s.bands.map(function (b, i) { return '<tr><td>' + rangeText(s, i) + '</td><td><b>' + esc(b[1]) + '</b></td><td>' + esc(b[3]) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
    }).join('') + '<p class="hp-mut em-note">' + esc(M.SCALE_NOTE) + '</p>';
  }

  /* =====================================================================
     ৩) ডায়াগনস্টিক কেস
     ===================================================================== */
  function viewDx() { shell('dx', 'ডায়াগনস্টিক কেস', [['learn', '📖 এক নজরে'], ['cases', '🩺 কেস']], { learn: dxLearn, cases: dxCases }); }
  function dxLearn(box) {
    box.innerHTML = '<div class="hp-card"><h4>📖 আটটি ব্যাধি: মূল লক্ষণ, সময়, প্রথম সারির চিকিৎসা</h4><p class="hp-mut">DSM-5-TR ধাঁচের সরলীকৃত সারাংশ; পূর্ণ মানদণ্ড ও ICD-11 মূল সূত্রে দেখুন।</p></div>' +
      M.DX_TABLE.map(function (r) { return '<div class="hp-card ps-dx"><b>' + esc(r[0]) + '</b><p><i>মূল লক্ষণ:</i> ' + esc(r[1]) + '</p><p><i>সময়/মানদণ্ড:</i> ' + esc(r[2]) + '</p><p><i>চিকিৎসা:</i> ' + esc(r[3]) + '</p></div>'; }).join('');
  }
  function dxCases(box) {
    box.innerHTML = '<div class="hp-card hp-intro"><div><h3>🩺 ডায়াগনস্টিক কেস</h3><p class="hp-mut">প্রতিটি কেসে: নির্ণয়, মানদণ্ড, বাদ দেওয়ার কারণ ও চিকিৎসা-পরিকল্পনা। সম্পন্ন: <b>' + bn(cnt(PS.dx)) + '/' + bn(M.N.dx) + '</b></p></div></div><div class="hp-grid">' + M.DX_CASES.map(function (c) { return caseCard(c, 'dx', PS.dx); }).join('') + '</div>';
    wireCases(box, { dx: { cases: M.DX_CASES, run: function (c) { runCase({ bucket: 'dx', c: c, xp: 80, backLabel: 'ডায়াগনস্টিক কেস', back: viewDx }); } } });
  }

  /* =====================================================================
     ৪) মানসিক জরুরি অবস্থা
     ===================================================================== */
  function viewEmg() { shell('emg', 'মানসিক জরুরি অবস্থা', [['learn', '📖 শিখুন'], ['cases', '🛟 কেস'], ['quiz', '🧠 কুইজ']], { learn: emgLearn, cases: emgCases, quiz: emgQuiz }); }
  function emgLearn(box) {
    var E = M.EMG;
    box.innerHTML = '<div class="hp-card"><h4>🛟 আত্মহত্যার ঝুঁকি-মূল্যায়ন</h4>' + list(E.ASK) + '</div>' +
      '<div class="hp-card"><h4>📶 ঝুঁকির স্তর ও করণীয় (সাধারণ কাঠামো)</h4>' + E.RISK.map(function (r) { return '<div class="ps-dx"><b>' + esc(r[0]) + '</b><p><i>লক্ষণ:</i> ' + esc(r[1]) + '</p><p><i>করণীয়:</i> ' + esc(r[2]) + '</p></div>'; }).join('') + '</div>' +
      '<div class="em-two"><div class="hp-card"><h4>⚠️ ঝুঁকি-কারণ</h4>' + list(E.RISKF) + '</div><div class="hp-card"><h4>🛡️ সুরক্ষা-কারণ</h4>' + list(E.PROT) + '</div></div>' +
      '<div class="hp-card"><h4>😡 উত্তেজিত রোগী: ধাপে ধাপে</h4>' + list(E.AGIT, true) + '</div>' +
      '<div class="hp-card"><h4>🌙 ডিলিরিয়াম বনাম প্রাথমিক সাইকোসিস</h4><div class="em-tbwrap"><table class="em-tb"><thead><tr><th></th><th>ডিলিরিয়াম</th><th>প্রাথমিক সাইকোসিস</th></tr></thead><tbody>' + E.DELIR.map(function (r) { return '<tr><td><b>' + esc(r[0]) + '</b></td><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>'; }).join('') + '</tbody></table></div></div>' +
      '<p class="hp-mut em-note">আইন ও ভর্তির নিয়ম (সম্মতি, অনিচ্ছুক ভর্তি, গোপনীয়তার সীমা) দেশ ও প্রতিষ্ঠানভেদে ভিন্ন; স্থানীয় আইন ও তত্ত্বাবধায়ক মানুন।</p>';
  }
  function emgCases(box) {
    box.innerHTML = '<div class="hp-card hp-intro"><div><h3>🛟 জরুরি কেস</h3><p class="hp-mut">দ্রুত সিদ্ধান্ত: ঝুঁকির স্তর, প্রথম পদক্ষেপ, ভুল পথ। সম্পন্ন: <b>' + bn(cnt(PS.emg)) + '/' + bn(M.N.emg) + '</b></p></div></div><div class="hp-grid">' + M.EMG_CASES.map(function (c) { return caseCard(c, 'emg', PS.emg); }).join('') + '</div>';
    wireCases(box, { emg: { cases: M.EMG_CASES, run: function (c) { runCase({ bucket: 'emg', c: c, xp: 90, backLabel: 'জরুরি কেস', back: viewEmg }); } } });
  }
  function emgQuiz(box) {
    box.innerHTML = '<div class="hp-card"><h4>🧠 জরুরি অবস্থার কুইজ</h4><p class="hp-mut">৮টি প্রশ্নের ভাণ্ডার থেকে এলোমেলো ৬টি।</p><button type="button" class="hp-btn pri" id="psGo">▶ শুরু</button></div>';
    $('#psGo').onclick = function go() { seqQuiz({ title: '🧠 জরুরি অবস্থার কুইজ', qs: shuffle(M.EMG_QUIZ).slice(0, 6), id: 'ps_emq', xp: 40, backLabel: 'কুইজ', back: viewEmg, again: go, after: function (m) { if (m === 0) PS.emq++; } }); };
  }

  K.addTab('psy', '🧠 সাইকোলজি', home);
  window.GEBPsych = { home: home };
})();
