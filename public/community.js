/* কমিউনিটি: লগইন/নিবন্ধন · ফিড (পোস্ট, লাইক, কমেন্ট) · প্রশ্নোত্তর · সদস্য তালিকা · প্রোফাইল · নোটিফিকেশন */
window.startCommunity=function(D0){
'use strict';
const mount=document.getElementById('commMount'); if(!mount) return;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BN='০১২৩৪৫৬৭৮৯', bn=n=>String(n).replace(/\d/g,d=>BN[d]);
const toast=m=>window.__gebToast&&window.__gebToast(m);
const CM=(D0&&D0.subjects)||{};
const st={me:null,cfg:{batches:[],open:true},unread:0,tab:'feed',scope:'all',q:'',unsolved:false,posts:[],more:false,next:0,loading:false,openC:{},cache:{},mode:'login',members:[],mb:'',mq:'',notifs:[],err:'',offline:false,keep:{}};

async function api(method,url,body){
  let r; try{ r=await fetch(url,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,credentials:'same-origin'}); }
  catch(_){ st.offline=true; throw new Error('ইন্টারনেট নেই। কমিউনিটি ব্যবহার করতে নেট লাগে।'); }
  st.offline=false; const j=await r.json().catch(()=>({}));
  if(r.status===401&&st.me){st.me=null;if(window.GEBX)GEBX.setMe(null);render();} if(!r.ok) throw new Error(j.error||'সমস্যা হয়েছে'); return j;
}
const ago=ts=>{const s=(Date.now()-ts)/1000; if(s<60)return 'এইমাত্র'; if(s<3600)return bn(Math.floor(s/60))+' মিনিট আগে'; if(s<86400)return bn(Math.floor(s/3600))+' ঘণ্টা আগে'; if(s<604800)return bn(Math.floor(s/86400))+' দিন আগে'; return new Date(ts).toLocaleDateString('bn-BD',{day:'numeric',month:'short',year:'numeric'});};
const link=t=>esc(t).replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g,u=>`<a href="${u}" target="_blank" rel="noopener nofollow ugc">${u}</a>`).replace(/\n/g,'<br>');
const ROLE={mod:'মডারেটর',teacher:'শিক্ষক',cr:'CR'};
const GX=window.GEBX||{tabs:[],setMe(){}};
const av=(u,sz)=>u.avatar?`<img class="cav" style="width:${sz||40}px;height:${sz||40}px" src="${u.avatar}" alt="">`:`<span class="cav ph" style="width:${sz||40}px;height:${sz||40}px;font-size:${(sz||40)*.45}px">${esc((u.name||'?').trim()[0]||'?')}</span>`;
const who=u=>`<b>${esc(u.name)}</b>${ROLE[u.role]?` <span class="chip sig">${ROLE[u.role]}</span>`:''}`;
const scopeLbl=p=>p.scope==='all'?'সবার জন্য':p.scope==='batch'?'ব্যাচ '+esc(p.batch):esc((CM[p.scope]||{}).n||p.scope);

/* ---------- মূল রেন্ডার ---------- */
async function boot(){ try{ const j=await api('GET','/api/c/me'); st.me=j.user; st.cfg=j.settings; st.unread=j.unread||0; }catch(e){ st.err=e.message; st.me=null; } GX.setMe(st.me,st.cfg); render(); if(st.me) loadFeed(true); }
function render(){
  if(st.offline&&!st.me){ mount.innerHTML='<div class="miss">কমিউনিটি ব্যবহার করতে ইন্টারনেট লাগে। নেট এলে আবার খুলুন।</div>'; return; }
  if(!st.me) return renderAuth();
  const tabs=[['feed','ফিড'],['qa','প্রশ্নোত্তর'],['members','সদস্য'],['lf','হারানো-প্রাপ্তি'],['story','ব্যাচ জীবনবৃত্তান্ত'],...GX.tabs.map(t=>[t.id,t.label]),['notif','নোটিফিকেশন'+(st.unread?' ('+bn(st.unread)+')':'')],['me','আমার প্রোফাইল']];
  mount.innerHTML=`<div class="seg extabs" role="tablist">${tabs.map(t=>`<button role="tab" data-ct="${t[0]}" aria-selected="${st.tab===t[0]}">${t[1]}</button>`).join('')}</div><div id="cBody"></div>`;
  const ext=GX.tabs.find(t=>t.id===st.tab), body=document.getElementById('cBody'); if(ext) ext.render(body); else ({feed:renderFeed,qa:renderFeed,members:renderMembers,lf:renderLF,story:renderStory,notif:renderNotifs,me:renderMe})[st.tab](body);
}

