/* GEB Hub: গেম জোনের তিনটি খেলা (v3.4): জিন-ম্যাচ, "কে হতে চায় বায়োটেকনোলজিস্ট", মিউটেশন চ্যালেঞ্জ। */
(function () {
  'use strict';
  var M = window.GEBGM, G = window.GEBGame, GD = window.GEBGameData; if (!M || !G || !GD) return;
  var U = M.u, $ = U.$, $$ = U.$$, esc = U.esc, bn = U.bn, num = U.num, S = M.S;
  var LETTER = 'ABCD';
  var rndTimer = function (t) { if (t) { clearInterval(t); } return null; };

  /* ================= জিন-ম্যাচ ================= */
  var MT = { phase: 'setup', deck: null, timer: null };
  var CATS = [['mix', 'সব মিলিয়ে']].concat(Object.keys(GD.PAIRS).map(function (k) { return [k, GD.PAIRS[k].name]; }));
  function mStop() { MT.timer = rndTimer(MT.timer); }
  M.register('match', {
    stop: mStop,
    mount: function (root) {
      var P = S().prefs;
      function chips(items, cur, key) { return '<div class="fchips" role="group">' + items.map(function (c) { return '<button type="button" class="fc sm" data-p="' + key + '" data-v="' + c[0] + '" aria-pressed="' + (String(cur) === String(c[0])) + '">' + c[1] + '</button>'; }).join('') + '</div>'; }
      function setup() {
        mStop(); MT.phase = 'setup';
        root.innerHTML = '<div class="gm-card"><h3>জিন-ম্যাচ 🧩</h3><p class="gm-mut">টার্মের সাথে সঠিক বর্ণনা মেলাও। দ্রুত ম্যাচে বাম ও ডান থেকে একটি করে চাপো; মেমরি মোডে কার্ড উল্টে জোড়া খোঁজো।</p>' +
          '<label class="gm-lb">বিষয়</label>' + chips(CATS, P.cat, 'cat') + '<label class="gm-lb">ধরন</label>' + chips([['quick', 'দ্রুত ম্যাচ'], ['memory', 'মেমরি কার্ড']], P.mode, 'mode') + '<label class="gm-lb">জোড়া</label>' + chips([[6, '৬'], [8, '৮'], [10, '১০']], P.n, 'n') +
          '<div class="gm-row"><button type="button" class="btn pri" data-a="start">শুরু করো</button></div></div>';
      }
      function start() {
        var cnt = Math.min(P.n, G.matchDeck(GD.PAIRS, P.cat, 99, Math.random).length);
        MT.deck = G.matchDeck(GD.PAIRS, P.cat, cnt, Math.random); MT.phase = 'play'; MT.mis = 0; MT.moves = 0; MT.done = {}; MT.t0 = Date.now(); MT.sel = { L: null, R: null }; MT.lock = false; MT.first = null;
        MT.L = G.shuffle(MT.deck.map(function (d) { return d.id; })); MT.R = G.shuffle(MT.deck.map(function (d) { return d.id; }));
        MT.cards = G.shuffle(MT.deck.reduce(function (a, d) { return a.concat([{ pair: d.id, side: 't', txt: d.t }, { pair: d.id, side: 'd', txt: d.d }]); }, []));
        var n = MT.deck.length, hd = '<div class="gm-hd"><b>সময় <span id="mT">০:০০</span></b><span>ভুল <b id="mM">০</b></span><span>মিল <b id="mD">০</b>/' + bn(n) + '</span><button type="button" class="btn ghost sm" data-a="quit">ছেড়ে দাও</button></div>';
        if (P.mode === 'memory') root.innerHTML = hd + '<div class="gm-cards">' + MT.cards.map(function (c, i) { return '<button type="button" class="gm-card-f ' + c.side + '" data-c="' + i + '" aria-label="কার্ড ' + bn(i + 1) + '"><span class="bk">🧬</span><span class="ft">' + esc(c.txt) + '</span></button>'; }).join('') + '</div>';
        else root.innerHTML = hd + '<div class="gm-mcols"><div class="gm-mcol">' + MT.L.map(function (id) { return '<button type="button" class="gm-m" data-s="L" data-i="' + id + '">' + esc(MT.deck[id].t) + '</button>'; }).join('') + '</div><div class="gm-mcol">' + MT.R.map(function (id) { return '<button type="button" class="gm-m" data-s="R" data-i="' + id + '">' + esc(MT.deck[id].d) + '</button>'; }).join('') + '</div></div>';
        mStop(); MT.timer = setInterval(function () { var t = $('#mT', root); if (t && root.isConnected) t.textContent = U.mmss(Date.now() - MT.t0); else mStop(); }, 500);
      }
      function upd() { $('#mM', root).textContent = bn(MT.mis); $('#mD', root).textContent = bn(Object.keys(MT.done).length); }
      function finish() {
        mStop(); var ms = Date.now() - MT.t0, n = MT.deck.length, mode = P.mode, perfect = mode === 'quick' ? MT.mis === 0 && n >= 6 : MT.moves <= Math.ceil(n * 1.5) && n >= 6;
        var aw = M.award({ xp: G.xpMatch(n, MT.mis, mode, MT.moves), pairs: n, matchPerfect: perfect ? 1 : 0, session: 1 });
        MT.phase = 'done';
        root.innerHTML = '<div class="gm-card"><h3>' + (perfect ? 'নিখুঁত! 💎' : 'শেষ!') + '</h3><p>সময় <b>' + U.mmss(ms) + '</b> · ' + (mode === 'memory' ? 'চাল <b>' + bn(MT.moves) + '</b>' : 'ভুল <b>' + bn(MT.mis) + '</b>') + '</p>' + M.awardHtml(aw) +
          '<h4 class="gm-h">শিখে নাও</h4><ul class="gm-learn">' + MT.deck.map(function (d) { return '<li><b>' + esc(d.t) + '</b> — ' + esc(d.d) + '</li>'; }).join('') + '</ul>' +
          '<div class="gm-row"><button type="button" class="btn pri" data-a="start">আবার খেলো</button><button type="button" class="btn ghost" data-a="setup">সেটিং বদলাও</button></div></div>';
      }
      function pickQuick(b) {
        var s = b.dataset.s, id = +b.dataset.i; if (MT.done[id] && MT.deck) { /* আগেই মিলেছে */ }
        if (b.classList.contains('ok')) return;
        $$('.gm-m.sel[data-s="' + s + '"]', root).forEach(function (x) { x.classList.remove('sel'); }); b.classList.add('sel'); MT.sel[s] = id;
        if (MT.sel.L === null || MT.sel.R === null) return;
        var l = MT.sel.L, r = MT.sel.R, bl = $('.gm-m[data-s="L"][data-i="' + l + '"]', root), br = $('.gm-m[data-s="R"][data-i="' + r + '"]', root); MT.sel = { L: null, R: null };
        if (l === r) { [bl, br].forEach(function (x) { x.classList.remove('sel'); x.classList.add('ok'); x.disabled = true; }); MT.done[l] = 1; upd(); if (Object.keys(MT.done).length === MT.deck.length) setTimeout(finish, 450); }
        else { MT.mis++; upd(); [bl, br].forEach(function (x) { x.classList.add('bad'); }); setTimeout(function () { [bl, br].forEach(function (x) { x.classList.remove('bad', 'sel'); }); }, 450); }
      }
      function flip(b) {
        if (MT.lock || b.classList.contains('up') || b.classList.contains('ok')) return;
        b.classList.add('up'); var i = +b.dataset.c;
        if (MT.first === null) { MT.first = i; return; }
        var a = MT.first, c1 = MT.cards[a], c2 = MT.cards[i], ba = $('[data-c="' + a + '"]', root); MT.first = null; MT.moves++;
        if (c1.pair === c2.pair && c1.side !== c2.side) { [ba, b].forEach(function (x) { x.classList.add('ok'); }); MT.done[c1.pair] = 1; upd(); if (Object.keys(MT.done).length === MT.deck.length) setTimeout(finish, 500); }
        else { MT.mis++; upd(); MT.lock = true; setTimeout(function () { [ba, b].forEach(function (x) { x.classList.remove('up'); }); MT.lock = false; }, 900); }
      }
      root.addEventListener('click', function (e) {
        var p = e.target.closest('[data-p]'); if (p) { var v = p.dataset.v; P[p.dataset.p] = p.dataset.p === 'n' ? +v : v; M.save(); return setup(); }
        var a = e.target.closest('[data-a]'); if (a) { if (a.dataset.a === 'start') return start(); if (a.dataset.a === 'setup' || a.dataset.a === 'quit') return setup(); }
        var m = e.target.closest('.gm-m'); if (m && MT.phase === 'play') return pickQuick(m);
        var c = e.target.closest('.gm-card-f'); if (c && MT.phase === 'play') return flip(c);
      });
      setup();
    }
  });

  /* ================= কুইজ শো ================= */
  var QZ = { timer: null, tick: null };
  var fmtBP = function (n) { return num(n) + ' BP'; };
  function qStop() { QZ.timer = rndTimer(QZ.timer); QZ.tick = rndTimer(QZ.tick); }
  M.register('quiz', {
    stop: qStop,
    mount: function (root) {
      var Q = null, P = S().prefs;
      function setup() {
        qStop(); var wr = S().wrongQ.length;
        root.innerHTML = '<div class="gm-card"><h3>কে হতে চায় বায়োটেকনোলজিস্ট 🎙️</h3><p class="gm-mut">১৫টি প্রশ্ন: ৫টি সহজ, ৫টি মাঝারি, ৫টি কঠিন। ৫ম ও ১০ম প্রশ্ন পার করলে পুরস্কার নিশ্চিত। লাইফলাইন: ৫০:৫০, দর্শক ভোট, প্রশ্ন বদল, ৩০ সেকেন্ড বিরতি।</p>' +
          '<label class="gm-lb">খেলোয়াড়</label><div class="fchips"><button type="button" class="fc sm" data-m="solo" aria-pressed="' + (P.qmode !== 'friends') + '">একা</button><button type="button" class="fc sm" data-m="friends" aria-pressed="' + (P.qmode === 'friends') + '">বন্ধুদের সাথে (একই ডিভাইসে পালা করে)</button></div>' +
          (P.qmode === 'friends' ? '<div class="gm-names">' + [0, 1, 2, 3].map(function (i) { return '<input class="fld" data-nm="' + i + '" placeholder="খেলোয়াড় ' + bn(i + 1) + (i > 1 ? ' (ঐচ্ছিক)' : '') + '" value="' + esc((P.names || [])[i] || '') + '" maxlength="20">'; }).join('') + '</div>' : '') +
          '<label class="gm-lb">প্রতি প্রশ্নে সময়</label><div class="fchips">' + [[0, 'সময় নেই'], [30, '৩০ সেকেন্ড'], [60, '৬০ সেকেন্ড']].map(function (t) { return '<button type="button" class="fc sm" data-t="' + t[0] + '" aria-pressed="' + (P.timer === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>' +
          '<div class="gm-row"><button type="button" class="btn pri" data-a="start">শুরু করো</button>' + (wr ? '<button type="button" class="btn ghost" data-a="rev">ভুল প্রশ্ন রিভিশন (' + bn(wr) + ')</button>' : '') + '</div></div><div id="qzRev"></div>';
      }
      function newPlayer(n) { return { name: n, step: 0, ended: false, prize: 0, correct: 0, life: { f: 1, a: 1, s: 1, p: 1 }, used: 0, over: {}, why: '', lastQ: null, won: false }; }
      function start() {
        var names = P.qmode === 'friends' ? [0, 1, 2, 3].map(function (i) { return ((P.names || [])[i] || '').trim(); }).filter(Boolean) : ['তুমি'];
        if (P.qmode === 'friends' && names.length < 2) { U.toast('কমপক্ষে দুজনের নাম দাও'); return; }
        Q = { players: names.map(newPlayer), pi: 0, ladder: G.buildLadder(GD.QUIZ, Math.random, M.extraQs()), cur: null, ans: null, paused: false };
        turnStart();
      }
      function curP() { return Q.players[Q.pi]; }
      function qOf(p) { return p.over[p.step] || Q.ladder.steps[p.step]; }
      function turnStart() { var p = curP(); Q.cur = { q: qOf(p), hidden: [], poll: null }; Q.ans = null; paint(); runTimer(); }
      function ladderHtml(p) {
        return '<details class="gm-lad"><summary>পুরস্কারের সিঁড়ি</summary><ol reversed>' + G.PRIZES.map(function (v, i) { return '<li class="' + (i === p.step ? 'cur ' : '') + (i < p.step ? 'past ' : '') + (G.CHECKPOINTS.indexOf(i) >= 0 ? 'cp' : '') + '"><span>' + bn(i + 1) + '</span><b>' + fmtBP(v) + '</b></li>'; }).reverse().join('') + '</ol></details>';
      }
      function paint() {
        var p = curP(), c = Q.cur, q = c.q, step = p.step, hid = c.hidden;
        var life = [['f', '৫০:৫০'], ['a', 'দর্শক ভোট'], ['s', 'প্রশ্ন বদল'], ['p', 'বন্ধুর সাহায্য']].map(function (l) { return '<button type="button" class="gm-life" data-l="' + l[0] + '"' + (!p.life[l[0]] || Q.ans !== null ? ' disabled' : '') + '>' + l[1] + '</button>'; }).join('');
        var poll = c.poll ? '<div class="gm-poll" aria-label="দর্শক ভোট">' + c.poll.map(function (v, i) { return '<div><i style="height:' + v + '%"></i><b>' + (hid.indexOf(i) >= 0 ? '' : bn(v) + '%') + '</b><span>' + LETTER[i] + '</span></div>'; }).join('') + '<small>সিমুলেশন, আসল ভোট নয়</small></div>' : '';
        root.innerHTML = '<div class="gm-card"><div class="gm-hd"><b>' + esc(p.name) + '</b><span>প্রশ্ন ' + bn(step + 1) + '/১৫</span><span class="chip">' + ['', 'সহজ', 'মাঝারি', 'কঠিন'][q.level] + '</span><span>এখন ' + fmtBP(step ? G.PRIZES[step - 1] : 0) + '</span></div>' +
          (P.timer ? '<div class="gm-bar tm"><i id="qzBar" style="width:100%"></i></div>' : '') + ladderHtml(p) +
          '<p class="gm-qt">' + esc(q.q) + '</p><div class="gm-opts">' + q.opts.map(function (t, i) { var cls = Q.ans !== null ? (i === q.ans ? ' ok' : (i === Q.ans.pick ? ' bad' : '')) : ''; return '<button type="button" class="gm-opt' + cls + '" data-k="' + i + '"' + (Q.ans !== null || hid.indexOf(i) >= 0 ? ' disabled' : '') + (hid.indexOf(i) >= 0 ? ' style="visibility:hidden"' : '') + '><b>' + LETTER[i] + '</b>' + esc(t) + '</button>'; }).join('') + '</div>' + poll +
          '<div class="gm-lives">' + life + '</div>' + (Q.ans === null ? '<div class="gm-row"><button type="button" class="btn ghost sm" data-a="walk">সরে যাও (' + fmtBP(step ? G.PRIZES[step - 1] : 0) + ' নিয়ে)</button></div>' : fbHtml(p)) + '</div>';
      }
      function fbHtml(p) {
        var a = Q.ans, q = Q.cur.q, h = '<div class="gm-fb"><p class="' + (a.ok ? 'gm-good' : 'gm-no') + '">' + (a.ok ? '✓ সঠিক!' : (a.timeout ? '⏱ সময় শেষ। ' : '✗ ভুল। ') + 'সঠিক উত্তর ' + LETTER[q.ans]) + '</p>' + (q.exp ? '<p class="gm-mut">' + esc(q.exp) + '</p>' : '');
        return h + '<button type="button" class="btn pri sm" data-a="next">' + (p.ended ? 'এগোও' : 'পরের প্রশ্ন') + '</button></div>';
      }
      function runTimer() {
        qStop(); if (!P.timer) return; Q.tEnd = Date.now() + P.timer * 1000;
        QZ.tick = setInterval(function () {
          if (!root.isConnected) return qStop(); if (Q.paused || Q.ans !== null) return;
          var left = Q.tEnd - Date.now(), bar = $('#qzBar', root); if (bar) bar.style.width = Math.max(0, left / (P.timer * 1000) * 100) + '%';
          if (left <= 0) answer(-1, true);
        }, 200);
      }
      function endPlayer(p, why) { p.ended = true; p.why = why; }
      function answer(k, timeout) {
        if (Q.ans !== null) return; var p = curP(), q = Q.cur.q, ok = k === q.ans; qStop(); Q.ans = { pick: k, ok: ok, timeout: !!timeout }; p.lastQ = q;
        if (ok) { p.correct++; p.step++; if (p.step >= 15) { p.won = true; p.prize = G.PRIZES[14]; endPlayer(p, '১৫টি প্রশ্নই পার!'); } }
        else { p.prize = G.safePrize(p.step); M.noteWrong(q); endPlayer(p, timeout ? 'সময় শেষ' : 'ভুল উত্তর'); }
        paint();
      }
      function walk() { var p = curP(); qStop(); p.prize = p.step ? G.PRIZES[p.step - 1] : 0; endPlayer(p, 'সরে গেছে'); Q.ans = null; nextTurn(); }
      function nextTurn() {
        var p = curP(); if (!p.ended) return turnStart();
        if (Q.pi + 1 < Q.players.length) { Q.pi++; return interlude(); }
        final();
      }
      function interlude() { root.innerHTML = '<div class="gm-card"><h3>এবার ' + esc(curP().name) + '-এর পালা</h3><p class="gm-mut">ফোনটি ' + esc(curP().name) + '-কে দাও। সবার প্রশ্ন একই, তাই আগে কেউ দেখে ফেললে কাজে লাগবে।</p><button type="button" class="btn pri" data-a="go">শুরু</button></div>'; }
      function final() {
        qStop(); var xp = 0, cor = 0, ans = 0, best = 0, noLife = 0, won = 0;
        Q.players.forEach(function (p) { xp += G.xpQuiz(p.correct, p.won); cor += p.correct; ans += p.correct + (p.why === 'ভুল উত্তর' || p.why === 'সময় শেষ' ? 1 : 0); best = Math.max(best, p.correct); if (p.won) won++; if (p.correct >= 10 && p.used === 0) noLife++; });
        var aw = M.award({ xp: xp, correct: cor, answered: ans, quizBest: best, quizWins: won, quizNoLife: noLife, session: 1 });
        var rank = Q.players.slice().sort(function (a, b) { return b.prize - a.prize || b.correct - a.correct; });
        root.innerHTML = '<div class="gm-card"><h3>ফলাফল 🏆</h3>' + (Q.players.length > 1 ? '<p class="gm-good">জয়ী: ' + esc(rank[0].name) + '</p>' : '') + '<div class="bt-tw"><table class="bt-tb"><thead><tr><th>#</th><th>নাম</th><th>সঠিক</th><th>পুরস্কার</th><th>শেষ</th></tr></thead><tbody>' + rank.map(function (p, i) { return '<tr><td>' + bn(i + 1) + '</td><td>' + esc(p.name) + '</td><td>' + bn(p.correct) + '/১৫</td><td><b>' + fmtBP(p.prize) + '</b></td><td>' + esc(p.why) + '</td></tr>'; }).join('') + '</tbody></table></div>' + M.awardHtml(aw) +
          '<details class="bt-det"><summary>যে প্রশ্নে থেমেছ, তার উত্তর</summary>' + Q.players.filter(function (p) { return p.lastQ && !p.won && p.why !== 'সরে গেছে'; }).map(function (p) { var q = p.lastQ; return '<p><b>' + esc(p.name) + ':</b> ' + esc(q.q) + '<br><span class="gm-good">' + LETTER[q.ans] + ') ' + esc(q.opts[q.ans]) + '</span>' + (q.exp ? ' — <span class="gm-mut">' + esc(q.exp) + '</span>' : '') + '</p>'; }).join('') + '</details>' +
          '<div class="gm-row"><button type="button" class="btn pri" data-a="start">আবার খেলো</button><button type="button" class="btn ghost" data-a="setup">সেটিং</button></div></div>';
      }
      function life(l) {
        var p = curP(), c = Q.cur; if (!p.life[l] || Q.ans !== null) return;
        if (l === 'f') c.hidden = c.hidden.concat(G.fifty(c.q, c.hidden, Math.random));
        else if (l === 'a') c.poll = G.poll(c.q, p.step, c.hidden, Math.random);
        else if (l === 's') { var sp = Q.ladder.spare[c.q.level]; if (!sp || !sp.length) { U.toast('বদলানোর প্রশ্ন নেই'); return; } var nq = sp.shift(); p.over[p.step] = nq; Q.cur = { q: nq, hidden: [], poll: null }; if (P.timer) Q.tEnd = Date.now() + P.timer * 1000; }
        else if (l === 'p') { Q.paused = true; var end = Date.now() + 30000; p.life.p = 0; p.used++; root.querySelector('.gm-card').insertAdjacentHTML('beforeend', '<div class="gm-friend" id="qzFr"><b>বন্ধুকে প্রশ্নটা পড়ে শোনাও!</b><span id="qzFrT">৩০</span> সেকেন্ড<button type="button" class="btn sm ghost" data-a="frend">ফিরে এসো</button></div>'); var iv = setInterval(function () { var t = $('#qzFrT', root); var left = Math.ceil((end - Date.now()) / 1000); if (!t || left <= 0) { clearInterval(iv); closeFr(); } else t.textContent = bn(left); }, 250); Q.frIv = iv; return; }
        p.life[l] = 0; p.used++; paint();
      }
      function closeFr() { if (Q.frIv) clearInterval(Q.frIv); Q.frIv = null; var f = $('#qzFr', root); if (f) f.remove(); if (Q.paused) { Q.paused = false; if (P.timer) Q.tEnd = Date.now() + P.timer * 1000; } }
      function revStart() {
        var qs = S().wrongQ.slice(0, 10).map(function (w) { return { q: w.q, opts: w.opts, ans: w.ans, exp: w.exp, level: w.level }; }); if (!qs.length) return;
        var box = $('#qzRev', root); box.innerHTML = '<div class="gm-card" id="qzRun"></div>'; box.scrollIntoView({ behavior: 'smooth', block: 'start' });
        M.mcqRun($('#qzRun', root), { qs: qs, title: 'রিভিশন', onCorrect: M.clearWrong, onFinish: function (r) { var aw = M.award({ xp: r.correct * 5, correct: r.correct, answered: qs.length, session: 1 }); $('#qzRun', root).innerHTML = '<h3>রিভিশন শেষ: ' + bn(r.correct) + '/' + bn(qs.length) + '</h3>' + M.awardHtml(aw) + '<p class="gm-mut">সঠিক করা প্রশ্নগুলো তালিকা থেকে সরে গেছে।</p><button type="button" class="btn ghost sm" data-a="setup">ঠিক আছে</button>'; } });
      }
      root.addEventListener('click', function (e) {
        var t = e.target;
        var m = t.closest('[data-m]'); if (m) { P.qmode = m.dataset.m; M.save(); return setup(); }
        var tt = t.closest('[data-t]'); if (tt) { P.timer = +tt.dataset.t; M.save(); return setup(); }
        var l = t.closest('[data-l]'); if (l) return life(l.dataset.l);
        var o = t.closest('.gm-opt[data-k]'); if (o && Q && Q.ans === null && !Q.paused) return answer(+o.dataset.k);
        var a = t.closest('[data-a]'); if (!a) return; var A = a.dataset.a;
        if (A === 'start') return start(); if (A === 'setup') return setup(); if (A === 'rev') return revStart();
        if (A === 'go') return turnStart(); if (A === 'walk') return walk(); if (A === 'frend') return closeFr();
        if (A === 'next') { Q.ans = null; return nextTurn(); }
      });
      root.addEventListener('input', function (e) { var n = e.target.closest('[data-nm]'); if (n) { P.names = P.names || []; P.names[+n.dataset.nm] = n.value; M.save(); } });
      setup();
    }
  });

  /* ================= মিউটেশন চ্যালেঞ্জ ================= */
  function codRow(seq, o) {
    o = o || {}; var cs = G.codons(seq);
    return '<div class="gm-cods' + (o.click ? ' click' : '') + '">' + cs.map(function (c, i) {
      var cls = 'gm-cod' + (o.mark && o.mark.indexOf(i) >= 0 ? ' diff' : '') + (c.length < 3 ? ' part' : ''), inner = '<i>' + (i + 1) + '</i>' + c + (o.aa ? '<em>' + G.aaOf(c) + '</em>' : '');
      return o.click ? '<button type="button" class="' + cls + '" data-cod="' + i + '">' + inner + '</button>' : '<span class="' + cls + '">' + inner + '</span>';
    }).join('') + '</div>';
  }
  function aaDiff(a, b) { var n = Math.max(a.length, b.length), h = ''; for (var i = 0; i < n; i++) h += '<span class="' + (a[i] === b[i] ? '' : 'df') + '">' + (b[i] || '·') + '</span>'; return h; }
  function codonTable() {
    var B = 'TCAG', h = '<details class="bt-det"><summary>কোডন টেবিল</summary><div class="gm-ct">';
    for (var a = 0; a < 4; a++) { h += '<div>'; for (var b = 0; b < 4; b++) { h += '<p>'; for (var c = 0; c < 4; c++) { var k = B[a] + B[b] + B[c]; h += '<span>' + k + ' <b>' + G.CT[k] + '</b></span>'; } h += '</p>'; } h += '</div>'; }
    return h + '</div><small>* = stop কোডন</small></details>';
  }
  M.register('mut', {
    stop: function () { },
    mount: function (root) {
      var P = S().prefs, T = null;
      function list() {
        T = null; var done = S().mutDone, n = Object.keys(done).length;
        root.innerHTML = '<div class="gm-card"><h3>মিউটেশন চ্যালেঞ্জ 🧬</h3><p class="gm-mut">রোগীর DNA-তে একটি পরিবর্তন আছে। তিন ধাপে খুঁজে বের করো: কোথায়, কী ধরনের, কোন রোগ। সমাধান: ' + bn(n) + '/' + bn(GD.MUT.length) + '</p>' +
          '<label class="gm-lb">মোড</label><div class="fchips"><button type="button" class="fc sm" data-d="easy" aria-pressed="' + (P.diff !== 'hard') + '">সহজ (স্বাভাবিক DNA দেখা যাবে)</button><button type="button" class="fc sm" data-d="hard" aria-pressed="' + (P.diff === 'hard') + '">কঠিন (শুধু স্বাভাবিক প্রোটিন, নিজে অনুবাদ করো)</button></div>' +
          '<div class="gm-row"><button type="button" class="btn pri" data-a="rand">নতুন কেস (এলোমেলো)</button></div><div class="gm-cases">' + GD.MUT.map(function (c, i) { var d = done[c.id]; return '<button type="button" class="gm-case' + (d ? ' on' : '') + '" data-c="' + i + '"><b>কেস ' + bn(i + 1) + '</b><span>জিন ' + esc(c.gene) + '</span><em>' + (d ? (d.perfect ? '★ নিখুঁত' : '✓ সমাধান') : 'বাকি') + '</em></button>'; }).join('') + '</div></div>';
      }
      function open(i) {
        var c = GD.MUT[i], hard = P.diff === 'hard';
        if (hard && c.type === 'silent') { U.toast('কঠিন মোডে সাইলেন্ট কেস বাদ, সহজ মোডে খেলো'); return; }
        T = { i: i, c: c, step: 1, tries: [0, 0, 0], res: [], hints: 0, aa: false, hard: hard, wrong: {}, fin: false, o2: G.typeOptions(c.type, Math.random), o3: G.diseaseOptions(c.disease, GD.DISEASES, Math.random), oR: c.repeat ? G.repeatOptions(c.repeat.mut, Math.random) : null };
        paint();
      }
      function stepsHtml() { return '<ol class="gm-steps">' + ['কোথায়', 'কী ধরন', 'কোন রোগ'].map(function (s, k) { return '<li class="' + (T.step === k + 1 ? 'cur' : (T.res[k] ? (T.res[k].ok ? 'ok' : 'no') : '')) + '">' + bn(k + 1) + '. ' + s + '</li>'; }).join('') + '</ol>'; }
      function optBtns(arr, kind, labelFn) {
        return '<div class="gm-opts">' + arr.map(function (o, k) { var w = T.wrong[kind + o]; return '<button type="button" class="gm-opt' + (w ? ' bad' : '') + '" data-o="' + esc(o) + '" data-kind="' + kind + '"' + (w ? ' disabled' : '') + '><b>' + LETTER[k] + '</b>' + labelFn(o) + '</button>'; }).join('') + '</div>';
      }
      function paint() {
        var c = T.c, h = '<div class="gm-card"><div class="gm-hd"><b>কেস ' + bn(T.i + 1) + ' · জিন ' + esc(c.gene) + '</b><span class="chip">' + (T.hard ? 'কঠিন' : 'সহজ') + '</span><button type="button" class="btn ghost sm" data-a="list">তালিকা</button></div>' + stepsHtml();
        if (T.fin) return root.innerHTML = h + finHtml() + '</div>';
        if (T.step === 1) {
          h += '<p class="gm-qt">' + (c.repeat ? 'রোগীর জিনে একটানা <b>CAG</b> কতবার আছে?' : 'রোগীর DNA-র কোন কোডনে পরিবর্তন? সেই ঘরে চাপো।') + '</p>';
          if (!T.hard) h += '<div class="gm-seq"><span class="gm-seq-l">স্বাভাবিক (Reference)</span>' + codRow(c.wt) + '</div>';
          else h += '<div class="gm-seq"><span class="gm-seq-l">স্বাভাবিক প্রোটিন</span><code class="gm-aa">' + G.translate(c.wt) + '</code>' + (c.repeat ? '<small class="gm-mut">সাধারণ মানুষে CAG ২৬ বা কম</small>' : '') + '</div>';
          h += '<div class="gm-seq"><span class="gm-seq-l">রোগীর DNA</span>' + codRow(c.mut, { click: !c.repeat, aa: T.aa }) + '</div>';
          if (c.repeat) h += optBtns(T.oR.map(String), 'rep', function (o) { return bn(o) + ' বার'; });
          else if (T.hard) h += '<div class="gm-row"><button type="button" class="btn ghost sm" data-a="aa">' + (T.aa ? 'অনুবাদ লুকাও' : 'অনুবাদ দেখাও (সংকেত)') + '</button></div>' + codonTable();
          h += '<p class="gm-mut">' + (T.tries[0] ? 'আরেকবার চেষ্টা করো।' : '') + '</p>';
        } else if (T.step === 2) {
          h += '<p class="gm-qt">এটি কী ধরনের মিউটেশন?</p>' + codPair() + optBtns(T.o2, 'type', function (o) { return '<span>' + G.TYPE_LABEL[o][0] + '</span><small>' + G.TYPE_LABEL[o][1] + '</small>'; });
        } else {
          h += '<p class="gm-qt">এই মিউটেশনে কোন অবস্থা হবে?</p><div class="gm-seq"><span class="gm-seq-l">প্রোটিন</span><code class="gm-aa">' + G.translate(c.wt) + '</code><code class="gm-aa">' + aaDiff(G.translate(c.wt), G.translate(c.mut)) + '</code></div>' + optBtns(T.o3, 'dis', esc);
        }
        root.innerHTML = h + '<div class="gm-fb" id="mFb"></div></div>';
      }
      function codPair() { var c = T.c; return c.repeat ? '' : '<div class="gm-seq"><span class="gm-seq-l">স্বাভাবিক</span>' + codRow(c.wt, { aa: true }) + '</div><div class="gm-seq"><span class="gm-seq-l">রোগীর</span>' + codRow(c.mut, { aa: true, mark: G.acceptCodons(c) }) + '</div>'; }
      function finHtml() {
        var c = T.c, x = G.xpMut(T.res, T.hints > 0), first = !S().mutDone[c.id], xp = first ? x.xp : Math.min(5, x.xp), ok = T.res.filter(function (r) { return r.ok; }).length;
        var aw = M.award({ xp: xp, correct: ok, answered: 3, mutDone: ok === 3 ? { id: c.id, perfect: x.perfect } : null, session: 1 });
        return '<h3>' + (ok === 3 ? (x.perfect ? 'নিখুঁত গোয়েন্দা! ★' : 'কেস সমাধান ✓') : 'কেস শেষ') + '</h3><p><b>' + esc(c.disease) + '</b> · ' + G.TYPE_LABEL[c.type][0] + '</p>' + M.awardHtml(aw) + (first ? '' : '<p class="gm-mut">আগে সমাধান করা কেস, তাই XP কম।</p>') +
          '<p>' + esc(c.bn) + '</p>' + (c.note ? '<p class="gm-mut">' + esc(c.note) + '</p>' : '') + '<p class="gm-mut">' + (c.real ? 'প্রোটিনের অংশ ও মিউটেশনটি আসল; DNA-র ক্রম শেখার জন্য সরলীকৃত হতে পারে।' : 'শিক্ষামূলক কৃত্রিম টুকরো; আসল জিনের পূর্ণ ক্রম নয়।') + '</p>' +
          (c.repeat ? '' : '<div class="gm-seq"><span class="gm-seq-l">স্বাভাবিক</span>' + codRow(c.wt, { aa: true }) + '</div><div class="gm-seq"><span class="gm-seq-l">রোগীর</span>' + codRow(c.mut, { aa: true, mark: G.acceptCodons(c) }) + '</div>') +
          '<div class="gm-row"><button type="button" class="btn pri" data-a="next">পরের কেস</button><button type="button" class="btn ghost" data-a="list">তালিকা</button></div>';
      }
      function judge(kind, val, node) {
        var c = T.c, s = T.step - 1, ok, right; T.tries[s]++;
        if (kind === 'cod') { ok = G.acceptCodons(c).indexOf(+val) >= 0; right = 'ঘর ' + bn(c.first + 1); }
        else if (kind === 'rep') { ok = +val === c.repeat.mut; right = bn(c.repeat.mut) + ' বার'; }
        else if (kind === 'type') { ok = val === c.type; right = G.TYPE_LABEL[c.type][0]; }
        else { ok = val === c.disease; right = c.disease; }
        var fb = $('#mFb', root);
        if (ok || T.tries[s] >= 2) {
          T.res[s] = { ok: ok, tries: T.tries[s] };
          fb.innerHTML = '<p class="' + (ok ? 'gm-good' : 'gm-no') + '">' + (ok ? '✓ সঠিক' : '✗ সঠিক উত্তর: ' + esc(right)) + '</p><button type="button" class="btn pri sm" data-a="step">' + (T.step === 3 ? 'ফলাফল' : 'পরের ধাপ') + '</button>';
          $$('.gm-opt,.gm-cod', root).forEach(function (b) { b.disabled = true; });
        } else {
          T.wrong[kind + val] = 1; if (node) { node.classList.add('bad'); node.disabled = true; }
          fb.innerHTML = '<p class="gm-no">✗ ভুল, আরেকবার চেষ্টা করো (২য় চেষ্টায় কম পয়েন্ট)।</p>';
        }
      }
      root.addEventListener('click', function (e) {
        var t = e.target, d = t.closest('[data-d]'); if (d) { P.diff = d.dataset.d; M.save(); return list(); }
        var cs = t.closest('.gm-case'); if (cs) return open(+cs.dataset.c);
        var a = t.closest('[data-a]');
        if (a) {
          var A = a.dataset.a;
          if (A === 'list') return list();
          if (A === 'rand') { var done = S().mutDone, pool = GD.MUT.map(function (c, i) { return i; }).filter(function (i) { return !(P.diff === 'hard' && GD.MUT[i].type === 'silent'); }), fresh = pool.filter(function (i) { return !done[GD.MUT[i].id]; }); return open(G.pick(fresh.length ? fresh : pool, 1, Math.random)[0]); }
          if (A === 'next') { var dn = S().mutDone, p2 = GD.MUT.map(function (c, i) { return i; }).filter(function (i) { return i !== T.i && !(T.hard && GD.MUT[i].type === 'silent') && !dn[GD.MUT[i].id]; }); if (!p2.length) p2 = GD.MUT.map(function (c, i) { return i; }).filter(function (i) { return i !== T.i && !(T.hard && GD.MUT[i].type === 'silent'); }); return open(G.pick(p2, 1, Math.random)[0]); }
          if (A === 'aa' && T) { T.aa = !T.aa; if (T.aa) T.hints++; return paint(); }
          if (A === 'step' && T) { if (T.step === 3) { T.fin = true; } else T.step++; return paint(); }
        }
        if (!T || T.fin) return;
        var cod = t.closest('[data-cod]'); if (cod && T.step === 1) return judge('cod', cod.dataset.cod, cod);
        var o = t.closest('.gm-opt[data-o]'); if (o) return judge(o.dataset.kind, o.dataset.o, o);
      });
      list();
    }
  });
})();
