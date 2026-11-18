/* GEB Hub: ক্যারিয়ার, চরিত্র, ব্যাজ ও সার্টিফিকেট (v3.18)
   ডাক্তার / নার্স / টেকনিশিয়ান বাছুন, ক্যারিয়ার-পয়েন্ট (CP) জমিয়ে পদবি বাড়ান, ব্যাজ জিতুন, শর্ত পূরণে সার্টিফিকেট (PNG) নামান।
   সার্টিফিকেট GEB হাবের শিক্ষামূলক সিমুলেশনের অংশগ্রহণ-সনদ, আসল চিকিৎসা-পেশাগত সনদ নয়। */
(function () {
  'use strict';
  var K = window.GEBHospKit, C = window.GEBCareer; if (!K || !C) return;
  var D = C.D, esc = K.esc, bn = K.bn, $ = K.$, $$ = K.$$, S = C.S, openCert = null;
  var FONT = '"Hind Siliguri",system-ui,sans-serif';

  function wrap(x, text, w) { var words = String(text).split(' '), lines = [], cur = ''; words.forEach(function (wd) { var t = cur ? cur + ' ' + wd : wd; if (x.measureText(t).width > w && cur) { lines.push(cur); cur = wd; } else cur = t; }); if (cur) lines.push(cur); return lines; }
  function dateBn(ts) { try { return new Date(ts).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' }); } catch (e) { return bn(new Date(ts).toISOString().slice(0, 10)); } }

  /* ---------- সার্টিফিকেট আঁকা ---------- */
  function drawCert(cv, c) {
    var rec = S.certs[c.id], W = 1200, H = 840, x = cv.getContext('2d'); cv.width = W; cv.height = H;
    var name = S.name || rec.name || 'শিক্ষার্থী', R = D.ROLES[rec.role] || C.roleInfo();
    x.fillStyle = '#fffdf6'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#0b8f73'; x.lineWidth = 10; x.strokeRect(24, 24, W - 48, H - 48); x.strokeStyle = '#c9a43a'; x.lineWidth = 3; x.strokeRect(44, 44, W - 88, H - 88);
    x.textAlign = 'center'; x.fillStyle = '#0b8f73'; x.font = '700 26px ' + FONT; x.fillText('GEB হাব · ভার্চুয়াল হাসপাতাল', W / 2, 110);
    x.fillStyle = '#10243E'; x.font = '800 54px ' + FONT; x.fillText('অংশগ্রহণ ও দক্ষতার সার্টিফিকেট', W / 2, 190);
    x.fillStyle = '#5a6b7c'; x.font = '500 24px ' + FONT; x.fillText('এই মর্মে প্রত্যয়ন করা যাচ্ছে যে', W / 2, 260);
    x.fillStyle = '#065e4b'; x.font = '800 68px ' + FONT; x.fillText(name, W / 2, 350);
    x.strokeStyle = '#c9a43a'; x.lineWidth = 2; x.beginPath(); x.moveTo(W / 2 - 280, 372); x.lineTo(W / 2 + 280, 372); x.stroke();
    x.fillStyle = '#10243E'; x.font = '600 26px ' + FONT; x.fillText(R.ic + ' ' + R.n + ' চরিত্রে · পদবি: ' + (rec.title || R.ranks[0]), W / 2, 424);
    x.font = '500 28px ' + FONT; x.fillText('সিমুলেশনে সফলভাবে সম্পন্ন করেছেন', W / 2, 482);
    x.fillStyle = '#0b8f73'; x.font = '800 42px ' + FONT; wrap(x, c.ic + ' ' + c.n, W - 220).forEach(function (l, i) { x.fillText(l, W / 2, 548 + i * 52); });
    x.fillStyle = '#5a6b7c'; x.font = '500 22px ' + FONT; x.fillText(c.d, W / 2, 620);
    x.fillStyle = '#10243E'; x.font = '600 22px ' + FONT; x.textAlign = 'left'; x.fillText('তারিখ: ' + dateBn(rec.ts), 110, 710); x.fillText('সনদ নং: ' + rec.no, 110, 746);
    x.textAlign = 'right'; x.fillText('ক্যারিয়ার-পয়েন্ট: ' + bn(S.cp) + ' CP', W - 110, 710);
    x.beginPath(); x.arc(W - 190, 120, 0, 0, 7);
    x.textAlign = 'center'; x.fillStyle = '#c9a43a'; x.beginPath(); x.arc(W / 2, 700, 52, 0, 7); x.fill(); x.fillStyle = '#fffdf6'; x.beginPath(); x.arc(W / 2, 700, 44, 0, 7); x.fill(); x.font = '44px ' + FONT; x.fillStyle = '#10243E'; x.fillText(c.ic, W / 2, 716);
    x.fillStyle = '#8a98a6'; x.font = '500 17px ' + FONT; x.fillText('⚠️ এটি শিক্ষামূলক সিমুলেশনের অংশগ্রহণ-সনদ; কোনো আসল চিকিৎসা, নার্সিং বা টেকনোলজি পেশাগত সনদ বা নিবন্ধন নয়।', W / 2, 796);
  }
  function download(cv, id) { cv.toBlob(function (b) { if (!b) return; var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'GEB-certificate-' + id + '.png'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }, 'image/png'); }

  function render() {
    var body = $('#hpBody'), r = C.roleInfo(), ri = C.rank(), nextCp = D.RANK_CP[ri + 1], had = S.badges || {};
    var pct = nextCp ? Math.round(100 * (S.cp - D.RANK_CP[ri]) / (nextCp - D.RANK_CP[ri])) : 100, nb = D.BADGES.filter(function (b) { return had[b.id]; }).length;
    body.innerHTML = '<div class="hp-card"><h3>🎭 আপনার চরিত্র</h3><p class="hp-mut">চরিত্র বদলালে ডিউটি মোড, ECG, X-ray ও নমুনা-দক্ষতার প্রশ্ন সেই ভূমিকার কাজ অনুযায়ী হয়। অগ্রগতি (CP, ব্যাজ, সার্টিফিকেট) সব চরিত্রে জমে।</p>' +
      '<div class="cr-roles">' + Object.keys(D.ROLES).map(function (k) { var o = D.ROLES[k]; return '<button type="button" class="cr-role' + (k === C.role() ? ' on' : '') + '" data-r="' + k + '" aria-pressed="' + (k === C.role()) + '"><span class="ic">' + o.ic + '</span><b>' + o.n + '</b><small>' + esc(o.d) + '</small><em>' + esc(o.focus) + '</em></button>'; }).join('') + '</div>' +
      '<label class="cr-name">আপনার নাম (সার্টিফিকেটে বসবে)<input type="text" id="crName" maxlength="40" value="' + esc(S.name) + '" placeholder="যেমন: সাদিয়া রহমান"></label>' +
      '<div class="cr-rank"><div><b>' + r.ic + ' ' + esc(C.title()) + '</b> <span class="hp-mut">· ' + bn(S.cp) + ' CP</span></div><div class="cr-bar" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + pct + '%"></i></div><p class="hp-mut">' + (nextCp ? 'পরের পদবি "' + esc(r.ranks[ri + 1]) + '": আরও ' + bn(nextCp - S.cp) + ' CP' : 'সর্বোচ্চ পদবিতে পৌঁছেছেন 🎉') + '</p><p class="hp-mut">CP জমে: প্রতিটি ঠিক উত্তরে ২, প্রতিটি কেস/শিফট শেষে ৩ × তারা।</p></div></div>' +
      '<div class="hp-card"><h3>🏅 ব্যাজ <span class="hp-mut">(' + bn(nb) + '/' + bn(D.BADGES.length) + ')</span></h3><div class="cr-badges">' + D.BADGES.map(function (b) { var on = !!had[b.id]; return '<div class="cr-badge' + (on ? ' on' : '') + '" title="' + esc(b.d) + '"><span class="ic">' + (on ? b.ic : '🔒') + '</span><b>' + esc(b.n) + '</b><small>' + esc(b.d) + '</small></div>'; }).join('') + '</div></div>' +
      '<div class="hp-card"><h3>📜 সার্টিফিকেট</h3><p class="hp-mut">শর্ত পূরণ হলে সার্টিফিকেট নিজে খুলে যায়। এগুলো শিক্ষামূলক অংশগ্রহণ-সনদ, আসল পেশাগত সনদ নয়।</p><div class="cr-certs">' + D.CERTS.map(function (c) {
        var p = D.certProgress(c, S), got = S.certs[c.id];
        return '<div class="cr-cert' + (got ? ' on' : '') + '"><div class="h"><span class="ic">' + c.ic + '</span><div><b>' + esc(c.n) + '</b><small>' + esc(c.d) + '</small></div></div><ul>' + p.rows.map(function (q) { return '<li class="' + (q.ok ? 'y' : '') + '">' + (q.ok ? '✔' : '○') + ' ' + esc(q.t) + ' <span class="hp-mut">(' + bn(q.cur) + '/' + bn(q.max) + ')</span></li>'; }).join('') + '</ul>' + (got ? '<button type="button" class="hp-btn pri sm" data-cert="' + c.id + '">📜 সার্টিফিকেট দেখুন ও নামান</button>' : '<span class="hp-mut">এখনো খোলেনি</span>') + '</div>';
      }).join('') + '</div><div id="crView"></div></div>' +
      '<div class="hp-card"><button type="button" class="hp-btn sm" id="crReset">🗑️ ক্যারিয়ারের অগ্রগতি রিসেট</button> <span class="hp-mut">(কেসের তারা ও XP অক্ষত থাকে)</span></div>';
    $('.cr-roles', body).onclick = function (e) { var b = e.target.closest('.cr-role'); if (b) { C.setRole(b.dataset.r); render(); } };
    $('#crName', body).onchange = function (e) { C.setName(e.target.value); render(); };
    body.onclick = function (e) { var b = e.target.closest('[data-cert]'); if (b) show(b.dataset.cert); };
    $('#crReset', body).onclick = function () { if (!confirm('ক্যারিয়ারের CP, ব্যাজ ও সার্টিফিকেট মুছে যাবে। নিশ্চিত?')) return; var role = S.role, name = S.name, f = D.freshState(); Object.keys(S).forEach(function (k) { delete S[k]; }); Object.assign(S, f, { role: role, name: name }); K.save(); render(); };
    if (openCert) show(openCert);
  }
  function show(id) {
    openCert = id; var c = D.CERTS.filter(function (x) { return x.id === id; })[0], v = $('#crView'); if (!v || !S.certs[id]) return;
    v.innerHTML = '<div class="cr-view"><canvas id="crCv" class="cr-cv" role="img" aria-label="' + esc(c.n) + '"></canvas><div class="hp-nav"><button type="button" class="hp-btn pri" id="crDl">⬇️ PNG নামান</button><button type="button" class="hp-btn" id="crClose">বন্ধ</button></div>' + (S.name ? '' : '<p class="hp-mut">নাম দিলে সার্টিফিকেটে বসবে। ওপরে নামের ঘর দেখুন।</p>') + '</div>';
    var cv = $('#crCv'); drawCert(cv, c); $('#crDl').onclick = function () { download(cv, id); }; $('#crClose').onclick = function () { openCert = null; v.innerHTML = ''; };
    v.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  K.addTab('career', '🎖️ ক্যারিয়ার', function () { C.check(); render(); });
})();
