'use strict';
/* ভয়েস-কমান্ডের পার্সার টেস্ট: node voice-test.js
   বাংলা, English ও মিশ্র বাক্য থেকে সঠিক intent বের হয় কিনা, আর আড্ডার বাক্যে ভুল কিছু চালু হয় না কিনা, আসল ল্যাব-ডেটা দিয়ে যাচাই। কোনো ব্রাউজার বা নেটওয়ার্ক লাগে না। */
const assert = require('assert');
const D = require('./public/vlab-data.js'), Data = D.VLData || D;
const VC = require('./public/vlab-voice-core.js');
VC.addAliases(VC.aliasesFromData(Data));
let pass = 0, fail = 0; const pending = [], t = (n, f) => pending.push([n, f]);

/* ---------- নকল কনটেক্সট (পর্দায় যা থাকত) ---------- */
const press = (id, label, extra) => Object.assign({ kind: 'press', id, label, key: 'press|' + id + '|' + label }, extra || {});
const chemCat = () => {
  const ts = Data.CREAG.map(r => press(r.id, r.n));
  ts.push(press('flame', '🔥 শিখা পরীক্ষা'), press('heat', '♨ NaOH সহ গরম করো'), press('fresh', 'নতুন টিউব'), press('cat', '🧪 ক্যাটায়ন পরীক্ষা (মূল দ্রবণ)'), press('an', '🧪 অ্যানায়ন পরীক্ষা (সোডিয়াম নির্যাস)'));
  Data.CAT.forEach(c => ts.push({ kind: 'option', id: c.id, label: c.f + ' (' + c.n + ')', group: 'ক্যাটায়ন', key: 'opt|cat|' + c.id }));
  Data.AN.forEach(c => ts.push({ kind: 'option', id: c.id, label: c.f + ' (' + c.n + ')', group: 'অ্যানায়ন', key: 'opt|an|' + c.id }));
  return { targets: ts, has3D: true };
};
const chemAn = () => { const c = chemCat(); c.targets = c.targets.filter(x => !Data.CREAG.some(r => r.id === x.id) || x.kind === 'option').concat(Data.AREAG.map(r => press(r.id, r.n))); return c; };
const slideParts = id => { const s = Data.SLIDES.find(x => x.id === id); return s.parts.map(p => ({ kind: 'part', id: p.id, label: p.n, key: 'part|' + p.id })); };
const onion = () => ({ parts: slideParts('onion'), scope: { mags: [4, 10, 40] }, labelsToggle: true, targets: [press('lb', 'লেবেল দেখাও/লুকাও'), press('go', 'দেখা শেষ')] });
const stomata = () => ({ parts: slideParts('stomata'), scope: { mags: [4, 10, 40] } });
const gram = () => ({ has3D: true, targets: [['smear', 'স্মিয়ার'], ['dry', 'শুকাও'], ['cv', 'ক্রিস্টাল ভায়োলেট'], ['iodine', 'আয়োডিন'], ['safranin', 'সেফ্রানিন'], ['blot', 'ব্লট'], ['flame', 'বুনসেন/লুপ জীবাণুমুক্ত'], ['cool', 'ঠান্ডা করো']].map(a => press(a[0], '🧫 ' + a[1])) });
const dissect = () => ({ has3D: true, targets: Data.DISSECT.hibiscus.parts.map(p => press(p.id, '🔍 ' + p.n.split(' (')[0])) });
const home = () => {
  const ts = [['mb-lib', 'ব্যাকটেরিয়া লাইব্রেরি (৩D)'], ['mb-gram', 'গ্রাম স্টেইনিং (ধাপে ধাপে)'], ['mb-streak', 'স্ট্রিক প্লেটিং মেথড (কোয়াড্র্যান্ট)'], ['mb-incub', 'ইনকিউবেটরে পেট্রি ডিশ রাখা'], ['mb-media', 'কালচার মিডিয়া প্রস্তুতি'], ['mb-serial', 'সিরিয়াল ডাইলুশন ও স্প্রেড প্লেট'], ['mb-count', 'ব্যাকটেরিয়াল কলোনি কাউন্ট'], ['pl-hib', 'জবা ফুলের ডিসেকশন (৩D)'], ['pl-slide', 'স্লাইড তৈরি ও মাইক্রোস্কোপ'], ['chem-salt', 'অজানা লবণ শনাক্তকরণ (ক্যাটায়ন + অ্যানায়ন)'], ['an-key', 'ডাইকোটোমাস কি দিয়ে প্রাণী শনাক্তকরণ'], ['an-gal', 'প্রাণী গ্যালারি: ১১টি নমুনা']];
  return { home: true, targets: ts.map(a => ({ kind: 'exp', id: a[0], label: a[1], key: 'exp|' + a[0] })) };
};
const P = (text, ctx) => VC.parse(text, ctx || {});
const is = (text, ctx, type, extra) => { const r = P(text, ctx); assert.strictEqual(r.type, type, `"${text}" → ${r.type} (${r.target ? r.target.id : r.part ? r.part.id : ''}), চাওয়া: ${type}`); if (extra) Object.keys(extra).forEach(k => assert.deepStrictEqual(r[k], extra[k], `"${text}".${k} = ${JSON.stringify(r[k])}`)); return r; };
const pressId = (text, ctx, id) => { const r = P(text, ctx); assert.strictEqual(r.type, 'press', `"${text}" → ${r.type}${r.options ? ' [' + r.options.map(o => o.id) + ']' : ''}`); assert.strictEqual(r.target.id, id, `"${text}" → ${r.target.id}, চাওয়া: ${id}`); };

