const questions = window.QUIZ_QUESTIONS;
const settings = window.FIREBASE_SETTINGS;
const $ = (id) => document.getElementById(id);

let current = 0;
let score = 0;
let initials = "";
let answered = false;
let playerId = sessionStorage.getItem("quizPlayerId") || crypto.randomUUID();
sessionStorage.setItem("quizPlayerId", playerId);

let db = null;
let dbApi = null;
let playerRef = null;

async function initFirebase() {
  if (!settings?.enabled) return;
  try {
    const appMod = await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js");
    const dbMod = await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js");
    const app = appMod.initializeApp(settings.config);
    db = dbMod.getDatabase(app);
    dbApi = dbMod;
    $("modeBadge").textContent = "Multiplayer online";
  } catch (e) {
    console.error(e);
    $("modeBadge").textContent = "Modo demonstração";
  }
}

function validInitials(v){ return /^[A-Z0-9]{2}$/.test(v); }

$("initials").addEventListener("input", e => {
  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0,2);
});

$("joinBtn").addEventListener("click", async () => {
  initials = $("initials").value.trim().toUpperCase();
  if (!validInitials(initials)) {
    $("initials").focus();
    $("initials").style.borderColor = "#a33a3a";
    return;
  }
  $("initials").style.borderColor = "#c7bfb3";
  $("playerName").textContent = initials;
  $("runnerLabel").textContent = initials;
  $("joinScreen").classList.add("hidden");
  $("quizScreen").classList.remove("hidden");

  if (db && dbApi) {
    playerRef = dbApi.ref(db, `players/${playerId}`);
    await dbApi.set(playerRef, { initials, score: 0, current: 0, online: true, updatedAt: dbApi.serverTimestamp() });
    const connectedRef = dbApi.ref(db, ".info/connected");
    dbApi.onValue(connectedRef, snap => {
      if (snap.val() === true) {
        dbApi.onDisconnect(playerRef).update({ online: false, updatedAt: dbApi.serverTimestamp() });
        dbApi.update(playerRef, { online: true, updatedAt: dbApi.serverTimestamp() });
      }
    });
  }
  renderQuestion();
});

function renderQuestion(){
  answered = false;
  const q = questions[current];
  $("questionCounter").textContent = `${current+1} / ${questions.length}`;
  $("progressBar").style.width = `${(current/questions.length)*100}%`;
  $("questionText").textContent = q.question;
  $("feedback").className = "feedback hidden";
  $("nextBtn").classList.add("hidden");
  $("options").innerHTML = "";
  const letters = ["A","B","C","D"];
  q.options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.innerHTML = `<span class="letter">${letters[idx]}</span><span>${opt}</span>`;
    btn.addEventListener("click", () => answer(idx, btn));
    $("options").appendChild(btn);
  });
}

async function answer(idx, clicked){
  if(answered) return;
  answered = true;
  const q = questions[current];
  const buttons = [...document.querySelectorAll(".option")];
  buttons.forEach(b => b.disabled = true);
  buttons[q.correct].classList.add("correct");

  if(idx === q.correct){
    score++;
    clicked.classList.add("correct");
    $("feedback").textContent = "✓ Correto! Seu corredor avançou.";
    $("feedback").className = "feedback ok";
    moveRunner();
  } else {
    clicked.classList.add("wrong");
    $("feedback").textContent = "✕ Resposta incorreta. Você permanece nesta posição.";
    $("feedback").className = "feedback bad";
  }

  if (playerRef && dbApi) {
    await dbApi.update(playerRef, { score, current: current+1, updatedAt: dbApi.serverTimestamp() });
  }

  $("nextBtn").textContent = current === questions.length - 1 ? "VER RESULTADO" : "PRÓXIMA";
  $("nextBtn").classList.remove("hidden");
}

function moveRunner(){
  const track = $("track");
  const runner = $("runner");
  const max = Math.max(0, track.clientWidth - runner.offsetWidth - 45);
  const pos = 10 + (score/questions.length) * max;
  runner.style.left = `${pos}px`;
}

$("nextBtn").addEventListener("click", () => {
  if(current >= questions.length - 1){ finish(); return; }
  current++;
  renderQuestion();
});

function finish(){
  $("progressBar").style.width = "100%";
  $("quizScreen").classList.add("hidden");
  $("finishScreen").classList.remove("hidden");
  $("scoreFinal").textContent = score;
  const pct = Math.round(score/questions.length*100);
  $("finishText").textContent = `${initials}, você acertou ${pct}% das questões.`;
  if(playerRef && dbApi) dbApi.update(playerRef, { finished: true, online: true, updatedAt: dbApi.serverTimestamp() });
}

$("restartBtn").addEventListener("click", () => location.reload());
window.addEventListener("resize", moveRunner);
window.addEventListener("beforeunload", () => {
  if(playerRef && dbApi) dbApi.update(playerRef, { online: false, updatedAt: dbApi.serverTimestamp() });
});

await initFirebase();