/* ---------- লগইন / নিবন্ধন ---------- */
function renderAuth(){
  const reg=st.mode==='register', c=st.cfg;
  mount.innerHTML=`<div class="exbox authbox"><div class="seg" style="margin-bottom:14px"><button data-am="login" aria-selected="${!reg}">লগইন</button><button data-am="register" aria-selected="${reg}">নতুন অ্যাকাউন্ট</button></div>
   <p class="exhint">${reg?(c.needApproval?'অ্যাকাউন্ট খোলার পর অ্যাডমিন অনুমোদন দিলে তবেই ঢুকতে পারবেন।':'নিবন্ধন করলেই ঢুকতে পারবেন।'):'শুধু ডিপার্টমেন্টের শিক্ষার্থীদের জন্য। রোল/আইডি ও পাসওয়ার্ড দিয়ে ঢুকুন।'}</p>
   ${st.err?`<div class="msg err" role="alert">${esc(st.err)}</div>`:''}
   ${reg&&!c.open?'<div class="miss">এখন নতুন নিবন্ধন বন্ধ আছে।</div>':`<div class="exrow"><label class="exl" for="aSid">রোল / আইডি</label><input class="fld" id="aSid" autocomplete="username" autocapitalize="none" placeholder="যেমন 2022331005" value="${esc(st.keep.sid||'')}"></div>
   ${reg?`<div class="exrow"><label class="exl" for="aName">পুরো নাম</label><input class="fld" id="aName" autocomplete="name" maxlength="80" value="${esc(st.keep.name||'')}"></div>
   <div class="exrow"><label class="exl" for="aBatch">ব্যাচ / সেশন</label><select class="fld" id="aBatch"><option value="">বাছুন</option>${c.batches.map(b=>`<option ${st.keep.batch===b?'selected':''}>${esc(b)}</option>`).join('')}</select></div>`:''}
   <div class="exrow"><label class="exl" for="aPw">পাসওয়ার্ড</label><input class="fld" id="aPw" type="password" autocomplete="${reg?'new-password':'current-password'}" placeholder="${reg?'অন্তত ৬ অক্ষর':''}"></div>
   ${reg&&c.codeRequired?`<div class="exrow"><label class="exl" for="aCode">জয়েন কোড</label><input class="fld" id="aCode" autocomplete="off" placeholder="ক্লাস গ্রুপ/CR-এর কাছ থেকে নিন"></div>`:''}
   <div class="frow"><button class="btn ink" id="aGo">${reg?'অ্যাকাউন্ট খুলুন':'লগইন'}</button></div>
   <p class="count" style="margin-top:12px">পাসওয়ার্ড ভুলে গেলে অ্যাডমিনকে বলুন, নতুন পাসওয়ার্ড দিয়ে দেবে।</p>`}</div>`;
}
async function doAuth(){
  const reg=st.mode==='register', v=id=>{const e=document.getElementById(id);return e?e.value:'';};
  const b=document.getElementById('aGo'); b.disabled=true; st.err='';
  try{
    const body={sid:v('aSid'),password:v('aPw')}; st.keep={sid:v('aSid'),name:v('aName'),batch:v('aBatch')}; if(reg){body.name=v('aName');body.batch=v('aBatch');body.code=v('aCode');}
    const j=await api('POST',reg?'/api/c/register':'/api/c/login',body);
    if(reg&&j.status==='pending'){st.mode='login';st.err='';mount.innerHTML='<div class="exbox"><div class="exhint ok" style="margin:0">অ্যাকাউন্ট খোলা হয়েছে। অ্যাডমিন অনুমোদন দিলে এই রোল/আইডি ও পাসওয়ার্ড দিয়ে লগইন করতে পারবেন।</div><div class="frow" style="margin-top:12px"><button class="btn ghost" data-am="login">লগইন পাতায় যান</button></div></div>';return;}
    await boot();
  }catch(e){st.err=e.message;renderAuth();}
}

/* ---------- ফিড ও প্রশ্নোত্তর ---------- */
function renderFeed(body){
  const qa=st.tab==='qa', me=st.me;
  const courses=Object.keys(CM);
  body.innerHTML=`<div class="composer"><div class="cphead">${av(me,40)}<div class="gx"><textarea class="fld" id="pText" rows="2" maxlength="3000" placeholder="${qa?'আপনার প্রশ্নটি লিখুন…':'কিছু শেয়ার করুন…'}"></textarea></div></div>
   <div class="cpfoot"><select class="fld sm" id="pScope" aria-label="কাদের জন্য"><option value="all">সবার জন্য</option><option value="batch">শুধু আমার ব্যাচ (${esc(me.batch)})</option>${courses.map(c=>`<option value="${c}">${esc(CM[c].n)} কোর্স</option>`).join('')}</select>
   <label class="chk sm"><input type="checkbox" id="pQ" ${qa?'checked':''}> প্রশ্ন</label><button class="btn ink sm" id="pGo">পোস্ট</button></div></div>
   <div class="feedbar"><div class="fchips"><button class="fc sm" data-sc="all" aria-pressed="${st.scope==='all'}">সব</button><button class="fc sm" data-sc="batch" aria-pressed="${st.scope==='batch'}">আমার ব্যাচ</button>${courses.map(c=>`<button class="fc sm" data-sc="${c}" style="--c:${CM[c].c}" aria-pressed="${st.scope===c}"><span class="dot"></span>${esc(CM[c].n)}</button>`).join('')}</div>
   <div class="frow" style="margin:8px 0 0"><input class="fld sm" id="fQ" type="search" placeholder="খুঁজুন…" value="${esc(st.q)}" style="max-width:220px">${qa?`<label class="chk sm"><input type="checkbox" id="fUn" ${st.unsolved?'checked':''}> উত্তর হয়নি এমন</label>`:''}</div></div>
   <div id="feedList"></div><div id="feedMore"></div>`;
  drawList();
}
async function loadFeed(reset){
  if(st.loading) return; st.loading=true;
  try{
    const qs=new URLSearchParams({scope:st.scope}); if(st.tab==='qa'){qs.set('type','question'); if(st.unsolved)qs.set('unsolved','1');} if(st.q)qs.set('q',st.q); if(!reset&&st.next)qs.set('before',st.next);
    const j=await api('GET','/api/c/feed?'+qs); st.posts=reset?j.posts:st.posts.concat(j.posts); st.more=j.more; st.next=j.next;
  }catch(e){toast(e.message);} st.loading=false; if(st.tab==='feed'||st.tab==='qa') drawList();
}
function postHtml(p){
  const open=st.openC[p.id];
  return `<article class="post ${p.pinned?'pinned':''}" id="po-${p.id}"><div class="phead">${av(p.author,40)}<div class="gx"><div>${who(p.author)}</div><small class="count">${esc(p.author.batch)} · ${ago(p.created)} · ${scopeLbl(p)}</small></div>
    ${p.pinned?'<span class="chip">📌 পিন করা</span>':''}${p.type==='question'?`<span class="chip ${p.solved?'':'sig'}">${p.solved?'✔ সমাধান হয়েছে':'প্রশ্ন'}</span>`:''}
    <details class="pmenu"><summary aria-label="আরও">⋯</summary><div>${p.canPin?`<button data-pin="${p.id}">${p.pinned?'পিন সরান':'পিন করুন'}</button>`:''}${p.canDelete?`<button data-delp="${p.id}">মুছুন</button>`:''}${!p.mine?`<button data-rep="post:${p.id}">রিপোর্ট করুন</button>`:''}</div></details></div>
   <div class="ptext">${link(p.text)}</div>
   <div class="pfoot"><button class="lk ${p.liked?'on':''}" data-lkp="${p.id}" aria-pressed="${p.liked}"><span aria-hidden="true">${p.liked?'♥':'♡'}</span> ${bn(p.likes)}</button><button class="lk" data-tgc="${p.id}" aria-expanded="${!!open}">💬 ${bn(p.comments)} ${p.type==='question'?'উত্তর':'কমেন্ট'}</button></div>
   ${open?`<div class="cmts" id="cm-${p.id}">${commentsHtml(p)}</div>`:''}</article>`;
}
function commentsHtml(p){
  const list=st.cache[p.id]; if(!list) return '<p class="count">লোড হচ্ছে…</p>';
  return list.map(c=>`<div class="cmt ${c.accepted?'acc':''}" id="c-${c.id}">${av(c.author,30)}<div class="gx"><div class="cbub">${who(c.author)}${c.accepted?' <span class="chip">✔ সঠিক উত্তর</span>':''}<div>${link(c.text)}</div></div>
    <div class="cact"><span>${ago(c.created)}</span><button data-lkc="${c.id}" class="${c.liked?'on':''}">${c.liked?'♥':'♡'} ${bn(c.likes)}</button>${c.canAccept?`<button data-acc="${c.id}">${c.accepted?'মার্ক সরান':'সঠিক উত্তর'}</button>`:''}${c.canDelete?`<button data-delc="${c.id}">মুছুন</button>`:''}${!c.mine&&c.author.id!==st.me.id?`<button data-rep="comment:${c.id}">রিপোর্ট</button>`:''}</div></div></div>`).join('')
   +`<div class="cmtnew">${av(st.me,30)}<input class="fld sm" data-cin="${p.id}" maxlength="1500" placeholder="${p.type==='question'?'উত্তর লিখুন…':'কমেন্ট লিখুন…'}"><button class="btn ink sm" data-csend="${p.id}">পাঠান</button></div>`;
}
function drawList(){
  const l=document.getElementById('feedList'); if(!l) return;
  l.innerHTML=st.posts.length?st.posts.map(postHtml).join(''):`<div class="miss">${st.loading?'লোড হচ্ছে…':st.tab==='qa'?'এখনো কোনো প্রশ্ন নেই। প্রথম প্রশ্নটি আপনিই করুন!':'এখনো কোনো পোস্ট নেই। প্রথম পোস্টটি আপনিই দিন!'}</div>`;
  document.getElementById('feedMore').innerHTML=st.more?'<div class="frow" style="justify-content:center"><button class="btn ghost" id="fMore">আরও দেখুন</button></div>':'';
}
const refresh=p=>{const el=document.getElementById('po-'+p.id);const i=st.posts.findIndex(x=>x.id===p.id);if(i>=0)st.posts[i]=p;if(el){const t=document.createElement('div');t.innerHTML=postHtml(p);el.replaceWith(t.firstElementChild);}};
async function toggleC(pid){
  st.openC[pid]=!st.openC[pid]; const p=st.posts.find(x=>x.id===pid); refresh(p);
  if(st.openC[pid]&&!st.cache[pid]){ try{st.cache[pid]=(await api('GET','/api/c/posts/'+pid+'/comments')).comments;}catch(e){toast(e.message);st.openC[pid]=false;} refresh(p); }
}
async function reloadC(pid){ try{ st.cache[pid]=(await api('GET','/api/c/posts/'+pid+'/comments')).comments; const p=st.posts.find(x=>x.id===pid); p.comments=st.cache[pid].length; p.solved=st.cache[pid].some(c=>c.accepted); refresh(p);}catch(e){toast(e.message);} }

