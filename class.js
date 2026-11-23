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
function renderTeacher(keepForm){const el=$('#tBody');if(!el)return;if(!ADMIN_ON){el.innerHTML='<div class="empty">선생님 암호로 들어오면 볼 수 있어요.</div>';return;}
  let R=classStats().filter(r=>!r.me);if(tSort==='att')R.sort((a,b)=>b.mDays-a.mDays);else if(tSort==='study')R.sort((a,b)=>b.wMin-a.wMin);
  const todayN=R.filter(r=>r.today).length,wSum=R.reduce((a,r)=>a+r.wMin,0);
  $('#tSum').innerHTML=`<div><small>간식 대상</small><b>${R.filter(r=>snackOK(r.id).ok&&!SNACKV[r.id]).length}</b>명</div><div><small>학생</small><b>${R.length}</b>명</div><div><small>오늘 출석</small><b>${todayN}</b>명</div><div><small>이번 주 공부</small><b>${Math.round(wSum/60)}</b>시간</div>`;
  el.innerHTML=R.length?R.map(r=>`<div class="tRow"><div class="tName"><b>${esc(r.nick)}</b><span class="${r.today?'ok':'no'}">${r.today?'오늘 출석':'미출석'}</span>${(()=>{const k=snackOK(r.id);return k.ok?`<button class="tSnack ${k.given?'done':''}" data-tsnack="${r.id}">${k.given?'🍪 간식 줬어요 ✓':'🍪 간식 대상 · 줬으면 눌러요'}</button>`:`<small class="tSm">🍪 도장 ${Math.min(3,k.st)}/3 · 1시간 공부 ${Math.min(3,k.sd)}/3일</small>`;})()}<button class="tRs" data-treset="${r.id}" title="이 학생 초기화">🧹</button></div>${r.memo?`<div class="tMemo">“${esc(r.memo)}”</div>`:''}
    <div class="tNums"><span>출석 <b>${r.mDays}</b>일<small>이번 달</small></span><span><b>${fmtMin(r.wMin)}</b><small>이번 주 공부</small></span><span><b>${fmtMin(r.aMin)}</b><small>누적 공부</small></span><span><b>${r.books}</b>편<small>독후감</small></span></div>
    <div class="tLast">${r.last?'마지막 활동 '+ago(r.last):'아직 활동 없음'}</div></div>`).join(''):'<div class="empty">아직 들어온 학생이 없어요. 학생들에게 링크와 암호를 알려 주세요.</div>';
  if(!keepForm||!$('#tForm').dataset.ready)fillTeacherForm();}
function fillTeacherForm(){const f=$('#tForm');f.dataset.ready='1';
  const BD=[['basics','강의실 1 칠판',['第一講 · 마법학 기초','기(氣)의 흐름과 주문의 첫걸음','“서두르지 말고, 멈추지 말라.”']],['potion','강의실 2 칠판',['靈藥 · 마법약 수업','오늘의 조제 — 집중의 물약','솥 앞 의자에 앉아 타이머를 시작하세요']],['herbs','강의실 3 칠판',['藥草園 · 약초학','오늘의 약초 — 월광초 기르기']]];
  $('#tBoards').innerHTML=BD.map(([k,lb,d])=>`<div class="tBd"><b>${lb}</b>${d.map((x,i)=>`<input data-bd="${k}" data-bi="${i}" maxlength="40" placeholder="${esc(x)}" value="${esc(((CLS.boards||{})[k]||{})[i]||'')}">`).join('')}</div>`).join('');
  $('#tRooms').innerHTML=RKEYS.map(([k,lb])=>`<label class="tIn"><span>${lb}</span><input data-room="${k}" maxlength="14" placeholder="${esc(ROOM_DEF[k].name)}" value="${esc((CLS.rooms||{})[k]||'')}"></label>`).join('');
  const hrs=sel=>Array.from({length:24},(_,h)=>`<option value="${h}">${h}시</option>`).join('');
  $('#tChat').value=CLS.chat;$('#tCh0').innerHTML=$('#tCh1').innerHTML=$('#tLk0').innerHTML=$('#tLk1').innerHTML=hrs();
  $('#tRsv').value=CLS.rsv||'';$('#tCh0').value=CLS.ch[0];$('#tCh1').value=CLS.ch[1];$('#tLock').value=CLS.lock;$('#tLk0').value=CLS.lk[0];$('#tLk1').value=CLS.lk[1];tVis();}
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
    const v={boards,rooms,chat:$('#tChat').value,ch:[+$('#tCh0').value,+$('#tCh1').value],lock:$('#tLock').value,lk:[+$('#tLk0').value,+$('#tLk1').value],rsv:rsvClean($('#tRsv').value),ts:Date.now()};if($('#tRsv').value.trim()&&!v.rsv){toast('상담 링크는 https:// 로 시작해야 해요');return;}
    try{await DB.doc('settings/class').set(v);toast('학급 설정을 저장했어요<small>학생들 화면에도 바로 바뀌어요</small>');}catch(e){toast('저장하지 못했어요<small>선생님 암호로 들어왔는지 확인해 주세요</small>');}});})();

