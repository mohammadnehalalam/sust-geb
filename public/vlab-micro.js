/* GEB Hub: ভার্চুয়াল ল্যাব, মাইক্রোবায়োলজি (১): ব্যাকটেরিয়া লাইব্রেরি, গ্রাম স্টেইন, স্ট্রিক প্লেট, ইনকিউবেটর। */
(function () {
  'use strict';
  if (!window.VLab || !window.VLCore) return;
  var U = VLab.u, $ = U.$, $$ = U.$$, esc = U.esc, bn = U.bn, D = window.VLData, C = window.VLCore, M = VL3D.mesh, P = VL3D.parts, PI = Math.PI;
  var pickOrg = function (f) { var l = D.BACT.filter(f || function () { return true; }); return l[Math.floor(Math.random() * l.length)]; };
  function tag(ob, id) { ob.id = id; ob.pick = true; ob.kids.forEach(function (k) { if (!k.id) tag(k, id); else if (!k.pick) k.pick = true; }); return ob; }
  var gramB = function (g) { return '<span class="gm-g ' + (g === '+' ? 'p' : 'n') + '">Gram ' + (g === '+' ? 'ধনাত্মক (+)' : 'ঋণাত্মক (−)') + '</span>'; };
  var btnIn = function (label, extra) { return '<div class="vl-in">' + (extra || '') + '<button type="button" class="btn pri" data-go>' + label + '</button></div>'; };
  var SHAPES = { rod: 'দণ্ডাকার (rod/bacillus)', coccus: 'গোলাকার (coccus)', comma: 'কমা-আকৃতি (vibrio)', coccobac: 'ছোট দণ্ড', tetrad: 'গোলাকার, টেট্রাড' };
  function arrKind(o) { var a = o.arr; return /শিকল|chain/.test(a) ? 'chain' : /থোকা|গুচ্ছ/.test(a) ? 'cluster' : /টেট্রাড/.test(a) ? 'tetrad' : /জোড়া/.test(a) ? 'pair' : 'single'; }

  /* ================= ২D: মাইক্রোস্কোপে ব্যাকটেরিয়া ================= */
  function drawField(ctx, org, app, S, w, h) {
    var r = C.rng(org.id.length * 977 + 13); ctx.fillStyle = '#f6f1f5'; ctx.fillRect(0, 0, w, h);
    var g = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * .72); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(120,90,120,.18)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    var col = app.color || 'rgba(150,140,160,.35)', kind = arrKind(org), n = app.sparse ? 14 : 70, sc = S.mag >= 100 ? 1 : .55;
    ctx.save(); ctx.translate(-S.px * 160, -S.py * 160);
    function cell(x, y, rot) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = col; ctx.strokeStyle = 'rgba(40,10,50,.25)'; ctx.lineWidth = 1;
      var L = (org.shape === 'rod' ? 36 : org.shape === 'comma' ? 30 : 15) * sc, W = (org.shape === 'rod' ? 11 : 15) * sc; if (app.distort) { L *= .8; W *= .75; }
      ctx.beginPath();
      if (org.shape === 'coccus' || org.shape === 'tetrad') ctx.arc(0, 0, W / 2, 0, PI * 2);
      else if (org.shape === 'comma') { ctx.lineWidth = W * .7; ctx.strokeStyle = col; ctx.arc(0, 0, L * .5, .3, 2.5); ctx.stroke(); }
      else ctx.ellipse(0, 0, L / 2, W / 2, 0, 0, PI * 2);
      if (org.shape !== 'comma') { ctx.fill(); ctx.stroke(); }
      if (org.spore && org.shape === 'rod' && app.color) { ctx.fillStyle = '#f6f1f5'; ctx.beginPath(); ctx.ellipse(org.id === 'ctet' ? L * .32 : 0, 0, L * .14, W * .3, 0, 0, PI * 2); ctx.fill(); }
      ctx.restore();
    }
    for (var i = 0; i < n; i++) {
      var x = r() * 760 - 120, y = r() * 760 - 120, rot = r() * PI * 2;
      if (org.shape === 'coccus' || org.shape === 'tetrad') {
        if (kind === 'chain') { var len = 4 + Math.floor(r() * 5); for (var k = 0; k < len; k++) cell(x + Math.cos(rot + k * .15) * k * 14 * sc, y + Math.sin(rot + k * .15) * k * 14 * sc, 0); }
        else if (kind === 'cluster') { for (var k2 = 0; k2 < 7; k2++) cell(x + (r() - .5) * 38 * sc, y + (r() - .5) * 38 * sc, 0); }
        else if (kind === 'tetrad') { [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(function (d) { cell(x + d[0] * 15 * sc, y + d[1] * 15 * sc, 0); }); }
        else cell(x, y, 0);
      } else if (kind === 'chain') { for (var k3 = 0; k3 < 3; k3++) cell(x + Math.cos(rot) * k3 * 40 * sc, y + Math.sin(rot) * k3 * 40 * sc, rot); }
      else if (kind === 'pair') { cell(x, y, rot); cell(x + Math.cos(rot) * 40 * sc, y + Math.sin(rot) * 40 * sc, rot); }
      else cell(x, y, rot);
    }
    ctx.restore();
  }
  function appearOf(org, p) { return C.gramAppear(org, p); }

  /* ================= ১. ব্যাকটেরিয়া লাইব্রেরি ================= */
  function mountLib(root, ctx) {
    var sel = 'ecoli', q = null, qn = 0, qok = 0, qmis = 0, auto = true;
    root.innerHTML = '<div class="vl-exp"><div><div class="vl-stage"><canvas class="vl-cv" aria-label="ব্যাকটেরিয়ার ৩D মডেল"></canvas><div class="vl-hud"><span class="vl-chip" id="lbT"></span></div><div class="vl-zoomhint">টেনে ঘুরিয়ে দেখো</div></div><div class="vl-bchips fchips" id="lbChips" style="margin-top:10px"></div></div><aside class="vl-side" id="lbSide"></aside></div>';
    var V = VL3D.create($('.vl-cv', root), { yaw: .4, pitch: .3, dist: 9, target: [0, 0, 0], minDist: 4, maxDist: 16, bg: ['#2a3a5a', '#0c1220'] }), grp = null;
    $('#lbChips', root).innerHTML = D.BACT.map(function (b) { return '<button type="button" class="fc sm" data-o="' + b.id + '" aria-pressed="false">' + esc(b.n) + '</button>'; }).join('');
    function model(o) {
      if (grp) V.remove(grp); grp = V.add({ kind: 'group' }); var gram = o.gram === '+', body = gram ? '#8e4fc0' : '#e0658f', kind = arrKind(o), cap = V.add({ kind: 'group' }, grp);
      function cellAt(pos, rot) {
        var c = V.add({ kind: 'group', pos: pos, rot: rot || [0, 0, 0] }, cap);
        if (o.shape === 'rod' || o.shape === 'coccobac') { var L = o.shape === 'rod' ? 3 : 1.8; V.add({ mesh: M.capsule(L, .6, 14), color: body }, c); if (o.spore) V.add({ mesh: M.sphere(.38, 10, 7), color: '#f2e8d8', alpha: .95, pos: [o.id === 'ctet' ? 1.1 : 0, 0, 0] }, c); }
        else if (o.shape === 'comma') { var pts = []; for (var i = 0; i <= 10; i++) { var a = -.9 + i * .18; pts.push([Math.sin(a) * 1.6, Math.cos(a) * 1.6 - 1.4, 0]); } V.add({ mesh: M.tube(pts, .45, 10, function (t) { return 1 - .5 * Math.abs(t - .5) * 1.2; }), color: body }, c); }
        else V.add({ mesh: M.sphere(.75, 14, 9), color: body }, c);
        return c;
      }
      if (o.shape === 'coccus' || o.shape === 'tetrad') {
        if (kind === 'chain') for (var i = 0; i < 6; i++) cellAt([-3.6 + i * 1.45, Math.sin(i * .6) * .5, 0]);
        else if (kind === 'cluster') [[0, 0, 0], [1.4, .3, 0], [-1.3, .5, .4], [.2, 1.3, .5], [.5, -1.2, .6], [-.9, -.9, -.2], [1.2, 1.2, -.6], [-.3, .1, 1.3], [.4, .4, -1.3]].forEach(function (p) { cellAt(p); });
        else if (kind === 'tetrad') [[-.8, -.8, 0], [.8, -.8, 0], [-.8, .8, 0], [.8, .8, 0]].forEach(function (p) { cellAt(p); });
        else cellAt([0, 0, 0]);
      } else if (kind === 'pair') { cellAt([0, .9, 0]); cellAt([0, -.9, 0], [0, 0, .1]); cap.rot = [0, 0, 0]; }
      else if (kind === 'chain') { cellAt([-3.3, 0, 0]); cellAt([0, 0, 0]); cellAt([3.3, 0, 0]); }
      else cellAt([0, 0, 0]);
      if (/ক্যাপসুল/.test(o.arr)) V.add({ mesh: M.capsule(4.4, 1.15, 16), color: '#cfe8ff', alpha: .22, layer: 3 }, grp);
      var fl = o.flag; if (fl === 'peri') for (var j = 0; j < 12; j++) { var th = j / 12 * PI * 2, pts2 = []; for (var k = 0; k <= 12; k++) pts2.push([Math.cos(th) * (.7 + k * .1) * .3 + (th < PI ? 1 : -1) * k * .16, Math.sin(th) * (.62 + k * .08) + Math.sin(k * 1.1 + j) * .25, Math.cos(th + 1) * .62 + Math.cos(k * 1.1) * .25]); V.add({ mesh: M.tube(pts2, .04, 4), color: '#d9d2e8' }, grp); }
      else if (fl === 'polar') { var pts3 = []; for (var k2 = 0; k2 <= 16; k2++) pts3.push([1.6 + k2 * .22, Math.sin(k2 * .8) * .3, Math.cos(k2 * .8) * .3]); V.add({ mesh: M.tube(pts3, .05, 4), color: '#d9d2e8' }, grp); }
      var h = V.hook(function (t) { if (auto && grp) { grp.rot = [0, t / 2600, 0]; } return false; });
    }
    function info(o) {
      var c = o.col, m = o.media;
      $('#lbSide', root).innerHTML = '<h3 style="font-style:italic">' + esc(o.n) + '</h3><p class="vl-mut">' + esc(o.bn) + ' · ' + gramB(o.gram) + '</p>' +
        '<dl class="vl-kv"><dt>আকৃতি</dt><dd>' + esc(SHAPES[o.shape] || o.shape) + '</dd><dt>সজ্জা</dt><dd>' + esc(o.arr) + '</dd><dt>আকার</dt><dd>' + esc(o.size) + '</dd><dt>ফ্ল্যাজেলা</dt><dd>' + ({ none: 'নেই (নন-মোটাইল)', peri: 'সারা দেহে (peritrichous)', polar: 'এক প্রান্তে (polar)' }[o.flag]) + '</dd><dt>এন্ডোস্পোর</dt><dd>' + (o.spore ? 'আছে' : 'নেই') + '</dd><dt>অক্সিজেন</dt><dd>' + esc(o.o2) + '</dd><dt>সর্বোত্তম তাপ</dt><dd>' + bn(o.temp) + ' °C</dd></dl>' +
        '<div class="vl-info"><h4>নিউট্রিয়েন্ট অ্যাগারে কলোনি</h4><p><span class="vl-swatch" style="background:' + c.c + '"></span>' + esc(c.tex) + '; আকার ~' + bn(c.mm) + ' mm; ' + esc(c.shape) + ', ধার: ' + esc(c.edge) + ', উচ্চতা: ' + esc(c.elev) + '</p></div>' +
        '<div class="vl-tw"><table class="vl-tb"><tr><th>MacConkey</th><td>' + esc(m.mac) + '</td></tr><tr><th>EMB</th><td>' + esc(m.emb) + '</td></tr><tr><th>MSA</th><td>' + esc(m.msa) + '</td></tr><tr><th>রক্ত অ্যাগার</th><td>' + esc(m.blood) + '</td></tr>' + (m.tcbs ? '<tr><th>TCBS</th><td>' + esc(m.tcbs) + '</td></tr>' : '') + '</table></div>' +
        '<div class="vl-info"><p><b>রোগ/ভূমিকা:</b> ' + esc(o.dis) + '</p><p>' + esc(o.note) + '</p></div>' +
        '<div class="vl-ctl"><button type="button" class="btn ghost sm" data-a="spin">ঘোরা বন্ধ/চালু</button><button type="button" class="btn pri sm" data-a="quiz">চেনার কুইজ (৫টি)</button></div><div id="lbQ"></div>';
      $('#lbT', root).textContent = o.n;
    }
    function pick(id) { sel = id; var o = C.byId(D.BACT, id); model(o); info(o); $$('#lbChips [data-o]', root).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.o === id)); }); }
    function nextQ() {
      if (qn >= 5) { var lines = ['সঠিক: ' + bn(qok) + '/৫', 'ব্যাকটেরিয়া চিনতে Gram ধরন, আকৃতি, কলোনি ও নির্বাচনী মিডিয়ার ফল একসাথে মিলিয়ে দেখতে হয়।']; var f = ctx.finish({ mistakes: qmis, lines: lines }); $('#lbQ', root).innerHTML = ctx.resultHtml({ mistakes: qmis, lines: lines }, f); q = null; return; }
      var t = pickOrg(), opts = [t]; while (opts.length < 4) { var x = pickOrg(); if (opts.indexOf(x) < 0) opts.push(x); } opts.sort(function () { return Math.random() - .5; });
      var qs = [['কলোনি: ' + t.col.tex + ' (' + t.col.shape + ')', 'MacConkey: ' + t.media.mac], ['Gram ' + t.gram + ', ' + (SHAPES[t.shape] || '') + ', সজ্জা: ' + t.arr, 'রোগ: ' + t.dis]][Math.floor(Math.random() * 2)];
      q = { t: t, opts: opts }; $('#lbQ', root).innerHTML = '<div class="vl-info"><h4>প্রশ্ন ' + bn(qn + 1) + '/৫: এটি কোন ব্যাকটেরিয়া?</h4>' + qs.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('') + '<div class="vl-pick">' + opts.map(function (o) { return '<button type="button" class="vl-tool" style="font-style:italic" data-q="' + o.id + '">' + esc(o.n) + '</button>'; }).join('') + '</div><p class="vl-mini" id="lbQm"></p></div>';
    }
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-o]'); if (b) return pick(b.dataset.o);
      b = e.target.closest('[data-a]'); if (b) { if (b.dataset.a === 'spin') auto = !auto; else if (b.dataset.a === 'quiz') { qn = 0; qok = 0; qmis = 0; nextQ(); } return; }
      b = e.target.closest('[data-q]'); if (b && q) { if (b.dataset.q === q.t.id) { qok++; qn++; nextQ(); } else { qmis++; $('#lbQm', root).innerHTML = '<span class="vl-no">ভুল।</span> ' + esc(C.byId(D.BACT, b.dataset.q).n) + ' এর কলোনি/বৈশিষ্ট্য এমন নয়। আবার ভাবো, লাইব্রেরিতে তুলনা করে দেখো।'; b.disabled = true; } }
    });
    pick(sel);
  }

  /* ================= ২. গ্রাম স্টেইন ================= */
  function mountGram(root, ctx) {
    var org = pickOrg(function (b) { return b.id !== 'pmir'; });
    var WHY = 'গ্রাম স্টেইনের ক্রম: স্মিয়ার → শুকানো → তাপ-ফিক্স → ক্রিস্টাল ভায়োলেট → আয়োডিন → ডিকালারাইজার → সেফ্রানিন → মুছে শুকানো → মাইক্রোস্কোপ।';
    function why(msg) { return msg + ' ' + WHY; }
    var steps = [
      { t: 'স্মিয়ার তৈরি: স্লাইডে পানির ফোঁটা, লুপে কালচার, পাতলা ছড়ানো', d: 'পরিষ্কার স্লাইডের ওপর "স্মিয়ার" যন্ত্রে ক্লিক করো।', tool: 'smear', wrong: { dry: 'আগে স্মিয়ার বানাও।', cv: why('এখনো স্মিয়ারই হয়নি।') }, run: async function (a, S) { S.spot.alpha = .85; S.V.ping(); a.say('ছোট ফোঁটায় অল্প কালচার ছড়ানো হলো। বেশি ঘন হলে কোষ জমে রং ঠিক ধরা যায় না।', 'ok'); await a.sleep(500); } },
      { t: 'বাতাসে শুকাতে দাও', d: 'স্মিয়ার বাতাসে শুকাতে দাও (শিখার ওপর শুকিয়ো না)।', tool: 'dry', wrong: { fix: 'ভেজা স্মিয়ারে তাপ দিলে কোষ ফেটে বিকৃত হয়। আগে শুকাতে দাও।', cv: why('আগে শুকাতে হবে।') }, run: async function (a, S) { await S.V.tw(S.spot, { color: '#e8dff0' }, 800); } },
      { t: 'তাপ-ফিক্সেশন: শিখার ওপর দিয়ে কয়বার নেবে?', d: 'স্লাইড শিখার ওপর দিয়ে নিতে হবে যাতে কোষ আটকে যায়, কিন্তু পুড়ে না যায়।', input: { html: function () { return '<div class="vl-in"><label for="gf">শিখার ওপর দিয়ে নেওয়ার সংখ্যা</label><select id="gf" class="fld"><option value="1">১ বার</option><option value="3" selected>৩ বার</option><option value="8">৮ বার</option></select><button type="button" class="btn pri" data-go>ফিক্স করো</button></div>'; }, bind: function (el, a) { el.querySelector('[data-go]').onclick = function () { a.submit(+el.querySelector('#gf').value); }; } }, check: function (v, S) { S.p.fixed = v >= 2; S.p.overheat = v > 5; return { ok: true, msg: v < 2 ? 'একবারে ফিক্সেশন অপর্যাপ্ত, কোষ ভেসে যেতে পারে (দেখো পরে)।' : v > 5 ? 'বেশি তাপ হয়ে গেছে, কোষ কুঁচকে যেতে পারে (দেখো পরে)।' : 'ঠিক আছে, তাপ-ফিক্সেশন হলো (২–৩ বার যথেষ্ট)।' }; }, run: async function (a, S) { await a.sleep(300); } },
      { t: 'ক্রিস্টাল ভায়োলেট ১ মিনিট, তারপর পানিতে ধোয়া', d: 'প্রথম রং (primary stain): ক্রিস্টাল ভায়োলেটের শিশিতে ক্লিক করো।', tool: 'cv', wrong: { iodine: 'আগে ক্রিস্টাল ভায়োলেট।', safranin: why('সেফ্রানিন সবার শেষে (counterstain)।'), decolor: why('আগে প্রাথমিক রং দাও।') }, run: async function (a, S) { S.spot.color = '#5b2a8a'; S.spot.alpha = .95; S.V.ping(); await a.sleep(500); } },
      { t: 'গ্রামের আয়োডিন ১ মিনিট (মর্ড্যান্ট), তারপর ধোয়া', d: 'আয়োডিন রংকে কোষে আটকাতে সাহায্য করে (CV-I কমপ্লেক্স)।', tool: 'iodine', wrong: { safranin: why('আয়োডিন বাদ দেওয়া যাবে না।'), decolor: why('আগে আয়োডিন দাও।') }, run: async function (a, S) { S.spot.color = '#3a1c5a'; S.V.ping(); await a.sleep(500); } },
      { t: 'ডিকালারাইজার (৯৫% অ্যালকোহল): রং ধুয়ে যাওয়ার সময় ঠিক রাখো', d: '"ঢালো" চেপে অ্যালকোহল দাও। ঝরে পড়া পানি প্রায় বর্ণহীন হলে ধোয়া শুরু করো (সাধারণত ১০–২০ সেকেন্ড)।', input: { html: function () { return '<div class="vl-in"><div>সময়: <b id="dtm">০</b> সেকেন্ড</div><div class="row"><span class="vl-mini">ঝরা পানির রং:</span><span id="drip" class="vl-swatch" style="width:26px;height:26px;background:#5b2a8a"></span></div><div class="row"><button type="button" class="btn ghost" data-start>ঢালো</button><button type="button" class="btn pri" data-go disabled>পানিতে ধুয়ে থামাও</button></div></div>'; }, bind: function (el, a, S) { var t0 = 0, iv; var go = el.querySelector('[data-go]'), st = el.querySelector('[data-start]'); st.onclick = function () { t0 = Date.now(); st.disabled = true; go.disabled = false; iv = setInterval(function () { var s = (Date.now() - t0) / 1000; el.querySelector('#dtm').textContent = bn(s.toFixed(0)); var f = Math.max(0, Math.min(1, (14 - s) / 14)); el.querySelector('#drip').style.background = f > .08 ? 'rgba(91,42,138,' + (.15 + f * .85).toFixed(2) + ')' : '#f4f4f4'; if (!el.isConnected) clearInterval(iv); }, 200); }; go.onclick = function () { clearInterval(iv); a.submit(Math.round((Date.now() - t0) / 1000)); }; } }, check: function (v, S) { S.p.decolor = v; return { ok: true, msg: 'ডিকালারাইজার ' + bn(v) + ' সেকেন্ড রাখা হয়েছে।' + (v < 8 ? ' (কম হয়ে গেছে হয়তো)' : v > 25 ? ' (বেশি হয়ে গেছে হয়তো)' : ' (ভালো সময়)') }; } },
      { t: 'সেফ্রানিন ৩০–৬০ সেকেন্ড, তারপর ধোয়া', d: 'কাউন্টারস্টেইন: যেসব কোষ রং হারিয়েছে তাদের গোলাপি করে।', tool: 'safranin', wrong: { cv: 'ক্রিস্টাল ভায়োলেট ইতিমধ্যে দেওয়া হয়েছে।', iodine: 'আয়োডিন ইতিমধ্যে দেওয়া হয়েছে।' }, run: async function (a, S) { S.p.cv = true; S.p.iodine = true; S.p.safranin = true; S.spot.color = '#b5527e'; S.V.ping(); await a.sleep(500); } },
      { t: 'ব্লটিং কাগজে মুছে শুকাও', d: 'ঘষো না, চেপে মুছে নাও।', tool: 'blot', run: async function (a, S) { await a.sleep(400); } },
      { t: 'ইমারশন তেল দিয়ে ১০০× লেন্সে ফোকাস করো', d: 'ফোকাস স্লাইডার ঘুরিয়ে ছবি স্পষ্ট করো। স্পষ্ট হলেই কেবল নিচে পরের ধাপ খুলবে।', input: { html: function () { return '<div id="gsc"></div><div class="vl-in"><button type="button" class="btn pri" data-go>ছবি স্পষ্ট, পরবর্তী ধাপ</button></div>'; }, bind: function (el, a, S) { var focused = false; var sc = a.scope = ctx.scope(el.querySelector('#gsc'), { mags: [100], mag: 100, focus: true, draw: function (c, st, w, h) { drawField(c, org, S.app || C.gramAppear(org, S.p), st, w, h); }, onFocus: function (f) { S.focused = f; } }); S.app = C.gramAppear(org, S.p); sc.draw(); el.querySelector('[data-go]').onclick = function () { a.submit(!!S.focused); }; } }, check: function (v) { return v ? { ok: true } : { ok: false, msg: 'ছবি এখনো ঝাপসা। ফোকাস স্লাইডার ধীরে ঘুরিয়ে স্পষ্ট করো।' }; } },
      { t: 'পর্যবেক্ষণ: Gram ধরন, আকৃতি ও সজ্জা বলো', d: 'যা দেখছ সেই অনুযায়ী উত্তর দাও (স্লাইডার/টেনে ছবি দেখতে পারো)।', input: { html: function (S) { return '<div id="gsc2"></div><div class="vl-in"><label>Gram ধরন (রং দেখে)</label><select id="og" class="fld"><option value="">বাছো</option><option value="+">বেগুনি → Gram ধনাত্মক (+)</option><option value="-">গোলাপি/লাল → Gram ঋণাত্মক (−)</option></select><label>আকৃতি</label><select id="os" class="fld"><option value="">বাছো</option><option value="rod">দণ্ডাকার</option><option value="coccus">গোলাকার</option><option value="comma">কমা-আকৃতি</option><option value="tetrad">চারটির গুচ্ছ (টেট্রাড)</option></select><label>সজ্জা</label><select id="oa" class="fld"><option value="">বাছো</option><option value="single">একক/জোড়ায়</option><option value="chain">শিকল</option><option value="cluster">থোকা</option><option value="tetrad">টেট্রাড</option></select><button type="button" class="btn pri" data-go>জমা দাও</button></div>'; }, bind: function (el, a, S) { ctx.scope(el.querySelector('#gsc2'), { mags: [100], mag: 100, draw: function (c, st, w, h) { drawField(c, org, S.app, st, w, h); } }); el.querySelector('[data-go]').onclick = function () { a.submit({ g: el.querySelector('#og').value, s: el.querySelector('#os').value, a: el.querySelector('#oa').value }); }; } },
        check: function (v, S, a) {
          if (!v.g || !v.s || !v.a) return { ok: false, msg: 'তিনটি ঘরই বাছো।' };
          var app = S.app, seen = app.color === C.PURPLE ? '+' : app.color === C.PINK ? '-' : '?';
          var shape = org.shape === 'coccobac' ? 'rod' : org.shape, ak = arrKind(org); ak = ak === 'pair' ? 'single' : ak;
          if (app.verdict !== 'ok' || app.sparse || app.distort) return { ok: false, msg: 'তোমার স্টেইনিংয়ে ত্রুটি আছে: ' + app.note.join(' ') + ' আসলে এই জীব Gram ' + (org.gram === '+' ? 'ধনাত্মক' : 'ঋণাত্মক') + '। "আবার শুরু" চেপে নতুন করে সঠিকভাবে করো।' };
          if (v.g !== org.gram || v.s !== shape || v.a !== ak) { var bad = []; if (v.g !== org.gram) bad.push('Gram ধরন'); if (v.s !== shape) bad.push('আকৃতি'); if (v.a !== ak) bad.push('সজ্জা'); return { ok: false, msg: bad.join(', ') + ' মিলছে না। ছবি আবার ভালো করে দেখো (বড় করে টেনে ঘুরিয়ে)।' }; }
          return { ok: true };
        } }
    ];
    var cfg = {
      cam: { yaw: .5, pitch: .55, dist: 13, target: [0, 1.5, 0] }, why: { dry: WHY, fix: WHY, cv: WHY, iodine: WHY, safranin: WHY, blot: WHY },
      tools: [{ id: 'smear', l: 'স্মিয়ার', ic: '🧫' }, { id: 'dry', l: 'শুকাও', ic: '💨' }, { id: 'cv', l: 'ক্রিস্টাল ভায়োলেট', ic: '🟣' }, { id: 'iodine', l: 'আয়োডিন', ic: '🟤' }, { id: 'safranin', l: 'সেফ্রানিন', ic: '🔴' }, { id: 'blot', l: 'ব্লট', ic: '📄' }],
      steps: steps,
      build: function (V, a, S) {
        S.V = V; S.p = { fixed: false, overheat: false, cv: false, iodine: false, decolor: 0, safranin: false }; S.app = null; S.focused = false;
        P.bench(V, 20, 11); P.bunsen(V, [-6, 0, 1]); P.microscope(V, [6, 0, -1], { light: true });
        var sl = P.slide(V, [0, .4, 1.2], { spot: '#d8d0e4' }); S.spot = sl.spot; S.spot.alpha = 0;
        V.add({ mesh: M.box(5.4, .3, 2.6), color: '#7b8794', pos: [0, 0, 1.2] });
        [['cv', '#4b1f77', 'CV', -4.5], ['iodine', '#7a4a1f', 'I₂', -2.5], ['dec', '#cfe3ee', 'EtOH', 2.2], ['safranin', '#c4325f', 'Saf', 4.2]].forEach(function (b) { tag(P.bottle(V, [b[3], 0, -2.5], b[1], b[2], b[0]), b[0]); });
        tag(sl.g, 'smear');
        var lp = P.loop(V, [-.6, .4, 3.6]); lp.g.rot = [0, 0, 1.5]; V.labelFor(sl.g, 'স্লাইড', { off: [0, 1.4, 0] });
      },
      finish: function (a, S) { return { lines: ['জীবটি ছিল <i>' + esc(org.n) + '</i>: Gram ' + (org.gram === '+' ? 'ধনাত্মক' : 'ঋণাত্মক') + ', ' + esc(SHAPES[org.shape]) + ', ' + esc(org.arr) + '।', 'শুধু Gram স্টেইন দিয়ে প্রজাতি নির্ণয় হয় না; কলোনি, নির্বাচনী মিডিয়া ও বায়োকেমিক্যাল পরীক্ষা লাগে (ব্যাকটেরিয়া লাইব্রেরি দেখো)।', 'ডিকালারাইজার ' + bn(S.p.decolor) + ' সেকেন্ড ছিল (আদর্শ ১০–২০ সেকেন্ড)।'] }; }
    };
    var g = ctx.guided(cfg); var origRestart = g.api.restart;
  }

  /* ================= ৩. স্ট্রিক প্লেট ================= */
  var QNAMES = ['১', '২', '৩', '৪'];
  function mountStreak(root, ctx) {
    var org = pickOrg(function (b) { return ['pmir', 'ctet', 'lacid', 'spyo'].indexOf(b.id) < 0; });
    var R = 3.4, TOPY = .34;
    function sectorOf(x, z) { return x < 0 && z < 0 ? 0 : x > 0 && z < 0 ? 1 : x > 0 && z > 0 ? 2 : 3; }
    function drawStep(k) {
      return { t: 'সেক্টর ' + QNAMES[k] + ': ' + (k === 0 ? 'কালচার থেকে জিগজ্যাগ দাগ টানো' : 'আগের সেক্টরের দাগ ছুঁয়ে শুরু করে নতুন সেক্টরে জিগজ্যাগ টানো'),
        d: 'প্লেটের উজ্জ্বল ' + QNAMES[k] + ' নং অংশে মাউস/আঙুল টেনে ঘন জিগজ্যাগ দাগ আঁকো। ' + (k > 0 ? 'শুরুটা আগের সেক্টরের দাগের গায়ে হতে হবে। ' : '') + 'শেষে "সেক্টর শেষ" চাপো।',
        input: { html: function () { return btnIn('সেক্টর শেষ', '<div class="vl-mini">এঁকে শেষ হলে চাপো। দৈর্ঘ্য: <b id="slen">০</b></div>'); }, bind: function (el, a, S) { el.querySelector('[data-go]').onclick = function () { a.submit(k); }; S.lenEl = el.querySelector('#slen'); } },
        draw: function (a, S) {
          return { start: function (cx, cy) { S.cur = null; S.ptr = true; push(cx, cy, true); }, move: function (cx, cy) { if (S.ptr) push(cx, cy, false); }, end: function () { S.ptr = false; S.cur = null; } };
          function push(cx, cy, first) {
            var w = S.V.screenToPlane(cx, cy, TOPY + .02); if (!w) return; var th = S.g.rot[1], c = Math.cos(th), s = Math.sin(th), wx = w[0] - S.g.pos[0], wz = w[2] - S.g.pos[2], x = c * wx - s * wz, z = s * wx + c * wz;
            if (Math.hypot(x, z) > R * .93 || sectorOf(x, z) !== k) { if (first) a.say('উজ্জ্বল ' + QNAMES[k] + ' নং অংশের ভেতরে আঁকো। প্লেটের কিনারা বা অন্য সেক্টরে নয়।', 'err'); S.cur = null; return; }
            var pt = [x, TOPY + .03, z];
            if (!S.cur) { if (k > 0 && S.strokes[k].length === 0) { var near = S.pts[k - 1].some(function (q) { return Math.hypot(q[0] - x, q[2] - z) < .55; }); S.cross[k] = near; } S.cur = { pts: [pt] }; S.cur.ob = S.V.add({ pts: S.cur.pts, color: '#3b6fa0', width: 1.6, bias: .6, layer: 2 }, S.g); S.strokes[k].push(S.cur); S.pts[k].push(pt); return; }
            var l = S.cur.pts[S.cur.pts.length - 1]; var d = Math.hypot(pt[0] - l[0], pt[2] - l[2]); if (d < .04) return; S.len[k] += d; S.cur.pts.push(pt); S.pts[k].push(pt); S.V.ping(); if (S.lenEl) S.lenEl.textContent = bn(S.len[k].toFixed(1));
          }
        },
        check: function (v, S, a) {
          var need = k === 0 ? 8 : 6; if (S.len[k] < need) return { ok: false, msg: 'দাগ খুব কম। ঘন জিগজ্যাগ আঁকো (দৈর্ঘ্য কমপক্ষে ' + bn(need) + ')।' };
          if (k > 0 && !S.cross[k]) { S.strokes[k].forEach(function (s) { S.V.remove(s.ob); }); S.strokes[k] = []; S.pts[k] = []; S.len[k] = 0; if (S.lenEl) S.lenEl.textContent = '০'; return { ok: false, msg: 'নতুন সেক্টরের দাগ আগের সেক্টরের দাগ ছুঁয়ে শুরু হয়নি, তাই জীবাণু নতুন সেক্টরে পৌঁছায়নি। দাগ মুছে দিলাম, আবার আঁকো।' }; }
          return { ok: true, msg: 'সেক্টর ' + QNAMES[k] + ' সম্পন্ন।' };
        }, run: async function (a, S) { S.sec = k + 1; fan(S, S.sec); } };
    }
    function fan(S, k) {
      if (S.fanOb) { S.V.remove(S.fanOb); S.fanOb = null; } if (k > 3) return;
      var a0 = [PI, PI * 1.5, 0, PI / 2][k] + (k === 2 ? 0 : 0), base = [[-1, -1], [1, -1], [1, 1], [-1, 1]][k];
      var m = M.patch(function (u, v) { var ang = (k === 0 ? PI : k === 1 ? PI * 1.5 : k === 2 ? 0 : PI / 2) + u * PI / 2; return [Math.cos(ang) * R * .93 * v, 0, Math.sin(ang) * R * .93 * v]; }, 6, 2);
      S.fanOb = S.V.add({ mesh: m, color: '#38f5b4', alpha: .25, pos: [0, TOPY + .015, 0], layer: 2, bias: .3 }, S.g);
    }
    function flameStep(k, first) {
      return { t: first ? 'লুপ শিখায় লাল-গরম করো (জীবাণুমুক্ত)' : 'লুপ আবার শিখায় জীবাণুমুক্ত করো', d: 'বুনসেন বার্নারে ক্লিক করো। লুপের তার লাল না হওয়া পর্যন্ত গরম করতে হয়।', tool: 'flame',
        wrong: { rotate: 'আগে লুপ শিখায় জীবাণুমুক্ত করো, নইলে আগের সেক্টরের জীবাণু পরেরটায় বেশি যাবে না, পাতলাও হবে না।', plate: 'আগে লুপ জীবাণুমুক্ত করো।', tube: 'আগে লুপ জীবাণুমুক্ত করো।' },
        run: async function (a, S) { S.lp.g.pos = [-3.8, 2.2, 1]; S.lp.heat(true); S.bs.set(true); await a.sleep(1100); S.lp.heat(true); if (!first && k >= 0) S.flames[k] = true; if (!first) { await a.sleep(300); S.lp.heat(false); S.lp.g.pos = [4.6, .4, 4.2]; a.say('লুপ জীবাণুমুক্ত ও ঠান্ডা হলো। (প্রতিবার শিখায় ধরে কয়েক সেকেন্ড ঠান্ডা করতে হয়।)', 'ok'); } S.bs.set(false); } };
    }
    function rotStep() { return { t: 'প্লেট ৯০° ঘোরাও', d: 'ঢাকনা সামান্য খুলে প্লেট ঘোরাও (নীল "প্লেট ঘোরাও" বাটন)।', tool: 'rotate', run: async function (a, S) { await S.V.tw(S.g, { rot: [0, S.g.rot[1] - PI / 2, 0] }, 700); } }; }
    var steps = [flameStep(-1, true),
      { t: 'লুপ ঠান্ডা হতে দাও (৫–১০ সেকেন্ড)', d: 'গরম লুপে ডুবালে জীবাণু মরে যায়। "ঠান্ডা করো" চাপো।', tool: 'cool', wrong: { tube: 'লুপ এখনো গরম! গরম লুপ কালচারে ডুবালে জীবাণু মরে যাবে। আগে ঠান্ডা করো।' }, run: async function (a, S) { await a.sleep(900); S.lp.heat(false); S.lp.g.pos = [4.6, .4, 4.2]; } },
      { t: 'কালচারের টিউবের ঢাকনা খুলে মুখ শিখায় ধরে লুপ ভরো', d: 'কালচার টিউবে ক্লিক করো।', tool: 'tube', wrong: { plate: 'আগে কালচার থেকে জীবাণু নাও।' }, run: async function (a, S) { await S.V.tw(S.cap, { pos: [-6.5, 5.5, 2.3] }, 400); S.lp.g.pos = [-6.5, 1.6, 2.3]; await a.sleep(500); S.bs.set(true); await a.sleep(250); S.bs.set(false); await S.V.tw(S.cap, { pos: [-6.5, 3.9, 2.3] }, 300); S.lp.g.pos = [4.6, .4, 4.2]; } },
      { t: 'প্লেটের ঢাকনা সামান্য খোলো', d: 'ঢাকনা পুরো খুলো না, ওপরে ধরে রাখো যাতে বাতাসের জীবাণু কম ঢোকে। প্লেটে ক্লিক করো।', tool: 'plate', wrong: { rotate: 'আগে ঢাকনা সামান্য খোলো।', flame: 'আগে প্লেট খুলে সেক্টর ১ আঁকো।' }, run: async function (a, S) { await S.V.tw(S.lid, { pos: [0, 1.2, -.8], rot: [.35, 0, 0] }, 500); } },
      drawStep(0), flameStep(0), rotStep(), drawStep(1), flameStep(1), rotStep(), drawStep(2), flameStep(2), rotStep(), drawStep(3),
      { t: 'লুপ জীবাণুমুক্ত করে ঢাকনা বন্ধ করো', d: 'ব্যবহারের পর লুপ শিখায় নষ্ট করো, তারপর ঢাকনা বন্ধ।', tool: 'flame', wrong: { plate: 'আগে লুপ জীবাণুমুক্ত করো।' }, run: async function (a, S) { S.lp.g.pos = [-3.8, 2.2, 1]; S.lp.heat(true); S.bs.set(true); await a.sleep(900); S.lp.heat(false); S.bs.set(false); S.lp.g.pos = [4.6, .4, 4.2]; await S.V.tw(S.lid, { pos: [0, 0, 0], rot: [0, 0, 0] }, 500); S.flames[3] = true; } },
      { t: 'ইনকিউবেটরে ২৪ ঘণ্টা: তাপমাত্রা ও সময় ঠিক করো', d: S_INCDESC(), input: { html: function () { return '<div class="vl-in"><label for="it">তাপমাত্রা</label><select id="it" class="fld"><option value="25">২৫ °C</option><option value="30">৩০ °C</option><option value="37">৩৭ °C</option><option value="45">৪৫ °C</option></select><label for="ih">সময়</label><select id="ih" class="fld"><option value="2">২ ঘণ্টা</option><option value="24">২৪ ঘণ্টা</option><option value="96">৯৬ ঘণ্টা</option></select><label><input type="checkbox" id="iv" checked> প্লেট উল্টে (agar উপরে) রাখো</label><button type="button" class="btn pri" data-go>ইনকিউবেটরে রাখো</button></div>'; }, bind: function (el, a) { el.querySelector('[data-go]').onclick = function () { a.submit({ t: +el.querySelector('#it').value, h: +el.querySelector('#ih').value, inv: el.querySelector('#iv').checked }); }; } },
        check: function (v, S) { var g = growthOf(org, v); S.inc = v; S.growth = g; if (g.q === 'none' || g.q === 'tiny') return { ok: false, msg: g.msg }; if (!v.inv) { return { ok: false, msg: 'প্লেট উল্টো না রাখলে ঢাকনার জমা পানি অ্যাগারে পড়ে দাগ ছড়িয়ে দেয়। উল্টে (ঢাকনা নিচে) রাখো।' }; } return { ok: true, msg: 'ইনকিউবেশন সম্পন্ন।' }; },
        run: async function (a, S) { a.hud('<span class="vl-chip">ইনকিউবেটরে… <b>' + bn(S.inc.h) + ' ঘণ্টা</b></span>'); await S.V.tw(S.g, { pos: [8.5, 1.6, -4] }, 700); await a.sleep(1100); await S.V.tw(S.g, { pos: [0, 0, 1.5] }, 700); a.hud(''); grow(S, org); await S.V.camTo({ pitch: 1.35, dist: 9 }, 700); } }
    ];
    function S_INCDESC() { return 'এই জীবের জন্য আদর্শ তাপমাত্রা ও সময় বেছে নাও। (জীবাণু বেশিরভাগ ১৮–৪৮ ঘণ্টায় গণনাযোগ্য কলোনি দেয়।)'; }
    function growthOf(o, v) {
      var d = Math.abs(v.t - o.temp);
      if (v.h < 12) return { q: 'tiny', msg: 'মাত্র ' + bn(v.h) + ' ঘণ্টায় কলোনি দেখা যাবে না। ১৮–৪৮ ঘণ্টা রাখো।' };
      if (d > 8) return { q: 'none', msg: 'এই তাপমাত্রায় ' + o.n + ' ভালো বাড়ে না (আদর্শ প্রায় ' + bn(o.temp) + ' °C)। তাপমাত্রা বদলাও।' };
      return { q: 'good', over: v.h > 72, poor: d > 3 };
    }
    function grow(S, o) {
      var sec = S.strokes.map(function (a) { return a; }), so = C.streakOutcome(S.len.map(function (l, i) { return { len: l, crossed: i === 0 ? true : !!S.cross[i] }; }), S.flames), dots = [], r = C.rng(Date.now()), col = o.col.c, rad = .06 + o.col.mm * .012;
      so.dens.forEach(function (d, k) {
        var pts = S.pts[k]; if (!pts.length || d <= 0) return; var n = Math.max(2, Math.round(d * S.len[k] * 3)), conf = d > 1.5;
        if (conf) pts.forEach(function (p, i) { if (i % 2 === 0) dots.push({ p: [p[0] + (r() - .5) * .05, TOPY + .06, p[2] + (r() - .5) * .05], r: rad * 1.1, c: col }); });
        else for (var i = 0; i < n; i++) { var p = pts[Math.floor(r() * pts.length)]; dots.push({ p: [p[0] + (r() - .5) * .22, TOPY + .06, p[2] + (r() - .5) * .22], r: rad * (.9 + r() * .4), c: col }); }
      });
      S.strokes.forEach(function (ss) { ss.forEach(function (s) { s.ob.alpha = .18; }); });
      S.V.add({ dots: dots, flat: true, layer: 2, bias: .8 }, S.g); S.so = so; S.V.ping();
    }
    var cfg = {
      cam: { yaw: .15, pitch: 1.1, dist: 12, target: [0, 0, 1.5] }, minDist: 5,
      why: { rotate: 'এখন প্লেট ঘোরানোর ধাপ নয়।', tube: 'কালচার টিউবে এখন নয়।', plate: 'ক্রম মেনে চলো।', cool: 'এখন ঠান্ডা করার ধাপ নয়।' },
      tools: [{ id: 'flame', l: 'বুনসেন/লুপ জীবাণুমুক্ত', ic: '🔥' }, { id: 'cool', l: 'ঠান্ডা করো', ic: '❄' }, { id: 'tube', l: 'কালচার টিউব', ic: '🧪' }, { id: 'plate', l: 'প্লেটের ঢাকনা', ic: '🥏' }, { id: 'rotate', l: 'প্লেট ঘোরাও', ic: '↻' }],
      steps: steps,
      build: function (V, a, S) {
        S.V = V; S.strokes = [[], [], [], []]; S.pts = [[], [], [], []]; S.len = [0, 0, 0, 0]; S.cross = [true, false, false, false]; S.flames = [false, false, false]; S.sec = 0;
        P.bench(V, 24, 13); var bs = S.bs = P.bunsen(V, [-3.8, 0, 1]); V.add({ mesh: M.box(3, .1, 2), color: '#7b8794', pos: [0, 0, 0], vis: false });
        var pt = P.petri(V, [0, 0, 1.5], { r: R, pick: true, id: 'plate', agar: '#ecd78f' }); S.g = pt.g; S.lid = pt.lid; tag(pt.lid, 'plate');
        var gl = V.add({ mesh: M.cyl(R + .05, R + .05, .001, 4), color: '#000', alpha: 0 }, S.g);
        V.add({ pts: [[-R * .93, TOPY + .02, 0], [R * .93, TOPY + .02, 0]], color: '#ffffff', alpha: .5, width: .8, bias: .4, layer: 2 }, S.g); V.add({ pts: [[0, TOPY + .02, -R * .93], [0, TOPY + .02, R * .93]], color: '#ffffff', alpha: .5, width: .8, bias: .4, layer: 2 }, S.g);
        [[-1.6, -1.6], [1.6, -1.6], [1.6, 1.6], [-1.6, 1.6]].forEach(function (p, i) { var lab = V.add({ kind: 'group', pos: [p[0], TOPY + .03, p[1]] }, S.g); V.labelFor(lab, QNAMES[i], { off: [0, .3, 0], color: '#0B8F73' }); });
        var tb = P.tube(V, [-6.5, 0, 2.3], { id: 'tube', pick: true, r: .5, h: 3.8 }); tb.fill(.8, '#e9dca0', 0); S.cap = V.add({ mesh: M.cyl(.45, .45, .5, 12), color: '#d94b4b', pos: [-6.5, 3.9, 2.3], id: 'tube', pick: true }); V.labelFor(tb.g, org.n, { off: [0, 4.9, 0] });
        S.lp = P.loop(V, [4.6, .4, 4.2]); S.lp.g.rot = [0, 0, 1.5]; tag(S.bs.g, 'flame'); P.incubator(V, [9, 0, -5.5], {});
        S.fanOb = null; fan(S, 0);
      },
      finish: function (a, S) {
        var so = S.so, lines = ['জীব: <i>' + esc(org.n) + '</i> (কলোনি: ' + esc(org.col.tex) + ')', so.isolated ? 'শেষ সেক্টরে আলাদা আলাদা কলোনি পাওয়া গেছে: এই কলোনি থেকে বিশুদ্ধ কালচার (pure culture) বানানো যাবে।' : 'আলাদা কলোনি পাওয়া যায়নি।'].concat(so.notes);
        if (S.growth && S.growth.over) lines.push('৯৬ ঘণ্টা বেশি সময়: কলোনি শুকিয়ে অতিরিক্ত বেড়ে গেছে, সাধারণত ১৮–৪৮ ঘণ্টায় দেখতে হয়।'); if (S.growth && S.growth.poor) lines.push('তাপমাত্রা আদর্শ থেকে একটু দূরে, তাই বৃদ্ধি ধীর।');
        return { lines: lines };
      }
    };
    cfg.steps = steps;
    ctx.guided(cfg);
  }

  /* ================= ৪. ইনকিউবেটর ================= */
  function mountIncub(root, ctx) {
    root.innerHTML = '<div class="vl-setup"><h3>ইনকিউবেটরে পেট্রি ডিশ রাখা</h3><p class="vl-mut">একটি জীব বেছে নাও। প্লেটে লেবেল দিয়ে, উল্টে ইনকিউবেটরে রাখো ও সঠিক তাপমাত্রা-সময় ঠিক করো।</p><label for="ibo">জীব</label><select id="ibo" class="fld">' + D.BACT.map(function (b) { return '<option value="' + b.id + '">' + esc(b.n) + '</option>'; }).join('') + '</select><button type="button" class="btn pri" data-go>শুরু করো</button></div>';
    root.querySelector('[data-go]').onclick = function () { run(C.byId(D.BACT, $('#ibo', root).value)); };
    function run(org) {
      var steps = [
        { t: 'প্লেটের তলায় লেবেল লেখো', d: 'ডিশের নিচের অংশে (ঢাকনায় নয়) জীবের নাম, তারিখ ও নিজের নাম লেখো। প্লেটে ক্লিক করো।', tool: 'label', wrong: { invert: 'আগে লেবেল করো।', door: 'আগে লেবেল করো।' }, run: async function (a, S) { S.lab.vis = true; S.V.ping(); a.say('লেবেল ডিশের তলায় (agar-এর দিকে) লিখতে হয়, কারণ ঢাকনা খুলে গেলে ঢাকনা বদলে যেতে পারে।', 'ok'); await a.sleep(300); } },
        { t: 'প্লেট উল্টে দাও (agar ওপরে, ঢাকনা নিচে)', d: '"উল্টে দাও" চাপো। কেন? ঘনীভূত পানি ঢাকনা থেকে agar-এ পড়ে না।', tool: 'invert', wrong: { door: 'আগে প্লেট উল্টে নাও।' }, run: async function (a, S) { await S.V.tw(S.g, { rot: [PI, 0, 0], pos: [0, 1.2, 1.5] }, 700); } },
        { t: 'ইনকিউবেটরের দরজা খোলো', d: 'ইনকিউবেটরে ক্লিক করো।', tool: 'door', wrong: { place: 'আগে দরজা খোলো।' }, run: async function (a, S) { await S.inc.open(true); } },
        { t: 'প্লেটটি তাকে রাখো', d: 'প্লেটে ক্লিক করো বা "তাকে রাখো" চাপো।', tool: 'place', run: async function (a, S) { await S.V.tw(S.g, { pos: [8.2, 2.4, -2.5] }, 800); await S.inc.open(false); } },
        { t: 'তাপমাত্রা, সময় ও পরিবেশ ঠিক করো', d: 'এই জীবের অক্সিজেনের প্রয়োজন ও আদর্শ তাপমাত্রা মেনে সেট করো। (লাইব্রেরি দেখলে তথ্য পাবে।)', input: { html: function () { return '<div class="vl-in"><label for="a1">তাপমাত্রা</label><select id="a1" class="fld"><option value="25">২৫ °C</option><option value="30">৩০ °C</option><option value="37" selected>৩৭ °C</option><option value="45">৪৫ °C</option></select><label for="a2">সময়</label><select id="a2" class="fld"><option value="6">৬ ঘণ্টা</option><option value="24" selected>২৪ ঘণ্টা</option><option value="48">৪৮ ঘণ্টা</option><option value="120">১২০ ঘণ্টা</option></select><label for="a3">পরিবেশ</label><select id="a3" class="fld"><option value="aero">সাধারণ (অক্সিজেনযুক্ত)</option><option value="an">অ্যানারোবিক জার</option></select><button type="button" class="btn pri" data-go>চালু করো</button></div>'; }, bind: function (el, a) { el.querySelector('[data-go]').onclick = function () { a.submit({ t: +el.querySelector('#a1').value, h: +el.querySelector('#a2').value, atm: el.querySelector('#a3').value }); }; } },
          check: function (v, S) {
            var strictAn = /কঠোর/.test(org.o2), d = Math.abs(v.t - org.temp);
            if (strictAn && v.atm === 'aero') return { ok: false, msg: org.n + ' কঠোর অ্যানারোব: অক্সিজেনে বাড়ে না। অ্যানারোবিক জার/চেম্বার বেছে নাও।' };
            if (!strictAn && v.atm === 'an' && /অ্যারোব$/.test(org.o2) && !/ফ্যাকাল্টেটিভ/.test(org.o2)) return { ok: false, msg: org.n + ' অ্যারোব, অক্সিজেন ছাড়া বাড়বে না।' };
            if (v.h < 12) return { ok: false, msg: 'মাত্র ' + bn(v.h) + ' ঘণ্টায় কলোনি দেখা যায় না। ১৮–৪৮ ঘণ্টা দাও।' };
            if (d > 8) return { ok: false, msg: org.n + ' এর আদর্শ তাপমাত্রা প্রায় ' + bn(org.temp) + ' °C। ' + bn(v.t) + ' °C-এ বৃদ্ধি হয় না বা খুব কম।' };
            S.set = v; S.over = v.h > 72; S.poor = d > 3; return { ok: true }; },
          run: async function (a, S) { a.hud('<span class="vl-chip">ইনকিউবেটর চলছে… <b>' + bn(S.set.t) + ' °C</b></span>'); await a.sleep(1300); a.hud('<span class="vl-chip"><b>' + bn(S.set.h) + ' ঘণ্টা পর</b></span>'); } },
        { t: 'প্লেট বের করে কলোনি পর্যবেক্ষণ করো', d: '"প্লেট বের করো" চাপো।', tool: 'out', run: async function (a, S) { await S.inc.open(true); await S.V.tw(S.g, { rot: [0, 0, 0], pos: [0, 0, 1.5] }, 800); S.inc.open(false); var r = C.rng(Date.now()), n = S.over ? 70 : S.poor ? 25 : 55, dots = []; for (var i = 0; i < n; i++) { var an = r() * PI * 2, rr = Math.sqrt(r()) * 3; dots.push({ p: [Math.cos(an) * rr, .34, Math.sin(an) * rr + 0], r: .06 + org.col.mm * (S.over ? .02 : .011) * (S.poor ? .6 : 1) * (.7 + r() * .6), c: org.col.c }); } S.V.add({ dots: dots, flat: true, layer: 2, bias: .8 }, S.g); S.V.pk && 0; await S.V.camTo({ pitch: 1.3, dist: 9, target: [0, 0, 1.5] }, 700); } }
      ];
      ctx.guided({ cam: { yaw: .3, pitch: .6, dist: 17, target: [3, 2, -1] }, steps: steps, why: { label: 'লেবেল আগেই করা হয়েছে।' },
        tools: [{ id: 'label', l: 'লেবেল', ic: '🏷' }, { id: 'invert', l: 'উল্টে দাও', ic: '🔄' }, { id: 'door', l: 'দরজা খোলো', ic: '🚪' }, { id: 'place', l: 'তাকে রাখো', ic: '📥' }, { id: 'out', l: 'প্লেট বের করো', ic: '📤' }],
        build: function (V, a, S) { S.V = V; P.bench(V, 26, 12); var pt = P.petri(V, [0, 0, 1.5], { r: 2.4, pick: true, id: 'label', agar: '#ecd78f' }); S.g = pt.g; tag(pt.g, 'label'); S.lab = V.add({ mesh: M.box(1.6, .02, .5), color: '#ffffff', pos: [0, -.02, 1.7], vis: false }, S.g); S.inc = P.incubator(V, [8.5, 0, -4.5], { pick: true, id: 'door' }); },
        onPick: function (id, h, a, S) { if (id === 'door' && a.step() === 3) return false; return false; },
        finish: function () { return { lines: ['জীব: <i>' + esc(org.n) + '</i>; আদর্শ ' + bn(org.temp) + ' °C, অক্সিজেন: ' + esc(org.o2) + '।', 'কলোনি: ' + esc(org.col.tex) + '; আকার ~' + bn(org.col.mm) + ' mm।', 'প্লেট উল্টো করে রাখা, লেবেল তলায়, আর ১৮–৪৮ ঘণ্টা: এটাই প্রমিত নিয়ম।'] }; } });
    }
  }

  VLab.register({ lab: 'micro', id: 'mb-lib', title: 'ব্যাকটেরিয়া লাইব্রেরি (৩D)', desc: '১২টি ব্যাকটেরিয়ার ৩D মডেল ঘুরিয়ে দেখো: আকৃতি, ফ্ল্যাজেলা, স্পোর, কলোনি ও মিডিয়ার ফল। শেষে চেনার কুইজ।', ic: '🦠', xp: 30, tag: '৩D · ১২ জীব', mount: mountLib });
  VLab.register({ lab: 'micro', id: 'mb-gram', title: 'গ্রাম স্টেইনিং (ধাপে ধাপে)', desc: 'স্মিয়ার থেকে মাইক্রোস্কোপ পর্যন্ত। ডিকালারাইজারের সময় ভুল করলে কী হয় নিজের চোখে দেখো।', ic: '🔬', xp: 60, tag: '৩D · ১০০× ভিউ', mount: mountGram });
  VLab.register({ lab: 'micro', id: 'mb-streak', title: 'স্ট্রিক প্লেটিং মেথড (কোয়াড্র্যান্ট)', desc: 'মাউস/আঙুলে প্লেটে দাগ টানো, লুপ জীবাণুমুক্ত করো, প্লেট ঘোরাও। আলাদা কলোনি পেলে সফল।', ic: '🥏', xp: 80, tag: '৩D · আঁকা', mount: mountStreak });
  VLab.register({ lab: 'micro', id: 'mb-incub', title: 'ইনকিউবেটরে পেট্রি ডিশ রাখা', desc: 'লেবেল, উল্টে রাখা, তাপমাত্রা, সময় ও অক্সিজেন ঠিক করো; ভুল হলে বৃদ্ধি হয় না।', ic: '🌡', xp: 50, tag: '৩D', mount: mountIncub });
  window.VLMicro = { drawField: drawField, tag: tag, btnIn: btnIn, pickOrg: pickOrg };
})();
