/* GEB Hub: আমার প্ল্যানার (v3.2)
   ক্লাস রুটিন + উপস্থিতি ট্র্যাকার + পরীক্ষার কাউন্টডাউন + স্কিল ট্র্যাকার + CV বিল্ডার।
   কোনো সার্ভার বা API লাগে না। সব তথ্য ডিফল্টে এই ব্রাউজারের localStorage-এ (key: geb_planner_v1) সেভ হয়; সদস্য চাইলে sync.js দিয়ে অ্যাকাউন্টে সিঙ্ক করতে পারেন।
   ব্রাউজারের ডেটা মুছলে হারাবে, তাই "ব্যাকআপ" বাটন দিয়ে মাঝে মাঝে ফাইল নামিয়ে রাখুন।
   স্কিলের তালিকা বদলাতে নিচের SKILLS, পরীক্ষার ধরন বদলাতে EXAM_TYPES এডিট করুন। */
(function () {
  'use strict';
  var KEY = 'geb_planner_v1';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var bn = function (n) { return String(n).replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'[d]; }); };
  var mount = $('#plMount'), strip = $('#todayStrip');
  if (!mount && !strip) return;

  /* ---------- তারিখ-সময় হেল্পার ---------- */
  var WDF = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
  var MN = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
  var iso = function (d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); };
  var fromIso = function (s) { var a = s.split('-'); return new Date(+a[0], +a[1] - 1, +a[2]); };
  var todayIso = function () { return iso(new Date()); };
  var addDays = function (s, n) { var d = fromIso(s); d.setDate(d.getDate() + n); return iso(d); };
  var dayDiff = function (a, b) { return Math.round((fromIso(b) - fromIso(a)) / 86400000); };
  var t12 = function (t) { var a = String(t).split(':'), h = +a[0]; return bn((h % 12 || 12) + ':' + a[1]); };
  var dateBn = function (s) { var d = fromIso(s); return WDF[d.getDay()] + ', ' + bn(d.getDate()) + ' ' + MN[d.getMonth()] + ' ' + bn(d.getFullYear()); };
  var dateShort = function (s) { var d = fromIso(s); return bn(d.getDate()) + ' ' + MN[d.getMonth()]; };
  var nowMin = function () { var d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  var toMin = function (t) { var a = t.split(':'); return +a[0] * 60 + +a[1]; };

  /* ---------- ডেটা ---------- */
  var PALETTE = ['#0B8F73', '#B7791F', '#D6336C', '#3B6FD4', '#7A4FD1', '#C2571A', '#2A8FA8', '#6B8E23', '#A0356B', '#4C5B6B'];
  var EXAM_TYPES = ['ক্লাস টেস্ট (CT)', 'মিডটার্ম', 'ফাইনাল', 'ল্যাব টেস্ট', 'ভাইভা', 'অ্যাসাইনমেন্ট জমা'];
  var SKILLS = [
    { g: 'Laboratory skills', n: 'ল্যাব টেকনিক', i: ['Micropipetting and solution preparation', 'Aseptic (sterile) technique', 'Bacterial culture and Gram staining', 'DNA extraction', 'PCR', 'Agarose gel electrophoresis', 'Restriction digestion', 'Cloning and transformation', 'SDS-PAGE', 'Western blot', 'ELISA', 'Plant tissue culture', 'Animal cell culture', 'Spectrophotometry'] },
    { g: 'Computational skills', n: 'কম্পিউটেশনাল', i: ['Python', 'R', 'NCBI / GenBank search', 'BLAST', 'Multiple sequence alignment', 'Phylogenetic analysis (MEGA)', 'Protein structure viewing (PyMOL)', 'Primer design', 'Excel data analysis', 'Biostatistics (SPSS / GraphPad)'] },
    { g: 'Professional skills', n: 'পেশাগত দক্ষতা', i: ['Scientific writing', 'Literature review', 'Oral presentation', 'Teamwork and leadership', 'English communication', 'MS Word / LaTeX', 'Reference management (Zotero / Mendeley)'] }
  ];
  var LV = ['এখনো না', 'শিখছি', 'পারি', 'ভালো পারি'];
  var SAMPLE_C = [['GEB 1121', 'Intro to Genetic Engineering and Biotechnology'], ['ANS 1123', 'Introduction to Animal Sciences'], ['PLS 1125', 'Basic Plant Science and Physiology'], ['MCB 1127', 'Basic Microbiology'], ['CHE 101J', 'General Chemistry'], ['MCB 1128', 'Basic Microbiology Lab']];
  var SAMPLE_S = [[0, '09:00', '09:50', 0], [0, '10:00', '10:50', 1], [1, '09:00', '09:50', 2], [1, '10:00', '10:50', 3], [1, '11:00', '11:50', 4], [2, '09:00', '09:50', 0], [2, '14:00', '16:50', 5], [3, '09:00', '09:50', 1], [3, '10:00', '10:50', 2], [4, '09:00', '09:50', 3], [4, '10:00', '10:50', 4]];

  function blank() { return { courses: [], slots: [], att: {}, exams: [], skills: {}, custom: [], cv: {}, target: 75, sample: false, nid: 1 }; }
  function load() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY));
      if (v && typeof v === 'object') { var b = blank(); for (var k in b) if (!(k in v)) v[k] = b[k]; return v; }
    } catch (e) { }
    return blank();
  }
  var S = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('সেভ করা যায়নি, ব্রাউজারের জায়গা ভরে গেছে'); } }
  function nid() { return 'x' + (S.nid++).toString(36); }
  function toast(m) { var t = $('#toast'); if (!t) return; t.textContent = m; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(function () { t.classList.remove('on'); }, 2000); }
  var cById = function (id) { return S.courses.filter(function (c) { return c.id === id; })[0]; };
  var sortSlots = function (a) { return a.slice().sort(function (x, y) { return x.s < y.s ? -1 : x.s > y.s ? 1 : 0; }); };

  var tab = 'today', selDate = todayIso(), CUR = [], cvTimer = null;

  /* ছুটি: একাডেমিক ক্যালেন্ডার (campus.js) + শুক্র/শনি */
  function holidayOn(d) {
    var ev = (window.GEBCal && window.GEBCal.evOn) ? window.GEBCal.evOn(d) : [];
    if (ev.length) return ev[0].t;
    var w = fromIso(d).getDay(); return (w === 5 || w === 6) ? 'সাপ্তাহিক ছুটি' : '';
  }

  /* ---------- উপস্থিতির হিসাব ---------- */
  function stats(cid) {
    var p = 0, a = 0, x = 0;
    for (var k in S.att) { var r = S.att[k]; if (r.c !== cid) continue; if (r.r === 'p') p++; else if (r.r === 'a') a++; else x++; }
    return { p: p, a: a, x: x, t: p + a };
  }
  function advice(st) {
    var T = S.target / 100, t = st.t;
    if (!t) return { cls: '', pct: null, txt: 'এখনো কোনো ক্লাস মার্ক করা হয়নি' };
    var pct = st.p / t * 100;
    if (pct >= S.target) {
      var m = Math.floor(st.p / T - t + 1e-9);
      return { cls: m > 1 ? 'ok' : 'warn', pct: pct, txt: m > 0 ? 'আর ' + bn(m) + 'টা ক্লাস মিস করা যাবে' : 'আর একটাও ক্লাস মিস করা যাবে না' };
    }
    var n = Math.ceil((T * t - st.p) / (1 - T) - 1e-9);
    return { cls: 'bad', pct: pct, txt: 'পরপর ' + bn(n) + 'টা ক্লাস করলে ' + bn(S.target) + '% হবে' };
  }
  var pctTxt = function (p) { return bn(Math.round(p)) + '%'; };

  /* ---------- পরীক্ষার কাউন্টডাউন ---------- */
  function cd(d) {
    var n = dayDiff(todayIso(), d);
    if (n === 0) return { t: 'আজ', c: 'now', n: n };
    if (n === 1) return { t: 'আগামীকাল', c: 'soon', n: n };
    if (n < 0) return { t: bn(-n) + ' দিন আগে হয়েছে', c: 'past', n: n };
    return { t: 'আর ' + bn(n) + ' দিন', c: n <= 7 ? 'soon' : '', n: n };
  }
  function nextExam() {
    var t = todayIso();
    return S.exams.filter(function (e) { return e.d >= t; }).sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : 0; })[0];
  }
  function gcalLink(e) {
    var c = cById(e.c), title = e.t + (c ? ' — ' + c.name : '');
    var base = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title);
    var d0 = e.d.replace(/-/g, '');
    if (e.tm) {
      var a = fromIso(e.d), h = +e.tm.slice(0, 2), m = +e.tm.slice(3, 5);
      var s = new Date(a.getFullYear(), a.getMonth(), a.getDate(), h, m), f = new Date(s.getTime() + 3600000);
      var fmt = function (x) { return x.getFullYear() + p2(x.getMonth() + 1) + p2(x.getDate()) + 'T' + p2(x.getHours()) + p2(x.getMinutes()) + '00'; };
      return base + '&dates=' + fmt(s) + '/' + fmt(f);
    }
    return base + '&dates=' + d0 + '/' + addDays(e.d, 1).replace(/-/g, '');
  }

  /* =====================================================
     হোম পেজের "আজ" স্ট্রিপ
     ===================================================== */
  function renderStrip() {
    if (!strip) return;
    var d = todayIso(), dow = fromIso(d).getDay(), hol = holidayOn(d);
    var slots = sortSlots(S.slots.filter(function (s) { return s.d === dow; }));
    var line;
    if (!S.slots.length) {
      line = '<b>ক্লাস রুটিন যোগ করুন</b><span>আজ কোন ক্লাস, কখন, সেটা এখানেই দেখাবে।</span>';
    } else if (hol && !slots.length) {
      line = '<b>আজ ছুটি</b><span>' + esc(hol) + '</span>';
    } else if (!slots.length) {
      line = '<b>আজ কোনো ক্লাস নেই</b><span>রুটিনে আজকের জন্য কিছু যোগ করা নেই।</span>';
    } else {
      var nm = nowMin(), cur = null, nxt = null;
      slots.forEach(function (s) { if (toMin(s.s) <= nm && nm < toMin(s.e)) cur = s; else if (toMin(s.s) > nm && !nxt) nxt = s; });
      var nm2 = function (s) { var c = cById(s.c); return c ? c.name : 'ক্লাস'; };
      if (cur) line = '<b>এখন চলছে: ' + esc(nm2(cur)) + '</b><span>' + t12(cur.s) + ' থেকে ' + t12(cur.e) + (cur.room ? ', রুম ' + esc(cur.room) : '') + (nxt ? ' · পরে ' + esc(nm2(nxt)) + ' ' + t12(nxt.s) + ' টায়' : '') + '</span>';
      else if (nxt) line = '<b>পরের ক্লাস: ' + esc(nm2(nxt)) + '</b><span>' + t12(nxt.s) + ' টায়' + (nxt.room ? ', রুম ' + esc(nxt.room) : '') + ' · আজ মোট ' + bn(slots.length) + 'টা ক্লাস</span>';
      else line = '<b>আজকের ক্লাস শেষ</b><span>আজ মোট ' + bn(slots.length) + 'টা ক্লাস ছিল।</span>';
    }
    var ex = nextExam(), exh;
    if (ex) { var c = cd(ex.d), cc = cById(ex.c); exh = '<b class="' + c.c + '">' + esc(ex.t) + ': ' + c.t + '</b><span>' + (cc ? esc(cc.name) + ', ' : '') + dateShort(ex.d) + '</span>'; }
    else exh = '<b>কোনো পরীক্ষা যোগ করা নেই</b><span>CT বা ফাইনালের তারিখ দিলে কাউন্টডাউন চলবে।</span>';
    var low = S.courses.filter(function (c) { var a = advice(stats(c.id)); return a.cls === 'bad'; }).length;
    strip.innerHTML = '<div class="wrap"><div class="pl-strip">' +
      '<div class="pl-s1"><small>আজ, ' + esc(dateBn(d)) + '</small><div class="pl-sl">' + line + '</div></div>' +
      '<div class="pl-s2"><small>পরের পরীক্ষা</small><div class="pl-sl">' + exh + '</div></div>' +
      (low ? '<div class="pl-s3"><a class="chip sig" href="#planner" data-go="att">' + bn(low) + 'টা কোর্সে উপস্থিতি ' + bn(S.target) + '%-এর নিচে</a></div>' : '') +
      '<a class="btn ink sm" href="#planner" data-go="today">প্ল্যানার খুলুন</a></div></div>';
  }

  /* =====================================================
     ট্যাব ১: আজ
     ===================================================== */
  function viewToday() {
    var d = selDate, dow = fromIso(d).getDay(), hol = holidayOn(d), isT = d === todayIso();
    var slots = sortSlots(S.slots.filter(function (s) { return s.d === dow; }));
    var h = '<div class="pl-card"><div class="pl-dn">' +
      '<button type="button" class="pl-ar" data-act="day" data-n="-1" aria-label="আগের দিন">‹</button>' +
      '<div><h3>' + esc(dateBn(d)) + '</h3><small>' + (isT ? 'আজ' : '<button type="button" class="pl-lk" data-act="day" data-n="0">আজকে ফিরুন</button>') + '</small></div>' +
      '<button type="button" class="pl-ar" data-act="day" data-n="1" aria-label="পরের দিন">›</button></div>';
    if (hol) h += '<div class="pl-ban">ছুটি: ' + esc(hol) + '</div>';
    if (!S.slots.length) {
      h += empty('এখনো কোনো রুটিন নেই', 'রুটিন ট্যাবে কোর্স আর ক্লাসের সময় যোগ করুন, অথবা নমুনা দিয়ে শুরু করে দেখুন।', '<button type="button" class="btn ink sm" data-act="tab" data-t="routine">রুটিন যোগ করুন</button> <button type="button" class="btn ghost sm" data-act="sample">নমুনা রুটিন দিয়ে দেখুন</button>');
    } else if (!slots.length) {
      h += '<p class="pl-mut">' + (hol ? 'এই দিনে কোনো ক্লাস নেই।' : 'রুটিনে এই দিনের জন্য কোনো ক্লাস যোগ করা নেই।') + '</p>';
    } else {
      h += '<div class="pl-list">' + slots.map(function (s) {
        var c = cById(s.c) || { name: 'মোছা কোর্স', color: '#4C5B6B' }, r = S.att[d + '|' + s.id], v = r ? r.r : '';
        var btn = function (k, lb) { return '<button type="button" class="pl-b ' + k + '" data-act="mark" data-sid="' + s.id + '" data-v="' + k + '" aria-pressed="' + (v === k) + '">' + lb + '</button>'; };
        return '<div class="pl-row" style="--c:' + esc(c.color) + '"><div class="pl-t">' + t12(s.s) + '<small>' + t12(s.e) + '</small></div>' +
          '<div class="pl-n"><b>' + esc(c.name) + '</b><small>' + (c.code ? esc(c.code) : '') + (s.room ? (c.code ? ' · ' : '') + 'রুম ' + esc(s.room) : '') + '</small></div>' +
          '<div class="pl-mk" role="group" aria-label="উপস্থিতি">' + btn('p', 'ছিলাম') + btn('a', 'ছিলাম না') + btn('x', 'বাতিল') + '</div></div>';
      }).join('') + '</div><div class="pl-foot"><button type="button" class="btn ghost sm" data-act="allp">সবগুলোতে "ছিলাম" দিন</button></div>';
    }
    h += '</div>';
    var ex = nextExam();
    var low = S.courses.map(function (c) { return { c: c, a: advice(stats(c.id)) }; }).filter(function (x) { return x.a.cls === 'bad' || x.a.cls === 'warn'; });
    h += '<div class="pl-two">';
    h += '<div class="pl-card"><h3>পরের পরীক্ষা</h3>' + (ex ? examRow(ex, true) : '<p class="pl-mut">কোনো পরীক্ষা যোগ করা নেই। <button type="button" class="pl-lk" data-act="tab" data-t="exam">পরীক্ষা যোগ করুন</button></p>') + '</div>';
    h += '<div class="pl-card"><h3>উপস্থিতির সতর্কতা</h3>' + (low.length ? low.map(function (x) {
      return '<div class="pl-al ' + x.a.cls + '"><b>' + esc(x.c.name) + '</b><span>' + pctTxt(x.a.pct) + ' · ' + x.a.txt + '</span></div>';
    }).join('') : '<p class="pl-mut">' + (S.courses.length ? 'কোনো কোর্সে সমস্যা নেই। এভাবেই চালিয়ে যান।' : 'কোর্স যোগ করলে এখানে সতর্কতা আসবে।') + '</p>') + '</div>';
    h += '</div>';
    return h;
  }
  function empty(t, p, a) { return '<div class="pl-empty"><b>' + t + '</b><p>' + p + '</p><div>' + a + '</div></div>'; }

  /* =====================================================
     ট্যাব ২: রুটিন
     ===================================================== */
  function viewRoutine() {
    var h = '';
    if (S.sample) h += '<div class="pl-ban">এটা নমুনা রুটিন। নিজেরটা বসাতে নিচে কোর্স ও ক্লাস বদলে নিন বা <button type="button" class="pl-lk" data-act="clearall">সব মুছে শুরু করুন</button>।</div>';
    h += '<div class="pl-card"><h3>কোর্স</h3>';
    h += S.courses.length ? '<div class="pl-chips">' + S.courses.map(function (c) {
      return '<span class="pl-cc" style="--c:' + esc(c.color) + '">' + (c.code ? '<em>' + esc(c.code) + '</em> ' : '') + esc(c.name) + '<button type="button" data-act="delc" data-id="' + c.id + '" aria-label="' + esc(c.name) + ' মুছুন">×</button></span>';
    }).join('') + '</div>' : '<p class="pl-mut">কোনো কোর্স নেই। নিচের যেকোনো একটা উপায়ে যোগ করুন।</p>';
    h += '<div class="pl-2c">';
    if (CUR.length) h += '<form class="pl-form" data-form="import"><label>সেমিস্টার থেকে সব কোর্স আনুন<select class="pl-in" name="sem">' + CUR.map(function (c, i) { return '<option value="' + i + '">' + esc(c.name) + '</option>'; }).join('') + '</select></label><button class="btn ink sm" type="submit">কোর্স আনুন</button></form>';
    h += '<form class="pl-form" data-form="addc"><label>কোর্স কোড<input class="pl-in" name="code" placeholder="যেমন GEB 1121" maxlength="20"></label><label>কোর্সের নাম<input class="pl-in" name="name" required maxlength="80" placeholder="যেমন Basic Microbiology"></label><button class="btn ghost sm" type="submit">নিজে যোগ করুন</button></form>';
    h += '</div></div>';

    h += '<div class="pl-card"><h3>সাপ্তাহিক ক্লাস</h3>';
    if (!S.courses.length) h += '<p class="pl-mut">আগে কোর্স যোগ করুন, তারপর ক্লাসের সময় বসান।</p>';
    else {
      h += '<form class="pl-form" data-form="adds"><label>বার<select class="pl-in" name="d">' + [0, 1, 2, 3, 4, 6, 5].map(function (i) { return '<option value="' + i + '">' + WDF[i] + '</option>'; }).join('') + '</select></label>' +
        '<label>কোর্স<select class="pl-in" name="c">' + S.courses.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('') + '</select></label>' +
        '<label>শুরু<input class="pl-in" type="time" name="s" value="09:00" required></label><label>শেষ<input class="pl-in" type="time" name="e" value="09:50" required></label>' +
        '<label>রুম<input class="pl-in" name="room" maxlength="12" placeholder="ঐচ্ছিক"></label><button class="btn ink sm" type="submit">ক্লাস যোগ করুন</button></form>';
    }
    var days = [0, 1, 2, 3, 4].concat([5, 6].filter(function (d) { return S.slots.some(function (s) { return s.d === d; }); }));
    h += '<div class="pl-week">' + days.map(function (d) {
      var sl = sortSlots(S.slots.filter(function (s) { return s.d === d; }));
      return '<div class="pl-day"><h4>' + WDF[d] + '</h4>' + (sl.length ? sl.map(function (s) {
        var c = cById(s.c) || { name: 'মোছা কোর্স', color: '#4C5B6B' };
        return '<div class="pl-sl2" style="--c:' + esc(c.color) + '"><span><b>' + t12(s.s) + '–' + t12(s.e) + '</b> ' + esc(c.name) + (s.room ? ' <small>(' + esc(s.room) + ')</small>' : '') + '</span><button type="button" data-act="dels" data-id="' + s.id + '" aria-label="ক্লাসটি মুছুন">×</button></div>';
      }).join('') : '<p class="pl-mut sm">ক্লাস নেই</p>') + '</div>';
    }).join('') + '</div></div>';
    return h;
  }

  /* =====================================================
     ট্যাব ৩: উপস্থিতি
     ===================================================== */
  function viewAtt() {
    var h = '<div class="pl-card"><div class="pl-hd"><div><h3>কোর্স অনুযায়ী উপস্থিতি</h3><p class="pl-mut">"আজ" ট্যাবে ক্লাসের পর বাটন চাপলে এখানে হিসাব আপডেট হয়। বাতিল ক্লাস হিসাবে ধরা হয় না।</p></div>' +
      '<label class="pl-tg">ন্যূনতম উপস্থিতি<select class="pl-in" data-act="target">' + [60, 70, 75, 80, 85].map(function (n) { return '<option value="' + n + '"' + (n === S.target ? ' selected' : '') + '>' + bn(n) + '%</option>'; }).join('') + '</select></label></div>';
    if (!S.courses.length) return h + empty('কোনো কোর্স নেই', 'রুটিন ট্যাবে কোর্স যোগ করলে এখানে প্রতিটার হিসাব দেখা যাবে।', '<button type="button" class="btn ink sm" data-act="tab" data-t="routine">কোর্স যোগ করুন</button>') + '</div>';
    h += '<div class="pl-att">' + S.courses.map(function (c) {
      var st = stats(c.id), a = advice(st), w = a.pct == null ? 0 : a.pct;
      return '<div class="pl-ac ' + a.cls + '" style="--c:' + esc(c.color) + '"><div class="pl-ah"><b>' + esc(c.name) + '</b><span class="pl-pc">' + (a.pct == null ? '–' : pctTxt(a.pct)) + '</span></div>' +
        '<div class="pl-bar" role="img" aria-label="উপস্থিতি ' + (a.pct == null ? 'নেই' : pctTxt(a.pct)) + ', লক্ষ্য ' + bn(S.target) + '%"><i style="width:' + w + '%"></i><b style="left:' + S.target + '%"></b></div>' +
        '<p class="pl-av">' + esc(a.txt) + '</p><small>ছিলাম ' + bn(st.p) + ' · ছিলাম না ' + bn(st.a) + ' · বাতিল ' + bn(st.x) + '</small></div>';
    }).join('') + '</div></div>';
    return h;
  }

  /* =====================================================
     ট্যাব ৪: পরীক্ষা
     ===================================================== */
  function examRow(e, bare) {
    var c = cd(e.d), cc = cById(e.c);
    return '<div class="pl-ex ' + c.c + '"' + (cc ? ' style="--c:' + esc(cc.color) + '"' : '') + '><div class="pl-cdn"><b>' + (c.n >= 0 ? (c.n === 0 ? 'আজ' : c.n === 1 ? 'কাল' : bn(c.n)) : '–') + '</b><small>' + (c.n > 1 ? 'দিন বাকি' : c.n < 0 ? 'শেষ' : '') + '</small></div>' +
      '<div class="pl-n"><b>' + esc(e.t) + '</b><small>' + (cc ? esc(cc.name) + ' · ' : '') + esc(dateBn(e.d)) + (e.tm ? ', ' + t12(e.tm) : '') + '</small></div>' +
      (bare ? '' : '<div class="pl-ea"><a class="pl-lk" href="' + esc(gcalLink(e)) + '" target="_blank" rel="noopener">Google Calendar-এ যোগ করুন</a><button type="button" class="pl-x" data-act="dele" data-id="' + e.id + '" aria-label="পরীক্ষাটি মুছুন">×</button></div>') + '</div>';
  }
  function viewExam() {
    var h = '<div class="pl-card"><h3>পরীক্ষা যোগ করুন</h3><form class="pl-form" data-form="adde">' +
      '<label>ধরন<select class="pl-in" name="t">' + EXAM_TYPES.map(function (t) { return '<option>' + esc(t) + '</option>'; }).join('') + '</select></label>' +
      '<label>কোর্স<select class="pl-in" name="c"><option value="">কোর্স বাছুন (ঐচ্ছিক)</option>' + S.courses.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('') + '</select></label>' +
      '<label>তারিখ<input class="pl-in" type="date" name="d" required value="' + todayIso() + '"></label>' +
      '<label>সময়<input class="pl-in" type="time" name="tm"></label><button class="btn ink sm" type="submit">পরীক্ষা যোগ করুন</button></form></div>';
    var up = S.exams.filter(function (e) { return e.d >= todayIso(); }).sort(function (a, b) { return a.d < b.d ? -1 : 1; });
    var past = S.exams.filter(function (e) { return e.d < todayIso(); }).sort(function (a, b) { return a.d < b.d ? 1 : -1; });
    h += '<div class="pl-card"><h3>আসছে</h3>' + (up.length ? '<div class="pl-list">' + up.map(function (e) { return examRow(e); }).join('') + '</div>' : '<p class="pl-mut">কোনো পরীক্ষা আসছে না। তারিখ জানলে ওপরের ফর্ম থেকে যোগ করুন।</p>') + '</div>';
    if (past.length) h += '<div class="pl-card"><h3>হয়ে গেছে</h3><div class="pl-list">' + past.map(function (e) { return examRow(e); }).join('') + '</div></div>';
    return h;
  }

  /* =====================================================
     ট্যাব ৫: স্কিল
     ===================================================== */
  function skillBtn(name) {
    var l = S.skills[name] || 0;
    return '<button type="button" class="pl-sb" data-act="skill" data-k="' + esc(name) + '" data-l="' + l + '" aria-label="' + esc(name) + ': ' + LV[l] + '. চাপলে স্তর বদলাবে"><span>' + esc(name) + '</span><i aria-hidden="true">' + [1, 2, 3].map(function (n) { return '<u' + (l >= n ? ' class="on"' : '') + '></u>'; }).join('') + '</i><small>' + LV[l] + '</small></button>';
  }
  function viewSkill() {
    var h = '<div class="pl-card"><div class="pl-hd"><div><h3>আমার স্কিল</h3><p class="pl-mut">প্রতিটা স্কিলে চাপ দিলে স্তর বদলায়: এখনো না → শিখছি → পারি → ভালো পারি। "পারি" আর "ভালো পারি" স্কিলগুলোই CV-তে যাবে।</p></div></div>';
    var groups = SKILLS.concat(S.custom.length ? [{ g: 'Other skills', n: 'আমার যোগ করা', i: S.custom.map(function (c) { return c.name; }) }] : []);
    groups.forEach(function (g) {
      var got = g.i.filter(function (n) { return (S.skills[n] || 0) >= 2; }).length;
      h += '<h4 class="pl-gh">' + esc(g.n) + ' <small>' + bn(got) + '/' + bn(g.i.length) + ' পারি</small></h4><div class="pl-sg">' + g.i.map(skillBtn).join('') + '</div>';
    });
    h += '<form class="pl-form" data-form="addk"><label>নতুন স্কিল (ইংরেজিতে লিখলে CV-তে ভালো দেখায়)<input class="pl-in" name="name" required maxlength="60" placeholder="যেমন Flow cytometry"></label><button class="btn ghost sm" type="submit">স্কিল যোগ করুন</button></form></div>';
    return h;
  }

  /* =====================================================
     ট্যাব ৬: CV
     ===================================================== */
  var CVF = [
    ['name', 'পুরো নাম (ইংরেজিতে)', 'in', 'Your Full Name'], ['email', 'ইমেইল', 'in', 'name@example.com'], ['phone', 'ফোন', 'in', '+880 1X XXXX XXXX'],
    ['addr', 'ঠিকানা / শহর', 'in', 'Sylhet, Bangladesh'], ['link', 'LinkedIn / ওয়েবসাইট (ঐচ্ছিক)', 'in', 'linkedin.com/in/…'],
    ['obj', 'সংক্ষিপ্ত পরিচিতি (২-৩ লাইন)', 'ta', 'Undergraduate student of Genetic Engineering and Biotechnology with hands-on training in …'],
    ['edu', 'শিক্ষা (প্রতি লাইনে একটা)', 'ta', 'B.Sc. in Genetic Engineering and Biotechnology, SUST, 2025–2029 (CGPA 3.xx)\nHSC, Your College, 2024 (GPA 5.00)'],
    ['exp', 'অভিজ্ঞতা / ইন্টার্নশিপ (প্রতি লাইনে একটা)', 'ta', ''], ['proj', 'প্রজেক্ট / গবেষণা (প্রতি লাইনে একটা)', 'ta', ''],
    ['ach', 'অর্জন, পুরস্কার, কার্যক্রম (প্রতি লাইনে একটা)', 'ta', ''], ['ref', 'রেফারেন্স (ঐচ্ছিক)', 'ta', '']
  ];
  var lines = function (t) { return String(t || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean); };
  function cvSkills() {
    var out = [];
    SKILLS.forEach(function (g) { var l = g.i.filter(function (n) { return (S.skills[n] || 0) >= 2; }); if (l.length) out.push({ g: g.g, l: l }); });
    var o = S.custom.filter(function (c) { return (S.skills[c.name] || 0) >= 2; }).map(function (c) { return c.name; });
    if (o.length) out.push({ g: 'Other skills', l: o });
    return out;
  }
  function cvHtml() {
    var c = S.cv || {}, ul = function (t) { var l = lines(t); return l.length ? '<ul>' + l.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : ''; };
    var sec = function (title, body) { return body ? '<h2>' + title + '</h2>' + body : ''; };
    var ct = [c.email, c.phone, c.addr, c.link].filter(Boolean).map(esc).join('<span class="sep"> | </span>');
    var sk = cvSkills().map(function (g) { return '<p><b>' + g.g + ':</b> ' + g.l.map(esc).join(', ') + '</p>'; }).join('');
    var body = '<h1>' + esc(c.name || 'Your Name') + '</h1>' + (ct ? '<p class="cv-ct">' + ct + '</p>' : '') +
      sec('Profile', c.obj ? '<p>' + esc(c.obj).replace(/\n/g, '<br>') + '</p>' : '') + sec('Education', ul(c.edu)) + sec('Skills', sk) +
      sec('Experience', ul(c.exp)) + sec('Projects and Research', ul(c.proj)) + sec('Achievements and Activities', ul(c.ach)) + sec('References', ul(c.ref));
    return '<div class="cv">' + body + '</div>';
  }
  function viewCv() {
    var h = '<div class="pl-cvw"><div class="pl-card"><div class="pl-hd"><div><h3>CV-র তথ্য</h3><p class="pl-mut">যা লিখবেন পাশের প্রিভিউতে সঙ্গে সঙ্গে দেখা যাবে। স্কিল অংশ নিজে থেকে আসে ("স্কিল" ট্যাব থেকে)।</p></div></div><div class="pl-cvf">';
    CVF.forEach(function (f) {
      var v = esc((S.cv || {})[f[0]] || '');
      h += '<label>' + f[1] + (f[2] === 'ta' ? '<textarea class="pl-in" data-cv="' + f[0] + '" rows="' + (f[0] === 'obj' ? 3 : 4) + '" placeholder="' + esc(f[3]) + '">' + v + '</textarea>' : '<input class="pl-in" data-cv="' + f[0] + '" value="' + v + '" placeholder="' + esc(f[3]) + '">') + '</label>';
    });
    h += '</div></div><div class="pl-card"><div class="pl-hd"><h3>প্রিভিউ</h3><button type="button" class="btn ink sm" data-act="printcv">PDF সেভ / প্রিন্ট করুন</button></div><div class="pl-paper" id="cvPrev">' + cvHtml() + '</div><p class="pl-mut sm">প্রিন্ট উইন্ডোতে "Save as PDF" বেছে নিন। ফোনে Chrome-এর প্রিন্ট মেনু থেকেও PDF হয়।</p></div></div>';
    return h;
  }

  /* =====================================================
     মূল রেন্ডার
     ===================================================== */
  var TABS = [['today', 'আজ'], ['routine', 'রুটিন'], ['att', 'উপস্থিতি'], ['exam', 'পরীক্ষা'], ['skill', 'স্কিল'], ['cv', 'CV']];
  function render(keepScroll) {
    renderStrip();
    if (!mount) return;
    var y = window.scrollY;
    var body = { today: viewToday, routine: viewRoutine, att: viewAtt, exam: viewExam, skill: viewSkill, cv: viewCv }[tab]();
    mount.innerHTML = '<div class="seg tabs" role="tablist" aria-label="প্ল্যানারের অংশ">' + TABS.map(function (t) {
      return '<button type="button" role="tab" data-act="tab" data-t="' + t[0] + '" aria-selected="' + (t[0] === tab) + '">' + t[1] + '</button>';
    }).join('') + '</div><div class="pl-body">' + body + '</div>' +
      '<div class="pl-bk"><span>তথ্য ডিফল্টে শুধু এই ব্রাউজারে থাকে; কমিউনিটি প্রোফাইল থেকে ঐচ্ছিক সিঙ্ক চালু করলে অ্যাকাউন্টেও থাকে।</span><button type="button" class="pl-lk" data-act="export">ব্যাকআপ নামান</button><label class="pl-lk">ব্যাকআপ ফেরত আনুন<input type="file" accept="application/json,.json" data-act="import" hidden></label></div>';
    if (keepScroll) window.scrollTo(0, y);
  }

  /* ---------- অ্যাকশন ---------- */
  function addCourses(list) {
    var added = 0;
    list.forEach(function (c) {
      var dup = S.courses.some(function (x) { return x.code === c.code && x.name === c.name; });
      if (dup) return;
      S.courses.push({ id: nid(), code: c.code, name: c.name, color: PALETTE[S.courses.length % PALETTE.length] }); added++;
    });
    return added;
  }
  function shortCode(code) { var p = String(code || '').split(/\s+/); return p.length > 1 ? p[0] + ' ' + p[p.length - 1] : (code || ''); }

  function setMark(sid, v) {
    var k = selDate + '|' + sid, sl = S.slots.filter(function (s) { return s.id === sid; })[0]; if (!sl) return;
    if (S.att[k] && S.att[k].r === v) delete S.att[k]; else S.att[k] = { r: v, c: sl.c };
  }

  function onClick(e) {
    var b = e.target.closest('[data-act]'); if (!b || b.tagName === 'SELECT' || b.tagName === 'INPUT') return;
    var a = b.dataset.act;
    if (a === 'tab') { tab = b.dataset.t; render(); }
    else if (a === 'day') { var n = +b.dataset.n; selDate = n === 0 ? todayIso() : addDays(selDate, n); render(true); }
    else if (a === 'mark') { setMark(b.dataset.sid, b.dataset.v); save(); render(true); }
    else if (a === 'allp') { S.slots.filter(function (s) { return s.d === fromIso(selDate).getDay(); }).forEach(function (s) { S.att[selDate + '|' + s.id] = { r: 'p', c: s.c }; }); save(); render(true); toast('সবগুলোতে "ছিলাম" দেওয়া হলো'); }
    else if (a === 'delc') {
      var c = cById(b.dataset.id); if (!c || !confirm('"' + c.name + '" কোর্স, তার ক্লাস, উপস্থিতি ও পরীক্ষা মুছে যাবে। মুছবেন?')) return;
      S.courses = S.courses.filter(function (x) { return x.id !== c.id; }); S.slots = S.slots.filter(function (s) { return s.c !== c.id; });
      for (var k in S.att) if (S.att[k].c === c.id) delete S.att[k];
      S.exams.forEach(function (x) { if (x.c === c.id) x.c = ''; }); save(); render(true);
    }
    else if (a === 'dels') { S.slots = S.slots.filter(function (s) { return s.id !== b.dataset.id; }); save(); render(true); }
    else if (a === 'dele') { if (!confirm('পরীক্ষাটি মুছবেন?')) return; S.exams = S.exams.filter(function (x) { return x.id !== b.dataset.id; }); save(); render(true); }
    else if (a === 'skill') { var key = b.dataset.k; S.skills[key] = ((S.skills[key] || 0) + 1) % 4; save(); render(true); }
    else if (a === 'sample') {
      if (S.slots.length && !confirm('বর্তমান রুটিনের ওপর নমুনা যোগ হবে। চালিয়ে যাবেন?')) return;
      addCourses(SAMPLE_C.map(function (x) { return { code: x[0], name: x[1] }; }));
      var map = SAMPLE_C.map(function (x) { return S.courses.filter(function (c) { return c.code === x[0] && c.name === x[1]; })[0]; });
      SAMPLE_S.forEach(function (x) { if (map[x[3]]) S.slots.push({ id: nid(), d: x[0], s: x[1], e: x[2], c: map[x[3]].id, room: '' }); });
      S.sample = true; save(); tab = 'routine'; render(); window.scrollTo(0, mount.offsetTop - 70);
    }
    else if (a === 'clearall') {
      if (!confirm('কোর্স, রুটিন, উপস্থিতি আর পরীক্ষা সব মুছে যাবে (স্কিল ও CV থাকবে)। মুছবেন?')) return;
      S.courses = []; S.slots = []; S.att = {}; S.exams = []; S.sample = false; save(); render();
    }
    else if (a === 'export') {
      var blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }), u = URL.createObjectURL(blob), l = document.createElement('a');
      l.href = u; l.download = 'geb-planner-' + todayIso() + '.json'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 1000);
    }
    else if (a === 'printcv') printCv();
  }

  function onSubmit(e) {
    var f = e.target.closest('[data-form]'); if (!f) return; e.preventDefault();
    var k = f.dataset.form, v = function (n) { return (f.elements[n] ? f.elements[n].value : '').trim(); };
    if (k === 'addc') { addCourses([{ code: v('code'), name: v('name') }]); toast('কোর্স যোগ হয়েছে'); }
    else if (k === 'import') {
      var sem = CUR[+v('sem')]; if (!sem) return;
      var n = addCourses(sem.courses.map(function (c) { return { code: shortCode(c.code), name: c.title }; }));
      toast(n ? bn(n) + 'টা কোর্স যোগ হয়েছে' : 'এই কোর্সগুলো আগেই যোগ করা আছে');
    }
    else if (k === 'adds') {
      if (v('e') <= v('s')) { toast('শেষের সময় শুরুর পরে হতে হবে'); return; }
      var dup = S.slots.some(function (s) { return s.d === +v('d') && s.s === v('s') && s.c === v('c'); });
      if (dup) { toast('এই ক্লাস আগেই যোগ করা আছে'); return; }
      S.slots.push({ id: nid(), d: +v('d'), s: v('s'), e: v('e'), c: v('c'), room: v('room') }); toast('ক্লাস যোগ হয়েছে');
    }
    else if (k === 'adde') { S.exams.push({ id: nid(), t: v('t'), c: v('c'), d: v('d'), tm: v('tm') }); toast('পরীক্ষা যোগ হয়েছে'); }
    else if (k === 'addk') {
      var nm = v('name'), all = []; SKILLS.forEach(function (g) { all = all.concat(g.i); });
      if (all.indexOf(nm) < 0 && !S.custom.some(function (c) { return c.name === nm; })) { S.custom.push({ name: nm }); S.skills[nm] = 2; toast('স্কিল যোগ হয়েছে'); } else toast('এই স্কিল আগে থেকেই আছে');
    }
    save(); render(true);
  }

  function onChange(e) {
    var t = e.target;
    if (t.dataset.act === 'target') { S.target = +t.value; save(); render(true); }
    else if (t.dataset.act === 'import' && t.files && t.files[0]) {
      var r = new FileReader();
      r.onload = function () {
        try {
          var v = JSON.parse(r.result); if (!v || typeof v !== 'object' || !Array.isArray(v.courses)) throw 0;
          if (!confirm('বর্তমান প্ল্যানারের সব তথ্য এই ব্যাকআপ দিয়ে বদলে যাবে। চালিয়ে যাবেন?')) return;
          var b = blank(); for (var k in b) if (!(k in v)) v[k] = b[k]; S = v; save(); render(); toast('ব্যাকআপ ফেরত আনা হয়েছে');
        } catch (x) { toast('ফাইলটি ঠিক নেই, GEB প্ল্যানারের ব্যাকআপ দিন'); }
      };
      r.readAsText(t.files[0]);
    }
  }

  function onInput(e) {
    var t = e.target; if (!t.dataset.cv) return;
    S.cv[t.dataset.cv] = t.value; save();
    clearTimeout(cvTimer); cvTimer = setTimeout(function () { var p = $('#cvPrev'); if (p) p.innerHTML = cvHtml(); }, 120);
  }

  function printCv() {
    var root = $('#plPrint'); if (!root) { root = document.createElement('div'); root.id = 'plPrint'; document.body.appendChild(root); }
    root.innerHTML = cvHtml(); document.body.classList.add('printing-cv');
    var done = function () { document.body.classList.remove('printing-cv'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done); window.print();
  }

  /* নেভিগেশন লিংক ও স্ট্রিপের লিংক থেকে ট্যাব খোলা */
  document.addEventListener('click', function (e) {
    var g = e.target.closest('[data-go]'); if (g && g.dataset.go) { tab = g.dataset.go; selDate = todayIso(); render(); }
  });
  if (mount) { mount.addEventListener('click', onClick); mount.addEventListener('submit', onSubmit); mount.addEventListener('change', onChange); mount.addEventListener('input', onInput); }

  render();
  /* সেমিস্টারের কোর্স তালিকা (ঐচ্ছিক, না পেলে "সেমিস্টার থেকে আনুন" অংশ লুকানো থাকে) */
  fetch('/api/data').then(function (r) { return r.ok ? r.json() : null; }).then(function (D) {
    if (D && Array.isArray(D.curriculum)) { CUR = D.curriculum.filter(function (c) { return c.courses && c.courses.length; }); if (tab === 'routine') render(true); }
  }).catch(function () { });
  /* ক্লাস চলার সময় স্ট্রিপ নিজে আপডেট হবে */
  setInterval(renderStrip, 60000);
})();
