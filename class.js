/* 송현학당 · 학급 기능: 선생님 화면(출석·공부 시간), 강의실 이름, 채팅 시간, 입장 시간 */
const CLS_DEF={rsv:'',boards:{},rooms:{},chat:'on',ch:[8,22],lock:'off',lk:[23,6]};
let CLS=JSON.parse(JSON.stringify(CLS_DEF)),clsSub=false;
const RKEYS=[['basics','강의실 1'],['potion','강의실 2'],['herbs','강의실 3'],['training','강의실 4'],['library','도서관'],['dorm','기숙사']];
const hh=h=>`${h}시`;
function inHours(a,b,h){return a<=b?(h>=a&&h<b):(h>=a||h<b);}
function chatOpen(){if(ADMIN_ON)return true;if(CLS.chat==='off')return false;if(CLS.chat==='hours')return inHours(+CLS.ch[0],+CLS.ch[1],new Date().getHours());return true;}
function isLocked(){if(ADMIN_ON||CLS.lock!=='on')return false;return inHours(+CLS.lk[0],+CLS.lk[1],new Date().getHours());}

function applyRooms(){let changed=false;RKEYS.forEach(([k])=>{const v=(CLS.rooms||{})[k];const D=ROOM_DEF[k];if(!D)return;const nm=(typeof v==='string'&&v.trim())?v.trim().slice(0,14):D.name;
    if(ROOMS[k].name!==nm){ROOMS[k].name=nm;changed=true;}const B=(CLS.boards||{})[k]||{};const custom=nm!==D.name;ROOMS[k].title=custom?(B[1]?esc(String(B[1]).slice(0,24)):esc(nm))+'<br>오늘도 함께 공부해요.':D.title;ROOMS[k].en=custom?'SONGHYEON · '+(k==='library'?'LIBRARY':k==='dorm'?'DORMITORY':'CLASSROOM'):D.en;if(SUBJ[k])SUBJ[k][0]=nm;const b=document.querySelector(`#mapList [data-go="${k}"] b`);if(b)b.textContent=nm;});
  if(changed&&typeof rebuildSeason==='function'&&SP)rebuildSeason();}
function applyChat(){const i=$('#chatIn');if(!i)return;const open=chatOpen();i.disabled=!open;$('#chatSend').disabled=!open;
  i.placeholder=open?'반 친구들에게 한마디':CLS.chat==='off'?'선생님이 채팅을 잠시 닫았어요':`채팅은 ${hh(CLS.ch[0])}~${hh(CLS.ch[1])}에 열려요`;}
function applyLock(){const el=$('#closed');if(!el)return;const L=isLocked();el.classList.toggle('show',L);if(L)$('#closedTxt').innerHTML=`지금은 학당 문이 닫혀 있어요<br><small>${hh(CLS.lk[1])}에 다시 열려요 · 푹 쉬고 내일 만나요 🌙</small>`;}
function applyBoards(){const nb=JSON.stringify(CLS.boards||{});if(nb===window.__bdSig)return;const first=window.__bdSig===undefined;window.__bdSig=nb;window.CLS_BOARDS=CLS.boards||{};if(!first||nb!=='{}'){if(typeof rebuildSeason==='function'&&SP)rebuildSeason();}}
function applyCls(){applyBoards();applyRooms();applyChat();applyLock();}
setInterval(()=>{if(!clsSub&&typeof DB!=='undefined'&&DB&&MODE==='shared'){clsSub=true;DB.doc('settings/class').onSnapshot(d=>{const v=(d&&d.exists&&d.data())||{};CLS=Object.assign(JSON.parse(JSON.stringify(CLS_DEF)),v);const arr=(x,d)=>x&&typeof x==='object'&&x[0]!=null&&x[1]!=null?[+x[0],+x[1]]:d;CLS.ch=arr(CLS.ch,CLS_DEF.ch);CLS.lk=arr(CLS.lk,CLS_DEF.lk);applyCls();if($('#teacher').classList.contains('show'))renderTeacher(true);},()=>{});}
  applyChat();applyLock();const t=$('#tTile');if(t)t.hidden=!ADMIN_ON;},1500);

