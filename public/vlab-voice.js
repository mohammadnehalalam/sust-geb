/* GEB Hub: ভার্চুয়াল ল্যাবে ভয়েস কমান্ড (v3.12)।
   মুখে বললেই ল্যাব নিজে কাজ করে: "Zoom in to the Cell Nucleus", "Mix Acid and Base", "জুম আউট", "বামে ঘোরাও", "ইঙ্গিত দাও", "১২৫ লেখো"।
   - বোঝার কাজ vlab-voice-core.js-এ (DOM ছাড়া, টেস্ট করা)। এই ফাইল: মাইক, পর্দার বাটন/ড্রপডাউন/স্কোপ/৩D ক্যামেরায় কাজটা চালানো, আর ফলাফল জানানো।
   - ভয়েস চেনে ব্রাউজারের Web Speech API (Chrome/Edge/Safari)। Chrome-এ এটি অডিও Google-এর সার্ভারে পাঠায়, তাই ইন্টারনেট লাগে। লিখে কমান্ড দেওয়ার ঘরটা সব ব্রাউজারে ও অফলাইনেও চলে।
   - ভুল শনাক্তে নম্বর/তারা যেন না কাটে: কম নিশ্চিত হলে আগে জিজ্ঞেস করে ("X বোঝালে? হ্যাঁ/না")। */
