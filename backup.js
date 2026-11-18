'use strict';
/* অটো-ব্যাকআপ: পুরো data/ ফোল্ডার (db.json, community.json, uploads, notes, viva, cimg, sync) একটি ZIP-এ।
   - নিজে থেকে চলে: সার্ভার চালুর ১ মিনিট পরে, তারপর প্রতি BACKUP_EVERY_HOURS ঘণ্টায় (ডিফল্ট ২৪; 0 দিলে অটো বন্ধ, শুধু হাতে)।
   - রাখা হয়: সর্বশেষ BACKUP_KEEP_RECENT টি (ডিফল্ট ৭) + তার আগের BACKUP_KEEP_WEEKS সপ্তাহের প্রতিটির একটি করে (ডিফল্ট ৪)।
   - কোথায়: ডিফল্ট data/backups/। BACKUP_DIR দিয়ে অন্য ডিস্ক বা মাউন্ট করা ফোল্ডার দিন (হোস্ট ডিস্ক নষ্ট হলে একই ডিস্কের ব্যাকআপও যায়)। */
const fs = require('fs'), path = require('path'), { ZipWriter } = require('./zip');

const NAME_RE = /^geb-backup-(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})\.zip$/;
const pad = n => String(n).padStart(2, '0');
const stamp = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;
const num = (v, d, lo, hi) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };

module.exports = function (env) {
  const DATA = env.DATA, flushAll = env.flushAll || (() => {});
  const DIR = path.resolve(process.env.BACKUP_DIR || path.join(DATA, 'backups'));
  const EVERY_H = num(process.env.BACKUP_EVERY_HOURS, 24, 0, 24 * 60);
  const KEEP_RECENT = Math.floor(num(process.env.BACKUP_KEEP_RECENT, 7, 1, 90)), KEEP_WEEKS = Math.floor(num(process.env.BACKUP_KEEP_WEEKS, 4, 0, 52));
  const log = env.log || console.log;
  let running = false, lastError = '', timer = null;
  try { fs.mkdirSync(DIR, { recursive: true }); } catch (_) {}

  const atOf = name => { const m = NAME_RE.exec(name); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : 0; };
  function list() {
    let names = []; try { names = fs.readdirSync(DIR); } catch (_) {}
    return names.filter(n => NAME_RE.test(n)).map(n => { let size = 0; try { size = fs.statSync(path.join(DIR, n)).size; } catch (_) {} return { name: n, size, at: atOf(n) }; }).sort((a, b) => b.at - a.at);
  }
  /* কোনটা মুছবে: নতুন KEEP_RECENT টি রাখো; বাকিদের মধ্যে প্রতি সপ্তাহের (সোমবার থেকে) সবচেয়ে নতুনটি, সর্বোচ্চ KEEP_WEEKS সপ্তাহ */
  function toPrune(all) {
    const keep = new Set(all.slice(0, KEEP_RECENT).map(x => x.name)), weeks = new Set();
    const weekOf = at => { const d = new Date(at); const day = (d.getUTCDay() + 6) % 7; return Math.floor((at - day * 86400000) / (7 * 86400000)); };
    all.slice(KEEP_RECENT).forEach(x => { const w = weekOf(x.at); if (!weeks.has(w) && weeks.size < KEEP_WEEKS) { weeks.add(w); keep.add(x.name); } });
    return all.filter(x => !keep.has(x.name));
  }
  function prune() { toPrune(list()).forEach(x => { try { fs.unlinkSync(path.join(DIR, x.name)); log('পুরনো ব্যাকআপ মোছা হলো: ' + x.name); } catch (_) {} }); }

  async function walk(dir, rel, out) {
    let ents; try { ents = await fs.promises.readdir(dir, { withFileTypes: true }); } catch (_) { return; }
    for (const e of ents) {
      const full = path.join(dir, e.name), r = rel ? rel + '/' + e.name : e.name;
      if (path.resolve(full) === DIR || /\.(tmp|partial)$/.test(e.name)) continue;   // ব্যাকআপ ফোল্ডার নিজে ও অর্ধেক লেখা ফাইল বাদ
      if (e.isDirectory()) await walk(full, r, out); else if (e.isFile()) out.push({ full, r });
    }
  }

  async function run(why) {
    if (running) { const e = new Error('আরেকটি ব্যাকআপ চলছে'); e.status = 409; throw e; }
    running = true; lastError = '';
    const name = `geb-backup-${stamp(new Date())}.zip`, final = path.join(DIR, name), tmp = final + '.partial';
    let zw = null;
    try {
      fs.mkdirSync(DIR, { recursive: true });
      try { flushAll(); } catch (e) { log('ব্যাকআপের আগে flush করা যায়নি: ' + e.message); }
      const files = []; await walk(DATA, '', files);
      zw = new ZipWriter(tmp);
      const skipped = []; let n = 0;
      for (const f of files) {
        let buf, st; try { st = await fs.promises.stat(f.full); buf = await fs.promises.readFile(f.full); } catch (_) { skipped.push(f.r); continue; }
        zw.add(f.r, buf, st.mtime); n++;
        if (n % 20 === 0) await new Promise(r => setImmediate(r));   // বড় ব্যাকআপে সার্ভার যেন আটকে না যায়
      }
      zw.add('_manifest.json', Buffer.from(JSON.stringify({ app: 'geb-hub', kind: 'data-backup', at: new Date().toISOString(), why: why || 'auto', files: n, skipped }, null, 1)));
      const info = zw.close(); zw = null;
      fs.renameSync(tmp, final); prune();
      log(`ব্যাকআপ তৈরি: ${name} (${n} ফাইল, ${(info.size / 1048576).toFixed(1)} MB)`);
      return { name, size: info.size, at: atOf(name), files: n, skipped: skipped.length };
    } catch (e) { lastError = e.message || String(e); if (zw) zw.abort(); try { fs.unlinkSync(tmp); } catch (_) {} log('ব্যাকআপ ব্যর্থ: ' + lastError); throw e; }
    finally { running = false; }
  }

  const status = () => ({ dir: DIR, everyHours: EVERY_H, keepRecent: KEEP_RECENT, keepWeeks: KEEP_WEEKS, running, lastError, list: list(), now: Date.now() });
  const nameOk = n => NAME_RE.test(n || '');
  const pathOf = n => path.join(DIR, n);
  function remove(n) { if (!nameOk(n)) return false; try { fs.unlinkSync(pathOf(n)); return true; } catch (_) { return false; } }

  function check() {
    if (!EVERY_H || running) return;
    const last = list()[0];
    if (!last || Date.now() - last.at >= EVERY_H * 3600000) run('auto').catch(() => {});
  }
  function start() { if (!EVERY_H) { log('অটো-ব্যাকআপ বন্ধ (BACKUP_EVERY_HOURS=0)'); return; } setTimeout(check, 60000).unref(); timer = setInterval(check, 15 * 60000); timer.unref(); }

  return { run, status, list, remove, nameOk, pathOf, start, DIR };
};
module.exports.NAME_RE = NAME_RE;
