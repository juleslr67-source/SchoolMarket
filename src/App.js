import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, get } from "firebase/database";

/*
  ╔══════════════════════════════════════════════════════╗
  ║  SCHOOLMARKET — multi-utilisateurs en temps réel     ║
  ║  Backend : Firebase Realtime Database (gratuit)      ║
  ╚══════════════════════════════════════════════════════╝

  ► CONFIGURATION :
    1. Va sur https://console.firebase.google.com
    2. Crée un projet (gratuit)
    3. Active "Realtime Database" → mode test
    4. Copie ta config dans FIREBASE_CONFIG ci-dessous
*/

// ── 🔥 REMPLACE ICI PAR TA CONFIG FIREBASE ───────────────────────
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBIO4eZEMjmO73lpjpON0aFKSa88gApT74",
  authDomain:        "schoolmarket-26991.firebaseapp.com",
  databaseURL:       "https://schoolmarket-26991-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "schoolmarket-26991",
  storageBucket:     "schoolmarket-26991.firebasestorage.app",
  messagingSenderId: "516686290738",
  appId:             "1:516686290738:web:f74b34aef5168401d5412b"
};
// ─────────────────────────────────────────────────────────────────

const AVATARS = ["🦁","🎯","🦈","⏰","🔮","🐺","🦊","🐸","🤖","👾","🎃","💀","🦅","🐉","🌙","🐯","🦋","🎭","🧠","⚡"];
const CAT_COLOR = { profs:"#f59e0b", eleves:"#ef4444", cours:"#3b82f6", "vie scolaire":"#10b981" };
const EMOJIS = ["🎲","🕐","⚠️","📚","😱","🍟","📢","🎉","💀","🏃","🤡","😴","🎓","📝","🏆","😤","🤔","💥","🫠","🤝"];

// ── Firebase init ─────────────────────────────────────────────────
let db = null;
let firebaseOk = false;
try {
  const app = initializeApp(FIREBASE_CONFIG);
  db = getDatabase(app);
  firebaseOk = FIREBASE_CONFIG.databaseURL.includes("schoolmarket-26991");
} catch(e) {
  console.warn("Firebase non configuré — mode local activé");
}

// ── Helpers Firebase ──────────────────────────────────────────────
async function fbGet(path) {
  if (!firebaseOk || !db) return null;
  try {
    const snap = await get(ref(db, path));
    return snap.exists() ? snap.val() : null;
  } catch { return null; }
}
async function fbSet(path, data) {
  if (!firebaseOk || !db) return;
  try { await set(ref(db, path), data); } catch {}
}
function fbListen(path, cb) {
  if (!firebaseOk || !db) return () => {};
  const r = ref(db, path);
  const unsub = onValue(r, snap => cb(snap.exists() ? snap.val() : null));
  return unsub;
}

// ── Calculs ───────────────────────────────────────────────────────
function computeOdds(market) {
  const bets = market.bets || [];
  const yesTotal = bets.filter(b => b.side === "yes").reduce((s,b) => s+b.amount, 0);
  const noTotal  = bets.filter(b => b.side === "no" ).reduce((s,b) => s+b.amount, 0);
  const total = yesTotal + noTotal;
  if (!total) return { yesPct:50, noPct:50, yesTotal:0, noTotal:0, total:0 };
  return { yesPct:Math.round(yesTotal/total*100), noPct:Math.round(noTotal/total*100), yesTotal, noTotal, total };
}
function computeStats(userId, markets) {
  let wins=0, losses=0, totalBet=0;
  for (const m of markets) {
    const bet = (m.bets||[]).find(b => b.userId===userId);
    if (!bet) continue;
    totalBet += bet.amount;
    if (m.resolved) m.result===bet.side ? wins++ : losses++;
  }
  return { wins, losses, totalBet };
}

// ── Composants ────────────────────────────────────────────────────
const TxtInput = ({ value, onChange, placeholder, onKeyDown, err }) => (
  <input value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder}
    style={{ width:"100%", boxSizing:"border-box", background:"#0a0a0a",
      border:`1px solid ${err?"#ef4444":"#2a2a2a"}`, color:"#e8e0d0",
      padding:"11px 14px", borderRadius:2, fontSize:14,
      fontFamily:"'Courier New',monospace", outline:"none" }}
    onFocus={e=>e.target.style.borderColor="#ffdc32"}
    onBlur={e=>e.target.style.borderColor=err?"#ef4444":"#2a2a2a"}
  />
);

