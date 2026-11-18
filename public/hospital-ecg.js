/* GEB Hub: ECG শিখুন (v3.18, v3.19: অক্ষ, ১২-লিড, বান্ডল ব্লক)
   ৪টি অংশ: শিখুন (তরঙ্গের অংশ, ১৫ রিদমের লাইব্রেরি), রিদম চিনুন, রেট বের করুন, রেকর্ডিং ও আর্টিফ্যাক্ট। স্ট্রিপ কোডে আঁকা (২৫ মিমি/সে., ১০ মিমি/mV)। */
(function () {
  'use strict';
  var K = window.GEBHospKit, C = window.GEBCareer, E = window.GEBHospECG; if (!K || !C || !E) return;
  var esc = K.esc, bn = K.bn, $ = K.$, $$ = K.$$, S = C.S, shuffle = C.shuffle;
  var sub = 'learn', lib = 'nsr', hlPart = null, uid = 0;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- ECG কাগজ আঁকা ---------- */
  function strip(cv, sig, o) {
    o = o || {}; var pps = o.pps || 150, mv = o.mv || 60, W = Math.round(sig.dur * pps), H = o.h || 240, dpr = Math.min(2, window.devicePixelRatio || 1), x = cv.getContext('2d'), sm = pps * 0.04, y0 = H / 2, my = ++uid;
    cv.width = W * dpr; cv.height = H * dpr; cv.dataset.uid = my; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', o.alt || 'ECG স্ট্রিপ');
    function paint(xmax) {
      x.setTransform(dpr, 0, 0, dpr, 0, 0); x.fillStyle = '#fff6f3'; x.fillRect(0, 0, W, H);
      x.lineWidth = 1; x.strokeStyle = '#f5d0cb'; x.beginPath(); for (var g = 0; g <= W; g += sm) { x.moveTo(g + .5, 0); x.lineTo(g + .5, H); } for (g = 0; g <= H; g += sm) { x.moveTo(0, g + .5); x.lineTo(W, g + .5); } x.stroke();
      x.strokeStyle = '#e29a96'; x.beginPath(); for (g = 0; g <= W; g += sm * 5) { x.moveTo(g + .5, 0); x.lineTo(g + .5, H); } for (g = 0; g <= H; g += sm * 5) { x.moveTo(0, g + .5); x.lineTo(W, g + .5); } x.stroke();
      if (o.hl) { x.fillStyle = 'rgba(40,110,220,.18)'; x.fillRect(o.hl[0] * pps, 0, (o.hl[1] - o.hl[0]) * pps, H); x.strokeStyle = 'rgba(40,110,220,.7)'; x.lineWidth = 1.5; x.strokeRect(o.hl[0] * pps, 1, (o.hl[1] - o.hl[0]) * pps, H - 2); }
      x.strokeStyle = '#15202b'; x.lineWidth = 1.7; x.lineJoin = 'round'; x.beginPath(); var st = false;
      for (var i = 0; i < sig.n; i++) { var px = i / sig.fs * pps; if (px > xmax) break; var py = y0 - sig.y[i] * mv; if (!st) { x.moveTo(px, py); st = true; } else x.lineTo(px, py); }
      x.stroke();
      if (o.labels) { x.font = '600 15px "Hind Siliguri",system-ui,sans-serif'; x.fillStyle = '#0b4f9c'; x.textAlign = 'center'; o.labels.forEach(function (l) { x.fillText(l.text, l.t * pps, l.y); }); }
      x.font = '12px system-ui,sans-serif'; x.fillStyle = '#7a5551'; x.textAlign = 'left'; x.fillText((o.lead || 'লিড II') + ' · ২৫ মিমি/সে. · ১০ মিমি/mV', 6, 14);
    }
    if (o.sweep && !reduce) {
      var t0 = null, dur = 1800; (function step(ts) { if (!cv.isConnected || cv.dataset.uid !== String(my)) return; if (t0 === null) t0 = ts; var f = Math.min(1, (ts - t0) / dur); paint(f * W); if (f < 1) requestAnimationFrame(step); })(performance.now());
    } else paint(W + 10);
  }
  function canvasHtml(extra) { return '<div class="ec-wrap"><canvas class="ec-cv"' + (extra || '') + '></canvas></div>'; }

  /* ---------- ধাপে ধাপে প্রশ্ন-চালক ---------- */
  function seq(el, steps, fin) {
    var i = 0, mistakes = 0;
    function show() {
      if (i >= steps.length) return fin(mistakes);
      el.innerHTML = '<div class="hp-steps">' + steps.map(function (s, k) { return '<i class="' + (k < i ? 'd' : '') + '"></i>'; }).join('') + '</div><p class="hp-sn">প্রশ্ন ' + bn(i + 1) + '/' + bn(steps.length) + '</p><div class="ec-step"></div>';
      steps[i]($('.ec-step', el), function (m) { mistakes += m || 0; i++; show(); });
    }
    show();
  }
  function endCard(el, id, mistakes, xp, perfectKey, back) {
    var f = K.award(id, mistakes, xp); if (perfectKey && mistakes === 0) S.ecg[perfectKey]++; var got = C.done(f.st);
    el.innerHTML = '<div class="hp-card hp-res"><h3>🎉 শেষ</h3><div class="big">' + K.starHtml(f.st) + '</div><p>ভুল: <b>' + bn(mistakes) + '</b> · <b>+' + bn(f.xp) + ' XP</b>' + (f.first ? '' : ' (আবার করার জন্য কম XP)') + '</p>' + (got.length ? '<p class="hd-got">' + got.map(esc).join('<br>') + '</p>' : '') + '<div class="hp-nav"><button type="button" class="hp-btn pri" id="ecAgain">↻ আবার</button><button type="button" class="hp-btn" id="ecHome">ECG মেনু</button></div></div>';
    $('#ecAgain').onclick = back; $('#ecHome').onclick = function () { sub = 'learn'; render(); };
  }

  /* ---------- শিখুন ---------- */
  function tabLearn(box) {
    var r = E.rhyById(lib);
    box.innerHTML = '<div class="hp-card"><h4>📖 একটি হার্টবিট, পাঁচটি অংশ</h4><p class="hp-mut">অংশে ট্যাপ করুন: স্ট্রিপে জায়গাটি আলাদা হবে। ছোট ঘর = ০.০৪ সেকেন্ড, বড় ঘর (৫ ছোট) = ০.২ সেকেন্ড।</p>' + canvasHtml(' id="ecBeat"') +
      '<div class="ec-parts">' + E.PARTS.map(function (p) { return '<button type="button" class="hp-btn sm' + (hlPart === p.k ? ' pri' : '') + '" data-p="' + p.k + '">' + p.n + '</button>'; }).join('') + '</div><p class="hp-fb good" id="ecPd">' + (hlPart ? esc(E.PARTS.filter(function (p) { return p.k === hlPart; })[0].d) : 'একটি অংশ বাছুন।') + '</p></div>' +
      '<div class="hp-card"><h4>🔍 ECG পড়ার ৬ ধাপ</h4><ol class="hf-take">' + E.STEPS.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol></div>' +
      '<div class="hp-card"><h4>⚡ ইলেকট্রোলাইট ও ECG</h4><ul class="hf-take">' + E.ELEC.map(function (x) { return '<li><b>' + esc(x.n) + ':</b> ' + esc(x.d) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="hp-card"><h4>📚 ' + bn(E.RHY.length) + ' রিদমের লাইব্রেরি</h4><div class="ec-lib">' + E.RHY.map(function (x) { return '<button type="button" class="hp-rm' + (x.id === lib ? ' on' : '') + '" data-l="' + x.id + '">' + esc(x.n) + '</button>'; }).join('') + '</div>' + canvasHtml(' id="ecLib"') +
      '<p><b>' + esc(r.n) + '</b> <span class="hp-mut">(' + esc(r.en) + ') · রেট: ' + esc(r.rate) + '</span></p><ul class="hf-take">' + r.feats.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul><p>🩺 <b>চিকিৎসক:</b> ' + esc(r.doc) + '</p><p>💉 <b>নার্স:</b> ' + esc(r.nur) + '</p></div>';
    var sig = E.ecgSignal('nsr', { seed: 1, dur: 2, rr: 0.8 }), tR = sig.beats[0], reg = { P: [tR - 0.2, tR - 0.11], PR: [tR - 0.2, tR - 0.04], QRS: [tR - 0.05, tR + 0.06], ST: [tR + 0.06, tR + 0.15], T: [tR + 0.15, tR + 0.38] };
    strip($('#ecBeat'), sig, { pps: 300, mv: 90, h: 220, hl: hlPart ? reg[hlPart] : null, alt: 'একটি নরমাল হার্টবিট', labels: [{ t: tR - 0.155, y: 70, text: 'P' }, { t: tR + 0.02, y: 196, text: 'QRS' }, { t: tR + 0.27, y: 70, text: 'T' }] });
    strip($('#ecLib'), E.ecgSignal(lib, { seed: 4 }), { sweep: true, lead: r.lead, alt: r.n + ' স্ট্রিপ' });
    box.onclick = function (e) { var p = e.target.closest('[data-p]'), l = e.target.closest('[data-l]'); if (p) { hlPart = hlPart === p.dataset.p ? null : p.dataset.p; tabLearn(box); } else if (l) { lib = l.dataset.l; tabLearn(box); } };
  }

  /* ---------- রিদম চিনুন ---------- */
  function rhythmOpts(r) { var pool = r.like.slice(); shuffle(E.RHY).forEach(function (x) { if (pool.length < 3 && x.id !== r.id && pool.indexOf(x.id) < 0) pool.push(x.id); }); var ids = shuffle(pool).slice(0, 3).concat(r.id); return shuffle(ids).map(E.rhyById); }
  function tabRhythm(box) {
    var role = C.role(), list = shuffle(E.RHY).slice(0, 8), steps = [];
    list.forEach(function (r, qi) {
      steps.push(function (el, next) {
        var opts = rhythmOpts(r), m = 0, first = true;
        el.innerHTML = '<p class="hp-mut">' + esc(r.vig) + '</p>' + canvasHtml() + '<div class="hp-opts v">' + opts.map(function (o) { return '<button type="button" class="hp-opt" data-i="' + o.id + '">' + esc(o.n) + '</button>'; }).join('') + '</div><p class="hp-fb" role="status"></p><div id="ecQ2"></div>';
        strip($('canvas', el), E.ecgSignal(r.id, { seed: 100 + qi * 7 + Math.floor(Math.random() * 50) }), { sweep: true, lead: r.lead, alt: 'অজানা রিদমের স্ট্রিপ' });
        var f = $('.hp-fb', el), done = false;
        el.onclick = function (e) {
          var b = e.target.closest('.hp-opt[data-i]'); if (!b || done || b.disabled) return;
          if (b.dataset.i === r.id) {
            done = true; b.classList.add('ok'); $$('.hp-opt[data-i]', el).forEach(function (x) { x.disabled = true; }); f.className = 'hp-fb good'; f.innerHTML = '✔ ' + esc(r.n) + ': ' + esc(r.feats[0]) + '।';
            C.ans('ecg', first); if (first) S.ecg.seen[r.id] = 1; if (!first) m++; K.save();
            second(el, r, role, function (m2) { var nb = document.createElement('div'); nb.className = 'hp-nav'; nb.innerHTML = '<button type="button" class="hp-btn pri">' + (qi === list.length - 1 ? 'ফল দেখুন' : 'পরবর্তী ▶') + '</button>'; el.appendChild(nb); nb.firstChild.onclick = function () { next(m + m2); }; });
          } else { first = false; b.disabled = true; b.classList.add('no'); C.ans('ecg', false); f.className = 'hp-fb bad'; f.textContent = '✘ ঠিক হয়নি। রেট, রেগুলারিটি, P ও QRS-এর প্রস্থ আবার দেখুন।'; }
        };
      });
    });
    box.innerHTML = '<div class="hp-card"><h4>🎯 রিদম চিনুন (৮টি)</h4><p class="hp-mut">রোগীর বিবরণ ও স্ট্রিপ দেখে রিদম চিনুন। তারপর আপনার ভূমিকার (' + esc(C.roleInfo().n) + ') ' + (role === 'tech' ? 'রেকর্ডিং-দক্ষতার প্রশ্ন' : 'প্রথম পদক্ষেপ') + ' বাছুন।</p></div><div id="ecRun" class="hp-card"></div>';
    seq($('#ecRun'), steps, function (m) { endCard($('#ecRun'), 'ecg_rhythm', m, 60, null, function () { render(); }); });
  }
  function second(el, r, role, done) {
    var q2 = $('#ecQ2', el), q;
    if (role === 'tech') q = E.REC_Q[Math.floor(Math.random() * E.REC_Q.length)];
    else {
      var key = role === 'doctor' ? 'doc' : 'nur', dis = shuffle(E.RHY.filter(function (x) { return x.grp !== r.grp; })).slice(0, 2).map(function (x) { return x[key]; }), o = shuffle([r[key]].concat(dis));
      q = { q: role === 'doctor' ? 'এই রিদমে চিকিৎসকের প্রথম সিদ্ধান্ত?' : 'এই রিদমে নার্সের প্রথম কাজ?', o: o, a: o.indexOf(r[key]), e: r[key] };
    }
    var m = 0; C.ask(q2, q, null, function (first) { if (!first) m++; done(m); });
    /* ask নিজে ভুলের সংখ্যা জানায় না, তাই ভুল-গোনা চালু রাখতে ক্লিক শোনা */
    q2.addEventListener('click', function () { });
  }

  /* ---------- রেট বের করুন ---------- */
  function tabRate(box) {
    var set = E.rateSet(Math.floor(Math.random() * 900) + 1), steps = set.map(function (q) {
      return function (el, next) {
        var sig = q.kind === 'reg' ? E.ecgSignal('nsr', { seed: q.seed, rr: q.boxes * 0.2 }) : E.ecgSignal('af', { seed: q.seed }), m = 0;
        el.innerHTML = '<p class="hp-mut">' + (q.kind === 'reg' ? 'নিয়মিত রিদম: দুটি পরপর R-র মাঝে কত বড় ঘর? রেট = ৩০০ ÷ ঘর।' : 'অনিয়মিত রিদম: এই ৬ সেকেন্ডের স্ট্রিপে QRS গুনে ১০ দিয়ে গুণ করুন।') + '</p>' + canvasHtml() + '<div id="ecRq"></div>';
        strip($('canvas', el), sig, { alt: 'রেট নির্ণয়ের স্ট্রিপ' });
        C.ask($('#ecRq', el), { q: 'হার্ট রেট প্রায় কত (প্রতি মিনিটে)?', o: q.opts.map(function (o) { return bn(o); }), a: q.a, e: q.kind === 'reg' ? '৩০০ ÷ ' + bn(q.boxes) + ' বড় ঘর = ' + bn(q.rate) + '/মি।' : bn(q.n) + ' QRS × ১০ = ' + bn(q.rate) + '/মি।' }, 'ecg', function (first) { if (!first) m++; var nb = document.createElement('div'); nb.className = 'hp-nav'; nb.innerHTML = '<button type="button" class="hp-btn pri">পরবর্তী ▶</button>'; $('#ecRq', el).appendChild(nb); nb.firstChild.onclick = function () { next(m); }; });
      };
    });
    box.innerHTML = '<div class="hp-card"><h4>🧮 রেট বের করুন (৪টি)</h4><p class="hp-mut">তিনটি নিয়মিত স্ট্রিপে ৩০০-এর নিয়ম, একটি অনিয়মিত স্ট্রিপে ৬-সেকেন্ড পদ্ধতি। ৩০০ ÷ ১.৫ = ২০০, ÷২ = ১৫০, ÷৩ = ১০০, ÷৪ = ৭৫, ÷৫ = ৬০, ÷৬ = ৫০।</p></div><div id="ecRun" class="hp-card"></div>';
    seq($('#ecRun'), steps, function (m) { endCard($('#ecRun'), 'ecg_rate', m, 50, 'rate', function () { render(); }); });
  }

  /* ---------- রেকর্ডিং ও আর্টিফ্যাক্ট ---------- */
  function tabRec(box) {
    var ids = shuffle(E.ART_IDS), steps = [];
    ids.forEach(function (a, i) {
      steps.push(function (el, next) {
        var m = 0, names = E.ART_IDS.map(function (x) { return E.ARTS[x].n; });
        el.innerHTML = '<p class="hp-mut">' + (a === 'leadoff' ? 'রোগী সজাগ, কথা বলছে, কিন্তু মনিটরে হঠাৎ প্রায় সরলরেখা।' : 'রোগী স্থির, কিন্তু রেকর্ডিং পরিষ্কার নয়।') + '</p>' + canvasHtml() + '<div id="ecA1"></div><div id="ecA2"></div>';
        strip($('canvas', el), E.ecgSignal('nsr', { seed: 40 + i * 3, art: a }), { sweep: true, alt: 'আর্টিফ্যাক্টসহ ECG' });
        var o = shuffle(names);
        C.ask($('#ecA1', el), { q: 'রেকর্ডিংয়ে কী সমস্যা?', o: o, a: o.indexOf(E.ARTS[a].n), e: E.ARTS[a].n + '।' }, null, function (f1) {
          if (!f1) m++; var fx = shuffle(E.ART_IDS.filter(function (x) { return x !== a; })).slice(0, 2).map(function (x) { return E.ARTS[x].fix; }), o2 = shuffle([E.ARTS[a].fix].concat(fx));
          C.ask($('#ecA2', el), { q: 'কীভাবে ঠিক করবেন?', o: o2, a: o2.indexOf(E.ARTS[a].fix), e: E.ARTS[a].fix }, null, function (f2) { if (!f2) m++; var nb = document.createElement('div'); nb.className = 'hp-nav'; nb.innerHTML = '<button type="button" class="hp-btn pri">পরবর্তী ▶</button>'; $('#ecA2', el).appendChild(nb); nb.firstChild.onclick = function () { next(m); }; });
        });
      });
    });
    shuffle(E.REC_Q).slice(0, 3).forEach(function (q) { steps.push(function (el, next) { C.ask(el, q, null, function (f) { var nb = document.createElement('div'); nb.className = 'hp-nav'; nb.innerHTML = '<button type="button" class="hp-btn pri">পরবর্তী ▶</button>'; el.appendChild(nb); nb.firstChild.onclick = function () { next(f ? 0 : 1); }; }); }); });
    box.innerHTML = '<div class="hp-card"><h4>🔌 রেকর্ডিং ও আর্টিফ্যাক্ট (৭টি)</h4><p class="hp-mut">ভালো ECG-র জন্য ইলেকট্রোড, রোগীর অবস্থান ও যন্ত্রের সেটিং ঠিক রাখা নার্স-টেকনিশিয়ানের দায়িত্ব। প্রথম চারটিতে আর্টিফ্যাক্ট চিনে ঠিক করুন, শেষ তিনটিতে ইলেকট্রোড বসানো।</p></div><div id="ecRun" class="hp-card"></div>';
    seq($('#ecRun'), steps, function (m) { endCard($('#ecRun'), 'ecg_rec', m, 50, 'art', function () { render(); }); });
  }

  /* ---------- অক্ষ (axis) ---------- */
  function tabAxis(box) {
    var set = E.axisSet(Math.floor(Math.random() * 900) + 1), steps = set.map(function (q) {
      return function (el, next) {
        var m = 0;
        el.innerHTML = '<p class="hp-mut">লিড I ও aVF-এর QRS দেখুন: মূলত ওপরে (ধনাত্মক) না নিচে (ঋণাত্মক)?</p>' + canvasHtml(' data-l="i"') + canvasHtml(' data-l="v"') + '<div id="ecAx"></div>';
        strip($('[data-l="i"]', el), E.ecgSignal('nsr', { seed: q.seed, dur: 3, qrs: q.i === 'neg' ? 'neg' : null }), { lead: 'লিড I', h: 130, mv: 45, alt: 'লিড I' });
        strip($('[data-l="v"]', el), E.ecgSignal('nsr', { seed: q.seed + 1, dur: 3, qrs: q.avf === 'neg' ? 'neg' : null }), { lead: 'লিড aVF', h: 130, mv: 45, alt: 'লিড aVF' });
        C.ask($('#ecAx', el), { q: 'অক্ষ কেমন?', o: E.AXIS_OPTS, a: q.a, e: E.AXIS[q.a].e }, 'ecg', function (first) { if (!first) m++; var nb = document.createElement('div'); nb.className = 'hp-nav'; nb.innerHTML = '<button type="button" class="hp-btn pri">পরবর্তী ▶</button>'; $('#ecAx', el).appendChild(nb); nb.firstChild.onclick = function () { next(m); }; });
      };
    });
    box.innerHTML = '<div class="hp-card"><h4>🧭 অক্ষ (axis): ৬টি</h4><p class="hp-mut">সরল নিয়ম: I ও aVF <b>দুটোই ধনাত্মক = স্বাভাবিক</b>; I ধনাত্মক + aVF ঋণাত্মক = বামে; I ঋণাত্মক + aVF ধনাত্মক = ডানে; দুটোই ঋণাত্মক = চরম। (বামে সন্দেহে লিড II-ও দেখুন।)</p></div><div id="ecRun" class="hp-card"></div>';
    seq($('#ecRun'), steps, function (m) { endCard($('#ecRun'), 'ecg_axis', m, 50, 'axis', function () { render(); }); });
  }

  /* ---------- ১২-লিড ও দেয়াল ---------- */
  function tabTwelve(box) {
    var grid = [['I', 'aVR', 'V1', 'V4'], ['II', 'aVL', 'V2', 'V5'], ['III', 'aVF', 'V3', 'V6']], qs = shuffle(E.TERR_Q);
    box.innerHTML = '<div class="hp-card"><h4>🫀 ১২-লিডের নকশা</h4><p class="hp-mut">১২টি লিড হৃদয়কে ১২টি কোণ থেকে দেখে। একই দেয়ালের পাশাপাশি লিডে ST একসাথে ওঠে।</p><table class="lb-tb ec-grid" aria-label="১২-লিডের বিন্যাস"><tbody>' + grid.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>' +
      '<table class="lb-tb"><thead><tr><th>লিড</th><th>দেয়াল</th><th>ধমনী</th></tr></thead><tbody>' + E.TERR.map(function (t) { return '<tr><td>' + esc(t.leads) + '</td><td>' + esc(t.wall) + '</td><td>' + esc(t.art) + '</td></tr>'; }).join('') + '</tbody></table></div><div id="ecRun" class="hp-card"></div>';
    var steps = qs.map(function (q) { return function (el, next) { var m = 0; C.ask(el, q, 'ecg', function (f) { if (!f) m++; var nb = document.createElement('div'); nb.className = 'hp-nav'; nb.innerHTML = '<button type="button" class="hp-btn pri">পরবর্তী ▶</button>'; el.appendChild(nb); nb.firstChild.onclick = function () { next(m); }; }); }; });
    seq($('#ecRun'), steps, function (m) { endCard($('#ecRun'), 'ecg_terr', m, 50, 'terr', function () { render(); }); });
  }

  function render() {
    var body = $('#hpBody'); var s = S.ecg, acc = s.n ? Math.round(100 * s.ok / s.n) : 0;
    body.innerHTML = C.roleBar() + '<div class="hp-card hp-intro"><div><h3>💓 ECG শিখুন</h3><p class="hp-mut">রিদম চেনা: <b>' + bn(Object.keys(s.seen).length) + '/' + bn(E.RHY.length) + '</b> · নির্ভুলতা: <b>' + (s.n ? bn(acc) + '%' : '—') + '</b> (' + bn(s.n) + ' উত্তর)</p></div></div><div class="seg tabs hd-sub" role="tablist" aria-label="ECG অংশ">' +
      [['learn', '📖 শিখুন'], ['rhythm', '🎯 রিদম'], ['rate', '🧮 রেট'], ['axis', '🧭 অক্ষ'], ['twelve', '🫀 ১২-লিড'], ['rec', '🔌 রেকর্ডিং']].map(function (t) { return '<button type="button" role="tab" data-s="' + t[0] + '" aria-selected="' + (t[0] === sub) + '">' + t[1] + '</button>'; }).join('') + '</div><div id="ecBox" class="hp-body"></div>';
    C.bindRoleBar(body);
    $('.hd-sub', body).onclick = function (e) { var b = e.target.closest('button'); if (b) { sub = b.dataset.s; render(); C.top(); } };
    var box = $('#ecBox'); ({ learn: tabLearn, rhythm: tabRhythm, rate: tabRate, axis: tabAxis, twelve: tabTwelve, rec: tabRec })[sub](box);
  }

  K.addTab('ecg', '💓 ECG শিখুন', render);
  window.GEBEcgUI = { strip: strip };
})();
