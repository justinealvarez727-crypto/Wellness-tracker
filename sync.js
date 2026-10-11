/* Login + cloud sync (Supabase). Configure in config.js; setup steps in SETUP-SYNC.md.
   Model: one private row per account { data, rev }. A device pushes its changes a few seconds after they happen
   and pulls on open / focus / reconnect. If two devices changed at once the data is merged. */
(function(){
const CFG=window.SYNC_CONFIG||{},ON=!!(CFG.url&&CFG.anonKey&&window.supabase&&window.supabase.createClient);
const MK="nt1_sync",KEEP=["theme","lastBk","photos"];
let meta={};try{meta=JSON.parse(localStorage.getItem(MK))||{}}catch(e){}
const saveMeta=()=>{try{localStorage.setItem(MK,JSON.stringify(meta))}catch(e){}};
let sb=null,user=null,status=ON?"out":"off",errMsg="",busy=false,again=false,timer=null,pendingReload=false,onChange=null;
if(ON){try{sb=window.supabase.createClient(CFG.url,CFG.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}})}catch(e){status="off";errMsg=String(e&&e.message||e)}}
const hm=t=>new Date(t).toLocaleTimeString("en",{hour:"numeric",minute:"2-digit"});
const setSt=(s,m)=>{status=s;errMsg=m||"";if(onChange)try{onChange()}catch(e){}};
const clone=o=>JSON.parse(JSON.stringify(o));

/* what goes to the cloud: everything except photos (kept per device) and local bookkeeping */
function strip(s){const c=clone(s);delete c.photos;delete c._m;delete c.lastBk;(c.meals||[]).forEach(m=>{delete m.img});(c.custom||[]).forEach(x=>{delete x.img;delete x.imgs});return c}
function hasData(s){return !!((s.meals||[]).length||Object.keys(s.water||{}).length||Object.keys(s.steps||{}).length||Object.keys((s.wt||{}).log||{}).length||((s.wk||{}).h||[]).length||(s.rec||[]).length||(s.pan||[]).length||(s.ing||[]).length||(s.custom||[]).length)}

/* put cloud data into this device (in place, so modules holding S keep working) */
function applyCloud(cd){const keep={};KEEP.forEach(k=>{if(S[k]!==undefined)keep[k]=S[k]});const mi={},ci={};(S.meals||[]).forEach(m=>{if(m.img)mi[m.id]=m.img});(S.custom||[]).forEach(x=>{if(x.img||x.imgs)ci[x.n]={img:x.img,imgs:x.imgs}});
Object.keys(S).forEach(k=>delete S[k]);Object.assign(S,clone(cd),keep);(S.meals||[]).forEach(m=>{if(mi[m.id])m.img=mi[m.id]});(S.custom||[]).forEach(x=>{if(ci[x.n])Object.assign(x,ci[x.n])});
S._m=Date.now();try{localStorage.setItem(K,JSON.stringify(S))}catch(e){}pendingReload=true;reloadWhenIdle()}
function mergeIn(cd){const m=window.mergeData?window.mergeData(clone(S),cd):null;if(!m)return;const keep={};KEEP.forEach(k=>{if(S[k]!==undefined)keep[k]=S[k]});Object.keys(S).forEach(k=>delete S[k]);Object.assign(S,m,keep);S._m=Date.now();try{localStorage.setItem(K,JSON.stringify(S))}catch(e){}pendingReload=true;reloadWhenIdle()}

/* modules read some state only at load, so reload once nothing is open */
function idle(){const sh=document.getElementById("sh");if(sh&&sh.className.indexOf("on")>-1)return false;return![...document.body.children].some(e=>e.tagName=="DIV"&&e.style&&e.style.position=="fixed"&&e.style.display=="block"&&e.id!="sh")}
function reloadWhenIdle(){if(!pendingReload)return;if(idle()){pendingReload=false;location.reload()}else setTimeout(reloadWhenIdle,2500)}

async function push(expected){const snap=S._m||0,rev=Math.max(Date.now(),(expected||0)+1),data=strip(S);
 if(expected==null){const{error}=await sb.from("user_data").insert({user_id:user.id,data,rev});if(error){if(error.code=="23505"){again=true;return false}throw error}}
 else{const{data:u,error}=await sb.from("user_data").update({data,rev,updated_at:new Date().toISOString()}).eq("user_id",user.id).eq("rev",expected).select("rev");if(error)throw error;if(!u||!u.length){again=true;return false}}
 meta.uid=user.id;meta.cloudRev=rev;meta.syncedM=snap;saveMeta();return true}

