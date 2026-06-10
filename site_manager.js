// ── PWA ───────────────────────────────────────────────────────────────
/*
════════════════════════════════════════════════
  SITE MANAGER — CODE MAP  (Ctrl+F the tag)
════════════════════════════════════════════════
  §PWA          Line ~163  Service worker, manifest, install banner
  §STATE        Line ~174  siteMeta, state, BLANK_SITE, date vars
  §STORAGE      Line ~195  loadData, saveData, switchSite, site bar
  §UTILS        Line ~258  gid, fmtInr, fmtDate, fmtMonth
  §CALC         Line ~263  calcWages, calcOT, calcAdvance, calcEarned
  §ALERTS       Line ~318  getAlerts (streak, advance overflow)
  §SUMMARY      Line ~341  updateSummary (top 4 tiles)
  §TABS         Line ~356  setTab, render, renderContent
  §BADGES       Line ~383  badgeHTML, rateTypeBadge, payMethodBadge
  §WHATSAPP     Line ~400  whatsappExport (site daily report)
  §WORKERS      Line ~431  renderWorkers, markAllPresent
  §OT           Line ~512  openOTModal, submitOT, removeOT
  §WORKERDETAIL Line ~559  openWorkerDetail, selPayMethod, recordSalaryPayment
  §TASKS        Line ~673  renderTasks, attachTaskPhoto, viewPhoto
  §DIARY        Line ~752  renderDiary, setWeather, saveDiaryEntry
  §FINANCE      Line ~802  renderFinance, setMonthFilter, viewExpPhoto
  §MORE         Line ~880  renderMore (Site Planner + Advance + Quick Actions)
  §PLANNER      Line ~1174 workItemForm, submitWorkItem, deadlineBadge
  §SKILLS       Line ~1249 toggleSkill, _selectedSkills
  §WAGESLIP     Line ~1257 sendWageSlip (WhatsApp per-worker)
  §DEADLINE     Line ~1296 deadlineBadge, openDeadlineModal, saveDeadline
  §MODALS       Line ~1334 openModal, closeModal
  §WORKERFORM   Line ~1353 workerForm, previewPhoto, selRateType, submitWorker
  §TASKFORM     Line ~1431 taskForm, toggleTaskWorker, submitTask
  §ADVANCEFORM  Line ~1476 advanceForm, submitAdvance
  §EXPENSEFORM  Line ~1500 expenseForm, previewExpPhoto, submitMyExpense
  §DRIVE        Line ~1548 connectGoogleDrive, exportToDrive, importFromDrive
  §EXCEL        Line ~1681 exportExcel (SheetJS .xlsx, 4 sheets)
════════════════════════════════════════════════
  TO ADD NEW FEATURE:
  1. Add render logic in relevant render* function
  2. Add form in §MODALS section
  3. Add submit/CRUD functions after form
  4. Update state in BLANK_SITE() at §STATE
  5. Update this map above
════════════════════════════════════════════════
*/
const manifestData={name:"Construction Site Manager",short_name:"Site Manager",description:"Track workers, attendance, tasks & advances",start_url:"./",display:"standalone",background_color:"#1c1c1e",theme_color:"#1c1c1e",orientation:"portrait",icons:[{src:"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'%3E%3Crect width='192' height='192' rx='32' fill='%231c1c1e'/%3E%3Ctext x='96' y='130' font-size='100' text-anchor='middle' fill='%23E8921A'%3E%F0%9F%8F%97%3C/text%3E%3C/svg%3E",sizes:"192x192",type:"image/svg+xml"}]};
const manifestBlob=new Blob([JSON.stringify(manifestData)],{type:'application/json'});
document.getElementById('manifest-placeholder').setAttribute('href',URL.createObjectURL(manifestBlob));
const swCode=`const CACHE='site-mgr-v5';self.addEventListener('install',e=>{self.skipWaiting();});self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});self.addEventListener('fetch',e=>{e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));});`;
if('serviceWorker' in navigator){const b=new Blob([swCode],{type:'application/javascript'});navigator.serviceWorker.register(URL.createObjectURL(b),{scope:'./'}).catch(()=>{});}
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;document.getElementById('install-banner').style.display='flex';});
function installApp(){if(deferredPrompt){deferredPrompt.prompt();deferredPrompt.userChoice.then(()=>{deferredPrompt=null;document.getElementById('install-banner').style.display='none';});}}
window.addEventListener('appinstalled',()=>{document.getElementById('install-banner').style.display='none';});

// ── State ─────────────────────────────────────────────────────────────
const TODAY=new Date().toISOString().split('T')[0];
const META_KEY='site_mgr_meta'; // sites list + active site
const SITE_KEY_PREFIX='site_mgr_site_'; // per-site data
const BLANK_SITE=()=>({workers:[],attendance:{},tasks:[],advances:[],salaryPayments:[],overtime:[],myExpenses:[],diary:{},workItems:[]});
let siteMeta={sites:[{id:'default',name:'Site 1'}],activeSiteId:'default'};
let state=BLANK_SITE();
let curTab='workers';
let wRateType='perday';
let payMethodChoice='cash';
let SELDATE=TODAY;
let finMonthFilter='';
// Google Drive OAuth
let driveAccessToken=null;
let driveUserEmail=null;

function initDatePicker(){const el=document.getElementById('sel-date');el.value=SELDATE;el.max=TODAY;}
function onDateChange(){SELDATE=document.getElementById('sel-date').value||TODAY;render();}
function resetToday(){SELDATE=TODAY;document.getElementById('sel-date').value=TODAY;render();}
function selDateAtt(){return state.attendance[SELDATE]||{};}

function getSiteKey(siteId){return SITE_KEY_PREFIX+(siteId||siteMeta.activeSiteId);}
function loadData(){
  try{
    const m=localStorage.getItem(META_KEY);
    if(m)siteMeta={...siteMeta,...JSON.parse(m)};
    // ensure at least one site
    if(!siteMeta.sites||!siteMeta.sites.length){siteMeta.sites=[{id:'default',name:'Site 1'}];siteMeta.activeSiteId='default';}
    // migrate old flat data into default site if new structure
    const siteKey=getSiteKey();
    const sd=localStorage.getItem(siteKey);
    if(sd){state={...BLANK_SITE(),...JSON.parse(sd)};}
    else{
      // try old key migration
      const old=localStorage.getItem('site_mgr_v7')||localStorage.getItem('site_mgr_v6');
      if(old){state={...BLANK_SITE(),...JSON.parse(old)};saveData();}
      else{state=BLANK_SITE();}
    }
  }catch(e){state=BLANK_SITE();}
  initDatePicker();renderSiteBar();render();
}
function saveData(){
  try{
    localStorage.setItem(getSiteKey(),JSON.stringify(state));
    localStorage.setItem(META_KEY,JSON.stringify(siteMeta));
  }catch{}
}
function switchSite(siteId){
  siteMeta.activeSiteId=siteId;
  const sd=localStorage.getItem(getSiteKey(siteId));
  state=sd?{...BLANK_SITE(),...JSON.parse(sd)}:BLANK_SITE();
  localStorage.setItem(META_KEY,JSON.stringify(siteMeta));
  renderSiteBar();render();
}
function renderSiteBar(){
  const bar=document.getElementById('site-bar');if(!bar)return;
  const chips=siteMeta.sites.map(s=>`<button class="site-chip${s.id===siteMeta.activeSiteId?' active':''}" onclick="switchSite('${s.id}')">${s.name}</button>`).join('');
  bar.innerHTML=chips+`<button class="site-add-btn" onclick="openAddSiteModal()">+ New Site</button>`;
}
function openAddSiteModal(){
  const o=document.getElementById('overlay');o.style.display='flex';
  o.innerHTML=`<div class="sheet" onclick="event.stopPropagation()">
    <div class="sheet-hdr"><p class="sheet-title">🏗️ New Site</p><button onclick="closeModal()" style="background:none;border:none;cursor:pointer;color:#888;font-size:26px;line-height:1">×</button></div>
    <p class="sec-label">Site Name</p>
    <input class="inp" id="new-site-name" placeholder="e.g. Goa Project, Shop No. 3" autocomplete="off"/>
    <button class="submit-btn" onclick="addNewSite()">Create Site ✓</button>
    ${siteMeta.sites.length>1?`<div style="margin-top:16px"><p class="fin-section-title" style="margin-bottom:8px">Existing Sites</p>${siteMeta.sites.map(s=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f0"><span style="font-size:14px;font-weight:600">${s.name}</span>${s.id!==siteMeta.activeSiteId?`<button onclick="deleteSite('${s.id}')" style="font-size:12px;color:#dc2626;border:1px solid #fca5a5;background:#fef2f2;border-radius:6px;padding:4px 10px;cursor:pointer;font-family:inherit">Delete</button>`:'<span style="font-size:11px;color:#E8921A;font-weight:700">Active</span>'}</div>`).join('')}</div>`:''}
  </div>`;
}
function addNewSite(){
  const name=document.getElementById('new-site-name').value.trim();
  if(!name)return alert('Site name daalo!');
  const id='site_'+gid();
  siteMeta.sites.push({id,name});
  localStorage.setItem(META_KEY,JSON.stringify(siteMeta));
  closeModal();switchSite(id);
}
function deleteSite(sid){
  if(!confirm('Delete this site and all its data?'))return;
  localStorage.removeItem(getSiteKey(sid));
  siteMeta.sites=siteMeta.sites.filter(s=>s.id!==sid);
  localStorage.setItem(META_KEY,JSON.stringify(siteMeta));
  closeModal();renderSiteBar();render();
}
function gid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,5);}
function fmtInr(n){return '₹'+Math.round(n).toLocaleString('en-IN');}
function fmtDate(d){if(!d)return '';const[y,m,dd]=d.split('-');return `${dd} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m-1]}`;}
function fmtMonth(ym){if(!ym)return '';const[y,m]=ym.split('-');return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m-1]} ${y}`;}

// ── Calculations ──────────────────────────────────────────────────────
function calcWorkedDays(w){
  let full=0,half=0;
  Object.values(state.attendance).forEach(day=>{
    const a=day[w.id];
    if(a==='full'||a==='present')full++;
    else if(a==='half')half++;
  });
  return {full,half,total:full+half*0.5};
}
function calcWages(w){
  if(w.rateType==='perpiece'){
    // piece rate: sum from tasks done by worker
    const doneQty=(state.tasks||[]).filter(t=>t.assignedTo===w.id&&t.status==='done'&&t.pieceQty)
      .reduce((s,t)=>s+Number(t.pieceQty||0),0);
    return doneQty*Number(w.rate);
  }
  const {full,half}=calcWorkedDays(w);
  return full*Number(w.rate)+half*Number(w.rate)/2;
}
function calcOT(wid){
  return (state.overtime||[]).filter(o=>o.workerId===wid).reduce((s,o)=>{
    const w=state.workers.find(x=>x.id===wid);
    return s+(w&&w.rateType!=='perpiece'?Number(o.hours)*(Number(w.rate)/8)*1.5:0);
  },0);
}
function calcAdvance(wid){return (state.advances||[]).filter(a=>a.workerId===wid).reduce((s,a)=>s+Number(a.amount),0);}
function calcSalaryPaid(wid){return (state.salaryPayments||[]).filter(p=>p.workerId===wid).reduce((s,p)=>s+Number(p.amount),0);}
function calcMyExpensesTotal(monthFilter){
  return (state.myExpenses||[]).filter(e=>!monthFilter||e.date.startsWith(monthFilter)).reduce((s,e)=>s+Number(e.amount),0);
}
function calcTotalEarned(w){return calcWages(w)+calcOT(w.id);}
function getWorkerAttLog(w){
  const log=[];
  Object.entries(state.attendance).forEach(([date,day])=>{
    const a=day[w.id];
    if(a&&a!=='absent'){
      const base=a==='full'?Number(w.rate):Number(w.rate)/2;
      const ot=(state.overtime||[]).filter(o=>o.workerId===w.id&&o.date===date).reduce((s,o)=>s+Number(o.hours)*(Number(w.rate)/8)*1.5,0);
      log.push({date,status:a,earned:base,ot});
    }
  });
  return log.sort((a,b)=>b.date.localeCompare(a.date));
}

// ── Month options helper ──────────────────────────────────────────────
function getMonthOptions(){
  const months=new Set();
  (state.salaryPayments||[]).forEach(p=>months.add(p.date.slice(0,7)));
  (state.myExpenses||[]).forEach(e=>months.add(e.date.slice(0,7)));
  Object.keys(state.attendance||{}).forEach(d=>months.add(d.slice(0,7)));
  const arr=[...months].sort().reverse();
  return arr;
}

// ── Smart Alerts ──────────────────────────────────────────────────────
function getAlerts(){
  const alerts=[];
  state.workers.forEach(w=>{
    let consec=0;
    const d=new Date(TODAY);
    for(let i=0;i<7;i++){
      const ds=d.toISOString().split('T')[0];
      const att=(state.attendance[ds]||{})[w.id]||'absent';
      if(att==='absent')consec++;else break;
      d.setDate(d.getDate()-1);
    }
    if(consec>=3)alerts.push(`⚠️ ${w.name} absent ${consec} days in a row`);
    const adv=calcAdvance(w.id);
    const wages=calcWages(w);
    if(wages>0&&adv>wages*0.5)alerts.push(`💸 ${w.name}'s advance exceeds 50% of wages`);
    const lastPay=(state.salaryPayments||[]).filter(p=>p.workerId===w.id).sort((a,b)=>b.date.localeCompare(a.date))[0];
    if(!lastPay&&wages>0){const days=Math.floor((new Date(TODAY)-new Date(w.joinedOn||TODAY))/(86400000));if(days>=7)alerts.push(`🔔 ${w.name}: salary not paid yet (${days}d)`);}
    else if(lastPay){const days=Math.floor((new Date(TODAY)-new Date(lastPay.date))/(86400000));if(days>=7&&calcTotalEarned(w)-calcAdvance(w.id)-calcSalaryPaid(w.id)>0)alerts.push(`🔔 ${w.name}: last payment ${days} days ago`);}
  });
  return alerts;
}

