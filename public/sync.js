/* অ্যাকাউন্ট সিঙ্ক (ঐচ্ছিক, প্রতিটি ডিভাইসে সদস্য নিজে চালু করেন)।
   ব্রাউজারের localStorage-এর ডেটা (প্ল্যানার, ভুল খাতা, নোটবুক, গেম ইত্যাদি) লগইন করা অ্যাকাউন্টে সার্ভারে রাখে ও ডিভাইসগুলোর মধ্যে মেলায়।
   ভাগ ১: createEngine (DOM ছাড়া, আসল সার্ভারের সাথে Node-এ টেস্ট করা হয়: node sync-test.js)
   ভাগ ২: ব্রাউজারের জোড়া (localStorage-এ লেখা ধরা, টাইমার, ব্যানার, প্রোফাইলের প্যানেল)।

   কীভাবে কাজ করে (প্রতি key-র জন্য):
   - ব্রাউজার মনে রাখে শেষ সিঙ্কের সংস্করণ (v) আর তখনকার লেখার হ্যাশ (h)।
   - শুধু এই ডিভাইসে বদল (সার্ভারের v একই) → আপলোড। শুধু সার্ভারে বদল (এখানে বদল নেই) → নামিয়ে বসানো।
   - দুই জায়গাতেই বদল → sync-core.js-এর নিয়মে মার্জ, তারপর আপলোড। কোনো আইটেম নিজে নিজে ফেলা হয় না; দুই রকম মেলে না এমন হলে (শুধু প্ল্যানার) সদস্যকে বাছতে বলা হয়।
   - নামানো ডেটা পেজের ভেতরের হিসাবে ঢোকানোর জন্য পেজ একবার রিলোড লাগে। পেজ খোলার প্রথম কয়েক সেকেন্ডে নিজে রিলোড হয়, নইলে ব্যানারে "এখনই নিন" আসে (কাজের মাঝখানে হঠাৎ রিলোড হয় না)।
   - বদলে ফেলা আগের ডেটা একবারের জন্য "আগের অবস্থায় ফিরুন"-এর জন্য রাখা হয়। */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); else root.GEBSyncLib = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const MK = 'geb_sync_meta', UK = 'geb_sync_undo', LK = 'geb_sync_lock', MAX_KEY = 4 * 1024 * 1024, DAY = 86400000;

  function createEngine(env) {
    const C = env.core, S = env.store, KEYS = Object.keys(C.KEYS), now = env.now || Date.now, tabId = Math.random().toString(36).slice(2);
    const byteLen = s => typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(s).length : Buffer.byteLength(s);
    const blank = () => ({ owner: 0, on: false, keys: {}, last: 0, dismissed: 0 });
    function loadMeta() { try { const m = JSON.parse(S.get(MK)); if (m && typeof m === 'object') return Object.assign(blank(), { owner: m.owner || 0, on: !!m.on, keys: m.keys || {}, last: m.last || 0, dismissed: m.dismissed || 0 }); } catch (e) { } return blank(); }
    let meta = loadMeta(), user = null, busy = false, again = 0, pending = null, invite = false, err = '', tooBig = {}, force = false, picks = {};
    const saveMeta = () => { try { S.set(MK, JSON.stringify(meta)); } catch (e) { } };
    const emit = () => { try { env.notify && env.notify(); } catch (e) { console.error(e); } };
    async function api(method, path, body) { const r = await env.fetchJson(method, path, body); if (r.status === 401) throw Object.assign(new Error('লগইন করা নেই'), { auth: true }); return r; }
    const parse = raw => { try { return JSON.parse(raw); } catch (e) { return undefined; } };

    /* ---- আইটেম আপলোড ---- */
    async function push(key, raw, val, base, plan) {
      const m = meta.keys[key] || (meta.keys[key] = { v: 0, h: null, items: {} });
      if (C.isEmpty(val) && base === 0) { m.v = 0; m.h = C.hash(raw); m.items = {}; return; }                  // খালি, সার্ভারেও নেই: আপলোডের কিছু নেই
      const bytes = byteLen(raw); if (bytes > MAX_KEY) { tooBig[key] = bytes; return; } delete tooBig[key];
      const r = await api('PUT', '/api/c/sync/' + key, { base, data: val });
      if (r.status === 200) { meta.keys[key] = { v: r.json.v, h: C.hash(raw), items: C.itemHashes(key, val) }; return; }
      if (r.status === 409) { plan.push({ key, remote: { v: r.json.v, data: r.json.data }, local: { raw, val }, localChanged: true }); return; }   // মাঝখানে অন্য ডিভাইস বদলেছে
      if (r.status === 413) { tooBig[key] = bytes; err = (r.json && r.json.error) || 'ডেটা বেশি বড়'; return; }
      throw new Error((r.json && r.json.error) || 'সিঙ্ক হয়নি');
    }

    /* ---- নামানো ডেটা বসানো ---- */
    function writeUndo(replaced) {
      const keys = Object.keys(replaced); if (!keys.length) return;
      try { S.set(UK, JSON.stringify({ at: now(), keys: replaced })); } catch (e) { try { S.remove(UK); } catch (_) { } }   // জায়গা না থাকলে ছেড়ে দিই
    }
    function commit(items) {
      const replaced = {};
      items.forEach(it => {
        const rawNew = JSON.stringify(it.value); if (it.local && it.local.raw !== rawNew) replaced[it.key] = it.local.raw;
        S.set(it.key, rawNew);
        /* h = সার্ভারের অবস্থার হ্যাশ। মার্জ করা মান এর চেয়ে আলাদা হলে পরের পাসে নিজেই আপলোড হবে। */
        meta.keys[it.key] = { v: it.remote.v, h: C.hash(JSON.stringify(it.remote.data)), items: C.itemHashes(it.key, it.remote.data) };
      });
      writeUndo(replaced); saveMeta();
    }
    const undoKeys = () => { const u = parse(S.get(UK) || 'null'); return u && u.keys ? u.keys : {}; };
    function keepLocal(p) {       // "এই ডিভাইসেরটা রাখব": সার্ভারের সংস্করণকে ভিত্তি ধরি, তাই পরের পাসে এই ডিভাইসেরটা আপলোড হয়ে সার্ভারেরটা বদলে দেয়
      const replaced = undoKeys(); replaced[p.key] = JSON.stringify(p.remote.data);
      meta.keys[p.key] = { v: p.remote.v, h: C.hash(JSON.stringify(p.remote.data)), items: C.itemHashes(p.key, p.remote.data) };
      writeUndo(replaced); again = Math.max(again, 1); saveMeta();
    }
    async function applyPlan(plan) {
      const items = [], ask = [], keep = [];
      plan.forEach(p => {
        if (!p.local || !p.localChanged) { items.push({ key: p.key, value: p.remote.data, remote: p.remote, local: p.local }); return; }        // এখানে বদল নেই: সার্ভারেরটাই
        const r = C.merge(p.key, p.local.val, p.remote.data, (meta.keys[p.key] || {}).items);
        if (r.ok) { items.push({ key: p.key, value: r.value, remote: p.remote, local: p.local }); return; }
        const pk = picks[p.key];
        if (pk === 'remote') items.push({ key: p.key, value: p.remote.data, remote: p.remote, local: p.local });
        else if (pk === 'local') keep.push(p); else ask.push(p);
      });
      keep.forEach(keepLocal);
      const nothingToWrite = !items.length;
      if (!ask.length && (nothingToWrite || force || env.canAutoReload())) { if (items.length) { commit(items); force = false; picks = {}; env.reload && env.reload('apply'); } else { force = false; picks = {}; } return; }
      pending = { items, ask, keys: items.map(i => i.key).concat(ask.map(a => a.key)) }; force = false; emit();
    }

    /* ---- এক পাস: সব key মেলানো ---- */
    async function pass() {
      const man = await api('GET', '/api/c/sync'); if (man.status !== 200) throw new Error((man.json && man.json.error) || 'সিঙ্ক হয়নি');
      const plan = [], hold = pending ? new Set(pending.keys) : new Set();
      for (const key of KEYS) {
        if (hold.has(key)) continue;
        const m = meta.keys[key] || (meta.keys[key] = { v: 0, h: null, items: {} }), sv = (man.json.keys[key] || {}).v || 0;
        if (sv === 0 && m.v > 0) { m.v = 0; m.h = null; m.items = {}; }                       // সার্ভার থেকে ডেটা মুছে ফেলা হয়েছে; এখানকারটাই আবার তুলব
        const raw = S.get(key); let val = raw != null ? parse(raw) : undefined; const has = val !== undefined && C.typeOk(key, val);
        const localChanged = has && C.hash(raw) !== m.h, remoteChanged = sv !== m.v;
        if (!localChanged && !remoteChanged) continue;
        if (localChanged && !remoteChanged) { await push(key, raw, val, sv, plan); continue; }
        const rem = await api('GET', '/api/c/sync/' + key); if (rem.status !== 200) throw new Error('সিঙ্ক হয়নি');
        if (!rem.json.v || rem.json.data == null) { m.v = 0; m.h = null; m.items = {}; if (has) await push(key, raw, val, 0, plan); continue; }
        plan.push({ key, remote: { v: rem.json.v, data: rem.json.data }, local: has ? { raw, val } : null, localChanged });
      }
      if (plan.length) await applyPlan(plan);
    }

    /* ---- ট্যাবের মধ্যে ছোট তালা (একসাথে দুই ট্যাব সিঙ্ক না করে) ---- */
    function lock() { const l = parse(S.get(LK) || 'null'); if (l && l.id !== tabId && now() - l.ts < 20000) return false; try { S.set(LK, JSON.stringify({ id: tabId, ts: now() })); } catch (e) { } return true; }
    function unlock() { const l = parse(S.get(LK) || 'null'); if (l && l.id === tabId) { try { S.remove(LK); } catch (e) { } } }

    async function syncNow(reason) {
      if (!user || !meta.on) return { skipped: true };
      if (busy) { again = Math.max(again, 1); return { queued: true }; }
      if (!lock()) return { locked: true };
      busy = true; err = ''; meta = Object.assign(loadMeta(), { on: meta.on }); emit();
      try { let n = 0; do { again = 0; await pass(); } while (again && ++n < 3); meta.last = now(); saveMeta(); }
      catch (e) { err = e.auth ? 'লগইন করা নেই' : (e.message || 'সিঙ্ক হয়নি'); }
      finally { busy = false; unlock(); emit(); }
      return { ok: !err, err };
    }

    async function probe() {
      try { const r = await api('GET', '/api/c/sync'); invite = r.status === 200 && Object.keys(r.json.keys || {}).length > 0 && now() - meta.dismissed > 7 * DAY; } catch (e) { invite = false; }
      emit();
    }

    return {
      async setUser(u) {
        user = u ? { id: u.id, sid: u.sid } : null; invite = false; pending = null; err = '';
        if (!user) { emit(); return; }
        if (meta.owner && meta.owner !== user.id) {      // এই ব্রাউজারে আগের সদস্যের সিঙ্ক করা ডেটা: নতুন সদস্যের অ্যাকাউন্টে মিশতে দেব না
          KEYS.forEach(k => { try { S.remove(k); } catch (e) { } }); try { S.remove(UK); } catch (e) { }
          meta = blank(); saveMeta(); emit(); env.reload && env.reload('switch'); return;
        }
        if (meta.on) await syncNow('boot'); else await probe();
      },
      async enable() { if (!user) throw new Error('আগে লগইন করুন'); meta.on = true; meta.owner = user.id; meta.dismissed = 0; invite = false; force = true; saveMeta(); emit(); return syncNow('enable'); },
      disable() { meta.on = false; pending = null; saveMeta(); emit(); },
      dismissInvite() { meta.dismissed = now(); invite = false; saveMeta(); emit(); },
      async deleteRemote() { await api('DELETE', '/api/c/sync'); meta.on = false; meta.keys = {}; pending = null; saveMeta(); emit(); },
      syncNow,
      /* ব্যানারের "এখনই নিন" / পছন্দ বেছে দেওয়া: picks = {key: 'remote'|'local'} */
      async accept(p) { picks = Object.assign(picks, p || {}); force = true; pending = null; emit(); return syncNow('accept'); },
      later() { /* পেজ রিলোড বা পরের সিঙ্কে আবার আসবে */ pending = null; emit(); },
      undo() { const u = parse(S.get(UK) || 'null'); if (!u || !u.keys) return false; Object.keys(u.keys).forEach(k => S.set(k, u.keys[k])); S.remove(UK); emit(); env.reload && env.reload('undo'); return true; },
      state() { const u = parse(S.get(UK) || 'null'); return { on: meta.on, user, owner: meta.owner, busy, err, last: meta.last, tooBig: Object.assign({}, tooBig), pending: pending ? { n: pending.keys.length, ask: pending.ask.map(a => a.key) } : null, invite, undoAt: u && u.at || 0, keys: KEYS.length }; },
      _meta: () => meta
    };
  }
  return { createEngine, MAX_KEY };
});