/* ================= স্বাভাবিকীকরণ ================= */
t('normalize: সাবস্ক্রিপ্ট, বাংলা অঙ্ক, ×, দশমিক, ZWNJ', () => {
  assert.strictEqual(VC.normalize('H₂SO₄'), 'h2so4'); assert.strictEqual(VC.normalize('Cu²⁺ (কপার)'), 'cu2 কপার');
  assert.strictEqual(VC.normalize('৪০×'), '40x'); assert.strictEqual(VC.normalize('১.৫ ফোঁটা!'), '1.5 ফোঁটা');
  assert.strictEqual(VC.normalize('ক্\u200cষ'), 'ক্ষ'); assert.strictEqual(VC.normalize('  🔬  Hello,   World. '), 'hello world');
});
t('tokens: একক অক্ষর জোড়া ("N A O H"), সংখ্যা-শব্দ ("forty", "one hundred and five", "twelve point five")', () => {
  assert.deepStrictEqual(VC.tokens('N A O H'), ['naoh']); assert.deepStrictEqual(VC.tokens('forty x'), ['40', 'x']);
  assert.deepStrictEqual(VC.tokens('one hundred and five'), ['105']); assert.deepStrictEqual(VC.tokens('twelve point five'), ['12.5']);
  assert.deepStrictEqual(VC.tokens('a plate'), ['a', 'plate']);
});
t('split: "A and B", "A আর B", সংখ্যার ভেতরের and ভাঙে না', () => {
  assert.deepStrictEqual(VC.split('Mix acid and base'), ['mix acid', 'base']); assert.deepStrictEqual(VC.split('NaOH দাও আর HCl দাও'), ['naoh দাও', 'hcl দাও']);
  assert.deepStrictEqual(VC.split('add water and then heat'), ['add water', 'heat']); assert.strictEqual(VC.split('enter one hundred and fifty').length, 1);
  assert.strictEqual(VC.split('zoom in').length, 1); assert.strictEqual(VC.split('one two three four five six seven eight nine ten and also eleven then zoom and a b c d e f g').length <= 4, true);
});

