/* GEB Hub: ভার্চুয়াল হাসপাতালের ডেটা-টেস্ট: node hospital-test.js */
const H = require('./public/hospital-data.js');
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('✘', m); } };
// রুম ও রুট
H.FLOORS.forEach(f => { f.rooms.forEach(r => { ok(r.x1 > r.x0, r.id + ' প্রস্থ'); ok(r.floor === f.n, r.id + ' তলা'); }); const rs = f.rooms.filter(r => r.side === 't').sort((a, b) => a.x0 - b.x0); for (let i = 1; i < rs.length; i++) ok(rs[i].x0 >= rs[i - 1].x1, f.n + ' তলায় ওভারল্যাপ ' + rs[i].id); ok(!!H.ROOM['lift' + f.n], 'লিফট নেই ' + f.n); });
Object.keys(H.ROOM).forEach(id => { const segs = H.route({ floor: 0, x: -22, z: 0 }, id); ok(segs.length && segs[segs.length - 1].floor === H.ROOM[id].floor, 'রুট ' + id); });
// ধাপের রুম, কুইজ
[['BLOOD', H.BLOOD], ['CSEC', H.CSEC], ['OT', H.OT]].forEach(([n, a]) => a.forEach((s, i) => { if (s.go) ok(!!H.ROOM[s.go], n + i + ' রুম ' + s.go); ok(s.t && s.do && s.why, n + i + ' টেক্সট'); if (s.q) { ok(s.q.o.length >= 2 && s.q.a < s.q.o.length && s.q.e, n + i + ' কুইজ'); } }));
// রক্ত সামঞ্জস্য
ok(H.canGive('O-', 'AB+') && !H.canGive('A+', 'O+') && H.canGive('A-', 'A+') && !H.canGive('A+', 'A-') && H.canGive('B+', 'AB+') && !H.canGive('AB+', 'B+'), 'canGive');
H.GROUPS.forEach(g => ok(H.DONOR_POOL.some(d => H.canGive(d.g, g) && !H.eligibility(d).length), 'যোগ্য দাতা নেই ' + g + ' এর জন্য (ফলব্যাক চলবে)') );
// ICU সমাধানযোগ্যতা
function sim(c, ids) { const v = Object.assign({}, c.v), st = { has: {} }; let fin = false; for (const id of ids) { const a = c.actions.find(x => x.id === id); ok(!!a, c.id + ' ' + id); if (a.prereq) ok(a.prereq.every(p => st.has[p]), c.id + ' prereq ' + id); st.has[id] = 1; Object.keys(a.eff || {}).forEach(k => v[k] = (v[k] || 0) + a.eff[k]); if (c.id === 'sepsis') { if (!st.has.fluid) { v.sys -= 3; v.hr += 2; } if (!st.has.o2) v.spo2 -= 1; } if (c.done(v, st)) fin = true; } return fin; }
const I = Object.fromEntries(H.ICU.map(c => [c.id, c]));
ok(sim(I.sepsis, ['o2', 'iv', 'cult', 'lact', 'abx', 'fluid', 'press']), 'sepsis সমাধান');
ok(!sim(I.sepsis, ['o2', 'iv', 'fluid', 'press']), 'sepsis: অ্যান্টিবায়োটিক ছাড়া জেতা যাবে না');
ok(sim(I.stemi, ['ecg', 'mon', 'asp', 'p2y12', 'hep', 'pci']), 'stemi সমাধান');
ok(sim(I.arrest, ['call', 'cpr', 'pads', 'shock1', 'adr', 'shock2', 'amio', 'shock3']), 'arrest সমাধান');

// ---- রোগীর যাত্রা (hospital-flow-data.js) ----
const FD = require('./public/hospital-flow-data.js');
Object.keys(FD.JOURNEYS).forEach(k => FD.JOURNEYS[k].steps.forEach((s, i) => {
  const tag = k + '#' + (i + 1);
  ok(s.t && s.do && s.why, tag + ': শিরোনাম/ধাপ/কারণ');
  if (s.go && s.go[0] !== '$') ok(!!H.ROOM[s.go], tag + ': রুম নেই ' + s.go);
  if (s.q) ok(s.q.a >= 0 && s.q.a < s.q.o.length && s.q.e, tag + ': কুইজের সঠিক উত্তর/ব্যাখ্যা');
}));
Object.values(FD.DOCTORS).forEach(d => ok(!!H.ROOM[Object.keys(FD.DOCTORS).find(k => FD.DOCTORS[k] === d)], 'ডাক্তারের রুম'));
Object.values(FD.BEDS).forEach(b => ok(!!H.ROOM[b.room], 'বেডের রুম ' + b.room));
FD.DISPO_OPTS.forEach(o => ok(!o.room || !!H.ROOM[o.room], 'ডিসপোজিশন রুম ' + o.id));
// ট্রায়াজ: প্রতিটি কেসের ক্যাটাগরি বৈধ, বাছাইয়ে ২+২+২
FD.TRIAGE_POOL.forEach(p => ok(['R', 'Y', 'G'].includes(p.cat) && p.why && p.v.hr, 'ট্রায়াজ কেস ' + p.id));
for (let t = 0; t < 40; t++) { const l = FD.pickTriage(); ok(l.length === 6 && ['R', 'Y', 'G'].every(c => l.filter(p => p.cat === c).length === 2), 'pickTriage ২+২+২'); }
// লাল কেসে অন্তত একটি ভাইটাল বিপদসীমায় (ধারণাগত যাচাই)
FD.TRIAGE_POOL.filter(p => p.cat === 'R').forEach(p => ok(p.v.sys < 110 || p.v.spo2 < 95 || p.v.gcs < 15 || p.v.sys >= 160 || p.v.rr >= 24 || p.v.hr < 60, 'লাল কেসে বিপদ-লক্ষণ ' + p.id));
FD.TRIAGE_POOL.filter(p => p.cat === 'G').forEach(p => ok(p.v.spo2 >= 97 && p.v.gcs === 15 && p.v.sys >= 100 && p.v.hr < 100, 'সবুজ কেসের ভাইটাল স্বাভাবিক ' + p.id));
// বিল: হিসাব ও ভুল-লাইন
['ward', 'cabin'].forEach(b => { const clean = FD.billTotal(FD.billLines(b)); ok(clean === (b === 'ward' ? 40550 : 45150), 'বিলের মোট ' + b + ' ' + clean);
  ['dup', 'days'].forEach(e => { const L = FD.billLines(b, e); ok(L.filter(l => l.bad).length === 1, 'একটিই ভুল লাইন ' + b + e); ok(FD.billTotal(L) > clean, 'ভুলে মোট বেশি'); ok(FD.billTotal(FD.fixBill(L)) === clean, 'সংশোধনে আগের মোট ফেরে ' + b + e); });
  ok(clean - FD.BEDS[b].dep > 0, 'বকেয়া ধনাত্মক ' + b); });
