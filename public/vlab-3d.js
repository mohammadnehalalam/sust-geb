/* GEB Hub: ভার্চুয়াল ল্যাবের ছোট 3D ইঞ্জিন (v3.5)।
   কোনো বাইরের লাইব্রেরি (Three.js ইত্যাদি) লাগে না, তাই অফলাইনেও চলে। Canvas 2D-তে পারস্পেকটিভ প্রজেকশন + painter's algorithm।
   - মাউস/টাচে ঘোরানো, জুম (স্ক্রল/পিঞ্চ), ক্লিক করে বস্তু বাছা (picking), কিবোর্ডের তীর চিহ্ন
   - mesh: lathe, sphere, cylinder, box, torus, patch, tube; line, dots, group
   - tween (নড়াচড়ার অ্যানিমেশন), লেবেল, ক্যামেরা অ্যানিমেশন
   VL3D.create(canvas, opts) → V; V.add({...}) দিয়ে বস্তু যোগ। */
(function (root) {
  'use strict';
  var PI = Math.PI, TAU = PI * 2;
  var reduce = false; try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { }

  /* ---------- রঙ ---------- */
  var cc = {};
  function rgb(h) {
    if (cc[h]) return cc[h];
    var s = String(h).replace('#', ''); if (s.length === 3) s = s.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(s, 16); return (cc[h] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
  }
  function hex(r, g, b) { var f = function (x) { x = Math.max(0, Math.min(255, Math.round(x))); return (x < 16 ? '0' : '') + x.toString(16); }; return '#' + f(r) + f(g) + f(b); }
  function mix(a, b, t) { var A = rgb(a), B = rgb(b); return hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }

  /* ---------- mesh ---------- */
  function newell(vs, idx) {
    var nx = 0, ny = 0, nz = 0, n = idx.length;
    for (var i = 0; i < n; i++) {
      var a = vs[idx[i]], b = vs[idx[(i + 1) % n]];
      nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]);
    }
    return [nx, ny, nz];
  }
  /* refFn(faceCenter, faceIdx) → বাইরের দিকের ভেক্টর; তা থেকে প্রতিটি ফেসের s (±1) ঠিক হয়, তাই ঘূর্ণন-দিক (winding) নিয়ে ভাবতে হয় না */
  function finish(m, refFn) {
    m.s = m.f.map(function (f, i) {
      var c = [0, 0, 0]; f.forEach(function (k) { c[0] += m.v[k][0]; c[1] += m.v[k][1]; c[2] += m.v[k][2]; }); c = [c[0] / f.length, c[1] / f.length, c[2] / f.length];
      var n = newell(m.v, f), r = refFn ? refFn(c, i, f) : null; if (!r) return 1;
      return (n[0] * r[0] + n[1] * r[1] + n[2] * r[2]) >= 0 ? 1 : -1;
    });
    return m;
  }
  function lathe(prof, seg) {
    seg = seg || 24; var v = [], f = [], ref = [], np = prof.length, i, j;
    for (i = 0; i < np; i++) for (j = 0; j < seg; j++) { var a = j / seg * TAU; v.push([prof[i][0] * Math.cos(a), prof[i][1], prof[i][0] * Math.sin(a)]); }
    for (i = 0; i < np - 1; i++) for (j = 0; j < seg; j++) {
      var j2 = (j + 1) % seg, dr = prof[i + 1][0] - prof[i][0], dy = prof[i + 1][1] - prof[i][1], am = (j + .5) / seg * TAU;
      f.push([i * seg + j, i * seg + j2, (i + 1) * seg + j2, (i + 1) * seg + j]); ref.push([dy * Math.cos(am), -dr, dy * Math.sin(am)]);
    }
    return finish({ v: v, f: f }, function (c, k) { return ref[k]; });
  }
  function cyl(rt, rb, h, seg, open) {
    var p = open ? [[rb, 0], [rt, h]] : [[0, 0], [rb, 0], [rt, h], [0, h]];
    var m = lathe(p, seg || 20); if (open) m.two = true; return m;
  }
  function sphere(r, seg, ring) {
    seg = seg || 16; ring = ring || 10; var p = [];
    for (var i = 0; i <= ring; i++) { var ph = i / ring * PI; p.push([r * Math.sin(ph), -r * Math.cos(ph)]); }
    return lathe(p, seg);
  }
  function box(w, h, d) {
    var x = w / 2, z = d / 2, v = [[-x, 0, -z], [x, 0, -z], [x, 0, z], [-x, 0, z], [-x, h, -z], [x, h, -z], [x, h, z], [-x, h, z]];
    var f = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
    return finish({ v: v, f: f }, function (c) { return [c[0], c[1] - h / 2, c[2]]; });
  }
  function torus(R, r, seg, ring) {
    seg = seg || 20; ring = ring || 8; var v = [], f = [], i, j;
    for (i = 0; i < seg; i++) for (j = 0; j < ring; j++) { var a = i / seg * TAU, b = j / ring * TAU, rr = R + r * Math.cos(b); v.push([rr * Math.cos(a), r * Math.sin(b), rr * Math.sin(a)]); }
    for (i = 0; i < seg; i++) for (j = 0; j < ring; j++) { var i2 = (i + 1) % seg, j2 = (j + 1) % ring; f.push([i * ring + j, i2 * ring + j, i2 * ring + j2, i * ring + j2]); }
    return finish({ v: v, f: f }, function (c) { var l = Math.hypot(c[0], c[2]) || 1; return [c[0] - c[0] / l * R, c[1], c[2] - c[2] / l * R]; });
  }
  function plane(w, d) { return { v: [[-w / 2, 0, -d / 2], [w / 2, 0, -d / 2], [w / 2, 0, d / 2], [-w / 2, 0, d / 2]], f: [[0, 1, 2, 3]], s: [1], two: true }; }
  function disc(r, seg) { var m = lathe([[0, 0], [r, 0]], seg || 28); m.two = true; return m; }
  /* patch: fn(u,v) → [x,y,z], u,v ∈ [0,1]; দুই পাশ দেখা যায় (পাপড়ি, পাতা) */
  function patch(fn, nu, nv) {
    nu = nu || 6; nv = nv || 6; var v = [], f = [], i, j;
    for (i = 0; i <= nu; i++) for (j = 0; j <= nv; j++) v.push(fn(i / nu, j / nv));
    for (i = 0; i < nu; i++) for (j = 0; j < nv; j++) f.push([i * (nv + 1) + j, (i + 1) * (nv + 1) + j, (i + 1) * (nv + 1) + j + 1, i * (nv + 1) + j + 1]);
    return { v: v, f: f, s: f.map(function () { return 1; }), two: true };
  }
  /* tube: বাঁকা পথ ধরে নল (ফ্ল্যাজেলা, কেঁচো, শুঁড়)। rf(t) দিয়ে ব্যাসার্ধ বদলানো যায় */
  function tube(pts, r, seg, rf) {
    seg = seg || 6; var v = [], f = [], c = [], n = pts.length, i, j;
    for (i = 0; i < n; i++) {
      var p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], t = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], tl = Math.hypot(t[0], t[1], t[2]) || 1; t = [t[0] / tl, t[1] / tl, t[2] / tl];
      var up = Math.abs(t[1]) > .9 ? [1, 0, 0] : [0, 1, 0], n1 = [t[1] * up[2] - t[2] * up[1], t[2] * up[0] - t[0] * up[2], t[0] * up[1] - t[1] * up[0]], l1 = Math.hypot(n1[0], n1[1], n1[2]) || 1; n1 = [n1[0] / l1, n1[1] / l1, n1[2] / l1];
      var n2 = [t[1] * n1[2] - t[2] * n1[1], t[2] * n1[0] - t[0] * n1[2], t[0] * n1[1] - t[1] * n1[0]], rr = r * (rf ? rf(i / (n - 1)) : 1);
      c.push(p);
      for (j = 0; j < seg; j++) { var th = j / seg * TAU, cs = Math.cos(th), sn = Math.sin(th); v.push([p[0] + rr * (n1[0] * cs + n2[0] * sn), p[1] + rr * (n1[1] * cs + n2[1] * sn), p[2] + rr * (n1[2] * cs + n2[2] * sn)]); }
    }
    for (i = 0; i < n - 1; i++) for (j = 0; j < seg; j++) { var j2 = (j + 1) % seg; f.push([i * seg + j, i * seg + j2, (i + 1) * seg + j2, (i + 1) * seg + j]); }
    return finish({ v: v, f: f }, function (cen, k) { var ring = Math.floor(k / seg), p = c[ring], q = c[ring + 1]; return [cen[0] - (p[0] + q[0]) / 2, cen[1] - (p[1] + q[1]) / 2, cen[2] - (p[2] + q[2]) / 2]; });
  }
  /* ক্যাপসুল (ব্যাসিলাস): দুই প্রান্তে অর্ধগোলক, X অক্ষ বরাবর। L = মোট দৈর্ঘ্য */
  function capsule(L, r, seg) {
    seg = seg || 12; var h = Math.max(0, L / 2 - r), p = [], i, ring = 5;
    for (i = 0; i <= ring; i++) { var ph = i / ring * PI / 2; p.push([r * Math.sin(ph), -h - r * Math.cos(ph)]); }
    for (i = ring; i >= 0; i--) { var ph2 = i / ring * PI / 2; p.push([r * Math.sin(ph2), h + r * Math.cos(ph2)]); }
    var m = lathe(p, seg); m.v = m.v.map(function (q) { return [q[1], q[0], q[2]]; });   // Y অক্ষ → X অক্ষ
    return finish(m, null) && m;
  }
  /* ---------- হেল্পার ---------- */
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var ease = function (t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  function rotM(r) {   // Ry * Rx * Rz
    var cx = Math.cos(r[0]), sx = Math.sin(r[0]), cy = Math.cos(r[1]), sy = Math.sin(r[1]), cz = Math.cos(r[2]), sz = Math.sin(r[2]);
    var Rz = [cz, -sz, 0, sz, cz, 0, 0, 0, 1], Rx = [1, 0, 0, 0, cx, -sx, 0, sx, cx], Ry = [cy, 0, sy, 0, 1, 0, -sy, 0, cy];
    return mul3(Ry, mul3(Rx, Rz));
  }
  function mul3(a, b) { var o = new Array(9); for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) o[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]; return o; }
  function mv3(m, v) { return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]]; }
  function det3(m) { return m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]); }
  function norm(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function sc(s) { return typeof s === 'number' ? [s, s, s] : s.slice(); }

  /* ================= দৃশ্য ================= */
  var ALL = [];   // তৈরি সব দৃশ্য; ভয়েস কমান্ড active() দিয়ে এখনকার দৃশ্য পায়
  function active() { for (var i = ALL.length - 1; i >= 0; i--) { var v = ALL[i]; if (v.alive && v.cv.isConnected) return v; } return null; }
  function create(cv, o) {
    o = o || {};
    var ctx = cv.getContext('2d'), V = { cv: cv, ctx: ctx, objs: [], tweens: [], hooks: [], labels: [], dirty: true, alive: true, light: [-.45, .85, .5], orbit: o.orbit !== false };
    var cam = V.cam = { yaw: o.yaw != null ? o.yaw : .6, pitch: o.pitch != null ? o.pitch : .5, dist: o.dist || 12, target: (o.target || [0, 0, 0]).slice(), fov: o.fov || 1.0 };
    var lim = { minD: o.minDist || 2, maxD: o.maxDist || 40, minP: o.minPitch != null ? o.minPitch : -.1, maxP: o.maxPitch != null ? o.maxPitch : 1.5 };
    V.lim = lim; V.cam0 = { yaw: cam.yaw, pitch: cam.pitch, dist: cam.dist, target: cam.target.slice() }; ALL.push(V); if (ALL.length > 12) ALL.shift();
    var W = 300, H = 200, dpr = 1, hits = [], B, C, F, lastCam = null;
    V.bg = o.bg || ['#22384a', '#0f1923'];
    V.root = mkObj({ kind: 'group' });

    function mkObj(s, parent) {
      var ob = { kind: s.kind || (s.mesh ? 'mesh' : s.pts ? 'line' : s.dots ? 'dots' : 'group'), mesh: s.mesh, pts: s.pts, dots: s.dots, color: s.color || '#cccccc', pos: (s.pos || [0, 0, 0]).slice(), rot: (s.rot || [0, 0, 0]).slice(), scale: sc(s.scale == null ? 1 : s.scale),
        alpha: s.alpha == null ? 1 : s.alpha, vis: s.vis !== false, kids: [], parent: parent || null, id: s.id, pick: !!s.pick, layer: s.layer == null ? 1 : s.layer, bias: s.bias || 0, two: s.two, shade: s.shade == null ? 1 : s.shade,
        width: s.width || 1.5, r: s.r || 1, flat: !!s.flat, glow: s.glow || 0, data: s.data || {}, stroke: s.stroke || null, label: s.label || null, dcolors: s.dcolors || null };
      return ob;
    }
    V.add = function (s, parent) {
      parent = parent || V.root; var ob = mkObj(s, parent); parent.kids.push(ob); V.dirty = true;
      if (s.children) s.children.forEach(function (c) { V.add(c, ob); });
      return ob;
    };
    V.remove = function (ob) { if (!ob || !ob.parent) return; var k = ob.parent.kids, i = k.indexOf(ob); if (i >= 0) k.splice(i, 1); ob.parent = null; V.dirty = true; };
    V.clear = function () { V.root.kids = []; V.labels = []; V.tweens = []; V.dirty = true; };
    V.set = function (ob, p) { Object.keys(p).forEach(function (k) { ob[k] = (k === 'pos' || k === 'rot') ? p[k].slice() : (k === 'scale' ? sc(p[k]) : p[k]); }); V.dirty = true; return ob; };
    V.find = function (id, from) { from = from || V.root; if (from.id === id) return from; for (var i = 0; i < from.kids.length; i++) { var r = V.find(id, from.kids[i]); if (r) return r; } return null; };
    V.ping = function () { V.dirty = true; };

    /* ---------- tween ---------- */
    V.tw = function (ob, p, ms, cb) {
      return new Promise(function (res) {
        var from = {}, to = {}; ms = reduce ? 1 : (ms == null ? 500 : ms);
        Object.keys(p).forEach(function (k) {
          if (k === 'cam') return;
          var cur = ob[k], tg = k === 'scale' ? sc(p[k]) : p[k];
          from[k] = Array.isArray(cur) ? cur.slice() : cur; to[k] = tg;
        });
        var t0 = performance.now();
        V.tweens.push({ step: function (now) {
          var t = Math.min(1, (now - t0) / ms), e = ease(t);
          Object.keys(to).forEach(function (k) {
            if (Array.isArray(to[k])) ob[k] = to[k].map(function (x, i) { return lerp(from[k][i], x, e); });
            else if (typeof to[k] === 'number') ob[k] = lerp(from[k], to[k], e);
            else if (typeof to[k] === 'string' && k === 'color') ob[k] = mix(from[k], to[k], e);
            else ob[k] = to[k];
          });
          V.dirty = true;
          if (t >= 1) { if (cb) cb(); res(); return true; }
        } });
      });
    };
    V.camTo = function (p, ms) {
      return new Promise(function (res) {
        ms = reduce ? 1 : (ms == null ? 700 : ms); var f = { yaw: cam.yaw, pitch: cam.pitch, dist: cam.dist, target: cam.target.slice() }, t0 = performance.now();
        V.tweens.push({ step: function (now) {
          var t = Math.min(1, (now - t0) / ms), e = ease(t);
          if (p.yaw != null) cam.yaw = lerp(f.yaw, p.yaw, e); if (p.pitch != null) cam.pitch = lerp(f.pitch, p.pitch, e); if (p.dist != null) cam.dist = lerp(f.dist, p.dist, e);
          if (p.target) cam.target = p.target.map(function (x, i) { return lerp(f.target[i], x, e); });
          V.dirty = true; if (t >= 1) { res(); return true; }
        } });
      });
    };
    V.wait = function (ms) { return new Promise(function (r) { setTimeout(r, reduce ? 1 : ms); }); };
    V.hook = function (fn) { V.hooks.push(fn); return fn; };   // প্রতি ফ্রেমে fn(now) চলে; true ফেরত দিলে সরে যায়
    V.labelFor = function (ob, text, opt) { V.labels.push({ ob: ob, text: text, off: (opt && opt.off) || [0, 0, 0], c: (opt && opt.color) || '#10243E' }); V.dirty = true; };
    V.clearLabels = function () { V.labels = []; V.dirty = true; };

    /* ---------- ক্যামেরা ---------- */
    function setupCam() {
      var cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch), cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
      C = [cam.target[0] + cam.dist * cp * sy, cam.target[1] + cam.dist * sp, cam.target[2] + cam.dist * cp * cy];
      var fw = norm([cam.target[0] - C[0], cam.target[1] - C[1], cam.target[2] - C[2]]), rt = norm(cross(fw, [0, 1, 0])), up = cross(rt, fw);
      B = [rt[0], rt[1], rt[2], up[0], up[1], up[2], fw[0], fw[1], fw[2]]; F = (H / 2) / Math.tan(cam.fov / 2);
      V._fw = fw; V._rt = rt; V._up = up;
    }
    /* স্ক্রিনের বিন্দু থেকে অনুভূমিক সমতলের (y = h) উপর জগৎ-স্থানাঙ্ক */
    V.screenToPlane = function (sx, sy, h) {
      var r = cv.getBoundingClientRect(), x = (sx - r.left) / r.width * W, y = (sy - r.top) / r.height * H; setupCam();
      var d = [V._fw[0] + (x - W / 2) / F * V._rt[0] - (y - H / 2) / F * V._up[0], V._fw[1] + (x - W / 2) / F * V._rt[1] - (y - H / 2) / F * V._up[1], V._fw[2] + (x - W / 2) / F * V._rt[2] - (y - H / 2) / F * V._up[2]];
      if (Math.abs(d[1]) < 1e-6) return null; var t = (h - C[1]) / d[1]; if (t <= 0) return null;
      return [C[0] + d[0] * t, h, C[2] + d[2] * t];
    };
    V.project = function (p) { setupCam(); var q = mv3(B, [p[0] - C[0], p[1] - C[1], p[2] - C[2]]); return q[2] > .1 ? [W / 2 + F * q[0] / q[2], H / 2 - F * q[1] / q[2]] : null; };

    /* ---------- রেন্ডার ---------- */
    function walk(ob, Mp, tp, out, vis) {
      if (!ob.vis || !vis) return;
      var M = mul3(Mp, mul3(rotM(ob.rot), [ob.scale[0], 0, 0, 0, ob.scale[1], 0, 0, 0, ob.scale[2]])), t = mv3(Mp, ob.pos); t = [t[0] + tp[0], t[1] + tp[1], t[2] + tp[2]];
      ob._M = M; ob._t = t; if (ob.kind !== 'group') out.push(ob);
      for (var i = 0; i < ob.kids.length; i++) walk(ob.kids[i], M, t, out, true);
    }
    function render(now) {
      setupCam(); hits = [];
      var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, V.bg[0]); g.addColorStop(1, V.bg[1]);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      var list = []; walk(V.root, [1, 0, 0, 0, 1, 0, 0, 0, 1], [0, 0, 0], list, true);
      var LV = norm(mv3(B, V.light)), items = [];
      list.forEach(function (ob) {
        var K = mul3(B, ob._M), k = mv3(B, [ob._t[0] - C[0], ob._t[1] - C[1], ob._t[2] - C[2]]), flip = det3(K) < 0 ? -1 : 1;
        if (ob.kind === 'mesh' && ob.mesh) {
          var m = ob.mesh, pv = new Array(m.v.length), i, j;
          for (i = 0; i < m.v.length; i++) { var v = m.v[i]; pv[i] = [K[0] * v[0] + K[1] * v[1] + K[2] * v[2] + k[0], K[3] * v[0] + K[4] * v[1] + K[5] * v[2] + k[1], K[6] * v[0] + K[7] * v[1] + K[8] * v[2] + k[2]]; }
          var base = rgb(ob.color), two = ob.two != null ? ob.two : m.two;
          for (i = 0; i < m.f.length; i++) {
            var f = m.f[i], nz = 0, ok = true, cz = 0, cx = 0, cy = 0;
            for (j = 0; j < f.length; j++) { var q = pv[f[j]]; if (q[2] < .15) { ok = false; break; } cx += q[0]; cy += q[1]; cz += q[2]; }
            if (!ok) continue; cx /= f.length; cy /= f.length; cz /= f.length;
            var n = newell(pv, f), s = (m.s ? m.s[i] : 1) * flip; n = [n[0] * s, n[1] * s, n[2] * s];
            var facing = n[0] * cx + n[1] * cy + n[2] * cz;   // >0 হলে পেছন ফেরা
            if (two) { if (facing > 0) { n = [-n[0], -n[1], -n[2]]; } } else if (facing > 0) continue;
            n = norm(n); var d = Math.max(0, dot(n, LV)), li = ob.glow ? 1 : (.42 + .58 * d) * ob.shade + (1 - ob.shade) * .85;
            var bc = ob.dcolors ? rgb(ob.dcolors[i % ob.dcolors.length]) : base;
            var pts = f.map(function (id) { var q2 = pv[id]; return [W / 2 + F * q2[0] / q2[2], H / 2 - F * q2[1] / q2[2]]; });
            items.push({ z: cz - ob.bias, L: ob.layer, pts: pts, c: 'rgb(' + Math.min(255, bc[0] * li + (ob.glow ? 40 : 0) | 0) + ',' + Math.min(255, bc[1] * li + (ob.glow ? 40 : 0) | 0) + ',' + Math.min(255, bc[2] * li + (ob.glow ? 20 : 0) | 0) + ')', a: ob.alpha, ob: ob, st: ob.stroke });
          }
        } else if (ob.kind === 'line' && ob.pts && ob.pts.length > 1) {
          var pp = ob.pts.map(function (v) { var w = [K[0] * v[0] + K[1] * v[1] + K[2] * v[2] + k[0], K[3] * v[0] + K[4] * v[1] + K[5] * v[2] + k[1], K[6] * v[0] + K[7] * v[1] + K[8] * v[2] + k[2]]; return w; });
          if (pp.some(function (q) { return q[2] < .15; })) return; var zc = 0; pp.forEach(function (q) { zc += q[2]; });
          items.push({ z: zc / pp.length - ob.bias, L: ob.layer, line: pp.map(function (q) { return [W / 2 + F * q[0] / q[2], H / 2 - F * q[1] / q[2], q[2]]; }), c: ob.color, a: ob.alpha, w: ob.width, ob: ob });
        } else if (ob.kind === 'dots' && ob.dots) {
          var sinp = Math.max(.14, Math.abs(Math.sin(cam.pitch)));
          ob.dots.forEach(function (dd, di) {
            var v = dd.p, w = [K[0] * v[0] + K[1] * v[1] + K[2] * v[2] + k[0], K[3] * v[0] + K[4] * v[1] + K[5] * v[2] + k[1], K[6] * v[0] + K[7] * v[1] + K[8] * v[2] + k[2]]; if (w[2] < .15) return;
            var rr = (dd.r || ob.r) * F / w[2];
            items.push({ z: w[2] - ob.bias, L: ob.layer, dot: [W / 2 + F * w[0] / w[2], H / 2 - F * w[1] / w[2], rr, ob.flat ? sinp : 1], c: dd.c || ob.color, a: dd.a != null ? dd.a : ob.alpha, ob: ob, di: di, hi: dd.hi });
          });
        }
      });
      items.sort(function (a, b) { return a.L - b.L || b.z - a.z; });
      for (var i = 0; i < items.length; i++) {
        var it = items[i]; ctx.globalAlpha = it.a;
        if (it.pts) {
          ctx.beginPath(); ctx.moveTo(it.pts[0][0], it.pts[0][1]); for (var j = 1; j < it.pts.length; j++) ctx.lineTo(it.pts[j][0], it.pts[j][1]); ctx.closePath();
          ctx.fillStyle = it.c; ctx.fill(); if (it.a >= .99 || it.st) { ctx.strokeStyle = it.st || it.c; ctx.lineWidth = it.st ? .8 : .7; ctx.stroke(); }
          if (it.ob.pick) hits.push({ ob: it.ob, pts: it.pts });
        } else if (it.line) {
          ctx.beginPath(); ctx.moveTo(it.line[0][0], it.line[0][1]); for (var j2 = 1; j2 < it.line.length; j2++) ctx.lineTo(it.line[j2][0], it.line[j2][1]);
          ctx.strokeStyle = it.c; ctx.lineWidth = Math.max(.6, it.w * F / (it.line[0][2] * 14)); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
        } else if (it.dot) {
          var d2 = it.dot; ctx.beginPath(); ctx.ellipse(d2[0], d2[1], Math.max(.8, d2[2]), Math.max(.6, d2[2] * d2[3]), 0, 0, TAU); ctx.fillStyle = it.c; ctx.fill();
          if (it.hi) { ctx.strokeStyle = it.hi; ctx.lineWidth = 2; ctx.stroke(); } else if (d2[2] > 2.4) { ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = .8; ctx.stroke(); }
          if (it.ob.pick) hits.push({ ob: it.ob, dot: d2, di: it.di });
        }
      }
      ctx.globalAlpha = 1;
      V.labels.forEach(function (lb) {
        if (!lb.ob.vis) return; var p = [lb.ob._t[0] + lb.off[0], lb.ob._t[1] + lb.off[1], lb.ob._t[2] + lb.off[2]], s = V.project(p); if (!s) return;
        ctx.font = '600 12px "Hind Siliguri",system-ui,sans-serif'; var tw = ctx.measureText(lb.text).width + 12;
        ctx.fillStyle = 'rgba(255,255,255,.93)'; ctx.strokeStyle = lb.c; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(s[0] - tw / 2, s[1] - 20, tw, 20, 6) : ctx.rect(s[0] - tw / 2, s[1] - 20, tw, 20); ctx.fill(); ctx.stroke();
        ctx.fillStyle = lb.c; ctx.textAlign = 'center'; ctx.fillText(lb.text, s[0], s[1] - 5); ctx.textAlign = 'start';
      });
      if (V.overlay) V.overlay(ctx, W, H, now);
    }
    /* ---------- লুপ ---------- */
    function loop(now) {
      if (!V.alive) return;
      if (!cv.isConnected) { V.alive = false; return; }
      for (var i = V.tweens.length - 1; i >= 0; i--) if (V.tweens[i].step(now)) V.tweens.splice(i, 1);
      for (var h = V.hooks.length - 1; h >= 0; h--) { if (V.hooks[h](now)) V.hooks.splice(h, 1); V.dirty = true; }
      if (V.dirty) { V.dirty = false; try { render(now); } catch (e) { console.error('VL3D render', e); } }
      requestAnimationFrame(loop);
    }
    function resize() {
      var r = cv.getBoundingClientRect(); if (!r.width) return; dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.round(r.width); H = Math.round(r.height); cv.width = W * dpr; cv.height = H * dpr; V.dirty = true;
    }
    V.resize = resize;
    if (window.ResizeObserver) new ResizeObserver(resize).observe(cv); else window.addEventListener('resize', resize);
    resize(); requestAnimationFrame(loop);
    V.destroy = function () { V.alive = false; };

    /* ---------- পয়েন্টার ---------- */
    var ptrs = {}, drag = null, pinch = 0, hoverT = 0;
    function pos(e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
    function inPoly(p, pts) { var c = false; for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) { if (((pts[i][1] > p[1]) !== (pts[j][1] > p[1])) && (p[0] < (pts[j][0] - pts[i][0]) * (p[1] - pts[i][1]) / (pts[j][1] - pts[i][1]) + pts[i][0])) c = !c; } return c; }
    V.pickAt = function (x, y) {
      for (var i = hits.length - 1; i >= 0; i--) {
        var h = hits[i];
        if (h.pts && inPoly([x, y], h.pts)) return { ob: h.ob };
        if (h.dot && Math.hypot(x - h.dot[0], (y - h.dot[1]) / Math.max(.3, h.dot[3])) <= Math.max(h.dot[2] + 3, 7)) return { ob: h.ob, di: h.di };
      }
      return null;
    };
    cv.style.touchAction = 'none'; cv.tabIndex = 0;
    cv.addEventListener('pointerdown', function (e) {
      cv.setPointerCapture && cv.setPointerCapture(e.pointerId); ptrs[e.pointerId] = pos(e); var n = Object.keys(ptrs).length;
      if (n === 2) { var a = Object.values(ptrs); pinch = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]); drag = null; return; }
      drag = { x: ptrs[e.pointerId][0], y: ptrs[e.pointerId][1], mv: 0, t: performance.now(), cx: e.clientX, cy: e.clientY };
      if (V.draw) { drag.draw = true; V.draw.start && V.draw.start(e.clientX, e.clientY, e); }
    });
    cv.addEventListener('pointermove', function (e) {
      if (!ptrs[e.pointerId]) {
        var now = performance.now(); if (now - hoverT > 60) { hoverT = now; var p0 = pos(e), h = V.pickAt(p0[0], p0[1]); cv.style.cursor = V.draw ? 'crosshair' : (h ? 'pointer' : (V.orbit ? 'grab' : 'default')); if (V.onHover) V.onHover(h, e); }
        return;
      }
      var p = pos(e); var n = Object.keys(ptrs).length; ptrs[e.pointerId] = p;
      if (n === 2) { var a = Object.values(ptrs), d = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]); if (pinch) { cam.dist = Math.max(lim.minD, Math.min(lim.maxD, cam.dist * pinch / d)); V.dirty = true; } pinch = d; return; }
      if (!drag) return; var dx = p[0] - drag.x, dy = p[1] - drag.y; drag.mv += Math.abs(dx) + Math.abs(dy); drag.x = p[0]; drag.y = p[1];
      if (drag.draw) { V.draw.move && V.draw.move(e.clientX, e.clientY, e); return; }
      if (V.orbit && drag.mv > 3) { cam.yaw -= dx * .008; cam.pitch = Math.max(lim.minP, Math.min(lim.maxP, cam.pitch + dy * .008)); V.dirty = true; cv.style.cursor = 'grabbing'; }
    });
    function up(e) {
      var wasDrag = drag; delete ptrs[e.pointerId]; if (Object.keys(ptrs).length < 2) pinch = 0;
      if (!wasDrag) return; drag = null; cv.style.cursor = '';
      if (wasDrag.draw) { V.draw && V.draw.end && V.draw.end(e.clientX, e.clientY, e); return; }
      if (wasDrag.mv < 6 && performance.now() - wasDrag.t < 600) { var p = pos(e), h = V.pickAt(p[0], p[1]); if (V.onPick) V.onPick(h, e); }
    }
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', function (e) { e.preventDefault(); cam.dist = Math.max(lim.minD, Math.min(lim.maxD, cam.dist * (1 + Math.sign(e.deltaY) * .08))); V.dirty = true; }, { passive: false });
    cv.addEventListener('keydown', function (e) {
      var k = e.key, hit = true;
      if (k === 'ArrowLeft') cam.yaw -= .12; else if (k === 'ArrowRight') cam.yaw += .12; else if (k === 'ArrowUp') cam.pitch = Math.min(lim.maxP, cam.pitch + .08); else if (k === 'ArrowDown') cam.pitch = Math.max(lim.minP, cam.pitch - .08);
      else if (k === '+' || k === '=') cam.dist = Math.max(lim.minD, cam.dist * .9); else if (k === '-') cam.dist = Math.min(lim.maxD, cam.dist * 1.1); else hit = false;
      if (hit) { e.preventDefault(); V.dirty = true; }
    });
    return V;
  }

  /* ================= তৈরি অংশ (parts): ল্যাবের যন্ত্রপাতি ================= */
  var GLASS = '#bfe3ef';
  var P = {
    /* ল্যাবের টেবিল */
    bench: function (V, w, d) { return V.add({ mesh: box(w || 18, .6, d || 12), color: '#5b6b78', pos: [0, -.6, 0], layer: 0, shade: .8 }); },
    /* বুনসেন বার্নার; ফেরত: {g, flame, on(bool)} */
    bunsen: function (V, pos) {
      var g = V.add({ kind: 'group', pos: pos || [0, 0, 0] });
      V.add({ mesh: lathe([[0, 0], [.9, 0], [.9, .12], [.35, .2], [.2, .3], [.2, 2.2], [0, 2.2]], 18), color: '#7b8794' }, g);
      V.add({ mesh: lathe([[.2, 1.3], [.34, 1.3], [.34, 1.7], [.2, 1.7]], 14), color: '#2a3a47', two: true }, g);
      var outer = V.add({ mesh: lathe([[0, 2.2], [.28, 2.2], [.2, 3.0], [.08, 3.6], [0, 3.9]], 12), color: '#4f8cff', alpha: .55, glow: 1, vis: false, two: true }, g);
      var inner = V.add({ mesh: lathe([[0, 2.2], [.16, 2.2], [.1, 2.7], [0, 2.95]], 12), color: '#ffd24a', alpha: .9, glow: 1, vis: false, two: true }, g);
      var on = false, h;
      return { g: g, outer: outer, inner: inner, get lit() { return on; }, set: function (b) {
        on = !!b; outer.vis = inner.vis = on; V.dirty = true;
        if (on && !h) h = V.hook(function (t) { var f = 1 + .08 * Math.sin(t / 70) + .05 * Math.sin(t / 37); outer.scale = [1, f, 1]; inner.scale = [1, 1 + .06 * Math.sin(t / 55), 1]; return !on && (h = null, true); });
      } };
    },
    /* টেস্ট টিউব: ফেরত handle {g, fill(level 0..1,color), ppt(color|null, amount)} */
    tube: function (V, pos, opts) {
      opts = opts || {}; var R = opts.r || .42, Ht = opts.h || 3.6, g = V.add({ kind: 'group', pos: pos || [0, 0, 0], id: opts.id, pick: false });
      V.add({ mesh: lathe(arcBottom(R, Ht), 16), color: GLASS, alpha: .26, two: true, shade: .7, layer: 3, pick: !!opts.pick, id: opts.id }, g);
      var r2 = R * .86, liqB = V.add({ mesh: sphere(r2, 12, 6), color: '#cfe8f3', alpha: .0, pos: [0, r2, 0], scale: [1, 1, 1], layer: 2, shade: .9 }, g);
      var liqC = V.add({ mesh: cyl(r2, r2, 1, 14), color: '#cfe8f3', alpha: 0, pos: [0, r2, 0], scale: [1, .001, 1], layer: 2, shade: .9 }, g);
      var pptO = V.add({ mesh: sphere(r2, 12, 6), color: '#ffffff', alpha: 0, pos: [0, r2 * .55, 0], scale: [1, .45, 1], layer: 2, shade: .9 }, g);
      var h = { g: g, liqB: liqB, liqC: liqC, ppt: pptO, R: R, H: Ht, r2: r2, level: 0, color: '#cfe8f3',
        fill: function (lv, col, ms) {
          h.level = lv; if (col) h.color = col; var hh = Math.max(.001, lv * (Ht - 1.2));
          V.set(liqB, { color: h.color, alpha: lv > 0 ? .78 : 0 }); V.tw(liqC, { scale: [1, hh, 1], color: h.color, alpha: lv > 0 ? .78 : 0 }, ms == null ? 400 : ms); V.set(liqB, { color: h.color });
          return V.tw(liqC, { color: h.color }, ms == null ? 400 : ms);
        },
        tint: function (col, ms) { h.color = col; V.tw(liqB, { color: col }, ms == null ? 600 : ms); return V.tw(liqC, { color: col }, ms == null ? 600 : ms); },
        setPpt: function (col, amt, ms) { if (!col) return V.tw(pptO, { alpha: 0 }, 200); V.set(pptO, { color: col }); return V.tw(pptO, { alpha: .96, scale: [1, .35 + (amt || .5) * .8, 1], pos: [0, r2 * .5 + (amt || .5) * r2 * .2, 0] }, ms == null ? 800 : ms); } };
      return h;
    },
    flask: function (V, pos, opts) {   // কনিক্যাল ফ্লাস্ক
      opts = opts || {}; var g = V.add({ kind: 'group', pos: pos || [0, 0, 0], id: opts.id });
      V.add({ mesh: lathe([[0, 0], [1.5, 0], [1.6, .1], [.5, 2.1], [.5, 3.0], [.62, 3.1], [.62, 3.2], [.0, 3.2]], 20), color: GLASS, alpha: .27, two: true, layer: 3, shade: .7, pick: !!opts.pick, id: opts.id }, g);
      var liq = V.add({ mesh: lathe([[0, 0.05], [1.42, .05], [1.5, .12], [1.0, 1.0], [0, 1.0]], 20), color: '#e8d9a8', alpha: .0, layer: 2, shade: .9 }, g);
      return { g: g, liq: liq, color: function (c, a) { V.set(liq, { color: c, alpha: a == null ? .8 : a }); } };
    },
    beaker: function (V, pos, opts) {
      opts = opts || {}; var r = opts.r || 1.1, h = opts.h || 2.2, g = V.add({ kind: 'group', pos: pos || [0, 0, 0] });
      V.add({ mesh: lathe([[0, 0], [r, 0], [r, h]], 20), color: GLASS, alpha: .26, two: true, layer: 3, shade: .7, pick: !!opts.pick, id: opts.id }, g);
      var liq = V.add({ mesh: cyl(r * .93, r * .93, h * .6, 18), color: opts.color || '#cfe8f3', alpha: opts.fill === false ? 0 : .7, pos: [0, .05, 0], layer: 2, shade: .9 }, g);
      return { g: g, liq: liq };
    },
    bottle: function (V, pos, color, label, id) {
      var g = V.add({ kind: 'group', pos: pos || [0, 0, 0], id: id, data: { label: label } });
      V.add({ mesh: lathe([[0, 0], [.55, 0], [.6, .1], [.6, 1.25], [.3, 1.6], [.24, 1.75], [0, 1.75]], 16), color: color || '#8a5a2b', alpha: .92, shade: .9, pick: true, id: id }, g);
      V.add({ mesh: cyl(.28, .28, .3, 12), color: '#1d2b36', pos: [0, 1.72, 0], pick: true, id: id }, g);
      V.add({ mesh: cyl(.605, .605, .55, 16, true), color: '#f6f3ea', pos: [0, .35, 0], pick: true, id: id, two: true }, g);
      return g;
    },
    petri: function (V, pos, opts) {
      opts = opts || {}; var R = opts.r || 2.4, g = V.add({ kind: 'group', pos: pos || [0, 0, 0], id: opts.id });
      V.add({ mesh: lathe([[0, 0], [R, 0], [R, .5]], 36), color: GLASS, alpha: .3, two: true, layer: 3, shade: .7, pick: !!opts.pick, id: opts.id }, g);
      var agar = V.add({ mesh: cyl(R * .965, R * .965, .3, 36), color: opts.agar || '#e9c97a', alpha: .92, pos: [0, .04, 0], layer: 2, shade: .85, pick: !!opts.pick, id: opts.id }, g);
      var lid = V.add({ mesh: lathe([[0, .62], [R + .12, .62], [R + .12, .1]], 36), color: GLASS, alpha: .2, two: true, layer: 4, shade: .7, vis: opts.lid !== false, pick: !!opts.pick, id: opts.id }, g);
      return { g: g, agar: agar, lid: lid, R: R, top: .34 };
    },
    loop: function (V, pos) {   // ইনোকুলেশন লুপ
      var g = V.add({ kind: 'group', pos: pos || [0, 0, 0] });
      V.add({ mesh: cyl(.05, .05, 4.2, 8), color: '#9aa5ae', rot: [0, 0, 0] }, g);
      V.add({ mesh: cyl(.09, .09, 1.6, 8), color: '#2a3a47', pos: [0, 4.2, 0] }, g);
      var ring = V.add({ mesh: torus(.16, .028, 12, 5), color: '#c9d1d8', pos: [0, -.05, 0], rot: [PI / 2, 0, 0] }, g);
      return { g: g, ring: ring, heat: function (on) { V.set(ring, { color: on ? '#ff6a2b' : '#c9d1d8', glow: on ? 1 : 0 }); } };
    },
    micropipette: function (V, pos, color) {
      var g = V.add({ kind: 'group', pos: pos || [0, 0, 0] });
      V.add({ mesh: lathe([[0, 0], [.1, 0], [.16, .9], [.38, 1.0], [.38, 3.4], [.3, 3.8], [0, 3.8]], 14), color: color || '#3f7de0' }, g);
      V.add({ mesh: cyl(.1, .1, .4, 10), color: '#e4e9ee', pos: [0, 3.8, 0] }, g);
      V.add({ mesh: lathe([[.03, -1.9], [.07, -1.9], [.14, 0], [.03, 0]], 10), color: '#eef6fb', alpha: .7, two: true, pos: [0, 0, 0] }, g);
      return g;
    },
    slide: function (V, pos, opts) {
      opts = opts || {}; var g = V.add({ kind: 'group', pos: pos || [0, 0, 0], id: opts.id });
      V.add({ mesh: box(3, .1, 1), color: '#dff1f7', alpha: .6, two: true, pick: !!opts.pick, id: opts.id, layer: 2 }, g);
      var sp = V.add({ mesh: cyl(.28, .28, .04, 14), color: opts.spot || '#c98ad9', pos: [0, .1, 0], alpha: opts.spot ? .9 : 0, layer: 2 }, g);
      V.add({ mesh: box(.9, .05, .8), color: '#f6fbfd', alpha: .3, two: true, pos: [0, .1, 0], layer: 3 }, g);
      V.add({ mesh: box(.7, .04, .98), color: '#d9e8ee', pos: [-1.15, .1, 0], layer: 2 }, g);
      return { g: g, spot: sp };
    },
    microscope: function (V, pos, opts) {
      opts = opts || {}; var g = V.add({ kind: 'group', pos: pos || [0, 0, 0] }), pk = !!opts.pick;
      V.add({ mesh: box(3.2, .5, 2.6), color: '#2b3a47' }, g);
      V.add({ mesh: box(.7, 4.6, .9), color: '#3a4d5c', pos: [-.95, .5, 0], rot: [0, 0, -.08] }, g);
      V.add({ mesh: box(2.6, .22, 2.0), color: '#1d2a35', pos: [.45, 2.0, 0] }, g);
      V.add({ mesh: box(.45, .08, 1.2), color: '#c9d1d8', pos: [.45, 2.24, 0] }, g);
      V.add({ mesh: cyl(.55, .55, .35, 16), color: '#ffd24a', pos: [.45, .5, 0], glow: opts.light ? 1 : 0, id: 'lamp' }, g);
      V.add({ mesh: box(.7, 2.7, .85), color: '#3a4d5c', pos: [-.6, 4.4, 0], rot: [0, 0, -.08] }, g);
      V.add({ mesh: cyl(.34, .34, 2.4, 14), color: '#1f2b36', pos: [.2, 3.9, 0], rot: [0, 0, .36] }, g);
      V.add({ mesh: cyl(.26, .26, 1.0, 12), color: '#10181f', pos: [.95, 6.15, 0], rot: [0, 0, .36], id: 'eyepiece', pick: pk }, g);
      var tur = V.add({ mesh: cyl(.75, .75, .3, 18), color: '#8795a1', pos: [.4, 3.45, 0] }, g);
      [['#d94b4b', 0], ['#e0b23a', .5], ['#3f7de0', 1], ['#e9e9e9', 1.5]].forEach(function (c, i) { V.add({ mesh: cyl(.12, .16, .85, 10), color: c[0], pos: [.4 + Math.cos(c[1] * PI * 2 / 3.6 + 1) * .5, 2.6, Math.sin(c[1] * PI * 2 / 3.6 + 1) * .5], id: 'obj' + i, pick: pk }, g); });
      V.add({ mesh: cyl(.22, .22, .28, 12), color: '#aab6c0', pos: [-.95, 2.6, 1.05], rot: [PI / 2, 0, 0], id: 'focus', pick: pk }, g);
      V.add({ mesh: cyl(.22, .22, .28, 12), color: '#aab6c0', pos: [-.95, 2.0, 1.05], rot: [PI / 2, 0, 0], id: 'focus', pick: pk }, g);
      return { g: g, turret: tur };
    },
    incubator: function (V, pos, opts) {
      opts = opts || {}; var g = V.add({ kind: 'group', pos: pos || [0, 0, 0], id: opts.id });
      V.add({ mesh: box(6.4, 6, 4.6), color: '#cfd8df', pick: !!opts.pick, id: opts.id, layer: 1 }, g);
      V.add({ mesh: box(5.2, .08, 3.8), color: '#8fa0ad', pos: [0, 2.0, 0], layer: 2 }, g);
      V.add({ mesh: box(5.2, .08, 3.8), color: '#8fa0ad', pos: [0, 3.9, 0], layer: 2 }, g);
      var door = V.add({ kind: 'group', pos: [-3.2, 0, 2.32], id: 'door' }, g);
      V.add({ mesh: box(6.4, 6, .16), color: '#9fd0e0', alpha: .38, pos: [3.2, 0, 0], two: true, layer: 4, pick: !!opts.pick, id: 'door' }, door);
      V.add({ mesh: box(.25, 1.2, .3), color: '#2a3a47', pos: [5.8, 2.4, .1], layer: 4, id: 'door', pick: !!opts.pick }, door);
      var led = V.add({ mesh: box(.9, .4, .1), color: '#101a22', pos: [2.2, 5.2, 2.33], layer: 4 }, g);
      return { g: g, door: door, led: led, open: function (b) { return V.tw(door, { rot: [0, b ? -1.9 : 0, 0] }, 600); } };
    },
    autoclave: function (V, pos, opts) {
      opts = opts || {}; var g = V.add({ kind: 'group', pos: pos || [0, 0, 0], id: opts.id });
      V.add({ mesh: lathe([[0, 0], [2.3, 0], [2.3, 3.6], [1.9, 4.2], [0, 4.4]], 28), color: '#aeb9c2', pick: !!opts.pick, id: opts.id }, g);
      var lid = V.add({ mesh: lathe([[0, 3.8], [2.4, 3.8], [2.4, 4.0], [0, 4.0]], 28), color: '#7e8c98', pos: [0, 0, 0] }, g);
      V.add({ mesh: cyl(.45, .45, .2, 14), color: '#f3f5f7', pos: [0, 4.4, -1.0], rot: [0, 0, 0] }, g);
      V.add({ mesh: cyl(.12, .12, .8, 10), color: '#d94b4b', pos: [1.2, 4.2, .8] }, g);
      return { g: g, lid: lid };
    },
    balance: function (V, pos) {
      var g = V.add({ kind: 'group', pos: pos || [0, 0, 0] });
      V.add({ mesh: box(3.6, .8, 3.0), color: '#dfe6eb' }, g);
      V.add({ mesh: box(1.7, .06, .75), color: '#10181f', pos: [0, .8, 1.0] }, g);
      V.add({ mesh: cyl(1.0, 1.0, .12, 20), color: '#9aa7b2', pos: [0, .8, -.3] }, g);
      return g;
    },
    stirrer: function (V, pos) {
      var g = V.add({ kind: 'group', pos: pos || [0, 0, 0] }); V.add({ mesh: box(3.4, .6, 3.2), color: '#e7ecef' }, g); V.add({ mesh: cyl(1.4, 1.4, .1, 22), color: '#7e8c98', pos: [0, .6, 0] }, g); return g;
    },
    scalpel: function (V, pos, opts) {
      opts = opts || {}; var g = V.add({ kind: 'group', pos: pos || [0, 0, 0], rot: opts.rot || [0, 0, 0] });
      V.add({ mesh: box(.22, .12, 2.2), color: '#6b7782' }, g); V.add({ mesh: lathe([[0, 0], [.18, 0], [.02, 1.1]], 3), color: '#e9eef2', rot: [PI / 2, 0, 0], pos: [0, .06, 2.1], two: true }, g); return g;
    },
    tray: function (V, pos, w, d) { return V.add({ mesh: box(w || 7, .25, d || 5), color: '#3c4f5e', pos: pos || [0, 0, 0], layer: 1 }); }
  };
  function arcBottom(R, H) {   // টেস্ট টিউবের প্রোফাইল (গোল তলা)
    var p = [], i, n = 6; for (i = 0; i <= n; i++) { var a = i / n * PI / 2; p.push([R * Math.sin(a), R - R * Math.cos(a)]); } p.push([R, H]); return p;
  }

  root.VL3D = { create: create, active: active, mesh: { lathe: lathe, sphere: sphere, cyl: cyl, box: box, torus: torus, plane: plane, disc: disc, patch: patch, tube: tube, capsule: capsule, finish: finish }, parts: P, mix: mix, hex: hex, rgb: rgb, lerp: lerp, reduce: reduce, PI: PI };
})(typeof self !== 'undefined' ? self : this);
