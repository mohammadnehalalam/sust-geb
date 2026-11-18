/* GEB Hub: ক্যারিয়ার-কোর ও ডিউটি মোড (v3.18)
   hospital.js-এর কিটে (GEBHospKit) ট্যাব যোগ করে। window.GEBCareer বাকি ট্যাবগুলো (ECG, X-ray, ল্যাব, ক্যারিয়ার) ব্যবহার করে। */
(function () {
  'use strict';
  var K = window.GEBHospKit, D = window.GEBHospDuty; if (!K || !D) return;
  var esc = K.esc, bn = K.bn, $ = K.$, $$ = K.$$, P = K.P;

  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function merge(dst, src) { Object.keys(src).forEach(function (k) { if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k])) { if (!dst[k] || typeof dst[k] !== 'object') dst[k] = {}; merge(dst[k], src[k]); } else if (dst[k] === undefined) dst[k] = src[k]; }); return dst; }

  /* ---------- ক্যারিয়ার অবস্থা (P.cr) ---------- */
  P.cr = merge(P.cr || {}, D.freshState());
  var S = P.cr;
  function toast(t) { try { if (window.GEBGM && GEBGM.u && GEBGM.u.toast) { GEBGM.u.toast(t); return; } } catch (e) { } var el = document.createElement('div'); el.className = 'hd-toast'; el.textContent = t; document.body.appendChild(el); setTimeout(function () { el.remove(); }, 3500); }

  var C = {
    S: S, D: D,
    role: function () { return D.ROLES[S.role] ? S.role : 'doctor'; },
    roleInfo: function () { return D.ROLES[C.role()]; },
    setRole: function (r) { if (D.ROLES[r]) { S.role = r; K.save(); } },
    setName: function (n) { S.name = String(n || '').replace(/[<>]/g, '').slice(0, 40); K.save(); },
    rank: function () { return D.rankIndex(S.cp); },
    title: function () { return C.roleInfo().ranks[C.rank()]; },
    /* একটি প্রশ্নের ফল: ok = প্রথম চেষ্টায় ঠিক? kind = ecg|img|lab (নির্ভুলতা) বা null */
    ans: function (kind, ok) {
      if (kind) { S[kind].n++; if (ok) S[kind].ok++; }
      if (ok) { S.streak++; if (S.streak > S.streakBest) S.streakBest = S.streak; S.cp += 2; } else S.streak = 0;
      K.save();
    },
    /* কিছু সম্পন্ন হলে: ভূমিকা-ব্যবহার নথি, বোনাস CP, নতুন ব্যাজ-সার্টিফিকেট ঘোষণা */
    done: function (stars) {
      S.roles[C.role()] = 1; S.cp += 3 * (stars || 1); K.save();
      var got = C.check(); got.forEach(function (g) { toast(g); }); return got;
    },
    check: function () {
      var out = [], had = S.badges = S.badges || {};
      D.BADGES.forEach(function (b) { if (!had[b.id] && b.f(S)) { had[b.id] = Date.now(); out.push(b.ic + ' নতুন ব্যাজ: ' + b.n); } });
      /* সার্টিফিকেট একটির পর একটি (grand শেষে) */
      D.CERTS.forEach(function (c) { if (!S.certs[c.id] && D.certProgress(c, S).ok) { S.certs[c.id] = { ts: Date.now(), name: S.name, role: C.role(), title: C.title(), no: certNo(c.id) }; out.push('📜 সার্টিফিকেট অর্জন: ' + c.n); } });
      if (out.length) K.save(); return out;
    },
    roleBar: function () {
      var r = C.roleInfo();
      return '<div class="hd-rolebar"><span><b>' + r.ic + ' ' + esc(S.name || 'শিক্ষার্থী') + '</b> · ' + esc(r.n) + ' · ' + esc(C.title()) + ' · <b>' + bn(S.cp) + ' CP</b></span><button type="button" class="hp-btn sm" data-gocareer>🎭 চরিত্র বদলান</button></div>';
    },
    bindRoleBar: function (root) { var b = $('[data-gocareer]', root); if (b) b.onclick = function () { K.goTab('career'); }; },
    /* ছোট সহায়ক: প্রশ্ন দেখানো। cb(ok) = প্রথম চেষ্টায় ঠিক কিনা, শেষ হলে একবার ডাকা হয় */
    ask: function (el, q, kind, cb) {
      var order = shuffle(q.o.map(function (o, k) { return k; })), first = true, done = false;
      el.innerHTML = '<div class="hp-quiz"><b>🧠 ' + esc(q.q) + '</b><div class="hp-opts v">' + order.map(function (k) { return '<button type="button" class="hp-opt" data-k="' + k + '">' + esc(q.o[k]) + '</button>'; }).join('') + '</div><p class="hp-fb" role="status"></p></div>';
      var f = $('.hp-fb', el);
      el.onclick = function (e) {
        var b = e.target.closest('.hp-opt'); if (!b || done || b.disabled) return; var k = +b.dataset.k;
        if (k === q.a) { done = true; b.classList.add('ok'); f.className = 'hp-fb good'; f.innerHTML = '✔ ' + esc(q.e); C.ans(kind, first); $$('.hp-opt', el).forEach(function (x) { x.disabled = true; }); if (cb) cb(first); }
        else { first = false; b.classList.add('no'); b.disabled = true; C.ans(kind, false); f.className = 'hp-fb bad'; f.textContent = '✘ ঠিক হয়নি। আবার ভাবুন।'; }
      };
    },
    /* নতুন পর্দায় ঢুকলে হাসপাতাল-অংশের মাথায় ফিরে আসা (তালিকার মাঝখানে স্ক্রল করা থাকলে) */
    top: function () { var m = document.getElementById('hospMount'); if (m && m.getBoundingClientRect().top < 0) m.scrollIntoView({ block: 'start' }); },
    shuffle: shuffle, toast: toast
  };
  function certNo(id) { var h = 5381, s = (S.name || '') + id + Date.now(); for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return 'GEB-' + id.toUpperCase().slice(0, 3) + '-' + (h >>> 0).toString(36).toUpperCase().slice(0, 6); }
  window.GEBCareer = C;

  /* ---------- ডিউটি মোড ---------- */
  var R = null;   /* চলমান শিফট */
  var BAND = { high: ['#d94b4b', 'জরুরি সাড়া'], med: ['#e0873a', 'জরুরি পর্যালোচনা'], medlow: ['#e0b23a', 'এক প্যারামিটারে ৩'], low: ['#3fae6a', 'কম স্কোর'] };
  function vitals(v, adult) {
    if (v.hr === 0 && v.avpu === 'U') return '<span class="hd-chip bad">শ্বাস নেই</span><span class="hd-chip bad">নাড়ি নেই</span><span class="hd-chip bad">সাড়া নেই</span>';
    var c = [['HR', bn(v.hr)], ['BP', bn(v.sys) + '/' + bn(v.dia)], ['RR', bn(v.rr)], ['SpO₂', bn(v.spo2) + '%' + (v.o2 ? ' (O₂)' : '')], ['তাপ', bn(v.t) + '°F'], ['সচেতনতা', ({ A: 'সজাগ', C: 'বিভ্রান্ত', V: 'ডাকলে সাড়া', P: 'ব্যথায় সাড়া', U: 'নেই' })[v.avpu]]];
    return c.map(function (x) { return '<span class="hd-chip"><i>' + x[0] + '</i> ' + x[1] + '</span>'; }).join('');
  }
  function newsHtml(p) {
    if (p.adult === false) return '<span class="hd-news" style="--c:#8a98a6">NEWS2 নয়' + (p.age < 16 ? ' (শিশু: PEWS)' : '') + '</span>';
    var n = D.news2(p.v), b = BAND[n.band];
    return '<span class="hd-news" style="--c:' + b[0] + '" title="' + esc(n.text) + '">NEWS2: ' + bn(n.total) + ' · ' + b[1] + '</span>';
  }
  function present() { return R.shift.pts.filter(function (p) { return R.here[p.id]; }); }
  function waiting() { return present().filter(function (p) { return !R.seen[p.id]; }); }

  function chooser() {
    R = null; var body = $('#hpBody'), rb = C.roleBar();
    body.innerHTML = rb + '<div class="hp-card"><h3>🩺 ডিউটি মোড</h3><p class="hp-mut">একসাথে কয়েকজন রোগী অপেক্ষায়। ভাইটাল ও অভিযোগ দেখে ঠিক করুন কাকে আগে দেখবেন। "দেখা" মানে প্রাথমিক মূল্যায়ন ও জীবনরক্ষাকারী প্রথম পদক্ষেপ; বাকি চিকিৎসা দল সমান্তরালে চালায়। মাঝপথে নতুন রোগী আসতে পারে, আর ভুল সিদ্ধান্তে সময় নষ্ট হয়। প্রতিটি রোগীর পর আপনার ভূমিকার (' + esc(C.roleInfo().n) + ') প্রথম কাজের প্রশ্ন আসবে।</p></div><div class="hf-grid">' +
      D.SHIFTS.map(function (s) { var b = S.duty.best[s.id]; return '<button type="button" class="hf-jc" data-s="' + s.id + '"><span class="ic">' + s.ic + '</span><b>' + esc(s.n) + '</b><small>' + esc(s.d) + '</small><span class="hf-meta">' + esc(s.lvl) + ' · ' + bn(s.pts.length) + ' জন' + (b ? ' · ' + K.starHtml(b) : '') + '</span></button>'; }).join('') + '</div>';
    C.bindRoleBar(body);
    body.onclick = function (e) { var b = e.target.closest('.hf-jc'); if (b) { body.onclick = null; start(D.shiftById(b.dataset.s)); } };
  }

  function start(shift) {
    C.top();
    R = { shift: shift, here: {}, seen: {}, order: [], mistakes: 0, min: 0, aid: false, aidUsed: false, cur: null, log: [], qOk: 0 };
    shift.pts.forEach(function (p) { if (!p.after) R.here[p.id] = true; });
    draw();
  }

  function draw() {
    var body = $('#hpBody'), sh = R.shift, w = waiting(), total = sh.pts.length, doneN = R.order.length;
    var cards = present().map(function (p) {
      var seenIdx = R.order.indexOf(p.id), isSeen = seenIdx >= 0, cur = R.cur === p.id;
      return '<div class="hd-pt' + (isSeen ? ' seen' : '') + (cur ? ' cur' : '') + (p.id === R.fresh ? ' fresh' : '') + '" data-id="' + p.id + '"><div class="hd-pt-h"><span class="hd-av">' + p.ic + '</span><div><b>' + esc(p.n) + '</b> <span class="hp-mut">' + bn(p.age) + ' · ' + esc(p.sex) + '</span></div>' + (isSeen ? '<em class="hd-no">✔ ' + bn(seenIdx + 1) + 'ম</em>' : '') + '</div>' +
        '<p>' + esc(p.cc) + '</p><div class="hd-vit">' + vitals(p.v, p.adult !== false) + '</div>' + (p.extra ? '<p class="hd-ex">📌 ' + esc(p.extra) + '</p>' : '') +
        (R.aid ? '<div>' + newsHtml(p) + '</div>' : '') +
        (isSeen ? '<p class="hf-why"><b>কেন এই ক্রম:</b> ' + esc(p.why) + '</p>' : cur ? '' : '<button type="button" class="hp-btn sm pri" data-pick="' + p.id + '">▶ এখন দেখুন</button>') + '</div>';
    }).join('');
    body.innerHTML = C.roleBar() + '<button type="button" class="hp-back" id="hdBack">← শিফট তালিকা</button>' +
      '<div class="hp-card hd-head"><div><h3>' + sh.ic + ' ' + esc(sh.n) + '</h3><p class="hp-mut">অপেক্ষায় <b>' + bn(w.length) + '</b> জন · দেখা হয়েছে <b>' + bn(doneN) + '/' + bn(total) + '</b> · ⏱ <b>' + bn(R.min) + '</b> মিনিট কেটেছে · ভুল <b>' + bn(R.mistakes) + '</b></p></div>' +
      '<label class="hd-sw"><input type="checkbox" id="hdAid"' + (R.aid ? ' checked' : '') + (R.cur ? ' disabled' : '') + '> NEWS2 সহায়ক দেখান</label></div>' +
      '<p class="hp-fb' + (R.msg ? ' ' + R.msg[0] : '') + '" id="hdMsg" role="status">' + (R.msg ? R.msg[1] : 'কাকে আগে দেখবেন? কার্ডে "এখন দেখুন" চাপুন।') + '</p>' +
      '<div class="hd-list">' + cards + '</div><div id="hdQ" class="hp-card" hidden></div>';
    C.bindRoleBar(body); R.fresh = null;
    $('#hdBack').onclick = chooser;
    $('#hdAid').onchange = function (e) { R.aid = e.target.checked; if (R.aid) R.aidUsed = true; var q = R.cur; draw(); if (q) reopenQ(); };
    body.onclick = function (e) { var b = e.target.closest('[data-pick]'); if (b && !R.cur) pick(b.dataset.pick); };
    if (R.cur) reopenQ();
  }

  function pick(id) {
    var p = R.shift.pts.filter(function (x) { return x.id === id; })[0], w = waiting(), top = w.slice().sort(function (a, b) { return a.rank - b.rank; })[0];
    if (p.id !== top.id) {
      R.mistakes++; R.min += 10; C.ans(null, false);
      R.msg = ['bad', '✘ এখন নয়: ' + p.n + '। ' + p.wait + ' আরও জরুরি রোগী অপেক্ষায় আছে ⚠, দেরি ১০ মিনিট।']; draw(); return;
    }
    R.cur = id; R.msg = ['good', '✔ ঠিক পছন্দ: ' + p.n + '। এবার ' + C.roleInfo().n + ' হিসেবে প্রথম কাজটি বাছুন।']; C.ans(null, true); draw();
  }
  function reopenQ() {
    var p = R.shift.pts.filter(function (x) { return x.id === R.cur; })[0], q = p.q[C.role() === 'doctor' ? 'd' : C.role() === 'nurse' ? 'n' : 't'], box = $('#hdQ');
    box.hidden = false; box.innerHTML = '<h4>' + p.ic + ' ' + esc(p.n) + ': ' + esc(C.roleInfo().ic + ' ' + C.roleInfo().n) + '-এর কাজ</h4><div id="hdQb"></div><div class="hp-nav"><button type="button" class="hp-btn pri" id="hdNext" hidden>পরবর্তী ▶</button></div>';
    box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    C.ask($('#hdQb', box), q, null, function (first) {
      if (!first) R.mistakes++; else R.qOk++;
      $('#hdNext').hidden = false; $('#hdNext').onclick = function () { advance(p); };
    });
  }
  function advance(p) {
    R.order.push(p.id); R.seen[p.id] = true; R.cur = null; R.min += 6; R.msg = null;
    R.shift.pts.forEach(function (x) { if (x.after && x.after === R.order.length && !R.here[x.id]) { R.here[x.id] = true; R.fresh = x.id; R.msg = ['bad', '🆕 নতুন রোগী এসেছেন: ' + x.n + '। অগ্রাধিকার আবার ঠিক করুন।']; } });
    if (waiting().length === 0) return finish(); draw();
  }

  function finish() {
    var sh = R.shift, ideal = D.idealOrder(sh), f = K.award('duty_' + sh.id, R.mistakes, sh.xp);
    S.duty.runs++; if (R.mistakes === 0) { S.duty.clean++; if (!R.aidUsed) S.duty.noaid++; }
    S.duty.best[sh.id] = Math.max(S.duty.best[sh.id] || 0, f.st); var got = C.done(f.st);
    var body = $('#hpBody'), byId = {}; sh.pts.forEach(function (p) { byId[p.id] = p; });
    body.innerHTML = C.roleBar() + '<div class="hp-card hp-res"><h3>🎉 শিফট শেষ: ' + esc(sh.n) + '</h3><div class="big">' + K.starHtml(f.st) + '</div><p>ভুল: <b>' + bn(R.mistakes) + '</b> · সময়: <b>' + bn(R.min) + '</b> মিনিট · <b>+' + bn(f.xp) + ' XP</b>' + (f.first ? '' : ' (আবার করার জন্য কম XP)') + '</p>' + (got.length ? '<p class="hd-got">' + got.map(esc).join('<br>') + '</p>' : '') +
      '<h4>আদর্শ ক্রম ও কারণ</h4><ol class="hd-rev">' + ideal.map(function (id) { var p = byId[id]; return '<li><b>' + p.ic + ' ' + esc(p.n) + '</b> ' + (p.adult === false ? '' : newsHtml(p)) + '<br><span class="hp-mut">' + esc(p.why) + '</span><br><span class="hd-late">⏳ দেরি হলে: ' + esc(p.det) + '</span></li>'; }).join('') + '</ol>' +
      '<h4>শিফটের শিক্ষা</h4><ul class="hf-take">' + sh.lesson.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul><div class="hp-nav"><button type="button" class="hp-btn" id="hdAgain">↻ আবার</button><button type="button" class="hp-btn pri" id="hdHome">শিফট তালিকা</button></div></div>';
    C.bindRoleBar(body); $('#hdAgain').onclick = function () { start(sh); }; $('#hdHome').onclick = chooser;
  }

  K.addTab('duty', '🩺 ডিউটি মোড', chooser);
})();