ok(FD.fmt(2050000) === '২০,৫০,০০০' && FD.tk(20550) === '৳২০,৫৫০' && FD.tk(500) === '৳৫০০', 'টাকার ফরম্যাট');
// OPD কেস: ইতিহাসের তিনটি বিকল্প আলাদা, প্রেসক্রিপশন ওষুধ ডেটাবেসে আছে, অ্যালার্জির বিরোধ নেই
FD.OPD_CASES.forEach(c => { ok(c.hist.length === 5 && c.tell.length === 5, c.id + ' ইতিহাস ৫টি'); c.hist.forEach(h => ok(h.g && h.v && h.w && h.r && h.g !== h.v && h.g !== h.w, c.id + ' ইতিহাসের বিকল্প'));
  c.rx.lines.forEach(l => ok(!!FD.PRODUCTS[l.p], c.id + ' ওষুধ ' + l.p)); ok(c.q.a < c.q.o.length, c.id + ' কুইজ'); ok(!!FD.DOCTORS[c.dept], c.id + ' ডাক্তার');
  if (/অ্যামোক্সিসিলিন/.test(c.allergy)) ok(!c.rx.lines.some(l => l.p === 'amox500'), c.id + ': অ্যালার্জির ওষুধ প্রেসক্রিপশনে নেই'); });
// ফার্মেসি: পরিমাণ, প্রেসক্রিপশন-ত্রুটি ও শেলফ
ok(FD.qtyOf({ pat: [1, 0, 1], days: 7 }) === 14 && FD.qtyOf({ pat: [1, 1, 1], days: 3 }) === 9 && FD.qtyOf({ pat: null, fixedQty: 1 }) === 1 && FD.qtyOf({ pat: [1, 0, 1], days: null }) === null, 'qtyOf');
FD.PH_CASES.forEach(pc => { const rx = FD.rxOf(pc.id); ok(rx && rx.lines.length && rx.dr, pc.id + ' rxOf'); rx.lines.forEach(l => ok(!!FD.PRODUCTS[l.p], pc.id + ' ওষুধ'));
  if (pc.defect) { ok(!!FD.PH_DEFECT[pc.defect] && rx.fixLines && rx.fixNote, pc.id + ' সংশোধন'); rx.fixLines.forEach(l => ok(FD.qtyOf(l) != null, pc.id + ' সংশোধিত লাইনের পরিমাণ'));
    if (pc.defect === 'allergy') { ok(/পেনিসিলিন/.test(rx.allergy) && rx.lines.some(l => l.p === 'amox500') && !rx.fixLines.some(l => l.p === 'amox500'), 'allergy ত্রুটি'); }
    if (pc.defect === 'nodur') ok(rx.lines.some(l => l.days == null) && rx.fixLines.every(l => l.days != null), 'nodur ত্রুটি');
    if (pc.defect === 'dup') ok(rx.lines.filter(l => /Paracetamol/.test(FD.PRODUCTS[l.p].g)).length === 2 && rx.fixLines.filter(l => /Paracetamol/.test(FD.PRODUCTS[l.p].g)).length === 1, 'dup ত্রুটি'); }
  else rx.lines.forEach(l => ok(FD.qtyOf(l) != null, pc.id + ' পরিমাণ')); });
for (let t = 0; t < 30; t++) { const lines = FD.rxOf('a').lines, sh = FD.shelfFor(lines, Date.now()); ok(sh.length === 10, 'শেলফে ১০ বাক্স');
  lines.forEach(l => { ok(sh.filter(b => b.p === l.p && b.need && !b.expired && b.exp > Date.now()).length === 1, 'প্রতিটি দরকারি ওষুধের ঠিক একটি মেয়াদি বাক্স'); ok(sh.filter(b => b.p === l.p && b.expired && b.exp < Date.now()).length === 1, 'একটি মেয়াদ-উত্তীর্ণ বাক্স'); }); }

