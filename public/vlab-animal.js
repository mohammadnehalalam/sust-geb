/* GEB Hub: ভার্চুয়াল ল্যাব, প্রাণিবিজ্ঞান (v3.5): ১১টি প্রাণীর ৩D মডেল, ডাইকোটোমাস কি দিয়ে শনাক্তকরণ, শনাক্তকরণ কুইজ। */
(function () {
  'use strict';
  if (!window.VLab || !window.VLCore) return;
  var U = VLab.u, $ = U.$, $$ = U.$$, esc = U.esc, bn = U.bn, D = window.VLData, C = window.VLCore, M = VL3D.mesh, PI = Math.PI;
  var shuffle = function (a) { return a.slice().sort(function () { return Math.random() - .5; }); };

  /* ---------- ৩D মডেল ---------- */
  function build(V, id) {
    var g = V.add({ kind: 'group' });
    function add(mesh, color, pos, scale, rot, pid, extra) { var o = V.add(Object.assign({ mesh: mesh, color: color, pos: pos || [0, 0, 0], scale: scale == null ? 1 : scale, rot: rot || [0, 0, 0], pick: !!pid, id: pid }, extra || {}), g); return o; }
    function limb(pts, r, color, pid) { return add(M.tube(pts, r, 6), color, [0, 0, 0], 1, [0, 0, 0], pid); }
    function sph(r, color, pos, sc, pid, ex) { return add(M.sphere(r, 14, 9), color, pos, sc, null, pid, ex); }
    var i, a, pts;
    if (id === 'jelly') {
      add(M.sphere(2.2, 20, 10), '#c9b3ff', [0, 1.6, 0], [1, .62, 1], null, 'bell', { alpha: .72 }); sph(1.2, '#9a7fe0', [0, 1.5, 0], [1, .4, 1], 'bell', { alpha: .8 });
      for (i = 0; i < 18; i++) { a = i / 18 * PI * 2; pts = []; for (var k = 0; k <= 8; k++) pts.push([Math.cos(a) * (1.9 - k * .02) + Math.sin(k * .9 + i) * .12, 1.1 - k * .35, Math.sin(a) * 1.9]); limb(pts, .04, '#e5d8ff', 'tent'); }
      for (i = 0; i < 4; i++) { a = i / 4 * PI * 2 + .4; pts = []; for (var j = 0; j <= 8; j++) pts.push([Math.cos(a) * .35 + Math.sin(j) * .15, 1.2 - j * .42, Math.sin(a) * .35]); limb(pts, .12, '#a98ef0', 'oral'); }
      g.pos = [0, 1, 0];
    } else if (id === 'worm') {
      for (i = 0; i < 34; i++) { var t = i / 33, x = -4.8 + t * 9.6, y = .5 + Math.sin(t * 5) * .15, z = Math.cos(t * 5) * .6, cl = i >= 11 && i <= 14; sph(.46 - (t > .85 ? (t - .85) * 1.5 : 0), cl ? '#d79a8a' : '#a85a56', [x, y, z], [.55, 1, 1], cl ? 'clit' : 'seg'); }
      sph(.4, '#c7706a', [-5.2, .5, .6], [1, .9, .9], 'pros'); g.pos = [0, .2, 0];
    } else if (id === 'snail') {
      add(M.sphere(1.9, 18, 12), '#b08a52', [-.2, 2.2, 0], [1, 1.05, .95], null, 'shell'); for (i = 0; i < 3; i++) add(M.torus(1.4 - i * .35, .12, 22, 6), '#8a6a38', [-.2 + i * .06, 2.2, 0], 1, [PI / 2, 0, 0], 'shell');
      add(M.sphere(1, 16, 10), '#cbbf9a', [1.2, .5, 0], [3, .55, .9], null, 'foot'); sph(.6, '#cbbf9a', [3.2, 1.1, 0], 1, 'head'); [[.25], [-.25]].forEach(function (s) { limb([[3.3, 1.5, s[0]], [3.7, 2.4, s[0] * 1.8]], .06, '#cbbf9a', 'head'); sph(.09, '#222', [3.7, 2.45, s[0] * 1.8], 1, 'head'); });
    } else if (id === 'star') {
      for (i = 0; i < 5; i++) { a = i / 5 * PI * 2; add(M.cyl(.1, .75, 3.6, 10), '#e0743a', [Math.cos(a) * .4, .3, Math.sin(a) * .4], [1, 1, .6], [PI / 2 - .0, -a + PI / 2, 0], 'arm'); }
      sph(1, '#e8864a', [0, .55, 0], [1.1, .45, 1.1], 'arm');
      for (i = 0; i < 40; i++) { var aa = i / 5 % 5 * PI * 2 / 5 + (i % 5) * PI * 2 / 5, rr = .6 + Math.floor(i / 5) * .38; add(M.cyl(0, .06, .3, 5), '#fbe3c7', [Math.cos(aa) * rr, .7, Math.sin(aa) * rr], 1, null, 'spine'); }
      for (i = 0; i < 5; i++) { a = i / 5 * PI * 2; for (var q = 0; q < 6; q++) sph(.09, '#f6c28a', [Math.cos(a) * (.8 + q * .5), .05, Math.sin(a) * (.8 + q * .5)], 1, 'tubef'); }
      g.pos = [0, .4, 0]; g.rot = [.0, 0, 0];
    } else if (id === 'hopper') {
      sph(.9, '#6a8f32', [3.5, 1.8, 0], [1, 1.1, .9], 'head'); sph(.22, '#111', [3.9, 2.1, .6], 1, 'head'); sph(.22, '#111', [3.9, 2.1, -.6], 1, 'head'); limb([[4, 2.6, .2], [4.8, 3.6, .7]], .04, '#333', 'head'); limb([[4, 2.6, -.2], [4.8, 3.6, -.7]], .04, '#333', 'head');
      add(M.capsule(2.4, .75, 12), '#7a9c3a', [1.6, 1.9, 0], 1, [0, 0, .1], 'thorax'); add(M.capsule(4.4, .72, 12), '#6a8a30', [-1.6, 1.8, 0], 1, [0, 0, -.05], 'abdomen');
      [[2.4, 1], [1.6, 0], [.8, -1]].forEach(function (L, ix) { [1, -1].forEach(function (s) { limb(ix === 2 ? [[L[0] - 1, 1.5, s * .6], [L[0] - 2.4, 3.2, s * 1.1], [L[0] - 3.2, 1.2, s * 1.3], [L[0] - 3.2, 0, s * 1.4]] : [[L[0], 1.5, s * .5], [L[0] + .4, .8, s * 1.1], [L[0] + .5, 0, s * 1.3]], .09, '#4f6a24', 'legs'); }); });
      [1, -1].forEach(function (s) { add(M.patch(function (u, v) { return [-u * 4 + .5, 0, s * (v * 1.3 + .2)]; }, 5, 3), '#d8e2a0', [.8, 2.6, 0], 1, [0, 0, 0], 'wing', { alpha: .8, two: true }); });
    } else if (id === 'prawn') {
      add(M.capsule(3.2, 1, 14), '#e89a6a', [1.4, 1.8, 0], 1, [0, 0, .12], 'carap'); add(M.cyl(0, .22, 1.8, 6), '#d9824f', [3.2, 2.1, 0], 1, [0, 0, -1.4], 'carap');
      [1, -1].forEach(function (s) { limb([[3, 2.3, s * .4], [5, 3.4, s * 1.2], [7, 3.8, s * 1.6]], .04, '#f2b48a', 'antenna'); limb([[3, 2.2, s * .3], [4.3, 3, s * .5], [5.2, 3.2, s * .6]], .04, '#f2b48a', 'antenna'); });
      for (i = 0; i < 5; i++) [1, -1].forEach(function (s) { limb([[2.3 - i * .5, 1.2, s * .5], [2.6 - i * .5, .6, s * 1.1], [2.9 - i * .5, 0, s * 1.4]], i === 0 ? .12 : .06, '#f2a67a', 'legs'); });
      for (i = 0; i < 5; i++) add(M.sphere(.7 - i * .07, 10, 8), '#e08a5a', [-1.2 - i * .9, 1.4 - i * .12, 0], [.7, 1, 1], null, 'tail'); add(M.cyl(0, .6, 1, 6), '#d9824f', [-5.9, 1, 0], 1, [0, 0, 1.5], 'tail');
    } else if (id === 'rohu') {
      add(M.sphere(1, 22, 14), '#a8b3b8', [0, 1.8, 0], [3.2, 1.25, .6], null, 'scale'); add(M.sphere(1, 22, 14), '#d8c88a', [.3, 1.2, 0], [2.6, .55, .55], null, 'scale');
      add(M.patch(function (u, v) { return [(1 - v) * 1.8 - 1.5, 0, 0]; }, 1, 1), '#666', [0, 0, 0], 0);
      add(M.patch(function (u, v) { return [-3.2 - u * 1.5, (v - .5) * 2.6 * u, 0]; }, 4, 6), '#7d8b92', [0, 1.8, 0], 1, [0, 0, 0], 'fin', { two: true }); add(M.patch(function (u, v) { return [-1 + v * 2.2, u * 1.3, 0]; }, 3, 6), '#7d8b92', [0, 2.9, 0], 1, null, 'fin', { two: true }); add(M.patch(function (u, v) { return [.9 + v * .9, -u * 1.1, u * .7]; }, 3, 3), '#8fa0a8', [0, 1.4, .3], 1, null, 'fin', { two: true });
      add(M.patch(function (u, v) { return [Math.cos(v * PI - PI / 2) * .1 + 2.1, (u - .5) * 1.7, Math.sin(v * PI - PI / 2) * .5]; }, 4, 6), '#c9d6db', [0, 1.8, 0], 1, null, 'gill', { two: true });
      limb([[-2.6, 1.85, .6], [-.5, 1.95, .62], [1.6, 1.9, .55]], .04, '#455', 'lat'); sph(.2, '#111', [2.7, 2.1, .52], 1, 'scale'); g.pos = [0, 0, 0];
    } else if (id === 'frog') {
      add(M.sphere(1, 18, 12), '#5f8f3a', [0, 1.6, 0], [2.2, 1.2, 1.4], null, 'skin'); sph(.9, '#6a9c42', [2.2, 1.9, 0], [1.1, .7, 1.1], 'skin');
      [1, -1].forEach(function (s) { sph(.38, '#c9d86a', [2.4, 2.65, s * .7], 1, 'eye'); sph(.17, '#111', [2.55, 2.7, s * .8], 1, 'eye'); add(M.disc(.34, 14), '#9a8a4a', [1.8, 2.05, s * 1.05], 1, [0, 0, 0], 'tymp'); sph(.1, '#2a3a1a', [3.0, 2.25, s * .3], 1, 'eye'); limb([[1.8, 1.4, s * 1.0], [2.6, .6, s * 1.3], [2.8, 0, s * 1.2]], .14, '#5f8f3a', 'skin'); limb([[-1.5, 1.4, s * .9], [-3, 2.0, s * 1.6], [-1.6, .5, s * 2.0], [-.4, .0, s * 2.1]], .2, '#4f7f30', 'skin'); add(M.patch(function (u, v) { return [-.4 + u * 1.4, 0, s * 2.1 + (v - .5) * 1.6]; }, 3, 4), '#a8c46a', [0, .06, 0], 1, null, 'web', { two: true }); });
      g.pos = [0, 0, 0];
    } else if (id === 'lizard') {
      add(M.capsule(4, .8, 14), '#9a8a3a', [0, 1.4, 0], [1, .9, 1], null, 'scale'); sph(.8, '#a89848', [2.6, 1.7, 0], [1.3, .8, .8], 'scale'); sph(.12, '#111', [3, 2, .5], 1, 'scale'); sph(.12, '#111', [3, 2, -.5], 1, 'scale');
      for (i = 0; i < 7; i++) add(M.cyl(0, .2, .45, 4), '#7a6a24', [1 - i * .6, 2.2, 0], 1, [0, 0, 0], 'scale');
      limb([[-2, 1.4, 0], [-4, 1.3, .8], [-6, .9, -.4], [-8, .6, .3]], .22, '#8a7a30', 'tail');
      [[1.6, 1], [1.6, -1], [-1.5, 1], [-1.5, -1]].forEach(function (L) { limb([[L[0], 1.2, L[1] * .5], [L[0] + .3, .8, L[1] * 1.2], [L[0] + .8, .1, L[1] * 1.4]], .14, '#8a7a30', 'scale'); for (var c = -1; c <= 1; c++) add(M.cyl(0, .05, .35, 4), '#2a2a2a', [L[0] + 1, .1, L[1] * 1.4 + c * .14], 1, [0, 0, -1.4], 'claw'); });
    } else if (id === 'pigeon') {
      add(M.sphere(1, 20, 12), '#8c98a8', [0, 2, 0], [2.1, 1.3, 1.15], null, 'feather'); sph(.75, '#8c98a8', [2.2, 3.1, 0], 1, 'feather'); sph(.1, '#e06a2a', [2.7, 3.35, .5], 1, 'feather'); sph(.1, '#e06a2a', [2.7, 3.35, -.5], 1, 'feather'); add(M.cyl(0, .22, .8, 6), '#e8b07a', [3.1, 3.05, 0], 1, [0, 0, -PI / 2], 'beak');
      [1, -1].forEach(function (s) { add(M.patch(function (u, v) { return [-v * 2.2 + 1, -Math.sin(u * PI) * .25, s * u * 2.8]; }, 4, 5), '#6f7c8e', [0, 2.3, 0], 1, null, 'wing', { two: true }); limb([[.3, 1.1, s * .4], [.4, .4, s * .5], [.5, .0, s * .6]], .06, '#d9606a', 'foot'); for (var c = 0; c < 3; c++) limb([[.5, .0, s * .6], [.9, 0, s * (.6 + (c - 1) * .2)]], .04, '#d9606a', 'foot'); });
      add(M.patch(function (u, v) { return [-u * 2.4, 0, (v - .5) * 1.2 * (1 - u * .3)]; }, 3, 3), '#7b8798', [-1.6, 2.1, 0], 1, null, 'feather', { two: true });
    } else if (id === 'rabbit') {
      add(M.sphere(1, 20, 12), '#c8c0b4', [0, 1.8, 0], [2, 1.4, 1.2], null, 'fur'); sph(.9, '#d2cabe', [2.3, 2.5, 0], [1.1, .9, .9], 'fur'); sph(.1, '#222', [3, 2.8, .55], 1, 'fur'); sph(.1, '#222', [3, 2.8, -.55], 1, 'fur'); sph(.12, '#e8a8a8', [3.2, 2.5, 0], 1, 'fur');
      [.3, -.3].forEach(function (s) { add(M.sphere(1, 12, 8), '#d6aeb0', [2.1, 4.2, s], [.28, 1.3, .12], [0, 0, -.15], 'ear'); });
      sph(.5, '#fff', [-2, 2, 0], 1, 'tail'); [1, -1].forEach(function (s) { add(M.sphere(1, 12, 8), '#c8c0b4', [-1.2, .8, s * 1.0], [1.4, .8, .5], null, 'hind'); limb([[-.8, .6, s * 1.1], [-.1, .1, s * 1.1]], .18, '#c8c0b4', 'hind'); limb([[1.3, 1.1, s * .7], [1.6, .0, s * .8]], .15, '#c8c0b4', 'fur'); });
    }
    return g;
  }
  window.VLAnimalBuild = build;

  /* ---------- হেল্পার ---------- */
  function stage(root) { return '<div class="vl-stage"><canvas class="vl-cv" aria-label="৩D প্রাণী মডেল"></canvas><div class="vl-hud"><span class="vl-chip" id="anT"></span></div><div class="vl-zoomhint">অংশে ক্লিক করে তথ্য পড়ো · টেনে ঘোরাও</div></div>'; }
  function showModel(cv, spec, onPart) {
    var V = VL3D.create(cv, { yaw: .6, pitch: .25, dist: 15, target: [0, 1.8, 0], bg: ['#27414f', '#101c26'], minDist: 6, maxDist: 26 }), cur;
    VL3D.parts.bench(V, 22, 12); var g = build(V, spec.id); V.onPick = function (h) { if (h && h.ob && h.ob.id && onPart) onPart(h.ob.id); };
    return V;
  }
  var partInfo = function (spec, pid) { var p = spec.parts.filter(function (x) { return x.id === pid; })[0]; return p ? '<h4>' + esc(p.n) + '</h4><p>' + esc(p.d) + '</p>' : ''; };

  /* ================= ১. ডাইকোটোমাস কি ================= */
  function mountKey(root, ctx) {
    var spec = D.ANIMALS[Math.floor(Math.random() * D.ANIMALS.length)], node = 'Q1', mis = 0, hist = [], done = false, seen = {};
    root.innerHTML = '<div class="vl-exp"><div>' + stage() + '<div class="vl-mut" id="anNote">নমুনা-X: মডেলটি ঘুরিয়ে দেখো, বিভিন্ন অংশে ক্লিক করে বৈশিষ্ট্য পড়ো। তারপর ডান পাশের কি-র প্রশ্নের উত্তর দাও।</div></div><aside class="vl-side"><h3>ডাইকোটোমাস কি</h3><div class="vl-info" id="anPart"><p class="vl-mini">অংশে ক্লিক করলে তথ্য এখানে আসবে।</p></div><div id="anQ"></div><ol id="anH" class="vl-mini" style="margin:0;padding-left:20px"></ol><div class="vl-ctl"><button type="button" class="btn ghost sm" data-a="new">নতুন নমুনা</button></div></aside></div>';
    var V = showModel($('.vl-cv', root), spec, function (pid) { seen[pid] = 1; $('#anPart', root).innerHTML = partInfo(spec, pid); }); $('#anT', root).textContent = 'নমুনা-X';
    function ask() {
      var n = D.KEY[node]; $('#anQ', root).innerHTML = '<div class="vl-msg"><b>প্রশ্ন ' + bn(hist.length + 1) + ':</b> ' + esc(n.q) + '</div><div class="vl-ctl" style="margin-top:8px"><button type="button" class="btn pri" data-y="y">হ্যাঁ</button><button type="button" class="btn ghost" data-y="n">না</button></div><div id="anM" class="vl-mini" style="margin-top:6px"></div>';
      $('#anH', root).innerHTML = hist.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('');
    }
    function answer(dir) {
      if (done) return; var n = D.KEY[node], truth = C.keyAnswer(spec.id, node);
      if (dir !== truth) { mis++; var tn = truth === 'y' ? n.yes : n.no; $('#anM', root).innerHTML = '<span class="vl-no">ভুল উত্তর।</span> আবার দেখো: এই নমুনায় আসলে “' + esc(tn) + '”। (বৈশিষ্ট্য মডেলে দেখো: নমুনার অংশে ক্লিক করো)'; var s = $('.vl-stage', root); s.classList.remove('err'); void s.offsetWidth; s.classList.add('err'); return; }
      hist.push(n.q.replace(/\?$/, '') + ' → ' + (dir === 'y' ? n.yes : n.no)); var nx = n[dir];
      if (nx.indexOf('L:') === 0) { done = true; finishKey(); return; } node = nx; ask();
    }
    function finishKey() {
      var lines = ['প্রাণী: <b>' + esc(spec.n) + '</b>', 'Phylum: ' + esc(spec.phy) + ' · Class: ' + esc(spec.cls), 'প্রতিসমতা: ' + esc(spec.sym) + '; দেহ: ' + esc(spec.body), esc(spec.note)];
      $('#anT', root).textContent = spec.n; var f = ctx.finish({ mistakes: mis, lines: lines }); $('#anQ', root).innerHTML = '<div class="vl-msg ok">' + ctx.resultHtml({ mistakes: mis, lines: lines }, f) + '</div>'; $('#anH', root).innerHTML = hist.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('');
      $('#anNote', root).innerHTML = '<b>শনাক্তকরণ পদ্ধতি:</b> ' + D.ID_METHODS.map(function (m) { return esc(m[0]); }).join(' · ');
    }
    root.addEventListener('click', function (e) { var b = e.target.closest('[data-y]'); if (b) return answer(b.dataset.y); if (e.target.closest('[data-a="new"]')) { V.destroy(); mountKey(root, ctx); } });
    ask();
  }

  /* ================= ২. শনাক্তকরণ কুইজ ================= */
  function mountQuiz(root, ctx) {
    var N = 6, qi = 0, ok = 0, mis = 0, order = shuffle(D.ANIMALS).slice(0, N), V = null;
    root.innerHTML = '<div class="vl-exp"><div>' + stage() + '</div><aside class="vl-side" id="qzSide"></aside></div>';
    function next() {
      if (qi >= N) { var lines = ['সঠিক: ' + bn(ok) + '/' + bn(N), 'সব প্রাণীর Phylum/Class: ' + order.map(function (s) { return esc(s.n.split(' (')[0]) + ' → ' + esc(s.cls); }).join('; ')]; var f = ctx.finish({ mistakes: mis, lines: lines }); $('#qzSide', root).innerHTML = '<div class="vl-msg ok">' + ctx.resultHtml({ mistakes: mis, lines: lines }, f) + '</div>'; return; }
      var spec = order[qi], opts = [spec.cls]; D.ANIMALS.forEach(function (s) { if (opts.indexOf(s.cls) < 0 && opts.length < 4) opts.push(s.cls); }); opts = shuffle(opts);
      if (V) V.destroy(); var old = $('.vl-cv', root); var nc = old.cloneNode(false); old.parentNode.replaceChild(nc, old); V = showModel(nc, spec, function (pid) { $('#qzP', root).innerHTML = partInfo(spec, pid); });
      $('#anT', root).textContent = 'নমুনা ' + bn(qi + 1) + '/' + bn(N);
      $('#qzSide', root).innerHTML = '<h3>শনাক্তকরণ কুইজ</h3><div class="vl-bar"><i style="width:' + Math.round(qi / N * 100) + '%"></i></div><div class="vl-msg" id="qzM"><b>এটি কোন শ্রেণির (Class) প্রাণী?</b><br>মডেল ঘুরিয়ে দেখো ও অংশে ক্লিক করো: ' + esc(spec.sym) + '।</div><div class="vl-info" id="qzP"><p class="vl-mini">অংশে ক্লিক করলে তথ্য আসবে।</p></div><div class="vl-pick">' + opts.map(function (o) { return '<button type="button" class="vl-tool" data-q="' + esc(o) + '">' + esc(o) + '</button>'; }).join('') + '</div>';
      $('#qzSide', root).onclick = function (e) {
        var b = e.target.closest('[data-q]'); if (!b || b.disabled) return;
        if (b.dataset.q === spec.cls) { ok++; qi++; $('#qzM', root).className = 'vl-msg ok'; $('#qzM', root).innerHTML = '<b>সঠিক!</b> ' + esc(spec.n) + ': ' + esc(spec.note); $$('[data-q]', root).forEach(function (x) { x.disabled = true; }); setTimeout(next, 1800); }
        else { mis++; b.disabled = true; $('#qzM', root).className = 'vl-msg err'; $('#qzM', root).innerHTML = '<b>ভুল।</b> ইঙ্গিত: ' + esc(spec.body) + '; ' + esc(spec.sym) + '। আবার চেষ্টা করো।'; }
      };
    }
    next();
  }

  /* ================= ৩. প্রাণী গ্যালারি ================= */
  function mountGallery(root, ctx) {
    var sel = 'frog', seen = {}, V = null;
    root.innerHTML = '<div class="vl-exp"><div>' + stage() + '<div class="vl-bchips fchips" id="glC" style="margin-top:10px"></div></div><aside class="vl-side" id="glS"></aside></div>';
    $('#glC', root).innerHTML = D.ANIMALS.map(function (a) { return '<button type="button" class="fc sm" data-s="' + a.id + '" aria-pressed="false">' + esc(a.n.split(' (')[0]) + '</button>'; }).join('');
    function pick(id) {
      sel = id; var spec = C.byId(D.ANIMALS, id); seen[id] = 1; if (V) V.destroy(); var old = $('.vl-cv', root), nc = old.cloneNode(false); old.parentNode.replaceChild(nc, old); V = showModel(nc, spec, function (pid) { $('#glP', root).innerHTML = partInfo(spec, pid); });
      $('#anT', root).textContent = spec.n; $$('#glC [data-s]', root).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.s === id)); });
      $('#glS', root).innerHTML = '<h3>' + esc(spec.n) + '</h3><dl class="vl-kv"><dt>Phylum</dt><dd>' + esc(spec.phy) + '</dd><dt>Class</dt><dd>' + esc(spec.cls) + '</dd><dt>আবাস</dt><dd>' + esc(spec.hab) + '</dd><dt>প্রতিসমতা</dt><dd>' + esc(spec.sym) + '</dd><dt>দেহ</dt><dd>' + esc(spec.body) + '</dd><dt>চলন</dt><dd>' + esc(spec.moves) + '</dd></dl><p class="vl-mut">' + esc(spec.note) + '</p><div class="vl-info" id="glP"><p class="vl-mini">মডেলের অংশে ক্লিক করো।</p></div>' +
        '<div class="vl-info"><h4>প্রাণী শনাক্তকরণের পদ্ধতি</h4>' + D.ID_METHODS.map(function (m) { return '<p><b>' + esc(m[0]) + ':</b> ' + esc(m[1]) + '</p>'; }).join('') + '</div>' + (Object.keys(seen).length >= D.ANIMALS.length ? '<div class="vl-msg ok">সব নমুনা দেখা হয়েছে ✔</div>' : '<p class="vl-mini">দেখা হয়েছে: ' + bn(Object.keys(seen).length) + '/' + bn(D.ANIMALS.length) + ' (সব দেখলে XP পাবে)</p>');
      if (Object.keys(seen).length === D.ANIMALS.length && !seen._d) { seen._d = 1; var f = ctx.finish({ mistakes: 0, lines: ['১১টি প্রাণীর মডেল ও বৈশিষ্ট্য দেখা হয়েছে।'] }); U.toast('গ্যালারি সম্পন্ন: +' + f.xp + ' XP'); }
    }
    root.addEventListener('click', function (e) { var b = e.target.closest('[data-s]'); if (b) pick(b.dataset.s); }); pick(sel);
  }

  VLab.register({ lab: 'animal', id: 'an-key', title: 'ডাইকোটোমাস কি দিয়ে প্রাণী শনাক্তকরণ', desc: 'অজানা নমুনার ৩D মডেল দেখে হ্যাঁ/না প্রশ্নে শ্রেণিবিন্যাসে পৌঁছাও। ভুল উত্তরে কারণ বলবে।', ic: '🔑', xp: 70, tag: '৩D · কি', mount: mountKey });
  VLab.register({ lab: 'animal', id: 'an-quiz', title: 'প্রাণী শনাক্তকরণ কুইজ (৬টি)', desc: '৩D মডেলের বৈশিষ্ট্য দেখে প্রাণীর শ্রেণি (Class) বলো।', ic: '🎯', xp: 50, tag: '৩D · কুইজ', mount: mountQuiz });
  VLab.register({ lab: 'animal', id: 'an-gal', title: 'প্রাণী গ্যালারি: ১১টি নমুনা', desc: 'জেলিফিশ থেকে খরগোশ: প্রতিটি মডেল ঘুরিয়ে অংশ চিনো, বৈশিষ্ট্য ও শনাক্তকরণ পদ্ধতি পড়ো।', ic: '🐸', xp: 30, tag: '৩D · ১১টি', mount: mountGallery });
})();
