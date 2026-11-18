/* GEB Hub: ল্যাব রিপোর্ট বুঝে ডায়াগনসিস, CBC ও LFT (v3.18)
   ধাপ: ১) অস্বাভাবিক মান চিহ্নিত করুন ২) প্যাটার্ন দেখে রোগ-নির্ণয় ৩) পরবর্তী পদক্ষেপ। আলাদা অংশে নমুনা-দক্ষতা (নার্স-টেকনিশিয়ানের জন্য)। */
(function () {
  'use strict';
  var K = window.GEBHospKit, C = window.GEBCareer, L = window.GEBHospLab; if (!K || !C || !L) return;
  var esc = K.esc, bn = K.bn, $ = K.$, $$ = K.$$, S = C.S, shuffle = C.shuffle;
  var FL = { H: ['↑ বেশি', 'hi'], L: ['↓ কম', 'lo'], N: ['স্বাভাবিক', 'nm'], A: ['অস্বাভাবিক', 'hi'] };
  var GROUPS = [['CBC', '🩸 CBC (সম্পূর্ণ রক্ত-গণনা)'], ['LFT', '🟡 LFT (লিভার ফাংশন)'], ['ABG', '🫁 ABG (রক্তের গ্যাস ও অ্যাসিড-বেস)'], ['ELE', '⚡ ইলেক্ট্রোলাইট'], ['KFT', '🫘 কিডনি (KFT)'], ['TFT', '🦋 থাইরয়েড (TFT)'], ['URI', '💧 ইউরিন R/E'], ['STO', '🧫 স্টুল R/E']];
  function num(v) { return bn(String(v)); }
  function rangeTxt(r) { return r.cat ? 'স্বাভাবিক: ' + esc(r.normal) : r.lo === 0 ? '≤ ' + num(r.hi) : num(r.lo) + ' – ' + num(r.hi); }

  function list() {
    var body = $('#hpBody'), solved = S.lab.solved;
    function card(c) { var d = solved[c.id]; return '<button type="button" class="hp-case" data-c="' + c.id + '"><div class="th">' + c.ic + (d ? '<em>✔ সম্পন্ন</em>' : '') + '</div><div class="bd"><b>' + esc(c.n) + '</b><span>' + bn(c.pt.age) + ' বছর · ' + (c.pt.sex === 'M' ? 'পুরুষ' : 'নারী') + ' · ' + esc(c.pt.hx.split('।')[0]) + '।</span></div></button>'; }
    body.innerHTML = C.roleBar() + '<div class="hp-card hp-intro"><div><h3>🧪 ল্যাব রিপোর্ট পড়ে ডায়াগনসিস</h3><p class="hp-mut">রিপোর্ট দেখে অস্বাভাবিক মান ধরুন, প্যাটার্ন থেকে রোগ ভাবুন, তারপর পরবর্তী পদক্ষেপ ঠিক করুন। সমাধান: <b>' + bn(Object.keys(solved).length) + '/' + bn(L.CASES.length) + '</b></p></div></div>' +
      GROUPS.map(function (g) { return '<h4 class="hd-h">' + g[1] + '</h4><div class="hp-grid">' + L.CASES.filter(function (c) { return c.grp === g[0]; }).map(card).join('') + '</div>'; }).join('') +
      '<h4 class="hd-h">🩸 ব্লাড ব্যাংক ও 🧫 নমুনা</h4><div class="hp-grid"><button type="button" class="hp-case" data-c="cross"><div class="th">🩸</div><div class="bd"><b>রক্ত-গ্রুপ ও ক্রসম্যাচ</b><span>কোন রক্ত কাকে দেওয়া যায়, জরুরি O নেগেটিভ, ট্রান্সফিউশন-প্রতিক্রিয়া (৬টি এলোমেলো প্রশ্ন)।</span><div class="ft">ভুল ছাড়া শেষ করলে ব্যাজ</div></div></button>' +
      '<button type="button" class="hp-case" data-c="skill"><div class="th">🧤</div><div class="bd"><b>নমুনা সংগ্রহ ও গুণমান</b><span>টিউবের ক্রম, টুর্নিকেট, হিমোলাইসিস, ক্রিটিক্যাল মান জানানো। নার্স-টেকনিশিয়ানের মূল দক্ষতা (৫টি এলোমেলো প্রশ্ন)।</span><div class="ft">সঠিক: ' + bn(S.lab.skill) + ' বার</div></div></button></div>';
    C.bindRoleBar(body); body.onclick = function (e) { var b = e.target.closest('.hp-case'); if (!b) return; body.onclick = null; if (b.dataset.c === 'skill') skills(); else if (b.dataset.c === 'cross') cross(); else run(L.byId(b.dataset.c)); };
  }

  function run(c) {
    C.top();
    var body = $('#hpBody'), rows = L.rows(c), sel = {}, mistakes = 0, checked = false, sexT = c.pt.sex === 'M' ? 'পুরুষ' : 'নারী';
    var cal = L.calcs(c);
    body.innerHTML = C.roleBar() + '<button type="button" class="hp-back" id="lbBack">← কেস তালিকা</button><div class="hp-run"><div class="hp-card"><h4>' + c.ic + ' ' + esc(c.pt.n) + ' · ' + bn(c.pt.age) + ' বছর · ' + sexT + '</h4><p>' + esc(c.pt.hx) + '</p>' +
      '<table class="lb-tb" aria-label="ল্যাব রিপোর্ট"><thead><tr><th>পরীক্ষা</th><th>ফল</th><th>রেফারেন্স</th><th></th></tr></thead><tbody>' + rows.map(function (r) { return '<tr class="lb-r" data-k="' + r.k + '" tabindex="0" role="button" aria-pressed="false"><td>' + esc(r.n) + '</td><td><b>' + (r.cat ? esc(r.v) : num(r.v)) + '</b> <small>' + esc(r.u) + '</small></td><td>' + rangeTxt(r) + '</td><td class="lb-f"></td></tr>'; }).join('') +
      cal.map(function (x) { return '<tr class="lb-calc"><td>' + esc(x.n) + '</td><td><b>' + num(x.v) + '</b> <small>' + esc(x.u) + '</small></td><td>' + num(x.lo) + ' – ' + num(x.hi) + '</td><td></td></tr>'; }).join('') + '</tbody></table><p class="hp-mut">সারিতে ট্যাপ করলে "অস্বাভাবিক" চিহ্ন বসে/উঠে যায়। রেঞ্জ ' + (rows.some(function (r) { return L.REF[r.k].M; }) ? 'লিঙ্গভেদে আলাদা (এই রোগী: ' + sexT + ')' : 'প্রাপ্তবয়স্কের') + '; ল্যাবভেদে সামান্য আলাদা হতে পারে।</p></div>' +
      '<div class="hp-panel"><div class="hp-card" id="lbStep"></div></div></div>';
    C.bindRoleBar(body); $('#lbBack').onclick = list;
    var st = $('#lbStep');
    function s1() {
      st.innerHTML = '<h4>ধাপ ১: অস্বাভাবিক মান চিহ্নিত করুন</h4><p class="hp-mut">যেগুলো রেঞ্জের বাইরে মনে হয় সেগুলো বাছুন।</p><div class="hp-nav"><button type="button" class="hp-btn pri" id="lbChk">যাচাই করুন</button></div><p class="hp-fb" id="lbF1" role="status"></p>';
      var tb = $('.lb-tb');
      function tog(tr) { if (checked) return; var k = tr.dataset.k; sel[k] = !sel[k]; tr.classList.toggle('sel', !!sel[k]); tr.setAttribute('aria-pressed', !!sel[k]); }
      tb.onclick = function (e) { var tr = e.target.closest('.lb-r'); if (tr) tog(tr); };
      tb.onkeydown = function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.lb-r')) { e.preventDefault(); tog(e.target.closest('.lb-r')); } };
      $('#lbChk').onclick = function () {
        if (checked) return; checked = true; var miss = 0, extra = 0;
        rows.forEach(function (r) { var tr = $('.lb-r[data-k="' + r.k + '"]'), abn = r.f !== 'N', s = !!sel[r.k]; tr.classList.add(s === abn ? 'right' : 'wrong'); if (abn && !s) miss++; if (!abn && s) extra++; $('.lb-f', tr).innerHTML = '<span class="lb-flag ' + FL[r.f][1] + '">' + FL[r.f][0] + '</span>'; });
        var d = miss + extra, f = $('#lbF1'); mistakes += Math.min(d, 2); C.ans('lab', d === 0);
        f.className = 'hp-fb ' + (d === 0 ? 'good' : 'bad'); f.textContent = d === 0 ? '✔ নিখুঁত! সব অস্বাভাবিক মান ধরেছেন।' : (miss ? bn(miss) + 'টি অস্বাভাবিক মান বাদ পড়েছে। ' : '') + (extra ? bn(extra) + 'টি স্বাভাবিক মানকে অস্বাভাবিক ধরেছেন। ' : '') + 'রঙিন সারিগুলো দেখুন।';
        $('#lbChk').outerHTML = '<button type="button" class="hp-btn pri" id="lbGo">পরবর্তী ▶</button>'; $('#lbGo').onclick = s2;
      };
    }
    function s2() {
      st.innerHTML = '<h4>ধাপ ২: প্যাটার্ন থেকে রোগ-নির্ণয়</h4><div id="lbQ2"></div>';
      C.ask($('#lbQ2'), { q: 'ইতিহাস ও রিপোর্টের প্যাটার্ন মিলিয়ে সবচেয়ে সম্ভাব্য কী?', o: c.dx.o, a: c.dx.a, e: c.dx.e }, 'lab', function (f) { if (!f) mistakes++; var nb = document.createElement('div'); nb.className = 'hp-nav'; nb.innerHTML = '<button type="button" class="hp-btn pri">পরবর্তী ▶</button>'; $('#lbQ2').appendChild(nb); nb.firstChild.onclick = s3; });
    }
    function s3() {
      st.innerHTML = '<h4>ধাপ ৩: ' + C.roleInfo().ic + ' পরবর্তী পদক্ষেপ</h4><div id="lbQ3"></div>';
      C.ask($('#lbQ3'), c.plan, 'lab', function (f) { if (!f) mistakes++; var nb = document.createElement('div'); nb.className = 'hp-nav'; nb.innerHTML = '<button type="button" class="hp-btn pri">শেষ করুন ✔</button>'; $('#lbQ3').appendChild(nb); nb.firstChild.onclick = fin; });
    }
    function fin() {
      var f = K.award('lab_' + c.id, mistakes, 45); S.lab.solved[c.id] = 1; var got = C.done(f.st), next = L.CASES[(L.CASES.indexOf(c) + 1) % L.CASES.length];
      st.innerHTML = '<div class="hp-res"><h3>🎉 কেস সমাধান</h3><div class="big">' + K.starHtml(f.st) + '</div><p>ভুল: <b>' + bn(mistakes) + '</b> · <b>+' + bn(f.xp) + ' XP</b>' + (f.first ? '' : ' (আবার করার জন্য কম XP)') + '</p>' + (got.length ? '<p class="hd-got">' + got.map(esc).join('<br>') + '</p>' : '') + '<div class="hp-nav"><button type="button" class="hp-btn" id="lbAg">↻ আবার</button><button type="button" class="hp-btn pri" id="lbNx">পরবর্তী কেস ▶</button><button type="button" class="hp-btn" id="lbLs">তালিকা</button></div></div>';
      $('#lbAg').onclick = function () { run(c); }; $('#lbNx').onclick = function () { run(next); }; $('#lbLs').onclick = list;
    }
    s1();
  }

  function skills() {
    C.top();
    var body = $('#hpBody'), qs = shuffle(L.SKILLS).slice(0, 5), i = 0, mistakes = 0;
    body.innerHTML = C.roleBar() + '<button type="button" class="hp-back" id="lbBack">← কেস তালিকা</button><div class="hp-card"><h4>🧤 নমুনা সংগ্রহ ও গুণমান</h4><p class="hp-mut">ভুল নমুনা মানে ভুল রিপোর্ট, আর ভুল রিপোর্ট মানে ভুল চিকিৎসা।</p><div id="lbSk"></div></div>';
    C.bindRoleBar(body); $('#lbBack').onclick = list;
    function nextQ() {
      var el = $('#lbSk'); if (i >= qs.length) return fin();
      el.innerHTML = '<div class="hp-steps">' + qs.map(function (x, k) { return '<i class="' + (k < i ? 'd' : '') + '"></i>'; }).join('') + '</div><p class="hp-sn">প্রশ্ন ' + bn(i + 1) + '/' + bn(qs.length) + '</p><div id="lbSq"></div>';
      C.ask($('#lbSq'), qs[i], 'lab', function (f) { if (f) S.lab.skill++; else mistakes++; K.save(); var nb = document.createElement('div'); nb.className = 'hp-nav'; nb.innerHTML = '<button type="button" class="hp-btn pri">' + (i === qs.length - 1 ? 'ফল দেখুন' : 'পরবর্তী ▶') + '</button>'; $('#lbSq').appendChild(nb); nb.firstChild.onclick = function () { i++; nextQ(); }; });
    }
    function fin() {
      var f = K.award('lab_skill', mistakes, 40), got = C.done(f.st);
      $('#lbSk').innerHTML = '<div class="hp-res"><h3>🎉 শেষ</h3><div class="big">' + K.starHtml(f.st) + '</div><p>ভুল: <b>' + bn(mistakes) + '</b> · <b>+' + bn(f.xp) + ' XP</b></p>' + (got.length ? '<p class="hd-got">' + got.map(esc).join('<br>') + '</p>' : '') + '<div class="hp-nav"><button type="button" class="hp-btn" id="lbAg">↻ আবার</button><button type="button" class="hp-btn pri" id="lbLs">তালিকা</button></div></div>';
      $('#lbAg').onclick = skills; $('#lbLs').onclick = list;
    }
    nextQ();
  }

  function cross() {
    C.top();
    var body = $('#hpBody'), qs = L.crossSet(Math.floor(Math.random() * 900) + 1), i = 0, mistakes = 0;
    body.innerHTML = C.roleBar() + '<button type="button" class="hp-back" id="lbBack">← তালিকা</button><div class="hp-card"><h4>🩸 রক্ত-গ্রুপ ও ক্রসম্যাচ</h4><p class="hp-mut">নিয়ম: ডোনারের লাল কণায় রোগীর অ্যান্টিবডি-বিরোধী অ্যান্টিজেন থাকা চলবে না। O নেগেটিভ RBC সবচেয়ে নিরাপদ, AB পজিটিভ রোগী সবার রক্ত নিতে পারে; প্লাজমার নিয়ম উল্টো (AB প্লাজমা সবাইকে)।</p><div id="lbCx"></div></div>';
    C.bindRoleBar(body); $('#lbBack').onclick = list;
    function nextQ() {
      var el = $('#lbCx'); if (i >= qs.length) return fin();
      el.innerHTML = '<div class="hp-steps">' + qs.map(function (x, k) { return '<i class="' + (k < i ? 'd' : '') + '"></i>'; }).join('') + '</div><p class="hp-sn">প্রশ্ন ' + bn(i + 1) + '/' + bn(qs.length) + '</p><div id="lbCq"></div>';
      C.ask($('#lbCq'), qs[i], 'lab', function (f) { if (!f) mistakes++; var nb = document.createElement('div'); nb.className = 'hp-nav'; nb.innerHTML = '<button type="button" class="hp-btn pri">' + (i === qs.length - 1 ? 'ফল দেখুন' : 'পরবর্তী ▶') + '</button>'; $('#lbCq').appendChild(nb); nb.firstChild.onclick = function () { i++; nextQ(); }; });
    }
    function fin() {
      var f = K.award('lab_cross', mistakes, 40); if (mistakes === 0) S.lab.cross++; var got = C.done(f.st);
      $('#lbCx').innerHTML = '<div class="hp-res"><h3>🎉 শেষ</h3><div class="big">' + K.starHtml(f.st) + '</div><p>ভুল: <b>' + bn(mistakes) + '</b> · <b>+' + bn(f.xp) + ' XP</b></p>' + (got.length ? '<p class="hd-got">' + got.map(esc).join('<br>') + '</p>' : '') + '<div class="hp-nav"><button type="button" class="hp-btn" id="lbAg">↻ আবার</button><button type="button" class="hp-btn pri" id="lbLs">তালিকা</button></div></div>';
      $('#lbAg').onclick = cross; $('#lbLs').onclick = list;
    }
    nextQ();
  }

  K.addTab('lab', '🧪 ল্যাব রিপোর্ট', list);
})();