/* ---------- সদস্য ---------- */
async function loadMembers(){ try{ const qs=new URLSearchParams({q:st.mq,batch:st.mb}); st.members=(await api('GET','/api/c/members?'+qs)).members; }catch(e){toast(e.message);} drawMembers(); }
function renderMembers(body){
  body.innerHTML=`<div class="exbox"><div class="frow"><input class="fld" id="mQ" type="search" placeholder="নাম দিয়ে খুঁজুন" value="${esc(st.mq)}" style="max-width:240px"><select class="fld" id="mB" style="max-width:180px"><option value="">সব ব্যাচ</option>${st.cfg.batches.map(b=>`<option ${st.mb===b?'selected':''}>${esc(b)}</option>`).join('')}</select></div><div id="mList" class="mgrid"></div></div>`;
  loadMembers();
}
function drawMembers(){
  const l=document.getElementById('mList'); if(!l) return;
  l.innerHTML=st.members.length?st.members.map(m=>`<div class="mcard">${av(m,52)}<div class="gx"><div>${who(m)}</div><small class="count">${esc(m.batch)}${m.posts?' · '+bn(m.posts)+'টি পোস্ট':''}</small>${m.bio?`<p class="mbio">${esc(m.bio)}</p>`:''}${m.email?`<small class="count">✉ ${esc(m.email)}</small><br>`:''}${m.phone?`<small class="count">☎ ${esc(m.phone)}</small>`:''}</div></div>`).join(''):'<div class="miss">কাউকে পাওয়া যায়নি।</div>';
}

/* ---------- নোটিফিকেশন ---------- */
async function renderNotifs(body){
  body.innerHTML='<div class="exbox" id="nList"><p class="count">লোড হচ্ছে…</p></div>';
  try{ st.notifs=(await api('GET','/api/c/notifs')).notifs; if(st.unread){await api('POST','/api/c/notifs/read',{});st.unread=0;} }catch(e){toast(e.message);}
  const l=document.getElementById('nList'); if(!l) return;
  l.innerHTML=st.notifs.length?st.notifs.map(n=>`<div class="nrow ${n.read?'':'new'}"><span>${esc(n.text)}</span><small>${ago(n.created)}</small>${n.pid?`<button class="btn ghost sm" data-gop="${n.pid}">দেখুন</button>`:n.go?`<button class="btn ghost sm" data-go="${esc(n.go)}">দেখুন</button>`:''}</div>`).join(''):'<div class="miss">কোনো নোটিফিকেশন নেই।</div>';
  const t=mount.querySelector('[data-ct="notif"]'); if(t) t.textContent='নোটিফিকেশন';
}