// ── Summary ───────────────────────────────────────────────────────────
function updateSummary(){
  const att=selDateAtt();
  const p=Object.values(att).filter(v=>v==='full'||v==='present').length;
  const h=Object.values(att).filter(v=>v==='half').length;
  const totalWages=state.workers.reduce((s,w)=>s+calcTotalEarned(w),0);
  const totalPaid=(state.salaryPayments||[]).reduce((s,p)=>s+Number(p.amount),0);
  const totalAdv=(state.advances||[]).reduce((s,a)=>s+Number(a.amount),0);
  const isToday=SELDATE===TODAY;
  document.getElementById('s-present').textContent=`${p+h}/${state.workers.length}${isToday?'':' ('+fmtDate(SELDATE)+')'}`;
  document.getElementById('s-wages').textContent=fmtInr(totalWages);
  document.getElementById('s-paid').textContent=fmtInr(totalPaid);
  document.getElementById('s-expenses').textContent=fmtInr(totalWages+totalAdv+calcMyExpensesTotal());
}

// ── Tabs ──────────────────────────────────────────────────────────────
function setTab(t){
  curTab=t;
  ['workers','tasks','diary','finance','more'].forEach(x=>{
    const btn=document.getElementById('tab-'+x);
    if(!btn)return;
    const active=x===t;
    btn.querySelector('i').style.color=active?'#E8921A':'#888';
    const sp=btn.querySelector('span');sp.style.color=active?'#E8921A':'#888';sp.style.fontWeight=active?'600':'400';
  });
  const titles={workers:'Workers & Attendance',tasks:'Task Assignment',diary:'Site Diary',finance:'Finance Overview',more:'More'};
  document.getElementById('hdr-title').textContent=titles[t]||t;
  const showDate=['workers','tasks','diary'].includes(t);
  document.getElementById('date-strip').style.display=showDate?'flex':'none';
  renderContent();
}
function render(){updateSummary();renderContent();}

function renderContent(){
  const c=document.getElementById('content');
  if(curTab==='workers')c.innerHTML=renderWorkers();
  else if(curTab==='tasks')c.innerHTML=renderTasks();
  else if(curTab==='diary')c.innerHTML=renderDiary();
  else if(curTab==='finance')c.innerHTML=renderFinance();
  else c.innerHTML=renderMore();
}

// ── Badge ─────────────────────────────────────────────────────────────
function badgeHTML(type){
  return type==='karigar'
    ?'<span class="badge" style="background:#fff3e0;color:#c97010">Karigar</span>'
    :'<span class="badge" style="background:#e3f2fd;color:#1565c0">Labour</span>';
}
function rateTypeBadge(rt){
  return rt==='perpiece'
    ?'<span class="rate-badge" style="background:#fce7f3;color:#be185d">Per Piece</span>'
    :'<span class="rate-badge" style="background:#f0fdf4;color:#166534">Per Day</span>';
}
function payMethodBadge(m){
  const map={cash:{bg:'#f0fdf4',c:'#166534',l:'Cash'},upi:{bg:'#eff6ff',c:'#1d4ed8',l:'UPI'},bank:{bg:'#faf5ff',c:'#7c3aed',l:'Bank'}};
  const s=map[m]||map.cash;
  return `<span class="badge" style="background:${s.bg};color:${s.c}">${s.l}</span>`;
}

// ── WhatsApp Export ───────────────────────────────────────────────────
function whatsappExport(){
  const att=selDateAtt();
  const present=state.workers.filter(w=>{const a=att[w.id]||'absent';return a==='full'||a==='half';});
  const absent=state.workers.filter(w=>(att[w.id]||'absent')==='absent');
  const half=state.workers.filter(w=>(att[w.id]||'absent')==='half');
  const totalWages=state.workers.reduce((s,w)=>s+calcTotalEarned(w),0);
  const totalPaid=(state.salaryPayments||[]).reduce((s,p)=>s+Number(p.amount),0);
  const totalAdv=(state.advances||[]).reduce((s,a)=>s+Number(a.amount),0);
  const pendingTasks=state.tasks.filter(t=>t.status!=='done').length;
  const dateStr=SELDATE===TODAY?'Today ('+fmtDate(TODAY)+')':fmtDate(SELDATE);
  // diary
  const diary=state.diary[SELDATE];
  let msg=`🏗️ *SITE REPORT — ${dateStr}*\n`;
  msg+=`━━━━━━━━━━━━━━━\n`;
  msg+=`👷 Present: ${present.length}/${state.workers.length}\n`;
  if(half.length)msg+=`🟡 Half Day: ${half.map(w=>w.name).join(', ')}\n`;
  if(absent.length)msg+=`❌ Absent: ${absent.map(w=>w.name).join(', ')}\n`;
  if(diary){msg+=`☁️ Weather: ${diary.weather||'-'}\n`;if(diary.notes)msg+=`📝 Notes: ${diary.notes}\n`;}
  msg+=`━━━━━━━━━━━━━━━\n`;
  msg+=`💰 Wages Earned: ${fmtInr(totalWages)}\n`;
  msg+=`✅ Salary Paid: ${fmtInr(totalPaid)}\n`;
  msg+=`📋 Advance Given: ${fmtInr(totalAdv)}\n`;
  msg+=`🧾 My Expenses: ${fmtInr(calcMyExpensesTotal())}\n`;
  msg+=`🔴 Balance Due: ${fmtInr(Math.max(0,totalWages-totalPaid-totalAdv))}\n`;
  msg+=`━━━━━━━━━━━━━━━\n`;
  msg+=`📌 Tasks Pending: ${pendingTasks}\n`;
  msg+=`_Sent via Site Manager App_`;
  window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');
}

// ── Workers Tab ───────────────────────────────────────────────────────
function renderWorkers(){
  const att=selDateAtt();
  const presentCount=state.workers.filter(w=>{const a=att[w.id]||'absent';return a==='full'||a==='half';}).length;
  const isToday=SELDATE===TODAY;
  const dateLabel=isToday?'Today':fmtDate(SELDATE);
  const alerts=getAlerts();
  const alertsHTML=alerts.map(a=>`<div class="alert-banner"><span>${a}</span></div>`).join('');

  const rows=state.workers.map(w=>{
    const a=att[w.id]||'absent';
    const leftC={full:'#22c55e',half:'#E8921A',absent:'#e5e5e0'}[a];
    const totalEarned=calcTotalEarned(w);
    const adv=calcAdvance(w.id);
    const paid=calcSalaryPaid(w.id);
    const net=totalEarned-adv-paid;
    const {full,half}=calcWorkedDays(w);
    const daysLabel=w.rateType==='perpiece'?'Piece rate':(full+(half>0?`+${half}×½`:'')+' days');
    const otTotal=calcOT(w.id);
    const attBtns=w.rateType==='perpiece'?'<p style="font-size:11px;color:#be185d;margin-top:8px">⚡ Piece rate worker — attendance not tracked</p>':[
      {v:'full',l:'Full',c:'#22c55e'},
      {v:'half',l:'Half',c:'#E8921A'},
      {v:'absent',l:'Absent',c:'#ef4444'}
    ].map(b=>{
      const on=a===b.v;
      return `<button class="att-btn" onclick="toggleAtt('${w.id}','${b.v}')" style="${on?`background:${b.c};color:#fff;border-color:${b.c};font-weight:700`:''}">${b.l}</button>`;
    }).join('');
    const photoHTML=w.photo
      ?`<img src="${w.photo}" class="worker-photo" onclick="openWorkerDetail('${w.id}')" style="cursor:pointer"/>`
      :`<div class="worker-photo-placeholder" onclick="openWorkerDetail('${w.id}')" style="cursor:pointer">👷</div>`;
    return `<div class="card" style="border-left:4px solid ${leftC}">
      <div style="display:flex;gap:10px;align-items:flex-start">
        ${photoHTML}
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div>
              <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">
                <button onclick="openWorkerDetail('${w.id}')" style="background:none;border:none;padding:0;cursor:pointer;font-weight:700;font-size:15px;color:#1a1a1a;text-decoration:underline dotted #aaa">${w.name}</button>
                ${badgeHTML(w.type)}${rateTypeBadge(w.rateType||'perday')}
              </div>
              <p style="font-size:11px;color:#888;margin-top:2px">${fmtInr(w.rate)}/${w.rateType==='perpiece'?'piece':'day'} · ${daysLabel}${otTotal>0?` · OT: ${fmtInr(otTotal)}`:''}</p>
              ${(w.skills&&w.skills.length)?`<div style="margin-top:3px">${w.skills.map(s=>`<span class="skill-tag">${s}</span>`).join('')}</div>`:''}
            </div>
            <div style="display:flex;gap:5px">
              ${w.rateType!=='perpiece'?`<button class="ot-btn" onclick="openOTModal('${w.id}')">+OT</button>`:''}
              <button class="ot-btn" onclick="sendWageSlip('${w.id}')" style="border-color:#25D366;color:#25D366;background:#f0fdf4">📲</button>
              <button class="icon-btn" onclick="removeWorker('${w.id}')"><i class="ti ti-trash" style="font-size:14px"></i></button>
            </div>
          </div>
          <div class="att-btns">${attBtns}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:5px;margin-top:10px">
        <div class="mini-stat"><p class="mini-label">Earned</p><p class="mini-val">${fmtInr(totalEarned)}</p></div>
        <div class="mini-stat"><p class="mini-label">Paid</p><p class="mini-val" style="color:#16a34a">${fmtInr(paid)}</p></div>
        <div class="mini-stat"><p class="mini-label">Advance</p><p class="mini-val" style="color:#ef4444">${fmtInr(adv)}</p></div>
        <div class="mini-stat"><p class="mini-label">Balance</p><p class="mini-val" style="color:${net>=0?'#1a1a1a':'#ef4444'}">${fmtInr(net)}</p></div>
      </div>
    </div>`;
  }).join('');
  const empty=!state.workers.length?`<div class="empty"><i class="ti ti-users"></i><p>No workers added yet</p></div>`:'';
  return `
    ${alertsHTML}
    <div class="row-hdr">
      <p class="row-label">${presentCount}/${state.workers.length} · <strong>${dateLabel}</strong></p>
      <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
        <button class="fab-outline" onclick="markAllPresent()"><i class="ti ti-checks" style="font-size:14px"></i>All Present</button>
        <button class="fab-sm" onclick="whatsappExport()"><i class="ti ti-brand-whatsapp" style="font-size:14px"></i>Share</button>
        <button class="fab" onclick="openModal('worker')"><i class="ti ti-plus" style="font-size:14px"></i>Add</button>
      </div>
    </div>
    ${rows}${empty}`;
}

// ── Bulk Attendance ───────────────────────────────────────────────────
function markAllPresent(){
  if(!state.attendance[SELDATE])state.attendance[SELDATE]={};
  state.workers.filter(w=>w.rateType!=='perpiece').forEach(w=>{state.attendance[SELDATE][w.id]='full';});
  saveData();render();
}

// ── OT Modal ──────────────────────────────────────────────────────────
function openOTModal(wid){
  const w=state.workers.find(x=>x.id===wid);
  const otLog=(state.overtime||[]).filter(o=>o.workerId===wid);
  const logHTML=otLog.length?otLog.map(o=>`<div class="att-log-row">
    <span>${fmtDate(o.date)} <span style="color:#aaa;font-size:11px">${o.date}</span></span>
    <div style="display:flex;align-items:center;gap:8px">
      <span style="color:#7c3aed;font-weight:600">${o.hours}h OT</span>
      <span style="font-weight:700">${fmtInr(Number(o.hours)*(Number(w.rate)/8)*1.5)}</span>
      <button onclick="removeOT('${o.id}','${wid}')" style="background:none;border:none;cursor:pointer;color:#aaa;font-size:16px">×</button>
    </div>
  </div>`).join(''):`<p style="font-size:13px;color:#aaa;text-align:center;padding:10px 0">No OT recorded</p>`;
  const o=document.getElementById('overlay');
  o.style.display='flex';
  o.innerHTML=`<div class="sheet" onclick="event.stopPropagation()">
    <div class="sheet-hdr">
      <p class="sheet-title">⏱️ Overtime — ${w.name}</p>
      <button onclick="closeModal()" style="background:none;border:none;cursor:pointer;color:#888;font-size:26px;line-height:1">×</button>
    </div>
    <p style="font-size:12px;color:#888;margin-bottom:14px">OT rate = 1.5× (${fmtInr(Number(w.rate)/8*1.5)}/hr)</p>
    <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:12px;margin-bottom:18px">
      <p class="sec-label" style="color:#7c3aed">Add Overtime Hours</p>
      <input class="inp" id="ot-hours" type="number" placeholder="Hours (e.g. 2.5)" inputmode="decimal" step="0.5"/>
      <input class="inp" id="ot-date" type="date" value="${SELDATE}" max="${TODAY}"/>
      <button style="width:100%;padding:12px;background:#7c3aed;border:none;color:#fff;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit" onclick="submitOT('${wid}')">Add OT ✓</button>
    </div>
    <p style="font-size:12px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">OT Log (Total: ${fmtInr(calcOT(wid))})</p>
    ${logHTML}
  </div>`;
}
function submitOT(wid){
  const hours=document.getElementById('ot-hours').value;
  const date=document.getElementById('ot-date').value||TODAY;
  if(!hours||Number(hours)<=0)return alert('Hours daalo!');
  if(!state.overtime)state.overtime=[];
  state.overtime.unshift({id:gid(),workerId:wid,hours:Number(hours),date});
  saveData();render();
  document.getElementById('overlay').style.display='none';
  openOTModal(wid);
}
function removeOT(oid,wid){
  state.overtime=(state.overtime||[]).filter(o=>o.id!==oid);
  saveData();render();
  document.getElementById('overlay').style.display='none';
  openOTModal(wid);
}