/* ================= জুম, ম্যাগনিফিকেশন, ক্যামেরা ================= */
t('জুম ইন/আউট: English, বাংলা, উচ্চারণের হেরফের', () => {
  const c = { has3D: true };
  is('zoom in', c, 'zoom', { dir: 'in' }); is('Zoom in please', c, 'zoom', { dir: 'in' }); is('zooming in', c, 'zoom', { dir: 'in' }); is('জুম ইন', c, 'zoom', { dir: 'in' }); is('জুম ইন করো', c, 'zoom', { dir: 'in' });
  is('zoom out', c, 'zoom', { dir: 'out' }); is('জুম আউট করো', c, 'zoom', { dir: 'out' }); is('আরো কাছে আনো', c, 'zoom', { dir: 'in' }); is('দূরে সরাও', c, 'zoom', { dir: 'out' }); is('zoom', c, 'zoom', { dir: 'in' });
});
t('মাগ্নিফিকেশন: 40x, forty times, ৪০ গুণ, low/high power', () => {
  const c = onion();
  is('zoom 40x', c, 'zoom', { mag: 40 }); is('40x', c, 'zoom', { mag: 40 }); is('forty x', c, 'zoom', { mag: 40 }); is('set magnification to ten', c, 'zoom', { mag: 10 }); is('৪০ গুণ করো', c, 'zoom', { mag: 40 });
  is('ম্যাগনিফিকেশন ৪', c, 'zoom', { mag: 4 }); is('low power', c, 'zoom', { mag: 'min' }); is('high power please', c, 'zoom', { mag: 'max' }); is('সর্বোচ্চ জুম', c, 'zoom', { mag: 'max' });
});
t('অংশে জুম: "Zoom in to the Cell Nucleus" ও বাংলা রূপ', () => {
  const c = onion();
  is('Zoom in to the Cell Nucleus', c, 'zoomPart', { part: c.parts[1] }); is('zoom into nucleus at 40x', c, 'zoomPart', { mag: 40 }); is('নিউক্লিয়াসে জুম করো', c, 'zoomPart');
  assert.strictEqual(P('নিউক্লিয়াস দেখাও', c).part.id, 'nucleus'); assert.strictEqual(P('show me the cell wall', c).part.id, 'wall'); assert.strictEqual(P('কোষপ্রাচীর খুঁজো', c).part.id, 'wall');
  assert.strictEqual(P('focus on the cytoplasm', c).part.id, 'cytoplasm'); assert.strictEqual(P('nucleus', c).part.id, 'nucleus');
  assert.strictEqual(P('zoom in on the guard cell', stomata()).part.id, 'guard'); assert.strictEqual(P('zoom to stoma', stomata()).part.id, 'stoma');
  is('zoom in', c, 'zoom', { dir: 'in' });
});
t('ঘোরানো/সরানো: rotate left, বামে ঘোরাও, move slide right, একা "left"', () => {
  is('rotate left', {}, 'move', { dir: 'left', kind: 'rotate' }); is('বামে ঘোরাও', {}, 'move', { dir: 'left', kind: 'rotate' }); is('turn right a little', {}, 'move', { dir: 'right', kind: 'rotate', amt: .5 });
  is('look up', {}, 'move', { dir: 'up', kind: 'rotate' }); is('ডানে সরাও', {}, 'move', { dir: 'right', kind: 'pan' }); is('move the slide down', onion(), 'move', { dir: 'down', kind: 'pan' });
  is('left', {}, 'move', { dir: 'left', kind: 'auto' }); is('rotate far left', {}, 'move', { dir: 'left', amt: 2 });
});
t('ফোকাস: ঘরে স্কোপ থাকলে বাড়ানো/কমানো', () => {
  const c = { scope: { mags: [100] } };
  is('focus more', c, 'focus', { dir: 1 }); is('ফোকাস কমাও', c, 'focus', { dir: -1 }); is('focus', c, 'focus', { dir: 0 });
});

