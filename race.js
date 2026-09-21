const settings = window.FIREBASE_SETTINGS;
const playersEl = document.getElementById("players");
const statusEl = document.getElementById("status");
if (!settings.enabled) {
  playersEl.innerHTML = '<div class="stat"><strong>Modo demonstração</strong><span class="mini">Conecte o Firebase para mostrar a corrida multiplayer.</span></div>';
} else {
  const appMod = await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js");
  const dbMod = await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js");
  const app = appMod.initializeApp(settings.config);
  const db = dbMod.getDatabase(app);
  statusEl.textContent = "Online";
  dbMod.onValue(dbMod.ref(db, "players"), snap => {
    const data = snap.val() || {};
    const list = Object.values(data).filter(p=>p.online).sort((a,b)=>(b.score||0)-(a.score||0));
    playersEl.innerHTML = list.length ? list.map(p => {
      const pct = Math.round(((p.score||0)/6)*100);
      return `<div class="race-wrap"><div class="race-title"><strong><span class="online-dot"></span>${p.initials}</strong><span>${p.score||0}/6</span></div><div class="track"><div class="runner" style="left:calc(10px + (100% - 110px) * ${pct/100})">🏃<span class="runner-label">${p.initials}</span></div></div></div>`;
    }).join("") : '<p class="subtitle">Nenhum jogador online ainda.</p>';
  });
}