// ---- v3.18: ডিউটি মোড, ECG, X-ray, ল্যাব, ক্যারিয়ার ----
const DD = require('./public/hospital-duty-data.js'), EC = require('./public/hospital-ecg-data.js'), IM = require('./public/hospital-img-data.js'), LB = require('./public/hospital-lab-data.js');
const chkQ = (q, tag) => { ok(q && q.q && q.e && Array.isArray(q.o) && q.o.length >= 3 && q.a >= 0 && q.a < q.o.length, tag + ' প্রশ্ন'); ok(new Set(q.o).size === q.o.length, tag + ' বিকল্প অনন্য'); };
// NEWS2 হাতে-হিসাবের সাথে মিল
const NEWS_EXP = { asthma: 8, hypo: 4, stemi: 1, pneu: 5, sprain: 0, sepsis: 17, dka: 6, gib: 2, htn: 0, postop: 0, anaph: 12, stroke: 0, hip: 1, migraine: 0 };
ok(DD.news2({ rr: 16, spo2: 98, o2: false, sys: 120, hr: 70, avpu: 'A', t: 98.6 }).total === 0, 'NEWS2 স্বাভাবিক = ০');
ok(DD.news2({ rr: 16, spo2: 98, o2: false, sys: 120, hr: 70, avpu: 'V', t: 98.6 }).band === 'medlow', 'একটিতে ৩ = medlow');
DD.SHIFTS.forEach(s => {
  const ranks = s.pts.map(p => p.rank); ok(new Set(ranks).size === ranks.length, s.id + ' rank অনন্য');
  ok(DD.idealOrder(s).length === s.pts.length, s.id + ' সব রোগী দেখা হয়');
  ok(s.pts.some(p => !p.after), s.id + ' শুরুতে রোগী আছে');
  s.pts.forEach(p => { const t = s.id + '/' + p.id; ok(p.n && p.cc && p.why && p.wait && p.det && p.v, t + ' তথ্য'); chkQ(p.q.d, t + ' d'); chkQ(p.q.n, t + ' n'); chkQ(p.q.t, t + ' t');
    if (p.adult !== false) { ok(DD.news2(p.v).total === NEWS_EXP[p.id], t + ' NEWS2 ' + DD.news2(p.v).total); } });
  ok(s.lesson.length === 3, s.id + ' শিক্ষা');
});
ok(DD.idealOrder(DD.shiftById('er')).join() === 'asthma,hypo,stemi,pneu,sprain', 'er আদর্শ ক্রম');
ok(DD.idealOrder(DD.shiftById('ward')).indexOf('arrest') === 2, 'অ্যারেস্ট আসামাত্র সবার আগে');
// ক্যারিয়ার
ok(Object.keys(DD.ROLES).length === 3 && Object.values(DD.ROLES).every(r => r.ranks.length === DD.RANK_CP.length), 'চরিত্র ও পদবি');
ok(DD.rankIndex(0) === 0 && DD.rankIndex(40) === 1 && DD.rankIndex(259) === 2 && DD.rankIndex(999) === 3, 'rankIndex');
ok(new Set(DD.BADGES.map(b => b.id)).size === DD.BADGES.length && DD.BADGES.every(b => b.n && b.d && b.ic), 'ব্যাজ অনন্য');
let S0 = DD.freshState(); ok(DD.BADGES.every(b => !b.f(S0)), 'নতুন অবস্থায় কোনো ব্যাজ নেই'); ok(DD.CERTS.every(c => !DD.certProgress(c, S0).ok), 'নতুন অবস্থায় সার্টিফিকেট নেই');
// সবকিছু সম্পন্ন অবস্থায় সব ব্যাজ-সার্টিফিকেট খোলে
let S1 = DD.freshState(); S1.cp = 300; S1.streakBest = 12; S1.roles = { doctor: 1, nurse: 1, tech: 1 };
S1.duty = { runs: 5, clean: 2, noaid: 1, best: { er: 3, ward: 2, busy: 3 } };
EC.RHY.forEach(r => S1.ecg.seen[r.id] = 1); S1.ecg.ok = 40; S1.ecg.n = 50; S1.ecg.rate = 1; S1.ecg.art = 1; S1.ecg.axis = 1; S1.ecg.terr = 1; S1.img.mod = 1; S1.lab.cross = 1;
IM.CASES.forEach(c => S1.img.solved[c.id] = 1); S1.img.ok = 20; S1.img.n = 24;
LB.CASES.forEach(c => S1.lab.solved[c.id] = 1); S1.lab.ok = 36; S1.lab.n = 40; S1.lab.skill = 9;
ok(DD.BADGES.every(b => b.f(S1)), 'সম্পূর্ণ অবস্থায় সব ব্যাজ: ' + DD.BADGES.filter(b => !b.f(S1)).map(b => b.id));
['duty', 'ecg', 'img', 'lab'].forEach(k => { ok(DD.certProgress(DD.CERTS.find(c => c.id === k), S1).ok, 'সার্টিফিকেট ' + k); S1.certs[k] = { ts: 1 }; });
ok(DD.certProgress(DD.CERTS.find(c => c.id === 'grand'), S1).ok, 'গ্র্যান্ড সার্টিফিকেট');
// ধ্রুবকের সাথে আসল তালিকার মিল
ok(DD.N.ecg === EC.RHY.length && DD.N.img === IM.CASES.length && DD.N.lab === LB.CASES.length && DD.N.skill === LB.SKILLS.length, 'N ধ্রুবক');
ok(DD.N.cbc === LB.CASES.filter(c => c.id.startsWith('cbc_')).length && DD.N.lft === LB.CASES.filter(c => c.id.startsWith('lft_')).length && DD.N.shifts === DD.SHIFTS.length, 'CBC/LFT/শিফট সংখ্যা');
const cntP = (...p) => LB.CASES.filter(c => p.some(x => c.id.startsWith(x + '_'))).length;
ok(DD.N.abgele === cntP('abg', 'ele') && DD.N.rftft === cntP('kft', 'tft') && DD.N.urist === cntP('uri', 'sto'), 'ল্যাব উপ-গ্রুপ সংখ্যা');
ok(DD.N.modern === IM.CASES.filter(c => ['ctbl', 'ctin', 'usgall'].includes(c.id)).length, 'আধুনিক ইমেজিং সংখ্যা');
// ECG
const rated = { nsr: 75, stach: 130, sbrady: 45, svt: 176, avb1: 70, vt: 180 };
EC.RHY.forEach(r => { ok(r.n && r.doc && r.nur && r.vig && r.feats.length === 3 && r.like.every(l => EC.rhyById(l)), r.id + ' ডেটা'); });
EC.RHY.forEach(a => EC.RHY.forEach(b => { if (a.id !== b.id && a.grp === b.grp) ok(['af', 'sh', 'bb'].includes(a.grp), a.id + '/' + b.id + ' একই গ্রুপ শুধু অনুমোদিত জোড়ায়'); }));
for (const id of Object.keys(rated)) for (const seed of [1, 2, 3, 4, 5]) { const s = EC.ecgSignal(id, { seed }), pk = EC.rPeaks(s).length * 10, want = rated[id];
  ok(Math.abs(pk - want) <= Math.max(15, want * 0.2), id + ' রেট ' + pk + ' বনাম ' + want + ' (সিড ' + seed + ')'); ok(s.y.length === 1500 && s.y.every(Number.isFinite), id + ' নমুনা'); }