/* ================= রিএজেন্ট ও যন্ত্র ================= */
t('কেমিস্ট্রি রিএজেন্ট: সূত্র, পুরো নাম, বাংলা, ফাঁক করে বলা অক্ষর', () => {
  const c = chemCat();
  pressId('add sodium hydroxide', c, 'naoh'); pressId('NaOH দাও', c, 'naoh'); pressId('N A O H', c, 'naoh'); pressId('সোডিয়াম হাইড্রক্সাইড দাও', c, 'naoh');
  pressId('add ammonia solution', c, 'nh4oh'); pressId('potassium iodide', c, 'ki'); pressId('K I', c, 'ki'); pressId('potassium thiocyanate', c, 'kscn'); pressId("Nessler's reagent", c, 'nessler');
  pressId('hydrogen sulfide', c, 'h2s'); pressId('শিখা পরীক্ষা', c, 'flame'); pressId('flame test', c, 'flame'); pressId('new tube', Object.assign({}, c, { targets: c.targets.concat([press('fresh', 'নতুন টিউব', { aliases: ['new tube'] })]) }), 'fresh');
});
t('অ্যানায়ন রিএজেন্ট', () => {
  const c = chemAn();
  pressId('silver nitrate', c, 'agno3'); pressId('barium chloride দাও', c, 'bacl2'); pressId('dilute sulphuric acid', c, 'dilh2so4'); pressId('concentrated sulfuric acid', c, 'conch2so4'); pressId('অম্লীয় পারম্যাঙ্গানেট', c, 'kmno4'); pressId('brown ring test', c, 'feso4');
});
t('"Mix Acid and Base": প্রতি অংশ আলাদা রিএজেন্টে যায় (acid → HCl, base → NaOH)', () => {
  const c = chemCat(), segs = VC.split('Mix Acid and Base'); assert.strictEqual(segs.length, 2);
  pressId(segs[0], c, 'hcl'); pressId(segs[1], c, 'naoh');
  pressId('add acid', c, 'hcl'); pressId('অ্যাসিড দাও', c, 'hcl'); pressId('ক্ষার দাও', c, 'naoh');
  pressId('add acid', chemAn(), 'dilh2so4');
});
t('ক্যাটায়ন/অ্যানায়ন ড্রপডাউন: নাম বললেই অপশন বাছা, গ্রুপের শব্দে নির্দিষ্ট', () => {
  const c = chemCat(), o = (text, id, group) => { const r = P(text, c); assert.strictEqual(r.type, 'press', text + ' → ' + r.type); assert.strictEqual(r.target.kind, 'option'); assert.strictEqual(r.target.id, id, text); if (group) assert.strictEqual(r.target.group, group); };
  o('copper', 'Cu', 'ক্যাটায়ন'); o('cation copper', 'Cu'); o('ক্যাটায়ন কপার', 'Cu'); o('select zinc', 'Zn'); o('iron three', 'Fe3'); o('ferrous', 'Fe2'); o('ammonium', 'NH4', 'ক্যাটায়ন'); o('chloride', 'Cl', 'অ্যানায়ন'); o('anion sulfate', 'SO4'); o('কার্বনেট', 'CO3');
});
t('মাইক্রোবায়োলজি যন্ত্র: গ্রাম স্টেইনের ধাপ', () => {
  const c = gram();
  pressId('smear', c, 'smear'); pressId('crystal violet', c, 'cv'); pressId('ক্রিস্টাল ভায়োলেট দাও', c, 'cv'); pressId('add iodine', c, 'iodine'); pressId('safranin', c, 'safranin'); pressId('সেফ্রানিন', c, 'safranin'); pressId('blot it', c, 'blot'); pressId('dry', c, 'dry'); pressId('flame the loop', c, 'flame'); pressId('বুনসেন', c, 'flame');
});
t('ডিসেকশনের অংশ: ইংরেজি/বাংলা নাম', () => {
  const c = dissect();
  pressId('corolla', c, 'corolla'); pressId('দলমণ্ডল', c, 'corolla'); pressId('remove the calyx', c, 'calyx'); pressId('androecium', c, 'androecium'); pressId('স্ত্রীস্তবক', c, 'gynoecium'); pressId('epicalyx', c, 'epicalyx');
});
t('পরীক্ষণ খোলা: তালিকায় বা চলতে চলতে', () => {
  const c = home();
  pressId('open gram staining', c, 'mb-gram'); pressId('streak plate', c, 'mb-streak'); pressId('জবা ফুল', c, 'pl-hib'); pressId('colony count', c, 'mb-count'); pressId('serial dilution', c, 'mb-serial');
  pressId('unknown salt', c, 'chem-salt'); pressId('dichotomous key', c, 'an-key'); pressId('animal gallery', c, 'an-gal'); pressId('incubator', c, 'mb-incub'); pressId('bacteria library', c, 'mb-lib');
  /* তালিকার বাইরে থাকলে ক্রিয়া (open/start) ছাড়া খোলে না */
  const away = { targets: [{ kind: 'exp', id: 'mb-gram', label: 'গ্রাম স্টেইনিং', key: 'e', needVerb: true }] };
  assert.notStrictEqual(P('gram', away).type, 'press'); is('open gram stain', away, 'press');
});
t('ল্যাব বদল', () => {
  is('chemistry lab', {}, 'tab', { lab: 'chem' }); is('open botany lab', {}, 'tab', { lab: 'plant' }); is('উদ্ভিদবিজ্ঞান ল্যাব খোলো', {}, 'tab', { lab: 'plant' }); is('মাইক্রোবায়োলজি ল্যাব', {}, 'tab', { lab: 'micro' }); is('zoology lab', {}, 'tab', { lab: 'animal' });
  is('chemistry', {}, 'tab', { lab: 'chem' }); const h = home(); is('animal gallery', h, 'press'); is('microscope slide', { targets: h.targets }, 'press');
});

