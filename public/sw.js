/* GEB Hub service worker: অফলাইনে সাইট চলার জন্য।
   - অ্যাপের ফাইল (HTML/JS/CSS/আইকন): cache-first, ব্যাকগ্রাউন্ডে নতুন সংস্করণ আনে
   - /api/data (প্রশ্ন, সিলেবাস, নোটিস): network-first, নেট না থাকলে শেষ সেভ করা কপি
   - /api/grade, /api/login, /api/hit ইত্যাদি কখনো ক্যাশ হয় না
   সংস্করণ বদলালে (VERSION) পুরনো ক্যাশ মুছে যায়। */
const VERSION = 'geb-v3-21';
const SHELL = ['/', '/index.html', '/style.css', '/app.js', '/exam.js', '/store.js', '/pwa.js', '/community.js', '/social.css', '/social-core.js', '/sync-core.js', '/sync.js', '/poll-builder.js', '/polls.js', '/notes.js', '/jobs.js', '/rooms-core.js', '/rooms.js', '/viva.js', '/dnacard.js', '/bday.js', '/campus.js', '/planner.js', '/planner.css', '/biotools.css', '/bio-data.js', '/bio-glossary.js', '/bio-core.js', '/biotools.js', '/bio-seq.js', '/bio-lab.js', '/game.css', '/game-data.js', '/game-core.js', '/game.js', '/game-play.js', '/vlab.css', '/vlab-3d.js', '/vlab-data.js', '/vlab-core.js', '/vlab.js', '/vlab-chem.js', '/vlab-micro.js', '/vlab-micro2.js', '/vlab-plant.js', '/vlab-animal.js', '/vlab-voice-core.js', '/vlab-voice.js', '/vlab-ai-core.js', '/vlab-ai.js', '/dx.css', '/dx-core.js', '/dx-data.js', '/dx.js', '/hospital.css', '/hospital-data.js', '/hospital.js', '/hospital-flow-data.js', '/hospital-flow-core.js', '/hospital-flow-scenes.js', '/hospital-flow.js', '/hospital-duty.css', '/hospital-emerg.css', '/hospital-psych.css', '/hospital-psych-data.js', '/hospital-emerg-data.js', '/hospital-duty-data.js', '/hospital-ecg-data.js', '/hospital-img-data.js', '/hospital-lab-data.js', '/hospital-duty.js', '/hospital-ecg.js', '/hospital-img.js', '/hospital-lab.js', '/hospital-emerg.js', '/hospital-psych.js', '/hospital-career.js', '/icons/icon-192.png', '/icons/icon-512.png', '/offline.html'];
const SHELL_CACHE = VERSION + '-shell', DATA_CACHE = VERSION + '-data';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL_CACHE).then(c => Promise.all(SHELL.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) {
    // Google Fonts: পেলে ক্যাশ করে রাখি, যাতে অফলাইনেও ফন্ট থাকে
    if (req.method === 'GET' && /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) e.respondWith(staleWhileRevalidate(req, DATA_CACHE));
    return;
  }
  if (url.pathname === '/api/data') return void e.respondWith(networkFirst(req, DATA_CACHE));
  if (url.pathname.startsWith('/api/') || url.pathname === '/admin' || url.pathname === '/admin.html') return;   // সরাসরি নেটওয়ার্কে
  if (url.pathname.startsWith('/uploads/')) return void e.respondWith(networkFirst(req, DATA_CACHE));            // দেখা ফাইল অফলাইনেও খোলে
  if (req.mode === 'navigate') return void e.respondWith(navigate(req));
  e.respondWith(staleWhileRevalidate(req, SHELL_CACHE));
});

async function networkFirst(req, name) {
  const cache = await caches.open(name);
  try { const res = await fetch(req); if (res.ok) cache.put(req, res.clone()); return res; }
  catch (_) { const hit = await cache.match(req); if (hit) return hit; return new Response(JSON.stringify({ error: 'অফলাইন' }), { status: 503, headers: { 'Content-Type': 'application/json' } }); }
}
async function staleWhileRevalidate(req, name) {
  const cache = await caches.open(name), hit = await cache.match(req);
  const net = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
  return hit || (await net) || new Response('', { status: 504 });
}
async function navigate(req) {
  const cache = await caches.open(SHELL_CACHE);
  try { const res = await fetch(req); if (res.ok && new URL(req.url).pathname === '/') cache.put('/', res.clone()); return res; }
  catch (_) { return (await cache.match('/')) || (await cache.match('/index.html')) || (await cache.match('/offline.html')); }
}
