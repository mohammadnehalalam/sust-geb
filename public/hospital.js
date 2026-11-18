/* GEB Hub: ভার্চুয়াল হাসপাতাল (v3.17)
   ৪ তলার ৩D হাসপাতাল (লিফট, হুইলচেয়ার, ডাক্তার-নার্স), রক্তদানের পুরো যাত্রা, সিজার, OT চেকলিস্ট, ICU কেস।
   ইঞ্জিন: vlab-3d.js (VL3D), ডেটা: hospital-data.js, স্টাইল: hospital.css। কোনো বাইরের লাইব্রেরি বা সার্ভার লাগে না।
   সব শেখার জন্য সরলীকৃত। আসল রোগীর চিকিৎসার জন্য নয়। */
(function () {
  'use strict';
  var mount = document.getElementById('hospMount'), H = window.GEBHosp;
  if (!mount || !H || !window.VL3D) return;
  var M = VL3D.mesh, PI = Math.PI, KEY = 'geb_hosp_v1';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var bn = function (n) { return String(n).replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'[d]; }); };
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, VL3D.reduce ? 1 : ms); }); };
  var $ = function (s, r) { return (r || mount).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || mount).querySelectorAll(s)); };
  function lsGet() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  var P = lsGet(); P.done = P.done || {}; P.snd = !!P.snd;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { } }

  /* ---------- শব্দ (ঐচ্ছিক, ডিফল্টে বন্ধ) ---------- */
  var AC = null;
  function beep(f, ms, vol) {
    if (!P.snd) return;
    try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); var o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = f; o.type = 'sine'; g.gain.value = vol || .05; o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + (ms || 80) / 1000); } catch (e) { }
  }

  /* ---------- মডেল ও স্টেজ ---------- */
  var ST = null, RUN = null, tickT = [];
  function later(fn, ms) { var t = setTimeout(fn, ms); tickT.push(t); return t; }
  function clearTimers() { tickT.forEach(clearTimeout); tickT = []; }

  function mkStage(host, o) {
    o = o || {};
    host.innerHTML = '<div class="hp-stage"><canvas class="hp-cv" role="img" aria-label="৩D হাসপাতাল দৃশ্য"></canvas><div class="hp-liftui" hidden></div><div class="hp-bubble" hidden></div>' +
      '<div class="hp-tools"><button type="button" class="hp-tb" data-a="cam" title="ক্যামেরা ঠিক করুন" aria-label="ক্যামেরা ঠিক করুন">⟲</button><button type="button" class="hp-tb" data-a="snd" title="শব্দ" aria-label="শব্দ চালু/বন্ধ">' + (P.snd ? '🔊' : '🔇') + '</button></div></div>';
    var cv = host.querySelector('canvas');
    var V = VL3D.create(cv, { yaw: 0, pitch: .95, dist: 40, fov: 1.0, target: [0, 0, 1], minDist: 8, maxDist: 70, minPitch: .12, maxPitch: 1.5, bg: ['#27465a', '#0f1c26'] });
    ST = { V: V, host: host, el: host.querySelector('.hp-stage'), lift: host.querySelector('.hp-liftui'), bub: host.querySelector('.hp-bubble'), mode: 'map', floor: -1, av: null, tiles: {}, doors: [], hl: null, walking: 0, role: o.role || 'walk', loc: { floor: 0, x: H.ENTRANCE.x, z: 0 }, ov: null };
    host.querySelector('.hp-tools').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.a === 'cam') V.camTo(V.cam0, 500);
      else { P.snd = !P.snd; save(); b.textContent = P.snd ? '🔊' : '🔇'; beep(660, 90); }
    });
    return ST;
  }
  function attached(V, ob) { while (ob.parent) { if (ob.parent.kids.indexOf(ob) < 0) return false; ob = ob.parent; } return ob === V.root; }
  function sceneReset(cam) {
    var V = ST.V; ST.extra = null; ST.gen = (ST.gen || 0) + 1;
    V.hook(function () { if (V.labels.length) V.labels = V.labels.filter(function (l) { return attached(V, l.ob); }); return false; }); V.clear(); V.hooks.length = 0; V.hook(function () { if (V.labels.length) V.labels = V.labels.filter(function (l) { return attached(V, l.ob); }); return false; }); V.overlay = null; V.onPick = null; V.onHover = null; V.draw = null; ST.av = null; ST.doors = []; ST.tiles = {}; ST.ov = null; ST.walking = 0;
    ST.bub.hidden = true;
    var c = cam || { yaw: 0, pitch: .95, dist: 36, target: [0, 0, 0] };
    V.cam.yaw = c.yaw; V.cam.pitch = c.pitch; V.cam.dist = c.dist; V.cam.target = c.target.slice(); V.cam0 = { yaw: c.yaw, pitch: c.pitch, dist: c.dist, target: c.target.slice() };
    V.lim.maxD = Math.max(70, c.dist * 2); V.dirty = true;
  }
  function say(t, ms) { if (!ST) return; ST.bub.textContent = t; ST.bub.hidden = !t; if (t && ms) later(function () { if (ST && ST.bub.textContent === t) ST.bub.hidden = true; }, ms); }

  /* ---------- ছোট বিল্ডার ---------- */
  var mix = VL3D.mix;
  function person(V, col, o) {
    o = o || {}; var g = V.add({ kind: 'group', pos: o.pos || [0, 0, 0], rot: o.rot || [0, 0, 0], scale: o.s || 1 }), b = V.add({ kind: 'group' }, g);
    V.add({ mesh: M.cyl(.42, .56, o.sit ? .9 : 1.5, 12), color: col, pos: [0, o.sit ? .75 : .25, 0], shade: .9, layer: 2 }, b);
    V.add({ mesh: M.sphere(.4, 10, 7), color: o.skin || '#e6b392', pos: [0, o.sit ? 2.0 : 2.1, 0], layer: 2 }, b);
    if (o.cap) V.add({ mesh: M.cyl(.38, .43, .2, 10), color: o.cap, pos: [0, o.sit ? 2.3 : 2.4, 0], layer: 2 }, b);
    if (o.mask) V.add({ mesh: M.box(.55, .22, .2), color: '#cfe9f2', pos: [0, o.sit ? 1.85 : 1.95, .32], layer: 2 }, b);
    return { g: g, b: b };
  }
  var STAFF = { doc: ['#f4f6f8', '#d9e6ef'], nurse: ['#ee8fb3', '#ffe0ec'], surg: ['#2f9d8f', '#2f9d8f'], tech: ['#7a6bbf', '#e8e0ff'], staff: ['#4f6fa8', '#cfe0f5'], pat: ['#4aa3ff', '#e0efff'] };
  function furniture(V, room) {
    var f = room.f || [], n = f.length, w = room.x1 - room.x0;
    f.forEach(function (k, i) {
      var x = room.x0 + (i + .5) * w / n, z = room.cz + (room.side === 't' ? -1.2 : 1.2), g = V.add({ kind: 'group', pos: [x, 0, z] });
      if (k === 'bed') { V.add({ mesh: M.box(1.5, .55, 2.9), color: '#eef3f6', pos: [0, .35, 0], layer: 3 }, g); V.add({ mesh: M.box(1.3, .18, .7), color: '#b9d7ee', pos: [0, .9, -1.0], layer: 3 }, g); V.add({ mesh: M.box(1.6, .1, 1.9), color: '#7fb6d9', pos: [0, .9, .5], layer: 3 }, g); }
      else if (k === 'otbed') { V.add({ mesh: M.box(1.8, .9, 3.4), color: '#c9d6df', pos: [0, .3, 0], layer: 3 }, g); V.add({ mesh: M.cyl(1.0, 1.0, .12, 16), color: '#f4f0b0', pos: [0, 4.4, 0], glow: .6, layer: 3 }, g); }
      else if (k === 'desk') { V.add({ mesh: M.box(2.6, .9, 1.1), color: '#9c7b5b', pos: [0, 0, 0], layer: 3 }, g); V.add({ mesh: M.box(.8, .6, .1), color: '#1e2c38', pos: [.4, 1.0, 0], layer: 3 }, g); }
      else if (k === 'chair') { V.add({ mesh: M.box(1.4, .5, 1.4), color: '#3b6ea5', pos: [0, .3, 0], layer: 3 }, g); V.add({ mesh: M.box(1.4, 1.2, .25), color: '#3b6ea5', pos: [0, .8, -.7], layer: 3 }, g); }
      else if (k === 'fridge') { V.add({ mesh: M.box(1.6, 2.4, 1.2), color: '#dbe7ee', pos: [0, 0, 0], layer: 3 }, g); V.add({ mesh: M.box(1.3, .5, .1), color: '#c0392b', pos: [0, 1.4, .62], layer: 3 }, g); }
      else if (k === 'bench') { V.add({ mesh: M.box(3.6, .9, 1.2), color: '#69788a', pos: [0, 0, 0], layer: 3 }, g); V.add({ mesh: M.cyl(.18, .18, .8, 8), color: '#d8f0ff', alpha: .7, pos: [-.8, .9, 0], layer: 3 }, g); V.add({ mesh: M.cyl(.18, .18, .8, 8), color: '#ffd7d7', alpha: .7, pos: [.1, .9, 0], layer: 3 }, g); }
      else if (k === 'shelf') { V.add({ mesh: M.box(3.4, 1.9, .7), color: '#c8c1b4', pos: [0, 0, 0], layer: 3 }, g); [['#53b88b', -1], ['#e5596b', 0], ['#5fa8d3', 1]].forEach(function (c) { V.add({ mesh: M.box(.7, .5, .3), color: c[0], pos: [c[1], 1.0, .35], layer: 3 }, g); }); }
      else if (k === 'xray') { V.add({ mesh: M.box(2.6, .5, 1.6), color: '#e8eef2', pos: [0, 0, 0], layer: 3 }, g); V.add({ mesh: M.cyl(.15, .15, 2.6, 8), color: '#7a8a98', pos: [-1.1, .5, 0], layer: 3 }, g); V.add({ mesh: M.box(1.2, .35, 1.0), color: '#34495e', pos: [-.4, 3.0, 0], layer: 3 }, g); }
    });
  }
  var NPC = { opd101: 'doc', opd102: 'doc', opd103: 'doc', opd104: 'doc', emergency: 'doc', nurse2: 'nurse', icu: 'nurse', ccu: 'nurse', labour: 'nurse', nicu: 'nurse', preop: 'nurse', ot1: 'surg', ot2: 'surg', bloodbank: 'tech', pathlab: 'tech', reception: 'staff', pharmacy: 'staff', cashier: 'staff', radiology: 'tech', ecg: 'tech', usg: 'doc' };

  function buildFloor(n, hl) {
    var V = ST.V, fl = H.FLOORS[n];
    V.add({ mesh: M.box(50, .5, 26), color: '#c9d3d9', pos: [0, -.5, 0], layer: 0, shade: .85 });
    V.add({ mesh: M.box(46, .06, 5), color: '#e6edf0', pos: [0, 0, 0], layer: 1, shade: .9 });
    V.add({ pts: [[-21, .08, 0], [21, .08, 0]], color: '#b7c5cd', width: 1, layer: 1 });
    V.add({ mesh: M.box(.6, .06, 5), color: '#38b88e', pos: [-21.7, 0, 0], layer: 1 });
    fl.rooms.forEach(function (r) {
      var w = r.x1 - r.x0, zo = r.side === 't' ? -9 : 9, zi = r.side === 't' ? -2.5 : 2.5, zc = (zo + zi) / 2, d = 6.5, WH = 1.5, wc = '#f4f7f9';
      var tile = V.add({ mesh: M.box(w - .2, .12, d - .2), color: mix(r.c, '#ffffff', r.lift ? .3 : .55), pos: [r.cx, 0, zc], layer: 2, pick: true, id: r.id, shade: .95 });
      ST.tiles[r.id] = tile;
      V.add({ mesh: M.box(w, WH, .3), color: wc, pos: [r.cx, 0, zo + (r.side === 't' ? .15 : -.15)], layer: 4, shade: .9 });
      V.add({ mesh: M.box(.3, WH, d), color: wc, pos: [r.x0 + .15, 0, zc], layer: 4, shade: .9 });
      V.add({ mesh: M.box(.3, WH, d), color: wc, pos: [r.x1 - .15, 0, zc], layer: 4, shade: .9 });
      var fz = zi + (r.side === 't' ? -.15 : .15), gap = 1.3, L = r.cx - gap - r.x0, R = r.x1 - r.cx - gap;
      if (r.lift) {
        var dl = V.add({ mesh: M.box(gap, WH, .22), color: '#aab6bf', pos: [r.cx - gap / 2, 0, fz], layer: 5 }), dr = V.add({ mesh: M.box(gap, WH, .22), color: '#aab6bf', pos: [r.cx + gap / 2, 0, fz], layer: 5 });
        ST.doors = [dl, dr]; V.add({ mesh: M.box(L, WH, .3), color: wc, pos: [r.x0 + L / 2, 0, fz], layer: 4 }); V.add({ mesh: M.box(R, WH, .3), color: wc, pos: [r.x1 - R / 2, 0, fz], layer: 4 });
        V.add({ mesh: M.box(3, .1, 3), color: '#c3ccd2', pos: [r.cx, .1, zc], layer: 3 });
      } else {
        V.add({ mesh: M.box(L, WH, .3), color: wc, pos: [r.x0 + L / 2, 0, fz], layer: 4, shade: .9 }); V.add({ mesh: M.box(R, WH, .3), color: wc, pos: [r.x1 - R / 2, 0, fz], layer: 4, shade: .9 });
        furniture(V, r);
        if (NPC[r.id]) { var s = STAFF[NPC[r.id]], pp = person(V, s[0], { pos: [r.cx + w * .28, 0, r.cz + (r.side === 't' ? 1.4 : -1.4)], cap: NPC[r.id] === 'nurse' ? '#fff' : (NPC[r.id] === 'surg' ? '#2f9d8f' : null), mask: NPC[r.id] === 'surg' }); pp.ph = Math.random() * 6; (ST.npcs = ST.npcs || []).push(pp); }
      }
      V.labelFor(tile, (r.lift ? '🛗 ' : '') + r.n, { off: [0, 1.9, r.side === 't' ? .6 : -.6], color: hl === r.id ? '#c0392b' : '#10243E' });
    });
    V.add({ mesh: M.box(1, .06, 5), color: '#38f5b4', pos: [-23.6, 0, 0], layer: 1, glow: 1 });
    if (n === 0) V.labelFor(V.add({ kind: 'group', pos: [-22.2, 0, 0] }), '🚪 প্রবেশ', { off: [0, 1.3, 0], color: '#0b8f73' });
    ST.npcs = ST.npcs || [];
    var npcs = ST.npcs.slice(); ST.npcs = [];
    V.hook(function (t) { npcs.forEach(function (p) { p.b.pos = [0, .06 * Math.sin(t / 500 + p.ph), 0]; }); return false; });
    if (hl && ST.tiles[hl]) {
      var tl = ST.tiles[hl], base = H.ROOM[hl].c;
      V.hook(function (t) { var k = (Math.sin(t / 260) + 1) / 2; tl.color = mix(mix(base, '#ffffff', .55), '#ffd24a', k * .85); return false; });
    }
  }
  function showFloor(n, hl) {
    sceneReset(); ST.mode = 'map'; ST.floor = n; ST.hl = hl === undefined ? ST.hl : hl; ST.npcs = [];
    buildFloor(n, ST.hl); ST.V.onPick = function (h) { if (h && h.ob && h.ob.id && H.ROOM[h.ob.id] && ST.onRoom) ST.onRoom(h.ob.id); };
    updateFloorBar();
  }
  function spawnAv(p) {
    var V = ST.V, chair = ST.role === 'chair', pp = person(V, STAFF.pat[0], { pos: [p[0], 0, p[1]], sit: chair, cap: null }), g = pp.g, b = pp.b;
    if (chair) {
      V.add({ mesh: M.box(1.3, .15, 1.2), color: '#34495e', pos: [0, .55, 0], layer: 2 }, b); V.add({ mesh: M.box(1.3, 1.1, .14), color: '#34495e', pos: [0, .55, .62], layer: 2 }, b);
      [-.78, .78].forEach(function (x) { V.add({ mesh: M.torus(.55, .07, 14, 5), color: '#222d38', pos: [x, .6, .2], rot: [0, 0, PI / 2], layer: 2 }, b); });
      var at = person(V, STAFF.doc[0], { pos: [0, 0, 1.5], cap: null }); V.remove(at.g); g.kids.push(at.g); at.g.parent = g;
    }
    ST.av = { g: g, b: b };
    V.hook(function (t) { b.pos = [0, ST.walking ? Math.abs(Math.sin(t / 130)) * .14 : 0, 0]; return false; });
    return ST.av;
  }
  function walk(pts, speed) { var S = ST;
    var V = S.V, p = Promise.resolve(); S.walking++;
    for (var i = 1; i < pts.length; i++) (function (a, b) { p = p.then(function () { var d = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d < .01) return; return V.tw(S.av.g, { pos: [b[0], 0, b[1]] }, Math.max(120, d / (speed || 11) * 1000)); }); })(pts[i - 1], pts[i]);
    return p.then(function () { S.walking = Math.max(0, S.walking - 1); });
  }
  function doors(open) { var S = ST;
    if (!S.doors.length) return Promise.resolve(); beep(open ? 880 : 660, 120, .04);
    return Promise.all([S.V.tw(S.doors[0], { pos: [S.doors[0].pos[0] + (open ? -1.3 : 1.3), 0, S.doors[0].pos[2]] }, 450), S.V.tw(S.doors[1], { pos: [S.doors[1].pos[0] + (open ? 1.3 : -1.3), 0, S.doors[1].pos[2]] }, 450)]);
  }
  function ride(from, to) { var S = ST;
    var el = S.lift, n = Math.abs(to - from), dirc = to > from ? '▲' : '▼', p = Promise.resolve(), cur = from;
    el.hidden = false; el.innerHTML = '<b>' + dirc + '</b><i>' + bn(from) + '</i><small>লিফট চলছে…</small>';
    for (var k = 1; k <= n; k++) (function (f) { p = p.then(function () { return sleep(650).then(function () { el.innerHTML = '<b>' + dirc + '</b><i>' + bn(f) + '</i><small>লিফট চলছে…</small>'; }); }); })(from + (to > from ? k : -k));
    return p.then(function () { beep(990, 220, .06); el.innerHTML = '<b>🔔</b><i>' + bn(to) + '</i><small>পৌঁছেছেন</small>'; return sleep(550); }).then(function () { el.hidden = true; });
  }
  function travel(toRoom) {
    var myST = ST, from = ST.loc, segs = H.route({ room: null, floor: from.floor, x: from.x, z: from.z }, toRoom), p = Promise.resolve(), tr = H.ROOM[toRoom];
    ST.hl = toRoom; ST.walkId = (ST.walkId || 0) + 1; var wid = ST.walkId;
    segs.forEach(function (sg) {
      p = p.then(function () {
        if (ST !== myST || wid !== ST.walkId) throw 'cancel';
        if (ST.mode !== 'map' || ST.floor !== sg.floor || !ST.av) { showFloor(sg.floor, toRoom); spawnAv(sg.pts[0]); if (sg.lift === 'out') ST.av.g.vis = false; }
        if (sg.lift === 'out') {
          ST.av.g.vis = true; return doors(true).then(function () { return walk(sg.pts, 7); }).then(function () { return doors(false); });
        }
        if (sg.lift === 'in') {
          return walk(sg.pts.slice(0, sg.pts.length - 1), 11).then(function () { return doors(true); }).then(function () { return walk(sg.pts.slice(-2), 6); }).then(function () { ST.av.g.vis = false; return doors(false); }).then(function () { return ride(sg.floor, tr.floor); });
        }
        return walk(sg.pts, 11);
      });
    });
    return p.then(function () { ST.loc = { floor: tr.floor, x: tr.cx, z: tr.cz, room: toRoom }; return true; }, function (e) { if (e === 'cancel') return false; throw e; });
  }
  function updateFloorBar() { var fb = $('.hp-floorbar'); if (!fb || !ST) return; $$('button', fb).forEach(function (b) { b.classList.toggle('on', +b.dataset.f === ST.floor); }); }

  /* ---------- ওভারলে: ক্যাপশন (একবারে একটি ধাপ, ছোট) ---------- */
  function wrapText(ctx, text, w) { var words = String(text).split(' '), lines = [], cur = ''; words.forEach(function (wd) { var t = cur ? cur + ' ' + wd : wd; if (ctx.measureText(t).width > w && cur) { lines.push(cur); cur = wd; } else cur = t; }); if (cur) lines.push(cur); return lines; }
  function setPanel(title, rows, o) {
    o = o || {}; var V = ST.V, t0 = performance.now(), delay = o.delay || 1500; ST.ov = { title: title, rows: rows, t0: t0, delay: delay };
    V.hook(function (now) { return now - t0 > rows.length * delay + 400; });
    V.overlay = function (ctx, W, Hh, now) {
      var ov = ST.ov; if (!ov) return; var n = ov.rows.length, k = VL3D.reduce ? n - 1 : Math.min(n - 1, Math.floor((now - ov.t0) / ov.delay)), txt = ov.rows[k], w = Math.min(W - 70, 330), x = 8, y = 8;
      ctx.save(); ctx.font = '600 13px "Hind Siliguri",system-ui,sans-serif'; var ls = wrapText(ctx, txt, w - 28), h = 34 + ls.length * 17;
      ctx.fillStyle = 'rgba(8,20,30,.8)'; ctx.strokeStyle = 'rgba(56,245,180,.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, 10) : ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#38f5b4'; ctx.font = '700 12px "Hind Siliguri",system-ui,sans-serif'; ctx.fillText(ov.title + ' · ' + (k + 1) + '/' + n, x + 12, y + 19);
      ctx.fillStyle = '#eaf6fa'; ctx.font = '600 13px "Hind Siliguri",system-ui,sans-serif'; ls.forEach(function (l, i) { ctx.fillText(l, x + 12, y + 38 + i * 17); });
      for (var q = 0; q < n; q++) { ctx.fillStyle = q <= k ? '#38f5b4' : 'rgba(255,255,255,.25)'; ctx.fillRect(x + w - 12 - (n - q) * 8, y + 12, 6, 6); }
      ctx.restore(); if (ST.extra) ST.extra(ctx, W, Hh, now);
    };
  }

  /* ---------- ক্লোজ-আপ দৃশ্যের উপাদান ---------- */
  function floorPlane(V, c) { V.add({ mesh: M.box(44, .4, 30), color: c || '#d9e2e7', pos: [0, -.4, 0], layer: 0, shade: .9 }); }
  function armScene(V, mode) {
    var cam = { yaw: .25, pitch: .72, dist: 17, target: [3, 2.5, 0] }; sceneReset(cam); floorPlane(V);
    var o = {};
    V.add({ mesh: M.box(5, .8, 5), color: '#2f5f95', pos: [0, 1.0, 0], layer: 2 }); V.add({ mesh: M.box(5, 3.4, .8), color: '#2f5f95', pos: [0, 1.8, -2.6], layer: 2 });
    [[-2, -2], [2, -2], [-2, 2], [2, 2]].forEach(function (p) { V.add({ mesh: M.cyl(.18, .18, 1.0, 8), color: '#9aa7b2', pos: [p[0], 0, p[1]], layer: 1 }); });
    V.add({ mesh: M.box(2.6, 3.4, 1.8), color: '#4aa3ff', pos: [0, 1.8, -1.0], layer: 3 });   // ধড়
    V.add({ mesh: M.sphere(.85, 14, 9), color: '#e6b392', pos: [0, 6.0, -1.0], layer: 3 });
    V.add({ mesh: M.box(1.3, .16, 5.4), color: '#a9b7c2', pos: [3.4, 1.3, 0], rot: [0, 1.57, 0], layer: 2 });   // আর্মরেস্ট
    var arm = V.add({ mesh: M.capsule(7, .6, 12), color: '#e6b392', pos: [5.4, 1.95, .4], layer: 3 });
    var vein = V.add({ pts: [[2.4, 2.6, .4], [8.4, 2.6, .4]], color: '#5b78b8', width: 2.2, layer: 4 });
    o.arm = arm; o.vein = vein; o.site = V.add({ mesh: M.disc(.55, 16), color: '#e6b392', pos: [5.2, 2.6, .4], layer: 4 }); o.tq = V.add({ mesh: M.torus(.68, .12, 18, 6), color: '#e0a21a', pos: [3.4, 1.95, .4], rot: [0, 0, PI / 2], layer: 4, vis: false });
    return o;
  }
  function bagBlood(V, pos, fill) {
    var g = V.add({ kind: 'group', pos: pos }); V.add({ mesh: M.box(2.8, 3.4, .55), color: '#cfe5f1', alpha: .45, pos: [0, 0, 0], layer: 5, two: true }, g);
    var b = V.add({ mesh: M.box(2.5, 2.6, .45), color: '#a3121d', pos: [0, .1, 0], scale: [1, Math.max(.01, fill), 1], layer: 4, shade: .95 }, g);
    V.add({ mesh: M.box(2.0, .9, .05), color: '#f6f3ea', pos: [0, 1.5, .3], layer: 6 }, g); return { g: g, fill: b };
  }
  function dropsAlong(V, pts, color, speed, runFn) {
    var d = V.add({ dots: [], color: color, r: .16, layer: 6 }), len = pts.length - 1, ph = 0;
    V.hook(function (t) {
      if (runFn && !runFn()) { d.dots = []; return false; }
      var arr = []; for (var k = 0; k < 7; k++) { var u = (((t * speed) / 1000) + k / 7) % 1, f = u * len, i = Math.min(len - 1, Math.floor(f)), r = f - i; arr.push({ p: [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * r, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * r, pts[i][2] + (pts[i + 1][2] - pts[i][2]) * r] }); }
      d.dots = arr; return false;
    });
    return d;
  }
  function otRoom(V, mode) {
    var cam = { yaw: .55, pitch: .72, dist: 24, target: [0, 1.5, 1] }; sceneReset(cam); floorPlane(V, '#cfe3e0');
    var o = {};
    V.add({ mesh: M.box(3.6, .5, 9), color: '#bfcdd6', pos: [0, 1.8, 0], layer: 2 }); V.add({ mesh: M.cyl(.5, .8, 1.8, 10), color: '#7f93a1', pos: [0, 0, 0], layer: 1 });
    o.pat = V.add({ kind: 'group', pos: [0, 2.3, 0] });
    V.add({ mesh: M.box(2.4, .85, 3.6), color: '#7fc4a8', pos: [0, 0, .5], layer: 3 }, o.pat); V.add({ mesh: M.sphere(.7, 12, 8), color: '#e6b392', pos: [0, .5, -2.1], layer: 3 }, o.pat); V.add({ mesh: M.box(1.8, .7, 3.0), color: '#7fc4a8', pos: [0, 0, 3.9], layer: 3 }, o.pat);
    V.add({ mesh: M.cyl(2.2, 2.2, .3, 24), color: '#f4f0b0', pos: [0, 10, 1.5], glow: .7, layer: 6 }); V.add({ mesh: M.cyl(.15, .15, 4, 8), color: '#8795a1', pos: [0, 10.3, 1.5], layer: 6 });
    V.add({ mesh: M.box(2, 1.8, 1.2), color: '#2d3f4f', pos: [-4.2, 0, -4], layer: 3 }); V.add({ mesh: M.box(1.4, 1.0, .12), color: '#0c1a24', pos: [-4.2, 2.0, -3.6], rot: [-.25, 0, 0], layer: 4 });
    V.add({ mesh: M.box(3, 1.6, 2), color: '#9fb2bf', pos: [5.2, 0, 3.8], layer: 3 }); V.add({ mesh: M.box(2.4, .1, 1.4), color: '#e4eef3', pos: [5.2, 1.65, 3.8], layer: 3 });
    function mk(role, name, pos, col, cap, mask) { var p = person(V, col, { pos: pos, cap: cap, mask: mask }); V.labelFor(p.g, name, { off: [0, 3, 0], color: '#0b6e5b' }); o[role] = p; return p; }
    o.mk = mk;
    return o;
  }
  function team(o) { o.mk('surg', 'সার্জন', [-3.4, 0, 1.2], '#2f9d8f', '#2f9d8f', true); o.mk('asst', 'সহকারী', [3.4, 0, 1.2], '#2f9d8f', '#2f9d8f', true); o.mk('anes', 'অ্যানেস্থেসিস্ট', [0, 0, -5.4], '#2c7fb8', '#2c7fb8', true); o.mk('scrub', 'স্ক্রাব নার্স', [-3.6, 0, 4.4], '#2f9d8f', '#2f9d8f', true); o.mk('circ', 'সার্কুলেটিং নার্স', [6.2, 0, 1.5], '#ee8fb3', '#fff', false); }

  /* ---------- ECG ---------- */
  function g2(x, m, s) { var d = (x - m) / s; return Math.exp(-d * d); }
  function ecgVal(kind, t, hr) {
    if (kind === 'flat') return 0 + .01 * Math.sin(t * 9);
    if (kind === 'vf') return .55 * Math.sin(t * 23) * Math.sin(t * 2.1) + .35 * Math.sin(t * 37 + 1) + .3 * Math.sin(t * 11);
    var T = 60 / Math.max(30, hr), p = ((t % T) + T) % T / T, y = .1 * g2(p, .16, .03) - .14 * g2(p, .28, .012) + 1.0 * g2(p, .305, .013) - .22 * g2(p, .33, .012) + .26 * g2(p, .55, .05);
    if (kind === 'stemi') y += .42 * g2(p, .45, .09) * (p > .33 ? 1 : 0) + .1;
    return y;
  }
  function drawMonitor(ctx, W, Hh, now, C) {
    var h = Math.min(Hh * .34, 130), y0 = Hh - h - 6, w = W - 16, x0 = 8, v = C.v;
    ctx.save(); ctx.fillStyle = 'rgba(2,10,16,.9)'; ctx.strokeStyle = '#1e4b3f'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0, y0, w, h, 10) : ctx.rect(x0, y0, w, h); ctx.fill(); ctx.stroke();
    var pw = Math.max(70, Math.min(110, w * .3)), gx = x0 + 8, gw = w - pw - 20, gy = y0 + 10, gh = h - 20, kind = C.rhythm, hr = C.v.hr;
    ctx.beginPath(); ctx.strokeStyle = kind === 'vf' ? '#ff6b6b' : '#38f5b4'; ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
    var sec = now / 1000;
    for (var i = 0; i <= gw; i += 2) { var tt = sec - (gw - i) / 90, vv = ecgVal(kind, tt, hr || 70); if (C.cpr) vv += .35 * Math.sin(tt * 11.5); var yy = gy + gh * (.62 - vv * .5); i ? ctx.lineTo(gx + i, yy) : ctx.moveTo(gx + i, yy); }
    ctx.stroke();
    var px = x0 + w - pw - 4; ctx.font = '700 11px system-ui'; ctx.fillStyle = '#38f5b4'; ctx.fillText('HR', px, gy + 8); ctx.font = '800 22px system-ui'; ctx.fillText(v.hr > 0 ? v.hr : '--', px + 22, gy + 14);
    ctx.font = '700 11px system-ui'; ctx.fillStyle = '#ff9bd0'; ctx.fillText('BP', px, gy + 40); ctx.font = '800 15px system-ui'; ctx.fillText(v.sys > 0 ? v.sys + '/' + v.dia : '--', px + 22, gy + 42);
    ctx.font = '700 11px system-ui'; ctx.fillStyle = '#6ec8ff'; ctx.fillText('SpO₂', px, gy + 66); ctx.font = '800 17px system-ui'; ctx.fillText(v.spo2 > 0 ? v.spo2 + '%' : '--', px + 34, gy + 68);
    ctx.font = '700 11px system-ui'; ctx.fillStyle = '#ffd24a'; ctx.fillText('RR ' + (v.rr || '--') + '  T ' + v.temp.toFixed(1), px, gy + 92);
    if (C.cpr) { ctx.fillStyle = 'rgba(255,200,60,' + (.55 + .4 * Math.sin(now / 150)) + ')'; ctx.font = '800 13px "Hind Siliguri",system-ui'; ctx.fillText('CPR চলছে', gx + 4, gy + 12); }
    if (C.flash && now - C.flash < 350) { ctx.fillStyle = 'rgba(255,255,255,' + (1 - (now - C.flash) / 350) * .8 + ')'; ctx.fillRect(0, 0, W, Hh); }
    ctx.restore();
    if (hr > 0 && P.snd && (!C._b || now - C._b > 60000 / hr)) { C._b = now; beep(880, 50, .03); }
  }

  /* ---------- রক্তদানের ক্লোজ-আপ ---------- */
  var CU = {};
  function listOv(title, rows, d) { setPanel(title, rows, { delay: Math.max(1500, d || 1500) }); }
  CU.consent = function (V) {
    sceneReset({ yaw: .2, pitch: .9, dist: 17, target: [0, 1, 0] }); floorPlane(V, '#d8e3e9');
    V.add({ mesh: M.box(9, .6, 6), color: '#9c7b5b', pos: [0, 0, 0], layer: 1 }); V.add({ mesh: M.box(5.2, .12, 6.6), color: '#fbfbf6', pos: [0, .62, 0], rot: [0, 0, 0], layer: 2 });
    for (var i = 0; i < 6; i++) V.add({ mesh: M.box(3.8, .03, .12), color: '#b8c3cc', pos: [0, .7, -2.3 + i * .85], layer: 3 });
    V.add({ mesh: M.cyl(.09, .09, 2.6, 8), color: '#1d2b36', pos: [2.4, .8, 1.6], rot: [0, 0, 1.45], layer: 4 });
    var lst = RUN && RUN.kind === 'ot' ? ['রোগীর নাম ও আইডি মেলানো', 'লিখিত সম্মতিপত্রে সই', 'অ্যালার্জির তথ্য', 'রক্ত প্রস্তুত কিনা', 'সার্জন সাইট চিহ্নিত করেছেন', 'খালি পেটের সময় লেখা'] : ['নাম, বয়স, ওজন, আইডি', 'সাম্প্রতিক জ্বর বা সংক্রমণ?', 'সাম্প্রতিক ওষুধ বা টিকা?', 'ট্যাটু/কান ফোঁড়ানো/ভ্রমণ?', 'গর্ভাবস্থা বা বুকের দুধ?', 'দানের সম্মতি ও সই'];
    listOv('✍️ ফরম', lst, 900);
  };
  CU.vitals = function (V) {
    var o = armScene(V, 'v'); o.tq.vis = true;
    var vals = ['ওজন ৬৬ কেজি ✔ (≥ ৫০)', 'নাড়ি ৭২/মিনিট, নিয়মিত ✔', 'রক্তচাপ ১১৮/৭৬ ✔', 'তাপমাত্রা ৩৬.৮°C ✔', 'আঙুলে সুঁই: Hb ১৩.৪ g/dL ✔'];
    listOv('🩺 পরীক্ষা', vals, 1100);
    V.add({ mesh: M.cyl(.5, .5, .3, 14), color: '#d94b4b', pos: [3.9, 1.7, .4], layer: 5 });
  };
  CU.grouping = function (V) {
    sceneReset({ yaw: .15, pitch: 1.0, dist: 17, target: [0, 0, 0] }); floorPlane(V, '#d8e3e9');
    var g = RUN.donor.g, A = g.indexOf('A') >= 0, B = g.indexOf('B') >= 0, D = g.slice(-1) === '+';
    V.add({ mesh: M.box(11, .4, 5.4), color: '#f6f8fa', pos: [0, 0, 0], layer: 1 });
    [['Anti-A', '#3f7de0', A, -3.6], ['Anti-B', '#e0b23a', B, 0], ['Anti-D', '#d7e3ea', D, 3.6]].forEach(function (w) {
      var well = V.add({ mesh: M.disc(1.35, 24), color: '#eef2f5', pos: [w[3], .45, 0], layer: 2 }), reag = V.add({ mesh: M.disc(.5, 12), color: w[1], pos: [w[3] - .55, .5, -.4], alpha: 0, layer: 3 }), blood = V.add({ mesh: M.disc(.6, 14), color: '#b3131d', pos: [w[3] + .4, .52, .3], alpha: 0, layer: 3 });
      V.labelFor(well, w[0], { off: [0, .3, 2.0], color: '#10243E' });
      V.tw(reag, { alpha: .95 }, 500).then(function () { return V.tw(blood, { alpha: .95 }, 500); }).then(function () { return sleep(300); }).then(function () {
        return V.tw(blood, { pos: [w[3], .52, 0], scale: [2.1, 1, 2.1] }, 700).then(function () { V.tw(reag, { alpha: 0 }, 300); });
      }).then(function () { return sleep(400); }).then(function () {
        if (w[2]) { V.set(blood, { color: '#d77d7d', alpha: .5 }); var cl = []; for (var i = 0; i < 16; i++) { var a = Math.random() * 6.28, r = Math.random() * 1.0; cl.push({ p: [w[3] + Math.cos(a) * r, .6, Math.sin(a) * r], r: .09 + Math.random() * .08 }); } V.add({ dots: cl, color: '#7c0f16', layer: 4, r: .12 }); }
        else V.set(blood, { color: '#c4474b', alpha: .9 });
      });
    });
    listOv('🔬 ফল দেখুন', ['তিন কূপে এক ফোঁটা করে রক্ত, তিনটি রিএজেন্টে মেশানো', 'কাঠি দিয়ে ১ মিনিট নাড়া', 'দানা-দানা জমাট (agglutination) = ঐ অ্যান্টিজেন আছে', 'পরিষ্কার ও মসৃণ লাল = নেই'], 1200);
  };
  CU.prep = function (V) {
    var o = armScene(V); var sw = V.add({ mesh: M.sphere(.35, 8, 6), color: '#f5f1e6', pos: [5.0, 4.0, 3.5], layer: 7 });
    V.set(o.tq, { vis: true });
    var pts = [[4.5, 2.9, 0], [6, 2.9, .7], [4.6, 2.9, .9], [6.2, 2.9, .1], [5.2, 2.9, .4]];
    var p = V.tw(sw, { pos: [5, 3.6, 3.0] }, 500);
    pts.forEach(function (pt) { p = p.then(function () { return V.tw(sw, { pos: [pt[0], 2.95, pt[2] + .4] }, 450); }); });
    p.then(function () { V.tw(o.site, { color: '#c9895f' }, 600); return V.tw(sw, { pos: [5, 5, 4] }, 500); });
    listOv('🧴 প্রস্তুতি', ['BP কাফ ৪০–৬০ mmHg', 'শিরা খোঁজা (কনুইয়ের ভাঁজে)', 'অ্যান্টিসেপটিক ৩০ সেকেন্ড ঘষা', 'শুকাতে দেওয়া, আর ছোঁয়া নয়'], 1300);
  };
  CU.donate = function (V) {
    var o = armScene(V); V.set(o.tq, { vis: true }); var needle = V.add({ mesh: M.cyl(.06, .06, 1.6, 8), color: '#c9d1d8', pos: [5.2, 5, .4], rot: [0, 0, .2], layer: 7 });
    var path = [[5.2, 2.7, .4], [6.2, 3.4, 1.8], [-1, 2.4, 4.2], [-6.5, 1.8, 3.2], [-6.5, 3.4, 3.2]];     var line = V.add({ pts: path, color: '#a3121d', width: 2.6, layer: 6 }); line.vis = false;
    V.add({ mesh: M.box(3.6, .5, 3), color: '#8e9aa5', pos: [-6.5, 0, 3.2], layer: 2 }); var bag = bagBlood(V, [-6.5, .6, 3.2], .02), run = false, t0;
    V.tw(needle, { pos: [5.2, 2.8, .4], rot: [0, 0, 1.2] }, 900).then(function () { line.vis = true; V.set(o.tq, { vis: false }); run = true; t0 = performance.now(); beep(700, 100);
      return V.tw(bag.fill, { scale: [1, 1, 1] }, 7000); }).then(function () { run = false; });
    dropsAlong(V, path, '#c0121d', .45, function () { return run; });
    V.hook(function () { return false; });
    V.overlay = function (ctx, W, Hh, now) { if (!run && !t0) return; var el = t0 ? Math.min(1, (now - t0) / 7000) : 0, ml = Math.round(el * 450), mm = Math.round(el * 8 * 60), sec = mm % 60, m = Math.floor(mm / 60); ctx.save(); ctx.fillStyle = 'rgba(8,20,30,.78)'; ctx.strokeStyle = 'rgba(56,245,180,.5)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(8, 8, 190, 62, 10) : ctx.rect(8, 8, 190, 62); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#38f5b4'; ctx.font = '800 20px system-ui'; ctx.fillText(ml + ' / 450 mL', 20, 36); ctx.fillStyle = '#e8f3f7'; ctx.font = '600 12px "Hind Siliguri",system-ui'; ctx.fillText('সময় ০' + m + ':' + (sec < 10 ? '0' : '') + sec + ' · ব্যাগ নাড়ছে', 20, 58); ctx.restore(); };
  };
  CU.after = function (V) {
    var o = armScene(V); V.set(o.site, { color: '#c9895f' });
    var cot = V.add({ mesh: M.sphere(.4, 8, 6), color: '#fff', pos: [5.2, 3.5, .4], layer: 7 }); V.tw(cot, { pos: [5.2, 2.95, .4] }, 800);
    V.add({ mesh: M.box(1.4, .08, .5), color: '#6cb5a3', pos: [5.2, 3.0, .4], layer: 7, alpha: 0 });
    var cup = V.add({ kind: 'group', pos: [-3.4, .9, 3.4] }); V.add({ mesh: M.cyl(.55, .45, 1.2, 12), color: '#f4b942', alpha: .85, layer: 6 }, cup);
    listOv('🧃 দানের পর', ['হাত সোজা রেখে চাপ ১০ মিনিট', 'বসে বিশ্রাম ১০–১৫ মিনিট', 'পানি/জুস, হালকা খাবার', 'আজ ভারী কাজ নয়, বেশি পানি'], 1300);
  };
  CU.spin = function (V) {
    sceneReset({ yaw: .35, pitch: .85, dist: 20, target: [0, 2, 0] }); floorPlane(V);
    V.add({ mesh: M.lathe([[0, 0], [4.2, 0], [4.4, 3.2], [3.6, 3.6], [0, 3.6]], 28), color: '#dfe6ea', layer: 2 });
    var rotor = V.add({ kind: 'group', pos: [0, 3.65, 0] }); V.add({ mesh: M.disc(3.2, 24), color: '#8a98a4', layer: 3 }, rotor);
    var tubes = [0, 1, 2, 3].map(function (i) { var a = i * PI / 2; return V.add({ mesh: M.cyl(.5, .5, 1.6, 10), color: '#a3121d', pos: [Math.cos(a) * 2.1, .05, Math.sin(a) * 2.1], layer: 4 }, rotor); });
    var spin = false, sp = 0, lid = V.add({ mesh: M.lathe([[0, 3.5], [4.5, 3.5], [4.5, 3.7], [0, 3.7]], 28), color: '#7e8c98', alpha: 0, layer: 5 });
    V.hook(function (t) { if (spin) { sp += .35; rotor.rot = [0, sp, 0]; } return false; });
    var tb = V.add({ mesh: M.cyl(.8, .8, 6, 14), color: '#cfe5f1', alpha: .5, pos: [9, 0, 0], layer: 5, two: true });
    var layers = [V.add({ mesh: M.cyl(.7, .7, 2.2, 14), color: '#8c1c1c', pos: [9, 0, 0], layer: 4 }), V.add({ mesh: M.cyl(.7, .7, .15, 14), color: '#f4efe6', pos: [9, 2.2, 0], layer: 4, vis: false }), V.add({ mesh: M.cyl(.7, .7, 3.2, 14), color: '#f2d27a', pos: [9, 2.35, 0], layer: 4, vis: false })];
    tb.vis = false; layers[0].vis = false;
    var bag = function (x, col, nm) { var g = V.add({ kind: 'group', pos: [x, 0, 7], scale: .0001 }); V.add({ mesh: M.box(2, 2.6, .5), color: col, layer: 6 }, g); V.labelFor(g, nm, { off: [0, 3.1, 0], color: '#10243E' }); return g; };
    sleep(500).then(function () { spin = true; beep(300, 600, .03); return sleep(2800); }).then(function () { spin = false; tb.vis = true; layers.forEach(function (l) { l.vis = true; }); V.camTo({ target: [4.5, 2, 2], dist: 22 }, 800);
      V.labelFor(layers[2], 'প্লাজমা', { off: [1.5, .5, 0], color: '#a87a00' }); V.labelFor(layers[1], 'অণুচক্রিকা + শ্বেত কণিকা', { off: [1.5, .2, 0], color: '#555' }); V.labelFor(layers[0], 'লোহিত কণিকা', { off: [1.5, .5, 0], color: '#8c1c1c' }); return sleep(900); }).then(function () {
      var a = bag(6, '#a3121d', 'PRBC'), b = bag(9, '#f2d27a', 'FFP'), c = bag(12, '#efe9d6', 'অণুচক্রিকা'); [a, b, c].forEach(function (g, i) { V.tw(g, { scale: 1 }, 600); });
    });
    listOv('🌀 সেন্ট্রিফিউজ', ['ব্যাগ ঘোরানো (ভারী কণিকা নিচে)', 'প্লাজমা উপরে, লোহিত কণিকা নিচে', 'আলাদা ব্যাগে স্থানান্তর'], 1500);
  };
  CU.store = function (V) {
    sceneReset({ yaw: .2, pitch: .7, dist: 24, target: [0, 3, 0] }); floorPlane(V);
    function unit(x, w, col, name, temp, bags, bagCol) {
      var g = V.add({ kind: 'group', pos: [x, 0, 0] }); V.add({ mesh: M.box(w, 6.2, 3.2), color: col, layer: 2 }, g); V.add({ mesh: M.box(w - .5, .1, 2.8), color: '#f7fbfd', pos: [0, 2.0, .2], layer: 3 }, g); V.add({ mesh: M.box(w - .5, .1, 2.8), color: '#f7fbfd', pos: [0, 4.0, .2], layer: 3 }, g);
      for (var i = 0; i < bags; i++) { var bx = -w / 2 + .8 + (i % 4) * ((w - 1.6) / 3.2), by = 2.15 + Math.floor(i / 4) * 2.0; (g.bags = g.bags || []).push(V.add({ mesh: M.box(.85, 1.0, .6), color: bagCol, pos: [bx, by, 1.2], layer: 4, alpha: 0 }, g)); }
      V.add({ mesh: M.box(1.8, .7, .1), color: '#06161f', pos: [0, 5.3, 1.65], layer: 5 }, g); V.labelFor(g, name + ' ' + temp, { off: [0, 6.9, 1], color: '#10243E' }); return g;
    }
    var a = unit(-8, 6.6, '#cfe6f3', 'রক্ত ব্যাংক ফ্রিজ', '২–৬°C', 8, '#a3121d'), b = unit(0, 6.6, '#e4efd9', 'অণুচক্রিকা এজিটেটর', '২০–২৪°C', 4, '#efe9d6'), c = unit(8, 6.6, '#dbe0f0', 'ফ্রিজার', '−১৮°C', 6, '#f2d27a');
    [a, b, c].forEach(function (u) { (u.bags || []).forEach(function (ch) { V.tw(ch, { alpha: 1 }, 500 + Math.random() * 1600); }); });
    V.hook(function (t) { (b.bags || []).forEach(function (ch) { ch.pos = [ch.pos[0], ch.pos[1], 1.2 + .07 * Math.sin(t / 200)]; }); return false; });
    listOv('🏷️ সংরক্ষণ', ['লেবেল: ব্যাগ নম্বর, গ্রুপ, মেয়াদ', 'পূর্ণ রক্ত/লোহিত কণিকা: ২–৬°C, ~৩৫ দিন', 'অণুচক্রিকা: ২০–২৪°C নাড়াচাড়ায়, ~৫ দিন', 'FFP: −১৮°C বা নিচে, ~১ বছর', 'তাপমাত্রা লগ ও অ্যালার্ম, FIFO'], 1200);
  };
  CU.crossmatch = function (V) {
    sceneReset({ yaw: .15, pitch: .55, dist: 16, target: [0, 2, 0] }); floorPlane(V);
    V.add({ mesh: M.box(14, .6, 5), color: '#6e7f8d', pos: [0, 0, 0], layer: 1 });
    var t1 = VL3D.parts.tube(V, [-4, .6, 0], { r: .6, h: 4 }), t2 = VL3D.parts.tube(V, [0, .6, 0], { r: .6, h: 4 }), t3 = VL3D.parts.tube(V, [4, .6, 0], { r: .6, h: 4 });
    V.labelFor(t1.g, 'দাতার লোহিত কণিকা', { off: [0, 4.6, 0], color: '#8c1c1c' }); V.labelFor(t2.g, 'রোগীর সিরাম', { off: [0, 4.6, 0], color: '#a87a00' }); V.labelFor(t3.g, 'মিশ্রণ', { off: [0, 4.6, 0], color: '#10243E' });
    t1.fill(.6, '#a3121d', 900).then(function () { return t2.fill(.6, '#f2d27a', 900); }).then(function () { return sleep(500); }).then(function () { return t3.fill(.3, '#c58a3a', 800); }).then(function () { return t3.fill(.6, '#d8863a', 900); }).then(function () { return sleep(800); }).then(function () { V.labelFor(t3.g, '✔ জমাট নেই = সামঞ্জস্যপূর্ণ', { off: [0, 5.4, 0], color: '#0b8f73' }); });
    listOv('🧫 মেজর ক্রসম্যাচ', ['দাতার RBC + রোগীর সিরাম', 'ইনকিউবেশন ও সেন্ট্রিফিউজ', 'জমাট/হিমোলাইসিস নেই → দেওয়া নিরাপদ', 'জমাট বাঁধলে → ব্যাগ বাতিল'], 1300);
  };
  CU.transfuse = function (V) {
    var o = armScene(V); V.set(o.tq, { vis: false }); V.set(o.site, { color: '#c9895f' });
    V.add({ mesh: M.cyl(.12, .12, 11, 8), color: '#8795a1', pos: [-4.8, 0, 2.6], layer: 2 }); V.add({ mesh: M.box(3.2, .12, .12), color: '#8795a1', pos: [-4.8, 10.6, 2.6], layer: 2 });
    var bg = bagBlood(V, [-4.8, 8, 2.6], 1);
    var path = [[-4.8, 6.2, 2.6], [-4.8, 5, 2.6], [-4.8, 3.2, 2.6], [1, 2.7, 2.2], [5.2, 2.7, .4]]; V.add({ pts: path, color: '#a3121d', width: 2.2, layer: 6 });
    var ch = V.add({ mesh: M.cyl(.28, .28, 1.2, 10), color: '#cfe5f1', alpha: .6, pos: [-4.8, 4.6, 2.6], layer: 7 }); var run = true;
    dropsAlong(V, path, '#c0121d', .22, function () { return run; });
    var dr = V.add({ dots: [{ p: [-4.8, 4.9, 2.6] }], color: '#a3121d', r: .12, layer: 8 }); V.hook(function (t) { var u = (t / 900) % 1; dr.dots = [{ p: [-4.8, 5.2 - u * .8, 2.6] }]; return false; });
    listOv('🩸 বেডসাইড চেক', ['রোগীর নাম ও আইডি ব্যান্ড ✔', 'ব্যাগ নম্বর ও গ্রুপ (দুজন মিলে) ✔', 'মেয়াদ, রং, চাকা নেই ✔', 'ভাইটাল নেওয়া ✔', 'প্রথম ১৫ মিনিট খুব ধীরে, নজর রাখা', 'বাড়ালে সর্বোচ্চ ৪ ঘণ্টায় শেষ'], 1300);
  };
  CU.monitor = function (V) {
    var o = armScene(V); V.set(o.site, { color: '#c9895f' });
    var C = { v: { hr: 78, sys: 122, dia: 78, spo2: 98, rr: 16, temp: 36.9, gcs: 15 }, rhythm: 'sinus' }; ST.C = C;
    listOv('📋 পর্যবেক্ষণ', ['১৫ মিনিট পর, প্রতি ঘণ্টায়, শেষে ভাইটাল', 'জ্বর/কাঁপুনি/ফুসকুড়ি/শ্বাসকষ্ট? → থামান', 'প্রশ্রাবের রং, পরিমাণ', 'খালি ব্যাগ ২৪ ঘণ্টা সংরক্ষণ'], 2000);
    ST.extra = function (ctx, W, Hh, now) { drawMonitor(ctx, W, Hh, now, C); }; V.hook(function () { return false; });
  };

  /* ---------- OT / সিজারের ক্লোজ-আপ ---------- */
  CU.otsetup = function (V) { var o = otRoom(V); V.set(o.pat, { pos: [0, 2.3, 16] }); V.tw(o.pat, { pos: [0, 2.3, 0] }, 2500).then(function () { team(o); }); listOv('🔪 OT-তে', ['স্ট্রেচার থেকে টেবিলে', 'মনিটর: ECG, SpO₂, BP', 'চাপ-সংবেদী জায়গায় প্যাড', 'ডায়াথার্মি প্লেট, পজিশন'], 1200); };
  CU.signin = function (V) { var o = otRoom(V); team(o); listOv('📋 সাইন-ইন', ['রোগীর পরিচয় ও সম্মতি', 'সাইট চিহ্নিত?', 'অ্যানেস্থেসিয়া মেশিন ও ওষুধ ঠিক?', 'পালস অক্সিমিটার চালু?', 'অ্যালার্জি? কঠিন এয়ারওয়ে?', 'রক্তক্ষরণ ঝুঁকি, রক্ত প্রস্তুত?'], 1100); };
  CU.timeout = function (V) {
    var o = otRoom(V); team(o); ['surg', 'asst', 'anes', 'scrub', 'circ'].forEach(function (k, i) { later(function () { if (!ST || !o[k]) return; V.tw(o[k].g, { scale: 1.12 }, 220).then(function () { return V.tw(o[k].g, { scale: 1 }, 220); }); beep(520 + i * 60, 80); }, 700 + i * 900); });
    listOv('⏱️ টাইম-আউট', ['সবাই নাম ও ভূমিকা বলেন', 'রোগীর নাম, অপারেশন, সাইট', 'অ্যান্টিবায়োটিক দেওয়া হয়েছে?', 'ইমেজিং প্রদর্শিত?', 'সম্ভাব্য জটিলতা বলা', 'সম্মতি পেলে কাটা শুরু'], 1000);
  };
  CU.scrub = function (V) {
    sceneReset({ yaw: .3, pitch: .6, dist: 17, target: [0, 2, 0] }); floorPlane(V, '#cfe3e0');
    V.add({ mesh: M.box(8, 1.4, 2.2), color: '#aebdc7', pos: [0, 0, -2], layer: 2 }); V.add({ mesh: M.box(7, .3, 1.6), color: '#d9e5ec', pos: [0, 1.4, -2], layer: 3 }); V.add({ mesh: M.cyl(.2, .2, 2.4, 8), color: '#9aa7b2', pos: [0, 1.4, -2.8], layer: 3 });
    var p = person(V, '#2f9d8f', { pos: [0, 0, 1.2], cap: '#2f9d8f', mask: true }); V.labelFor(p.g, 'সার্জিক্যাল স্ক্রাব', { off: [0, 3.2, 0], color: '#0b6e5b' });
    var hand = V.add({ mesh: M.sphere(.35, 8, 6), color: '#e6b392', pos: [-.6, 1.8, -.7], layer: 5 }), hand2 = V.add({ mesh: M.sphere(.35, 8, 6), color: '#e6b392', pos: [.6, 1.8, -.7], layer: 5 });
    V.hook(function (t) { hand.pos = [-.6 + .25 * Math.sin(t / 130), 1.8 + .12 * Math.sin(t / 90), -.9]; hand2.pos = [.6 - .25 * Math.sin(t / 130), 1.8 + .12 * Math.cos(t / 90), -.9]; return false; });
    dropsAlong(V, [[0, 2.9, -2.8], [0, 1.9, -2.5]], '#7fd0ff', 1.2, null);
    listOv('🧼 স্ক্রাবের ধাপ', ['দুই হাতে সাবান, আঙুল থেকে কনুই', 'তালু ও হাতের পিঠ', 'আঙুলের ফাঁক ও বুড়ো আঙুল', 'নখ ও আঙুলের ডগা', 'কনুইয়ের উপরে হাত তুলে ধুয়ে নেওয়া', 'জীবাণুমুক্ত তোয়ালে, গাউন, গ্লাভস'], 1100);
  };
  CU.during = function (V) {
    var o = otRoom(V); team(o); var C = { v: { hr: 76, sys: 118, dia: 72, spo2: 99, rr: 12, temp: 36.4 }, rhythm: 'sinus' }; ST.C = C;
    V.hook(function (t) { o.surg.b.pos = [0, 0, .12 * Math.sin(t / 380)]; o.asst.b.pos = [0, 0, .1 * Math.sin(t / 420 + 1)]; return false; });
    V.overlay = function (ctx, W, Hh, now) { drawMonitor(ctx, W, Hh, now, C); }; V.hook(function () { return false; });
  };
  CU.signout = function (V) { var o = otRoom(V); team(o); listOv('✅ সাইন-আউট', ['প্রক্রিয়ার নাম নিশ্চিত', 'সোয়াব, সুই, যন্ত্র গণনা মেলানো', 'নমুনার লেবেল ঠিক', 'যন্ত্রের কোনো সমস্যা?', 'রিকভারি নির্দেশনা (কে কী দেখবে)'], 1100); };
  CU.preop = function (V) {
    var o = otRoom(V); V.set(o.pat, { pos: [0, 2.3, 0] }); o.mk('nurse', 'নার্স', [3.4, 0, 1], '#ee8fb3', '#fff', false);
    V.add({ mesh: M.cyl(.12, .12, 8, 8), color: '#8795a1', pos: [-3.4, 0, 1.4], layer: 2 }); V.add({ mesh: M.box(.9, 1.4, .3), color: '#cfe5f1', alpha: .7, pos: [-3.4, 6.6, 1.4], layer: 4 });
    listOv('🛏️ প্রি-অপ', ['খালি পেট ৬–৮ ঘণ্টা (এলেক্টিভ)', 'ক্যানুলা ১৮G + তরল', 'গ্রুপ, Hb, ২ ব্যাগ ক্রসম্যাচ', 'ফোলি ক্যাথেটার', 'গয়না, নেইলপলিশ খোলা', 'ভ্রূণের হার্টরেট ঠিক', 'অ্যান্টিবায়োটিক কাটার ৬০ মিনিটের মধ্যে'], 1000);
  };
  CU.spinal = function (V) {
    sceneReset({ yaw: 1.2, pitch: .45, dist: 15, target: [0, 3, 0] }); floorPlane(V, '#cfe3e0');
    V.add({ mesh: M.box(3.2, .5, 7), color: '#bfcdd6', pos: [0, 1.0, 0], layer: 2 });
    var back = []; for (var i = 0; i <= 8; i++) { var a = i / 8; back.push([0, 2.2 + a * 3.2, -1.2 - Math.sin(a * PI) * .8]); }
    V.add({ mesh: M.tube(back, .65, 10), color: '#7fc4a8', layer: 3 }); V.add({ mesh: M.sphere(.6, 12, 8), color: '#e6b392', pos: [0, 5.9, -.3], layer: 3 });
    V.add({ mesh: M.box(2.2, 2.0, 1.8), color: '#7fc4a8', pos: [0, 1.9, 1.0], layer: 3 });
    var pt = V.add({ kind: 'group', pos: [0, 3.4, -2.2] }); V.labelFor(pt, 'L3–L4 ফাঁক', { off: [0, .9, -1], color: '#c0392b' });
    var nd = V.add({ mesh: M.cyl(.04, .04, 1.4, 6), color: '#d0d7dd', pos: [0, 3.4, -4.2], rot: [PI / 2, 0, 0], layer: 6 }); V.tw(nd, { pos: [0, 3.4, -2.4] }, 1400);
    var an = person(V, '#2c7fb8', { pos: [0, 0, -5.8], cap: '#2c7fb8', mask: true }); V.labelFor(an.g, 'অ্যানেস্থেসিস্ট', { off: [0, 3, 0], color: '#0b6e5b' });
    listOv('💉 স্পাইনাল', ['পিঠ বাঁকিয়ে বসা/কাত', 'চামড়া জীবাণুমুক্ত, স্থানীয় অবশ', 'L3–L4 ফাঁকে সুঁই, CSF ফেরা', 'ওষুধ দিয়ে সুঁই খোলা', 'T4 পর্যন্ত ঠান্ডা স্পর্শ পরীক্ষা', 'BP পড়লে ওষুধ ও তরল'], 1100);
  };

  /* সিজারের স্তর-মডেল */
  function kk(k, ms) { return Math.max(1, k * ms); }
  var CSKEYS = ['drape', 'skin', 'fascia', 'muscle', 'perit', 'bladder', 'uterus', 'deliver', 'cord', 'placenta', 'suture', 'close'];
  function csModel(V) {
    sceneReset({ yaw: .08, pitch: 1.05, dist: 17, target: [0, 3, 1.5] }); floorPlane(V, '#d5e1e0');
    var m = { zc: 2.0, V: V };
    V.add({ mesh: M.box(17, .7, 11), color: '#a67a60', pos: [0, 0, 0], layer: 0 });
    m.ut = V.add({ mesh: M.sphere(1, 22, 12), color: '#c0605e', pos: [0, 1.9, -.2], scale: [5.2, 2.2, 3.9], layer: 1 });
    m.pl = V.add({ mesh: M.disc(1.5, 16), color: '#7a1f2b', pos: [0, 1.8, -2.6], scale: [1.4, 1, 1], layer: 1.2, vis: false });
    m.bl = V.add({ mesh: M.sphere(.9, 12, 8), color: '#e8d37a', pos: [0, 1.4, 3.1], scale: [1.8, .7, 1.0], layer: 1.3 });
    function half(color, y, h, ax, alpha, layer) {
      var a = { x: 0, z: 0 }, w = ax === 'z' ? [17, h, 5.5 - 0] : [8.5, h, 11];
      var A, B;
      if (ax === 'z') { A = V.add({ mesh: M.box(17, h, m.zc + 5.5), color: color, pos: [0, y, (m.zc - 5.5) / 2], layer: layer, alpha: alpha || 1 }); B = V.add({ mesh: M.box(17, h, 5.5 - m.zc), color: color, pos: [0, y, (m.zc + 5.5) / 2], layer: layer, alpha: alpha || 1 }); }
      else { A = V.add({ mesh: M.box(8.5, h, 11), color: color, pos: [-4.25, y, 0], layer: layer }); B = V.add({ mesh: M.box(8.5, h, 11), color: color, pos: [4.25, y, 0], layer: layer }); }
      return { A: A, B: B, ax: ax, a0: A.pos.slice(), b0: B.pos.slice() };
    }
    m.per = half('#eaa6a2', 4.45, .1, 'z', .9, 2); m.mus = half('#b5483f', 4.55, .6, 'x', 1, 3); m.she = half('#f2eee2', 5.15, .12, 'z', 1, 4); m.fat = half('#f1cf6c', 5.27, .7, 'z', 1, 5); m.skn = half('#e9b794', 5.97, .22, 'z', 1, 6);
    m.drape = V.add({ kind: 'group', vis: false }); [[0, 6.25, -4.3, 17, 3.6], [0, 6.25, 5.2, 17, 1.4], [-6.9, 6.25, 1.5, 3.2, 5.0], [6.9, 6.25, 1.5, 3.2, 5.0]].forEach(function (d) { V.add({ mesh: M.box(d[3], .1, d[4]), color: '#2f9d6e', pos: [d[0], d[1], d[2]], layer: 7 }, m.drape); });
    m.baby = V.add({ kind: 'group', pos: [0, 2.9, .6], vis: false }); V.add({ mesh: M.sphere(.85, 14, 9), color: '#e7b18c', pos: [0, 0, 1.2], layer: 1.5 }, m.baby); V.add({ mesh: M.capsule(3.2, .65, 10), color: '#e7b18c', pos: [0, -.1, -1.0], rot: [0, PI / 2, 0], layer: 1.5 }, m.baby);
    m.am = V.add({ mesh: M.disc(1.5, 16), color: '#9ecfe8', pos: [0, 3.95, 1.8], scale: [1.4, 1, 1], alpha: 0, layer: 1.4 });
    m.cut = V.add({ pts: [[-4, 6.1, m.zc], [4, 6.1, m.zc]], color: '#7a0f0f', width: 3, layer: 6.5, vis: false });
    m.cutU = V.add({ pts: [[-2.2, 3.95, 1.8], [2.2, 3.95, 1.8]], color: '#5a0a12', width: 3, layer: 1.45, vis: false });
    m.cord = V.add({ pts: [[0, 3.0, 2.2], [1, 2.6, 0], [0, 2.0, -2.2]], color: '#e8d9b0', width: 3, layer: 1.6, vis: false });
    m.sut = V.add({ dots: [], color: '#223', r: .13, layer: 8 });
    return m;
  }
  function opn(V, h, d, ms) { var p = h.ax === 'z' ? [[h.a0[0], h.a0[1], h.a0[2] - d], [h.b0[0], h.b0[1], h.b0[2] + d]] : [[h.a0[0] - d, h.a0[1], h.a0[2]], [h.b0[0] + d, h.b0[1], h.b0[2]]]; return Promise.all([V.tw(h.A, { pos: p[0] }, ms), V.tw(h.B, { pos: p[1] }, ms)]); }
  var CSOPS = {
    drape: function (m, k, lab) { var V = m.V; m.drape.vis = true; V.set(m.skn.A, { color: '#c9885b' }); V.set(m.skn.B, { color: '#c9885b' }); if (lab) V.labelFor(m.drape, 'স্টেরাইল ড্রেপ', { off: [-6, 1, -4], color: '#1f7a50' }); return sleep(kk(k, 800)); },
    skin: function (m, k, lab) { var V = m.V; m.cut.vis = true; if (lab) V.labelFor(m.skn.B, 'ত্বক', { off: [-6, .8, 1.5], color: '#8b4b1c' }); return V.tw(m.cut, { alpha: 1 }, kk(k, 500)).then(function () { return opn(V, m.skn, 2.0, kk(k, 700)); }); },
    fascia: function (m, k, lab) { var V = m.V; if (lab) { V.labelFor(m.fat.B, 'চর্বি', { off: [-6, .8, 1.5], color: '#a37a00' }); V.labelFor(m.she.B, 'ফ্যাসিয়া', { off: [6, .8, 1.5], color: '#555' }); } return opn(V, m.fat, 2.1, kk(k, 700)).then(function () { return opn(V, m.she, 2.2, kk(k, 700)); }); },
    muscle: function (m, k, lab) { var V = m.V; if (lab) V.labelFor(m.mus.B, 'রেকটাস পেশি', { off: [3, .8, 4], color: '#8c2a22' }); return opn(V, m.mus, 2.8, kk(k, 900)); },
    perit: function (m, k, lab) { var V = m.V; if (lab) V.labelFor(m.per.B, 'পেরিটোনিয়াম', { off: [5, .6, 2], color: '#a13d38' }); return opn(V, m.per, 2.4, kk(k, 700)); },
    bladder: function (m, k, lab) { var V = m.V; if (lab) { V.labelFor(m.bl, 'মূত্রথলি', { off: [0, 1.4, 1], color: '#8a7400' }); } return V.tw(m.bl, { pos: [0, 1.0, 3.9], color: '#d9c15a' }, kk(k, 900)); },
    uterus: function (m, k, lab) { var V = m.V; m.cutU.vis = true; m.baby.vis = true; if (lab) V.labelFor(m.ut, 'জরায়ু (নিচের অংশে কাটা)', { off: [0, 3.3, 1.8], color: '#5a0a12' }); return V.tw(m.am, { alpha: .6 }, kk(k, 800)); },
    deliver: function (m, k, lab) { var V = m.V; m.baby.kids.forEach(function (c) { c.layer = 9; }); m.cord.layer = 9.5; m.pl.vis = true; V.set(m.ut, { alpha: .38 }); if (lab) V.labelFor(m.baby, 'শিশু', { off: [0, 3, 0], color: '#a14a1c' }); V.tw(m.am, { alpha: 0 }, kk(k, 400)); return V.tw(m.baby, { pos: [0, 8.2, 3.6], rot: [-.5, 0, 0] }, kk(k, 2200)).then(function () { m.cord.vis = true; }); },
    cord: function (m, k, lab) { var V = m.V; m.cord.pts = [[0, 7.6, 3.8], [1.4, 4.2, 1], [0, 2.0, -2.2]]; var c1 = V.add({ mesh: M.cyl(.18, .18, .7, 8), color: '#d94b4b', pos: [.6, 6, 3.4], rot: [0, 0, 1.2], layer: 9 }), c2 = V.add({ mesh: M.cyl(.18, .18, .7, 8), color: '#d94b4b', pos: [.9, 5.1, 2.8], rot: [0, 0, 1.2], layer: 9 }); if (lab) V.labelFor(c1, 'দুটি ক্ল্যাম্প, মাঝে কাটা', { off: [2, .8, 0], color: '#a02020' }); return sleep(kk(k, 900)).then(function () { m.cord.vis = false; return V.tw(m.baby, { pos: [8.5, 3.4, -2.5], rot: [0, 0, 0] }, kk(k, 1400)); }).then(function () { if (lab) { V.clearLabels(); V.labelFor(m.baby, 'নবজাতক-দল: শুকানো, গরম, APGAR', { off: [0, 3, 0], color: '#a14a1c' }); } }); },
    placenta: function (m, k, lab) { var V = m.V, sy = V.add({ mesh: M.cyl(.22, .22, 1.6, 8), color: '#cfe5f1', pos: [-6, 7, 1], rot: [0, 0, 1.0], layer: 9 }); if (lab) { V.labelFor(sy, 'অক্সিটোসিন', { off: [0, 1.1, 0], color: '#0b6e5b' }); V.labelFor(m.pl, 'প্লাসেন্টা', { off: [0, 1, 0], color: '#7a1f2b' }); } return V.tw(sy, { pos: [-2.4, 4.6, 1.4] }, kk(k, 700)).then(function () { V.tw(m.ut, { scale: [4.4, 1.9, 3.3], color: '#a8403f', alpha: .9 }, kk(k, 900)); return V.tw(m.pl, { pos: [-9, 3.5, -2.6] }, kk(k, 1200)); }).then(function () { return V.tw(sy, { alpha: 0 }, kk(k, 300)); }); },
    suture: function (m, k, lab) { var V = m.V, d = [], n = 9, i = 0; V.set(m.ut, { alpha: 1 }); if (lab) V.labelFor(m.cutU, 'জরায়ুর সেলাই', { off: [0, .8, 0], color: '#222' }); return new Promise(function (res) { (function step() { if (i >= n) { res(); return; } d.push({ p: [-2.2 + i * (4.4 / (n - 1)), 4.0, 1.8] }); m.sut.dots = d.slice(); V.dirty = true; i++; setTimeout(step, k ? 140 : 0); })(); }); },
    close: function (m, k, lab) { var V = m.V; m.baby.vis = false; m.pl.vis = false; m.cutU.vis = true; m.am.alpha = 0; return opn(V, m.per, 0, kk(k, 300)).then(function () { return opn(V, m.mus, 0, kk(k, 600)); }).then(function () { return opn(V, m.she, 0, kk(k, 600)); }).then(function () { return opn(V, m.fat, 0, kk(k, 600)); }).then(function () { return opn(V, m.skn, 0, kk(k, 600)); }).then(function () { m.drape.vis = false; m.cut.vis = true; V.set(m.cut, { color: '#3a3a52' }); var d = []; for (var i = 0; i < 10; i++) d.push({ p: [-4 + i * (8 / 9), 6.2, m.zc] }); m.sut.dots = d; if (lab) V.labelFor(m.cut, 'স্তরে স্তরে বন্ধ → ত্বক সেলাই', { off: [0, 1.0, 0], color: '#222' }); V.dirty = true; }); }
  };
  function csScene(key, V) {
    var m = csModel(V), i = CSKEYS.indexOf(key), p = Promise.resolve();
    for (var j = 0; j < i; j++) (function (kk) { p = p.then(function () { return CSOPS[kk](m, 0, false); }); })(CSKEYS[j]);
    p = p.then(function () { V.clearLabels(); return CSOPS[key](m, 1, true); });
    var cap = { drape: 'ড্রেপে শুধু অপারেশনের জায়গা খোলা', skin: 'Pfannenstiel: আড়াআড়ি কাটা', fascia: 'চর্বি সরিয়ে ফ্যাসিয়া কাটা', muscle: 'পেশি কেটে নয়, টেনে আলাদা করা', perit: 'পেরিটোনিয়াম সাবধানে খোলা', bladder: 'মূত্রথলি নিচে সরানো', uterus: 'নিচের অংশে আড়াআড়ি কাটা', deliver: 'মাথা তুলে শিশুর জন্ম (X-ray ভিউ)', cord: 'নাড়ি কাটা, শিশু নবজাতক-দলের কাছে', placenta: 'অক্সিটোসিন, প্লাসেন্টা বের করা', suture: 'জরায়ুর কাটা সেলাই', close: 'উল্টো ক্রমে স্তর বন্ধ ও ত্বক সেলাই' }[key];
    V.overlay = function (ctx, W, Hh) { ctx.save(); ctx.fillStyle = 'rgba(8,20,30,.78)'; ctx.font = '700 13px "Hind Siliguri",system-ui'; var w = ctx.measureText(cap).width + 24; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(8, 8, w, 28, 8) : ctx.rect(8, 8, w, 28); ctx.fill(); ctx.fillStyle = '#38f5b4'; ctx.fillText(cap, 20, 27); ctx.restore(); };
    return p;
  }
  CSKEYS.forEach(function (k) { CU[k] = function (V) { return csScene(k, V); }; });

  /* ================= UI ================= */
  var tab = 'tour', INFO = {
    reception: 'এখানে রোগী নাম লিখিয়ে রেজিস্ট্রেশন করেন। কোন বিভাগে ও কোন রুমে যাবেন তা বলে দেওয়া হয়।', emergency: 'জরুরি রোগী প্রথমে এখানে আসে। ট্রায়াজ (গুরুত্ব অনুযায়ী বাছাই) হয়, তারপর ওয়ার্ড/ICU/OT-তে স্থানান্তর।',
    bloodbank: 'দাতার রক্ত সংগ্রহ, গ্রুপিং, সংরক্ষণ, ক্রসম্যাচ ও ইস্যু।', pathlab: 'রক্ত, প্রস্রাব, কালচার ও TTI স্ক্রিনিং পরীক্ষা।', icu: 'সংকটাপন্ন রোগীর ২৪ ঘণ্টা নিবিড় পর্যবেক্ষণ, ভেন্টিলেটর ও ভ্যাসোপ্রেসর।',
    ot1: 'সাধারণ সার্জারির অপারেশন থিয়েটার। জীবাণুমুক্ত পরিবেশ ও WHO চেকলিস্ট।', ot2: 'সিজারসহ প্রসূতি অপারেশনের থিয়েটার।', labour: 'স্বাভাবিক প্রসবের জন্য বিছানা, CTG ও ধাত্রী।', nicu: 'নবজাতকের নিবিড় পরিচর্যা: ইনকিউবেটর, ফোটোথেরাপি।',
    preop: 'অপারেশনের আগে-পরে রোগীর অপেক্ষা ও রিকভারি।', pharmacy: 'প্রেসক্রিপশন দেখে ওষুধ বিতরণ।', radiology: 'X-ray ও CT (এই মডেলে শুধু X-ray)।', ecg: 'হৃদস্পন্দনের বৈদ্যুতিক রেকর্ড।', usg: 'আল্ট্রাসনোগ্রাফি (গর্ভাবস্থা ও পেটের পরীক্ষা)।',
    nurse2: 'নার্সরা এখান থেকে ওয়ার্ড-কেবিনের রোগীর ওষুধ ও পর্যবেক্ষণ পরিচালনা করেন।', opd102: 'গাইনি বিশেষজ্ঞ: প্রসব-পূর্ব সেবা, সিজারের সিদ্ধান্ত।', ccu: 'হৃদরোগীর নিবিড় পর্যবেক্ষণ।'
  };
  var CASES = { blood: { ic: '🩸', n: 'রক্তদান থেকে ট্রান্সফিউশন', d: 'অনুরোধ পোস্ট → দাতা সাড়া → স্ক্রিনিং, দান, পরীক্ষা, সংরক্ষণ, ক্রসম্যাচ, রক্ত দেওয়া', steps: H.BLOOD },
    csec: { ic: '👶', n: 'সিজারিয়ান সেকশন', d: 'সম্মতি থেকে রিকভারি: স্তরে স্তরে ৩D অ্যানিমেশনে', steps: H.CSEC }, ot: { ic: '🔪', n: 'অপারেশন থিয়েটার: WHO চেকলিস্ট', d: 'সাইন-ইন, স্ক্রাব, টাইম-আউট, সাইন-আউট', steps: H.OT } };

  function stars(m) { return m === 0 ? 3 : m <= 2 ? 2 : 1; }
  function award(id, mistakes, xpBase) {
    var first = !P.done[id], st = stars(mistakes), xp = first ? Math.max(Math.round(xpBase * (1 - mistakes * .08)), Math.round(xpBase * .4)) : 10, old = P.done[id] || {};
    P.done[id] = { st: Math.max(st, old.st || 0), n: (old.n || 0) + 1, ts: Date.now() }; save();
    var aw = null; try { if (window.GEBGM && GEBGM.award) aw = GEBGM.award({ xp: xp, session: 1 }); } catch (e) { }
    return { xp: xp, st: st, first: first, aw: aw };
  }
  function starHtml(n) { return '<span class="hp-star">' + '★'.repeat(n) + '<span class="off">' + '★'.repeat(3 - n) + '</span></span>'; }

  function render() {
    clearTimers(); if (ST && ST.V) ST.V.destroy(); ST = null; RUN = null;
    mount.innerHTML = '<div class="hp"><div class="seg tabs hp-tabs" role="tablist" aria-label="হাসপাতাল">' +
      [['tour', '🏥 হাসপাতাল ঘুরুন'], ['blood', '🩸 রক্তের অনুরোধ ও দান'], ['ops', '🔪 অপারেশন ও সিজার'], ['icu', '🫀 ICU ও জরুরি']].concat(XT.map(function (x) { return [x.id, x.label]; })).map(function (t) { return '<button type="button" role="tab" data-t="' + t[0] + '" aria-selected="' + (t[0] === tab) + '">' + t[1] + '</button>'; }).join('') +
      '</div><div class="hp-body" id="hpBody"></div><p class="hp-foot">⚠️ এটি শিক্ষামূলক সিমুলেশন। সব কেস কাল্পনিক ও সরলীকৃত; নিয়ম প্রতিষ্ঠানভেদে আলাদা হতে পারে। বাস্তব রোগীর সিদ্ধান্তের জন্য নয়।</p></div>';
    $('.hp-tabs').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; tab = b.dataset.t; render(); });
    var fn = ({ tour: renderTour, blood: renderBlood, ops: renderOps, icu: renderIcu })[tab];
    if (!fn) XT.forEach(function (x) { if (x.id === tab) fn = x.fn; });
    if (!fn) { tab = 'tour'; fn = renderTour; }
    fn();
  }
  /* বাইরের ফাইলের (hospital-flow.js) ট্যাব: XT-তে নাম লিখিয়ে রাখলে render() নিজে বসিয়ে নেয় */
  var XT = [];

  /* --- হাসপাতাল ঘুরুন --- */
  function renderTour() {
    var body = $('#hpBody'), role = 'walk';
    body.innerHTML = '<div class="hp-card hp-intro"><div><h3>৪ তলার ভার্চুয়াল হাসপাতাল</h3><p class="hp-mut">রুমে ট্যাপ করুন বা তালিকা থেকে বাছুন। আপনি লিফটে উঠে সঠিক তলায় যাবেন, করিডোর ধরে ঠিক রুমে পৌঁছাবেন। ক্যামেরা ঘুরাতে ড্র্যাগ, জুম করতে পিঞ্চ/স্ক্রল।</p></div>' +
      '<div class="hp-role" role="group" aria-label="কীভাবে যাবেন"><button type="button" class="on" data-r="walk">🚶 হেঁটে</button><button type="button" data-r="chair">♿ হুইলচেয়ারে</button></div></div>' +
      '<div class="hp-main"><div id="hpStageHost"></div><div class="hp-side"><div class="hp-card"><h4>লিফট</h4><div class="hp-floorbar">' + H.FLOORS.map(function (f) { return '<button type="button" data-f="' + f.n + '"><b>' + bn(f.n) + '</b><small>' + f.name + '</small></button>'; }).join('') + '</div></div>' +
      '<div class="hp-card" id="hpRoomInfo"><h4>রুম বাছুন</h4><p class="hp-mut">ম্যাপে কোনো রুমে ট্যাপ করুন।</p></div><div class="hp-card"><h4>এই তলার রুম</h4><div class="hp-rooms" id="hpRooms"></div></div></div></div>';
    mkStage($('#hpStageHost'), { role: 'walk' });
    showFloor(0, null); spawnAv([H.ENTRANCE.x, 0]); ST.loc = { floor: 0, x: H.ENTRANCE.x, z: 0 };
    function rooms() { $('#hpRooms').innerHTML = H.FLOORS[ST.floor].rooms.filter(function (r) { return !r.lift; }).map(function (r) { return '<button type="button" class="hp-rm" data-r="' + r.id + '"><span>' + r.ic + '</span> ' + esc(r.n) + '</button>'; }).join(''); }
    var busy = false;
    function goRoom(id) {
      var r = H.ROOM[id]; if (busy) { say('একটু অপেক্ষা করুন…', 1500); return; }
      $('#hpRoomInfo').innerHTML = '<h4>' + r.ic + ' ' + esc(r.n) + '</h4><p class="hp-mut"><b>' + esc(H.dirText(r)) + '</b></p><p>' + esc(INFO[id] || 'এই রুমে রোগী ও কর্মীরা নিজের নিজের কাজ করেন।') + '</p><p class="hp-go">🚶 যাচ্ছেন…</p>';
      busy = true; say('📢 ' + r.n + ' → ' + H.floorWord(r.floor), 4000);
      travel(id).then(function (ok) { busy = false; if (!ok) return; rooms(); updateFloorBar(); say('✅ ' + r.n + ' এ পৌঁছেছেন', 3000); var g = $('#hpRoomInfo .hp-go'); if (g) g.textContent = '✔ পৌঁছেছেন'; });
    }
    ST.onRoom = function (id) { if (!H.ROOM[id].lift) goRoom(id); else goFloorMenu(); };
    function goFloorMenu() { say('নিচের লিফট বাটনে তলা বেছে নিন', 2500); }
    body.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.r && b.classList.contains('hp-rm')) goRoom(b.dataset.r);
      else if (b.dataset.f != null) { goRoom('lift' + b.dataset.f); }
      else if (b.closest('.hp-role')) { ST.role = b.dataset.r; $$('.hp-role button').forEach(function (x) { x.classList.toggle('on', x === b); }); var l = ST.loc; if (ST.mode === 'map') { var pos = ST.av ? [ST.av.g.pos[0], ST.av.g.pos[2]] : [l.x, l.z]; ST.V.remove(ST.av.g); spawnAv(pos); } }
    });
    rooms();
  }

  /* --- রক্ত --- */
  var REQ = null;
  function renderBlood() {
    var body = $('#hpBody'), d = CASES.blood, rec = P.done.blood;
    body.innerHTML = '<div class="hp-card"><h3>🩸 রক্তের জন্য অনুরোধ পোস্ট করুন</h3><p class="hp-mut">রোগীর গ্রুপ ও কতটুকু লাগবে দিন। ভার্চুয়াল দাতারা সাড়া দেবে। সঠিক দাতা বেছে নিন, তারপর তাঁর হাসপাতাল-যাত্রা (পরীক্ষা, দান, সংরক্ষণ, ট্রান্সফিউশন) ধাপে ধাপে চলুন।</p>' +
      '<div class="hp-form"><label>রোগীর গ্রুপ<select id="rqG">' + H.GROUPS.map(function (g) { return '<option>' + g + '</option>'; }).join('') + '</select></label><label>কত ব্যাগ<select id="rqU"><option>১</option><option>২</option><option>৩</option></select></label><label>কোথায়<select id="rqR"><option value="cab203">কেবিন ২০৩</option><option value="icu">ICU</option><option value="wardM">পুরুষ ওয়ার্ড</option><option value="emergency">জরুরি বিভাগ</option></select></label><button type="button" class="hp-btn pri" id="rqPost">📣 পোস্ট করুন</button></div></div>' +
      '<div id="rqBoard"></div>' +
      '<div class="hp-card"><h4>অথবা সরাসরি দাতার যাত্রা শুরু</h4><p class="hp-mut">' + d.d + (rec ? ' · সেরা: ' + starHtml(rec.st) : '') + '</p><button type="button" class="hp-btn" id="rqDirect">🚶 দাতা হিসেবে শুরু করুন</button></div>';
    $('#rqPost').onclick = postReq;
    $('#rqDirect').onclick = function () { var g = H.GROUPS[Math.floor(Math.random() * 8)]; startRun('blood', { donor: { n: 'আপনি', g: g, sex: 'M', age: 24, kg: 66, lastDays: 200 }, recip: { g: 'B+', room: 'cab203' } }); };
    if (REQ) boardRender();
  }
  function postReq() {
    var g = $('#rqG').value, u = $('#rqU').value, rm = $('#rqR').value, uSel = ['১', '২', '৩'].indexOf(u) + 1;
    var okList = H.DONOR_POOL.filter(function (d) { return H.canGive(d.g, g) && !H.eligibility(d).length; }), bad = H.DONOR_POOL.filter(function (d) { return okList.indexOf(d) < 0; });
    function pick(a, n) { var b = a.slice(), o = []; while (b.length && o.length < n) o.push(b.splice(Math.floor(Math.random() * b.length), 1)[0]); return o; }
    var list = pick(okList, Math.min(2, okList.length)).concat(pick(bad, 3)).sort(function () { return Math.random() - .5; });
    if (!list.some(function (d) { return okList.indexOf(d) >= 0; })) list.unshift({ n: 'নাঈম', sex: 'M', g: g, age: 26, kg: 70, dist: '২ কিমি', lastDays: 200 });
    REQ = { g: g, u: uSel, room: rm, shown: 0, list: list, picked: null, fb: {} };
    boardRender(); clearTimers(); list.forEach(function (d, i) { later(function () { if (!REQ) return; REQ.shown = i + 1; boardRender(true); beep(660 + i * 80, 90); }, 900 + i * 900); });
  }
  function boardRender() {
    var bd = $('#rqBoard'); if (!bd || !REQ) return;
    var h = '<div class="hp-card hp-req"><div class="hp-reqhead"><span class="hp-bld">' + REQ.g + '</span><div><b>জরুরি: ' + REQ.g + ' রক্ত লাগবে (' + bn(REQ.u) + ' ব্যাগ)</b><div class="hp-mut">' + esc(H.ROOM[REQ.room].n) + ' · ' + H.floorWord(H.ROOM[REQ.room].floor) + '</div></div></div>';
    if (!REQ.shown) h += '<p class="hp-wait">⏳ ভার্চুয়াল দাতারা সাড়া দিচ্ছে…</p>';
    h += '<div class="hp-donors">' + REQ.list.slice(0, REQ.shown).map(function (d, i) {
      var fb = REQ.fb[i]; return '<div class="hp-donor' + (fb ? (fb.ok ? ' ok' : ' no') : '') + '"><div class="hp-av">' + esc(d.n[0]) + '</div><div class="hp-di"><b>' + esc(d.n) + ' · ' + d.g + '</b><span>' + (d.sex === 'M' ? 'পুরুষ' : 'নারী') + ', ' + bn(d.age) + ' বছর, ' + bn(d.kg) + ' কেজি · ' + (d.dist || '৩ কিমি') + '</span><span>শেষ রক্তদান: ' + (d.lastDays > 365 ? 'এক বছরের বেশি আগে' : bn(d.lastDays) + ' দিন আগে') + '</span>' + (fb ? '<em>' + fb.t + '</em>' : '') + '</div>' +
        (fb && fb.ok ? '<button type="button" class="hp-btn pri sm" data-go="' + i + '">যাত্রা শুরু ➜</button>' : '<button type="button" class="hp-btn sm" data-pk="' + i + '">✅ গ্রহণ</button>') + '</div>';
    }).join('') + '</div></div>';
    bd.innerHTML = h;
    bd.onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.pk != null) { var i = +b.dataset.pk, d = REQ.list[i], comp = H.canGive(d.g, REQ.g), why = H.eligibility(d);
        if (comp && !why.length) REQ.fb[i] = { ok: true, t: '✔ সামঞ্জস্যপূর্ণ ও দান-যোগ্য। ' + d.g + ' থেকে ' + REQ.g + '-কে দেওয়া যায়।' };
        else REQ.fb[i] = { ok: false, t: '✘ ' + (!comp ? d.g + ' এর রক্ত ' + REQ.g + ' রোগীকে দেওয়া যায় না (ABO/Rh অমিল)। ' : '') + (why.length ? 'দান-অযোগ্য: ' + why.join('; ') + '।' : '') };
        boardRender(); }
      else if (b.dataset.go != null) startRun('blood', { donor: REQ.list[+b.dataset.go], recip: { g: REQ.g, room: REQ.room } });
    };
  }

  /* --- অপারেশন ও সিজার, ICU তালিকা --- */
  function caseCard(id, c) { var rec = P.done[id]; return '<button type="button" class="hp-case" data-c="' + id + '"><div class="th">' + c.ic + (rec ? '<em>✔ সম্পন্ন</em>' : '') + '</div><div class="bd"><b>' + c.n + '</b><span>' + c.d + '</span><div class="ft">' + bn(c.steps ? c.steps.length : 0) + ' ধাপ' + (rec ? ' · ' + starHtml(rec.st) : '') + '</div></div></button>'; }
  function renderOps() {
    var body = $('#hpBody'); body.innerHTML = '<p class="hp-mut">প্রতিটি ধাপে আপনি হাসপাতালের ভেতরে হাঁটবেন, ৩D ক্লোজ-আপ দেখবেন, কারণ জানবেন ও ছোট কুইজ দেবেন।</p><div class="hp-grid">' + caseCard('csec', CASES.csec) + caseCard('ot', CASES.ot) + '</div>';
    body.onclick = function (e) { var b = e.target.closest('.hp-case'); if (b) startRun(b.dataset.c, {}); };
  }
  function renderIcu() {
    var body = $('#hpBody'); body.innerHTML = '<p class="hp-mut">রোগী ICU-তে এসেছে। মনিটর দেখুন, ABCDE ধরে কাজ বেছে নিন। ভুল ওষুধে ভাইটাল খারাপ হবে, সঠিক ক্রমে ঠিক হবে।</p><div class="hp-grid">' + H.ICU.map(function (c) { var rec = P.done['icu_' + c.id]; return '<button type="button" class="hp-case" data-i="' + c.id + '"><div class="th">' + c.ic + (rec ? '<em>✔ সম্পন্ন</em>' : '') + '</div><div class="bd"><b>' + c.n + '</b><span>' + esc(c.pt.slice(0, 90)) + '…</span><div class="ft">লেভেল ' + bn(c.lv) + (rec ? ' · ' + starHtml(rec.st) : '') + '</div></div></button>'; }).join('') + '</div>';
    body.onclick = function (e) { var b = e.target.closest('.hp-case'); if (b) runIcu(H.ICU.filter(function (c) { return c.id === b.dataset.i; })[0]); };
  }

  /* --- ধাপে ধাপে রানার --- */
  function startRun(kind, ctx) {
    clearTimers(); if (ST && ST.V) ST.V.destroy();
    var c = CASES[kind]; RUN = { kind: kind, steps: c.steps, i: -1, mistakes: 0, q: {}, donor: ctx.donor, recip: ctx.recip, locs: {}, token: 0 };
    var body = $('#hpBody');
    body.innerHTML = '<button type="button" class="hp-back" id="hpBack">← ফিরে যান</button><div class="hp-run"><div id="hpStageHost"></div><div class="hp-panel" id="hpPanel"></div></div>';
    body.onclick = null; $('#hpBack').onclick = function () { render(); };
    mkStage($('#hpStageHost')); ST.loc = { floor: 0, x: H.ENTRANCE.x, z: 0 }; showFloor(0, null); spawnAv([H.ENTRANCE.x, 0]);
    if (kind === 'blood') {
      $('#hpPanel').innerHTML = '<div class="hp-card"><h3>' + c.ic + ' ' + c.n + '</h3><p><b>দাতা:</b> ' + esc(RUN.donor.n) + ' (' + RUN.donor.g + ') &nbsp;➜&nbsp; <b>রোগী:</b> ' + RUN.recip.g + ', ' + esc(H.ROOM[RUN.recip.room].n) + '</p><p class="hp-mut">আপনি দাতা। হাসপাতালের গেট থেকে যাত্রা শুরু।</p><button type="button" class="hp-btn pri" id="hpGo">▶ শুরু করুন</button></div>';
      $('#hpGo').onclick = function () { goStep(0); };
    } else goStep(0);
  }
  function goStep(i) {
    var R = RUN, s = R.steps[i]; if (!s) return; R.i = i; R.token++; var tk = R.token;
    var stepsHtml = R.steps.map(function (x, k) { return '<i class="' + (k < i ? 'd' : k === i ? 'c' : '') + '"></i>'; }).join('');
    var room = s.go ? H.ROOM[s.go === 'cab203' && R.kind === 'blood' ? R.recip.room : s.go] : null; var tgt = room ? room.id : null;
    var h = '<div class="hp-card"><div class="hp-steps">' + stepsHtml + '</div><div class="hp-sn">ধাপ ' + bn(i + 1) + ' / ' + bn(R.steps.length) + '</div><h3>' + esc(s.t) + '</h3>' +
      (room ? '<div class="hp-loc">📍 ' + room.ic + ' ' + esc(room.n) + ' · ' + esc(H.dirText(room)) + '</div>' : '') +
      '<p>' + esc(s.do) + '</p><details class="hp-why" open><summary>কেন এভাবে?</summary><p>' + esc(s.why) + '</p></details><div id="hpIx"></div><div id="hpQ"></div>' +
      '<div class="hp-nav"><button type="button" class="hp-btn" id="hpPrev"' + (i === 0 ? ' disabled' : '') + '>◀ আগের</button>' + (s.anim ? '<button type="button" class="hp-btn" id="hpRe">↻ আবার দেখুন</button>' : '') + '<button type="button" class="hp-btn pri" id="hpNext">' + (i === R.steps.length - 1 ? 'শেষ করুন ✔' : 'পরের ধাপ ▶') + '</button></div></div>';
    $('#hpPanel').innerHTML = h;
    $('#hpPrev').onclick = function () { goStep(i - 1); }; $('#hpNext').onclick = function () { if (i === R.steps.length - 1) finishRun(); else goStep(i + 1); };
    if ($('#hpRe')) $('#hpRe').onclick = function () { playAnim(s); };
    if (s.interact === 'grouping') groupingUi(s);
    if (s.q) quizUi(s, i);
    var ps = Promise.resolve();
    if (tgt) {
      var l0 = R.locs[i] || (R.locs[i] = JSON.parse(JSON.stringify(ST.loc)));
      ps = ps.then(function () { if (ST.mode !== 'map' || !ST.av) { showFloor(l0.floor, tgt); spawnAv([l0.x, l0.z]); ST.loc = l0; } say('🚶 ' + room.n + ' এর দিকে যাচ্ছেন', 3000); return travel(tgt); }).then(function (ok) { if (ok) say('✅ ' + room.n, 2500); });
    }
    if (s.anim) ps.then(function () { if (tk !== R.token) return; return sleep(tgt ? 500 : 0); }).then(function () { if (tk !== R.token) return; playAnim(s); });
    else if (!tgt && ST.mode !== 'map') ps.then(function () { showFloor(ST.loc.floor, null); spawnAv([ST.loc.x, ST.loc.z]); });
  }
  function bound(V) {
    var S = ST, gen = S.gen + 1, P = Object.create(V), dummy = function () { return { kids: [], pos: [0, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1], data: {}, vis: false, alpha: 0 }; };
    ['add', 'tw', 'labelFor', 'set', 'camTo', 'hook', 'clearLabels', 'remove'].forEach(function (k) {
      P[k] = function () { if (S.gen > gen) return (k === 'tw' || k === 'camTo') ? Promise.resolve() : (k === 'add' ? dummy() : null); return V[k].apply(V, arguments); };
    });
    Object.defineProperty(P, 'overlay', { get: function () { return V.overlay; }, set: function (f) { if (S.gen <= gen) V.overlay = f; } });
    return P;
  }
  function playAnim(s) {
    if (!ST) return; var f = CU[s.anim]; if (!f) return; ST.mode = 'close'; ST.lift.hidden = true; var V = ST.V;
    try { var r = f(bound(V)); } catch (e) { console.error('anim', s.anim, e); }
    if (s.anim === 'consent' || s.anim === 'vitals') { }
  }
  function groupingUi(s) {
    var R = RUN, el = $('#hpIx'); el.innerHTML = '<div class="hp-gr"><b>দাতার রক্তের গ্রুপ কী?</b><div class="hp-opts">' + H.GROUPS.map(function (g) { return '<button type="button" class="hp-opt" data-g="' + g + '">' + g + '</button>'; }).join('') + '</div><p class="hp-fb" id="hpGfb"></p></div>';
    el.onclick = function (e) {
      var b = e.target.closest('.hp-opt'); if (!b) return; var g = b.dataset.g, fb = $('#hpGfb');
      if (g === R.donor.g) { b.classList.add('ok'); fb.className = 'hp-fb good'; fb.innerHTML = '✔ ঠিক! ' + g + ': ' + (g.indexOf('A') >= 0 ? 'Anti-A জমাট' : 'Anti-A মসৃণ') + ', ' + (g.indexOf('B') >= 0 ? 'Anti-B জমাট' : 'Anti-B মসৃণ') + ', ' + (g.slice(-1) === '+' ? 'Anti-D জমাট (Rh+)' : 'Anti-D মসৃণ (Rh−)') + '।'; }
      else { b.classList.add('no'); R.mistakes++; fb.className = 'hp-fb bad'; fb.textContent = '✘ আবার ভালো করে দেখুন: কোন কূপে দানা-দানা জমাট বেঁধেছে? (Anti-A=A, Anti-B=B, Anti-D=Rh+)'; }
    };
  }
  function quizUi(s, i) {
    var R = RUN, q = s.q, el = $('#hpQ'), done = R.q[i];
    el.innerHTML = '<div class="hp-quiz"><b>🧠 ' + esc(q.q) + '</b><div class="hp-opts v">' + q.o.map(function (o, k) { return '<button type="button" class="hp-opt" data-k="' + k + '">' + esc(o) + '</button>'; }).join('') + '</div><p class="hp-fb" id="hpQfb"></p></div>';
    function mark(k, ok) { $$('.hp-opt', el)[k].classList.add(ok ? 'ok' : 'no'); }
    if (done) { mark(q.a, true); $('#hpQfb').className = 'hp-fb good'; $('#hpQfb').textContent = '✔ ' + q.e; }
    el.onclick = function (e) {
      var b = e.target.closest('.hp-opt'); if (!b || R.q[i]) return; var k = +b.dataset.k, fb = $('#hpQfb');
      if (k === q.a) { R.q[i] = 1; mark(k, true); fb.className = 'hp-fb good'; fb.textContent = '✔ ' + q.e; }
      else { mark(k, false); b.disabled = true; R.mistakes++; fb.className = 'hp-fb bad'; fb.textContent = '✘ ঠিক হয়নি, আবার ভাবুন।'; }
    };
  }
  function finishRun() {
    var R = RUN, c = CASES[R.kind], f = award(R.kind, R.mistakes, R.kind === 'blood' ? 120 : R.kind === 'csec' ? 140 : 90);
    $('#hpPanel').innerHTML = '<div class="hp-card hp-res"><h3>🎉 যাত্রা শেষ</h3><div class="big">' + starHtml(f.st) + '</div><p>ভুল উত্তর: <b>' + bn(R.mistakes) + '</b> · <b>+' + bn(f.xp) + ' XP</b>' + (f.first ? '' : ' (আবার করার জন্য কম XP)') + '</p>' +
      (R.kind === 'blood' ? '<p>একজন দাতার এক ব্যাগ থেকে সর্বোচ্চ ৩ জন রোগী উপকার পেতে পারেন। তাই নিয়মিত স্বেচ্ছায় রক্তদান জীবন বাঁচায়। ❤️</p>' : R.kind === 'csec' ? '<p>মনে রাখুন স্তরের ক্রম: ত্বক → চর্বি → ফ্যাসিয়া → পেশি → পেরিটোনিয়াম → জরায়ু। বন্ধ করার সময় উল্টো ক্রমে।</p>' : '<p>WHO চেকলিস্টের তিন বিরতি: সাইন-ইন, টাইম-আউট, সাইন-আউট।</p>') +
      (f.aw && f.aw.newBadges && f.aw.newBadges.length ? '<p>' + f.aw.newBadges.map(function (b) { return b.icon + ' ' + esc(b.name); }).join(', ') + '</p>' : '') + '<div class="hp-nav"><button type="button" class="hp-btn" id="hpAgain">↻ আবার</button><button type="button" class="hp-btn pri" id="hpHome">তালিকায় ফিরুন</button></div></div>';
    $('#hpAgain').onclick = function () { startRun(R.kind, { donor: R.donor, recip: R.recip }); }; $('#hpHome').onclick = render;
  }

  /* --- ICU রানার --- */
  function runIcu(c) {
    clearTimers(); if (ST && ST.V) ST.V.destroy();
    var body = $('#hpBody'); body.onclick = null;
    var C = { v: JSON.parse(JSON.stringify(c.v)), rhythm: c.rhythm, cpr: false, flash: 0 }, S = { has: {}, pts: 100, mistakes: 0, turns: 0, over: false, log: [] };
    body.innerHTML = '<button type="button" class="hp-back" id="hpBack">← ফিরে যান</button><div class="hp-run"><div id="hpStageHost"></div><div class="hp-panel" id="hpPanel"></div></div>'; $('#hpBack').onclick = render;
    mkStage($('#hpStageHost')); var V = ST.V; sceneReset({ yaw: .55, pitch: .6, dist: 19, target: [0, 0, 1] }); floorPlane(V, '#d9e5e8');
    V.add({ mesh: M.box(4, .9, 9), color: '#e8eef2', pos: [0, 1.0, 0], layer: 2 }); V.add({ mesh: M.box(3.2, .3, 3.6), color: '#7fb6d9', pos: [0, 1.9, 1.6], layer: 3 });
    V.add({ mesh: M.box(2.3, .95, 3.6), color: '#9fd0e8', pos: [0, 1.9, .9], layer: 3 }); V.add({ mesh: M.sphere(.8, 12, 8), color: '#e6b392', pos: [0, 2.5, -2.9], layer: 3 }); V.add({ mesh: M.box(1.7, .3, 1.2), color: '#f4f6f8', pos: [0, 1.9, -3.0], layer: 2 });
    V.add({ mesh: M.box(2.4, 2.6, 1.4), color: '#2d3f4f', pos: [-5.6, 0, -3], layer: 3 }); V.add({ mesh: M.box(1.9, 1.3, .12), color: '#0b1c26', pos: [-5.6, 2.8, -2.6], rot: [-.2, 0, 0], layer: 4, glow: .1 });
    V.add({ mesh: M.box(2.6, 2.2, 1.6), color: '#cdd6dc', pos: [5.4, 0, -2.4], layer: 3 }); V.labelFor(V.add({ kind: 'group', pos: [5.4, 2.2, -2.4] }), 'ভেন্টিলেটর', { off: [0, .8, 0], color: '#10243E' });
    V.add({ mesh: M.cyl(.12, .12, 9, 8), color: '#8795a1', pos: [3.6, 0, 3], layer: 2 }); V.add({ mesh: M.box(.9, 1.5, .3), color: '#cfe5f1', alpha: .75, pos: [3.6, 7.2, 3], layer: 4 });
    var df = person(V, '#2f9d8f', { pos: [3.5, 0, .5], cap: '#2f9d8f', mask: true }), nr = person(V, '#ee8fb3', { pos: [-3.6, 0, 1.8], cap: '#fff' }); V.labelFor(df.g, 'আপনি', { off: [0, 3, 0], color: '#0b6e5b' }); V.labelFor(nr.g, 'নার্স', { off: [0, 3, 0], color: '#0b6e5b' });
    var dfx = V.add({ mesh: M.box(1.6, 1.2, .8), color: '#d94b4b', pos: [5.0, 0, 3.5], layer: 3 }); V.labelFor(dfx, 'ডিফিব্রিলেটর', { off: [0, 1.8, 0], color: '#a02020' });
    V.overlay = function (ctx, W, Hh, now) { drawMonitor(ctx, W, Hh, now, C); }; V.hook(function () { return false; }); ST.C = C;
    var panel = $('#hpPanel'), grp = {}; c.actions.forEach(function (a) { (grp[a.cat] = grp[a.cat] || []).push(a); });
    var order = ['শুরু', 'A', 'B', 'C', 'D', 'E', 'টেস্ট', 'ওষুধ', 'শক', 'চূড়ান্ত', 'ক্ষতিকর'], catN = { A: 'A · শ্বাসপথ', B: 'B · শ্বাস', C: 'C · সংবহন', D: 'D · সচেতনতা', E: 'E · পরিবেশ/অন্যান্য', 'টেস্ট': '🔬 পরীক্ষা', 'ওষুধ': '💊 ওষুধ', 'শুরু': '🆘 শুরু', 'শক': '⚡ শক', 'চূড়ান্ত': '🏁 চূড়ান্ত', 'ক্ষতিকর': '❓ অন্যান্য সিদ্ধান্ত' };
    var acts = []; order.forEach(function (k) { if (grp[k]) acts.push(k); }); Object.keys(grp).forEach(function (k) { if (acts.indexOf(k) < 0) acts.push(k); });
    function vit() { var v = C.v; return '<div class="hp-vit"><span><b>HR</b>' + (v.hr || '--') + '</span><span><b>BP</b>' + (v.sys ? v.sys + '/' + v.dia : '--') + '</span><span><b>SpO₂</b>' + (v.spo2 ? v.spo2 + '%' : '--') + '</span><span><b>RR</b>' + (v.rr || '--') + '</span><span><b>T</b>' + v.temp.toFixed(1) + '</span><span><b>GCS</b>' + v.gcs + '</span></div>'; }
    function draw() {
      panel.innerHTML = '<div class="hp-card"><h3>' + c.ic + ' ' + c.n + '</h3><p>' + esc(c.pt) + '</p><div id="hpVit">' + vit() + '</div><p class="hp-mut">🎯 ' + esc(c.goal) + '</p><details class="hp-why"><summary>ইঙ্গিত</summary><p>' + esc(c.hint) + '</p></details><div class="hp-score">স্কোর: <b id="hpPts">' + bn(Math.max(0, S.pts)) + '</b></div></div>' +
        '<div class="hp-card" id="hpActs">' + acts.map(function (k) { return '<div class="hp-ag"><h5>' + (catN[k] || k) + '</h5><div class="hp-ab">' + grp[k].map(function (a) { return '<button type="button" class="hp-act' + (S.has[a.id] ? ' used' : '') + (a.bad ? ' risk' : '') + '" data-a="' + a.id + '"' + (S.over ? ' disabled' : '') + '>' + esc(a.l) + '</button>'; }).join('') + '</div></div>'; }).join('') + '</div><div class="hp-card"><h4>লগ</h4><div class="hp-log" id="hpLog">' + (S.log.length ? S.log.map(function (l) { return '<p class="' + l.k + '">' + esc(l.t) + '</p>'; }).join('') : '<p class="hp-mut">কাজ বেছে নিন…</p>') + '</div></div>';
      var lg = $('#hpLog'); if (lg) lg.scrollTop = lg.scrollHeight;
    }
    function clamp(v) { v.hr = Math.max(0, Math.min(200, Math.round(v.hr))); v.sys = Math.max(0, Math.min(230, Math.round(v.sys))); v.dia = Math.max(0, Math.min(140, Math.round(v.dia))); v.spo2 = Math.max(0, Math.min(100, Math.round(v.spo2))); v.rr = Math.max(0, Math.round(v.rr)); v.gcs = Math.max(3, Math.min(15, Math.round(v.gcs))); }
    function end(ok, msg) {
      S.over = true; C.cpr = false; var f = ok ? award('icu_' + c.id, Math.min(6, S.mistakes), 130) : null;
      panel.innerHTML = '<div class="hp-card hp-res"><h3>' + (ok ? '✅ রোগী স্থিতিশীল' : '⚠️ রোগীর অবস্থা সংকটাপন্ন') + '</h3>' + (ok ? '<div class="big">' + starHtml(f.st) + '</div><p>স্কোর <b>' + bn(Math.max(0, S.pts)) + '</b> · ভুল সিদ্ধান্ত ' + bn(S.mistakes) + ' · <b>+' + bn(f.xp) + ' XP</b></p>' : '<p>' + esc(msg || '') + '</p>') + '<p class="hp-sum">📌 ' + esc(c.sum) + '</p><div class="hp-nav"><button type="button" class="hp-btn" id="hpAgain">↻ আবার চেষ্টা</button><button type="button" class="hp-btn pri" id="hpHome">তালিকা</button></div></div>';
      $('#hpAgain').onclick = function () { runIcu(c); }; $('#hpHome').onclick = render;
    }
    function act(id) {
      if (S.over) return; var a = c.actions.filter(function (x) { return x.id === id; })[0], v = C.v;
      if (S.has[id]) { S.log.push({ k: 'w', t: '↺ ' + a.l + ': আগেই করা হয়েছে।' }); draw(); return; }
      if (a.prereq && a.prereq.some(function (p) { return !S.has[p]; })) { var miss = a.prereq.filter(function (p) { return !S.has[p]; }).map(function (p) { return c.actions.filter(function (x) { return x.id === p; })[0].l; }); S.pts -= 4; S.mistakes++; S.log.push({ k: 'b', t: '⛔ আগে করতে হবে: ' + miss.join(', ') }); draw(); return; }
      S.has[id] = true; S.turns++;
      Object.keys(a.eff || {}).forEach(function (k) { v[k] = (v[k] || 0) + a.eff[k]; });
      if (a.bad) { S.pts -= a.bad; S.mistakes++; S.log.push({ k: 'b', t: '✘ ' + a.l + ' → ' + a.fb }); }
      else S.log.push({ k: 'g', t: '✔ ' + a.l + ' → ' + a.fb });
      if (c.id === 'arrest') { if (id === 'cpr') C.cpr = true; if (id === 'shock1' || id === 'shock2' || id === 'shock3') { C.flash = performance.now(); beep(200, 220, .08); } if (id === 'shock3') { C.rhythm = 'sinus'; C.cpr = false; } if (id === 'stop') C.cpr = false; }
      /* স্বাভাবিক অবনতি */
      if (c.id === 'sepsis') { if (!S.has.fluid) { v.sys -= 3; v.hr += 2; } if (!S.has.o2) v.spo2 -= 1; if (!S.has.abx) v.temp += .05; }
      if (c.id === 'stemi') { if (!S.has.pci) { v.hr += 1; v.spo2 -= .3; } }
      clamp(v);
      var fail = (c.id === 'sepsis' && (v.sys < 55 || v.spo2 < 78)) || S.pts <= 0 || (c.id === 'stemi' && id === 'discharge');
      if (fail) { end(false, c.id === 'sepsis' ? 'BP ও অক্সিজেন বিপদসীমার নিচে নেমে গেছে। বড় তরল ও সময়মতো অ্যান্টিবায়োটিক ছাড়া রোগীকে বাঁচানো কঠিন।' : c.id === 'stemi' ? 'ধমনী খোলার আগে সময় নষ্ট হয়েছে; হৃদপেশির বড় ক্ষতি হয়েছে।' : 'CPR ও শকে দেরি বা ভুল ধাপের কারণে রোগীকে ফেরানো যায়নি।'); return; }
      if (c.done(v, S)) { end(true); return; }
      draw();
    }
    panel.addEventListener('click', function (e) { var b = e.target.closest('.hp-act'); if (b) act(b.dataset.a); });
    if (c.id === 'arrest') { C.v = JSON.parse(JSON.stringify(c.v)); }
    draw();
  }

  /* ---------- অন্য ফাইলের জন্য কিট (hospital-flow.js ইত্যাদি) ----------
     ডেটা-ফাইল বদলাতে হয় না: নতুন ট্যাব K.addTab(id, লেবেল, ফাংশন) দিয়ে বসে। ST বদলায়, তাই K.st() দিয়ে পড়তে হয়। */
  window.GEBHospKit = {
    H: H, M: M, PI: PI, mount: mount, P: P, save: save, esc: esc, bn: bn, sleep: sleep, $: $, $$: $$, beep: beep,
    st: function () { return ST; }, later: later, clearTimers: clearTimers, say: say, mkStage: mkStage, sceneReset: sceneReset, bound: bound,
    showFloor: showFloor, spawnAv: spawnAv, travel: travel, updateFloorBar: updateFloorBar, person: person, STAFF: STAFF, floorPlane: floorPlane,
    award: award, stars: stars, starHtml: starHtml, render: render, wrapText: wrapText,
    addTab: function (id, label, fn) { XT.push({ id: id, label: label, fn: fn }); },
    goTab: function (id) { tab = id; render(); }
  };

  /* ---------- মডিউল চালু ----------
     একই মুহূর্তে লোড হওয়া hospital-flow.js যেন ট্যাব যোগ করার সুযোগ পায়, তাই প্রথম আঁকা এক টিক পরে। */
  setTimeout(render, 0);
})();