/* ================= সাধারণ নিয়ন্ত্রণ ================= */
t('hint, restart, back, camReset, primary, labels, stop, help', () => {
  is('hint', {}, 'hint'); is('ইঙ্গিত দাও', {}, 'hint'); is('give me a hint', {}, 'hint'); is('restart', {}, 'restart'); is('আবার শুরু করো', {}, 'restart'); is('start over', {}, 'restart');
  is('go back', {}, 'back'); is('পিছনে যাও', {}, 'back'); is('reset camera', {}, 'camReset'); is('ক্যামেরা রিসেট', {}, 'camReset');
  is('next step', {}, 'primary'); is('পরের ধাপ', {}, 'primary'); is('check', {}, 'primary'); is('submit', {}, 'primary'); is('যাচাই করো', {}, 'primary');
  is('show labels', onion(), 'labels'); is('লেবেল লুকাও', onion(), 'labels'); is('stop listening', {}, 'stop'); is('মাইক বন্ধ', {}, 'stop'); is('stop', {}, 'stop'); is('help', {}, 'help'); is('কী বলব', {}, 'help');
});
t('সুনির্দিষ্ট বাটন "primary"-কে ঠেকায়: "দেখা শেষ" বাটন চাপে, সাধারণ next নয়', () => { pressId('দেখা শেষ', onion(), 'go'); });
t('"label" — স্লাইডের টগল নেই এমন ল্যাবে এটা যন্ত্র; আছে এমন ল্যাবে টগল', () => {
  pressId('label the plate', { targets: [press('label', '🏷 লেবেল')] }, 'label'); is('labels', onion(), 'labels');
});
t('হ্যাঁ/না: প্রশ্ন বাকি থাকলে নিশ্চিতকরণ; নইলে ডাইকোটোমাস কি-র বাটন', () => {
  is('yes', { pending: { kind: 'confirm' } }, 'yes'); is('হ্যাঁ', { pending: { kind: 'confirm' } }, 'yes'); is('না', { pending: { kind: 'confirm' } }, 'no'); is('no thanks', { pending: { kind: 'confirm' } }, 'no');
  is('two', { pending: { kind: 'choose' } }, 'choose', { index: 1 }); is('দ্বিতীয়', { pending: { kind: 'choose' } }, 'choose', { index: 1 }); is('first', { pending: { kind: 'choose' } }, 'choose', { index: 0 });
  const key = { targets: [press('y', 'হ্যাঁ'), press('n', 'না')] }; pressId('yes', key, 'y'); pressId('হ্যাঁ', key, 'y'); pressId('no', key, 'n'); pressId('না', key, 'n');
});

/* ================= মান লেখা ================= */
t('fill: সংখ্যা, শব্দে সংখ্যা, বৈজ্ঞানিক রূপ (CFU)', () => {
  is('enter 12.5', {}, 'fill', { value: '12.5' }); is('১২৫ লেখো', {}, 'fill', { value: '125' }); is('type one hundred twenty five', {}, 'fill', { value: '125' }); is('write twelve point five', {}, 'fill', { value: '12.5' });
  is('enter 1.5 times 10 to the 7', {}, 'fill', { value: '1.5 × 10^7' }); is('২.৫ x ১০ ৮ লেখো', {}, 'fill', { value: '2.5 × 10^8' }); is('answer two point five times ten to the power eight', {}, 'fill', { value: '2.5 × 10^8' });
  is('input 3.2e7', {}, 'fill', { value: '3.2 × 10^7' });
});