function firstLink(row){return new Promise(res=>{
 const done=async(fn)=>{try{await fn()}catch(e){setSt(navigator.onLine?"error":"offline",e.message||String(e))}res()};
 if(!hasData(S)){applyCloud(row.data);meta.uid=user.id;meta.cloudRev=row.rev;meta.syncedM=S._m;saveMeta();setSt("idle");return res()}
 sheet(`<h2>Combine your data?</h2><p>This device and your account both have data. How should they be combined?</p><button class="go" id="s1">Merge both (recommended)</button><button class="go l" id="s2">Use my account's data · replace this device</button><button class="go l" id="s3" style="color:var(--bad)">Use this device's data · replace the account</button><button class="go l" id="s4">Not now · sign out</button>`);
 $("#s1").onclick=()=>{cl();done(async()=>{mergeIn(row.data);meta.uid=user.id;meta.cloudRev=row.rev;meta.syncedM=0;saveMeta();await push(row.rev);setSt("idle")})};
 $("#s2").onclick=()=>{cl();done(async()=>{applyCloud(row.data);meta.uid=user.id;meta.cloudRev=row.rev;meta.syncedM=S._m;saveMeta();setSt("idle")})};
 $("#s3").onclick=()=>{cl();done(async()=>{meta.uid=user.id;saveMeta();await push(row.rev);setSt("idle")})};
 $("#s4").onclick=()=>{cl();done(async()=>{await signOut()})}})}

async function sync(){if(!ON||!sb||!user)return;if(busy){again=true;return}busy=true;setSt("busy");
 try{
  const{data:row,error}=await sb.from("user_data").select("data,rev").eq("user_id",user.id).maybeSingle();if(error)throw error;
  const dirty=(S._m||0)>(meta.syncedM||0);
  if(!row){await push(null)}
  else if(meta.uid!==user.id){await firstLink(row)}
  else if(row.rev>(meta.cloudRev||0)){if(!dirty){applyCloud(row.data);meta.cloudRev=row.rev;meta.syncedM=S._m;saveMeta()}else{mergeIn(row.data);meta.cloudRev=row.rev;saveMeta();await push(row.rev)}}
  else if(dirty){await push(row.rev)}
  meta.at=Date.now();saveMeta();if(status!="error")setSt("idle")
 }catch(e){setSt(navigator.onLine?"error":"offline",(e&&e.message)||String(e))}
 busy=false;if(again){again=false;queue(600)}}
function queue(ms){clearTimeout(timer);timer=setTimeout(sync,ms==null?2500:ms)}
window.syncPush=()=>{if(ON&&user)queue(2500)};
window.syncLabel=()=>{if(status=="off")return "Not set up yet · tap for steps";if(!user)return "Sign in to sync across devices";const t=meta.at?" · "+hm(meta.at):"";return({busy:"Syncing…",idle:"Synced"+t,offline:"Offline · will sync when back",error:"Couldn't sync · tap for details",out:"Signed in"})[status]+" · "+(user.email||"")};

async function signOut(){try{await sb.auth.signOut()}catch(e){}user=null;meta={};saveMeta();setSt("out")}

