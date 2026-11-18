/* GEB Hub: AI ল্যাব সহায়ক (v3.13)। ল্যাবের পাশে ভাসমান 🤖 বাটন → চ্যাট প্যানেল।
   - পর্দায় এখন কোন ল্যাব/পরীক্ষণ/ধাপ খোলা, শেষ বার্তা কী (ভুল হলে সেটাও), তা DOM থেকে পড়ে AI-কে প্রসঙ্গ হিসেবে পাঠায়।
   - সার্ভারে key না থাকলে (/api/lab-chat-status → on:false) বাটন তৈরিই হয় না। কোনো চ্যাট সার্ভারে জমা হয় না।
   - ইতিহাস শুধু এই ট্যাবের sessionStorage-এ (ট্যাব বন্ধ করলে মুছে যায়)। */
(function () {
  'use strict';
  var Core = window.VLAiCore, mount = document.getElementById('vlabMount'), sec = document.getElementById('vlab');
  if (!Core || !mount || !sec) return;
  var KEY = 'geb_vlab_ai_v1', H = [], busy = false, started = false, notice = '', el = {}, tick = null, lastFocus = null;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clean = function (t, n) { return String(t || '').replace(/\s+/g, ' ').trim().slice(0, n || 300); };
  try { var saved = JSON.parse(sessionStorage.getItem(KEY)); if (saved && Array.isArray(saved.h)) H = saved.h.filter(function (m) { return m && (m.r === 'u' || m.r === 'a') && typeof m.t === 'string'; }).slice(-12); } catch (e) { }
  function persist() { try { sessionStorage.setItem(KEY, JSON.stringify({ h: H })); } catch (e) { } }

  /* ---------- পর্দা থেকে প্রসঙ্গ ---------- */
  function ctx() {
    var c = { lab: '', exp: '', step: '', stepNo: 0, total: 0, steps: [], input: '', msg: '', isErr: false, done: false };
    var tabEl = $('#vlTabs [aria-selected="true"]'), labs = (window.VLab && window.VLab.labs) || [];
    if (tabEl) { var L = labs.filter(function (l) { return l.id === tabEl.dataset.t; })[0]; c.lab = L ? L.n : clean(tabEl.textContent, 60); }
    var run = $('#vlRun'); if (!run || !run.children.length) return c;
    var h = $('.vl-side h3', run) || $('h3', run) || $('h2', run); c.exp = h ? clean(h.textContent, 140) : '';
    var lis = $$('.vl-steps li', run); c.steps = lis.map(function (li) { var s = $('span', li); return clean(s ? s.textContent : li.textContent, 160); });
    c.total = lis.length; var ci = -1; lis.forEach(function (li, i) { if (li.classList.contains('cur')) ci = i; });
    if (ci >= 0) { c.stepNo = ci + 1; c.step = c.steps[ci]; } else if (lis.length) { c.done = true; c.stepNo = lis.length; }
    var inp = $('.vl-in', run); c.input = inp ? clean(inp.textContent, 300) : '';
    if (!lis.length) c.input = clean(run.textContent, 300);
    var m = $('.vl-msg', run); if (m) { c.msg = clean(m.textContent, 400); c.isErr = m.classList.contains('err'); }
    return c;
  }
  function ctxLabel(c) {
    if (!c.exp) return c.lab ? c.lab + ' ল্যাব' : 'ভার্চুয়াল ল্যাব';
    var bn = function (n) { return String(n).replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'[d]; }); };
    return c.exp + (c.total ? ' · ধাপ ' + bn(c.done ? c.total : c.stepNo) + '/' + bn(c.total) : '');
  }

  /* ---------- UI ---------- */
  function bubble(role, html, by, cls) {
    var d = document.createElement('div'); d.className = 'ai-m ' + role + (cls ? ' ' + cls : ''); d.innerHTML = html;
    if (by) { var s = document.createElement('small'); s.textContent = 'by ' + by; d.appendChild(s); }
    el.list.appendChild(d); el.list.scrollTop = el.list.scrollHeight; return d;
  }
  function paintChips() {
    var c = Core.chips(ctx()); el.chips.innerHTML = c.map(function (x, i) { return '<button type="button" class="ai-chip" data-i="' + i + '">' + Core.esc(x.l) + '</button>'; }).join(''); el.chips._c = c;
  }
  function paintCtx() { var c = ctx(); el.ctx.textContent = '📍 ' + ctxLabel(c); }
  function welcome() { bubble('a', '<p>নমস্কার! আমি আপনার ল্যাব সহায়ক। কোনো ধাপে আটকে গেলে বা কোনো কিছু বুঝতে না পারলে জিজ্ঞেস করুন। আমি ইঙ্গিত দিয়ে পথ দেখাব, পুরো উত্তর বলে দেব না।</p>'); }
  function render() { el.list.innerHTML = ''; welcome(); H.forEach(function (m) { bubble(m.r === 'u' ? 'u' : 'a', m.r === 'u' ? '<p>' + Core.esc(m.t) + '</p>' : Core.fmt(m.t)); }); }
  function setBusy(b) { busy = b; el.go.disabled = b; el.tx.disabled = b; el.panel.classList.toggle('busy', b); }
  function grow() { el.tx.style.height = 'auto'; el.tx.style.height = Math.min(el.tx.scrollHeight, 110) + 'px'; }

  function ask(q) {
    q = String(q || '').trim(); if (!q || busy) return;
    if (!navigator.onLine) { bubble('a', '<p>ইন্টারনেট নেই। AI সহায়কের জন্য নেট লাগে (ল্যাব নিজে অফলাইনেও চলে)।</p>', '', 'err'); return; }
    var before = H; H = Core.push(H, 'u', q); bubble('u', '<p>' + Core.esc(q) + '</p>'); el.tx.value = ''; grow(); setBusy(true);
    var typing = bubble('a', '<span class="ai-dots" aria-label="ভাবছি"><i></i><i></i><i></i></span>', '', 'typing');
    var ac = typeof AbortController === 'function' ? new AbortController() : null, to = setTimeout(function () { if (ac) ac.abort(); }, 60000);
    fetch('/api/lab-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: H, ctx: ctx() }), signal: ac ? ac.signal : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'AI এখন উত্তর দিতে পারছে না'); return j; }); })
      .then(function (j) { typing.remove(); H = Core.push(H, 'a', j.reply); bubble('a', Core.fmt(j.reply), j.by); persist(); })
      .catch(function (e) {
        typing.remove(); H = before; el.tx.value = q; grow();   // প্রশ্নটি ফেরত দিই, যাতে আবার চাপলেই চলে
        bubble('a', '<p>' + Core.esc(e && e.name === 'AbortError' ? 'উত্তর আসতে বেশি সময় লাগছে, আবার চেষ্টা করুন।' : (e && e.message) || 'সংযোগে সমস্যা হয়েছে') + '</p>', '', 'err');
      })
      .then(function () { clearTimeout(to); setBusy(false); paintChips(); paintCtx(); if (!el.panel.hidden && window.matchMedia && matchMedia('(pointer:fine)').matches) el.tx.focus(); });
  }
  function open() {
    if (!el.panel.hidden) return; lastFocus = document.activeElement; el.panel.hidden = false; el.fab.setAttribute('aria-expanded', 'true'); el.fab.classList.add('open');
    if (!started) { started = true; render(); } paintCtx(); paintChips(); el.note.textContent = notice || ''; el.note.hidden = !notice;
    tick = setInterval(function () { if (!busy) { paintCtx(); paintChips(); } }, 1500);
    el.list.scrollTop = el.list.scrollHeight; if (window.matchMedia && matchMedia('(pointer:fine)').matches) el.tx.focus();
  }
  function close() {
    if (el.panel.hidden) return; el.panel.hidden = true; el.fab.setAttribute('aria-expanded', 'false'); el.fab.classList.remove('open'); clearInterval(tick); tick = null;
    try { (lastFocus && lastFocus.focus ? lastFocus : el.fab).focus(); } catch (e) { }
  }
  function build() {
    el.fab = document.createElement('button'); el.fab.type = 'button'; el.fab.id = 'vlAiFab'; el.fab.className = 'ai-fab'; el.fab.setAttribute('aria-label', 'AI ল্যাব সহায়ক খুলুন'); el.fab.setAttribute('aria-expanded', 'false'); el.fab.setAttribute('aria-controls', 'vlAi');
    el.fab.innerHTML = '<span aria-hidden="true">🤖</span><b>AI সহায়ক</b>';
    el.panel = document.createElement('div'); el.panel.id = 'vlAi'; el.panel.className = 'ai-sheet'; el.panel.hidden = true; el.panel.setAttribute('role', 'dialog'); el.panel.setAttribute('aria-label', 'AI ল্যাব সহায়ক');
    el.panel.innerHTML = '<div class="ai-hd"><div class="ai-t"><b>🤖 AI ল্যাব সহায়ক</b><span class="ai-ctx" id="aiCtx"></span></div><button type="button" class="ai-ic" id="aiReset" aria-label="নতুন চ্যাট শুরু" title="নতুন চ্যাট">↺</button><button type="button" class="ai-ic" id="aiX" aria-label="বন্ধ করুন">✕</button></div>' +
      '<div class="ai-list" id="aiList" role="log" aria-live="polite"></div><div class="ai-chips" id="aiChips"></div><div class="ai-note" id="aiNote" hidden></div>' +
      '<div class="ai-in"><textarea id="aiTx" rows="1" maxlength="800" placeholder="প্রশ্ন লিখুন…" aria-label="আপনার প্রশ্ন"></textarea><button type="button" class="btn pri" id="aiGo">পাঠান</button></div>';
    document.body.appendChild(el.fab); document.body.appendChild(el.panel);
    el.list = $('#aiList', el.panel); el.chips = $('#aiChips', el.panel); el.ctx = $('#aiCtx', el.panel); el.note = $('#aiNote', el.panel); el.tx = $('#aiTx', el.panel); el.go = $('#aiGo', el.panel);
    el.fab.addEventListener('click', function () { el.panel.hidden ? open() : close(); });
    $('#aiX', el.panel).addEventListener('click', close);
    $('#aiReset', el.panel).addEventListener('click', function () { if (busy) return; H = []; persist(); render(); paintChips(); });
    el.go.addEventListener('click', function () { ask(el.tx.value); });
    el.tx.addEventListener('input', grow);
    el.tx.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(el.tx.value); } });
    el.chips.addEventListener('click', function (e) { var b = e.target.closest('.ai-chip'); if (!b || !el.chips._c) return; var c = el.chips._c[+b.dataset.i]; if (c) ask(c.q); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !el.panel.hidden) close(); });
    if ('IntersectionObserver' in window) {   // ল্যাব সেকশন পর্দায় থাকলেই বাটন দেখাই
      var io = new IntersectionObserver(function (en) { en.forEach(function (x) { el.fab.classList.toggle('show', x.isIntersecting); }); }, { threshold: 0.04 }); io.observe(sec);
    } else el.fab.classList.add('show');
  }
  function check() {
    fetch('/api/lab-chat-status', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) { if (j && j.on && !el.fab) { notice = j.notice || ''; build(); } })
      .catch(function () { window.addEventListener('online', check, { once: true }); });
  }
  window.VLAi = { open: open, close: close, ask: function (q) { open(); ask(q); }, ctx: ctx };
  check();
})();