const sA = EC.ecgSignal('af', { seed: 2 }), rrA = sA.beats.slice(1).map((b, i) => b - sA.beats[i]), mA = rrA.reduce((a, b) => a + b) / rrA.length, sdA = Math.sqrt(rrA.reduce((a, b) => a + (b - mA) ** 2, 0) / rrA.length);
ok(sdA / mA > 0.2, 'AF অনিয়মিত');
const sN = EC.ecgSignal('nsr', { seed: 2 }), rrN = sN.beats.slice(1).map((b, i) => b - sN.beats[i]); ok(Math.max(...rrN) - Math.min(...rrN) < 0.1, 'NSR নিয়মিত');
ok(Math.max(...EC.ecgSignal('asystole', { seed: 1 }).y.map(Math.abs)) < 0.12, 'অ্যাসিস্টোল সমতল');
{ const s = EC.ecgSignal('stemi', { seed: 1 }), n0 = EC.ecgSignal('nsr', { seed: 1 }); const at = (sig, t0) => { const i = Math.round(t0 * sig.fs); return sig.y[i]; };
  const b = s.beats.find(x => x > 1 && x < 4); ok(at(s, b + 0.1) > 0.3, 'STEMI-তে ST উঁচু'); const b2 = n0.beats.find(x => x > 1 && x < 4); ok(Math.abs(at(n0, b2 + 0.1)) < 0.2, 'নরমালে ST বেসলাইনে'); }
{ const s = EC.ecgSignal('vt', { seed: 1 }); ok(Math.min(...s.y) < -0.9 && Math.max(...s.y) > 0.9, 'VT বড় ওঠানামা'); }
EC.ART_IDS.forEach(a => { const s = EC.ecgSignal('nsr', { seed: 3, art: a }); ok(s.art === a && s.y.every(Number.isFinite), 'আর্টিফ্যাক্ট ' + a); ok(EC.ARTS[a].n && EC.ARTS[a].fix, a + ' বিবরণ'); });
ok(EC.ecgSignal('nsr', { seed: 9 }).y.join() === EC.ecgSignal('nsr', { seed: 9 }).y.join(), 'সিড নির্ধারিত');
for (let sd = 1; sd <= 25; sd++) { EC.rateSet(sd).forEach(q => { ok(new Set(q.opts).size === q.opts.length && q.opts[q.a] === q.rate && q.opts.length >= 3, 'রেট প্রশ্ন সিড ' + sd);
  if (q.kind === 'reg') ok(EC.rateOf(q.boxes) === q.rate && Math.abs(300 / q.boxes - q.rate) < 1, 'রেট = ৩০০/ঘর'); }); }
ok(EC.rateOf(4) === 75 && EC.rateOf(2) === 150 && EC.rateOf(1.5) === 200, 'rateOf');
{ const q = EC.rateSet(3).find(x => x.kind === 'reg'); const sig = EC.ecgSignal('nsr', { seed: q.seed, rr: q.boxes * 0.2 }); ok(Math.abs(EC.rPeaks(sig).length * 10 - q.rate) <= Math.max(20, q.rate * 0.25), 'রেট-স্ট্রিপের R-R ঘরের সাথে মেলে'); }
EC.REC_Q.forEach((q, i) => chkQ(q, 'REC' + i));
// X-ray
IM.CASES.forEach(c => { const t = 'img/' + c.id; ok(c.n && c.hx && c.kind && c.find.length >= 4, t + ' তথ্য'); ok(c.dx.o.length === 4 && c.dx.a < 4 && c.dx.e, t + ' dx'); ok(new Set(c.dx.o).size === 4, t + ' dx অনন্য');
  chkQ(c.plan, t + ' plan'); chkQ(c.nur, t + ' nur'); chkQ(c.tec, t + ' tec'); if (c.hot) ok(c.hot.x > 0 && c.hot.x < 1 && c.hot.y > 0 && c.hot.y < 1 && c.hot.r > 0.05 && c.hot.r < 0.3, t + ' hot'); else ok(c.kind === 'norm', t + ' শুধু নরমালে hot নেই'); });
