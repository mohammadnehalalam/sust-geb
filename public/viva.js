/* ভাইভা প্র্যাকটিস: আসল ভাইভার ক্রমে প্রশ্ন (পরিচয় → ওয়ার্ম-আপ → মূল প্রশ্ন → ফলো-আপ), টাইমার, ফোনে রেকর্ড,
   রেকর্ডিং ব্রাউজারেই (IndexedDB) থাকে। চাইলে অডিও জমা দিলে অ্যাডমিন শুনে নম্বর দেন, নম্বর "আমার ফলাফল"-এ দেখা যায়। */
(function () {
  'use strict';
  const X = window.GEBX, esc = X.esc, bn = X.bn;
  const MAX_REC = 180, MAX_BYTES = 3 * 1048576;
  let root = null, SETS = [];
  const V = { tab: 'prac', setup: { course: 'mix', setId: 'rand', fu: true, auto: false }, run: null, sessions: [], subs: [], urls: [], loadedSubs: false, msg: '' };
  const guard = async fn => { try { await fn(); } catch (e) { X.toast(e.message); } };
  const mmss = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  const url = b => { const u = URL.createObjectURL(b); V.urls.push(u); return u; };
  const clearUrls = () => { V.urls.forEach(u => URL.revokeObjectURL(u)); V.urls = []; };

  /* ---------- IndexedDB (রেকর্ডিং ব্রাউজারেই) ---------- */
  const DB = {
    mem: [],
    open() { return new Promise((ok, no) => { if (!window.indexedDB) return no(new Error('no idb')); const r = indexedDB.open('geb_viva', 1); r.onupgradeneeded = () => r.result.createObjectStore('s', { keyPath: 'id' }); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); }); },
    async all() { try { const d = await this.open(); return await new Promise((ok, no) => { const q = d.transaction('s').objectStore('s').getAll(); q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error); }); } catch (_) { return this.mem; } },
    async put(x) { try { const d = await this.open(); await new Promise((ok, no) => { const t = d.transaction('s', 'readwrite'); t.objectStore('s').put(x); t.oncomplete = ok; t.onerror = () => no(t.error); }); return true; } catch (_) { this.mem = this.mem.filter(y => y.id !== x.id).concat(x); return false; } },
    async del(id) { try { const d = await this.open(); await new Promise((ok, no) => { const t = d.transaction('s', 'readwrite'); t.objectStore('s').delete(id); t.oncomplete = ok; t.onerror = () => no(t.error); }); } catch (_) { this.mem = this.mem.filter(y => y.id !== id); } }
  };
  async function loadSessions() { V.sessions = (await DB.all()).sort((a, b) => b.ts - a.ts); }
  async function saveSession(run) {
    const s = { id: 's' + Date.now().toString(36), ts: Date.now(), title: run.title, steps: run.steps.map((st, i) => ({ q: st.q, a: st.a, stage: st.stage, m: st.m, setId: st.setId, qi: st.qi, c: st.c, dur: run.ans[i] ? run.ans[i].dur : 0, blob: run.ans[i] ? run.ans[i].blob : null })), subId: 0 };
    if (!s.steps.some(x => x.blob)) return null;
    const ok = await DB.put(s); const all = await DB.all(); all.sort((a, b) => b.ts - a.ts).slice(20).forEach(x => DB.del(x.id));
    await loadSessions(); return { s, ok };
  }

  /* ---------- সেট বাছাই ---------- */
  const courseSets = c => SETS.filter(s => s.c === c);
  const coursesWith = () => [...new Set(SETS.map(s => s.c))].filter(c => X.CM[c]);
  const pickRand = arr => arr[Math.floor(Math.random() * arr.length)];
  function buildBoard() {
    const o = V.setup, fu = o.fu; let chosen = [], title = '';
    if (o.course === 'mix') {
      chosen = coursesWith().map(c => pickRand(courseSets(c))); title = 'মিশ্র ভাইভা বোর্ড';
      chosen = chosen.sort(() => Math.random() - .5).slice(0, 4);
    } else {
      const list = courseSets(o.course); let st;
      if (o.setId === 'rand') { const last = +localStorage.getItem('geb_viva_last') || 0, pool = list.length > 1 ? list.filter(x => x.id !== last) : list; st = pickRand(pool); } else st = list.find(x => x.id === +o.setId) || list[0];
      if (!st) return null; chosen = [st]; title = (X.CM[o.course] && !st.title.includes(X.CM[o.course].n) ? X.CM[o.course].n + ': ' : '') + st.title; try { localStorage.setItem('geb_viva_last', st.id); } catch (_) {}
    }
    const steps = [];
    chosen.forEach((st, si) => st.qs.forEach((q, qi) => { if (!fu && q.f) return; if (si > 0 && q.stage === 'পরিচয়') return; steps.push({ setId: st.id, qi, c: st.c, q: q.q, a: q.a, t: q.t, m: q.m, stage: q.stage, f: q.f }); }));
    return steps.length ? { title, steps } : null;
  }

  /* ---------- রেকর্ডার ও টাইমার ---------- */
  const MIMES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  const pickMime = () => window.MediaRecorder ? (MIMES.find(m => MediaRecorder.isTypeSupported(m)) || '') : '';
  const canRec = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  const R = { rec: null, stream: null, chunks: [], t0: 0, tick: null, deadline: 0, hardStop: null };
  function stopTimers() { clearInterval(R.tick); clearTimeout(R.hardStop); R.tick = null; }
  function releaseMic() { if (R.stream) { R.stream.getTracks().forEach(t => t.stop()); R.stream = null; } }
  function abortRun() { stopTimers(); try { if (R.rec && R.rec.state !== 'inactive') { R.rec.onstop = null; R.rec.stop(); } } catch (_) {} releaseMic(); R.rec = null; try { speechSynthesis.cancel(); } catch (_) {} }
  async function beginAnswer(withMic) {
    const run = V.run, st = run.steps[run.i]; run.err = '';
    if (withMic) {
      if (!canRec()) { run.err = 'এই ব্রাউজারে বা http লিংকে মাইক চলে না। নিচের "অডিও ফাইল যোগ করুন" দিয়ে ফোনের রেকর্ডারের ফাইল দিন।'; return draw(); }
      try {
        R.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        const mime = pickMime(); R.rec = new MediaRecorder(R.stream, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 32000 }); R.chunks = [];
        R.rec.ondataavailable = e => { if (e.data && e.data.size) R.chunks.push(e.data); };
        const idx = run.i; R.rec.onstop = () => { const blob = new Blob(R.chunks, { type: (R.rec && R.rec.mimeType) || mime || 'audio/webm' }); releaseMic(); if (V.run === run && run.i === idx) { run.ans[idx] = { blob, dur: Math.round((Date.now() - R.t0) / 1000) }; run.phase = 'done'; stopTimers(); draw(); } };
        R.t0 = Date.now(); R.rec.start(); R.hardStop = setTimeout(() => finishAnswer(), MAX_REC * 1000);
      } catch (e) { releaseMic(); run.err = /denied|Permission|NotAllowed/i.test(String(e && (e.name + e.message))) ? 'মাইকের অনুমতি দেওয়া হয়নি। ব্রাউজারের ঠিকানার পাশে মাইক আইকনে অনুমতি দিন, অথবা "অডিও ফাইল যোগ করুন" ব্যবহার করুন।' : 'মাইক চালু করা গেল না। অডিও ফাইল যোগ করে দেখুন।'; return draw(); }
    } else R.t0 = Date.now();
    run.phase = withMic ? 'rec' : 'timer'; run.rec = withMic; R.deadline = Date.now() + st.t * 1000; draw();
    clearInterval(R.tick); R.tick = setInterval(tick, 250); tick();
  }
  function tick() {
    const run = V.run; if (!run || (run.phase !== 'rec' && run.phase !== 'timer')) return stopTimers();
    const left = Math.max(0, Math.ceil((R.deadline - Date.now()) / 1000)), el = root.querySelector('#vTm'); if (el) { el.textContent = mmss(left); el.classList.toggle('low', left <= 10); }
    const bar = root.querySelector('#vBar'); if (bar) bar.style.width = (100 - left / run.steps[run.i].t * 100) + '%';
    if (left <= 0) { try { navigator.vibrate && navigator.vibrate(250); } catch (_) {} X.toast('সময় শেষ'); finishAnswer(true); }
  }
  function finishAnswer(timeUp) {
    const run = V.run; if (!run) return; clearInterval(R.tick); clearTimeout(R.hardStop);
    if (run.phase === 'rec' && R.rec && R.rec.state !== 'inactive') { R.rec.stop(); return; }   // onstop এসে বাকি কাজ করবে
    run.phase = 'done'; draw(); if (timeUp && V.setup.auto) setTimeout(() => { if (V.run === run && run.phase === 'done') nextStep(); }, 1200);
  }
  function nextStep() { const run = V.run; abortRun(); if (run.i + 1 >= run.steps.length) return endRun(); run.i++; run.phase = 'idle'; run.showA = false; run.err = ''; draw(); }
  async function endRun() {
    const run = V.run; run.phase = 'end'; draw(); const r = await saveSession(run); run.saved = r ? (r.ok ? 'ok' : 'mem') : 'none'; run.sid = r ? r.s.id : ''; draw();
  }
  function speak(text) { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = /[\u0980-\u09FF]/.test(text) ? 'bn-BD' : 'en-US'; u.rate = .92; speechSynthesis.speak(u); } catch (_) { X.toast('এই ব্রাউজারে শোনানো যাচ্ছে না'); } }

  /* ---------- দৃশ্য ---------- */
  function tabsHtml() { return `<div class="seg extabs" role="tablist">${[['prac', '🎤 প্র্যাকটিস'], ['rec', '🎧 আমার রেকর্ডিং'], ['res', '📝 আমার ফলাফল']].map(t => `<button role="tab" data-vt="${t[0]}" aria-selected="${V.tab === t[0]}">${t[1]}</button>`).join('')}</div>`; }
  function setupHtml() {
    const o = V.setup, cs = coursesWith(), CM = X.CM;
    if (!cs.length) return '<div class="miss">এখনো কোনো ভাইভা সেট নেই। অ্যাডমিন → "ভাইভা প্রশ্ন" ট্যাব থেকে যোগ করুন।</div>';
    const list = o.course === 'mix' ? [] : courseSets(o.course), nQ = o.course === 'mix' ? '' : '';
    return `<div class="exbox"><h4 style="margin-top:0">কীভাবে হবে</h4><p class="count" style="margin:0 0 12px">আসল ভাইভার মতো সিকোয়েন্সে প্রশ্ন আসবে: আগে পরিচয়, তারপর ওয়ার্ম-আপ, মূল প্রশ্ন আর ফলো-আপ। প্রতি প্রশ্নে টাইমার চলবে, আপনি উত্তর বলে রেকর্ড করবেন। শেষে নিজের উত্তর শুনবেন ও মডেল উত্তরের সাথে মেলাবেন। রেকর্ডিং আপনার ব্রাউজারেই থাকে।</p>
      <div class="exrow"><span class="exl">কোর্স</span><div class="fchips"><button class="fc" data-vc="mix" aria-pressed="${o.course === 'mix'}">🎲 সব কোর্স (মিশ্র বোর্ড)</button>${cs.map(c => `<button class="fc" data-vc="${esc(c)}" style="--c:${CM[c].c}" aria-pressed="${o.course === c}"><span class="dot"></span>${esc(CM[c].n)}</button>`).join('')}</div></div>
      ${o.course !== 'mix' ? `<div class="exrow"><label class="exl" for="vSet">সেট</label><select class="fld" id="vSet"><option value="rand" ${o.setId === 'rand' ? 'selected' : ''}>🎲 র‍্যান্ডম সেট</option>${list.map(s => `<option value="${s.id}" ${String(o.setId) === String(s.id) ? 'selected' : ''}>${esc(s.title)} (${bn(s.qs.length)}টি ধাপ)</option>`).join('')}</select></div>` : '<p class="count">প্রতিটি কোর্স থেকে একটি করে র‍্যান্ডম সেট নিয়ে ধারাবাহিকভাবে বোর্ড সাজানো হবে।</p>'}
      <label class="chk sm" style="margin:6px 0"><input type="checkbox" id="vFu" ${o.fu ? 'checked' : ''}> ফলো-আপ প্রশ্নও রাখুন (আসল ভাইভার মতো)</label>
      <label class="chk sm" style="margin:6px 0"><input type="checkbox" id="vAuto" ${o.auto ? 'checked' : ''}> সময় শেষ হলে নিজে পরের প্রশ্নে যান</label>${nQ}
      <div class="frow" style="margin-top:14px"><button class="btn ink" id="vStart">ভাইভা শুরু করুন</button></div>
      ${!canRec() ? '<div class="msg-warn">⚠ এই ব্রাউজারে সরাসরি রেকর্ড চলবে না (মাইক পেতে HTTPS বা localhost লাগে)। তবু প্র্যাকটিস করা যাবে: ফোনের রেকর্ডারে রেকর্ড করে ফাইল যোগ করুন।</div>' : ''}</div>`;
  }
  function runHtml() {
    const run = V.run, st = run.steps[run.i], a = run.ans[run.i], co = X.CM[st.c] || { n: st.c, c: '#888' }, n = run.steps.length;
    const dots = run.steps.map((s, i) => `<i class="${i < run.i ? 'd' : i === run.i ? 'c' : ''} ${run.ans[i] ? 'r' : ''}"></i>`).join('');
    return `<div class="sx-run"><div class="sx-rh"><span class="chip course" style="--c:${co.c}">${esc(co.n)}</span><span class="chip">${esc(st.stage || 'প্রশ্ন')}${st.f ? ' · ফলো-আপ' : ''}</span><span class="sx-pg">প্রশ্ন ${bn(run.i + 1)} / ${bn(n)}</span><button class="btn ghost sm" id="vQuit">বন্ধ করুন</button></div>
      <div class="sx-dots">${dots}</div>
      <div class="sx-q"><span class="sx-qn">${esc(st.q)}</span><button class="btn ghost sm" id="vSpeak" title="প্রশ্নটি শুনুন">🔊 শুনুন</button></div>
      <div class="sx-clock"><span class="sx-tm" id="vTm">${mmss(run.phase === 'rec' || run.phase === 'timer' ? Math.max(0, Math.ceil((R.deadline - Date.now()) / 1000)) : st.t)}</span><span class="sx-tb"><i id="vBar" style="width:0"></i></span><small class="count">${bn(st.t)} সেকেন্ড${st.m ? ' · ' + bn(st.m) + ' নম্বর' : ''}</small></div>
      ${run.err ? `<div class="msg-warn">${esc(run.err)}</div>` : ''}
      <div class="sx-ctl">${run.phase === 'idle' ? `<button class="btn ink" id="vRec">🔴 রেকর্ড শুরু</button><button class="btn ghost" id="vTimerOnly">শুধু টাইমার চালু</button>` : run.phase === 'rec' ? `<span class="sx-live"><i></i> রেকর্ড হচ্ছে…</span><button class="btn ink" id="vStop">⏹ উত্তর শেষ</button>` : run.phase === 'timer' ? `<button class="btn ink" id="vStop">✔ উত্তর শেষ</button>` : ''}
        ${run.phase === 'done' ? `${a ? `<audio controls src="${url(a.blob)}"></audio>` : '<span class="count">কোনো অডিও যোগ হয়নি</span>'}<button class="btn ghost sm" id="vRedo">🔁 আবার রেকর্ড</button>` : ''}
        ${run.phase === 'idle' || run.phase === 'done' ? `<label class="btn ghost sm" for="vFile" style="cursor:pointer">📎 অডিও ফাইল যোগ করুন</label><input type="file" id="vFile" accept="audio/*" hidden><label class="btn ghost sm" for="vFileCap" style="cursor:pointer">📱 ফোনের রেকর্ডার দিয়ে</label><input type="file" id="vFileCap" accept="audio/*" capture hidden>` : ''}</div>
      ${run.phase === 'done' || run.showA ? `<div class="sx-model"><button class="btn ghost sm" id="vShowA">${run.showA ? 'মডেল উত্তর লুকান' : 'মডেল উত্তর দেখুন'}</button>${run.showA ? `<div class="model" style="margin-top:8px"><b>ভাইভায় যেভাবে উত্তর দেবেন</b><p>${esc(st.a || 'এই প্রশ্নের মডেল উত্তর যোগ করা হয়নি।')}</p></div>` : ''}</div>` : ''}
      <div class="frow" style="margin-top:14px"><button class="btn ink" id="vNext" ${run.phase === 'rec' ? 'disabled' : ''}>${run.i + 1 >= n ? 'ভাইভা শেষ করুন' : 'পরের প্রশ্ন →'}</button>${run.phase === 'idle' ? '<span class="count" style="align-self:center">উত্তর না দিলে এড়িয়ে যেতে পারেন</span>' : ''}</div></div>`;
  }
  function endHtml() {
    const run = V.run, got = run.ans.filter(Boolean).length;
    return `<div class="exbox"><h3 style="margin:0 0 6px">🎉 ভাইভা শেষ</h3><p class="count" style="margin:0 0 10px">${esc(run.title)} · ${bn(run.steps.length)}টি প্রশ্নের মধ্যে ${bn(got)}টির উত্তর রেকর্ড হয়েছে।
      ${run.saved === 'ok' ? '<br>✔ রেকর্ডিং আপনার ব্রাউজারে সেভ হয়েছে ("আমার রেকর্ডিং" ট্যাবে পাবেন)।' : run.saved === 'mem' ? '<br>⚠ ব্রাউজার সেভ করতে দিচ্ছে না (প্রাইভেট মোড?), পেজ বন্ধ করলে রেকর্ডিং হারাবে।' : run.saved === 'none' ? '<br>কোনো অডিও না থাকায় কিছু সেভ হয়নি।' : '<br>সেভ হচ্ছে…'}</p>
      ${run.steps.map((st, i) => `<div class="sx-rev"><div><b>${bn(i + 1)}.</b> ${esc(st.q)} <span class="chip gray">${esc(st.stage || '')}</span></div>${run.ans[i] ? `<audio controls src="${url(run.ans[i].blob)}"></audio>` : '<small class="count">উত্তর রেকর্ড হয়নি</small>'}<details class="sx-pp"><summary>মডেল উত্তর</summary><p>${esc(st.a || '—')}</p></details></div>`).join('')}
      <div class="frow" style="margin-top:12px">${run.sid && got ? `<button class="btn ink" data-vsubmit="${esc(run.sid)}">📤 অ্যাডমিনের কাছে নম্বরের জন্য জমা দিন</button>` : ''}<button class="btn ghost" id="vAgain">নতুন ভাইভা দিন</button></div>
      <p class="count">জমা দিলে অডিওগুলো সার্ভারে যায় এবং অ্যাডমিন শুনে নম্বর দেন। এর জন্য কমিউনিটি লগইন লাগে। জমা না দিলে অডিও শুধু আপনার ফোন/কম্পিউটারেই থাকে।</p></div>`;
  }
  function recHtml() {
    if (!V.sessions.length) return '<div class="miss">এখনো কোনো রেকর্ডিং নেই। প্র্যাকটিস ট্যাবে ভাইভা দিন, শেষে নিজে সেভ হবে।</div>';
    return `<p class="count">এই রেকর্ডিংগুলো শুধু আপনার এই ব্রাউজারে আছে (সর্বোচ্চ ২০টি সেশন)। ব্রাউজারের ডেটা মুছলে হারাবে।</p>` + V.sessions.map(s => {
      const n = s.steps.filter(x => x.blob).length;
      return `<details class="sx-sess"><summary><b>${esc(s.title)}</b> <span class="count">${new Date(s.ts).toLocaleString('bn-BD', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} · ${bn(n)}টি উত্তর</span>${s.subId ? ' <span class="chip">✔ জমা দেওয়া</span>' : ''}</summary>
        ${s.steps.map((st, i) => `<div class="sx-rev"><div><b>${bn(i + 1)}.</b> ${esc(st.q)}</div>${st.blob ? `<audio controls preload="none" data-blobsess="${esc(s.id)}:${i}"></audio>` : '<small class="count">উত্তর রেকর্ড হয়নি</small>'}<details class="sx-pp"><summary>মডেল উত্তর</summary><p>${esc(st.a || '—')}</p></details></div>`).join('')}
        <div class="frow">${n && !s.subId ? `<button class="btn ink sm" data-vsubmit="${esc(s.id)}">📤 নম্বরের জন্য জমা দিন</button>` : ''}<button class="btn ghost sm" data-vdel="${esc(s.id)}">মুছুন</button></div></details>`;
    }).join('');
  }
  function resHtml() {
    if (X.me === undefined) return '<div class="miss">লোড হচ্ছে…</div>';
    if (!X.me) return '<div class="miss">জমা দেওয়া ভাইভার নম্বর দেখতে কমিউনিটি লগইন করুন।<br><a class="btn ink sm" href="#community">লগইন / নিবন্ধন</a></div>';
    if (!V.loadedSubs) return '<p class="count">লোড হচ্ছে…</p>';
    if (!V.subs.length) return '<div class="miss">এখনো কোনো ভাইভা জমা দেননি। প্র্যাকটিস শেষে "জমা দিন" চাপুন, অ্যাডমিন শুনে নম্বর দিলে এখানে দেখাবে।</div>';
    return V.subs.map(s => `<article class="post sx-sub"><div class="phead"><div class="gx"><b>${esc(s.title)}</b><br><small class="count">${X.ago(s.created)}</small></div>${s.status === 'marked' ? `<span class="chip sx-score">${bn(s.total)} / ${bn(s.max)}</span>` : '<span class="chip gray">⏳ অ্যাডমিন শুনছেন</span>'}<details class="pmenu"><summary aria-label="আরও">⋯</summary><div><button data-vsdel="${s.id}">মুছুন</button></div></details></div>
      ${s.comment ? `<div class="sx-cm">💬 ${esc(s.comment)}</div>` : ''}
      ${s.items.map(i => `<div class="sx-rev"><div><b>${bn(i.idx + 1)}.</b> ${esc(i.q)} ${s.status === 'marked' && i.url ? `<span class="chip">${i.got == null ? '—' : bn(i.got)} / ${bn(i.max)}</span>` : ''}</div>${i.url ? `<audio controls preload="none" src="${i.url}"></audio>` : '<small class="count">উত্তর জমা দেননি</small>'}</div>`).join('')}</article>`).join('');
  }
  function draw() {
    if (!root) return; clearUrls();
    let body = '';
    if (V.tab === 'prac') body = !V.run ? setupHtml() : V.run.phase === 'end' ? endHtml() : runHtml();
    else if (V.tab === 'rec') body = recHtml(); else body = resHtml();
    root.innerHTML = tabsHtml() + `<div id="vBody">${body}</div>`;
    root.querySelectorAll('[data-blobsess]').forEach(el => { const [id, i] = el.dataset.blobsess.split(':'), s = V.sessions.find(x => x.id === id); if (s && s.steps[+i].blob) el.src = url(s.steps[+i].blob); });
  }
  async function loadSubs() { if (!X.me) return draw(); try { V.subs = (await X.api('GET', '/api/c/viva/subs')).subs; V.loadedSubs = true; } catch (e) { X.toast(e.message); } if (V.tab === 'res') draw(); }

  async function submitSession(id, btn) {
    if (!X.me) { X.toast('জমা দিতে আগে কমিউনিটিতে লগইন করুন'); return X.goto('community'); }
    const s = V.sessions.find(x => x.id === id); if (!s) return;
    const picked = s.steps.map((st, i) => ({ st, i })).filter(x => x.st.blob); if (!picked.length) return X.toast('জমা দেওয়ার মতো অডিও নেই');
    btn.disabled = true; const orig = btn.textContent;
    try {
      const sub = await X.api('POST', '/api/c/viva/sub', { title: s.title, refs: picked.map(x => [x.st.setId, x.st.qi]) });
      let k = 0; for (const x of picked) { btn.textContent = 'জমা হচ্ছে ' + bn(++k) + '/' + bn(picked.length) + '…'; const b = x.st.blob; if (b.size > MAX_BYTES) throw new Error('একটি অডিও ৩ MB-এর বেশি, ছোট করে আবার রেকর্ড করুন'); await X.api('POST', '/api/c/viva/sub/' + sub.id + '/audio', { idx: k - 1, data: await X.toBase64(b), dur: x.st.dur }); }
      s.subId = sub.id; await DB.put(s); X.toast('জমা হয়েছে। অ্যাডমিন নম্বর দিলে জানানো হবে'); V.loadedSubs = false;
      if (V.run && V.run.sid === id) V.run.subDone = true; await loadSessions(); draw(); loadSubs();
    } catch (e) { X.toast(e.message); } finally { btn.disabled = false; btn.textContent = orig; }
  }

  X.register(D => {
    root = document.getElementById('vivaMount'); if (!root) return; SETS = D.viva || [];
    loadSessions().then(() => { if (V.tab === 'rec') draw(); });
    X.onAuth(() => { V.loadedSubs = false; V.subs = []; if (V.tab === 'res') { draw(); loadSubs(); } });
    draw();
    window.addEventListener('beforeunload', abortRun);
    root.addEventListener('click', e => {
      const t = e.target, c = s => t.closest(s); let el;
      if ((el = c('[data-vt]'))) { if (V.run && V.run.phase !== 'end' && el.dataset.vt !== 'prac') { if (!confirm('চলমান ভাইভা বন্ধ হয়ে যাবে। যাবেন?')) return; abortRun(); V.run = null; } V.tab = el.dataset.vt; if (V.tab === 'rec') loadSessions().then(draw); else if (V.tab === 'res') { draw(); loadSubs(); } else draw(); return; }
      if ((el = c('[data-vc]'))) { V.setup.course = el.dataset.vc; V.setup.setId = 'rand'; draw(); return; }
      if (c('#vStart')) { const b = buildBoard(); if (!b) return X.toast('এই কোর্সে এখনো ভাইভা সেট নেই'); V.run = { ...b, i: 0, ans: [], phase: 'idle', showA: false, err: '' }; draw(); root.scrollIntoView({ block: 'nearest' }); return; }
      if (c('#vQuit')) { if (!confirm('ভাইভা বন্ধ করবেন? এ পর্যন্ত রেকর্ড হওয়া উত্তর সেভ হবে।')) return; if (V.run.ans.some(Boolean)) { abortRun(); endRun(); } else { abortRun(); V.run = null; draw(); } return; }
      if (c('#vSpeak')) { speak(V.run.steps[V.run.i].q); return; }
      if (c('#vRec')) { guard(() => beginAnswer(true)); return; }
      if (c('#vTimerOnly')) { beginAnswer(false); return; }
      if (c('#vStop')) { finishAnswer(false); return; }
      if (c('#vRedo')) { V.run.ans[V.run.i] = null; V.run.phase = 'idle'; draw(); return; }
      if (c('#vShowA')) { V.run.showA = !V.run.showA; draw(); return; }
      if (c('#vNext')) { if (V.run.phase === 'rec') return; nextStep(); return; }
      if (c('#vAgain')) { clearUrls(); V.run = null; draw(); return; }
      if ((el = c('[data-vsubmit]'))) { submitSession(el.dataset.vsubmit, el); return; }
      if ((el = c('[data-vdel]'))) { if (!confirm('এই সেশনের রেকর্ডিং মুছবেন?')) return; DB.del(el.dataset.vdel).then(loadSessions).then(draw); return; }
      if ((el = c('[data-vsdel]'))) { if (!confirm('জমা দেওয়া এই ভাইভা (অডিওসহ) সার্ভার থেকে মুছবেন?')) return; guard(async () => { await X.api('DELETE', '/api/c/viva/sub/' + el.dataset.vsdel); V.subs = V.subs.filter(x => x.id !== +el.dataset.vsdel); draw(); }); }
    });
    root.addEventListener('change', e => {
      const t = e.target;
      if (t.id === 'vSet') { V.setup.setId = t.value; }
      else if (t.id === 'vFu') V.setup.fu = t.checked; else if (t.id === 'vAuto') V.setup.auto = t.checked;
      else if (t.id === 'vFile' || t.id === 'vFileCap') { const f = t.files[0]; t.value = ''; if (!f) return; if (!/^audio\//.test(f.type) && !/\.(mp3|m4a|wav|ogg|webm|aac|opus)$/i.test(f.name)) return X.toast('শুধু অডিও ফাইল দিন'); if (f.size > MAX_BYTES) return X.toast('ফাইল ৩ MB-এর বেশি; ছোট করে রেকর্ড করুন'); const run = V.run; stopTimers(); run.ans[run.i] = { blob: f, dur: 0 }; run.phase = 'done'; run.err = ''; const a = document.createElement('audio'); a.preload = 'metadata'; a.src = URL.createObjectURL(f); a.onloadedmetadata = () => { if (run.ans[run.i] && run.ans[run.i].blob === f && isFinite(a.duration)) run.ans[run.i].dur = Math.round(a.duration); URL.revokeObjectURL(a.src); }; draw(); }
    });
  });
})();
