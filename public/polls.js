/* কমিউনিটির "পোল ও সার্ভে" ট্যাব: CR ও অ্যাডমিন দ্রুত মতামত নেন, সদস্যরা উত্তর দেন, ফলাফল বার-চার্টে দেখা যায়। */
(function () {
  'use strict';
  const X = window.GEBX, esc = X.esc, bn = X.bn;
  let box = null, S = { polls: [], canCreate: false, form: false, loading: false };
  const dt = ts => new Date(ts).toLocaleString('bn-BD', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const TL = { single: 'একটি বাছুন', multi: 'একাধিক বাছতে পারেন', text: 'লিখুন', rating: 'রেটিং দিন' };

  function resultHtml(p) {
    const r = p.results; if (!r) return `<p class="count">${p.show === 'close' ? 'পোল বন্ধ হলে ফলাফল দেখা যাবে।' : p.show === 'creator' ? 'ফলাফল শুধু পোলদাতা দেখছেন।' : 'উত্তর দিলে ফলাফল দেখতে পাবেন।'}</p>`;
    return p.qs.map((q, i) => {
      const x = r[i]; let h = `<div class="sx-rq"><b>${esc(q.q)}</b> <small class="count">${bn(x.n)} জন উত্তর দিয়েছে</small>`;
      if (q.t === 'single' || q.t === 'multi') { const tot = Math.max(1, q.t === 'single' ? x.n : p.total), mx = Math.max(1, ...x.counts); h += q.opts.map((o, k) => `<div class="sx-bar"><span class="sx-bl">${esc(o)}</span><span class="sx-bt"><i style="width:${x.counts[k] / mx * 100}%"></i></span><span class="sx-bn">${bn(x.counts[k])} <small>(${bn(Math.round(x.counts[k] / tot * 100))}%)</small></span></div>`).join(''); }
      else if (q.t === 'rating') { const mx = Math.max(1, ...x.counts); h += `<div class="sx-avg">গড় <b>${bn(x.avg)}</b>/৫</div>` + x.counts.map((c, k) => `<div class="sx-bar"><span class="sx-bl">${'★'.repeat(k + 1)}</span><span class="sx-bt"><i style="width:${c / mx * 100}%"></i></span><span class="sx-bn">${bn(c)}</span></div>`).join(''); }
      else if (x.texts) h += x.texts.length ? `<ul class="sx-tx">${x.texts.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '<p class="count">এখনো কেউ লেখেনি।</p>';
      else h += '<p class="count">লেখা উত্তর শুধু পোলদাতা দেখতে পান।</p>';
      return h + '</div>';
    }).join('');
  }
  function formHtml(p) {
    return `<form class="sx-form" data-pf="${p.id}" onsubmit="return false">${p.qs.map((q, i) => `<fieldset class="sx-fq"><legend>${bn(i + 1)}. ${esc(q.q)} <small class="count">${TL[q.t]}</small></legend>
      ${q.t === 'single' ? q.opts.map((o, k) => `<label class="chk sm"><input type="radio" name="q${p.id}_${i}" value="${k}"> ${esc(o)}</label>`).join('')
      : q.t === 'multi' ? q.opts.map((o, k) => `<label class="chk sm"><input type="checkbox" name="q${p.id}_${i}" value="${k}"> ${esc(o)}</label>`).join('')
      : q.t === 'rating' ? `<div class="sx-stars">${[1, 2, 3, 4, 5].map(k => `<label><input type="radio" name="q${p.id}_${i}" value="${k}"><span>★</span></label>`).join('')}</div>`
      : `<textarea class="fld" name="q${p.id}_${i}" rows="2" maxlength="300" style="height:auto;width:100%"></textarea>`}</fieldset>`).join('')}
      <div class="frow"><button class="btn ink sm" data-pvote="${p.id}">উত্তর জমা দিন</button></div></form>`;
  }
  function pollHtml(p) {
    const meta = [p.by, p.target.length ? 'ব্যাচ ' + p.target.join(', ') : 'সবার জন্য', p.anon ? 'নামহীন' : 'নামসহ'].map(esc).join(' · ');
    return `<article class="post sx-poll" id="pl-${p.id}"><div class="phead"><div class="gx"><b>${esc(p.title)}</b><br><small class="count">${meta} · ${X.ago(p.created)}</small></div>
      <span class="chip ${p.open ? '' : 'gray'}">${p.open ? (p.closes ? 'চলছে, শেষ ' + dt(p.closes) : 'চলছে') : 'বন্ধ'}</span>${p.voted ? '<span class="chip">✔ আপনি উত্তর দিয়েছেন</span>' : ''}
      ${p.mine ? `<details class="pmenu"><summary aria-label="আরও">⋯</summary><div><button data-pclose="${p.id}">${p.open ? 'পোল বন্ধ করুন' : 'আবার চালু করুন'}</button><button data-pdel="${p.id}">মুছুন</button></div></details>` : ''}</div>
      ${p.desc ? `<p class="ptext">${esc(p.desc)}</p>` : ''}
      ${!p.voted && p.open ? formHtml(p) : ''}
      ${p.mine && !p.voted && p.open ? '<p class="count">আপনি পোলদাতা, তাই নিচে সরাসরি ফলাফলও দেখছেন।</p>' : ''}
      ${p.voted || !p.open || p.mine ? resultHtml(p) : '<p class="count">উত্তর দিলে ফলাফল দেখতে পাবেন।</p>'}
      <p class="count">মোট ${bn(p.total)} জন উত্তর দিয়েছে</p>
      ${p.people ? `<details class="sx-pp"><summary>কারা উত্তর দিয়েছে (${bn(p.people.length)})</summary><p class="count">${p.people.map(x => esc(x.name) + ' (' + esc(x.batch) + ')').join(', ') || '—'}</p></details>` : ''}</article>`;
  }
  function draw() {
    if (!box) return;
    box.innerHTML = `<div class="composer"><div class="frow" style="margin:0;justify-content:space-between;align-items:center"><b>📊 পোল ও সার্ভে</b>${S.canCreate ? `<button class="btn ink sm" id="plNew">${S.form ? 'বন্ধ করুন' : '+ নতুন পোল / সার্ভে'}</button>` : ''}</div>
      <p class="count" style="margin:6px 0 0">${S.canCreate ? 'আপনি CR, তাই আপনার ব্যাচের জন্য পোল বা সার্ভে দিতে পারেন।' : 'ক্লাস রিপ্রেজেন্টেটিভ (CR) বা অ্যাডমিন দ্রুত মতামত নেওয়ার জন্য এখানে পোল দেন। উত্তর দিন, ফলাফল দেখুন। নতুন পোল দিতে চাইলে CR হতে অ্যাডমিনকে বলুন।'}</p><div id="plFormBox"></div></div>
      <div id="plList">${S.loading ? '<p class="count">লোড হচ্ছে…</p>' : S.polls.length ? S.polls.map(pollHtml).join('') : '<div class="miss">এখন আপনার জন্য কোনো পোল বা সার্ভে নেই।</div>'}</div>`;
    if (S.form) PollBuilder.mount(box.querySelector('#plFormBox'), { onSubmit: async b => { await X.api('POST', '/api/c/polls', b); S.form = false; X.toast('পোল প্রকাশিত হয়েছে, ব্যাচের সবাইকে জানানো হয়েছে'); await load(); } });
  }
  async function load() { S.loading = !S.polls.length; draw(); try { const j = await X.api('GET', '/api/c/polls'); S.polls = j.polls; S.canCreate = j.canCreate; } catch (e) { X.toast(e.message); } S.loading = false; draw(); }
  const swap = p => { const i = S.polls.findIndex(x => x.id === p.id); if (i >= 0) S.polls[i] = p; const el = document.getElementById('pl-' + p.id); if (el) { const t = document.createElement('div'); t.innerHTML = pollHtml(p); el.replaceWith(t.firstElementChild); } };
  const guard = async fn => { try { await fn(); } catch (e) { X.toast(e.message); } };
  function collect(p) {
    const f = box.querySelector(`[data-pf="${p.id}"]`);
    return p.qs.map((q, i) => { const els = [...f.querySelectorAll(`[name="q${p.id}_${i}"]`)];
      if (q.t === 'multi') return els.filter(e => e.checked).map(e => +e.value);
      if (q.t === 'text') return els[0].value.trim();
      const c = els.find(e => e.checked); return c ? +c.value : null; });
  }
  X.tabs.push({ id: 'polls', label: '📊 পোল ও সার্ভে', render(body) { box = body; S.form = false; load(); } });
  document.addEventListener('click', e => {
    if (!box || !box.isConnected) return; const t = e.target, c = s => t.closest(s); let el;
    if (!box.contains(t)) return;
    if (c('#plNew')) { S.form = !S.form; draw(); return; }
    if ((el = c('[data-pvote]'))) { const p = S.polls.find(x => x.id === +el.dataset.pvote); guard(async () => { el.disabled = true; try { swap(await X.api('POST', '/api/c/polls/' + p.id + '/vote', { a: collect(p) })); X.toast('উত্তর জমা হয়েছে'); } finally { el.disabled = false; } }); return; }
    if ((el = c('[data-pclose]'))) { guard(async () => { swap(await X.api('POST', '/api/c/polls/' + el.dataset.pclose + '/close', {})); }); return; }
    if ((el = c('[data-pdel]'))) { if (!confirm('পোলটি ও এর সব উত্তর মুছে যাবে। নিশ্চিত?')) return; guard(async () => { await X.api('DELETE', '/api/c/polls/' + el.dataset.pdel); S.polls = S.polls.filter(x => x.id !== +el.dataset.pdel); draw(); }); }
  });
})();