/* ---------- 선생님 화면 ---------- */
function weekStart(){const d=new Date();const wd=(d.getDay()+6)%7;d.setHours(0,0,0,0);d.setDate(d.getDate()-wd);return d.getTime();}
function classStats(){const now=new Date(),tk=dkey(now),mp=tk.slice(0,8);const w0=weekStart(),m0=new Date(now.getFullYear(),now.getMonth(),1).getTime();
  const ids=new Set([...Object.keys(MEMBERS||{}),...Object.keys(STAMPS||{})]);(DATA.logs||[]).forEach(l=>l.by&&ids.add(l.by));
  const rows=[...ids].filter(id=>id&&id!=='me').map(id=>{const days=(STAMPS[id]&&STAMPS[id].days)||{};const ks=Object.keys(days);
    const logs=(DATA.logs||[]).filter(l=>l.by===id);const sum=f=>Math.round(logs.filter(f).reduce((a,l)=>a+(+l.sec||0),0)/60);
    const books=(DATA.books||[]).filter(b=>b.by===id).length;const last=Math.max(0,...logs.map(l=>l.ts||0),(STAMPS[id]&&STAMPS[id].ts)||0,(MEMBERS[id]&&MEMBERS[id].ts)||0);
    return {id,nick:nameOf(id),today:!!days[tk],memo:days[tk]&&days[tk].m||'',mDays:ks.filter(k=>k.startsWith(mp)).length,aDays:ks.length,wMin:sum(l=>l.ts>=w0),mMin:sum(l=>l.ts>=m0),aMin:sum(()=>true),books,last,me:id===MYID};});
  rows.sort((a,b)=>a.nick.localeCompare(b.nick,'ko'));return rows;}
const fmtMin=m=>m>=60?`${Math.floor(m/60)}시간 ${m%60}분`:`${m}분`;
let tSort='name';
/* ---------- 선생님 화면: 닉네임별로 묶어 한 줄씩 · 검색 · 골라 보기 · 숨기기 ---------- */
let tFilter='all',tQuery='',tOpen='';
function teacherGroups(){const rows=classStats().filter(r=>!r.me);const G={};
  rows.forEach(r=>{const k=(r.nick||'').trim().toLowerCase()||r.id;(G[k]=G[k]||[]).push(r);});
  const now=new Date(),tk=dkey(now);
  return Object.values(G).map(L=>{L.sort((a,b)=>b.last-a.last);const ids=L.map(r=>r.id);const S=new Set(ids);
    const days={};ids.forEach(id=>{const d=(STAMPS[id]&&STAMPS[id].days)||{};Object.keys(d).forEach(k=>{if(!days[k])days[k]=d[k];});});
    const W=[];ids.forEach(id=>warnsOf(id).forEach(w=>{if(!W.some(x=>x.id===w.id))W.push(w);}));
    const per={};(DATA.logs||[]).filter(l=>S.has(l.by)).forEach(l=>{const k=dkey(new Date(l.ts||0));per[k]=(per[k]||0)+(+l.sec||0);});
    const st=Math.max(0,Object.keys(days).length-W.length),sd=Object.values(per).filter(v=>v>=3600).length;
    const sum=f=>L.reduce((a,r)=>a+f(r),0);
    return {key:(L[0].nick||'').trim(),nick:L[0].nick,ids,n:L.length,today:!!days[tk],memo:(days[tk]&&days[tk].m)||'',
      mDays:Object.keys(days).filter(k=>k.startsWith(tk.slice(0,8))).length,wMin:sum(r=>r.wMin),aMin:sum(r=>r.aMin),books:sum(r=>r.books),last:Math.max(0,...L.map(r=>r.last)),
      W,snack:{ok:st>=3&&sd>=3,st,sd,given:ids.some(id=>SNACKV[id])}};});}
