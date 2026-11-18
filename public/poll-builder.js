/* পোল/সার্ভে বানানোর ফর্ম: কমিউনিটি (CR) ও অ্যাডমিন প্যানেল দুই জায়গায় একই কোড চলে।
   PollBuilder.mount(el, { batches: [..] (শুধু অ্যাডমিনের জন্য), onSubmit: async payload => {} }) */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  if (!document.getElementById('pbCss')) {
    const st = document.createElement('style'); st.id = 'pbCss';
    st.textContent = `.pb{display:grid;gap:10px}.pb label{display:block;font-weight:600;font-size:14px;margin:0 0 3px}.pb input,.pb select,.pb textarea{width:100%;border:1px solid var(--line,#D2DDD7);border-radius:9px;background:var(--card,#fff);color:inherit;padding:8px 11px;font:inherit}
.pb textarea{resize:vertical;min-height:70px}.pb .pbq{border:1px dashed var(--line,#D2DDD7);border-radius:12px;padding:10px;display:grid;gap:8px}.pb .pbh{display:flex;gap:8px;align-items:center;justify-content:space-between}
.pb .pbr{display:flex;gap:10px;flex-wrap:wrap}.pb .pbr>*{flex:1;min-width:150px}.pb .pbc{display:flex;gap:14px;flex-wrap:wrap}.pb .pbc label{display:flex;gap:6px;align-items:center;font-weight:500;margin:0}.pb .pbc input{width:auto}
.pb button{border:1px solid var(--line,#D2DDD7);background:var(--card,#fff);color:inherit;border-radius:9px;padding:6px 12px;font:inherit;font-weight:600;cursor:pointer}.pb button.pbgo{background:var(--ink,#10243E);color:var(--paper,#fff);border-color:transparent;padding:9px 18px}
.pb .pbm{color:var(--signal,#D6336C);font-weight:500}.pb small{color:var(--muted,#5A6B7C)}`;
    document.head.appendChild(st);
  }
  const TYPES = [['single', 'একটি বাছাই (রেডিও)'], ['multi', 'একাধিক বাছাই (চেকবক্স)'], ['text', 'ছোট লেখা'], ['rating', 'রেটিং (১–৫)']];
  window.PollBuilder = {
    mount(el, opt) {
      opt = opt || {}; let qs = [{ t: 'single', q: '', opts: '' }];
      const draw = () => {
        el.innerHTML = `<div class="pb"><div><label>শিরোনাম</label><input data-pb="title" maxlength="120" placeholder="যেমন: ক্লাস টেস্টের তারিখ কোনটি সুবিধা?"></div>
        <div><label>বিবরণ (ঐচ্ছিক)</label><input data-pb="desc" maxlength="300"></div>
        ${qs.map((x, i) => `<div class="pbq"><div class="pbh"><b>প্রশ্ন ${i + 1}</b>${qs.length > 1 ? `<button type="button" data-pbx="${i}" aria-label="প্রশ্নটি সরান">সরান</button>` : ''}</div>
          <div class="pbr"><div style="flex:3"><label>প্রশ্ন</label><input data-pbq="${i}" data-k="q" maxlength="200" value="${esc(x.q)}"></div><div><label>ধরন</label><select data-pbq="${i}" data-k="t">${TYPES.map(t => `<option value="${t[0]}" ${x.t === t[0] ? 'selected' : ''}>${t[1]}</option>`).join('')}</select></div></div>
          ${x.t === 'single' || x.t === 'multi' ? `<div><label>অপশন (প্রতি লাইনে একটি, ২–১০টি)</label><textarea data-pbq="${i}" data-k="opts" placeholder="রবিবার&#10;সোমবার&#10;মঙ্গলবার">${esc(x.opts)}</textarea></div>` : ''}</div>`).join('')}
        ${qs.length < 12 ? '<div><button type="button" data-pbadd>+ আরেকটি প্রশ্ন যোগ করুন (সার্ভে)</button></div>' : ''}
        <div class="pbr"><div><label>শেষ সময় (ঐচ্ছিক)</label><input type="datetime-local" data-pb="closes"></div>
          <div><label>ফলাফল কখন দেখা যাবে</label><select data-pb="show"><option value="after">উত্তর দেওয়ার পরই</option><option value="close">পোল বন্ধ হলে</option><option value="creator">শুধু আমি দেখব</option></select></div></div>
        ${opt.batches ? `<div><label>কাদের জন্য (কিছু না বাছলে সবার জন্য)</label><div class="pbc">${opt.batches.map(b => `<label><input type="checkbox" data-pbb value="${esc(b)}"> ${esc(b)}</label>`).join('')}</div></div>` : '<small>এই পোল শুধু আপনার ব্যাচের সদস্যরা দেখবে।</small>'}
        <div class="pbc"><label><input type="checkbox" data-pb="anon" checked> নামহীন (কে কী উত্তর দিয়েছে জানা যাবে না; কে উত্তর দিয়েছে শুধু সেই তালিকা আসবে না)</label></div>
        <div class="pbm" id="pbMsg" role="alert"></div>
        <div><button type="button" class="pbgo" data-pbgo>প্রকাশ করুন</button></div></div>`;
      };
      const keep = () => { el.querySelectorAll('[data-pbq]').forEach(n => { qs[+n.dataset.pbq][n.dataset.k] = n.value; }); };
      el.onchange = e => { if (e.target.matches('[data-pbq][data-k="t"]')) { keep(); const tit = el.querySelector('[data-pb="title"]').value, ds = el.querySelector('[data-pb="desc"]').value; draw(); el.querySelector('[data-pb="title"]').value = tit; el.querySelector('[data-pb="desc"]').value = ds; } };
      el.onclick = async e => {
        const b = e.target.closest('button'); if (!b) return;
        const keepTop = () => { const t = el.querySelector('[data-pb="title"]').value, d = el.querySelector('[data-pb="desc"]').value; return () => { el.querySelector('[data-pb="title"]').value = t; el.querySelector('[data-pb="desc"]').value = d; }; };
        if (b.hasAttribute('data-pbadd')) { keep(); const r = keepTop(); qs.push({ t: 'single', q: '', opts: '' }); draw(); r(); return; }
        if (b.dataset.pbx !== undefined) { keep(); const r = keepTop(); qs.splice(+b.dataset.pbx, 1); draw(); r(); return; }
        if (b.hasAttribute('data-pbgo')) {
          keep(); const v = k => el.querySelector(`[data-pb="${k}"]`), msg = el.querySelector('#pbMsg'); msg.textContent = ''; b.disabled = true;
          try {
            const closes = v('closes').value ? new Date(v('closes').value).toISOString() : '';
            await opt.onSubmit({ title: v('title').value, desc: v('desc').value, closes, show: v('show').value, anon: v('anon').checked, target: [...el.querySelectorAll('[data-pbb]:checked')].map(x => x.value),
              qs: qs.map(x => ({ t: x.t, q: x.q, opts: (x.opts || '').split('\n').map(s => s.trim()).filter(Boolean) })) });
            qs = [{ t: 'single', q: '', opts: '' }]; draw();
          } catch (er) { msg.textContent = er.message; b.disabled = false; }
        }
      };
      draw();
    }
  };
})();