// ── Worker Detail ─────────────────────────────────────────────────────
function openWorkerDetail(wid){
  const w=state.workers.find(x=>x.id===wid);if(!w)return;
  const log=getWorkerAttLog(w);
  const totalEarned=calcTotalEarned(w);
  const adv=calcAdvance(wid);
  const paid=calcSalaryPaid(wid);
  const net=totalEarned-adv-paid;
  const {full,half}=calcWorkedDays(w);
  const otTotal=calcOT(wid);

  const logHTML=log.length?log.map(l=>{
    const sc={full:'#22c55e',half:'#E8921A'}[l.status];
    return `<div class="att-log-row">
      <div><span style="font-weight:600">${fmtDate(l.date)}</span><span style="font-size:11px;color:#aaa;margin-left:5px">${l.date}</span></div>
      <div style="text-align:right">
        <span style="color:${sc};font-size:12px;font-weight:600;margin-right:6px">${l.status==='full'?'Full':'Half'}</span>
        <span style="font-weight:700">${fmtInr(l.earned)}${l.ot>0?` <span style="color:#7c3aed;font-size:11px">+${fmtInr(l.ot)} OT</span>`:''}</span>
      </div>
    </div>`;
  }).join(''):`<p style="text-align:center;color:#aaa;padding:16px 0;font-size:13px">No attendance yet</p>`;

  const payLog=(state.salaryPayments||[]).filter(p=>p.workerId===wid);
  const payHTML=payLog.length?payLog.map(p=>`<div class="att-log-row">
    <div>
      <span style="font-weight:600">${fmtDate(p.date)}</span>
      ${payMethodBadge(p.payMethod||'cash')}
      ${p.note?`<span style="font-size:11px;color:#888;margin-left:5px">${p.note}</span>`:''}
      ${p.txnId?`<p style="font-size:10px;color:#7c3aed;margin-top:2px">Ref: ${p.txnId}</p>`:''}
    </div>
    <span style="font-weight:700;color:#16a34a">${fmtInr(p.amount)}</span>
  </div>`).join(''):`<p style="text-align:center;color:#aaa;padding:10px 0;font-size:13px">No salary paid</p>`;

  const photoHTML=w.photo
    ?`<img src="${w.photo}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:3px solid #E8921A;margin-bottom:8px"/>`
    :`<div style="width:72px;height:72px;border-radius:50%;background:#e5e5e0;display:flex;align-items:center;justify-content:center;font-size:32px;margin-bottom:8px">👷</div>`;

  // piece rate task summary if applicable
  const pieceSummary=w.rateType==='perpiece'?`<div style="background:#fce7f3;border:1px solid #fbcfe8;border-radius:10px;padding:10px;margin-bottom:14px">
    <p style="font-size:12px;font-weight:700;color:#be185d;margin-bottom:4px">⚡ Piece Rate Summary</p>
    <p style="font-size:13px;color:#1a1a1a">Rate: ${fmtInr(w.rate)}/piece</p>
    <p style="font-size:13px;color:#1a1a1a">Done pieces: ${(state.tasks||[]).filter(t=>t.assignedTo===wid&&t.status==='done'&&t.pieceQty).reduce((s,t)=>s+Number(t.pieceQty||0),0)}</p>
    <p style="font-size:13px;font-weight:700;color:#be185d">Total earned: ${fmtInr(totalEarned)}</p>
  </div>`:'';

  const o=document.getElementById('overlay');
  o.style.display='flex';
  o.innerHTML=`<div class="sheet" onclick="event.stopPropagation()">
    <div class="sheet-hdr">
      <div style="display:flex;align-items:center;gap:12px">
        ${photoHTML}
        <div>
          <p class="sheet-title">${w.name}</p>
          <p style="font-size:12px;color:#888;margin-top:2px">${badgeHTML(w.type)} ${rateTypeBadge(w.rateType||'perday')} <span style="margin-left:4px">${fmtInr(w.rate)}/${w.rateType==='perpiece'?'piece':'day'}</span></p>
          ${w.aadhaar?`<p style="font-size:11px;color:#aaa;margin-top:2px">Aadhaar: ****${w.aadhaar.slice(-4)}</p>`:''}
          ${w.phone?`<p style="font-size:11px;color:#888;margin-top:1px">📞 ${w.phone}</p>`:''}
        </div>
      </div>
      <button onclick="closeModal()" style="background:none;border:none;cursor:pointer;color:#888;font-size:26px;line-height:1;align-self:flex-start">×</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
      <div class="mini-stat" style="padding:10px"><p class="mini-label">Days Worked</p><p class="mini-val" style="font-size:15px">${w.rateType==='perpiece'?'—':full+(half>0?`+${half}×½`:'')}</p></div>
      <div class="mini-stat" style="padding:10px"><p class="mini-label">Total Earned</p><p class="mini-val" style="font-size:15px">${fmtInr(totalEarned)}</p></div>
      <div class="mini-stat" style="padding:10px"><p class="mini-label">OT Earned</p><p class="mini-val" style="font-size:15px;color:#7c3aed">${fmtInr(otTotal)}</p></div>
      <div class="mini-stat" style="padding:10px"><p class="mini-label">Balance Due</p><p class="mini-val" style="font-size:15px;color:${net>=0?'#1a1a1a':'#ef4444'}">${fmtInr(net)}</p></div>
    </div>
    ${pieceSummary}
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px;margin-bottom:18px">
      <p class="sec-label" style="color:#16a34a;margin-bottom:8px">💰 Mark Salary Paid</p>
      <input class="inp" id="pay-amt" type="number" placeholder="Amount (₹)" inputmode="numeric" style="margin-bottom:8px"/>
      <input class="inp" id="pay-date" type="date" value="${TODAY}" max="${TODAY}" style="margin-bottom:8px"/>
      <p class="sec-label" style="margin-bottom:6px">Payment Method</p>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <button class="pay-chip active" id="pm-cash" onclick="selPayMethod('cash')">💵 Cash</button>
        <button class="pay-chip" id="pm-upi" onclick="selPayMethod('upi')">📱 UPI</button>
        <button class="pay-chip" id="pm-bank" onclick="selPayMethod('bank')">🏦 Bank</button>
      </div>
      <div id="txn-id-row" style="display:none">
        <input class="inp" id="pay-txnid" placeholder="UTR / Transaction ID" autocomplete="off" style="margin-bottom:8px"/>
      </div>
      <input class="inp" id="pay-note" placeholder="Note (optional)" autocomplete="off" style="margin-bottom:8px"/>
      <button class="pay-btn" onclick="recordSalaryPayment('${wid}')">Record Payment ✓</button>
    </div>
    <p style="font-size:12px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">Salary History</p>
    <div style="margin-bottom:18px">${payHTML}</div>
    ${w.rateType!=='perpiece'?`<p style="font-size:12px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">Attendance Log (${log.length} days)</p><div>${logHTML}</div>`:''}
  </div>`;
  payMethodChoice='cash';
}

function selPayMethod(m){
  payMethodChoice=m;
  ['cash','upi','bank'].forEach(x=>{
    const el=document.getElementById('pm-'+x);
    if(el)el.className='pay-chip'+(x===m?' active':'');
  });
  const txnRow=document.getElementById('txn-id-row');
  if(txnRow)txnRow.style.display=(m==='upi'||m==='bank')?'block':'none';
}

function recordSalaryPayment(wid){
  const amount=document.getElementById('pay-amt').value;
  const note=document.getElementById('pay-note').value.trim();
  const date=document.getElementById('pay-date').value||TODAY;
  const txnIdEl=document.getElementById('pay-txnid');
  const txnId=txnIdEl?txnIdEl.value.trim():'';
  if(!amount||Number(amount)<=0)return alert('Amount daalo!');
  if(!state.salaryPayments)state.salaryPayments=[];
  state.salaryPayments.unshift({id:gid(),workerId:wid,amount:Number(amount),note,date,payMethod:payMethodChoice,txnId});
  saveData();render();
  document.getElementById('overlay').style.display='none';
  openWorkerDetail(wid);
}

// ── Tasks Tab ─────────────────────────────────────────────────────────
function renderTasks(){
  const sc={pending:'#888',active:'#E8921A',done:'#22c55e'};
  const sl={pending:'Pending',active:'In Progress',done:'Done'};
  const pending=state.tasks.filter(t=>t.status!=='done').length;
  const rows=state.tasks.map(t=>{
    // support both old single assignedTo and new assignedWorkers[]
    const wids=t.assignedWorkers&&t.assignedWorkers.length?t.assignedWorkers:(t.assignedTo?[t.assignedTo]:[]);
    const workers=wids.map(id=>state.workers.find(x=>x.id===id)).filter(Boolean);
    const w=workers[0]; // primary (for piece rate calc)
    const c=sc[t.status];
    // quantity progress
    let progressHTML='';
    if(t.totalQty&&Number(t.totalQty)>0){
      const pct=Math.min(100,Math.round((Number(t.doneQty||0)/Number(t.totalQty))*100));
      progressHTML=`<div style="margin-top:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
          <span style="font-size:11px;color:#666">${t.unit||'units'}: ${t.doneQty||0} / ${t.totalQty}</span>
          <span style="font-size:12px;font-weight:700;color:${pct>=100?'#22c55e':'#E8921A'}">${pct}%</span>
        </div>
        <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${pct}%;background:${pct>=100?'#22c55e':'#E8921A'}"></div></div>
      </div>`;
    }
    // photo thumb
    const photoThumb=t.photo?`<img src="${t.photo}" class="photo-thumb" onclick="viewPhoto('${t.id}')" title="View photo"/>`:'';
    return `<div class="card" style="opacity:${t.status==='done'?.6:1}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <div style="flex:1;min-width:0">
          <p style="font-weight:700;font-size:15px;color:#1a1a1a;text-decoration:${t.status==='done'?'line-through':'none'}">${t.title}</p>
          ${t.description?`<p style="font-size:13px;color:#666;margin-top:3px">${t.description}</p>`:''}
          ${progressHTML}
          <div style="display:flex;align-items:center;gap:5px;margin-top:7px;flex-wrap:wrap">
            <i class="ti ti-users" style="font-size:13px;color:#888"></i>
            ${workers.length?workers.map(wr=>`<span style="display:inline-flex;align-items:center;gap:3px;background:#f5f5f5;border-radius:6px;padding:2px 7px;font-size:12px;font-weight:600">${wr.photo?`<img src="${wr.photo}" style="width:14px;height:14px;border-radius:50%;object-fit:cover"/>`:''}<span>${wr.name}</span></span>`).join(''):'<span style="font-size:13px;color:#aaa">Unassigned</span>'}
            <span style="font-size:11px;color:#aaa">${t.createdAt||''}</span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:5px;align-items:flex-end;flex-shrink:0">
          <div style="display:flex;gap:5px;align-items:center">
            <button class="status-pill" onclick="cycleTask('${t.id}')" style="color:${c};border-color:${c};background:${c}1a">${sl[t.status]}</button>
            <button class="icon-btn" onclick="removeTask('${t.id}')"><i class="ti ti-trash" style="font-size:14px"></i></button>
          </div>
          <div style="display:flex;gap:5px;align-items:center">
            ${photoThumb}
            <label style="cursor:pointer;color:#888;font-size:11px;background:#f5f5f5;border:1px solid #ddd;padding:4px 8px;border-radius:6px;display:inline-flex;align-items:center;gap:3px">
              <i class="ti ti-camera" style="font-size:12px"></i>
              <input type="file" accept="image/*" capture="environment" onchange="attachTaskPhoto('${t.id}',this)" style="display:none"/>
            </label>
          </div>
        </div>
      </div>
      ${t.totalQty&&w&&w.rateType==='perpiece'?`<p style="font-size:11px;color:#be185d;margin-top:5px">⚡ Piece qty feeds into ${w.name}'s earnings</p>`:''}
    </div>`;
  }).join('');
  const empty=!state.tasks.length?`<div class="empty"><i class="ti ti-checklist"></i><p>No tasks assigned yet</p></div>`:'';
  return `<div class="row-hdr"><p class="row-label">${pending} pending</p><button class="fab" onclick="openModal('task')"><i class="ti ti-plus" style="font-size:14px"></i>Add Task</button></div>${rows}${empty}`;
}

function attachTaskPhoto(tid,input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    state.tasks=state.tasks.map(t=>t.id===tid?{...t,photo:e.target.result}:t);
    saveData();render();
  };
  reader.readAsDataURL(file);
}

function viewPhoto(tid){
  const t=state.tasks.find(x=>x.id===tid);if(!t||!t.photo)return;
  const o=document.getElementById('overlay');
  o.style.display='flex';
  o.innerHTML=`<div class="sheet" onclick="event.stopPropagation()" style="text-align:center">
    <div class="sheet-hdr"><p class="sheet-title">📷 Task Photo</p><button onclick="closeModal()" style="background:none;border:none;cursor:pointer;color:#888;font-size:26px;line-height:1">×</button></div>
    <img src="${t.photo}" style="width:100%;border-radius:10px;max-height:60vh;object-fit:contain"/>
    <p style="font-size:13px;font-weight:600;margin-top:10px;color:#1a1a1a">${t.title}</p>
  </div>`;
}

// ── Site Diary Tab ────────────────────────────────────────────────────
function renderDiary(){
  const entry=state.diary[SELDATE]||{};
  const WEATHERS=['☀️ Sunny','🌤 Partly Cloudy','🌧 Rainy','⛈ Thunderstorm','🌬 Windy','🌫 Foggy','🥵 Extreme Heat'];
  const weatherChips=WEATHERS.map(w=>{
    const sel=entry.weather===w;
    return `<button class="weather-chip${sel?' sel':''}" onclick="setWeather('${w.replace(/'/g,"\\'")}','${SELDATE}')">${w}</button>`;
  }).join('');

  // past 7 entries
  const recent=Object.entries(state.diary).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,7);
  const recentHTML=recent.filter(([d])=>d!==SELDATE).map(([d,e])=>`
    <div class="diary-card">
      <p class="diary-date-label">${fmtDate(d)} · ${d}</p>
      ${e.weather?`<p style="font-size:13px;margin-bottom:4px">${e.weather}</p>`:''}
      ${e.notes?`<p style="font-size:13px;color:#444;line-height:1.5">${e.notes}</p>`:''}
      ${e.visitors?`<p style="font-size:12px;color:#7c3aed;margin-top:4px">👤 Visitors: ${e.visitors}</p>`:''}
    </div>`).join('');

  return `
    <div style="background:#fff;border:1px solid #e5e5e0;border-radius:12px;padding:14px;margin-bottom:14px">
      <p style="font-size:14px;font-weight:700;color:#1a1a1a;margin-bottom:12px">📋 ${SELDATE===TODAY?'Today\'s Entry':fmtDate(SELDATE)+' Entry'}</p>
      <p class="sec-label">Weather</p>
      <div class="weather-row">${weatherChips}</div>
      <p class="sec-label">Work Done / Issues</p>
      <textarea class="inp" id="diary-notes" rows="3" placeholder="e.g. 2nd floor slab casting completed. Shuttering removed on 1st floor. Plumber fixed water lines." style="resize:none;line-height:1.5">${entry.notes||''}</textarea>
      <p class="sec-label">Visitors / Inspections</p>
      <input class="inp" id="diary-visitors" placeholder="e.g. Client visit, Municipal inspector" value="${entry.visitors||''}"/>
      <button class="submit-btn" onclick="saveDiaryEntry('${SELDATE}')">Save Entry ✓</button>
    </div>
    ${recentHTML?`<p style="font-size:12px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">Recent Entries</p>${recentHTML}`:''}`;
}

