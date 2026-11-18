/* জব সেক্টর: চাকরি, ইন্টার্নশিপ, রিসার্চ/RA ও স্কলারশিপের সার্কুলার।
   - তালিকা সবাই দেখতে পায় (লগইন ছাড়াও)। জমা দিতে, রিপোর্ট করতে লগইন লাগে।
   - সদস্যের জমা মডারেটর/অ্যাডমিন অনুমোদন দিলে চালু হয় (মডারেটরের নিজের জমা সরাসরি চালু)।
   - "আবেদন করুন" সবসময় মূল সাইটে নিয়ে যায়; আমরা শুধু শিরোনাম, সংস্থা, শেষ তারিখ ও লিংক রাখি।
   - সেভ করা সার্কুলারের তালিকা ব্রাউজারে (localStorage: geb_jobs_saved); অ্যাকাউন্ট সিঙ্ক চালু থাকলে ডিভাইসগুলোতেও মেলে। */
(function () {
  'use strict';
  const X = window.GEBX, esc = X.esc, bn = X.bn, KEY = 'geb_jobs_saved';
  const ICON = { job: '💼', internship: '🧑‍🎓', research: '🔬', scholarship: '🏆' };
  const S = { type: '', cat: '', where: '', q: '', within: 0, sort: 'deadline', scope: 'all', off: 0, items: [], more: false, total: 0, pending: 0, canReview: false, meta: null, loading: false, form: false, err: '' };
  let mount = null, started = false, seq = 0;

  /* ---- সেভ করা তালিকা ---- */
  const getSaved = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v) ? v.filter(Number.isInteger) : []; } catch (e) { return []; } };
  const setSaved = a => { try { localStorage.setItem(KEY, JSON.stringify(a.slice(-200))); } catch (e) { } };
  const isSaved = id => getSaved().includes(id);
  const guard = async fn => { try { await fn(); } catch (e) { X.toast(e.message); } };

  const css = document.createElement('style');
  css.textContent = '.jb-ddl{font-weight:700;font-size:14px}.jb-ddl.hot{color:#b3261e}.jb-ddl.soon{color:#b26a00}.jb-ddl.off{color:var(--muted);font-weight:500}.jb-note{margin:0;color:var(--muted);font-size:14px;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.jb-act{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:auto}.jb-warn{font-size:13px;color:var(--muted);margin:6px 0 0}.jb-src{font-size:13px;color:var(--muted)}.jb-st{font-size:13px;font-weight:700;color:#b26a00}.jb-rej{font-size:13px;color:#b3261e}';
  document.head.appendChild(css);

  const fmtDate = d => { try { return new Date(d + 'T00:00:00Z').toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); } catch (e) { return d; } };
  function deadlineHtml(j) {
    if (!j.deadline) return '<span class="jb-ddl off">⏳ শেষ তারিখ দেওয়া নেই, মূল সাইটে দেখে নিন</span>';
    const l = j.left, cls = l < 0 ? 'off' : l <= 3 ? 'hot' : l <= 7 ? 'soon' : '';
    const txt = l < 0 ? 'মেয়াদ শেষ' : l === 0 ? 'আজই শেষ দিন' : l === 1 ? 'আগামীকাল শেষ' : bn(l) + ' দিন বাকি';
    return `<span class="jb-ddl ${cls}">⏳ ${esc(fmtDate(j.deadline))} · ${txt}</span>`;
  }
  const safeLink = l => /^https?:\/\//i.test(l) ? l : '#';

  function cardHtml(j) {
    const M = S.meta || { types: {}, cats: {}, where: {} }, me = X.me, saved = isSaved(j.id);
    const st = j.status === 'pending' ? '<div class="jb-st">⏳ অনুমোদনের অপেক্ষায়' + (j.flagged ? ' (রিপোর্ট হয়েছে)' : '') + '</div>' : j.status === 'rejected' ? `<div class="jb-rej">নেওয়া হয়নি${j.reason ? ': ' + esc(j.reason) : ''}</div>` : '';
    const who = j.by ? 'জমা: ' + esc(j.by) : j.source ? 'সূত্র: ' + esc(j.source) : '';
    return `<article class="sx-card ${j.status !== 'approved' || j.expired ? 'dim' : ''}" id="jb-${j.id}"><div class="sx-top"><span class="sx-ic" aria-hidden="true">${ICON[j.type] || '💼'}</span><div class="gx"><h4 class="sx-t">${esc(j.title)}</h4>
      <p class="sx-d">${esc(j.org || '')}${j.org && j.loc ? ' · ' : ''}${j.loc ? '📍 ' + esc(j.loc) : ''}</p></div></div>
      <div class="chips" style="margin:0"><span class="chip">${esc(M.types[j.type] || j.type)}</span><span class="chip gray">${esc(M.cats[j.cat] || j.cat)}</span><span class="chip gray">${esc(M.where[j.where] || '')}</span></div>
      <div>${deadlineHtml(j)}</div>${j.note ? `<p class="jb-note">${esc(j.note)}</p>` : ''}${st}
      <div class="jb-src">🔗 ${esc(j.host)}${who ? ' · ' + who : ''} · ${esc(X.ago(j.created))}</div>
      <div class="jb-act"><a class="btn ink sm" href="${esc(safeLink(j.link))}" target="_blank" rel="noopener noreferrer nofollow ugc">আবেদন / বিস্তারিত ↗</a>
      ${j.status === 'approved' ? `<button class="btn ghost sm" data-jsv="${j.id}" aria-pressed="${saved}" title="সেভ করুন">${saved ? '★ সেভ করা' : '☆ সেভ'}</button>` : ''}
      ${j.status === 'approved' && me && !j.mine ? `<button class="btn ghost sm" data-jrp="${j.id}" title="ভুয়া বা ভুল হলে জানান">⚑ রিপোর্ট</button>` : ''}
      ${S.canReview && j.status === 'pending' ? `<button class="btn ink sm" data-jrv="approve:${j.id}">অনুমোদন</button><button class="btn ghost sm" data-jrv="reject:${j.id}">বাতিল</button>` : ''}
      ${j.canDelete ? `<button class="btn ghost sm" data-jdl="${j.id}">মুছুন</button>` : ''}</div></article>`;
  }

  function shell() {
    const me = X.me, M = S.meta, scopes = [['all', 'সব সার্কুলার'], ['saved', '★ সেভ করা']].concat(me ? [['mine', 'আমার জমা']] : []).concat(S.canReview ? [['pending', 'অনুমোদনের অপেক্ষায় (' + bn(S.pending) + ')']] : []);
    const chip = (k, v, label) => `<button class="fc sm" data-jf="${k}:${v}" aria-pressed="${S[k] === v}">${label}</button>`;
    mount.innerHTML = `<div class="composer"><div class="frow" style="margin:0;justify-content:space-between;align-items:center"><b>💼 জব সেক্টর</b><button class="btn ink sm" id="jbNew">${S.form ? 'বন্ধ করুন' : '+ সার্কুলার জমা দিন'}</button></div>
      <p class="count" style="margin:6px 0 0">GEB-র শিক্ষার্থীদের জন্য চাকরি, ইন্টার্নশিপ, রিসার্চ সহকারী ও স্কলারশিপের সার্কুলার। কোথাও খালি পদ দেখলে মূল সার্কুলারের লিংকসহ জমা দিন, মডারেটর দেখে অনুমোদন দিলে সবাই দেখবে। আবেদন হবে মূল সাইটে (Bdjobs বা সংস্থার নিজের পাতা)।</p>
      <p class="jb-warn">⚠️ আবেদনের নামে টাকা, পাসওয়ার্ড বা ব্যাংকের তথ্য চাইলে সাবধান, সেটা প্রতারণা হতে পারে। লিংক বাইরের সাইটে খোলে, আগে ঠিকানা দেখে নিন। সন্দেহ হলে "রিপোর্ট" করুন।</p><div id="jbForm"></div></div>
      <div class="feedbar"><div class="fchips">${scopes.map(x => `<button class="fc sm" data-jsc="${x[0]}" aria-pressed="${S.scope === x[0]}">${x[1]}</button>`).join('')}</div></div>
      ${S.scope === 'all' && M ? `<div class="feedbar"><div class="fchips">${chip('type', '', 'সব ধরন')}${Object.keys(M.types).map(k => chip('type', k, ICON[k] + ' ' + esc(M.types[k]))).join('')}</div></div>
      <div class="feedbar"><div class="fchips">${chip('cat', '', 'সব ক্যাটাগরি')}${Object.keys(M.cats).map(k => chip('cat', k, esc(M.cats[k]))).join('')}</div></div>
      <div class="frow" style="margin:8px 0;flex-wrap:wrap"><input class="fld sm" id="jbQ" type="search" placeholder="পদ, সংস্থা বা স্থান খুঁজুন…" value="${esc(S.q)}" style="max-width:260px"><select class="fld sm" id="jbWh" aria-label="কোথায়"><option value="">বাংলাদেশ ও বিদেশ</option>${Object.keys(M.where).map(k => `<option value="${k}" ${S.where === k ? 'selected' : ''}>${esc(M.where[k])}</option>`).join('')}</select><select class="fld sm" id="jbSort" aria-label="সাজান"><option value="deadline" ${S.sort === 'deadline' ? 'selected' : ''}>শেষ তারিখ কাছের আগে</option><option value="new" ${S.sort === 'new' ? 'selected' : ''}>নতুন আগে</option></select><label class="chk" style="margin:0"><input type="checkbox" id="jbWi" ${S.within ? 'checked' : ''}> ৭ দিনের মধ্যে শেষ হবে</label></div>` : ''}
      <div id="jbList" class="sx-grid"></div><div id="jbMore"></div>`;
    if (S.form) formDraw(); drawList();
  }
  function drawList() {
    const l = document.getElementById('jbList'), mo = document.getElementById('jbMore'); if (!l) return;
    if (S.err) { l.innerHTML = `<div class="miss">${esc(S.err)} <button class="btn ghost sm" id="jbRetry">আবার চেষ্টা</button></div>`; mo.innerHTML = ''; return; }
    if (S.loading && !S.items.length) { l.innerHTML = '<div class="miss">লোড হচ্ছে…</div>'; mo.innerHTML = ''; return; }
    l.innerHTML = S.items.length ? S.items.map(cardHtml).join('') : `<div class="miss">${S.scope === 'saved' ? 'এখনো কোনো সার্কুলার সেভ করা হয়নি। কার্ডের "☆ সেভ" চাপুন।' : S.scope === 'mine' ? 'আপনি এখনো কিছু জমা দেননি।' : S.scope === 'pending' ? 'অনুমোদনের অপেক্ষায় কিছু নেই।' : 'এই ফিল্টারে এখন কোনো সার্কুলার নেই। ফিল্টার বদলে দেখুন, বা আপনি কোনোটা জানলে জমা দিন।'}</div>`;
    mo.innerHTML = S.more ? `<div class="frow" style="justify-content:center;margin:12px 0"><button class="btn ghost" id="jbMoreBtn" ${S.loading ? 'disabled' : ''}>আরও দেখুন (${bn(S.total - S.items.length)}টি বাকি)</button></div>` : (S.total ? `<p class="count" style="text-align:center">মোট ${bn(S.total)}টি</p>` : '');
  }
  function formDraw() {
    const b = document.getElementById('jbForm'), M = S.meta; if (!b) return;
    if (!X.me) { X.needLogin(b, 'সার্কুলার জমা দিতে'); return; }
    const sel = (id, o) => `<select class="fld" id="${id}">${Object.keys(o).map(k => `<option value="${k}">${esc(o[k])}</option>`).join('')}</select>`;
    b.innerHTML = `<div class="exbox" style="margin-top:10px"><div class="exrow"><label class="exl" for="jfT">পদের নাম *</label><input class="fld" id="jfT" maxlength="150" placeholder="যেমন: Research Assistant (Molecular Biology)"></div>
      <div class="exrow"><label class="exl" for="jfO">সংস্থা / কোম্পানি</label><input class="fld" id="jfO" maxlength="100"></div>
      <div class="exrow"><label class="exl" for="jfL">স্থান</label><input class="fld" id="jfL" maxlength="80" placeholder="ঢাকা, সিলেট, Remote…"></div>
      <div class="exrow"><label class="exl" for="jfK">আবেদনের লিংক * (মূল সার্কুলারের পাতা)</label><input class="fld" id="jfK" type="url" placeholder="https://…"></div>
      <div class="frow"><div><label class="exl" for="jfTy">ধরন</label>${sel('jfTy', M.types)}</div><div><label class="exl" for="jfC">ক্যাটাগরি</label>${sel('jfC', M.cats)}</div><div><label class="exl" for="jfW">কোথায়</label>${sel('jfW', M.where)}</div><div><label class="exl" for="jfD">শেষ তারিখ</label><input class="fld" id="jfD" type="date"></div></div>
      <div class="exrow"><label class="exl" for="jfN">নোট (যোগ্যতা, কীভাবে আবেদন; ঐচ্ছিক)</label><textarea class="fld" id="jfN" rows="2" maxlength="400"></textarea></div>
      <p class="count">শুধু সত্যিকারের সার্কুলার দিন, যেখানে আবেদনে কোনো টাকা লাগে না। ভুয়া বা বিজ্ঞাপনধর্মী কিছু দিলে বাতিল হবে।</p><div class="frow"><button class="btn ink" id="jfGo">জমা দিন</button></div></div>`;
  }

  async function load(reset) {
    const my = ++seq; if (reset) { S.off = 0; S.items = []; S.more = false; S.total = 0; } S.loading = true; S.err = ''; drawList();
    try {
      let url;
      if (S.scope === 'saved') { const ids = getSaved(); if (!ids.length) { S.loading = false; S.items = []; S.total = 0; S.more = false; drawList(); return; } url = '/api/c/jobs?ids=' + ids.join(','); }
      else { const p = new URLSearchParams({ scope: S.scope, off: String(S.off) }); if (S.scope === 'all') { if (S.type) p.set('type', S.type); if (S.cat) p.set('cat', S.cat); if (S.where) p.set('where', S.where); if (S.q) p.set('q', S.q); if (S.within) p.set('within', '7'); p.set('sort', S.sort); } url = '/api/c/jobs?' + p; }
      const r = await X.api('GET', url); if (my !== seq) return;
      S.meta = { types: r.types, cats: r.cats, where: r.where }; S.canReview = r.canReview; S.pending = r.pending; S.total = r.total; S.more = r.more;
      S.items = reset ? r.jobs : S.items.concat(r.jobs);
      if (S.scope === 'saved') { const order = getSaved(); S.items.sort((a, b) => order.indexOf(b.id) - order.indexOf(a.id)); }
      S.loading = false; if (reset) shell(); else drawList();
    } catch (e) { if (my !== seq) return; S.loading = false; S.err = e.message || 'লোড করা যায়নি'; if (document.getElementById('jbList')) drawList(); else mount.innerHTML = `<div class="miss">${esc(S.err)} <button class="btn ghost sm" id="jbRetry">আবার চেষ্টা</button></div>`; }
  }
  let qTimer = null;
  function wire() {
    mount.addEventListener('click', e => {
      const t = e.target, c = s => t.closest(s); let el;
      if (c('#jbNew')) { S.form = !S.form; shell(); return; }
      if ((el = c('[data-jsc]'))) { S.scope = el.dataset.jsc; load(true).then(() => { }); shell(); return; }
      if ((el = c('[data-jf]'))) { const [k, v] = el.dataset.jf.split(':'); S[k] = S[k] === v ? '' : v; load(true); return; }
      if (c('#jbMoreBtn')) { S.off = S.items.length; load(false); return; }
      if (c('#jbRetry')) { load(true); return; }
      if ((el = c('[data-jsv]'))) { const id = +el.dataset.jsv, a = getSaved(), i = a.indexOf(id); if (i >= 0) a.splice(i, 1); else a.push(id); setSaved(a); if (S.scope === 'saved') { S.items = S.items.filter(x => isSaved(x.id)); S.total = S.items.length; } drawList(); return; }
      if ((el = c('[data-jrp]'))) { if (!confirm('এই সার্কুলারটি ভুয়া বা ভুল মনে হচ্ছে? মডারেটরকে জানানো হবে।')) return; guard(async () => { await X.api('POST', '/api/c/jobs/' + el.dataset.jrp + '/report', {}); X.toast('রিপোর্ট জমা হয়েছে, ধন্যবাদ'); }); return; }
      if ((el = c('[data-jdl]'))) { if (!confirm('এই সার্কুলারটি মুছবেন?')) return; guard(async () => { await X.api('DELETE', '/api/c/jobs/' + el.dataset.jdl); await load(true); }); return; }
      if ((el = c('[data-jrv]'))) { const [a, id] = el.dataset.jrv.split(':'); let reason = ''; if (a === 'reject') { reason = prompt('বাতিলের কারণ (সংক্ষেপে, জমাদাতা দেখবেন)') || ''; } guard(async () => { await X.api('POST', '/api/c/jobs/' + id + '/review', { action: a, reason }); await load(true); }); return; }
      if (c('#jfGo')) {
        guard(async () => {
          const v = id => document.getElementById(id).value, b = c('#jfGo'); b.disabled = true;
          try { const r = await X.api('POST', '/api/c/jobs', { title: v('jfT'), org: v('jfO'), loc: v('jfL'), link: v('jfK'), type: v('jfTy'), cat: v('jfC'), where: v('jfW'), deadline: v('jfD'), note: v('jfN') }); X.toast(r.job.status === 'approved' ? 'প্রকাশিত হয়েছে' : 'জমা হয়েছে। মডারেটর দেখে অনুমোদন দিলে সবাই দেখবে'); S.form = false; S.scope = r.job.status === 'approved' ? 'all' : 'mine'; await load(true); }
          finally { b.disabled = false; }
        }); return;
      }
    });
    mount.addEventListener('input', e => { if (e.target.id === 'jbQ') { clearTimeout(qTimer); const v = e.target.value; qTimer = setTimeout(() => { S.q = v.trim(); load(true).then(() => { const i = document.getElementById('jbQ'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }); }, 350); } });
    mount.addEventListener('change', e => {
      const t = e.target; if (t.id === 'jbWh') { S.where = t.value; load(true); } else if (t.id === 'jbSort') { S.sort = t.value; load(true); } else if (t.id === 'jbWi') { S.within = t.checked ? 7 : 0; load(true); }
    });
  }

  X.register(() => {
    mount = document.getElementById('jobsMount'); if (!mount) return;
    wire(); mount.innerHTML = '<div class="miss">লোড হচ্ছে…</div>';
    const go = () => { if (started) return; started = true; load(true); };
    if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { io.disconnect(); go(); } }, { rootMargin: '300px' }); io.observe(mount); } else go();
    X.onAuth(() => { if (!started) return; if (S.scope === 'mine' || S.scope === 'pending') S.scope = 'all'; load(true); });
  });
})();
