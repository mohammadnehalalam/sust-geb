/* GEB Hub: AI ল্যাব সহায়কের ছোট সহায়ক ফাংশন (v3.13), DOM ছাড়া, তাই Node-এ টেস্ট করা যায় (lab-chat-test.js)।
   fmt: AI-এর লেখা নিরাপদ HTML-এ (শুধু **মোটা**, `কোড`, তালিকা, অনুচ্ছেদ)। chips: এখন পর্দায় যা আছে তার ভিত্তিতে দ্রুত-প্রশ্নের বাটন।
   push: ইতিহাসে নতুন বার্তা (সর্বোচ্চ ১২টি, user দিয়ে শুরু)। */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.VLAiCore = factory(); })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function inline(s) { return esc(s).replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>').replace(/`([^`\n]+)`/g, '<code>$1</code>'); }
  function fmt(text) {
    var lines = String(text == null ? '' : text).replace(/\r/g, '').split('\n'), out = [], list = null;
    function close() { if (list) { out.push('</' + list + '>'); list = null; } }
    lines.forEach(function (l) {
      var u = l.match(/^\s*[-*•]\s+(.*)$/), o = l.match(/^\s*\d+[.)]\s+(.*)$/), kind = u ? 'ul' : o ? 'ol' : null;
      if (kind) { if (list !== kind) { close(); out.push('<' + kind + '>'); list = kind; } out.push('<li>' + inline((u || o)[1]) + '</li>'); }
      else { close(); if (l.trim()) out.push('<p>' + inline(l) + '</p>'); }
    });
    close(); return out.join('');
  }
  function chips(ctx) {
    ctx = ctx || {};
    if (ctx.exp) {
      var c = [];
      if (ctx.isErr) c.push({ l: 'ভুলটা কেন হলো?', q: 'স্ক্রিনে যে ভুলের বার্তা এসেছে, সেটা কেন হলো? সহজ করে বুঝিয়ে দিন।' });
      c.push({ l: 'ইঙ্গিত দিন', q: 'এই ধাপে আমি আটকে গেছি। উত্তর না বলে শুধু একটা ইঙ্গিত দিন।' });
      c.push({ l: 'এই ধাপের তত্ত্ব', q: 'এই ধাপটা কেন করতে হয়, এর পেছনের তত্ত্ব কী?' });
      c.push({ l: 'পরীক্ষণের উদ্দেশ্য', q: 'এই পরীক্ষণের উদ্দেশ্য কী আর এখান থেকে কী শেখার কথা?' });
      return c.slice(0, 4);
    }
    return [{ l: 'কোনটা দিয়ে শুরু করব?', q: 'এই ল্যাবে কোন পরীক্ষণ দিয়ে শুরু করা ভালো?' }, { l: 'এই ল্যাবে কী শেখা যায়?', q: 'এই ল্যাবের পরীক্ষণগুলো থেকে কী কী শেখা যায়?' }, { l: 'নিরাপত্তা নিয়ম', q: 'আসল ল্যাবে এই ধরনের কাজের সময় কী কী নিরাপত্তা নিয়ম মানতে হয়?' }];
  }
  function push(h, role, text, max) {
    h = (h || []).slice(); text = String(text == null ? '' : text).trim(); if (!text || (role !== 'u' && role !== 'a')) return h;
    if (!h.length && role !== 'u') return h;
    if (h.length && h[h.length - 1].r === role) h[h.length - 1] = { r: role, t: h[h.length - 1].t + '\n' + text }; else h.push({ r: role, t: text });
    max = max || 12; while (h.length > max || (h.length && h[0].r !== 'u')) h.shift(); return h;
  }
  return { version: '3.13', esc: esc, fmt: fmt, chips: chips, push: push };
});