function renderTeacher(keepForm){const el=$('#tBody');if(!el)return;if(!ADMIN_ON){el.innerHTML='<div class="empty">선생님 암호로 들어오면 볼 수 있어요.</div>';return;}
  const hid=LS.get('tHidden',{});let all=teacherGroups();const vis=all.filter(g=>!hid[g.key]);
  const DAY=86400000,now=Date.now();
  const F={all:['전체',g=>!hid[g.key]],today:['오늘 출석',g=>!hid[g.key]&&g.today],absent:['미출석',g=>!hid[g.key]&&!g.today],snack:['간식 대상',g=>!hid[g.key]&&g.snack.ok&&!g.snack.given],warn:['경고',g=>!hid[g.key]&&g.W.length],away:['7일+ 안 옴',g=>!hid[g.key]&&now-g.last>7*DAY],hidden:['숨김',g=>!!hid[g.key]]};
  let R=all.filter(F[tFilter][1]);if(tQuery)R=R.filter(g=>g.nick.toLowerCase().includes(tQuery));
  if(tSort==='att')R.sort((a,b)=>b.mDays-a.mDays||a.nick.localeCompare(b.nick,'ko'));else if(tSort==='study')R.sort((a,b)=>b.wMin-a.wMin||a.nick.localeCompare(b.nick,'ko'));else R.sort((a,b)=>a.nick.localeCompare(b.nick,'ko'));
  const cnt=k=>all.filter(F[k][1]).length;
  $('#tSum').innerHTML=`<div><small>학생</small><b>${vis.length}</b>명</div><div><small>오늘 출석</small><b>${vis.filter(g=>g.today).length}</b>명</div><div><small>간식 대상</small><b>${cnt('snack')}</b>명</div><div><small>이번 주 공부</small><b>${Math.round(vis.reduce((a,g)=>a+g.wMin,0)/60)}</b>시간</div>`;
  let tools=$('#tTools');if(!tools){tools=document.createElement('div');tools.id='tTools';el.parentNode.insertBefore(tools,el);
    tools.innerHTML=`<input id="tSearch" placeholder="🔍 이름 찾기" autocomplete="off"><div id="tFilt"></div>`;
    tools.querySelector('#tSearch').addEventListener('input',e=>{tQuery=e.target.value.trim().toLowerCase();renderTeacher(true);});
    tools.addEventListener('click',e=>{const b=e.target.closest('[data-f]');if(b){tFilter=b.dataset.f;renderTeacher(true);}});}
  $('#tFilt').innerHTML=Object.entries(F).map(([k,[n]])=>`<button data-f="${k}" class="${tFilter===k?'on':''}">${n} <em>${cnt(k)}</em></button>`).join('');
  const ago2=t=>{if(!t)return '없음';const d=Math.floor((now-t)/DAY);return d<1?'오늘':d<2?'어제':d+'일 전';};
  el.innerHTML=R.length?`<div class="tTable"><div class="tH"><span>이름</span><span>오늘</span><span>이번 달</span><span>이번 주</span><span>간식</span></div>`+R.map(g=>{const op=tOpen===g.key,ids=g.ids.join(','),s=g.snack;
    return `<div class="tR${op?' open':''}${g.W.length?' warn':''}" data-open-g="${esc(g.key)}"><span class="tN"><b>${esc(g.nick)}</b>${g.W.length?`<i title="고운 말 경고">⚠️${g.W.length}</i>`:''}<small>${ago2(g.last)}</small></span><span>${g.today?'<em class="ok">✓</em>':'<em class="no">–</em>'}</span><span>${g.mDays}일</span><span>${fmtMin(g.wMin)}</span><span>${s.given?'<em class="ok">🍪✓</em>':s.ok?'<em class="snk">🍪 대상</em>':`<small>${Math.min(3,s.st)}/3·${Math.min(3,s.sd)}/3</small>`}</span></div>
    ${op?`<div class="tD">${g.memo?`<div class="tMemo">오늘 한마디 “${esc(g.memo)}”</div>`:''}
      <div class="tNums"><span><b>${fmtMin(g.aMin)}</b><small>누적 공부</small></span><span><b>${g.books}</b>편<small>독후감</small></span><span><b>${Math.min(3,s.st)}/3 · ${Math.min(3,s.sd)}/3</b><small>간식 (도장·1시간 공부한 날)</small></span></div>
      ${g.W.length?`<div class="tWarn">⚠️ 고운 말 경고 <b>${g.W.length}</b>회 · 간식 도장 −${g.W.length}<details><summary>내용 보기</summary>${g.W.slice(0,10).map(w=>`<div>${esc(new Date(w.ts||0).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}))} · ${esc(w.kind||'')} · “${esc(w.t||'')}”</div>`).join('')}</details></div>`:''}
      <div class="tAct">${s.ok||s.given?`<button data-tsnack="${ids}" class="${s.given?'done':'hot'}">${s.given?'🍪 간식 줬어요 ✓ (취소)':'🍪 간식 줬어요'}</button>`:''}${g.W.length?`<button data-tforgive="${ids}">🧽 경고 지우기</button>`:''}<button data-thide="${esc(g.key)}">${hid[g.key]?'👀 다시 보이기':'🙈 명단에서 숨기기'}</button><button data-treset="${ids}" class="danger">🧹 기록 지우기</button></div>
      ${g.n>1?`<div class="tSmall">여러 기기에서 들어온 기록 ${g.n}개를 한 명으로 합쳐 보여 줘요.</div>`:''}</div>`:''}`;}).join('')+'</div>'
    :`<div class="empty">${tFilter==='all'&&!tQuery?'아직 들어온 학생이 없어요.':'해당하는 학생이 없어요.'}</div>`;
  if(!keepForm||!$('#tForm').dataset.ready)fillTeacherForm();}
function fillTeacherForm(){const f=$('#tForm');f.dataset.ready='1';
  const BD=[['basics','강의실 1 칠판',['第一講 · 마법학 기초','기(氣)의 흐름과 주문의 첫걸음','“서두르지 말고, 멈추지 말라.”']],['potion','강의실 2 칠판',['靈藥 · 마법약 수업','오늘의 조제 — 집중의 물약','솥 앞 의자에 앉아 타이머를 시작하세요']],['herbs','강의실 3 칠판',['藥草園 · 약초학','오늘의 약초 — 월광초 기르기']]];
  $('#tBoards').innerHTML=BD.map(([k,lb,d])=>`<div class="tBd"><b>${lb}</b>${d.map((x,i)=>`<input data-bd="${k}" data-bi="${i}" maxlength="40" placeholder="${esc(x)}" value="${esc(((CLS.boards||{})[k]||{})[i]||'')}">`).join('')}</div>`).join('');
  $('#tRooms').innerHTML=RKEYS.map(([k,lb])=>`<label class="tIn"><span>${lb}</span><input data-room="${k}" maxlength="14" placeholder="${esc(ROOM_DEF[k].name)}" value="${esc((CLS.rooms||{})[k]||'')}"></label>`).join('');
  const hrs=sel=>Array.from({length:24},(_,h)=>`<option value="${h}">${h}시</option>`).join('');
  $('#tChat').value=CLS.chat;$('#tCh0').innerHTML=$('#tCh1').innerHTML=$('#tLk0').innerHTML=$('#tLk1').innerHTML=hrs();
  $('#tRsv').value=rsvClean(CLS.rsv);$('#tCh0').value=CLS.ch[0];$('#tCh1').value=CLS.ch[1];$('#tLock').value=CLS.lock;$('#tLk0').value=CLS.lk[0];$('#tLk1').value=CLS.lk[1];tVis();}
