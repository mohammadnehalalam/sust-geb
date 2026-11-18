/* আজকের জন্মদিন (হোমপেজ): ছবিসহ কার্ড, এক ট্যাপে উইশ। সদস্য নিজে প্রোফাইলে জন্মদিন দিলে ও অনুমতি দিলে তবেই দেখায়। */
(function () {
  'use strict';
  const X = window.GEBX, esc = X.esc, bn = X.bn;
  let box = null, data = null, openMy = false, my = null, busy = false;
  const confetti = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? '' : '<span class="sx-cf" aria-hidden="true">' + Array.from({ length: 14 }, (_, i) => `<i style="left:${(i * 7 + 3) % 100}%;animation-delay:${(i % 7) * .35}s;background:${['#34D399', '#38BDF8', '#FBBF24', '#FB7185'][i % 4]}"></i>`).join('') + '</span>';
  function draw() {
    if (!box) return;
    if (!data || !data.count) { box.innerHTML = ''; box.hidden = true; return; }
    box.hidden = false;
    if (!data.list.length) { box.innerHTML = `<div class="wrap"><div class="sx-bd"><span class="sx-bde">🎂</span><div class="gx"><b>আজ ${bn(data.count)} জন সদস্যের জন্মদিন!</b><br><small class="count">কার জন্মদিন দেখতে ও উইশ করতে কমিউনিটিতে লগইন করুন।</small></div><a class="btn ink sm" href="#community">লগইন করুন</a></div></div>`; return; }
    box.innerHTML = `<div class="wrap"><div class="sx-bd">${confetti()}<div class="sx-bdh"><b>🎂 আজ যাদের জন্মদিন</b><small class="count">উইশ করতে ট্যাপ করুন</small></div><div class="sx-bdl">${data.list.map(p => card(p)).join('')}</div></div></div>`;
  }
  function card(p) {
    const guest = !X.me;
    return `<div class="sx-bc ${p.self ? 'me' : ''}" id="bd-${p.id}">${X.av(p, 64)}<div class="gx"><b>${esc(p.name)}</b>${p.self ? ' <span class="chip">আপনি</span>' : ''}<br><small class="count">${esc(p.batch)} · 🎉 ${bn(p.wishes)} উইশ</small></div>
      ${p.self ? `<button class="btn ink sm" data-bdmy>${openMy ? 'লুকান' : '🎁 আমার উইশগুলো'}</button>`
        : guest ? '<a class="btn ink sm" href="#community">লগইন করে উইশ করুন</a>'
        : p.wished ? '<span class="chip">✔ উইশ করেছেন</span>'
        : `<button class="btn ink sm" data-bdw="${p.id}" data-m="0">🎉 উইশ করুন</button><details class="pmenu"><summary aria-label="অন্য বার্তা">▾</summary><div>${(data.msgs || []).map((m, i) => `<button data-bdw="${p.id}" data-m="${i}">${esc(m)}</button>`).join('')}</div></details>`}
      ${p.self && openMy ? `<div class="sx-bw">${my ? (my.length ? my.map(w => `<p><b>${esc(w.name)}</b> <small class="count">${esc(w.batch)}</small><br>${esc(w.text)}</p>`).join('') : '<p class="count">এখনো কেউ উইশ করেনি। কিছুক্ষণ পরে দেখুন।</p>') : '<p class="count">লোড হচ্ছে…</p>'}</div>` : ''}</div>`;
  }
  async function load() { try { data = await X.api('GET', '/api/c/birthdays/today'); } catch (_) { data = null; } draw(); }
  X.register(() => {
    box = document.getElementById('bdayStrip'); if (!box) return;
    X.onAuth(() => { openMy = false; my = null; load(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && data) { const d = new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10); if (d !== data.day) load(); } });
    box.addEventListener('click', async e => {
      const t = e.target; let el;
      if (t.closest('[data-bdmy]')) { openMy = !openMy; draw(); if (openMy) { try { my = (await X.api('GET', '/api/c/wishes')).wishes; } catch (er) { X.toast(er.message); } draw(); } return; }
      if ((el = t.closest('[data-bdw]'))) {
        if (busy) return; busy = true;
        try { await X.api('POST', '/api/c/wish', { to: +el.dataset.bdw, msg: +el.dataset.m }); X.toast('🎉 উইশ পাঠানো হয়েছে'); await load(); }
        catch (er) { X.toast(er.message); } finally { busy = false; }
      }
    });
  });
})();