/* ---------- আমার প্রোফাইল ---------- */
function renderMe(body){
  const m=st.me, pv=m.privacy;
  body.innerHTML=`<div class="exbox"><div class="frow" style="align-items:center"><div id="avBox">${av(m,72)}</div><div><label class="btn ghost sm" for="avIn" style="cursor:pointer">ছবি বদলান</label><input type="file" id="avIn" accept="image/*" hidden>${m.avatar?' <button class="btn ghost sm" id="avRm">ছবি সরান</button>':''}</div></div>
   <div class="exrow"><label class="exl" for="eName">নাম</label><input class="fld" id="eName" value="${esc(m.name)}" maxlength="80"></div>
   <div class="exrow"><label class="exl">রোল/আইডি, ব্যাচ</label><span class="count">${esc(m.sid)} · ${esc(m.batch)} (বদলাতে অ্যাডমিনকে বলুন)</span></div>
   <div class="exrow"><label class="exl" for="eBio">পরিচিতি (২০০ অক্ষর)</label><textarea class="fld" id="eBio" rows="2" maxlength="200">${esc(m.bio)}</textarea></div>
   <div class="exrow"><label class="exl" for="eDm">জন্মদিন (সাল লাগবে না)</label><select class="fld" id="eDm" style="max-width:150px"><option value="">মাস</option>${['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'].map((n,i)=>`<option value="${i+1}" ${m.dob&&m.dob.m===i+1?'selected':''}>${n}</option>`).join('')}</select> <select class="fld" id="eDd" style="max-width:100px"><option value="">দিন</option>${Array.from({length:31},(_,i)=>`<option value="${i+1}" ${m.dob&&m.dob.d===i+1?'selected':''}>${bn(i+1)}</option>`).join('')}</select></div>
   <div class="exrow"><label class="exl" for="eMail">ইমেইল</label><input class="fld" id="eMail" type="email" value="${esc(m.email||'')}"></div>
   <div class="exrow"><label class="exl" for="ePh">ফোন</label><input class="fld" id="ePh" type="tel" value="${esc(m.phone||'')}"></div>
   <h4>গোপনীয়তা (আপনি নিজে ঠিক করুন)</h4>
   <label class="chk"><input type="checkbox" id="pvDir" ${pv.directory?'checked':''}> সদস্য তালিকায় আমার নাম দেখাক</label>
   <label class="chk"><input type="checkbox" id="pvBd" ${pv.bday!==false?'checked':''}> জন্মদিনের দিন হোমপেজে আমার নাম ও ছবি দেখাক, সবাই উইশ করতে পারুক (সদস্য তালিকায় নাম দেখানোর অনুমতিও লাগে)</label>
   <label class="chk"><input type="checkbox" id="pvMail" ${pv.email?'checked':''}> অন্য সদস্যরা আমার ইমেইল দেখুক</label>
   <label class="chk"><input type="checkbox" id="pvPh" ${pv.phone?'checked':''}> অন্য সদস্যরা আমার ফোন নম্বর দেখুক</label>
   <p class="count">ডিফল্টে ইমেইল ও ফোন কেউ দেখতে পায় না। শুধু নাম, ব্যাচ, ছবি ও পরিচিতি দেখা যায়।</p>
   <div class="frow"><button class="btn ink" id="eSave">সেভ করুন</button><button class="btn ghost" id="eOut">লগআউট</button></div>
   <div id="syncBox"></div>
   <h4>পাসওয়ার্ড বদল</h4><div class="frow"><input class="fld" id="pwOld" type="password" placeholder="বর্তমান পাসওয়ার্ড" autocomplete="current-password" style="max-width:210px"><input class="fld" id="pwNew" type="password" placeholder="নতুন (অন্তত ৬ অক্ষর)" autocomplete="new-password" style="max-width:210px"><button class="btn ghost sm" id="pwGo">বদলান</button></div></div>`;
  if(window.GEBSync)GEBSync.mountPanel(document.getElementById('syncBox'));
}
function shrinkAvatar(file){return new Promise((ok,no)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{const S=160,c=document.createElement('canvas');c.width=c.height=S;const g=c.getContext('2d'),k=Math.max(S/im.width,S/im.height),w=im.width*k,h=im.height*k;g.fillStyle='#fff';g.fillRect(0,0,S,S);g.drawImage(im,(S-w)/2,(S-h)/2,w,h);URL.revokeObjectURL(u);ok(c.toDataURL('image/jpeg',.8));};im.onerror=()=>no(new Error('ছবি পড়া যায়নি'));im.src=u;});}

