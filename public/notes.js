/* শিক্ষার্থীদের নোট শেয়ারিং ("ফাইল ও নোট" সেকশনের দ্বিতীয় ট্যাব):
   সদস্য আপলোড করে → মডারেটর/অ্যাডমিন অনুমোদন দেয় → কোর্স ও ট্যাগ দিয়ে খোঁজা যায় → "উপকারী" ভোটে ওপরে ওঠে। */
(function () {
  'use strict';
  const X = window.GEBX, esc = X.esc, bn = X.bn;
  const SUG = ['লেকচার নোট', 'হাতে লেখা', 'সামারি', 'প্রশ্ন সমাধান', 'ল্যাব রিপোর্ট', 'CT', 'ফাইনাল প্রস্তুতি', 'শর্ট নোট'];
  const S = { scope: 'all', c: '', q: '', tag: '', sort: 'helpful', off: 0, items: [], more: false, total: 0, tags: [], pending: 0, canReview: false, form: false, loading: false, picked: [] };
  let mount = null, shown = false;
  const ICON = { pdf: '📕', png: '🖼️', jpg: '🖼️', jpeg: '🖼️', docx: '📘', pptx: '📙', xlsx: '📗', txt: '📄' };
  const guard = async fn => { try { await fn(); } catch (e) { X.toast(e.message); } };

  function shell() {
    const me = X.me, CM = X.CM;
    if (me === undefined) { mount.innerHTML = '<div class="miss">লোড হচ্ছে…</div>'; return; }
    if (!me) return X.needLogin(mount, 'শিক্ষার্থীদের নোট দেখতে ও আপলোড করতে');
    const sc = [['all', 'সব নোট'], ['mine', 'আমার আপলোড']].concat(S.canReview ? [['pending', 'অনুমোদনের অপেক্ষায় (' + bn(S.pending) + ')']] : []);
    mount.innerHTML = `<div class="composer"><div class="frow" style="margin:0;justify-content:space-between;align-items:center"><b>📚 শিক্ষার্থীদের নোট</b><button class="btn ink sm" id="ntNew">${S.form ? 'বন্ধ করুন' : '+ নোট আপলোড'}</button></div>
      <p class="count" style="margin:6px 0 0">সিনিয়র-সহপাঠীদের বানানো নোট, সামারি, প্রশ্ন সমাধান। আপলোড করলে মডারেটর দেখে অনুমোদন দেওয়ার পর সবাই দেখতে পাবে। নিজের বানানো বা শেয়ার করার অনুমতি আছে এমন ফাইলই দিন।</p><div id="ntFormBox"></div></div>
      <div class="feedbar"><div class="fchips">${sc.map(x => `<button class="fc sm" data-nsc="${x[0]}" aria-pressed="${S.scope === x[0]}">${x[1]}</button>`).join('')}</div></div>
      <div class="feedbar"><div class="fchips"><button class="fc sm" data-nc="" aria-pressed="${!S.c}">সব কোর্স</button>${Object.keys(CM).map(c => `<button class="fc sm" data-nc="${esc(c)}" style="--c:${CM[c].c}" aria-pressed="${S.c === c}"><span class="dot"></span>${esc(CM[c].n)}</button>`).join('')}</div></div>
      <div class="frow" style="margin:8px 0"><input class="fld sm" id="ntQ" type="search" placeholder="নোট খুঁজুন…" value="${esc(S.q)}" style="max-width:240px"><select class="fld sm" id="ntSort" aria-label="সাজান"><option value="helpful" ${S.sort === 'helpful' ? 'selected' : ''}>সবচেয়ে উপকারী আগে</option><option value="new" ${S.sort === 'new' ? 'selected' : ''}>নতুন আগে</option></select></div>
      <div class="fchips" id="ntTags" style="margin-bottom:10px"></div><div id="ntList" class="sx-grid"></div><div id="ntMore"></div>`;
    if (S.form) formDraw();
    drawTags(); drawList();
  }
  function drawTags() { const b = document.getElementById('ntTags'); if (b) b.innerHTML = S.tags.map(t => `<button class="fc sm" data-ntag="${esc(t)}" aria-pressed="${S.tag === t}">#${esc(t)}</button>`).join(''); }
  function cardHtml(n) {
    const CM = X.CM, co = CM[n.c] || { n: n.c, c: '#888' }, st = n.status;
    return `<article class="sx-card ${st !== 'approved' ? 'dim' : ''}" id="nt-${n.id}"><div class="sx-top"><span class="sx-ic" aria-hidden="true">${ICON[n.ext.slice(1)] || '📄'}</span><div class="gx"><h4 class="sx-t">${esc(n.title)}</h4><div class="chips" style="margin:2px 0 0"><span class="chip course" style="--c:${co.c}">${esc(co.n)}</span>${n.tags.map(t => `<span class="chip gray">#${esc(t)}</span>`).join('')}</div></div>
      <details class="pmenu"><summary aria-label="আরও">⋯</summary><div>${!n.mine && st === 'approved' ? `<button data-nrep="${n.id}">রিপোর্ট করুন</button>` : ''}${n.canManage ? `<button data-ndel="${n.id}">মুছুন</button>` : ''}</div></details></div>
      ${n.desc ? `<p class="sx-d">${esc(n.desc)}</p>` : ''}
      <div class="sx-meta"><span>${X.av(n.author, 22)} ${esc(n.author.name)} · ${esc(n.author.batch)}</span><span>${X.ago(n.created)}</span><span>${esc(n.ext.slice(1).toUpperCase())} · ${X.size(n.size)}</span>${st === 'approved' ? `<span>⬇ ${bn(n.dl)}</span>` : ''}</div>
      ${st === 'pending' ? `<div class="chips"><span class="chip sig">⏳ অনুমোদনের অপেক্ষায়</span></div>` : st === 'rejected' ? `<div class="chips"><span class="chip sig">❌ অনুমোদন হয়নি${n.reason ? ': ' + esc(n.reason) : ''}</span></div>` : ''}
      <div class="sx-act"><a class="btn ghost sm" href="/api/c/notes/${n.id}/file" target="_blank" rel="noopener">খুলুন</a><a class="btn ghost sm" href="/api/c/notes/${n.id}/file?dl=1">ডাউনলোড</a>
        ${st === 'approved' ? `<button class="lk sx-vote ${n.voted ? 'on' : ''}" data-nvote="${n.id}" aria-pressed="${n.voted}" ${n.mine ? 'disabled title="নিজের নোটে ভোট দেওয়া যায় না"' : ''}>👍 উপকারী ${bn(n.votes)}</button>` : ''}
        ${n.canReview ? `<button class="btn ink sm" data-nok="${n.id}">✔ অনুমোদন</button><button class="btn ghost sm" data-nno="${n.id}">✖ বাতিল</button>` : ''}</div></article>`;
  }
  function drawList() {
    const l = document.getElementById('ntList'); if (!l) return;
    l.innerHTML = S.items.length ? S.items.map(cardHtml).join('') : `<div class="miss" style="grid-column:1/-1">${S.loading ? 'লোড হচ্ছে…' : S.scope === 'pending' ? 'অনুমোদনের অপেক্ষায় কোনো নোট নেই।' : S.scope === 'mine' ? 'আপনি এখনো কোনো নোট আপলোড করেননি।' : 'এখনো কোনো নোট নেই। প্রথম নোটটি আপনিই দিন!'}</div>`;
    const mb = document.getElementById('ntMore'); if (mb) mb.innerHTML = S.more ? '<div class="frow" style="justify-content:center"><button class="btn ghost" id="ntMoreBtn">আরও দেখুন</button></div>' : '';
  }
  async function load(reset) {
    if (!X.me) return; if (reset) { S.off = 0; } S.loading = true;
    try {
      const qs = new URLSearchParams({ scope: S.scope, sort: S.sort, off: S.off }); if (S.c) qs.set('c', S.c); if (S.q) qs.set('q', S.q); if (S.tag) qs.set('tag', S.tag);
      const j = await X.api('GET', '/api/c/notes?' + qs); S.items = reset ? j.items : S.items.concat(j.items); S.more = j.more; S.total = j.total; S.tags = j.tags; S.pending = j.pending; S.canReview = j.canReview;
    } catch (e) { X.toast(e.message); }
    S.loading = false; if (shown && document.getElementById('ntList')) { drawTags(); drawList(); const nb = mount.querySelector('[data-nsc="pending"]'); if (nb) nb.textContent = 'অনুমোদনের অপেক্ষায় (' + bn(S.pending) + ')'; }
  }
  function formDraw() {
    const b = document.getElementById('ntFormBox'); if (!b) return;
    b.innerHTML = `<div class="lfform"><div class="exrow"><label class="exl" for="nfT">শিরোনাম</label><input class="fld" id="nfT" maxlength="100" placeholder="যেমন: Microbiology Chapter 3 সামারি"></div>
      <div class="exrow"><label class="exl" for="nfC">কোর্স</label><select class="fld" id="nfC"><option value="">বাছুন</option>${Object.keys(X.CM).map(c => `<option value="${esc(c)}">${esc(X.CM[c].n)} — ${esc(X.CM[c].t)}</option>`).join('')}</select></div>
      <div class="exrow"><label class="exl">ট্যাগ (সর্বোচ্চ ৫টি)</label><div class="fchips" id="nfSug">${SUG.map(t => `<button type="button" class="fc sm" data-nsug="${esc(t)}" aria-pressed="${S.picked.includes(t)}">${esc(t)}</button>`).join('')}</div></div>
      <div class="exrow"><label class="exl" for="nfG">নিজের ট্যাগ</label><input class="fld" id="nfG" maxlength="80" placeholder="কমা দিয়ে আলাদা করুন, যেমন: chapter 3, enzyme"></div>
      <div class="exrow"><label class="exl" for="nfD">বিবরণ (ঐচ্ছিক)</label><textarea class="fld" id="nfD" rows="2" maxlength="400" style="height:auto;width:100%" placeholder="কী আছে, কোন সেমিস্টার/শিক্ষকের ক্লাস থেকে"></textarea></div>
      <div class="exrow"><label class="exl" for="nfF">ফাইল</label><input type="file" id="nfF" accept=".pdf,.png,.jpg,.jpeg,.docx,.pptx,.xlsx,.txt"><small class="count">PDF, ছবি, Word/PowerPoint/Excel, টেক্সট; সর্বোচ্চ ৮ MB</small></div>
      <div class="frow"><button class="btn ink" id="nfGo">আপলোড করুন</button></div></div>`;
  }
  async function upload() {
    const v = id => document.getElementById(id), f = v('nfF').files[0]; if (!f) throw new Error('ফাইল বাছুন'); if (f.size > 8 * 1048576) throw new Error('ফাইল ৮ MB-এর বেশি');
    const own = v('nfG').value.split(/[,،]/).map(x => x.trim()).filter(Boolean), tags = [...new Set(S.picked.concat(own))].slice(0, 5);
    const b = v('nfGo'); b.disabled = true; b.textContent = 'আপলোড হচ্ছে…';
    try { const data = await X.toBase64(f); const n = await X.api('POST', '/api/c/notes', { title: v('nfT').value, c: v('nfC').value, tags, desc: v('nfD').value, name: f.name, data }); S.form = false; S.picked = []; S.scope = 'mine'; X.toast(n.status === 'approved' ? 'নোট প্রকাশিত হয়েছে' : 'আপলোড হয়েছে, মডারেটর অনুমোদন দিলে সবাই দেখবে'); shell(); await load(true); }
    finally { b.disabled = false; b.textContent = 'আপলোড করুন'; }
  }
  function swap(n) { const i = S.items.findIndex(x => x.id === n.id); if (i >= 0) S.items[i] = n; const el = document.getElementById('nt-' + n.id); if (el) { const t = document.createElement('div'); t.innerHTML = cardHtml(n); el.replaceWith(t.firstElementChild); } }
  let tm; const debounce = fn => { clearTimeout(tm); tm = setTimeout(fn, 350); };

  X.register(() => {
    const tabs = document.getElementById('filesTabs'), off = document.getElementById('officialBox'); mount = document.getElementById('notesMount'); if (!tabs || !mount) return;
    const show = which => { shown = which === 'notes'; off.hidden = shown; mount.hidden = !shown; tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.ft === which))); if (shown) { shell(); load(true); } };
    tabs.addEventListener('click', e => { const b = e.target.closest('[data-ft]'); if (b) show(b.dataset.ft); });
    window.addEventListener('hashchange', () => { if (location.hash === '#notes') { show('notes'); X.goto('files'); } });
    if (location.hash === '#notes') show('notes');
    X.onAuth(() => { if (shown) { shell(); load(true); } });
    mount.addEventListener('click', e => {
      const t = e.target, c = s => t.closest(s); let el;
      if (c('#ntNew')) { S.form = !S.form; c('#ntNew').textContent = S.form ? 'বন্ধ করুন' : '+ নোট আপলোড'; const b = document.getElementById('ntFormBox'); if (S.form) formDraw(); else b.innerHTML = ''; return; }
      if (c('#nfGo')) { guard(upload); return; }
      if ((el = c('[data-nsug]'))) { const k = el.dataset.nsug, i = S.picked.indexOf(k); if (i >= 0) S.picked.splice(i, 1); else if (S.picked.length < 5) S.picked.push(k); el.setAttribute('aria-pressed', String(S.picked.includes(k))); return; }
      if ((el = c('[data-nsc]'))) { S.scope = el.dataset.nsc; mount.querySelectorAll('[data-nsc]').forEach(b => b.setAttribute('aria-pressed', String(b === el))); load(true); return; }
      if ((el = c('[data-nc]'))) { S.c = el.dataset.nc; mount.querySelectorAll('[data-nc]').forEach(b => b.setAttribute('aria-pressed', String(b === el))); load(true); return; }
      if ((el = c('[data-ntag]'))) { S.tag = S.tag === el.dataset.ntag ? '' : el.dataset.ntag; load(true); return; }
      if (c('#ntMoreBtn')) { S.off = S.items.length; load(false); return; }
      if ((el = c('[data-nvote]'))) { guard(async () => swap(await X.api('POST', '/api/c/notes/' + el.dataset.nvote + '/vote', {}))); return; }
      if ((el = c('[data-nok]'))) { guard(async () => { await X.api('POST', '/api/c/notes/' + el.dataset.nok + '/review', { action: 'approve' }); X.toast('অনুমোদন হয়েছে'); load(true); }); return; }
      if ((el = c('[data-nno]'))) { const why = prompt('কেন বাতিল করছেন? (আপলোডকারী দেখতে পাবেন, ঐচ্ছিক)'); if (why === null) return; guard(async () => { await X.api('POST', '/api/c/notes/' + el.dataset.nno + '/review', { action: 'reject', reason: why }); X.toast('বাতিল করা হয়েছে'); load(true); }); return; }
      if ((el = c('[data-ndel]'))) { if (!confirm('নোটটি মুছবেন?')) return; guard(async () => { await X.api('DELETE', '/api/c/notes/' + el.dataset.ndel); S.items = S.items.filter(x => x.id !== +el.dataset.ndel); drawList(); }); return; }
      if ((el = c('[data-nrep]'))) { const why = prompt('কেন রিপোর্ট করছেন? (সংক্ষেপে)'); if (why === null) return; guard(async () => { await X.api('POST', '/api/c/report', { kind: 'note', id: +el.dataset.nrep, reason: why }); X.toast('রিপোর্ট জমা হয়েছে, অ্যাডমিন দেখবেন'); }); }
    });
    mount.addEventListener('input', e => { if (e.target.id === 'ntQ') { S.q = e.target.value; debounce(() => load(true)); } });
    mount.addEventListener('change', e => { if (e.target.id === 'ntSort') { S.sort = e.target.value; load(true); } });
  });
})();
