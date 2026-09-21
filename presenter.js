const params = new URLSearchParams(window.location.search);
const isPresenter = params.get("modo") === "apresentador";
const settings = window.FIREBASE_SETTINGS;
const questions = window.QUIZ_QUESTIONS || [];
const total = questions.length || 6;

if (isPresenter) {
  const PRESENTER_PIN = "1234";
  const AUTH_KEY = "quizPresenterAuthorized";
  const participantApp = document.getElementById("participantApp");
  const presenterAuth = document.getElementById("presenterAuth");
  const presenterApp = document.getElementById("presenterApp");
  const pinInput = document.getElementById("presenterPin");
  const loginBtn = document.getElementById("presenterLoginBtn");
  const pinError = document.getElementById("presenterPinError");

  document.body.classList.remove("player-page");
  document.body.classList.add("race-page");
  participantApp?.classList.add("hidden");
  document.title = "Modo apresentador — Heranças, desigualdade e ITCMD";

  async function unlockPresenter(){
    presenterAuth?.classList.add("hidden");
    presenterApp?.classList.remove("hidden");
    sessionStorage.setItem(AUTH_KEY, "1");
    await initPresenter();
  }

  function validatePin(){
    const value = (pinInput?.value || "").replace(/\D/g, "").slice(0,4);
    if(value === PRESENTER_PIN){
      pinError?.classList.add("hidden");
      unlockPresenter();
    } else {
      pinError?.classList.remove("hidden");
      if(pinInput){ pinInput.value=""; pinInput.focus(); }
    }
  }

  loginBtn?.addEventListener("click", validatePin);
  pinInput?.addEventListener("input", e=>{ e.target.value=e.target.value.replace(/\D/g,"").slice(0,4); pinError?.classList.add("hidden"); });
  pinInput?.addEventListener("keydown", e=>{ if(e.key==="Enter") validatePin(); });

  async function initPresenter(){

  const playersEl = document.getElementById("players");
  const statusEl = document.getElementById("status");
  const onlineCountEl = document.getElementById("onlineCount");
  const finishedCountEl = document.getElementById("finishedCount");
  const totalQuestionsEl = document.getElementById("totalQuestions");
  const podiumSection = document.getElementById("podiumSection");
  const podiumEl = document.getElementById("podium");
  const podiumTitle = document.getElementById("podiumTitle");
  const arrivalSection = document.getElementById("arrivalSection");
  const arrivalList = document.getElementById("arrivalList");
  const rosterEl = document.getElementById("presenterRoster");
  const startGameBtn = document.getElementById("startGameBtn");
  const endGameBtn = document.getElementById("endGameBtn");
  const accuracySection = document.getElementById("accuracySection");
  const accuracyList = document.getElementById("accuracyList");
  const accuracyTitle = document.getElementById("accuracyTitle");
  const questionResultsSection = document.getElementById("questionResultsSection");
  const questionResultsEl = document.getElementById("questionResults");
  const summaryPlayers = document.getElementById("summaryPlayers");
  const summaryAverage = document.getElementById("summaryAverage");
  const summaryBest = document.getElementById("summaryBest");
  const summaryHardest = document.getElementById("summaryHardest");
  totalQuestionsEl.textContent = total;
  let audioCtx=null;
  function beep(freq=440,duration=.12,delay=0){ try{ const ctx=audioCtx||(audioCtx=new (window.AudioContext||window.webkitAudioContext)()); const o=ctx.createOscillator(),g=ctx.createGain(); o.frequency.value=freq;o.type='sine';g.gain.setValueAtTime(.0001,ctx.currentTime+delay);g.gain.exponentialRampToValueAtTime(.07,ctx.currentTime+delay+.01);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+delay+duration);o.connect(g);g.connect(ctx.destination);o.start(ctx.currentTime+delay);o.stop(ctx.currentTime+delay+duration+.02);}catch(e){} }

  function sleep(ms){ return new Promise(resolve=>setTimeout(resolve,ms)); }
  async function showPresenterCountdown(){
    const overlay=document.getElementById("countdownOverlay");
    const number=document.getElementById("countdownNumber");
    overlay.classList.remove("hidden");
    for(const value of ["3","2","1"]){
      number.textContent=value;
      number.classList.remove("pop"); void number.offsetWidth; number.classList.add("pop");
      beep(value==="1"?660:440,.12);
      await sleep(850);
    }
    overlay.classList.add("hidden");
  }

  function elapsed(p){
    if(typeof p.totalTime==='number') return p.totalTime;
    if(typeof p.startAt==='number' && typeof p.finishAt==='number') return Math.max(0,p.finishAt-p.startAt);
    return Number.MAX_SAFE_INTEGER;
  }
  function formatTime(ms){
    if(!Number.isFinite(ms) || ms===Number.MAX_SAFE_INTEGER) return '—';
    const s=Math.max(0,Math.round(ms/1000));
    const m=Math.floor(s/60), r=s%60;
    return m?`${m}m ${String(r).padStart(2,'0')}s`:`${r}s`;
  }
  function sortByPerformance(list){
    return [...list].sort((a,b)=>(b.score||0)-(a.score||0) || elapsed(a)-elapsed(b) || (b.answered||0)-(a.answered||0) || String(a.initials||'').localeCompare(String(b.initials||'')));
  }
  function withRanks(list){
    let previousScore = null, previousTime = null, previousRank = 0;
    return list.map((p,i)=>{
      const score = p.score || 0, time=elapsed(p);
      const rank = score === previousScore && time===previousTime ? previousRank : i + 1;
      previousScore = score; previousTime=time; previousRank = rank;
      return {...p, rank};
    });
  }
  function ordinal(rank){ return `${rank}º`; }
  function rankClass(rank){ return rank===1?'gold':rank===2?'silver':rank===3?'bronze':''; }

  function renderRoster(list){
    if(!list.length){ rosterEl.innerHTML = '<span class="mini">Aguardando participantes...</span>'; return; }
    rosterEl.innerHTML = list.map(p=>`<span class="player-roster-chip ${p.finished?'finished':''}"><b>${p.initials||'--'}</b><small>${p.answered||0}/${total} etapas</small>${p.finished?'<em>🏁</em>':''}</span>`).join('');
  }

  function laneHTML(p){
    const score = p.score || 0;
    const answered = Math.min(total, p.answered ?? p.current ?? 0);
    const pct = Math.min(100, Math.round(answered/total*100));
    return `<div class="lane-card ${p.rank===1?'leader':''}">
      <div class="rank-badge ${rankClass(p.rank)}">${ordinal(p.rank)}</div>
      <div class="lane-center">
        <div class="lane-meta"><div class="lane-name"><span class="online-dot"></span>${p.initials || '--'}</div><span class="score-pill">${score}/${total} acertos • ${answered}/${total} etapas</span></div>
        <div class="lane-track"><div class="lane-runner emoji-lane-runner" style="left:calc(8px + (100% - 70px) * ${pct/100})"><span aria-hidden="true">🏃🏾‍➡️</span></div></div>
      </div>
      <div class="lane-stats"><strong>${score}</strong><small>${score===1?'acerto':'acertos'}</small></div>
    </div>`;
  }

  function renderArrivals(all){
    const finished = all.filter(p=>p.finished && p.finishAt).sort((a,b)=>(a.finishAt||Number.MAX_SAFE_INTEGER)-(b.finishAt||Number.MAX_SAFE_INTEGER));
    if(!finished.length){ arrivalSection.classList.add('hidden'); arrivalList.innerHTML=''; return; }
    arrivalSection.classList.remove('hidden');
    arrivalList.innerHTML = finished.map((p,i)=>`<div class="arrival-item ${i<3?'top-arrival':''}"><span class="arrival-rank">${i+1}º</span><span class="arrival-runner">🏃🏾‍➡️</span><strong>${p.initials||'--'}</strong><span class="arrival-score">${p.score||0}/${total} acertos</span></div>`).join('');
  }

  function renderPodium(ranked, allFinished){
    if(!ranked.length){ podiumSection.classList.add('hidden'); return; }
    const top = ranked.slice(0,3);
    podiumSection.classList.remove('hidden');
    podiumTitle.textContent = allFinished ? 'Pódio final' : 'Pódio provisório';
    const order = top.length >= 3 ? [top[1], top[0], top[2]] : top.length===2 ? [top[1],top[0]] : top;
    const cls = p => p.rank===1?'first':p.rank===2?'second':'third';
    podiumEl.innerHTML = order.map(p=>`<div class="podium-place ${cls(p)}"><div class="podium-runner">🏃🏾‍➡️</div><div class="podium-block"><div class="podium-number">${ordinal(p.rank)}</div><div class="podium-name">${p.initials||'--'}</div><div class="podium-score">${p.score||0}/${total} acertos</div></div></div>`).join('');
  }

  function renderAccuracy(all, finalMode){
    const candidates = sortByPerformance(all.filter(p=>(p.answered||0)>0 || p.finished));
    if(!candidates.length){ accuracySection.classList.add('hidden'); accuracyList.innerHTML=''; return; }
    accuracySection.classList.remove('hidden');
    accuracyTitle.textContent = finalMode ? 'Ranking final por acertos' : 'Ranking provisório por acertos';
    accuracyList.innerHTML = candidates.map((p,i)=>`<div class="accuracy-item"><span class="accuracy-rank">${i+1}º</span><strong>${p.initials||'--'}</strong><span>${p.score||0}/${total} acertos</span><span>${p.finished?formatTime(elapsed(p)):'em andamento'}</span></div>`).join('');
  }

  function responseStats(all){
    return questions.map((q,qi)=>{
      const counts=[0,0,0,0]; let totalAnswers=0,correct=0;
      all.forEach(p=>{ const r=p.responses?.[`q${qi}`]; if(r && Number.isInteger(r.selected)){ counts[r.selected]++; totalAnswers++; if(r.correct) correct++; } });
      return {counts,totalAnswers,correct,rate:totalAnswers?correct/totalAnswers:0};
    });
  }

  function renderQuestionResults(all){
    const stats=responseStats(all);
    const hasAny=stats.some(s=>s.totalAnswers>0);
    questionResultsSection.classList.toggle('hidden',!hasAny);
    if(!hasAny){ questionResultsEl.innerHTML=''; return; }
    questionResultsEl.innerHTML=stats.map((s,qi)=>{
      const max=Math.max(1,s.totalAnswers);
      return `<div class="question-result-card"><div class="question-result-head"><strong>Questão ${qi+1}</strong><span>${s.totalAnswers} respostas • ${Math.round(s.rate*100)}% acerto</span></div>${['A','B','C','D'].map((l,i)=>`<div class="answer-bar-row"><span>${l}</span><div class="answer-bar"><i style="width:${Math.round(s.counts[i]/max*100)}%"></i></div><b>${s.counts[i]}</b></div>`).join('')}</div>`;
    }).join('');
  }

  function renderSummary(all){
    summaryPlayers.textContent=all.length;
    const avg=all.length?all.reduce((s,p)=>s+(p.score||0),0)/all.length:0;
    summaryAverage.textContent=avg.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
    const stats=responseStats(all).map((s,i)=>({...s,i})).filter(s=>s.totalAnswers>0);
    if(!stats.length){ summaryBest.textContent='—'; summaryHardest.textContent='—'; return; }
    const best=[...stats].sort((a,b)=>b.rate-a.rate || b.totalAnswers-a.totalAnswers)[0];
    const hard=[...stats].sort((a,b)=>a.rate-b.rate || b.totalAnswers-a.totalAnswers)[0];
    summaryBest.textContent=`Q${best.i+1} (${Math.round(best.rate*100)}%)`;
    summaryHardest.textContent=`Q${hard.i+1} (${Math.round(hard.rate*100)}%)`;
  }

  function buildQr(){
    const url=window.location.origin+window.location.pathname;
    const box=document.getElementById('participantQr'), label=document.getElementById('participantUrl');
    if(label) label.textContent=url;
    if(box && window.QRCode){ box.innerHTML=''; new QRCode(box,{text:url,width:150,height:150,correctLevel:QRCode.CorrectLevel.M}); }
  }
  buildQr();
  document.getElementById('copyLinkBtn')?.addEventListener('click', async ()=>{
    const url=window.location.origin+window.location.pathname;
    try{ await navigator.clipboard.writeText(url); const b=document.getElementById('copyLinkBtn'); const old=b.textContent; b.textContent='Link copiado!'; setTimeout(()=>b.textContent=old,1400); }catch(e){ window.prompt('Copie o link:',url); }
  });

  document.getElementById('fullscreenBtn')?.addEventListener('click', async ()=>{
    if(!document.fullscreenElement){ await document.documentElement.requestFullscreen?.(); }
    else { await document.exitFullscreen?.(); }
  });

  if (!settings.enabled) {
    playersEl.innerHTML = '<div class="stat"><strong>Modo demonstração</strong><span class="mini">Conecte o Firebase para mostrar a corrida multiplayer.</span></div>';
    statusEl.textContent = 'Modo demonstração';
  } else {
    const appMod = await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js");
    const dbMod = await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js");
    const app = appMod.initializeApp(settings.config, 'presenterApp');
    const db = dbMod.getDatabase(app);
    const playersRef = dbMod.ref(db, 'players');
    const gameRef = dbMod.ref(db, 'game');
    statusEl.textContent = '🟢 Conectado';

    startGameBtn?.addEventListener('click', async ()=>{
      const snap = await dbMod.get(playersRef);
      const players = Object.values(snap.val() || {}).filter(p=>p.online);
      if(!players.length){
        window.alert('Aguarde pelo menos um participante entrar na corrida.');
        return;
      }
      startGameBtn.disabled = true;
      const token = Date.now();
      await dbMod.set(gameRef,{status:'countdown',startToken:token,updatedAt:dbMod.serverTimestamp()});
      await showPresenterCountdown();
      await dbMod.update(gameRef,{status:'started',updatedAt:dbMod.serverTimestamp()});
    });

    endGameBtn?.addEventListener('click', async ()=>{
      const ok=window.confirm('Deseja encerrar a partida e congelar os resultados atuais?');
      if(!ok) return;
      await dbMod.update(gameRef,{status:'ended',endedAt:dbMod.serverTimestamp(),updatedAt:dbMod.serverTimestamp()});
    });

    document.getElementById('resetGameBtn')?.addEventListener('click', async ()=>{
      const ok = window.confirm('Deseja iniciar uma nova partida? Isso limpará os jogadores e resultados atuais.');
      if(!ok) return;
      await dbMod.remove(playersRef);
      await dbMod.set(gameRef,{status:'waiting',startToken:null,updatedAt:dbMod.serverTimestamp()});
      startGameBtn.disabled = false;
      endGameBtn.disabled = true;
    });

    dbMod.onValue(gameRef, snap=>{
      const game = snap.val() || {};
      if(game.status==='waiting' || !game.status){
        startGameBtn.disabled = false;
        startGameBtn.textContent = 'Iniciar partida';
      } else if(game.status==='countdown'){
        startGameBtn.disabled = true;
        startGameBtn.textContent = 'Preparando...';
      } else if(game.status==='started'){
        startGameBtn.disabled = true;
        startGameBtn.textContent = 'Partida em andamento';
        endGameBtn.disabled = false;
      } else if(game.status==='ended'){
        startGameBtn.disabled = true;
        startGameBtn.textContent = 'Partida encerrada';
        endGameBtn.disabled = true;
      }
    });

    dbMod.onValue(playersRef, snap => {
      const all = Object.values(snap.val() || {});
      const online = all.filter(p=>p.online);
      const ranked = withRanks(sortByPerformance(online));
      const finished = all.filter(p=>p.finished).length;
      onlineCountEl.textContent = online.length;
      finishedCountEl.textContent = finished;
      const gameSnapNow = null;
      const allOnlineFinished = online.length>0 && online.every(p=>p.finished);
      playersEl.innerHTML = ranked.length ? ranked.map(laneHTML).join("") : '<div class="empty-state"><div style="font-size:42px">🏃🏾‍➡️</div><p class="subtitle">A corrida ainda está vazia. Assim que alguém entrar, aparecerá aqui.</p></div>';
      renderRoster(online);
      renderPodium(ranked, allOnlineFinished);
      renderArrivals(all);
      renderAccuracy(all, allOnlineFinished);
      renderQuestionResults(all);
      renderSummary(all);
    });
    }
  }

  if(sessionStorage.getItem(AUTH_KEY)==="1"){
    unlockPresenter();
  } else {
    presenterAuth?.classList.remove("hidden");
    presenterApp?.classList.add("hidden");
    setTimeout(()=>pinInput?.focus(), 50);
  }
}