/* ---------- ইভেন্ট ---------- */
const guard=async fn=>{try{await fn();}catch(e){toast(e.message);}};
mount.addEventListener('click',e=>{
  const t=e.target, c=s=>t.closest(s); let el;
  if((el=c('[data-am]'))){st.mode=el.dataset.am;st.err='';renderAuth();return;}
  if(c('#aGo')){doAuth();return;}
  if((el=c('[data-ct]'))){st.tab=el.dataset.ct;st.scope='all';st.q='';st.unsolved=false;st.posts=[];st.next=0;render();if(st.tab==='feed'||st.tab==='qa')loadFeed(true);return;}
  if((el=c('[data-sc]'))){st.scope=el.dataset.sc;st.next=0;renderFeed(document.getElementById('cBody'));loadFeed(true);return;}
  if(c('#fMore')){loadFeed(false);return;}
  if(c('#pGo')){guard(async()=>{const b=document.getElementById('pGo');b.disabled=true;try{const p=await api('POST','/api/c/posts',{text:document.getElementById('pText').value,type:document.getElementById('pQ').checked?'question':'post',scope:document.getElementById('pScope').value});document.getElementById('pText').value='';st.posts.unshift(p);drawList();toast('পোস্ট হয়েছে');}finally{b.disabled=false;}});return;}
  if((el=c('[data-lkp]'))){guard(async()=>refresh(await api('POST','/api/c/posts/'+el.dataset.lkp+'/like',{})));return;}
  if((el=c('[data-tgc]'))){toggleC(+el.dataset.tgc);return;}
  if((el=c('[data-csend]'))){const pid=+el.dataset.csend,inp=mount.querySelector(`[data-cin="${pid}"]`);guard(async()=>{await api('POST','/api/c/posts/'+pid+'/comments',{text:inp.value});await reloadC(pid);});return;}
  if((el=c('[data-lkc]'))){const cid=+el.dataset.lkc,pid=+el.closest('.post').id.slice(3);guard(async()=>{await api('POST','/api/c/comments/'+cid+'/like',{});await reloadC(pid);});return;}
  if((el=c('[data-acc]'))){const cid=+el.dataset.acc,pid=+el.closest('.post').id.slice(3);guard(async()=>{await api('POST','/api/c/comments/'+cid+'/accept',{});await reloadC(pid);});return;}
  if((el=c('[data-delc]'))){if(!confirm('কমেন্টটি মুছবেন?'))return;const cid=+el.dataset.delc,pid=+el.closest('.post').id.slice(3);guard(async()=>{await api('DELETE','/api/c/comments/'+cid);await reloadC(pid);});return;}
  if((el=c('[data-delp]'))){if(!confirm('পোস্টটি মুছবেন?'))return;guard(async()=>{await api('DELETE','/api/c/posts/'+el.dataset.delp);st.posts=st.posts.filter(p=>p.id!==+el.dataset.delp);drawList();});return;}
  if((el=c('[data-pin]'))){guard(async()=>{await api('POST','/api/c/posts/'+el.dataset.pin+'/pin',{});loadFeed(true);});return;}
  if((el=c('[data-rep]'))){const [kind,id]=el.dataset.rep.split(':');const why=prompt('কেন রিপোর্ট করছেন? (সংক্ষেপে)');if(why===null)return;guard(async()=>{await api('POST','/api/c/report',{kind,id:+id,reason:why});toast('রিপোর্ট জমা হয়েছে, অ্যাডমিন দেখবেন');});el.closest('details')&&el.closest('details').removeAttribute('open');return;}
  if((el=c('[data-go]'))){const g=el.dataset.go;if(g==='polls'){st.tab='polls';render();}else if(g==='files'){location.hash='#notes';}else if(g==='viva'){location.hash='#viva';}else if(g==='jobs'){location.hash='#jobs';}else if(g==='wishes'){document.getElementById('bdayStrip')?document.getElementById('bdayStrip').scrollIntoView():0;}return;}
  if((el=c('[data-gop]'))){st.tab='feed';st.scope='all';st.q='';render();loadFeed(true).then(()=>{const pid=+el.dataset.gop;if(st.posts.some(x=>x.id===pid)){st.openC[pid]=false;toggleC(pid);}});return;}
  if(c('#eOut')){guard(async()=>{if(window.GEBSync)await GEBSync.beforeLogout();await api('POST','/api/c/logout',{});st.me=null;st.mode='login';st.posts=[];GX.setMe(null,st.cfg);render();});return;}
  if(c('#eSave')){guard(async()=>{const v=id=>document.getElementById(id);st.me=await api('PUT','/api/c/me',{name:v('eName').value,bio:v('eBio').value,email:v('eMail').value,phone:v('ePh').value,dob:(v('eDm').value&&v('eDd').value)?{m:+v('eDm').value,d:+v('eDd').value}:null,privacy:{directory:v('pvDir').checked,bday:v('pvBd').checked,email:v('pvMail').checked,phone:v('pvPh').checked}});GX.setMe(st.me,st.cfg);toast('প্রোফাইল সেভ হয়েছে');});return;}
  if(c('#avRm')){guard(async()=>{st.me=await api('PUT','/api/c/me',{avatar:''});renderMe(document.getElementById('cBody'));});return;}
  if(c('#pwGo')){guard(async()=>{await api('POST','/api/c/password',{old:document.getElementById('pwOld').value,new:document.getElementById('pwNew').value});document.getElementById('pwOld').value=document.getElementById('pwNew').value='';toast('পাসওয়ার্ড বদলেছে');});return;}
});
let dbT; const debounce=fn=>{clearTimeout(dbT);dbT=setTimeout(fn,350);};
mount.addEventListener('input',e=>{
  if(e.target.id==='fQ'){st.q=e.target.value;debounce(()=>{st.next=0;loadFeed(true);});}
  else if(e.target.id==='mQ'){st.mq=e.target.value;debounce(loadMembers);}
});
mount.addEventListener('change',e=>{
  if(e.target.id==='fUn'){st.unsolved=e.target.checked;st.next=0;loadFeed(true);}
  else if(e.target.id==='mB'){st.mb=e.target.value;loadMembers();}
  else if(e.target.id==='avIn'){const f=e.target.files[0];if(f)guard(async()=>{st.me=await api('PUT','/api/c/me',{avatar:await shrinkAvatar(f)});renderMe(document.getElementById('cBody'));toast('ছবি বদলেছে');});}
});
mount.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&e.target.matches('[data-cin]')){const b=mount.querySelector(`[data-csend="${e.target.dataset.cin}"]`);if(b)b.click();}
  if(e.key==='Enter'&&e.target.closest('.authbox')&&e.target.tagName==='INPUT')doAuth();
});
/* ---------- হারানো-প্রাপ্তি ও ব্যাচ জীবনবৃত্তান্ত ---------- */
const X={lfKind:'all',lfq:'',lf:[],lfMore:false,lfNext:0,lfLoading:false,lfForm:false,kindNew:'lost',photos:[],stBatch:'',stories:[],stMissing:0,stMine:null,stEdit:false,stOpen:{}};
const isMod=()=>st.me&&st.me.role==='mod';
function shrinkPhoto(file){return new Promise((ok,no)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);const k0=Math.min(1,1000/Math.max(im.width,im.height));for(const [s,q] of [[1,.74],[1,.6],[.8,.6],[.64,.55],[.5,.5]]){const w=Math.max(1,Math.round(im.width*k0*s)),h=Math.max(1,Math.round(im.height*k0*s)),c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,w,h);g.drawImage(im,0,0,w,h);const out=c.toDataURL('image/jpeg',q);if(out.length<=300000)return ok(out);}no(new Error('ছবিটি অনেক বড়, অন্য ছবি দিন'));};im.onerror=()=>{URL.revokeObjectURL(u);no(new Error('ছবি পড়া যায়নি'));};im.src=u;});}
const swap=(id,html)=>{const el=document.getElementById(id);if(!el)return;const t=document.createElement('div');t.innerHTML=html;el.replaceWith(t.firstElementChild);};

