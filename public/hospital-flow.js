/* GEB Hub: রোগীর যাত্রা, চালক ও ইন্টারঅ্যাকটিভ অংশ (v3.17)
   hospital.js-এ নতুন ট্যাব “🚑 রোগীর যাত্রা” বসায়। ধাপ চালানো, ট্রায়াজ, ডিসপোজিশন, বেড, ক্যাশ কাউন্টার, বিল যাচাই,
   বিভাগ বাছাই, ডাক্তারের সাথে কথা, প্রেসক্রিপশন বোঝা, প্রেসক্রিপশন যাচাই, শেলফ, পরিমাণ, লেবেল ও ফার্মেসি বিল। */
(function () {
  'use strict';
  var C = window.GEBFlowCore, SC = window.GEBFlowScenes; if (!C || !SC) return;
  var K = C.K, F = C.F, DOC = C.DOC, H = K.H, bn = K.bn, esc = K.esc, $ = K.$, $$ = K.$$, tk = F.tk, P = K.P;
  var FR = null;   /* চলমান যাত্রা */

  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function vit(v) { return 'HR ' + bn(v.hr) + ' · BP ' + bn(v.sys) + '/' + bn(v.dia) + ' · RR ' + bn(v.rr) + ' · SpO₂ ' + bn(v.spo2) + '% · GCS ' + bn(v.gcs) + ' · ' + bn(v.t) + '°F'; }
  function ready(i) { FR.done[i] = true; var n = $('#hpNext'); if (n) n.disabled = false; }
  function sc() { return FR && FR.sc; }
  /* কাগজ দেখানো: দৃশ্য এখনো তৈরি না হলে তৈরি হওয়ার পর play() দেখাবে */
  function setDoc(doc) { FR.doc = doc; call(function (S) { S.refresh && S.refresh(doc); }); }
  function call(fn) { try { var S = sc(); if (S) fn(S); } catch (e) { console.error('flow scene', e); } }
  function fb(el, ok, t) { el.className = 'hp-fb ' + (ok ? 'good' : 'bad'); el.innerHTML = t; }
  function uniq(a) { var s = {}; return a.filter(function (x) { if (s[x]) return false; s[x] = 1; return true; }); }

  /* সাধারণ বহুনির্বাচনী: opts = স্ট্রিংয়ের তালিকা, a = সঠিকের ইনডেক্স */
  function ask(el, q, opts, a, expl, cb) {
    var order = shuffle(opts.map(function (o, k) { return k; }));
    el.innerHTML = '<div class="hp-quiz"><b>🧠 ' + esc(q) + '</b><div class="hp-opts v">' + order.map(function (k) { return '<button type="button" class="hp-opt" data-k="' + k + '">' + esc(opts[k]) + '</button>'; }).join('') + '</div><p class="hp-fb"></p></div>';
    var f = $('.hp-fb', el), done = false;
    el.onclick = function (e) {
      var b = e.target.closest('.hp-opt'); if (!b || done) return; var k = +b.dataset.k;
      if (k === a) { done = true; b.classList.add('ok'); fb(f, true, '✔ ' + esc(expl)); if (cb) cb(); }
      else { b.classList.add('no'); b.disabled = true; FR.mistakes++; fb(f, false, '✘ ঠিক হয়নি, হিসাব বা তথ্য আবার দেখুন।'); }
    };
  }

  /* ---------------- ইন্টারঅ্যাকটিভ অংশ ---------------- */
  var IX = {};

  /* ট্রায়াজ */
  IX.triage = function (el, R, s, i) {
    var list = R.v.triage, placed = R.v.placed, TC = F.TRIAGE_CAT;
    el.innerHTML = '<div class="hf-pts">' + list.map(function (p, k) {
      return '<div class="hf-pt" data-k="' + k + '"><div class="hf-pt-h"><b>' + bn(k + 1) + '. ' + esc(p.n) + '</b> <span class="hp-mut">' + bn(p.age) + ' · ' + esc(p.sex) + '</span></div><p>' + esc(p.cc) + '</p><div class="hf-vit">' + vit(p.v) + '</div>' +
        '<div class="hf-cat">' + ['R', 'Y', 'G'].map(function (c) { return '<button type="button" class="hf-c ' + c + '" data-c="' + c + '">' + TC[c].ic + ' ' + TC[c].n + '</button>'; }).join('') + '</div><p class="hf-why" hidden></p></div>';
    }).join('') + '</div><p class="hp-fb" id="hfTfb"></p>';
    var cards = $$('.hf-pt', el);
    function lock(k, c) { var card = cards[k]; card.classList.add('done', c); $$('.hf-c', card).forEach(function (b) { b.disabled = true; }); var w = $('.hf-why', card); w.hidden = false; w.innerHTML = '<b>' + TC[c].ic + ' ' + TC[c].n + ':</b> ' + esc(list[k].why); }
    Object.keys(placed).forEach(function (k) { lock(+k, placed[k]); });
    el.onclick = function (e) {
      var card = e.target.closest('.hf-pt'); if (!card) return; var k = +card.dataset.k; call(function (S) { if (!placed[k]) S.hi(k); });
      var b = e.target.closest('.hf-c'); if (!b || placed[k]) return; var c = b.dataset.c, f = $('#hfTfb');
      if (c === list[k].cat) { placed[k] = c; lock(k, c); call(function (S) { S.place(k, c); }); fb(f, true, '✔ ' + esc(list[k].n) + ' → ' + TC[c].n + ': ' + esc(TC[c].d)); if (Object.keys(placed).length === list.length) ready(i); }
      else { R.mistakes++; b.disabled = true; call(function (S) { S.wrong(k); }); fb(f, false, '✘ ঠিক হয়নি। ভাইটাল ও ABCD দেখুন: শ্বাসপথ, শ্বাস, রক্তসঞ্চালন বা সচেতনতায় বিপদ থাকলে লাল।'); }
    };
    if (Object.keys(placed).length === list.length) ready(i);
  };
  function applyPlaced() { var R = FR; if (!R.v.placed) return; call(function (S) { if (!S.place) return; Object.keys(R.v.placed).forEach(function (k) { S.place(+k, R.v.placed[k]); }); }); }

  /* ডিসপোজিশন */
  IX.dispo = function (el, R, s, i) {
    if (!R.v.dispo) R.v.dispo = shuffle(F.DISPO).slice(0, 3); var left = R.v.dispo.length, O = F.DISPO_OPTS;
    el.innerHTML = R.v.dispo.map(function (d, k) {
      return '<div class="hf-pt" data-k="' + k + '"><p><b>' + bn(k + 1) + '.</b> ' + esc(d.pt) + '</p><div class="hf-cat w">' + O.map(function (o) { return '<button type="button" class="hf-c" data-o="' + o.id + '">' + o.n + '</button>'; }).join('') + '</div><p class="hf-why" hidden></p></div>';
    }).join('');
    el.onclick = function (e) {
      var b = e.target.closest('.hf-c'); if (!b) return; var card = b.closest('.hf-pt'), k = +card.dataset.k, d = R.v.dispo[k];
      if (b.dataset.o === d.a) { card.classList.add('done'); $$('.hf-c', card).forEach(function (x) { x.disabled = true; }); b.classList.add('on'); var w = $('.hf-why', card); w.hidden = false; w.innerHTML = '✔ ' + esc(d.e); if (--left === 0) ready(i); }
      else { b.disabled = true; R.mistakes++; b.classList.add('bad'); }
    };
  };

  /* বেড বাছাই */
  IX.bed = function (el, R, s, i) {
    el.innerHTML = '<div class="hf-beds">' + Object.keys(F.BEDS).map(function (k) { var b = F.BEDS[k]; return '<button type="button" class="hf-bed' + (R.v.bed === k ? ' on' : '') + '" data-b="' + k + '"><b>' + b.ic + ' ' + b.n + '</b><span>' + esc(b.d) + '</span><span class="hf-pr">দৈনিক ' + tk(b.rate) + ' · অগ্রিম ' + tk(b.dep) + '</span><span class="hf-pr">আনুমানিক মোট ' + tk(F.billTotal(F.billLines(k))) + '</span></button>'; }).join('') + '</div><p class="hp-fb" id="hfBfb"></p>';
    function sel(k) { R.v.bed = k; R.v.err = R.v.err || pick(['dup', 'days']); $$('.hf-bed', el).forEach(function (x) { x.classList.toggle('on', x.dataset.b === k); }); fb($('#hfBfb'), true, '✔ ' + F.BEDS[k].n + ' বাছা হয়েছে। ভর্তি ফর্মে বসে গেছে। (পরে বদলাতে হলে ◀ আগের বোতাম)'); call(function (S) { S.refresh && S.refresh(); }); ready(i); }
    el.onclick = function (e) { var b = e.target.closest('.hf-bed'); if (b) sel(b.dataset.b); };
    if (R.v.bed) sel(R.v.bed);
  };

  /* ক্যাশ কাউন্টার: অগ্রিম ও বকেয়া */
  IX.pay = function (el, R, s, i) {
    var dep = F.BEDS[R.v.bed || 'ward'].dep, isDep = (R.def.id === 'adm' && i === 2), total = F.billTotal(F.fixBill(F.billLines(R.v.bed || 'ward', null))), need = isDep ? dep : total - dep, got = 0, method = 'cash';
    el.innerHTML = '<div class="hf-pay"><p>দিতে হবে: <b class="hf-big">' + tk(need) + '</b> <span class="hp-mut">(' + (isDep ? 'অগ্রিম জমা' : 'চূড়ান্ত বিল ' + tk(total) + ' − অগ্রিম ' + tk(dep)) + ')</span></p>' +
      '<div class="hp-opts"><button type="button" class="hp-opt ok" data-m="cash">💵 নগদ</button><button type="button" class="hp-opt" data-m="card">💳 কার্ড</button><button type="button" class="hp-opt" data-m="mfs">📱 মোবাইল ব্যাংকিং</button></div>' +
      '<div id="hfCash"><div class="hf-notes">' + [10000, 1000, 500, 100, 50].map(function (n) { return '<button type="button" class="hf-note" data-n="' + n + '">+' + tk(n) + '</button>'; }).join('') + '<button type="button" class="hf-note x" data-n="0">↺ শূন্য</button></div><p>গোনা হয়েছে: <b id="hfGot">' + tk(0) + '</b></p></div>' +
      '<button type="button" class="hp-btn pri" id="hfPay">জমা দিন</button><p class="hp-fb" id="hfPfb"></p></div>';
    function upd() { $('#hfGot').textContent = tk(got); }
    var paid = false;
    el.onclick = function (e) {
      if (paid) return; var m = e.target.closest('[data-m]'), n = e.target.closest('.hf-note'), f = $('#hfPfb');
      if (m) { method = m.dataset.m; $$('[data-m]', el).forEach(function (x) { x.classList.toggle('ok', x === m); }); $('#hfCash').hidden = method !== 'cash'; fb(f, true, method === 'mfs' ? 'মোবাইল ব্যাংকিং: PIN বা OTP কাউকে বলবেন না, ক্যাশিয়ারকেও নয়।' : method === 'card' ? 'কার্ডে POS মেশিনে PIN নিজে দিন, কার্ড চোখের সামনে রাখুন।' : 'নোট গুনে নিন।'); return; }
      if (n) { var v = +n.dataset.n; got = v ? got + v : 0; upd(); return; }
      if (e.target.id === 'hfPay') {
        if (method === 'cash' && got < need) { R.mistakes++; fb(f, false, '✘ টাকা কম: আরও ' + tk(need - got) + ' লাগবে।'); return; }
        paid = true; e.target.disabled = true; var change = method === 'cash' ? got - need : 0, mname = { cash: 'নগদ', card: 'কার্ড', mfs: 'মোবাইল ব্যাংকিং' }[method];
        var items = isDep ? [['অগ্রিম জমা (ভর্তি)', tk(need)]] : [['চূড়ান্ত বিল', tk(total)], ['অগ্রিম জমা', '− ' + tk(dep)]];
        var doc = DOC.receipt({ title: isDep ? 'অগ্রিম জমার রশিদ' : 'চূড়ান্ত রশিদ', no: isDep ? 'R-০৯৮৭' : 'R-১০৪২', items: items, totalLabel: isDep ? 'জমা' : 'বকেয়া পরিশোধ', total: tk(need), method: mname, extra: change > 0 ? [['ফেরত খুচরো', tk(change), true, '#1f8a63']] : null });
        call(function (S) { S.pay && S.pay().then(function () { return S.pay(); }).then(function () { S.refresh(doc); }); });
        fb(f, true, '✔ ' + tk(need) + ' জমা হয়েছে (' + mname + ')। রশিদ নিন।' + (change > 0 ? ' ক্যাশিয়ার ফেরত দেবেন ' + tk(change) + '।' : '') + (isDep ? '' : ' এখন ডিসচার্জ-গেট খোলা।')); ready(i);
      }
    };
  };

  /* চূড়ান্ত বিল যাচাই */
  IX.billcheck = function (el, R, s, i) {
    var bed = R.v.bed || 'ward', err = R.v.err || 'dup', lines = F.billLines(bed, err), dep = F.BEDS[bed].dep, fixed = F.fixBill(lines), found = false;
    setDoc(DOC.bill(lines, { deposit: dep }));
    el.innerHTML = '<div class="hf-bill"><p class="hp-mut">যে লাইনটি ভুল মনে হয় তাতে ট্যাপ করুন (ভর্তি ' + bn(F.ADM_PT.stayDays) + ' দিন ছিলেন):</p>' + lines.map(function (l, k) { return '<button type="button" class="hf-bl" data-k="' + k + '"><span>' + esc(l.n) + (l.u ? ' <small>(' + bn(l.q) + ' ' + l.u + ' × ' + tk(l.r) + ')</small>' : '') + '</span><b>' + tk(l.q * l.r) + '</b></button>'; }).join('') + '<div class="hf-bl tot"><span>মোট বিল</span><b id="hfTot">' + tk(F.billTotal(lines)) + '</b></div></div><p class="hp-fb" id="hfBlf"></p><div id="hfBq"></div>';
    el.onclick = function (e) {
      var b = e.target.closest('.hf-bl[data-k]'); if (!b || found) return; var l = lines[+b.dataset.k], f = $('#hfBlf');
      if (l.bad) {
        found = true; b.classList.add('ok'); fb(f, true, '✔ ধরেছেন! ' + (err === 'dup' ? 'CBC পরীক্ষা দুইবার ধরা হয়েছে' : 'বেড-ভাড়া ' + bn(l.q) + ' দিনের ধরা, অথচ ভর্তি ' + bn(F.ADM_PT.stayDays) + ' দিন') + '। বিলিং-এ জানালে সংশোধন হয়। নতুন মোট ' + tk(F.billTotal(fixed)) + '।');
        $('#hfTot').textContent = tk(F.billTotal(fixed)); setDoc(DOC.bill(fixed, { deposit: dep, title: 'সংশোধিত বিল' }));
        var due = F.billTotal(fixed) - dep, ch = uniq([due, due + 600, due - 1000, due + 1850]);
        ask($('#hfBq'), 'সংশোধিত বিল থেকে অগ্রিম ' + tk(dep) + ' বাদ দিলে বকেয়া কত?', ch.map(tk), 0, tk(F.billTotal(fixed)) + ' − ' + tk(dep) + ' = ' + tk(due), function () { R.v.due = due; ready(i); });
      } else { b.classList.add('no'); R.mistakes++; fb(f, false, '✘ এই লাইনে ভুল নেই। দিন-সংখ্যা ও একই পরীক্ষা বারবার আছে কিনা দেখুন।'); }
    };
  };

  /* OPD: বিভাগ বাছাই */
  IX.dept = function (el, R, s, i) {
    var c = R.v.case, qs = shuffle(F.DEPT_QS).slice(0, 3), k = 0, rooms = Object.keys(F.DOCTORS);
    el.innerHTML = '<div class="hf-me"><b>' + c.ic + ' আপনি: ' + esc(c.n) + '</b> (' + bn(c.age) + ' বছর) <span class="hp-mut">অভিযোগ: ' + esc(c.cc) + '</span></div><div id="hfDq"></div><p class="hp-fb" id="hfDf"></p>';
    function next() {
      if (k >= qs.length) return fin(); var q = qs[k], box = $('#hfDq');
      box.innerHTML = '<div class="hp-quiz"><b>অভ্যাস ' + bn(k + 1) + '/' + bn(qs.length) + ': “' + esc(q.cc) + '” কোন বিভাগে?</b><div class="hp-opts">' + rooms.map(function (r) { return '<button type="button" class="hp-opt" data-r="' + r + '">' + F.DOCTORS[r].dept + '</button>'; }).join('') + '</div></div>';
      box.onclick = function (e) { var b = e.target.closest('.hp-opt'); if (!b) return; if (b.dataset.r === q.a) { fb($('#hfDf'), true, '✔ ঠিক: ' + F.DOCTORS[q.a].dept + ' (' + esc(F.DOCTORS[q.a].n) + ')'); k++; next(); } else { b.disabled = true; b.classList.add('no'); R.mistakes++; } };
    }
    function fin() {
      R.v.dept = c.dept; R.v.tokenNo = R.v.tokenNo || 13 + Math.floor(Math.random() * 4); var d = F.DOCTORS[c.dept];
      $('#hfDq').innerHTML = ''; fb($('#hfDf'), true, '✔ আপনার অভিযোগ → <b>' + d.dept + '</b>, ' + esc(d.n) + '। ফি ' + tk(d.fee) + ' দিলেন, টোকেন <b>' + d.letter + '-' + bn(R.v.tokenNo) + '</b> পেলেন।');
      call(function (S) { S.refresh && S.refresh(); }); ready(i);
    }
    next();
  };

  /* OPD: ডাক্তারের সাথে কথা */
  IX.history = function (el, R, s, i) {
    var c = R.v.case, k = 0, H5 = c.hist;
    el.innerHTML = '<details class="hf-tell" open><summary>🗂️ আপনার তথ্য (এর সাথে মিলিয়ে উত্তর দিন)</summary><ul>' + c.tell.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></details><div class="hf-chat" id="hfChat"></div><div id="hfHq"></div>';
    var chat = $('#hfChat');
    function bub(who, t) { chat.insertAdjacentHTML('beforeend', '<div class="hf-b ' + who + '"><small>' + (who === 'd' ? F.DOCTORS[R.v.dept || 'opd101'].n : 'আপনি') + '</small>' + esc(t) + '</div>'); chat.scrollTop = chat.scrollHeight; call(function (S) { S.speak && S.speak(who === 'd' ? 'doc' : 'pat', t); }); }
    function next() {
      if (k >= H5.length) { ready(i); $('#hfHq').innerHTML = '<p class="hp-fb good">✔ ইতিহাস শেষ। ডাক্তারের কাছে সব জরুরি তথ্য পৌঁছেছে।</p>'; return; }
      var h = H5[k]; bub('d', h.q); var opts = shuffle([{ t: h.g, g: 1 }, { t: h.v, g: 0, m: 'অস্পষ্ট: ডাক্তার কিছুই বুঝতে পারবেন না। নির্দিষ্ট করে বলুন (কী, কতদিন, কতটা)।' }, { t: h.w, g: 0, m: 'এটি আপনার তথ্যের সাথে মেলে না। সত্যি ও প্রাসঙ্গিক তথ্য দিন।' }]), box = $('#hfHq');
      box.innerHTML = '<div class="hp-opts v">' + opts.map(function (o, n) { return '<button type="button" class="hp-opt" data-n="' + n + '">' + esc(o.t) + '</button>'; }).join('') + '</div><p class="hp-fb" id="hfHf"></p>';
      box.onclick = function (e) { var b = e.target.closest('.hp-opt'); if (!b) return; var o = opts[+b.dataset.n]; if (o.g) { box.innerHTML = ''; bub('p', o.t); setTimeout(function () { bub('d', h.r); k++; setTimeout(next, 500); }, 450); } else { b.disabled = true; b.classList.add('no'); R.mistakes++; fb($('#hfHf'), false, '✘ ' + esc(o.m)); } };
    }
    next();
  };

  /* OPD: প্রেসক্রিপশন বোঝা */
  var RXEX = {
    hd: ['ডাক্তারের নাম, ডিগ্রি ও BMDC নিবন্ধন নম্বর', 'বৈধ চিকিৎসকের প্রমাণ। নিবন্ধন নম্বর ছাড়া প্রেসক্রিপশন সন্দেহজনক।'],
    pt: ['রোগীর নাম, বয়স, ওজন', 'বয়স ও ওজন থেকে ওষুধের মাত্রা ঠিক হয়। নাম মিলিয়ে ফার্মেসি ভুল রোগীর ওষুধ এড়ায়।'],
    dx: ['রোগনির্ণয়', 'ডাক্তারের সিদ্ধান্ত কী ছিল। ফার্মাসিস্ট ওষুধ মিলিয়ে দেখেন।'],
    al: ['অ্যালার্জি', 'কোন ওষুধ এড়াতে হবে তা এখানে লেখা। ফার্মেসিকে দেখান।'],
    rx: ['℞ (রেসিপি)', 'ল্যাটিন “recipe” অর্থ “নিন”। এখান থেকে ওষুধের তালিকা শুরু।'],
    drug: ['ওষুধের জেনেরিক নাম ও শক্তি', 'জেনেরিক নাম (যেমন Paracetamol) মূল উপাদান; শক্তি (৫০০ মি.গ্রা.) প্রতি ট্যাবলেটের পরিমাণ। শক্তি ভুল হলে ডোজ ভুল।'],
    dose: ['মাত্রা-নকশা: সকাল + দুপুর + রাত', '১+০+১ মানে সকালে ১টি, দুপুরে নেই, রাতে ১টি। এ ছাড়া খাবারের আগে/পরে লেখা থাকে।'],
    days: ['কত দিন', 'কোর্সের দিন। অ্যান্টিবায়োটিকে কোর্স শেষ করা জরুরি।'],
    adv: ['উপদেশ', 'খাবার, বিশ্রাম, কী এড়াবেন ও কোন লক্ষণে জরুরি যেতে হবে।'],
    fu: ['ফলো-আপ', 'কবে আবার দেখাবেন। ওষুধ কাজ করছে কিনা ও নতুন সমস্যা দেখার জন্য।'],
    sig: ['সই ও সিল', 'প্রেসক্রিপশনকে বৈধ করে। ছাড়া ফার্মেসি দিতে না-ও পারে।']
  };
  function rxHtml(rx) {
    var d = rx.dr, L = rx.lines.map(function (l, n) { var p = F.PRODUCTS[l.p]; return '<div class="hf-rl">' + bn(n + 1) + '. <span class="t" data-k="drug">' + p.g + ' ' + p.st + ' ' + p.form + '</span> — <span class="t" data-k="dose">' + (l.pat ? F.patText(l.pat) : esc(l.show || '')) + '</span> ' + (l.when ? '(' + esc(l.when) + ') ' : '') + '× <span class="t" data-k="days">' + (l.days != null ? bn(l.days) + ' দিন' : '— দিন লেখা নেই —') + '</span></div>'; }).join('');
    return '<div class="hf-rx"><div class="hf-rx-h t" data-k="hd"><b>' + esc(d.n) + '</b><br>' + esc(d.deg) + ' · ' + esc(d.reg) + '</div><div class="hf-rx-r"><span class="t" data-k="pt"><b>' + esc(rx.pt.n) + '</b> · ' + bn(rx.pt.age) + ' বছর · ' + esc(rx.pt.sex) + (rx.pt.kg ? ' · ' + bn(rx.pt.kg) + ' কেজি' : '') + '</span><br><span class="hp-mut">তারিখ ' + F.dateText(rx.date) + '</span></div>' +
      '<div class="hf-rx-r">রোগনির্ণয়: <span class="t" data-k="dx">' + esc(rx.dx) + '</span><br>অ্যালার্জি: <span class="t" data-k="al">' + esc(rx.allergy) + '</span></div><div class="hf-rx-sym t" data-k="rx">℞</div>' + L +
      '<div class="hf-rx-r">উপদেশ: <span class="t" data-k="adv">' + esc((rx.advice || []).join('; ')) + '</span><br>ফলো-আপ: <span class="t" data-k="fu">' + esc(rx.fu) + '</span></div><div class="hf-rx-s t" data-k="sig">✍️ ' + esc(d.n) + '</div></div>';
  }
  IX.rxread = function (el, R, s, i) {
    var seen = {}, quizOk = false, c = R.v.case; P.rx = { id: c.id, ts: Date.now() }; K.save();
    el.innerHTML = rxHtml(R.rx) + '<div class="hf-rxe" id="hfRxe"><b>👆 যেকোনো অংশে ট্যাপ করুন</b><span>৩টি অংশের অর্থ দেখুন ও নিচের প্রশ্নের উত্তর দিন।</span></div><div id="hfRq"></div>';
    function chk() { if (Object.keys(seen).length >= 3 && quizOk) ready(i); }
    el.onclick = function (e) { var t = e.target.closest('.t'); if (!t) return; var k = t.dataset.k, x = RXEX[k]; $$('.t', el).forEach(function (n) { n.classList.toggle('on', n.dataset.k === k); }); $('#hfRxe').innerHTML = '<b>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span>'; seen[k] = 1; chk(); };
    var l0 = R.rx.lines.filter(function (l) { return l.pat; })[0], tot = l0.pat.reduce(function (a, b) { return a + b; }, 0);
    ask($('#hfRq'), 'প্রেসক্রিপশনে “' + F.patText(l0.pat) + '” লেখা থাকলে দিনে মোট কয়টি খাবেন?', uniq([bn(tot) + 'টি', bn(tot + 1) + 'টি', bn(tot + 2) + 'টি', bn(Math.max(1, tot - 1)) + 'টি']).slice(0, 3), 0, F.patText(l0.pat) + ' = সকাল + দুপুর + রাত = ' + bn(tot) + 'টি।', function () { quizOk = true; chk(); });
  };

  /* ফার্মেসি: প্রেসক্রিপশন যাচাই */
  IX.rxcheck = function (el, R, s, i) {
    var rx = R.rx, def = rx.defect, O = [['ok', 'সব ঠিক আছে, ওষুধ দেওয়া যায়'], ['allergy', 'অ্যালার্জির সাথে ওষুধ মিলছে না'], ['dup', 'একই উপাদান দুই ওষুধে আছে'], ['nodur', 'কোর্সের দিন লেখা নেই'], ['sig', 'ডাক্তারের সই বা নিবন্ধন নেই']], right = def || 'ok';
    el.innerHTML = rxHtml(rx) + '<div class="hp-quiz"><b>🔍 যাচাই করে বলুন: কোনো সমস্যা আছে কি?</b><div class="hp-opts v" id="hfRo">' + O.map(function (o) { return '<button type="button" class="hp-opt" data-o="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div></div><p class="hp-fb" id="hfRf"></p><div id="hfRd"></div>';
    var f = $('#hfRf');
    function checklist() {
      var items = [['রোগীর নাম-বয়স', 1], ['ডাক্তারের নাম ও নিবন্ধন', 1], ['তারিখ', 1], ['ওষুধের নাম-শক্তি-মাত্রা', 1], ['কত দিন (অ্যান্টিবায়োটিকে জরুরি)', def !== 'nodur'], ['অ্যালার্জির সাথে মিল', def !== 'allergy'], ['একই উপাদান দুইবার নেই', def !== 'dup'], ['সই', 1]];
      return '<ul class="hf-chk">' + items.map(function (x) { return '<li class="' + (x[1] ? 'y' : 'n') + '">' + (x[1] ? '✔' : '✘') + ' ' + x[0] + '</li>'; }).join('') + '</ul>';
    }
    function decide() {
      var box = $('#hfRd'); box.innerHTML = '<div class="hp-quiz"><b>☎️ এখন কী করবেন?</b></div><div id="hfRdq"></div>';
      ask($('#hfRdq'), 'সমস্যাযুক্ত প্রেসক্রিপশন পেলে সঠিক কাজ কোনটি?', ['ডাক্তারকে ফোন করে নিশ্চিত হয়ে সংশোধিত নির্দেশ নেওয়া', 'নিজের আন্দাজে অন্য ওষুধ দিয়ে দেওয়া', 'যেমন লেখা আছে তেমনই দিয়ে দেওয়া'], 0, 'আন্দাজে বদলানো বা চুপচাপ দিয়ে দেওয়া দুটোই বিপজ্জনক। প্রেসক্রিপশনের মালিক চিকিৎসক, তাঁকে জানিয়ে সংশোধন নিতে হয়।', function () {
        R.rx = Object.assign({}, rx, { lines: rx.fixLines, defect: null }); R.rxDoc = DOC.rx(R.rx); call(function (S) { S.refresh && S.refresh(R.rxDoc); });
        box.insertAdjacentHTML('beforeend', '<p class="hp-fb good">☎️ ' + esc(rx.fixNote) + ' এখন থেকে সংশোধিত প্রেসক্রিপশন ধরে কাজ চলবে।</p>'); ready(i);
      });
    }
    $('#hfRo').onclick = function (e) {
      var b = e.target.closest('.hp-opt'); if (!b || b.disabled) return;
      if (b.dataset.o === right) {
        $$('#hfRo .hp-opt').forEach(function (x) { x.disabled = true; }); b.classList.add('ok');
        fb(f, true, def ? '✔ ধরেছেন! ' + esc(F.PH_DEFECT[def].why) : '✔ সব তথ্য ঠিক আছে। নাম, ডোজ, দিন, অ্যালার্জির সাথে মিল, সব যাচাই হলো।'); f.insertAdjacentHTML('afterend', checklist());
        if (def) decide(); else ready(i);
      } else { b.disabled = true; b.classList.add('no'); R.mistakes++; fb(f, false, '✘ আবার ভালো করে প্রেসক্রিপশন পড়ুন: অ্যালার্জি, দিন-সংখ্যা ও একই উপাদান।'); }
    };
  };

  /* ফার্মেসি: শেলফ */
  IX.shelf = function (el, R, s, i) {
    var rx = R.rx, boxes = R.shelf, got = {}, sel = -1, need = rx.lines.length;
    el.innerHTML = '<div class="hf-need"><b>দরকার:</b>' + rx.lines.map(function (l, n) { var p = F.PRODUCTS[l.p]; return '<span class="hf-nd" data-n="' + n + '">' + p.g + ' ' + p.st + '</span>'; }).join('') + '</div><p class="hp-mut">৩D শেলফের বাক্সে ট্যাপ করুন (বা নিচের তালিকা থেকে):</p><div class="hf-shl">' + boxes.map(function (b, k) { var p = F.PRODUCTS[b.p]; return '<button type="button" class="hf-sb" data-k="' + k + '"><i style="background:' + p.c + '"></i><b>' + p.g.split(' ')[0] + '</b><small>' + p.st + ' · EXP ' + F.monthYear(b.exp) + '</small></button>'; }).join('') + '</div><div class="hf-box" id="hfBox"><span class="hp-mut">বাক্স বাছুন…</span></div><p class="hp-fb" id="hfSf"></p>';
    function show(k) {
      sel = k; var b = boxes[k], p = F.PRODUCTS[b.p]; $$('.hf-sb', el).forEach(function (x) { x.classList.toggle('on', +x.dataset.k === k); }); call(function (S) { S.select(k); });
      $('#hfBox').innerHTML = '<b>' + p.g + ' ' + p.st + '</b> · ' + p.form + '<br><span class="hp-mut">ব্যাচ ' + b.batch + ' · মেয়াদ ' + F.monthYear(b.exp) + ' · ' + p.tag + '</span><div class="hp-nav"><button type="button" class="hp-btn pri" id="hfTake">✔ এটি নিন</button></div>';
    }
    R.shelfSelect = show;
    ST_pick(function (id) { var m = /^sb(\d+)$/.exec(id || ''); if (m) show(+m[1]); });
    el.onclick = function (e) {
      var b = e.target.closest('.hf-sb'); if (b) { show(+b.dataset.k); return; }
      if (e.target.id !== 'hfTake' || sel < 0 || got[sel]) return; var bo = boxes[sel], f = $('#hfSf'), p = F.PRODUCTS[bo.p], li = -1;
      rx.lines.forEach(function (l, n) { if (l.p === bo.p && !got['L' + n]) li = n; });
      if (li >= 0 && !bo.expired) {
        got[sel] = 1; got['L' + li] = 1; $$('.hf-nd', el)[li].classList.add('ok'); call(function (S) { S.take(sel); }); $$('.hf-sb', el)[sel].disabled = true; $('#hfBox').innerHTML = '<span class="hp-mut">বাক্স বাছুন…</span>';
        fb(f, true, '✔ ' + p.g + ' ' + p.st + ': নাম, শক্তি ও মেয়াদ (' + F.monthYear(bo.exp) + ') ঠিক।'); if (Object.keys(got).filter(function (x) { return x[0] === 'L'; }).length === need) ready(i);
      } else {
        R.mistakes++; call(function (S) { S.shake(sel); });
        fb(f, false, bo.expired ? '✘ মেয়াদ উত্তীর্ণ (' + F.monthYear(bo.exp) + ')। মেয়াদোত্তীর্ণ ওষুধ কখনোই নয়, একই নামের মেয়াদি বাক্স খুঁজুন।' : '✘ এটি প্রেসক্রিপশনের ওষুধ নয়, বা শক্তি/জেনেরিক মেলে না (' + p.g + ' ' + p.st + ')। প্রেসক্রিপশন আবার পড়ুন।');
      }
    };
  };
  function ST_pick(fn) { var st = K.st(); if (st && st.V) st.V.onPick = function (h) { if (h && h.ob) fn(h.ob.id); }; }

  /* ফার্মেসি: পরিমাণ */
  IX.qty = function (el, R, s, i) {
    var lines = R.rx.lines.filter(function (l) { return F.qtyOf(l) != null; }), left = lines.length;
    el.innerHTML = lines.map(function (l, n) { var p = F.PRODUCTS[l.p]; return '<div class="hf-q" data-n="' + n + '"></div>'; }).join('');
    lines.forEach(function (l, n) {
      var p = F.PRODUCTS[l.p], q = F.qtyOf(l), sum = l.pat ? l.pat.reduce(function (a, b) { return a + b; }, 0) : 1, cand = uniq([q, l.days || q + 1, q + sum, Math.max(1, q - sum), q + 2 * sum, q * 2]).filter(function (x) { return x > 0; }), opts = cand.slice(0, 4);
      if (opts.indexOf(q) < 0) opts[0] = q; var holder = $$('.hf-q', el)[n];
      var txt = l.pat ? p.g + ' ' + p.st + ': ' + F.patText(l.pat) + ' × ' + bn(l.days) + ' দিন = কত ' + p.unit + '?' : p.g + ': কয়টি ' + p.unit + '?';
      ask(holder, txt, opts.map(function (o) { return bn(o) + ' ' + p.unit; }), opts.indexOf(q), l.pat ? 'দিনে ' + bn(sum) + ' × ' + bn(l.days) + ' দিন = ' + bn(q) + '।' : 'তরল ওষুধ: ১ বোতল (২০০ মিলি) পুরো কোর্সের জন্য যথেষ্ট।', function () { call(function (S) { S.pills && S.pills(p.unit === 'বোতল' ? 0 : q, p.c); }); if (--left === 0) ready(i); });
    });
  };

  /* ফার্মেসি: লেবেল ও কাউন্সেলিং */
  var WRONG_USE = ['খাবারের সাথে চিবিয়ে খান; ভালো লাগলে ২য় দিনেই বন্ধ করুন', 'প্রয়োজন হলে যত খুশি খান, কোনো সীমা নেই', 'অন্য সব ওষুধের সাথে গুঁড়ো করে মিশিয়ে খান', 'ফ্রিজে রেখে ঠান্ডা অবস্থায় বোতল শুদ্ধ খান'];
  IX.label = function (el, R, s, i) {
    var lines = R.rx.lines, left = lines.length;
    el.innerHTML = lines.map(function (l, n) { return '<div class="hf-q" data-n="' + n + '"></div>'; }).join('');
    lines.forEach(function (l, n) {
      var p = F.PRODUCTS[l.p], q = F.qtyOf(l), other = lines.filter(function (x) { return x.p !== l.p; }).map(function (x) { return F.PRODUCTS[x.p].use; }).filter(Boolean)[0], wr = shuffle(WRONG_USE).slice(0, other ? 1 : 2); if (other) wr.push(other);
      ask($$('.hf-q', el)[n], p.g + ' ' + p.st + ': রোগীকে কী বলবেন?', [p.use].concat(wr), 0, 'এটাই সঠিক নির্দেশ।', function () { call(function (S) { S.refresh(DOC.label(R.rx, l, q)); S.setColor && S.setColor(p.c); }); if (--left === 0) ready(i); });
    });
  };

  /* ফার্মেসি: বিল */
  IX.pbill = function (el, R, s, i) {
    var lines = R.rx.lines.filter(function (l) { return F.qtyOf(l) != null; }), tot = F.rxTotal(lines), given = [100, 200, 500, 1000, 2000].filter(function (g) { return g > tot; })[0] || Math.ceil((tot + 1) / 500) * 500;
    setDoc(DOC.pbill(R.rx, lines, null));
    el.innerHTML = '<div class="hf-bill">' + lines.map(function (l) { var p = F.PRODUCTS[l.p], q = F.qtyOf(l); return '<div class="hf-bl"><span>' + p.g + ' ' + p.st + ' <small>(' + bn(q) + ' × ' + tk(p.mrp) + ')</small></span><b>' + tk(q * p.mrp) + '</b></div>'; }).join('') + '</div><div id="hfP1"></div><div id="hfP2"></div>';
    ask($('#hfP1'), 'মোট বিল কত?', uniq([tot, tot + 10, tot - 20, tot + 35]).map(tk), 0, lines.map(function (l) { return tk(F.qtyOf(l) * F.PRODUCTS[l.p].mrp); }).join(' + ') + ' = ' + tk(tot), function () {
      ask($('#hfP2'), 'গ্রাহক ' + tk(given) + ' দিলেন। কত খুচরো ফেরত?', uniq([given - tot, given - tot + 10, given - tot - 10, given - tot + 50]).map(tk), 0, tk(given) + ' − ' + tk(tot) + ' = ' + tk(given - tot), function () {
        call(function (S) { S.pay && S.pay().then(function () { S.refresh(DOC.pbill(R.rx, lines, given)); }); }); ready(i);
      });
    });
  };

  /* ---------------- চালক ---------------- */
  function startRun(def, init) {
    K.clearTimers(); var st = K.st(); if (st && st.V) st.V.destroy();
    FR = { def: def, steps: def.steps, i: -1, mistakes: 0, q: {}, done: {}, locs: {}, token: 0, v: Object.assign({ placed: {} }, init || {}), sc: null, rx: null, rxDoc: null, shelf: null };
    var R = FR; if (def.id === 'er') R.v.triage = F.pickTriage();
    if (def.id === 'opd') { R.rx = F.rxOf(R.v.case.id); R.v.tokenNo = 13 + Math.floor(Math.random() * 4); }
    if (def.id === 'ph') { R.rx = F.rxOf(R.v.phId); R.rxDoc = DOC.rx(R.rx); }
    var body = $('#hpBody');
    body.innerHTML = '<button type="button" class="hp-back" id="hpBack">← ফিরে যান</button><div class="hp-run"><div id="hpStageHost"></div><div class="hp-panel" id="hpPanel"></div></div>'; body.onclick = null; $('#hpBack').onclick = K.render;
    K.mkStage($('#hpStageHost')); var S0 = K.st(); S0.loc = { floor: 0, x: H.ENTRANCE.x, z: 0 }; K.showFloor(0, null); K.spawnAv([H.ENTRANCE.x, 0]);
    goStep(0);
  }
  function roomOf(go, R) { if (!go) return null; if (go === '$dept') go = R.v.dept || 'opd101'; else if (go === '$bedroom') go = F.BEDS[R.v.bed || 'ward'].room; return H.ROOM[go]; }
  function goStep(i) {
    var R = FR, s = R.steps[i]; if (!s) return; R.i = i; R.token++; R.step = s; R.sc = null; R.doc = null; var tkn = R.token, st = K.st();
    var dots = R.steps.map(function (x, k) { return '<i class="' + (k < i ? 'd' : k === i ? 'c' : '') + '"></i>'; }).join(''), room = roomOf(s.go, R), tgt = room ? room.id : null, gated = s.ix && !R.done[i];
    $('#hpPanel').innerHTML = '<div class="hp-card"><div class="hp-steps">' + dots + '</div><div class="hp-sn">' + R.def.ic + ' ধাপ ' + bn(i + 1) + ' / ' + bn(R.steps.length) + '</div><h3>' + esc(s.t) + '</h3>' +
      (room ? '<div class="hp-loc">📍 ' + room.ic + ' ' + esc(room.n) + ' · ' + esc(H.dirText(room)) + '</div>' : '') + '<p>' + esc(s.do) + '</p>' +
      '<details class="hp-why" open><summary>কেন এভাবে?</summary><p>' + esc(s.why) + '</p>' + (s.fact ? '<p class="hf-fact">💡 ' + esc(s.fact) + '</p>' : '') + '</details><div id="hpIx"></div><div id="hpQ"></div>' +
      '<div class="hp-nav"><button type="button" class="hp-btn" id="hpPrev"' + (i === 0 ? ' disabled' : '') + '>◀ আগের</button>' + (s.anim ? '<button type="button" class="hp-btn" id="hpRe">↻ আবার দেখুন</button>' : '') + '<button type="button" class="hp-btn pri" id="hpNext"' + (gated ? ' disabled' : '') + '>' + (i === R.steps.length - 1 ? 'শেষ করুন ✔' : 'পরের ধাপ ▶') + '</button></div></div>';
    $('#hpPrev').onclick = function () { goStep(i - 1); }; $('#hpNext').onclick = function () { if (i === R.steps.length - 1) finish(); else goStep(i + 1); };
    if ($('#hpRe')) $('#hpRe').onclick = function () { play(s); };
    if (s.anim === 'shelf' && !R.shelf) R.shelf = F.shelfFor(R.rx.lines);
    if (s.ix) { try { IX[s.ix]($('#hpIx'), R, s, i); } catch (e) { console.error('ix', s.ix, e); } }
    if (s.q) quiz(s, i);
    var ps = Promise.resolve();
    if (tgt) { var l0 = R.locs[i] || (R.locs[i] = JSON.parse(JSON.stringify(st.loc))); ps = ps.then(function () { if (st.mode !== 'map' || !st.av) { K.showFloor(l0.floor, tgt); K.spawnAv([l0.x, l0.z]); st.loc = l0; } K.say('🚶 ' + room.n + ' এর দিকে যাচ্ছেন', 3000); return K.travel(tgt); }).then(function (ok) { if (ok) K.say('✅ ' + room.n, 2500); }); }
    if (s.anim) ps.then(function () { if (tkn !== R.token) return; return K.sleep(tgt ? 500 : 0); }).then(function () { if (tkn !== R.token) return; play(s); });
    else if (!tgt && st.mode !== 'map') ps.then(function () { K.showFloor(st.loc.floor, null); K.spawnAv([st.loc.x, st.loc.z]); });
  }
  function play(s) {
    var st = K.st(), f = SC[s.anim]; if (!st || !f) return; st.mode = 'close'; st.lift.hidden = true;
    try { FR.sc = f(K.bound(st.V), FR); } catch (e) { console.error('flow anim', s.anim, e); FR.sc = null; return; }
    if (FR.doc && FR.sc && FR.sc.refresh) FR.sc.refresh(FR.doc);
    if (s.anim === 'triage') applyPlaced();
    if (s.anim === 'shelf') ST_pick(function (id) { var m = /^sb(\d+)$/.exec(id || ''); if (m && FR.shelfSelect) FR.shelfSelect(+m[1]); });
  }
  function quiz(s, i) {
    var R = FR, q = s.q, el = $('#hpQ'); ask(el, q.q, q.o, q.a, q.e, function () { R.q[i] = 1; });
  }
  var TAKE = {
    er: ['ট্রায়াজে সবচেয়ে অসুস্থ আগে। ABCD ও ভাইটালই ভিত্তি।', 'জীবন-সংকটে আগে চিকিৎসা, কাগজ ও বিল পরে।', 'MIST হ্যান্ডওভারে তথ্য হারায় না।'],
    adm: ['ভর্তির আগে আনুমানিক খরচ ও বেডের ধরন জানুন।', 'চূড়ান্ত বিল লাইন ধরে মিলিয়ে নিন, শুধু মোটে সই নয়।', 'রশিদ ও ডিসচার্জ সামারি যত্নে রাখুন।'],
    opd: ['পরিষ্কার, নির্দিষ্ট ও সত্যি ইতিহাস বলুন, বিশেষ করে অ্যালার্জি।', 'প্রেসক্রিপশনের নাম-শক্তি-মাত্রা-দিন বুঝে নিন।', 'ফলো-আপে যান ও কোর্স শেষ করুন।'],
    ph: ['ফার্মাসিস্ট চিকিৎসার শেষ নিরাপত্তা-প্রহরী: যাচাই, মেয়াদ, শক্তি।', 'সন্দেহ হলে ডাক্তারকে ফোন করুন, আন্দাজে বদলাবেন না।', 'প্রেসক্রিপশন ছাড়া অ্যান্টিবায়োটিক নয়।']
  };
  function finish() {
    var R = FR, d = R.def, f = K.award('fl_' + d.id, R.mistakes, d.xp);
    var next = d.id === 'opd' ? '<button type="button" class="hp-btn pri" id="hfToPh">💊 এই প্রেসক্রিপশন নিয়ে ফার্মেসিতে যান ▶</button>' : '';
    $('#hpPanel').innerHTML = '<div class="hp-card hp-res"><h3>🎉 ' + d.ic + ' যাত্রা শেষ</h3><div class="big">' + K.starHtml(f.st) + '</div><p>ভুল উত্তর: <b>' + bn(R.mistakes) + '</b> · <b>+' + bn(f.xp) + ' XP</b>' + (f.first ? '' : ' (আবার করার জন্য কম XP)') + '</p><ul class="hf-take">' + TAKE[d.id].map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' + (f.aw && f.aw.newBadges && f.aw.newBadges.length ? '<p>' + f.aw.newBadges.map(function (b) { return b.icon + ' ' + esc(b.name); }).join(', ') + '</p>' : '') +
      '<div class="hp-nav"><button type="button" class="hp-btn" id="hpAgain">↻ আবার</button>' + next + '<button type="button" class="hp-btn' + (next ? '' : ' pri') + '" id="hpHome">তালিকায় ফিরুন</button></div></div>';
    $('#hpAgain').onclick = function () { begin(d.id, R.v.case ? { case: R.v.case } : R.v.phId ? { phId: R.v.phId } : null); }; $('#hpHome').onclick = K.render;
    if ($('#hfToPh')) $('#hfToPh').onclick = function () { startRun(F.JOURNEYS.ph, { phId: R.v.case.id }); };
  }

  /* ---------------- তালিকা ও শুরুর বাছাই ---------------- */
  function begin(id, init) {
    var d = F.JOURNEYS[id];
    if (id === 'opd' && !(init && init.case)) return chooseOpd();
    if (id === 'ph' && !(init && init.phId)) return choosePh();
    startRun(d, init);
  }
  function chooseOpd() {
    var body = $('#hpBody'); body.innerHTML = '<button type="button" class="hp-back" id="hpBack">← ফিরে যান</button><div class="hp-card"><h3>🎫 আজ কার ভূমিকায় যাবেন?</h3><p class="hp-mut">একটি কেস বাছুন। আপনি সেই রোগী হিসেবে রিসেপশন থেকে ডাক্তার পর্যন্ত যাবেন ও প্রেসক্রিপশন পাবেন।</p><div class="hf-grid">' + F.OPD_CASES.map(function (c) { return '<button type="button" class="hf-jc" data-c="' + c.id + '"><span class="ic">' + c.ic + '</span><b>' + esc(c.n) + ' (' + bn(c.age) + ')</b><small>' + esc(c.title) + '</small></button>'; }).join('') + '</div></div>';
    $('#hpBack').onclick = K.render; body.onclick = function (e) { var b = e.target.closest('.hf-jc'); if (b) { body.onclick = null; startRun(F.JOURNEYS.opd, { case: F.caseById(b.dataset.c) }); } };
  }
  function choosePh() {
    var body = $('#hpBody'), mine = P.rx && F.caseById(P.rx.id), all = F.PH_CASES.map(function (c) { return c.id; });
    body.innerHTML = '<button type="button" class="hp-back" id="hpBack">← ফিরে যান</button><div class="hp-card"><h3>💊 কোন প্রেসক্রিপশন নিয়ে কাজ করবেন?</h3><p class="hp-mut">আপনি ফার্মাসিস্ট। গ্রাহক প্রেসক্রিপশন দিয়েছেন, ঠিক ওষুধ দেওয়া আপনার দায়িত্ব।</p><div class="hf-grid">' +
      (mine ? '<button type="button" class="hf-jc" data-p="' + mine.id + '"><span class="ic">🎫</span><b>আমার OPD-র প্রেসক্রিপশন</b><small>' + esc(mine.n) + ': ' + esc(mine.title) + '</small></button>' : '') +
      '<button type="button" class="hf-jc" data-p="rand"><span class="ic">🎲</span><b>এলোমেলো কেস</b><small>যেকোনো একটি প্রেসক্রিপশন</small></button><button type="button" class="hf-jc" data-p="bad"><span class="ic">🕵️</span><b>ভুল খুঁজুন চ্যালেঞ্জ</b><small>প্রেসক্রিপশনে সমস্যা লুকানো</small></button></div></div>';
    $('#hpBack').onclick = K.render; body.onclick = function (e) { var b = e.target.closest('.hf-jc'); if (!b) return; var p = b.dataset.p; if (p === 'rand') p = pick(all); else if (p === 'bad') p = pick(['x1', 'x2', 'x3']); body.onclick = null; startRun(F.JOURNEYS.ph, { phId: p }); };
  }
  function renderFlow() {
    var body = $('#hpBody'), J = F.JOURNEYS;
    body.innerHTML = '<div class="hp-card hp-intro"><div><h3>🚑 রোগীর যাত্রা: হাসপাতালের অনুভূতি</h3><p class="hp-mut">একজন রোগীর চোখে হাসপাতাল: জরুরি বিভাগ, ভর্তি-বিল-ডিসচার্জ, OPD ও ফার্মেসি। প্রতিটি যাত্রায় ৩D দৃশ্য, আসল কাগজ (টোকেন, রশিদ, প্রেসক্রিপশন), ছোট সিদ্ধান্তের খেলা ও “কেন এভাবে” ব্যাখ্যা আছে। OPD শেষ করলে সেই প্রেসক্রিপশন ফার্মেসিতে যায়।</p></div></div><div class="hf-grid">' +
      Object.keys(J).map(function (k) { var j = J[k], d = P.done['fl_' + k]; return '<button type="button" class="hf-jc" data-j="' + k + '"><span class="ic">' + j.ic + '</span><b>' + esc(j.n) + '</b><small>' + esc(j.d) + '</small><span class="hf-meta">' + bn(j.steps.length) + ' ধাপ' + (d ? ' · ' + K.starHtml(d.st) : '') + '</span></button>'; }).join('') + '</div>';
    body.onclick = function (e) { var b = e.target.closest('.hf-jc'); if (b) { body.onclick = null; begin(b.dataset.j); } };
  }

  K.addTab('flow', '🚑 রোগীর যাত্রা', renderFlow);
  window.GEBFlow = { IX: IX, begin: begin, state: function () { return FR; } };
})();
