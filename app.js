const isPresenterMode = new URLSearchParams(window.location.search).get('modo') === 'apresentador';
const questions = window.QUIZ_QUESTIONS;
const settings = window.FIREBASE_SETTINGS;
const $ = (id) => document.getElementById(id);

if (!isPresenterMode) {
  let current = 0, score = 0, answeredCount = 0, initials = "", answered = false;
  let playerId = sessionStorage.getItem("quizPlayerId") || crypto.randomUUID();
  sessionStorage.setItem("quizPlayerId", playerId);
  let db = null, dbApi = null, playerRef = null;
  let gameStartedLocally = false;
  let lastStartToken = null;
  let gameEnded = false;
  let soundEnabled = true;
  let audioCtx = null;

  $("scoreTotal").textContent = questions.length;

  function getAudio(){
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }
  function beep(freq=440,duration=.12,delay=0){
    if(!soundEnabled) return;
    try{
      const ctx=getAudio(), osc=ctx.createOscillator(), gain=ctx.createGain();
      osc.frequency.value=freq; osc.type='sine';
      gain.gain.setValueAtTime(.0001,ctx.currentTime+delay);
      gain.gain.exponentialRampToValueAtTime(.08,ctx.currentTime+delay+.01);
      gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+delay+duration);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime+delay); osc.stop(ctx.currentTime+delay+duration+.02);
    }catch(e){}
  }
  function updateSoundButtons(){
    const text=soundEnabled?'🔊 Som ligado':'🔇 Som desligado';
    if($("soundToggleJoin")) $("soundToggleJoin").textContent=text;
    if($("soundToggleQuiz")) $("soundToggleQuiz").textContent=soundEnabled?'🔊':'🔇';
  }
  function toggleSound(){ soundEnabled=!soundEnabled; updateSoundButtons(); if(soundEnabled) beep(520,.08); }
  $("soundToggleJoin")?.addEventListener("click",toggleSound);
  $("soundToggleQuiz")?.addEventListener("click",toggleSound);
  updateSoundButtons();

  function buildMarkers(){
    const el = $("trackMarkers"); if(!el) return;
    el.innerHTML = Array.from({length:questions.length},()=>'<span class="track-marker"></span>').join('');
  }
  buildMarkers();

  async function initFirebase(){
    if(!settings?.enabled) return;
    try{
      const appMod = await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js");
      const dbMod = await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js");
      const app = appMod.initializeApp(settings.config);
      db = dbMod.getDatabase(app);
      dbApi = dbMod;
      $("modeBadge").textContent = "🟢 Multiplayer online";
      dbApi.onValue(dbApi.ref(db, "players"), snap => renderRoster(snap.val() || {}));
      dbApi.onValue(dbApi.ref(db, "game"), snap => handleGameState(snap.val() || {}));
    }catch(e){
      console.error(e);
      $("modeBadge").textContent = "Modo demonstração";
    }
  }

  function renderRoster(playersObj){
    const el = $("playersNow");
    const countEl = $("playersNowCount");
    if(!el || !countEl) return;
    const online = Object.values(playersObj || {}).filter(p=>p && p.online).sort((a,b)=>(b.score||0)-(a.score||0) || String(a.initials||"").localeCompare(String(b.initials||"")));
    countEl.textContent = `${online.length} online`;
    const ready = $("readyCount");
    if(ready) ready.textContent = `${online.length} ${online.length===1?'jogador pronto':'jogadores prontos'}`;
    if(!online.length){ el.innerHTML='<span class="mini">Aguardando participantes...</span>'; return; }
    el.innerHTML = online.map(p=>`<span class="player-roster-chip ${p.initials===initials?'me':''}"><b>${p.initials||'--'}</b><small>${p.score||0}/${questions.length}</small></span>`).join('');
  }

  function validInitials(v){return /^[A-Z0-9]{2}$/.test(v)}
  $("initials").addEventListener("input",e=>{e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,2)});
  $("initials").addEventListener("keydown",e=>{if(e.key==='Enter') $("joinBtn").click()});

  $("joinBtn").addEventListener("click",async()=>{
    initials=$("initials").value.trim().toUpperCase();
    if(!validInitials(initials)){ $("initials").focus(); $("initials").style.borderColor="#e94f55"; return; }
    $("initials").style.borderColor="#d9d5fa";
    $("playerName").textContent=initials;
    $("runnerLabel").textContent=initials;
    $("waitingInitials").textContent=initials;
    $("joinScreen").classList.add("hidden");
    $("waitingScreen").classList.remove("hidden");

    if(db&&dbApi){
      playerRef=dbApi.ref(db,`players/${playerId}`);
      await dbApi.set(playerRef,{initials,score:0,current:0,answered:0,online:true,finished:false,responses:{},startAt:null,finishAt:null,totalTime:null,updatedAt:dbApi.serverTimestamp()});
      const connectedRef=dbApi.ref(db,".info/connected");
      dbApi.onValue(connectedRef,snap=>{
        if(snap.val()===true){
          dbApi.onDisconnect(playerRef).update({online:false,updatedAt:dbApi.serverTimestamp()});
          dbApi.update(playerRef,{online:true,updatedAt:dbApi.serverTimestamp()});
        }
      });
      const gameSnap = await dbApi.get(dbApi.ref(db,"game"));
      const game = gameSnap.val() || {};
      handleGameState(game);
    } else {
      await startCountdown();
      startQuiz();
    }
  });

  function sleep(ms){ return new Promise(resolve=>setTimeout(resolve,ms)); }

  async function startCountdown(){
    const overlay=$("countdownOverlay"), number=$("countdownNumber");
    if(!overlay || !number) return;
    overlay.classList.remove("hidden");
    for(const value of ["3","2","1"]){
      number.textContent=value;
      number.classList.remove("pop"); void number.offsetWidth; number.classList.add("pop");
      beep(value==="1"?660:440,.12);
      await sleep(850);
    }
    overlay.classList.add("hidden");
  }

  async function handleGameState(game){
    if(!initials) return;
    const status = game?.status || 'waiting';
    const token = game?.startToken || null;
    if(status === 'ended'){
      gameEnded = true;
      if(gameStartedLocally){
        document.querySelectorAll('.option').forEach(b=>b.disabled=true);
        $("nextBtn")?.classList.add('hidden');
        const fb=$("feedback"); if(fb){ fb.textContent='Partida encerrada pelo apresentador.'; fb.className='feedback bad'; }
      }
      return;
    }
    if(gameStartedLocally) return;
    if(status === 'countdown' && token && token !== lastStartToken){
      lastStartToken = token;
      await startCountdown();
      if(!gameStartedLocally) startQuiz();
    } else if(status === 'started' && !gameStartedLocally){
      // Para quem entrar depois do início, ainda há uma única contagem antes da 1ª pergunta.
      await startCountdown();
      if(!gameStartedLocally) startQuiz();
    }
  }

  function startQuiz(){
    gameStartedLocally = true;
    gameEnded = false;
    if(playerRef&&dbApi) dbApi.update(playerRef,{startAt:dbApi.serverTimestamp(),updatedAt:dbApi.serverTimestamp()});
    $("waitingScreen").classList.add("hidden");
    $("quizScreen").classList.remove("hidden");
    renderQuestion();
    moveRunner();
  }

  function renderQuestion(){
    answered=false;
    const q=questions[current];
    $("questionCounter").textContent=`${current+1} / ${questions.length}`;
    $("progressBar").style.width=`${(answeredCount/questions.length)*100}%`;
    $("questionText").textContent=q.question;
    $("feedback").className="feedback hidden";
    $("nextBtn").classList.add("hidden");
    $("options").innerHTML="";
    ["A","B","C","D"].forEach((letter,idx)=>{
      const btn=document.createElement("button");
      btn.className="option";
      btn.innerHTML=`<span class="letter">${letter}</span><span>${q.options[idx]}</span>`;
      btn.addEventListener("click",()=>answer(idx,btn));
      $("options").appendChild(btn);
    });
  }

  async function answer(idx,clicked){
    if(answered)return;
    answered=true;
    const q=questions[current];
    const buttons=[...document.querySelectorAll(".option")];
    buttons.forEach(b=>b.disabled=true);
    buttons[q.correct].classList.add("correct");
    if(idx===q.correct){
      score++;
      clicked.classList.add("correct");
      $("feedback").textContent="🎉 Acertou!";
      $("feedback").className="feedback ok";
      beep(720,.12); beep(880,.12,.10);
    }else{
      clicked.classList.add("wrong");
      $("feedback").textContent="Quase! A resposta correta está destacada.";
      $("feedback").className="feedback bad";
      beep(230,.18);
    }
    answeredCount++;
    moveRunner();
    $("progressBar").style.width=`${(answeredCount/questions.length)*100}%`;
    $("personalScore").textContent=`${score} ${score===1?'acerto':'acertos'}`;
    if(playerRef&&dbApi){
      const updates={score,current:current+1,answered:answeredCount,updatedAt:dbApi.serverTimestamp()};
      updates[`responses/q${current}`]={selected:idx,correct:idx===q.correct,answeredAt:dbApi.serverTimestamp()};
      await dbApi.update(playerRef,updates);
    }
    $("nextBtn").textContent=current===questions.length-1?"VER RESULTADO":"PRÓXIMA";
    $("nextBtn").classList.remove("hidden");
  }

  function moveRunner(){
    const track=$("track"), runner=$("runner");
    const max=Math.max(0,track.clientWidth-runner.offsetWidth-45);
    const pos=12+(answeredCount/questions.length)*max;
    runner.style.left=`${pos}px`;
  }

  $("nextBtn").addEventListener("click",()=>{
    if(gameEnded) return;
    if(current>=questions.length-1){ finish(); return; }
    current++;
    renderQuestion();
  });

  function launchConfetti(){
    const layer=$("confettiLayer"); if(!layer) return;
    layer.innerHTML='';
    const chars=['●','■','▲','★'];
    for(let i=0;i<44;i++){
      const s=document.createElement('span');
      s.textContent=chars[i%chars.length];
      s.style.left=`${Math.random()*100}%`;
      s.style.animationDelay=`${Math.random()*.7}s`;
      s.style.animationDuration=`${1.8+Math.random()*1.5}s`;
      s.style.fontSize=`${9+Math.random()*13}px`;
      layer.appendChild(s);
    }
    layer.classList.add('active');
    setTimeout(()=>{layer.classList.remove('active');layer.innerHTML='';},3800);
  }

  function finish(){
    answeredCount = questions.length;
    moveRunner();
    $("progressBar").style.width="100%";
    $("quizScreen").classList.add("hidden");
    $("finishScreen").classList.remove("hidden");
    $("scoreFinal").textContent=score;
    const pct=Math.round(score/questions.length*100);
    $("finishText").textContent=`${initials}, você acertou ${score} de ${questions.length} questões (${pct}%). Seu corredor cruzou a linha de chegada.`;
    beep(660,.12); beep(830,.12,.14); beep(990,.18,.28);
    launchConfetti();
    if(playerRef&&dbApi){
      dbApi.get(playerRef).then(snap=>{
        const data=snap.val()||{};
        const start=typeof data.startAt==='number'?data.startAt:null;
        const now=Date.now();
        const totalTime=start?Math.max(0,now-start):null;
        dbApi.update(playerRef,{answered:questions.length,current:questions.length,finished:true,online:true,finishAt:dbApi.serverTimestamp(),totalTime,updatedAt:dbApi.serverTimestamp()});
      });
    }
  }

  $("restartBtn").addEventListener("click",()=>location.reload());
  window.addEventListener("resize",moveRunner);
  window.addEventListener("beforeunload",()=>{if(playerRef&&dbApi)dbApi.update(playerRef,{online:false,updatedAt:dbApi.serverTimestamp()})});
  await initFirebase();
}