/* --- হারানো-প্রাপ্তি --- */
function renderLF(body){
  const F=[['all','সব'],['lost','😟 হারিয়েছে'],['found','🙌 পাওয়া গেছে'],['done','✔ সমাধান হয়েছে']];
  body.innerHTML=`<div class="composer"><div class="frow" style="margin:0;justify-content:space-between;align-items:center"><b>🔎 হারানো ও প্রাপ্তি</b><button class="btn ink sm" id="lfNew">${X.lfForm?'বন্ধ করুন':'+ নতুন পোস্ট'}</button></div><p class="count" style="margin:6px 0 0">কিছু হারালে বা পেলে ছবিসহ এখানে দিন। মালিক বা উদ্ধারকারী "যোগাযোগ করুন" চাপলে আপনি নোটিফিকেশন পাবেন।</p><div id="lfFormBox">${X.lfForm?lfFormHtml():''}</div></div>
  <div class="feedbar"><div class="fchips">${F.map(f=>`<button class="fc sm" data-lff="${f[0]}" aria-pressed="${X.lfKind===f[0]}">${f[1]}</button>`).join('')}</div></div>
  <div class="frow" style="margin:8px 0 0"><input class="fld sm" id="lfQ" type="search" placeholder="খুঁজুন (যেমন: ছাতা, চাবি)…" value="${esc(X.lfq)}" style="max-width:260px"></div>
  <div id="lfList"></div><div id="lfMore"></div>`;
  loadLF(true);
}
function lfFormHtml(){
  return `<div class="lfform"><div class="seg" role="group" style="margin:10px 0"><button type="button" data-lfk="lost" aria-selected="${X.kindNew==='lost'}">😟 হারিয়েছি</button><button type="button" data-lfk="found" aria-selected="${X.kindNew==='found'}">🙌 পেয়েছি</button></div>
  <div class="exrow"><label class="exl" for="lfT">জিনিসের নাম</label><input class="fld" id="lfT" maxlength="80" placeholder="যেমন: কালো ছাতা, ল্যাব কোট, ফিজিক্স বই"></div>
  <div class="exrow"><label class="exl" for="lfD">বিবরণ</label><textarea class="fld" id="lfD" rows="3" maxlength="600" placeholder="রং, চিহ্ন, ব্র্যান্ড বা আর কোনো পরিচয়…"></textarea></div>
  <div class="exrow"><label class="exl" for="lfP">কোথায়</label><input class="fld" id="lfP" maxlength="80" placeholder="যেমন: শিক্ষা ভবন-বি, ২য় তলা"></div>
  <div class="exrow"><label class="exl" for="lfW">কখন</label><input class="fld" id="lfW" maxlength="40" placeholder="যেমন: আজ দুপুর ১টার দিকে"></div>
  <div class="exrow"><label class="exl" for="lfC">যোগাযোগ (ঐচ্ছিক)</label><input class="fld" id="lfC" maxlength="80" placeholder="ফোন/মেসেঞ্জার; না দিলেও চলবে"></div>
  <div class="frow" style="align-items:center"><label class="btn ghost sm" for="lfPh" style="cursor:pointer">📷 ছবি যোগ করুন (সর্বোচ্চ ৩টি)</label><input type="file" id="lfPh" accept="image/*" multiple hidden></div><div class="lfprev" id="lfPrev">${prevHtml()}</div>
  <div class="frow"><button class="btn ink" id="lfGo">পোস্ট করুন</button></div></div>`;
}
const prevHtml=()=>X.photos.map((d,i)=>`<span class="lfp"><img src="${d}" alt="নির্বাচিত ছবি ${bn(i+1)}"><button type="button" data-phrm="${i}" aria-label="ছবি সরান">×</button></span>`).join('');
async function loadLF(reset){
  if(X.lfLoading) return; X.lfLoading=true;
  try{
    const qs=new URLSearchParams(); if(X.lfKind==='done')qs.set('status','resolved'); else if(X.lfKind!=='all')qs.set('kind',X.lfKind); if(X.lfq)qs.set('q',X.lfq); if(!reset&&X.lfNext)qs.set('before',X.lfNext);
    const j=await api('GET','/api/c/lf?'+qs); X.lf=reset?j.items:X.lf.concat(j.items); X.lfMore=j.more; X.lfNext=j.next;
  }catch(e){toast(e.message);} X.lfLoading=false; if(st.tab==='lf') drawLF();
}
function lfHtml(x){
  const lost=x.kind==='lost';
  return `<article class="post lfc ${x.status==='resolved'?'done':''}" id="lf-${x.id}"><div class="phead">${av(x.author,36)}<div class="gx"><div>${who(x.author)}</div><small class="count">${esc(x.author.batch)} · ${ago(x.created)}</small></div>
    <span class="chip ${lost?'sig':''}">${lost?'😟 হারিয়েছে':'🙌 পাওয়া গেছে'}</span>${x.status==='resolved'?'<span class="chip gray">✔ সমাধান</span>':''}
    ${x.canManage?`<details class="pmenu"><summary aria-label="আরও">⋯</summary><div><button data-lfres="${x.id}">${x.status==='resolved'?'আবার খোলা করুন':lost?'পাওয়া গেছে, বন্ধ করুন':'ফেরত দেওয়া হয়েছে'}</button><button data-lfdel="${x.id}">মুছুন</button></div></details>`:''}</div>
    <h4 class="lft">${esc(x.title)}</h4>
    ${x.photos.length?`<div class="lfph n${x.photos.length}">${x.photos.map(u=>`<a href="${u}" target="_blank" rel="noopener"><img src="${u}" alt="${esc(x.title)}" loading="lazy"></a>`).join('')}</div>`:''}
    ${x.text?`<div class="ptext">${link(x.text)}</div>`:''}
    <div class="lfmeta">${x.place?`<span>📍 ${esc(x.place)}</span>`:''}${x.when?`<span>🕒 ${esc(x.when)}</span>`:''}${x.contact?`<span>📞 ${esc(x.contact)}</span>`:''}</div>
    ${!x.mine&&x.status!=='resolved'?`<div class="pfoot"><button class="btn ghost sm" data-lfclaim="${x.id}">${lost?'আমি এটা পেয়েছি':'এটা আমার জিনিস'} — যোগাযোগ করুন</button></div>`:''}</article>`;
}
function drawLF(){
  const l=document.getElementById('lfList'); if(!l) return;
  l.innerHTML=X.lf.length?X.lf.map(lfHtml).join(''):`<div class="miss">${X.lfLoading?'লোড হচ্ছে…':X.lfKind==='done'?'এখনো কোনো পোস্ট সমাধান হয়নি।':'এখন কোনো হারানো বা পাওয়া জিনিসের পোস্ট নেই।'}</div>`;
  document.getElementById('lfMore').innerHTML=X.lfMore?'<div class="frow" style="justify-content:center"><button class="btn ghost" id="lfMoreBtn">আরও দেখুন</button></div>':'';
}

