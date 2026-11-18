/* লাইভ রুমের কল-ম্যানেজার (WebRTC mesh), DOM ছাড়া। Node-এ নকল RTCPeerConnection দিয়ে সার্ভারের সাথে টেস্ট করা হয়: node rooms-test.js
   নিয়ম (সংঘর্ষ এড়াতে): দুজনের মধ্যে যার ঢোকার ক্রম (seq) বড়, সে-ই অফার পাঠায়; অন্যজন শুধু উত্তর দেয়। তাই "glare" হয় না।
   প্রতিটি সংযোগে তিনটি নির্দিষ্ট ট্রান্সসিভার: [0] মাইক (audio), [1] ক্যামেরা (video), [2] স্ক্রিন শেয়ার (video)।
   মাইক/ক্যামেরা/স্ক্রিন চালু-বন্ধে replaceTrack() হয়, নতুন করে আলোচনা (renegotiation) লাগে না।
   কিছু না থাকলেও (মাইক নেই, শুধু শুনছি) তিনটি স্লট থাকে, তাই সবার ভয়েস/ভিডিও পাওয়া যায়। */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); else root.GEBRoomsCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const SLOTS = ['audio', 'cam', 'screen'];

  function createCall(env) {
    const RTC = env.RTC, T = Object.assign({ restartDelay: 6000, maxRestarts: 3, sseGiveUp: 4 }, env.timers || {});
    const S = {
      phase: 'idle', why: '', room: null, me: null, hostPid: '', lockNew: false, peers: new Map(), chat: [], ice: [], net: 'ok',
      micAvail: false, mic: false, cam: false, screen: false, hand: false, localCam: null, localScreen: null, mode: 'voice', err: ''
    };
    let roomId = '', pid = '', mySeq = 0, events = null, micStream = null, sseErrors = 0, left = false;
    const change = () => { try { env.onChange && env.onChange(); } catch (e) { console.error(e); } };
    const api = (m, p, b) => env.api(m, '/api/c/rooms/' + roomId + p, b);
    const sendSignal = (to, data) => api('POST', '/signal', { pid, to, data }).catch(() => { });
    const myState = () => ({ mic: S.mic, cam: S.cam, screen: S.screen, hand: S.hand, sid: S.localScreen ? S.localScreen.id : '' });
    const pushState = () => api('POST', '/state', { pid, state: myState() }).catch(() => { });
    const peersArr = () => Array.from(S.peers.values()).sort((a, b) => a.seq - b.seq);

    /* ---- স্থানীয় ট্র্যাক সব সংযোগে বসানো ---- */
    const localTrack = slot => slot === 'audio' ? (micStream && micStream.getAudioTracks()[0]) || null : slot === 'cam' ? (S.localCam && S.localCam.getVideoTracks()[0]) || null : (S.localScreen && S.localScreen.getVideoTracks()[0]) || null;
    function tune(sender, slot) {      // mesh-এ ব্যান্ডউইথ বাঁচাতে বিটরেট সীমা
      try {
        if (!sender.getParameters) return; const n = Math.max(1, S.peers.size), p = sender.getParameters(); p.encodings = p.encodings && p.encodings.length ? p.encodings : [{}];
        p.encodings[0].maxBitrate = slot === 'screen' ? (n > 3 ? 600000 : 1200000) : slot === 'cam' ? (n > 3 ? 220000 : 450000) : 32000;
        const r = sender.setParameters(p); if (r && r.catch) r.catch(() => { });
      } catch (e) { }
    }
    async function attachLocal(peer) {
      const trs = peer.pc.getTransceivers();
      for (let i = 0; i < 3; i++) { const t = trs[i]; if (!t) continue; const tr = localTrack(SLOTS[i]); try { await t.sender.replaceTrack(tr); if (tr) tune(t.sender, SLOTS[i]); } catch (e) { } }
    }
    const attachAll = () => Promise.all(Array.from(S.peers.values()).filter(p => p.pc).map(attachLocal));

    /* ---- सहकर्मी ---- */
    function ensurePeer(id, info) {
      let p = S.peers.get(id);
      if (!p) { p = { pid: id, name: '?', role: 'student', seq: 0, state: { mic: false, cam: false, screen: false, hand: false, sid: '' }, away: false, conn: 'new', streams: { audio: null, cam: null, screen: null }, pc: null, offerer: false, pendingIce: [], restarts: 0, dTimer: null, made: 0 }; S.peers.set(id, p); }
      if (info) { p.name = info.name || p.name; p.role = info.role || p.role; p.seq = info.seq || p.seq; if (info.state) p.state = info.state; p.away = !!info.away; }
      return p;
    }
    function makePc(p) {
      if (p.pc) return p.pc;
      const pc = new RTC({ iceServers: S.ice }); p.pc = pc;
      pc.onicecandidate = e => { sendSignal(p.pid, { kind: 'ice', cand: e.candidate ? (e.candidate.toJSON ? e.candidate.toJSON() : { candidate: e.candidate.candidate, sdpMid: e.candidate.sdpMid, sdpMLineIndex: e.candidate.sdpMLineIndex }) : null }); };
      pc.ontrack = e => { const i = pc.getTransceivers().indexOf(e.transceiver), slot = SLOTS[i]; if (!slot) return; p.streams[slot] = (e.streams && e.streams[0]) || (env.makeStream ? env.makeStream(e.track) : null); change(); };
      pc.onconnectionstatechange = () => {
        const st = pc.connectionState; p.conn = st === 'connected' ? 'connected' : st === 'failed' ? 'failed' : st === 'closed' ? 'closed' : st === 'disconnected' ? 'unstable' : 'connecting'; change();
        clearTimeout(p.dTimer);
        if (st === 'connected') p.restarts = 0;
        else if (st === 'failed') recover(p);
        else if (st === 'disconnected') p.dTimer = setTimeout(() => { if (p.pc === pc && pc.connectionState !== 'connected') recover(p); }, T.restartDelay);
      };
      return pc;
    }
    function recover(p) {      // সংযোগ নষ্ট: অফারদাতা ICE restart করে, অন্যজন অনুরোধ পাঠায়
      if (left || !p.pc || p.restarts >= T.maxRestarts) { if (p.restarts >= T.maxRestarts) { p.conn = 'failed'; change(); } return; }
      p.restarts++; if (p.offerer) negotiate(p, true); else sendSignal(p.pid, { kind: 'restart' });
    }
    async function negotiate(p, restart) {
      const pc = makePc(p); p.offerer = true;
      if (!pc.getTransceivers().length) { SLOTS.forEach((s, i) => pc.addTransceiver(s === 'audio' ? 'audio' : 'video', { direction: 'sendrecv' })); }
      await attachLocal(p);
      if (restart && pc.restartIce) pc.restartIce();
      const offer = await pc.createOffer(restart ? { iceRestart: true } : undefined); await pc.setLocalDescription(offer); p.made++;
      sendSignal(p.pid, { kind: 'desc', desc: { type: 'offer', sdp: (pc.localDescription || offer).sdp } });
    }
    async function flushIce(p) { const q = p.pendingIce; p.pendingIce = []; for (const c of q) { try { await p.pc.addIceCandidate(c); } catch (e) { } } }
    async function onSignal(from, d) {
      const p = ensurePeer(from); if (left || !d) return;
      try {
        if (d.kind === 'desc' && d.desc.type === 'offer') {
          if (p.offerer) return;                                   // আমিই অফারদাতা হওয়ার কথা, এই অফার উপেক্ষা (সংঘর্ষ এড়ানো)
          const pc = makePc(p); await pc.setRemoteDescription(d.desc);
          pc.getTransceivers().slice(0, 3).forEach(t => { try { t.direction = 'sendrecv'; } catch (e) { } });
          await attachLocal(p); const ans = await pc.createAnswer(); await pc.setLocalDescription(ans);
          sendSignal(from, { kind: 'desc', desc: { type: 'answer', sdp: (pc.localDescription || ans).sdp } }); await flushIce(p);
        } else if (d.kind === 'desc' && d.desc.type === 'answer') {
          if (!p.pc || !p.offerer) return; await p.pc.setRemoteDescription(d.desc); await flushIce(p);
        } else if (d.kind === 'ice') {
          if (!d.cand) return; if (p.pc && p.pc.remoteDescription) { try { await p.pc.addIceCandidate(d.cand); } catch (e) { } } else p.pendingIce.push(d.cand);
        } else if (d.kind === 'restart') { if (p.offerer && p.pc && p.restarts < T.maxRestarts) { p.restarts++; await negotiate(p, true); } }
      } catch (e) { p.conn = 'failed'; p.err = String(e && e.message || e); change(); }
    }
    function dropPeer(id) {
      const p = S.peers.get(id); if (!p) return; clearTimeout(p.dTimer); try { p.pc && p.pc.close(); } catch (e) { } S.peers.delete(id); change();
    }

    /* ---- সার্ভারের ইভেন্ট ---- */
    function onEvent(type, d) {
      sseErrors = 0; if (S.net !== 'ok') { S.net = 'ok'; change(); }
      switch (type) {
        case 'peer-joined': ensurePeer(d.pid, d); change(); break;            // নতুনজনের seq বড়, সে-ই অফার দেবে
        case 'peer-left': dropPeer(d.pid); break;
        case 'peer-away': { const p = S.peers.get(d.pid); if (p) { p.away = true; change(); } break; }
        case 'peer-back': { const p = S.peers.get(d.pid); if (p) { p.away = false; change(); } break; }
        case 'signal': onSignal(d.from, d.data); break;
        case 'state': { const p = S.peers.get(d.pid); if (p) { p.state = d.state; change(); } break; }
        case 'chat': S.chat.push(d); if (S.chat.length > 80) S.chat.shift(); change(); if (env.onChat) env.onChat(d); break;
        case 'host': S.hostPid = d.pid; change(); break;
        case 'room': S.lockNew = !!d.lock; change(); break;
        case 'host-action': if (d.action === 'mute' && S.mic) { setMic(false); if (env.onNotice) env.onNotice((d.by || 'হোস্ট') + ' আপনার মাইক মিউট করেছেন'); } break;
        case 'kicked': end(d.why === 'replaced' ? 'আপনি অন্য জায়গা থেকে এই রুমে ঢুকেছেন' : d.why === 'removed' ? 'আপনার অ্যাকাউন্ট থেকে সরানো হয়েছে' : 'হোস্ট আপনাকে রুম থেকে সরিয়েছেন', false); break;
        case 'closed': end(d.why === 'admin' ? 'অ্যাডমিন রুমটি বন্ধ করেছেন' : d.why === 'timeout' ? 'রুমের সময় শেষ' : 'হোস্ট রুমটি বন্ধ করেছেন', false); break;
      }
    }
    function onSseError() {
      if (left || S.phase !== 'live') return; S.net = 'reconnecting'; change();
      if (++sseErrors >= T.sseGiveUp) env.api('GET', '/api/c/rooms/' + roomId).then(() => { }, e => { if (e && (e.status === 404 || e.status === 403 || e.status === 401)) end('রুমটি আর নেই বা আপনি আর এতে নেই', false); });
    }

    function stopLocal() {
      [micStream, S.localCam, S.localScreen].forEach(s => { if (s) try { s.getTracks().forEach(t => t.stop()); } catch (e) { } });
      micStream = null; S.localCam = null; S.localScreen = null; S.mic = S.cam = S.screen = S.hand = false;
    }
    function end(why, notify) {
      if (S.phase === 'ended' || S.phase === 'idle') return; left = true;
      if (events) { try { events.close(); } catch (e) { } events = null; }
      S.peers.forEach(p => { clearTimeout(p.dTimer); try { p.pc && p.pc.close(); } catch (e) { } }); S.peers.clear();
      stopLocal(); S.phase = 'ended'; S.why = why || ''; if (notify !== false) api('POST', '/leave', { pid }).catch(() => { }); change(); if (env.onEnd) env.onEnd(S.why);
    }

    /* ---- নিয়ন্ত্রণ ---- */
    function setMic(on) { if (!micStream) return false; micStream.getAudioTracks().forEach(t => { t.enabled = !!on; }); S.mic = !!on; change(); pushState(); return true; }
    async function toggleMic() { if (!S.micAvail) { try { micStream = await env.getMic(); S.micAvail = !!micStream; if (micStream) { micStream.getAudioTracks().forEach(t => { t.enabled = false; }); await attachAll(); } } catch (e) { S.err = 'মাইক পাওয়া যায়নি'; change(); return false; } if (!S.micAvail) return false; } return setMic(!S.mic); }
    async function toggleCam() {
      if (S.mode !== 'video') return false;
      if (S.cam) { S.localCam.getTracks().forEach(t => t.stop()); S.localCam = null; S.cam = false; await attachAll(); change(); pushState(); return true; }
      try { S.localCam = await env.getCam(); S.cam = true; if (S.localCam.getVideoTracks()[0]) S.localCam.getVideoTracks()[0].onended = () => { if (S.cam) toggleCam(); }; await attachAll(); change(); pushState(); return true; } catch (e) { S.err = 'ক্যামেরা পাওয়া যায়নি বা অনুমতি দেওয়া হয়নি'; change(); return false; }
    }
    async function toggleScreen() {
      if (S.screen) { S.localScreen.getTracks().forEach(t => t.stop()); S.localScreen = null; S.screen = false; await attachAll(); change(); pushState(); return true; }
      try { S.localScreen = await env.getScreen(); S.screen = true; const tr = S.localScreen.getVideoTracks()[0]; if (tr) { try { tr.contentHint = 'detail'; } catch (e) { } tr.onended = () => { if (S.screen) toggleScreen(); }; } await attachAll(); change(); pushState(); return true; } catch (e) { S.err = 'স্ক্রিন শেয়ার শুরু করা যায়নি'; change(); return false; }
    }
    const toggleHand = () => { S.hand = !S.hand; change(); pushState(); };
    const sendChat = text => api('POST', '/chat', { pid, text });
    const host = (action, target, on) => api('POST', '/host', { pid, action, target, on });

    async function join(id, code) {
      if (S.phase === 'joining' || S.phase === 'live') throw new Error('আগে চলমান কল ছাড়ুন');
      Object.assign(S, { phase: 'joining', why: '', err: '', peers: new Map(), chat: [], net: 'ok', hand: false, mic: false, cam: false, screen: false }); left = false; roomId = id; sseErrors = 0; change();
      try {
        try { micStream = env.getMic ? await env.getMic() : null; } catch (e) { micStream = null; }       // মাইক না পেলে শুধু শোনা যাবে
        S.micAvail = !!micStream; if (micStream) micStream.getAudioTracks().forEach(t => { t.enabled = false; });   // মিউট অবস্থায় ঢোকা
        const r = await env.api('POST', '/api/c/rooms/' + id + '/join', { code: code || '' });
        pid = r.pid; mySeq = r.seq; S.me = { pid, seq: r.seq }; S.room = r.room; S.mode = r.room.mode; S.hostPid = r.host; S.ice = r.ice || []; S.lockNew = !!r.lockedNew; S.chat = r.chat || []; S.phase = 'live';
        r.peers.forEach(x => ensurePeer(x.pid, x));
        events = env.openEvents('/api/c/rooms/' + id + '/events?pid=' + pid, { onEvent, onError: onSseError });
        change(); pushState();
        for (const x of r.peers) { const p = S.peers.get(x.pid); if (p.seq < mySeq) negotiate(p, false).catch(e => { p.conn = 'failed'; p.err = String(e && e.message || e); change(); }); }
        return r;
      } catch (e) { stopLocal(); S.phase = 'idle'; S.err = e.message || 'ঢোকা যায়নি'; change(); throw e; }
    }
    function leave() { if (S.phase === 'live' || S.phase === 'joining') end('', true); else if (S.phase === 'ended') S.phase = 'idle'; }
    const reset = () => { if (S.phase === 'ended') { S.phase = 'idle'; S.why = ''; change(); } };

    return { state: S, micStream: () => micStream, peers: peersArr, join, leave, reset, toggleMic, toggleCam, toggleScreen, toggleHand, sendChat, host, setMic, _onEvent: onEvent };
  }
  return { createCall, SLOTS };
});
