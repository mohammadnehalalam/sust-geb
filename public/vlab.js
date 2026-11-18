/* GEB Hub: ভার্চুয়াল ল্যাব (v3.5), শেল।
   চারটি ল্যাব: মাইক্রোবায়োলজি, উদ্ভিদবিজ্ঞান, জেনারেল কেমিস্ট্রি, প্রাণিবিজ্ঞান। পরীক্ষণগুলো আছে vlab-micro/plant/chem/animal.js-এ।
   অগ্রগতি ব্রাউজারে (localStorage: geb_vlab_v1)। কোনো সার্ভার বা API লাগে না। XP গেম জোনের সাথে যুক্ত (GEBGM থাকলে)। */
(function () {
  'use strict';
  var mount = document.getElementById('vlabMount');
  if (!mount || !window.VL3D || !window.VLData) return;
  var KEY = 'geb_vlab_v1';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var bn = function (n) { return String(n).replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'[d]; }); };
  var toast = function (m) { if (window.__gebToast) window.__gebToast(m); };
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, VL3D.reduce ? 1 : ms); }); };
  function lsGet() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  var P = lsGet(); P.done = P.done || {};
  function save() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { } }

  var LABS = [
    { id: 'micro', ic: '🧫', n: 'মাইক্রোবায়োলজি', d: 'কালচার মিডিয়া, স্ট্রিক প্লেট, সিরিয়াল ডাইলুশন, ইনকিউবেটর, কলোনি কাউন্ট, গ্রাম স্টেইন ও ব্যাকটেরিয়া চেনা' },
    { id: 'plant', ic: '🌿', n: 'উদ্ভিদবিজ্ঞান', d: 'ফুল ও বীজের ডিসেকশন, স্লাইড তৈরি, মাইক্রোস্কোপে কোষ ও টিস্যু' },
    { id: 'chem', ic: '⚗️', n: 'জেনারেল কেমিস্ট্রি', d: 'অজানা লবণের ক্যাটায়ন ও অ্যানায়ন শনাক্তকরণ' },
    { id: 'animal', ic: '🐸', n: 'প্রাণিবিজ্ঞান', d: '১১টি প্রাণীর ৩D মডেল, ডাইকোটোমাস কি দিয়ে শনাক্তকরণ' }
  ];
  var EXPS = [], tab = 'micro', cur = null, lastScope = null;
  function register(e) { EXPS.push(e); }

  /* ---------- অগ্রগতি, XP ---------- */
  function stars(m) { return m === 0 ? 3 : m <= 2 ? 2 : 1; }
  function finish(exp, res) {
    var first = !P.done[exp.id], m = res.mistakes || 0, st = stars(m), xp = first ? Math.max(Math.round(exp.xp * (1 - m * .1)), Math.round(exp.xp * .4)) : 10;
    var old = P.done[exp.id] || {}; P.done[exp.id] = { st: Math.max(st, old.st || 0), n: (old.n || 0) + 1, ts: Date.now() }; save();
    var aw = null; try { if (window.GEBGM && GEBGM.award) aw = GEBGM.award({ xp: xp, session: 1 }); } catch (e) { }
    return { xp: xp, stars: st, first: first, aw: aw };
  }
  function starHtml(n) { return '<span class="vl-star" aria-label="' + n + ' তারা">' + '★'.repeat(n) + '<span class="off">' + '★'.repeat(3 - n) + '</span></span>'; }
  function resultHtml(exp, res, f) {
    return '<div class="vl-res"><h3>পরীক্ষণ শেষ ✔</h3><div class="big">' + starHtml(f.stars) + '</div><p>ভুল: <b>' + bn(res.mistakes || 0) + '</b> বার' + (res.hints ? ' · ইঙ্গিত: ' + bn(res.hints) + ' বার' : '') + ' · <b>+' + bn(f.xp) + ' XP</b>' + (f.first ? '' : ' (আবার করার জন্য কম XP)') + '</p>' +
      (res.lines && res.lines.length ? '<ul>' + res.lines.map(function (l) { return '<li>' + l + '</li>'; }).join('') + '</ul>' : '') +
      (f.aw && f.aw.newBadges && f.aw.newBadges.length ? '<p>' + f.aw.newBadges.map(function (b) { return b.icon + ' ' + esc(b.name); }).join(', ') + '</p>' : '') + '</div>';
  }

  /* ---------- ধাপে ধাপে ইঞ্জিন ---------- */
  function guided(root, exp, cfg) {
    var st = { i: 0, mistakes: 0, hints: 0, busy: false, done: false, S: {} }, steps = cfg.steps, V, api = {};
    root.innerHTML = '<div class="vl-exp"><div><div class="vl-stage" id="vlStage"><canvas class="vl-cv" aria-label="৩D ল্যাব: ঘোরাতে টানুন, জুম করতে স্ক্রল বা পিঞ্চ করুন"></canvas><div class="vl-hud"></div><div class="vl-zoomhint">টেনে ঘোরান · স্ক্রলে জুম</div></div><div class="vl-tools" role="toolbar" aria-label="যন্ত্রপাতি"></div></div>' +
      '<aside class="vl-side"><h3>' + esc(exp.title) + '</h3><ol class="vl-steps"></ol><div class="vl-msg" aria-live="polite"></div><div class="vl-in"></div><div class="vl-ctl"><button type="button" class="btn ghost sm" data-c="hint">ইঙ্গিত</button><button type="button" class="btn ghost sm" data-c="cam">ক্যামেরা রিসেট</button><button type="button" class="btn ghost sm" data-c="redo">আবার শুরু</button></div></aside></div>';
    var cv = $('.vl-cv', root), stage = $('#vlStage', root), tools = $('.vl-tools', root), list = $('.vl-steps', root), msg = $('.vl-msg', root), inp = $('.vl-in', root), hud = $('.vl-hud', root);
    V = VL3D.create(cv, cfg.cam || {}); api.V = V; api.root = root; api.sleep = sleep; api.hud = function (h) { hud.innerHTML = h || ''; };
    api.say = function (t, k) { msg.className = 'vl-msg' + (k ? ' ' + k : ''); msg.innerHTML = t; };
    api.mistake = function (t) { st.mistakes++; api.say('<b>ভুল:</b> ' + t, 'err'); stage.classList.remove('err'); void stage.offsetWidth; stage.classList.add('err'); };
    api.mistakes = function () { return st.mistakes; }; api.S = st.S; api.step = function () { return st.i; };
    function toolBtns() { tools.innerHTML = (cfg.tools || []).map(function (t) { return '<button type="button" class="vl-tool" data-tool="' + t.id + '">' + (t.ic || '') + ' ' + t.l + '</button>'; }).join(''); }
    function paintSteps() {
      list.innerHTML = steps.map(function (s, i) { return '<li class="' + (i < st.i ? 'done' : i === st.i ? 'cur' : '') + '"><i>' + (i < st.i ? '✓' : bn(i + 1)) + '</i><span>' + s.t + '</span></li>'; }).join('');
      var c = $('li.cur', list); if (c && c.scrollIntoView) { try { list.scrollTop = c.offsetTop - 60; } catch (e) { } }
    }
    function paintInput() {
      inp.innerHTML = ''; var s = steps[st.i]; if (!s || st.done) return;
      if (s.input) { inp.innerHTML = s.input.html(st.S, api); if (s.input.bind) s.input.bind(inp, api, st.S); }
      V.draw = s.draw ? s.draw(api, st.S) : null;
    }
    async function advance(payload) {
      var s = steps[st.i]; st.busy = true;
      try { if (s.run) await s.run(api, st.S, payload); } catch (e) { console.error(e); }
      st.i++; st.busy = false; paintSteps();
      if (st.i >= steps.length) return end();
      var n = steps[st.i]; api.say(n.d || n.t, 'info'); paintInput();
    }
    function end() {
      st.done = true; V.draw = null; var res = cfg.finish ? cfg.finish(api, st.S, st) : {}; res.mistakes = st.mistakes; res.hints = st.hints; var f = finish(exp, res);
      inp.innerHTML = ''; msg.className = 'vl-msg ok'; msg.innerHTML = resultHtml(exp, res, f); toast('পরীক্ষণ শেষ: +' + f.xp + ' XP');
    }
    api.act = function (tool, payload) {
      if (st.busy || st.done) return; var s = steps[st.i], ok = s.tool && (Array.isArray(s.tool) ? s.tool.indexOf(tool) >= 0 : s.tool === tool);
      if (ok) return advance(payload);
      var w = (s.wrong && s.wrong[tool]) || (cfg.why && cfg.why[tool]) || 'এখন এই ধাপ নয়। বর্তমান ধাপ: ' + s.t;
      api.mistake(w);
    };
    api.submit = function (v) {
      if (st.busy || st.done) return; var s = steps[st.i]; if (!s.check) return; var r = s.check(v, st.S, api);
      if (!r.ok) return api.mistake(r.msg || 'আবার চেষ্টা করো।'); if (r.msg) api.say(r.msg, 'ok'); advance(v);
    };
    function start() {
      st.i = 0; st.mistakes = 0; st.hints = 0; st.done = false; st.busy = false; Object.keys(st.S).forEach(function (k) { delete st.S[k]; });
      V.clear(); V.hooks = []; V.tweens = []; V.draw = null; V.onPick = null; V.onHover = null; V.overlay = null;
      var c = Object.assign({ yaw: .6, pitch: .5, dist: 14, target: [0, 1.5, 0] }, cfg.cam || {}); V.cam.yaw = c.yaw; V.cam.pitch = c.pitch; V.cam.dist = c.dist; V.cam.target = c.target.slice();
      V.onPick = function (h) { if (h && h.ob && h.ob.id && cfg.pick !== false) { var id = h.ob.id; if (cfg.onPick && cfg.onPick(id, h, api, st.S) === true) return; if ((cfg.tools || []).some(function (t) { return t.id === id; })) api.act(id); } };
      cfg.build(V, api, st.S); toolBtns(); paintSteps(); api.say(steps[0].d || steps[0].t, 'info'); paintInput();
    }
    root.addEventListener('click', function (e) {
      var t = e.target.closest('[data-tool]'); if (t) return api.act(t.dataset.tool);
      var c = e.target.closest('[data-c]'); if (!c) return;
      if (c.dataset.c === 'hint') { var s = steps[st.i]; if (!s || st.done) return; st.hints++; api.say('<b>ইঙ্গিত:</b> ' + (s.hint || s.d || s.t), 'info'); var tb = s.tool && $('[data-tool="' + (Array.isArray(s.tool) ? s.tool[0] : s.tool) + '"]', root); if (tb) { tb.classList.remove('pulse'); void tb.offsetWidth; tb.classList.add('pulse'); } }
      else if (c.dataset.c === 'cam') { var cc = Object.assign({ yaw: .6, pitch: .5, dist: 14, target: [0, 1.5, 0] }, cfg.cam || {}); V.camTo(cc, 500); }
      else if (c.dataset.c === 'redo') start();
    });
    api.restart = start; api.setCfg = function (c) { Object.assign(cfg, c); };
    start(); return { V: V, api: api, destroy: function () { V.destroy(); } };
  }

  /* ---------- মাইক্রোস্কোপ ভিউয়ার (২D) ---------- */
  /* o: {draw(ctx,S,w,h), mags:[4,10,40], mag, focus(bool), pins(S)→[{x,y,t}]} ; S: {mag, px, py, blur} */
  function scope(host, o) {
    var S = { mag: o.mag || o.mags[0], px: 0, py: 0, blur: o.focus ? 6 : 0, w: 520, h: 520 }, mags = o.mags;
    host.innerHTML = '<div class="vl-scope"><canvas width="520" height="520" aria-label="মাইক্রোস্কোপের দৃশ্য"></canvas><span class="mag"></span></div><div class="vl-scopebar"></div>' + (o.focus ? '<div class="vl-slider"><label for="vlFocus">ফোকাস</label><input id="vlFocus" type="range" min="0" max="100" value="12"><span class="vl-mini">স্পষ্ট না হওয়া পর্যন্ত ঘোরাও</span></div>' : '');
    var cv = $('canvas', host), ctx = cv.getContext('2d'), bar = $('.vl-scopebar', host), mg = $('.mag', host);
    var best = o.focus ? 55 + Math.floor(Math.random() * 20) : 0;
    function draw() { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, S.w, S.h); o.draw(ctx, S, S.w, S.h); cv.style.filter = S.blur > .3 ? 'blur(' + S.blur.toFixed(1) + 'px)' : 'none'; mg.textContent = S.mag + '×'; bar.querySelectorAll('[data-m]').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.m === S.mag)); }); if (o.onDraw) o.onDraw(S); }
    bar.innerHTML = mags.map(function (m) { return '<button type="button" class="fc sm" data-m="' + m + '">' + m + '×</button>'; }).join('');
    bar.addEventListener('click', function (e) { var b = e.target.closest('[data-m]'); if (!b) return; S.mag = +b.dataset.m; if (o.focus) S.blur = Math.min(7, Math.abs(+($('#vlFocus', host).value) - best) / 6 + 1.5); draw(); });
    if (o.focus) $('#vlFocus', host).addEventListener('input', function (e) { var d = Math.abs(+e.target.value - best); S.blur = d < 4 ? 0 : Math.min(7, d / 6); S.focused = d < 4; if (o.onFocus) o.onFocus(S.focused); draw(); });
    var drag = null; cv.addEventListener('pointerdown', function (e) { drag = [e.clientX, e.clientY]; cv.classList.add('drag'); cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', function (e) { if (!drag) return; var k = 2.2 / cv.clientWidth; S.px = Math.max(-1, Math.min(1, S.px - (e.clientX - drag[0]) * k)); S.py = Math.max(-1, Math.min(1, S.py - (e.clientY - drag[1]) * k)); drag = [e.clientX, e.clientY]; draw(); });
    cv.addEventListener('pointerup', function (e) { var moved = drag && Math.abs(e.clientX - drag[0]) + Math.abs(e.clientY - drag[1]) < 3; drag = null; cv.classList.remove('drag'); if (o.onClick) { var r = cv.getBoundingClientRect(); o.onClick((e.clientX - r.left) / r.width * S.w, (e.clientY - r.top) / r.height * S.h, S); } });
    cv.addEventListener('wheel', function (e) { e.preventDefault(); var i = mags.indexOf(S.mag), j = Math.max(0, Math.min(mags.length - 1, i + (e.deltaY < 0 ? 1 : -1))); S.mag = mags[j]; draw(); }, { passive: false });
    var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
    function magBtn(m) { return bar.querySelector('[data-m="' + m + '"]'); }
    var inst = { S: S, draw: draw, canvas: cv, host: host, mags: mags, parts: o.parts || null, quiz: !!o.quiz, canFocus: !!o.focus, setBlur: function (b) { S.blur = b; draw(); },
      /* ভয়েস/কোড থেকে নিয়ন্ত্রণ: মাগ্নিফিকেশন বাটনের আসল ক্লিক-লজিকই চলে */
      setMag: function (m) { var b = magBtn(m); if (!b || S.mag === m) return false; b.click(); return true; },
      step: function (d) { var j = clamp(mags.indexOf(S.mag) + d, 0, mags.length - 1); if (mags[j] === S.mag) return false; magBtn(mags[j]).click(); return mags[j]; },
      pan: function (dx, dy) { var ox = S.px, oy = S.py; S.px = clamp(S.px + dx, -1, 1); S.py = clamp(S.py + dy, -1, 1); draw(); return ox !== S.px || oy !== S.py; },
      focusBy: function (d) { var sl = $('#vlFocus', host); if (!sl) return false; sl.value = clamp(+sl.value + d, 0, 100); sl.dispatchEvent(new Event('input', { bubbles: true })); return true; },
      /* নির্দিষ্ট অংশকে (o.parts[].id) মাগ্নিফিকেশন m-এ ছবির মাঝখানে আনে; অংশের তথ্য-কার্ডও দেখায়। কেন্দ্রে আনতে সংখ্যাগত Jacobian (ছবির গঠন জানা লাগে না) */
      zoomTo: function (id, m) {
        if (!o.parts || o.quiz) return { ok: false, why: 'noparts' };
        if (m == null) m = mags[mags.length - 1]; var best = mags[0]; mags.forEach(function (x) { if (Math.abs(x - m) < Math.abs(best - m)) best = x; });
        if (S.mag !== best) magBtn(best).click(); draw();
        var cx = S.w / 2, cy = S.h / 2, A = S.A && S.A[id]; if (!A) return { ok: false, why: 'noanchor' };
        for (var it = 0; it < 4; it++) {
          A = S.A[id]; var ex = A[0] - cx, ey = A[1] - cy; if (Math.hypot(ex, ey) < 6) break;
          var px0 = S.px, py0 = S.py, d = .05; S.px = clamp(px0 + d, -1, 1); draw(); var jx = (S.A[id][0] - A[0]) / ((S.px - px0) || d);
          S.px = px0; S.py = clamp(py0 + d, -1, 1); draw(); var jy = (S.A[id][1] - A[1]) / ((S.py - py0) || d); S.px = px0; S.py = py0;
          if (Math.abs(jx) > 1e-3) S.px = clamp(px0 - ex / jx, -1, 1); if (Math.abs(jy) > 1e-3) S.py = clamp(py0 - ey / jy, -1, 1); draw();
        }
        if (o.onClick) { try { o.onClick(cx, cy, S); } catch (e) { } }
        return { ok: true, mag: S.mag };
      } };
    lastScope = inst; draw(); return inst;
  }

  /* ---------- শেল ---------- */
  function summary() { var n = EXPS.length, d = EXPS.filter(function (e) { return P.done[e.id]; }).length, s = 0; EXPS.forEach(function (e) { s += (P.done[e.id] || {}).st || 0; }); return { n: n, d: d, s: s }; }
  function renderHome() {
    cur = null; var lab = LABS.filter(function (l) { return l.id === tab; })[0], list = EXPS.filter(function (e) { return e.lab === tab; }), sm = summary();
    $('#vlBody').innerHTML = '<div class="vl-card vl-intro"><div><h3>' + lab.ic + ' ' + esc(lab.n) + ' ল্যাব</h3><p class="vl-mut">' + esc(lab.d) + '। প্রতিটি পরীক্ষণ ধাপে ধাপে করতে হয়; ভুল করলে কেন ভুল তা দেখাবে, আর আবার করা যাবে।</p></div><div class="vl-sum"><span><b>' + bn(sm.d) + '/' + bn(sm.n) + '</b>পরীক্ষণ সম্পন্ন</span><span><b>' + bn(sm.s) + '</b>★ মোট তারা</span></div></div>' +
      '<div class="vl-grid">' + list.map(function (e) { var d = P.done[e.id]; return '<button type="button" class="vl-ec" data-e="' + e.id + '"><div class="th">' + e.ic + '<em>' + esc(e.tag || '৩D') + '</em></div><div class="bd"><b>' + esc(e.title) + '</b><span>' + esc(e.desc) + '</span><div class="ft">' + (d ? '<span class="vl-done">✔ সম্পন্ন</span>' + starHtml(d.st) : '<span>+' + bn(e.xp) + ' XP</span>') + '</div></div></button>'; }).join('') + '</div>';
  }
  function open(id) {
    var exp = EXPS.filter(function (e) { return e.id === id; })[0]; if (!exp) return; cur = exp;
    var body = $('#vlBody'); body.innerHTML = '<div><button type="button" class="vl-back" data-a="back">‹ পরীক্ষণ তালিকা</button></div><div id="vlRun"></div>';
    var run = $('#vlRun'); try { exp.mount(run, { guided: function (cfg) { return guided(run, exp, cfg); }, scope: scope, finish: function (res) { return finish(exp, res); }, resultHtml: function (res, f) { return resultHtml(exp, res, f); } }); } catch (e) { console.error(e); run.innerHTML = '<p class="vl-no">এই পরীক্ষণ লোড করা যায়নি। পেজ রিফ্রেশ করে আবার চেষ্টা করুন।</p>'; }
    var sec = $('#vlab'); if (sec) window.scrollTo({ top: sec.getBoundingClientRect().top + window.scrollY - 64, behavior: 'smooth' });
  }
  function setTab(id) { if (!LABS.some(function (l) { return l.id === id; })) return false; tab = id; $$('#vlTabs [role="tab"]').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.t === id)); }); renderHome(); return true; }
  function shell() {
    mount.innerHTML = '<div class="seg tabs" id="vlTabs" role="tablist" aria-label="ল্যাব">' + LABS.map(function (l) { return '<button type="button" role="tab" data-t="' + l.id + '" aria-selected="' + (l.id === tab) + '">' + l.ic + ' ' + l.n + '</button>'; }).join('') + '</div><div class="vl-body" id="vlBody"></div>' +
      '<p class="vl-foot">ভার্চুয়াল ল্যাব শেখার সহায়ক; আসল ল্যাবের বিকল্প নয়। সব ফল পাঠ্যবই-মানের সরলীকৃত। ল্যাবে ঢোকার আগে নিজের ম্যানুয়াল, নিরাপত্তা নিয়ম ও শিক্ষকের নির্দেশ আগে। সব ফ্রি, কোনো লগইন বা ইন্টারনেট ছাড়াই (একবার লোড হলে) চলে।</p>';
    renderHome();
    mount.addEventListener('click', function (e) {
      var t = e.target.closest('#vlTabs [role="tab"]'); if (t) return setTab(t.dataset.t);
      var c = e.target.closest('[data-e]'); if (c) return open(c.dataset.e);
      if (e.target.closest('[data-a="back"]')) renderHome();
    });
  }
  window.VLab = { activeScope: function () { return lastScope && lastScope.canvas.isConnected ? lastScope : null; }, list: function () { return EXPS.map(function (e) { return { id: e.id, lab: e.lab, title: e.title }; }); }, labs: LABS, open: open, setTab: setTab, home: function () { renderHome(); }, reopen: function () { if (cur) open(cur.id); }, state: function () { return { tab: tab, cur: cur && cur.id }; }, register: register, guided: guided, scope: scope, u: { $: $, $$: $$, esc: esc, bn: bn, sleep: sleep, toast: toast }, finish: finish, resultHtml: resultHtml, doneCount: function () { return summary().d; }, total: function () { return EXPS.length; } };
  setTimeout(shell, 0);
})();
