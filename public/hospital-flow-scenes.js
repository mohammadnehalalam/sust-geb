/* GEB Hub: রোগীর যাত্রার ৩D দৃশ্য (v3.17)
   অ্যাম্বুলেন্স, ট্রায়াজ, রেড-বে, রিসেপশন/ক্যাশ/ফার্মেসি কাউন্টার, টোকেনের হল, ডাক্তারের রুম, ওয়ার্ড, ওষুধের শেলফ।
   প্রতিটি দৃশ্য SC[নাম](V, R) → S (S-এ দৃশ্যের নিজস্ব কমান্ড থাকে, যেমন S.place, S.pay)। */
(function () {
  'use strict';
  var C = window.GEBFlowCore; if (!C) return;
  var K = C.K, F = C.F, M = K.M, PI = K.PI, bn = K.bn, bx = C.bx, cy = C.cy, sp = C.sp, DOC = C.DOC, tk = F.tk;
  var VL = window.VL3D, mixc = VL.mix;
  var SC = {};
  function T(ms) { return new Promise(function (r) { setTimeout(r, VL.reduce ? 1 : ms); }); }
  function pers(V, col, pos, o) { o = o || {}; o.pos = pos; return C.person(V, col, o); }

  function setup(V, cam, floorCol, name, wall) {
    K.sceneReset(cam); C.ground(V, floorCol || '#dfe6ea');
    if (wall) bx(V, 40, 8, .5, wall, [0, 0, -9], { layer: 2, shade: .9 });
    return C.newScene(V, name);
  }
  function staffAt(V, S, col, pos, name, o) { var p = pers(V, col, pos, o); if (name) C.tag(V, p.g, name); return p; }

  /* ---------- অ্যাম্বুলেন্স আসা ---------- */
  SC.amb = function (V, R) {
    K.sceneReset({ yaw: .35, pitch: .5, dist: 34, target: [2, 2, 0] });
    bx(V, 70, .3, 14, '#3b4651', [0, -.3, 6], { layer: 0 }); bx(V, 70, .4, 6, '#b9c4cc', [0, -.3, -3], { layer: 1 });
    for (var i = -5; i < 6; i++) bx(V, 3, .05, .35, '#f4f4f4', [i * 6, 0, 6], { layer: 2 });
    var S = C.newScene(V, 'amb');
    bx(V, 36, 10, 4, '#e9eff3', [0, .1, -8], { layer: 3 });
    [-12, -6, 0, 12, 16].forEach(function (x) { bx(V, 3, 2, .2, '#7fa6c9', [x, 3, -5.9], { layer: 4 }); bx(V, 3, 2, .2, '#7fa6c9', [x, 6.5, -5.9], { layer: 4 }); });
    bx(V, 11, .6, 5.5, '#d94b4b', [8, 5.2, -4.6], { layer: 5 }); bx(V, 4.6, 4.2, .3, '#9fd0e8', [8, .1, -5.9], { layer: 4, alpha: .75 });
    var sign = bx(V, 4, .1, .1, '#d94b4b', [8, 6.3, -5.2], { layer: 5 }); V.labelFor(sign, '🚑 জরুরি বিভাগ', { off: [0, .8, 0], color: '#a02020' });
    bx(V, 10, .06, 5, '#f3b0b0', [8, .1, -2.5], { layer: 2 });
    var amb = V.add({ kind: 'group', pos: [-30, 0, 4] });
    bx(V, 7, 3, 3.2, '#f6f8fa', [0, 1.0, 0], { parent: amb }); bx(V, 2.6, 2.2, 3.2, '#f6f8fa', [4.4, 1.0, 0], { parent: amb }); bx(V, .15, 1.1, 2.8, '#7fb6d9', [5.75, 2.0, 0], { parent: amb, alpha: .85, layer: 4 });
    bx(V, 7.1, .5, 3.3, '#d94b4b', [0, 1.7, 0], { parent: amb, layer: 4 }); bx(V, 1.5, .42, .14, '#d94b4b', [0, 3.3, 1.66], { parent: amb, layer: 5 }); bx(V, .42, 1.5, .14, '#d94b4b', [0, 2.75, 1.66], { parent: amb, layer: 5 });
    [[-2.2, 1.55], [2.2, 1.55], [4.4, 1.55], [-2.2, -2.15], [2.2, -2.15], [4.4, -2.15]].forEach(function (w) { cy(V, .9, .9, .6, '#222d38', [w[0], .9, w[1]], { parent: amb, rot: [PI / 2, 0, 0], seg: 12, layer: 4 }); });
    bx(V, 3, .4, .6, '#2d3f4f', [1.5, 4.0, 0], { parent: amb });
    var lr = bx(V, .8, .5, .55, '#d94b4b', [.8, 4.0, 0], { parent: amb, glow: 1, layer: 5 }), lb = bx(V, .8, .5, .55, '#3f7de0', [2.2, 4.0, 0], { parent: amb, glow: 0, layer: 5 });
    V.hook(function (t) { var on = Math.floor(t / 250) % 2; lr.glow = on ? 1 : 0; lb.glow = on ? 0 : 1; return false; });
    var rn = staffAt(V, S, '#ee8fb3', [10.5, 0, -3.8], 'ট্রায়াজ নার্স', { cap: '#fff' });
    S.caption('🚑 অ্যাম্বুলেন্স', ['📞 ৯৯৯ → অ্যাম্বুলেন্স রওনা। রাস্তা থেকেই প্রি-অ্যালার্ট: “৩০ বছর, পেটে আঘাত, ৮ মিনিটে পৌঁছাচ্ছি”', '🏥 ইমার্জেন্সিতে রেড-বে ও দল প্রস্তুত হচ্ছে', '🚑 গেটে পৌঁছে স্ট্রেচারে রোগী নামানো, ঘাড় স্থির রেখে', '🤝 ট্রায়াজ নার্সের কাছে MIST হ্যান্ডওভার'], 2600);
    var t0 = performance.now(), arrived = false;
    C.infoHud(S, function (now) { var el = (now - t0) / 2600, eta = arrived ? 0 : Math.max(0, Math.round(8 * (1 - el))); return [['আনুমানিক পৌঁছাতে', arrived ? 'পৌঁছে গেছে' : bn(eta) + ' মিনিট', arrived ? '#38f5b4' : '#ffd24a'], ['প্রি-অ্যালার্ট', 'দেওয়া হয়েছে ✔']]; }, { left: true, bottom: true, w: 190, title: 'রেডিও/ফোন' });
    V.tw(amb, { pos: [2, 0, 4] }, 2600).then(function () { arrived = true; return T(900); }).then(function () {
      var st = V.add({ kind: 'group', pos: [-5, 0, 4] });
      bx(V, 5, .3, 1.8, '#d4dde3', [0, 1.3, 0], { parent: st }); [[-2, -.7], [2, -.7], [-2, .7], [2, .7]].forEach(function (p) { cy(V, .07, .07, 1.3, '#8795a1', [p[0], 0, p[1]], { parent: st, seg: 6 }); });
      V.add({ mesh: M.capsule(3.8, .5, 10), color: '#4aa3ff', pos: [.5, 1.95, 0], layer: 4 }, st); sp(V, .42, '#e6b392', [-2.0, 2.0, 0], { parent: st, layer: 4 });
      bx(V, 3.6, .22, 1.2, '#e8eef2', [.5, 2.45, 0], { parent: st, layer: 4 });
      C.adopt(st, pers(V, '#2f9d8f', [-3.4, 0, 0], { cap: '#2f9d8f' })); C.adopt(st, pers(V, '#2f9d8f', [3.4, 0, 0], { cap: '#2f9d8f' }));
      return V.tw(st, { pos: [3, 0, -1.5] }, 1500).then(function () { return V.tw(st, { pos: [8, 0, -3.4] }, 1100); });
    });
    return S;
  };

  /* ---------- ট্রায়াজ ---------- */
  SC.triage = function (V, R) {
    K.sceneReset({ yaw: 0, pitch: 1.0, dist: 30, target: [0, 0, 1] }); C.ground(V, '#d5dee3', 46, 28);
    var S = C.newScene(V, 'triage');
    var Z = { R: { x: -14, c: '#f4c6c6', n: '🔴 রেড-বে (এখনই)', col: '#d94b4b' }, Y: { x: 0, c: '#f6e6b0', n: '🟡 হলুদ (জরুরি)', col: '#e0b23a' }, G: { x: 14, c: '#cfeedb', n: '🟢 সবুজ (অপেক্ষা)', col: '#3fae6a' } };
    Object.keys(Z).forEach(function (k) {
      var z = Z[k], f = bx(V, 12, .08, 10, z.c, [z.x, 0, -5], { layer: 1 }); V.labelFor(f, z.n, { off: [0, .4, -4.4], color: '#10243E' });
      if (k === 'R') [-3.5, 0, 3.5].forEach(function (dx) { C.bed(V, z.x + dx, -5); }); else if (k === 'Y') [-3.8, -1.3, 1.3, 3.8].forEach(function (dx) { C.bed(V, z.x + dx, -5, { frame: '#e0d29a' }); }); else [-3.6, 0, 3.6].forEach(function (dx) { bx(V, 3.2, .7, 1.1, '#7aa6c9', [z.x + dx, 0, -5]); });
    });
    bx(V, 6, 1, 1.4, '#9c7b5b', [0, 0, 9], { layer: 3 }); var nr = pers(V, '#ee8fb3', [0, 0, 10.6], { cap: '#fff' }); C.tag(V, nr.g, 'আপনি (ট্রায়াজ নার্স)', '#0b6e5b');
    var list = R.v.triage || [], slots = { R: [], Y: [], G: [] }, pts = {};
    Object.keys(Z).forEach(function (k) { for (var i = 0; i < 6; i++) slots[k].push([Z[k].x - 4 + (i % 3) * 4, i < 3 ? -7 : -3.2]); });
    var ppl = list.map(function (p, i) { var x = -10 + i * 4, q = pers(V, '#7fa6d6', [x, 0, 5.5], { s: 1 }); C.tag(V, q.g, bn(i + 1) + ' ' + p.n, '#10243E', 3.2); return q; });
    var arrow = cy(V, .5, 0, 1.0, '#ffd24a', [0, 4.2, 5.5], { glow: .8, layer: 6, seg: 8 }); arrow.vis = false;
    S.hi = function (i) { if (!ppl[i]) return; arrow.vis = true; V.tw(arrow, { pos: [ppl[i].g.pos[0], 4.2, ppl[i].g.pos[2]] }, 250); };
    S.place = function (i, cat) { var q = ppl[i]; if (!q) return; var s = slots[cat].shift() || [Z[cat].x, -5]; V.tw(q.b.kids[0], { color: Z[cat].col }, 300); V.tw(q.g, { pos: [s[0], 0, 5.5] }, 300).then(function () { return V.tw(q.g, { pos: [s[0], 0, s[1] ] }, 900); }); arrow.vis = false; };
    S.wrong = function (i) { var q = ppl[i]; if (!q) return; var p = q.g.pos.slice(); V.tw(q.g, { pos: [p[0] + .5, 0, p[2]] }, 90).then(function () { return V.tw(q.g, { pos: [p[0] - .5, 0, p[2]] }, 120); }).then(function () { return V.tw(q.g, { pos: p }, 90); }); };
    S.caption('🩺 ট্রায়াজ-ডেস্ক', ['একসাথে ' + bn(list.length) + ' জন রোগী এসেছে', 'প্রতিজনকে ১ মিনিটে দেখুন: ABCD ও ভাইটাল', 'লাল → রেড-বে, হলুদ → পর্যবেক্ষণ, সবুজ → অপেক্ষা-এলাকা'], 2200);
    return S;
  };

  /* ---------- রেড-বে ---------- */
  SC.resus = function (V, R) {
    K.sceneReset({ yaw: .4, pitch: .65, dist: 21, target: [0, 2, 0] }); C.ground(V, '#d9e5e8');
    var S = C.newScene(V, 'resus');
    bx(V, 16, .06, 14, '#f3c2c2', [0, 0, 0], { layer: 1 });
    bx(V, 3.6, .5, 8, '#bfcdd6', [0, 1.6, 0]); [[-1.4, -3.4], [1.4, -3.4], [-1.4, 3.4], [1.4, 3.4]].forEach(function (p) { cy(V, .1, .1, 1.7, '#7f93a1', [p[0], 0, p[1]], { seg: 6 }); });
    var pat = V.add({ kind: 'group', pos: [0, 2.7, 0] });
    V.add({ mesh: M.capsule(5.2, .9, 12), color: '#7fb6d9', pos: [0, 0, .5], rot: [0, PI / 2, 0], layer: 4 }, pat); sp(V, .66, '#e6b392', [0, .05, -2.7], { layer: 4, parent: pat }); bx(V, 1.6, .3, 1.2, '#fbfbf6', [0, -.45, -2.75], { parent: pat });
    var mask = bx(V, .7, .35, .5, '#cfe9f2', [0, .1, -3.1], { parent: pat, layer: 5, alpha: .9 }); mask.vis = false;
    var blanket = bx(V, 2.1, .5, 3.4, '#cfd8dc', [0, .45, .9], { parent: pat, layer: 5 }); blanket.vis = false;
    var pole = cy(V, .1, .1, 7.5, '#8795a1', [3.2, 0, -1.5], { seg: 6 }); bx(V, 1.0, 1.5, .3, '#cfe5f1', [3.2, 6.2, -1.5], { alpha: .75, layer: 5 }); var bag = bx(V, .8, 1.2, .26, '#f2f2f2', [3.2, 6.3, -1.5], { glow: .4, layer: 6 }); bag.vis = false;
    var line = V.add({ pts: [[3.2, 6.0, -1.5], [2.6, 3.4, -.8], [1.2, 3.4, 0.2]], color: '#7fb6d9', width: 2, layer: 6 }); line.vis = false;
    cy(V, .5, .5, 3.2, '#2c7fb8', [-3.5, 0, -4.2]); bx(V, 2, 2.2, 1.4, '#d94b4b', [5.8, 0, -3.5]);
    var lead = pers(V, '#f4f6f8', [-3.6, 0, 3.2], {}); C.tag(V, lead.g, 'টিম-লিডার'); var aw = pers(V, '#2c7fb8', [0, 0, -5.8], { cap: '#2c7fb8', mask: true }); C.tag(V, aw.g, 'শ্বাসপথ');
    var nu = pers(V, '#ee8fb3', [3.6, 0, 0.8], { cap: '#fff' }); C.tag(V, nu.g, 'IV-ওষুধ নার্স'); var sc = pers(V, '#4f6fa8', [6, 0, 4.6], {}); C.tag(V, sc.g, 'লিপিকার');
    var cur = { hr: 132, sys: 82, dia: 50, spo2: 93 }, tg = { hr: 132, sys: 82, dia: 50, spo2: 93 };
    V.hook(function () { ['hr', 'sys', 'dia', 'spo2'].forEach(function (k) { cur[k] += (tg[k] - cur[k]) * .04; }); return false; });
    C.monitorHud(S, function () { return cur; });
    var rows = ['A শ্বাসপথ: খোলা আছে? ঘাড় স্থির রেখে চিবুক তোলা', 'B শ্বাস: অক্সিজেন মাস্ক, SpO₂ ৯৩ → ৯৭', 'C রক্তসঞ্চালন: রক্তক্ষরণ চেপে ধরা, ২টি বড় IV লাইন, তরল/রক্ত', 'D সচেতনতা: GCS, চোখের মণি, রক্তের সুগার', 'E পুরো শরীর দেখা, ঢেকে গরম রাখা'];
    S.caption('🚨 ABCDE', rows, 2400);
    K.later(function () { mask.vis = true; tg.spo2 = 97; tg.hr = 124; }, 4800); K.later(function () { bag.vis = true; line.vis = true; tg.sys = 104; tg.dia = 64; tg.hr = 108; }, 7200); K.later(function () { blanket.vis = true; }, 9600);
    return S;
  };

  /* ---------- কাউন্টার (রিসেপশন, ক্যাশ, ফার্মেসি) ---------- */
  function counterBase(V, name, sign, o) {
    o = o || {}; K.sceneReset({ yaw: .2, pitch: .62, dist: 22, target: [0, 1.5, -1] }); C.ground(V, '#dfe6ea');
    var S = C.newScene(V, name); bx(V, 40, 8, .5, o.wall || '#e6edf0', [0, 0, -9], { layer: 2, shade: .9 });
    var sg = bx(V, 8, .1, .1, '#10243E', [0, 7.4, -8.6], { layer: 4 }); V.labelFor(sg, sign, { off: [0, .8, 0], color: o.sc || '#0b4f7a' });
    bx(V, 15, 2.2, 2.4, o.desk || '#9c7b5b', [0, 0, -3]); bx(V, 15.4, .25, 2.8, '#f4f1ea', [0, 2.2, -3], { layer: 4 }); bx(V, 15, 2.4, .1, '#cfe5f1', [0, 2.45, -1.8], { alpha: .3, layer: 6 });
    var st = pers(V, o.staff || '#4f6fa8', [-2, 0, -5.4], { }); C.tag(V, st.g, o.staffName || 'কর্মী', '#0b6e5b');
    bx(V, 1.7, 1.1, .15, '#1e2c38', [3, 2.8, -3.9], { layer: 5 }); bx(V, 1.6, .8, 1.2, '#8a95a0', [5.4, 2.45, -3.4], { layer: 5 });
    var cu = pers(V, '#4aa3ff', [-1, 0, 1.6], { rot: [0, PI, 0] }); C.tag(V, cu.g, 'আপনি', '#0b6e5b');
    S.cu = cu; return S;
  }
  SC.reg = function (V, R) {
    var S = counterBase(V, 'reg', R.def.id === 'adm' ? '🛎️ ভর্তি ডেস্ক' : R.def.id === 'er' ? '🛎️ ইমার্জেন্সি রেজিস্ট্রেশন' : '🛎️ রিসেপশন ও টিকিট', { staffName: 'রিসেপশনিস্ট' });
    pers(V, '#8fa3b8', [-1, 0, 5.2], { rot: [0, PI, 0] }); pers(V, '#b79c8a', [-1, 0, 8.2], { rot: [0, PI, 0] });
    bx(V, 1.6, 3.6, 1.4, '#2f6fb0', [-9, 0, -2]); bx(V, 1.1, .9, .1, '#38f5b4', [-9, 2.4, -1.25], { glow: .8, layer: 5 });
    var d = R.def.id === 'er' ? DOC.erCard() : R.def.id === 'adm' ? DOC.admForm(R) : DOC.token(R);
    var rowsC = R.def.id === 'adm' ? ['নাম, বয়স, পরিচয়পত্র যাচাই', 'সঙ্গীর নাম-ফোন ও রক্তের গ্রুপ-অ্যালার্জি', 'সম্মতিপত্রে সই', 'বেড বাছাই'] : R.def.id === 'er' ? ['সঙ্গীর কাছ থেকে তথ্য', 'পরিচয় না থাকলে “অজ্ঞাতনামা” নম্বর', 'MLC দরকার কিনা দেখা', 'বিল পরে'] : ['নাম, বয়স, ফোন; পুরোনো রোগী কার্ড দেখান', 'অভিযোগ বলে সঠিক বিভাগ বাছা', 'ফি দেওয়া ও রশিদ', 'টোকেন ছাপা হলো'];
    S.caption('🛎️ রিসেপশন', rowsC, 1900); S.showDoc(d, 260); S.refresh = function () { S.showDoc(R.def.id === 'adm' ? DOC.admForm(R) : R.def.id === 'er' ? d : DOC.token(R), 260); };
    return S;
  };
  SC.cash = function (V, R) {
    var ph = R.def.id === 'ph', S = counterBase(V, 'cash', ph ? '💊 ফার্মেসি কাউন্টার' : '💳 ক্যাশ কাউন্টার', { staff: ph ? '#53b88b' : '#d9a441', staffName: ph ? 'আপনি (ফার্মাসিস্ট)' : 'ক্যাশিয়ার', sc: ph ? '#16754d' : '#8a5a0a' });
    bx(V, 2.2, 1.2, 1.4, '#34495e', [-5, 2.45, -3.4], { layer: 5 }); bx(V, 1.9, .2, 1.1, '#1f9d63', [-5, 3.7, -3.4], { layer: 6 });
    var stacks = [];
    for (var i = 0; i < 3; i++) stacks.push(bx(V, 1.1, .1 + i * .06, .6, ['#e0a21a', '#4aa3ff', '#7ac08f'][i], [1 + i * 1.4, 2.45, -2.2], { layer: 6 }));
    S.pay = function (n) { var b = bx(V, 1.1, .3, .6, '#e0a21a', [0, 4, 1.2], { layer: 7 }); return V.tw(b, { pos: [-1, 2.8, -2.2] }, 650).then(function () { return V.tw(b, { pos: [-4.5, 2.6, -3.3] }, 500); }).then(function () { V.remove(b); }); };
    S.caption(ph ? '💊 বিল' : '💳 ক্যাশ কাউন্টার', ph ? ['এক একের দাম × পরিমাণ = বিল', 'ক্যাশ মেমো দিন', 'বেশি টাকা দিলে খুচরো ফেরত'] : ['টাকা গুনে নিন, নোট ঠিক কিনা দেখুন', 'পরিমাণ মিলিয়ে রশিদ ছাপা হয়', 'রশিদ যত্নে রাখুন'], 2000);
    S.refresh = function (doc, step) { S.showDoc(doc, step || 240); };
    return S;
  };
  SC.pcount = function (V, R) {
    var S = counterBase(V, 'pcount', '💊 ফার্মেসি', { staff: '#53b88b', staffName: 'আপনি (ফার্মাসিস্ট)', sc: '#16754d' });
    for (var i = 0; i < 5; i++) bx(V, 2.4, 2.6, .6, ['#53b88b', '#e5596b', '#5fa8d3', '#d9b44a', '#8e6bbf'][i], [-8 + i * 4, 3, -8.4], { layer: 3 });
    bx(V, 18, .3, 1, '#b9a58a', [0, 2.6, -8.4], { layer: 2 });
    bx(V, 4.6, .15, 3, '#e8eef2', [3.2, 2.5, -2.8], { layer: 5 });
    var dots = V.add({ dots: [], color: '#f4f4f4', r: .17, layer: 7 });
    S.pills = function (n, col) { var a = []; for (var k = 0; k < Math.min(36, n || 0); k++) a.push({ p: [1.6 + (k % 9) * .55, 2.7, -3.7 + Math.floor(k / 9) * .55], c: col || '#f4f4f4' }); dots.dots = a; V.ping(); };
    S.refresh = function (doc) { S.showDoc(doc, 300); };
    if (R.rxDoc) S.showDoc(R.rxDoc, 300);
    return S;
  };
  SC.label = function (V, R) {
    var S = counterBase(V, 'label', '🏷️ লেবেল ও কাউন্সেলিং', { staff: '#53b88b', staffName: 'আপনি (ফার্মাসিস্ট)', sc: '#16754d' });
    var bag = bx(V, 2.6, 3.0, .8, '#f2f0ea', [3.4, 2.5, -2.8], { layer: 5 }), stk = bx(V, 1.6, 1.1, .06, '#d94b4b', [3.4, 3.4, -2.35], { layer: 6 });
    S.setColor = function (c) { V.set(stk, { color: c }); }; S.refresh = function (doc) { S.showDoc(doc, 220); };
    S.caption('🏷️ লেবেল', ['রোগীর নাম, ওষুধ, মাত্রা, কত দিন', 'ওষুধ ধরে ধরে নির্দেশ বোঝান', 'বুঝেছেন কিনা ফিরিয়ে বলতে বলুন (teach-back)'], 2200);
    return S;
  };

  /* ---------- টোকেনের অপেক্ষা-হল ---------- */
  SC.wait = function (V, R) {
    K.sceneReset({ yaw: .12, pitch: .55, dist: 26, target: [0, 2, -1] }); C.ground(V, '#dfe6ea', 46, 28);
    var S = C.newScene(V, 'wait'), dn = F.DOCTORS[R.v.dept || 'opd101'], mine = R.v.tokenNo || 14, cur = mine - 5;
    bx(V, 40, 8, .5, '#e8eef2', [0, 0, -9], { layer: 2, shade: .9 }); bx(V, 3.4, 5, .3, '#7a8fb3', [11, 0, -8.6], { layer: 3 }); V.labelFor(bx(V, 1, .1, .1, '#10243E', [11, 5.2, -8.4], { layer: 4 }), dn.n, { off: [0, .6, 0], color: '#10243E' });
    bx(V, 10, 3.4, .3, '#0b1c26', [-2, 4.2, -8.6], { layer: 3, glow: .2 });
    var seated = [], me = null;
    for (var r = 0; r < 3; r++) for (var c = 0; c < 6; c++) {
      var x = -8 + c * 3.2, z = -3 + r * 3.6; C.chair(V, x, z, -1);
      if (r === 2 && c === 3) { me = pers(V, '#4aa3ff', [x, 0, z], { sit: true, rot: [0, PI, 0] }); C.tag(V, me.g, 'আপনি', '#0b6e5b', 3.2); }
      else if ((r * 6 + c) % 5 !== 0 && seated.length < 6) seated.push(pers(V, ['#8fa3b8', '#b79c8a', '#a3b88f', '#b88fa6', '#8fb8b2', '#b8ad8f'][seated.length], [x, 0, z], { sit: true, rot: [0, PI, 0] }));
    }
    var state = { cur: cur, flash: 0, called: false };
    S.hud.push(function (ctx, W, H) {
      var a = V.project([-6.6, 2.6, -8.4]), b = V.project([2.6, 5.9, -8.4]); if (!a || !b) return;
      var x = Math.min(a[0], b[0]), y = Math.min(a[1], b[1]), w = Math.abs(b[0] - a[0]), h = Math.abs(b[1] - a[1]), fs = Math.max(9, Math.min(22, h / 4.2));
      ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = '#9fb7c4'; ctx.font = C.font(fs * .62, 600); ctx.fillText('এখন ডাকা হচ্ছে', x + w / 2, y + h * .22);
      ctx.fillStyle = state.called && Math.floor(performance.now() / 300) % 2 ? '#ffd24a' : '#38f5b4'; ctx.font = C.font(fs * 1.55, 800); ctx.fillText(dn.letter + '-' + bn(('0' + state.cur).slice(-2)), x + w / 2, y + h * .58);
      ctx.fillStyle = '#eaf6fa'; ctx.font = C.font(fs * .62, 600); ctx.fillText('আপনার: ' + dn.letter + '-' + bn(mine) + ' · সামনে ' + bn(Math.max(0, mine - state.cur)) + ' জন', x + w / 2, y + h * .88); ctx.restore();
    });
    S.caption('🎫 অপেক্ষা', ['ডিসপ্লেতে বর্তমান টোকেন; প্রতি রোগী গড় ৮ মিনিট', 'আপনার সামনে ' + bn(mine - cur) + ' জন ⇒ আনুমানিক ' + bn((mine - cur) * 8) + ' মিনিট', 'নিজের নম্বরের দিকে নজর রাখুন'], 2300);
    var k = 0;
    function next() {
      if (state.cur >= mine) return;
      state.cur++; var q = seated[k++]; if (q) V.tw(q.g, { pos: [11, 0, -6] }, 1300).then(function () { q.g.vis = false; });
      if (state.cur === mine) { state.called = true; V.tw(me.g, { pos: [11, 0, -6] }, 1500).then(function () { me.g.vis = false; }); } else K.later(next, 1700);
    }
    K.later(next, 1500);
    return S;
  };

  /* ---------- ডাক্তারের রুম: নার্সের পরীক্ষা, কথা, পরীক্ষা ---------- */
  function docRoom(V, R, mode) {
    var exam = mode === 'exam', c = R.v.case, dn = F.DOCTORS[R.v.dept || 'opd101'];
    K.sceneReset(exam ? { yaw: .6, pitch: .65, dist: 19, target: [-5, 1.8, -1] } : { yaw: .25, pitch: .6, dist: 20, target: [0, 1.8, -1] }); C.ground(V, '#e3e9ec', 44, 26);
    var S = C.newScene(V, 'consult'); bx(V, 40, 8, .5, '#eef2f5', [0, 0, -9], { layer: 2, shade: .9 });
    bx(V, 6, 1.8, 2.6, '#9c7b5b', [0, 0, -2.4]); bx(V, 1.5, 1.1, .12, '#1e2c38', [-1.2, 2.2, -2.9], { layer: 5 }); bx(V, 1.4, .06, 1.8, '#fbfbf6', [1.4, 1.85, -2.2], { layer: 5 });
    var dr = pers(V, '#f4f6f8', [0, 0, -5], { sit: true }); C.tag(V, dr.g, dn.n); bx(V, 1.4, .8, 1.4, '#34495e', [0, 0, -5.9]);
    bx(V, 4, .55, 7.6, '#d4dde3', [-9, 1.1, -3.5]); bx(V, 3.6, .2, 7.2, '#eef3f6', [-9, 1.65, -3.5], { layer: 4 }); var cur = bx(V, .2, 4.5, 6, '#cfe5f1', [-6.6, 0, -3.5], { alpha: .35, layer: 6 });
    bx(V, 1.2, 1.6, 1.2, '#8a95a0', [7, 0, -1]); bx(V, 1.0, .9, .1, '#0b1c26', [7, 1.8, -.4], { layer: 5 });
    var pat;
    if (exam) { pat = V.add({ kind: 'group', pos: [-9, 1.9, -3.5] }); V.add({ mesh: M.capsule(4.4, .75, 12), color: '#4aa3ff', pos: [0, 0, .3], rot: [0, PI / 2, 0], layer: 5 }, pat); sp(V, .6, '#e6b392', [0, .05, -2.3], { layer: 5, parent: pat }); var doc = pers(V, '#f4f6f8', [-6.4, 0, -3.5], { rot: [0, -PI / 2, 0] }); C.tag(V, doc.g, 'পরীক্ষা চলছে'); cy(V, .05, .05, 1.6, '#34495e', [-7.4, 2.4, -2.6], { rot: [PI / 2, 0, 0], seg: 6, layer: 6 }); }
    else { C.chair(V, 0, 1.2, -1, '#3b6ea5'); pat = pers(V, '#4aa3ff', [0, 0, 1.2], { sit: true, rot: [0, PI, 0] }); C.tag(V, pat.g, c.n, '#0b6e5b', 3.2); }
    if (mode === 'vitals') { var nu = pers(V, '#ee8fb3', [2.6, 0, 1.0], { cap: '#fff', rot: [0, -PI / 2, 0] }); C.tag(V, nu.g, 'নার্স'); }
    S.who = { doc: [0, 3.5, -5], pat: exam ? [-9, 4, -3.5] : [0, 3.6, 1.2] };
    S.speak = function (who, text) { S.bubble = text ? { at: S.who[who], text: text, who: who } : null; };
    C.infoHud(S, function () { return [['টোকেন', dn.letter + '-' + bn(R.v.tokenNo || 14)], ['রোগী', c.n.split(' ')[0] + ' (' + bn(c.age) + ')']]; }, { left: true, bottom: true, w: 170 });
    return S;
  }
  SC.consult = function (V, R) {
    var mode = R.step.mode || 'talk', S = docRoom(V, R, mode), c = R.v.case, vt = c.vit;
    if (mode === 'vitals') {
      S.caption('🩺 নার্স', ['ওজন মাপা: ' + bn(c.kg) + ' কেজি', 'রক্তচাপ: ' + vt.bp + ' mmHg', 'নাড়ি: ' + bn(vt.pulse) + '/মিনিট', 'জ্বর: ' + vt.temp + ', SpO₂ ' + bn(vt.spo2) + '%'], 1800);
      var t0 = performance.now(); C.infoHud(S, function (now) { var n = Math.min(5, Math.floor((now - t0) / 1500) + 1), r = [['ওজন', bn(c.kg) + ' কেজি'], ['BP', vt.bp], ['নাড়ি', bn(vt.pulse)], ['জ্বর', vt.temp], ['SpO₂', bn(vt.spo2) + '%']]; return r.slice(0, n); }, { title: 'ভাইটাল', w: 150 });
    }
    return S;
  };
  SC.exam = function (V, R) {
    var S = docRoom(V, R, 'exam'), c = R.v.case, rows = c.exam.concat(['পরীক্ষা: ' + c.tests, 'রোগনির্ণয়: ' + c.dx]); S.caption('🔍 পরীক্ষা', rows, 2300); return S;
  };

  /* ---------- ডেস্ক-ক্লোজআপ: প্রেসক্রিপশন, ভর্তির স্লিপ, ডিসচার্জ সামারি ---------- */
  function deskScene(V, R, doc, title, rows, step) {
    K.sceneReset({ yaw: .15, pitch: 1.0, dist: 15, target: [-2, 1.2, 0] }); C.ground(V, '#cdbba0');
    var S = C.newScene(V, 'desk'); bx(V, 14, .5, 9, '#9c7b5b', [0, 0, 0]); bx(V, 5.4, .06, 6.8, '#fbfbf6', [-2, .52, .2], { layer: 4 });
    for (var i = 0; i < 6; i++) bx(V, 3.8, .03, .1, '#b8c3cc', [-2, .6, -2.3 + i * .8], { layer: 5 });
    var pen = cy(V, .08, .08, 2.4, '#1d2b36', [-1, 1.3, 0], { rot: [0, 0, 1.2], layer: 6, seg: 6 }); V.hook(function (t) { pen.pos = [-3 + Math.sin(t / 380) * 1.4, 1.3, -1.8 + ((t / 500) % 4) * .9]; return false; });
    bx(V, 3, 2, 2.2, '#2d3f4f', [5, .5, -2.6], { layer: 4 }); bx(V, 2.6, 1.6, .1, '#0b1c26', [5, 1.1, -3.7], { layer: 5, glow: .15 });
    S.caption(title, rows, 2000); S.showDoc(doc, step || 380); return S;
  }
  SC.rx = function (V, R) { return deskScene(V, R, DOC.rx(R.rx), '✍️ প্রেসক্রিপশন', ['রোগীর তথ্য ও রোগনির্ণয়', 'অ্যালার্জি লিখে নেওয়া', 'ওষুধ: নাম, শক্তি, মাত্রা, কত দিন', 'উপদেশ, ফলো-আপ ও সই'], 650); };
  SC.adm_slip = function (V, R) { return deskScene(V, R, DOC.slip(), '📝 ভর্তির পরামর্শ', ['রোগনির্ণয় লেখা', 'কী চিকিৎসা, কত দিন', 'খরচের ধারণা', 'খালি পেটের নির্দেশ'], 420); };
  SC.dsum = function (V, R) { return deskScene(V, R, DOC.dsum(R), '🏠 ডিসচার্জ সামারি', ['কী রোগ, কী চিকিৎসা', 'বাড়ির ওষুধ ও খাবার', 'ফলো-আপ তারিখ', 'কোন লক্ষণে ফিরবেন'], 420); };

  /* ---------- ওয়ার্ড ও কেবিন ---------- */
  function wardBase(V, R, name) {
    var cabin = R.v.bed === 'cabin'; K.sceneReset({ yaw: .55, pitch: .68, dist: 22, target: [0, 1.6, 0] }); C.ground(V, cabin ? '#e8e2d6' : '#dfe9ea', 36, 26);
    var S = C.newScene(V, name); bx(V, 32, 8, .5, '#eef3f5', [0, 0, -9], { layer: 2, shade: .9 }); bx(V, .5, 8, 20, '#e8eef1', [-16, 0, 0], { layer: 2, shade: .9 });
    bx(V, 5, 3.4, .2, '#bfe0f2', [4, 3.2, -8.6], { layer: 4 });
    C.bed(V, 0, -3.2); S.pat = C.lying(V, [0, 1.6, -2.9], { rot: [0, 0, 0] }); S.pat.rot = [0, PI / 2 * 0, 0];
    var pole = cy(V, .1, .1, 7, '#8795a1', [2, 0, -3.5], { seg: 6 }); bx(V, .9, 1.3, .26, '#cfe5f1', [2, 5.8, -3.5], { alpha: .8, layer: 6 });
    var band = V.add({ mesh: M.torus(.35, .09, 12, 5), color: '#38f5b4', pos: [.9, 1.9, -1.8], rot: [0, 0, PI / 2], layer: 7, glow: .8 });
    if (cabin) { bx(V, 5, 1.3, 2, '#7f9bb5', [-8, 0, 0]); bx(V, 3, 2, .3, '#0b1c26', [-14, 3.6, 1], { layer: 4 }); bx(V, 2.4, 1.2, 1.6, '#c8b79b', [-9, 0, -7]); }
    else { C.bed(V, -7, -3.2); C.bed(V, 7, -3.2); lyingExtra(V, -7); lyingExtra(V, 7); bx(V, .2, 5, 6, '#c9e4d3', [-3.6, 0, -3.5], { alpha: .45, layer: 6 }); bx(V, .2, 5, 6, '#c9e4d3', [3.6, 0, -3.5], { alpha: .45, layer: 6 }); }
    var nr = pers(V, '#ee8fb3', [-2.6, 0, -1.2], { cap: '#fff', rot: [0, PI / 2, 0] }); C.tag(V, nr.g, 'নার্স');
    S.band = band; return S;
  }
  function lyingExtra(V, x) { C.lying(V, [x, 1.6, -2.9]); }
  SC.ward = function (V, R) {
    var S = wardBase(V, R, 'ward'), p = F.ADM_PT, bd = F.BEDS[R.v.bed || 'ward'];
    S.caption('🛏️ ' + bd.n, ['রিস্টব্যান্ড পরানো: নাম, আইডি, রক্তের গ্রুপ, অ্যালার্জি', 'ভাইটাল: BP ১২২/৭৮, নাড়ি ৮৪, জ্বর ৯৯.২°F', 'ক্যানুলা ও অপারেশনের আগের নির্দেশ: খালি পেট', 'কল-বেল ও ওয়ার্ডের নিয়ম বুঝিয়ে দেওয়া'], 2400);
    S.showDoc(DOC.band(R), 400); return S;
  };
  SC.rounds = function (V, R) {
    var S = wardBase(V, R, 'rounds'), lines = F.fixBill(F.billLines(R.v.bed || 'ward', null)), t0 = performance.now(), per = 950;
    var dr = pers(V, '#f4f6f8', [3, 0, 0.5], { rot: [0, -PI / 2, 0] }); C.tag(V, dr.g, 'ডাক্তারের রাউন্ড');
    V.hook(function (t) { dr.g.pos = [3 + Math.sin(t / 900) * 1.2, 0, .5]; return false; });
    var days = [['দিন ০ (ভর্তি)', 'রাতে সার্জারির প্রস্তুতি, খালি পেট, ক্যানুলা'], ['দিন ১', 'অপারেশন ➜ রিকভারি ➜ ওয়ার্ডে ফেরা; ব্যথানাশক ও অ্যান্টিবায়োটিক'], ['দিন ২', 'সকালের রাউন্ড, ড্রেসিং, হালকা খাবার, হাঁটা'], ['ছুটির সিদ্ধান্ত', 'ডাক্তার অর্ডার লিখছেন']];
    S.caption('📅 ভর্তির দিনগুলো', days.map(function (d) { return d[0] + ': ' + d[1]; }), 4200);
    S.hud.push(function (ctx, W, H, now) {
      var n = VL.reduce ? lines.length : Math.min(lines.length, Math.floor((now - t0) / per) + 1), w = Math.min(W < 520 ? W - 16 : 250, W - 16), rowH = 15, h = 38 + Math.min(n, 9) * rowH + 22, x = W - w - 8, y = H - h - 8, st = Math.max(0, n - 9), sum = 0, i;
      for (i = 0; i < n; i++) sum += lines[i].q * lines[i].r;
      ctx.save(); ctx.fillStyle = 'rgba(8,20,30,.88)'; ctx.strokeStyle = 'rgba(255,210,74,.55)'; C.rr(ctx, x, y, w, h, 9); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ffd24a'; ctx.font = C.font(11, 700); ctx.fillText('চলতি বিল (প্রভিশনাল)', x + 10, y + 16);
      ctx.font = C.font(11, 500); for (i = st; i < n; i++) { var l = lines[i], yy = y + 32 + (i - st) * rowH; ctx.fillStyle = '#cfe0ea'; ctx.textAlign = 'start'; ctx.fillText(l.n.length > 26 ? l.n.slice(0, 25) + '…' : l.n, x + 10, yy); ctx.textAlign = 'right'; ctx.fillText(tk(l.q * l.r), x + w - 10, yy); }
      ctx.textAlign = 'start'; ctx.fillStyle = '#38f5b4'; ctx.font = C.font(13, 800); ctx.fillText('মোট এখন পর্যন্ত: ' + tk(sum), x + 10, y + h - 8); ctx.restore();
    });
    return S;
  };

  /* ---------- ফার্মেসির শেলফ ---------- */
  SC.shelf = function (V, R) {
    K.sceneReset({ yaw: 0, pitch: .2, dist: 18, target: [0, 4.4, 0] }); C.ground(V, '#d5dbe0', 40, 30);
    var S = C.newScene(V, 'shelf'); bx(V, 30, 10, .4, '#eceff2', [0, 0, -2], { layer: 2, shade: .95 });
    bx(V, 24, .35, 2.2, '#b9a58a', [0, 1.2, -.8], { layer: 3 }); bx(V, 24, .35, 2.2, '#b9a58a', [0, 5.4, -.8], { layer: 3 });
    var boxes = R.shelf, objs = [], pos = [];
    boxes.forEach(function (b, i) {
      var p = F.PRODUCTS[b.p], row = i < 5 ? 0 : 1, x = -9 + (i % 5) * 4.5, y = row ? 5.75 : 1.55, o = bx(V, 3.3, 2.6, 1.5, p.c, [x, y, -.8], { layer: 4, pick: true, id: 'sb' + i });
      bx(V, 3.3, .35, 1.52, mixc(p.c, '#000000', .25), [x, y + 2.25, -.8], { layer: 5 }); objs.push(o); pos.push([x, y]);
    });
    var basket = bx(V, 5, .8, 2.6, '#8a95a0', [0, 0, 5], { layer: 3 }); V.labelFor(basket, '🧺 বাছা ওষুধ', { off: [0, 1.4, 0], color: '#10243E' });
    var me = pers(V, '#53b88b', [-8, 0, 6.5], { }); C.tag(V, me.g, 'আপনি (ফার্মাসিস্ট)');
    S.sel = -1; S.taken = {};
    S.hud.push(function (ctx, W, H) {
      var a = V.project([-9, 3, .01]), b = V.project([-4.5, 3, .01]); var bw = a && b ? Math.abs(b[0] - a[0]) : 100, fs = Math.max(8, Math.min(12, bw / 9));
      boxes.forEach(function (bo, i) {
        if (S.taken[i]) return; var p = F.PRODUCTS[bo.p], s = V.project([pos[i][0], pos[i][1] + 1.0, .1]); if (!s) return; var w = Math.min(bw * .74, 104), x = s[0] - w / 2, y = s[1] - fs * 1.9;
        ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.94)'; ctx.strokeStyle = S.sel === i ? '#e5596b' : 'rgba(0,0,0,.25)'; ctx.lineWidth = S.sel === i ? 2.5 : 1; C.rr(ctx, x, y, w, fs * 3.9, 4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#10243E'; ctx.textAlign = 'center'; ctx.font = C.font(fs, 700); var nm = p.g.split(' ')[0]; ctx.fillText(nm.length > 12 ? nm.slice(0, 11) + '…' : nm, s[0], y + fs * 1.15); ctx.font = C.font(fs * .88, 500); ctx.fillText(p.st.replace('মি.গ্রা.', 'mg'), s[0], y + fs * 2.3); ctx.fillStyle = '#4a5b68'; ctx.fillText('EXP ' + F.monthYear(bo.exp), s[0], y + fs * 3.45); ctx.restore();
      });
    });
    S.select = function (i) { S.sel = i; V.ping(); };
    S.take = function (i) { S.taken[i] = true; var o = objs[i]; return V.tw(o, { pos: [0, 1.4, 5], scale: .55 }, 800); };
    S.shake = function (i) { var o = objs[i], p = o.pos.slice(); V.tw(o, { pos: [p[0] + .3, p[1], p[2]] }, 80).then(function () { return V.tw(o, { pos: [p[0] - .3, p[1], p[2]] }, 110); }).then(function () { return V.tw(o, { pos: p }, 80); }); };
    S.caption('🗄️ শেলফ', ['প্রতিটি বাক্সের নাম, শক্তি ও মেয়াদ পড়ুন', 'একই নামের দুটি বাক্স থাকলে মেয়াদ দেখুন', 'বাক্সে ট্যাপ করে ঠিকটি নিন'], 2600);
    return S;
  };

  window.GEBFlowScenes = SC;
})();