function setWeather(w,date){
  if(!state.diary[date])state.diary[date]={};
  // toggle
  state.diary[date].weather=state.diary[date].weather===w?'':w;
  saveData();renderContent();
}

function saveDiaryEntry(date){
  const notes=document.getElementById('diary-notes').value.trim();
  const visitors=document.getElementById('diary-visitors').value.trim();
  if(!state.diary[date])state.diary[date]={};
  state.diary[date].notes=notes;
  state.diary[date].visitors=visitors;
  saveData();render();
  // flash
  const btn=document.querySelector('.submit-btn');
  if(btn){btn.textContent='Saved ✓';btn.style.background='#22c55e';setTimeout(()=>{btn.textContent='Save Entry ✓';btn.style.background='#E8921A';},1500);}
}

// ── Finance Tab ───────────────────────────────────────────────────────
const EXP_CATS=[
  {id:'labour',emoji:'👷',label:'Labour Supply'},
  {id:'tools',emoji:'🔧',label:'Tools / Equipment'},
  {id:'safety',emoji:'🦺',label:'Safety Items'},
  {id:'food',emoji:'🍵',label:'Food / Tea / Snacks'},
  {id:'transport',emoji:'🚗',label:'Transport'},
  {id:'misc',emoji:'📋',label:'Miscellaneous'},
];
function catInfo(id){return EXP_CATS.find(c=>c.id===id)||{emoji:'📋',label:id};}

function renderFinance(){
  const mf=finMonthFilter;
  const filterSalary=p=>!mf||p.date.startsWith(mf);
  const filterExp=e=>!mf||e.date.startsWith(mf);
  const filterAtt=d=>!mf||d.startsWith(mf);

  // filtered wages: attendance-based filtered by month
  let totalWages,totalPaid,totalAdv;
  if(mf){
    // month-specific wages from attendance
    totalWages=state.workers.reduce((s,w)=>{
      if(w.rateType==='perpiece'){
        const q=(state.tasks||[]).filter(t=>t.assignedTo===w.id&&t.status==='done'&&t.pieceQty&&(t.createdAt||'').startsWith(mf)).reduce((ss,t)=>ss+Number(t.pieceQty||0),0);
        return s+q*Number(w.rate);
      }
      let full=0,half=0;
      Object.entries(state.attendance).filter(([d])=>filterAtt(d)).forEach(([,day])=>{
        const a=day[w.id];
        if(a==='full'||a==='present')full++;
        else if(a==='half')half++;
      });
      return s+full*Number(w.rate)+half*Number(w.rate)/2;
    },0);
    totalPaid=(state.salaryPayments||[]).filter(filterSalary).reduce((s,p)=>s+Number(p.amount),0);
    totalAdv=(state.advances||[]).filter(e=>!mf||e.date.startsWith(mf)).reduce((s,a)=>s+Number(a.amount),0);
  } else {
    totalWages=state.workers.reduce((s,w)=>s+calcTotalEarned(w),0);
    totalPaid=(state.salaryPayments||[]).reduce((s,p)=>s+Number(p.amount),0);
    totalAdv=(state.advances||[]).reduce((s,a)=>s+Number(a.amount),0);
  }
  const totalMyExp=calcMyExpensesTotal(mf);
  const totalDue=totalWages-totalPaid-totalAdv;
  const grandTotal=totalWages+totalAdv+totalMyExp;

  // month filter dropdown
  const months=getMonthOptions();
  const monthOpts=`<option value="">All Time</option>`+months.map(m=>`<option value="${m}"${m===mf?' selected':''}>${fmtMonth(m)}</option>`).join('');

  const workerRows=state.workers.map(w=>{
    let earned,paid_w,adv_w,net_w,fullD,halfD;
    if(mf){
      if(w.rateType==='perpiece'){
        const q=(state.tasks||[]).filter(t=>t.assignedTo===w.id&&t.status==='done'&&t.pieceQty&&(t.createdAt||'').startsWith(mf)).reduce((ss,t)=>ss+Number(t.pieceQty||0),0);
        earned=q*Number(w.rate);
      } else {
        fullD=0;halfD=0;
        Object.entries(state.attendance).filter(([d])=>d.startsWith(mf)).forEach(([,day])=>{const a=day[w.id];if(a==='full'||a==='present')fullD++;else if(a==='half')halfD++;});
        earned=fullD*Number(w.rate)+halfD*Number(w.rate)/2;
      }
      paid_w=(state.salaryPayments||[]).filter(p=>p.workerId===w.id&&p.date.startsWith(mf)).reduce((s,p)=>s+Number(p.amount),0);
      adv_w=(state.advances||[]).filter(a=>a.workerId===w.id&&a.date.startsWith(mf)).reduce((s,a)=>s+Number(a.amount),0);
    } else {
      earned=calcTotalEarned(w);paid_w=calcSalaryPaid(w.id);adv_w=calcAdvance(w.id);
      const dw=calcWorkedDays(w);fullD=dw.full;halfD=dw.half;
    }
    net_w=earned-paid_w-adv_w;
    const ot=mf?0:calcOT(w.id);
    return `<div class="fin-row">
      <div>
        <p style="font-weight:600">${w.name} ${badgeHTML(w.type)}${rateTypeBadge(w.rateType||'perday')}</p>
        <p style="font-size:11px;color:#888;margin-top:1px">${w.rateType==='perpiece'?`${fmtInr(w.rate)}/piece`:`${fullD||0}${halfD?`+${halfD}×½`:''} days · ${fmtInr(w.rate)}/day${ot>0?` · OT: ${fmtInr(ot)}`:''}`}</p>
      </div>
      <div style="text-align:right">
        <p style="font-weight:700">${fmtInr(earned)}</p>
        <p style="font-size:11px;color:${net_w>0?'#ef4444':'#16a34a'};margin-top:1px">${net_w>0?'Bal: '+fmtInr(net_w):'✓ Settled'}</p>
      </div>
    </div>`;
  }).join('');

  const filteredExp=(state.myExpenses||[]).filter(filterExp);
  const expRows=filteredExp.map(e=>{
    const cat=catInfo(e.category);
    return `<div class="fin-row" style="align-items:flex-start">
      <div style="flex:1;min-width:0">
        <p style="font-weight:600">${cat.emoji} ${cat.label}</p>
        ${e.note?`<p style="font-size:12px;color:#666;margin-top:2px">${e.note}</p>`:''}
        <p style="font-size:11px;color:#aaa;margin-top:1px">${e.date}</p>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
        ${e.photo?`<img src="${e.photo}" class="photo-thumb" onclick="viewExpPhoto('${e.id}')"/>`:''}
        <p style="font-weight:700;color:#7c3aed">${fmtInr(e.amount)}</p>
        <button onclick="removeMyExpense('${e.id}')" style="background:none;border:1px solid #e0e0e0;border-radius:6px;padding:4px 8px;cursor:pointer;color:#aaa;font-size:13px">×</button>
      </div>
    </div>`;
  }).join('');

  const catTotals={};
  filteredExp.forEach(e=>{catTotals[e.category]=(catTotals[e.category]||0)+Number(e.amount);});
  const catSummary=Object.entries(catTotals).map(([id,amt])=>{
    const c=catInfo(id);
    return `<span style="display:inline-flex;align-items:center;gap:4px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:6px;padding:4px 8px;font-size:12px;font-weight:600;color:#7c3aed;margin:2px">${c.emoji} ${c.label}: ${fmtInr(amt)}</span>`;
  }).join('');

  return `
  <div class="month-filter">
    <i class="ti ti-calendar-month" style="font-size:16px;color:#E8921A"></i>
    <select onchange="setMonthFilter(this.value)" style="background:none;border:none;font-size:13px;font-weight:600;color:#1a1a1a;font-family:inherit;cursor:pointer;flex:1">${monthOpts}</select>
    ${mf?`<span style="font-size:11px;font-weight:700;color:#E8921A;background:#fff3e0;padding:3px 8px;border-radius:5px">${fmtMonth(mf)}</span>`:''}
  </div>
  <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
    <button class="fab-sm" onclick="whatsappExport()" style="flex:1"><i class="ti ti-brand-whatsapp" style="font-size:14px"></i>WhatsApp</button>
    <button class="fab-outline" onclick="printPayroll()" style="flex:1"><i class="ti ti-printer" style="font-size:14px"></i>Print${mf?' ('+fmtMonth(mf)+')':''}</button>
  </div>
  <div class="fin-section">
    <p class="fin-section-title">💼 ${mf?fmtMonth(mf)+' Summary':'Overall Summary'}</p>
    <div class="fin-row"><span>Total Wages + OT</span><strong>${fmtInr(totalWages)}</strong></div>
    <div class="fin-row"><span>Salary Paid</span><strong style="color:#16a34a">${fmtInr(totalPaid)}</strong></div>
    <div class="fin-row"><span>Advance Given</span><strong style="color:#ef4444">${fmtInr(totalAdv)}</strong></div>
    <div class="fin-row"><span>My Expenses</span><strong style="color:#7c3aed">${fmtInr(totalMyExp)}</strong></div>
    <div class="fin-total" style="border-top:1.5px solid #e5e5e0;margin-top:4px">
      <span>Balance Due to Workers</span>
      <strong style="font-size:16px;color:${totalDue>0?'#ef4444':'#16a34a'}">${fmtInr(Math.max(0,totalDue))}</strong>
    </div>
    <div class="fin-total" style="border-top:1.5px solid #e5e5e0;margin-top:4px">
      <span>Total Project Cost</span>
      <strong style="font-size:17px">${fmtInr(grandTotal)}</strong>
    </div>
  </div>
  <div class="fin-section">
    <p class="fin-section-title">👷 Per Worker</p>
    ${workerRows||`<p style="font-size:13px;color:#aaa;text-align:center;padding:10px 0">No workers</p>`}
  </div>
  <div class="fin-section">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <p class="fin-section-title" style="margin-bottom:0">🧾 My Expenses</p>
      <button class="fab" onclick="openModal('expense')" style="padding:7px 12px;font-size:13px"><i class="ti ti-plus" style="font-size:13px"></i>Add</button>
    </div>
    ${catSummary?`<div style="margin-bottom:10px;flex-wrap:wrap;display:flex">${catSummary}</div>`:''}
    ${expRows||`<p style="font-size:13px;color:#aaa;text-align:center;padding:14px 0">No expenses${mf?' this month':' yet'}</p>`}
    ${filteredExp.length?`<div class="fin-total" style="border-top:1.5px solid #e5e5e0;margin-top:6px"><span>Total My Expenses</span><strong style="color:#7c3aed">${fmtInr(totalMyExp)}</strong></div>`:''}
  </div>`;
}

function setMonthFilter(v){finMonthFilter=v;renderContent();}

function viewExpPhoto(eid){
  const e=(state.myExpenses||[]).find(x=>x.id===eid);if(!e||!e.photo)return;
  const o=document.getElementById('overlay');
  o.style.display='flex';
  o.innerHTML=`<div class="sheet" onclick="event.stopPropagation()" style="text-align:center">
    <div class="sheet-hdr"><p class="sheet-title">🧾 Expense Bill</p><button onclick="closeModal()" style="background:none;border:none;cursor:pointer;color:#888;font-size:26px;line-height:1">×</button></div>
    <img src="${e.photo}" style="width:100%;border-radius:10px;max-height:60vh;object-fit:contain"/>
    <p style="font-size:13px;font-weight:600;margin-top:10px;color:#1a1a1a">${catInfo(e.category).emoji} ${catInfo(e.category).label} — ${fmtInr(e.amount)}</p>
  </div>`;
}