ok(IM.ABCDE.length === 5 && IM.RIPE.length === 4, 'ABCDE/RIPE');
// ল্যাব
LB.CASES.forEach(c => { const t = 'lab/' + c.id, R = LB.rows(c); ok(c.pt.hx && (c.pt.sex === 'M' || c.pt.sex === 'F'), t + ' রোগী');
  R.forEach(r => ok(r.cat ? (typeof r.v === 'string' && r.normal) : (r.lo < r.hi && Number.isFinite(r.v)), t + ' ' + r.k)); const fl = R.filter(r => r.f !== 'N').map(r => r.k);
  c.sig.forEach(k => ok(fl.indexOf(k) >= 0, t + ': ' + k + ' অস্বাভাবিক হওয়ার কথা')); ok(R.some(r => r.f === 'N'), t + ' অন্তত একটি স্বাভাবিক মান থাকে');
  ok(c.dx.o.length === 4 && c.dx.a < 4 && c.dx.e && new Set(c.dx.o).size === 4, t + ' dx'); chkQ(c.plan, t + ' plan'); ok(/^(cbc|lft|abg|ele|kft|tft|uri|sto)_/.test(c.id) && c.grp === c.id.slice(0, 3).toUpperCase(), t + ' গ্রুপ'); });
ok(LB.flag('hb', 12.5, 'F') === 'N' && LB.flag('hb', 12.5, 'M') === 'L' && LB.flag('plt', 400, 'M') === 'N' && LB.flag('plt', 401, 'M') === 'H' && LB.flag('ggt', 60, 'F') === 'H' && LB.flag('ggt', 60, 'M') === 'N', 'flag ও লিঙ্গভেদ');
const thal = LB.byId('cbc_thal'); const tv = Object.fromEntries(thal.tests); ok(tv.mcv / tv.rbc < 13, 'মেন্টজার < ১৩ (থ্যালাসেমিয়া)'); const iv = Object.fromEntries(LB.byId('cbc_ida').tests); ok(iv.mcv / iv.rbc > 13, 'মেন্টজার > ১৩ (আয়রন-ঘাটতি)');
const av = Object.fromEntries(LB.byId('lft_alc').tests); ok(av.ast / av.alt > 2, 'অ্যালকোহল: AST:ALT > ২'); const hv = Object.fromEntries(LB.byId('lft_hep').tests); ok(hv.alt > hv.ast && hv.alt > 1000, 'ভাইরাল: ALT > AST ও হাজার ছাড়ানো');
const ov = Object.fromEntries(LB.byId('lft_obs').tests); ok(ov.alp / 147 > ov.alt / 40 && ov.dbil / ov.tbil > 0.5, 'অবস্ট্রাকটিভ: ALP-র তুলনামূলক বৃদ্ধি বেশি, ডাইরেক্ট প্রধান'); const mv = Object.fromEntries(LB.byId('lft_hem').tests); ok(mv.dbil / mv.tbil < 0.2 && mv.alt <= 40, 'হিমোলাইটিক: ডাইরেক্ট <২০%, ALT স্বাভাবিক');
LB.SKILLS.forEach((q, i) => chkQ(q, 'SK' + i));