/* --- ব্যাচ জীবনবৃত্তান্ত --- */
function renderStory(body){
  const b=X.stBatch||st.me.batch;
  body.innerHTML=`<div class="composer"><div class="frow" style="margin:0;justify-content:space-between;align-items:center"><b>📖 ব্যাচের জীবনবৃত্তান্ত</b><button class="btn ink sm" id="stNew">${X.stEdit?'বন্ধ করুন':'✏️ আমার কার্ড'}</button></div><p class="count" style="margin:6px 0 0">সবার একটি করে কার্ড: শখ, স্বপ্ন, প্রিয় কোর্স আর সাস্টে আসার গল্প। লগইন করা সদস্যরা দেখতে পাবে।</p><div id="stFormBox"></div></div>
  <div class="frow" style="margin:0 0 10px"><select class="fld" id="stB" style="max-width:200px" aria-label="ব্যাচ">${st.cfg.batches.map(x=>`<option ${x===b?'selected':''}>${esc(x)}</option>`).join('')}</select></div>
  <div id="stList"><p class="count">লোড হচ্ছে…</p></div>`;
  loadStories();
}
async function loadStories(){
  try{ const j=await api('GET','/api/c/stories?batch='+encodeURIComponent(X.stBatch||st.me.batch)); X.stBatch=j.batch; X.stories=j.stories; X.stMissing=j.missing; X.stMine=j.mine; }catch(e){toast(e.message);}
  if(st.tab==='story'){ drawStories(); drawStForm(); }
}
function stHtml(s){
  const open=!!X.stOpen[s.id], hob=s.hobby?s.hobby.split(/[,،、\n]/).map(x=>x.trim()).filter(Boolean).slice(0,8):[];
  return `<article class="stcard ${s.mine?'me':''}" id="st-${s.id}"><div class="sthead">${av(s.author,56)}<div class="gx"><div>${who(s.author)}${s.mine?' <span class="chip">আপনি</span>':''}</div><small class="count">${esc(s.author.batch)}</small></div>
    ${s.canDelete?`<details class="pmenu"><summary aria-label="আরও">⋯</summary><div><button data-stdel="${s.id}">কার্ড মুছুন</button></div></details>`:''}</div>
    <dl class="stdl">${hob.length?`<div><dt>🎯 শখ</dt><dd class="chips" style="margin:0">${hob.map(h=>`<span class="chip gray">${esc(h)}</span>`).join('')}</dd></div>`:''}${s.dream?`<div><dt>✨ স্বপ্ন</dt><dd>${esc(s.dream)}</dd></div>`:''}${s.course?`<div><dt>📘 প্রিয় কোর্স</dt><dd>${esc((CM[s.course]||{}).n||s.course)}</dd></div>`:''}</dl>
    ${(s.journey||s.hasFeeling)?`<button class="btn ghost sm" data-stopen="${s.id}" aria-expanded="${open}">${open?'বন্ধ করুন':'📖 জার্নি ও অনুভূতি পড়ুন'}</button>`:''}
    ${open?`<div class="stbody">${s.journey?`<h5>🚪 সাস্টে আসার জার্নি</h5><div class="ptext">${link(s.journey)}</div>`:''}${s.hasFeeling?`<h5>💭 প্রথম সাস্টে আসার অনুভূতি</h5>${s.feeling?`<div class="ptext">${link(s.feeling)}</div>${s.mine&&s.feelingHidden?'<small class="count">🔒 আপনি এটি লুকিয়ে রেখেছেন, শুধু আপনি দেখছেন</small>':''}`:'<div class="count">🔒 এই অনুভূতি লুকানো আছে</div>'}`:''}</div>`:''}
    <div class="pfoot"><button class="lk ${s.liked?'on':''}" data-stlk="${s.id}" aria-pressed="${s.liked}">${s.liked?'💚':'🤍'} পাশে আছি ${bn(s.likes)}</button></div></article>`;
}
function drawStories(){
  const l=document.getElementById('stList'); if(!l) return;
  l.innerHTML=(X.stories.length?`<div class="stgrid">${X.stories.map(stHtml).join('')}</div>`:'<div class="miss">এই ব্যাচের কেউ এখনো কার্ড বানায়নি। প্রথম কার্ডটি আপনিই বানান!</div>')+(X.stMissing>0&&X.stories.length?`<p class="count" style="text-align:center;margin-top:12px">আরও ${bn(X.stMissing)} জন সদস্য এখনো কার্ড বানায়নি।</p>`:'');
}
function drawStForm(){
  const box=document.getElementById('stFormBox'); if(!box) return;
  if(!X.stEdit){ box.innerHTML=''; return; }
  const m=X.stMine||{};
  box.innerHTML=`<div class="lfform" style="margin-top:10px">
  <div class="exrow"><label class="exl" for="sH">শখ (কমা দিয়ে আলাদা করুন)</label><input class="fld" id="sH" maxlength="100" value="${esc(m.hobby||'')}" placeholder="যেমন: গান, ক্রিকেট, বই পড়া"></div>
  <div class="exrow"><label class="exl" for="sD">স্বপ্ন</label><input class="fld" id="sD" maxlength="200" value="${esc(m.dream||'')}" placeholder="ভবিষ্যতে কী হতে চান বা কী করতে চান"></div>
  <div class="exrow"><label class="exl" for="sC">প্রিয় কোর্স</label><select class="fld" id="sC"><option value="">বাছুন</option>${Object.keys(CM).map(c=>`<option value="${esc(c)}" ${m.course===c?'selected':''}>${esc(CM[c].n)}</option>`).join('')}</select></div>
  <div class="exrow"><label class="exl" for="sJ">সাস্টে আসার জার্নি (অ্যাডমিশনের struggle থেকে শুরু)</label><textarea class="fld" id="sJ" rows="5" maxlength="2000" placeholder="প্রস্তুতি কেমন ছিল, কী কী কষ্ট করেছেন, কীভাবে সাস্টে চান্স পেলেন…">${esc(m.journey||'')}</textarea></div>
  <div class="exrow"><label class="exl" for="sF">প্রথম সাস্টে আসার অনুভূতি</label><textarea class="fld" id="sF" rows="3" maxlength="1000" placeholder="ক্যাম্পাসে প্রথম পা রাখার দিন কেমন লেগেছিল?">${esc(m.feeling||'')}</textarea></div>
  <label class="chk"><input type="checkbox" id="sHide" ${m.feelingHidden?'checked':''}> অনুভূতি লুকিয়ে রাখুন (তাহলে শুধু আমি দেখব; না চাপলে সবাই দেখতে পাবে)</label>
  <div class="frow"><button class="btn ink" id="stSave">সেভ করুন</button>${m.id?'<button class="btn ghost" id="stMyDel">কার্ড মুছুন</button>':''}</div></div>`;
}

