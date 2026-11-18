/* GEB Hub: রোগীর যাত্রা, মূল সহায়ক (v3.17)
   ৩D দৃশ্যের ওপরের স্তর (ক্যাপশন, কাগজ-রশিদ-প্রেসক্রিপশন আঁকা, মনিটর, কথার বাবল), ছোট ৩D বিল্ডার এবং
   টোকেন, ভর্তি-ফর্ম, বিল, প্রেসক্রিপশন, লেবেল ইত্যাদি কাগজের বিষয়বস্তু। hospital.js-এর কিট (GEBHospKit) ও ডেটা (GEBHospFlow) লাগে। */
(function () {
  'use strict';
  var K = window.GEBHospKit, F = window.GEBHospFlow, VL = window.VL3D;
  if (!K || !F || !VL) return;
  var M = K.M, PI = K.PI, bn = K.bn, tk = F.tk;
  var FONT = '"Hind Siliguri",system-ui,sans-serif';
  function font(px, w) { return (w || 600) + ' ' + px + 'px ' + FONT; }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
  function wrap(ctx, text, w) { return K.wrapText(ctx, text, Math.max(40, w)); }

  /* ---------- ছোট ৩D বিল্ডার ---------- */
  function bx(V, w, h, d, c, pos, o) {
    o = o || {};
    return V.add({ mesh: M.box(w, h, d), color: c, pos: pos || [0, 0, 0], rot: o.rot, layer: o.layer == null ? 3 : o.layer, alpha: o.alpha, glow: o.glow, shade: o.shade, pick: o.pick, id: o.id, two: o.two, bias: o.bias }, o.parent);
  }
  function cy(V, rt, rb, h, c, pos, o) {
    o = o || {};
    return V.add({ mesh: M.cyl(rt, rb, h, o.seg || 12), color: c, pos: pos || [0, 0, 0], rot: o.rot, layer: o.layer == null ? 3 : o.layer, alpha: o.alpha, glow: o.glow, shade: o.shade }, o.parent);
  }
  function sp(V, r, c, pos, o) {
    o = o || {};
    return V.add({ mesh: M.sphere(r, 10, 7), color: c, pos: pos || [0, 0, 0], layer: o.layer == null ? 3 : o.layer, alpha: o.alpha, glow: o.glow, shade: o.shade }, o.parent);
  }
  function ground(V, c, w, d) { return V.add({ mesh: M.box(w || 48, .4, d || 30), color: c || '#d9e2e7', pos: [0, -.4, 0], layer: 0, shade: .9 }); }
  function adopt(parent, p) { var g = p.g || p; if (g.parent && g.parent.kids) { var i = g.parent.kids.indexOf(g); if (i >= 0) g.parent.kids.splice(i, 1); } g.parent = parent; parent.kids.push(g); return p; }
  function bed(V, x, z, o) {
    o = o || {}; var g = V.add({ kind: 'group', pos: [x, 0, z], rot: o.rot });
    bx(V, 1.5, .5, 2.9, o.frame || '#d4dde3', [0, .4, 0], { parent: g });
    bx(V, 1.45, .22, 2.8, o.sheet || '#eef3f6', [0, .9, 0], { parent: g });
    bx(V, 1.2, .2, .7, '#b9d7ee', [0, 1.1, -1.0], { parent: g, layer: 4 });
    [[-.65, -1.3], [.65, -1.3], [-.65, 1.3], [.65, 1.3]].forEach(function (p) { cy(V, .08, .08, .45, '#8795a1', [p[0], 0, p[1]], { parent: g, seg: 6 }); });
    return g;
  }
  function chair(V, x, z, dir, col) {
    var g = V.add({ kind: 'group', pos: [x, 0, z], rot: [0, dir > 0 ? 0 : PI, 0] });
    bx(V, 1.3, .8, 1.3, col || '#3b6ea5', [0, 0, 0], { parent: g });
    bx(V, 1.3, 1.5, .22, col || '#3b6ea5', [0, 0, -.62], { parent: g });
    return g;
  }
  function lying(V, pos, o) {   // শোয়া রোগী: ধড় + মাথা + বালিশ। রোগী X বরাবর বা Z বরাবর
    o = o || {}; var g = V.add({ kind: 'group', pos: pos, rot: o.rot });
    V.add({ mesh: M.capsule(5.0, .8, 12), color: o.gown || '#7fb6d9', pos: [0, 0, 0.4], rot: [0, PI / 2, 0], layer: 4 }, g);
    sp(V, .62, o.skin || '#e6b392', [0, .05, -2.5], { layer: 4, parent: g });
    bx(V, 1.5, .28, 1.1, '#fbfbf6', [0, -.45, -2.55], { layer: 3, parent: g });
    return g;
  }
  function person(V, col, o) { o = o || {}; return K.person(V, col, o); }
  function tag(V, ob, text, color, dy) { V.labelFor(ob, text, { off: [0, dy == null ? 3.1 : dy, 0], color: color || '#0b6e5b' }); }

  /* ---------- ওভারলে: ক্যাপশন ---------- */
  function drawCap(ctx, cap, W, H, now) {
    var n = cap.rows.length, k = VL.reduce ? n - 1 : Math.min(n - 1, Math.floor((now - cap.t0) / cap.delay)), txt = cap.rows[k], w = Math.min(W - 70, 320), x = 8, y = 8;
    if (!txt) return;
    ctx.save(); ctx.font = font(13, 600); var ls = wrap(ctx, txt, w - 28), h = 34 + ls.length * 17;
    ctx.fillStyle = 'rgba(8,20,30,.82)'; ctx.strokeStyle = 'rgba(56,245,180,.55)'; ctx.lineWidth = 1; rr(ctx, x, y, w, h, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#38f5b4'; ctx.font = font(12, 700); ctx.fillText(cap.title + ' · ' + bn(k + 1) + '/' + bn(n), x + 12, y + 19);
    ctx.fillStyle = '#eaf6fa'; ctx.font = font(13, 600); ls.forEach(function (l, i) { ctx.fillText(l, x + 12, y + 38 + i * 17); });
    for (var q = 0; q < n; q++) { ctx.fillStyle = q <= k ? '#38f5b4' : 'rgba(255,255,255,.25)'; ctx.fillRect(x + w - 12 - (n - q) * 8, y + 12, 6, 6); }
    ctx.restore();
  }

  /* ---------- ওভারলে: কাগজ (প্রেসক্রিপশন, রশিদ, বিল ...) ---------- */
  function layout(ctx, doc, w) {
    if (doc._lw === w && doc._lay) return doc._lay;
    var rows = [], inner = w - 24;
    (doc.rows || []).forEach(function (r) {
      if (r.sep) { rows.push({ sep: true, h: 9 }); return; }
      ctx.font = font(12, r.b ? 700 : 500);
      var kw = r.k ? 76 : 0, aw = r.amt ? 70 : 0, ls = wrap(ctx, String(r.v == null ? '' : r.v), inner - kw - aw - (r.k ? 6 : 0));
      rows.push({ r: r, ls: ls, kw: kw, h: Math.max(17, (ls.length || 1) * 15 + 3) });
    });
    doc._lay = rows; doc._lw = w; return rows;
  }
  function drawDoc(ctx, d, W, H, now, narrow) {
    var doc = d.doc, w = Math.min(narrow ? W - 16 : 312, W - 16), x = narrow ? 8 : W - w - 10, y0 = 10;
    var lay = layout(ctx, doc, w), headH = 46, footH = doc.foot ? 26 : 0, step = d.step || 200;
    var shown = VL.reduce ? lay.length : Math.min(lay.length, Math.max(0, Math.floor((now - d.t0) / step) + 1));
    var avail = H - y0 * 2 - headH - footH - 12, start = 0, hsum = 0, i;
    for (i = shown - 1; i >= 0; i--) { if (hsum + lay[i].h > avail) { start = i + 1; break; } hsum += lay[i].h; }
    var ph = headH + hsum + footH + 18;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 5;
    ctx.fillStyle = doc.paper || '#fffdf6'; rr(ctx, x, y0, w, ph, 9); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = doc.accent || '#2f6fb0'; rr(ctx, x, y0, w, headH, 9); ctx.fill(); ctx.fillRect(x, y0 + headH - 9, w, 9);
    ctx.fillStyle = '#fff'; ctx.font = font(14, 700); ctx.fillText(doc.title || '', x + 12, y0 + 21);
    ctx.globalAlpha = .88; ctx.font = font(11, 500); ctx.fillText(doc.sub || '', x + 12, y0 + 37); ctx.globalAlpha = 1;
    var y = y0 + headH + 10;
    if (start > 0) { ctx.fillStyle = '#9aa7b2'; ctx.font = font(11, 700); ctx.fillText('⋮', x + w - 20, y - 1); }
    for (i = start; i < shown; i++) {
      var L = lay[i];
      if (L.sep) { ctx.strokeStyle = '#d9d2c0'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x + 12, y + 3); ctx.lineTo(x + w - 12, y + 3); ctx.stroke(); ctx.setLineDash([]); y += L.h; continue; }
      var r = L.r;
      if (r.bad) { ctx.fillStyle = 'rgba(217,75,75,.12)'; ctx.fillRect(x + 6, y - 2, w - 12, L.h); }
      if (r.k) { ctx.fillStyle = '#6b7b88'; ctx.font = font(11, 600); ctx.fillText(r.k, x + 12, y + 12); }
      ctx.fillStyle = r.c || '#142634'; ctx.font = font(12, r.b ? 700 : 500);
      L.ls.forEach(function (ln, li) { ctx.fillText(ln, x + 12 + L.kw + (r.k ? 6 : 0), y + 12 + li * 15); });
      if (r.amt) { ctx.textAlign = 'right'; ctx.font = font(12, 700); ctx.fillStyle = r.c || '#142634'; ctx.fillText(r.amt, x + w - 12, y + 12); ctx.textAlign = 'start'; }
      y += L.h;
    }
    if (doc.barcode && shown >= lay.length) { for (var b = 0; b < 34; b++) { ctx.fillStyle = '#142634'; ctx.fillRect(x + 14 + b * 5.2, y + 2, (b * 7 % 3) + 1, 18); } y += 22; }
    if (doc.foot) { ctx.fillStyle = '#6b7b88'; ctx.font = font(11, 500); ctx.fillText(doc.foot, x + 12, y0 + ph - 12); }
    if (doc.stamp && shown >= lay.length) {
      ctx.save(); ctx.translate(x + w - 76, y0 + ph - 46); ctx.rotate(-.22); ctx.strokeStyle = doc.stampColor || '#1f9d63'; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 2.5;
      ctx.font = font(18, 800); var tw = ctx.measureText(doc.stamp).width + 18; rr(ctx, -tw / 2, -17, tw, 32, 6); ctx.stroke(); ctx.textAlign = 'center'; ctx.fillText(doc.stamp, 0, 6); ctx.restore();
    }
    ctx.restore();
  }

  /* ---------- ওভারলে: কথার বাবল ---------- */
  function drawBubble(ctx, V, b, W, H, now) {
    if (!b || !b.text) return; var p = V.project(b.at); if (!p) return;
    ctx.save(); ctx.font = font(13, 600); var maxw = Math.min(W * .56, 250), ls = wrap(ctx, b.text, maxw - 20), w = Math.min(maxw, Math.max.apply(null, ls.map(function (l) { return ctx.measureText(l).width; })) + 20), h = ls.length * 17 + 14;
    var x = Math.max(6, Math.min(W - w - 6, p[0] - w / 2)), y = Math.max(6, p[1] - h - 14);
    ctx.fillStyle = b.who === 'pat' ? '#e4f7ee' : '#ffffff'; ctx.strokeStyle = b.who === 'pat' ? '#2f9d63' : '#4f6fa8'; ctx.lineWidth = 1.5; rr(ctx, x, y, w, h, 10); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p[0] - 6, y + h); ctx.lineTo(p[0], y + h + 9); ctx.lineTo(p[0] + 6, y + h); ctx.closePath(); ctx.fillStyle = b.who === 'pat' ? '#e4f7ee' : '#ffffff'; ctx.fill();
    ctx.fillStyle = '#10243E'; ls.forEach(function (l, i) { ctx.fillText(l, x + 10, y + 17 + i * 17); }); ctx.restore();
  }

  /* ---------- ওভারলে: মনিটর (HR, BP, SpO₂ ও ECG) ---------- */
  function g2(x, m, s) { var d = (x - m) / s; return Math.exp(-d * d); }
  function ecgY(t, hr) {
    var T = 60 / Math.max(30, hr), u = ((t / 1000) % T) / T;
    return .1 * g2(u, .2, .05) - .12 * g2(u, .43, .012) + 1.0 * g2(u, .46, .012) - .22 * g2(u, .49, .014) + .25 * g2(u, .72, .07);
  }
  function monitorHud(S, vals, o) {
    o = o || {};
    S.hud.push(function (ctx, W, H, now) {
      var v = vals(), w = 142, h = 96, x = o.left ? 8 : W - w - 8, y = o.bottom ? H - h - 8 : 8;
      ctx.save(); ctx.fillStyle = 'rgba(4,12,18,.9)'; ctx.strokeStyle = 'rgba(56,245,180,.5)'; ctx.lineWidth = 1; rr(ctx, x, y, w, h, 8); ctx.fill(); ctx.stroke();
      ctx.font = font(11, 700); ctx.fillStyle = '#38f5b4'; ctx.fillText('HR', x + 8, y + 15); ctx.fillStyle = '#ffd24a'; ctx.fillText('BP', x + 56, y + 15); ctx.fillStyle = '#5fd7ff'; ctx.fillText('SpO₂', x + 104, y + 15);
      ctx.font = font(19, 800); ctx.fillStyle = '#38f5b4'; ctx.fillText(bn(Math.round(v.hr)), x + 8, y + 38);
      ctx.fillStyle = '#ffd24a'; ctx.font = font(16, 800); ctx.fillText(bn(Math.round(v.sys)) + '/' + bn(Math.round(v.dia)), x + 56, y + 37);
      ctx.fillStyle = '#5fd7ff'; ctx.font = font(19, 800); ctx.fillText(bn(Math.round(v.spo2)), x + 104, y + 38);
      ctx.strokeStyle = '#38f5b4'; ctx.lineWidth = 1.4; ctx.beginPath();
      for (var i = 0; i < w - 16; i += 2) { var yy = y + 78 - ecgY(now - (w - 16 - i) * 9, v.hr) * 22; if (i === 0) ctx.moveTo(x + 8 + i, yy); else ctx.lineTo(x + 8 + i, yy); }
      ctx.stroke(); ctx.restore();
    });
  }

  /* ---------- ওভারলে: ছোট তথ্য-কার্ড (ভাইটাল, রোগীর নাম ইত্যাদি) ---------- */
  function infoHud(S, getRows, o) {
    o = o || {};
    S.hud.push(function (ctx, W, H, now) {
      var rows = getRows(now); if (!rows || !rows.length) return;
      ctx.save(); ctx.font = font(12, 600); var w = o.w || 150, h = 22 + rows.length * 18, x = o.left ? 8 : W - w - 8, y = o.bottom ? H - h - 8 : (o.y || 8);
      ctx.fillStyle = 'rgba(8,20,30,.84)'; ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1; rr(ctx, x, y, w, h, 9); ctx.fill(); ctx.stroke();
      if (o.title) { ctx.fillStyle = '#38f5b4'; ctx.font = font(11, 700); ctx.fillText(o.title, x + 10, y + 15); }
      rows.forEach(function (r, i) { ctx.font = font(12, 500); ctx.fillStyle = '#9fb7c4'; ctx.fillText(r[0], x + 10, y + 35 + i * 18); ctx.fillStyle = r[2] || '#eaf6fa'; ctx.font = font(12, 700); ctx.textAlign = 'right'; ctx.fillText(r[1], x + w - 10, y + 35 + i * 18); ctx.textAlign = 'start'; });
      ctx.restore();
    });
  }

  /* ---------- দৃশ্যের ওভারলে-কাঠামো ---------- */
  function newScene(V, name) {
    var S = { V: V, name: name, cap: null, doc: null, hud: [], bubble: null };
    V.overlay = function (ctx, W, H, now) {
      var narrow = W < 520;
      if (S.cap && !(narrow && S.doc)) drawCap(ctx, S.cap, W, H, now);
      if (S.doc) drawDoc(ctx, S.doc, W, H, now, narrow);
      for (var i = 0; i < S.hud.length; i++) S.hud[i](ctx, W, H, now);
      if (S.bubble) drawBubble(ctx, V, S.bubble, W, H, now);
    };
    V.hook(function () { return false; });   /* হুক থাকলে ইঞ্জিন প্রতি ফ্রেমে আঁকে, তাই ক্যাপশন ও কাগজের অ্যানিমেশন চলে */
    S.caption = function (title, rows, delay) { S.cap = { title: title, rows: rows, t0: performance.now(), delay: delay || 1800 }; };
    S.showDoc = function (doc, step) { S.doc = doc ? { doc: doc, t0: performance.now(), step: step || 200 } : null; };
    return S;
  }

  /* ---------- কাগজের বিষয়বস্তু ---------- */
  var ACC = { blue: '#2f6fb0', red: '#b3131d', green: '#1f8a63', amber: '#b5791a', teal: '#2b8a8a' };
  var HOSP = 'GEB ভার্চুয়াল জেনারেল হাসপাতাল';
  function ageSex(p) { return bn(p.age) + ' বছর · ' + p.sex + (p.kg ? ' · ' + bn(p.kg) + ' কেজি' : ''); }

  var DOC = {
    token: function (R) {
      var c = R.v.case, d = F.DOCTORS[R.v.dept || 'opd101'], tkn = d.letter + '-' + bn(('0' + (R.v.tokenNo || 14)).slice(-2));
      return { title: 'OPD টিকিট ও টোকেন', sub: HOSP, accent: ACC.blue, rows: [{ k: 'রোগী', v: c.n + ' (' + bn(c.age) + ')' }, { k: 'বিভাগ', v: d.dept }, { k: 'ডাক্তার', v: d.n }, { k: 'ফি', v: tk(d.fee) + ' (পরিশোধিত)' }, { k: 'তারিখ', v: F.dateText() }, { sep: true }, { v: 'টোকেন: ' + tkn, b: true, c: ACC.red }, { v: 'সামনে ' + bn((R.v.tokenNo || 14) - 9 - 1) + ' জন · আনুমানিক অপেক্ষা ' + bn(((R.v.tokenNo || 14) - 10) * 8) + ' মিনিট', c: '#6b7b88' }], stamp: 'পরিশোধিত' };
    },
    erCard: function () {
      return { title: 'জরুরি বিভাগ: রোগী কার্ড', sub: HOSP, accent: ACC.red, rows: [{ k: 'নম্বর', v: 'ER-০৪২' }, { k: 'নাম', v: 'অজ্ঞাতনামা (পরিচয় পরে)' }, { k: 'এসেছে', v: 'অ্যাম্বুলেন্সে (৯৯৯)' }, { k: 'ট্রায়াজ', v: '🔴 লাল: এখনই', b: true, c: ACC.red }, { k: 'MLC', v: 'প্রযোজ্য (সড়ক দুর্ঘটনা)' }, { k: 'সঙ্গী', v: 'ফোন নম্বর নেওয়া হয়েছে' }, { sep: true }, { v: 'আগে স্থিতিশীল করা, বিল ও কাগজ পরে।', b: true }], foot: 'রক্তের গ্রুপ, অ্যালার্জি: সঙ্গীর কাছ থেকে জেনে লিখুন' };
    },
    slip: function () {
      var p = F.ADM_PT, d = F.DOCTORS.opd103;
      return { title: 'ভর্তির পরামর্শপত্র', sub: d.n + ' · ' + d.dept, accent: ACC.teal, rows: [{ k: 'রোগী', v: p.n + ' (' + bn(p.age) + ')' }, { k: 'রোগনির্ণয়', v: p.dx, b: true }, { k: 'পরামর্শ', v: 'ভর্তি ও ' + p.proc }, { k: 'থাকার সময়', v: 'আনুমানিক ' + bn(p.stayDays) + ' রাত' }, { k: 'বাকি পরীক্ষা', v: 'CBC, ECG, রক্তের গ্রুপ, HBsAg' }, { k: 'আনুমানিক খরচ', v: tk(40000) + ' – ' + tk(46000) + ' (বেড ভেদে)' }, { sep: true }, { v: 'অপারেশনের আগে ৮ ঘণ্টা খালি পেট।', c: ACC.red }], foot: 'সই: ' + d.n };
    },
    admForm: function (R) {
      var p = F.ADM_PT, bd = R.v.bed ? F.BEDS[R.v.bed] : null;
      return { title: 'ভর্তি ফর্ম', sub: HOSP, accent: ACC.blue, rows: [{ k: 'ভর্তি নম্বর', v: p.id }, { k: 'রোগী', v: p.n }, { k: 'বয়স/লিঙ্গ', v: bn(p.age) + ' · ' + p.sex }, { k: 'রক্তের গ্রুপ', v: p.blood }, { k: 'অ্যালার্জি', v: p.allergy }, { k: 'পরিচয়পত্র', v: 'NID ✔' }, { k: 'সঙ্গী', v: 'স্ত্রী (ফোন ০১৭**-******)' }, { k: 'রোগনির্ণয়', v: p.dx }, { k: 'বেড', v: bd ? bd.ic + ' ' + bd.n : '(বাছা হয়নি)', b: !!bd, c: bd ? ACC.green : '#6b7b88' }, { sep: true }, { v: 'সম্মতি: ভর্তি ✔ অপারেশন ✔ অজ্ঞান করা ✔' }], foot: 'রোগী/সঙ্গীর সই' };
    },
    band: function (R) {
      var p = F.ADM_PT, bd = F.BEDS[R.v.bed || 'ward'];
      return { title: 'রিস্টব্যান্ড', sub: 'রোগীর পরিচয়', accent: ACC.teal, barcode: true, rows: [{ k: 'নাম', v: p.n, b: true }, { k: 'ভর্তি নং', v: p.id }, { k: 'রক্তের গ্রুপ', v: p.blood, b: true, c: ACC.red }, { k: 'অ্যালার্জি', v: p.allergy }, { k: 'বেড', v: bd.n }] };
    },
    receipt: function (o) {
      var rows = (o.items || []).map(function (i) { return { v: i[0], amt: i[1] }; });
      rows.push({ sep: true }); rows.push({ v: o.totalLabel || 'মোট', amt: o.total, b: true });
      if (o.extra) o.extra.forEach(function (e) { rows.push({ v: e[0], amt: e[1], b: !!e[2], c: e[3] }); });
      rows.push({ k: 'পদ্ধতি', v: o.method || 'নগদ' }); rows.push({ k: 'তারিখ', v: F.dateText() }); rows.push({ k: 'ক্যাশিয়ার', v: 'রাফি ও কর্মী ০৩' });
      return { title: o.title || 'পেমেন্ট রশিদ', sub: (o.no ? 'রশিদ নং ' + o.no + ' · ' : '') + HOSP, accent: o.accent || ACC.green, rows: rows, stamp: o.stamp === false ? null : (o.stamp || 'পরিশোধিত') };
    },
    bill: function (lines, o) {
      o = o || {}; var rows = lines.map(function (l) { return { v: l.n + (l.u ? ' (' + bn(l.q) + ' ' + l.u + ' × ' + tk(l.r) + ')' : ''), amt: tk(l.q * l.r), bad: !!(o.mark && l.bad) }; });
      var tot = F.billTotal(lines); rows.push({ sep: true }); rows.push({ v: 'মোট বিল', amt: tk(tot), b: true });
      if (o.deposit != null) { rows.push({ v: 'অগ্রিম জমা', amt: '− ' + tk(o.deposit) }); var due = tot - o.deposit; rows.push({ v: due >= 0 ? 'বকেয়া' : 'ফেরত', amt: tk(Math.abs(due)), b: true, c: due >= 0 ? ACC.red : ACC.green }); }
      return { title: o.title || 'চূড়ান্ত বিল', sub: F.ADM_PT.n + ' · ' + F.ADM_PT.id, accent: ACC.amber, rows: rows, stamp: o.stamp || null };
    },
    dsum: function (R) {
      var p = F.ADM_PT, now = Date.now();
      return { title: 'ডিসচার্জ সামারি', sub: HOSP, accent: ACC.teal, rows: [{ k: 'রোগী', v: p.n + ' (' + bn(p.age) + ')' }, { k: 'ভর্তি', v: F.dateText(now - 2 * 864e5) }, { k: 'ছুটি', v: F.dateText(now) }, { k: 'রোগনির্ণয়', v: p.dx, b: true }, { k: 'চিকিৎসা', v: p.proc + ' (সফল), কোনো জটিলতা নেই' }, { k: 'ছুটির অবস্থা', v: 'ভালো, ক্ষত শুকনো, খেতে পারছেন' }, { sep: true }, { k: 'বাড়ির ওষুধ', v: 'ডিসচার্জ প্রেসক্রিপশন অনুযায়ী (ব্যথার ওষুধ ও ৫ দিনের অ্যান্টিবায়োটিক)' }, { k: 'খাবার', v: 'হালকা, নরম; ক্ষত শুকনো রাখুন' }, { k: 'ফলো-আপ', v: '৭ দিন পর সার্জারি OPD' }, { sep: true }, { v: 'জরুরি ফিরুন: জ্বর, ক্ষতে পুঁজ/ফোলা, তীব্র পেটব্যথা', c: ACC.red, b: true }], foot: 'সই: দায়িত্বপ্রাপ্ত ডাক্তার' };
    },
    rx: function (rx, o) {
      o = o || {}; var rows = [{ k: 'রোগী', v: rx.pt.n, b: true }, { k: 'বয়স/লিঙ্গ', v: ageSex(rx.pt) }, { k: 'তারিখ', v: F.dateText(rx.date) }, { k: 'রোগনির্ণয়', v: rx.dx }, { k: 'অ্যালার্জি', v: rx.allergy, c: rx.allergy === 'নেই' ? '#142634' : ACC.red, b: rx.allergy !== 'নেই' }, { sep: true }, { v: '℞', b: true, c: ACC.blue }];
      (o.lines || rx.lines).forEach(function (l, i) {
        var p = F.PRODUCTS[l.p], dose = l.pat ? F.patText(l.pat) + (l.days != null ? ' × ' + bn(l.days) + ' দিন' : ' × (দিন লেখা নেই)') : (l.show || ''), txt = bn(i + 1) + '. ' + p.g + ' ' + p.st + ' ' + p.form + ' — ' + dose + (l.when ? ' (' + l.when + ')' : '');
        rows.push({ v: txt, b: !!(l.bad), c: l.bad ? ACC.red : '#142634', bad: !!l.bad });
      });
      rows.push({ sep: true }); rows.push({ k: 'উপদেশ', v: (rx.advice || []).join('; ') }); rows.push({ k: 'ফলো-আপ', v: rx.fu });
      if (rx.dr) { rows.push({ sep: true }); if (o.nosig) rows.push({ v: '(ডাক্তারের সই নেই)', c: ACC.red, b: true }); else rows.push({ v: rx.dr.n + ' · ' + rx.dr.deg, b: true }); }
      return { title: HOSP, sub: rx.dr ? rx.dr.n + ' · ' + rx.dr.deg + ' · ' + rx.dr.reg : '', accent: ACC.blue, rows: rows, foot: 'প্রেসক্রিপশন (শেখার জন্য কাল্পনিক)' };
    },
    label: function (rx, l, qty) {
      var p = F.PRODUCTS[l.p], dose = l.pat ? F.patText(l.pat) : (l.show || '');
      return { title: 'ওষুধের লেবেল', sub: 'GEB হাসপাতাল ফার্মেসি', accent: p.c, rows: [{ k: 'রোগী', v: rx.pt.n, b: true }, { k: 'ওষুধ', v: p.g + ' ' + p.st, b: true }, { k: 'পরিমাণ', v: bn(qty) + ' ' + p.unit }, { k: 'মাত্রা', v: dose }, { k: 'কখন', v: l.when || '' }, { k: 'কত দিন', v: l.days != null ? bn(l.days) + ' দিন' : '—' }, { k: 'তারিখ', v: F.dateText() }], foot: 'সন্তানের নাগালের বাইরে রাখুন' };
    },
    pbill: function (rx, lines, paid) {
      var rows = lines.map(function (l) { var p = F.PRODUCTS[l.p], q = F.qtyOf(l); return { v: p.g + ' ' + p.st + ' × ' + bn(q), amt: tk(q * p.mrp) }; }), tot = F.rxTotal(lines);
      rows.push({ sep: true }); rows.push({ v: 'মোট', amt: tk(tot), b: true });
      if (paid != null) { rows.push({ v: 'গ্রাহক দিলেন', amt: tk(paid) }); rows.push({ v: 'ফেরত খুচরো', amt: tk(paid - tot), b: true, c: ACC.green }); }
      return { title: 'ক্যাশ মেমো', sub: 'GEB হাসপাতাল ফার্মেসি · ' + F.dateText(), accent: ACC.green, rows: rows, stamp: paid != null ? 'পরিশোধিত' : null };
    }
  };

  window.GEBFlowCore = { K: K, F: F, bx: bx, cy: cy, sp: sp, ground: ground, adopt: adopt, bed: bed, chair: chair, lying: lying, person: person, tag: tag, newScene: newScene, monitorHud: monitorHud, infoHud: infoHud, DOC: DOC, font: font, rr: rr, wrap: wrap, ACC: ACC, drawDoc: drawDoc, drawCap: drawCap, drawBubble: drawBubble, ecgY: ecgY };
})();