/* ---------- sheet ---------- */
const E=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function openSync(cb){onChange=cb||null;panel()}
window.openSync=openSync;
function panel(msg,mode){
 if(status=="off"){sheet(`<h2>Account &amp; sync</h2><p>Cloud sync isn't turned on yet. It takes about 10 minutes and uses a free Supabase project; the steps are in <b>SETUP-SYNC.md</b> in your project folder. Everything else in the app keeps working on this device.</p>${errMsg?`<p style="color:var(--bad)">${E(errMsg)}</p>`:""}<button class="go" id="x">OK</button>`);$("#x").onclick=cl;return}
 if(user){
  const st=({busy:"Syncing…",idle:"Up to date"+(meta.at?" · "+hm(meta.at):""),offline:"Offline · will sync when you're back online",error:"Couldn't sync"})[status]||"Signed in";
  sheet(`<h2>Account &amp; sync</h2><p>Signed in as <b style="color:var(--ink)">${E(user.email||"")}</b></p><div class="mc" style="margin-bottom:6px"><small style="color:var(--mut)">STATUS</small><div style="font-size:17px;font-weight:600;margin-top:4px;color:${status=="error"?"var(--bad)":"var(--ink)"}">${st}</div>${errMsg?`<small style="display:block;color:var(--bad);margin-top:6px;overflow-wrap:anywhere">${E(errMsg)}</small>`:""}</div><p style="font-size:13px">Your data syncs automatically. Photos stay on the device they were added on.</p><button class="go" id="sn">Sync now</button><button class="go l" id="so" style="color:var(--bad)">Sign out</button><button class="go l" id="x">Close</button>`);
  $("#x").onclick=cl;$("#sn").onclick=async()=>{$("#sn").textContent="Syncing…";await sync();panel()};$("#so").onclick=async()=>{await signOut();panel("Signed out. Your data stays on this device.")};return}
 sheet(`<h2>${mode=="up"?"Create account":"Sign in"}</h2><p>${msg?E(msg):"Sync your data across your phone and computer."}</p><label style="font-size:13px;color:var(--mut)">Email<input id="em" type="email" autocomplete="email" inputmode="email" placeholder="you@example.com"></label><label style="display:block;font-size:13px;color:var(--mut);margin-top:8px">Password<input id="pw" type="password" autocomplete="${mode=="up"?"new-password":"current-password"}" placeholder="${mode=="up"?"At least 6 characters":"Your password"}"></label><p id="er" style="color:var(--bad);margin:8px 0 0;min-height:18px"></p><button class="go" id="go">${mode=="up"?"Create account":"Sign in"}</button><button class="go l" id="sw">${mode=="up"?"I already have an account":"Create a new account"}</button>${mode=="up"?"":'<button id="fg" style="display:block;margin:12px auto 0;color:var(--mut);font-size:14px">Forgot password?</button>'}<button class="go l" id="x">Close</button>`);
 const er=t=>{$("#er").textContent=t},val=()=>({e:$("#em").value.trim(),p:$("#pw").value});
 $("#x").onclick=cl;$("#sw").onclick=()=>panel("",mode=="up"?"in":"up");
 const go=async()=>{const{e,p}=val();if(!e||!p)return er("Enter your email and password.");if(mode=="up"&&p.length<6)return er("Use at least 6 characters.");$("#go").disabled=true;$("#go").textContent="Please wait…";
  try{const r=mode=="up"?await sb.auth.signUp({email:e,password:p}):await sb.auth.signInWithPassword({email:e,password:p});
   if(r.error)throw r.error;
   if(mode=="up"&&!r.data.session){panel("Account created. Check your email to confirm it, then sign in.","in");return}
   cl()}catch(x){er(friendly(x));$("#go").disabled=false;$("#go").textContent=mode=="up"?"Create account":"Sign in"}};
 $("#go").onclick=go;$("#pw").onkeydown=ev=>{if(ev.key=="Enter")go()};
 const fg=$("#fg");if(fg)fg.onclick=async()=>{const{e}=val();if(!e)return er("Enter your email above first.");try{const r=await sb.auth.resetPasswordForEmail(e,{redirectTo:location.origin});if(r.error)throw r.error;panel("If that email has an account, a reset link is on its way.","in")}catch(x){er(friendly(x))}}}
function friendly(x){const m=(x&&x.message)||String(x);if(/invalid login/i.test(m))return"Wrong email or password.";if(/already registered|already been registered/i.test(m))return"That email already has an account. Try signing in.";if(/rate limit/i.test(m))return"Too many attempts. Wait a bit and try again.";if(/fetch|network/i.test(m))return"Can't reach the server. Check your connection.";return m}
function recovery(){sheet(`<h2>Set a new password</h2><p>Choose a password for your account.</p><input id="np" type="password" autocomplete="new-password" placeholder="At least 6 characters"><p id="er" style="color:var(--bad);margin:8px 0 0;min-height:18px"></p><button class="go" id="go">Save password</button>`);
 $("#go").onclick=async()=>{const p=$("#np").value;if(p.length<6){$("#er").textContent="Use at least 6 characters.";return}try{const r=await sb.auth.updateUser({password:p});if(r.error)throw r.error;cl()}catch(x){$("#er").textContent=friendly(x)}}}

/* ---------- start ---------- */
if(ON&&sb){
 sb.auth.onAuthStateChange((ev,session)=>{setTimeout(()=>{const was=user&&user.id;user=session&&session.user||null;
  if(ev=="PASSWORD_RECOVERY"){recovery();return}
  if(user){if(status=="out")setSt("busy");if(ev=="SIGNED_IN"||ev=="INITIAL_SESSION"||was!==user.id)sync()}else if(ev=="SIGNED_OUT"||ev=="INITIAL_SESSION"){setSt("out")}
  if(onChange)try{onChange()}catch(e){}},0)});
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)sync()});window.addEventListener("online",()=>sync());
 setInterval(()=>{if(!document.hidden)sync()},60000);
}
})();