/* ---------- 간식 미션 · 학생 초기화 ---------- */
let RESETV={},SNACKV={};let rsSub=false;
function snackOK(id){const days=id===MYID?myDays:((STAMPS[id]&&STAMPS[id].days)||{});const st=Object.keys(days||{}).length;const per={};(DATA.logs||[]).filter(l=>l.by===id).forEach(l=>{const k=dkey(new Date(l.ts||0));per[k]=(per[k]||0)+(+l.sec||0);});const sd=Object.values(per).filter(v=>v>=3600).length;return {ok:st>=3&&sd>=3,st,sd,given:!!SNACKV[id]};}
function renderSnack(){const el=document.getElementById('snackBox');if(!el)return;if(ADMIN_ON){el.innerHTML='';return;}const r=snackOK(MYID);
  el.innerHTML=r.ok?(r.given?`<div class="snack" style="animation:none">🍪 간식을 받았어요! 계속 꾸준히 해 봐요 💪</div>`:`<div class="snack">🍪 교무실로 와서 송현쌤께 간식을 받아가세요</div>`)
    :`<div class="ms"><span class="msI">🍪</span><div class="msM"><b>간식 미션</b><small>도장 3개 · 1시간 넘게 공부한 날 3일을 채우면 간식을 받아요</small><i class="msBar"><u style="width:${Math.round((Math.min(3,r.st)+Math.min(3,r.sd))/6*100)}%"></u></i></div><em>도장 ${Math.min(3,r.st)}/3<br>공부 ${Math.min(3,r.sd)}/3</em></div>`;}
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
  document.getElementById('tBody').addEventListener('click',async e=>{const r=e.target.closest('[data-treset]');if(r){const id=r.dataset.treset;if(confirm(`${nameOf(id)} 학생의 기록을 모두 지우고 처음부터 시작하게 할까요?`))resetStudents([id],false);return;}
    const g=e.target.closest('[data-tsnack]');if(g){const id=g.dataset.tsnack;try{await DB.doc('settings/snack').set({[id]:SNACKV[id]?null:Date.now()});}catch(err){toast('저장하지 못했어요');}}});})();

/* ---------- 💬 상담 신청 (교무실 프로그램 상담 신청 페이지와 연결) ---------- */
function rsvClean(u){u=String(u||'').trim();return /^https:\/\/[^\s"'<>]+$/.test(u)?u.slice(0,1500):'';}
function renderCounsel(){const el=$('#csBody');if(!el)return;const u=rsvClean(CLS.rsv);
  if(!u){el.innerHTML=`<div class="empty" style="padding:26px 6px">🙂 선생님이 아직 상담 신청을 열지 않았어요.<br><small>급한 이야기는 교무실로 오거나 선생님께 바로 말해 주세요.</small></div>${ADMIN_ON?'<div class="empty">선생님: 선생님 화면 맨 아래 ‘💬 상담 신청 연결’에 학생용 링크를 붙여 넣어 주세요.</div>':''}`;return;}
  if(el.dataset.u===u&&el.querySelector('#csFrame'))return;el.dataset.u=u;
  el.innerHTML=`<div class="csIntro">편하게 신청해요. 무슨 이야기든 괜찮아요 🌱<br><small>신청하면 선생님이 확인하고 시간을 정해 줄게요.</small></div>
  <div class="csSteps"><span><b>①</b>학번·이름</span><span><b>②</b>시간 고르기</span><span><b>③</b>신청 누르기</span></div>
  <iframe id="csFrame" src="${esc(u)}" referrerpolicy="no-referrer" allow="clipboard-write"></iframe>
  <a class="ghost csOut" href="${esc(u)}" target="_blank" rel="noopener" style="text-align:center;text-decoration:none;padding:10px;border-radius:12px">↗ 화면이 안 보이면 새 창으로 열기</a>`;}
(function(){const tile=$('#csTile');if(tile)tile.addEventListener('click',()=>setTimeout(renderCounsel,0));
  setInterval(()=>{const m=$('#counsel');if(m&&m.classList.contains('show'))renderCounsel();},1500);})();
