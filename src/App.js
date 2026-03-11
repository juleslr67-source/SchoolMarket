import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set } from "firebase/database";

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBIO4eZEMjmO73lpjpON0aFKSa88gApT74",
  authDomain:        "schoolmarket-26991.firebaseapp.com",
  databaseURL:       "https://schoolmarket-26991-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "schoolmarket-26991",
  storageBucket:     "schoolmarket-26991.firebasestorage.app",
  messagingSenderId: "516686290738",
  appId:             "1:516686290738:web:66c79d40d26bd653d5412b"
};

const ADMIN_PSEUDO   = "JULES-ADMIN";
const ADMIN_PASSWORD = "schoolmarket2025";

const AVATARS   = ["🦁","🎯","🦈","⏰","🔮","🐺","🦊","🐸","🤖","👾","🎃","💀","🦅","🐉","🌙","🐯","🦋","🎭","🧠","⚡"];
const CAT_COLOR = { profs:"#f59e0b", eleves:"#ef4444", cours:"#3b82f6", "vie scolaire":"#10b981" };
const EMOJIS    = ["🎲","🕐","⚠️","📚","😱","🍟","📢","🎉","💀","🏃","🤡","😴","🎓","📝","🏆","😤","🤔","💥","🫠","🤝"];

let db = null;
let firebaseOk = false;
try {
  const app = initializeApp(FIREBASE_CONFIG);
  db = getDatabase(app);
  firebaseOk = FIREBASE_CONFIG.databaseURL.includes("schoolmarket-26991");
} catch(e) { console.warn("Firebase non configuré"); }

async function fbSet(path, data) {
  if (!firebaseOk || !db) return;
  try { await set(ref(db, path), data); } catch {}
}
function fbListen(path, cb) {
  if (!firebaseOk || !db) return () => {};
  return onValue(ref(db, path), snap => cb(snap.exists() ? snap.val() : null));
}

// Hash simple pour les mots de passe (non-cryptographique mais suffisant)
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

function computeOdds(market) {
  const bets = market.bets || [];
  const yesTotal = bets.filter(b=>b.side==="yes").reduce((s,b)=>s+b.amount,0);
  const noTotal  = bets.filter(b=>b.side==="no" ).reduce((s,b)=>s+b.amount,0);
  const total = yesTotal + noTotal;
  if (!total) return { yesPct:50, noPct:50, yesTotal:0, noTotal:0, total:0 };
  return { yesPct:Math.round(yesTotal/total*100), noPct:Math.round(noTotal/total*100), yesTotal, noTotal, total };
}
function computeStats(userId, markets) {
  let wins=0, losses=0, totalBet=0;
  for (const m of markets) {
    const bet = (m.bets||[]).find(b=>b.userId===userId);
    if (!bet) continue;
    totalBet += bet.amount;
    if (m.resolved) m.result===bet.side ? wins++ : losses++;
  }
  return { wins, losses, totalBet };
}

const S = {
  input: (err=false, extra={}) => ({
    width:"100%", boxSizing:"border-box", background:"#0a0a0a",
    border:`1px solid ${err?"#ef4444":"#2a2a2a"}`, color:"#e8e0d0",
    padding:"11px 14px", borderRadius:2, fontSize:14,
    fontFamily:"'Courier New',monospace", outline:"none", ...extra
  }),
  btn: (bg="#ffdc32", color="#0d0d0d", extra={}) => ({
    width:"100%", background:bg, color, border:"none", padding:"12px",
    borderRadius:2, cursor:"pointer", fontWeight:"bold", fontSize:13,
    fontFamily:"'Courier New',monospace", letterSpacing:1, ...extra
  }),
};

const Field = ({ label, children, err }) => (
  <div style={{marginBottom:14}}>
    {label && <div style={{fontSize:9,color:"#555",letterSpacing:2,marginBottom:8}}>{label}</div>}
    {children}
    {err && <div style={{fontSize:11,color:"#ef4444",marginTop:5}}>⚠ {err}</div>}
  </div>
);

const PwInput = ({ value, onChange, placeholder, onKeyDown, err }) => {
  const [show, setShow] = useState(false);
  return (
    <div style={{position:"relative"}}>
      <input type={show?"text":"password"} value={value} onChange={onChange}
        onKeyDown={onKeyDown} placeholder={placeholder||"Mot de passe..."}
        style={{...S.input(err), paddingRight:40}}
        onFocus={e=>e.target.style.borderColor="#ffdc32"}
        onBlur={e=>e.target.style.borderColor=err?"#ef4444":"#2a2a2a"}/>
      <button onClick={()=>setShow(s=>!s)} style={{position:"absolute",right:10,top:"50%",
        transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",
        color:"#555",fontSize:14}}>{show?"🙈":"👁"}</button>
    </div>
  );
};