// ---- v3.19: রোগনির্ণয় ও পরীক্ষা বিস্তার ----
['hyperk', 'lbbb', 'rbbb'].forEach(id => { const s = EC.ecgSignal(id, { seed: 2 }); ok(s.y.every(Number.isFinite) && s.beats.length >= 5, id + ' সিগন্যাল'); ok(EC.rhyById(id).lead, id + ' লিড'); });
{ const hk = EC.ecgSignal('hyperk', { seed: 2 }), b = hk.beats.find(x => x > 1 && x < 4), tpk = Math.max(...hk.y.slice(Math.round((b + 0.1) * 250), Math.round((b + 0.4) * 250))); ok(tpk > 0.6, 'হাইপারক্যালেমিয়ায় উঁচু T ' + tpk.toFixed(2));
  const rb = EC.ecgSignal('rbbb', { seed: 2 }), nb = EC.ecgSignal('nsr', { seed: 2 }); ok(Math.min(...rb.y) < -0.4 && Math.max(...rb.y) < 1.0, 'RBBB: rS ও কম R'); void nb; }
{ const pos = EC.ecgSignal('nsr', { seed: 5 }), neg = EC.ecgSignal('nsr', { seed: 5, qrs: 'neg' }); ok(Math.max(...pos.y) > 0.9 && Math.min(...neg.y) < -0.7 && Math.max(...neg.y) < 0.5, 'qrs:neg ঋণাত্মক QRS'); }
ok(EC.AXIS.length === 4 && EC.AXIS_OPTS.length === 4 && EC.AXIS.every((a, i) => a.ans === i), 'AXIS');
for (let sd = 1; sd <= 20; sd++) { const set = EC.axisSet(sd); ok(set.length === 6 && set.every(q => q.a >= 0 && q.a < 4 && q.i === EC.AXIS[q.a].i && q.avf === EC.AXIS[q.a].avf), 'axisSet ' + sd); ok(new Set(set.slice(0, 4).map(q => q.a)).size === 4, 'axisSet-এ চারটিই আছে ' + sd); }
EC.TERR_Q.forEach((q, i) => chkQ(q, 'TERR_Q' + i)); ok(EC.TERR.length === 4 && EC.ELEC.length === 4, 'TERR/ELEC');
IM.MODQ.forEach((q, i) => chkQ(q, 'MODQ' + i)); ok(IM.MODS.length === 4, 'MODS');
// ক্রসম্যাচ: নিয়ম যাচাই
ok(LB.rbcOK('A+', 'O−') && LB.rbcOK('A+', 'A+') && LB.rbcOK('A+', 'A−') && !LB.rbcOK('A+', 'B+') && !LB.rbcOK('A+', 'AB+') && LB.rbcOK('AB+', 'B−') && !LB.rbcOK('O−', 'O+') && !LB.rbcOK('B−', 'B+') && LB.rbcOK('O+', 'O−') && !LB.rbcOK('O+', 'A+'), 'rbcOK নিয়ম');
ok(LB.rbcDonors('O−').join() === 'O−' && LB.rbcDonors('AB+').length === 8 && LB.rbcDonors('B+').join() === 'O+,O−,B+,B−', 'ডোনার তালিকা');
ok(LB.plasmaOK('A+', 'AB+') && LB.plasmaOK('O+', 'A+') && !LB.plasmaOK('A+', 'B+') && !LB.plasmaOK('A+', 'O+'), 'plasmaOK নিয়ম');
for (let sd = 1; sd <= 40; sd++) { const set = LB.crossSet(sd); ok(set.length === 6, 'crossSet ' + sd + ' দৈর্ঘ্য ' + set.length); set.forEach(q => chkQ(q, 'cross' + sd)); set.slice(0, 4).forEach(q => { const rec = q.q.match(/(O|A|B|AB)[+−]/)[0], ok1 = q.o.filter(g => LB.rbcOK(rec, g)); ok(ok1.length === 1 && q.o[q.a] === ok1[0], 'ঠিক একটি নিরাপদ ব্যাগ ' + rec + ' সিড ' + sd); }); }
LB.CROSS_FIXED.forEach((q, i) => chkQ(q, 'CF' + i));
// গণনা-করা সারি ও শ্রেণিবদ্ধ (ক্যাটেগরিক্যাল) মান
ok(LB.calcs(LB.byId('abg_dka'))[0].v === 26 && LB.calcs(LB.byId('lft_hem'))[0].v === 3.9 && LB.calcs(LB.byId('kft_aki')).some(c => c.v > 20), 'calcs');
ok(LB.flag('ur_nit', 'পজিটিভ', 'F') === 'A' && LB.flag('ur_nit', 'নেগেটিভ', 'F') === 'N' && LB.flag('st_par', 'অনুপস্থিত', 'M') === 'N', 'ক্যাটেগরিক্যাল flag');
// অ্যাসিড-বেস ও ইলেক্ট্রোলাইট প্যাটার্ন
{ const v = id => Object.fromEntries(LB.byId(id).tests);
  ok(v('abg_dka').ph < 7.35 && v('abg_dka').hco3 < 22 && v('abg_dka').pco2 < 35, 'DKA: মেটাবলিক অ্যাসিডোসিস + ক্ষতিপূরণ');
  ok(v('abg_copd').ph < 7.35 && v('abg_copd').pco2 > 45 && v('abg_copd').hco3 > 26, 'COPD: শ্বাসজনিত অ্যাসিডোসিস, ক্রনিক ক্ষতিপূরণ');
  ok(v('abg_panic').ph > 7.45 && v('abg_panic').pco2 < 35 && v('abg_panic').hco3 >= 22, 'অতিশ্বাস: শ্বাসজনিত অ্যালকালোসিস');
  ok(v('ele_hyperk').k > 6.5 && v('ele_hypona').na < 125, 'K⁺ ও Na⁺ প্রকট');
  ok(v('kft_aki').bun / v('kft_aki').crea > 20 && v('kft_ckd').bun / v('kft_ckd').crea < 20 && v('kft_ckd').egfr < 15, 'প্রি-রেনাল অনুপাত > ২০, CKD-তে < ২০');
  ok(v('tft_hyper').tsh < 0.4 && v('tft_hyper').ft4 > 1.8 && v('tft_hypo').tsh > 4 && v('tft_hypo').ft4 < 0.8, 'থাইরয়েড TSH-T4 বিপরীতমুখী'); }