function tVis(){$('#tChH').hidden=$('#tChat').value!=='hours';$('#tLkH').hidden=$('#tLock').value!=='on';}
function csvExport(){const R=classStats().filter(r=>!r.me);const head=['닉네임','오늘 출석','이번 달 출석일','누적 출석일','이번 주 공부(분)','이번 달 공부(분)','누적 공부(분)','독후감 수','마지막 활동'];
  const q=v=>`"${String(v).replace(/"/g,'""')}"`;const lines=[head.map(q).join(',')].concat(R.map(r=>[r.nick,r.today?'O':'',r.mDays,r.aDays,r.wMin,r.mMin,r.aMin,r.books,r.last?new Date(r.last).toLocaleString('ko-KR'):''].map(q).join(',')));
  const blob=new Blob(['﻿'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`송현학당_${dkey(new Date())}.csv`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},800);toast('표 파일을 내려받았어요<small>엑셀에서 열 수 있어요</small>');}
document.addEventListener('DOMContentLoaded',()=>{});
(function bindTeacher(){const T=$('#teacher');if(!T)return;
  $('#tSortBar').addEventListener('click',e=>{const b=e.target.closest('[data-s]');if(!b)return;tSort=b.dataset.s;$$('#tSortBar button').forEach(x=>x.classList.toggle('on',x===b));renderTeacher(true);});
  $('#tCsv').addEventListener('click',csvExport);$('#tChat').addEventListener('change',tVis);$('#tLock').addEventListener('change',tVis);
  $('#tSave').addEventListener('click',async()=>{if(!DB||MODE!=='shared'){toast('학당이 연결돼 있어야 저장할 수 있어요');return;}
    const rooms={};$$('#tRooms [data-room]').forEach(i=>{const v=i.value.trim().slice(0,14);if(v)rooms[i.dataset.room]=v;});
    const boards={};$$('#tBoards [data-bd]').forEach(i=>{const v=i.value.trim().slice(0,40);if(v){(boards[i.dataset.bd]=boards[i.dataset.bd]||{})[i.dataset.bi]=v;}});
    const v={boards,rooms,chat:$('#tChat').value,ch:[+$('#tCh0').value,+$('#tCh1').value],lock:$('#tLock').value,lk:[+$('#tLk0').value,+$('#tLk1').value],rsv:rsvClean($('#tRsv').value),ts:Date.now()};if($('#tRsv').value.trim()&&!v.rsv){toast('웹 앱 주소를 확인해 주세요<small>https://script.google.com/macros/s/…/exec 모양이에요</small>');return;}
    try{await DB.doc('settings/class').set(v);toast('학급 설정을 저장했어요<small>학생들 화면에도 바로 바뀌어요</small>');}catch(e){toast('저장하지 못했어요<small>선생님 암호로 들어왔는지 확인해 주세요</small>');}});})();

