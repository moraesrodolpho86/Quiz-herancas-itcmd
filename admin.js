const settings = window.FIREBASE_SETTINGS;
const listEl = document.getElementById("adminPlayers");
if(!settings.enabled){
  listEl.innerHTML='<p class="subtitle">Conecte o Firebase para acompanhar os jogadores ao vivo.</p>';
}else{
  const appMod = await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js");
  const dbMod = await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js");
  const app=appMod.initializeApp(settings.config); const db=dbMod.getDatabase(app);
  document.getElementById("adminStatus").textContent="Online";
  dbMod.onValue(dbMod.ref(db,"players"), snap=>{
    const arr=Object.values(snap.val()||{});
    const online=arr.filter(p=>p.online);
    document.getElementById("onlineCount").textContent=online.length;
    document.getElementById("finishedCount").textContent=arr.filter(p=>p.finished).length;
    listEl.innerHTML=arr.sort((a,b)=>(b.score||0)-(a.score||0)).map(p=>`<div class="player"><span>${p.online?'<span class="online-dot"></span>':''}<strong>${p.initials||'--'}</strong></span><span>${p.score||0}/6</span></div>`).join('') || '<p class="subtitle">Nenhum participante ainda.</p>';
  });
}