// ── More Tab ──────────────────────────────────────────────────────────
function renderMore(){
  const advTotal=(state.advances||[]).reduce((s,a)=>s+Number(a.amount),0);
  const advRows=(state.advances||[]).map(a=>{
    const w=state.workers.find(x=>x.id===a.workerId);
    return `<div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:10px">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <p style="font-weight:700;font-size:15px">${w?w.name:'Unknown'}</p>${w?badgeHTML(w.type):''}
        </div>
        ${a.note?`<p style="font-size:13px;color:#666;margin-top:2px">${a.note}</p>`:''}
        <p style="font-size:11px;color:#aaa;margin-top:2px">${a.date}</p>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
        <p style="font-weight:700;font-size:17px;color:#ef4444">${fmtInr(a.amount)}</p>
        <button class="icon-btn" onclick="removeAdvance('${a.id}')"><i class="ti ti-trash" style="font-size:14px"></i></button>
      </div>
    </div>`;
  }).join('');
  const advEmpty=!(state.advances||[]).length?`<div class="empty" style="padding:20px 0"><i class="ti ti-cash" style="font-size:32px"></i><p style="font-size:13px">No advances recorded</p></div>`:'';

  // ── Site Planner ──
  const att=selDateAtt();
  const karigarOnsite=state.workers.filter(w=>w.type==='karigar'&&(att[w.id]==='full'||att[w.id]==='present'||att[w.id]==='half')).length;
  const labourOnsite=state.workers.filter(w=>w.type!=='karigar'&&(att[w.id]==='full'||att[w.id]==='present'||att[w.id]==='half')).length;
  const totalKarigar=state.workers.filter(w=>w.type==='karigar').length;
  const totalLabour=state.workers.filter(w=>w.type!=='karigar').length;

  const workItems=(state.workItems||[]);
  const totalRemSqft=workItems.reduce((s,wi)=>s+Math.max(0,Number(wi.totalSqft||0)-Number(wi.doneSqft||0)),0);
  const totalDoneSqft=workItems.reduce((s,wi)=>s+Number(wi.doneSqft||0),0);
  const totalSqft=workItems.reduce((s,wi)=>s+Number(wi.totalSqft||0),0);
  const overallPct=totalSqft>0?Math.round(totalDoneSqft/totalSqft*100):0;

  const wiRows=workItems.map(wi=>{
    const rem=Math.max(0,Number(wi.totalSqft||0)-Number(wi.doneSqft||0));
    const pct=Number(wi.totalSqft||0)>0?Math.min(100,Math.round(Number(wi.doneSqft||0)/Number(wi.totalSqft||0)*100)):0;
    // estimate days: productivity sqft/day per karigar * available karigars
    const prodK=Number(wi.prodKarigar||0);
    const prodL=Number(wi.prodLabour||0);
    const availK=Math.min(karigarOnsite||totalKarigar,totalKarigar);
    const availL=Math.min(labourOnsite||totalLabour,totalLabour);
    const dailyOutput=(prodK*availK)+(prodL*availL);
    const estDays=dailyOutput>0&&rem>0?Math.ceil(rem/dailyOutput):null;
    const estColor=estDays===null?'#888':estDays<=3?'#22c55e':estDays<=7?'#E8921A':'#ef4444';
    return `<div class="planner-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <div style="flex:1;min-width:0">
          <p class="pc-title">${wi.name}</p>
          <p class="pc-sub">${wi.unit||'sqft'}: ${Number(wi.doneSqft||0).toLocaleString()} / ${Number(wi.totalSqft||0).toLocaleString()} · Rem: <strong style="color:#ef4444">${rem.toLocaleString()}</strong></p>
          <div style="margin-top:6px">
            <div style="display:flex;justify-content:space-between;margin-bottom:2px">
              <span style="font-size:10px;color:#888">Progress</span>
              <span style="font-size:11px;font-weight:700;color:${pct>=100?'#22c55e':'#E8921A'}">${pct}%</span>
            </div>
            <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${pct}%;background:${pct>=100?'#22c55e':'#E8921A'}"></div></div>
          </div>
          ${prodK||prodL?`<p style="font-size:11px;color:#888;margin-top:5px">
            ${prodK?`Karigar: ${prodK} ${wi.unit||'sqft'}/day`:''}${prodK&&prodL?' · ':''}${prodL?`Labour: ${prodL} ${wi.unit||'sqft'}/day`:''}
          </p>`:''}
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0">
          ${estDays!==null?`<span class="days-pill" style="background:${estColor}22;color:${estColor};border:1px solid ${estColor}55">${estDays}d left</span>`:'<span class="days-pill" style="background:#f5f5f5;color:#aaa">—</span>'}
          <div style="display:flex;gap:5px">
            <button class="icon-btn" onclick="openEditWorkItem('${wi.id}')" style="padding:6px 9px"><i class="ti ti-pencil" style="font-size:13px"></i></button>
            <button class="icon-btn" onclick="openDeadlineModal('${wi.id}')" style="padding:6px 9px;color:${wi.deadline?'#E8921A':'#888'}"><i class="ti ti-calendar-due" style="font-size:13px"></i></button>
            <button class="icon-btn" onclick="removeWorkItem('${wi.id}')" style="padding:6px 9px"><i class="ti ti-trash" style="font-size:13px"></i></button>
          </div>
          ${deadlineBadge(wi)}
        </div>
      </div>
    </div>`;
  }).join('');

  const wiEmpty=!workItems.length?`<div style="text-align:center;padding:24px 0;color:#aaa"><i class="ti ti-ruler-measure" style="font-size:36px;display:block;margin-bottom:8px"></i><p style="font-size:13px">No work items added yet</p></div>`:'';

  const summaryBar=workItems.length?`
    <div style="background:#f8f7f5;border-radius:8px;padding:10px 12px;margin-bottom:12px">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">
        <div style="text-align:center"><p style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.04em">Total</p><p style="font-size:13px;font-weight:700">${totalSqft.toLocaleString()}</p></div>
        <div style="text-align:center"><p style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.04em">Done</p><p style="font-size:13px;font-weight:700;color:#22c55e">${totalDoneSqft.toLocaleString()}</p></div>
        <div style="text-align:center"><p style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.04em">Remaining</p><p style="font-size:13px;font-weight:700;color:#ef4444">${totalRemSqft.toLocaleString()}</p></div>
      </div>
      <div style="margin-top:8px">
        <div style="display:flex;justify-content:space-between;margin-bottom:2px"><span style="font-size:10px;color:#888">Overall</span><span style="font-size:11px;font-weight:700;color:${overallPct>=100?'#22c55e':'#E8921A'}">${overallPct}%</span></div>
        <div class="progress-bar-bg" style="height:8px"><div class="progress-bar-fill" style="width:${overallPct}%;height:100%;background:${overallPct>=100?'#22c55e':'#E8921A'}"></div></div>
      </div>
    </div>`:'';

  return `
    <!-- Site Planner -->
    <div style="background:#fff;border:1px solid #e5e5e0;border-radius:12px;padding:14px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <p class="fin-section-title" style="margin-bottom:0">📐 Site Planner</p>
        <button class="fab" onclick="openWorkItemModal()" style="padding:7px 12px;font-size:13px"><i class="ti ti-plus" style="font-size:13px"></i>Add Work</button>
      </div>
      <!-- Availability strip -->
      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
        <span class="avail-chip" style="background:#fff3e0;color:#c97010;border-color:#fed7aa">
          <i class="ti ti-hammer" style="font-size:12px"></i>
          Karigar: <strong>${karigarOnsite}/${totalKarigar}</strong> present
        </span>
        <span class="avail-chip" style="background:#e3f2fd;color:#1565c0;border-color:#bfdbfe">
          <i class="ti ti-users" style="font-size:12px"></i>
          Labour: <strong>${labourOnsite}/${totalLabour}</strong> present
        </span>
      </div>
      ${summaryBar}
      ${wiRows}${wiEmpty}
    </div>
    <!-- Advance Money -->
    <div style="background:#fff;border:1px solid #e5e5e0;border-radius:12px;padding:14px;margin-bottom:12px">
      <p class="fin-section-title" style="margin-bottom:10px">💵 Advance Money</p>
      <div class="row-hdr" style="margin-bottom:10px">
        <p class="row-label">Total: <strong style="color:#ef4444">${fmtInr(advTotal)}</strong></p>
        <button class="fab" onclick="openModal('advance')"><i class="ti ti-plus" style="font-size:14px"></i>Add Advance</button>
      </div>
      ${advRows}${advEmpty}
    </div>
    <!-- Quick Actions -->
    <div style="background:#fff;border:1px solid #e5e5e0;border-radius:12px;padding:14px;margin-bottom:12px">
      <p class="fin-section-title" style="margin-bottom:10px">⚙️ Quick Actions</p>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="fab-outline" onclick="printPayroll()" style="justify-content:center"><i class="ti ti-printer" style="font-size:15px"></i>Print Payroll</button>
        <button onclick="exportExcel()" style="padding:11px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;border:1.5px solid #16a34a;background:#f0fdf4;color:#16a34a;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:6px"><i class="ti ti-file-spreadsheet" style="font-size:15px"></i>Export Excel (.xlsx)</button>
        <button class="fab-sm" onclick="whatsappExport()" style="justify-content:center"><i class="ti ti-brand-whatsapp" style="font-size:15px"></i>WhatsApp Report</button>
        <div style="background:#f0f7ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <p style="font-size:13px;font-weight:700;color:#1d4ed8">☁️ Google Drive</p>
            ${driveAccessToken?`<span class="drive-status drive-connected">✓ ${driveUserEmail||'Connected'}</span>`:`<span class="drive-status drive-disconnected">Not connected</span>`}
          </div>
          ${driveAccessToken?`
          <div style="display:flex;gap:8px">
            <button onclick="exportToDrive()" style="flex:1;padding:9px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;border:1.5px solid #1d4ed8;background:#1d4ed8;color:#fff;font-family:inherit">⬆ Backup</button>
            <button onclick="importFromDrive()" style="flex:1;padding:9px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;border:1.5px solid #1d4ed8;background:#fff;color:#1d4ed8;font-family:inherit">⬇ Restore</button>
            <button onclick="disconnectDrive()" style="padding:9px 12px;border-radius:8px;font-size:12px;cursor:pointer;border:1px solid #ddd;background:#f5f5f5;color:#888;font-family:inherit">✕</button>
          </div>`:`<button onclick="connectGoogleDrive()" style="width:100%;padding:10px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;border:1.5px solid #1d4ed8;background:#1d4ed8;color:#fff;font-family:inherit">Connect Google Drive</button>`}
        </div>
        <button onclick="clearAllData()" style="padding:11px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;border:1.5px solid #fca5a5;background:#fef2f2;color:#dc2626;font-family:inherit"><i class="ti ti-trash" style="font-size:14px;margin-right:4px"></i>Clear Site Data</button>
      </div>
    </div>`;
}

function clearAllData(){
  if(!confirm('⚠️ Delete ALL data for this site? Cannot undo.'))return;
  state=BLANK_SITE();saveData();render();
}