/* ---------- 간식 미션 · 학생 초기화 ---------- */
let RESETV={},SNACKV={};let rsSub=false;
function snackOK(id){const days=id===MYID?myDays:((STAMPS[id]&&STAMPS[id].days)||{});const wn=warnsOf(id).length;const st=Math.max(0,Object.keys(days||{}).length-wn);const per={};(DATA.logs||[]).filter(l=>l.by===id).forEach(l=>{const k=dkey(new Date(l.ts||0));per[k]=(per[k]||0)+(+l.sec||0);});const sd=Object.values(per).filter(v=>v>=3600).length;return {ok:st>=3&&sd>=3,st,sd,wn,given:!!SNACKV[id]};}
function renderSnack(){const el=document.getElementById('snackBox');if(!el)return;if(ADMIN_ON){el.innerHTML='';return;}const r=snackOK(MYID);
  el.innerHTML=r.ok?(r.given?`<div class="snack" style="animation:none">🍪 간식을 받았어요! 계속 꾸준히 해 봐요 💪</div>`:`<div class="snack">🍪 교무실로 와서 송현쌤께 간식을 받아가세요</div>`)
    :`<div class="ms"><span class="msI">🍪</span><div class="msM"><b>간식 미션</b><small>도장 3개 · 1시간 넘게 공부한 날 3일을 채우면 간식을 받아요</small><i class="msBar"><u style="width:${Math.round((Math.min(3,r.st)+Math.min(3,r.sd))/6*100)}%"></u></i></div><em>도장 ${Math.min(3,r.st)}/3<br>공부 ${Math.min(3,r.sd)}/3</em></div>`;
  if(r.wn)el.innerHTML+=`<div class="ms" style="background:#fdecea"><span class="msI">⚠️</span><div class="msM"><b>고운 말 경고 ${r.wn}회</b><small>욕설·패드립을 쓰면 간식 미션 도장이 1개씩 빠져요 (과자점 엽전도 5냥씩)</small></div></div>`;}
{const _rs=renderStamp;renderStamp=function(){_rs.apply(this,arguments);try{renderSnack();}catch(e){}};}
function snackPop(){if(ADMIN_ON||!window.__entered)return;const r=snackOK(MYID);if(!r.ok||r.given)return;const k=dkey(new Date());if(LS.get('snackShown','')===k)return;LS.set('snackShown',k);
  let el=document.createElement('div');el.id='giftPop';el.innerHTML=`<div class="gpBox paper"><div class="gpConf">${'🍪🎉✨🍬'.repeat(3).split('').filter(c=>c.trim()).map((c,i)=>`<i style="left:${(i*37)%100}%;animation-delay:${(i%6)*.12}s">${c}</i>`).join('')}</div><div class="gpT">🍪 간식 미션 성공!</div><div class="snack" style="animation:none">교무실로 와서 송현쌤께 간식을 받아가세요</div><div class="gpB"><button class="primary" id="gpClose">알겠어요!</button></div></div>`;
  document.body.appendChild(el);try{chime();}catch(e){}el.addEventListener('click',e=>{if(e.target===el||e.target.closest('#gpClose'))el.remove();});}
setInterval(snackPop,15000);
function wipeLocal(t){const keep=['resetSeen','prologue','adminOn'];const ks=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('songhyeon.')&&!keep.includes(k.slice(10)))ks.push(k);}ks.forEach(k=>localStorage.removeItem(k));LS.set('resetSeen',t);}
function checkReset(){const t=Math.max(+RESETV.all||0,+RESETV['u_'+MYID]||0);if(!t)return;const seen=+LS.get('resetSeen',0);if(t<=seen)return;
  if(ADMIN_ON||LS.get('adminOn',false)){LS.set('resetSeen',t);return;}if(!LS.get('nick','')){LS.set('resetSeen',t);return;}
  wipeLocal(t);toast('🧹 선생님이 학당 기록을 새로 시작했어요<small>잠시 뒤 처음 화면으로 돌아가요</small>');setTimeout(()=>location.reload(),1800);}
setInterval(()=>{if(!rsSub&&typeof DB!=='undefined'&&DB&&MODE==='shared'){rsSub=true;
  DB.doc('settings/reset').onSnapshot(d=>{RESETV=(d&&d.exists&&d.data())||{};checkReset();},()=>{});
  DB.doc('settings/snack').onSnapshot(d=>{SNACKV=(d&&d.exists&&d.data())||{};try{renderSnack();renderTeacher(true);}catch(e){}},()=>{});}},1500);
async function resetStudents(ids,all){if(!DB||MODE!=='shared'){toast('학당이 연결돼 있어야 초기화할 수 있어요');return;}const S=new Set(ids);let n=0,fail=0;
  for(const col of ['logs','books','quotes','board','playlist']){for(const d of (DATA[col]||[]).filter(x=>S.has(x.by))){try{await DB.collection(col).doc(d.id).delete();n++;}catch(e){fail++;}}}
  for(const id of ids){try{await DB.doc('stamps/'+id).delete();}catch(e){fail++;}try{await DB.doc('members/'+id).delete();}catch(e){fail++;}delete MEMBERS[id];delete STAMPS[id];}
  try{const now=Date.now();if(all)await DB.doc('settings/reset').set({all:now});else{const o={};ids.forEach(id=>o['u_'+id]=now);await DB.doc('settings/reset').set(o);}const so={};ids.forEach(id=>so[id]=null);}catch(e){fail++;}
  toast(fail?`일부를 지우지 못했어요 (${fail}건)<small>Firebase 규칙을 새로 붙여 넣었는지 확인해 주세요</small>`:`🧹 ${ids.length}명을 초기화했어요<small>학생 화면은 처음 화면으로 돌아가요</small>`);renderTeacher(true);}