// ── App ───────────────────────────────────────────────────────────
export default function SchoolMarket() {
  const [users,    setUsers]   = useState([]);
  const [markets,  setMarkets] = useState([]);
  const [me,       setMe]      = useState(null);
  const [loaded,   setLoaded]  = useState(false);
  const [fbStatus, setFbStatus]= useState(firebaseOk ? "ok" : "local");

  const usersRef   = useRef([]);
  const marketsRef = useRef([]);

  const syncUsers = (u) => {
    const arr = u ? (Array.isArray(u) ? u : Object.values(u)) : [];
    setUsers(arr); usersRef.current = arr;
  };
  const syncMarkets = (m) => {
    const arr = m ? (Array.isArray(m) ? m : Object.values(m)) : [];
    setMarkets(arr); marketsRef.current = arr;
  };

  const saveUsers   = (u) => { syncUsers(u);   fbSet("users",   u); };
  const saveMarkets = (m) => { syncMarkets(m); fbSet("markets", m); };

  // Chargement initial + écoute temps réel
  useEffect(() => {
    if (firebaseOk) {
      const u1 = fbListen("users",   d => { syncUsers(d);   setLoaded(true); });
      const u2 = fbListen("markets", d => { syncMarkets(d); });
      return () => { u1(); u2(); };
    } else {
      // Mode local : charge depuis localStorage
      try {
        const u = JSON.parse(localStorage.getItem("sm_users")||"[]");
        const m = JSON.parse(localStorage.getItem("sm_markets")||"[]");
        syncUsers(u); syncMarkets(m);
      } catch {}
      setLoaded(true);
    }
  }, []);

  // En mode local : sauvegarde dans localStorage
  useEffect(() => {
    if (!firebaseOk) localStorage.setItem("sm_users", JSON.stringify(users));
  }, [users]);
  useEffect(() => {
    if (!firebaseOk) localStorage.setItem("sm_markets", JSON.stringify(markets));
  }, [markets]);

  // UI state
  const [view,       setView]       = useState("markets");
  const [authMode,   setAuthMode]   = useState("login");
  const [pseudo,     setPseudo]     = useState("");
  const [avatar,     setAvatar]     = useState("🦁");
  const [authErr,    setAuthErr]    = useState("");
  const [filter,     setFilter]     = useState("tous");
  const [betModal,   setBetModal]   = useState(null);
  const [betAmount,  setBetAmount]  = useState(50);
  const [betSide,    setBetSide]    = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft,      setDraft]      = useState({ title:"", category:"profs", emoji:"🎲" });
  const [draftErr,   setDraftErr]   = useState("");
  const [profileUser,setProfileUser]= useState(null);
  const [toast,      setToast]      = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [shareOpen,  setShareOpen]  = useState(false);
  const [copied,     setCopied]     = useState(false);

  const showToast = (msg, type="ok") => {
    setToast({msg,type}); setTimeout(()=>setToast(null),2800);
  };

  // ── AUTH ──────────────────────────────────────────────────────
  const handleAuth = () => {
    setAuthErr("");
    const name = pseudo.trim();
    if (!name || name.length < 2) return setAuthErr("Pseudo trop court (min 2).");
    if (name.length > 20) return setAuthErr("Pseudo trop long (max 20).");
    const cur = usersRef.current;

    if (authMode === "register") {
      if (cur.find(u => u.pseudo.toLowerCase()===name.toLowerCase()))
        return setAuthErr("Ce pseudo est déjà pris !");
      const newUser = {
        id:`u_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
        pseudo:name, avatar, wallet:1000
      };
      saveUsers([...cur, newUser]);
      setMe(newUser); setPseudo("");
      showToast(`Bienvenue ${name} ! 🎉 1 000 SC pour toi.`);
      setView("markets");
    } else {
      const found = cur.find(u => u.pseudo.toLowerCase()===name.toLowerCase());
      if (!found) return setAuthErr("Pseudo introuvable — inscris-toi !");
      setMe(found); setPseudo("");
      showToast(`Content de te revoir, ${found.pseudo} 👋`);
      setView("markets");
    }
  };

  // ── PARIER ────────────────────────────────────────────────────
  const placeBet = () => {
    if (!me || !betModal || !betSide) return;
    const amount = parseInt(betAmount);
    if (!amount || amount < 10) return showToast("Mise min : 10 SC", "err");

    const cur = usersRef.current;
    const freshMe = cur.find(u=>u.id===me.id) || me;
    if (freshMe.wallet < amount) return showToast("Pas assez de SchoolCoins 😢","err");

    const mkt = marketsRef.current.find(m=>m.id===betModal.id);
    if (!mkt) return showToast("Marché introuvable.","err");
    if (mkt.resolved) return showToast("Marché déjà résolu.","err");
    if ((mkt.bets||[]).find(b=>b.userId===me.id)) return showToast("Tu as déjà parié ici !","err");

    const newMkt = { ...mkt, bets:[...(mkt.bets||[]),
      { userId:me.id, pseudo:me.pseudo, avatar:me.avatar, side:betSide, amount, at:Date.now() }
    ]};
    saveMarkets(marketsRef.current.map(m=>m.id===mkt.id?newMkt:m));

    const newMe = { ...freshMe, wallet:freshMe.wallet-amount };
    saveUsers(cur.map(u=>u.id===me.id?newMe:u));
    setMe(newMe);

    setBetModal(null); setBetSide(null);
    showToast(`✅ ${amount} SC sur "${betSide==="yes"?"OUI":"NON"}"`);
  };

  // ── CRÉER MARCHÉ ──────────────────────────────────────────────
  const createMarket = () => {
    setDraftErr("");
    if (!draft.title.trim()) return setDraftErr("Écris une question !");
    if (draft.title.length > 100) return setDraftErr("Question trop longue.");
    const myCount = marketsRef.current.filter(m=>m.creatorId===me.id&&!m.resolved).length;
    if (myCount>=5) return setDraftErr("Max 5 marchés actifs.");
    const m = {
      id:`m_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      title:draft.title.trim(), category:draft.category, emoji:draft.emoji,
      creatorId:me.id, creatorPseudo:me.pseudo,
      bets:[], resolved:false, result:null, createdAt:Date.now()
    };
    saveMarkets([m,...marketsRef.current]);
    setDraft({title:"",category:"profs",emoji:"🎲"}); setCreateOpen(false);
    showToast("🎉 Marché créé !");
  };

  // ── SUPPRIMER MARCHÉ ──────────────────────────────────────────
  const deleteMarket = (marketId) => {
    const mkt = marketsRef.current.find(m=>m.id===marketId);
    if (!mkt) return;
    let newUsers = [...usersRef.current];
    for (const bet of (mkt.bets||[])) {
      newUsers = newUsers.map(u=>u.id===bet.userId?{...u,wallet:u.wallet+bet.amount}:u);
    }
    saveUsers(newUsers);
    saveMarkets(marketsRef.current.filter(m=>m.id!==marketId));
    const freshMe = newUsers.find(u=>u.id===me?.id);
    if (freshMe) setMe(freshMe);
    setDelConfirm(null);
    showToast("🗑 Marché supprimé — paris remboursés.");
  };

  // ── RETIRER PARI ──────────────────────────────────────────────
  const deleteBet = (marketId) => {
    const mkt = marketsRef.current.find(m=>m.id===marketId);
    if (!mkt||mkt.resolved) return showToast("Impossible : marché résolu.","err");
    const myBet=(mkt.bets||[]).find(b=>b.userId===me.id);
    if (!myBet) return;
    const newMkt={...mkt,bets:mkt.bets.filter(b=>b.userId!==me.id)};
    saveMarkets(marketsRef.current.map(m=>m.id===marketId?newMkt:m));
    const newMe={...me,wallet:me.wallet+myBet.amount};
    saveUsers(usersRef.current.map(u=>u.id===me.id?newMe:u));
    setMe(newMe); setDelConfirm(null);
    showToast(`↩ Pari annulé — ${myBet.amount} SC remboursés.`);
  };

  // ── PARTAGER ──────────────────────────────────────────────────
  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({title:"SchoolMarket 🏫",text:"Viens parier !",url});
    } else {
      navigator.clipboard.writeText(url).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);}).catch(()=>{});
    }
  };

  // ── Dérivés ───────────────────────────────────────────────────
  const leaderboard = users.map(u=>{
    const s=computeStats(u.id,markets);
    const t=s.wins+s.losses;
    return{...u,...s,winRate:t>0?Math.round(s.wins/t*100):0,profit:u.wallet-1000};
  }).sort((a,b)=>b.wallet-a.wallet);

  const filtered = filter==="tous" ? markets : markets.filter(m=>m.category===filter);
  const myBetOn  = mkt => (mkt.bets||[]).find(b=>b.userId===me?.id);

  if (!loaded) return (
    <div style={{minHeight:"100vh",background:"#0d0d0d",display:"flex",alignItems:"center",
      justifyContent:"center",fontFamily:"monospace",color:"#ffdc32",letterSpacing:4,fontSize:13}}>
      CHARGEMENT...
    </div>
  );

  // ════════════════════════════════════════════════════════════════
  return (
    <div style={{minHeight:"100vh",background:"#0d0d0d",fontFamily:"'Courier New',monospace",color:"#e8e0d0"}}>

      {/* Grille fond */}
      <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",
        backgroundImage:"linear-gradient(rgba(255,220,50,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,220,50,0.025) 1px,transparent 1px)",
        backgroundSize:"44px 44px"}}/>

      {/* Bannière mode */}
      {fbStatus==="local" && (
        <div style={{background:"#1a0f00",borderBottom:"1px solid #f59e0b33",padding:"6px 20px",
          fontSize:10,color:"#f59e0b",textAlign:"center",letterSpacing:1}}>
          ⚠ MODE LOCAL — Configure Firebase pour jouer à plusieurs en temps réel
        </div>
      )}
      {fbStatus==="ok" && (
        <div style={{background:"#001a09",borderBottom:"1px solid #10b98133",padding:"6px 20px",
          fontSize:10,color:"#10b981",textAlign:"center",letterSpacing:1}}>
          🟢 CONNECTÉ EN TEMPS RÉEL — Tous les joueurs voient la même chose
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",
          background:toast.type==="err"?"#ef4444":"#ffdc32",color:"#0d0d0d",
          fontWeight:"bold",padding:"10px 22px",borderRadius:3,zIndex:9999,
          fontSize:13,whiteSpace:"nowrap",
          boxShadow:`0 4px 20px ${toast.type==="err"?"#ef444455":"#ffdc3255"}`}}>
          {toast.msg}
        </div>
      )}

      {/* ══ HEADER ══════════════════════════════════════════════ */}
      <header style={{position:"sticky",top:0,zIndex:100,background:"rgba(13,13,13,0.97)",
        borderBottom:"2px solid #ffdc32",padding:"0 20px",display:"flex",
        alignItems:"center",justifyContent:"space-between",height:58,
        backdropFilter:"blur(12px)",gap:8}}>

        <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",flexShrink:0}}
          onClick={()=>setView("markets")}>
          <span style={{fontSize:22}}>🏫</span>
          <div>
            <div style={{fontSize:15,fontWeight:"bold",color:"#ffdc32",letterSpacing:2}}>SCHOOLMARKET</div>
            <div style={{fontSize:7,color:"#444",letterSpacing:3}}>PARIS SCOLAIRES</div>
          </div>
        </div>

        <nav style={{display:"flex",gap:3}}>
          {[["markets","📊 Marchés"],["leaderboard","🏆 Classement"]].map(([v,lbl])=>(
            <button key={v} onClick={()=>setView(v)} style={{
              background:view===v?"#ffdc3215":"transparent",
              color:view===v?"#ffdc32":"#555",
              border:view===v?"1px solid #ffdc3230":"1px solid transparent",
              padding:"5px 10px",borderRadius:2,cursor:"pointer",
              fontSize:10,fontWeight:"bold",fontFamily:"inherit",letterSpacing:1}}>
              {lbl}
            </button>
          ))}
          <button onClick={()=>setShareOpen(true)} title="Partager"
            style={{background:"transparent",border:"1px solid #252525",color:"#555",
              padding:"5px 10px",borderRadius:2,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>
            🔗
          </button>
        </nav>

        <div style={{display:"flex",alignItems:"center",gap:7,flexShrink:0}}>
          {me ? (
            <>
              <div style={{background:"#111",border:"1px solid #ffdc3240",padding:"5px 10px",
                borderRadius:2,fontSize:11,color:"#ffdc32",fontWeight:"bold"}}>
                💰 {me.wallet.toLocaleString()} SC
              </div>
              <div onClick={()=>{setProfileUser(me);setView("profile");}}
                style={{background:"#111",border:"1px solid #252525",padding:"5px 10px",
                  borderRadius:2,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
                <span>{me.avatar}</span>
                <span style={{color:"#ccc"}}>{me.pseudo}</span>
              </div>
              <button onClick={()=>{setMe(null);setView("markets");showToast("À bientôt 👋");}}
                style={{background:"transparent",border:"1px solid #252525",color:"#555",
                  padding:"5px 8px",borderRadius:2,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>✕</button>
            </>
          ) : (
            <button onClick={()=>setView("auth")} style={{background:"#ffdc32",color:"#0d0d0d",
              border:"none",padding:"7px 14px",borderRadius:2,cursor:"pointer",
              fontWeight:"bold",fontSize:11,fontFamily:"inherit",letterSpacing:1}}>
              CONNEXION
            </button>
          )}
        </div>
      </header>

      {/* ══ AUTH ════════════════════════════════════════════════ */}
      {view==="auth" && (
        <div style={{maxWidth:400,margin:"50px auto",padding:20,position:"relative",zIndex:1}}>
          <div style={{background:"#111",border:"2px solid #ffdc32",borderRadius:4,padding:32}}>
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{fontSize:36,marginBottom:6}}>🏫</div>
              <div style={{fontSize:20,fontWeight:"bold",color:"#ffdc32",letterSpacing:2}}>SCHOOLMARKET</div>
              <div style={{fontSize:9,color:fbStatus==="ok"?"#10b981":"#f59e0b",letterSpacing:3,marginTop:3}}>
                {fbStatus==="ok"?"🟢 TEMPS RÉEL ACTIVÉ":"⚠ MODE LOCAL"}
              </div>
            </div>
            <div style={{display:"flex",marginBottom:22,border:"1px solid #252525",borderRadius:2,overflow:"hidden"}}>
              {[["login","CONNEXION"],["register","INSCRIPTION"]].map(([m,lbl])=>(
                <button key={m} onClick={()=>{setAuthMode(m);setAuthErr("");}} style={{
                  flex:1,padding:"9px",border:"none",cursor:"pointer",
                  background:authMode===m?"#ffdc32":"#0d0d0d",
                  color:authMode===m?"#0d0d0d":"#555",
                  fontWeight:"bold",fontSize:10,fontFamily:"inherit",letterSpacing:1}}>{lbl}</button>
              ))}
            </div>
            {authMode==="register" && (
              <div style={{marginBottom:18}}>
                <div style={{fontSize:9,color:"#555",letterSpacing:2,marginBottom:9}}>TON AVATAR</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                  {AVATARS.map(av=>(
                    <button key={av} onClick={()=>setAvatar(av)} style={{
                      fontSize:20,background:avatar===av?"#ffdc3218":"transparent",
                      border:avatar===av?"2px solid #ffdc32":"2px solid transparent",
                      borderRadius:4,padding:4,cursor:"pointer"}}>{av}</button>
                  ))}
                </div>
              </div>
            )}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:9,color:"#555",letterSpacing:2,marginBottom:8}}>PSEUDO</div>
              <TxtInput value={pseudo} onChange={e=>setPseudo(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handleAuth()}
                placeholder={authMode==="login"?"Ton pseudo...":"Choisis un pseudo unique..."} err={!!authErr}/>
              {authErr && <div style={{fontSize:11,color:"#ef4444",marginTop:5}}>⚠ {authErr}</div>}
            </div>
            <button onClick={handleAuth} style={{width:"100%",background:"#ffdc32",color:"#0d0d0d",
              border:"none",padding:"13px",borderRadius:2,cursor:"pointer",
              fontWeight:"bold",fontSize:13,fontFamily:"inherit",letterSpacing:1}}>
              {authMode==="login"?"→ SE CONNECTER":"→ CRÉER MON COMPTE"}
            </button>
            {authMode==="register" && (
              <div style={{fontSize:10,color:"#444",textAlign:"center",marginTop:12}}>
                Tu démarres avec <span style={{color:"#ffdc32"}}>1 000 SchoolCoins</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ MARCHÉS ═════════════════════════════════════════════ */}
      {view==="markets" && (
        <>
          <div style={{background:"linear-gradient(135deg,#140f00,#0d0d0d 55%,#001209)",
            borderBottom:"1px solid #1a1a1a",padding:"26px 20px 20px",position:"relative",zIndex:1}}>
            <div style={{maxWidth:1080,margin:"0 auto"}}>
              <div style={{fontSize:8,color:"#ffdc32",letterSpacing:4,marginBottom:5}}>MARCHÉ DE PRÉDICTION SCOLAIRE</div>
              <div style={{fontSize:24,fontWeight:"bold",lineHeight:1.3,marginBottom:12}}>
                Mise sur ce qui va <span style={{color:"#ffdc32"}}>vraiment</span> se passer.
              </div>
              <div style={{display:"flex",gap:18,fontSize:10,color:"#444",flexWrap:"wrap"}}>
                <span>📊 {markets.filter(m=>!m.resolved).length} marchés actifs</span>
                <span>💰 {markets.reduce((s,m)=>s+computeOdds(m).total,0).toLocaleString()} SC misés</span>
                <span>👥 {users.length} joueur{users.length>1?"s":""}</span>
              </div>
            </div>
          </div>

          <div style={{position:"sticky",top:58,zIndex:90,background:"rgba(13,13,13,0.97)",
            backdropFilter:"blur(12px)",borderBottom:"1px solid #1a1a1a",
            padding:"0 20px",display:"flex",gap:4,alignItems:"center",height:44,overflowX:"auto"}}>
            {["tous","profs","eleves","cours","vie scolaire"].map(cat=>(
              <button key={cat} onClick={()=>setFilter(cat)} style={{
                background:filter===cat?"#ffdc32":"transparent",color:filter===cat?"#0d0d0d":"#555",
                border:filter===cat?"none":"1px solid #252525",padding:"4px 12px",borderRadius:2,
                cursor:"pointer",fontSize:9,fontWeight:"bold",fontFamily:"inherit",
                letterSpacing:1,textTransform:"uppercase",whiteSpace:"nowrap",flexShrink:0}}>{cat}</button>
            ))}
            <div style={{flex:1}}/>
            {me && (
              <button onClick={()=>setCreateOpen(true)} style={{background:"#ffdc32",color:"#0d0d0d",
                border:"none",padding:"5px 12px",borderRadius:2,cursor:"pointer",
                fontWeight:"bold",fontSize:9,fontFamily:"inherit",letterSpacing:1,flexShrink:0}}>
                + CRÉER ({markets.filter(m=>m.creatorId===me.id&&!m.resolved).length}/5)
              </button>
            )}
          </div>

          <main style={{maxWidth:1080,margin:"0 auto",padding:"20px",position:"relative",zIndex:1}}>
            {filtered.length===0 && (
              <div style={{textAlign:"center",color:"#333",padding:"60px 0",fontSize:13}}>
                Aucun marché pour l'instant.<br/>
                <span style={{color:"#444",fontSize:11}}>{me?"Crée le premier !":"Connecte-toi pour commencer."}</span>
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
              {filtered.map(mkt=>{
                const odds=computeOdds(mkt);
                const myBet=myBetOn(mkt);
                const col=CAT_COLOR[mkt.category]||"#888";
                const isOwn=mkt.creatorId===me?.id;
                const canBet=!mkt.resolved&&!myBet&&me&&!isOwn;
                return (
                  <div key={mkt.id} style={{background:"#0f0f0f",
                    border:myBet?`2px solid ${col}`:"1px solid #1a1a1a",
                    borderRadius:4,padding:16,position:"relative",overflow:"hidden",
                    cursor:canBet?"pointer":"default",transition:"border-color 0.15s",
                    opacity:mkt.resolved?0.65:1}}
                    onMouseEnter={e=>{if(canBet)e.currentTarget.style.borderColor="#ffdc32";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=myBet?col:"#1a1a1a";}}
                    onClick={()=>{
                      if(mkt.resolved)return;
                      if(!me){setView("auth");return;}
                      if(myBet||isOwn)return;
                      setBetModal(mkt);setBetSide(null);setBetAmount(50);
                    }}>
                    {mkt.resolved&&<div style={{position:"absolute",top:10,right:10,background:"#252525",
                      color:"#aaa",fontSize:8,fontWeight:"bold",letterSpacing:2,padding:"2px 6px",borderRadius:2}}>
                      {mkt.result==="yes"?"✅ OUI":"❌ NON"} · RÉSOLU</div>}
                    {isOwn&&!mkt.resolved&&<div style={{position:"absolute",top:10,right:10,
                      background:"#ffdc3215",color:"#ffdc32",fontSize:8,fontWeight:"bold",
                      letterSpacing:2,padding:"2px 6px",borderRadius:2}}>TON MARCHÉ</div>}
                    {myBet&&<div style={{position:"absolute",top:0,left:0,right:0,height:3,background:col}}/>}

                    <div style={{display:"flex",gap:10,marginBottom:12}}>
                      <span style={{fontSize:22,lineHeight:1,flexShrink:0}}>{mkt.emoji}</span>
                      <div style={{flex:1}}>
                        <span style={{background:`${col}18`,color:col,fontSize:8,fontWeight:"bold",
                          letterSpacing:2,padding:"2px 7px",borderRadius:2,textTransform:"uppercase"}}>
                          {mkt.category}</span>
                        <div style={{fontSize:13,fontWeight:"bold",lineHeight:1.4,marginTop:5}}>{mkt.title}</div>
                        <div style={{fontSize:9,color:"#444",marginTop:3}}>par {mkt.creatorPseudo}</div>
                      </div>
                    </div>

                    {odds.total>0 ? (
                      <div style={{marginBottom:10}}>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:9,marginBottom:5}}>
                          <span style={{color:"#10b981",fontWeight:"bold"}}>OUI {odds.yesPct}% · {odds.yesTotal} SC</span>
                          <span style={{color:"#ef4444",fontWeight:"bold"}}>NON {odds.noPct}% · {odds.noTotal} SC</span>
                        </div>
                        <div style={{height:5,background:"#1a1a1a",borderRadius:3,overflow:"hidden",display:"flex"}}>
                          <div style={{width:`${odds.yesPct}%`,background:"linear-gradient(90deg,#10b981,#34d399)",transition:"width 0.4s"}}/>
                          <div style={{flex:1,background:"#ef4444"}}/>
                        </div>
                      </div>
                    ) : (
                      <div style={{marginBottom:10,padding:"7px 10px",background:"#1a1a1a",borderRadius:2,
                        fontSize:10,color:"#444",textAlign:"center"}}>Aucun pari — sois le premier !</div>
                    )}

                    <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#333"}}>
                      <span>💰 {odds.total.toLocaleString()} SC · {(mkt.bets||[]).length} pari{(mkt.bets||[]).length>1?"s":""}</span>
                      <span>{new Date(mkt.createdAt).toLocaleDateString("fr-FR")}</span>
                    </div>

                    {myBet && (
                      <div style={{marginTop:10,padding:"6px 10px",background:`${col}12`,
                        border:`1px solid ${col}30`,borderRadius:2,fontSize:10,color:col,fontWeight:"bold",
                        display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <span>✓ {myBet.side==="yes"?"OUI":"NON"} · {myBet.amount} SC
                          {mkt.resolved&&<span style={{marginLeft:8,color:mkt.result===myBet.side?"#10b981":"#ef4444"}}>
                            {mkt.result===myBet.side?"→ GAGNÉ 🎉":"→ PERDU 😢"}</span>}
                        </span>
                        {!mkt.resolved&&(
                          <button onClick={e=>{e.stopPropagation();setDelConfirm({type:"bet",market:mkt});}}
                            style={{background:"#ef444415",border:"1px solid #ef444430",color:"#ef4444",
                              padding:"2px 7px",borderRadius:2,cursor:"pointer",
                              fontSize:9,fontFamily:"inherit",fontWeight:"bold",marginLeft:8,flexShrink:0}}>
                            ✕ RETIRER</button>
                        )}
                      </div>
                    )}

                    {isOwn&&!mkt.resolved&&(
                      <button onClick={e=>{e.stopPropagation();setDelConfirm({type:"market",market:mkt});}}
                        style={{marginTop:8,width:"100%",background:"transparent",
                          border:"1px solid #ef444430",color:"#ef4444",padding:"6px",
                          borderRadius:2,cursor:"pointer",fontSize:9,fontFamily:"inherit",
                          fontWeight:"bold",letterSpacing:1}}>🗑 SUPPRIMER CE MARCHÉ</button>
                    )}
                  </div>
                );
              })}
            </div>
          </main>
        </>
      )}

      {/* ══ LEADERBOARD ═════════════════════════════════════════ */}
      {view==="leaderboard" && (
        <div style={{maxWidth:820,margin:"0 auto",padding:"28px 20px",position:"relative",zIndex:1}}>
          <div style={{marginBottom:24}}>
            <div style={{fontSize:8,color:"#ffdc32",letterSpacing:4,marginBottom:5}}>CLASSEMENT GÉNÉRAL</div>
            <div style={{fontSize:24,fontWeight:"bold"}}>🏆 Meilleurs parieurs</div>
          </div>
          {leaderboard.length===0 ? (
            <div style={{textAlign:"center",color:"#333",padding:"60px 0",fontSize:13}}>
              Aucun joueur inscrit.<br/>
              <button onClick={()=>setView("auth")} style={{marginTop:12,background:"#ffdc32",color:"#0d0d0d",
                border:"none",padding:"8px 18px",borderRadius:2,cursor:"pointer",
                fontWeight:"bold",fontSize:11,fontFamily:"inherit"}}>S'inscrire →</button>
            </div>
          ) : (
            <>
              {leaderboard.length>=1&&(
                <div style={{display:"flex",gap:8,marginBottom:22,alignItems:"flex-end"}}>
                  {[leaderboard[1],leaderboard[0],leaderboard[2]].map((u,i)=>{
                    if(!u) return <div key={i} style={{flex:1}}/>;
                    const colors=["#94a3b8","#ffdc32","#cd7c2f"];
                    const medals=["🥈","🥇","🥉"];
                    const heights=[130,162,110];
                    return (
                      <div key={u.id} style={{flex:1,background:"#0f0f0f",border:`1px solid ${colors[i]}22`,
                        borderRadius:4,padding:14,textAlign:"center",height:heights[i],
                        display:"flex",flexDirection:"column",justifyContent:"flex-end",
                        cursor:"pointer",transition:"border-color 0.15s"}}
                        onMouseEnter={e=>e.currentTarget.style.borderColor=colors[i]}
                        onMouseLeave={e=>e.currentTarget.style.borderColor=`${colors[i]}22`}
                        onClick={()=>{setProfileUser(u);setView("profile");}}>
                        <div style={{fontSize:24,marginBottom:3}}>{u.avatar}</div>
                        <div style={{fontSize:12,fontWeight:"bold",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.pseudo}</div>
                        <div style={{fontSize:20,fontWeight:"bold",color:colors[i]}}>{medals[i]}</div>
                        <div style={{fontSize:10,color:"#444",marginTop:3}}>{u.profit>=0?"+":""}{u.profit.toLocaleString()} SC</div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{background:"#0f0f0f",border:"1px solid #1a1a1a",borderRadius:4,overflow:"hidden"}}>
                <div style={{display:"grid",gridTemplateColumns:"44px 1fr 60px 60px 60px 80px",
                  padding:"8px 16px",borderBottom:"1px solid #1a1a1a"}}>
                  {["#","JOUEUR","V","D","W/R","PROFIT"].map(h=>(
                    <div key={h} style={{fontSize:8,color:"#444",fontWeight:"bold",letterSpacing:2,
                      textAlign:h==="JOUEUR"?"left":"right"}}>{h}</div>
                  ))}
                </div>
                {leaderboard.map((u,i)=>{
                  const rc={0:"#ffdc32",1:"#94a3b8",2:"#cd7c2f"};
                  const isMe=me?.id===u.id;
                  return (
                    <div key={u.id} style={{display:"grid",gridTemplateColumns:"44px 1fr 60px 60px 60px 80px",
                      padding:"11px 16px",borderBottom:"1px solid #111",
                      background:isMe?"#ffdc3206":"transparent",
                      borderLeft:isMe?"3px solid #ffdc32":"3px solid transparent",
                      cursor:"pointer"}}
                      onMouseEnter={e=>e.currentTarget.style.background="#ffffff06"}
                      onMouseLeave={e=>e.currentTarget.style.background=isMe?"#ffdc3206":"transparent"}
                      onClick={()=>{setProfileUser(u);setView("profile");}}>
                      <div style={{fontSize:12,fontWeight:"bold",color:rc[i]||"#444"}}>
                        {i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}</div>
                      <div style={{display:"flex",alignItems:"center",gap:7}}>
                        <span style={{fontSize:16}}>{u.avatar}</span>
                        <span style={{fontSize:12,color:isMe?"#ffdc32":"#ccc",fontWeight:isMe?"bold":"normal"}}>
                          {u.pseudo}{isMe?" (toi)":""}</span>
                      </div>
                      <div style={{textAlign:"right",color:"#10b981",fontSize:12,fontWeight:"bold"}}>{u.wins}</div>
                      <div style={{textAlign:"right",color:"#ef4444",fontSize:12,fontWeight:"bold"}}>{u.losses}</div>
                      <div style={{textAlign:"right",fontSize:11,fontWeight:"bold",color:u.winRate>=50?"#10b981":"#ef4444"}}>{u.winRate}%</div>
                      <div style={{textAlign:"right",fontSize:12,fontWeight:"bold",color:u.profit>=0?"#10b981":"#ef4444"}}>
                        {u.profit>=0?"+":""}{u.profit.toLocaleString()}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══ PROFIL ══════════════════════════════════════════════ */}
      {view==="profile"&&profileUser&&(()=>{
        const u=leaderboard.find(x=>x.id===profileUser.id)||profileUser;
        const stats=computeStats(u.id,markets);
        const myBets=markets.flatMap(m=>(m.bets||[]).filter(b=>b.userId===u.id).map(b=>({...b,market:m})));
        const tot=stats.wins+stats.losses;
        const wr=tot>0?Math.round(stats.wins/tot*100):0;
        const prf=u.wallet-1000;
        const isMe=me?.id===u.id;
        return (
          <div style={{maxWidth:700,margin:"0 auto",padding:"26px 20px",position:"relative",zIndex:1}}>
            <button onClick={()=>setView("leaderboard")} style={{background:"transparent",border:"none",
              color:"#444",cursor:"pointer",fontSize:11,fontFamily:"inherit",marginBottom:18,padding:0,letterSpacing:1}}>
              ← RETOUR</button>
            <div style={{background:"#0f0f0f",border:"1px solid #1a1a1a",borderRadius:4,padding:24,
              marginBottom:14,display:"flex",gap:20,alignItems:"center",flexWrap:"wrap"}}>
              <div style={{fontSize:64}}>{u.avatar}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:8,color:"#444",letterSpacing:3,marginBottom:4}}>
                  JOUEUR{isMe&&<span style={{marginLeft:8,color:"#ffdc32"}}>● TOI</span>}</div>
                <div style={{fontSize:26,fontWeight:"bold",marginBottom:10}}>{u.pseudo}</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {[{lbl:"SOLDE",v:`${u.wallet.toLocaleString()} SC`,c:"#ffdc32"},
                    {lbl:"PROFIT",v:`${prf>=0?"+":""}${prf.toLocaleString()} SC`,c:prf>=0?"#10b981":"#ef4444"},
                    {lbl:"WIN RATE",v:`${wr}%`,c:wr>=50?"#10b981":"#ef4444"},
                  ].map(s=>(
                    <div key={s.lbl} style={{background:"#111",border:`1px solid ${s.c}22`,padding:"7px 13px",borderRadius:2}}>
                      <div style={{fontSize:8,color:"#444",letterSpacing:2}}>{s.lbl}</div>
                      <div style={{fontSize:15,fontWeight:"bold",color:s.c}}>{s.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
              {[{lbl:"VICTOIRES",v:stats.wins,c:"#10b981"},{lbl:"DÉFAITES",v:stats.losses,c:"#ef4444"},
                {lbl:"PARIS",v:myBets.length,c:"#3b82f6"},{lbl:"MARCHÉS",v:markets.filter(m=>m.creatorId===u.id).length,c:"#f59e0b"},
              ].map(s=>(
                <div key={s.lbl} style={{background:"#0f0f0f",border:"1px solid #1a1a1a",borderRadius:4,padding:"12px 10px",textAlign:"center"}}>
                  <div style={{fontSize:8,color:"#444",letterSpacing:2,marginBottom:5}}>{s.lbl}</div>
                  <div style={{fontSize:20,fontWeight:"bold",color:s.c}}>{s.v}</div>
                </div>
              ))}
            </div>
            <div style={{background:"#0f0f0f",border:"1px solid #1a1a1a",borderRadius:4,overflow:"hidden"}}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid #1a1a1a",fontSize:9,color:"#444",letterSpacing:2}}>
                HISTORIQUE DES PARIS ({myBets.length})</div>
              {myBets.length===0 ? (
                <div style={{padding:20,textAlign:"center",color:"#2a2a2a",fontSize:12}}>Aucun pari</div>
              ) : myBets.slice().reverse().map((b,i)=>{
                const won=b.market.resolved?b.market.result===b.side:null;
                return (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 16px",borderBottom:"1px solid #0d0d0d"}}>
                    <span style={{fontSize:18,flexShrink:0}}>{b.market.emoji}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:"bold",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.market.title}</div>
                      <div style={{fontSize:9,color:"#444",marginTop:2}}>
                        <span style={{color:b.side==="yes"?"#10b981":"#ef4444"}}>{b.side==="yes"?"OUI":"NON"}</span>{" · "}{b.amount} SC</div>
                    </div>
                    <div style={{fontSize:10,fontWeight:"bold",color:won===true?"#10b981":won===false?"#ef4444":"#444"}}>
                      {won===true?"GAGNÉ 🎉":won===false?"PERDU 😢":"EN COURS"}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ══ MODAL PARIER ════════════════════════════════════════ */}
      {betModal&&(
        <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.92)",
          backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={()=>setBetModal(null)}>
          <div style={{background:"#111",border:"2px solid #ffdc32",borderRadius:4,padding:26,maxWidth:420,width:"100%"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:26,marginBottom:8}}>{betModal.emoji}</div>
            <div style={{fontSize:15,fontWeight:"bold",marginBottom:18,lineHeight:1.4}}>{betModal.title}</div>
            {(()=>{
              const o=computeOdds(betModal);
              return o.total>0 ? (
                <div style={{marginBottom:18}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:9,marginBottom:5}}>
                    <span style={{color:"#10b981",fontWeight:"bold"}}>OUI {o.yesPct}% · {o.yesTotal} SC</span>
                    <span style={{color:"#ef4444",fontWeight:"bold"}}>NON {o.noPct}% · {o.noTotal} SC</span>
                  </div>
                  <div style={{height:5,background:"#1a1a1a",borderRadius:3,overflow:"hidden",display:"flex"}}>
                    <div style={{width:`${o.yesPct}%`,background:"linear-gradient(90deg,#10b981,#34d399)"}}/>
                    <div style={{flex:1,background:"#ef4444"}}/>
                  </div>
                </div>
              ) : (
                <div style={{marginBottom:18,padding:"10px",background:"#1a1a1a",borderRadius:2,fontSize:10,color:"#555",textAlign:"center"}}>
                  Premier pari — tu définis les cotes !</div>
              );
            })()}
            <div style={{fontSize:9,color:"#444",letterSpacing:2,marginBottom:8}}>TON CHOIX</div>
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              {[["yes","✅ OUI","#10b981"],["no","❌ NON","#ef4444"]].map(([s,lbl,c])=>(
                <button key={s} onClick={()=>setBetSide(s)} style={{flex:1,padding:"11px",
                  border:betSide===s?`2px solid ${c}`:"1px solid #252525",
                  background:betSide===s?`${c}18`:"#0d0d0d",color:betSide===s?c:"#555",
                  borderRadius:2,cursor:"pointer",fontWeight:"bold",fontSize:14,fontFamily:"inherit"}}>
                  {lbl}</button>
              ))}
            </div>
            <div style={{fontSize:9,color:"#444",letterSpacing:2,marginBottom:8}}>MISE (SC)</div>
            <div style={{display:"flex",gap:6,marginBottom:5}}>
              <input type="number" min={10} max={me?.wallet||1000} value={betAmount}
                onChange={e=>setBetAmount(e.target.value)}
                style={{flex:1,background:"#0d0d0d",border:"1px solid #252525",color:"#e8e0d0",
                  padding:"9px 12px",borderRadius:2,fontSize:17,fontWeight:"bold",fontFamily:"inherit",outline:"none"}}/>
              {[25,50,100,250].map(v=>(
                <button key={v} onClick={()=>setBetAmount(v)} style={{background:"#0d0d0d",border:"1px solid #252525",
                  color:"#555",padding:"0 8px",borderRadius:2,cursor:"pointer",fontSize:10,fontFamily:"inherit",flexShrink:0}}>{v}</button>
              ))}
            </div>
            <div style={{fontSize:9,color:"#333",marginBottom:16}}>Solde : {me?.wallet?.toLocaleString()} SC</div>
            <button onClick={placeBet} disabled={!betSide} style={{width:"100%",
              background:betSide?"#ffdc32":"#1a1a1a",color:betSide?"#0d0d0d":"#444",
              border:"none",padding:"13px",borderRadius:2,cursor:betSide?"pointer":"not-allowed",
              fontWeight:"bold",fontSize:13,fontFamily:"inherit",letterSpacing:1}}>
              {betSide?`→ MISER ${betAmount} SC sur "${betSide==="yes"?"OUI":"NON"}`:"Choisis OUI ou NON d'abord"}
            </button>
            <button onClick={()=>setBetModal(null)} style={{width:"100%",marginTop:7,background:"transparent",
              border:"1px solid #1a1a1a",color:"#333",padding:"8px",borderRadius:2,cursor:"pointer",fontFamily:"inherit",fontSize:10}}>
              Annuler</button>
          </div>
        </div>
      )}

      {/* ══ MODAL CRÉER ═════════════════════════════════════════ */}
      {createOpen&&me&&(
        <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.92)",
          backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={()=>setCreateOpen(false)}>
          <div style={{background:"#111",border:"2px solid #ffdc32",borderRadius:4,padding:26,maxWidth:400,width:"100%"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:17,fontWeight:"bold",color:"#ffdc32",marginBottom:3}}>Créer un marché</div>
            <div style={{fontSize:9,color:"#444",marginBottom:20,letterSpacing:1}}>
              {markets.filter(m=>m.creatorId===me.id&&!m.resolved).length}/5 marchés actifs</div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:9,color:"#444",letterSpacing:2,marginBottom:8}}>EMOJI</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {EMOJIS.map(e=>(
                  <button key={e} onClick={()=>setDraft(d=>({...d,emoji:e}))} style={{
                    fontSize:18,background:draft.emoji===e?"#ffdc3215":"transparent",
                    border:draft.emoji===e?"2px solid #ffdc32":"2px solid transparent",
                    borderRadius:4,padding:4,cursor:"pointer"}}>{e}</button>
                ))}
              </div>
            </div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:9,color:"#444",letterSpacing:2,marginBottom:8}}>QUESTION</div>
              <TxtInput value={draft.title} onChange={e=>setDraft(d=>({...d,title:e.target.value}))}
                onKeyDown={e=>e.key==="Enter"&&createMarket()}
                placeholder="Ex: M. Dupont sera absent lundi ?" err={!!draftErr}/>
              {draftErr&&<div style={{fontSize:10,color:"#ef4444",marginTop:5}}>⚠ {draftErr}</div>}
            </div>
            <div style={{marginBottom:20}}>
              <div style={{fontSize:9,color:"#444",letterSpacing:2,marginBottom:8}}>CATÉGORIE</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {["profs","eleves","cours","vie scolaire"].map(cat=>(
                  <button key={cat} onClick={()=>setDraft(d=>({...d,category:cat}))} style={{
                    background:draft.category===cat?CAT_COLOR[cat]:"transparent",
                    color:draft.category===cat?"#fff":"#555",border:`1px solid ${CAT_COLOR[cat]}`,
                    padding:"5px 10px",borderRadius:2,cursor:"pointer",
                    fontSize:9,fontWeight:"bold",fontFamily:"inherit",letterSpacing:1,textTransform:"uppercase"}}>
                    {cat}</button>
                ))}
              </div>
            </div>
            <button onClick={createMarket} style={{width:"100%",background:"#ffdc32",color:"#0d0d0d",
              border:"none",padding:"12px",borderRadius:2,cursor:"pointer",
              fontWeight:"bold",fontSize:13,fontFamily:"inherit",letterSpacing:1}}>🚀 PUBLIER</button>
          </div>
        </div>
      )}

      {/* ══ MODAL SUPPRESSION ═══════════════════════════════════ */}
      {delConfirm&&(
        <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,0.94)",
          backdropFilter:"blur(10px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={()=>setDelConfirm(null)}>
          <div style={{background:"#111",border:"2px solid #ef4444",borderRadius:4,padding:28,maxWidth:400,width:"100%"}}
            onClick={e=>e.stopPropagation()}>
            {delConfirm.type==="market" ? (
              <>
                <div style={{fontSize:28,marginBottom:10}}>🗑</div>
                <div style={{fontSize:16,fontWeight:"bold",marginBottom:8}}>Supprimer ce marché ?</div>
                <div style={{fontSize:13,color:"#888",marginBottom:8,fontStyle:"italic"}}>« {delConfirm.market.title} »</div>
                <div style={{fontSize:11,color:"#555",marginBottom:22,lineHeight:1.6,
                  padding:"10px 12px",background:"#1a1a1a",borderRadius:2,border:"1px solid #252525"}}>
                  ⚠️ Action <span style={{color:"#ef4444"}}>irréversible</span>. Les <span style={{color:"#ffdc32"}}>{(delConfirm.market.bets||[]).length} paris</span> seront <span style={{color:"#10b981"}}>remboursés</span>.
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setDelConfirm(null)} style={{flex:1,background:"transparent",
                    border:"1px solid #252525",color:"#555",padding:"11px",borderRadius:2,
                    cursor:"pointer",fontFamily:"inherit",fontWeight:"bold",fontSize:12}}>← ANNULER</button>
                  <button onClick={()=>deleteMarket(delConfirm.market.id)} style={{flex:1,background:"#ef4444",
                    color:"#fff",border:"none",padding:"11px",borderRadius:2,cursor:"pointer",
                    fontFamily:"inherit",fontWeight:"bold",fontSize:12}}>🗑 OUI, SUPPRIMER</button>
                </div>
              </>
            ) : (
              <>
                <div style={{fontSize:28,marginBottom:10}}>↩</div>
                <div style={{fontSize:16,fontWeight:"bold",marginBottom:8}}>Retirer ton pari ?</div>
                <div style={{fontSize:13,color:"#888",marginBottom:8,fontStyle:"italic"}}>« {delConfirm.market.title} »</div>
                {(()=>{
                  const b=(delConfirm.market.bets||[]).find(x=>x.userId===me?.id);
                  return (
                    <div style={{fontSize:11,color:"#555",marginBottom:22,lineHeight:1.6,
                      padding:"10px 12px",background:"#1a1a1a",borderRadius:2,border:"1px solid #252525"}}>
                      Ton pari de <span style={{color:"#ffdc32"}}>{b?.amount} SC</span> sur «&nbsp;{b?.side==="yes"?"OUI":"NON"}&nbsp;» sera annulé. Tu seras <span style={{color:"#10b981"}}>remboursé intégralement</span>.
                    </div>
                  );
                })()}
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setDelConfirm(null)} style={{flex:1,background:"transparent",
                    border:"1px solid #252525",color:"#555",padding:"11px",borderRadius:2,
                    cursor:"pointer",fontFamily:"inherit",fontWeight:"bold",fontSize:12}}>← GARDER</button>
                  <button onClick={()=>deleteBet(delConfirm.market.id)} style={{flex:1,background:"#ef4444",
                    color:"#fff",border:"none",padding:"11px",borderRadius:2,cursor:"pointer",
                    fontFamily:"inherit",fontWeight:"bold",fontSize:12}}>↩ OUI, RETIRER</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══ MODAL PARTAGER ══════════════════════════════════════ */}
      {shareOpen&&(
        <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,0.94)",
          backdropFilter:"blur(10px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={()=>setShareOpen(false)}>
          <div style={{background:"#111",border:"2px solid #ffdc32",borderRadius:4,padding:28,maxWidth:400,width:"100%"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:28,marginBottom:10}}>🔗</div>
            <div style={{fontSize:17,fontWeight:"bold",color:"#ffdc32",marginBottom:4}}>Partager SchoolMarket</div>
            <div style={{fontSize:11,color:"#444",marginBottom:20}}>Envoie le lien à tes camarades</div>
            <div style={{display:"flex",gap:6,marginBottom:16}}>
              <div style={{flex:1,background:"#0d0d0d",border:"1px solid #252525",padding:"10px 12px",
                borderRadius:2,fontSize:10,color:"#555",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {window.location.href}</div>
              <button onClick={handleShare} style={{background:copied?"#10b981":"#ffdc32",color:"#0d0d0d",
                border:"none",padding:"10px 14px",borderRadius:2,cursor:"pointer",
                fontWeight:"bold",fontSize:11,fontFamily:"inherit",flexShrink:0,transition:"background 0.2s"}}>
                {copied?"✓ COPIÉ !":"📋 COPIER"}</button>
            </div>
            <button onClick={handleShare} style={{width:"100%",background:"#ffdc32",color:"#0d0d0d",
              border:"none",padding:"12px",borderRadius:2,cursor:"pointer",
              fontWeight:"bold",fontSize:13,fontFamily:"inherit",letterSpacing:1}}>📤 PARTAGER</button>
            <button onClick={()=>setShareOpen(false)} style={{width:"100%",marginTop:8,background:"transparent",
              border:"1px solid #1a1a1a",color:"#333",padding:"9px",borderRadius:2,
              cursor:"pointer",fontFamily:"inherit",fontSize:11}}>Fermer</button>
          </div>
        </div>
      )}

      <style>{`*{box-sizing:border-box;margin:0;padding:0;} input::-webkit-outer-spin-button,input::-webkit-inner-spin-button{-webkit-appearance:none;} ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-track{background:#0d0d0d} ::-webkit-scrollbar-thumb{background:#252525}`}</style>
    </div>
  );
}
