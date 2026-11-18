/* GEB Hub: গেম জোন (v3.4), শেল, প্রোফাইল (XP, লেভেল, স্ট্রিক, ব্যাজ), শেয়ার্ড MCQ রানার, ব্যাচ ওয়ার।
   জিন-ম্যাচ, কুইজ শো, মিউটেশন চ্যালেঞ্জ আছে game-play.js-এ। খেলার ডেটা ব্রাউজারে (localStorage: geb_game_v1)।
   শুধু ব্যাচ ওয়ারের দৈনিক স্কোর কমিউনিটি লগইন থাকলে সার্ভারে যায়। */
(function () {
  'use strict';
  var mount = document.getElementById('gameMount'), G = window.GEBGame, GD = window.GEBGameData;
  if (!mount || !G || !GD) return;
  var KEY = 'geb_game_v1', GOAL = 30;

  /* ---------- হেল্পার ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var bn = function (n) { return String(n).replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'[d]; }); };
  var num = function (n) { return bn(Number(n).toLocaleString('en-US')); };
  var toast = function (m) { if (window.__gebToast) window.__gebToast(m); };
  var todayIso = function () { return G.isoOf(new Date()); };
  var dhakaDay = function () { return new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10); };
  var batchLabel = function (b) { var m = /^(\d{4})-(\d{2})$/.exec(b || ''); return m ? bn(m[1].slice(2)) + '-' + bn(m[2]) : esc(b); };
  var mmss = function (ms) { var s = Math.floor(ms / 1000); return bn(Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60)); };
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }

  /* ---------- সেভ করা অবস্থা ---------- */
  var DEF = { app: 'geb-game', v: 1, xp: 0, sessions: 0, correct: 0, answered: 0, pairs: 0, matchPerfect: 0, quizBest: 0, quizWins: 0, quizNoLife: 0, mutDone: {}, warDays: 0, days: [], badges: {}, wrongQ: [], pending: [], daily: {}, today: { day: '', xp: 0 }, prefs: { cat: 'mix', n: 8, mode: 'quick', timer: 60, diff: 'easy' } };
  var S = Object.assign({}, JSON.parse(JSON.stringify(DEF)), lsGet(KEY) || {});
  S.prefs = Object.assign({}, DEF.prefs, S.prefs || {});
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
  function ext() {
    var nb = lsGet('geb_notebook_v1'), ex = 0;
    try { ex = window.GEBStore ? GEBStore.hist().length : 0; } catch (e) { }
    var dx = lsGet('geb_dx_v1') || {}, cnt = function (o) { return Object.keys(o || {}).filter(function (k) { return o[k] && o[k].n; }).length; };
    var a = cnt(dx.ts), b = cnt(dx.fo), c = cnt(dx.dx);
    return { labEntries: nb && nb.entries ? nb.entries.length : 0, exams: ex, dxTs: a, dxFo: b, dxDx: c, dxAll: a + b + c };
  }
  function stats() { var st = G.streak(S.days, todayIso()); return Object.assign({}, S, { mutSolved: Object.keys(S.mutDone).length, bestStreak: st.best }); }
  function progress() { return G.badgeProgress(stats(), ext(), GD.BADGES, GD.MUT.length); }
  function level() { return G.levelInfo(S.xp, GD.LEVELS); }
  function checkBadges() {
    var fresh = [];
    progress().forEach(function (b) { if (b.done && !S.badges[b.id]) { S.badges[b.id] = Date.now(); fresh.push(b); } });
    if (fresh.length) { save(); toast('নতুন ব্যাজ: ' + fresh.map(function (b) { return b.icon + ' ' + b.name; }).join(', ')); }
    return fresh;
  }
  function paintChip() {
    var c = $('#gameChip'); if (!c) return; var l = level();
    c.hidden = false; c.textContent = 'Lv ' + bn(l.lv) + ' · ' + num(S.xp) + ' XP';
  }
  /* কোনো গেম শেষে এটি ডাকা হয়: XP, সঠিক উত্তর ইত্যাদি যোগ, স্ট্রিক, ব্যাজ */
  function award(ch) {
    ch = ch || {}; var before = level().lv, t = todayIso(), bonus = 0;
    if (ch.session) { S.sessions++; if (S.days.indexOf(t) < 0) { S.days.push(t); S.days = S.days.slice(-120); bonus = 10; } }
    var xp = (ch.xp || 0) + bonus;
    if (S.today.day !== t) S.today = { day: t, xp: 0 };
    S.today.xp += xp; S.xp += xp;
    S.correct += ch.correct || 0; S.answered += ch.answered || 0; S.pairs += ch.pairs || 0; S.matchPerfect += ch.matchPerfect || 0;
    if ((ch.quizBest || 0) > S.quizBest) S.quizBest = ch.quizBest;
    S.quizWins += ch.quizWins || 0; S.quizNoLife += ch.quizNoLife || 0; S.warDays += ch.warDays || 0;
    if (ch.mutDone) { var o = S.mutDone[ch.mutDone.id]; S.mutDone[ch.mutDone.id] = { ts: Date.now(), perfect: !!(ch.mutDone.perfect || (o && o.perfect)) }; }
    save();
    var nb = checkBadges(), after = level(); paintChip();
    return { xp: xp, bonus: bonus, newBadges: nb, levelUp: after.lv > before ? after : null };
  }
  function awardHtml(r) {
    if (!r) return '';
    var h = '<div class="gm-award"><b>+' + num(r.xp) + ' XP</b>' + (r.bonus ? ' <span class="chip">আজকের প্রথম খেলা +' + bn(r.bonus) + '</span>' : '');
    if (r.levelUp) h += ' <span class="chip sig">লেভেল আপ! ' + esc(r.levelUp.name) + '</span>';
    r.newBadges.forEach(function (b) { h += ' <span class="chip sig">' + b.icon + ' ' + esc(b.name) + '</span>'; });
    return h + '</div>';
  }
  function noteWrong(q) {
    S.wrongQ = S.wrongQ.filter(function (x) { return x.q !== q.q; });
    S.wrongQ.unshift({ q: q.q, opts: q.opts, ans: q.ans, exp: q.exp, level: q.level }); S.wrongQ = S.wrongQ.slice(0, 40); save();
  }
  function clearWrong(q) { S.wrongQ = S.wrongQ.filter(function (x) { return x.q !== q.q; }); save(); }

  /* অ্যাডমিনের MCQ (৪+ অপশন) মাঝারি লেভেলে যোগ হয় */
  function extraQs() {
    var d = window.GEB_D, out = [];
    ((d && d.quiz) || []).forEach(function (x) { if (x && x.type === 'mcq' && x.opts && x.opts.length >= 4 && x.ans >= 0) out.push({ q: x.q, opts: x.opts, ans: x.ans, exp: x.exp }); });
    return out;
  }

  /* ---------- শেয়ার্ড MCQ রানার (দৈনিক কুইজ ও রিভিশনে) ---------- */
  var LV = { 1: 'সহজ', 2: 'মাঝারি', 3: 'কঠিন' };
  function mcqRun(box, o) {
    var i = 0, picked = [], t0 = Date.now(), locked = false;
    function paint() {
      var q = o.qs[i];
      box.innerHTML = '<div class="gm-hd"><b>প্রশ্ন ' + bn(i + 1) + '/' + bn(o.qs.length) + '</b><span class="gm-mut">' + esc(o.title || '') + '</span><span class="chip">' + (LV[q.level] || '') + '</span></div>' +
        '<div class="gm-bar"><i style="width:' + Math.round(i / o.qs.length * 100) + '%"></i></div>' +
        '<p class="gm-qt">' + esc(q.q) + '</p><div class="gm-opts">' + q.opts.map(function (t, k) { return '<button type="button" class="gm-opt" data-k="' + k + '"><b>' + 'ABCD'[k] + '</b>' + esc(t) + '</button>'; }).join('') + '</div><div class="gm-fb" aria-live="polite"></div>';
      locked = false;
    }
    box.onclick = function (e) {
      var b = e.target.closest('.gm-opt'), n = e.target.closest('[data-next]');
      if (n) { i++; if (i >= o.qs.length) return o.onFinish({ picked: picked, ms: Date.now() - t0, correct: picked.filter(function (p, k) { return p === o.qs[k].ans; }).length }); return paint(); }
      if (!b || locked) return; locked = true;
      var q = o.qs[i], k = +b.dataset.k, ok = k === q.ans; picked[i] = k;
      $$('.gm-opt', box).forEach(function (x, j) { x.disabled = true; if (j === q.ans) x.classList.add('ok'); else if (j === k) x.classList.add('bad'); });
      if (!ok) noteWrong(q); else if (o.onCorrect) o.onCorrect(q);
      $('.gm-fb', box).innerHTML = '<p class="' + (ok ? 'gm-good' : 'gm-no') + '">' + (ok ? '✓ সঠিক' : '✗ সঠিক উত্তর: ' + 'ABCD'[q.ans]) + '</p>' + (q.exp ? '<p class="gm-mut">' + esc(q.exp) + '</p>' : '') + '<button type="button" class="btn pri sm" data-next="1">' + (i + 1 >= o.qs.length ? 'ফলাফল দেখো' : 'পরের প্রশ্ন') + '</button>';
    };
    paint();
  }

  /* ---------- ভিউ রেজিস্ট্রি ---------- */
  var views = {}, TABS = [['home', 'প্রোফাইল ও ব্যাজ'], ['match', 'জিন-ম্যাচ'], ['quiz', 'কুইজ শো'], ['mut', 'মিউটেশন চ্যালেঞ্জ'], ['war', 'ব্যাচ ওয়ার']];
  var tab = null; try { tab = sessionStorage.getItem('geb_gm_tab'); } catch (e) { }
  if (!TABS.some(function (t) { return t[0] === tab; })) tab = 'home';
  function register(id, v) { views[id] = v; }
  function stopCur() { var v = views[tab]; if (v && v.stop) v.stop(); }
  function renderBody() {
    var v = views[tab], body = $('#gmBody'); if (!body) return;
    var fresh = body.cloneNode(false); body.parentNode.replaceChild(fresh, body); body = fresh;
    if (!v) { body.innerHTML = '<p class="gm-mut">এই অংশ লোড হয়নি, পেজ রিফ্রেশ করুন।</p>'; return; }
    v.mount(body);
    $$('#gmTabs [role="tab"]').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.t === tab)); });
  }
  function go(id, scroll) {
    if (!views[id]) return; stopCur(); tab = id; try { sessionStorage.setItem('geb_gm_tab', id); } catch (e) { } renderBody();
    if (scroll !== false) { var sec = $('#games'); if (sec) window.scrollTo({ top: sec.getBoundingClientRect().top + window.scrollY - 64, behavior: 'smooth' }); }
  }

  /* ---------- হোম: প্রোফাইল, লক্ষ্য, ব্যাজ ---------- */
  var TILES = [['match', '🧩', 'জিন-ম্যাচ', 'প্রোটিন, এনজাইম, রোগের নাম মেলাও'], ['quiz', '🎙️', 'কে হতে চায় বায়োটেকনোলজিস্ট', '১৫ ধাপ, লাইফলাইন, বন্ধুদের সাথে'], ['mut', '🧬', 'মিউটেশন চ্যালেঞ্জ', 'DNA-তে ভুল খুঁজে রোগ বলো'], ['war', '⚔️', 'ব্যাচ ওয়ার', '২৫-২৬ বনাম ২৪-২৫, দৈনিক কুইজ']];
  register('home', {
    mount: function (root) {
      function paint() {
        var l = level(), st = G.streak(S.days, todayIso()), tx = S.today.day === todayIso() ? S.today.xp : 0, bp = progress(), got = bp.filter(function (b) { return b.done; }).length;
        root.innerHTML = '<div class="gm-prof"><div class="gm-lv"><b>Lv ' + bn(l.lv) + '</b><span>' + esc(l.name) + '</span></div>' +
          '<div class="gm-xp"><div class="gm-bar"><i style="width:' + l.pct + '%"></i></div><small>' + num(S.xp) + ' XP' + (l.max ? ' · সর্বোচ্চ লেভেল' : ' · ' + esc(l.nextName) + '-এ যেতে আরও ' + num(l.left) + ' XP') + '</small></div>' +
          '<div class="gm-stats"><span>🔥 <b>' + bn(st.cur) + '</b> দিনের ধারা</span><span>🎯 আজ <b>' + bn(Math.min(tx, GOAL)) + '/' + bn(GOAL) + '</b> XP</span><span>✅ <b>' + num(S.correct) + '</b> সঠিক উত্তর</span><span>🧩 <b>' + num(S.pairs) + '</b> জোড়া</span><span>🏅 <b>' + bn(got) + '/' + bn(bp.length) + '</b> ব্যাজ</span></div></div>' +
          '<div class="gm-tiles">' + TILES.map(function (t) { return '<button type="button" class="gm-tile" data-go="' + t[0] + '"><i>' + t[1] + '</i><b>' + t[2] + '</b><span>' + t[3] + '</span></button>'; }).join('') + '</div>' +
          (S.wrongQ.length ? '<p class="gm-mut">ভুল হওয়া ' + bn(S.wrongQ.length) + 'টি প্রশ্ন জমা আছে, <button type="button" class="pl-lk" data-go="quiz">কুইজ শো ট্যাবে রিভিশন করো</button>।</p>' : '') +
          '<h3 class="gm-h">ব্যাজ</h3><div class="gm-badges">' + bp.map(function (b) {
            return '<div class="gm-badge' + (b.done ? ' on' : '') + '" title="' + esc(b.desc) + '"><i>' + (b.done ? b.icon : '🔒') + '</i><b>' + esc(b.name) + '</b><small>' + esc(b.desc) + '</small>' + (b.done ? '<em>অর্জিত</em>' : '<div class="gm-bar"><i style="width:' + Math.round(b.val / b.target * 100) + '%"></i></div><em>' + num(b.val) + '/' + num(b.target) + '</em>') + '</div>';
          }).join('') + '</div>' +
          '<div class="gm-row"><button type="button" class="btn ghost sm" data-a="exp">ব্যাকআপ নামান</button><label class="btn ghost sm">ফেরত আনুন<input type="file" accept="application/json" data-a="imp" hidden></label></div>' +
          '<p class="gm-mut">XP, ব্যাজ ও স্ট্রিক ডিফল্টে শুধু এই ব্রাউজারে সেভ থাকে। ব্রাউজারের ডেটা মুছলে হারাবে, তাই কমিউনিটি প্রোফাইল থেকে সিঙ্ক চালু করুন বা মাঝে মাঝে ব্যাকআপ নিন। ল্যাব ও পরীক্ষার ব্যাজ নোটবুক আর পরীক্ষা ট্যাব থেকে আসে।</p>';
      }
      checkBadges(); paint();
      root.addEventListener('click', function (e) {
        var g = e.target.closest('[data-go]'); if (g) return go(g.dataset.go);
        if (e.target.closest('[data-a="exp"]')) {
          var blob = new Blob([JSON.stringify(S)], { type: 'application/json' }), u = URL.createObjectURL(blob), a = document.createElement('a');
          a.href = u; a.download = 'geb-game-backup-' + todayIso() + '.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 1000);
        }
      });
      root.addEventListener('change', function (e) {
        var f = e.target.closest('[data-a="imp"]'); if (!f || !f.files[0]) return;
        var rd = new FileReader(); rd.onload = function () {
          try { var j = JSON.parse(rd.result); if (!j || j.app !== 'geb-game') throw 0; if (!confirm('এই ব্রাউজারের গেম ডেটা ব্যাকআপ ফাইল দিয়ে বদলে যাবে। চালিয়ে যাবেন?')) return; S = Object.assign({}, JSON.parse(JSON.stringify(DEF)), j); save(); paintChip(); paint(); toast('ফেরত আনা হয়েছে'); }
          catch (x) { toast('এটা GEB গেমের ব্যাকআপ ফাইল নয়'); }
        }; rd.readAsText(f.files[0]);
      });
    }
  });

  /* ---------- ব্যাচ ওয়ার ---------- */
  var W = { me: null, data: null, scope: 'week', by: 'pts', a: '', b: '', err: '', loading: true };
  function api(method, path, body) {
    return fetch(path, { method: method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); });
  }
  function flushPending() {
    if (!S.pending.length) return Promise.resolve();
    var items = S.pending.slice();
    return items.reduce(function (p, it) {
      return p.then(function () { return api('POST', '/api/c/game/daily', it).then(function (r) { if (r.ok || (r.status >= 400 && r.status < 500 && r.status !== 429 && r.status !== 401)) S.pending = S.pending.filter(function (x) { return x !== it && x.day !== it.day; }); }).catch(function () { }); });
    }, Promise.resolve()).then(save);
  }
  function loadWar(cb) {
    W.loading = true; W.err = '';
    api('GET', '/api/c/me').then(function (r) {
      W.me = r.ok ? r.j.user : null;
      if (!W.me) { W.data = null; W.loading = false; return cb(); }
      return flushPending().then(function () { return api('GET', '/api/c/game/war?scope=' + W.scope); }).then(function (r2) {
        if (r2.ok) { W.data = r2.j; var bs = r2.j.batches.map(function (x) { return x.batch; }); if (!W.a || bs.indexOf(W.a) < 0) W.a = bs.indexOf('2025-26') >= 0 ? '2025-26' : (bs[0] || ''); if (!W.b || bs.indexOf(W.b) < 0 || W.b === W.a) W.b = bs.indexOf('2024-25') >= 0 && W.a !== '2024-25' ? '2024-25' : (bs.filter(function (x) { return x !== W.a; })[0] || ''); }
        else W.err = (r2.j && r2.j.error) || 'ডেটা আনা যায়নি';
        W.loading = false; cb();
      });
    }).catch(function () { W.loading = false; W.err = 'অফলাইন বা সার্ভারে পৌঁছানো যাচ্ছে না। দৈনিক কুইজ খেলতে পারো, নেট এলে স্কোর জমা হবে।'; cb(); });
  }
  function vsHtml() {
    var d = W.data; if (!d) return '';
    var by = W.by, pick = function (k) { return d.batches.filter(function (x) { return x.batch === k; })[0] || { batch: k, pts: 0, avg: 0, players: 0, size: 0, acc: 0 }; };
    var A = pick(W.a), B = pick(W.b), va = A[by], vb = B[by], tot = (va + vb) || 1;
    var win = va === vb ? '' : (va > vb ? A.batch : B.batch);
    var col = function (x, v, cls) { return '<div class="gm-side ' + cls + (win === x.batch ? ' win' : '') + '"><small>ব্যাচ</small><h4>' + batchLabel(x.batch) + (win === x.batch ? ' 👑' : '') + '</h4><b>' + (by === 'avg' ? bn(v) : num(v)) + '</b><span>' + (by === 'avg' ? 'গড় পয়েন্ট' : 'মোট পয়েন্ট') + '</span><small>অংশ নিয়েছে ' + bn(x.players) + '/' + bn(x.size) + ' জন' + (x.size ? ' (' + bn(Math.round(x.players / x.size * 100)) + '%)' : '') + '</small><small>সঠিক উত্তরের হার ' + bn(x.acc) + '%</small></div>'; };
    var opt = function (sel, ex) { return d.batches.map(function (x) { return '<option value="' + esc(x.batch) + '"' + (x.batch === sel ? ' selected' : '') + (x.batch === ex ? ' disabled' : '') + '>' + batchLabel(x.batch) + '</option>'; }).join(''); };
    var maxDay = 1; d.daily.forEach(function (x) { maxDay = Math.max(maxDay, x.by[W.a] || 0, x.by[W.b] || 0); });
    return '<div class="gm-vs"><div class="gm-vs-h"><select class="fld" data-sel="a" aria-label="প্রথম ব্যাচ">' + opt(W.a, W.b) + '</select><b>বনাম</b><select class="fld" data-sel="b" aria-label="দ্বিতীয় ব্যাচ">' + opt(W.b, W.a) + '</select></div>' +
      '<div class="gm-vs-b">' + col(A, va, 'a') + '<div class="gm-vs-mid"><div class="gm-meter"><i style="width:' + Math.round(va / tot * 100) + '%"></i></div></div>' + col(B, vb, 'b') + '</div>' +
      '<div class="gm-row"><div class="seg" role="group" aria-label="সময়"><button type="button" data-scope="week" aria-selected="' + (W.scope === 'week') + '">এই সপ্তাহ</button><button type="button" data-scope="all" aria-selected="' + (W.scope === 'all') + '">সব সময়</button></div><div class="seg" role="group" aria-label="হিসাব"><button type="button" data-by="pts" aria-selected="' + (W.by === 'pts') + '">মোট</button><button type="button" data-by="avg" aria-selected="' + (W.by === 'avg') + '">গড়</button></div></div>' +
      '<div class="gm-days" aria-label="গত ৭ দিনের পয়েন্ট">' + d.daily.map(function (x) { var ha = Math.round((x.by[W.a] || 0) / maxDay * 100), hb = Math.round((x.by[W.b] || 0) / maxDay * 100); return '<div><span class="a" style="height:' + ha + '%" title="' + batchLabel(W.a) + ': ' + (x.by[W.a] || 0) + '"></span><span class="b" style="height:' + hb + '%" title="' + batchLabel(W.b) + ': ' + (x.by[W.b] || 0) + '"></span><small>' + bn(x.day.slice(8)) + '</small></div>'; }).join('') + '</div>' +
      '<p class="gm-mut">মোট পয়েন্টে বেশি সদস্যের ব্যাচ এগিয়ে থাকে, তাই “গড়” দিয়েও দেখো। পয়েন্ট দৈনিক কুইজ থেকে আসে (প্রতিদিন একবার, সবার একই ১০ প্রশ্ন)।</p></div>';
  }
  function boardHtml() {
    var d = W.data; if (!d || !d.top.length) return '<p class="gm-mut">এখনও কেউ স্কোর জমা দেয়নি। প্রথম হও!</p>';
    var rows = d.top.slice(); if (d.mine && !d.top.some(function (t) { return t.me; })) rows.push(d.mine);
    return '<div class="bt-tw"><table class="bt-tb"><thead><tr><th>#</th><th>নাম</th><th>ব্যাচ</th><th>লেভেল</th><th>দিন</th><th>পয়েন্ট</th></tr></thead><tbody>' + rows.map(function (t) { return '<tr' + (t.me ? ' class="gm-me"' : '') + '><td>' + bn(t.rank) + '</td><td>' + esc(t.name) + '</td><td>' + batchLabel(t.batch) + '</td><td>' + bn(t.lvl) + '</td><td>' + bn(t.days) + '</td><td><b>' + num(t.pts) + '</b></td></tr>'; }).join('') + '</tbody></table></div>';
  }
  register('war', {
    stop: function () { },
    mount: function (root) {
      function todayHtml() {
        var day = dhakaDay(), loc = S.daily[day], d = W.data, done = (d && d.doneToday) || !!loc, me = W.me;
        return '<h3>আজকের কুইজ (' + bn(day) + ')</h3>' + (done ? '<p class="gm-good">আজকের স্কোর জমা হয়েছে' + (d && d.mineToday ? ': ' + bn(d.mineToday.pts) + ' পয়েন্ট (' + bn(d.mineToday.c) + '/১০ ঠিক)' : (loc ? ': ' + bn(loc.pts) + ' পয়েন্ট' : '')) + '।</p><p class="gm-mut">চাইলে আবার প্র্যাকটিস করতে পারো, কিন্তু আর পয়েন্ট বা XP যোগ হবে না।</p>' : '<p class="gm-mut">' + (me ? 'তুমি ' + esc(me.name) + ', ব্যাচ ' + batchLabel(me.batch) + ' হয়ে খেলছ।' : 'কমিউনিটিতে লগইন না করলে স্কোর ব্যাচে যোগ হবে না, শুধু প্র্যাকটিস হবে।') + '</p>') + '<button type="button" class="btn pri" data-a="play">' + (done ? 'প্র্যাকটিস করো' : 'কুইজ শুরু করো') + '</button>' + (me ? '' : ' <a class="btn ghost" href="#community">কমিউনিটিতে লগইন</a>');
      }
      function paint() {
        var me = W.me;
        var head = '<div class="gm-card"><h3>ব্যাচ ওয়ার ⚔️</h3><p class="gm-mut">প্রতিদিন সবার জন্য একই ১০ প্রশ্ন। পয়েন্ট: প্রতি সঠিক উত্তরে ১০, সব ঠিক হলে +২০, ২ মিনিটের মধ্যে ৭+ ঠিক হলে +১০। এটি বন্ধুত্বপূর্ণ প্রতিযোগিতা, সম্মানের ভিত্তিতে।</p></div>';
        var today = '<div class="gm-card" id="gmToday">' + todayHtml() + '</div>';
        var body = W.loading ? '<p class="gm-mut">লোড হচ্ছে…</p>' : (W.err ? '<p class="gm-no">' + esc(W.err) + '</p>' : (me ? vsHtml() + '<h3 class="gm-h">সেরা ১০</h3>' + boardHtml() : ''));
        root.innerHTML = head + today + '<div id="gmWarBox"></div><div id="gmWarBoard">' + body + '</div>';
      }
      function refresh() { paint(); loadWar(function () { if (root.isConnected) paint(); }); }
      function finish(r) {
        var box = $('#gmWarBox', root), day = dhakaDay(), pts = G.warPoints(r.correct, 10, r.ms), counted = !(S.daily[day] || (W.data && W.data.doneToday)), aw = null;
        var show = function (note) { box.innerHTML = '<div class="gm-card"><h3>ফলাফল: ' + bn(r.correct) + '/১০ ঠিক</h3><p><b>' + bn(pts) + ' পয়েন্ট</b> · সময় ' + mmss(r.ms) + '</p>' + (aw ? awardHtml(aw) : '') + '<p class="gm-mut">' + note + '</p><button type="button" class="btn ghost sm" data-a="back">ঠিক আছে</button></div>'; };
        if (!counted) return show('এটি প্র্যাকটিস ছিল, তাই পয়েন্ট যোগ হয়নি।');
        if (!W.me) return show('লগইন ছাড়া খেলেছ, তাই ব্যাচে পয়েন্ট যোগ হয়নি। কমিউনিটিতে লগইন করে কালকের কুইজে নামো।');
        var l = level(), payload = { day: day, correct: r.correct, total: 10, ms: r.ms, lvl: l.lv, badges: Object.keys(S.badges) };
        S.daily[day] = { correct: r.correct, pts: pts, ms: r.ms }; var keys = Object.keys(S.daily).sort(); while (keys.length > 14) delete S.daily[keys.shift()];
        aw = award({ xp: r.correct * 10, correct: r.correct, answered: 10, warDays: 1, session: 1 });
        api('POST', '/api/c/game/daily', payload).then(function (x) { show(x.ok ? 'স্কোর ব্যাচ ওয়ারে জমা হয়েছে।' : esc((x.j && x.j.error) || 'জমা হয়নি')); var tc = $('#gmToday', root); if (tc) tc.innerHTML = todayHtml(); if (x.ok) loadWar(function () { if (root.isConnected) { var b = $('#gmWarBoard', root); if (b) b.innerHTML = vsHtml() + '<h3 class="gm-h">সেরা ১০</h3>' + boardHtml(); var tc2 = $('#gmToday', root); if (tc2) tc2.innerHTML = todayHtml(); } }); })
          .catch(function () { S.pending.push(payload); save(); show('এখন নেট নেই। স্কোর সেভ আছে, নেট এলে নিজে জমা হবে।'); });
        save();
      }
      root.addEventListener('click', function (e) {
        if (e.target.closest('[data-a="play"]')) { var box = $('#gmWarBox', root), qs = G.dailySet(dhakaDay(), GD.QUIZ); box.innerHTML = '<div class="gm-card" id="gmRun"></div>'; box.scrollIntoView({ behavior: 'smooth', block: 'start' }); return mcqRun($('#gmRun', root), { qs: qs, title: 'ব্যাচ ওয়ার', onFinish: finish }); }
        if (e.target.closest('[data-a="back"]')) { $('#gmWarBox', root).innerHTML = ''; return; }
        var sc = e.target.closest('[data-scope]'); if (sc) { W.scope = sc.dataset.scope; return refresh(); }
        var by = e.target.closest('[data-by]'); if (by) { W.by = by.dataset.by; return paint(); }
      });
      root.addEventListener('change', function (e) { var s = e.target.closest('[data-sel]'); if (!s) return; W[s.dataset.sel] = s.value; paint(); });
      refresh();
    }
  });

  /* ---------- শেল ---------- */
  function renderShell() {
    mount.innerHTML = '<div class="seg tabs" id="gmTabs" role="tablist" aria-label="গেম জোন">' + TABS.map(function (t) { return '<button type="button" role="tab" data-t="' + t[0] + '" aria-selected="' + (t[0] === tab) + '">' + t[1] + '</button>'; }).join('') + '</div><div class="gm-body" id="gmBody"></div>' +
      '<p class="gm-foot">গেমগুলো শেখার সহায়ক। প্রশ্নের ব্যাখ্যা সংক্ষিপ্ত, পরীক্ষার জন্য পাঠ্যবই ও ক্লাসের নোট আগে। মিউটেশন কেসের DNA ক্রম শেখার জন্য সরলীকৃত।</p>';
    renderBody(); paintChip();
    mount.addEventListener('click', function (e) { var t = e.target.closest('#gmTabs [role="tab"]'); if (t) go(t.dataset.t, false); });
    setTimeout(function () { checkBadges(); }, 2500);
  }
  window.GEBGM = { u: { $: $, $$: $$, esc: esc, bn: bn, num: num, toast: toast, mmss: mmss }, S: function () { return S; }, save: save, award: award, awardHtml: awardHtml, level: level, noteWrong: noteWrong, clearWrong: clearWrong, extraQs: extraQs, mcqRun: mcqRun, register: register, go: go, GOAL: GOAL };
  /* game-play.js রেজিস্টার করার পর শুরু */
  setTimeout(renderShell, 0);
})();
