/* লাইভ রুম: প্ল্যাটফর্মের ভেতরেই ভয়েস/ভিডিও কল (WebRTC), স্টাডি গ্রুপ, ল্যাব দল, ভাইভা প্র্যাকটিসের জন্য।
   কলের যুক্তি public/rooms-core.js-এ; এখানে শুধু পর্দা ও ডিভাইসের (মাইক/ক্যামেরা/স্ক্রিন) অংশ।
   - মিডিয়া ব্রাউজারে ব্রাউজারে সরাসরি যায় (mesh), তাই ছোট দল: ভিডিওতে ডিফল্ট ৬, শুধু ভয়েসে ১২ জন। পুরো ক্লাস সম্প্রচারের জন্য নয়।
   - ঢোকার সময় মাইক মিউট, ক্যামেরা ও স্ক্রিন বন্ধ; সবই নিজে চালু করতে হয়। মাইক না থাকলে শুধু শোনা যায়।
   - ভয়েস/ভিডিওর জন্য https লাগে (localhost ছাড়া)। */
(function () {
  'use strict';
  const X = window.GEBX, Core = window.GEBRoomsCore; if (!X || !Core) return;
  const esc = X.esc, bn = X.bn, EV = ['ready', 'peer-joined', 'peer-left', 'peer-away', 'peer-back', 'signal', 'state', 'chat', 'host', 'room', 'closed', 'kicked', 'host-action'];
  const ROLE = { teacher: 'শিক্ষক', cr: 'CR', mod: 'মডারেটর' };
  const supported = !!(window.RTCPeerConnection && window.EventSource), secure = window.isSecureContext !== false && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  let formOpen = false, mount = null, lobby = null, listState = { rooms: [], canCreate: true, modes: {}, max: {}, current: '', turn: false, err: '' }, timer = null, view = null, wake = null, audioCtx = null, speak = new Map(), invite = null, unread = 0, chatOpen = false, peopleOpen = false;

  /* ---- নেটওয়ার্ক ---- */
  async function api(m, p, b) {
    let r; try { r = await fetch(p, { method: m, headers: b !== undefined ? { 'Content-Type': 'application/json' } : {}, body: b !== undefined ? JSON.stringify(b) : undefined, credentials: 'same-origin', cache: 'no-store', keepalive: true }); } catch (e) { throw Object.assign(new Error('ইন্টারনেট নেই'), { status: 0 }); }
    const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.error || 'ত্রুটি ' + r.status), { status: r.status }); return j;
  }
  function openEvents(url, h) {
    const es = new EventSource(url); EV.forEach(t => es.addEventListener(t, e => { try { h.onEvent(t, JSON.parse(e.data)); } catch (_) { } })); es.onerror = () => h.onError && h.onError(); return { close() { es.close(); } };
  }
  const media = {
    getMic: () => navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }),
    getCam: () => navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 15, max: 24 }, facingMode: 'user' } }),
    getScreen: () => navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 8, max: 15 } }, audio: false })
  };
  const call = Core.createCall({ RTC: window.RTCPeerConnection, api, openEvents, getMic: media.getMic, getCam: media.getCam, getScreen: media.getScreen, makeStream: t => new MediaStream([t]), onChange: () => schedule(), onNotice: m => X.toast(m), onChat: () => { if (!chatOpen) { unread++; schedule(); } }, onEnd: why => { releaseWake(); stopSpeak(); } });
  const S = call.state;

  const css = document.createElement('style');
  css.textContent = `.rm-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:10px 0}.rm-tile{position:relative;background:#10231c;color:#eafff6;border-radius:14px;aspect-ratio:4/3;overflow:hidden;display:flex;align-items:center;justify-content:center;border:3px solid transparent;transition:border-color .15s}.rm-tile.speaking{border-color:#33d17a}.rm-tile video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#000}.rm-tile.mirror video{transform:scaleX(-1)}.rm-av{width:64px;height:64px;border-radius:50%;background:#1d6b4f;display:flex;align-items:center;justify-content:center;font:700 26px var(--f-head,inherit)}.rm-nm{position:absolute;left:6px;right:6px;bottom:6px;display:flex;gap:6px;align-items:center;font-size:13px}.rm-nm b{background:rgba(0,0,0,.55);padding:2px 8px;border-radius:999px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rm-ic{background:rgba(0,0,0,.55);border-radius:999px;padding:2px 7px}.rm-st{position:absolute;top:6px;left:6px;font-size:12px;background:rgba(0,0,0,.55);border-radius:999px;padding:2px 8px}.rm-hand{position:absolute;top:6px;right:8px;font-size:22px}.rm-scr{grid-column:1/-1;aspect-ratio:16/9;max-height:70vh}.rm-scr video{object-fit:contain}.rm-ctl{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:12px 0}.rm-ctl .btn{min-width:46px}.rm-ctl .off{background:#b3261e;color:#fff;border-color:#b3261e}.rm-ctl .on{background:#1d6b4f;color:#fff}.rm-side{border:1px solid var(--line);border-radius:14px;padding:10px;margin:8px 0;background:var(--card)}.rm-chat{max-height:240px;overflow:auto;display:flex;flex-direction:column;gap:6px;margin-bottom:8px;font-size:14px}.rm-chat p{margin:0;overflow-wrap:anywhere}.rm-ppl{display:flex;flex-direction:column;gap:6px}.rm-ppl>div{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.rm-bar{position:fixed;left:50%;transform:translateX(-50%);bottom:64px;z-index:9998;background:#10231c;color:#eafff6;border-radius:999px;padding:8px 14px;display:none;gap:8px;align-items:center;box-shadow:0 6px 24px rgba(0,0,0,.3);font-size:14px}.rm-bar.on{display:flex}.rm-bar button{border:0;border-radius:999px;padding:6px 12px;font:inherit;cursor:pointer}.rm-note{font-size:13px;color:var(--muted);margin:4px 0}`;
  document.head.appendChild(css);
  const bar = document.createElement('div'); bar.className = 'rm-bar'; bar.setAttribute('role', 'status'); document.body.appendChild(bar);

  let raf = 0; const schedule = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; render(); }); };

  /* ---- ওয়েক লক, স্পিকিং ডিটেকশন ---- */
  async function takeWake() { try { if (navigator.wakeLock && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { } }
  function releaseWake() { try { wake && wake.release(); } catch (e) { } wake = null; }
  function ctx() { try { if (!audioCtx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) audioCtx = new AC(); } if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); } catch (e) { } return audioCtx; }
  function watch(key, stream) {
    const cur = speak.get(key); if (cur && cur.stream === stream) return; if (cur) { try { cur.src.disconnect(); } catch (e) { } speak.delete(key); }
    const c = ctx(); if (!c || !stream || !stream.getAudioTracks || !stream.getAudioTracks().length) return;
    try { const src = c.createMediaStreamSource(stream), an = c.createAnalyser(); an.fftSize = 512; src.connect(an); speak.set(key, { stream, src, an, buf: new Uint8Array(an.fftSize), on: false }); } catch (e) { }
  }
  function stopSpeak() { speak.forEach(v => { try { v.src.disconnect(); } catch (e) { } }); speak.clear(); }
  setInterval(() => {
    if (!view) return; speak.forEach((v, key) => {
      v.an.getByteTimeDomainData(v.buf); let s = 0; for (let i = 0; i < v.buf.length; i++) { const d = (v.buf[i] - 128) / 128; s += d * d; } const on = Math.sqrt(s / v.buf.length) > 0.03;
      if (on !== v.on) { v.on = on; const tile = view.tiles.get(key); if (tile) tile.el.classList.toggle('speaking', on); }
    });
  }, 250);

  /* ---- লবি ---- */
  async function loadList() {
    try { const r = await api('GET', '/api/c/rooms'); Object.assign(listState, r, { err: '' }); } catch (e) { listState.err = e.status === 401 ? '' : e.message; if (e.status === 401) listState.rooms = []; }
    const ae = document.activeElement, typing = ae && mount && mount.contains(ae) && /^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName);
    if ((S.phase === 'idle' || S.phase === 'ended') && !formOpen && !typing) renderLobby();   // লিখতে থাকা বা ফর্ম খোলা থাকলে তালিকা রিফ্রেশে মুছে ফেলি না
  }
  const initials = n => (String(n || '?').trim()[0] || '?').toUpperCase();
  function lobbyHtml() {
    const me = X.me, L = listState, cur = L.current;
    if (!supported) return '<div class="miss">এই ব্রাউজারে ভয়েস/ভিডিও কল চলে না। Chrome, Edge, Firefox বা Safari-র নতুন সংস্করণ ব্যবহার করুন।</div>';
    if (!me) return '<div class="miss" id="rmLogin"></div>';
    const cards = L.rooms.map(r => `<article class="sx-card" data-room="${r.id}"><div class="sx-top"><span class="sx-ic" aria-hidden="true">${r.mode === 'video' ? '🎥' : '🎙️'}</span><div class="gx"><h4 class="sx-t">${esc(r.title)}</h4><p class="sx-d">হোস্ট: ${esc(r.host.name)}${ROLE[r.host.role] ? ' (' + ROLE[r.host.role] + ')' : ''}${r.course ? ' · ' + esc(r.course) : ''}</p></div></div>
      <div class="chips" style="margin:0"><span class="chip">${esc((L.modes || {})[r.mode] || r.mode)}</span><span class="chip gray">👥 ${bn(r.count)}/${bn(r.max)}</span>${r.locked ? '<span class="chip gray">🔒 কোড লাগে</span>' : ''}${r.closedToNew ? '<span class="chip gray">নতুন ঢোকা বন্ধ</span>' : ''}</div>
      ${r.members.length ? `<div class="jb-src" style="font-size:13px;color:var(--muted)">${esc(r.members.join(', '))}</div>` : ''}
      <div class="frow" style="margin-top:auto">${r.locked && !r.mine ? `<input class="fld sm" data-code="${r.id}" placeholder="কোড" style="max-width:110px" autocomplete="off">` : ''}<button class="btn ink sm" data-join="${r.id}" ${r.count >= r.max ? 'disabled' : ''}>${r.count >= r.max ? 'ভরা' : 'যোগ দিন'}</button>${r.mine ? `<button class="btn ghost sm" data-copy="${r.id}">🔗 লিংক</button>` : ''}${r.mine ? `<button class="btn ghost sm" data-close="${r.id}">রুম বন্ধ করুন</button>` : ''}</div></article>`).join('');
    const inv = invite ? `<div class="composer" style="border-color:#33d17a"><b>আমন্ত্রণ: ${esc(invite.title)}</b><p class="count" style="margin:4px 0">${esc((L.modes || {})[invite.mode] || invite.mode)} · 👥 ${bn(invite.count)}/${bn(invite.max)} · হোস্ট ${esc(invite.host.name)}</p><div class="frow">${invite.locked ? `<input class="fld sm" data-code="${invite.id}" placeholder="কোড" style="max-width:110px">` : ''}<button class="btn ink sm" data-join="${invite.id}">যোগ দিন</button><button class="btn ghost sm" id="rmInvNo">না</button></div></div>` : '';
    return `${inv}<div class="composer"><div class="frow" style="margin:0;justify-content:space-between;align-items:center"><b>🎙️ লাইভ রুম</b>${L.canCreate ? '<button class="btn ink sm" id="rmNew">+ নতুন রুম</button>' : ''}</div>
      <p class="count" style="margin:6px 0 0">স্টাডি গ্রুপ, ল্যাব দল বা ভাইভা প্র্যাকটিসের জন্য ছোট দলের ভয়েস/ভিডিও কল, অ্যাপ ছাড়াই। ভিডিওতে ${bn((L.max || {}).video || 6)} জন, শুধু ভয়েসে ${bn((L.max || {}).voice || 12)} জন পর্যন্ত। ঢোকার সময় মাইক মিউট থাকে, ক্যামেরা ও স্ক্রিন শেয়ার নিজে চালু করতে হয়।</p>
      ${secure ? '' : '<p class="rm-note" style="color:#b3261e">⚠️ এই পাতা https-এ নয় বা ব্রাউজার মাইক-ক্যামেরা দিচ্ছে না। আপনি ঢুকে শুধু শুনতে পারবেন।</p>'}
      <p class="rm-note">গোপনীয়তা: কল সরাসরি ডিভাইস থেকে ডিভাইসে যায়, এই সাইট কিছু রেকর্ড করে না, তবে অংশগ্রহণকারীরা একে অপরের IP ঠিকানা দেখতে পারে এবং যে কেউ নিজের ডিভাইসে রেকর্ড করতে পারে। অচেনাদের সাথে ব্যক্তিগত কিছু বলবেন না।${L.turn ? '' : ' মোবাইল ডেটা বা কিছু নেটওয়ার্কে সংযোগ না-ও লাগতে পারে।'}</p><div id="rmForm">${formOpen ? formHtml() : ''}</div></div>
      ${L.err ? `<div class="miss">${esc(L.err)}</div>` : ''}<div class="sx-grid">${cards || '<div class="miss">এখন কোনো রুম চালু নেই। আপনিই একটা খুলুন।</div>'}</div>
      ${cur ? `<p class="rm-note">আপনি একটি রুমে আছেন বলে দেখাচ্ছে। এখানে আবার ঢুকলে আগেরটা ছেড়ে যাবে।</p>` : ''}`;
  }
  function renderLobby() {
    if (!mount) return; if (view) { view = null; }
    lobby = lobby || document.createElement('div'); mount.innerHTML = ''; mount.appendChild(lobby);
    if (S.phase === 'ended') { lobby.innerHTML = `<div class="composer"><b>কল শেষ</b><p class="count">${esc(S.why || 'আপনি রুম ছেড়েছেন')}</p><button class="btn ink sm" id="rmBack">রুমের তালিকায় ফিরুন</button></div>`; return; }
    lobby.innerHTML = lobbyHtml(); const lg = lobby.querySelector('#rmLogin'); if (lg) X.needLogin(lg, 'লাইভ রুমে ঢুকতে');
  }
  function formHtml() {
    const L = listState, opt = o => Object.keys(o || {}).map(k => `<option value="${k}">${esc(o[k])}</option>`).join('');
    return `<div class="exbox" style="margin-top:10px"><div class="exrow"><label class="exl" for="rfT">রুমের নাম *</label><input class="fld" id="rfT" maxlength="80" placeholder="যেমন: GEB 1121 ল্যাব রিপোর্ট গ্রুপ"></div>
      <div class="frow"><div><label class="exl" for="rfM">ধরন</label><select class="fld" id="rfM">${opt(L.modes)}</select></div><div><label class="exl" for="rfN">সর্বোচ্চ জন</label><input class="fld" id="rfN" type="number" min="2" max="12" value="6" style="max-width:90px"></div><div><label class="exl" for="rfC">কোর্স (ঐচ্ছিক)</label><input class="fld" id="rfC" maxlength="20" placeholder="GEB 1121" style="max-width:130px"></div></div>
      <div class="frow"><div><label class="exl" for="rfK">ঢোকার কোড (ঐচ্ছিক)</label><input class="fld" id="rfK" maxlength="20" autocomplete="off" style="max-width:160px"></div><label class="chk"><input type="checkbox" id="rfL" checked> সবার তালিকায় দেখাও</label></div>
      <p class="count">কোড দিলে রুম নিজে থেকে তালিকায় দেখায় না (আপনি লিংক বা কোড দিয়ে ডাকবেন)। রুম খালি থাকলে ২ মিনিট পর, আর সর্বোচ্চ ১২ ঘণ্টা পর নিজে বন্ধ হয়।</p><div class="frow"><button class="btn ink" id="rfGo">রুম খুলুন ও ঢুকুন</button></div></div>`;
  }

  /* ---- কলের পর্দা ---- */
  function buildView() {
    mount.innerHTML = `<div class="composer"><div class="frow" style="margin:0;justify-content:space-between;align-items:center;flex-wrap:wrap"><div><b id="rvT"></b> <span class="chip gray" id="rvC"></span> <span class="chip gray" id="rvN" hidden>সংযোগ ফিরছে…</span></div><div class="frow" style="margin:0"><button class="btn ghost sm" id="rvLink">🔗 আমন্ত্রণ লিংক</button><button class="btn ghost sm" id="rvLock" hidden></button><button class="btn ghost sm" id="rvEnd" hidden>রুম বন্ধ</button></div></div><div id="rvErr" class="rm-note" style="color:#b3261e"></div></div>
      <div class="rm-grid" id="rvGrid"></div><div class="rm-ctl" id="rvCtl"></div><div id="rvAud" hidden></div>
      <div class="rm-side" id="rvChat" hidden><div class="rm-chat" id="rvLog"></div><div class="frow" style="margin:0"><input class="fld" id="rvIn" maxlength="450" placeholder="মেসেজ লিখুন…" style="flex:1"><button class="btn ink sm" id="rvSend">পাঠান</button></div></div>
      <div class="rm-side" id="rvPpl" hidden><div class="rm-ppl" id="rvList"></div></div>`;
    view = { tiles: new Map(), audios: new Map(), chatN: 0, ctlSig: '' };
  }
  const meName = () => (X.me && X.me.name) || 'আমি';
  function tileFor(key, mine) {
    let t = view.tiles.get(key); if (t) return t;
    const el = document.createElement('div'); el.className = 'rm-tile' + (mine ? ' mirror' : ''); el.innerHTML = '<div class="rm-av"></div><span class="rm-st" hidden></span><span class="rm-hand" hidden>✋</span><div class="rm-nm"><b></b><span class="rm-ic"></span></div>';
    t = { el, v: null, av: el.querySelector('.rm-av'), st: el.querySelector('.rm-st'), hand: el.querySelector('.rm-hand'), nm: el.querySelector('b'), ic: el.querySelector('.rm-ic') }; view.tiles.set(key, t); return t;
  }
  function setVideo(t, stream, muted) {
    if (stream) { if (!t.v) { t.v = document.createElement('video'); t.v.autoplay = true; t.v.playsInline = true; t.v.muted = true; t.el.insertBefore(t.v, t.el.firstChild); } if (t.v.srcObject !== stream) { t.v.srcObject = stream; const p = t.v.play(); if (p && p.catch) p.catch(() => { }); } t.av.style.visibility = 'hidden'; }
    else { if (t.v) { t.v.srcObject = null; t.v.remove(); t.v = null; } t.av.style.visibility = ''; }
  }
  const CONN = { new: 'জুড়ছে…', connecting: 'জুড়ছে…', connected: '', unstable: 'নেট দুর্বল', failed: 'সংযোগ হয়নি', closed: '' };
  function render() {
    if (S.phase === 'idle' || S.phase === 'ended') { if (view) releaseWake(); renderLobby(); updateBar(); return; }
    if (!view) { buildView(); takeWake(); }
    const g = view.grid = view.grid || mount.querySelector('#rvGrid'), $ = id => mount.querySelector(id);
    $('#rvT').textContent = (S.room && S.room.title) || 'রুম'; const peers = call.peers(), total = peers.length + 1; $('#rvC').textContent = '👥 ' + bn(total) + '/' + bn(S.room ? S.room.max : total); $('#rvN').hidden = S.net === 'ok'; $('#rvErr').textContent = S.err || '';
    const iAmHost = S.me && S.hostPid === S.me.pid, mod = X.me && X.me.role === 'mod', power = iAmHost || mod;
    $('#rvLock').hidden = !power; $('#rvLock').textContent = S.lockNew ? '🔓 ঢোকা খুলুন' : '🔒 ঢোকা বন্ধ করুন'; $('#rvEnd').hidden = !power;
    /* টাইল: আমি, তারপর অন্যরা; স্ক্রিন শেয়ারের টাইল আলাদা */
    const want = [], put = (key, t) => { want.push(key); if (t.el.parentNode !== g) g.appendChild(t.el); };
    const meT = tileFor('me', true); meT.nm.textContent = meName() + ' (আমি)' + (iAmHost ? ' 👑' : ''); meT.av.textContent = initials(meName()); setVideo(meT, S.cam ? S.localCam : null); meT.ic.textContent = S.micAvail ? (S.mic ? '🎤' : '🔇') : '🎧'; meT.hand.hidden = !S.hand; meT.st.hidden = true;
    if (S.micAvail && call.micStream()) watch('me', call.micStream()); put('me', meT);
    if (S.screen && S.localScreen) { const st = tileFor('me-screen', false); st.el.classList.add('rm-scr'); st.nm.textContent = 'আপনার স্ক্রিন'; st.ic.textContent = '🖥️'; setVideo(st, S.localScreen); st.el.classList.remove('mirror'); put('me-screen', st); }
    peers.forEach(p => {
      const t = tileFor(p.pid, false); t.nm.textContent = p.name + (p.pid === S.hostPid ? ' 👑' : '') + (ROLE[p.role] ? ' · ' + ROLE[p.role] : ''); t.av.textContent = initials(p.name);
      setVideo(t, p.state.cam ? p.streams.cam : null); t.ic.textContent = p.state.mic ? '🎤' : '🔇'; t.hand.hidden = !p.state.hand;
      const st = p.away ? 'নেট নেই…' : (CONN[p.conn] || ''); t.st.hidden = !st; t.st.textContent = st; put(p.pid, t);
      let a = view.audios.get(p.pid); if (!a) { a = document.createElement('audio'); a.autoplay = true; a.playsInline = true; $('#rvAud').appendChild(a); view.audios.set(p.pid, a); }
      if (p.streams.audio && a.srcObject !== p.streams.audio) { a.srcObject = p.streams.audio; const pr = a.play(); if (pr && pr.catch) pr.catch(() => { }); } watch(p.pid, p.streams.audio);
      if (p.state.screen && p.streams.screen) { const sk = p.pid + '-screen', s2 = tileFor(sk, false); s2.el.classList.add('rm-scr'); s2.nm.textContent = p.name + ' এর স্ক্রিন'; s2.ic.textContent = '🖥️'; setVideo(s2, p.streams.screen); put(sk, s2); }
    });
    view.tiles.forEach((t, key) => { if (!want.includes(key)) { setVideo(t, null); t.el.remove(); view.tiles.delete(key); speak.delete(key); } });
    /* স্ক্রিন-টাইল সবার আগে */ Array.from(g.querySelectorAll('.rm-scr')).reverse().forEach(el => g.insertBefore(el, g.firstChild));
    view.audios.forEach((a, pid) => { if (!peers.some(p => p.pid === pid)) { a.srcObject = null; a.remove(); view.audios.delete(pid); } });
    /* নিয়ন্ত্রণ বোতাম */
    const canShare = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia), sig = [S.mic, S.micAvail, S.cam, S.screen, S.hand, S.mode, chatOpen, peopleOpen, unread, canShare].join();
    if (sig !== view.ctlSig) { view.ctlSig = sig;
      $('#rvCtl').innerHTML = `<button class="btn ${S.micAvail ? (S.mic ? 'on' : 'off') : 'ghost'}" data-a="mic" title="মাইক">${S.mic ? '🎤 মাইক চালু' : S.micAvail ? '🔇 মিউট' : '🎤 মাইক চালু করুন'}</button>${S.mode === 'video' ? `<button class="btn ${S.cam ? 'on' : 'ghost'}" data-a="cam">${S.cam ? '📷 ক্যামেরা চালু' : '📷 ক্যামেরা বন্ধ'}</button>` : ''}${canShare ? `<button class="btn ${S.screen ? 'on' : 'ghost'}" data-a="screen">${S.screen ? '🖥️ শেয়ার বন্ধ করুন' : '🖥️ স্ক্রিন শেয়ার'}</button>` : ''}<button class="btn ${S.hand ? 'on' : 'ghost'}" data-a="hand">✋ ${S.hand ? 'হাত নামান' : 'হাত তুলুন'}</button><button class="btn ghost" data-a="chat">💬 চ্যাট${unread ? ' (' + bn(unread) + ')' : ''}</button><button class="btn ghost" data-a="ppl">👥 সদস্য</button><button class="btn red" data-a="leave" style="background:#b3261e;color:#fff">ছেড়ে যান</button>`;
    }
    /* চ্যাট */
    $('#rvChat').hidden = !chatOpen; if (chatOpen) { const log = $('#rvLog'); if (view.chatN !== S.chat.length) { view.chatN = S.chat.length; log.innerHTML = ''; S.chat.forEach(m => { const p = document.createElement('p'), b = document.createElement('b'); b.textContent = m.name + ': '; p.appendChild(b); p.appendChild(document.createTextNode(m.text)); log.appendChild(p); }); log.scrollTop = log.scrollHeight; } }
    /* সদস্য-তালিকা */
    $('#rvPpl').hidden = !peopleOpen; if (peopleOpen) {
      const rows = [{ pid: S.me.pid, name: meName() + ' (আমি)', role: X.me && X.me.role, state: { mic: S.mic, hand: S.hand }, me: true }].concat(peers);
      $('#rvList').innerHTML = rows.map(p => `<div><b>${esc(p.name)}</b>${p.pid === S.hostPid ? ' 👑 হোস্ট' : ''}${ROLE[p.role] ? ' <span class="chip gray">' + ROLE[p.role] + '</span>' : ''}${p.state.hand ? ' ✋' : ''}${p.state.mic ? ' 🎤' : ''}${power && !p.me ? ` <button class="btn ghost sm" data-h="mute:${p.pid}">🔇 মিউট করতে বলুন</button><button class="btn ghost sm" data-h="kick:${p.pid}">⛔ সরান</button>${iAmHost || mod ? `<button class="btn ghost sm" data-h="makehost:${p.pid}">👑 হোস্ট করুন</button>` : ''}` : ''}</div>`).join('');
    }
    updateBar();
  }
  /* কলে থাকা অবস্থায় অন্য সেকশনে গেলে নিচে ছোট বার */
  let inView = true; if ('IntersectionObserver' in window) { /* mount তৈরি হলে attach হয় */ }
  function updateBar() {
    const live = S.phase === 'live' && S.room;
    if (!live || inView) { bar.classList.remove('on'); return; }
    bar.innerHTML = `<span>🎧 ${esc(S.room.title)} · ${bn(call.peers().length + 1)} জন</span><button data-bar="mic" style="background:${S.mic ? '#1d6b4f' : '#b3261e'};color:#fff">${S.mic ? '🎤' : '🔇'}</button><button data-bar="go">ফিরুন</button><button data-bar="leave" style="background:#b3261e;color:#fff">ছাড়ুন</button>`; bar.classList.add('on');
  }
  bar.addEventListener('click', e => { const b = e.target.closest('[data-bar]'); if (!b) return; if (b.dataset.bar === 'mic') call.toggleMic(); else if (b.dataset.bar === 'go') document.getElementById('rooms').scrollIntoView({ behavior: 'smooth' }); else if (b.dataset.bar === 'leave') leaveCall(); });

  /* ---- কাজ ---- */
  const guard = async fn => { try { await fn(); } catch (e) { X.toast(e.message || 'হয়নি'); } };
  function consent() { try { if (localStorage.getItem('geb_rooms_ok')) return true; } catch (e) { } const ok = confirm('কলে ঢোকার আগে জেনে নিন:\n\n• ভয়েস/ভিডিও সরাসরি অংশগ্রহণকারীদের ডিভাইসে যায়, এই সাইট রেকর্ড করে না।\n• অংশগ্রহণকারীরা একে অপরের IP ঠিকানা দেখতে পারে, আর যে কেউ নিজের ডিভাইসে রেকর্ড করতে পারে।\n• আপনি মিউট অবস্থায় ঢুকবেন; ক্যামেরা ও স্ক্রিন নিজে চালু করবেন।\n\nচালিয়ে যাবেন?'); if (ok) { try { localStorage.setItem('geb_rooms_ok', '1'); } catch (e) { } } return ok; }
  async function joinRoom(id, code) {
    if (!consent()) return; ctx();    // এই ক্লিকের মধ্যেই অডিও চালুর অনুমতি নিয়ে রাখি
    await guard(async () => { await call.join(id, code); unread = 0; chatOpen = false; peopleOpen = false; if (location.hash.startsWith('#rooms/')) history.replaceState(null, '', '#rooms'); render(); document.getElementById('rooms').scrollIntoView({ behavior: 'smooth' }); });
  }
  function leaveCall() { call.leave(); releaseWake(); stopSpeak(); S.phase = 'idle'; view = null; loadList(); updateBar(); }
  function wire() {
    mount.addEventListener('click', e => {
      const t = e.target, c = s => t.closest(s); let el;
      if (c('#rmNew')) { formOpen = !formOpen; const f = document.getElementById('rmForm'); f.innerHTML = formOpen ? formHtml() : ''; return; }
      if (c('#rfGo')) { const v = id => document.getElementById(id).value; guard(async () => { const r = await api('POST', '/api/c/rooms', { title: v('rfT'), mode: v('rfM'), max: +v('rfN'), course: v('rfC'), code: v('rfK'), listed: document.getElementById('rfL').checked }); await joinRoom(r.room.id, v('rfK')); }); return; }
      if ((el = c('[data-join]'))) { const id = el.dataset.join, ci = mount.querySelector('[data-code="' + id + '"]'); joinRoom(id, ci ? ci.value : ''); return; }
      if ((el = c('[data-copy]'))) { const u = location.origin + '/#rooms/' + el.dataset.copy; (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => X.toast('লিংক কপি হয়েছে'), () => prompt('লিংকটি কপি করুন', u)); return; }
      if ((el = c('[data-close]'))) { if (confirm('রুমটি বন্ধ করবেন? ভেতরের সবাই বাইরে চলে যাবে।')) guard(async () => { await api('DELETE', '/api/c/rooms/' + el.dataset.close); await loadList(); }); return; }
      if (c('#rmBack')) { call.reset(); loadList(); renderLobby(); return; }
      if (c('#rmInvNo')) { invite = null; renderLobby(); return; }
      if ((el = c('[data-a]'))) {
        const a = el.dataset.a;
        if (a === 'mic') guard(async () => { ctx(); await call.toggleMic(); }); else if (a === 'cam') guard(() => call.toggleCam()); else if (a === 'screen') guard(() => call.toggleScreen());
        else if (a === 'hand') call.toggleHand(); else if (a === 'chat') { chatOpen = !chatOpen; if (chatOpen) unread = 0; if (view) view.ctlSig = ''; view && (view.chatN = -1); render(); if (chatOpen) { const i = mount.querySelector('#rvIn'); i && i.focus(); } }
        else if (a === 'ppl') { peopleOpen = !peopleOpen; if (view) view.ctlSig = ''; render(); } else if (a === 'leave') leaveCall(); return;
      }
      if ((el = c('[data-h]'))) { const [act, target] = el.dataset.h.split(':'); if (act === 'kick' && !confirm('এই সদস্যকে রুম থেকে সরাবেন?')) return; guard(() => call.host(act, target)); return; }
      if (c('#rvSend')) { const i = mount.querySelector('#rvIn'); const v = i.value.trim(); if (v) guard(async () => { await call.sendChat(v); i.value = ''; }); return; }
      if (c('#rvLink')) { const u = location.origin + '/#rooms/' + (S.room && S.room.id); (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => X.toast('আমন্ত্রণ লিংক কপি হয়েছে'), () => prompt('লিংকটি কপি করুন', u)); return; }
      if (c('#rvLock')) { guard(() => call.host('lock', null, !S.lockNew)); return; }
      if (c('#rvEnd')) { if (confirm('রুমটি সবার জন্য বন্ধ করবেন?')) guard(() => call.host('close')); return; }
    });
    mount.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'rvIn') { e.preventDefault(); const b = mount.querySelector('#rvSend'); b && b.click(); } });
    window.addEventListener('pagehide', () => { if (S.phase === 'live') call.leave(); });
  }
  async function checkInvite() {
    const m = /^#rooms\/([0-9a-f]{10})$/.exec(location.hash); if (!m || !X.me) return;
    try { const r = await api('GET', '/api/c/rooms/' + m[1]); invite = r.room; renderLobby(); document.getElementById('rooms').scrollIntoView(); } catch (e) { X.toast(e.message); }
  }

  X.register(() => {
    mount = document.getElementById('roomsMount'); if (!mount) return; wire(); renderLobby();
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { inView = es.some(x => x.isIntersecting); updateBar(); }, { threshold: 0.05 }).observe(mount);
    const start = () => { loadList().then(checkInvite); }; let started = false;
    if ('IntersectionObserver' in window && !/^#rooms/.test(location.hash)) { const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting) && !started) { started = true; io.disconnect(); start(); } }, { rootMargin: '200px' }); io.observe(mount); } else { started = true; start(); }
    timer = setInterval(() => { if (started && (S.phase === 'idle') && !document.hidden && X.me) loadList(); }, 15000);
    X.onAuth(() => { if (started && S.phase === 'idle') loadList().then(checkInvite); });
    window.addEventListener('hashchange', checkInvite);
  });
})();