(function(){const bar=document.getElementById('tCsv');if(!bar)return;const b=document.createElement('button');b.className='ghost';b.id='tResetAll';b.textContent='🧹 전체 초기화';bar.after(b);
  b.addEventListener('click',()=>{if(!ADMIN_ON)return;const ids=classStats().filter(r=>!r.me).map(r=>r.id);if(!ids.length){toast('초기화할 학생이 없어요');return;}const v=prompt(`학생 ${ids.length}명의 출석·공부 기록·독후감·문장·캐릭터를 모두 지워요.\n되돌릴 수 없어요. 계속하려면 "초기화"라고 적어 주세요.`);if(v&&v.trim()==='초기화')resetStudents(ids,true);});
  document.getElementById('tBody').addEventListener('click',async e=>{
    const ids=k=>String(k||'').split(',').filter(Boolean);
    const r=e.target.closest('[data-treset]');if(r){const L=ids(r.dataset.treset);if(confirm(`${nameOf(L[0])} 학생의 기록(출석·공부·독후감 등)을 모두 지우고 처음부터 시작하게 할까요?`))resetStudents(L,false);return;}
    const fg=e.target.closest('[data-tforgive]');if(fg){if(!confirm('이 학생의 고운 말 경고를 모두 지울까요?'))return;const W=[];ids(fg.dataset.tforgive).forEach(id=>warnsOf(id).forEach(w=>{if(!W.some(x=>x.id===w.id))W.push(w);}));try{await Promise.all(W.map(w=>DB.collection('warns').doc(w.id).delete()));toast('경고를 지웠어요');}catch(err){toast('지우지 못했어요');}return;}
    const g=e.target.closest('[data-tsnack]');if(g){const L=ids(g.dataset.tsnack);const on=!L.some(id=>SNACKV[id]);const o={};L.forEach(id=>o[id]=on?Date.now():null);try{await DB.doc('settings/snack').set(o);toast(on?'🍪 간식 준 것으로 표시했어요':'간식 표시를 취소했어요');}catch(err){toast('저장하지 못했어요');}return;}
    const h=e.target.closest('[data-thide]');if(h){const H=LS.get('tHidden',{});const k=h.dataset.thide;if(H[k])delete H[k];else H[k]=Date.now();LS.set('tHidden',H);toast(H[k]?'명단에서 숨겼어요<small>‘숨김’ 칸에서 다시 볼 수 있어요</small>':'다시 보이게 했어요');tOpen='';renderTeacher(true);return;}
    const row=e.target.closest('[data-open-g]');if(row){tOpen=tOpen===row.dataset.openG?'':row.dataset.openG;renderTeacher(true);}});})();

/* ---------- 💬 상담 신청 (교무실 프로그램 Apps Script와 직접 연결) ---------- */
function rsvClean(u){u=String(u||'').trim();return /^https:\/\/script\.google(usercontent)?\.com\/[^\s"'<>]+$/.test(u)?u.slice(0,600):'';}
const rsvApi=()=>rsvClean(CLS.rsv);
async function rsvCall(payload){const u=rsvApi();if(!u)throw new Error('상담 신청이 아직 연결되지 않았어요');
  const r=payload?await fetch(u,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)}):await fetch(u+(u.includes('?')?'&':'?')+'t='+Date.now());
  const tx=await r.text();let j;try{j=JSON.parse(tx);}catch(e){throw new Error('상담 신청 서버에 연결하지 못했어요');}if(!j.ok)throw new Error(j.error||'요청 실패');return j;}
const CS={slots:[],pick:'',chips:[],mine:null,busy:false,loadedAt:0,err:''};
const csMe=()=>LS.get('csMe',{no:'',name:'',pin:''});
const csWhen=x=>{const d=new Date(x.date+'T00:00:00');return `${d.getMonth()+1}/${d.getDate()}(${'일월화수목금토'[d.getDay()]}) ${x.start}~${x.end}`;};
const CS_TOP=['📚 공부','🌱 진로','🤝 친구','🏠 가족','💭 고민','🙂 그냥 이야기하고 싶어요'];
async function csLoad(force){if(!rsvApi())return;if(!force&&Date.now()-CS.loadedAt<20000)return;CS.loadedAt=Date.now();
  try{const j=await rsvCall();CS.slots=(j.slots||[]).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));CS.err='';}catch(e){CS.err=e.message;}
  const m=csMe();if(m.no&&m.name&&/^\d{4}$/.test(m.pin)){try{const j=await rsvCall({action:'status',no:m.no,name:m.name,pin:m.pin});CS.mine=j.reqs||[];}catch(e){CS.mine=null;}}
  renderCounsel(true);}