// ── Print Payroll (month-aware) ───────────────────────────────────────
function printPayroll(){
  const mf=finMonthFilter;
  const filterFn=x=>!mf||(x.date||'').startsWith(mf);
  const filterAtt=d=>!mf||d.startsWith(mf);

  const rows=state.workers.map(w=>{
    let earned,ot,adv,paid,full,half;
    if(mf&&w.rateType!=='perpiece'){
      full=0;half=0;
      Object.entries(state.attendance).filter(([d])=>filterAtt(d)).forEach(([,day])=>{const a=day[w.id];if(a==='full'||a==='present')full++;else if(a==='half')half++;});
      earned=full*Number(w.rate)+half*Number(w.rate)/2;ot=0;
    } else if(mf&&w.rateType==='perpiece'){
      const q=(state.tasks||[]).filter(t=>t.assignedTo===w.id&&t.status==='done'&&t.pieceQty&&(t.createdAt||'').startsWith(mf)).reduce((s,t)=>s+Number(t.pieceQty||0),0);
      earned=q*Number(w.rate);ot=0;full='-';half=0;
    } else {
      earned=calcTotalEarned(w);ot=calcOT(w.id);const dw=calcWorkedDays(w);full=dw.full;half=dw.half;
    }
    adv=mf?(state.advances||[]).filter(a=>a.workerId===w.id&&filterFn(a)).reduce((s,a)=>s+Number(a.amount),0):calcAdvance(w.id);
    paid=mf?(state.salaryPayments||[]).filter(p=>p.workerId===w.id&&filterFn(p)).reduce((s,p)=>s+Number(p.amount),0):calcSalaryPaid(w.id);
    const net=earned-adv-paid;
    const payMethods=[...new Set((state.salaryPayments||[]).filter(p=>p.workerId===w.id&&filterFn(p)).map(p=>p.payMethod||'cash'))].join(', ')||'-';
    return `<tr><td>${w.name}</td><td>${w.type}${w.rateType==='perpiece'?' (Piece)':''}</td><td>${full}${half?`+${half}×½`:''}</td><td>₹${w.rate}</td><td>₹${Math.round(earned-(typeof ot==='number'?ot:0))}</td><td>₹${Math.round(typeof ot==='number'?ot:0)}</td><td>₹${Math.round(earned)}</td><td>₹${Math.round(adv)}</td><td>₹${Math.round(paid)}</td><td>${payMethods}</td><td style="font-weight:700;color:${net>0?'red':'green'}">₹${Math.round(Math.max(0,net))}</td></tr>`;
  }).join('');

  const totalMyExp=calcMyExpensesTotal(mf);
  const filteredExp=(state.myExpenses||[]).filter(filterFn);
  const expRows=filteredExp.map(e=>{const c=catInfo(e.category);return `<tr><td>${c.emoji} ${c.label}</td><td>${e.date}</td><td>${e.note||'-'}</td><td style="font-weight:700;color:#7c3aed">₹${Math.round(e.amount)}</td></tr>`;}).join('');
  const totalE=mf?0:state.workers.reduce((s,w)=>s+calcTotalEarned(w),0);
  const totalA=(state.advances||[]).filter(filterFn).reduce((s,a)=>s+Number(a.amount),0);
  const totalP=(state.salaryPayments||[]).filter(filterFn).reduce((s,p)=>s+Number(p.amount),0);

  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Payroll Sheet${mf?' - '+fmtMonth(mf):''}</title>
  <style>body{font-family:Arial,sans-serif;padding:20px}h2{margin-bottom:4px}h3{margin:20px 0 8px;color:#555}p{color:#666;font-size:13px;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:4px}th{background:#1c1c1e;color:#E8921A;padding:7px 5px;text-align:left}
  td{padding:6px 5px;border-bottom:1px solid #eee}tr:nth-child(even){background:#f9f9f9}
  .total{font-weight:700;background:#f0ede8!important}.footer{margin-top:16px;font-size:12px;color:#aaa}</style></head>
  <body><h2>🏗️ Payroll Sheet${mf?' — '+fmtMonth(mf):''}</h2>
  <p>Generated: ${new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</p>
  <h3>👷 Workers</h3>
  <table><thead><tr><th>Name</th><th>Type</th><th>Days</th><th>Rate</th><th>Wages</th><th>OT</th><th>Total</th><th>Advance</th><th>Paid</th><th>Pay Mode</th><th>Balance</th></tr></thead>
  <tbody>${rows}</tbody></table>
  ${expRows?`<h3>🧾 My Expenses</h3><table><thead><tr><th>Category</th><th>Date</th><th>Note</th><th>Amount</th></tr></thead><tbody>${expRows}<tr class="total"><td colspan="3">Total Expenses</td><td style="color:#7c3aed">₹${Math.round(totalMyExp)}</td></tr></tbody></table>`:''}
  <p class="footer">Site Manager App</p></body></html>`;
  const w=window.open('','_blank');
  w.document.write(html);w.document.close();w.print();
}

// ── Attendance ────────────────────────────────────────────────────────
function toggleAtt(wid,val){
  if(!state.attendance[SELDATE])state.attendance[SELDATE]={};
  const cur=state.attendance[SELDATE][wid];
  state.attendance[SELDATE][wid]=cur===val?'absent':val;
  saveData();render();
}
function removeWorker(id){if(!confirm('Remove worker?'))return;state.workers=state.workers.filter(w=>w.id!==id);saveData();render();}
function removeTask(id){state.tasks=state.tasks.filter(t=>t.id!==id);saveData();render();}
function removeAdvance(id){state.advances=(state.advances||[]).filter(a=>a.id!==id);saveData();render();}
function removeMyExpense(id){state.myExpenses=(state.myExpenses||[]).filter(e=>e.id!==id);saveData();render();}
function cycleTask(id){
  const s=['pending','active','done'];
  state.tasks=state.tasks.map(t=>t.id===id?{...t,status:s[(s.indexOf(t.status)+1)%3]}:t);
  saveData();render();
}

// ── Work Item (Site Planner) ──────────────────────────────────────────
let wiUnitChoice='sqft';
function selWiUnit(u){
  wiUnitChoice=u;
  ['sqft','sqm','rft','nos','bags','cum'].forEach(x=>{
    const el=document.getElementById('wiu-'+x);if(!el)return;
    if(x===u){el.style.background='#E8921A';el.style.color='#1a1a1a';el.style.borderColor='#E8921A';}
    else{el.style.background='#f5f5f5';el.style.color='#666';el.style.borderColor='#ddd';}
  });
}
function workItemForm(wi){
  const isEdit=!!wi;
  const cu=wi?wi.unit:'sqft';
  return `
    <p class="sec-label">Work Item Name</p>
    <input class="inp" id="wi-name" placeholder="e.g. External Plastering, Tiling" value="${wi?wi.name:''}" autocomplete="off"/>
    <p class="sec-label">Unit</p>
    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
      ${['sqft','sqm','rft','nos','bags','cum'].map(u=>`<button onclick="selWiUnit('${u}')" id="wiu-${u}" style="padding:6px 12px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:1.5px solid ${cu===u?'#E8921A':'#ddd'};background:${cu===u?'#E8921A':'#f5f5f5'};color:${cu===u?'#1a1a1a':'#666'};font-family:inherit">${u}</button>`).join('')}
    </div>
    <p class="sec-label">Total Quantity</p>
    <input class="inp" id="wi-total" type="number" placeholder="e.g. 4500" inputmode="numeric" value="${wi?wi.totalSqft:''}"/>
    <p class="sec-label">Done So Far</p>
    <input class="inp" id="wi-done" type="number" placeholder="e.g. 1200" inputmode="numeric" value="${wi?wi.doneSqft:''}"/>
    <p class="sec-label">Productivity <span style="font-size:11px;color:#aaa">(optional — for day estimate)</span></p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
      <div><p style="font-size:11px;color:#c97010;font-weight:600;margin-bottom:5px">Karigar / day</p>
        <input class="inp" id="wi-prodk" type="number" placeholder="e.g. 80" inputmode="numeric" value="${wi?wi.prodKarigar:''}" style="margin-bottom:0"/></div>
      <div><p style="font-size:11px;color:#1565c0;font-weight:600;margin-bottom:5px">Labour / day</p>
        <input class="inp" id="wi-prodl" type="number" placeholder="e.g. 30" inputmode="numeric" value="${wi?wi.prodLabour:''}" style="margin-bottom:0"/></div>
    </div>
    <button class="submit-btn" onclick="${isEdit?`saveEditWorkItem('${wi.id}')`:'submitWorkItem()'}">${isEdit?'Update ✓':'Add Work Item ✓'}</button>`;
}
function openWorkItemModal(){
  wiUnitChoice='sqft';
  const o=document.getElementById('overlay');o.style.display='flex';
  o.innerHTML=`<div class="sheet" onclick="event.stopPropagation()">
    <div class="sheet-hdr"><p class="sheet-title">📐 Add Work Item</p><button onclick="closeModal()" style="background:none;border:none;cursor:pointer;color:#888;font-size:26px;line-height:1">×</button></div>
    ${workItemForm(null)}</div>`;
}
function openEditWorkItem(wid){
  const wi=(state.workItems||[]).find(x=>x.id===wid);if(!wi)return;
  wiUnitChoice=wi.unit||'sqft';
  const o=document.getElementById('overlay');o.style.display='flex';
  o.innerHTML=`<div class="sheet" onclick="event.stopPropagation()">
    <div class="sheet-hdr"><p class="sheet-title">✏️ Edit Work Item</p><button onclick="closeModal()" style="background:none;border:none;cursor:pointer;color:#888;font-size:26px;line-height:1">×</button></div>
    ${workItemForm(wi)}</div>`;
}
function submitWorkItem(){
  const name=document.getElementById('wi-name').value.trim();
  const total=document.getElementById('wi-total').value;
  const done=document.getElementById('wi-done').value||'0';
  const prodK=document.getElementById('wi-prodk').value||'0';
  const prodL=document.getElementById('wi-prodl').value||'0';
  if(!name||!total)return alert('Name aur quantity daalo!');
  if(!state.workItems)state.workItems=[];
  state.workItems.push({id:gid(),name,unit:wiUnitChoice,totalSqft:Number(total),doneSqft:Number(done),prodKarigar:Number(prodK),prodLabour:Number(prodL)});
  saveData();render();document.getElementById('overlay').style.display='none';
}
function saveEditWorkItem(wid){
  const name=document.getElementById('wi-name').value.trim();
  const total=document.getElementById('wi-total').value;
  const done=document.getElementById('wi-done').value||'0';
  const prodK=document.getElementById('wi-prodk').value||'0';
  const prodL=document.getElementById('wi-prodl').value||'0';
  if(!name||!total)return alert('Name aur quantity daalo!');
  state.workItems=(state.workItems||[]).map(wi=>wi.id===wid?{...wi,name,unit:wiUnitChoice,totalSqft:Number(total),doneSqft:Number(done),prodKarigar:Number(prodK),prodLabour:Number(prodL)}:wi);
  saveData();render();document.getElementById('overlay').style.display='none';
}
function removeWorkItem(wid){
  if(!confirm('Remove work item?'))return;
  state.workItems=(state.workItems||[]).filter(wi=>wi.id!==wid);
  saveData();render();
}

// ── Skill Tags ────────────────────────────────────────────────────────
let _selectedSkills=[];
function toggleSkill(skill,btn){
  const idx=_selectedSkills.indexOf(skill);
  if(idx>=0){_selectedSkills.splice(idx,1);btn.style.background='#f5f5f5';btn.style.color='#666';btn.style.borderColor='#ddd';}
  else{_selectedSkills.push(skill);btn.style.background='#166534';btn.style.color='#fff';btn.style.borderColor='#166534';}
}

// ── Daily Wage Slip (WhatsApp) ────────────────────────────────────────
function sendWageSlip(wid){
  const w=state.workers.find(x=>x.id===wid);if(!w)return;
  const siteName=(siteMeta.sites.find(s=>s.id===siteMeta.activeSiteId)||{}).name||'Site';
  const earned=calcTotalEarned(w);
  const adv=calcAdvance(wid);
  const paid=calcSalaryPaid(wid);
  const net=earned-adv-paid;
  const {full,half}=calcWorkedDays(w);
  const otAmt=calcOT(wid);
  const lastPay=(state.salaryPayments||[]).filter(p=>p.workerId===wid).sort((a,b)=>b.date.localeCompare(a.date))[0];
  const skills=(w.skills&&w.skills.length)?w.skills.join(', '):'';
  let msg=`🏗️ *WAGE SLIP — ${siteName}*\n`;
  msg+=`━━━━━━━━━━━━━━━\n`;
  msg+=`👷 *${w.name}*\n`;
  msg+=`🔧 ${w.type==='karigar'?'Karigar':'Labour'}${skills?' · '+skills:''}\n`;
  msg+=`📅 Generated: ${fmtDate(TODAY)}\n`;
  msg+=`━━━━━━━━━━━━━━━\n`;
  if(w.rateType==='perpiece'){
    msg+=`⚡ Rate: ${fmtInr(w.rate)}/piece\n`;
    msg+=`✅ Total Earned: ${fmtInr(earned)}\n`;
  } else {
    msg+=`📆 Days Worked: ${full}${half?` + ${half}×½`:''}\n`;
    msg+=`💵 Rate: ${fmtInr(w.rate)}/day\n`;
    msg+=`💰 Wages: ${fmtInr(earned-otAmt)}\n`;
    if(otAmt>0)msg+=`⏱️ Overtime: ${fmtInr(otAmt)}\n`;
    msg+=`✅ Total Earned: ${fmtInr(earned)}\n`;
  }
  msg+=`━━━━━━━━━━━━━━━\n`;
  msg+=`📋 Advance Deducted: ${fmtInr(adv)}\n`;
  msg+=`✅ Already Paid: ${fmtInr(paid)}\n`;
  if(lastPay)msg+=`   (Last: ${fmtDate(lastPay.date)} via ${lastPay.payMethod||'cash'}${lastPay.txnId?' · Ref:'+lastPay.txnId:''})\n`;
  msg+=`━━━━━━━━━━━━━━━\n`;
  msg+=`🔴 *Net Balance Due: ${fmtInr(Math.max(0,net))}*\n`;
  msg+=`━━━━━━━━━━━━━━━\n`;
  msg+=`_${siteName} · Site Manager App_`;
  window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');
}

// ── Deadline Tracker (on work items) ─────────────────────────────────
function deadlineBadge(wi){
  if(!wi.deadline)return '';
  const rem=Math.ceil((new Date(wi.deadline)-new Date(TODAY))/(86400000));
  const att=selDateAtt();
  const karigarOn=state.workers.filter(w=>w.type==='karigar'&&(att[w.id]==='full'||att[w.id]==='present'||att[w.id]==='half')).length||state.workers.filter(w=>w.type==='karigar').length;
  const labourOn=state.workers.filter(w=>w.type!=='karigar'&&(att[w.id]==='full'||att[w.id]==='present'||att[w.id]==='half')).length||state.workers.filter(w=>w.type!=='karigar').length;
  const daily=(Number(wi.prodKarigar||0)*karigarOn)+(Number(wi.prodLabour||0)*labourOn);
  const qRem=Math.max(0,Number(wi.totalSqft||0)-Number(wi.doneSqft||0));
  const estDays=daily>0&&qRem>0?Math.ceil(qRem/daily):null;
  const behind=estDays!==null&&estDays>rem;
  if(rem<0)return `<span class="deadline-pill" style="background:#fef2f2;color:#dc2626;border:1px solid #fca5a5">⚠️ ${Math.abs(rem)}d overdue</span>`;
  if(behind)return `<span class="deadline-pill" style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa">🔴 Behind — need ${estDays}d, have ${rem}d</span>`;
  return `<span class="deadline-pill" style="background:#f0fdf4;color:#166534;border:1px solid #bbf7d0">✅ ${rem}d left${estDays?` (est ${estDays}d)`:''}</span>`;
}
function openDeadlineModal(wid){
  const wi=(state.workItems||[]).find(x=>x.id===wid);if(!wi)return;
  const o=document.getElementById('overlay');o.style.display='flex';
  o.innerHTML=`<div class="sheet" onclick="event.stopPropagation()">
    <div class="sheet-hdr"><p class="sheet-title">📅 Set Deadline — ${wi.name}</p><button onclick="closeModal()" style="background:none;border:none;cursor:pointer;color:#888;font-size:26px;line-height:1">×</button></div>
    <p class="sec-label">Target Completion Date</p>
    <input class="inp" id="dl-date" type="date" value="${wi.deadline||''}" min="${TODAY}"/>
    <p style="font-size:12px;color:#888;margin-bottom:14px">App will show if you're on track based on productivity rate + available workers.</p>
    <button class="submit-btn" onclick="saveDeadline('${wid}')">Set Deadline ✓</button>
    ${wi.deadline?`<button onclick="clearDeadline('${wid}')" style="width:100%;margin-top:8px;padding:12px;border-radius:10px;background:#fef2f2;border:1.5px solid #fca5a5;color:#dc2626;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Remove Deadline</button>`:''}
  </div>`;
}
function saveDeadline(wid){
  const d=document.getElementById('dl-date').value;
  if(!d)return alert('Date select karo!');
  state.workItems=(state.workItems||[]).map(wi=>wi.id===wid?{...wi,deadline:d}:wi);
  saveData();render();document.getElementById('overlay').style.display='none';
}
function clearDeadline(wid){
  state.workItems=(state.workItems||[]).map(wi=>wi.id===wid?{...wi,deadline:null}:wi);
  saveData();render();document.getElementById('overlay').style.display='none';
}

// ── Modals ────────────────────────────────────────────────────────────
function openModal(type){
  wRateType='perday';payMethodChoice='cash';_selectedSkills=[];_selectedTaskWorkers=[];
  const o=document.getElementById('overlay');
  o.style.display='flex';
  const titles={worker:'Add New Worker',task:'Assign New Task',advance:'Record Advance',expense:'Add My Expense'};
  o.innerHTML=`<div class="sheet" onclick="event.stopPropagation()">
    <div class="sheet-hdr">
      <p class="sheet-title">${titles[type]}</p>
      <button onclick="closeModal()" style="background:none;border:none;cursor:pointer;color:#888;font-size:26px;line-height:1">×</button>
    </div>
    ${type==='worker'?workerForm():type==='task'?taskForm():type==='expense'?expenseForm():advanceForm()}
  </div>`;
}
function closeModal(e){
  if(e&&e.target!==document.getElementById('overlay'))return;
  document.getElementById('overlay').style.display='none';
}

// ── Worker Form ────────────────────────────────────────────────────────
function workerForm(){
  return `
    <div style="display:flex;flex-direction:column;align-items:center;margin-bottom:16px">
      <div id="photo-preview" style="width:80px;height:80px;border-radius:50%;background:#e5e5e0;display:flex;align-items:center;justify-content:center;font-size:36px;margin-bottom:8px;overflow:hidden">👷</div>
      <label style="background:#E8921A;color:#1a1a1a;padding:7px 14px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">
        📷 Add Photo
        <input type="file" accept="image/*" capture="user" id="wphoto-input" onchange="previewPhoto()" style="display:none"/>
      </label>
    </div>
    <p class="sec-label">Worker Name</p>
    <input class="inp" id="wn" placeholder="e.g. Ramesh Kumar" autocomplete="off"/>
    <p class="sec-label">Skills <span style="font-size:11px;color:#aaa">(select → sets Karigar/Labour auto)</span></p>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px" id="skill-chips">
      ${['Mason','Bar Bender','Carpenter','Painter','Plumber','Electrician','Tiler','Welder','Helper','Scaffolding'].map(s=>`<button type="button" onclick="toggleSkill('${s}',this)" style="padding:5px 11px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;border:1.5px solid #ddd;background:#f5f5f5;color:#666;font-family:inherit">${s}</button>`).join('')}
    </div>
    <p class="sec-label">Rate Type</p>
    <div class="two-col" style="margin-bottom:0">
      <button class="type-btn" id="wrt-perday" onclick="selRateType('perday')" style="background:#E8921A;color:#1a1a1a;border-color:#E8921A;font-weight:700">Per Day</button>
      <button class="type-btn" id="wrt-perpiece" onclick="selRateType('perpiece')">Per Piece</button>
    </div>
    <p style="font-size:11px;color:#888;margin-bottom:12px;margin-top:4px" id="ratetype-hint">Daily wage worker</p>
    <p class="sec-label" id="rate-label">Daily Rate (₹)</p>
    <input class="inp" id="wrate" type="number" placeholder="e.g. 600" inputmode="numeric"/>
    <p class="sec-label">Phone (optional)</p>
    <input class="inp" id="wphone" placeholder="e.g. 9876543210" type="tel"/>
    <p class="sec-label">Aadhaar Number (optional)</p>
    <input class="inp" id="waadhaar" placeholder="e.g. 1234 5678 9012" inputmode="numeric" maxlength="14"/>
    <button class="submit-btn" onclick="submitWorker()">Add Worker ✓</button>`;
}

let capturedPhoto=null;
function previewPhoto(){
  const file=document.getElementById('wphoto-input').files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    capturedPhoto=e.target.result;
    const prev=document.getElementById('photo-preview');
    prev.innerHTML=`<img src="${capturedPhoto}" style="width:100%;height:100%;object-fit:cover"/>`;
  };
  reader.readAsDataURL(file);
}

function selRateType(t){
  wRateType=t;
  const a=document.getElementById('wrt-perday'),b=document.getElementById('wrt-perpiece');
  const hint=document.getElementById('ratetype-hint');
  const lbl=document.getElementById('rate-label');
  const inp=document.getElementById('wrate');
  if(t==='perday'){
    a.style.cssText='background:#E8921A;color:#1a1a1a;border-color:#E8921A;font-weight:700;padding:11px;border-radius:10px;font-size:14px;cursor:pointer;font-family:inherit';
    b.style.cssText='background:#f5f5f5;color:#666;border:1px solid #ddd;font-weight:400;padding:11px;border-radius:10px;font-size:14px;cursor:pointer;font-family:inherit';
    if(hint)hint.textContent='Daily wage worker';
    if(lbl)lbl.textContent='Daily Rate (₹)';
    if(inp)inp.placeholder='e.g. 600';
  } else {
    b.style.cssText='background:#E8921A;color:#1a1a1a;border-color:#E8921A;font-weight:700;padding:11px;border-radius:10px;font-size:14px;cursor:pointer;font-family:inherit';
    a.style.cssText='background:#f5f5f5;color:#666;border:1px solid #ddd;font-weight:400;padding:11px;border-radius:10px;font-size:14px;cursor:pointer;font-family:inherit';
    if(hint)hint.textContent='Paid per piece/unit — e.g. ₹8/brick, ₹25/sqft';
    if(lbl)lbl.textContent='Rate per Piece (₹)';
    if(inp)inp.placeholder='e.g. 25';
  }
}

function submitWorker(){
  const n=document.getElementById('wn').value.trim();
  const rate=document.getElementById('wrate').value;
  const ph=document.getElementById('wphone').value.trim();
  const aadhaar=document.getElementById('waadhaar').value.trim();
  if(!n||!rate)return alert('Name aur rate daalna zaroori hai!');
  const KARIGAR_SKILLS=['Mason','Bar Bender','Carpenter','Painter','Plumber','Electrician','Tiler','Welder','Scaffolding'];
  const type=_selectedSkills.some(s=>KARIGAR_SKILLS.includes(s))?'karigar':'labour';
  state.workers.push({id:gid(),name:n,type,rateType:wRateType,rate:Number(rate),phone:ph,aadhaar,photo:capturedPhoto||null,joinedOn:TODAY,skills:[..._selectedSkills]});
  capturedPhoto=null;_selectedSkills=[];
  saveData();render();document.getElementById('overlay').style.display='none';
}

// ── Task Form (with BOQ quantity) ─────────────────────────────────────
function taskForm(){
  const chips=state.workers.map(w=>`<button type="button" id="tw-${w.id}" onclick="toggleTaskWorker('${w.id}',this)" style="display:inline-flex;align-items:center;gap:5px;padding:6px 10px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:1.5px solid #ddd;background:#f5f5f5;color:#666;font-family:inherit;margin:2px">${w.photo?`<img src="${w.photo}" style="width:18px;height:18px;border-radius:50%;object-fit:cover"/>`:''}<span>${w.name}</span><span style="font-size:10px;opacity:.7">${(w.skills&&w.skills[0])||w.type}</span></button>`).join('');
  return `<p class="sec-label">Task Name</p>
    <input class="inp" id="ttitle" placeholder="e.g. 2nd floor plastering" autocomplete="off"/>
    <p class="sec-label">Details (optional)</p>
    <input class="inp" id="tdesc" placeholder="e.g. Complete by Thursday" autocomplete="off"/>
    <p class="sec-label">Assign Workers <span style="font-size:11px;color:#aaa">(tap to select, multiple ok)</span></p>
    <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:14px;background:#f8f7f5;border-radius:10px;padding:10px" id="task-worker-chips">
      ${chips||'<p style="font-size:13px;color:#aaa">No workers added yet</p>'}
    </div>
    <p class="sec-label">Quantity (BOQ)</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
      <input class="inp" id="ttotalqty" type="number" placeholder="Total (e.g. 200)" inputmode="numeric" style="margin-bottom:0"/>
      <input class="inp" id="tunit" placeholder="Unit (sqft, bricks…)" style="margin-bottom:0" autocomplete="off"/>
    </div>
    <p class="sec-label">Done So Far</p>
    <input class="inp" id="tdoneqty" type="number" placeholder="e.g. 80" inputmode="numeric"/>
    <p class="sec-label">Date Assigned</p>
    <input class="inp" id="tdate" type="date" value="${TODAY}"/>
    <button class="submit-btn" onclick="submitTask()">Assign Task ✓</button>`;
}

let _selectedTaskWorkers=[];
function toggleTaskWorker(wid,btn){
  const idx=_selectedTaskWorkers.indexOf(wid);
  if(idx>=0){_selectedTaskWorkers.splice(idx,1);btn.style.background='#f5f5f5';btn.style.color='#666';btn.style.borderColor='#ddd';}
  else{_selectedTaskWorkers.push(wid);btn.style.background='#1c1c1e';btn.style.color='#E8921A';btn.style.borderColor='#1c1c1e';}
}

function submitTask(){
  const t=document.getElementById('ttitle').value.trim();
  const d=document.getElementById('tdesc').value.trim();
  const date=document.getElementById('tdate').value||TODAY;
  const totalQty=document.getElementById('ttotalqty').value;
  const doneQty=document.getElementById('tdoneqty').value||'0';
  const unit=document.getElementById('tunit').value.trim();
  if(!t)return alert('Task name daalna zaroori hai!');
  // backward compat: assignedTo = first selected, assignedWorkers = all
  const assignedWorkers=[..._selectedTaskWorkers];
  state.tasks.unshift({id:gid(),title:t,description:d,assignedTo:assignedWorkers[0]||'',assignedWorkers,status:'pending',createdAt:date,totalQty:totalQty?Number(totalQty):null,doneQty:Number(doneQty),unit,pieceQty:totalQty?Number(doneQty):null});
  _selectedTaskWorkers=[];
  saveData();render();document.getElementById('overlay').style.display='none';
}

// ── Advance Form ──────────────────────────────────────────────────────
function advanceForm(){
  const wopts=state.workers.map(w=>`<option value="${w.id}">${w.name} · ${w.type==='karigar'?'Karigar':'Labour'}</option>`).join('');
  return `<p class="sec-label">Select Worker</p>
    <select class="sel" id="aworker"><option value="">-- Select Worker --</option>${wopts}</select>
    <p class="sec-label">Amount (₹)</p>
    <input class="inp" id="aamount" type="number" placeholder="e.g. 500" inputmode="numeric"/>
    <p class="sec-label">Date</p>
    <input class="inp" id="adate" type="date" value="${TODAY}" max="${TODAY}"/>
    <p class="sec-label">Reason (optional)</p>
    <input class="inp" id="anote" placeholder="e.g. Medical, Festival" autocomplete="off"/>
    <button class="submit-btn" onclick="submitAdvance()">Record Advance ✓</button>`;
}
function submitAdvance(){
  const wid=document.getElementById('aworker').value;
  const amount=document.getElementById('aamount').value;
  const note=document.getElementById('anote').value.trim();
  const date=document.getElementById('adate').value||TODAY;
  if(!wid||!amount)return alert('Worker aur amount select karo!');
  if(!state.advances)state.advances=[];
  state.advances.unshift({id:gid(),workerId:wid,amount:Number(amount),note,date});
  saveData();render();document.getElementById('overlay').style.display='none';
}

// ── Expense Form ──────────────────────────────────────────────────────
function expenseForm(){
  const catOpts=EXP_CATS.map(c=>`<option value="${c.id}">${c.emoji} ${c.label}</option>`).join('');
  return `<p class="sec-label">Category</p>
    <select class="sel" id="ecat">${catOpts}</select>
    <p class="sec-label">Amount (₹)</p>
    <input class="inp" id="eamount" type="number" placeholder="e.g. 250" inputmode="numeric"/>
    <p class="sec-label">Date</p>
    <input class="inp" id="edate" type="date" value="${TODAY}" max="${TODAY}"/>
    <p class="sec-label">Note / Description (optional)</p>
    <input class="inp" id="enote" placeholder="e.g. 2 pairs gloves for Ramesh" autocomplete="off"/>
    <p class="sec-label">Bill Photo (optional)</p>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
      <div id="exp-photo-preview" style="width:56px;height:56px;border-radius:8px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-size:24px;overflow:hidden;flex-shrink:0">🧾</div>
      <label style="background:#f5f5f5;border:1px solid #ddd;color:#555;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">
        📷 Capture Bill
        <input type="file" accept="image/*" capture="environment" id="exp-photo-input" onchange="previewExpPhoto()" style="display:none"/>
      </label>
    </div>
    <button class="submit-btn" onclick="submitMyExpense()">Add Expense ✓</button>`;
}

let capturedExpPhoto=null;
function previewExpPhoto(){
  const file=document.getElementById('exp-photo-input').files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    capturedExpPhoto=e.target.result;
    const prev=document.getElementById('exp-photo-preview');
    prev.innerHTML=`<img src="${capturedExpPhoto}" style="width:100%;height:100%;object-fit:cover"/>`;
  };
  reader.readAsDataURL(file);
}

function submitMyExpense(){
  const category=document.getElementById('ecat').value;
  const amount=document.getElementById('eamount').value;
  const date=document.getElementById('edate').value||TODAY;
  const note=document.getElementById('enote').value.trim();
  if(!amount||Number(amount)<=0)return alert('Amount daalo!');
  if(!state.myExpenses)state.myExpenses=[];
  state.myExpenses.unshift({id:gid(),category,amount:Number(amount),date,note,photo:capturedExpPhoto||null});
  capturedExpPhoto=null;
  saveData();render();document.getElementById('overlay').style.display='none';
  setTab('finance');
}

// ── Google Drive Backup ───────────────────────────────────────────────
const GDRIVE_CLIENT_ID='YOUR_GOOGLE_CLIENT_ID'; // user sets this
const GDRIVE_SCOPES='https://www.googleapis.com/auth/drive.file';
const GDRIVE_FILE_NAME=()=>`SiteManager_${(siteMeta.sites.find(s=>s.id===siteMeta.activeSiteId)||{}).name||'backup'}_backup.json`;

function initGoogleAuth(){
  if(typeof google==='undefined'||!google.accounts)return;
  google.accounts.oauth2.initTokenClient({
    client_id:GDRIVE_CLIENT_ID,
    scope:GDRIVE_SCOPES,
    callback:(resp)=>{
      if(resp.error){alert('Google auth failed: '+resp.error);return;}
      driveAccessToken=resp.access_token;
      // get user email
      fetch('https://www.googleapis.com/oauth2/v3/userinfo',{headers:{Authorization:'Bearer '+driveAccessToken}})
        .then(r=>r.json()).then(u=>{driveUserEmail=u.email||'Connected';renderContent();});
    }
  });
}

function connectGoogleDrive(){
  if(GDRIVE_CLIENT_ID==='YOUR_GOOGLE_CLIENT_ID'){
    openSetClientIdModal();return;
  }
  if(typeof google==='undefined'||!google.accounts){alert('Google script not loaded. Check internet connection.');return;}
  try{
    const tc=google.accounts.oauth2.initTokenClient({
      client_id:GDRIVE_CLIENT_ID,scope:GDRIVE_SCOPES,
      callback:(resp)=>{
        if(resp.error){alert('Auth error: '+resp.error);return;}
        driveAccessToken=resp.access_token;
        fetch('https://www.googleapis.com/oauth2/v3/userinfo',{headers:{Authorization:'Bearer '+driveAccessToken}})
          .then(r=>r.json()).then(u=>{driveUserEmail=u.email||'Connected';renderContent();
            showToast('✅ Google Drive connected: '+driveUserEmail);});
      }
    });
    tc.requestAccessToken();
  }catch(e){alert('Google OAuth error: '+e.message);}
}

function disconnectDrive(){driveAccessToken=null;driveUserEmail=null;renderContent();}

function openSetClientIdModal(){
  const o=document.getElementById('overlay');o.style.display='flex';
  o.innerHTML=`<div class="sheet" onclick="event.stopPropagation()">
    <div class="sheet-hdr"><p class="sheet-title">🔑 Setup Google Drive</p><button onclick="closeModal()" style="background:none;border:none;cursor:pointer;color:#888;font-size:26px;line-height:1">×</button></div>
    <div style="background:#fff3e0;border:1px solid #fed7aa;border-radius:10px;padding:12px;margin-bottom:16px;font-size:13px;line-height:1.6;color:#92400e">
      <strong>One-time setup:</strong><br/>
      1. Go to <strong>console.cloud.google.com</strong><br/>
      2. Create project → Enable Drive API<br/>
      3. OAuth 2.0 → Web client → Add your URL as origin<br/>
      4. Copy Client ID and paste below
    </div>
    <p class="sec-label">Google OAuth Client ID</p>
    <input class="inp" id="gclient-id" placeholder="xxxx.apps.googleusercontent.com" autocomplete="off" value="${localStorage.getItem('gdrive_client_id')||''}"/>
    <button class="submit-btn" onclick="saveClientId()">Save & Connect ✓</button>
  </div>`;
}

function saveClientId(){
  const v=document.getElementById('gclient-id').value.trim();
  if(!v)return alert('Client ID daalo!');
  localStorage.setItem('gdrive_client_id',v);
  closeModal();
  // patch constant and retry
  window._gClientId=v;
  connectGoogleDriveWithId(v);
}

function connectGoogleDriveWithId(cid){
  if(typeof google==='undefined'||!google.accounts){alert('Google script not loaded.');return;}
  try{
    const tc=google.accounts.oauth2.initTokenClient({
      client_id:cid,scope:GDRIVE_SCOPES,
      callback:(resp)=>{
        if(resp.error){alert('Auth error: '+resp.error);return;}
        driveAccessToken=resp.access_token;
        fetch('https://www.googleapis.com/oauth2/v3/userinfo',{headers:{Authorization:'Bearer '+driveAccessToken}})
          .then(r=>r.json()).then(u=>{driveUserEmail=u.email||'Connected';renderContent();showToast('✅ Drive connected: '+driveUserEmail);});
      }
    });
    tc.requestAccessToken();
  }catch(e){alert('Error: '+e.message);}
}

async function exportToDrive(){
  if(!driveAccessToken){connectGoogleDrive();return;}
  const payload=JSON.stringify({siteName:(siteMeta.sites.find(s=>s.id===siteMeta.activeSiteId)||{}).name,exportedAt:new Date().toISOString(),data:state},null,2);
  const fname=GDRIVE_FILE_NAME();
  // check if file exists
  showToast('⏳ Uploading to Drive...');
  try{
    const search=await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${fname}' and trashed=false&fields=files(id,name)`,{headers:{Authorization:'Bearer '+driveAccessToken}});
    const sdata=await search.json();
    const existing=sdata.files&&sdata.files[0];
    let url,method;
    if(existing){url=`https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media`;method='PATCH';}
    else{
      // create metadata first
      const meta=await fetch('https://www.googleapis.com/drive/v3/files',{method:'POST',headers:{Authorization:'Bearer '+driveAccessToken,'Content-Type':'application/json'},body:JSON.stringify({name:fname,mimeType:'application/json'})});
      const md=await meta.json();
      url=`https://www.googleapis.com/upload/drive/v3/files/${md.id}?uploadType=media`;method='PATCH';
    }
    await fetch(url,{method,headers:{Authorization:'Bearer '+driveAccessToken,'Content-Type':'application/json'},body:payload});
    showToast('✅ Backup saved to Google Drive!');
  }catch(e){showToast('❌ Drive upload failed: '+e.message);}
}

async function importFromDrive(){
  if(!driveAccessToken){connectGoogleDrive();return;}
  const fname=GDRIVE_FILE_NAME();
  showToast('⏳ Loading from Drive...');
  try{
    const search=await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${fname}' and trashed=false&fields=files(id,name,modifiedTime)`,{headers:{Authorization:'Bearer '+driveAccessToken}});
    const sdata=await search.json();
    if(!sdata.files||!sdata.files.length){showToast('❌ No backup found on Drive for this site.');return;}
    const fid=sdata.files[0].id;
    const content=await fetch(`https://www.googleapis.com/drive/v3/files/${fid}?alt=media`,{headers:{Authorization:'Bearer '+driveAccessToken}});
    const parsed=await content.json();
    if(parsed.data){
      if(!confirm(`Import backup from ${new Date(parsed.exportedAt).toLocaleString('en-IN')}? Current data will be replaced.`))return;
      state={...BLANK_SITE(),...parsed.data};saveData();render();showToast('✅ Data restored from Drive!');
    }
  }catch(e){showToast('❌ Import failed: '+e.message);}
}

function showToast(msg){
  let t=document.getElementById('toast');
  if(!t){t=document.createElement('div');t.id='toast';t.style.cssText='position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#1c1c1e;color:#fff;padding:10px 18px;border-radius:10px;font-size:13px;font-weight:600;z-index:999;white-space:nowrap;max-width:90vw;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,.3)';document.body.appendChild(t);}
  t.textContent=msg;t.style.opacity='1';t.style.display='block';
  clearTimeout(t._to);t._to=setTimeout(()=>{t.style.opacity='0';setTimeout(()=>{t.style.display='none';},300);},3000);
}

// ── Excel Export (SheetJS) ────────────────────────────────────────────
function exportExcel(){
  if(typeof XLSX==='undefined'){showToast('❌ SheetJS not loaded. Check internet.');return;}
  const mf=finMonthFilter;
  const filterFn=x=>!mf||(x.date||'').startsWith(mf);
  const filterAtt=d=>!mf||d.startsWith(mf);
  const siteName=(siteMeta.sites.find(s=>s.id===siteMeta.activeSiteId)||{}).name||'Site';
  const wb=XLSX.utils.book_new();

  // ── Sheet 1: Attendance ──
  const attDates=Object.keys(state.attendance).filter(filterAtt).sort();
  const attHeader=['Worker','Type','Rate/Day',...attDates,'Total Full','Total Half','Days Worked'];
  const attRows=state.workers.map(w=>{
    const cells=[w.name,w.type==='karigar'?'Karigar':'Labour',w.rateType==='perpiece'?`₹${w.rate}/pc`:`₹${w.rate}`];
    let full=0,half=0;
    attDates.forEach(d=>{const a=(state.attendance[d]||{})[w.id]||'absent';if(a==='full'||a==='present'){cells.push('P');full++;}else if(a==='half'){cells.push('H');half++;}else cells.push('');});
    cells.push(full,half,full+half*0.5);
    return cells;
  });
  const attWs=XLSX.utils.aoa_to_sheet([attHeader,...attRows]);
  // style header row width
  attWs['!cols']=[{wch:20},{wch:10},{wch:10},...attDates.map(()=>({wch:6})),{wch:10},{wch:10},{wch:12}];
  XLSX.utils.book_append_sheet(wb,attWs,mf?`Att ${mf}`:'Attendance');

  // ── Sheet 2: Payroll ──
  const prHeader=['Worker','Type','Rate Type','Rate','Full Days','Half Days','Wages','OT','Total Earned','Advance','Salary Paid','Pay Method','Balance'];
  const prRows=state.workers.map(w=>{
    let earned=0,ot=0,full=0,half=0;
    if(w.rateType==='perpiece'){
      const q=(state.tasks||[]).filter(t=>t.assignedTo===w.id&&t.status==='done'&&t.pieceQty&&filterFn({date:t.createdAt||''})).reduce((s,t)=>s+Number(t.pieceQty||0),0);
      earned=q*Number(w.rate);
    } else {
      Object.entries(state.attendance).filter(([d])=>filterAtt(d)).forEach(([,day])=>{const a=day[w.id];if(a==='full'||a==='present')full++;else if(a==='half')half++;});
      earned=full*Number(w.rate)+half*Number(w.rate)/2;
      ot=(state.overtime||[]).filter(o=>o.workerId===w.id&&filterAtt(o.date)).reduce((s,o)=>s+Number(o.hours)*(Number(w.rate)/8)*1.5,0);
      earned+=ot;
    }
    const adv=(state.advances||[]).filter(a=>a.workerId===w.id&&filterFn(a)).reduce((s,a)=>s+Number(a.amount),0);
    const paid=(state.salaryPayments||[]).filter(p=>p.workerId===w.id&&filterFn(p)).reduce((s,p)=>s+Number(p.amount),0);
    const payMethods=[...new Set((state.salaryPayments||[]).filter(p=>p.workerId===w.id&&filterFn(p)).map(p=>p.payMethod||'cash'))].join(',');
    const net=earned-adv-paid;
    return [w.name,w.type,w.rateType==='perpiece'?'Per Piece':'Per Day',Number(w.rate),full,half,earned-ot,ot,earned,adv,paid,payMethods||'cash',net];
  });
  const totalRow=['TOTAL','','','','','',
    prRows.reduce((s,r)=>s+r[6],0),
    prRows.reduce((s,r)=>s+r[7],0),
    prRows.reduce((s,r)=>s+r[8],0),
    prRows.reduce((s,r)=>s+r[9],0),
    prRows.reduce((s,r)=>s+r[10],0),
    '',prRows.reduce((s,r)=>s+r[12],0)];
  const prWs=XLSX.utils.aoa_to_sheet([prHeader,...prRows,totalRow]);
  prWs['!cols']=[{wch:20},{wch:10},{wch:10},{wch:8},{wch:8},{wch:8},{wch:10},{wch:8},{wch:12},{wch:10},{wch:10},{wch:12},{wch:10}];
  XLSX.utils.book_append_sheet(wb,prWs,mf?`Payroll ${mf}`:'Payroll');

  // ── Sheet 3: Expenses ──
  const expFilt=(state.myExpenses||[]).filter(filterFn);
  if(expFilt.length){
    const expHeader=['Category','Date','Note','Amount (₹)'];
    const expRows=expFilt.map(e=>[catInfo(e.category).label,e.date,e.note||'',Number(e.amount)]);
    expRows.push(['TOTAL','','',expFilt.reduce((s,e)=>s+Number(e.amount),0)]);
    const expWs=XLSX.utils.aoa_to_sheet([expHeader,...expRows]);
    expWs['!cols']=[{wch:20},{wch:12},{wch:30},{wch:12}];
    XLSX.utils.book_append_sheet(wb,expWs,'Expenses');
  }

  // ── Sheet 4: Work Progress ──
  if((state.workItems||[]).length){
    const wiHeader=['Work Item','Unit','Total Qty','Done','Remaining','% Complete'];
    const wiRows=(state.workItems||[]).map(wi=>{
      const rem=Math.max(0,Number(wi.totalSqft||0)-Number(wi.doneSqft||0));
      const pct=Number(wi.totalSqft||0)>0?Math.round(Number(wi.doneSqft||0)/Number(wi.totalSqft||0)*100):0;
      return [wi.name,wi.unit||'sqft',Number(wi.totalSqft||0),Number(wi.doneSqft||0),rem,pct+'%'];
    });
    const wiWs=XLSX.utils.aoa_to_sheet([wiHeader,...wiRows]);
    wiWs['!cols']=[{wch:25},{wch:8},{wch:10},{wch:10},{wch:10},{wch:10}];
    XLSX.utils.book_append_sheet(wb,wiWs,'Work Progress');
  }

  const fname=`${siteName}_${mf||'AllTime'}_${TODAY}.xlsx`;
  XLSX.writeFile(wb,fname);
  showToast('✅ Excel downloaded: '+fname);
}

loadData();
// load saved client id
(()=>{const cid=localStorage.getItem('gdrive_client_id');if(cid)window._gClientId=cid;})();
