/* GEB Hub: ভার্চুয়াল ল্যাবের ভয়েস-কমান্ডের মগজ (v3.12), DOM ছাড়া, তাই Node-এ টেস্ট করা যায় (voice-test.js)।
   কাজ: শিক্ষার্থীর বলা বাক্য (বাংলা, English বা মিশ্র) থেকে বোঝা, সে কী করতে চায়: জুম, ঘোরানো, কোনো যন্ত্র/রিএজেন্টে চাপ,
   ড্রপডাউন বাছা, মান লেখা, পরীক্ষণ খোলা ইত্যাদি। কোনো সার্ভার বা API লাগে না।
   ব্যবহার: parse(text, ctx) → একটি intent। ctx বানায় vlab-voice.js (পর্দায় এখন যা যা আছে তার তালিকা)।
   intent.type: none | yes | no | choose | stop | help | tab | back | hint | restart | camReset | labels | primary
                | zoomPart | zoom | move | focus | fill | press | suggest | ambiguous */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.VLVoiceCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ================= টেক্সট স্বাভাবিকীকরণ ================= */
  var BN = '০১২৩৪৫৬৭৮৯';
  var SUBSUP = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9', '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁺': '', '⁻': '', '₊': '', '₋': '' };
  var SUBSUP_RE = new RegExp('[' + Object.keys(SUBSUP).join('') + ']', 'g');
  /* দশমিক বিন্দু (১.৫) বাঁচিয়ে বাকি সব যতিচিহ্ন, ইমোজি, ব্র্যাকেট ফাঁকা করে দেয়। বাংলা অক্ষর ও চিহ্ন (\p{M}) থাকে। */
  function normalize(s) {
    s = String(s == null ? '' : s);
    try { s = s.normalize('NFC'); } catch (e) { }
    return s.toLowerCase()
      .replace(/[০-৯]/g, function (d) { return BN.indexOf(d); })
      .replace(SUBSUP_RE, function (c) { return SUBSUP[c]; })
      .replace(/[\u200c\u200d]/g, '')
      .replace(/×/g, 'x')
      .replace(/(\d)\.(\d)/g, '$1\uE000$2')
      .replace(/[^\p{L}\p{M}\p{N}\uE000]+/gu, ' ')
      .replace(/\uE000/g, '.')
      .replace(/\s+/g, ' ').trim();
  }

  /* ইংরেজি সংখ্যা-শব্দ ("forty", "one hundred twenty") → অঙ্ক। "point" দিয়ে দশমিক। */
  var NUMW = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
  var TENS = { twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
  function isNumWord(t) { return Object.prototype.hasOwnProperty.call(NUMW, t) || Object.prototype.hasOwnProperty.call(TENS, t) || t === 'hundred' || t === 'thousand'; }
  function isNumTok(t) { return /^-?\d+(\.\d+)?$/.test(t) || isNumWord(t); }
  function numberize(T) {
    var out = [], i = 0;
    while (i < T.length) {
      if (!isNumWord(T[i])) { out.push(T[i]); i++; continue; }
      var total = 0, cur = 0, j = i;
      while (j < T.length) {
        var t = T[j];
        if (Object.prototype.hasOwnProperty.call(NUMW, t)) cur += NUMW[t];
        else if (Object.prototype.hasOwnProperty.call(TENS, t)) cur += TENS[t];
        else if (t === 'hundred') cur = (cur || 1) * 100;
        else if (t === 'thousand') { total += (cur || 1) * 1000; cur = 0; }
        else if (t === 'and' && j + 1 < T.length && isNumWord(T[j + 1]) && j > i) { /* one hundred and five */ }
        else break;
        j++;
      }
      var val = String(total + cur);
      if (T[j] === 'point' && j + 1 < T.length && Object.prototype.hasOwnProperty.call(NUMW, T[j + 1])) {
        var dec = ''; j++;
        while (j < T.length && Object.prototype.hasOwnProperty.call(NUMW, T[j]) && NUMW[T[j]] < 10) { dec += NUMW[T[j]]; j++; }
        val += '.' + dec;
      }
      out.push(val); i = j;
    }
    return out;
  }
  /* টোকেন: ফাঁকা দিয়ে ভাগ; "n a o h" বা "k i"-র মতো একক-অক্ষরের সারি জুড়ে "naoh", "ki" */
  function tokens(s) {
    var n = normalize(s); if (!n) return [];
    var raw = numberize(n.split(' ')), out = [], i = 0;
    while (i < raw.length) {
      var j = i; while (j < raw.length && /^[a-z0-9]$/.test(raw[j])) j++;
      if (j - i >= 2) { out.push(raw.slice(i, j).join('')); i = j; } else { out.push(raw[i]); i++; }
    }
    return out;
  }

  /* ================= ফাজি মিল ================= */
  function cp(s) { return Array.from(s); }
  function lev(a, b) {
    var m = a.length, n = b.length, d = [], i, j;
    for (i = 0; i <= m; i++) { d[i] = [i]; }
    for (j = 1; j <= n; j++) d[0][j] = j;
    for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n];
  }
  /* দুই শব্দের মিল (০..১)। বাংলা বিভক্তি (নিউক্লিয়াস → নিউক্লিয়াসে) ও English বহুবচন সহ্য করে; বানানের ছোট ভুলও। */
  function tokSim(a, b) {
    if (a === b) return 1;
    var A = cp(a), B = cp(b), mn = Math.min(A.length, B.length), mx = Math.max(A.length, B.length);
    if (mn >= 3 && (a.indexOf(b) === 0 || b.indexOf(a) === 0) && mn / mx >= .7) return .92;
    if (mx >= 5) { var s = 1 - lev(A, B) / mx; if (s >= .78) return s * .92; }
    return 0;
  }
  /* utterance-এর ভেতরে phrase পরপর আছে কি; থাকলে গড় মিল (≥০.৮৫), নইলে ০ */
  function phraseIn(U, P) {
    if (!P.length || U.length < P.length) return 0;
    var best = 0;
    for (var i = 0; i + P.length <= U.length; i++) {
      var sum = 0, ok = true;
      for (var j = 0; j < P.length; j++) { var s = tokSim(U[i + j], P[j]); if (s < .8) { ok = false; break; } sum += s; }
      if (ok) best = Math.max(best, sum / P.length);
    }
    return best;
  }
  var tokMemo = {};
  function tokM(s) { return tokMemo[s] || (tokMemo[s] = tokens(s)); }
  function has(U, list) { for (var i = 0; i < list.length; i++) if (phraseIn(U, tokM(list[i]))) return true; return false; }
  function hasAll(U, a, b) { return has(U, a) && has(U, b); }

  /* ================= শব্দভান্ডার ================= */
  var W = {
    yes: ['yes', 'yeah', 'yep', 'ok', 'okay', 'sure', 'correct', 'do it', 'right', 'হ্যাঁ', 'হ্যা', 'হাঁ', 'হা', 'জি', 'ঠিক আছে', 'ঠিক', 'ওকে', 'অবশ্যই'],
    no: ['no', 'nope', 'cancel', 'never mind', 'wrong', 'না', 'নাহ', 'থাক', 'বাতিল', 'ভুল'],
    stop: ['stop listening', 'mic off', 'microphone off', 'turn off mic', 'stop voice', 'voice off', 'মাইক বন্ধ', 'শোনা বন্ধ', 'ভয়েস বন্ধ', 'মাইক্রোফোন বন্ধ'],
    stopSolo: ['stop', 'থামো', 'থামুন'],
    help: ['help', 'what can i say', 'commands', 'voice help', 'সাহায্য', 'কমান্ড', 'কী বলব', 'কি বলব', 'কী বলতে পারি', 'কি বলতে পারি'],
    lab: ['lab', 'laboratory', 'ল্যাব', 'ল্যাবে', 'ল্যাবটি', 'ল্যাবরেটরি'],
    goto: ['go to', 'open', 'switch', 'take me', 'চলো', 'যাও', 'খোলো', 'খুলুন', 'বদলাও'],
    openv: ['open', 'start', 'begin', 'launch', 'run', 'load', 'go to', 'শুরু', 'খোলো', 'খুলুন', 'চালু', 'চলো', 'ওপেন', 'স্টার্ট'],
    back: ['go back', 'back to list', 'experiment list', 'exit experiment', 'close experiment', 'exit', 'back', 'পিছনে', 'পেছনে', 'ফিরে যাও', 'তালিকায় ফিরে', 'তালিকায় যাও', 'বের হও', 'ব্যাক'],
    hint: ['hint', 'clue', 'ইঙ্গিত', 'হিন্ট', 'ইশারা'],
    restart: ['restart', 'start over', 'start again', 'redo', 'try again', 'reset experiment', 'আবার শুরু', 'নতুন করে শুরু', 'রিস্টার্ট', 'আবার করো', 'আবার চেষ্টা'],
    camReset: ['reset camera', 'reset view', 'default view', 'camera reset', 'reset cam', 'ক্যামেরা রিসেট', 'ভিউ রিসেট', 'ক্যামেরা ঠিক করো', 'আগের ভিউ', 'রিসেট ক্যামেরা'],
    labels: ['labels', 'label', 'show labels', 'hide labels', 'লেবেল'],
    labelsVerb: ['show', 'hide', 'toggle', 'display', 'দেখাও', 'লুকাও', 'দেখান', 'লুকান', 'চালু', 'বন্ধ'],
    primary: ['next', 'next step', 'continue', 'proceed', 'check', 'submit', 'verify', 'done', 'finish', 'finished', 'পরের ধাপ', 'পরবর্তী ধাপ', 'পরবর্তী', 'যাচাই', 'জমা দাও', 'জমা', 'চেক করো', 'এগিয়ে যাও', 'এগোও', 'শেষ'],
    zoomIn: ['zoom in', 'zoomin', 'zooming in', 'closer', 'come closer', 'bigger', 'enlarge', 'magnify', 'increase zoom', 'জুম ইন', 'জুমইন', 'কাছে', 'কাছে আনো', 'বড় করো', 'বড় করে', 'আরো বড়', 'ম্যাগনিফাই'],
    zoomOut: ['zoom out', 'zoomout', 'zooming out', 'farther', 'further', 'move away', 'smaller', 'shrink', 'decrease zoom', 'জুম আউট', 'জুমআউট', 'দূরে', 'দূরে সরাও', 'ছোট করো', 'ছোট করে', 'আরো ছোট'],
    zoomAny: ['zoom', 'জুম'],
    seeV: ['zoom', 'focus', 'show', 'find', 'locate', 'see', 'look', 'go', 'center', 'centre', 'take me', 'জুম', 'ফোকাস', 'দেখাও', 'দেখান', 'খুঁজে', 'খুঁজো', 'কোথায়', 'চলো', 'যাও', 'দেখি', 'দেখব'],
    camWords: ['camera', 'scene', 'model', '3d', 'view', 'ক্যামেরা', 'মডেল', 'দৃশ্য', 'ভিউ'],
    magW: ['mag', 'magnification', 'objective', 'lens', 'power', 'zoom', 'times', 'x', 'গুণ', 'গুন', 'এক্স', 'জুম', 'ম্যাগনিফিকেশন', 'মাগ্নিফিকেশন', 'ম্যাগ্নিফিকেশন', 'লেন্স', 'পাওয়ার'],
    lowPower: ['low power', 'lowest', 'minimum', 'কম পাওয়ার', 'সর্বনিম্ন', 'সবচেয়ে কম'],
    highPower: ['high power', 'highest', 'maximum', 'max', 'oil immersion', 'হাই পাওয়ার', 'সর্বোচ্চ', 'সবচেয়ে বেশি', 'ইমারশন'],
    rot: ['rotate', 'turn', 'spin', 'orbit', 'swing', 'look', 'tilt', 'ঘোরাও', 'ঘুরাও', 'ঘোরো', 'ঘুরিয়ে', 'ঘোরান', 'টিল্ট', 'ঘুরো'],
    pan: ['move', 'pan', 'shift', 'slide', 'drag', 'scroll', 'সরাও', 'সরো', 'সরান', 'মুভ', 'টানো'],
    left: ['left', 'বাম', 'বামে', 'বাঁ', 'বাঁয়ে', 'বাঁদিকে'],
    right: ['right', 'ডান', 'ডানে', 'ডাইনে', 'ডানদিকে'],
    up: ['up', 'upward', 'upwards', 'উপরে', 'ওপরে', 'উপর', 'ওপর'],
    down: ['down', 'downward', 'downwards', 'নিচে', 'নিচ', 'নীচে'],
    focus: ['focus', 'sharper', 'clearer', 'blurry', 'fine focus', 'ফোকাস', 'ঝাপসা'],
    more: ['more', 'increase', 'higher', 'up', 'বাড়াও', 'বাড়ান', 'বেশি', 'বাড়ানো'],
    less: ['less', 'decrease', 'lower', 'down', 'কমাও', 'কমান', 'কম'],
    lots: ['a lot', 'much', 'far', 'অনেক', 'বেশি করে'],
    little: ['little', 'slightly', 'bit', 'একটু', 'সামান্য', 'অল্প'],
    fill: ['enter', 'type', 'write', 'input', 'answer', 'fill', 'লেখো', 'লিখো', 'লিখুন', 'লেখ', 'টাইপ', 'ইনপুট', 'উত্তর'],
    fillSkip: ['in', 'the', 'box', 'field', 'as', 'to', 'is', 'this', 'it', 'এটা', 'এই', 'করো', 'দাও', 'দিন', 'কর', 'ঘরে', 'ঘর', 'বক্সে']
  };
  var LAB_ALIAS = {
    micro: ['microbiology', 'micro biology', 'micro', 'মাইক্রোবায়োলজি', 'মাইক্রো'],
    plant: ['botany', 'plant', 'plants', 'উদ্ভিদ', 'উদ্ভিদবিজ্ঞান', 'বটানি'],
    chem: ['chemistry', 'chemical', 'কেমিস্ট্রি', 'রসায়ন', 'কেমিক্যাল'],
    animal: ['zoology', 'animal', 'animals', 'প্রাণিবিজ্ঞান', 'প্রাণী', 'জুলজি']
  };

  /* ================= নাম-বিকল্প (aliases) =================
     key = বাটন/অপশনের data-* মান (যেমন naoh, flame, Cu)। strong = সরাসরি নাম, loose = সাধারণ শব্দ ("acid", "base") যা মিলের ওপরসীমা ০.৮। */
  var ALIAS = {
    /* মাইক্রোবায়োলজি যন্ত্র */
    smear: { strong: ['smear', 'make smear', 'স্মিয়ার'] },
    dry: { strong: ['dry', 'air dry', 'শুকাও', 'শুকিয়ে নাও', 'শুকানো'] },
    cv: { strong: ['crystal violet', 'gentian violet', 'ক্রিস্টাল ভায়োলেট', 'ক্রিস্টাল ভায়লেট'], loose: ['violet', 'ভায়োলেট'] },
    iodine: { strong: ['iodine', 'gram iodine', 'lugol', 'আয়োডিন', 'আইওডিন'] },
    safranin: { strong: ['safranin', 'saffranin', 'counterstain', 'সেফ্রানিন', 'সাফরানিন'] },
    blot: { strong: ['blot', 'blotting', 'ব্লট'] },
    flame: { strong: ['flame', 'burner', 'bunsen', 'sterilize loop', 'sterilise loop', 'flame test', 'শিখা পরীক্ষা', 'বুনসেন', 'বার্নার', 'শিখা'] },
    cool: { strong: ['cool', 'cool down', 'ঠান্ডা'] },
    tube: { strong: ['culture tube', 'tube', 'কালচার টিউব', 'টিউব'] },
    plate: { strong: ['plate lid', 'lid', 'petri dish', 'প্লেটের ঢাকনা', 'ঢাকনা'] },
    rotate: { strong: ['rotate plate', 'turn plate', 'প্লেট ঘোরাও'] },
    label: { strong: ['label plate', 'label the plate', 'লেবেল'] },
    invert: { strong: ['invert', 'flip', 'upside down', 'উল্টে দাও', 'উল্টে', 'উল্টো'] },
    door: { strong: ['door', 'incubator door', 'দরজা'] },
    place: { strong: ['place', 'put inside', 'তাকে রাখো', 'রাখো'] },
    out: { strong: ['take out', 'remove plate', 'প্লেট বের করো', 'বের করো'] },
    water: { strong: ['water', 'add water', 'পানি', 'জল'] },
    heat: { strong: ['heat', 'heat and stir', 'warm', 'stir', 'গরম', 'নাড়া', 'গরম করো'] },
    plug: { strong: ['cotton plug', 'plug', 'cotton', 'তুলোর ছিপি', 'তুলো', 'ছিপি'] },
    bath: { strong: ['water bath', 'bath', 'ওয়াটারবাথ', 'ওয়াটার বাথ'] },
    set: { strong: ['let it set', 'solidify', 'জমতে দাও', 'জমাও'] },
    spread: { strong: ['spread', 'spread plate', 'স্প্রেড'] },
    /* উদ্ভিদবিজ্ঞান */
    cut: { strong: ['cut', 'blade', 'slice', 'cut with blade', 'ব্লেড', 'কাটো', 'কাটা'] },
    scope: { strong: ['microscope', 'scope', 'মাইক্রোস্কোপ', 'অণুবীক্ষণ'] },
    /* কেমিস্ট্রি: ক্যাটায়ন রিএজেন্ট */
    naoh: { strong: ['sodium hydroxide', 'caustic soda', 'naoh', 'সোডিয়াম হাইড্রক্সাইড', 'কস্টিক সোডা', 'কস্টিক'], loose: ['base', 'alkali', 'alkaline', 'ক্ষার', 'ক্ষারক', 'বেস'] },
    nh4oh: { strong: ['ammonium hydroxide', 'ammonia', 'ammonia solution', 'nh4oh', 'অ্যামোনিয়াম হাইড্রক্সাইড', 'অ্যামোনিয়া', 'এমোনিয়া', 'এমোনিয়াম হাইড্রক্সাইড'] },
    hcl: { strong: ['hydrochloric acid', 'hcl', 'dilute hcl', 'হাইড্রোক্লোরিক অ্যাসিড', 'হাইড্রোক্লোরিক এসিড'], loose: ['acid', 'অ্যাসিড', 'এসিড'] },
    k2cro4: { strong: ['potassium chromate', 'k2cro4', 'chromate', 'পটাসিয়াম ক্রোমেট'] },
    ki: { strong: ['potassium iodide', 'ki', 'পটাসিয়াম আয়োডাইড'] },
    k4fe: { strong: ['potassium ferrocyanide', 'ferrocyanide', 'k4fe', 'ফেরোসায়ানাইড', 'পটাসিয়াম ফেরোসায়ানাইড'] },
    k3fe: { strong: ['potassium ferricyanide', 'ferricyanide', 'k3fe', 'ফেরিসায়ানাইড', 'পটাসিয়াম ফেরিসায়ানাইড'] },
    kscn: { strong: ['potassium thiocyanate', 'thiocyanate', 'kscn', 'থায়োসায়ানেট', 'পটাসিয়াম থায়োসায়ানেট'] },
    na2co3: { strong: ['sodium carbonate', 'na2co3', 'soda ash', 'সোডিয়াম কার্বনেট'] },
    oxal: { strong: ['ammonium oxalate', 'oxalate', 'অ্যামোনিয়াম অক্সালেট'] },
    na2s: { strong: ['sodium sulfide', 'sodium sulphide', 'na2s', 'সোডিয়াম সালফাইড'] },
    h2s: { strong: ['hydrogen sulfide', 'hydrogen sulphide', 'h2s', 'হাইড্রোজেন সালফাইড'] },
    nessler: { strong: ['nessler', 'nessler reagent', 'নেসলার', 'নেসলারস'] },
    /* কেমিস্ট্রি: অ্যানায়ন রিএজেন্ট */
    dilh2so4: { strong: ['dilute sulfuric acid', 'dilute sulphuric acid', 'dil h2so4', 'dilute h2so4', 'dilute sulfuric', 'ডাইলিউট সালফিউরিক', 'ডাইলিউট সালফিউরিক অ্যাসিড'], loose: ['acid', 'অ্যাসিড', 'এসিড'] },
    conch2so4: { strong: ['concentrated sulfuric acid', 'concentrated sulphuric acid', 'conc h2so4', 'concentrated h2so4', 'concentrated acid', 'ঘন সালফিউরিক', 'ঘন অ্যাসিড'] },
    bacl2: { strong: ['barium chloride', 'bacl2', 'বেরিয়াম ক্লোরাইড'] },
    agno3: { strong: ['silver nitrate', 'agno3', 'সিলভার নাইট্রেট'] },
    feso4: { strong: ['ferrous sulfate', 'ferrous sulphate', 'brown ring', 'feso4', 'ব্রাউন রিং', 'ফেরাস সালফেট'] },
    molyb: { strong: ['ammonium molybdate', 'molybdate', 'মলিবডেট', 'অ্যামোনিয়াম মলিবডেট'] },
    cl2chcl3: { strong: ['chlorine water', 'chloroform', 'cl2 chcl3', 'ক্লোরিন জল', 'ক্লোরোফর্ম'] },
    kmno4: { strong: ['potassium permanganate', 'permanganate', 'kmno4', 'পারম্যাঙ্গানেট', 'পটাসিয়াম পারম্যাঙ্গানেট'] },
    dilhno3: { strong: ['dilute nitric acid', 'nitric acid', 'hno3', 'ডাইলিউট নাইট্রিক', 'নাইট্রিক অ্যাসিড'] },
    lime: { strong: ['lime water', 'limewater', 'চুনের জল'] },
    lead: { strong: ['lead acetate paper', 'lead acetate', 'লেড অ্যাসিটেট'] },
    xs: { strong: ['excess', 'more reagent', 'অতিরিক্ত'] },
    cat: { strong: ['cation test', 'cation tube', 'cation', 'ক্যাটায়ন পরীক্ষা', 'ক্যাটায়ন'] },
    an: { strong: ['anion test', 'anion tube', 'anion', 'অ্যানায়ন পরীক্ষা', 'অ্যানায়ন'] },
    tcat: { strong: ['cation tube', 'ক্যাটায়ন টিউব'] },
    tan: { strong: ['anion tube', 'অ্যানায়ন টিউব'] },
    /* ক্যাটায়ন/অ্যানায়ন অপশন (ইংরেজি নাম) */
    Na: { strong: ['sodium'] }, K: { strong: ['potassium'] }, NH4: { strong: ['ammonium'] }, Ca: { strong: ['calcium'] }, Ba: { strong: ['barium'] }, Mg: { strong: ['magnesium'] },
    Al: { strong: ['aluminium', 'aluminum'] }, Zn: { strong: ['zinc'] }, Pb: { strong: ['lead'] }, Ag: { strong: ['silver'] }, Fe2: { strong: ['ferrous', 'iron 2', 'iron two', 'iron ii'] },
    Fe3: { strong: ['ferric', 'iron 3', 'iron three', 'iron iii'] }, Cu: { strong: ['copper'] }, Mn: { strong: ['manganese'] }, Ni: { strong: ['nickel'] },
    Cl: { strong: ['chloride'] }, Br: { strong: ['bromide'] }, I: { strong: ['iodide'] }, SO4: { strong: ['sulfate', 'sulphate'] }, CO3: { strong: ['carbonate'] },
    NO3: { strong: ['nitrate'] }, NO2: { strong: ['nitrite'] }, PO4: { strong: ['phosphate'] }, S: { strong: ['sulfide', 'sulphide'] }, Ac: { strong: ['acetate'] }, Ox: { strong: ['oxalate'] },
    /* গ্রাম স্টেইনের পর্যবেক্ষণ ও প্রাণী-কি */
    '+': { strong: ['gram positive', 'positive', 'ধনাত্মক', 'গ্রাম পজিটিভ', 'পজিটিভ'] }, '-': { strong: ['gram negative', 'negative', 'ঋণাত্মক', 'গ্রাম নেগেটিভ', 'নেগেটিভ'] },
    rod: { strong: ['rod', 'bacillus', 'bacilli', 'rod shaped', 'দণ্ডাকার', 'রড'] }, coccus: { strong: ['coccus', 'cocci', 'spherical', 'round', 'গোলাকার', 'কক্কাস'] },
    comma: { strong: ['comma', 'curved', 'vibrio', 'কমা'] }, tetrad: { strong: ['tetrad', 'টেট্রাড'] }, single: { strong: ['single', 'pairs', 'একক', 'জোড়া'] },
    chain: { strong: ['chain', 'chains', 'শিকল'] }, cluster: { strong: ['cluster', 'clusters', 'bunch', 'থোকা'] },
    y: { strong: ['yes', 'হ্যাঁ', 'হাঁ'] }, n: { strong: ['no', 'না'] },
    jelly: { strong: ['jellyfish', 'aurelia', 'জেলিফিশ'] }, worm: { strong: ['earthworm', 'worm', 'pheretima', 'কেঁচো'] }, snail: { strong: ['snail', 'pila', 'শামুক'] },
    star: { strong: ['starfish', 'sea star', 'asterias', 'তারামাছ'] }, hopper: { strong: ['grasshopper', 'locust', 'schistocerca', 'ফড়িং', 'ঘাসফড়িং'] },
    prawn: { strong: ['prawn', 'shrimp', 'macrobrachium', 'চিংড়ি'] }, rohu: { strong: ['rohu', 'labeo', 'fish', 'রুই', 'রুই মাছ'] },
    frog: { strong: ['frog', 'rana', 'ব্যাঙ'] }, lizard: { strong: ['lizard', 'garden lizard', 'calotes', 'গিরগিটি'] },
    pigeon: { strong: ['pigeon', 'columba', 'কবুতর'] }, rabbit: { strong: ['rabbit', 'oryctolagus', 'খরগোশ'] }
  };
  var EXP_ALIAS = {
    'mb-lib': ['bacteria library', 'bacteria models', 'bacterial 3d', 'ব্যাকটেরিয়া লাইব্রেরি'],
    'mb-gram': ['gram stain', 'gram staining', 'gram', 'গ্রাম স্টেইন', 'গ্রাম স্টেইনিং'],
    'mb-streak': ['streak plate', 'streak plating', 'streaking', 'quadrant streak', 'স্ট্রিক প্লেট', 'স্ট্রিক'],
    'mb-incub': ['incubator', 'incubate', 'ইনকিউবেটর'],
    'mb-media': ['culture media', 'media preparation', 'prepare media', 'কালচার মিডিয়া', 'মিডিয়া প্রস্তুতি'],
    'mb-serial': ['serial dilution', 'dilution', 'সিরিয়াল ডাইলুশন', 'ডাইলুশন'],
    'mb-count': ['colony count', 'colony counting', 'count colonies', 'কলোনি কাউন্ট', 'কলোনি গণনা'],
    'pl-hib': ['hibiscus', 'china rose', 'flower dissection', 'জবা', 'জবা ফুল'],
    'pl-bean': ['bean seed', 'bean', 'dicot seed', 'শিমের বীজ', 'শিম'],
    'pl-maize': ['maize', 'corn', 'monocot seed', 'ভুট্টা', 'ভুট্টার দানা'],
    'pl-slide': ['slide preparation', 'slide', 'onion peel', 'স্লাইড', 'পেঁয়াজ'],
    'chem-salt': ['salt analysis', 'unknown salt', 'salt', 'লবণ', 'অজানা লবণ'],
    'an-key': ['dichotomous key', 'identification key', 'ডাইকোটোমাস কি'],
    'an-quiz': ['animal quiz', 'identification quiz', 'quiz', 'কুইজ'],
    'an-gal': ['animal gallery', 'gallery', 'গ্যালারি']
  };
  function addAliases(map) {
    Object.keys(map || {}).forEach(function (k) {
      var cur = ALIAS[k] || (ALIAS[k] = { strong: [] }), m = map[k];
      (m.strong || []).forEach(function (v) { if (cur.strong.indexOf(v) < 0) cur.strong.push(v); });
      if (m.loose) { cur.loose = cur.loose || []; m.loose.forEach(function (v) { if (cur.loose.indexOf(v) < 0) cur.loose.push(v); }); }
    });
  }
  /* VLData (ডেটা ফাইল) থেকে নাম-বিকল্প বানায়: ডিসেকশনের অংশ, ব্যাকটেরিয়া, মিডিয়া, ক্যাটায়ন/অ্যানায়ন। */
  function aliasesFromData(D) {
    var out = {}; if (!D) return out;
    function add(id, arr) { var o = out[id] || (out[id] = { strong: [] }); arr.forEach(function (s) { s = String(s || '').trim(); if (s && o.strong.indexOf(s) < 0) o.strong.push(s); }); }
    function names(n) { var s = String(n || ''), outv = [s.replace(/\([^)]*\)/g, ' ').trim()]; (s.match(/\(([^)]*)\)/g) || []).forEach(function (p) { outv.push(p.slice(1, -1)); }); return outv; }
    Object.keys(D.DISSECT || {}).forEach(function (k) { D.DISSECT[k].parts.forEach(function (p) { add(p.id, names(p.n)); }); });
    (D.BACT || []).forEach(function (b) { var w = String(b.n).split(' '); add(b.id, [b.n, b.bn].concat(w.length === 2 ? [w[0][0] + ' ' + w[1], w[1]] : [])); });
    (D.MEDIA || []).forEach(function (m) { add(m.id, names(m.n)); });
    (D.CAT || []).forEach(function (c) { add(c.id, [c.f, c.n]); });
    (D.AN || []).forEach(function (a) { add(a.id, [a.f, a.n]); });
    (D.ANIMALS || []).forEach(function (a) { add(a.id, names(a.n)); });
    return out;
  }

  /* ================= লক্ষ্যের সাথে মিল ================= */
  var UNITS = { c: 1, ml: 1, psi: 1, l: 1, mm: 1, µl: 1, 'মিনিট': 1, 'ঘণ্টা': 1, 'বার': 1, 'ডিগ্রি': 1, 'সেকেন্ড': 1, degree: 1, degrees: 1, minutes: 1, minute: 1, hours: 1, hour: 1 };
  /* আদেশের ক্রিয়া ও ফাঁকা শব্দ: এগুলো "না মেলা" ধরা হয় না, নামের মিলের হিসাবে বাদ */
  var FILLER = {}; ('add mix pour put drop use apply select choose click press tap show open start begin the a an to of in on into at with please now it this that me my and then for from is are can you i we let lets take give do make go see look find locate center centre zoom focus hey ok okay again also just একটু এই ওই এটা সেটা এবার এখন প্লিজ দাও দিন করো করুন কর করে যোগ মেশাও ঢালো নাও নিন জুম ফোকাস দেখাও দেখান খুঁজো খুঁজে চাপো ক্লিক বাছো বেছে'.split(' ')).forEach(function (w) { FILLER[w] = 1; });
  /* অপশনের গ্রুপ-নামের ইংরেজি সমার্থক: "cation copper" বললে ক্যাটায়ন ড্রপডাউনের Cu-কে এগিয়ে দেয় */
  var GROUP_ALIAS = { 'ক্যাটায়ন': ['cation', 'cations'], 'অ্যানায়ন': ['anion', 'anions'], 'তাপমাত্রা': ['temperature', 'temp'], 'চাপ': ['pressure'], 'সময়': ['time', 'duration'], 'আয়তন': ['volume'], 'ঘণ্টা': ['hours', 'hour'] };
  function tokWeight(t) { return /^\d/.test(t) ? 3 * t.length : (UNITS[t] || cp(t).length <= 1) ? .3 : cp(t).length; }
  /* এক ভ্যারিয়ান্টের (নাম/বিকল্প) সাথে বাক্যের মিল: {s: ০..১, len: ভ্যারিয়ান্টের অক্ষর-সংখ্যা (নির্দিষ্টতার মাপ)} */
  function scoreVariant(U, uSq, variant) {
    var V = tokM(variant); if (!V.length) return { s: 0, len: 0 };
    var vSq = V.join(''), len = cp(vSq).length;
    if (uSq === vSq) return { s: 1, len: len };
    if (len < 2) return { s: 0, len: len };   // "I", "S", "K": শুধু পুরো বাক্য হলে
    /* বাক্যের কাজের শব্দগুলোর কতটা এই ভ্যারিয়ান্ট ব্যাখ্যা করে (বাকি ক্রিয়াপদ ধরা হয় না) */
    var cw = 0, ew = 0, cMatched = 0, cCount = 0;
    U.forEach(function (u) {
      if (FILLER[u]) return; var w = tokWeight(u), b = 0;
      for (var j = 0; j < V.length; j++) { var q = tokSim(u, V[j]); if (q > b) b = q; }
      cw += w; cCount++; if (b >= .6) ew += w * b; if (b >= .85) cMatched++;
    });
    var mult = .8 + .2 * (cw ? ew / cw : 1), best = 0;
    var ph = phraseIn(U, V); if (ph) best = .95 * ph * mult;
    if (vSq.length >= 4 && uSq.indexOf(vSq) >= 0) best = Math.max(best, .9 * mult);
    var sum = 0, tot = 0, strong = false;
    V.forEach(function (vt) { var b = 0; for (var i = 0; i < U.length; i++) { var q = tokSim(U[i], vt); if (q > b) b = q; } var w = tokWeight(vt); sum += w * b; tot += w; if (b >= .85 && w >= 2) strong = true; });
    if (strong && tot) best = Math.max(best, .95 * (sum / tot) * mult);
    /* আংশিক নাম: বাক্যের সব কাজের শব্দ এই (একাধিক-শব্দের) নামে আছে, যেমন "bacillus" ← "Bacillus subtilis" → শুধু প্রস্তাব, সরাসরি চালু নয় */
    if (cCount && cMatched === cCount && cw >= 4 && V.length > 1) best = Math.max(best, .74);
    return { s: best, len: len };
  }
  function labelVariants(label) {
    var s = String(label || ''), out = [], main = normalize(s.replace(/\([^)]*\)/g, ' '));
    if (main) out.push(main);
    (s.match(/\(([^)]*)\)/g) || []).forEach(function (p) { var n = normalize(p.slice(1, -1)); if (n && !/^[\d\s]+$/.test(n) && cp(n).length >= 3) out.push(n); });
    var full = normalize(s); if (full && out.indexOf(full) < 0) out.push(full);
    return out;
  }
  function own(o, k) { return k != null && Object.prototype.hasOwnProperty.call(o, k); }
  function groupHit(U, group) {
    var G = tokens(group), hit = false;
    G.forEach(function (g) {
      if (UNITS[g] || cp(g).length < 2) return;
      U.forEach(function (u) { if (tokSim(u, g) >= .85) hit = true; });
      (GROUP_ALIAS[g] || []).forEach(function (a) { if (U.indexOf(a) >= 0) hit = true; });
    });
    return hit;
  }
  function scoreTarget(U, uSq, t) {
    var best = { s: 0, len: 0 };
    function take(r, cap) { if (cap != null && r.s > cap) r = { s: cap, len: r.len }; if (r.s > best.s || (r.s === best.s && r.len > best.len)) best = r; }
    labelVariants(t.label).forEach(function (v) { take(scoreVariant(U, uSq, v)); });
    var al = own(ALIAS, t.id) ? ALIAS[t.id] : null;
    if (al) {
      (al.strong || []).forEach(function (a) { take(scoreVariant(U, uSq, a)); });
      (al.loose || []).forEach(function (a) { take(scoreVariant(U, uSq, a), .8); });
    }
    (t.aliases || []).forEach(function (a) { take(scoreVariant(U, uSq, a)); });
    if (t.kind === 'exp' && own(EXP_ALIAS, t.id)) EXP_ALIAS[t.id].forEach(function (a) { take(scoreVariant(U, uSq, a)); });
    if (t.id != null && /[a-z]/i.test(String(t.id)) && String(t.id).length >= 3) take(scoreVariant(U, uSq, String(t.id)), .9);
    if (t.group && best.s >= .55 && groupHit(U, t.group)) best = { s: best.s + .2, len: best.len };
    return best;
  }
  function rank(U, list, openVerb) {
    var uSq = U.join(''), seen = {}, out = [];
    (list || []).forEach(function (t) {
      if (t.kind === 'exp' && t.needVerb && !openVerb) return;
      var r0 = scoreTarget(U, uSq, t); if (r0.s < .4) return;
      var k = t.key || (t.kind + '|' + t.id + '|' + t.label);
      if (seen[k]) { if (seen[k].score >= r0.s) return; out.splice(out.indexOf(seen[k]), 1); }
      var r = { t: t, score: r0.s, len: r0.len, key: k }; seen[k] = r; out.push(r);
    });
    out.sort(function (a, b) { return b.score - a.score || b.len - a.len; });
    return out;
  }

  /* ================= সংখ্যা ও মান ================= */
  /* "১২৫", "one hundred twenty five", "1.5 times 10 to the 7" → লেখার মান ("125", "1.5 × 10^7") */
  function parseValue(T) {
    var s = T.join(' ').replace(/\b(minus|negative|মাইনাস|ঋণাত্মক)\s+(?=\d)/g, '-');
    var m = /^(-?\d+(?:\.\d+)?)\s*(?:x|times|into|multiplied by|গুণ|গুন)?\s*10\s*(?:\^|to the power of|to the power|to the|power of|power|raised to|ঘাত|এর ঘাত)?\s*(-?\d+)$/.exec(s);
    if (m) return m[1] + ' × 10^' + m[2];
    m = /^(-?\d+(?:\.\d+)?)e(-?\d+)$/.exec(s); if (m) return m[1] + ' × 10^' + m[2];
    m = /^10\s*(?:\^|to the power of|to the power|to the|power of|power|raised to)\s*(-?\d+)$/.exec(s); if (m) return '10^' + m[1];
    return s;
  }
  function extractMag(U) {
    if (has(U, W.lowPower)) return 'min';
    if (has(U, W.highPower) && has(U, ['power', 'zoom', 'mag', 'magnification', 'lens', 'objective', 'জুম', 'পাওয়ার', 'লেন্স', 'ইমারশন', 'immersion'])) return 'max';
    var trig = has(U, W.magW);
    for (var i = 0; i < U.length; i++) {
      var m = /^(\d+)(x)?$/.exec(U[i]); if (!m) continue; var v = +m[1]; if (v < 2 || v > 1000) continue;
      if (m[2] || trig) return v;
    }
    return null;
  }
  function dirOf(U) {
    if (has(U, W.left)) return 'left'; if (has(U, W.right)) return 'right'; if (has(U, W.up)) return 'up'; if (has(U, W.down)) return 'down'; return null;
  }
  function ordinal(U) {
    var map = { '1': 1, first: 1, 'প্রথম': 1, 'প্রথমটি': 1, '2': 2, second: 2, 'দ্বিতীয়': 2, 'দ্বিতীয়টি': 2, '3': 3, third: 3, 'তৃতীয়': 3, 'তৃতীয়টি': 3, '4': 4, fourth: 4, 'চতুর্থ': 4, 'চতুর্থটি': 4 };
    for (var i = 0; i < U.length; i++) if (Object.prototype.hasOwnProperty.call(map, U[i])) return map[U[i]];
    return 0;
  }

  /* ================= বাক্য ভাগ: "A আর B", "A and then B" ================= */
  var CONJ = { and: 1, then: 1, plus: 1, also: 1, 'এবং': 1, 'আর': 1, 'ও': 1, 'তারপর': 1, 'তারপরে': 1, 'এরপর': 1, 'এরপরে': 1, 'অতঃপর': 1 };
  function split(text) {
    var T = tokens(text), segs = [], cur = [];
    for (var i = 0; i < T.length; i++) {
      var t = T[i];
      if (CONJ[t] && cur.length) {
        var prev = cur[cur.length - 1], next = T[i + 1];
        if (t === 'and' && isNumTok(prev) && next && isNumTok(next)) { cur.push(t); continue; }
        if (t === 'and' && next === 'then') continue;
        if (!next) continue;
        segs.push(cur); cur = []; continue;
      }
      if (CONJ[t] && !cur.length) continue;
      cur.push(t);
    }
    if (cur.length) segs.push(cur);
    return segs.slice(0, 4).map(function (s) { return s.join(' '); });
  }

  /* ================= মূল পার্সার ================= */
  function none(raw) { return { type: 'none', raw: raw }; }
  function parse(text, ctx) {
    ctx = ctx || {}; var raw = String(text || ''), U = tokens(raw);
    if (!U.length) return none(raw);
    var uSq = U.join(''), n = U.length, targets = ctx.targets || [], res;
    function out(o) { o.raw = raw; return o; }

    /* ১. চলমান প্রশ্নের উত্তর (হ্যাঁ/না, প্রথমটি/দ্বিতীয়টি) */
    if (ctx.pending && ctx.pending.kind === 'confirm' && n <= 3) { if (has(U, W.yes)) return out({ type: 'yes' }); if (has(U, W.no)) return out({ type: 'no' }); }
    if (ctx.pending && ctx.pending.kind === 'choose') {
      var k = n <= 3 ? ordinal(U) : 0; if (k) return out({ type: 'choose', index: k - 1 });
      if (n <= 2 && has(U, W.no)) return out({ type: 'no' });
    }

    /* ২. মাইক বন্ধ, সাহায্য */
    if (has(U, W.stop) || (n <= 2 && has(U, W.stopSolo))) return out({ type: 'stop' });
    if (n <= 5 && has(U, W.help)) return out({ type: 'help' });

    /* ৩. ল্যাব বদল ("কেমিস্ট্রি ল্যাব খোলো", "chemistry lab", ছোট বাক্যে শুধু "botany") */
    var labWord = has(U, W.lab), keys = Object.keys(LAB_ALIAS), li;
    for (li = 0; li < keys.length; li++) {
      if (!has(U, LAB_ALIAS[keys[li]])) continue;
      if (labWord) return out({ type: 'tab', lab: keys[li] });
      if (n <= 2 && !targets.some(function (t) { return scoreTarget(U, uSq, t).s >= .75; })) return out({ type: 'tab', lab: keys[li] });
    }

    /* ৪. নেভিগেশন ও সাধারণ কমান্ড */
    if (has(U, W.camReset)) return out({ type: 'camReset' });
    if (has(U, W.restart)) return out({ type: 'restart' });
    if (has(U, W.hint) && n <= 4) return out({ type: 'hint' });
    if (has(U, W.back) && n <= 5 && !ctx.home) return out({ type: 'back' });

    /* ৪ক. মান লেখা ("১২৫ লেখো", "enter 12.5") */
    if (has(U, W.fill)) {
      var rest = U.filter(function (t) { return !has([t], W.fill) && !has([t], W.fillSkip); });
      if (rest.length) return out({ type: 'fill', value: parseValue(rest) });
    }

    /* ৫. অংশে জুম ("নিউক্লিয়াসে জুম করো", "zoom in to the guard cell") */
    if (ctx.parts && ctx.parts.length) {
      var seeV = has(U, W.seeV), pr = rank(U, ctx.parts.filter(function (p) { return !p.needVerb || seeV; }), true);
      if (pr.length && pr[0].score >= (seeV ? .72 : .93) && (!pr[1] || pr[0].score - pr[1].score >= .04)) return out({ type: 'zoomPart', part: pr[0].t, mag: extractMag(U), score: pr[0].score });
    }

    /* ৬. লেবেল দেখানো/লুকানো (স্লাইডে বোতাম থাকলে) */
    if (ctx.labelsToggle && has(U, W.labels) && (has(U, W.labelsVerb) || n <= 2)) return out({ type: 'labels' });

    /* ৭. জুম / মাগ্নিফিকেশন */
    var mag = extractMag(U);
    if (mag != null) return out({ type: 'zoom', mag: mag });
    if (has(U, W.zoomOut)) return out({ type: 'zoom', dir: 'out', cam: has(U, W.camWords) });
    if (has(U, W.zoomIn) || (has(U, W.zoomAny) && n <= 3)) return out({ type: 'zoom', dir: 'in', cam: has(U, W.camWords) });

    /* ৮. ঘোরানো / সরানো */
    var dir = dirOf(U), rot = has(U, W.rot), pan = has(U, W.pan);
    if (dir && (rot || pan || n <= 2)) {
      var amt = has(U, W.lots) ? 2 : has(U, W.little) ? .5 : 1;
      return out({ type: 'move', dir: dir, kind: rot ? 'rotate' : pan ? 'pan' : 'auto', amt: amt });
    }

    /* ৯. ফোকাস */
    if (has(U, W.focus) && ctx.scope) {
      var fd = has(U, W.more) ? 1 : has(U, W.less) ? -1 : 0;
      return out({ type: 'focus', dir: fd });
    }

    /* ১০. পরের ধাপ / যাচাই */
    if (has(U, W.primary) && n <= 4) {
      var tp = rank(U, targets, false);
      if (!tp.length || tp[0].score < .75) return out({ type: 'primary' });
    }

    /* ১২. যন্ত্র/রিএজেন্ট/অপশন/পরীক্ষণ */
    var openVerb = has(U, W.openv), rk = rank(U, targets, openVerb);
    if (rk.length) {
      var top = rk[0];
      /* কাছাকাছি স্কোরের প্রতিদ্বন্দ্বী: তবে অনেক ছোট নাম ("sodium") বড় নামকে ("sodium hydroxide") আটকায় না */
      var near = rk.filter(function (r) { return r.key !== top.key && top.score - r.score <= .04 && r.len >= top.len * .7; });
      if (top.score >= .55 && near.length) return out({ type: 'ambiguous', options: [top].concat(near).slice(0, 4).map(function (r) { return r.t; }) });
      if (top.score >= .75) return out({ type: 'press', target: top.t, score: top.score });
      if (top.score >= .55) return out({ type: 'suggest', target: top.t, score: top.score });
    }
    /* বাকি: শুধু "next/ok"-র মতো ছোট শব্দ */
    if (n <= 2 && has(U, W.primary)) return out({ type: 'primary' });
    return none(raw);
  }

  return {
    version: '3.12',
    normalize: normalize, tokens: tokens, tokSim: tokSim, phraseIn: phraseIn, has: has,
    split: split, parse: parse, rank: rank, scoreTarget: scoreTarget, parseValue: parseValue, extractMag: extractMag,
    addAliases: addAliases, aliasesFromData: aliasesFromData, aliasOf: function (id) { return ALIAS[id] || null; },
    W: W, LAB_ALIAS: LAB_ALIAS, EXP_ALIAS: EXP_ALIAS
  };
});