/* --- ইভেন্ট (নতুন সেকশনের) --- */
mount.addEventListener('click',e=>{
  const t=e.target,c=s=>t.closest(s); let el;
  if(c('#lfNew')){X.lfForm=!X.lfForm;X.photos=[];X.kindNew='lost';document.getElementById('lfFormBox').innerHTML=X.lfForm?lfFormHtml():'';c('#lfNew').textContent=X.lfForm?'বন্ধ করুন':'+ নতুন পোস্ট';return;}
  if((el=c('[data-lfk]'))){X.kindNew=el.dataset.lfk;mount.querySelectorAll('[data-lfk]').forEach(b=>b.setAttribute('aria-selected',b.dataset.lfk===X.kindNew));return;}
  if((el=c('[data-lff]'))){X.lfKind=el.dataset.lff;X.lfNext=0;mount.querySelectorAll('[data-lff]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.lff===X.lfKind));loadLF(true);return;}
  if((el=c('[data-phrm]'))){X.photos.splice(+el.dataset.phrm,1);document.getElementById('lfPrev').innerHTML=prevHtml();return;}
  if(c('#lfGo')){guard(async()=>{const b=document.getElementById('lfGo'),v=id=>document.getElementById(id).value;b.disabled=true;try{await api('POST','/api/c/lf',{kind:X.kindNew,title:v('lfT'),text:v('lfD'),place:v('lfP'),when:v('lfW'),contact:v('lfC'),photos:X.photos});X.lfForm=false;X.photos=[];X.lfKind='all';toast('পোস্ট হয়েছে');renderLF(document.getElementById('cBody'));}finally{b.disabled=false;}});return;}
  if(c('#lfMoreBtn')){loadLF(false);return;}
  if((el=c('[data-lfres]'))){guard(async()=>{const x=await api('POST','/api/c/lf/'+el.dataset.lfres+'/status',{});toast(x.status==='resolved'?'সমাধান হিসেবে মার্ক হয়েছে':'আবার খোলা হয়েছে');loadLF(true);});return;}
  if((el=c('[data-lfdel]'))){if(!confirm('পোস্টটি মুছবেন?'))return;guard(async()=>{await api('DELETE','/api/c/lf/'+el.dataset.lfdel);X.lf=X.lf.filter(x=>x.id!==+el.dataset.lfdel);drawLF();});return;}
  if((el=c('[data-lfclaim]'))){const note=prompt('পোস্টদাতাকে একটি বার্তা লিখুন (ফোন নম্বর বা কোথায় দেখা করবেন)');if(note===null)return;guard(async()=>{await api('POST','/api/c/lf/'+el.dataset.lfclaim+'/claim',{note});toast('পোস্টদাতাকে জানানো হয়েছে');});return;}
  if(c('#stNew')){X.stEdit=!X.stEdit;c('#stNew').textContent=X.stEdit?'বন্ধ করুন':'✏️ আমার কার্ড';drawStForm();return;}
  if(c('#stSave')){guard(async()=>{const b=document.getElementById('stSave'),v=id=>document.getElementById(id).value;b.disabled=true;try{X.stMine=await api('PUT','/api/c/story',{hobby:v('sH'),dream:v('sD'),course:v('sC'),journey:v('sJ'),feeling:v('sF'),hideFeeling:document.getElementById('sHide').checked});X.stEdit=false;X.stBatch=st.me.batch;toast('কার্ড সেভ হয়েছে');renderStory(document.getElementById('cBody'));}finally{b.disabled=false;}});return;}
  if(c('#stMyDel')){if(!confirm('আপনার কার্ডটি মুছবেন?'))return;guard(async()=>{await api('DELETE','/api/c/story');X.stMine=null;X.stEdit=false;renderStory(document.getElementById('cBody'));});return;}
  if((el=c('[data-stopen]'))){const id=+el.dataset.stopen;X.stOpen[id]=!X.stOpen[id];const s=X.stories.find(x=>x.id===id);if(s)swap('st-'+id,stHtml(s));return;}
  if((el=c('[data-stlk]'))){guard(async()=>{const s=await api('POST','/api/c/stories/'+el.dataset.stlk+'/like',{});const i=X.stories.findIndex(x=>x.id===s.id);if(i>=0)X.stories[i]=s;swap('st-'+s.id,stHtml(s));});return;}
  if((el=c('[data-stdel]'))){if(!confirm('এই কার্ডটি মুছবেন?'))return;guard(async()=>{await api('DELETE','/api/c/stories/'+el.dataset.stdel);loadStories();});return;}
});
mount.addEventListener('input',e=>{ if(e.target.id==='lfQ'){X.lfq=e.target.value;debounce(()=>{X.lfNext=0;loadLF(true);});} });
mount.addEventListener('change',e=>{
  if(e.target.id==='stB'){X.stBatch=e.target.value;loadStories();}
  else if(e.target.id==='lfPh'){const files=[...e.target.files];e.target.value='';guard(async()=>{for(const f of files){if(X.photos.length>=3){toast('সর্বোচ্চ ৩টি ছবি');break;}X.photos.push(await shrinkPhoto(f));}const p=document.getElementById('lfPrev');if(p)p.innerHTML=prevHtml();});}
});
boot();
};