export default function SchoolMarket() {
  const [users,   setUsers]   = useState([]);
  const [markets, setMarkets] = useState([]);
  const [me,      setMe]      = useState(null);
  const [loaded,  setLoaded]  = useState(false);
  const usersRef   = useRef([]);
  const marketsRef = useRef([]);

  const syncU = (u) => { const a=u?(Array.isArray(u)?u:Object.values(u)):[];  setUsers(a);   usersRef.current=a; };
  const syncM = (m) => { const a=m?(Array.isArray(m)?m:Object.values(m)):[];  setMarkets(a); marketsRef.current=a; };
  const saveU = (u) => { syncU(u); fbSet("users",   u); };
  const saveM = (m) => { syncM(m); fbSet("markets", m); };

  useEffect(() => {
    if (firebaseOk) {
      const u1 = fbListen("users",   d => { syncU(d); setLoaded(true); });
      const u2 = fbListen("markets", d => syncM(d));
      return () => { u1(); u2(); };
    } else {
      try {
        syncU(JSON.parse(localStorage.getItem("sm_users")||"[]"));
        syncM(JSON.parse(localStorage.getItem("sm_markets")||"[]"));
      } catch {}
      setLoaded(true);
    }
  }, []);
  useEffect(() => { if (!firebaseOk) localStorage.setItem("sm_users",   JSON.stringify(users));   }, [users]);
  useEffect(() => { if (!firebaseOk) localStorage.setItem("sm_markets", JSON.stringify(markets)); }, [markets]);

  const isAdmin = me?.pseudo === ADMIN_PSEUDO;

  // ── UI STATE ────────────────────────────────────────────────────
  const [view,        setView]        = useState("markets");
  // Auth
  const [authMode,    setAuthMode]    = useState("login");
  const [authPseudo,  setAuthPseudo]  = useState("");
  const [authPw,      setAuthPw]      = useState("");
  const [authPw2,     setAuthPw2]     = useState(""); // confirm pw (register)
  const [authAvatar,  setAuthAvatar]  = useState("🦁");
  const [authErr,     setAuthErr]     = useState("");
  const [adminPwModal,setAdminPwModal]= useState(false);
  const [adminPwInput,setAdminPwInput]= useState("");
  const [adminPwErr,  setAdminPwErr]  = useState("");
  // Markets
  const [filter,      setFilter]      = useState("tous");
  const [betModal,    setBetModal]    = useState(null);
  const [betAmount,   setBetAmount]   = useState(50);
  const [betSide,     setBetSide]     = useState(null);
  const [createOpen,  setCreateOpen]  = useState(false);
  const [draft,       setDraft]       = useState({title:"",category:"profs",emoji:"🎲"});
  const [draftErr,    setDraftErr]    = useState("");
  // UI misc
  const [profileUser, setProfileUser] = useState(null);
  const [toast,       setToast]       = useState(null);
  const [delConfirm,  setDelConfirm]  = useState(null);
  const [shareOpen,   setShareOpen]   = useState(false);
  const [copied,      setCopied]      = useState(false);
  // Admin
  const [adminTab,    setAdminTab]    = useState("markets");
  const [resolveModal,setResolveModal]= useState(null);
  const [walletModal, setWalletModal] = useState(null);
  const [walletAmt,   setWalletAmt]   = useState("");
  const [banConfirm,  setBanConfirm]  = useState(null);
  // Changement pseudo
  const [renamModal,  setRenamModal]  = useState(null); // user object
  const [renamInput,  setRenamInput]  = useState("");
  const [renamErr,    setRenamErr]    = useState("");
  // Demande changement pseudo (user)
  const [myRenamReq,  setMyRenamReq]  = useState(false);
  const [myRenamInput,setMyRenamInput]= useState("");
  const [myRenamErr,  setMyRenamErr]  = useState("");

  const showToast = (msg, type="ok") => { setToast({msg,type}); setTimeout(()=>setToast(null),2800); };

  // ── AUTH ────────────────────────────────────────────────────────
  const handleRegister = () => {
    setAuthErr("");
    const name = authPseudo.trim();
    if (!name || name.length<2) return setAuthErr("Pseudo trop court (min 2).");
    if (name.length>20) return setAuthErr("Pseudo trop long (max 20).");
    if (name.toLowerCase()===ADMIN_PSEUDO.toLowerCase()) return setAuthErr("Ce pseudo est réservé.");
    if (!authPw || authPw.length<4) return setAuthErr("Mot de passe trop court (min 4 caractères).");
    if (authPw !== authPw2) return setAuthErr("Les mots de passe ne correspondent pas.");
    const cur = usersRef.current;
    if (cur.find(u=>u.pseudo.toLowerCase()===name.toLowerCase())) return setAuthErr("Ce pseudo est déjà pris !");
    const newUser = {
      id:`u_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      pseudo:name, avatar:authAvatar, wallet:1000,
      passwordHash:simpleHash(authPw),
      banned:false, canRename:false, renameRequest:null
    };
    saveU([...cur, newUser]);
    setMe(newUser);
    setAuthPseudo(""); setAuthPw(""); setAuthPw2("");
    showToast(`Bienvenue ${name} ! 🎉 1 000 SC pour toi.`);
    setView("markets");
  };

  const handleLogin = () => {
    setAuthErr("");
    const name = authPseudo.trim();
    if (!name) return setAuthErr("Saisis ton pseudo.");
    // Connexion admin
    if (name.toLowerCase()===ADMIN_PSEUDO.toLowerCase()) {
      setAdminPwModal(true); return;
    }
    const cur = usersRef.current;
    const found = cur.find(u=>u.pseudo.toLowerCase()===name.toLowerCase());
    if (!found) return setAuthErr("Pseudo introuvable — inscris-toi !");
    if (found.banned) return setAuthErr("Ce compte a été banni. Contacte l'admin.");
    if (!authPw) return setAuthErr("Saisis ton mot de passe.");
    if (found.passwordHash !== simpleHash(authPw)) return setAuthErr("Mot de passe incorrect.");
    setMe(found);
    setAuthPseudo(""); setAuthPw("");
    showToast(`Content de te revoir, ${found.pseudo} 👋`);
    setView("markets");
  };

  const handleAdminLogin = () => {
    if (adminPwInput !== ADMIN_PASSWORD) { setAdminPwErr("Mot de passe incorrect."); return; }
    const cur = usersRef.current;
    let adm = cur.find(u=>u.pseudo===ADMIN_PSEUDO);
    if (!adm) {
      adm = { id:"admin_root", pseudo:ADMIN_PSEUDO, avatar:"👑", wallet:999999,
               passwordHash:"", banned:false, isAdmin:true, canRename:false, renameRequest:null };
      saveU([...cur, adm]);
    }
    setMe(adm);
    setAdminPwModal(false); setAdminPwInput(""); setAdminPwErr(""); setAuthPseudo(""); setAuthPw("");
    showToast("Bienvenue JULES-ADMIN 👑");
    setView("markets");
  };

  // ── PARIER ──────────────────────────────────────────────────────
  const placeBet = () => {
    if (!me || !betModal || !betSide) return;
    const amount = parseInt(betAmount);
    if (!amount || amount<10) return showToast("Mise min : 10 SC","err");
    const cur     = usersRef.current;
    const freshMe = cur.find(u=>u.id===me.id)||me;
    if (freshMe.wallet<amount) return showToast("Pas assez de SchoolCoins 😢","err");
    const mkt = marketsRef.current.find(m=>m.id===betModal.id);
    if (!mkt||mkt.resolved) return showToast("Marché déjà résolu.","err");
    if ((mkt.bets||[]).find(b=>b.userId===me.id)) return showToast("Tu as déjà parié ici !","err");
    if (mkt.creatorId===me.id) return showToast("Tu ne peux pas parier sur ton propre marché.","err");
    const newMkt = {...mkt, bets:[...(mkt.bets||[]),
      {userId:me.id,pseudo:me.pseudo,avatar:me.avatar,side:betSide,amount,at:Date.now()}]};
    saveM(marketsRef.current.map(m=>m.id===mkt.id?newMkt:m));
    const newMe = {...freshMe, wallet:freshMe.wallet-amount};
    saveU(cur.map(u=>u.id===me.id?newMe:u));
    setMe(newMe);
    setBetModal(null); setBetSide(null);
    showToast(`✅ ${amount} SC misés sur "${betSide==="yes"?"OUI":"NON"}"`);
  };

  // ── CRÉER MARCHÉ ────────────────────────────────────────────────
  const createMarket = () => {
    setDraftErr("");
    if (!draft.title.trim()) return setDraftErr("Écris une question !");
    if (draft.title.length>100) return setDraftErr("Question trop longue.");
    const myCount = marketsRef.current.filter(m=>m.creatorId===me.id&&!m.resolved).length;
    if (myCount>=5 && !isAdmin) return setDraftErr("Max 5 marchés actifs.");
    const m = {
      id:`m_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      title:draft.title.trim(), category:draft.category, emoji:draft.emoji,
      creatorId:me.id, creatorPseudo:me.pseudo,
      bets:[], resolved:false, result:null, createdAt:Date.now()
    };
    saveM([m,...marketsRef.current]);
    setDraft({title:"",category:"profs",emoji:"🎲"}); setCreateOpen(false);
    showToast("🎉 Marché créé !");
  };

  // ── SUPPRIMER MARCHÉ ────────────────────────────────────────────
  const deleteMarket = (marketId) => {
    const mkt = marketsRef.current.find(m=>m.id===marketId);
    if (!mkt) return;
    let newU = [...usersRef.current];
    for (const bet of (mkt.bets||[])) {
      newU = newU.map(u=>u.id===bet.userId?{...u,wallet:u.wallet+bet.amount}:u);
    }
    saveU(newU);
    saveM(marketsRef.current.filter(m=>m.id!==marketId));
    const fm = newU.find(u=>u.id===me?.id);
    if (fm) setMe(fm);
    setDelConfirm(null);
    showToast("🗑 Marché supprimé — paris remboursés.");
  };

  // ── RETIRER PARI (pénalité 50%) ─────────────────────────────────
  const deleteBet = (marketId) => {
    const mkt = marketsRef.current.find(m=>m.id===marketId);
    if (!mkt||mkt.resolved) return showToast("Impossible : marché résolu.","err");
    const myBet = (mkt.bets||[]).find(b=>b.userId===me.id);
    if (!myBet) return;
    const penalty   = Math.floor(myBet.amount * 0.5); // 50% perdu
    const refund    = myBet.amount - penalty;          // 50% remboursé
    // Le pari est retiré mais la pénalité reste dans le marché comme mise fantôme
    // (elle sera distribuée aux gagnants à la clôture)
    const penaltyBet = {
      userId:`penalty_${me.id}_${Date.now()}`,
      pseudo:"[cagnotte]", avatar:"💰",
      side: myBet.side, // même camp → gonfle les cotes adverses
      amount: penalty, at: Date.now(), isPenalty: true
    };
    const newBets = [...mkt.bets.filter(b=>b.userId!==me.id), penaltyBet];
    saveM(marketsRef.current.map(m=>m.id===marketId?{...mkt,bets:newBets}:m));
    const newMe = {...me, wallet:me.wallet+refund};
    saveU(usersRef.current.map(u=>u.id===me.id?newMe:u));
    setMe(newMe);
    setDelConfirm(null);
    showToast(`↩ Pari retiré — ${refund} SC remboursés, ${penalty} SC en pénalité.`);
  };

  // ── ADMIN : CLÔTURER ────────────────────────────────────────────
  const adminResolve = (marketId, result) => {
    const mkt = marketsRef.current.find(m=>m.id===marketId);
    if (!mkt||mkt.resolved) return;
    const odds    = computeOdds(mkt);
    const winners = (mkt.bets||[]).filter(b=>b.side===result);
    const losers  = (mkt.bets||[]).filter(b=>b.side!==result);
    const totalLost = losers.reduce((s,b)=>s+b.amount,0);
    let newU = [...usersRef.current];
    if (winners.length>0) {
      const pool = result==="yes" ? odds.yesTotal : odds.noTotal;
      for (const bet of winners) {
        const share = pool>0 ? Math.floor(bet.amount/pool*totalLost) : 0;
        newU = newU.map(u=>u.id===bet.userId?{...u,wallet:u.wallet+bet.amount+share}:u);
      }
    } else {
      for (const bet of (mkt.bets||[])) {
        newU = newU.map(u=>u.id===bet.userId?{...u,wallet:u.wallet+bet.amount}:u);
      }
    }
    saveU(newU);
    saveM(marketsRef.current.map(m=>m.id===marketId?{...mkt,resolved:true,result,resolvedAt:Date.now()}:m));
    setResolveModal(null);
    showToast(`✅ Clôturé — ${result==="yes"?"OUI":"NON"} gagne`);
  };

  // ── ADMIN : WALLET ───────────────────────────────────────────────
  const adminEditWallet = (userId, delta) => {
    const amount = parseInt(walletAmt);
    if (!amount||amount<=0) return showToast("Montant invalide","err");
    const change = delta==="add"?amount:-amount;
    saveU(usersRef.current.map(u=>u.id===userId?{...u,wallet:Math.max(0,u.wallet+change)}:u));
    setWalletModal(null); setWalletAmt("");
    showToast(`💰 ${delta==="add"?"+":"-"}${amount} SC appliqués`);
  };

  // ── ADMIN : BAN ──────────────────────────────────────────────────
  const adminBan = (userId, ban) => {
    let newU = usersRef.current.map(u=>u.id===userId?{...u,banned:ban}:u);
    if (ban) {
      const toRemove = marketsRef.current.filter(m=>m.creatorId===userId&&!m.resolved);
      for (const mkt of toRemove) {
        for (const bet of (mkt.bets||[])) {
          newU = newU.map(u=>u.id===bet.userId?{...u,wallet:u.wallet+bet.amount}:u);
        }
      }
      saveM(marketsRef.current.filter(m=>!(m.creatorId===userId&&!m.resolved)));
    }
    saveU(newU);
    setBanConfirm(null);
    showToast(ban?"🚫 Utilisateur banni":"✅ Utilisateur débanni");
  };

  // ── ADMIN : RENOMMER ─────────────────────────────────────────────
  const adminRename = (userId) => {
    setRenamErr("");
    const name = renamInput.trim();
    if (!name||name.length<2) return setRenamErr("Pseudo trop court.");
    if (name.toLowerCase()===ADMIN_PSEUDO.toLowerCase()) return setRenamErr("Pseudo réservé.");
    const cur = usersRef.current;
    if (cur.find(u=>u.id!==userId&&u.pseudo.toLowerCase()===name.toLowerCase()))
      return setRenamErr("Pseudo déjà pris !");
    const oldPseudo = cur.find(u=>u.id===userId)?.pseudo||"";
    // Met à jour le pseudo dans les marchés et paris
    const newU = cur.map(u=>u.id===userId?{...u,pseudo:name,canRename:false,renameRequest:null}:u);
    const newM = marketsRef.current.map(m=>({
      ...m,
      creatorPseudo: m.creatorId===userId ? name : m.creatorPseudo,
      bets: (m.bets||[]).map(b=>b.userId===userId?{...b,pseudo:name}:b)
    }));
    saveU(newU); saveM(newM);
    setRenamModal(null); setRenamInput(""); setRenamErr("");
    showToast(`✏️ Pseudo changé : ${oldPseudo} → ${name}`);
  };

  // ── ADMIN : AUTORISER demande de renommage ───────────────────────
  const adminAllowRename = (userId) => {
    saveU(usersRef.current.map(u=>u.id===userId?{...u,canRename:true,renameRequest:null}:u));
    showToast("✅ Changement de pseudo autorisé !");
  };
  const adminDenyRename = (userId) => {
    saveU(usersRef.current.map(u=>u.id===userId?{...u,renameRequest:null}:u));
    showToast("❌ Demande refusée.");
  };

  // ── USER : demander changement pseudo ────────────────────────────
  const requestRename = () => {
    setMyRenamErr("");
    const name = myRenamInput.trim();
    if (!name||name.length<2) return setMyRenamErr("Pseudo trop court.");
    if (name.toLowerCase()===ADMIN_PSEUDO.toLowerCase()) return setMyRenamErr("Pseudo réservé.");
    const cur = usersRef.current;
    if (cur.find(u=>u.id!==me.id&&u.pseudo.toLowerCase()===name.toLowerCase()))
      return setMyRenamErr("Pseudo déjà pris !");
    saveU(cur.map(u=>u.id===me.id?{...u,renameRequest:name}:u));
    setMyRenamReq(false); setMyRenamInput(""); setMyRenamErr("");
    showToast("📨 Demande envoyée à l'admin !");
  };

  // ── USER : appliquer changement pseudo si autorisé ───────────────
  const applyRename = () => {
    const cur = usersRef.current;
    const myUser = cur.find(u=>u.id===me.id);
    if (!myUser?.canRename) return;
    if (!myRenamInput.trim()||myRenamInput.trim().length<2) return setMyRenamErr("Pseudo trop court.");
    const name = myRenamInput.trim();
    if (cur.find(u=>u.id!==me.id&&u.pseudo.toLowerCase()===name.toLowerCase()))
      return setMyRenamErr("Pseudo déjà pris !");
    const newU = cur.map(u=>u.id===me.id?{...u,pseudo:name,canRename:false}:u);
    const newM = marketsRef.current.map(m=>({
      ...m,
      creatorPseudo: m.creatorId===me.id ? name : m.creatorPseudo,
      bets: (m.bets||[]).map(b=>b.userId===me.id?{...b,pseudo:name}:b)
    }));
    saveU(newU); saveM(newM);
    setMe({...me,pseudo:name,canRename:false});
    setMyRenamReq(false); setMyRenamInput(""); setMyRenamErr("");
    showToast(`✅ Pseudo changé en "${name}" !`);
  };

  // ── PARTAGER ────────────────────────────────────────────────────
  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) navigator.share({title:"SchoolMarket 🏫",url});
    else navigator.clipboard.writeText(url).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);}).catch(()=>{});
  };

  // ── DÉRIVÉS ─────────────────────────────────────────────────────
  const visibleUsers = users.filter(u=>u.pseudo!==ADMIN_PSEUDO);
  const leaderboard  = visibleUsers.map(u=>{
    const s=computeStats(u.id,markets);
    const t=s.wins+s.losses;
    return{...u,...s,winRate:t>0?Math.round(s.wins/t*100):0,profit:u.wallet-1000};
  }).sort((a,b)=>b.wallet-a.wallet);

  const filtered = filter==="tous"?markets:markets.filter(m=>m.category===filter);
  const myBetOn  = mkt=>(mkt.bets||[]).find(b=>b.userId===me?.id);
  const myUserFresh = me ? usersRef.current.find(u=>u.id===me.id)||me : null;
  const pendingRenames = visibleUsers.filter(u=>u.renameRequest);

  if (!loaded) return (
    <div style={{minHeight:"100vh",background:"#0d0d0d",display:"flex",alignItems:"center",
      justifyContent:"center",fontFamily:"monospace",color:"#ffdc32",letterSpacing:4,fontSize:13}}>
      CHARGEMENT...
    </div>
  );

  // ════════════════════════════════════════════════════════════════
  return (
    <div style={{minHeight:"100vh",background:"#0d0d0d",fontFamily:"'Courier New',monospace",color:"#e8e0d0"}}>
      <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",
        backgroundImage:"linear-gradient(rgba(255,220,50,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,220,50,0.025) 1px,transparent 1px)",
        backgroundSize:"44px 44px"}}/>

      {toast && (
        <div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",
          background:toast.type==="err"?"#ef4444":"#ffdc32",color:"#0d0d0d",
          fontWeight:"bold",padding:"10px 22px",borderRadius:3,zIndex:9999,fontSize:13,whiteSpace:"nowrap",
          boxShadow:`0 4px 20px ${toast.type==="err"?"#ef444455":"#ffdc3255"}`}}>
          {toast.msg}
        </div>
      )}

      {/* ══ HEADER ══════════════════════════════════════════════ */}
      <header style={{position:"sticky",top:0,zIndex:100,background:"rgba(13,13,13,0.97)",
        borderBottom:`2px solid ${isAdmin?"#a855f7":"#ffdc32"}`,padding:"0 20px",
        display:"flex",alignItems:"center",justifyContent:"space-between",height:58,
        backdropFilter:"blur(12px)",gap:8}}>

        <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",flexShrink:0}}
          onClick={()=>setView("markets")}>
          <span style={{fontSize:22}}>🏫</span>
          <div>
            <div style={{fontSize:15,fontWeight:"bold",color:isAdmin?"#a855f7":"#ffdc32",letterSpacing:2}}>SCHOOLMARKET</div>
            <div style={{fontSize:7,color:"#444",letterSpacing:3}}>PARIS SCOLAIRES</div>
          </div>
        </div>

        <nav style={{display:"flex",gap:3}}>
          {[["markets","📊 Marchés"],["leaderboard","🏆 Classement"]].map(([v,lbl])=>(
            <button key={v} onClick={()=>setView(v)} style={{
              background:view===v?"#ffdc3215":"transparent",color:view===v?"#ffdc32":"#555",
              border:view===v?"1px solid #ffdc3230":"1px solid transparent",
              padding:"5px 10px",borderRadius:2,cursor:"pointer",
              fontSize:10,fontWeight:"bold",fontFamily:"inherit",letterSpacing:1}}>{lbl}</button>
          ))}
          {isAdmin && (
            <button onClick={()=>setView("admin")} style={{
              background:view==="admin"?"#a855f715":"transparent",
              color:view==="admin"?"#a855f7":"#555",
              border:view==="admin"?"1px solid #a855f730":"1px solid transparent",
              padding:"5px 10px",borderRadius:2,cursor:"pointer",
              fontSize:10,fontWeight:"bold",fontFamily:"inherit",letterSpacing:1}}>
              👑 ADMIN{pendingRenames.length>0?` (${pendingRenames.length})`:""}</button>
          )}
          <button onClick={()=>setShareOpen(true)} style={{background:"transparent",border:"1px solid #252525",
            color:"#555",padding:"5px 10px",borderRadius:2,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>🔗</button>
        </nav>

        <div style={{display:"flex",alignItems:"center",gap:7,flexShrink:0}}>
          {me ? (
            <>
              {!isAdmin && (
                <div style={{background:"#111",border:"1px solid #ffdc3240",padding:"5px 10px",
                  borderRadius:2,fontSize:11,color:"#ffdc32",fontWeight:"bold"}}>
                  💰 {me.wallet.toLocaleString()} SC
                </div>
              )}
              <div onClick={()=>{if(!isAdmin){setProfileUser(me);setView("profile");}}}
                style={{background:"#111",border:`1px solid ${isAdmin?"#a855f740":"#252525"}`,
                  padding:"5px 10px",borderRadius:2,fontSize:11,
                  cursor:isAdmin?"default":"pointer",display:"flex",alignItems:"center",gap:5}}>
                <span>{me.avatar}</span>
                <span style={{color:isAdmin?"#a855f7":"#ccc"}}>{me.pseudo}</span>
                {isAdmin&&<span style={{fontSize:8,color:"#a855f7",letterSpacing:2}}>ADMIN</span>}
                {myUserFresh?.canRename&&!isAdmin&&<span style={{fontSize:8,background:"#10b98120",color:"#10b981",padding:"1px 4px",borderRadius:2}}>✏️</span>}
              </div>
              <button onClick={()=>{setMe(null);setView("markets");showToast("À bientôt 👋");}}
                style={{background:"transparent",border:"1px solid #252525",color:"#555",
                  padding:"5px 8px",borderRadius:2,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>✕</button>
            </>
          ) : (
            <button onClick={()=>setView("auth")} style={{background:"#ffdc32",color:"#0d0d0d",
              border:"none",padding:"7px 14px",borderRadius:2,cursor:"pointer",
              fontWeight:"bold",fontSize:11,fontFamily:"inherit",letterSpacing:1}}>CONNEXION</button>
          )}
        </div>
      </header>

      {/* ══ AUTH ════════════════════════════════════════════════ */}
      {view==="auth" && (
        <div style={{maxWidth:420,margin:"40px auto",padding:20,position:"relative",zIndex:1}}>
          <div style={{background:"#111",border:"2px solid #ffdc32",borderRadius:4,padding:32}}>
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{fontSize:36,marginBottom:6}}>🏫</div>
              <div style={{fontSize:20,fontWeight:"bold",color:"#ffdc32",letterSpacing:2}}>SCHOOLMARKET</div>
            </div>
            <div style={{display:"flex",marginBottom:22,border:"1px solid #252525",borderRadius:2,overflow:"hidden"}}>
              {[["login","CONNEXION"],["register","INSCRIPTION"]].map(([m,lbl])=>(
                <button key={m} onClick={()=>{setAuthMode(m);setAuthErr("");}} style={{
                  flex:1,padding:"9px",border:"none",cursor:"pointer",
                  background:authMode===m?"#ffdc32":"#0d0d0d",color:authMode===m?"#0d0d0d":"#555",
                  fontWeight:"bold",fontSize:10,fontFamily:"inherit",letterSpacing:1}}>{lbl}</button>
              ))}
            </div>

            {authMode==="register" && (
              <Field label="TON AVATAR">
                <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                  {AVATARS.map(av=>(
                    <button key={av} onClick={()=>setAuthAvatar(av)} style={{
                      fontSize:20,background:authAvatar===av?"#ffdc3218":"transparent",
                      border:authAvatar===av?"2px solid #ffdc32":"2px solid transparent",
                      borderRadius:4,padding:4,cursor:"pointer"}}>{av}</button>
                  ))}
                </div>
              </Field>
            )}

            <Field label="PSEUDO">
              <input value={authPseudo} onChange={e=>setAuthPseudo(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&(authMode==="login"?handleLogin():handleRegister())}
                placeholder="Ton pseudo..."
                style={S.input(!!authErr)}
                onFocus={e=>e.target.style.borderColor="#ffdc32"}
                onBlur={e=>e.target.style.borderColor="#2a2a2a"}/>
            </Field>

            <Field label="MOT DE PASSE" err={authErr}>
              <PwInput value={authPw} onChange={e=>setAuthPw(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&(authMode==="login"?handleLogin():null)}
                err={!!authErr}
                placeholder={authMode==="login"?"Ton mot de passe...":"Choisis un mot de passe..."}/>
            </Field>

            {authMode==="register" && (
              <Field label="CONFIRMER LE MOT DE PASSE">
                <PwInput value={authPw2} onChange={e=>setAuthPw2(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&handleRegister()}
                  placeholder="Répète ton mot de passe..."/>
              </Field>
            )}

            <button onClick={authMode==="login"?handleLogin:handleRegister}
              style={{...S.btn(), marginTop:4}}>
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

      {/* ══ PROFIL ══════════════════════════════════════════════ */}
      {view==="profile"&&profileUser&&(()=>{
        const u=leaderboard.find(x=>x.id===profileUser.id)||{...profileUser,...computeStats(profileUser.id,markets),winRate:0,profit:profileUser.wallet-1000};
        const myBets=markets.flatMap(m=>(m.bets||[]).filter(b=>b.userId===u.id).map(b=>({...b,market:m})));
        const tot=u.wins+u.losses;
        const wr=tot>0?Math.round(u.wins/tot*100):0;
        const prf=u.wallet-1000;
        const isMe=me?.id===u.id;
        const freshU=usersRef.current.find(x=>x.id===u.id)||u;
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
                  JOUEUR{isMe&&<span style={{marginLeft:8,color:"#ffdc32"}}>● TOI</span>}
                  {u.banned&&<span style={{marginLeft:8,color:"#ef4444"}}>● BANNI</span>}
                </div>
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

            {/* Changement pseudo si autorisé */}
            {isMe && freshU.canRename && (
              <div style={{background:"#0f1a12",border:"1px solid #10b98140",borderRadius:4,padding:16,marginBottom:14}}>
                <div style={{fontSize:10,color:"#10b981",fontWeight:"bold",marginBottom:8}}>
                  ✅ L'admin a autorisé un changement de pseudo !
                </div>
                {myRenamReq ? (
                  <>
                    <input value={myRenamInput} onChange={e=>setMyRenamInput(e.target.value)}
                      placeholder="Nouveau pseudo..." onKeyDown={e=>e.key==="Enter"&&applyRename()}
                      style={{...S.input(!!myRenamErr),marginBottom:8}}
                      onFocus={e=>e.target.style.borderColor="#10b981"}
                      onBlur={e=>e.target.style.borderColor="#2a2a2a"}/>
                    {myRenamErr&&<div style={{fontSize:11,color:"#ef4444",marginBottom:8}}>⚠ {myRenamErr}</div>}
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={applyRename} style={{...S.btn("#10b981","#fff",{flex:1})}}>✅ VALIDER</button>
                      <button onClick={()=>{setMyRenamReq(false);setMyRenamInput("");}} style={{...S.btn("transparent","#555",{flex:1,border:"1px solid #252525"})}}>Annuler</button>
                    </div>
                  </>
                ) : (
                  <button onClick={()=>setMyRenamReq(true)} style={{...S.btn("#10b981","#fff")}}>✏️ CHANGER MON PSEUDO</button>
                )}
              </div>
            )}

            {/* Demande changement pseudo */}
            {isMe && !freshU.canRename && !freshU.renameRequest && (
              <div style={{marginBottom:14}}>
                {myRenamReq ? (
                  <div style={{background:"#0f0f0f",border:"1px solid #1a1a1a",borderRadius:4,padding:16}}>
                    <div style={{fontSize:10,color:"#444",marginBottom:8}}>Nouveau pseudo souhaité :</div>
                    <input value={myRenamInput} onChange={e=>setMyRenamInput(e.target.value)}
                      placeholder="Pseudo souhaité..." onKeyDown={e=>e.key==="Enter"&&requestRename()}
                      style={{...S.input(!!myRenamErr),marginBottom:8}}
                      onFocus={e=>e.target.style.borderColor="#ffdc32"}
                      onBlur={e=>e.target.style.borderColor="#2a2a2a"}/>
                    {myRenamErr&&<div style={{fontSize:11,color:"#ef4444",marginBottom:8}}>⚠ {myRenamErr}</div>}
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={requestRename} style={{...S.btn(undefined,undefined,{flex:1})}}>📨 ENVOYER</button>
                      <button onClick={()=>{setMyRenamReq(false);setMyRenamInput("");}} style={{...S.btn("transparent","#555",{flex:1,border:"1px solid #252525"})}}>Annuler</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={()=>setMyRenamReq(true)} style={{...S.btn("transparent","#555",{border:"1px solid #252525",fontSize:10})}}>
                    ✏️ Demander un changement de pseudo
                  </button>
                )}
              </div>
            )}

            {isMe && freshU.renameRequest && (
              <div style={{background:"#0f0f10",border:"1px solid #f59e0b30",borderRadius:4,padding:14,marginBottom:14,
                fontSize:11,color:"#f59e0b"}}>
                ⏳ Demande de changement de pseudo en attente d'approbation admin : <strong>"{freshU.renameRequest}"</strong>
              </div>
            )}

            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
              {[{lbl:"VICTOIRES",v:u.wins,c:"#10b981"},{lbl:"DÉFAITES",v:u.losses,c:"#ef4444"},
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
                <span>👥 {visibleUsers.length} joueur{visibleUsers.length>1?"s":""}</span>
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
            {me && !me.banned && (
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
                Aucun marché — crée le premier !
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
              {filtered.map(mkt=>{
                const odds   = computeOdds(mkt);
                const myBet  = myBetOn(mkt);
                const col    = CAT_COLOR[mkt.category]||"#888";
                const isOwn  = mkt.creatorId===me?.id && !isAdmin;
                // Admin peut parier sur tous les marchés sauf ses propres (créés en tant qu'admin)
                const adminOwn = isAdmin && mkt.creatorId===me?.id;
                const canBet = !mkt.resolved && !myBet && me && !isOwn && !adminOwn && !me.banned;
                return (
                  <div key={mkt.id} style={{background:"#0f0f0f",
                    border:myBet?`2px solid ${col}`:"1px solid #1a1a1a",
                    borderRadius:4,padding:16,position:"relative",overflow:"hidden",
                    cursor:canBet?"pointer":"default",opacity:mkt.resolved?0.65:1,transition:"border-color 0.15s"}}
                    onMouseEnter={e=>{if(canBet)e.currentTarget.style.borderColor="#ffdc32";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=myBet?col:"#1a1a1a";}}
                    onClick={()=>{
                      if(!canBet) return;
                      if(!me){setView("auth");return;}
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
                          borderRadius:2,cursor:"pointer",fontSize:9,fontFamily:"inherit",fontWeight:"bold",letterSpacing:1}}>
                        🗑 SUPPRIMER CE MARCHÉ</button>
                    )}
                    {isAdmin&&!mkt.resolved&&(
                      <button onClick={e=>{e.stopPropagation();setResolveModal(mkt);}}
                        style={{marginTop:8,width:"100%",background:"#a855f715",
                          border:"1px solid #a855f730",color:"#a855f7",padding:"6px",
                          borderRadius:2,cursor:"pointer",fontSize:9,fontFamily:"inherit",fontWeight:"bold",letterSpacing:1}}>
                        👑 CLÔTURER CE MARCHÉ</button>
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
              Aucun joueur inscrit.
              <button onClick={()=>setView("auth")} style={{marginTop:12,display:"block",margin:"12px auto 0",
                background:"#ffdc32",color:"#0d0d0d",border:"none",padding:"8px 18px",
                borderRadius:2,cursor:"pointer",fontWeight:"bold",fontSize:11,fontFamily:"inherit"}}>S'inscrire →</button>
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
                        display:"flex",flexDirection:"column",justifyContent:"flex-end",cursor:"pointer",
                        transition:"border-color 0.15s"}}
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
                      borderLeft:isMe?"3px solid #ffdc32":"3px solid transparent",cursor:"pointer"}}
                      onMouseEnter={e=>e.currentTarget.style.background="#ffffff06"}
                      onMouseLeave={e=>e.currentTarget.style.background=isMe?"#ffdc3206":"transparent"}
                      onClick={()=>{setProfileUser(u);setView("profile");}}>
                      <div style={{fontSize:12,fontWeight:"bold",color:rc[i]||"#444"}}>
                        {i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}</div>
                      <div style={{display:"flex",alignItems:"center",gap:7}}>
                        <span style={{fontSize:16}}>{u.avatar}</span>
                        <span style={{fontSize:12,color:isMe?"#ffdc32":"#ccc",fontWeight:isMe?"bold":"normal"}}>
                          {u.pseudo}{isMe?" (toi)":""}
                          {u.banned&&<span style={{marginLeft:6,fontSize:8,color:"#ef4444"}}>BANNI</span>}
                        </span>
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

      {/* ══ ADMIN PANEL ═════════════════════════════════════════ */}
      {view==="admin" && isAdmin && (
        <div style={{maxWidth:1000,margin:"0 auto",padding:"28px 20px",position:"relative",zIndex:1}}>
          <div style={{marginBottom:24}}>
            <div style={{fontSize:8,color:"#a855f7",letterSpacing:4,marginBottom:5}}>PANNEAU ADMINISTRATEUR</div>
            <div style={{fontSize:24,fontWeight:"bold"}}>👑 Admin Panel</div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:20}}>
            {[
              {lbl:"MARCHÉS ACTIFS",v:markets.filter(m=>!m.resolved).length,c:"#ffdc32"},
              {lbl:"MARCHÉS RÉSOLUS",v:markets.filter(m=>m.resolved).length,c:"#10b981"},
              {lbl:"JOUEURS",v:visibleUsers.length,c:"#3b82f6"},
              {lbl:"DEMANDES PSEUDO",v:pendingRenames.length,c:pendingRenames.length>0?"#f59e0b":"#444"},
            ].map(s=>(
              <div key={s.lbl} style={{background:"#0f0f0f",border:`1px solid ${s.c}22`,borderRadius:4,padding:"14px 12px",textAlign:"center"}}>
                <div style={{fontSize:8,color:"#444",letterSpacing:2,marginBottom:6}}>{s.lbl}</div>
                <div style={{fontSize:22,fontWeight:"bold",color:s.c}}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Demandes de changement pseudo */}
          {pendingRenames.length>0 && (
            <div style={{background:"#1a1000",border:"1px solid #f59e0b30",borderRadius:4,padding:16,marginBottom:20}}>
              <div style={{fontSize:9,color:"#f59e0b",letterSpacing:2,fontWeight:"bold",marginBottom:12}}>
                ⏳ DEMANDES DE CHANGEMENT DE PSEUDO ({pendingRenames.length})
              </div>
              {pendingRenames.map(u=>(
                <div key={u.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",
                  borderBottom:"1px solid #f59e0b15",flexWrap:"wrap"}}>
                  <span style={{fontSize:20}}>{u.avatar}</span>
                  <div style={{flex:1}}>
                    <span style={{fontSize:12,fontWeight:"bold"}}>{u.pseudo}</span>
                    <span style={{fontSize:11,color:"#444",margin:"0 8px"}}>→</span>
                    <span style={{fontSize:12,color:"#f59e0b",fontWeight:"bold"}}>"{u.renameRequest}"</span>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>{setRenamModal(u);setRenamInput(u.renameRequest||"");}} style={{
                      background:"#a855f720",border:"1px solid #a855f740",color:"#a855f7",
                      padding:"6px 12px",borderRadius:2,cursor:"pointer",fontWeight:"bold",fontSize:9,fontFamily:"inherit"}}>
                      ✏️ RENOMMER
                    </button>
                    <button onClick={()=>adminAllowRename(u.id)} style={{
                      background:"#10b98120",border:"1px solid #10b98130",color:"#10b981",
                      padding:"6px 12px",borderRadius:2,cursor:"pointer",fontWeight:"bold",fontSize:9,fontFamily:"inherit"}}>
                      ✅ AUTORISER
                    </button>
                    <button onClick={()=>adminDenyRename(u.id)} style={{
                      background:"#ef444415",border:"1px solid #ef444430",color:"#ef4444",
                      padding:"6px 12px",borderRadius:2,cursor:"pointer",fontWeight:"bold",fontSize:9,fontFamily:"inherit"}}>
                      ❌ REFUSER
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{display:"flex",gap:4,marginBottom:16,borderBottom:"1px solid #1a1a1a",paddingBottom:8}}>
            {[["markets","📊 Marchés"],["users","👥 Utilisateurs"]].map(([t,lbl])=>(
              <button key={t} onClick={()=>setAdminTab(t)} style={{
                background:adminTab===t?"#a855f720":"transparent",color:adminTab===t?"#a855f7":"#555",
                border:adminTab===t?"1px solid #a855f740":"1px solid transparent",
                padding:"7px 16px",borderRadius:2,cursor:"pointer",fontWeight:"bold",fontSize:11,fontFamily:"inherit",letterSpacing:1}}>
                {lbl}
              </button>
            ))}
          </div>

          {adminTab==="markets" && (
            <div>
              {markets.filter(m=>!m.resolved).length===0 && (
                <div style={{textAlign:"center",color:"#333",padding:"40px",fontSize:13}}>Aucun marché actif.</div>
              )}
              {markets.filter(m=>!m.resolved).map(mkt=>{
                const odds=computeOdds(mkt);
                return (
                  <div key={mkt.id} style={{background:"#0f0f0f",border:"1px solid #1a1a1a",
                    borderRadius:4,padding:16,marginBottom:8,display:"flex",gap:14,alignItems:"center",flexWrap:"wrap"}}>
                    <span style={{fontSize:22,flexShrink:0}}>{mkt.emoji}</span>
                    <div style={{flex:1,minWidth:200}}>
                      <div style={{fontSize:13,fontWeight:"bold",marginBottom:3}}>{mkt.title}</div>
                      <div style={{fontSize:9,color:"#444"}}>
                        par {mkt.creatorPseudo} · {(mkt.bets||[]).length} paris · {odds.total} SC
                      </div>
                      <div style={{fontSize:9,marginTop:3}}>
                        <span style={{color:"#10b981"}}>OUI {odds.yesPct}%</span>{" · "}
                        <span style={{color:"#ef4444"}}>NON {odds.noPct}%</span>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6,flexShrink:0}}>
                      <button onClick={()=>setResolveModal(mkt)} style={{
                        background:"#a855f720",border:"1px solid #a855f740",color:"#a855f7",
                        padding:"7px 14px",borderRadius:2,cursor:"pointer",fontWeight:"bold",fontSize:10,fontFamily:"inherit"}}>
                        👑 CLÔTURER
                      </button>
                      <button onClick={()=>setDelConfirm({type:"market",market:mkt})} style={{
                        background:"#ef444415",border:"1px solid #ef444430",color:"#ef4444",
                        padding:"7px 14px",borderRadius:2,cursor:"pointer",fontWeight:"bold",fontSize:10,fontFamily:"inherit"}}>
                        🗑 SUPPRIMER
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {adminTab==="users" && (
            <div>
              {visibleUsers.map(u=>{
                const s=computeStats(u.id,markets);
                return (
                  <div key={u.id} style={{background:"#0f0f0f",
                    border:`1px solid ${u.banned?"#ef444430":"#1a1a1a"}`,
                    borderRadius:4,padding:14,marginBottom:8,
                    display:"flex",gap:12,alignItems:"center",flexWrap:"wrap",opacity:u.banned?0.6:1}}>
                    <span style={{fontSize:24,flexShrink:0}}>{u.avatar}</span>
                    <div style={{flex:1,minWidth:150}}>
                      <div style={{fontSize:13,fontWeight:"bold",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        {u.pseudo}
                        {u.banned&&<span style={{fontSize:8,background:"#ef444420",color:"#ef4444",padding:"2px 6px",borderRadius:2}}>BANNI</span>}
                        {u.renameRequest&&<span style={{fontSize:8,background:"#f59e0b20",color:"#f59e0b",padding:"2px 6px",borderRadius:2}}>DEMANDE PSEUDO</span>}
                        {u.canRename&&<span style={{fontSize:8,background:"#10b98120",color:"#10b981",padding:"2px 6px",borderRadius:2}}>RENOMMAGE OK</span>}
                      </div>
                      <div style={{fontSize:10,color:"#ffdc32",fontWeight:"bold",marginTop:2}}>💰 {u.wallet.toLocaleString()} SC</div>
                      <div style={{fontSize:9,color:"#444",marginTop:1}}>{s.wins}V {s.losses}D</div>
                    </div>
                    <div style={{display:"flex",gap:6,flexShrink:0,flexWrap:"wrap"}}>
                      <button onClick={()=>{setRenamModal(u);setRenamInput(u.pseudo);}} style={{
                        background:"#a855f715",border:"1px solid #a855f730",color:"#a855f7",
                        padding:"6px 10px",borderRadius:2,cursor:"pointer",fontWeight:"bold",fontSize:9,fontFamily:"inherit"}}>
                        ✏️ PSEUDO
                      </button>
                      <button onClick={()=>{setWalletModal(u);setWalletAmt("");}} style={{
                        background:"#ffdc3215",border:"1px solid #ffdc3230",color:"#ffdc32",
                        padding:"6px 10px",borderRadius:2,cursor:"pointer",fontWeight:"bold",fontSize:9,fontFamily:"inherit"}}>
                        💰 WALLET
                      </button>
                      <button onClick={()=>setBanConfirm({user:u,ban:!u.banned})} style={{
                        background:u.banned?"#10b98115":"#ef444415",
                        border:`1px solid ${u.banned?"#10b98130":"#ef444430"}`,
                        color:u.banned?"#10b981":"#ef4444",
                        padding:"6px 10px",borderRadius:2,cursor:"pointer",fontWeight:"bold",fontSize:9,fontFamily:"inherit"}}>
                        {u.banned?"✅ DÉBANNIR":"🚫 BANNIR"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ MODAL MDP ADMIN ═════════════════════════════════════ */}
      {adminPwModal && (
        <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,0.95)",
          backdropFilter:"blur(10px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#111",border:"2px solid #a855f7",borderRadius:4,padding:28,maxWidth:360,width:"100%"}}>
            <div style={{fontSize:32,marginBottom:8,textAlign:"center"}}>👑</div>
            <div style={{fontSize:16,fontWeight:"bold",color:"#a855f7",marginBottom:4,textAlign:"center"}}>Accès Administrateur</div>
            <div style={{fontSize:10,color:"#444",marginBottom:20,textAlign:"center",letterSpacing:1}}>JULES-ADMIN</div>
            <PwInput value={adminPwInput} onChange={e=>setAdminPwInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleAdminLogin()} err={!!adminPwErr}
              placeholder="Mot de passe admin..."/>
            {adminPwErr&&<div style={{fontSize:11,color:"#ef4444",marginTop:8,marginBottom:8}}>⚠ {adminPwErr}</div>}
            <div style={{marginTop:12,display:"flex",gap:8}}>
              <button onClick={handleAdminLogin} style={{...S.btn("#a855f7","#fff",{flex:1})}}>→ CONNEXION ADMIN</button>
              <button onClick={()=>{setAdminPwModal(false);setAdminPwInput("");setAdminPwErr("");}}
                style={{...S.btn("transparent","#555",{flex:1,border:"1px solid #252525"})}}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL CLÔTURER ══════════════════════════════════════ */}
      {resolveModal && (
        <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,0.95)",
          backdropFilter:"blur(10px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={()=>setResolveModal(null)}>
          <div style={{background:"#111",border:"2px solid #a855f7",borderRadius:4,padding:28,maxWidth:420,width:"100%"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:28,marginBottom:8}}>👑</div>
            <div style={{fontSize:16,fontWeight:"bold",color:"#a855f7",marginBottom:4}}>Clôturer ce marché</div>
            <div style={{fontSize:13,color:"#888",marginBottom:16,fontStyle:"italic"}}>« {resolveModal.title} »</div>
            {(()=>{const o=computeOdds(resolveModal); return (
              <div style={{padding:"10px 12px",background:"#0d0d0d",borderRadius:2,
                border:"1px solid #1a1a1a",marginBottom:20,fontSize:10,color:"#555",lineHeight:1.8}}>
                <div><span style={{color:"#10b981"}}>✅ OUI</span> · {o.yesTotal} SC · {o.yesPct}%</div>
                <div><span style={{color:"#ef4444"}}>❌ NON</span> · {o.noTotal} SC · {o.noPct}%</div>
                <div style={{marginTop:4,color:"#444"}}>Les gagnants récupèrent leur mise + leur part des pertes.</div>
              </div>
            );})()}
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>adminResolve(resolveModal.id,"yes")} style={{flex:1,background:"#10b98120",
                border:"2px solid #10b981",color:"#10b981",padding:"14px",borderRadius:2,
                cursor:"pointer",fontWeight:"bold",fontSize:14,fontFamily:"inherit"}}>✅ OUI GAGNE</button>
              <button onClick={()=>adminResolve(resolveModal.id,"no")} style={{flex:1,background:"#ef444420",
                border:"2px solid #ef4444",color:"#ef4444",padding:"14px",borderRadius:2,
                cursor:"pointer",fontWeight:"bold",fontSize:14,fontFamily:"inherit"}}>❌ NON GAGNE</button>
            </div>
            <button onClick={()=>setResolveModal(null)} style={{...S.btn("transparent","#333",{marginTop:8,border:"1px solid #1a1a1a",fontSize:11})}}>Annuler</button>
          </div>
        </div>
      )}

      {/* ══ MODAL RENOMMER (admin) ═══════════════════════════════ */}
      {renamModal && (
        <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,0.95)",
          backdropFilter:"blur(10px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={()=>{setRenamModal(null);setRenamInput("");setRenamErr("");}}>
          <div style={{background:"#111",border:"2px solid #a855f7",borderRadius:4,padding:28,maxWidth:380,width:"100%"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:28,marginBottom:8}}>✏️</div>
            <div style={{fontSize:16,fontWeight:"bold",color:"#a855f7",marginBottom:4}}>Changer le pseudo</div>
            <div style={{fontSize:13,color:"#888",marginBottom:20}}>{renamModal.avatar} {renamModal.pseudo}</div>
            <Field label="NOUVEAU PSEUDO" err={renamErr}>
              <input value={renamInput} onChange={e=>setRenamInput(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&adminRename(renamModal.id)}
                placeholder="Nouveau pseudo..." style={S.input(!!renamErr)}
                onFocus={e=>e.target.style.borderColor="#a855f7"}
                onBlur={e=>e.target.style.borderColor="#2a2a2a"}/>
            </Field>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{setRenamModal(null);setRenamInput("");setRenamErr("");}}
                style={{...S.btn("transparent","#555",{flex:1,border:"1px solid #252525"})}}>Annuler</button>
              <button onClick={()=>adminRename(renamModal.id)}
                style={{...S.btn("#a855f7","#fff",{flex:1})}}>✅ VALIDER</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL WALLET (admin) ════════════════════════════════ */}
      {walletModal && (
        <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,0.95)",
          backdropFilter:"blur(10px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={()=>setWalletModal(null)}>
          <div style={{background:"#111",border:"2px solid #ffdc32",borderRadius:4,padding:28,maxWidth:380,width:"100%"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:28,marginBottom:8}}>💰</div>
            <div style={{fontSize:16,fontWeight:"bold",color:"#ffdc32",marginBottom:4}}>Modifier le wallet</div>
            <div style={{fontSize:13,color:"#888",marginBottom:4}}>{walletModal.avatar} {walletModal.pseudo}</div>
            <div style={{fontSize:13,color:"#ffdc32",fontWeight:"bold",marginBottom:16}}>
              Solde : {walletModal.wallet.toLocaleString()} SC</div>
            <Field label="MONTANT (SC)">
              <input type="number" min={1} value={walletAmt} onChange={e=>setWalletAmt(e.target.value)}
                placeholder="Ex: 500" style={S.input()}
                onFocus={e=>e.target.style.borderColor="#ffdc32"}
                onBlur={e=>e.target.style.borderColor="#2a2a2a"}/>
            </Field>
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <button onClick={()=>adminEditWallet(walletModal.id,"add")} style={{flex:1,background:"#10b98120",
                border:"2px solid #10b981",color:"#10b981",padding:"12px",borderRadius:2,
                cursor:"pointer",fontWeight:"bold",fontSize:12,fontFamily:"inherit"}}>+ AJOUTER</button>
              <button onClick={()=>adminEditWallet(walletModal.id,"remove")} style={{flex:1,background:"#ef444420",
                border:"2px solid #ef4444",color:"#ef4444",padding:"12px",borderRadius:2,
                cursor:"pointer",fontWeight:"bold",fontSize:12,fontFamily:"inherit"}}>− RETIRER</button>
            </div>
            <button onClick={()=>setWalletModal(null)} style={{...S.btn("transparent","#333",{border:"1px solid #1a1a1a",fontSize:11})}}>Annuler</button>
          </div>
        </div>
      )}

      {/* ══ MODAL BAN (admin) ═══════════════════════════════════ */}
      {banConfirm && (
        <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,0.95)",
          backdropFilter:"blur(10px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={()=>setBanConfirm(null)}>
          <div style={{background:"#111",border:"2px solid #ef4444",borderRadius:4,padding:28,maxWidth:380,width:"100%"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:28,marginBottom:8}}>{banConfirm.ban?"🚫":"✅"}</div>
            <div style={{fontSize:16,fontWeight:"bold",marginBottom:8}}>
              {banConfirm.ban?"Bannir cet utilisateur ?":"Débannir cet utilisateur ?"}</div>
            <div style={{fontSize:13,color:"#888",marginBottom:20}}>{banConfirm.user.avatar} {banConfirm.user.pseudo}</div>
            {banConfirm.ban && (
              <div style={{fontSize:11,color:"#555",marginBottom:20,padding:"10px 12px",
                background:"#1a1a1a",borderRadius:2,border:"1px solid #252525",lineHeight:1.6}}>
                ⚠️ Ses marchés actifs seront supprimés et les parieurs remboursés. Il ne pourra plus se connecter.
              </div>
            )}
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setBanConfirm(null)} style={{...S.btn("transparent","#555",{flex:1,border:"1px solid #252525"})}}>← ANNULER</button>
              <button onClick={()=>adminBan(banConfirm.user.id,banConfirm.ban)} style={{flex:1,
                background:banConfirm.ban?"#ef4444":"#10b981",color:"#fff",border:"none",
                padding:"12px",borderRadius:2,cursor:"pointer",fontFamily:"inherit",fontWeight:"bold",fontSize:12}}>
                {banConfirm.ban?"🚫 OUI, BANNIR":"✅ OUI, DÉBANNIR"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL PARIER ════════════════════════════════════════ */}
      {betModal && (
        <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.92)",
          backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={()=>setBetModal(null)}>
          <div style={{background:"#111",border:"2px solid #ffdc32",borderRadius:4,padding:26,maxWidth:420,width:"100%"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:26,marginBottom:8}}>{betModal.emoji}</div>
            <div style={{fontSize:15,fontWeight:"bold",marginBottom:18,lineHeight:1.4}}>{betModal.title}</div>
            {(()=>{const o=computeOdds(betModal); return o.total>0 ? (
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
            );})()}
            <div style={{fontSize:9,color:"#444",letterSpacing:2,marginBottom:8}}>TON CHOIX</div>
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              {[["yes","✅ OUI","#10b981"],["no","❌ NON","#ef4444"]].map(([s,lbl,c])=>(
                <button key={s} onClick={()=>setBetSide(s)} style={{flex:1,padding:"11px",
                  border:betSide===s?`2px solid ${c}`:"1px solid #252525",
                  background:betSide===s?`${c}18`:"#0d0d0d",color:betSide===s?c:"#555",
                  borderRadius:2,cursor:"pointer",fontWeight:"bold",fontSize:14,fontFamily:"inherit"}}>{lbl}</button>
              ))}
            </div>
            <div style={{fontSize:9,color:"#444",letterSpacing:2,marginBottom:8}}>MISE (SC)</div>
            <div style={{display:"flex",gap:6,marginBottom:5}}>
              <input type="number" min={10} value={betAmount} onChange={e=>setBetAmount(e.target.value)}
                style={{flex:1,background:"#0d0d0d",border:"1px solid #252525",color:"#e8e0d0",
                  padding:"9px 12px",borderRadius:2,fontSize:17,fontWeight:"bold",fontFamily:"inherit",outline:"none"}}/>
              {[25,50,100,250].map(v=>(
                <button key={v} onClick={()=>setBetAmount(v)} style={{background:"#0d0d0d",border:"1px solid #252525",
                  color:"#555",padding:"0 8px",borderRadius:2,cursor:"pointer",fontSize:10,fontFamily:"inherit",flexShrink:0}}>{v}</button>
              ))}
            </div>
            {!isAdmin && <div style={{fontSize:9,color:"#333",marginBottom:16}}>Solde : {me?.wallet?.toLocaleString()} SC</div>}
            {isAdmin && <div style={{fontSize:9,color:"#a855f7",marginBottom:16}}>Solde admin : {me?.wallet?.toLocaleString()} SC 👑</div>}
            <button onClick={placeBet} disabled={!betSide} style={{...S.btn(
              betSide?"#ffdc32":"#1a1a1a", betSide?"#0d0d0d":"#444",
              {cursor:betSide?"pointer":"not-allowed"})}}>
              {betSide?`→ MISER ${betAmount} SC sur "${betSide==="yes"?"OUI":"NON"}`:"Choisis OUI ou NON d'abord"}
            </button>
            <button onClick={()=>setBetModal(null)} style={{...S.btn("transparent","#333",{marginTop:8,border:"1px solid #1a1a1a",fontSize:11})}}>Annuler</button>
          </div>
        </div>
      )}

      {/* ══ MODAL CRÉER ═════════════════════════════════════════ */}
      {createOpen && me && (
        <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.92)",
          backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={()=>setCreateOpen(false)}>
          <div style={{background:"#111",border:"2px solid #ffdc32",borderRadius:4,padding:26,maxWidth:400,width:"100%"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:17,fontWeight:"bold",color:"#ffdc32",marginBottom:3}}>Créer un marché</div>
            <div style={{fontSize:9,color:"#444",marginBottom:20,letterSpacing:1}}>
              {markets.filter(m=>m.creatorId===me.id&&!m.resolved).length}/5 marchés actifs</div>
            <Field label="EMOJI">
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {EMOJIS.map(e=>(
                  <button key={e} onClick={()=>setDraft(d=>({...d,emoji:e}))} style={{
                    fontSize:18,background:draft.emoji===e?"#ffdc3215":"transparent",
                    border:draft.emoji===e?"2px solid #ffdc32":"2px solid transparent",
                    borderRadius:4,padding:4,cursor:"pointer"}}>{e}</button>
                ))}
              </div>
            </Field>
            <Field label="QUESTION" err={draftErr}>
              <input value={draft.title} onChange={e=>setDraft(d=>({...d,title:e.target.value}))}
                onKeyDown={e=>e.key==="Enter"&&createMarket()}
                placeholder="Ex: M. Dupont sera absent lundi ?" style={S.input(!!draftErr)}
                onFocus={e=>e.target.style.borderColor="#ffdc32"}
                onBlur={e=>e.target.style.borderColor="#2a2a2a"}/>
            </Field>
            <Field label="CATÉGORIE">
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {["profs","eleves","cours","vie scolaire"].map(cat=>(
                  <button key={cat} onClick={()=>setDraft(d=>({...d,category:cat}))} style={{
                    background:draft.category===cat?CAT_COLOR[cat]:"transparent",
                    color:draft.category===cat?"#fff":"#555",border:`1px solid ${CAT_COLOR[cat]}`,
                    padding:"5px 10px",borderRadius:2,cursor:"pointer",
                    fontSize:9,fontWeight:"bold",fontFamily:"inherit",letterSpacing:1,textTransform:"uppercase"}}>{cat}</button>
                ))}
              </div>
            </Field>
            <button onClick={createMarket} style={S.btn()}>🚀 PUBLIER</button>
          </div>
        </div>
      )}

      {/* ══ MODAL SUPPRESSION ═══════════════════════════════════ */}
      {delConfirm && (
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
                  padding:"10px 12px",background:"#1a1a1a",borderRadius:2}}>
                  ⚠️ Les {(delConfirm.market.bets||[]).length} paris seront remboursés.</div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setDelConfirm(null)} style={{...S.btn("transparent","#555",{flex:1,border:"1px solid #252525"})}}>← ANNULER</button>
                  <button onClick={()=>deleteMarket(delConfirm.market.id)} style={{...S.btn("#ef4444","#fff",{flex:1})}}>🗑 SUPPRIMER</button>
                </div>
              </>
            ) : (
              <>
                <div style={{fontSize:28,marginBottom:10}}>↩</div>
                <div style={{fontSize:16,fontWeight:"bold",marginBottom:8}}>Retirer ton pari ?</div>
                <div style={{fontSize:13,color:"#888",marginBottom:12,fontStyle:"italic"}}>« {delConfirm.market.title} »</div>
                {(()=>{
                  const b=(delConfirm.market.bets||[]).find(x=>x.userId===me?.id);
                  const penalty = b ? Math.floor(b.amount*0.5) : 0;
                  const refund  = b ? b.amount - penalty : 0;
                  return (
                    <div style={{marginBottom:22,padding:"12px 14px",background:"#1a1a1a",borderRadius:2,border:"1px solid #252525",lineHeight:2}}>
                      <div style={{fontSize:11,color:"#555"}}>Mise initiale : <span style={{color:"#e8e0d0",fontWeight:"bold"}}>{b?.amount} SC</span></div>
                      <div style={{fontSize:11,color:"#10b981"}}>✅ Remboursé : <span style={{fontWeight:"bold"}}>{refund} SC</span></div>
                      <div style={{fontSize:11,color:"#ef4444"}}>🔥 Pénalité (50%) : <span style={{fontWeight:"bold"}}>−{penalty} SC → cagnotte</span></div>
                      <div style={{fontSize:10,color:"#444",marginTop:4}}>La pénalité est distribuée aux gagnants à la clôture.</div>
                    </div>
                  );
                })()}
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setDelConfirm(null)} style={{...S.btn("transparent","#555",{flex:1,border:"1px solid #252525"})}}>← GARDER</button>
                  <button onClick={()=>deleteBet(delConfirm.market.id)} style={{...S.btn("#ef4444","#fff",{flex:1})}}>↩ RETIRER (−50%)</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══ MODAL PARTAGER ══════════════════════════════════════ */}
      {shareOpen && (
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
                fontWeight:"bold",fontSize:11,fontFamily:"inherit",flexShrink:0}}>
                {copied?"✓ COPIÉ !":"📋 COPIER"}</button>
            </div>
            <button onClick={handleShare} style={S.btn()}>📤 PARTAGER</button>
            <button onClick={()=>setShareOpen(false)} style={{...S.btn("transparent","#333",{marginTop:8,border:"1px solid #1a1a1a",fontSize:11})}}>Fermer</button>
          </div>
        </div>
      )}

      <style>{`*{box-sizing:border-box;margin:0;padding:0;} input::-webkit-outer-spin-button,input::-webkit-inner-spin-button{-webkit-appearance:none;} ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-track{background:#0d0d0d} ::-webkit-scrollbar-thumb{background:#252525}`}</style>
    </div>
  );
}