function renderCounsel(fromLoad){const el=$('#csBody');if(!el)return;const u=rsvApi();
  if(!u){el.innerHTML=`<div class="empty" style="padding:26px 6px">🙂 선생님이 아직 상담 신청을 열지 않았어요.<br><small>급한 이야기는 교무실로 오거나 선생님께 바로 말해 주세요.</small></div>${ADMIN_ON?'<div class="empty">선생님: 선생님 화면 아래 ‘💬 상담 신청 연결’에 웹 앱 주소를 넣고 저장해 주세요.</div>':''}`;return;}
  if(!fromLoad){csLoad(false);}
  const keep={};['csNo','csName','csPin','csTopic','csMail'].forEach(id=>{const i=document.getElementById(id);if(i)keep[id]=i.value;});const m=csMe();
  const today=dkey(new Date());const mineAct=(CS.mine||[]).filter(r=>r.date>=today||r.status==='대기');
  const stc=s=>s==='승인'?'y':s==='대기'?'w':s==='거절'?'n':'c';const stt=s=>s==='승인'?'확정 ✓':s==='대기'?'선생님 확인 중':s;
  const days={};CS.slots.forEach(x=>(days[x.date]=days[x.date]||[]).push(x));
  el.innerHTML=`<div class="csIntro">무슨 이야기든 괜찮아요 🌱 시간을 고르고 <b>신청</b>만 누르면 돼요.<br><small>선생님이 확인하면 여기서 ‘확정’으로 바뀌어요.</small></div>
  ${mineAct.length?`<div class="cStep">📋 내 신청</div>${mineAct.map(r=>`<div class="cMine"><div><b>${esc(csWhen(r))}</b>${r.slot?` <small>${esc(r.slot)}</small>`:''}${r.note?`<br><small>선생님: ${esc(r.note)}</small>`:''}</div><span class="cSt ${stc(r.status)}">${esc(stt(r.status))}</span>${r.status==='대기'||r.status==='승인'?`<button data-cscancel="${esc(r.id)}">취소</button>`:''}</div>`).join('')}`:''}
  <div class="cStep">① 나는 누구?<small>처음 한 번만 쓰면 다음부터 자동으로 채워져요</small></div>
  <div class="cRow3"><input id="csNo" inputmode="numeric" maxlength="4" placeholder="학번 (예: 1701)" value="${esc(keep.csNo??m.no)}"><input id="csName" maxlength="10" placeholder="이름" value="${esc(keep.csName??m.name)}"><input id="csPin" inputmode="numeric" maxlength="4" placeholder="비번 4자리" value="${esc(keep.csPin??m.pin)}"></div>
  <div class="empty" style="margin:4px 0 0;font-size:12px">비번은 내가 정하는 숫자 4자리예요. 내 신청을 확인·취소할 때 써요.</div>
  <div class="cStep">② 언제 만날까요?<small>편한 시간을 눌러요</small></div>
  ${CS.err?`<div class="cMsg">${esc(CS.err)}</div>`:''}
  ${CS.slots.length?Object.keys(days).map(d=>`<div class="cDay">${esc(csWhen({date:d,start:'',end:''}).replace(' ~',''))}</div><div class="cSlots">${days[d].map(x=>`<button class="cSl${CS.pick===x.id?' on':''}" data-csslot="${esc(x.id)}" ${x.taken?'disabled':''}><b>${esc(x.start)}~${esc(x.end)}</b><small>${x.taken?'이미 신청됨':esc(x.name||'상담')}</small></button>`).join('')}</div>`).join(''):`<div class="empty">${CS.loadedAt?'지금은 열린 상담 시간이 없어요. 선생님이 시간을 열면 여기에 보여요.':'열린 시간을 불러오는 중…'}</div>`}
  <div class="cStep">③ 어떤 이야기?<small>안 골라도 괜찮아요</small></div>
  <div class="cChips">${CS_TOP.map(t=>`<button data-cschip="${esc(t)}" class="${CS.chips.includes(t)?'on':''}">${t}</button>`).join('')}</div>
  <textarea id="csTopic" rows="2" maxlength="150" placeholder="선생님께 미리 하고 싶은 말 (선택)">${esc(keep.csTopic||'')}</textarea>
  <details style="margin-top:6px"><summary style="font-size:13px;color:var(--ink2);cursor:pointer">📬 결과를 메일로도 받고 싶어요 (선택)</summary><input id="csMail" type="email" maxlength="100" placeholder="이메일 주소" value="${esc(keep.csMail??(m.email||''))}" style="margin-top:6px"></details>
  <button class="primary cGo" id="csGo" ${CS.busy?'disabled':''}>${CS.busy?'보내는 중…':'💬 상담 신청하기'}</button><div class="cMsg" id="csMsg"></div>`;}
async function csSubmit(){const v=id=>($('#'+id)||{}).value||'';const no=v('csNo').trim(),name=v('csName').trim(),pin=v('csPin').trim(),email=v('csMail').trim();const say=t=>{const e=$('#csMsg');if(e)e.textContent=t;};
  if(!/^\d{4}$/.test(no))return say('① 학번은 숫자 4자리로 써 주세요 (예: 1701)');if(!name)return say('① 이름을 써 주세요');if(!/^\d{4}$/.test(pin))return say('① 비번은 숫자 4자리로 정해 주세요');if(!CS.pick)return say('② 만날 시간을 눌러 골라 주세요');
  const topic=[CS.chips.join(' '),v('csTopic').trim()].filter(Boolean).join(' · ').slice(0,200);LS.set('csMe',{no,name,pin,email});
  CS.busy=true;renderCounsel(true);try{await rsvCall({action:'reserve',slotId:CS.pick,no,name,pin,topic,email});CS.pick='';CS.chips=[];const t=$('#csTopic');if(t)t.value='';toast('💬 상담 신청 완료!<small>선생님이 확인하면 ‘확정’으로 바뀌어요</small>');try{chime();}catch(e){}CS.busy=false;await csLoad(true);}
  catch(e){CS.busy=false;renderCounsel(true);const e2=$('#csMsg');if(e2)e2.textContent=e.message;if(/이미 신청/.test(e.message))csLoad(true);}}