// ---- v3.20: জরুরি দক্ষতা ----
{
  const EM = require('./public/hospital-emerg-data.js');
  const chk = (q, tag) => { ok(q && q.q && q.e && Array.isArray(q.o) && q.o.length >= 3 && q.a >= 0 && q.a < q.o.length, tag + ' প্রশ্ন'); ok(new Set(q.o).size === q.o.length, tag + ' বিকল্প অনন্য'); };
  EM.CPR.QUIZ.forEach((q, i) => chk(q, 'CPRQ' + i)); EM.MCI_QUIZ.forEach((q, i) => chk(q, 'MCIQ' + i)); EM.SNAKE_QUIZ.forEach((q, i) => chk(q, 'SNQ' + i));
  [['ACLS', EM.ACLS], ['ATLS', EM.ATLS_CASES], ['TOX', EM.TOX_CASES], ['SNAKE', EM.SNAKE_CASES], ['BURN', EM.BURN_CASES]].forEach(([n, a]) => a.forEach(c => { ok(c.id && c.n && c.d && c.lesson.length >= 2 && c.steps.length >= 3, n + ' ' + c.id + ' গঠন'); c.steps.forEach((s, i) => chk(s.q, n + c.id + '#' + i)); }));
  const ids = a => new Set(a.map(c => c.id)).size === a.length; ok(ids(EM.ACLS) && ids(EM.ATLS_CASES) && ids(EM.TOX_CASES) && ids(EM.SNAKE_CASES) && ids(EM.BURN_CASES) && ids(EM.SCENARIOS), 'কেস-আইডি অনন্য');
  const ECG = require('./public/hospital-ecg-data.js'); EM.ACLS.forEach(c => c.steps.forEach(s => { if (s.mon) ok(!!ECG.rhyById(s.mon), 'মনিটর-রিদম ' + s.mon); }));
  EM.ATLS_CASES.forEach(c => c.steps.forEach(s => ok('xABCDE'.includes(s.k), 'ATLS অক্ষর ' + s.k)));
  // চাপের তাল
  const ts = (bpm, n, jit) => Array.from({ length: n }, (_, i) => i * 60000 / bpm + (jit ? (i % 2 ? jit : -jit) : 0));
  ok(EM.tempoVerdict(ts(110, 16)).v === 'good' && EM.tempoVerdict(ts(80, 16)).v === 'slow' && EM.tempoVerdict(ts(150, 16)).v === 'fast' && EM.tempoVerdict(ts(110, 16, 120)).v === 'uneven' && EM.tempoVerdict(ts(110, 5)).v === 'few', 'tempoVerdict');
  // প্রতিষেধক ও Parkland
  for (let sd = 1; sd <= 60; sd++) { const a = EM.antidoteSet(sd); ok(a.length === 6 && new Set(a.map(q => q.q)).size === 6, 'antidoteSet ' + sd); a.forEach(q => { ok(q.o.length === 4, 'antidote বিকল্প'); chk(q, 'anti' + sd); }); const p = EM.parklandSet(sd); ok(p.length === 4, 'parklandSet ' + sd); p.forEach(q => chk(q, 'pk' + sd)); }
  ok(EM.parkland(70, 30, 0).total === 8400 && EM.parkland(70, 30, 0).rate8 === 525 && EM.parkland(70, 30, 2).rate1 === 700 && EM.parkland(55, 27, 0).total === 5940, 'Parkland হাতে-হিসাব');
  ok(EM.tbsa(['chest', 'armL']) === 27 && EM.BURN.NINES.reduce((a, p) => a + p[2], 0) === 100, 'rule of nines');
  // START
  const c0 = { walk: false, br: 2, rr: 20, rad: true, crt: 1, cmd: true };
  ok(EM.start({ ...c0, walk: true }) === 'G' && EM.start({ ...c0, br: 0 }) === 'B' && EM.start({ ...c0, br: 1 }) === 'R' && EM.start({ ...c0, rr: 31 }) === 'R' && EM.start({ ...c0, rr: 30 }) === 'Y' && EM.start({ ...c0, rad: false }) === 'R' && EM.start({ ...c0, crt: 2 }) === 'Y' && EM.start({ ...c0, crt: 2.5 }) === 'R' && EM.start({ ...c0, cmd: false }) === 'R' && EM.start(c0) === 'Y', 'START নিয়ম');
  EM.SCENARIOS.forEach(sc => { const t = EM.tally(sc); ok(t.R && t.Y && t.G && t.B, sc.id + ' চার রঙ'); sc.c.forEach(c => ok(EM.startWhy(c).startsWith('ধাপ'), 'startWhy')); });
  // ক্যারিয়ার: ব্যাজ ও সার্টিফিকেট
  const S0 = { em: EM.freshState() }; ok(EM.BADGES.every(b => !b.f(S0)) && !DD.certProgress(EM.CERT, S0).ok, 'নতুন অবস্থায় কিছু নেই');
  ok(new Set(EM.BADGES.map(b => b.id).concat(DD.BADGES.map(b => b.id))).size === EM.BADGES.length + DD.BADGES.length, 'ব্যাজ-আইডি অনন্য');
  const full = ks => Object.fromEntries(ks.map(c => [c.id, 3])); const S1 = { em: Object.assign(EM.freshState(), { n: 40, ok: 36, acls: full(EM.ACLS), atls: full(EM.ATLS_CASES), tox: full(EM.TOX_CASES), snake: full(EM.SNAKE_CASES), burn: full(EM.BURN_CASES), mci: full(EM.SCENARIOS), tempo: 1, anti: 1, parkland: 1 }) };
  ok(EM.BADGES.every(b => b.f(S1)) && DD.certProgress(EM.CERT, S1).ok, 'পূর্ণ অবস্থায় সব ব্যাজ ও সার্টিফিকেট');
}