/* ================= নিরাপত্তা: আড্ডা, অস্পষ্ট, দ্ব্যর্থক ================= */
t('আড্ডা ও অপ্রাসঙ্গিক বাক্যে কিছু চালু হয় না', () => {
  [chemCat(), gram(), onion(), home()].forEach(c => ['what is the capital of france', 'hello everyone please sit down', 'স্যার আজকে ক্লাস কয়টায়', 'I will have lunch after the lab', 'ok so my name is Rahim', 'tomorrow we have a quiz'].forEach(x => {
    const r = P(x, c); assert(['none', 'suggest'].indexOf(r.type) >= 0 || (r.type === 'tab'), `"${x}" → ${r.type}`); assert.notStrictEqual(r.type, "press", x + " " + JSON.stringify(r.target));
  }));
  is('', {}, 'none'); is('   ', {}, 'none'); is('...', {}, 'none');
});
t('ফাজি: বানান বা উচ্চারণের ছোট ভুল সামলায়, কম মিলে শুধু নিশ্চিত করতে বলে', () => {
  pressId('sodium hydroxide', chemCat(), 'naoh'); pressId('sodium hydroxyde', chemCat(), 'naoh'); pressId('safranine', gram(), 'safranin'); pressId('iodin', gram(), 'iodine');
  const r = P('crystal', gram()); assert(r.type === 'suggest' || r.type === 'press', 'crystal → ' + r.type); if (r.target) assert.strictEqual(r.target.id, 'cv');
});
t('দ্ব্যর্থক: একই নামের দুটি বাটন হলে প্রশ্ন', () => {
  const c = { targets: [press('a', 'Bacillus subtilis', { key: 'a' }), press('b', 'Bacillus cereus', { key: 'b' })] };
  const r = P('bacillus', c); assert.strictEqual(r.type, 'ambiguous'); assert.deepStrictEqual(r.options.map(o => o.id).sort(), ['a', 'b']);
  pressId('bacillus subtilis', c, 'a'); pressId('bacillus cereus', c, 'b');
});
t('সংখ্যার অপশন: একই সংখ্যা দুই ড্রপডাউনে থাকলে গ্রুপের শব্দ বেছে নেয়', () => {
  const c = { targets: [{ kind: 'option', id: '15', label: '১৫ psi', group: 'চাপ psi', key: 'p15' }, { kind: 'option', id: '15', label: '১৫ মিনিট', group: 'সময় মিনিট', key: 'm15' }, { kind: 'option', id: '121', label: '১২১ °C', group: 'তাপমাত্রা', key: 't121' }] };
  const r = P('15', c); assert.strictEqual(r.type, 'ambiguous'); assert.strictEqual(P('15 psi', c).target.key, 'p15'); assert.strictEqual(P('১৫ মিনিট', c).target.key, 'm15'); assert.strictEqual(P('121 degrees', c).target.key, 't121');
});
t('এক বাক্যে আলাদা কমান্ড: ভাগ করে প্রতিটি আলাদা পার্স হয়', () => {
  const c = Object.assign(chemCat(), { scope: { mags: [4, 10, 40] } });
  assert.deepStrictEqual(VC.split('add NaOH and then check').map(s => P(s, c).type), ['press', 'primary']);
  assert.deepStrictEqual(VC.split('zoom in আর বামে ঘোরাও').map(s => P(s, {}).type), ['zoom', 'move']);
});

(async () => {
  for (const [name, fn] of pending) { try { await fn(); pass++; console.log('  ✓ ' + name); } catch (e) { fail++; console.log('  ✗ ' + name + '\n      ' + (e && e.message ? e.message.split('\n')[0] : e)); } }
  console.log(`\n${pass} পাস, ${fail} ফেল`); process.exit(fail ? 1 : 0);
})();
