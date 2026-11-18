/* GEB Hub: ডায়াগনস্টিক ল্যাবের স্বয়ংক্রিয় টেস্ট: node dx-test.js */
const D = require('./public/dx-core.js'), X = require('./public/dx-data.js');
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('✘', m); } };
function P(c, fix) { const p = X.mkP(c.init); Object.keys(fix || {}).forEach(k => { if (k === 'gel') Object.assign(p.gel, fix.gel); else p[k] = fix[k]; }); return p; }
// ক. ট্রাবলশুটিং
X.TS.forEach(c => {
  const r0 = D.judge(D.simulate(c.P0, c.ctx));
  if (c.trueNeg) { ok(r0.ok && r0.trueNeg, c.id + ': true-negative কেসে কন্ট্রোল ঠিক থাকা উচিত'); return; }
  ok(!r0.ok, c.id + ': শুরুতে ব্যর্থ হওয়া উচিত → ' + JSON.stringify(r0));
  const r1 = D.judge(D.simulate(P(c, c.fix), c.ctx));
  ok(r1.ok, c.id + ': fix দিলে সফল হওয়া উচিত → ' + JSON.stringify(r1.why));
  // একাধিক কারণ থাকলে আংশিক সমাধান ব্যর্থ
  if (c.causes.length > 1 && !c.either) Object.keys(c.fix).forEach(k => { const part = {}; part[k] = c.fix[k]; const rp = D.judge(D.simulate(P(c, part), c.ctx)); ok(!rp.ok, c.id + ': শুধু ' + k + ' ঠিক করলে সফল হওয়া উচিত নয়'); });
  // ভালো প্যারামিটারে প্রতিটি কনটেক্সটে সফল (সমস্যা-মুক্ত)
});
// সমস্যামুক্ত বেসলাইন: কনটেক্সটের দোষ ছাড়া
['A', 'B', 'E', 'GC', 'F', 'G'].forEach(k => {
  const ctx = { size: 500, primers: { orig: X.PR[k] }, seed: 'b' + k, tplKind: 'genomic', gcRich: k === 'GC' };
  const p = D.copy(D.GOOD); p.ta = Math.round(Math.min(D.tmOf(X.PR[k].f, p), D.tmOf(X.PR[k].r, p)) - 5); if (k === 'GC') p.dmso = 5;
  const j = D.judge(D.simulate(p, ctx)); ok(j.ok, 'বেসলাইন ' + k + ' সফল হওয়া উচিত → ' + JSON.stringify(j.why) + ' Ta=' + p.ta);
});
// খ. রোগ নির্ণয়
X.DX.forEach(c => {
  ok(c.dd.indexOf(c.answer) >= 0, c.id + ': উত্তর বিকল্পে নেই');
  c.dd.forEach(d => ok(X.DIS[d], c.id + ': DIS-এ নেই ' + d));
  c.confirm.forEach(t => { ok(X.TESTS[t], c.id + ': টেস্ট নেই ' + t); ok(c.res[t], c.id + ': নির্ণায়ক টেস্টের ফল নেই ' + t); });
  Object.keys(c.res).forEach(t => ok(X.TESTS[t], c.id + ': res-এ অজানা টেস্ট ' + t));
  c.useful.forEach(t => ok(X.TESTS[t], c.id + ': useful-এ অজানা ' + t));
  c.dd.filter(d => d !== c.answer).forEach(d => { if (!c.why[d]) console.log('  ℹ', c.id, 'whyNot নেই:', d); });
  const costOf = {}; Object.keys(X.TESTS).forEach(t => costOf[t] = X.TESTS[t].cost);
  const best = D.dxScore(c, { tests: c.confirm.slice(0, 1).concat(c.useful.slice(0, 1)), dx: c.answer, costOf });
  ok(best.score >= 85, c.id + ': ভালো কাজের স্কোর ' + best.score);
  const bad = D.dxScore(c, { tests: Object.keys(X.TESTS), dx: c.dd.find(d => d !== c.answer), costOf });
  ok(bad.score <= 40, c.id + ': সব টেস্ট + ভুল রোগ নির্ণয়ের স্কোর ' + bad.score);
});
// গ. ফরেনসিক
X.FOR.forEach(c => {
  const ev = c.profiles[c.ev];
  c.suspects.forEach(s => {
    let v;
    if (c.type === 'mixture') { const m = D.mixConsistent(ev, c.profiles[c.known], s.key); v = m.ok ? 'incl' : 'excl'; }
    else if (c.type === 'paternity') { const pt = D.paternity(c.profiles.C, c.profiles.M, s.key); v = pt.mism >= 3 ? 'excl' : 'notexcl'; console.log('  ', c.id, s.id, 'mism', pt.mism, 'PI', pt.pi.toExponential(2)); }
    else { const cp = D.compareProfile(ev, s.key); v = cp.verdict; if (c.type !== 'contam') console.log('  ', c.id, s.id, JSON.stringify(cp.n)); }
    if (c.type === 'contam') { const cp = D.compareProfile(c.profiles[c.ev], s.key); v = cp.verdict; }
    ok(v === c.answer[s.id], c.id + ' ' + s.id + ': প্রত্যাশা ' + c.answer[s.id] + ', পাওয়া ' + v);
  });
  const r = D.rmp(c.profiles[c.ev].mix ? c.suspects[1].key : (c.profiles.Efull || ev), null); ok(r.oneIn > 1e6, c.id + ': RMP ' + r.oneIn);
});
// ঘ. ম্যাচ প্রবাবিলিটি গাণিতিক যাচাই (সরল সূত্র vs NRC θ=0)
const g = D.genoFreq('TH01', [7, 9.3], 0), exp = 2 * D.LOCUS.TH01.f[7] * D.LOCUS.TH01.f[9.3]; ok(Math.abs(g - exp) < 1e-12, 'heterozygote 2pq');
const h = D.genoFreq('TH01', [9.3, 9.3], 0); ok(Math.abs(h - Math.pow(D.LOCUS.TH01.f[9.3], 2)) < 1e-12, 'homozygote p²');
console.log(fail ? '\n' + fail + ' টি ব্যর্থ' : '\n✔ সব টেস্ট পাস');
process.exit(fail ? 1 : 0);
