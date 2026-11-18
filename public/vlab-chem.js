/* GEB Hub: ভার্চুয়াল ল্যাব, জেনারেল কেমিস্ট্রি (v3.5): অজানা লবণের ক্যাটায়ন ও অ্যানায়ন শনাক্তকরণ। */
(function () {
  'use strict';
  if (!window.VLab || !window.VLCore) return;
  var U = VLab.u, $ = U.$, $$ = U.$$, esc = U.esc, bn = U.bn, D = window.VLData, C = window.VLCore, M = VL3D.mesh, P = VL3D.parts;
  var byId = C.byId;

  function mountSalt(root, ctx, mode) {
    var salt = C.pickSalt(), cat = byId(D.CAT, salt.cat), an = byId(D.AN, salt.an);
    var S = { kind: 'cat', log: [], wrong: 0, hints: 0, tests: 0, done: false, tube: { cat: null, an: null }, last: { cat: null, an: null }, busy: false };
    root.innerHTML = '<div class="vl-exp"><div><div class="vl-stage" id="chStage"><canvas class="vl-cv" aria-label="৩D কেমিস্ট্রি ল্যাব"></canvas><div class="vl-hud"><span class="vl-chip" id="chTitle"></span></div><div class="vl-zoomhint">টেস্ট টিউব বা শিশিতে ক্লিক করুন</div></div>' +
      '<div class="vl-tools" id="chKind"><button type="button" class="vl-tool" data-k="cat">🧪 ক্যাটায়ন পরীক্ষা (মূল দ্রবণ)</button><button type="button" class="vl-tool" data-k="an">🧪 অ্যানায়ন পরীক্ষা (সোডিয়াম নির্যাস)</button></div></div>' +
      '<aside class="vl-side"><h3>নমুনা-' + (1 + Math.floor(Math.random() * 9)) + ': অজানা লবণ</h3><div class="vl-msg" id="chMsg" aria-live="polite">রিএজেন্ট বেছে টিউবে যোগ করো, ফল দেখে ক্যাটায়ন ও অ্যানায়ন শনাক্ত করো।</div><div id="chBtns"></div><div class="vl-ctl"><button type="button" class="btn ghost sm" data-a="fresh">নতুন টিউব</button><button type="button" class="btn ghost sm" data-a="hint">ইঙ্গিত</button></div>' +
      '<div class="vl-in"><label>তোমার সিদ্ধান্ত</label><div class="row"><select class="fld" id="chCat" style="width:auto;flex:1" aria-label="ক্যাটায়ন"><option value="">ক্যাটায়ন…</option>' + D.CAT.map(function (c) { return '<option value="' + c.id + '">' + c.f + ' (' + c.n + ')</option>'; }).join('') + '</select><select class="fld" id="chAn" style="width:auto;flex:1" aria-label="অ্যানায়ন"><option value="">অ্যানায়ন…</option>' + D.AN.map(function (a) { return '<option value="' + a.id + '">' + a.f + ' (' + a.n + ')</option>'; }).join('') + '</select></div><button type="button" class="btn pri" data-a="check">যাচাই করো</button></div>' +
      '<div><b>পর্যবেক্ষণ খাতা</b><div class="vl-tw"><table class="vl-tb"><tbody id="chLog"><tr><td class="vl-mini">এখনো কোনো পরীক্ষা হয়নি</td></tr></tbody></table></div></div><p class="vl-mini">' + esc(D.CHEM_NOTE) + '</p></aside></div>';
    var cv = $('.vl-cv', root), V = VL3D.create(cv, { yaw: .3, pitch: .3, dist: 11, target: [-1.2, 1.9, 0], minDist: 6, maxDist: 24, bg: ['#27414f', '#101c26'] }), msg = $('#chMsg', root), tubes = {};
    P.bench(V, 22, 10);
    var bs = P.bunsen(V, [5.2, 0, 1]); V.add({ mesh: M.box(7.5, .3, 3), color: '#3c4f5e', pos: [-1.5, 0, 0] });
    tubes.cat = P.tube(V, [-3, .3, 0], { id: 'tcat', pick: true }); tubes.an = P.tube(V, [-.6, .3, 0], { id: 'tan', pick: true });
    V.labelFor(tubes.cat.g, 'ক্যাটায়ন', { off: [0, 4.4, 0] }); V.labelFor(tubes.an.g, 'অ্যানায়ন', { off: [0, 4.4, 0] });
    [['#8a5a2b', 'NaOH', -6.2], ['#2b6ea8', 'HCl', -7.8], ['#7a4b8a', 'KI', -9.4]].forEach(function (b, i) { P.bottle(V, [b[2], 0, 3.2], b[0], b[1], 'bt' + i); });
    var flameT = null;

    function fresh(kind) {
      var th = tubes[kind], col = kind === 'cat' ? cat.col : '#e6f3f8'; S.tube[kind] = { color: col, ppt: null, gasSeen: null, lastRes: null, lastId: null };
      th.setPpt(null, 0, 0); th.fill(.55, col, 300); S.last[kind] = null; paintMsg('নতুন টিউবে নমুনা নেওয়া হয়েছে।' + (kind === 'cat' ? ' দ্রবণের রং: ' + (cat.col === '#e6f3f8' ? 'বর্ণহীন' : '<b>পর্যবেক্ষণ করো</b>') : ' (অ্যানায়ন নির্যাস, বর্ণহীন)'));
    }
    function paintMsg(t, k) { msg.className = 'vl-msg' + (k ? ' ' + k : ''); msg.innerHTML = t; }
    function bubbles(th, color, n, rise, size) {
      for (var i = 0; i < n; i++) (function (i) {
        setTimeout(function () {
          var b = V.add({ mesh: M.sphere(size || .09, 6, 4), color: color || '#ffffff', alpha: .75, pos: [(Math.random() - .5) * .4, .7, (Math.random() - .5) * .4], layer: 3 }, th.g);
          V.tw(b, { pos: [b.pos[0], rise || 3.4, b.pos[2]], alpha: 0 }, 900 + Math.random() * 500).then(function () { V.remove(b); });
        }, i * 90);
      })(i);
    }
    function paintLog() {
      var t = $('#chLog', root); if (!S.log.length) return;
      t.innerHTML = S.log.map(function (e, i) { return '<tr><td>' + bn(i + 1) + '</td><td><b>' + esc(e.name) + '</b><br><span class="vl-mini">' + (e.kind === 'cat' ? 'ক্যাটায়ন' : 'অ্যানায়ন') + '</span></td><td>' + esc(e.obs) + '</td></tr>'; }).join('');
    }
    function addLog(e) { S.log.push(e); S.tests++; paintLog(); }
    function applyRes(kind, r, ionCol) {
      var th = tubes[kind], t = S.tube[kind];
      if (r.c === 'clear') { th.tint(kind === 'cat' ? '#e6f3f8' : '#e6f3f8', 500); t.color = '#e6f3f8'; }
      else if (r.c) { th.tint(r.c, 600); t.color = r.c; }
      if (r.p) { th.setPpt(r.p, r.amt || .5, 900); t.ppt = r.p; } else if (r.dissolved) { th.setPpt(null, 0, 700); t.ppt = null; }
      if (r.gas === 'bubbles') bubbles(th, '#ffffff', 14, 3.4); else if (r.gas === 'brown') bubbles(th, '#b5601f', 10, 4.2, .2); else if (r.gas === 'white') bubbles(th, '#eeeeee', 8, 4.4, .2); else if (r.gas === 'violet') bubbles(th, '#7a2fbf', 8, 4.4, .2); else if (r.gas === 'red') bubbles(th, '#c0501f', 8, 4.4, .2); else if (r.gas === 'smell') bubbles(th, '#e7e7c0', 5, 4.2, .12);
      if (r.extra === 'ring') { var ring = V.add({ mesh: M.cyl(.36, .36, .14, 12), color: '#6b3a16', pos: [0, 1.9, 0], layer: 3 }, th.g); setTimeout(function () { V.remove(ring); }, 60000); }
      if (r.extra && r.extra.indexOf('layer:') === 0) { var lay = V.add({ mesh: M.cyl(.36, .36, .6, 12), color: r.extra.slice(6), alpha: .9, pos: [0, .5, 0], layer: 3 }, th.g); setTimeout(function () { V.remove(lay); }, 60000); }
    }
    function btnsHtml() {
      var k = S.kind, h = '', t = S.tube[k], lastRes = S.last[k];
      var list = k === 'cat' ? D.CREAG : D.AREAG;
      h += '<div class="vl-pick">' + list.map(function (r) { return '<button type="button" class="vl-tool" data-r="' + r.id + '">' + esc(r.n) + '</button>'; }).join('') + '</div>';
      var extra = [];
      if (k === 'cat') {
        var lr = lastRes && lastRes.id; var rr = lr && byId(D.CREAG, lr);
        extra.push('<button type="button" class="vl-tool" data-x="flame">🔥 শিখা পরীক্ষা</button>');
        extra.push('<button type="button" class="vl-tool" data-x="heat" ' + (lr === 'naoh' ? '' : 'disabled') + '>♨ NaOH সহ গরম করো</button>');
        if (rr && rr.base) extra.push('<button type="button" class="vl-tool" data-x="xs" ' + (lastRes.res && lastRes.res.p ? '' : 'disabled') + '>＋ ' + esc(rr.xs) + '</button>');
      } else if (lastRes) {
        (D.AFOLLOW[lastRes.id] || []).forEach(function (f) { extra.push('<button type="button" class="vl-tool" data-f="' + f.id + '" ' + (lastRes.res && lastRes.res.p ? '' : 'disabled') + '>' + esc(f.n) + '</button>'); });
        if (lastRes.res && lastRes.res.extra === 'gas') { extra.push('<button type="button" class="vl-tool" data-g="lime">' + esc(D.AGAS.lime.n) + '</button>'); extra.push('<button type="button" class="vl-tool" data-g="lead">' + esc(D.AGAS.lead.n) + '</button>'); }
      }
      return h + (extra.length ? '<div class="vl-mini" style="margin-top:8px">ফলো-আপ পরীক্ষা</div><div class="vl-pick">' + extra.join('') + '</div>' : '');
    }
    function paintBtns() { $('#chBtns', root).innerHTML = btnsHtml(); $$('#chKind [data-k]', root).forEach(function (b) { b.style.borderColor = b.dataset.k === S.kind ? 'var(--accent)' : ''; }); $('#chTitle', root).textContent = S.kind === 'cat' ? 'ক্যাটায়ন টিউব সক্রিয়' : 'অ্যানায়ন টিউব সক্রিয়'; }
    function ionOf(kind) { return kind === 'cat' ? salt.cat : salt.an; }

    function addReagent(id) {
      if (S.busy || S.done) return; var k = S.kind, list = k === 'cat' ? D.CREAG : D.AREAG, r = byId(list, id), res = C.chemResult(k, id, ionOf(k));
      var t = S.tube[k]; if (!t) fresh(k);
      if (t && t.lastId) { S.tube[k].lastId = null; }
      applyRes(k, res); S.last[k] = { id: id, res: res }; S.tube[k].lastId = id;
      addLog({ kind: k, type: 'reagent', reagent: id, name: r.n, obs: res.t });
      paintMsg('<b>' + esc(r.n) + '</b> যোগ করা হলো: ' + esc(res.t) + (res.diag ? '' : '<br><span class="vl-mini">(এই রিএজেন্টে এই আয়নের জন্য নির্ণায়ক ফল নেই; অন্য রিএজেন্ট চেষ্টা করো)</span>'), res.diag ? 'ok' : '');
      paintBtns();
    }
    function doX(x) {
      var k = S.kind;
      if (x === 'flame') {
        var f = C.flame(salt.cat); addLog({ kind: 'cat', type: 'flame', reagent: 'flame', name: 'শিখা পরীক্ষা', obs: f.t });
        if (f.c) { V.set(bs.outer, { color: f.c, alpha: .8 }); V.set(bs.inner, { color: f.c }); } bs.set(true); paintMsg('<b>শিখা পরীক্ষা:</b> ' + esc(f.t), f.c ? 'ok' : '');
        clearTimeout(flameT); flameT = setTimeout(function () { V.set(bs.outer, { color: '#4f8cff', alpha: .55 }); V.set(bs.inner, { color: '#ffd24a' }); bs.set(false); }, 2600);
      } else if (x === 'heat') {
        var h = C.heatNaOH(salt.cat); addLog({ kind: 'cat', type: 'heat', reagent: 'naoh', name: 'NaOH + গরম', obs: h.t }); bubbles(tubes.cat, h.diag ? '#e8f4ff' : '#ffffff', h.diag ? 10 : 2, 4.2, .1); paintMsg('<b>গরম করা:</b> ' + esc(h.t), h.diag ? 'ok' : '');
      } else if (x === 'xs') {
        var lr = S.last.cat, res = C.chemExcess(lr.id, salt.cat), r = byId(D.CREAG, lr.id); applyRes('cat', res);
        addLog({ kind: 'cat', type: 'xs', reagent: lr.id, name: r.xs, obs: res.t }); paintMsg('<b>' + esc(r.xs) + ':</b> ' + esc(res.t), res.diag ? 'ok' : ''); S.last.cat = { id: lr.id, res: { p: res.p } };
      }
      paintBtns();
    }
    function follow(fid) {
      var lr = S.last.an, f = C.chemFollow(lr.id, fid, salt.an), fo = byId(D.AFOLLOW[lr.id], fid);
      if (f.act === 'dissolve') { tubes.an.setPpt(null, 0, 700); if (/বুদবুদ/.test(f.t)) bubbles(tubes.an, '#fff', 10, 3.4); } else if (f.act === 'part') tubes.an.setPpt(S.tube.an.ppt, .25, 700);
      addLog({ kind: 'an', type: 'follow', reagent: lr.id, follow: fid, name: lr.id === 'bacl2' ? 'BaCl₂ → dil. HCl' : 'AgNO₃ → ' + fo.n.replace(' যোগ করো', ''), obs: f.t }); paintMsg(esc(f.t), f.diag ? 'ok' : '');
    }
    function gas(g) { var res = C.chemGasTest(g, salt.an); addLog({ kind: 'an', type: 'gas', gas: g, name: D.AGAS[g].n, obs: res.t }); paintMsg(esc(res.t), res.diag ? 'ok' : ''); }
    function check() {
      if (S.done) return; var gc = $('#chCat', root).value, ga = $('#chAn', root).value;
      if (!gc || !ga) return paintMsg('ক্যাটায়ন ও অ্যানায়ন দুটোই বাছো।', 'err');
      if (!S.log.length) return paintMsg('আগে অন্তত কিছু পরীক্ষা করো, অনুমানে নয়।', 'err');
      var okC = gc === salt.cat, okA = ga === salt.an;
      if (okC && okA) {
        S.done = true; var lines = ['লবণ: <b>' + cat.f + ' + ' + an.f + '</b> (' + esc(cat.n) + ' ' + esc(an.n) + ')', 'ক্যাটায়নের মূল সূত্র: ' + esc(cat.key), 'অ্যানায়নের মূল সূত্র: ' + esc(an.key), 'মোট পরীক্ষা: ' + bn(S.tests) + 'টি'];
        var f = ctx.finish({ mistakes: S.wrong, hints: S.hints, lines: lines }); $('#chMsg', root).className = 'vl-msg ok'; $('#chMsg', root).innerHTML = '<b>সঠিক! 🎉</b>' + ctx.resultHtml({ mistakes: S.wrong, hints: S.hints, lines: lines }, f); return;
      }
      S.wrong++; var h = '<b>ভুল হয়েছে।</b> ' + (okC ? 'ক্যাটায়ন ঠিক আছে, ' : okA ? 'অ্যানায়ন ঠিক আছে, ' : '') + '';
      var out = '';
      if (!okC) { var ex = C.explainGuess('cat', gc, salt.cat, S.log); out += '<br><b>ক্যাটায়ন (' + byId(D.CAT, gc).f + '):</b> ' + (ex.length ? ex.slice(0, 3).map(function (e) { return esc(e.name) + '-এ তুমি দেখেছ “' + esc(e.observed) + '”, কিন্তু ' + byId(D.CAT, gc).f + ' হলে হতো “' + esc(e.expected) + '”'; }).join('; ') + '।' : 'তোমার পরীক্ষাগুলোয় এই আয়ন আলাদা করা যায়নি। আরো পরীক্ষা করো (Na⁺/K⁺ হলে শিখা পরীক্ষা লাগবে)।'); }
      if (!okA) { var ea = C.explainGuess('an', ga, salt.an, S.log); out += '<br><b>অ্যানায়ন (' + byId(D.AN, ga).f + '):</b> ' + (ea.length ? ea.slice(0, 3).map(function (e) { return esc(e.name) + '-এ তুমি দেখেছ “' + esc(e.observed) + '”, কিন্তু ' + byId(D.AN, ga).f + ' হলে হতো “' + esc(e.expected) + '”'; }).join('; ') + '।' : 'এখনো পর্যাপ্ত পরীক্ষা করোনি। আরো রিএজেন্ট চেষ্টা করো।'); }
      paintMsg(h + out + '<br>আবার চেষ্টা করো।', 'err');
    }
    root.addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('[data-k]'))) { S.kind = b.dataset.k; if (!S.tube[S.kind]) fresh(S.kind); paintBtns(); return; }
      if ((b = e.target.closest('[data-r]'))) { if (!S.tube[S.kind]) fresh(S.kind); return addReagent(b.dataset.r); }
      if ((b = e.target.closest('[data-x]'))) return doX(b.dataset.x);
      if ((b = e.target.closest('[data-f]'))) return follow(b.dataset.f);
      if ((b = e.target.closest('[data-g]'))) return gas(b.dataset.g);
      if ((b = e.target.closest('[data-a]'))) {
        var a = b.dataset.a; if (a === 'fresh') { fresh(S.kind); paintBtns(); } else if (a === 'check') check();
        else if (a === 'hint') { S.hints++; var ion = S.kind === 'cat' ? cat : an; paintMsg('<b>ইঙ্গিত:</b> ' + (S.kind === 'cat' ? 'দ্রবণের রং, শিখা পরীক্ষা, তারপর NaOH ও NH₄OH (অল্প, তারপর অতিরিক্ত) দিয়ে শুরু করো।' : 'dil. H₂SO₄ দিয়ে গ্যাস দেখো, তারপর BaCl₂ ও AgNO₃ করো; তারপর যে গ্রুপে পড়ে সেই বিশেষ পরীক্ষা।'), 'info'); }
      }
    });
    V.onPick = function (h) { if (h && h.ob && h.ob.id === 'tcat') { S.kind = 'cat'; if (!S.tube.cat) fresh('cat'); paintBtns(); } else if (h && h.ob && h.ob.id === 'tan') { S.kind = 'an'; if (!S.tube.an) fresh('an'); paintBtns(); } };
    fresh('cat'); fresh('an'); paintBtns();
  }

  VLab.register({ lab: 'chem', id: 'chem-salt', title: 'অজানা লবণ শনাক্তকরণ (ক্যাটায়ন + অ্যানায়ন)', desc: '৩D টেস্ট টিউবে রিএজেন্ট মিশিয়ে রং, অধঃক্ষেপ ও গ্যাস দেখো; অজানা লবণ চিনে নাও। ভুল হলে কারণ দেখাবে।', ic: '⚗️', xp: 70, tag: '৩D · ১৫ ক্যাটায়ন · ১১ অ্যানায়ন', mount: mountSalt });
})();