(function(){const tile=$('#csTile');if(tile)tile.addEventListener('click',()=>setTimeout(()=>renderCounsel(),0));
  const box=$('#csBody');if(box)box.addEventListener('click',async e=>{const s=e.target.closest('[data-csslot]');if(s){CS.pick=CS.pick===s.dataset.csslot?'':s.dataset.csslot;renderCounsel(true);return;}
    const c=e.target.closest('[data-cschip]');if(c){const t=c.dataset.cschip;CS.chips=CS.chips.includes(t)?CS.chips.filter(x=>x!==t):CS.chips.concat(t);renderCounsel(true);return;}
    if(e.target.closest('#csGo')){csSubmit();return;}
    const x=e.target.closest('[data-cscancel]');if(x){if(!confirm('이 상담 신청을 취소할까요?'))return;const m=csMe();try{await rsvCall({action:'cancel',id:x.dataset.cscancel,no:m.no,pin:m.pin});toast('신청을 취소했어요');}catch(err){toast(err.message);}csLoad(true);}});
  setInterval(()=>{const md=$('#counsel');if(md&&md.classList.contains('show')&&!CS.busy&&!document.activeElement.closest('#csBody'))csLoad(false);},30000);
  /* 선생님: 관리 암호(이 기기에만 저장)로 승인 대기 보기 */
  const tok=$('#tRsvTok');if(tok){tok.value=LS.get('rsvTok','');tok.addEventListener('change',()=>LS.set('rsvTok',tok.value));}
  async function tLoad(){const out=$('#tRsvBox');const u=rsvClean($('#tRsv').value)||rsvApi();if(!u){out.innerHTML='<div class="empty">웹 앱 주소를 먼저 넣어 주세요 (https://script.google.com/… 로 시작해요)</div>';return;}
    out.innerHTML='<div class="empty">확인하는 중…</div>';const tk=LS.get('rsvTok','');
    try{const pub=await (await fetch(u+(u.includes('?')?'&':'?')+'t='+Date.now())).json();if(!pub.ok)throw new Error(pub.error||'');let html=`<div class="empty">✅ 연결됨 · 학생에게 보이는 열린 시간 <b>${(pub.slots||[]).length}</b>개${pub.rosterOn?' · 명단 확인 켜짐':''}${rsvApi()!==u?'<br>⚠️ 아직 저장 전이에요. 아래 ‘학급 설정 저장’을 눌러야 학생들에게 열려요.':''}</div>`;
      if(tk){const j=await (await fetch(`${u}${u.includes('?')?'&':'?'}action=admin&token=${encodeURIComponent(tk)}&t=${Date.now()}`)).json();if(!j.ok)throw new Error(j.error||'관리 암호 확인 실패');const t=dkey(new Date());const pend=(j.reqs||[]).filter(r=>r.status==='대기'&&r.date>=t).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));
        html+=pend.length?pend.map(r=>`<div class="cMine"><b>${esc(csWhen(r))}</b> · ${esc(r.name)}(${esc(r.no)})${r.topic?`<br><small>${esc(r.topic)}</small>`:''}<br><button data-tdec="${esc(r.id)}" data-st="승인" style="background:#3f7f5a;color:#fff">승인</button><button data-tdec="${esc(r.id)}" data-st="거절" style="background:#eee">거절</button></div>`).join(''):'<div class="empty">승인 대기 중인 신청이 없어요.</div>';}
      out.innerHTML=html;}catch(e){out.innerHTML=`<div class="empty">⚠️ 연결하지 못했어요: ${esc(e.message||'주소와 배포 설정(액세스: 모든 사용자)을 확인해 주세요')}</div>`;}}
  const chk=$('#tRsvChk');if(chk)chk.addEventListener('click',tLoad);
  const tb=$('#tRsvBox');if(tb)tb.addEventListener('click',async e=>{const b=e.target.closest('[data-tdec]');if(!b)return;const st=b.dataset.st;const note=st==='거절'?(prompt('학생에게 보여 줄 메모 (선택)','')||''):'';const u=rsvClean($('#tRsv').value)||rsvApi();
    try{const r=await fetch(u,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({token:LS.get('rsvTok',''),action:'decide',id:b.dataset.tdec,status:st,note})});const j=await r.json();if(!j.ok)throw new Error(j.error||'실패');toast(`${st}했어요${j.mailed==='ok'?'<small>학생에게 안내 메일을 보냈어요</small>':''}`);}catch(err){toast('처리하지 못했어요<small>'+esc(err.message)+'</small>');}tLoad();});})();