/* ================= ভাগ ২: ব্রাউজার ================= */
(function () {
  if (typeof window === 'undefined' || !window.document || !window.GEBSyncCore || !window.GEBSyncLib) return;
  const C = window.GEBSyncCore, L = window.GEBSyncLib, GX = window.GEBX;
  let ls; try { ls = window.localStorage; ls.getItem('geb_sync_meta'); } catch (e) { return; }   // প্রাইভেট মোড ইত্যাদিতে localStorage না চললে সিঙ্ক বন্ধ
  const oSet = Storage.prototype.setItem, oGet = Storage.prototype.getItem, oRem = Storage.prototype.removeItem;
  const bn = n => String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = m => window.__gebToast && window.__gebToast(m);

  const store = { get: k => oGet.call(ls, k), set: (k, v) => oSet.call(ls, k, v), remove: k => oRem.call(ls, k) };
  async function fetchJson(method, path, body) {
    let r; try { r = await fetch(path, { method, headers: body !== undefined ? { 'Content-Type': 'application/json' } : {}, body: body !== undefined ? JSON.stringify(body) : undefined, credentials: 'same-origin', cache: 'no-store' }); }
    catch (e) { throw new Error('ইন্টারনেট নেই'); }
    return { status: r.status, json: await r.json().catch(() => ({})) };
  }
  /* পেজ খোলার প্রথম কয়েক সেকেন্ডে আর গত ১ মিনিটে রিলোড না হয়ে থাকলে নিজে রিলোড (লুপ আটকাতে) */
  function canAutoReload() {
    let last = 0; try { last = +sessionStorage.getItem('geb_sync_rl') || 0; } catch (e) { }
    return performance.now() < 12000 && !document.hidden && Date.now() - last > 60000;
  }
  function reload(why) { try { sessionStorage.setItem('geb_sync_rl', String(Date.now())); } catch (e) { } location.reload(); }

  let E; const listeners = [];
  const notify = () => { paintBar(); listeners.forEach(f => { try { f(); } catch (e) { console.error(e); } }); };
  E = L.createEngine({ core: C, store, fetchJson, canAutoReload, reload, notify });

  /* ---- স্থানীয় লেখা ধরা: সিঙ্ক করা key বদলালে ৪ সেকেন্ড পরে সিঙ্ক ---- */
  let deb = null; const schedule = () => { if (!E.state().on) return; clearTimeout(deb); deb = setTimeout(() => E.syncNow('change'), 4000); };
  Storage.prototype.setItem = function (k, v) { oSet.apply(this, arguments); if (this === ls && C.KEYS[k]) schedule(); };
  Storage.prototype.removeItem = function (k) { oRem.apply(this, arguments); if (this === ls && C.KEYS[k]) schedule(); };

  setInterval(() => { if (!document.hidden && E.state().on) E.syncNow('poll'); }, 5 * 60000);
  document.addEventListener('visibilitychange', () => { if (E.state().on) { if (document.hidden) E.syncNow('hide'); else if (Date.now() - (E.state().last || 0) > 60000) E.syncNow('show'); } });
  window.addEventListener('online', () => { if (E.state().on) E.syncNow('online'); });
  window.addEventListener('pagehide', () => { if (E.state().on) E.syncNow('leave'); });

  /* ---- ব্যানার ও বাছাইয়ের ডায়ালগ ---- */
  const css = document.createElement('style');
  css.textContent = '#gebSyncBar{position:fixed;left:50%;transform:translateX(-50%);bottom:14px;z-index:9999;max-width:min(560px,94vw);background:#10231c;color:#eafff6;border-radius:12px;padding:10px 14px;box-shadow:0 6px 24px rgba(0,0,0,.28);font-size:14px;line-height:1.5;display:none}#gebSyncBar.on{display:block}#gebSyncBar button{margin:6px 6px 0 0}#gebSyncDlg{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;padding:16px}#gebSyncDlg.on{display:flex}#gebSyncDlg .bx{background:#fff;color:#111;border-radius:14px;max-width:460px;width:100%;padding:16px 18px}#gebSyncDlg .bx p{margin:.4em 0}#gebSyncDlg .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}';
  document.head.appendChild(css);
  const bar = document.createElement('div'); bar.id = 'gebSyncBar'; bar.setAttribute('role', 'status'); document.body.appendChild(bar);
  const dlg = document.createElement('div'); dlg.id = 'gebSyncDlg'; dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true'); document.body.appendChild(dlg);

  function paintBar() {
    const s = E.state();
    if (s.pending && s.pending.ask.length) {
      const names = s.pending.ask.map(k => C.LABEL[k] || k).join(', ');
      dlg.innerHTML = `<div class="bx"><h3 style="margin:0 0 6px">কোনটা রাখবেন?</h3><p>${esc(names)}: এই ডিভাইসে আর আপনার অ্যাকাউন্টে আলাদা আলাদা কোর্স/ক্লাস/পরীক্ষা আছে যেগুলো নিজে নিজে মেলানো গেল না।</p><p class="count" style="font-size:13px">যেটা রাখবেন না সেটা হারাবে না: "আগের অবস্থায় ফিরুন" দিয়ে (প্রোফাইল → সিঙ্ক) ফেরানো যাবে।</p><div class="row"><button class="btn ink" data-sy="pick-remote">অ্যাকাউন্টেরটা রাখুন</button><button class="btn ghost" data-sy="pick-local">এই ডিভাইসেরটা রাখুন</button></div></div>`;
      dlg.classList.add('on'); bar.classList.remove('on'); return;
    }
    dlg.classList.remove('on');
    if (s.pending) { bar.innerHTML = `অন্য ডিভাইসের নতুন ডেটা এসেছে। <button class="btn ink sm" data-sy="accept">এখনই নিন (পেজ রিফ্রেশ হবে)</button><button class="btn ghost sm" data-sy="later" style="color:#eafff6;border-color:#eafff6">পরে</button>`; bar.classList.add('on'); }
    else if (s.invite && s.user) { bar.innerHTML = `আপনার অ্যাকাউন্টে সিঙ্ক করা ডেটা আছে। এই ডিভাইসে চালু করে ফিরিয়ে আনবেন? <button class="btn ink sm" data-sy="invite-on">চালু করুন</button><button class="btn ghost sm" data-sy="invite-no" style="color:#eafff6;border-color:#eafff6">পরে</button>`; bar.classList.add('on'); }
    else bar.classList.remove('on');
  }
  const CONSENT = 'সিঙ্ক চালু করলে এই ডিভাইসের প্ল্যানার ও উপস্থিতি, ল্যাব নোটবুক (ছবিসহ), পরীক্ষার ইতিহাস, ভুল খাতা, গেম/ভার্চুয়াল ল্যাব/ডায়াগনস্টিক অগ্রগতি ও GPA-র তথ্য সার্ভারে আপনার অ্যাকাউন্টে জমা হবে। অন্য সদস্যরা এগুলো দেখতে পাবে না, তবে সাইটের অ্যাডমিন সার্ভারের ফাইলে চাইলে দেখতে পারেন এবং এগুলো ডিপার্টমেন্টের ব্যাকআপেও থাকবে।\n\nচালু করবেন?';
  async function enable() { if (!confirm(CONSENT)) return false; try { const r = await E.enable(); if (r && r.err) toast(r.err); } catch (e) { toast(e.message); } return true; }
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-sy]'); if (!b) return; const a = b.dataset.sy;
    if (a === 'accept') E.accept(); else if (a === 'later') E.later();
    else if (a === 'invite-on') enable(); else if (a === 'invite-no') E.dismissInvite();
    else if (a === 'pick-remote' || a === 'pick-local') { const pick = a === 'pick-remote' ? 'remote' : 'local', p = {}; E.state().pending.ask.forEach(k => { p[k] = pick; }); E.accept(p); }
  });

  /* ---- প্রোফাইলের প্যানেল ---- */
  function panelHtml() {
    const s = E.state(), tb = Object.keys(s.tooBig);
    const last = s.last ? (GX && GX.ago ? GX.ago(s.last) : new Date(s.last).toLocaleString('bn-BD')) : 'এখনো হয়নি';
    return `<h4>☁️ ডেটা সিঙ্ক (ফোন বদলালেও ডেটা ফেরত)</h4>
<p class="count">প্ল্যানার, উপস্থিতি, ল্যাব নোটবুক, পরীক্ষার ইতিহাস, ভুল খাতা, গেম ও GPA এখন শুধু এই ব্রাউজারে থাকে। সিঙ্ক চালু করলে আপনার অ্যাকাউন্টে জমা থাকবে এবং আপনার সব ডিভাইসে মিলে যাবে। প্রতিটি ডিভাইসে আলাদা করে চালু করতে হয়।</p>
<label class="chk"><input type="checkbox" id="syOn" ${s.on ? 'checked' : ''}> এই ডিভাইসে সিঙ্ক চালু</label>
${s.on ? `<p class="count" id="syStat">${s.busy ? 'সিঙ্ক হচ্ছে…' : s.err ? '⚠️ ' + esc(s.err) + ' (পরে নিজে আবার চেষ্টা করবে)' : '✓ শেষ সিঙ্ক: ' + esc(last)}</p>` : ''}
${tb.length ? `<p class="count" style="color:#b3261e">⚠️ এগুলো সিঙ্ক হচ্ছে না, ডেটা বেশি বড় (সর্বোচ্চ ৪ MB): ${tb.map(k => esc(C.LABEL[k] || k) + ' (' + bn((s.tooBig[k] / 1048576).toFixed(1)) + ' MB)').join(', ')}। নোটবুকের ছবি কমান বা পুরনো এন্ট্রি মুছুন।</p>` : ''}
<div class="frow">${s.on ? '<button class="btn ghost sm" id="syNow" type="button">এখনই সিঙ্ক করুন</button>' : ''}${s.undoAt ? '<button class="btn ghost sm" id="syUndo" type="button">শেষ বদলানোর আগের অবস্থায় ফিরুন</button>' : ''}<button class="btn ghost sm" id="syDel" type="button">সার্ভার থেকে আমার সিঙ্ক ডেটা মুছুন</button></div>
<p class="count">লগআউট করে অন্য সদস্য এই ব্রাউজারে ঢুকলে আপনার সিঙ্ক করা ডেটা এই ব্রাউজার থেকে সরে যায় (আপনার অ্যাকাউন্টে থাকে)। এক ডিভাইসে আর অন্য ডিভাইসে একই সময়ে বদলালে মার্জ হয়: XP/স্কোরের বেশিটা থাকে, তালিকা মিলে যায়, আর একসাথে মুছলে মোছা জিনিস ফিরে আসতে পারে।</p>`;
  }
  function mountPanel(box) {
    if (!box) return; const draw = () => { if (!document.body.contains(box)) { const i = listeners.indexOf(draw); if (i >= 0) listeners.splice(i, 1); return; } if (document.activeElement && box.contains(document.activeElement) && document.activeElement.id === 'syOn') return; box.innerHTML = panelHtml(); };
    listeners.push(draw); draw();
    box.addEventListener('click', async e => {
      const t = e.target;
      if (t.id === 'syNow') { const r = await E.syncNow('manual'); if (r && r.ok) toast('সিঙ্ক হয়েছে'); }
      else if (t.id === 'syUndo') { if (confirm('এই ডিভাইসের ডেটা শেষ সিঙ্কের আগের অবস্থায় ফিরবে। চালিয়ে যাবেন?')) E.undo(); }
      else if (t.id === 'syDel') { if (confirm('সার্ভার থেকে আপনার সব সিঙ্ক ডেটা মুছে যাবে এবং এই ডিভাইসে সিঙ্ক বন্ধ হবে। এই ডিভাইসের ডেটা থাকবে। অন্য ডিভাইসে সিঙ্ক চালু থাকলে সেটি নিজের ডেটা আবার আপলোড করবে, তাই সেখানেও বন্ধ করুন। মুছবেন?')) { try { await E.deleteRemote(); toast('সার্ভার থেকে মোছা হয়েছে'); } catch (er) { toast(er.message); } } }
    });
    box.addEventListener('change', async e => { if (e.target.id === 'syOn') { if (e.target.checked) { const ok = await enable(); if (!ok) e.target.checked = false; } else E.disable(); box.innerHTML = panelHtml(); } });
  }

  window.GEBSync = {
    mountPanel, state: () => E.state(), syncNow: r => E.syncNow(r || 'manual'),
    /* লগআউটের আগে শেষ বদল আপলোড (৪ সেকেন্ডের বেশি অপেক্ষা করে না) */
    beforeLogout: () => E.state().on ? Promise.race([E.syncNow('logout'), new Promise(r => setTimeout(r, 4000))]).catch(() => { }) : Promise.resolve(),
    _engine: E
  };
  if (GX && GX.onAuth) GX.onAuth(u => { E.setUser(u); });
})();