(function () {
  'use strict';
  var Core = window.VLVoiceCore, VLab = window.VLab, VL3D = window.VL3D, mount = document.getElementById('vlabMount');
  if (!Core || !VLab || !VL3D || !mount) return;
  try { Core.addAliases(Core.aliasesFromData(window.VLData)); } catch (e) { }
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var bnum = function (n) { return String(n).replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'[d]; }); };
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, VL3D.reduce ? 1 : ms); }); };
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition, KEY = 'geb_vlab_voice_v1';
  var pref = (function () { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })();
  var S = { on: false, want: false, lang: pref.lang === 'en' ? 'en' : 'bn', tts: !!pref.tts, rec: null, pending: null, pendTimer: 0, idle: 0, speaking: false, speakEnd: 0, hist: [], restarts: [], busy: false };
  function savePref() { try { localStorage.setItem(KEY, JSON.stringify({ lang: S.lang, tts: S.tts })); } catch (e) { } }
  var L = function (bn, en) { return S.lang === 'en' ? en : bn; };

  /* ================= UI ================= */
  var MIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
  var EQ = '<span class="vv-eq" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>';
  var bar = document.createElement('div'); bar.className = 'vv'; bar.id = 'vlVoice'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'ভয়েস কন্ট্রোল');
  bar.innerHTML = '<div class="vv-row"><button type="button" class="vv-mic" id="vvMic" aria-pressed="false" aria-label="ভয়েস কমান্ড চালু করো">' + MIC + EQ + '</button>' +
    '<div class="vv-main"><div class="vv-status" id="vvStatus" aria-live="polite"></div><div class="vv-heard" id="vvHeard"></div></div>' +
    '<button type="button" class="fc sm vv-more" id="vvMore" aria-expanded="false" aria-controls="vvPanel">কমান্ড ও সেটিং</button></div>' +
    '<div class="vv-chips" id="vvChips" aria-live="polite"></div>' +
    '<div class="vv-panel" id="vvPanel" hidden><div class="vv-opts"><span class="seg vv-lang" role="group" aria-label="ভয়েসের ভাষা"><button type="button" data-l="bn">বাংলা</button><button type="button" data-l="en">English</button></span>' +
    '<button type="button" class="fc sm" id="vvTts" aria-pressed="false">🔊 উত্তর শুনব</button></div>' +
    '<form class="vv-type" id="vvForm" autocomplete="off"><label class="sr" for="vvText">কমান্ড লিখুন</label><input class="fld" id="vvText" placeholder="লিখেও কমান্ড দেওয়া যায়: জুম ইন, NaOH দাও…"><button type="submit" class="btn ghost sm">চালাও</button></form>' +
    '<div class="vv-help" id="vvHelp"></div><p class="vl-mini vv-note">মুখের কথা চিনতে Chrome/Edge/Safari ইন্টারনেট ব্যবহার করে। মাইক শুধু আপনি চালু রাখলে শোনে (২ মিনিট কিছু না বললে নিজে বন্ধ হয়)। লিখে কমান্ড অফলাইনেও চলে।</p></div>';
  mount.parentNode.insertBefore(bar, mount);
  var el = { mic: $('#vvMic', bar), status: $('#vvStatus', bar), heard: $('#vvHeard', bar), chips: $('#vvChips', bar), panel: $('#vvPanel', bar), more: $('#vvMore', bar), form: $('#vvForm', bar), text: $('#vvText', bar), help: $('#vvHelp', bar), tts: $('#vvTts', bar) };
  function setStatus(t, k) { el.status.className = 'vv-status' + (k ? ' ' + k : ''); el.status.textContent = t; }
  function idleText() { return SR ? L('ভয়েস কমান্ড বন্ধ। মাইক চেপে বলুন, যেমন “জুম ইন”।', 'Voice commands are off. Tap the mic and say, e.g. “zoom in”.') : L('এই ব্রাউজারে মুখের কথা চেনা যায় না। নিচের ঘরে লিখে কমান্ড দিন (Chrome/Edge/Safari-তে ভয়েস চলে)।', 'This browser has no speech recognition. Type commands below (voice works in Chrome/Edge/Safari).'); }
  function paintOpts() {
    $$('[data-l]', bar).forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.l === S.lang)); b.classList.toggle('on', b.dataset.l === S.lang); });
    el.tts.setAttribute('aria-pressed', String(S.tts)); el.tts.textContent = L('🔊 উত্তর শুনব', '🔊 Speak replies');
    el.mic.setAttribute('aria-label', S.on ? L('ভয়েস কমান্ড বন্ধ করো', 'Stop voice commands') : L('ভয়েস কমান্ড চালু করো', 'Start voice commands'));
    el.more.textContent = L('কমান্ড ও সেটিং', 'Commands & settings'); el.text.placeholder = L('লিখেও কমান্ড দেওয়া যায়: জুম ইন, NaOH দাও…', 'You can type too: zoom in, add NaOH…');
    if (!S.on && !S.busy) setStatus(idleText());
  }
  function setListening(on) { S.on = on; el.mic.setAttribute('aria-pressed', String(on)); bar.classList.toggle('listening', on); paintOpts(); if (on) setStatus(L('শুনছি… বলুন', 'Listening… say a command')); }
  function remember(ok, text) { S.hist.unshift({ ok: ok, t: text }); S.hist = S.hist.slice(0, 3); }
  function showHeard(t, final) { el.heard.innerHTML = t ? (final ? '“' + esc(t) + '”' : '<span class="vv-interim">' + esc(t) + '…</span>') : ''; }
  function report(ok, msg) { remember(ok, msg); setStatus((ok ? '✓ ' : '✗ ') + msg, ok ? 'ok' : 'err'); speak(msg); }
  function speak(t) {
    if (!S.tts || !window.speechSynthesis || !t) return;
    try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(String(t).replace(/<[^>]+>/g, '').slice(0, 220)); u.lang = S.lang === 'bn' ? 'bn-BD' : 'en-US'; u.rate = 1.05; S.speaking = true; u.onend = u.onerror = function () { S.speaking = false; S.speakEnd = Date.now(); }; speechSynthesis.speak(u); } catch (e) { S.speaking = false; }
  }

  /* ================= কনটেক্সট: পর্দায় এখন কী কী আছে ================= */
  function vis(e) { return !!(e && (e.offsetWidth || e.offsetHeight || (e.getClientRects && e.getClientRects().length))); }
  function body() { return $('#vlBody'); }
  function visScope() { var s = VLab.activeScope(); return s && vis(s.canvas) ? s : null; }
  function idOf(b) { var d = b.dataset || {}, ks = ['tool', 'r', 'x', 'f', 'g', 'k', 'q', 'y', 's', 'o', 'b', 'e', 'a']; for (var i = 0; i < ks.length; i++) if (d[ks[i]] != null && d[ks[i]] !== '') return d[ks[i]]; return b.id || ''; }
  function txt(n) { return (n.textContent || '').replace(/\s+/g, ' ').trim(); }
  function groupOf(sel) { var l = sel.id && $('label[for="' + sel.id + '"]', body()); return (l && txt(l)) || sel.getAttribute('aria-label') || ''; }
  function parts3d(V) {
    var out = [], seen = {};
    (function walk(o) { if (o.id && o.pick && !seen[o.id]) { var al = Core.aliasOf(o.id); if (al && al.strong && al.strong.length) { seen[o.id] = 1; out.push({ kind: 'part', space: '3d', id: o.id, label: al.strong[0], aliases: al.strong, needVerb: true, key: '3d|' + o.id }); } } o.kids.forEach(walk); })(V.root);
    return out;
  }
  function ctx() {
    var b = body(), c = { targets: [], parts: null, scope: null, has3D: false, home: false, labelsToggle: false, pending: S.pending ? { kind: S.pending.kind } : null };
    if (!b) return c;
    c.home = !!$('.vl-grid', b);
    $$('[data-e]', b).forEach(function (card) { var t = $('.bd b', card); c.targets.push({ kind: 'exp', id: card.dataset.e, label: t ? txt(t) : txt(card), ref: card, key: 'exp|' + card.dataset.e }); });
    if (!c.home) VLab.list().forEach(function (e) { c.targets.push({ kind: 'exp', id: e.id, label: e.title, ref: null, needVerb: true, key: 'exp|' + e.id }); });
    $$('button, [role="button"]', b).forEach(function (btn) {
      if (!vis(btn) || btn.closest('.vl-ctl') && btn.dataset.c || btn.matches('[data-a="back"],[data-a="hint"],[data-m],[data-e],[data-lb],.vl-back')) return;
      var label = txt(btn); if (!label) return; c.targets.push({ kind: 'press', id: idOf(btn), label: label, ref: btn, key: 'btn|' + idOf(btn) + '|' + label });
    });
    $$('select', b).forEach(function (sel, si) { if (!vis(sel)) return; var g = groupOf(sel); $$('option', sel).forEach(function (o) { if (o.value === '' || !txt(o)) return; c.targets.push({ kind: 'option', id: o.value, label: txt(o), group: g, ref: { select: sel, value: o.value }, key: 'opt|' + (sel.id || si) + '|' + o.value }); }); });
    $$('.vl-chk', b).forEach(function (lab, i) { var inp = $('input', lab); if (inp && vis(lab)) c.targets.push({ kind: 'press', id: 'chk' + i, label: txt(lab), ref: inp, key: 'chk|' + i + '|' + txt(lab) }); });
    c.labelsToggle = !!$('[data-lb]', b);
    var sc = visScope(); if (sc) { c.scope = { mags: sc.mags, quiz: sc.quiz, canFocus: sc.canFocus }; if (sc.parts) c.parts = sc.parts.map(function (p) { return { kind: 'part', space: 'scope', id: p.id, label: p.n, key: 'sp|' + p.id }; }); }
    var V = VL3D.active(); if (V && vis(V.cv)) { c.has3D = true; var p3 = parts3d(V); if (p3.length) c.parts = (c.parts || []).concat(p3); }
    return c;
  }

  /* ================= কাজ চালানো ================= */
  function flash(e) { if (!e || !e.classList) return; e.classList.remove('vv-hit'); void e.offsetWidth; e.classList.add('vv-hit'); setTimeout(function () { e.classList.remove('vv-hit'); }, 1100); try { var r = e.getBoundingClientRect(); if (r.bottom < 70 || r.top > innerHeight - 10) e.scrollIntoView({ block: 'center', behavior: VL3D.reduce ? 'auto' : 'smooth' }); } catch (x) { } }
  function ok(msg) { return { ok: true, msg: msg }; } function bad(msg) { return { ok: false, msg: msg }; }
  function short(l) { return String(l).replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40); }
  function clampN(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function nearest(list, m) { var best = list[0]; list.forEach(function (x) { if (Math.abs(x - m) < Math.abs(best - m)) best = x; }); return best; }
  function fire(e, t) { e.dispatchEvent(new Event(t, { bubbles: true })); }
  function clickFirst(sel) { var b = body(), e = b && $$(sel, b).filter(function (x) { return vis(x) && !x.disabled; })[0]; if (!e) return null; flash(e); e.click(); return e; }
  async function doPress(t) {
    var e = t.ref, b = body(); if (t.kind === 'exp') { if (e && e.isConnected) { flash(e); e.click(); } else VLab.open(t.id); return ok(L('খুলছি: ', 'Opening: ') + short(t.label)); }
    if (t.kind === 'option') { var sel = t.ref.select; if (!sel.isConnected) return bad(L('এই অপশন আর নেই', 'That option is gone')); sel.value = t.ref.value; fire(sel, 'input'); fire(sel, 'change'); flash(sel); return ok(short(t.label) + L(' বাছা হলো', ' selected')); }
    if (!e || !e.isConnected) return bad(L('এই বাটন এখন নেই', 'That control is no longer on screen'));
    if (e.disabled) return bad(short(t.label) + L(' এখন নিষ্ক্রিয়; আগের ধাপ শেষ করুন', ' is disabled right now'));
    var msgEl = b && $('.vl-msg', b), before = msgEl ? msgEl.innerHTML : '';
    flash(e); e.click(); await sleep(160);
    if (msgEl && msgEl.isConnected && msgEl.classList.contains('err') && msgEl.innerHTML !== before) return bad(txt(msgEl).slice(0, 160));
    return ok(short(t.label) + L(' করা হলো', ' done'));
  }
  function setPending(p) { clearTimeout(S.pendTimer); S.pending = p; el.chips.innerHTML = ''; if (!p) return; S.pendTimer = setTimeout(function () { setPending(null); }, p.kind === 'confirm' ? 12000 : 20000); }
  function chip(label, fn) { var b = document.createElement('button'); b.type = 'button'; b.className = 'fc sm vv-chip'; b.textContent = label; b.addEventListener('click', fn); el.chips.appendChild(b); return b; }
  async function runTarget(t) { setPending(null); var r = await doPress(t); report(r.ok, r.msg); return r; }
  function labelFor(t) { return (t.group ? short(t.group) + ': ' : '') + short(t.label); }

  async function exec(it) {
    var b = body(), sc, V, r;
    if (it.type !== 'yes' && it.type !== 'no' && it.type !== 'choose' && it.type !== 'none') setPending(null);
    switch (it.type) {
      case 'yes': if (S.pending && S.pending.kind === 'confirm') { var t = S.pending.target; return runTarget(t); } return bad(L('কিসের হ্যাঁ?', 'Yes to what?'));
      case 'no': setPending(null); return ok(L('ঠিক আছে, বাতিল', 'Cancelled'));
      case 'choose': if (S.pending && S.pending.kind === 'choose' && S.pending.options[it.index]) return runTarget(S.pending.options[it.index]); return bad(L('বেছে নেওয়ার কিছু নেই', 'Nothing to choose'));
      case 'stop': stopListening(); return ok(L('মাইক বন্ধ', 'Mic off'));
      case 'help': openPanel(true); return ok(L('কমান্ডের তালিকা খুলেছি', 'Showing commands'));
      case 'tab': if (VLab.setTab(it.lab)) return ok(L('ল্যাব বদলানো হলো', 'Lab switched')); return bad(L('এই ল্যাব পাইনি', 'Lab not found'));
      case 'back': var bk = clickFirst('[data-a="back"]'); return bk ? ok(L('পরীক্ষণ তালিকায় ফিরলাম', 'Back to the list')) : bad(L('আপনি আগে থেকেই তালিকায়', 'Already on the list'));
      case 'hint': return clickFirst('[data-c="hint"],[data-a="hint"]') ? ok(L('ইঙ্গিত দেখানো হলো', 'Hint shown')) : bad(L('এখানে ইঙ্গিত নেই', 'No hint here'));
      case 'restart': if (clickFirst('[data-c="redo"]')) return ok(L('আবার শুরু', 'Restarted')); if (VLab.state().cur) { VLab.reopen(); return ok(L('আবার শুরু', 'Restarted')); } return bad(L('কোনো পরীক্ষণ চলছে না', 'No experiment is running'));
      case 'labels': return clickFirst('[data-lb]') ? ok(L('লেবেল বদলানো হলো', 'Labels toggled')) : bad(L('এখানে লেবেল-বোতাম নেই', 'No labels button here'));
      case 'primary': var pe = clickFirst('[data-a="check"], .vl-in [data-go], .vl-in .btn.pri, .btn.pri'); if (pe) { await sleep(120); var m = $('.vl-msg', b); if (m && m.classList.contains('err')) return bad(txt(m).slice(0, 160)); return ok(short(txt(pe)) || L('এগোলাম', 'Done')); } return bad(L('এখন চাপার মতো মূল বাটন নেই', 'No main button to press right now'));
      case 'camReset': if (clickFirst('[data-c="cam"]')) return ok(L('ক্যামেরা রিসেট', 'Camera reset')); V = VL3D.active(); if (V) { V.camTo(V.cam0, 500); return ok(L('ক্যামেরা রিসেট', 'Camera reset')); } return bad(L('৩D দৃশ্য নেই', 'No 3D scene'));
      case 'zoom':
        sc = visScope();
        if (it.mag != null) { if (!sc) return bad(L('মাইক্রোস্কোপ খোলা নেই', 'No microscope is open')); var m2 = it.mag === 'min' ? sc.mags[0] : it.mag === 'max' ? sc.mags[sc.mags.length - 1] : nearest(sc.mags, it.mag); if (sc.S.mag === m2) return ok(bnum(m2) + L('×-এ-ই আছি', '× already')); sc.setMag(m2); flash(sc.canvas); return ok(L('মাগ্নিফিকেশন ', 'Magnification ') + m2 + '×'); }
        if (sc && !it.cam) { var st = sc.step(it.dir === 'in' ? 1 : -1); if (!st) return bad(it.dir === 'in' ? L('সর্বোচ্চ মাগ্নিফিকেশনে আছি', 'Already at maximum magnification') : L('সর্বনিম্ন মাগ্নিফিকেশনে আছি', 'Already at minimum magnification')); flash(sc.canvas); return ok(L('মাগ্নিফিকেশন ', 'Magnification ') + st + '×'); }
        V = VL3D.active(); if (!V || !vis(V.cv)) return bad(L('জুম করার মতো কিছু খোলা নেই', 'Nothing to zoom right now'));
        var d0 = V.cam.dist, d1 = clampN(it.dir === 'in' ? d0 * .7 : d0 / .7, V.lim.minD, V.lim.maxD); if (Math.abs(d1 - d0) < .01) return bad(it.dir === 'in' ? L('আর কাছে যাওয়া যায় না', 'Cannot get closer') : L('আর দূরে যাওয়া যায় না', 'Cannot go farther')); V.camTo({ dist: d1 }, 400); return ok(it.dir === 'in' ? L('জুম ইন', 'Zoomed in') : L('জুম আউট', 'Zoomed out'));
      case 'zoomPart':
        if (it.part.space === 'scope') { sc = visScope(); if (!sc) return bad(L('মাইক্রোস্কোপ খোলা নেই', 'No microscope is open')); var mg = typeof it.mag === 'number' ? nearest(sc.mags, it.mag) : it.mag === 'min' ? sc.mags[0] : null; r = sc.zoomTo(it.part.id, mg); if (!r.ok) return bad(L('এই ধাপে অংশ খুঁজে বের করাই কাজ; জুম ইন/আউট ও টেনে সরাতে পারো', 'This step is about finding the part yourself; you can still zoom and drag')); flash(sc.canvas); return ok(short(it.part.label) + L(' ', ' at ') + r.mag + L('×-এ দেখানো হলো', '×')); }
        V = VL3D.active(); var ob = V && V.find(it.part.id); if (!ob || !ob._t || !ob.vis) return bad(L('এই অংশ এখন দেখা যাচ্ছে না', 'That part is not visible now')); V.camTo({ target: ob._t.slice(), dist: clampN(V.cam.dist * .6, V.lim.minD, V.lim.maxD) }, 600); return ok(short(it.part.label) + L(' কাছে আনা হলো', ' brought closer'));
      case 'move':
        sc = visScope(); var useScope = it.kind === 'pan' ? !!sc : it.kind === 'auto' ? !!sc : false;
        if (useScope) { var k = .35 * it.amt, ch = sc.pan(it.dir === 'left' ? -k : it.dir === 'right' ? k : 0, it.dir === 'up' ? -k : it.dir === 'down' ? k : 0); return ch ? ok(L('ছবি সরানো হলো', 'Slide moved')) : bad(L('আর সরানো যায় না', 'Cannot move further')); }
        V = VL3D.active(); if (!V || !vis(V.cv)) return bad(L('ঘোরানোর মতো ৩D দৃশ্য নেই', 'No 3D scene to rotate'));
        var cm = V.cam, yaw = cm.yaw + (it.dir === 'left' ? -.5 : it.dir === 'right' ? .5 : 0) * it.amt, pit = clampN(cm.pitch + (it.dir === 'up' ? .25 : it.dir === 'down' ? -.25 : 0) * it.amt, V.lim.minP, V.lim.maxP);
        V.camTo({ yaw: yaw, pitch: pit }, 350); return ok(L('ক্যামেরা ঘোরানো হলো', 'Camera rotated'));
      case 'focus': sc = visScope(); if (!sc || !sc.canFocus) return bad(L('এখানে ফোকাসের স্লাইডার নেই', 'No focus slider here')); if (!it.dir) return bad(L('“ফোকাস বাড়াও” বা “ফোকাস কমাও” বলুন, স্পষ্ট ছবি নিজে খুঁজে নিন', 'Say “focus more” or “focus less” and find the sharp point yourself')); sc.focusBy(it.dir * 8); return ok(it.dir > 0 ? L('ফোকাস বাড়ানো হলো', 'Focus increased') : L('ফোকাস কমানো হলো', 'Focus decreased'));
      case 'fill':
        var inputs = b ? $$('input.fld, input[type="number"], input[type="text"]', b).filter(function (i) { return vis(i) && !i.disabled && i.type !== 'checkbox' && i.type !== 'radio' && i.type !== 'range'; }) : [];
        var tgt = inputs.filter(function (i) { return i === document.activeElement; })[0] || inputs.filter(function (i) { return !i.value; })[0] || inputs[0];
        if (!tgt) return bad(L('লেখার ঘর নেই', 'No input box here')); tgt.value = it.value; fire(tgt, 'input'); fire(tgt, 'change'); flash(tgt); return ok(L('লেখা হলো: ', 'Entered: ') + it.value);
      case 'press': return runTarget(it.target);
      case 'suggest': setPending({ kind: 'confirm', target: it.target }); chip(L('হ্যাঁ: ', 'Yes: ') + labelFor(it.target), function () { runTarget(it.target); }); chip(L('না', 'No'), function () { setPending(null); setStatus(idleOrListen()); });
        return { ok: false, soft: true, msg: L('“' + labelFor(it.target) + '” বোঝালেন? হ্যাঁ বা না বলুন', 'Did you mean “' + labelFor(it.target) + '”? Say yes or no') };
      case 'ambiguous': setPending({ kind: 'choose', options: it.options }); it.options.forEach(function (o, i) { chip(bnumIf(i + 1) + '. ' + labelFor(o), function () { runTarget(o); }); });
        return { ok: false, soft: true, msg: L('কোনটা? প্রথমটি/দ্বিতীয়টি বলুন বা বাটনে চাপুন', 'Which one? Say first/second or tap it') };
      default: return null;
    }
  }
  function bnumIf(n) { return S.lang === 'en' ? String(n) : bnum(n); }
  function idleOrListen() { return S.on ? L('শুনছি… বলুন', 'Listening… say a command') : idleText(); }

  async function runTexts(texts) {
    if (S.busy) return; S.busy = true; S.lastCmd = Date.now();
    try {
      var c = ctx(), best = texts[0], segs = Core.split(best);
      for (var i = 0; i < texts.length; i++) { var sg = Core.split(texts[i]); if (sg.length && Core.parse(sg[0], c).type !== 'none') { best = texts[i]; segs = sg; break; } }
      showHeard(best, true); if (!segs.length) segs = [best];
      var okAll = true, lastMsg = '', acted = 0;
      for (var k = 0; k < segs.length; k++) {
        var it = Core.parse(segs[k], ctx()), r = it.type === 'none' ? null : await exec(it);
        if (!r) { if (acted === 0) { report(false, L('বুঝতে পারিনি: “' + best + '”। “কী বলব” বলুন বা নিচের তালিকা দেখুন', 'Did not understand: “' + best + '”. Say “help” to see commands')); } else { okAll = false; lastMsg += ' · ' + L('“' + segs[k] + '” বুঝিনি', '“' + segs[k] + '” not understood'); report(false, lastMsg); } return; }
        if (r.soft) { remember(false, r.msg); setStatus('? ' + r.msg, 'ask'); speak(r.msg); return; }
        acted++; lastMsg += (lastMsg ? ' · ' : '') + r.msg; if (!r.ok) { okAll = false; break; }
        if (it.type === 'stop') return; if (k < segs.length - 1) await sleep(450);
      }
      if (okAll) report(true, lastMsg); else report(false, lastMsg);
    } catch (e) { console.error('VLVoice', e); report(false, L('কমান্ড চালাতে সমস্যা হয়েছে', 'Could not run that command')); }
    finally { S.busy = false; }
  }
  function showHist() { if (S.hist.length) el.heard.title = S.hist.map(function (h) { return (h.ok ? '✓ ' : '✗ ') + h.t; }).join('\n'); }

  /* ================= মাইক ও Web Speech ================= */
  function stopListening() { S.want = false; clearTimeout(S.idle); try { S.rec && S.rec.stop(); } catch (e) { } S.rec = null; setListening(false); setStatus(idleText()); showHeard(''); }
  function armIdle() { clearTimeout(S.idle); S.idle = setTimeout(function () { if (S.on) { stopListening(); setStatus(L('অনেকক্ষণ কিছু বলেননি, তাই মাইক বন্ধ করেছি।', 'Mic turned off after 2 minutes of silence.')); } }, 120000); }
  function startListening() {
    if (!SR) { openPanel(true); setStatus(idleText(), 'err'); el.text.focus(); return; }
    S.want = true; S.restarts = []; launch(); armIdle();
  }
  function launch() {
    if (!S.want) return; var r = new SR(); S.rec = r; r.lang = S.lang === 'bn' ? 'bn-BD' : 'en-US'; r.continuous = true; r.interimResults = true; r.maxAlternatives = 3;
    r.onstart = function () { setListening(true); };
    r.onresult = function (e) {
      if (S.speaking || Date.now() - S.speakEnd < 700) return;
      for (var i = e.resultIndex; i < e.results.length; i++) {
        var res = e.results[i], alts = []; for (var j = 0; j < res.length; j++) if (res[j].transcript.trim()) alts.push(res[j].transcript.trim());
        if (!alts.length) continue;
        if (res.isFinal) { armIdle(); runTexts(alts); } else showHeard(alts[0], false);
      }
    };
    r.onerror = function (e) {
      var er = e.error;
      if (er === 'not-allowed' || er === 'service-not-allowed') { S.want = false; setStatus(L('মাইকের অনুমতি পাইনি। ঠিকানার পাশের তালাচিহ্ন থেকে মাইক “Allow” করুন (সাইট HTTPS বা localhost-এ থাকতে হবে)।', 'Microphone permission denied. Allow the mic in the address bar (the site must be HTTPS or localhost).'), 'err'); }
      else if (er === 'audio-capture') { S.want = false; setStatus(L('মাইক্রোফোন পাওয়া যায়নি।', 'No microphone found.'), 'err'); }
      else if (er === 'network') { S.want = false; setStatus(L('ভয়েস চিনতে ইন্টারনেট লাগে; এখন নেই। লিখে কমান্ড দিন।', 'Speech recognition needs internet. Type your command instead.'), 'err'); openPanel(true); }
      else if (er === 'language-not-supported') { S.want = false; setStatus(L('এই ব্রাউজারে এই ভাষা চলে না; English বেছে দেখুন।', 'This language is not supported here.'), 'err'); }
    };
    r.onend = function () {
      if (S.rec !== r) return; S.rec = null;
      if (!S.want) { setListening(false); if (!S.busy) setStatus(idleText()); return; }
      var now = Date.now(); S.restarts = S.restarts.filter(function (t) { return now - t < 4000; }); S.restarts.push(now);
      if (S.restarts.length > 6) { S.want = false; setListening(false); setStatus(L('মাইক বারবার থেমে যাচ্ছে। আবার চালু করুন।', 'The mic keeps stopping. Tap it to try again.'), 'err'); return; }
      setTimeout(launch, 250);
    };
    try { r.start(); } catch (e) { S.want = false; setListening(false); }
  }
  el.mic.addEventListener('click', function () { if (S.on || S.want) stopListening(); else startListening(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && (S.on || S.want)) stopListening(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && (S.on || S.want)) stopListening(); });

  /* ================= প্যানেল: সেটিং, লিখে কমান্ড, দরকারি উদাহরণ ================= */
  function openPanel(open) { el.panel.hidden = !open; el.more.setAttribute('aria-expanded', String(open)); if (open) paintHelp(); }
  function paintHelp() {
    var c = ctx(), ex = [], bn = S.lang === 'bn';
    ex.push([bn ? 'যেকোনো সময়' : 'Anytime', bn ? 'জুম ইন · জুম আউট · বামে ঘোরাও · ক্যামেরা রিসেট · ইঙ্গিত দাও · আবার শুরু · পিছনে যাও · মাইক বন্ধ' : 'zoom in · zoom out · rotate left · reset camera · hint · restart · go back · stop listening']);
    ex.push([bn ? 'ল্যাব ও পরীক্ষণ' : 'Labs', bn ? 'কেমিস্ট্রি ল্যাব খোলো · গ্রাম স্টেইনিং শুরু করো · স্ট্রিক প্লেট' : 'chemistry lab · open gram staining · streak plate']);
    if (c.scope) ex.push([bn ? 'মাইক্রোস্কোপ' : 'Microscope', (bn ? '৪০ গুণ করো · লো পাওয়ার · ছবি বামে সরাও · লেবেল দেখাও' : '40x · low power · move the slide left · show labels') + (c.parts && !c.scope.quiz ? (bn ? ' · নিউক্লিয়াসে জুম করো' : ' · zoom in to the ' + short(c.parts[0].label)) : '')]);
    var names = c.targets.filter(function (t) { return t.kind === 'press' && t.ref && !t.ref.disabled; }).slice(0, 4).map(function (t) { return short(t.label); });
    if (names.length) ex.push([bn ? 'এই ধাপে' : 'On this screen', names.join(' · ')]);
    if ($$('input.fld, input[type="number"]', body() || document).some(vis)) ex.push([bn ? 'মান লেখা' : 'Enter a value', bn ? '১২৫ লেখো · ১.৫ গুণ দশের ঘাত ৭ লেখো' : 'enter 12.5 · enter 1.5 times 10 to the 7']);
    ex.push([bn ? 'এগোনো' : 'Continue', bn ? 'পরের ধাপ · যাচাই করো · হ্যাঁ / না' : 'next step · check · yes / no']);
    el.help.innerHTML = '<dl class="vv-ex">' + ex.map(function (e) { return '<dt>' + esc(e[0]) + '</dt><dd>' + esc(e[1]) + '</dd>'; }).join('') + '</dl>';
  }
  el.more.addEventListener('click', function () { openPanel(el.panel.hidden); });
  el.form.addEventListener('submit', function (e) { e.preventDefault(); var v = el.text.value.trim(); if (!v) return; el.text.value = ''; runTexts([v]); });
  bar.addEventListener('click', function (e) {
    var l = e.target.closest('[data-l]'); if (l) { S.lang = l.dataset.l; savePref(); var was = S.on; if (was) { stopListening(); startListening(); } paintOpts(); paintHelp(); return; }
    if (e.target.closest('#vvTts')) { S.tts = !S.tts; savePref(); if (!S.tts && window.speechSynthesis) try { speechSynthesis.cancel(); } catch (x) { } paintOpts(); }
  });
  mount.addEventListener('click', function (e) { if (!el.panel.hidden && e.target.closest('[data-e],[data-a="back"],#vlTabs [role="tab"]')) setTimeout(paintHelp, 60); });
  if (!SR) { el.mic.disabled = true; el.mic.title = 'এই ব্রাউজারে ভয়েস চলে না'; openPanel(true); }
  paintOpts();
  window.VLVoice = { run: function (t) { return runTexts([t]); }, ctx: ctx, state: S, start: startListening, stop: stopListening };
})();
