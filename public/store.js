/* ব্রাউজারে সেভ থাকা ডেটা (localStorage): ফলাফলের ইতিহাস + ভুল প্রশ্ন খাতা।
   ডিফল্টে সার্ভারে যায় না (সদস্য চাইলে sync.js দিয়ে অ্যাকাউন্টে সিঙ্ক করতে পারেন)। ব্রাউজারের ডেটা মুছলে হারাবে, তাই "অগ্রগতি" ট্যাবে ব্যাকআপ বাটন আছে। */
window.GEBStore=(function(){
'use strict';
const KH='geb_hist', KW='geb_wrong', MAXH=500;
const rd=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return Array.isArray(v)?v:d;}catch(e){return d;}};
const wr=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true;}catch(e){return false;}};

/* ---------- ছোট হেল্পার ---------- */
const hash=s=>{let h=5381;s=String(s);for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return 'k'+(h>>>0).toString(36);};
const BN='০১২৩৪৫৬৭৮৯';
const norm=s=>String(s==null?'':s).toLowerCase().replace(/[০-৯]/g,d=>BN.indexOf(d)).replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
function lev(a,b){const m=a.length,n=b.length;if(!m)return n;if(!n)return m;let p=Array.from({length:n+1},(_,i)=>i);for(let i=1;i<=m;i++){const c=[i];for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c;}return p[n];}
/* ছোট উত্তর মেলানো: হুবহু, বা বড় শব্দে ১-২ অক্ষরের বানান ভুল সহ্য করা, বা সঠিক উত্তর বাক্যের ভেতরে থাকলে */
function checkShort(input,accept){
  const u=norm(input); if(!u) return {ok:false,empty:true};
  for(const raw of accept){
    const a=norm(raw); if(!a) continue;
    if(u===a) return {ok:true};
    const tol=a.length>=12?2:a.length>=6?1:0;
    if(tol&&lev(u,a)<=tol) return {ok:true,near:true};
    if(a.length>=4&&(' '+u+' ').includes(' '+a+' ')&&u.split(' ').length<=a.split(' ').length+3) return {ok:true,near:true};
  }
  return {ok:false};
}
/* মডেল উত্তরে "keys: a, b, c" লাইন থাকলে কীওয়ার্ড মিলিয়ে ইঙ্গিত দেয় */
function parseAns(t){
  t=String(t||''); const keys=[]; const body=t.split('\n').filter(l=>{const m=l.match(/^\s*keys?\s*[:：]\s*(.+)$/i);if(m){m[1].split(/[,;،]/).forEach(x=>{x=x.trim();if(x)keys.push(x);});return false;}return true;}).join('\n').trim();
  return {body,keys};
}
function keyHits(text,keys){const t=norm(text);const hit=[],miss=[];keys.forEach(k=>(t.includes(norm(k))?hit:miss).push(k));return {hit,miss};}

/* ---------- ইতিহাস ---------- */
const hist=()=>rd(KH,[]);
function addHist(e){
  const h=hist(); e.id=Date.now().toString(36)+Math.random().toString(36).slice(2,5); e.ts=e.ts||Date.now();
  e.pct=e.out?Math.round(e.got/e.out*1000)/10:0; h.push(e);
  while(h.length>MAXH)h.shift(); wr(KH,h); return e;
}
const delHist=id=>wr(KH,hist().filter(x=>x.id!==id));
const clearHist=()=>wr(KH,[]);

/* ---------- ভুল খাতা ---------- */
const wrong=()=>rd(KW,[]);
const saveWrong=a=>wr(KW,a);
/* items: [{k,type,c,q,opts,correct,accept,exp,ans,src,got,max}]; ফেরত: {added, removed} */
function recordResults(items,S){
  const th=(S.wrongBelowPct||60)/100, need=S.masterStreak||2, w=wrong(); let added=0, removed=0;
  items.forEach(it=>{
    if(!it.max) return; const good=it.got/it.max>=th, i=w.findIndex(x=>x.k===it.k);
    if(!good){
      const snap={k:it.k,type:it.type,c:it.c,q:it.q,opts:it.opts,correct:it.correct,accept:it.accept,exp:it.exp,ans:it.ans,src:it.src,max:it.max,got:it.got,last:Date.now()};
      if(i>=0){w[i]={...w[i],...snap,wrongCount:(w[i].wrongCount||1)+1,streak:0};} else {w.push({...snap,wrongCount:1,streak:0,added:Date.now()});added++;}
    } else if(i>=0){ w[i].streak=(w[i].streak||0)+1; w[i].last=Date.now(); if(w[i].streak>=need){w.splice(i,1);removed++;} }
  });
  saveWrong(w); return {added,removed};
}
function markWrong(k,good,S){ // ভুল খাতা থেকে আবার চেষ্টার ফল
  const w=wrong(), i=w.findIndex(x=>x.k===k); if(i<0) return {gone:false};
  if(good){w[i].streak=(w[i].streak||0)+1;w[i].last=Date.now();if(w[i].streak>=(S.masterStreak||2)){w.splice(i,1);saveWrong(w);return {gone:true};}}
  else{w[i].streak=0;w[i].wrongCount=(w[i].wrongCount||1)+1;w[i].last=Date.now();}
  saveWrong(w); return {gone:false,streak:good?w[i].streak:0};
}
const removeWrong=k=>saveWrong(wrong().filter(x=>x.k!==k));

/* ---------- ব্যাকআপ ---------- */
const exportAll=()=>JSON.stringify({app:'geb-hub',v:1,at:new Date().toISOString(),hist:hist(),wrong:wrong()},null,1);
function importAll(txt){
  const j=JSON.parse(txt); if(!j||j.app!=='geb-hub') throw new Error('এটা GEB হাব-এর ব্যাকআপ ফাইল নয়');
  const h=hist(),ids=new Set(h.map(x=>x.id)); (j.hist||[]).forEach(x=>{if(x&&x.id&&!ids.has(x.id))h.push(x);}); h.sort((a,b)=>a.ts-b.ts); wr(KH,h.slice(-MAXH));
  const w=wrong(),ks=new Set(w.map(x=>x.k)); (j.wrong||[]).forEach(x=>{if(x&&x.k&&!ks.has(x.k))w.push(x);}); saveWrong(w);
  return {hist:(j.hist||[]).length,wrong:(j.wrong||[]).length};
}
return {hash,norm,checkShort,parseAns,keyHits,hist,addHist,delHist,clearHist,wrong,recordResults,markWrong,removeWrong,exportAll,importAll};
})();
