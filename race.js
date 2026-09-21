const settings = window.FIREBASE_SETTINGS;
const questions = window.QUIZ_QUESTIONS || [];
const total = questions.length || 6;
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
totalQuestionsEl.textContent = total;

function withRanks(list){
  let previousScore = null, previousRank = 0;
  return list.map((p,i)=>{
    const score = p.score || 0;
    const rank = score === previousScore ? previousRank : i + 1;
    previousScore = score; previousRank = rank;
    return {...p, rank};
  });
}
function ordinal(rank){ return `${rank}º`; }
function rankClass(rank){ return rank===1?'gold':rank===2?'silver':rank===3?'bronze':''; }
function laneHTML(p){
  const score = p.score || 0;
  const pct = Math.min(100, Math.round(score/total*100));
  return `<div class="lane-card ${p.rank===1?'leader':''}">
    <div class="rank-badge ${rankClass(p.rank)}">${ordinal(p.rank)}</div>
    <div class="lane-center">
      <div class="lane-meta"><div class="lane-name"><span class="online-dot"></span>${p.initials || '--'}</div><span class="score-pill">${score}/${total} • ${pct}%</span></div>
      <div class="lane-track"><div class="lane-runner" style="left:calc(8px + (100% - 100px) * ${pct/100})"><img class="runner-img" src="runner.png" alt="Corredor" aria-hidden="true"></div></div>
    </div>
    <div class="lane-stats"><strong>${score}</strong><small>${score===1?'acerto':'acertos'}</small></div>
  </div>`;
}

function renderArrivals(all){
  const finished = all.filter(p=>p.finished && p.finishAt).sort((a,b)=>(a.finishAt||Number.MAX_SAFE_INTEGER)-(b.finishAt||Number.MAX_SAFE_INTEGER));
  if(!finished.length){ arrivalSection.classList.add('hidden'); arrivalList.innerHTML=''; return; }
  arrivalSection.classList.remove('hidden');
  arrivalList.innerHTML = finished.map((p,i)=>`<div class="arrival-item ${i<3?'top-arrival':''}"><span class="arrival-rank">${i+1}º</span><span class="arrival-runner">🏃</span><strong>${p.initials||'--'}</strong><span class="arrival-score">${p.score||0}/${total} acertos</span></div>`).join('');
}

function renderPodium(ranked, allFinished){
  if(!ranked.length){ podiumSection.classList.add('hidden'); return; }
  const top = ranked.slice(0,3);
  podiumSection.classList.remove('hidden');
  podiumTitle.textContent = allFinished ? 'Pódio final' : 'Pódio provisório';
  const order = top.length >= 3 ? [top[1], top[0], top[2]] : top.length===2 ? [top[1],top[0]] : top;
  const cls = p => p.rank===1?'first':p.rank===2?'second':'third';
  podiumEl.innerHTML = order.map(p=>`<div class="podium-place ${cls(p)}"><div class="podium-runner">🏃</div><div class="podium-block"><div class="podium-number">${ordinal(p.rank)}</div><div class="podium-name">${p.initials||'--'}</div><div class="podium-score">${p.score||0}/${total} acertos</div></div></div>`).join('');
}

if (!settings.enabled) {
  playersEl.innerHTML = '<div class="stat"><strong>Modo demonstração</strong><span class="mini">Conecte o Firebase para mostrar a corrida multiplayer.</span></div>';
} else {
  const appMod = await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js");
  const dbMod = await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js");
  const app = appMod.initializeApp(settings.config);
  const db = dbMod.getDatabase(app);
  statusEl.textContent = "Conectado";
  dbMod.onValue(dbMod.ref(db, "players"), snap => {
    const all = Object.values(snap.val() || {});
    const online = all.filter(p=>p.online).sort((a,b)=>(b.score||0)-(a.score||0) || (a.updatedAt||0)-(b.updatedAt||0));
    const ranked = withRanks(online);
    const finished = all.filter(p=>p.finished).length;
    onlineCountEl.textContent = online.length;
    finishedCountEl.textContent = finished;
    const allOnlineFinished = online.length>0 && online.every(p=>p.finished);
    playersEl.innerHTML = ranked.length ? ranked.map(laneHTML).join("") : '<div class="empty-state"><div style="font-size:42px">🏃💨</div><p class="subtitle">A corrida ainda está vazia. Assim que alguém entrar, aparecerá aqui.</p></div>';
    renderPodium(ranked, allOnlineFinished);
    renderArrivals(all);
  });
}
