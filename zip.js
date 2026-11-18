'use strict';
/* ছোট ZIP লেখা ও পড়ার মডিউল (কোনো npm প্যাকেজ লাগে না)।
   ব্যাকআপ (backup.js) ও রিস্টোর (restore.js) এটি ব্যবহার করে। ZIP64 নেই: মোট ৩.৫ GB বা ৬৫,০০০ ফাইলের বেশি হলে ত্রুটি দেয়। */
const fs = require('fs'), zlib = require('zlib');

const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CRC_T[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

const LIMIT_BYTES = 3.5 * 1024 * 1024 * 1024, LIMIT_FILES = 65000;
/* এই ধরনের ফাইল আগে থেকেই কমপ্রেসড, আবার ডিফ্লেট করে লাভ নেই */
const STORED = /\.(jpe?g|png|gif|webp|webm|ogg|m4a|mp3|mp4|zip|docx|pptx|xlsx|pdf|gz)$/i;

function dosTime(d) {
  d = d || new Date(); const y = Math.max(1980, d.getFullYear());
  return { date: ((y - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(), time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1) };
}

class ZipWriter {
  constructor(file) { this.file = file; this.fd = fs.openSync(file, 'w'); this.pos = 0; this.entries = []; this.bytes = 0; }
  _write(buf) { fs.writeSync(this.fd, buf, 0, buf.length, this.pos); this.pos += buf.length; }
  add(name, data, mtime) {
    if (this.entries.length >= LIMIT_FILES) throw new Error('ফাইল অনেক বেশি (ZIP সীমা)');
    this.bytes += data.length; if (this.bytes > LIMIT_BYTES || this.pos > LIMIT_BYTES) throw new Error('ব্যাকআপ ৩.৫ GB-এর বেশি হয়ে যাচ্ছে');
    const nameBuf = Buffer.from(name, 'utf8'), crc = crc32(data);
    let method = 0, body = data;
    if (data.length > 64 && !STORED.test(name)) { const z = zlib.deflateRawSync(data, { level: 6 }); if (z.length < data.length) { method = 8; body = z; } }
    const t = dosTime(mtime), h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(method, 8);
    h.writeUInt16LE(t.time, 10); h.writeUInt16LE(t.date, 12); h.writeUInt32LE(crc, 14); h.writeUInt32LE(body.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(nameBuf.length, 26); h.writeUInt16LE(0, 28);
    const off = this.pos; this._write(h); this._write(nameBuf); this._write(body);
    this.entries.push({ nameBuf, method, t, crc, csize: body.length, usize: data.length, off });
  }
  close() {
    const start = this.pos;
    for (const e of this.entries) {
      const c = Buffer.alloc(46);
      c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(e.method, 10);
      c.writeUInt16LE(e.t.time, 12); c.writeUInt16LE(e.t.date, 14); c.writeUInt32LE(e.crc, 16); c.writeUInt32LE(e.csize, 20); c.writeUInt32LE(e.usize, 24);
      c.writeUInt16LE(e.nameBuf.length, 28); c.writeUInt32LE(e.off, 42);
      this._write(c); this._write(e.nameBuf);
    }
    const size = this.pos - start, end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(this.entries.length, 8); end.writeUInt16LE(this.entries.length, 10); end.writeUInt32LE(size, 12); end.writeUInt32LE(start, 16);
    this._write(end); fs.fsyncSync(this.fd); fs.closeSync(this.fd); this.fd = null;
    return { files: this.entries.length, bytes: this.bytes, size: this.pos };
  }
  abort() { try { if (this.fd !== null) fs.closeSync(this.fd); } catch (_) {} try { fs.unlinkSync(this.file); } catch (_) {} }
}

/* ZIP পড়া: কেন্দ্রীয় তালিকা থেকে এন্ট্রি, তারপর একটি একটি করে বের করা (পুরো ফাইল মেমরিতে নেয় না) */
function openZip(file) {
  const fd = fs.openSync(file, 'r'), size = fs.fstatSync(fd).size;
  const rd = (pos, len) => { const b = Buffer.alloc(len); const n = fs.readSync(fd, b, 0, len, pos); return n === len ? b : b.subarray(0, n); };
  const tailLen = Math.min(size, 22 + 65535), tail = rd(size - tailLen, tailLen);
  let e = -1; for (let i = tail.length - 22; i >= 0; i--) if (tail.readUInt32LE(i) === 0x06054b50) { e = i; break; }
  if (e < 0) { fs.closeSync(fd); throw new Error('এটি বৈধ ZIP ফাইল নয়'); }
  const count = tail.readUInt16LE(e + 10), cdSize = tail.readUInt32LE(e + 12), cdOff = tail.readUInt32LE(e + 16);
  const cd = rd(cdOff, cdSize), entries = []; let p = 0;
  for (let i = 0; i < count; i++) {
    if (cd.readUInt32LE(p) !== 0x02014b50) { fs.closeSync(fd); throw new Error('ZIP-এর তালিকা নষ্ট'); }
    const flags = cd.readUInt16LE(p + 8), method = cd.readUInt16LE(p + 10), crc = cd.readUInt32LE(p + 16), csize = cd.readUInt32LE(p + 20), usize = cd.readUInt32LE(p + 24);
    const nl = cd.readUInt16LE(p + 28), xl = cd.readUInt16LE(p + 30), cl = cd.readUInt16LE(p + 32), off = cd.readUInt32LE(p + 42);
    entries.push({ name: cd.toString('utf8', p + 46, p + 46 + nl), method, crc, csize, usize, off, flags });
    p += 46 + nl + xl + cl;
  }
  return {
    entries,
    read(en) {
      const h = rd(en.off, 30); if (h.readUInt32LE(0) !== 0x04034b50) throw new Error('ZIP এন্ট্রি নষ্ট: ' + en.name);
      const start = en.off + 30 + h.readUInt16LE(26) + h.readUInt16LE(28), raw = rd(start, en.csize);
      const out = en.method === 8 ? zlib.inflateRawSync(raw) : en.method === 0 ? raw : null;
      if (!out) throw new Error('অজানা কমপ্রেশন: ' + en.name);
      if (out.length !== en.usize || crc32(out) !== en.crc) throw new Error('ফাইল নষ্ট (CRC মেলেনি): ' + en.name);
      return out;
    },
    close() { try { fs.closeSync(fd); } catch (_) {} }
  };
}

module.exports = { ZipWriter, openZip, crc32 };
