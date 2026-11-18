/* GEB Hub: ভার্চুয়াল ল্যাব, উদ্ভিদবিজ্ঞান (v3.5): ৩D ডিসেকশন (জবা ফুল, শিমের বীজ, ভুট্টার দানা) এবং স্লাইড তৈরি ও মাইক্রোস্কোপ। */
(function () {
  'use strict';
  if (!window.VLab || !window.VLCore) return;
  var U = VLab.u, $ = U.$, $$ = U.$$, esc = U.esc, bn = U.bn, D = window.VLData, C = window.VLCore, M = VL3D.mesh, P = VL3D.parts, PI = Math.PI;
  function tag(ob, id) { ob.id = id; ob.pick = true; ob.kids.forEach(function (k) { tag(k, id); }); return ob; }

  /* ---------- ৩D মডেল ---------- */
  function petalMesh(len, wid) { return M.patch(function (u, v) { var w = Math.sin(Math.PI * Math.pow(u, .65)) * wid * (v - .5); return [w, u * len, Math.sin(u * 2.2) * .25 * -1 * (1 - Math.abs(v - .5) * 1.2)]; }, 6, 6); }
  function buildHibiscus(V, S) {
    var g = V.add({ kind: 'group', pos: [0, 0, 0] }); S.parts = {};
    V.add({ mesh: M.cyl(.18, .24, 1.2, 12), color: '#5d8f3a', pos: [0, -1.2, 0] }, g); V.add({ mesh: M.sphere(.42, 12, 8), color: '#7bb04f', pos: [0, .1, 0] }, g);
    var gy = V.add({ kind: 'group' }, g), st = V.add({ mesh: M.cyl(.06, .06, 4.4, 8), color: '#d23a63', pos: [0, .4, 0] }, gy);
    V.add({ mesh: M.sphere(.34, 10, 8), color: '#a9d37a', pos: [0, .75, 0] }, gy); for (var i = 0; i < 5; i++) { var a = i / 5 * PI * 2; V.add({ mesh: M.sphere(.15, 8, 6), color: '#b3122f', pos: [Math.cos(a) * .2, 4.85, Math.sin(a) * .2] }, gy); }
    var an = V.add({ kind: 'group' }, g); V.add({ mesh: M.cyl(.26, .3, 3.2, 14), color: '#f0b7c8', pos: [0, .5, 0] }, an);
    for (var j = 0; j < 18; j++) { var b = j * 2.4; V.add({ mesh: M.sphere(.1, 6, 4), color: '#f3c315', pos: [Math.cos(b) * .38, 2.0 + (j % 6) * .28, Math.sin(b) * .38] }, an); }
    var co = V.add({ kind: 'group' }, g); for (var k = 0; k < 5; k++) V.add({ kind: 'group', pos: [0, .5, 0], rot: [.6, k / 5 * PI * 2, 0], children: [{ mesh: petalMesh(3.6, 3.4), color: '#d4163c', two: true }] }, co);
    var ca = V.add({ kind: 'group' }, g); for (var m = 0; m < 5; m++) V.add({ kind: 'group', pos: [0, .35, 0], rot: [.3, m / 5 * PI * 2 + .3, 0], children: [{ mesh: petalMesh(1.8, 1.1), color: '#5aa33c', two: true }] }, ca);
    var ep = V.add({ kind: 'group' }, g); for (var n = 0; n < 6; n++) V.add({ kind: 'group', pos: [0, .2, 0], rot: [.55, n / 6 * PI * 2, 0], children: [{ mesh: M.cyl(0, .09, 1.5, 6), color: '#6fb344' }] }, ep);
    S.parts = { epicalyx: ep, calyx: ca, corolla: co, androecium: an, gynoecium: gy }; Object.keys(S.parts).forEach(function (k) { tag(S.parts[k], k); });
    g.pos = [0, 1.4, 0]; return g;
  }
  function buildBean(V, S) {
    var g = V.add({ kind: 'group', pos: [0, 2.2, 0] }); S.parts = {};
    var cL = V.add({ mesh: M.sphere(1, 18, 12), color: '#efe3c2', scale: [2.1, 1.35, .66], pos: [0, 0, .66] }, g), cR = V.add({ mesh: M.sphere(1, 18, 12), color: '#efe3c2', scale: [2.1, 1.35, .66], pos: [0, 0, -.66] }, g);
    var pl = V.add({ kind: 'group', pos: [-1.0, .45, 0] }, g); V.add({ mesh: M.cyl(0, .16, .9, 8), color: '#6fbf5a' }, pl); V.add({ mesh: M.sphere(.2, 8, 6), color: '#8ed06f', pos: [.05, .9, 0] }, pl);
    var rd = V.add({ kind: 'group', pos: [1.35, -.2, 0], rot: [0, 0, -1.2] }, g); V.add({ mesh: M.cyl(0, .17, 1.1, 8), color: '#e3cf8e' }, rd);
    var emb = V.add({ mesh: M.cyl(.09, .09, 1.5, 8), color: '#c9bb7a', pos: [-.7, -.3, 0], rot: [0, 0, 1.2] }, g);
    var te = V.add({ kind: 'group' }, g); V.add({ mesh: M.sphere(1, 20, 14), color: '#b98d57', scale: [2.35, 1.55, 1.38] }, te);
    var hil = V.add({ mesh: M.sphere(.2, 8, 6), color: '#f6efdc', scale: [1.2, .8, .5], pos: [-.2, 0, 1.38] }, g); V.add({ mesh: M.sphere(.06, 6, 4), color: '#40291a', pos: [.35, .1, 1.34] }, g);
    S.parts = { hilum: hil, testa: te, cotyledon: V.add({ kind: 'group' }), plumule: pl, radicle: rd }; S.cL = cL; S.cR = cR; S.cotG = [cL, cR]; S.emb = emb; S.parts.cotyledon.vis = false;
    ['hilum', 'testa'].forEach(function (k) { tag(S.parts[k], k); }); tag(cL, 'cotyledon'); tag(cR, 'cotyledon'); tag(pl, 'plumule'); tag(rd, 'radicle'); return g;
  }
  function buildMaize(V, S) {
    var g = V.add({ kind: 'group', pos: [0, 2.3, 0] }), whole = V.add({ kind: 'group' }, g), ls = V.add({ kind: 'group', vis: false }, g);
    V.add({ mesh: M.sphere(1, 18, 12), color: '#f1c232', scale: [1.7, 2.2, 1.2] }, whole); tag(whole, 'pericarp');
    function ell(c, sx, sy, z, id, p) { var o = V.add({ mesh: M.sphere(1, 20, 10), color: c, scale: [sx, sy, .1], pos: [p ? p[0] : 0, p ? p[1] : 0, z] }, ls); o.id = id; o.pick = true; return o; }
    S.lsParts = { pericarp: ell('#d9a21b', 1.75, 2.25, 0, 'pericarp'), aleurone: ell('#c98a2a', 1.62, 2.12, .05, 'aleurone'), endosperm: ell('#f7e9b0', 1.5, 2.0, .1, 'endosperm') };
    S.lsParts.scutellum = ell('#e19a3a', .95, .75, .17, 'scutellum', [-.2, -1.2]); S.lsParts.embryo = ell('#8c5a2b', .45, .55, .24, 'embryo', [-.25, -1.2]);
    S.whole = whole; S.ls = ls; return g;
  }

  /* ---------- ডিসেকশন পরীক্ষণ ---------- */
  function mountDissect(kind) {
    return function (root, ctx) {
      var Dd = D.DISSECT[kind], partById = {}; Dd.parts.forEach(function (p) { partById[p.id] = p; });
      var seq = Dd.order, tools = [], steps = [];
      function addTool(id, l, ic) { tools.push({ id: id, l: l, ic: ic }); }
      seq.forEach(function (id) {
        var p = partById[id], label = p ? p.n.split(' (')[0] : id;
        if (id === 'cut') { addTool('cut', 'ব্লেডে L.S. কাটো', '🔪'); steps.push({ t: 'দানাকে লম্বালম্বি (L.S.) কাটো', d: 'ব্লেড বেছে দানাটি মাঝ বরাবর কাটো (ব্লেড যন্ত্রে ক্লিক)।', tool: 'cut', run: async function (a, S) { await a.sleep(300); S.whole.vis = false; S.ls.vis = true; S.V.ping(); await S.V.camTo({ yaw: 0, pitch: .12, dist: 10 }, 700); } }); }
        else if (id === 'iodine') { addTool('iodine', 'আয়োডিন ফোঁটা', '🟤'); steps.push({ t: 'আয়োডিন দিয়ে স্টার্চ পরীক্ষা', d: 'কাটা পৃষ্ঠে আয়োডিনের ফোঁটা দাও। স্টার্চ থাকলে নীলচে-কালো হয়।', tool: 'iodine', wrong: { endosperm: 'আগে আয়োডিন দাও, তারপর অংশ চিনবে।' }, run: async function (a, S) { await S.V.tw(S.lsParts.endosperm, { color: '#2a2a5a' }, 900); a.say('ভ্রূণপোষ নীলচে-কালো হয়েছে, মানে স্টার্চ আছে।', 'ok'); } }); }
        else {
          addTool(id, label, '🔍');
          steps.push({ t: (kind === 'maize' ? 'চিহ্নিত করো: ' : 'পর্যবেক্ষণ ও সরাও: ') + (p ? p.n : id), d: (Dd.intro && steps.length === 0 ? Dd.intro + ' ' : '') + 'এবার <b>' + esc(label) + '</b> খুঁজে ক্লিক করো।', tool: id, wrong: null,
            run: async function (a, S) { var ob = S.parts && S.parts[id] || (S.lsParts && S.lsParts[id]); a.say('<b>' + esc(p.n) + ':</b> ' + esc(p.d), 'ok');
              if (kind === 'hibiscus' && ob) { var i = S.removed++; await S.V.tw(ob, { pos: [-5 + i * 2.6, -.4, 6.4], scale: .55, rot: [0, 0, 0] }, 800); S.V.labelFor(ob, label, { off: [0, 1.2, 0] }); }
              else if (kind === 'bean') { if (id === 'testa') { S.parts.hilum.vis = false; await S.V.tw(ob, { pos: [-4.6, -.4, 5.2], scale: .45 }, 800); S.V.labelFor(ob, 'বীজত্বক', { off: [0, 1, 0] }); } else if (id === 'cotyledon') { await Promise.all([S.V.tw(S.cL, { pos: [0, 0, 2.4] }, 800), S.V.tw(S.cR, { pos: [0, 0, -2.4] }, 800)]); S.V.labelFor(S.cL, 'বীজপত্র ১', { off: [0, 1.6, 0] }); S.V.labelFor(S.cR, 'বীজপত্র ২', { off: [0, 1.6, 0] }); } else { S.V.labelFor(ob, label, { off: [0, 1.4, 0] }); } }
              else if (kind === 'maize' && ob) { S.V.labelFor(ob, label, { off: [id === 'scutellum' || id === 'embryo' ? -1.2 : 0, id === 'scutellum' || id === 'embryo' ? -.6 : 1.2, 0] }); await S.V.tw(ob, { alpha: .6 }, 150); await S.V.tw(ob, { alpha: 1 }, 250); }
              else if (ob) S.V.labelFor(ob, label, { off: [0, 1, 0] }); } });
        }
      });
      var why = {}; tools.forEach(function (t) { why[t.id] = (Dd.why && Dd.why[t.id]) || 'এই ক্রমে নয়। বাইরে থেকে ভেতরের দিকে এগোও।'; });
      steps.forEach(function (s) { s.wrong = null; });
      var builder = kind === 'hibiscus' ? buildHibiscus : kind === 'bean' ? buildBean : buildMaize, cam = kind === 'hibiscus' ? { yaw: .3, pitch: .3, dist: 15, target: [0, 3.2, 1.5] } : { yaw: .35, pitch: .3, dist: 11, target: [0, 2.2, 1] };
      ctx.guided({ cam: cam, steps: steps, tools: tools, why: why, build: function (V, a, S) { S.V = V; S.removed = 0; P.bench(V, 22, 12); P.tray(V, [0, 0, 6.2], 13, 3.2); V.add({ mesh: M.box(1, .05, .4), color: '#d6d9dc', pos: [8, 0, 5], vis: false }); builder(V, S); V.labelFor(V.root.kids[V.root.kids.length - 1], Dd.n.split(' (')[0], { off: [0, 6, 0], color: '#065E4B' }); },
        finish: function () { return { lines: ['নমুনা: ' + esc(Dd.n) + ' (' + esc(Dd.en) + ')', 'অংশগুলো: ' + Dd.parts.map(function (p) { return esc(p.n.split(' (')[0]); }).join(' → ')] }; } });
    };
  }

  /* ---------- স্লাইডের ছবি (২D) ---------- */
  function drawSlide(sl, ctx, S, w, h) {
    var Z = S.mag === 4 ? 1 : S.mag === 10 ? 2.6 : 7, c = w / 2, K = w * .45 * Z, ox = S.px * .85 * (1 - 1 / Z), oy = S.py * .85 * (1 - 1 / Z), A = {};
    var X = function (x) { return c + (x - ox) * K; }, Y = function (y) { return c + (y - oy) * K; }, R = function (r) { return r * K; };
    ctx.fillStyle = '#f7f2f6'; ctx.fillRect(0, 0, w, w);
    function circ(x, y, r, f, s, lw) { ctx.beginPath(); ctx.arc(X(x), Y(y), Math.max(.3, R(r)), 0, PI * 2); if (f) { ctx.fillStyle = f; ctx.fill(); } if (s) { ctx.strokeStyle = s; ctx.lineWidth = lw || 1; ctx.stroke(); } }
    function ellp(x, y, rx, ry, rot, f, s, lw) { ctx.beginPath(); ctx.ellipse(X(x), Y(y), Math.max(.3, R(rx)), Math.max(.3, R(ry)), rot || 0, 0, PI * 2); if (f) { ctx.fillStyle = f; ctx.fill(); } if (s) { ctx.strokeStyle = s; ctx.lineWidth = lw || 1; ctx.stroke(); } }
    function ring(r0, r1, f) { ctx.beginPath(); ctx.arc(X(0), Y(0), R(r1), 0, PI * 2); ctx.arc(X(0), Y(0), R(r0), 0, PI * 2, true); ctx.fillStyle = f; ctx.fill('evenodd'); }
    function rect(x, y, ww, hh, f, s, lw) { if (f) { ctx.fillStyle = f; ctx.fillRect(X(x), Y(y), R(ww), R(hh)); } if (s) { ctx.strokeStyle = s; ctx.lineWidth = lw || 1; ctx.strokeRect(X(x), Y(y), R(ww), R(hh)); } }
    var r = C.rng(sl.id.length * 131 + 7), fine = Z >= 2.5, lw = Z >= 7 ? 1.6 : 1;
    if (sl.id === 'onion') {
      var cw = .2, ch = .09;
      for (var j = -12; j <= 12; j++) for (var i = -8; i <= 8; i++) { var x = i * cw + (j % 2 ? cw / 2 : 0), y = j * ch; rect(x - cw / 2, y - ch / 2, cw, ch, '#f7dce8', '#c0507f', lw); if (Z > .9) ellp(x + .02, y, .022, .02, 0, '#7a3a8a'); if (Z >= 7) { ellp(x + .02, y, .03, .028, 0, '#8d4fa0', '#5a2a70'); circ(x - .05, y + .01, .008, '#c9a0d4'); } }
      A.wall = [X(cw / 2), Y(0)]; A.nucleus = [X(.02), Y(0)]; A.cytoplasm = [X(-.08), Y(.03)];
    } else if (sl.id === 'stomata') {
      var sx = [[0, 0], [.55, -.3], [-.5, .45], [.45, .55], [-.6, -.5]];
      for (var j2 = -5; j2 <= 5; j2++) for (var i2 = -5; i2 <= 5; i2++) { var x2 = i2 * .24 + (j2 % 2 ? .12 : 0), y2 = j2 * .21; ellp(x2, y2, .125, .105, ((i2 + j2) % 3) * .3, '#dff0d8', '#6a9a60', lw); }
      sx.forEach(function (p) { ellp(p[0], p[1], .17, .12, .4, '#f7f2f6'); ctx.save(); ctx.translate(X(p[0]), Y(p[1])); ctx.rotate(.4); [-1, 1].forEach(function (sg) { ctx.beginPath(); ctx.ellipse(0, sg * R(.06), R(.15), R(.055), 0, 0, PI * 2); ctx.fillStyle = '#4f9a4a'; ctx.fill(); ctx.strokeStyle = '#2d6a2b'; ctx.lineWidth = lw; ctx.stroke(); if (Z >= 7) { ctx.fillStyle = '#2f7a2b'; for (var q = -2; q <= 2; q++) { ctx.beginPath(); ctx.arc(q * R(.05), sg * R(.06), R(.012), 0, PI * 2); ctx.fill(); } } }); ctx.fillStyle = '#6b8d9a'; ctx.beginPath(); ctx.ellipse(0, 0, R(.12), R(.012), 0, 0, PI * 2); ctx.fill(); ctx.restore(); });
      A.guard = [X(0) - R(.03) * Math.sin(.4), Y(0) + R(.06) * Math.cos(.4) + R(.01)]; A.stoma = [X(0), Y(0)]; A.epi = [X(-.24), Y(-.21)];
    } else if (sl.id === 'dstem') {
      circ(0, 0, 1.02, '#f1c9d5'); ring(.66, 1.0, '#e9f2e1'); ring(.86, 1.0, '#9ccb8a'); ring(.65, .69, '#d8c7a0'); ring(.95, 1.02, '#e8a8bb');
      if (fine) for (var a1 = 0; a1 < 72; a1++) { var an1 = a1 / 72 * PI * 2; circ(Math.cos(an1) * .91, Math.sin(an1) * .91, .03, '#7fb86d', '#4a7f3a'); }
      if (fine) for (var a2 = 0; a2 < 60; a2++) { var an2 = a2 / 60 * PI * 2; circ(Math.cos(an2) * .76, Math.sin(an2) * .76, .04, '#f3f8ee', '#9bb88a'); }
      circ(0, 0, .65, '#f7ede8'); if (fine) for (var p = 0; p < 90; p++) { var a3 = r() * PI * 2, rr = Math.sqrt(r()) * .58; circ(Math.cos(a3) * rr, Math.sin(a3) * rr, .05, '#fbf5f2', '#d8b8b0'); }
      for (var b = 0; b < 10; b++) { var ab = -PI / 2 + b / 10 * PI * 2, cx = Math.cos(ab), sy = Math.sin(ab); ctx.save(); ctx.translate(X(0), Y(0)); ctx.rotate(ab + PI / 2); var f = function (rr0, rr1, wd, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, -R((rr0 + rr1) / 2), R(wd), R((rr1 - rr0) / 2), 0, 0, PI * 2); ctx.fill(); }; f(.5, .6, .095, '#6fb26a'); f(.475, .5, .09, '#d9e56a'); f(.36, .475, .08, '#c23b3b'); ctx.restore(); if (Z >= 2.5) for (var v = 0; v < 6; v++) { var dd = (v % 3 - 1) * .045, rr2 = .4 + Math.floor(v / 3) * .05 + (v % 2) * .01; circ(cx * rr2 - sy * dd, sy * rr2 + cx * dd, .02 + Math.floor(v / 3) * .01, '#e8c0b8', '#8f1d1d'); } }
      A.epi = [X(0), Y(-.99)]; A.cortex = [X(0), Y(-.78)]; A.vb = [X(0), Y(-.48)]; A.cambium = [X(0), Y(-.487)]; A.xylem = [X(0), Y(-.42)]; A.phloem = [X(0), Y(-.55)]; A.pith = [X(0), Y(0)];
      A.vb = [X(.14), Y(-.5)];
    } else if (sl.id === 'mstem') {
      circ(0, 0, 1.02, '#f1c9d5'); ring(.93, 1.0, '#e8a8bb'); ring(.82, .94, '#3f7f55'); circ(0, 0, .83, '#f0f6e9');
      if (fine) for (var q2 = 0; q2 < 130; q2++) { var a4 = r() * PI * 2, r4 = Math.sqrt(r()) * .8; circ(Math.cos(a4) * r4, Math.sin(a4) * r4, .05, '#f9fcf5', '#b9d0a8'); }
      var bunds = [[0, .05, 1], [.35, -.3, 1], [-.4, .3, 1], [.45, .38, 1], [-.35, -.42, 1], [.1, .55, .9], [-.62, -.05, .85], [.65, -.1, .85], [.05, -.68, .75], [-.2, -.2, .9], [.7, .5, .7], [-.58, .55, .7], [.58, -.55, .7], [-.78, -.4, .6], [.12, .78, .6]];
      bunds.forEach(function (bb) { var x = bb[0], y = bb[1], s = bb[2] * .13; circ(x, y, s * 1.2, '#4a8f66', '#2d6a45'); circ(x, y, s, '#e9e07a'); circ(x - s * .35, y + s * .1, s * .32, '#f4cbc4', '#9e2a2a', lw); circ(x + s * .35, y + s * .1, s * .32, '#f4cbc4', '#9e2a2a', lw); circ(x, y - s * .45, s * .26, '#d23d3d'); ellp(x, y + s * .5, s * .45, s * .3, 0, '#5faa5a'); });
      A.epi = [X(0), Y(-.985)]; A.hypo = [X(0), Y(-.88)]; A.vb = [X(.0), Y(.05)]; A.sheath = [X(0), Y(.05 - .13 * 1.2 + .005)]; A.ground = [X(-.15), Y(.38)];
    } else if (sl.id === 'root') {
      circ(0, 0, 1.02, '#f3cfd8'); ring(.4, .96, '#eef5e6'); ring(.94, 1.0, '#e8a8bb'); for (var h1 = 0; h1 < 40; h1++) { var ah = h1 / 40 * PI * 2; ctx.strokeStyle = '#c9a0ac'; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(X(Math.cos(ah) * 1), Y(Math.sin(ah))); ctx.lineTo(X(Math.cos(ah) * 1.1), Y(Math.sin(ah) * 1.1)); ctx.stroke(); }
      if (fine) for (var c1 = 0; c1 < 150; c1++) { var a5 = r() * PI * 2, r5 = .45 + r() * .48; circ(Math.cos(a5) * r5, Math.sin(a5) * r5, .06, '#fbfdf7', '#aac79a'); }
      ring(.35, .42, '#c9b27a'); ring(.31, .35, '#f0e0a8'); circ(0, 0, .31, '#fbf6e4');
      [0, 1, 2, 3].forEach(function (k) { var ak = k * PI / 2; ctx.save(); ctx.translate(X(0), Y(0)); ctx.rotate(ak); ctx.fillStyle = '#c23b3b'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(R(.27), -R(.06)); ctx.lineTo(R(.27), R(.06)); ctx.fill(); ctx.restore(); circ(Math.cos(ak + PI / 4) * .2, Math.sin(ak + PI / 4) * .2, .06, '#7fc96d', '#3a7f3a'); if (fine) circ(Math.cos(ak) * .22, Math.sin(ak) * .22, .03, '#f2c0b8', '#8f1d1d'); });
      A.epi = [X(0), Y(-.97)]; A.cortex = [X(0), Y(-.7)]; A.endo = [X(0), Y(-.385)]; A.pericycle = [X(0), Y(-.33)]; A.xylem = [X(.16), Y(0)]; A.phloem = [X(.14), Y(-.14)];
    } else if (sl.id === 'leaf') {
      var wL = 1.4; rect(-wL, -.62, wL * 2, .1, '#e8a8bb'); rect(-wL, -.52, wL * 2, .27, '#4f9c4a'); rect(-wL, -.25, wL * 2, .6, '#a8d08a'); rect(-wL, .35, wL * 2, .1, '#e8a8bb');
      if (fine) { for (var i4 = -14; i4 < 14; i4++) { rect(i4 * .1, -.52, .09, .27, '#58a853', '#2f7a2b', lw); if (Z >= 7) { circ(i4 * .1 + .045, -.4, .012, '#1f5a1f'); circ(i4 * .1 + .045, -.3, .012, '#1f5a1f'); } } for (var k5 = 0; k5 < 80; k5++) { var xs = (r() * 2 - 1) * wL, ys = -.24 + r() * .58; ellp(xs, ys, .07, .05, r() * 3, '#d3ebb8', '#7aa860', lw); } for (var e1 = -14; e1 < 14; e1++) { rect(e1 * .1, -.62, .1, .1, '#f0c4d0', '#c9788f', lw); rect(e1 * .1, .35, .1, .1, '#f0c4d0', '#c9788f', lw); } }
      circ(0, .0, .22, '#e9e8c0', '#6b7a3a'); ellp(0, -.07, .12, .08, 0, '#c23b3b'); ellp(0, .09, .13, .07, 0, '#7fc96d', '#3a7f3a');
      [[-.7, .35], [.6, .35]].forEach(function (p) { ellp(p[0], p[1], .06, .12, 0, '#f7f2f6', '#6b8d9a'); }); if (Z <= 1) { } A.uepi = [X(-.5), Y(-.57)]; A.palisade = [X(-.5), Y(-.385)]; A.spongy = [X(-.55), Y(.05)]; A.vb = [X(0), Y(.2)]; A.lepi = [X(-.45), Y(.42)];
    }
    if (S.labels) { sl.parts.forEach(function (p) { var a = A[p.id]; if (!a) return; ctx.font = '600 14px "Hind Siliguri",sans-serif'; var tw = ctx.measureText(p.n.split(' (')[0]).width + 12; ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.strokeStyle = '#10243E'; ctx.lineWidth = 1; ctx.fillRect(a[0] - tw / 2, a[1] - 24, tw, 20); ctx.strokeRect(a[0] - tw / 2, a[1] - 24, tw, 20); ctx.fillStyle = '#10243E'; ctx.textAlign = 'center'; ctx.fillText(p.n.split(' (')[0], a[0], a[1] - 9); ctx.textAlign = 'start'; ctx.beginPath(); ctx.arc(a[0], a[1], 3, 0, PI * 2); ctx.fillStyle = '#d6336c'; ctx.fill(); }); }
    var v = ctx.createRadialGradient(c, c, w * .38, c, c, w * .72); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,10,20,.5)'); ctx.fillStyle = v; ctx.fillRect(0, 0, w, w);
    S.A = A; return A;
  }

  function mountSlide(root, ctx) {
    root.innerHTML = '<div class="vl-setup"><h3>স্লাইড তৈরি ও মাইক্রোস্কোপি</h3><p class="vl-mut">একটি নমুনা বাছো। প্রথমে স্লাইড তৈরির ধাপগুলো সঠিক ক্রমে করো, তারপর মাইক্রোস্কোপে (৩D) রেখে ৪×, ১০×, ৪০×-এ দেখে অংশ চিনে নাও।</p><label for="sl">নমুনা</label><select id="sl" class="fld">' + D.SLIDES.map(function (s) { return '<option value="' + s.id + '">' + esc(s.n) + '</option>'; }).join('') + '</select><button type="button" class="btn pri" data-go>শুরু করো</button></div>';
    root.querySelector('[data-go]').onclick = function () { run(C.byId(D.SLIDES, $('#sl', root).value)); };
    function run(sl) {
      var order = sl.prep.slice(), shuffled = sl.prep.map(function (t, i) { return [t, i]; }).sort(function () { return Math.random() - .5; }), q = sl.parts.slice().sort(function () { return Math.random() - .5; }).slice(0, 3), qi = 0;
      var steps = [
        { t: 'স্লাইড তৈরি: ধাপগুলো সঠিক ক্রমে বাছো', d: 'নিচের বাটনগুলো থেকে প্রতিবার পরের সঠিক ধাপটি বাছো।', input: { html: function (S) { S.pi = 0; return '<div class="vl-in"><div class="vl-mini">নমুনা: ' + esc(sl.tissue) + ' · স্টেইন: ' + esc(sl.stain) + '</div><div id="pdone" class="vl-mini"></div><div class="vl-pick" style="flex-direction:column">' + shuffled.map(function (s) { return '<button type="button" class="vl-tool" data-i="' + s[1] + '" style="text-align:left">' + esc(s[0]) + '</button>'; }).join('') + '</div></div>'; },
          bind: function (el, a, S) { el.addEventListener('click', function (e) { var b = e.target.closest('[data-i]'); if (!b || b.disabled) return; var i = +b.dataset.i; if (i === S.pi) { b.disabled = true; b.style.opacity = .5; S.pi++; el.querySelector('#pdone').innerHTML = '✓ ' + S.pi + '/' + order.length + ' ধাপ হয়েছে'; var sp = S.slideObj; if (S.pi === 3) sp.spot.alpha = .7; if (S.pi === order.length) { sp.spot.color = '#c98ad9'; S.V.ping(); a.submit(1); } } else a.mistake('এটা এখন নয়। ক্রম মনে করো: ' + (S.pi === 0 ? 'আগে নমুনা সংগ্রহ।' : 'শেষ ধাপ ছিল “' + order[S.pi - 1] + '”। পরের ধাপ কী?') + (S.pi === order.length - 1 ? ' কভারস্লিপ সবার শেষে।' : '')); }); } }, check: function () { return { ok: true }; }, run: async function (a, S) { S.slideObj.spot.alpha = .9; S.V.ping(); await a.sleep(300); } },
        { t: 'স্লাইড মাইক্রোস্কোপের স্টেজে রাখো', d: 'মাইক্রোস্কোপে ক্লিক করো (বা বাটন)। সবসময় কম মাগ্নিফিকেশন (৪×) থেকে শুরু করতে হয়।', tool: 'scope', wrong: {}, run: async function (a, S) { await S.V.tw(S.slideG, { pos: [5.4, 2.55, 0], rot: [0, 0, 0] }, 800); await S.V.camTo({ yaw: .6, pitch: .35, dist: 11, target: [4.5, 3, 0] }, 800); } },
        { t: 'মাইক্রোস্কোপে দেখো: ৪×, ১০×, ৪০×', d: 'ক্লিক-টেনে ছবি সরাও, বাটনে মাগ্নিফিকেশন বদলাও। "লেবেল দেখাও" চেপে অংশের নাম দেখো। শেষে পরের ধাপে যাও।', input: { html: function () { return '<div id="sc"></div><div class="vl-ctl"><button type="button" class="btn ghost sm" data-lb>লেবেল দেখাও/লুকাও</button><button type="button" class="btn pri sm" data-go>দেখা শেষ</button></div><div id="pinfo" class="vl-info" style="margin-top:8px"><p class="vl-mini">অংশের তথ্য এখানে আসবে।</p></div>'; }, bind: function (el, a, S) { S.labels = false; var sc = ctx.scope(el.querySelector('#sc'), { mags: [4, 10, 40], mag: 4, parts: sl.parts, draw: function (c, st, w, h) { drawSlide(sl, c, Object.assign(st, { labels: S.labels }), w, h); S.A = st.A; }, onClick: function (x, y) { var best = null, bd = 60; sl.parts.forEach(function (p) { var q = S.A && S.A[p.id]; if (q) { var d = Math.hypot(q[0] - x, q[1] - y); if (d < bd) { bd = d; best = p; } } }); if (best) el.querySelector('#pinfo').innerHTML = '<h4>' + esc(best.n) + '</h4><p>' + esc(best.d) + '</p>'; } }); S.sc = sc; el.querySelector('[data-lb]').onclick = function () { S.labels = !S.labels; sc.draw(); }; el.querySelector('[data-go]').onclick = function () { a.submit(1); }; } }, check: function () { return { ok: true }; } },
        { t: 'শনাক্তকরণ: ' + sl.parts.length + 'টির মধ্যে ৩টি অংশ খুঁজে ক্লিক করো', d: 'লেবেল লুকিয়ে ছবিতে প্রশ্নের অংশটি খুঁজে ক্লিক করো।', input: { html: function () { return '<div class="vl-in"><div id="qq" class="vl-msg"></div></div><div id="sc2"></div>'; }, bind: function (el, a, S) { qi = 0; var ask = function () { el.querySelector('#qq').innerHTML = '<b>প্রশ্ন ' + bn(qi + 1) + '/৩:</b> <b>' + esc(q[qi].n) + '</b> কোথায়? ছবিতে ক্লিক করো।'; }; ask(); S.labels = false; var sc = ctx.scope(el.querySelector('#sc2'), { mags: [4, 10, 40], mag: 10, quiz: true, draw: function (c, st, w, h) { drawSlide(sl, c, Object.assign(st, { labels: false }), w, h); S.A = st.A; }, onClick: function (x, y) { var t = S.A && S.A[q[qi].id]; if (!t) { a.say('এই অংশ এই মাগ্নিফিকেশনে দেখা যাচ্ছে না, ছবি সরাও/বড় করো।', 'info'); return; } if (Math.hypot(t[0] - x, t[1] - y) <= 70) { a.say('সঠিক! ' + esc(q[qi].d), 'ok'); qi++; if (qi >= 3) return a.submit(1); ask(); } else a.mistake('ওখানে নয়। ' + q[qi].n.split(' (')[0] + ' কোথায় থাকে মনে করো, বা মাগ্নিফিকেশন বদলে খুঁজো।'); } }); } }, check: function () { return { ok: true }; } }
      ];
      ctx.guided({ cam: { yaw: .3, pitch: .55, dist: 15, target: [3, 2, 1] }, steps: steps, tools: [{ id: 'scope', l: 'মাইক্রোস্কোপ', ic: '🔬' }], why: { scope: 'আগে স্লাইড তৈরি শেষ করো।' },
        build: function (V, a, S) { S.V = V; P.bench(V, 24, 12); var mic = P.microscope(V, [5, 0, 0], { light: true }); tag(mic.g, 'scope'); var s = P.slide(V, [-3, .2, 3], {}); S.slideObj = s; S.slideG = s.g; V.labelFor(s.g, 'স্লাইড', { off: [0, 1, 0] }); [['#4b1f77', -7], ['#c4325f', -5.6]].forEach(function (b) { P.bottle(V, [b[1], 0, -2.5], b[0], '', 'x'); }); V.add({ mesh: M.box(3, .1, 2.2), color: '#e9e7d8', pos: [-4, .02, 3] }); },
        finish: function () { return { lines: ['নমুনা: ' + esc(sl.n) + ' (' + esc(sl.en) + ')', 'চেনা অংশ: ' + q.map(function (p) { return esc(p.n.split(' (')[0]); }).join(', '), 'সংবহন বান্ডিল সাজানো: দ্বিবীজপত্রী কাণ্ডে বৃত্তাকার (open), একবীজপত্রী কাণ্ডে বিক্ষিপ্ত (closed)।'] }; } });
    }
  }

  VLab.register({ lab: 'plant', id: 'pl-hib', title: 'জবা ফুলের ডিসেকশন (৩D)', desc: 'epicalyx থেকে gynoecium পর্যন্ত বাইরে থেকে ভেতরে একটি একটি করে অংশ সরাও। ভুল ক্রমে করলে বলে দেবে।', ic: '🌺', xp: 60, tag: '৩D · ডিসেকশন', mount: mountDissect('hibiscus') });
  VLab.register({ lab: 'plant', id: 'pl-bean', title: 'শিমের বীজ (দ্বিবীজপত্রী) ডিসেকশন', desc: 'হিলাম, বীজত্বক, বীজপত্র ও ভ্রূণ (plumule, radicle) চেনো।', ic: '🫘', xp: 50, tag: '৩D', mount: mountDissect('bean') });
  VLab.register({ lab: 'plant', id: 'pl-maize', title: 'ভুট্টার দানা (একবীজপত্রী) L.S. ও স্টার্চ পরীক্ষা', desc: 'দানা কেটে আয়োডিন দাও, ভ্রূণপোষ, scutellum ও ভ্রূণ চিনে নাও।', ic: '🌽', xp: 50, tag: '৩D', mount: mountDissect('maize') });
  VLab.register({ lab: 'plant', id: 'pl-slide', title: 'স্লাইড তৈরি ও মাইক্রোস্কোপ', desc: 'পেঁয়াজের কোষ, স্টোমাটা, কাণ্ড, মূল ও পাতার প্রস্থচ্ছেদ। ৪×/১০×/৪০× ভিউ ও লেবেল।', ic: '🔬', xp: 80, tag: '৩D + মাইক্রোস্কোপ', mount: mountSlide });
  window.VLPlant = { drawSlide: drawSlide };
})();