// ---- v3.21: সাইকোলজি ----
{
  const PY = require('./public/hospital-psych-data.js');
  const EM2 = require('./public/hospital-emerg-data.js');
  const chk = (q, tag) => { ok(q && q.q && q.e && Array.isArray(q.o) && q.o.length >= 3 && q.a >= 0 && q.a < q.o.length, tag + ' প্রশ্ন'); ok(new Set(q.o).size === q.o.length, tag + ' বিকল্প অনন্য'); };
  PY.MSE.QUIZ.forEach((q, i) => chk(q, 'MSEQ' + i)); PY.EMG_QUIZ.forEach((q, i) => chk(q, 'EMGQ' + i)); PY.SCALE_Q.forEach((q, i) => chk(q, 'SCQ' + i));
  [['MSE', PY.MSE_CASES, 8], ['DX', PY.DX_CASES, 4], ['EMG', PY.EMG_CASES, 4]].forEach(([n, a, min]) => a.forEach(c => { ok(c.id && c.n && c.d && c.lesson.length >= 2 && c.steps.length >= min, n + ' ' + c.id + ' গঠন'); c.steps.forEach((s, i) => chk(s.q, n + c.id + '#' + i)); }));
  PY.MSE_CASES.forEach(c => ok(c.steps.length === PY.MSE.DOMAINS.length, 'MSE ' + c.id + ' প্রতি ডোমেইনে এক ধাপ'));
  ok(PY.N.mse === 3 && PY.N.dx === 8 && PY.N.emg === 5 && PY.N.scale === 4, 'সংখ্যা');
  const ids = a => new Set(a.map(c => c.id)).size === a.length; ok(ids(PY.MSE_CASES) && ids(PY.DX_CASES) && ids(PY.EMG_CASES), 'কেস-আইডি অনন্য');
  // স্কোরিং: সীমা-মান
  const fill = (n, v) => Array(n).fill(v), ph = (a) => PY.scoreScale('phq9', a);
  ok(ph(fill(9, 0)).band.label === 'ন্যূনতম' && ph(fill(9, 3)).total === 27 && ph(fill(9, 3)).band.label === 'তীব্র', 'PHQ-9 সীমা');
  const pb = t => { const a = fill(9, 0); let r = t; for (let i = 0; i < 8 && r > 0; i++) { const v = Math.min(3, r); a[i] = v; r -= v; } return ph(a).band.label; };
  ok(pb(4) === 'ন্যূনতম' && pb(5) === 'মৃদু' && pb(9) === 'মৃদু' && pb(10) === 'মাঝারি' && pb(14) === 'মাঝারি' && pb(15) === 'মাঝারি-তীব্র' && pb(19) === 'মাঝারি-তীব্র' && pb(20) === 'তীব্র', 'PHQ-9 কাট-অফ');
  ok(ph([0, 0, 0, 0, 0, 0, 0, 0, 1]).flags.length === 1 && ph(fill(9, 0)).flags.length === 0, 'PHQ-9 আইটেম ৯ ফ্ল্যাগ');
  ok(PY.scoreScale('phq9', fill(8, 0)).err && PY.scoreScale('phq9', fill(9, 5)).err && PY.scoreScale('nope', []).err, 'অবৈধ উত্তর বাতিল');
  const gd = t => PY.scoreScale('gad7', [Math.min(3, t), Math.min(3, Math.max(0, t - 3)), Math.min(3, Math.max(0, t - 6)), Math.min(3, Math.max(0, t - 9)), Math.min(3, Math.max(0, t - 12)), Math.min(3, Math.max(0, t - 15)), Math.min(3, Math.max(0, t - 18))]);
  ok(gd(4).band.label === 'ন্যূনতম' && gd(5).band.label === 'মৃদু' && gd(10).band.label === 'মাঝারি' && gd(15).band.label === 'তীব্র' && gd(21).total === 21 && gd(10).positive && !gd(9).positive, 'GAD-7 কাট-অফ');
  const au = (sum) => { const a = fill(10, 0); let r = sum; for (let i = 0; i < 8 && r > 0; i++) { const v = Math.min(4, r); a[i] = v; r -= v; } if (r > 0) { a[8] = Math.min(4, r); r -= a[8]; } if (r > 0) a[9] = 4; return PY.scoreScale('audit', a); };
  ok(au(7).band.label === 'নিম্ন ঝুঁকি' && au(8).band.label === 'ঝুঁকিপূর্ণ ব্যবহার' && au(15).band.label === 'ঝুঁকিপূর্ণ ব্যবহার' && au(16).band.label === 'ক্ষতিকর ব্যবহার' && au(19).band.label === 'ক্ষতিকর ব্যবহার' && au(20).band.label === 'সম্ভাব্য নির্ভরতা' && au(20).flags.length >= 1 && au(40).total === 40, 'AUDIT কাট-অফ');
  ok(PY.scoreScale('audit', [0, 0, 0, 0, 0, 0, 0, 0, 3, 0]).err, 'AUDIT ৯-নম্বরে ৩ অবৈধ');
  const pt = (g, a) => PY.scoreScale('pcptsd', [g].concat(a));
  ok(pt(0, [0, 0, 0, 0, 0]).na && pt(1, [1, 1, 0, 0, 0]).positive === false && pt(1, [1, 1, 1, 0, 0]).positive === true && pt(1, [1, 1, 1, 1, 1]).total === 5 && pt(1, [1, 1, 1, 0, 0]).band.label === 'ইতিবাচক', 'PC-PTSD-5');
  for (let sd = 1; sd <= 80; sd++) { const set = PY.scaleQuizSet(sd); ok(set.length === 6, 'scaleQuizSet ' + sd); set.forEach(q => chk(q, 'sq' + sd)); }
  // ক্যারিয়ার: ব্যাজ ও সার্টিফিকেট
  const S0 = { psy: PY.freshState() }; ok(PY.BADGES.every(b => !b.f(S0)) && !DD.certProgress(PY.CERT, S0).ok, 'নতুন অবস্থায় কিছু নেই');
  const allIds = DD.BADGES.map(b => b.id).concat(EM2.BADGES.map(b => b.id), PY.BADGES.map(b => b.id)); ok(new Set(allIds).size === allIds.length, 'ব্যাজ-আইডি অনন্য');
  const full = ks => Object.fromEntries(ks.map(c => [c.id, 3]));
  const S1 = { psy: Object.assign(PY.freshState(), { n: 50, ok: 45, mse: full(PY.MSE_CASES), dx: full(PY.DX_CASES), emg: full(PY.EMG_CASES), scale: { phq9: 1, gad7: 1, audit: 1, pcptsd: 1 }, sq: 1 }) };
  ok(PY.BADGES.every(b => b.f(S1)) && DD.certProgress(PY.CERT, S1).ok, 'পূর্ণ অবস্থায় সব ব্যাজ ও সার্টিফিকেট');
}
console.log(fail ? fail + ' টি ব্যর্থ' : 'hospital-test: সব ঠিক ✔'); process.exit(fail ? 1 : 0);
