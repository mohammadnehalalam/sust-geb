/* GEB Hub: X-ray পড়া (v3.18)
   বুকের ও হাড়ের কৃত্রিম X-ray কোডে আঁকা (canvas), সিড দিয়ে স্থির। ধাপ: অস্বাভাবিকতা কোথায় (ছবিতে ট্যাপ) → কী রোগ → আপনার ভূমিকার কাজ।
   ছবি শেখার জন্য আদর্শায়িত, আসল রেডিওগ্রাফের মতো নয়। */
(function () {
  'use strict';
  var K = window.GEBHospKit, C = window.GEBCareer, I = window.GEBHospImg; if (!K || !C || !I) return;
  var esc = K.esc, bn = K.bn, $ = K.$, $$ = K.$$, S = C.S, shuffle = C.shuffle;
  var W = 400, H = 480;

  function lcg(seed) { var a = seed >>> 0 || 1; return function () { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; return a / 4294967296; }; }

  /* ---------- বুকের ছবি ---------- */
  function lungPath(x, side, o) {
    x.beginPath();
    if (side === 'R') {
      x.moveTo(.31 * W, .095 * H); x.bezierCurveTo(.22 * W, .10 * H, .13 * W, .20 * H, .115 * W, .36 * H); x.bezierCurveTo(.105 * W, .50 * H, .115 * W, .66 * H, .15 * W, .80 * H);
      x.bezierCurveTo(.21 * W, .735 * H, .36 * W, .675 * H, .44 * W, .775 * H); x.bezierCurveTo(.455 * W, .70 * H, .465 * W, .5 * H, .465 * W, .38 * H); x.lineTo(.465 * W, .12 * H);
    } else {
      x.moveTo(.69 * W, .095 * H); x.bezierCurveTo(.78 * W, .10 * H, .87 * W, .20 * H, .885 * W, .36 * H); x.bezierCurveTo(.895 * W, .50 * H, .885 * W, .66 * H, .85 * W, .80 * H);
      x.bezierCurveTo(.80 * W, .75 * H, .74 * W, .745 * H, o.apex * W, .80 * H); x.bezierCurveTo(o.apex * W + .02 * W, .66 * H, .64 * W, .56 * H, .56 * W, .46 * H); x.lineTo(.535 * W, .38 * H); x.lineTo(.535 * W, .12 * H);
    }
    x.closePath();
  }
  function poly(x, pts) { x.beginPath(); pts.forEach(function (p, i) { if (i) x.lineTo(p[0] * W, p[1] * H); else x.moveTo(p[0] * W, p[1] * H); }); x.closePath(); }
  function soft(x, fill, blur, fn) { x.save(); x.shadowColor = fill; x.shadowBlur = blur; x.fillStyle = fill; fn(); x.fill(); x.restore(); }

  function drawChest(cv, c, o) {
    var dpr = Math.min(2, window.devicePixelRatio || 1), x = cv.getContext('2d'), r = lcg(c.seed * 977), k = c.kind, big = k === 'ccf', apex = big ? .80 : .68, hr = big ? .33 : .405;
    cv.width = W * dpr; cv.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.fillStyle = '#030303'; x.fillRect(0, 0, W, H);
    /* শরীরের নরম টিস্যু */
    var g = x.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#1f1f1f'); g.addColorStop(.5, '#444'); g.addColorStop(1, '#1f1f1f'); x.fillStyle = g;
    x.beginPath(); x.moveTo(.43 * W, 0); x.lineTo(.57 * W, 0); x.bezierCurveTo(.60 * W, .05 * H, .80 * W, .05 * H, .96 * W, .10 * H); x.lineTo(.97 * W, H); x.lineTo(.03 * W, H); x.lineTo(.04 * W, .10 * H); x.bezierCurveTo(.20 * W, .05 * H, .40 * W, .05 * H, .43 * W, 0); x.fill();
    /* পেটের অংশ (ডায়াফ্রামের নিচে): লিভার ডানে, পাকস্থলীর বুদবুদ বামে */
    x.fillStyle = 'rgba(120,120,120,.35)'; x.fillRect(.08 * W, .72 * H, .84 * W, .28 * H);
    soft(x, 'rgba(150,150,150,.55)', 18, function () { x.beginPath(); x.ellipse(.30 * W, .88 * H, .20 * W, .12 * H, 0, 0, 7); });
    x.fillStyle = '#080808'; x.beginPath(); x.ellipse(.73 * W, .875 * H, .07 * W, .035 * H, -.2, 0, 7); x.fill();
    /* ফুসফুস */
    ['R', 'L'].forEach(function (s) { var lg = x.createLinearGradient(0, 0, 0, H); lg.addColorStop(0, '#0d0d0d'); lg.addColorStop(1, '#1b1b1b'); lungPath(x, s, { apex: apex }); x.fillStyle = lg; x.fill(); });
    /* রক্তনালির ছায়া */
    function vessels(side) {
      x.save(); lungPath(x, side, { apex: apex }); x.clip(); var hx = side === 'R' ? .40 : .60, hy = .44, dir = side === 'R' ? -1 : 1;
      for (var i = 0; i < 22; i++) { var a = (-1.9 + r() * 3.6) , len = (.12 + r() * .2), ex = hx + dir * Math.abs(Math.cos(a)) * len * (.9 + r() * .4), ey = hy + Math.sin(a) * len * 1.7, wd = 2.6 - len * 5;
        x.strokeStyle = 'rgba(210,210,210,' + (.10 + r() * .08) + ')'; x.lineWidth = Math.max(.8, wd); x.beginPath(); x.moveTo(hx * W, hy * H); x.quadraticCurveTo((hx + ex) / 2 * W + (r() - .5) * 14, (hy + ey) / 2 * H + (r() - .5) * 14, ex * W, ey * H); x.stroke(); }
      for (i = 0; i < 40; i++) { var px = (side === 'R' ? .13 + r() * .33 : .54 + r() * .34) * W, py = (.12 + r() * .62) * H; x.fillStyle = 'rgba(200,200,200,' + (.02 + r() * .03) + ')'; x.beginPath(); x.arc(px, py, 3 + r() * 9, 0, 7); x.fill(); }
      x.restore();
    }
    vessels('R'); vessels('L');
    if (big) { [[.40, .46], [.60, .46]].forEach(function (h) { var rg = x.createRadialGradient(h[0] * W, h[1] * H, 4, h[0] * W, h[1] * H, .2 * W); rg.addColorStop(0, 'rgba(235,235,235,.42)'); rg.addColorStop(1, 'rgba(235,235,235,0)'); x.save(); lungPath(x, h[0] < .5 ? 'R' : 'L', { apex: apex }); x.clip(); x.fillStyle = rg; x.fillRect(0, 0, W, H);
        x.strokeStyle = 'rgba(225,225,225,.26)'; x.lineWidth = 3; for (var i = 0; i < 5; i++) { x.beginPath(); x.moveTo(h[0] * W, h[1] * H); x.quadraticCurveTo((h[0] + (h[0] < .5 ? -.05 : .05) * (1 + i * .3)) * W, (.3 - i * .035) * H, (h[0] + (h[0] < .5 ? -.12 : .12) * (.6 + i * .12)) * W, (.14 + i * .015) * H); x.stroke(); }
        x.strokeStyle = 'rgba(235,235,235,.4)'; x.lineWidth = 1.2; for (i = 0; i < 6; i++) { var yy = (.62 + i * .025) * H, x0 = (h[0] < .5 ? .125 + i * .004 : .875 - i * .004) * W, dx = h[0] < .5 ? 20 : -20; x.beginPath(); x.moveTo(x0, yy); x.lineTo(x0 + dx, yy + 1); x.stroke(); } x.restore(); }); }
    /* হৃদয় ও মিডিয়াস্টিনাম */
    soft(x, 'rgba(170,170,170,.92)', 10, function () { x.beginPath(); x.moveTo(.47 * W, .50 * H); x.bezierCurveTo(hr * W + .02 * W, .50 * H, (hr - .03) * W, .66 * H, (hr + .045) * W, .775 * H); x.lineTo(apex * W, .80 * H); x.bezierCurveTo(apex * W + .015 * W, .68 * H, .62 * W, .54 * H, .54 * W, .47 * H); x.closePath(); });
    soft(x, 'rgba(155,155,155,.8)', 8, function () { x.beginPath(); x.moveTo(.455 * W, .08 * H); x.lineTo(.545 * W, .08 * H); x.lineTo(.56 * W, .40 * H); x.lineTo(.46 * W, .42 * H); x.closePath(); });
    soft(x, 'rgba(190,190,190,.85)', 6, function () { x.beginPath(); x.arc(.575 * W, .20 * H, .028 * W, 0, 7); });   /* মহাধমনীর নব */
    x.fillStyle = '#050505'; x.fillRect(.488 * W, .06 * H, .024 * W, .22 * H); x.beginPath(); x.moveTo(.488 * W, .28 * H); x.lineTo(.512 * W, .28 * H); x.lineTo(.53 * W, .33 * H); x.lineTo(.47 * W, .33 * H); x.fill();   /* শ্বাসনালি */
    x.fillStyle = 'rgba(210,210,210,.16)'; x.fillRect(.477 * W, .08 * H, .046 * W, .74 * H); for (var v = 0; v < 15; v++) { x.fillStyle = 'rgba(255,255,255,.06)'; x.fillRect(.475 * W, (.09 + v * .048) * H, .05 * W, 2); }   /* মেরুদণ্ড */
    /* ডায়াফ্রামের ধার (সূক্ষ্ম রেখা) */
    x.strokeStyle = 'rgba(210,210,210,.35)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(.15 * W, .80 * H); x.bezierCurveTo(.21 * W, .735 * H, .36 * W, .675 * H, .44 * W, .775 * H); x.moveTo(.85 * W, .80 * H); x.bezierCurveTo(.80 * W, .75 * H, .74 * W, .745 * H, apex * W, .80 * H); x.stroke();

    /* রোগ-চিহ্ন (ফুসফুসের ভেতরে) */
    var lungClip = function (side, fn) { x.save(); lungPath(x, side, { apex: apex }); x.clip(); fn(); x.restore(); };
    if (k === 'ptx') {
      var L = [[.215, .12], [.195, .28], [.19, .42], [.205, .58], [.25, .72], [.30, .77]];
      lungClip('R', function () { poly(x, L.concat([[.30, .86], [0, .86], [0, .06], [.28, .06]])); x.fillStyle = '#030303'; x.fill(); poly(x, L.concat([[.465, .8], [.465, .1]])); x.fillStyle = 'rgba(255,255,255,.10)'; x.fill(); });
      x.strokeStyle = 'rgba(235,235,235,.75)'; x.lineWidth = 1.7; x.beginPath(); L.forEach(function (p, i) { if (i) x.lineTo(p[0] * W, p[1] * H); else x.moveTo(p[0] * W, p[1] * H); }); x.stroke();
    }
    if (k === 'pneu') {
      lungClip('R', function () { var bl = [[.27, .66, .12], [.33, .62, .09], [.22, .70, .08], [.30, .72, .09], [.26, .58, .07]]; bl.forEach(function (b) { var rg = x.createRadialGradient(b[0] * W, b[1] * H, 2, b[0] * W, b[1] * H, b[2] * W); rg.addColorStop(0, 'rgba(235,235,235,.80)'); rg.addColorStop(.7, 'rgba(225,225,225,.55)'); rg.addColorStop(1, 'rgba(220,220,220,0)'); x.fillStyle = rg; x.fillRect(0, 0, W, H); });
        x.strokeStyle = 'rgba(10,10,10,.65)'; x.lineWidth = 2.2; [[.36, .60, .30, .66], [.30, .66, .25, .70], [.30, .66, .30, .73], [.33, .62, .29, .60]].forEach(function (l) { x.beginPath(); x.moveTo(l[0] * W, l[1] * H); x.lineTo(l[2] * W, l[3] * H); x.stroke(); }); });
    }
    if (k === 'eff') {
      lungClip('R', function () { var rg = x.createLinearGradient(0, .55 * H, 0, .8 * H); rg.addColorStop(0, 'rgba(225,225,225,.55)'); rg.addColorStop(1, 'rgba(240,240,240,.88)'); x.fillStyle = rg; x.beginPath(); x.moveTo(.09 * W, .53 * H); x.quadraticCurveTo(.19 * W, .70 * H, .40 * W, .70 * H); x.lineTo(.47 * W, .70 * H); x.lineTo(.47 * W, .86 * H); x.lineTo(.09 * W, .86 * H); x.closePath(); x.fill(); });
    }
    if (k === 'ccf') {
      [['R', .12, .56], ['L', .88, .56]].forEach(function (s) { lungClip(s[0], function () { x.fillStyle = 'rgba(230,230,230,.5)'; x.beginPath(); x.moveTo(s[1] * W, .70 * H); x.quadraticCurveTo((s[1] + (s[1] < .5 ? .05 : -.05)) * W, .66 * H, (s[1] + (s[1] < .5 ? .1 : -.1)) * W, .74 * H); x.lineTo(s[1] * W, .84 * H); x.fill(); }); });
    }
    if (k === 'air') {
      x.fillStyle = '#050505'; x.beginPath(); x.moveTo(.15 * W, .80 * H); x.bezierCurveTo(.21 * W, .735 * H, .36 * W, .675 * H, .44 * W, .775 * H); x.lineTo(.44 * W, .80 * H); x.bezierCurveTo(.36 * W, .715 * H, .21 * W, .765 * H, .15 * W, .84 * H); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(235,235,235,.7)'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(.15 * W, .80 * H); x.bezierCurveTo(.21 * W, .735 * H, .36 * W, .675 * H, .44 * W, .775 * H); x.stroke();
    }

    /* পাঁজর ও কলারবোন (যোগ হয়ে উজ্জ্বল) */
    x.save(); x.globalCompositeOperation = 'lighter'; x.lineCap = 'round';
    for (var i = 0; i < 10; i++) { var y0 = .13 + i * .062; [[1, -1], [0, 1]].forEach(function (sd) { var s = sd[1]; x.strokeStyle = 'rgba(255,255,255,.10)'; x.lineWidth = 7; x.beginPath(); x.moveTo(.5 * W + s * .03 * W, y0 * H); x.bezierCurveTo(.5 * W + s * .12 * W, (y0 - .03) * H, .5 * W + s * .27 * W, (y0 - .01) * H, .5 * W + s * .37 * W, (y0 + .12) * H); x.stroke();
        x.strokeStyle = 'rgba(255,255,255,.05)'; x.lineWidth = 5; x.beginPath(); x.moveTo(.5 * W + s * .38 * W, (y0 + .02) * H); x.bezierCurveTo(.5 * W + s * .28 * W, (y0 + .08) * H, .5 * W + s * .17 * W, (y0 + .14) * H, .5 * W + s * .05 * W, (y0 + .19) * H); x.stroke(); }); }
    x.strokeStyle = 'rgba(255,255,255,.34)'; x.lineWidth = 8; [-1, 1].forEach(function (s) { x.beginPath(); x.moveTo(.5 * W + s * .03 * W, .12 * H); x.bezierCurveTo(.5 * W + s * .15 * W, .10 * H, .5 * W + s * .28 * W, .11 * H, .5 * W + s * .38 * W, .15 * H); x.stroke(); });
    x.restore();
    /* দানা ও চিহ্ন */
    for (i = 0; i < 2600; i++) { x.fillStyle = r() < .5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.06)'; x.fillRect(r() * W, r() * H, 1.4, 1.4); }
    x.fillStyle = '#e8e8e8'; x.font = '700 22px system-ui,sans-serif'; x.fillText('R', .07 * W, .09 * H); x.font = '12px system-ui,sans-serif'; x.fillStyle = '#9a9a9a'; x.fillText(c.view, .06 * W, .975 * H);
  }

  /* ---------- হাড়ের ছবি (বাহু) ---------- */
  function drawBone(cv, c) {
    var dpr = Math.min(2, window.devicePixelRatio || 1), x = cv.getContext('2d'), r = lcg(c.seed * 131);
    cv.width = W * dpr; cv.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); x.fillStyle = '#030303'; x.fillRect(0, 0, W, H);
    var sg = x.createLinearGradient(.25 * W, 0, .75 * W, 0); sg.addColorStop(0, 'rgba(60,60,60,0)'); sg.addColorStop(.2, 'rgba(70,70,70,.9)'); sg.addColorStop(.8, 'rgba(70,70,70,.9)'); sg.addColorStop(1, 'rgba(60,60,60,0)');
    x.fillStyle = sg; x.beginPath(); x.moveTo(.30 * W, 0); x.lineTo(.70 * W, 0); x.bezierCurveTo(.78 * W, .45 * H, .78 * W, .55 * H, .70 * W, H); x.lineTo(.30 * W, H); x.bezierCurveTo(.22 * W, .55 * H, .22 * W, .45 * H, .30 * W, 0); x.fill();   /* ফোলা নরম টিস্যু */
    function bone(pts, alpha) { poly(x, pts); x.fillStyle = 'rgba(235,235,235,' + alpha + ')'; x.fill(); x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = 2.2; x.stroke(); }
    function marrow(pts) { poly(x, pts); x.fillStyle = 'rgba(70,70,70,.7)'; x.fill(); }
    x.fillStyle = 'rgba(235,235,235,.85)'; x.beginPath(); x.arc(.42 * W, .08 * H, .085 * W, 0, 7); x.fill(); x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 2; x.stroke();   /* কাঁধের মাথা */
    var u = [[.44, .12], [.54, .12], [.55, .46], [.43, .48]], d = [[.47, .47], [.60, .51], [.60, .86], [.49, .86]];
    bone(u, .78); marrow([[.465, .13], [.525, .13], [.53, .45], [.455, .47]]);
    bone(d, .78); marrow([[.505, .52], [.575, .54], [.575, .85], [.505, .85]]);
    x.strokeStyle = '#020202'; x.lineWidth = 2.2; x.beginPath(); x.moveTo(.43 * W, .48 * H); x.lineTo(.55 * W, .46 * H); x.moveTo(.48 * W, .50 * H); x.lineTo(.60 * W, .53 * H); x.stroke();   /* ভাঙার রেখা */
    x.fillStyle = 'rgba(240,240,240,.85)'; x.beginPath(); x.moveTo(.47 * W, .86 * H); x.lineTo(.64 * W, .86 * H); x.bezierCurveTo(.68 * W, .93 * H, .60 * W, .97 * H, .52 * W, .97 * H); x.bezierCurveTo(.47 * W, .95 * H, .46 * W, .90 * H, .47 * W, .86 * H); x.fill();
    for (var i = 0; i < 2400; i++) { x.fillStyle = r() < .5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.06)'; x.fillRect(r() * W, r() * H, 1.4, 1.4); }
    x.fillStyle = '#e8e8e8'; x.font = '700 22px system-ui,sans-serif'; x.fillText('L', .07 * W, .09 * H); x.font = '12px system-ui,sans-serif'; x.fillStyle = '#9a9a9a'; x.fillText(c.view, .06 * W, .975 * H);
  }

  /* ---------- মাথার CT (axial): ছবির বাঁ দিক = রোগীর ডান দিক ---------- */
  function drawCT(cv, c) {
    var dpr = Math.min(2, window.devicePixelRatio || 1), x = cv.getContext('2d'), r = lcg(c.seed * 313);
    cv.width = W * dpr; cv.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); x.fillStyle = '#020202'; x.fillRect(0, 0, W, H);
    var cx = .5 * W, cy = .50 * H, rx = .38 * W, ry = .42 * H;
    x.fillStyle = '#3a3a3a'; x.beginPath(); x.ellipse(cx, cy, rx + 14, ry + 14, 0, 0, 7); x.fill();                               /* মাথার ত্বক */
    x.strokeStyle = '#f4f4f4'; x.lineWidth = 11; x.beginPath(); x.ellipse(cx, cy, rx + 4, ry + 4, 0, 0, 7); x.stroke();            /* খুলি */
    var g = x.createRadialGradient(cx, cy, 20, cx, cy, ry); g.addColorStop(0, '#8a8a8a'); g.addColorStop(1, '#6e6e6e'); x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy, rx - 4, ry - 4, 0, 0, 7); x.fill();   /* মস্তিষ্ক */
    x.save(); x.beginPath(); x.ellipse(cx, cy, rx - 4, ry - 4, 0, 0, 7); x.clip();
    for (var i = 0; i < 38; i++) { var a = r() * 6.28, d = .6 + r() * .38; x.strokeStyle = 'rgba(40,40,40,' + (.12 + r() * .12) + ')'; x.lineWidth = 1.6; x.beginPath(); x.arc(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, 6 + r() * 14, a, a + 1.2); x.stroke(); }   /* সালকাস */
    x.strokeStyle = 'rgba(150,150,150,.4)'; x.lineWidth = 2; x.beginPath(); x.moveTo(cx, cy - ry); x.lineTo(cx, cy + ry); x.stroke();                      /* মধ্যরেখা (ফ্যালক্স) */
    var vent = function (sx, sc) { x.fillStyle = '#262626'; x.beginPath(); x.moveTo(cx + sx * .02 * W, cy - .12 * H); x.bezierCurveTo(cx + sx * .12 * W * sc, cy - .15 * H, cx + sx * .13 * W * sc, cy + .02 * H, cx + sx * .07 * W * sc, cy + .1 * H); x.bezierCurveTo(cx + sx * .06 * W, cy + .04 * H, cx + sx * .03 * W, cy - .02 * H, cx + sx * .02 * W, cy - .12 * H); x.fill(); };
    var cl = c.kind === 'ctbl' ? .55 : 1; vent(-1, cl); vent(1, 1);                                                                                         /* ভেন্ট্রিকল */
    if (c.kind === 'ctbl') {
      var bx = .38 * W, by = .46 * H, hg = x.createRadialGradient(bx, by, 4, bx, by, .13 * W); hg.addColorStop(0, 'rgba(15,15,15,0)'); hg.addColorStop(.55, 'rgba(15,15,15,.45)'); hg.addColorStop(1, 'rgba(15,15,15,0)'); x.fillStyle = hg; x.beginPath(); x.arc(bx, by, .13 * W, 0, 7); x.fill();   /* চারপাশে এডিমা */
      x.fillStyle = '#f7f7f7'; x.beginPath(); x.moveTo(bx - 22, by - 6); x.bezierCurveTo(bx - 20, by - 26, bx + 10, by - 28, bx + 20, by - 8); x.bezierCurveTo(bx + 26, by + 14, bx + 4, by + 28, bx - 14, by + 20); x.bezierCurveTo(bx - 28, by + 12, bx - 24, by + 2, bx - 22, by - 6); x.fill();
    }
    if (c.kind === 'ctin') {
      var wg = x.createLinearGradient(.15 * W, 0, .36 * W, 0); wg.addColorStop(0, 'rgba(15,15,15,.42)'); wg.addColorStop(1, 'rgba(15,15,15,.22)'); x.fillStyle = wg; x.beginPath(); x.moveTo(.13 * W, .30 * H); x.lineTo(.17 * W, .70 * H); x.bezierCurveTo(.26 * W, .62 * H, .34 * W, .55 * H, .37 * W, .49 * H); x.bezierCurveTo(.30 * W, .42 * H, .24 * W, .35 * H, .13 * W, .30 * H); x.fill();
    }
    x.restore();
    for (i = 0; i < 2200; i++) { x.fillStyle = r() < .5 ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.07)'; x.fillRect(r() * W, r() * H, 1.5, 1.5); }
    x.fillStyle = '#e8e8e8'; x.font = '700 22px system-ui,sans-serif'; x.fillText('R', .06 * W, .09 * H); x.font = '12px system-ui,sans-serif'; x.fillStyle = '#9a9a9a'; x.fillText(c.view, .05 * W, .975 * H);
  }

  /* ---------- আল্ট্রাসাউন্ড (ফ্যান-আকৃতি): পিত্তথলির পাথর ---------- */
  function drawUS(cv, c) {
    var dpr = Math.min(2, window.devicePixelRatio || 1), x = cv.getContext('2d'), r = lcg(c.seed * 211), ox = .5 * W, oy = .02 * H, R = .98 * H;
    cv.width = W * dpr; cv.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    function sector() { x.beginPath(); x.moveTo(ox, oy); x.arc(ox, oy, R, Math.PI / 2 - .62, Math.PI / 2 + .62); x.closePath(); }
    x.save(); sector(); x.clip();
    x.fillStyle = '#2a2a2a'; x.fillRect(0, 0, W, H);
    for (var i = 0; i < 9000; i++) { var px = r() * W, py = r() * H, br = 60 + r() * 90; x.fillStyle = 'rgba(' + br + ',' + br + ',' + br + ',' + (.10 + r() * .22) + ')'; x.fillRect(px, py, 2 + r() * 2.4, 1.6 + r() * 1.6); }   /* স্পেকল */
    var lg = x.createLinearGradient(0, 0, W * .35, 0); lg.addColorStop(0, 'rgba(120,120,120,.26)'); lg.addColorStop(1, 'rgba(120,120,120,0)'); x.fillStyle = lg; x.fillRect(0, 0, W, H);   /* লিভারের উজ্জ্বলতা */
    var gx = .42 * W, gy = .47 * H;
    x.fillStyle = '#030303'; x.beginPath(); x.ellipse(gx, gy, .15 * W, .1 * H, -.2, 0, 7); x.fill();                                           /* পিত্তথলি: তরল, কালো */
    x.strokeStyle = 'rgba(210,210,210,.55)'; x.lineWidth = 2; x.beginPath(); x.ellipse(gx, gy, .15 * W, .1 * H, -.2, 0, 7); x.stroke();
    var sg = x.createLinearGradient(0, gy, 0, H); sg.addColorStop(0, 'rgba(0,0,0,.92)'); sg.addColorStop(1, 'rgba(0,0,0,.7)'); x.fillStyle = sg; x.fillRect(gx - .05 * W, gy + .05 * H, .1 * W, H);   /* অ্যাকোস্টিক শ্যাডো */
    x.fillStyle = '#fafafa'; [[0, .07, 9, 5], [-9, .075, 7, 4], [10, .068, 6, 4]].forEach(function (s) { x.beginPath(); x.ellipse(gx + s[0] - 4, gy + s[1] * H, s[2], s[3], 0, 0, 7); x.fill(); });   /* পাথর */
    x.restore();
    x.strokeStyle = 'rgba(160,160,160,.35)'; x.lineWidth = 1; sector(); x.stroke();
    x.fillStyle = '#9a9a9a'; x.font = '12px system-ui,sans-serif'; for (i = 1; i < 6; i++) { x.fillRect(W - 18, i * .16 * H, 8, 1.5); x.fillText(String(i * 2), W - 30, i * .16 * H + 4); }
    x.fillText(c.view, 10, H - 10); x.fillStyle = '#e8e8e8'; x.font = '700 16px system-ui,sans-serif'; x.fillText('USG', 10, 22);
  }
  function draw(cv, c) { if (c.kind === 'fx') drawBone(cv, c); else if (c.kind === 'ctbl' || c.kind === 'ctin') drawCT(cv, c); else if (c.kind === 'usgall') drawUS(cv, c); else drawChest(cv, c); }


  /* ---------- UI ---------- */
  function list() {
    var body = $('#hpBody'); body.innerHTML = C.roleBar() + '<div class="hp-card hp-intro"><div><h3>🩻 ইমেজিং পড়া শিখুন</h3><p class="hp-mut">প্রতিটি কেসে ৩ ধাপ: ছবিতে অস্বাভাবিক জায়গায় ট্যাপ করুন → রোগ বাছুন → আপনার ভূমিকার (' + esc(C.roleInfo().n) + ') কাজ বাছুন। সমাধান: <b>' + bn(Object.keys(S.img.solved).length) + '/' + bn(I.CASES.length) + '</b></p></div></div>' +
      '<details class="hp-why"><summary>🔎 বুকের X-ray পড়ার ধাপ: ABCDE</summary>' + I.ABCDE.map(function (a) { return '<p><b>' + a.k + ' (' + a.n + '):</b> ' + esc(a.d) + '</p>'; }).join('') + '</details>' +
      '<details class="hp-why"><summary>🧰 কোন অবস্থায় কোন পরীক্ষা: X-ray, USG, CT, MRI</summary>' + I.MODS.map(function (a) { return '<p><b>' + esc(a.n) + ':</b> ' + esc(a.d) + '</p>'; }).join('') + '</details>' +
      '<details class="hp-why"><summary>✅ ছবির মান যাচাই: RIPE</summary>' + I.RIPE.map(function (a) { return '<p><b>' + a.k + ' (' + a.n + '):</b> ' + esc(a.d) + '</p>'; }).join('') + '<p class="hp-mut">বুকের PA ছবিতে রোগীর ডান দিক ছবির বাঁ দিকে থাকে।</p></details>' +
      '<div class="hp-grid"><button type="button" class="hp-case" data-c="mod"><div class="th">🎯</div><div class="bd"><b>কোন পরীক্ষা বাছবেন?</b><span>X-ray, USG, CT না MRI: ৬টি প্রশ্ন।</span><div class="ft">ভুল ছাড়া শেষ করলে ব্যাজ</div></div></button></div><div class="hp-grid">' + I.CASES.map(function (c) { var d = S.img.solved[c.id]; return '<button type="button" class="hp-case" data-c="' + c.id + '"><div class="th">' + c.ic + (d ? '<em>✔ সম্পন্ন</em>' : '') + '</div><div class="bd"><b>কেস ' + bn(I.CASES.indexOf(c) + 1) + '</b><span>' + esc(c.hx) + '</span><div class="ft">' + esc(c.view) + '</div></div></button>'; }).join('') + '</div>';
    C.bindRoleBar(body); body.onclick = function (e) { var b = e.target.closest('.hp-case'); if (b) { body.onclick = null; if (b.dataset.c === 'mod') modQuiz(); else run(I.byId(b.dataset.c)); } };
  }

  function run(c) {
    C.top();
    var body = $('#hpBody'), mistakes = 0, step = 1, wrong = 0, role = C.role(), RQ = c[role === 'doctor' ? 'plan' : role === 'nurse' ? 'nur' : 'tec'];
    body.innerHTML = C.roleBar() + '<button type="button" class="hp-back" id="imBack">← কেস তালিকা</button><div class="hp-run"><div><div class="im-wrap" id="imWrap"><canvas class="im-cv" id="imCv" role="img" aria-label="' + esc(c.view) + ' X-ray ছবি"></canvas><div class="im-ring" id="imRing" hidden></div></div><p class="hp-mut im-cap">' + esc(c.view) + ' · ছবি কৃত্রিম, শেখার জন্য</p></div>' +
      '<div class="hp-panel"><div class="hp-card"><h4>' + c.ic + ' রোগীর ইতিহাস</h4><p>' + esc(c.hx) + '</p></div><div class="hp-card" id="imStep"></div></div></div>';
    C.bindRoleBar(body); $('#imBack').onclick = list; draw($('#imCv'), c);
    var st = $('#imStep'), ring = $('#imRing');
    function showRing() { if (!c.hot) return; ring.hidden = false; ring.style.left = c.hot.x * 100 + '%'; ring.style.top = c.hot.y * 100 + '%'; ring.style.width = c.hot.r * 200 + '%'; }
    function s1() {
      st.innerHTML = '<h4>ধাপ ১: অস্বাভাবিকতা কোথায়?</h4><p class="hp-mut">ABCDE ধরে দেখুন। সন্দেহের জায়গায় ছবিতে ট্যাপ করুন; কিছু না থাকলে নিচের বোতাম।</p><div class="hp-nav"><button type="button" class="hp-btn" id="imNorm">✅ কোনো অস্বাভাবিকতা নেই</button></div><p class="hp-fb" id="imF1" role="status"></p>';
      var f = $('#imF1'), done = false;
      function ok() { done = true; showRing(); f.className = 'hp-fb good'; f.textContent = c.hot ? '✔ ঠিক জায়গা!' : '✔ ঠিক: ছবিটি স্বাভাবিক।'; C.ans('img', wrong === 0); if (wrong) mistakes++; setTimeout(s2, 500); }
      function bad(t) { wrong++; C.ans('img', false); f.className = 'hp-fb bad'; f.textContent = t + (wrong >= 2 && c.hot ? ' ইঙ্গিত দেখানো হলো।' : ''); if (wrong >= 2) showRing(); }
      $('#imNorm').onclick = function () { if (done) return; if (!c.hot) ok(); else bad('✘ এখানে অস্বাভাবিকতা আছে, আবার দেখুন।'); };
      $('#imWrap').onclick = function (e) {
        if (done) return; var rc = $('#imCv').getBoundingClientRect(), nx = (e.clientX - rc.left) / rc.width, ny = (e.clientY - rc.top) / rc.height;
        if (!c.hot) return bad('✘ এই ছবিটি স্বাভাবিক; কোনো সমস্যা নেই।');
        if (Math.sqrt(Math.pow(nx - c.hot.x, 2) + Math.pow((ny - c.hot.y) * (rc.height / rc.width), 2)) <= c.hot.r) ok(); else bad('✘ ওখানে নয়।');
      };
    }
    function s2() {
      st.innerHTML = '<h4>ধাপ ২: রোগ-নির্ণয়</h4><div id="imQ2"></div>';
      C.ask($('#imQ2'), { q: 'ছবি ও ইতিহাস মিলিয়ে সবচেয়ে সম্ভাব্য কী?', o: c.dx.o, a: c.dx.a, e: c.dx.e }, 'img', function (f) { if (!f) mistakes++; var nb = document.createElement('div'); nb.className = 'hp-nav'; nb.innerHTML = '<button type="button" class="hp-btn pri">পরবর্তী ▶</button>'; $('#imQ2').appendChild(nb); nb.firstChild.onclick = s3; });
    }
    function s3() {
      st.innerHTML = '<h4>ধাপ ৩: ' + C.roleInfo().ic + ' ' + esc(C.roleInfo().n) + '-এর কাজ</h4><div class="hp-why" open><b>ছবিতে যা দেখা যায়:</b><ul class="hf-take">' + c.find.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div><div id="imQ3"></div>';
      C.ask($('#imQ3'), RQ, 'img', function (f) { if (!f) mistakes++; var nb = document.createElement('div'); nb.className = 'hp-nav'; nb.innerHTML = '<button type="button" class="hp-btn pri">শেষ করুন ✔</button>'; $('#imQ3').appendChild(nb); nb.firstChild.onclick = fin; });
    }
    function fin() {
      var f = K.award('img_' + c.id, mistakes, 45); S.img.solved[c.id] = 1; var got = C.done(f.st), next = I.CASES[(I.CASES.indexOf(c) + 1) % I.CASES.length];
      st.innerHTML = '<div class="hp-res"><h3>🎉 কেস সমাধান</h3><div class="big">' + K.starHtml(f.st) + '</div><p>ভুল: <b>' + bn(mistakes) + '</b> · <b>+' + bn(f.xp) + ' XP</b>' + (f.first ? '' : ' (আবার করার জন্য কম XP)') + '</p>' + (got.length ? '<p class="hd-got">' + got.map(esc).join('<br>') + '</p>' : '') + '<div class="hp-nav"><button type="button" class="hp-btn" id="imAg">↻ আবার</button><button type="button" class="hp-btn pri" id="imNx">পরবর্তী কেস ▶</button><button type="button" class="hp-btn" id="imLs">তালিকা</button></div></div>';
      $('#imAg').onclick = function () { run(c); }; $('#imNx').onclick = function () { run(next); }; $('#imLs').onclick = list;
    }
    s1();
  }

  function modQuiz() {
    C.top();
    var body = $('#hpBody'), qs = shuffle(I.MODQ), i = 0, mistakes = 0;
    body.innerHTML = C.roleBar() + '<button type="button" class="hp-back" id="imBack">← কেস তালিকা</button><div class="hp-card"><h4>🎯 কোন পরীক্ষা বাছবেন?</h4><div id="imMq"></div></div>'; C.bindRoleBar(body); $('#imBack').onclick = list;
    function nextQ() {
      var el = $('#imMq'); if (i >= qs.length) return fin();
      el.innerHTML = '<div class="hp-steps">' + qs.map(function (x, k) { return '<i class="' + (k < i ? 'd' : '') + '"></i>'; }).join('') + '</div><p class="hp-sn">প্রশ্ন ' + bn(i + 1) + '/' + bn(qs.length) + '</p><div id="imMq1"></div>';
      C.ask($('#imMq1'), qs[i], 'img', function (f) { if (!f) mistakes++; var nb = document.createElement('div'); nb.className = 'hp-nav'; nb.innerHTML = '<button type="button" class="hp-btn pri">' + (i === qs.length - 1 ? 'ফল দেখুন' : 'পরবর্তী ▶') + '</button>'; $('#imMq1').appendChild(nb); nb.firstChild.onclick = function () { i++; nextQ(); }; });
    }
    function fin() {
      var f = K.award('img_mod', mistakes, 40); if (mistakes === 0) S.img.mod++; var got = C.done(f.st);
      $('#imMq').innerHTML = '<div class="hp-res"><h3>🎉 শেষ</h3><div class="big">' + K.starHtml(f.st) + '</div><p>ভুল: <b>' + bn(mistakes) + '</b> · <b>+' + bn(f.xp) + ' XP</b></p>' + (got.length ? '<p class="hd-got">' + got.map(esc).join('<br>') + '</p>' : '') + '<div class="hp-nav"><button type="button" class="hp-btn" id="imAg">↻ আবার</button><button type="button" class="hp-btn pri" id="imLs">তালিকা</button></div></div>';
      $('#imAg').onclick = modQuiz; $('#imLs').onclick = list;
    }
    nextQ();
  }

  K.addTab('img', '🩻 ইমেজিং (X-ray, CT, USG)', list);
  window.GEBImgUI = { draw: draw };
})();
