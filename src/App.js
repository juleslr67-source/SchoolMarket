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
const CAT_COLOR = { profs:"#f59e0b", eleves:"#ef4444", cours:"#3b82f6", "vie scolaire":"#10b981", "hors les murs":"#ec4899" };
const EMOJIS    = ["🎲","🕐","⚠️","📚","😱","🍟","📢","🎉","💀","🏃","🤡","😴","🎓","📝","🏆","😤","🤔","💥","🫠","🤝"];

const RARITY_COLOR = { commun:"#888", rare:"#3b82f6", épique:"#a855f7", légendaire:"#ffd700" };

const MILESTONES = [
  { threshold:2000,  id:"mile_2k",   name:"🥈 Investisseur",       desc:"A atteint 2 000 SC",   color:"#94a3b8" },
  { threshold:5000,  id:"mile_5k",   name:"💎 Riche",               desc:"A atteint 5 000 SC",   color:"#22d3ee" },
  { threshold:10000, id:"mile_10k",  name:"🐺 Loup de Wall Street", desc:"A atteint 10 000 SC",  color:"#ffd700" },
  { threshold:25000, id:"mile_25k",  name:"🌟 Légende",             desc:"A atteint 25 000 SC",  color:"#a855f7" },
];

const SHOP_ITEMS = [
  // Couleurs de pseudo
  { id:"color_red",    type:"pseudoColor", name:"Pseudo Écarlate",  desc:"Ton pseudo en rouge",        price:150,  icon:"🔴", color:"#ef4444", rarity:"commun" },
  { id:"color_cyan",   type:"pseudoColor", name:"Pseudo Cyan",      desc:"Ton pseudo en bleu électrique", price:150, icon:"🔵", color:"#22d3ee", rarity:"commun" },
  { id:"color_green",  type:"pseudoColor", name:"Pseudo Vert Néon", desc:"Ton pseudo en vert fluo",    price:200,  icon:"💚", color:"#4ade80", rarity:"commun" },
  { id:"color_gold",   type:"pseudoColor", name:"Pseudo Doré",      desc:"Ton pseudo brille en or",    price:500,  icon:"✨", color:"#ffd700", rarity:"rare" },
  // Badges
  { id:"badge_tasty",  type:"badge", name:"🍗 TASTY CROUSTY92", desc:"Le classique du lycée",           price:300,  icon:"🍗", rarity:"commun" },
  { id:"badge_puff",   type:"badge", name:"🚬 puffeurXtrem",    desc:"Toujours en train de souffler",    price:400,  icon:"🚬", rarity:"commun" },
  { id:"badge_poseur", type:"badge", name:"🍆 poseurcouillu",   desc:"On sait tous qui c'est",           price:600,  icon:"🍆", rarity:"rare" },
  { id:"badge_goat",   type:"badge", name:"⚡ Goat67",          desc:"Le meilleur. Point.",              price:3000, icon:"⚡", rarity:"légendaire" },
  // Cadres
  { id:"frame_fire",   type:"frame", name:"Cadre Feu",      desc:"Bordure rouge flamboyante",    price:500,  icon:"🔥", frameColor:"linear-gradient(135deg,#ef4444,#f97316)", rarity:"rare" },
  { id:"frame_ice",    type:"frame", name:"Cadre Glace",    desc:"Bordure cristal bleu glacé",   price:500,  icon:"❄️", frameColor:"linear-gradient(135deg,#22d3ee,#6366f1)", rarity:"rare" },
  { id:"frame_gold",   type:"frame", name:"Cadre Or",       desc:"Bordure en or massif",         price:1000, icon:"🏅", frameColor:"linear-gradient(135deg,#ffd700,#f59e0b)", rarity:"épique" },
  { id:"frame_galaxy", type:"frame", name:"Cadre Galaxie",  desc:"L'univers autour de toi",      price:4000, icon:"🌌", frameColor:"linear-gradient(135deg,#a855f7,#ec4899,#6366f1)", rarity:"légendaire" },
];

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
  let wins=0, losses=0;
  // Trier les marchés clôturés par date de résolution
  const resolved = markets
    .filter(m=>m.resolved && (m.bets||[]).find(b=>b.userId===userId&&!b.isPenalty))
    .sort((a,b)=>(a.resolvedAt||a.ts)-(b.resolvedAt||b.ts));
  for (const m of resolved) {
    const bet = (m.bets||[]).find(b=>b.userId===userId && !b.isPenalty);
    if (bet.side===m.result) wins++; else losses++;
  }
  // Streak actuel (victoires consécutives en partant de la fin)
  let streak = 0;
  for (let i=resolved.length-1; i>=0; i--) {
    const bet = (resolved[i].bets||[]).find(b=>b.userId===userId&&!b.isPenalty);
    if (bet && bet.side===resolved[i].result) streak++;
    else break;
  }
  // Record de streak
  let bestStreak=0, cur=0;
  for (const m of resolved) {
    const bet = (m.bets||[]).find(b=>b.userId===userId&&!b.isPenalty);
    if (bet && bet.side===m.result) { cur++; if(cur>bestStreak) bestStreak=cur; }
    else cur=0;
  }
  return { wins, losses, streak, bestStreak };
}

const Field = ({ label, children }) => (
  <div style={{marginBottom:16}}>
    <div style={{fontSize:8,color:"#444",letterSpacing:2,marginBottom:6,fontWeight:"bold"}}>{label}</div>
    {children}
  </div>
);

const PwField = ({ value, onChange, placeholder }) => {
  const [show, setShow] = useState(false);
  return (
    <div style={{position:"relative"}}>
      <input type={show?"text":"password"} value={value} onChange={onChange} placeholder={placeholder||"••••••••"}
        style={{width:"100%",background:"#0d0d0d",border:"1px solid #2a2a2a",color:"#e8e0d0",
          padding:"10px 36px 10px 12px",borderRadius:6,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
      <button onClick={()=>setShow(s=>!s)} style={{position:"absolute",right:10,top:"50%",
        transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",
        color:"#555",fontSize:14}}>{show?"🙈":"👁"}</button>
    </div>
  );
};

const S = {
  btn:(bg,color,extra={})=>({
    width:"100%",padding:"11px",borderRadius:6,border:"none",cursor:"pointer",
    fontWeight:"bold",fontSize:11,fontFamily:"'Courier New',monospace",letterSpacing:1,
    background:bg,color,marginTop:4,...extra
  })
};

export default function SchoolMarket() {
  const [users,   setUsers]   = useState([]);
  const [markets, setMarkets] = useState([]);
  const [me,      setMe]      = useState(null);
  const [loaded,  setLoaded]  = useState(false);
  const [lottery, setLottery] = useState({pool:0, participants:[], week:""});
  const usersRef   = useRef([]);
  const marketsRef = useRef([]);
  const lotteryRef = useRef({pool:0, participants:[], week:""});

  const syncU = (u) => { const a=u?(Array.isArray(u)?u:Object.values(u)):[];  setUsers(a);   usersRef.current=a; };
  const syncM = (m) => { const a=m?(Array.isArray(m)?m:Object.values(m)):[];  setMarkets(a); marketsRef.current=a; };
  const syncL = (l) => { const d=l||{pool:0,participants:[],week:""}; setLottery(d); lotteryRef.current=d; };
  const saveU = (u) => { syncU(u); fbSet("users",   u); };
  const saveM = (m) => { syncM(m); fbSet("markets", m); };
  const saveL = (l) => { syncL(l); fbSet("lottery", l); };

  useEffect(() => {
    if (firebaseOk) {
      const u1 = fbListen("users",   d => { syncU(d); setLoaded(true); });
      const u2 = fbListen("markets", d => syncM(d));
      const u3 = fbListen("lottery", d => syncL(d));
      return () => { u1(); u2(); u3(); };
    } else {
      try {
        syncU(JSON.parse(localStorage.getItem("sm_users")||"[]"));
        syncM(JSON.parse(localStorage.getItem("sm_markets")||"[]"));
        syncL(JSON.parse(localStorage.getItem("sm_lottery")||"null"));
      } catch {}
      setLoaded(true);
    }
  }, []);
  useEffect(() => { if (!firebaseOk) localStorage.setItem("sm_users",   JSON.stringify(users));   }, [users]);
  useEffect(() => { if (!firebaseOk) localStorage.setItem("sm_markets", JSON.stringify(markets)); }, [markets]);
  useEffect(() => { if (!firebaseOk) localStorage.setItem("sm_lottery", JSON.stringify(lottery)); }, [lottery]);

  const isAdmin = me?.pseudo === ADMIN_PSEUDO;

  // ── UI STATE ────────────────────────────────────────────────────
  const [view,        setView]        = useState("markets");
  const [authMode,    setAuthMode]    = useState("login");
  const [authPseudo,  setAuthPseudo]  = useState("");
  const [authPw,      setAuthPw]      = useState("");
  const [authPw2,     setAuthPw2]     = useState("");
  const [authAvatar,  setAuthAvatar]  = useState("🦁");
  const [authErr,     setAuthErr]     = useState("");
  const [adminPwModal,setAdminPwModal]= useState(false);
  const [adminPwInput,setAdminPwInput]= useState("");
  const [adminPwErr,  setAdminPwErr]  = useState("");
  const [filter,      setFilter]      = useState("tous");
  const [betModal,    setBetModal]    = useState(null);
  const [betAmount,   setBetAmount]   = useState(50);
  const [betSide,     setBetSide]     = useState(null);
  const [createOpen,  setCreateOpen]  = useState(false);
  const [draft,       setDraft]       = useState({title:"",category:"profs",emoji:"🎲",deadline:""});
  const [draftErr,    setDraftErr]    = useState("");
  const [profileUser, setProfileUser] = useState(null);
  const [toast,       setToast]       = useState(null);
  const [delConfirm,  setDelConfirm]  = useState(null);
  const [adminTab,    setAdminTab]    = useState("markets");
  const [resolveModal,setResolveModal]= useState(null);
  const [walletModal, setWalletModal] = useState(null);
  const [walletAmt,   setWalletAmt]   = useState("");
  const [banConfirm,  setBanConfirm]  = useState(null);
  const [renamModal,  setRenamModal]  = useState(null);
  const [renamInput,  setRenamInput]  = useState("");
  const [renamErr,    setRenamErr]    = useState("");
  const [myRenamReq,  setMyRenamReq]  = useState(false);
  const [myRenamInput,setMyRenamInput]= useState("");
  const [myRenamErr,  setMyRenamErr]  = useState("");
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [cashprizeAmt,setCashprizeAmt]= useState("500");
  const [announceOpen,setAnnounceOpen]= useState(null); // annonce ouverte en modal
  const [annTitle,    setAnnTitle]    = useState("🎉 Grosse mise à jour SchoolMarket !");
  const [annBody,     setAnnBody]     = useState(`Voici toutes les nouveautés :\n\n🛒 Boutique — Achète des couleurs de pseudo, badges et cadres visibles dans le classement\n🎰 Loterie hebdo — 50 SC le ticket, tirage chaque semaine\n🔥 Streak de victoires — Enchaîne les wins et affiche ta série\n⭐ Meilleur & Pire parieur de la semaine — Visible dans le classement\n📁 Paris Clôturés — Retrouve tous les anciens paris\n🌍 Hors les murs — Nouvelle catégorie pour parier hors lycée\n🎁 Bonus quotidien — +50 SC à chaque connexion\n💳 Remise en jeu — Crédit automatique si tu tombes sous 100 SC\n📈 Stats globales — Toutes les stats du site\n🏆 Paliers — Atteins 2k, 5k, 10k, 25k SC pour débloquer des badges\n📌 Paris en vedette — L'admin épingle le pari du moment`);
  // Blackjack
  const [bjBet,    setBjBet]    = useState(100);
  const [bjDeck,   setBjDeck]   = useState([]);
  const [bjPlayer, setBjPlayer] = useState([]);
  const [bjDealer, setBjDealer] = useState([]);
  const [bjPhase,  setBjPhase]  = useState("bet");
  const [bjResult, setBjResult] = useState(null);
  const [bjMsg,    setBjMsg]    = useState("");
  // Slot machine
  const [slotBet,      setSlotBet]      = useState(50);
  const [slotReels,    setSlotReels]    = useState(["🍒","🍒","🍒"]);
  const [slotSpinning, setSlotSpinning] = useState(false);
  const [slotResult,   setSlotResult]   = useState(null);
  const [slotMsg,      setSlotMsg]      = useState("");
  const [casinoTab,    setCasinoTab]    = useState("blackjack");

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
      banned:false, isAdmin:false, canRename:false, renameRequest:null
    };
    saveU([...cur, newUser]);
    setMe(newUser);
    setView("markets");
    showToast(`Bienvenue ${name} ! 🎉`);
  };

  const handleLogin = () => {
    setAuthErr("");
    const name = authPseudo.trim();
    if (name.toLowerCase()===ADMIN_PSEUDO.toLowerCase()) {
      setAdminPwModal(true); return;
    }
    const cur = usersRef.current;
    const found = cur.find(u=>u.pseudo.toLowerCase()===name.toLowerCase());
    if (!found) return setAuthErr("Pseudo introuvable.");
    if (found.banned) return setAuthErr("Ce compte est banni.");
    if (found.passwordHash && found.passwordHash !== simpleHash(authPw))
      return setAuthErr("Mot de passe incorrect.");
    // Bonus quotidien
    const today = new Date().toDateString();
    let updated = found;
    if (found.lastBonus !== today) {
      updated = {...updated, wallet: updated.wallet + 50, lastBonus: today};
      setTimeout(()=>showToast("🎁 Bonus quotidien : +50 SC !"), 400);
    }
    // Remise en jeu (crédit)
    if (updated.wallet < 100 && !updated.debt) {
      updated = {...updated, wallet: updated.wallet + 200, debt: 200};
      setTimeout(()=>showToast("💳 Crédit de 200 SC accordé ! À rembourser.", "err"), 800);
    }
    // Remboursement automatique si wallet >= 500 et dette en cours
    if (updated.debt && updated.wallet >= 500) {
      updated = {...updated, wallet: updated.wallet - updated.debt, debt: 0};
      setTimeout(()=>showToast("✅ Crédit de 200 SC remboursé !"), 800);
    }
    saveU(cur.map(u=>u.id===found.id ? updated : u));
    setMe(updated); setView("markets");
    showToast(`Bon retour ${found.pseudo} !`);
  };

  const handleAdminLogin = () => {
    if (adminPwInput !== ADMIN_PASSWORD) { setAdminPwErr("Mot de passe incorrect."); return; }
    const cur = usersRef.current;
    let adm = cur.find(u=>u.pseudo===ADMIN_PSEUDO);
    if (!adm) {
      adm = { id:"admin_root", pseudo:ADMIN_PSEUDO, avatar:"👑", wallet:1000,
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
    if (freshMe.wallet < amount) return showToast("Pas assez de SC","err");
    const mkt = marketsRef.current.find(m=>m.id===betModal.id);
    if (!mkt || mkt.resolved) return showToast("Marché fermé","err");
    if (mkt.deadline && Date.now() > mkt.deadline) return showToast("⏰ Délai de pari dépassé !","err");
    const existing = (mkt.bets||[]).find(b=>b.userId===me.id&&!b.isPenalty);
    if (existing) return showToast("Tu as déjà parié sur ce marché","err");
    if (mkt.creatorId===me.id && !isAdmin) return showToast("Tu ne peux pas parier sur ton propre marché","err");
    const newBet = { userId:me.id, pseudo:me.pseudo, side:betSide, amount, ts:Date.now() };
    const newMkt = { ...mkt, bets:[...(mkt.bets||[]), newBet] };
    const newMe  = { ...freshMe, wallet:freshMe.wallet - amount };
    saveM(marketsRef.current.map(m=>m.id===mkt.id?newMkt:m));
    saveU(cur.map(u=>u.id===me.id?newMe:u));
    setMe(newMe);
    setBetModal(null); setBetSide(null); setBetAmount(50);
    showToast(`✅ Pari de ${amount} SC placé !`);
  };

  // ── RETIRER PARI (pénalité 50%) ─────────────────────────────────
  const deleteBet = (marketId) => {
    const mkt = marketsRef.current.find(m=>m.id===marketId);
    if (!mkt || mkt.resolved) return;
    const bet = (mkt.bets||[]).find(b=>b.userId===me.id&&!b.isPenalty);
    if (!bet) return;
    const penalty = Math.floor(bet.amount * 0.5);
    const refund  = bet.amount - penalty;
    const penaltyBet = { userId:"penalty", pseudo:"cagnotte", side:bet.side, amount:penalty, ts:Date.now(), isPenalty:true };
    const newBets = (mkt.bets||[]).filter(b=>b.userId!==me.id||b.isPenalty);
    newBets.push(penaltyBet);
    const newMkt = { ...mkt, bets:newBets };
    const cur = usersRef.current;
    const freshMe = cur.find(u=>u.id===me.id)||me;
    const newMe = { ...freshMe, wallet:freshMe.wallet + refund };
    saveM(marketsRef.current.map(m=>m.id===marketId?newMkt:m));
    saveU(cur.map(u=>u.id===me.id?newMe:u));
    setMe(newMe);
    setDelConfirm(null);
    showToast(`↩ Remboursé ${refund} SC (−${penalty} SC pénalité)`);
  };

  // ── CRÉER MARCHÉ ─────────────────────────────────────────────────
  const createMarket = () => {
    setDraftErr("");
    if (!draft.title.trim()) return setDraftErr("Donne un titre à ton marché.");
    if (draft.title.length>120) return setDraftErr("Titre trop long.");
    const activeOwn = markets.filter(m=>m.creatorId===me.id&&!m.resolved).length;
    if (!isAdmin && activeOwn>=2) return setDraftErr("Max 2 marchés actifs.");
    const newMkt = {
      id:`m_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      title:draft.title.trim(), category:draft.category, emoji:draft.emoji,
      creatorId:me.id, creatorPseudo:me.pseudo,
      bets:[], resolved:false, result:null, ts:Date.now(),
      deadline: draft.deadline ? new Date(draft.deadline).getTime() : null
    };
    saveM([...marketsRef.current, newMkt]);
    setCreateOpen(false); setDraft({title:"",category:"profs",emoji:"🎲",deadline:""});
    showToast("🎉 Marché créé !");
  };

  // ── RÉSOUDRE MARCHÉ (admin) ──────────────────────────────────────
  const resolveMarket = (marketId, result) => {
    const mkt = marketsRef.current.find(m=>m.id===marketId);
    if (!mkt) return;
    const bets = mkt.bets || [];
    const winners = bets.filter(b=>b.side===result&&!b.isPenalty);
    const totalPool = bets.reduce((s,b)=>s+b.amount,0);
    const winnerStake = winners.reduce((s,b)=>s+b.amount,0);
    let newU = [...usersRef.current];
    // Gains + notifications
    for (const bet of bets.filter(b=>!b.isPenalty)) {
      const won = bet.side===result;
      const gain = won && winnerStake>0 ? Math.round(bet.amount/winnerStake*totalPool) : 0;
      const profit = gain - bet.amount;
      const notif = {
        id:`n_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,
        ts: Date.now(),
        read: false,
        won,
        marketTitle: mkt.title,
        marketEmoji: mkt.emoji,
        amount: bet.amount,
        gain: won ? gain : 0,
        profit: won ? profit : -bet.amount,
      };
      newU = newU.map(u => {
        if (u.id !== bet.userId) return u;
        const updatedWallet = won ? u.wallet + gain : u.wallet;
        const notifs = [...(u.notifications||[]), notif].slice(-30);
        // Vérifier les paliers débloqués
        const unlockedMilestones = u.unlockedMilestones||[];
        const newMilestones = [...unlockedMilestones];
        const milestoneNotifs = [];
        if (won) {
          for (const m of MILESTONES) {
            if (updatedWallet >= m.threshold && !unlockedMilestones.includes(m.id)) {
              newMilestones.push(m.id);
              milestoneNotifs.push({
                id:`n_${Date.now()}_m${m.id}`, ts:Date.now(), read:false,
                won:true, marketTitle:`Palier ${m.threshold.toLocaleString()} SC atteint !`,
                marketEmoji:"🏆", amount:0, gain:0, profit:0, isMilestone:true,
              });
            }
          }
        }
        return {...u, wallet:updatedWallet,
          notifications:[...notifs,...milestoneNotifs].slice(-30),
          unlockedMilestones:newMilestones};
      });
    }
    saveU(newU);
    saveM(marketsRef.current.map(m=>m.id===marketId?{...m,resolved:true,result,resolvedAt:Date.now()}:m));
    const fm = newU.find(u=>u.id===me?.id);
    if (fm) setMe(fm);
    setResolveModal(null);
    showToast(`✅ Marché résolu — ${result==="yes"?"OUI":"NON"} gagne !`);
  };

  // ── SUPPRIMER MARCHÉ ────────────────────────────────────────────
  const deleteMarket = (marketId) => {
    const mkt = marketsRef.current.find(m=>m.id===marketId);
    if (!mkt) return;
    let newU = [...usersRef.current];
    if (!mkt.resolved) {
      for (const bet of (mkt.bets||[]).filter(b=>!b.isPenalty)) {
        newU = newU.map(u=>u.id===bet.userId?{...u,wallet:u.wallet+bet.amount}:u);
      }
      saveU(newU);
      const fm = newU.find(u=>u.id===me?.id);
      if (fm) setMe(fm);
    }
    saveM(marketsRef.current.filter(m=>m.id!==marketId));
    setDelConfirm(null);
    showToast(mkt.resolved?"🗑 Marché résolu supprimé.":"🗑 Marché supprimé — paris remboursés.");
  };

  // ── ADMIN : modifier wallet ──────────────────────────────────────
  const adminSetWallet = (userId) => {
    const amt = parseInt(walletAmt);
    if (isNaN(amt)) return showToast("Montant invalide","err");
    saveU(usersRef.current.map(u=>u.id===userId?{...u,wallet:Math.max(0,u.wallet+amt)}:u));
    setWalletModal(null); setWalletAmt("");
    showToast(`💰 Wallet modifié de ${amt>0?"+":""}${amt} SC`);
  };

  // ── ADMIN : bannir/débannir ──────────────────────────────────────
  const adminBan = (userId) => {
    const cur = usersRef.current;
    const u = cur.find(x=>x.id===userId);
    if (!u) return;
    const newBanned = !u.banned;
    let newU = cur.map(x=>x.id===userId?{...x,banned:newBanned}:x);
    let newM = marketsRef.current;
    if (newBanned) {
      const userMarkets = newM.filter(m=>m.creatorId===userId&&!m.resolved);
      for (const mkt of userMarkets) {
        for (const bet of (mkt.bets||[]).filter(b=>!b.isPenalty))
          newU = newU.map(x=>x.id===bet.userId?{...x,wallet:x.wallet+bet.amount}:x);
      }
      newM = newM.filter(m=>m.creatorId!==userId||m.resolved);
      saveM(newM);
    }
    saveU(newU);
    setBanConfirm(null);
    showToast(newBanned?`🚫 ${u.pseudo} banni.`:`✅ ${u.pseudo} débanni.`);
  };

  // ── ADMIN : renommer ─────────────────────────────────────────────
  const adminRename = (userId) => {
    setRenamErr("");
    const name = renamInput.trim();
    if (!name||name.length<2) return setRenamErr("Pseudo trop court.");
    if (name.toLowerCase()===ADMIN_PSEUDO.toLowerCase()) return setRenamErr("Pseudo réservé.");
    const cur = usersRef.current;
    if (cur.find(u=>u.id!==userId&&u.pseudo.toLowerCase()===name.toLowerCase()))
      return setRenamErr("Pseudo déjà pris !");
    const newU = cur.map(u=>u.id===userId?{...u,pseudo:name,canRename:false,renameRequest:null}:u);
    const newM = marketsRef.current.map(m=>({
      ...m,
      creatorPseudo: m.creatorId===userId ? name : m.creatorPseudo,
      bets: (m.bets||[]).map(b=>b.userId===userId?{...b,pseudo:name}:b)
    }));
    saveU(newU); saveM(newM);
    setRenamModal(null); setRenamInput(""); setRenamErr("");
    showToast(`✏️ Renommé → ${name}`);
  };

  const adminAllowRename = (userId) => {
    saveU(usersRef.current.map(u=>u.id===userId?{...u,canRename:true,renameRequest:null}:u));
    showToast("✅ Changement de pseudo autorisé !");
  };
  const adminDenyRename = (userId) => {
    saveU(usersRef.current.map(u=>u.id===userId?{...u,renameRequest:null}:u));
    showToast("❌ Demande refusée.");
  };

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

  const applyRename = () => {
    setMyRenamErr("");
    const name = myRenamInput.trim();
    if (!name||name.length<2) return setMyRenamErr("Pseudo trop court.");
    if (name.toLowerCase()===ADMIN_PSEUDO.toLowerCase()) return setMyRenamErr("Pseudo réservé.");
    const cur = usersRef.current;
    if (cur.find(u=>u.id!==me.id&&u.pseudo.toLowerCase()===name.toLowerCase()))
      return setMyRenamErr("Pseudo déjà pris !");
    const oldPseudo = me.pseudo;
    const newU = cur.map(u=>u.id===me.id?{...u,pseudo:name,canRename:false,renameRequest:null}:u);
    const newM = marketsRef.current.map(m=>({
      ...m,
      creatorPseudo: m.creatorId===me.id ? name : m.creatorPseudo,
      bets: (m.bets||[]).map(b=>b.userId===me.id?{...b,pseudo:name}:b)
    }));
    saveU(newU); saveM(newM);
    const newMe = newU.find(u=>u.id===me.id);
    setMe(newMe);
    setMyRenamReq(false); setMyRenamInput(""); setMyRenamErr("");
    showToast(`✅ Pseudo changé : ${oldPseudo} → ${name}`);
  };

  // ── BOUTIQUE ─────────────────────────────────────────────────────
  const buyItem = (item) => {
    const cur = usersRef.current;
    const freshMe = cur.find(u=>u.id===me.id)||me;
    if (freshMe.wallet < item.price) return showToast("Pas assez de SC 😢","err");
    const owned = freshMe.owned||[];
    if (owned.includes(item.id)) return showToast("Déjà acheté !","err");
    const newMe = {...freshMe, wallet:freshMe.wallet-item.price, owned:[...owned,item.id]};
    saveU(cur.map(u=>u.id===me.id?newMe:u));
    setMe(newMe);
    showToast(`✅ "${item.name}" acheté !`);
  };

  const equipItem = (item) => {
    const cur = usersRef.current;
    const freshMe = cur.find(u=>u.id===me.id)||me;
    const equipped = {...(freshMe.equipped||{})};
    equipped[item.type] = item.id;
    const newMe = {...freshMe, equipped};
    saveU(cur.map(u=>u.id===me.id?newMe:u));
    setMe(newMe);
    showToast(`✅ "${item.name}" équipé !`);
  };

  const unequipItem = (type) => {
    const cur = usersRef.current;
    const freshMe = cur.find(u=>u.id===me.id)||me;
    const equipped = {...(freshMe.equipped||{})};
    delete equipped[type];
    const newMe = {...freshMe, equipped};
    saveU(cur.map(u=>u.id===me.id?newMe:u));
    setMe(newMe);
    showToast("❌ Article déséquipé.");
  };

  // ── ANNONCES ─────────────────────────────────────────────────────
  const sendAnnouncement = () => {
    if (!annTitle.trim()) return showToast("Titre requis","err");
    const notif = {
      id:`n_ann_${Date.now()}`,
      ts: Date.now(),
      read: false,
      isAnnouncement: true,
      marketTitle: annTitle.trim(),
      marketEmoji: "📢",
      annBody: annBody.trim(),
      amount:0, gain:0, profit:0, won:true,
    };
    const cur = usersRef.current;
    const newU = cur.map(u => u.isAdmin ? u : {
      ...u,
      notifications: [...(u.notifications||[]), notif].slice(-30)
    });
    saveU(newU);
    showToast("📢 Annonce envoyée à tous les joueurs !");
  };

  // ── BLACKJACK ────────────────────────────────────────────────────
  const BJ_SUITS = ["♠","♥","♦","♣"];
  const BJ_VALUES = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

  const makeDeck = () => {
    const deck = [];
    for (const s of BJ_SUITS) for (const v of BJ_VALUES) deck.push({s,v});
    // Mélanger
    for (let i=deck.length-1;i>0;i--) {
      const j=Math.floor(Math.random()*(i+1));
      [deck[i],deck[j]]=[deck[j],deck[i]];
    }
    return deck;
  };

  const bjCardValue = (card) => {
    if (["J","Q","K"].includes(card.v)) return 10;
    if (card.v==="A") return 11;
    return parseInt(card.v);
  };

  const bjHandValue = (hand) => {
    let total = hand.reduce((s,c)=>s+bjCardValue(c),0);
    let aces = hand.filter(c=>c.v==="A").length;
    while (total>21 && aces>0) { total-=10; aces--; }
    return total;
  };

  const bjStart = () => {
    const freshMe = usersRef.current.find(u=>u.id===me.id)||me;
    const bet = parseInt(bjBet)||0;
    if (bet<50) return showToast("Mise minimum : 50 SC","err");
    if (bet>freshMe.wallet) return showToast("Pas assez de SC","err");
    const deck = makeDeck();
    const player = [deck.pop(), deck.pop()];
    const dealer = [deck.pop(), deck.pop()];
    // Débiter la mise
    const newMe = {...freshMe, wallet:freshMe.wallet-bet};
    saveU(usersRef.current.map(u=>u.id===me.id?newMe:u));
    setMe(newMe);
    setBjDeck(deck); setBjPlayer(player); setBjDealer(dealer);
    setBjResult(null); setBjMsg("");
    // Vérifier blackjack immédiat
    if (bjHandValue(player)===21) {
      setBjPhase("done");
      bjEndGame(player, dealer, deck, bet, newMe, true);
    } else {
      setBjPhase("play");
    }
  };

  const bjHit = () => {
    const deck = [...bjDeck];
    const player = [...bjPlayer, deck.pop()];
    setBjDeck(deck); setBjPlayer(player);
    const val = bjHandValue(player);
    if (val>21) {
      setBjPhase("done"); setBjResult("lose");
      setBjMsg(`💥 Bust ! Tu as ${val}. Perdu — ${bjBet} SC`);
    } else if (val===21) {
      bjStand(player, deck);
    }
  };

  const bjStand = (playerHand=null, deckOverride=null) => {
    const player = playerHand||bjPlayer;
    let deck = [...(deckOverride||bjDeck)];
    let dealer = [...bjDealer];
    while (bjHandValue(dealer)<17) dealer.push(deck.pop());
    setBjDealer(dealer); setBjDeck(deck); setBjPhase("done");
    bjEndGame(player, dealer, deck, parseInt(bjBet), null, false);
  };

  const bjDouble = () => {
    const freshMe = usersRef.current.find(u=>u.id===me.id)||me;
    const extra = parseInt(bjBet);
    if (freshMe.wallet<extra) return showToast("Pas assez de SC pour doubler","err");
    const newMe = {...freshMe, wallet:freshMe.wallet-extra};
    saveU(usersRef.current.map(u=>u.id===me.id?newMe:u));
    setMe(newMe);
    const deck = [...bjDeck];
    const player = [...bjPlayer, deck.pop()];
    setBjDeck(deck); setBjPlayer(player);
    let dealer = [...bjDealer];
    while (bjHandValue(dealer)<17) dealer.push(deck.pop());
    setBjDealer(dealer); setBjPhase("done");
    bjEndGame(player, dealer, deck, extra*2, newMe, false);
  };

  const bjEndGame = (player, dealer, deck, bet, meOverride=null, isBlackjack=false) => {
    const pVal = bjHandValue(player);
    const dVal = bjHandValue(dealer);
    const cur = usersRef.current;
    const freshMe = meOverride || cur.find(u=>u.id===me.id)||me;
    let gain = 0; let result = ""; let msg = "";
    if (pVal>21) { result="lose"; msg=`💥 Bust ! Perdu — ${bet} SC`; }
    else if (isBlackjack && dVal!==21) { gain=Math.round(bet*2.5); result="blackjack"; msg=`🃏 BLACKJACK ! +${gain-bet} SC`; }
    else if (dVal>21) { gain=bet*2; result="win"; msg=`🎉 Croupier bust ! +${bet} SC`; }
    else if (pVal>dVal) { gain=bet*2; result="win"; msg=`🎉 Gagné ! +${bet} SC`; }
    else if (pVal===dVal) { gain=bet; result="push"; msg=`🤝 Égalité — remboursé`; }
    else { result="lose"; msg=`😢 Perdu — ${bet} SC`; }
    if (gain>0) {
      const newMe2 = {...freshMe, wallet:freshMe.wallet+gain};
      saveU(cur.map(u=>u.id===me.id?newMe2:u));
      setMe(newMe2);
    }
    setBjResult(result); setBjMsg(msg);
  };

  // ── SLOT MACHINE ─────────────────────────────────────────────────
  const SLOT_SYMBOLS = ["💎","7️⃣","🍒","⭐","🍋","🔔","🍇","🃏"];
  const SLOT_PAYOUTS = {
    "💎💎💎":20, "7️⃣7️⃣7️⃣":15, "🍒🍒🍒":10,
    "⭐⭐⭐":8,  "🍋🍋🍋":5,   "🔔🔔🔔":6,
    "🍇🍇🍇":7, "🃏🃏🃏":25,
  };

  const slotSpin = () => {
    if (slotSpinning) return;
    const cur = usersRef.current;
    const freshMe = cur.find(u=>u.id===me.id)||me;
    const bet = parseInt(slotBet)||0;
    if (bet<50) return showToast("Mise minimum : 50 SC","err");
    if (bet>freshMe.wallet) return showToast("Pas assez de SC","err");
    // Débiter
    const newMe = {...freshMe, wallet:freshMe.wallet-bet};
    saveU(cur.map(u=>u.id===me.id?newMe:u));
    setMe(newMe);
    setSlotSpinning(true);
    setSlotResult(null);
    setSlotMsg("");
    // Animation — changer les symboles rapidement
    let ticks = 0;
    const interval = setInterval(()=>{
      setSlotReels([
        SLOT_SYMBOLS[Math.floor(Math.random()*SLOT_SYMBOLS.length)],
        SLOT_SYMBOLS[Math.floor(Math.random()*SLOT_SYMBOLS.length)],
        SLOT_SYMBOLS[Math.floor(Math.random()*SLOT_SYMBOLS.length)],
      ]);
      ticks++;
      if (ticks>=12) {
        clearInterval(interval);
        // Résultat final
        const final = [
          SLOT_SYMBOLS[Math.floor(Math.random()*SLOT_SYMBOLS.length)],
          SLOT_SYMBOLS[Math.floor(Math.random()*SLOT_SYMBOLS.length)],
          SLOT_SYMBOLS[Math.floor(Math.random()*SLOT_SYMBOLS.length)],
        ];
        setSlotReels(final);
        setSlotSpinning(false);
        // Calculer gain
        const key = final.join("");
        const cur2 = usersRef.current;
        const freshMe2 = cur2.find(u=>u.id===me.id)||me;
        let gain = 0; let msg = ""; let result = "lose";
        if (SLOT_PAYOUTS[key]) {
          gain = bet * SLOT_PAYOUTS[key];
          result = "win";
          msg = `🎉 JACKPOT ${final[0]}${final[1]}${final[2]} ! +${(gain-bet).toLocaleString()} SC (x${SLOT_PAYOUTS[key]})`;
        } else if (final[0]===final[1]||final[1]===final[2]||final[0]===final[2]) {
          gain = Math.round(bet*1.5);
          result = "partial";
          msg = `✨ 2 identiques ! +${(gain-bet).toLocaleString()} SC`;
        } else {
          msg = `😢 Perdu — ${bet} SC`;
        }
        if (gain>0) {
          const newMe2 = {...freshMe2, wallet:freshMe2.wallet+gain};
          saveU(cur2.map(u=>u.id===me.id?newMe2:u));
          setMe(newMe2);
        }
        setSlotResult(result);
        setSlotMsg(msg);
      }
    }, 80);
  };

  // ── ÉPINGLER MARCHÉ ──────────────────────────────────────────────
  const pinMarket = (marketId) => {
    const alreadyPinned = marketsRef.current.find(m=>m.pinned);
    const mkt = marketsRef.current.find(m=>m.id===marketId);
    if (!mkt) return;
    if (mkt.pinned) {
      saveM(marketsRef.current.map(m=>({...m, pinned:false})));
      showToast("📌 Marché dépinglé.");
    } else {
      saveM(marketsRef.current.map(m=>({...m, pinned:m.id===marketId})));
      showToast("⭐ Marché épinglé en vedette !");
    }
  };

  // ── LOTERIE ──────────────────────────────────────────────────────
  const getWeekKey = () => {
    const d = new Date();
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${week}`;
  };

  const buyLotteryTicket = () => {
    if (!me) return setView("auth");
    const cur = usersRef.current;
    const freshMe = cur.find(u=>u.id===me.id)||me;
    if (freshMe.wallet < 50) return showToast("Pas assez de SC !","err");
    const weekKey = getWeekKey();
    const lot = lotteryRef.current;
    const participants = lot.participants||[];
    if (lot.week===weekKey && participants.find(p=>p.userId===me.id))
      return showToast("Tu as déjà un ticket cette semaine !","err");
    // Reset si nouvelle semaine
    const newParticipants = lot.week===weekKey
      ? [...participants, {userId:me.id, pseudo:me.pseudo}]
      : [{userId:me.id, pseudo:me.pseudo}];
    const newPool = lot.week===weekKey ? (lot.pool||0)+50 : 50;
    saveL({pool:newPool, participants:newParticipants, week:weekKey});
    const newMe = {...freshMe, wallet:freshMe.wallet-50};
    saveU(cur.map(u=>u.id===me.id?newMe:u));
    setMe(newMe);
    showToast(`🎟 Ticket acheté ! Cagnotte : ${newPool} SC`);
  };

  const drawLottery = () => {
    const lot = lotteryRef.current;
    const participants = lot.participants||[];
    if (participants.length===0) return showToast("Aucun participant !","err");
    const winner = participants[Math.floor(Math.random()*participants.length)];
    const cur = usersRef.current;
    const notif = {
      id:`n_${Date.now()}`, ts:Date.now(), read:false,
      won:true, marketTitle:"🎰 Loterie hebdomadaire",
      marketEmoji:"🎰", amount:50, gain:lot.pool, profit:lot.pool-50,
    };
    const newU = cur.map(u=>{
      if (u.id!==winner.userId) return u;
      return {...u, wallet:u.wallet+lot.pool,
        notifications:[...(u.notifications||[]), notif].slice(-30)};
    });
    saveU(newU);
    saveL({pool:0, participants:[], week:""});
    const fm = newU.find(u=>u.id===me?.id);
    if (fm) setMe(fm);
    showToast(`🎉 ${winner.pseudo} remporte ${lot.pool} SC !`);
  };

  // ── NOTIFS ───────────────────────────────────────────────────────
  const markNotifsRead = () => {
    const cur = usersRef.current;
    const freshMe = cur.find(u=>u.id===me.id)||me;
    const newMe = {...freshMe, notifications:(freshMe.notifications||[]).map(n=>({...n,read:true}))};
    saveU(cur.map(u=>u.id===me.id?newMe:u));
    setMe(newMe);
  };

  // ── COMPTE À REBOURS ─────────────────────────────────────────────
  const getCountdown = (deadline) => {
    const diff = deadline - Date.now();
    if (diff <= 0) return "⏰ Délai dépassé";
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (d > 0) return `⏳ ${d}j ${h}h restants`;
    if (h > 0) return `⏳ ${h}h ${m}min restants`;
    return `⏳ ${m}min restantes`;
  };

  // ── DÉRIVÉS ─────────────────────────────────────────────────────
  const visibleUsers = users.filter(u=>u.pseudo!==ADMIN_PSEUDO);
  const leaderboardUsers = users.filter(u=>!u.banned && !u.isAdmin);
  const leaderboard = leaderboardUsers.map(u=>{
    const s=computeStats(u.id,markets);
    const t=s.wins+s.losses;
    return{...u,...s,winRate:t>0?Math.round(s.wins/t*100):0,profit:u.wallet-1000};
  }).sort((a,b)=>b.wallet-a.wallet);

  // Meilleur parieur de la semaine
  const weekAgo = Date.now() - 7*24*60*60*1000;
  const weeklyMarkets = markets.filter(m=>m.resolved && m.resolvedAt && m.resolvedAt>=weekAgo);
  const weeklyScores = {};
  for (const mkt of weeklyMarkets) {
    for (const bet of (mkt.bets||[]).filter(b=>!b.isPenalty)) {
      if (!weeklyScores[bet.userId]) weeklyScores[bet.userId]={userId:bet.userId,profit:0,count:0};
      weeklyScores[bet.userId].count++;
      if (bet.side===mkt.result) {
        // gain = ce qu'il a reçu - ce qu'il a misé
        const totalPool=(mkt.bets||[]).reduce((s,b)=>s+b.amount,0);
        const winnerStake=(mkt.bets||[]).filter(b=>b.side===mkt.result&&!b.isPenalty).reduce((s,b)=>s+b.amount,0);
        const gain=winnerStake>0?Math.round(bet.amount/winnerStake*totalPool)-bet.amount:0;
        weeklyScores[bet.userId].profit+=gain;
      } else {
        weeklyScores[bet.userId].profit-=bet.amount;
      }
    }
  }
  const weeklyBest = Object.values(weeklyScores)
    .filter(s=>s.count>=3 && !users.find(u=>u.id===s.userId)?.isAdmin)
    .sort((a,b)=>b.profit-a.profit)[0] || null;
  const weeklyBestUser = weeklyBest ? users.find(u=>u.id===weeklyBest.userId) : null;
  const weeklyWorst = Object.values(weeklyScores)
    .filter(s=>s.count>=3 && s.userId!==weeklyBest?.userId && !users.find(u=>u.id===s.userId)?.isAdmin)
    .sort((a,b)=>a.profit-b.profit)[0] || null;
  const weeklyWorstUser = weeklyWorst && weeklyWorst.userId!==weeklyBest?.userId
    ? users.find(u=>u.id===weeklyWorst.userId) : null;

  const filtered = filter==="tous"
    ? markets.filter(m=>!m.resolved)
    : markets.filter(m=>m.category===filter && !m.resolved);
  const myBetOn  = mkt=>(mkt.bets||[]).find(b=>b.userId===me?.id);
  const myUserFresh = me ? usersRef.current.find(u=>u.id===me.id)||me : null;
  const pendingRenames = visibleUsers.filter(u=>u.renameRequest);
  const unreadCount = myUserFresh ? (myUserFresh.notifications||[]).filter(n=>!n.read).length : 0;

  if (!loaded) return (
    <div style={{minHeight:"100vh",background:"#0a0a0a",display:"flex",alignItems:"center",
      justifyContent:"center",fontFamily:"monospace",color:"#ffdc32",letterSpacing:4,fontSize:13}}>
      CHARGEMENT...
    </div>
  );

  // Mur de connexion — accès interdit sans compte
  if (!me) return (
    <div style={{minHeight:"100vh",background:"#0a0a0a",fontFamily:"'Courier New',monospace",color:"#e8e0d0"}}>
      <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",
        backgroundImage:"linear-gradient(rgba(255,220,50,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,220,50,0.025) 1px,transparent 1px)",
        backgroundSize:"44px 44px"}}/>
      {toast && (
        <div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:999,
          background:toast.type==="err"?"#1a0505":"#0a150a",
          border:`1px solid ${toast.type==="err"?"#ef4444":"#10b981"}`,
          color:toast.type==="err"?"#ef4444":"#10b981",
          padding:"10px 20px",borderRadius:6,fontSize:11,fontWeight:"bold",
          letterSpacing:1,whiteSpace:"nowrap",boxShadow:"0 4px 20px rgba(0,0,0,0.5)"}}>
          {toast.msg}
        </div>
      )}
      <div style={{maxWidth:400,margin:"0 auto",padding:"60px 20px",position:"relative",zIndex:1}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:28,fontWeight:"bold",letterSpacing:3,color:"#ffdc32",marginBottom:6}}>
            SM<span style={{color:"#e8e0d0"}}>.</span>
          </div>
          <div style={{fontSize:11,color:"#444",letterSpacing:2}}>MARCHÉ DE PRÉDICTION SCOLAIRE</div>
        </div>
        <div style={{background:"#141414",border:"1px solid #2a2a2a",borderRadius:12,padding:28}}>
          <div style={{display:"flex",gap:2,marginBottom:24}}>
            {[["login","CONNEXION"],["register","INSCRIPTION"]].map(([m,lbl])=>(
              <button key={m} onClick={()=>{setAuthMode(m);setAuthErr("");}}
                style={{flex:1,padding:"8px",border:"none",borderRadius:6,cursor:"pointer",
                  fontWeight:"bold",fontSize:9,fontFamily:"inherit",letterSpacing:1,
                  background:authMode===m?"#ffdc32":"#1a1a1a",color:authMode===m?"#0d0d0d":"#444"}}>
                {lbl}
              </button>
            ))}
          </div>
          {authMode==="register" && (
            <Field label="AVATAR">
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {AVATARS.map(a=>(
                  <button key={a} onClick={()=>setAuthAvatar(a)} style={{
                    fontSize:18,background:authAvatar===a?"#ffdc3215":"transparent",
                    border:authAvatar===a?"2px solid #ffdc32":"2px solid transparent",
                    borderRadius:10,padding:4,cursor:"pointer"}}>{a}</button>
                ))}
              </div>
            </Field>
          )}
          <Field label="PSEUDO">
            <input value={authPseudo} onChange={e=>setAuthPseudo(e.target.value)}
              placeholder="Ton pseudo..."
              style={{width:"100%",background:"#0d0d0d",border:"1px solid #2a2a2a",color:"#e8e0d0",
                padding:"10px 12px",borderRadius:6,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
          </Field>
          <Field label="MOT DE PASSE">
            <PwField value={authPw} onChange={e=>setAuthPw(e.target.value)}/>
          </Field>
          {authMode==="register" && (
            <Field label="CONFIRMER MOT DE PASSE">
              <PwField value={authPw2} onChange={e=>setAuthPw2(e.target.value)} placeholder="Répète ton mot de passe"/>
            </Field>
          )}
          {authErr && <div style={{color:"#ef4444",fontSize:11,marginBottom:16,padding:"8px 12px",background:"#1a0505",borderRadius:6}}>{authErr}</div>}
          <button onClick={authMode==="login"?handleLogin:handleRegister}
            style={{...S.btn("#ffdc32","#0d0d0d")}}>
            {authMode==="login"?"→ SE CONNECTER":"→ CRÉER MON COMPTE"}
          </button>
          {authMode==="login" && (
            <div style={{marginTop:12,textAlign:"center",fontSize:10,color:"#333"}}>
              Admin ?{" "}
              <span onClick={()=>setAdminPwModal(true)}
                style={{color:"#a855f7",cursor:"pointer",textDecoration:"underline"}}>
                Connexion admin
              </span>
            </div>
          )}
        </div>
      </div>
      {/* Modal admin pw */}
      {adminPwModal && (
        <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.92)",
          backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#111",border:"2px solid #a855f7",borderRadius:10,padding:32,maxWidth:360,width:"100%"}}>
            <div style={{fontSize:14,fontWeight:"bold",color:"#a855f7",marginBottom:16}}>👑 Connexion Admin</div>
            <PwField value={adminPwInput} onChange={e=>setAdminPwInput(e.target.value)} placeholder="Mot de passe admin..."/>
            {adminPwErr&&<div style={{color:"#ef4444",fontSize:11,margin:"8px 0",padding:"6px 10px",background:"#1a0505",borderRadius:6}}>{adminPwErr}</div>}
            <div style={{display:"flex",gap:16,marginTop:12}}>
              <button onClick={()=>{setAdminPwModal(false);setAdminPwInput("");setAdminPwErr("");}}
                style={{...S.btn("transparent","#555",{flex:1,border:"1px solid #2a2a2a"})}}>Annuler</button>
              <button onClick={handleAdminLogin} style={{...S.btn("#a855f7","#fff",{flex:1})}}>→ ENTRER</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#0a0a0a",fontFamily:"'Courier New',monospace",color:"#e8e0d0"}}
      onClick={()=>setNotifOpen(false)}>
      <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",
        backgroundImage:"linear-gradient(rgba(255,220,50,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,220,50,0.025) 1px,transparent 1px)",
        backgroundSize:"44px 44px"}}/>

      {toast && (
        <div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:999,
          background:toast.type==="err"?"#1a0505":"#0a150a",
          border:`1px solid ${toast.type==="err"?"#ef4444":"#10b981"}`,
          color:toast.type==="err"?"#ef4444":"#10b981",
          padding:"10px 20px",borderRadius:6,fontSize:11,fontWeight:"bold",
          letterSpacing:1,whiteSpace:"nowrap",boxShadow:"0 4px 20px rgba(0,0,0,0.5)"}}>
          {toast.msg}
        </div>
      )}

      {/* HEADER */}
      <header style={{position:"sticky",top:0,zIndex:100,background:"rgba(13,13,13,0.97)",
        backdropFilter:"blur(12px)",borderBottom:"1px solid #222",height:64,
        display:"flex",alignItems:"center",padding:"0 20px",gap:16}}>
        <div style={{fontWeight:"bold",fontSize:14,letterSpacing:2,color:"#ffdc32",
          cursor:"pointer",flexShrink:0}} onClick={()=>setView("markets")}>
          SM<span style={{color:"#e8e0d0"}}>.</span>
        </div>
        <nav style={{display:"flex",gap:2,flex:1,overflow:"auto"}}>
          {[["markets","📊 Marchés"],["clotures","📁 Clôturés"],["leaderboard","🏆 Classement"],["shop","🛒 Boutique"],["stats","📈 Stats"],["casino","🃏 Casino"]].map(([v,lbl])=>(
            <button key={v} onClick={()=>setView(v)} style={{
              background:view===v?"#ffdc3215":"transparent",
              color:view===v?"#ffdc32":"#555",border:"none",
              padding:"6px 12px",borderRadius:6,cursor:"pointer",
              fontSize:9,fontWeight:"bold",fontFamily:"inherit",
              letterSpacing:1,whiteSpace:"nowrap"}}>
              {lbl}
            </button>
          ))}
          {isAdmin && (
            <button onClick={()=>setView("admin")} style={{
              background:view==="admin"?"#a855f715":"transparent",
              color:view==="admin"?"#a855f7":"#444",border:"none",
              padding:"6px 12px",borderRadius:6,cursor:"pointer",
              fontSize:9,fontWeight:"bold",fontFamily:"inherit",letterSpacing:1,position:"relative"}}>
              👑 ADMIN
              {pendingRenames.length>0&&(
                <span style={{position:"absolute",top:2,right:2,background:"#ef4444",color:"#fff",
                  fontSize:8,padding:"1px 4px",borderRadius:10,lineHeight:1.2}}>
                  {pendingRenames.length}
                </span>
              )}
            </button>
          )}
        </nav>
        <div style={{display:"flex",gap:16,alignItems:"center",flexShrink:0}}>
          {me ? (
            <>
              {/* Cloche notifs */}
              <div style={{position:"relative"}} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>{setNotifOpen(o=>!o); if(unreadCount>0) markNotifsRead();}}
                  style={{background:"transparent",border:"1px solid #2a2a2a",color:"#ccc",
                    padding:"5px 9px",borderRadius:6,cursor:"pointer",fontSize:14,
                    position:"relative"}}>
                  🔔
                  {unreadCount>0&&(
                    <span style={{position:"absolute",top:-4,right:-4,background:"#ef4444",color:"#fff",
                      fontSize:8,padding:"1px 4px",borderRadius:10,lineHeight:1.4,fontWeight:"bold",
                      minWidth:14,textAlign:"center"}}>
                      {unreadCount}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <div style={{position:"absolute",right:0,top:40,width:300,background:"#111",
                    border:"1px solid #2a2a2a",borderRadius:10,zIndex:300,
                    boxShadow:"0 8px 32px rgba(0,0,0,0.6)",overflow:"hidden"}}>
                    <div style={{padding:"10px 14px",borderBottom:"1px solid #222",
                      fontSize:9,color:"#555",letterSpacing:2,fontWeight:"bold"}}>
                      NOTIFICATIONS
                    </div>
                    <div style={{maxHeight:320,overflowY:"auto"}}>
                      {(myUserFresh?.notifications||[]).length===0 ? (
                        <div style={{padding:"24px 14px",textAlign:"center",color:"#333",fontSize:11}}>
                          Aucune notification
                        </div>
                      ) : [...(myUserFresh?.notifications||[])].reverse().map(n=>(
                        <div key={n.id} style={{padding:"10px 14px",borderBottom:"1px solid #1a1a1a",
                          background:n.isAnnouncement?"#0a0a1a":n.read?"transparent":"#ffffff04",
                          borderLeft:n.isAnnouncement?"2px solid #6366f1":"2px solid transparent"}}>
                          <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
                            <span style={{fontSize:16,flexShrink:0}}>{n.marketEmoji}</span>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:10,color:n.isAnnouncement?"#a5b4fc":"#ccc",
                                fontWeight:n.isAnnouncement?"bold":"normal",
                                marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                                {n.marketTitle}
                              </div>
                              {n.isAnnouncement ? (
                                <div style={{fontSize:9,color:"#6366f1",cursor:"pointer",marginTop:2}}
                                  onClick={()=>setAnnounceOpen(n)}>
                                  → Lire l'annonce
                                </div>
                              ) : n.isMilestone ? (
                                <div style={{fontSize:11,fontWeight:"bold",color:"#ffd700"}}>
                                  🏆 Palier débloqué !
                                </div>
                              ) : (
                                <>
                                  <div style={{fontSize:11,fontWeight:"bold",
                                    color:n.won?"#10b981":"#ef4444"}}>
                                    {n.profit===0?"":n.won
                                      ? `🎉 Gagné ! +${n.profit.toLocaleString()} SC`
                                      : `😢 Perdu — ${Math.abs(n.profit).toLocaleString()} SC`}
                                  </div>
                                  <div style={{fontSize:9,color:"#333",marginTop:2}}>
                                    {n.amount>0?`Mise : ${n.amount} SC · `:""}
                                    {new Date(n.ts).toLocaleDateString("fr-FR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button onClick={()=>{setProfileUser(myUserFresh||me);setView("profile");}}
                style={{background:"transparent",border:"1px solid #2a2a2a",color:"#ccc",
                  padding:"5px 10px",borderRadius:6,cursor:"pointer",fontSize:10,
                  fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:14}}>{me.avatar}</span>
                <span style={{fontSize:10}}>{me.pseudo}</span>
                <span style={{fontSize:11,color:"#ffdc32",fontWeight:"bold"}}>{(myUserFresh||me).wallet.toLocaleString()} SC</span>
              </button>
              <button onClick={()=>{setMe(null);setView("markets");}}
                style={{background:"transparent",border:"1px solid #2a2a2a",color:"#444",
                  padding:"5px 8px",borderRadius:6,cursor:"pointer",fontSize:9,fontFamily:"inherit"}}>
                ⎋
              </button>
            </>
          ) : (
            <button onClick={()=>setView("auth")} style={{background:"#ffdc32",color:"#0d0d0d",
              border:"none",padding:"6px 14px",borderRadius:6,cursor:"pointer",
              fontWeight:"bold",fontSize:9,fontFamily:"inherit",letterSpacing:1}}>
              CONNEXION →
            </button>
          )}
        </div>
      </header>

      {/* AUTH */}
      {view==="auth" && (
        <div style={{maxWidth:400,margin:"60px auto",padding:"0 20px"}}>
          <div style={{background:"#141414",border:"1px solid #2a2a2a",borderRadius:12,padding:28}}>
            <div style={{display:"flex",gap:2,marginBottom:24}}>
              {[["login","CONNEXION"],["register","INSCRIPTION"]].map(([m,lbl])=>(
                <button key={m} onClick={()=>{setAuthMode(m);setAuthErr("");}}
                  style={{flex:1,padding:"8px",border:"none",borderRadius:6,cursor:"pointer",
                    fontWeight:"bold",fontSize:9,fontFamily:"inherit",letterSpacing:1,
                    background:authMode===m?"#ffdc32":"#1a1a1a",color:authMode===m?"#0d0d0d":"#444"}}>
                  {lbl}
                </button>
              ))}
            </div>
            {authMode==="register" && (
              <Field label="AVATAR">
                <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                  {AVATARS.map(a=>(
                    <button key={a} onClick={()=>setAuthAvatar(a)} style={{
                      fontSize:18,background:authAvatar===a?"#ffdc3215":"transparent",
                      border:authAvatar===a?"2px solid #ffdc32":"2px solid transparent",
                      borderRadius:10,padding:4,cursor:"pointer"}}>{a}</button>
                  ))}
                </div>
              </Field>
            )}
            <Field label="PSEUDO">
              <input value={authPseudo} onChange={e=>setAuthPseudo(e.target.value)}
                placeholder="Ton pseudo..."
                style={{width:"100%",background:"#0d0d0d",border:"1px solid #2a2a2a",color:"#e8e0d0",
                  padding:"10px 12px",borderRadius:6,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
            </Field>
            <Field label="MOT DE PASSE">
              <PwField value={authPw} onChange={e=>setAuthPw(e.target.value)}/>
            </Field>
            {authMode==="register" && (
              <Field label="CONFIRMER MOT DE PASSE">
                <PwField value={authPw2} onChange={e=>setAuthPw2(e.target.value)} placeholder="Répète ton mot de passe"/>
              </Field>
            )}
            {authErr && <div style={{color:"#ef4444",fontSize:11,marginBottom:16,padding:"8px 12px",background:"#1a0505",borderRadius:6}}>{authErr}</div>}
            <button onClick={authMode==="login"?handleLogin:handleRegister}
              style={{...S.btn("#ffdc32","#0d0d0d")}}>
              {authMode==="login"?"→ SE CONNECTER":"→ CRÉER MON COMPTE"}
            </button>
            {authMode==="login" && (
              <div style={{marginTop:12,textAlign:"center",fontSize:10,color:"#333"}}>
                Admin ?{" "}
                <span onClick={()=>setAdminPwModal(true)}
                  style={{color:"#a855f7",cursor:"pointer",textDecoration:"underline"}}>
                  Connexion admin
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PROFIL */}
      {view==="profile" && profileUser && (()=>{
        const pu = usersRef.current.find(u=>u.id===profileUser.id)||profileUser;
        const stats = computeStats(pu.id, markets);
        const total = stats.wins+stats.losses;
        const myBets = markets
          .filter(m=>(m.bets||[]).some(b=>b.userId===pu.id&&!b.isPenalty))
          .map(m=>({...m.bets.find(b=>b.userId===pu.id&&!b.isPenalty), market:m}));
        const isMeProfile = me?.id===pu.id;
        const canRenameNow = pu.canRename && isMeProfile;
        return (
          <div style={{maxWidth:700,margin:"0 auto",padding:"28px 20px",position:"relative",zIndex:1}}>
            <button onClick={()=>setView("markets")} style={{background:"transparent",border:"none",
              color:"#444",cursor:"pointer",fontSize:11,fontFamily:"inherit",marginBottom:16,padding:0}}>
              ← Retour
            </button>
            <div style={{background:"#141414",border:"1px solid #2a2a2a",borderRadius:12,padding:24,marginBottom:16}}>
              <div style={{display:"flex",gap:16,alignItems:"flex-start",flexWrap:"wrap"}}>
                <div style={{fontSize:52}}>{pu.avatar}</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
                    <div style={{fontSize:20,fontWeight:"bold"}}>{pu.pseudo}</div>
                    {pu.isAdmin&&<span style={{fontSize:9,color:"#a855f7",background:"#a855f715",padding:"2px 8px",borderRadius:6}}>ADMIN</span>}
                    {pu.banned&&<span style={{fontSize:9,color:"#ef4444",background:"#1a0505",padding:"2px 8px",borderRadius:6}}>BANNI</span>}
                  </div>
                  <div style={{fontSize:22,fontWeight:"bold",color:"#ffdc32",marginTop:6}}>
                    {pu.wallet.toLocaleString()} SC
                  </div>
                  {pu.debt>0 && (
                    <div style={{fontSize:10,color:"#ef4444",marginTop:4,padding:"4px 10px",
                      background:"#1a0505",borderRadius:6,border:"1px solid #ef444430",
                      display:"inline-flex",alignItems:"center",gap:6}}>
                      💳 Crédit en cours : {pu.debt} SC — remboursé automatiquement à 500 SC
                    </div>
                  )}
                  <div style={{display:"flex",gap:16,marginTop:10,flexWrap:"wrap"}}>
                    {[["🏆",stats.wins,"Victoires","#10b981"],["💀",stats.losses,"Défaites","#ef4444"],
                      ["📊",total>0?Math.round(stats.wins/total*100)+"%":"—","Win rate","#ffdc32"],
                      ["💰",(pu.wallet-1000>=0?"+":"")+(pu.wallet-1000).toLocaleString(),"Profit","#a855f7"]
                    ].map(([icon,val,label,color])=>(
                      <div key={label} style={{textAlign:"center"}}>
                        <div style={{fontSize:16}}>{icon}</div>
                        <div style={{fontSize:16,fontWeight:"bold",color}}>{val}</div>
                        <div style={{fontSize:8,color:"#444",letterSpacing:1}}>{label}</div>
                      </div>
                    ))}
                    {stats.streak>=2&&(
                      <div style={{textAlign:"center"}}>
                        <div style={{fontSize:16}}>🔥</div>
                        <div style={{fontSize:16,fontWeight:"bold",color:"#f97316"}}>{stats.streak}</div>
                        <div style={{fontSize:8,color:"#444",letterSpacing:1}}>STREAK</div>
                      </div>
                    )}
                    {stats.bestStreak>=3&&(
                      <div style={{textAlign:"center"}}>
                        <div style={{fontSize:16}}>⭐</div>
                        <div style={{fontSize:16,fontWeight:"bold",color:"#fbbf24"}}>{stats.bestStreak}</div>
                        <div style={{fontSize:8,color:"#444",letterSpacing:1}}>RECORD</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {isMeProfile && !pu.isAdmin && (
                <div style={{marginTop:16,paddingTop:16,borderTop:"1px solid #1a1a1a"}}>
                  {canRenameNow ? (
                    <>
                      <div style={{fontSize:10,color:"#10b981",marginBottom:16,background:"#0a150a",
                        padding:"8px 12px",borderRadius:6,border:"1px solid #10b98130"}}>
                        ✅ L'admin a autorisé ton changement de pseudo !
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <input value={myRenamInput} onChange={e=>setMyRenamInput(e.target.value)}
                          placeholder="Nouveau pseudo..."
                          style={{flex:1,background:"#0d0d0d",border:"1px solid #2a2a2a",color:"#e8e0d0",
                            padding:"8px 12px",borderRadius:6,fontSize:12,fontFamily:"inherit",outline:"none"}}/>
                        <button onClick={applyRename} style={{background:"#ffdc32",color:"#0d0d0d",border:"none",
                          padding:"8px 14px",borderRadius:6,cursor:"pointer",fontWeight:"bold",
                          fontSize:10,fontFamily:"inherit"}}>OK</button>
                      </div>
                      {myRenamErr&&<div style={{color:"#ef4444",fontSize:10,marginTop:6}}>{myRenamErr}</div>}
                    </>
                  ) : pu.renameRequest ? (
                    <div style={{fontSize:10,color:"#ffdc32",padding:"8px 12px",background:"#14120a",
                      borderRadius:6,border:"1px solid #ffdc3220"}}>
                      ⏳ Demande en attente : « {pu.renameRequest} »
                    </div>
                  ) : (
                    <>
                      {!myRenamReq ? (
                        <button onClick={()=>setMyRenamReq(true)}
                          style={{background:"transparent",border:"1px solid #2a2a2a",color:"#444",
                            padding:"6px 14px",borderRadius:6,cursor:"pointer",fontSize:9,
                            fontFamily:"inherit",letterSpacing:1}}>
                          ✏️ Demander un changement de pseudo
                        </button>
                      ) : (
                        <>
                          <div style={{display:"flex",gap:16,marginBottom:6}}>
                            <input value={myRenamInput} onChange={e=>setMyRenamInput(e.target.value)}
                              placeholder="Pseudo souhaité..."
                              style={{flex:1,background:"#0d0d0d",border:"1px solid #2a2a2a",color:"#e8e0d0",
                                padding:"8px 12px",borderRadius:6,fontSize:12,fontFamily:"inherit",outline:"none"}}/>
                            <button onClick={requestRename}
                              style={{background:"#ffdc32",color:"#0d0d0d",border:"none",
                                padding:"8px 14px",borderRadius:6,cursor:"pointer",fontWeight:"bold",
                                fontSize:10,fontFamily:"inherit"}}>Envoyer</button>
                            <button onClick={()=>{setMyRenamReq(false);setMyRenamInput("");setMyRenamErr("");}}
                              style={{background:"transparent",border:"1px solid #2a2a2a",color:"#444",
                                padding:"8px 12px",borderRadius:6,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>✕</button>
                          </div>
                          {myRenamErr&&<div style={{color:"#ef4444",fontSize:10}}>{myRenamErr}</div>}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            {/* ── BADGES DE PALIER ── */}
            {(pu.unlockedMilestones||[]).length>0 && (
              <div style={{background:"#141414",border:"1px solid #2a2a2a",borderRadius:12,
                padding:"18px 22px",marginBottom:16}}>
                <div style={{fontSize:9,color:"#444",letterSpacing:2,fontWeight:"bold",marginBottom:10}}>
                  🏆 PALIERS ATTEINTS
                </div>
                <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                  {MILESTONES.filter(m=>(pu.unlockedMilestones||[]).includes(m.id)).map(m=>(
                    <div key={m.id} style={{background:"#111",border:`1px solid ${m.color}40`,
                      borderRadius:8,padding:"6px 12px",display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:13}}>{m.name.split(" ")[0]}</span>
                      <div>
                        <div style={{fontSize:10,fontWeight:"bold",color:m.color}}>{m.name.slice(m.name.indexOf(" ")+1)}</div>
                        <div style={{fontSize:8,color:"#444"}}>{m.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── HISTORIQUE DU WALLET ── */}
            {(() => {
              const notifs = (pu.notifications||[]).filter(n=>n.won!==undefined);
              if (notifs.length===0) return null;
              const sorted = [...notifs].sort((a,b)=>a.ts-b.ts);
              let running = pu.wallet;
              const points = [];
              const reversed = [...sorted].reverse();
              for (const n of reversed) {
                points.unshift({ts:n.ts, val:running});
                running -= n.profit;
              }
              points.push({ts:Date.now(), val:pu.wallet});
              const W=480, H=80;
              const vals = points.map(p=>p.val);
              const minV = Math.min(...vals);
              const maxV = Math.max(...vals);
              const range = maxV-minV || 1;
              const px = (i) => (i/(points.length-1||1))*W;
              const py = (v) => H - ((v-minV)/range)*(H-8) - 4;
              const pathD = points.map((p,i)=>`${i===0?"M":"L"}${px(i).toFixed(1)},${py(p.val).toFixed(1)}`).join(" ");
              const isUp = pu.wallet >= (points[0]?.val||pu.wallet);
              const lineColor = isUp ? "#10b981" : "#ef4444";
              return (
                <div style={{background:"#141414",border:"1px solid #2a2a2a",borderRadius:12,marginBottom:16,overflow:"hidden"}}>
                  <div style={{padding:"12px 16px",borderBottom:"1px solid #222",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontSize:10,fontWeight:"bold",color:"#444",letterSpacing:2}}>ÉVOLUTION DU WALLET</div>
                    <div style={{fontSize:11,fontWeight:"bold",color:isUp?"#10b981":"#ef4444"}}>
                      {isUp?"↗":"↘"} {pu.wallet.toLocaleString()} SC
                    </div>
                  </div>
                  <div style={{padding:"12px 16px 8px"}}>
                    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block"}}>
                      {minV<=1000&&maxV>=1000&&(
                        <line x1={0} y1={py(1000)} x2={W} y2={py(1000)}
                          stroke="#333" strokeWidth={1} strokeDasharray="4,4"/>
                      )}
                      <path d={`${pathD} L${W},${H} L0,${H} Z`} fill={lineColor} fillOpacity={0.08}/>
                      <path d={pathD} fill="none" stroke={lineColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx={px(points.length-1)} cy={py(pu.wallet)} r={4} fill={lineColor}/>
                    </svg>
                  </div>
                  <div style={{borderTop:"1px solid #1a1a1a"}}>
                    <div style={{padding:"8px 16px",fontSize:9,color:"#555",letterSpacing:2,fontWeight:"bold"}}>DERNIÈRES TRANSACTIONS</div>
                    {[...sorted].reverse().slice(0,10).map(n=>(
                      <div key={n.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 16px",borderTop:"1px solid #0d0d0d"}}>
                        <span style={{fontSize:15,flexShrink:0}}>{n.marketEmoji}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#ccc"}}>{n.marketTitle}</div>
                          <div style={{fontSize:9,color:"#444",marginTop:1}}>Mise : {n.amount} SC · {new Date(n.ts).toLocaleDateString("fr-FR",{day:"numeric",month:"short"})}</div>
                        </div>
                        <div style={{fontSize:11,fontWeight:"bold",flexShrink:0,color:n.won?"#10b981":"#ef4444"}}>
                          {n.won?`+${n.profit.toLocaleString()}`:`−${Math.abs(n.profit).toLocaleString()}`} SC
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            <div style={{background:"#141414",border:"1px solid #2a2a2a",borderRadius:12,overflow:"hidden"}}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid #222",fontSize:10,
                fontWeight:"bold",color:"#444",letterSpacing:2}}>HISTORIQUE DES PARIS</div>
              {myBets.length===0 ? (
                <div style={{padding:20,textAlign:"center",color:"#2a2a2a",fontSize:12}}>Aucun pari</div>
              ) : myBets.slice().reverse().map((b,i)=>{
                const won=b.market.resolved?b.market.result===b.side:null;
                return (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 16px",borderBottom:"1px solid #1a1a1a"}}>
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

      {/* MARCHÉS */}
      {view==="markets" && (
        <>
          <div style={{background:"linear-gradient(135deg,#140f00,#0d0d0d 55%,#001209)",
            borderBottom:"1px solid #222",padding:"26px 20px 20px",position:"relative",zIndex:1}}>
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

          {/* ── MARCHÉ EN VEDETTE ── */}
          {(()=>{
            const featured = markets.find(m=>m.pinned&&!m.resolved);
            if (!featured) return null;
            const odds = computeOdds(featured);
            const myBet = myBetOn(featured);
            const isMine = featured.creatorId===me?.id;
            return (
              <div style={{background:"linear-gradient(135deg,#1a1200,#0d0d0d)",
                borderBottom:"1px solid #ffd70030",padding:"14px 20px"}}>
                <div style={{maxWidth:1080,margin:"0 auto"}}>
                  <div style={{fontSize:8,color:"#ffd700",letterSpacing:3,fontWeight:"bold",marginBottom:8}}>
                    ⭐ PARI EN VEDETTE
                  </div>
                  <div style={{background:"#111",border:"2px solid #ffd70040",borderRadius:10,padding:20,
                    boxShadow:"0 0 20px #ffd70010"}}>
                    <div style={{display:"flex",gap:16,alignItems:"flex-start",flexWrap:"wrap"}}>
                      <span style={{fontSize:28}}>{featured.emoji}</span>
                      <div style={{flex:1,minWidth:200}}>
                        <div style={{fontSize:14,fontWeight:"bold",marginBottom:6,color:"#fff"}}>
                          {featured.title}
                        </div>
                        <div style={{display:"flex",gap:4,marginBottom:6}}>
                          <div style={{flex:odds.yesPct,background:"#10b98120",height:6,borderRadius:6,position:"relative",overflow:"hidden"}}>
                            <div style={{position:"absolute",inset:0,background:"#10b981",width:`${odds.yesPct}%`,borderRadius:6}}/>
                          </div>
                          <div style={{flex:odds.noPct,background:"#ef444420",height:6,borderRadius:6,position:"relative",overflow:"hidden"}}>
                            <div style={{position:"absolute",inset:0,background:"#ef4444",width:`${odds.noPct}%`,borderRadius:6}}/>
                          </div>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:10}}>
                          <span style={{color:"#10b981"}}>OUI {odds.yesPct}%</span>
                          <span style={{color:"#ffd700",fontWeight:"bold"}}>{odds.total.toLocaleString()} SC misés</span>
                          <span style={{color:"#ef4444"}}>NON {odds.noPct}%</span>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
                        {!myBet && me && !me.banned && !isMine && (
                          <button onClick={()=>{setBetModal(featured);setBetSide(null);setBetAmount(50);}}
                            style={{background:"#ffd700",color:"#0d0d0d",border:"none",
                              padding:"8px 16px",borderRadius:6,cursor:"pointer",
                              fontSize:10,fontWeight:"bold",fontFamily:"inherit"}}>
                            → PARIER
                          </button>
                        )}
                        {myBet && (
                          <div style={{fontSize:10,color:myBet.side==="yes"?"#10b981":"#ef4444",
                            background:myBet.side==="yes"?"#0a150a":"#1a0505",
                            padding:"6px 10px",borderRadius:6,border:`1px solid ${myBet.side==="yes"?"#10b98130":"#ef444430"}`}}>
                            ✓ {myBet.side==="yes"?"OUI":"NON"} · {myBet.amount} SC
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── LOTERIE HEBDOMADAIRE ── */}
          {(()=>{
            const weekKey = getWeekKey();
            const lot = lottery;
            const participants = lot.participants||[];
            const alreadyIn = me && lot.week===weekKey && participants.find(p=>p.userId===me.id);
            return (
              <div style={{background:"linear-gradient(90deg,#0a0a1a,#0d0d0d,#0a0a1a)",
                borderBottom:"1px solid #6366f130",padding:"10px 20px"}}>
                <div style={{maxWidth:1080,margin:"0 auto",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
                  <div style={{fontSize:9,color:"#6366f1",letterSpacing:3,fontWeight:"bold",whiteSpace:"nowrap"}}>
                    🎰 LOTERIE DE LA SEMAINE
                  </div>
                  <div style={{flex:1,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                    <span style={{fontSize:13,fontWeight:"bold",color:"#ffdc32"}}>
                      💰 {(lot.week===weekKey?lot.pool:0).toLocaleString()} SC en jeu
                    </span>
                    <span style={{fontSize:10,color:"#444"}}>
                      {lot.week===weekKey?participants.length:0} participant{participants.length>1?"s":""}
                    </span>
                    {alreadyIn && (
                      <span style={{fontSize:9,color:"#10b981",background:"#0a150a",
                        padding:"2px 8px",borderRadius:6,border:"1px solid #10b98130"}}>
                        🎟 Tu as ton ticket !
                      </span>
                    )}
                  </div>
                  {!alreadyIn && (
                    <button onClick={buyLotteryTicket}
                      style={{background:"#6366f1",color:"#fff",border:"none",
                        padding:"5px 14px",borderRadius:6,cursor:"pointer",
                        fontSize:9,fontWeight:"bold",fontFamily:"inherit",
                        letterSpacing:1,flexShrink:0,whiteSpace:"nowrap"}}>
                      🎟 Ticket — 50 SC
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          <div style={{position:"sticky",top:58,zIndex:90,background:"rgba(13,13,13,0.97)",
            backdropFilter:"blur(12px)",borderBottom:"1px solid #222",
            padding:"0 20px",display:"flex",gap:4,alignItems:"center",height:44,overflowX:"auto"}}>
            {["tous","profs","eleves","cours","vie scolaire","hors les murs"].map(cat=>(
              <button key={cat} onClick={()=>setFilter(cat)} style={{
                background:filter===cat?"#ffdc32":"transparent",color:filter===cat?"#0d0d0d":"#555",
                border:filter===cat?"none":"1px solid #252525",padding:"4px 12px",borderRadius:6,
                cursor:"pointer",fontSize:9,fontWeight:"bold",fontFamily:"inherit",
                letterSpacing:1,textTransform:"uppercase",whiteSpace:"nowrap",flexShrink:0}}>{cat}</button>
            ))}
            <div style={{flex:1}}/>
            {me && !me.banned && (
              <button onClick={()=>setCreateOpen(true)} style={{background:"#ffdc32",color:"#0d0d0d",
                border:"none",padding:"5px 12px",borderRadius:6,cursor:"pointer",
                fontWeight:"bold",fontSize:9,fontFamily:"inherit",letterSpacing:1,flexShrink:0}}>
                + CRÉER ({markets.filter(m=>m.creatorId===me.id&&!m.resolved).length}/2)
              </button>
            )}
          </div>

          <main style={{maxWidth:1080,margin:"0 auto",padding:"20px",position:"relative",zIndex:1}}>
            {filtered.length===0 && (
              <div style={{textAlign:"center",padding:"80px 0",color:"#2a2a2a",fontSize:13}}>
                Aucun marché.{" "}
                {me&&<span onClick={()=>setCreateOpen(true)} style={{color:"#ffdc32",cursor:"pointer"}}>Crée-en un →</span>}
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
              {filtered.map(mkt=>{
                const odds=computeOdds(mkt);
                const myBet=myBetOn(mkt);
                const isMine=mkt.creatorId===me?.id;
                return (
                  <div key={mkt.id} style={{background:"#141414",border:"1px solid #2a2a2a",borderRadius:12,
                    padding:20,cursor:"pointer",transition:"border-color 0.15s",
                    opacity:mkt.resolved?0.6:1,position:"relative"}}
                    onMouseEnter={e=>!mkt.resolved&&(e.currentTarget.style.borderColor="#333")}
                    onMouseLeave={e=>e.currentTarget.style.borderColor="#1a1a1a"}>
                    <div style={{position:"absolute",top:10,right:10,fontSize:8,fontWeight:"bold",
                      letterSpacing:2,color:CAT_COLOR[mkt.category]||"#444",
                      background:`${CAT_COLOR[mkt.category]||"#444"}15`,padding:"2px 6px",borderRadius:6}}>
                      {mkt.category?.toUpperCase()}
                    </div>
                    <div style={{fontSize:22,marginBottom:8}}>{mkt.emoji}</div>
                    <div style={{fontSize:13,fontWeight:"bold",lineHeight:1.4,marginBottom:10,paddingRight:60}}>
                      {mkt.title}
                      {mkt.resolved&&<span style={{marginLeft:8,fontSize:9,color:mkt.result==="yes"?"#10b981":"#ef4444",
                        background:mkt.result==="yes"?"#0a150a":"#1a0505",padding:"2px 6px",borderRadius:6}}>
                        {mkt.result==="yes"?"✅ OUI":"❌ NON"}</span>}
                    </div>
                    <div style={{display:"flex",gap:4,marginBottom:10}}>
                      <div style={{flex:odds.yesPct,background:"#10b98120",height:6,borderRadius:6,position:"relative",overflow:"hidden"}}>
                        <div style={{position:"absolute",inset:0,background:"#10b981",width:`${odds.yesPct}%`,borderRadius:6}}/>
                      </div>
                      <div style={{flex:odds.noPct,background:"#ef444420",height:6,borderRadius:6,position:"relative",overflow:"hidden"}}>
                        <div style={{position:"absolute",inset:0,background:"#ef4444",width:`${odds.noPct}%`,borderRadius:6}}/>
                      </div>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#444",marginBottom:8}}>
                      <span style={{color:"#10b981",fontWeight:"bold",fontSize:13}}>OUI <span style={{fontSize:12}}>x{odds.yesTotal>0?(odds.total/odds.yesTotal).toFixed(2):"0"}</span></span>
                      <span style={{color:"#ffdc32",fontWeight:"bold"}}>{odds.total.toLocaleString()} SC misés</span>
                      <span style={{color:"#ef4444",fontWeight:"bold",fontSize:13}}>NON <span style={{fontSize:12}}>x{odds.noTotal>0?(odds.total/odds.noTotal).toFixed(2):"0"}</span></span>
                    </div>
                    {!mkt.resolved && (()=>{
                      const ref100 = myBet ? myBet.amount : 100;
                      const label = myBet ? "Ta mise" : "Ex:";
                      if (myBet) {
                        const gainSide = myBet.side==="yes"
                          ? (odds.yesTotal>0?Math.round(ref100*odds.total/odds.yesTotal):ref100)
                          : (odds.noTotal>0?Math.round(ref100*odds.total/odds.noTotal):ref100);
                        const color = myBet.side==="yes"?"#10b981":"#ef4444";
                        const emoji = myBet.side==="yes"?"✅":"❌";
                        return (
                          <div style={{fontSize:9,color:"#fff",marginBottom:10,padding:"5px 8px",
                            background:"#0a0a0a",borderRadius:6,textAlign:"center"}}>
                            {emoji} <span style={{fontWeight:"bold"}}>{label} {ref100} SC →</span> <span style={{color,fontWeight:"bold"}}>{gainSide} SC</span>
                          </div>
                        );
                      }
                      return (
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:9,
                          color:"#333",marginBottom:10,padding:"5px 8px",
                          background:"#0a0a0a",borderRadius:6}}>
                          <span>✅ {label} {ref100} SC → <span style={{color:"#10b981",fontWeight:"bold"}}>{odds.yesTotal>0?Math.round(ref100*odds.total/odds.yesTotal):ref100} SC</span></span>
                          <span>❌ {label} {ref100} SC → <span style={{color:"#ef4444",fontWeight:"bold"}}>{odds.noTotal>0?Math.round(ref100*odds.total/odds.noTotal):ref100} SC</span></span>
                        </div>
                      );
                    })()}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{fontSize:9,color:"#555"}}>par <span style={{color:"#888"}}>{mkt.creatorPseudo}</span></div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        {mkt.deadline && !mkt.resolved && (
                          <span style={{fontSize:9,fontWeight:"bold",
                            color:Date.now()>mkt.deadline?"#ef4444":Date.now()>mkt.deadline-3600000?"#f97316":"#444"}}>
                            {getCountdown(mkt.deadline)}
                          </span>
                        )}
                        {!mkt.resolved && me && !me.banned && !myBet && !isMine && (
                          <button onClick={e=>{e.stopPropagation();setBetModal(mkt);setBetSide(null);setBetAmount(50);}}
                            style={{background:"#ffdc32",color:"#0d0d0d",border:"none",
                              padding:"5px 10px",borderRadius:6,cursor:"pointer",
                              fontSize:9,fontWeight:"bold",fontFamily:"inherit"}}>
                            → PARIER
                          </button>
                        )}
                        {myBet && !mkt.resolved && (
                          <button onClick={e=>{e.stopPropagation();setDelConfirm({type:"bet",market:mkt});}}
                            style={{background:"#ef444415",color:"#ef4444",border:"1px solid #ef444430",
                              padding:"5px 8px",borderRadius:6,cursor:"pointer",fontSize:9,fontFamily:"inherit"}}>
                            ↩ {myBet.side==="yes"?"OUI":"NON"} · {myBet.amount} SC
                          </button>
                        )}
                        {myBet && (
                          <div style={{fontSize:9,color:myBet.side==="yes"?"#10b981":"#ef4444",
                            background:myBet.side==="yes"?"#0a150a":"#1a0505",
                            padding:"5px 8px",borderRadius:6,border:`1px solid ${myBet.side==="yes"?"#10b98130":"#ef444430"}`}}>
                            {mkt.resolved?(myBet.side===mkt.result?"GAGNÉ 🎉":"PERDU 😢"):
                              `✓ ${myBet.side==="yes"?"OUI":"NON"} · ${myBet.amount} SC`}
                          </div>
                        )}
                        {(isMine||isAdmin) && !mkt.resolved && (
                          <button onClick={e=>{e.stopPropagation();setDelConfirm({type:"market",market:mkt});}}
                            style={{background:"transparent",border:"1px solid #2a2a2a",color:"#333",
                              padding:"5px 8px",borderRadius:6,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>
                            🗑
                          </button>
                        )}
                      </div>
                    </div>
                    {isAdmin&&!mkt.resolved&&(
                      <button onClick={e=>{e.stopPropagation();setResolveModal(mkt);}}
                        style={{marginTop:8,width:"100%",background:"#a855f715",
                          border:"1px solid #a855f730",color:"#a855f7",padding:"6px",
                          borderRadius:6,cursor:"pointer",fontSize:9,fontFamily:"inherit",fontWeight:"bold",letterSpacing:1}}>
                        👑 CLÔTURER CE MARCHÉ</button>
                    )}
                    {isAdmin&&mkt.resolved&&(
                      <button onClick={e=>{e.stopPropagation();setDelConfirm({type:"market",market:mkt});}}
                        style={{marginTop:8,width:"100%",background:"#ef444410",
                          border:"1px solid #ef444425",color:"#ef4444",padding:"6px",
                          borderRadius:6,cursor:"pointer",fontSize:9,fontFamily:"inherit",fontWeight:"bold",letterSpacing:1}}>
                        🗑 SUPPRIMER CE MARCHÉ RÉSOLU</button>
                    )}
                  </div>
                );
              })}
            </div>
          </main>
        </>
      )}

      {/* LEADERBOARD */}
      {view==="leaderboard" && (
        <div style={{maxWidth:820,margin:"0 auto",padding:"28px 20px",position:"relative",zIndex:1}}>
          <div style={{marginBottom:24}}>
            <div style={{fontSize:8,color:"#ffdc32",letterSpacing:4,marginBottom:5}}>CLASSEMENT GÉNÉRAL</div>
            <div style={{fontSize:24,fontWeight:"bold"}}>🏆 Meilleurs parieurs</div>
          </div>

          {/* Bandeau organisateur */}
          {(()=>{
            const admin = users.find(u=>u.isAdmin);
            if (!admin) return null;
            const adminStats = computeStats(admin.id, markets);
            const total = adminStats.wins + adminStats.losses;
            return (
              <div style={{background:"linear-gradient(135deg,#1a0a2e,#0d0d0d)",
                border:"1px solid #a855f730",borderRadius:10,padding:"18px 22px",
                marginBottom:20,display:"flex",alignItems:"center",gap:14}}>
                <div style={{fontSize:36}}>{admin.avatar}</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:2}}>
                    <span style={{fontSize:14,fontWeight:"bold",color:"#a855f7"}}>{admin.pseudo}</span>
                    <span style={{fontSize:8,color:"#a855f7",background:"#a855f715",
                      padding:"2px 7px",borderRadius:6,letterSpacing:2}}>ORGANISATEUR</span>
                  </div>
                  <div style={{fontSize:9,color:"#555"}}>
                    Créateur de SchoolMarket · Hors compétition
                  </div>
                </div>
                <div style={{display:"flex",gap:16,textAlign:"center"}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:"bold",color:"#ffdc32"}}>{admin.wallet.toLocaleString()}</div>
                    <div style={{fontSize:8,color:"#444",letterSpacing:1}}>SC</div>
                  </div>
                  <div>
                    <div style={{fontSize:14,fontWeight:"bold",color:"#10b981"}}>{adminStats.wins}</div>
                    <div style={{fontSize:8,color:"#444",letterSpacing:1}}>VICTOIRES</div>
                  </div>
                  <div>
                    <div style={{fontSize:14,fontWeight:"bold",color:"#ccc"}}>{total>0?Math.round(adminStats.wins/total*100):0}%</div>
                    <div style={{fontSize:8,color:"#444",letterSpacing:1}}>WIN RATE</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Meilleur / Pire de la semaine dans le classement */}
          {(weeklyBestUser || weeklyWorstUser) && (
            <div style={{display:"flex",gap:16,marginBottom:20,flexWrap:"wrap"}}>
              {weeklyBestUser && (
                <div style={{flex:1,minWidth:200,background:"#0a1a0a",border:"1px solid #10b98130",
                  borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:9,color:"#10b981",letterSpacing:2,fontWeight:"bold",whiteSpace:"nowrap"}}>⭐ MEILLEUR</span>
                  <span style={{fontSize:16}}>{weeklyBestUser.avatar}</span>
                  <span style={{fontSize:12,fontWeight:"bold",color:"#10b981"}}>{weeklyBestUser.pseudo}</span>
                  <span style={{fontSize:10,color:"#10b981",marginLeft:"auto"}}>+{weeklyBest.profit.toLocaleString()} SC</span>
                </div>
              )}
              {weeklyWorstUser && (
                <div style={{flex:1,minWidth:200,background:"#1a0505",border:"1px solid #ef444430",
                  borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:9,color:"#ef4444",letterSpacing:2,fontWeight:"bold",whiteSpace:"nowrap"}}>🤡 PIRE</span>
                  <span style={{fontSize:16}}>{weeklyWorstUser.avatar}</span>
                  <span style={{fontSize:12,fontWeight:"bold",color:"#ef4444"}}>{weeklyWorstUser.pseudo}</span>
                  <span style={{fontSize:10,color:"#ef4444",marginLeft:"auto"}}>{weeklyWorst.profit.toLocaleString()} SC</span>
                </div>
              )}
            </div>
          )}

          {leaderboard.length===0 ? (
            <div style={{textAlign:"center",color:"#333",padding:"60px 0",fontSize:13}}>
              Aucun joueur inscrit.
            </div>
          ) : (
            <>
              {leaderboard.length>=1&&(
                <div style={{display:"flex",gap:16,marginBottom:22,alignItems:"flex-end"}}>
                  {[leaderboard[1],leaderboard[0],leaderboard[2]].map((u,i)=>{
                    if(!u) return <div key={i} style={{flex:1}}/>;
                    const colors=["#94a3b8","#ffdc32","#cd7c2f"];
                    const medals=["🥈","🥇","🥉"];
                    const heights=[130,162,110];
                    const pColor=u.equipped?.pseudoColor?SHOP_ITEMS.find(s=>s.id===u.equipped.pseudoColor)?.color:null;
                    const badge=u.equipped?.badge?SHOP_ITEMS.find(s=>s.id===u.equipped.badge):null;
                    return (
                      <div key={u.id} style={{flex:1,background:"#111",border:`1px solid ${colors[i]}22`,
                        borderRadius:10,padding:18,textAlign:"center",height:heights[i],
                        display:"flex",flexDirection:"column",justifyContent:"flex-end",cursor:"pointer",
                        transition:"border-color 0.15s"}}
                        onMouseEnter={e=>e.currentTarget.style.borderColor=colors[i]}
                        onMouseLeave={e=>e.currentTarget.style.borderColor=`${colors[i]}22`}
                        onClick={()=>{setProfileUser(u);setView("profile");}}>
                        <div style={{fontSize:24,marginBottom:3}}>{u.avatar}</div>
                        <div style={{fontSize:12,fontWeight:"bold",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                          color:pColor||"inherit",textShadow:pColor?`0 0 8px ${pColor}55`:undefined}}>
                          {u.pseudo}
                          {u.isAdmin&&<span style={{fontSize:8,color:"#a855f7",marginLeft:4}}>ADMIN</span>}
                        </div>
                        {badge&&<div style={{fontSize:8,color:RARITY_COLOR[badge.rarity],marginTop:1}}>{badge.name}</div>}
                        <div style={{fontSize:20,fontWeight:"bold",color:colors[i]}}>{medals[i]}</div>
                        <div style={{fontSize:10,color:"#444",marginTop:3}}>{u.profit>=0?"+":""}{u.profit.toLocaleString()} SC</div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{background:"#141414",border:"1px solid #2a2a2a",borderRadius:12,overflow:"hidden"}}>
                <div style={{display:"grid",gridTemplateColumns:"44px 1fr 60px 60px 60px 80px",
                  padding:"8px 16px",borderBottom:"1px solid #222"}}>
                  {["#","JOUEUR","V","D","W/R","PROFIT"].map(h=>(
                    <div key={h} style={{fontSize:8,color:"#444",fontWeight:"bold",letterSpacing:2,
                      textAlign:h==="JOUEUR"?"left":"right"}}>{h}</div>
                  ))}
                </div>
                {leaderboard.map((u,i)=>{
                  const rc={0:"#ffdc32",1:"#94a3b8",2:"#cd7c2f"};
                  const isMe=me?.id===u.id;
                  const pColor=u.equipped?.pseudoColor?SHOP_ITEMS.find(s=>s.id===u.equipped.pseudoColor)?.color:null;
                  const badge=u.equipped?.badge?SHOP_ITEMS.find(s=>s.id===u.equipped.badge):null;
                  const frame=u.equipped?.frame?SHOP_ITEMS.find(s=>s.id===u.equipped.frame):null;
                  return (
                    <div key={u.id} style={{display:"grid",gridTemplateColumns:"44px 1fr 60px 60px 60px 80px",
                      padding:"14px 20px",borderBottom:"1px solid #1a1a1a",
                      background:isMe?"#ffdc3206":"transparent",
                      borderLeft:isMe?"3px solid #ffdc32":"3px solid transparent",
                      cursor:"pointer",position:"relative"}}
                      onMouseEnter={e=>e.currentTarget.style.background="#ffffff06"}
                      onMouseLeave={e=>e.currentTarget.style.background=isMe?"#ffdc3206":"transparent"}
                      onClick={()=>{setProfileUser(u);setView("profile");}}>
                      {frame&&<div style={{position:"absolute",inset:0,background:frame.frameColor,
                        opacity:0.1,pointerEvents:"none"}}/>}
                      <div style={{fontSize:12,fontWeight:"bold",color:rc[i]||"#444",position:"relative",zIndex:1}}>
                        {i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}</div>
                      <div style={{display:"flex",alignItems:"center",gap:7,position:"relative",zIndex:1}}>
                        <span style={{fontSize:16}}>{u.avatar}</span>
                        <div>
                          <div style={{display:"flex",alignItems:"center",gap:5}}>
                            <span style={{fontSize:12,fontWeight:"bold",
                              color:pColor||(isMe?"#ffdc32":"#ccc"),
                              textShadow:pColor?`0 0 8px ${pColor}55`:undefined}}>
                              {u.pseudo}{isMe?" (toi)":""}
                            </span>
                            {u.isAdmin&&<span style={{fontSize:8,color:"#a855f7",background:"#a855f715",padding:"1px 5px",borderRadius:6}}>ADMIN</span>}
                            {u.banned&&<span style={{marginLeft:4,fontSize:8,color:"#ef4444"}}>BANNI</span>}
                            {u.streak>=2&&<span style={{fontSize:9,fontWeight:"bold",color:"#f97316"}}>🔥{u.streak}</span>}
                          </div>
                          {badge&&<div style={{fontSize:9,color:RARITY_COLOR[badge.rarity]}}>{badge.name}</div>}
                        </div>
                      </div>
                      <div style={{textAlign:"right",color:"#10b981",fontSize:12,fontWeight:"bold",position:"relative",zIndex:1}}>{u.wins}</div>
                      <div style={{textAlign:"right",color:"#ef4444",fontSize:12,fontWeight:"bold",position:"relative",zIndex:1}}>{u.losses}</div>
                      <div style={{textAlign:"right",fontSize:11,fontWeight:"bold",position:"relative",zIndex:1,color:u.winRate>=50?"#10b981":"#ef4444"}}>{u.winRate}%</div>
                      <div style={{textAlign:"right",fontSize:12,fontWeight:"bold",position:"relative",zIndex:1,color:u.profit>=0?"#10b981":"#ef4444"}}>
                        {u.profit>=0?"+":""}{u.profit.toLocaleString()}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* CLÔTURÉS */}
      {view==="clotures" && (
        <div style={{maxWidth:1080,margin:"0 auto",padding:"28px 20px",position:"relative",zIndex:1}}>
          <div style={{marginBottom:20}}>
            <div style={{fontSize:8,color:"#ffdc32",letterSpacing:4,marginBottom:5}}>HISTORIQUE</div>
            <div style={{fontSize:24,fontWeight:"bold"}}>📁 Paris Clôturés</div>
            <div style={{fontSize:11,color:"#444",marginTop:4}}>
              {markets.filter(m=>m.resolved).length} pari{markets.filter(m=>m.resolved).length>1?"s":""} résolu{markets.filter(m=>m.resolved).length>1?"s":""}
            </div>
          </div>
          {markets.filter(m=>m.resolved).length===0 ? (
            <div style={{textAlign:"center",padding:"80px 0",color:"#2a2a2a",fontSize:13}}>
              Aucun pari clôturé pour l'instant.
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
              {markets.filter(m=>m.resolved).slice().reverse().map(mkt=>{
                const odds=computeOdds(mkt);
                const myBet=(mkt.bets||[]).find(b=>b.userId===me?.id);
                const won=myBet?myBet.side===mkt.result:null;
                return (
                  <div key={mkt.id} style={{background:"#111",border:`1px solid ${mkt.result==="yes"?"#10b98130":"#ef444430"}`,
                    borderRadius:10,padding:20,position:"relative",opacity:0.85}}>
                    {/* Badge catégorie */}
                    <div style={{position:"absolute",top:10,right:10,fontSize:8,fontWeight:"bold",
                      letterSpacing:2,color:CAT_COLOR[mkt.category]||"#444",
                      background:`${CAT_COLOR[mkt.category]||"#444"}15`,padding:"2px 6px",borderRadius:6}}>
                      {mkt.category?.toUpperCase()}
                    </div>
                    <div style={{fontSize:22,marginBottom:8}}>{mkt.emoji}</div>
                    <div style={{fontSize:13,fontWeight:"bold",lineHeight:1.4,marginBottom:16,paddingRight:60}}>
                      {mkt.title}
                      <span style={{marginLeft:8,fontSize:9,color:mkt.result==="yes"?"#10b981":"#ef4444",
                        background:mkt.result==="yes"?"#0a150a":"#1a0505",padding:"2px 6px",borderRadius:6}}>
                        {mkt.result==="yes"?"✅ OUI":"❌ NON"}
                      </span>
                    </div>
                    {/* Barre OUI/NON */}
                    <div style={{display:"flex",gap:4,marginBottom:8}}>
                      <div style={{flex:odds.yesPct,background:"#10b98120",height:5,borderRadius:6,position:"relative",overflow:"hidden"}}>
                        <div style={{position:"absolute",inset:0,background:"#10b981",width:`${odds.yesPct}%`,borderRadius:6}}/>
                      </div>
                      <div style={{flex:odds.noPct,background:"#ef444420",height:5,borderRadius:6,position:"relative",overflow:"hidden"}}>
                        <div style={{position:"absolute",inset:0,background:"#ef4444",width:`${odds.noPct}%`,borderRadius:6}}/>
                      </div>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:10}}>
                      <span style={{color:"#10b981"}}>OUI {odds.yesPct}%</span>
                      <span style={{color:"#ffdc32",fontWeight:"bold"}}>{odds.total.toLocaleString()} SC misés</span>
                      <span style={{color:"#ef4444"}}>NON {odds.noPct}%</span>
                    </div>
                    {/* Résultat du joueur */}
                    {myBet && (
                      <div style={{fontSize:10,padding:"6px 10px",borderRadius:6,marginBottom:16,
                        background:won?"#0a150a":"#1a0505",
                        border:`1px solid ${won?"#10b98130":"#ef444430"}`,
                        color:won?"#10b981":"#ef4444"}}>
                        {won?"🎉 Tu as gagné ce pari !":"😢 Tu as perdu ce pari."}
                        {" · "}{myBet.amount} SC misés sur {myBet.side==="yes"?"OUI":"NON"}
                      </div>
                    )}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{fontSize:9,color:"#555"}}>par <span style={{color:"#888"}}>{mkt.creatorPseudo}</span></div>
                      {isAdmin && (
                        <button onClick={()=>setDelConfirm({type:"market",market:mkt})}
                          style={{background:"#ef444410",border:"1px solid #ef444425",color:"#ef4444",
                            padding:"4px 8px",borderRadius:6,cursor:"pointer",fontSize:9,fontFamily:"inherit"}}>
                          🗑 Supprimer
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* BOUTIQUE */}
      {view==="shop" && (
        <div style={{maxWidth:900,margin:"0 auto",padding:"28px 20px",position:"relative",zIndex:1}}>
          <div style={{marginBottom:20}}>
            <div style={{fontSize:8,color:"#ffdc32",letterSpacing:4,marginBottom:5}}>DÉPENSE TES SCHOOLCOINS</div>
            <div style={{fontSize:24,fontWeight:"bold"}}>🛒 Boutique</div>
            <div style={{fontSize:11,color:"#444",marginTop:4}}>Personnalise ton profil avec des cosmétiques.</div>
          </div>

          {/* Solde + équipés */}
          {me && (
            <div style={{background:"#111",border:"1px solid #ffdc3230",borderRadius:10,
              padding:"18px 22px",marginBottom:24,display:"flex",gap:20,flexWrap:"wrap",alignItems:"center"}}>
              <div>
                <div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:3}}>TON SOLDE</div>
                <div style={{fontSize:20,fontWeight:"bold",color:"#ffdc32"}}>
                  💰 {(myUserFresh||me).wallet.toLocaleString()} SC
                </div>
              </div>
              <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                {["pseudoColor","badge","frame"].map(type=>{
                  const freshMe=myUserFresh||me;
                  const eqId=freshMe.equipped?.[type];
                  const eqItem=eqId?SHOP_ITEMS.find(i=>i.id===eqId):null;
                  const labels={pseudoColor:"Couleur",badge:"Badge",frame:"Cadre"};
                  return (
                    <div key={type} style={{background:"#111",border:"1px solid #2a2a2a",
                      borderRadius:8,padding:"6px 10px",minWidth:100}}>
                      <div style={{fontSize:8,color:"#444",letterSpacing:2,marginBottom:3}}>{labels[type].toUpperCase()}</div>
                      {eqItem ? (
                        <div style={{display:"flex",alignItems:"center",gap:5}}>
                          <span style={{fontSize:12}}>{eqItem.icon}</span>
                          <span style={{fontSize:9,color:RARITY_COLOR[eqItem.rarity]}}>{eqItem.name}</span>
                          <button onClick={()=>unequipItem(type)}
                            style={{marginLeft:"auto",background:"transparent",border:"none",
                              color:"#444",cursor:"pointer",fontSize:10}}>✕</button>
                        </div>
                      ) : (
                        <div style={{fontSize:9,color:"#333"}}>— Aucun</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Articles par catégorie */}
          {[
            {type:"pseudoColor", label:"🎨 Couleurs de pseudo"},
            {type:"badge",       label:"🏷 Badges"},
            {type:"frame",       label:"🖼 Cadres"},
          ].map(({type,label})=>(
            <div key={type} style={{marginBottom:28}}>
              <div style={{fontSize:10,fontWeight:"bold",color:"#555",letterSpacing:2,marginBottom:12}}>
                {label.toUpperCase()}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:8}}>
                {SHOP_ITEMS.filter(i=>i.type===type).map(item=>{
                  const freshMe = myUserFresh||me;
                  const owned = freshMe?.owned?.includes(item.id);
                  const isEquipped = freshMe?.equipped?.[type]===item.id;
                  const canBuy = me && !owned && freshMe.wallet>=item.price;
                  const tooPoor = me && !owned && freshMe.wallet<item.price;
                  const rc = RARITY_COLOR[item.rarity];
                  return (
                    <div key={item.id} style={{background:"#111",border:`1px solid ${rc}33`,
                      borderRadius:10,padding:18,opacity:tooPoor?0.5:1,position:"relative"}}>
                      <div style={{position:"absolute",top:8,right:8,fontSize:7,fontWeight:"bold",
                        letterSpacing:2,color:rc,background:`${rc}20`,padding:"1px 5px",borderRadius:6,
                        textTransform:"uppercase"}}>{item.rarity}</div>
                      <div style={{fontSize:24,marginBottom:6}}>{item.icon}</div>
                      <div style={{fontSize:12,fontWeight:"bold",marginBottom:2}}>{item.name}</div>
                      <div style={{fontSize:9,color:"#444",marginBottom:16,lineHeight:1.4}}>{item.desc}</div>
                      {/* Aperçu */}
                      {item.type==="pseudoColor"&&(
                        <div style={{fontSize:11,fontWeight:"bold",marginBottom:16,
                          color:item.color,textShadow:`0 0 8px ${item.color}55`}}>
                          Aperçu pseudo ✦
                        </div>
                      )}
                      {item.type==="frame"&&(
                        <div style={{height:5,borderRadius:6,background:item.frameColor,marginBottom:8}}/>
                      )}
                      {item.type==="badge"&&(
                        <div style={{fontSize:10,color:rc,marginBottom:8}}>{item.name}</div>
                      )}
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div style={{fontSize:12,fontWeight:"bold",color:"#ffdc32"}}>
                          {item.price.toLocaleString()} SC
                        </div>
                        {!me ? (
                          <button onClick={()=>setView("auth")}
                            style={{background:"#ffdc3220",color:"#ffdc32",border:"none",
                              padding:"4px 8px",borderRadius:6,cursor:"pointer",fontSize:9,fontFamily:"inherit"}}>
                            Connexion
                          </button>
                        ) : owned ? (
                          <button onClick={()=>isEquipped?unequipItem(type):equipItem(item)}
                            style={{background:isEquipped?"#ef444415":"#10b98115",
                              border:`1px solid ${isEquipped?"#ef444440":"#10b98140"}`,
                              color:isEquipped?"#ef4444":"#10b981",
                              padding:"4px 8px",borderRadius:6,cursor:"pointer",
                              fontSize:9,fontWeight:"bold",fontFamily:"inherit"}}>
                            {isEquipped?"✕ Retirer":"✓ Équiper"}
                          </button>
                        ) : (
                          <button onClick={()=>buyItem(item)} disabled={tooPoor}
                            style={{background:canBuy?"#ffdc32":"#1a1a1a",
                              color:canBuy?"#0d0d0d":"#444",border:"none",
                              padding:"4px 8px",borderRadius:6,
                              cursor:canBuy?"pointer":"not-allowed",
                              fontSize:9,fontWeight:"bold",fontFamily:"inherit"}}>
                            {tooPoor?"SC insuffisants":"→ Acheter"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* STATS GLOBALES */}
      {view==="stats" && (()=>{
        const players = users.filter(u=>!u.isAdmin&&!u.banned);
        const resolvedMkts = markets.filter(m=>m.resolved);
        const allBets = markets.flatMap(m=>(m.bets||[]).filter(b=>!b.isPenalty));

        // Économie
        const totalSC = players.reduce((s,u)=>s+u.wallet,0);
        const totalMise = allBets.reduce((s,b)=>s+b.amount,0);
        const totalGains = resolvedMkts.reduce((s,m)=>{
          const pool = (m.bets||[]).reduce((a,b)=>a+b.amount,0);
          return s+pool;
        },0);
        const avgBet = allBets.length>0?Math.round(totalMise/allBets.length):0;

        // Marchés
        const mostPopular = [...markets].sort((a,b)=>{
          const aTotal=(a.bets||[]).reduce((s,b)=>s+b.amount,0);
          const bTotal=(b.bets||[]).reduce((s,b)=>s+b.amount,0);
          return bTotal-aTotal;
        })[0]||null;
        const mostBettors = [...markets].sort((a,b)=>
          (b.bets||[]).filter(x=>!x.isPenalty).length-(a.bets||[]).filter(x=>!x.isPenalty).length
        )[0]||null;
        const catCount = {};
        for (const m of markets) catCount[m.category]=(catCount[m.category]||0)+1;
        const topCat = Object.entries(catCount).sort((a,b)=>b[1]-a[1])[0]||null;

        // Joueurs
        const betsByPlayer = {};
        for (const b of allBets) betsByPlayer[b.userId]=(betsByPlayer[b.userId]||0)+1;
        const mostActiveId = Object.entries(betsByPlayer).sort((a,b)=>b[1]-a[1])[0]?.[0];
        const mostActive = mostActiveId?users.find(u=>u.id===mostActiveId):null;

        const bestWinRate = players.map(u=>{
          const s=computeStats(u.id,markets);
          const t=s.wins+s.losses;
          return {...u,winRate:t>=5?Math.round(s.wins/t*100):null,total:t};
        }).filter(u=>u.winRate!==null).sort((a,b)=>b.winRate-a.winRate)[0]||null;

        const biggestWin = resolvedMkts.reduce((best,m)=>{
          const winners=(m.bets||[]).filter(b=>!b.isPenalty&&b.side===m.result);
          const pool=(m.bets||[]).reduce((s,b)=>s+b.amount,0);
          const winStake=winners.reduce((s,b)=>s+b.amount,0);
          for (const w of winners) {
            const gain=winStake>0?Math.round(w.amount/winStake*pool)-w.amount:0;
            if (gain>best.gain) return {gain,pseudo:w.pseudo,market:m.title};
          }
          return best;
        },{gain:0,pseudo:null,market:null});

        // Fun
        const yesTotal=allBets.filter(b=>b.side==="yes").length;
        const noTotal=allBets.filter(b=>b.side==="no").length;
        const yesRatio=allBets.length>0?Math.round(yesTotal/allBets.length*100):50;

        const StatCard = ({title, value, sub, color="#ffdc32", emoji}) => (
          <div style={{background:"#141414",border:"1px solid #2a2a2a",borderRadius:12,padding:"16px 18px"}}>
            <div style={{fontSize:9,color:"#444",letterSpacing:2,marginBottom:16,fontWeight:"bold"}}>{emoji} {title}</div>
            <div style={{fontSize:20,fontWeight:"bold",color,marginBottom:sub?4:0}}>{value}</div>
            {sub&&<div style={{fontSize:10,color:"#444",lineHeight:1.4}}>{sub}</div>}
          </div>
        );

        return (
          <div style={{maxWidth:900,margin:"0 auto",padding:"28px 20px",position:"relative",zIndex:1}}>
            <div style={{marginBottom:24}}>
              <div style={{fontSize:8,color:"#ffdc32",letterSpacing:4,marginBottom:5}}>VUE D'ENSEMBLE</div>
              <div style={{fontSize:24,fontWeight:"bold"}}>📈 Stats Globales</div>
            </div>

            <div style={{fontSize:9,color:"#555",letterSpacing:2,marginBottom:10,fontWeight:"bold"}}>ÉCONOMIE</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:16,marginBottom:24}}>
              <StatCard emoji="💰" title="SC EN CIRCULATION" value={totalSC.toLocaleString()+" SC"} sub={`Parmi ${players.length} joueur${players.length>1?"s":""}`}/>
              <StatCard emoji="🎲" title="SC MISÉS AU TOTAL" value={totalMise.toLocaleString()+" SC"} sub={`${allBets.length} paris passés`}/>
              <StatCard emoji="🏆" title="SC DISTRIBUÉS EN GAINS" value={totalGains.toLocaleString()+" SC"} sub={`Sur ${resolvedMkts.length} marchés clôturés`}/>
              <StatCard emoji="📊" title="MISE MOYENNE" value={avgBet.toLocaleString()+" SC"} sub="Par pari"/>
            </div>

            <div style={{fontSize:9,color:"#555",letterSpacing:2,marginBottom:10,fontWeight:"bold"}}>MARCHÉS</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:16,marginBottom:24}}>
              <StatCard emoji="🔥" title="PLUS POPULAIRE" value={mostPopular?`${mostPopular.emoji} ${mostPopular.title.slice(0,30)}...`:"—"} sub={mostPopular?`${(mostPopular.bets||[]).reduce((s,b)=>s+b.amount,0).toLocaleString()} SC misés`:null} color="#f97316"/>
              <StatCard emoji="👥" title="PLUS DE PARIEURS" value={mostBettors?`${mostBettors.emoji} ${mostBettors.title.slice(0,30)}...`:"—"} sub={mostBettors?`${(mostBettors.bets||[]).filter(b=>!b.isPenalty).length} parieurs`:null} color="#22d3ee"/>
              <StatCard emoji="📂" title="CATÉGORIE LA + ACTIVE" value={topCat?topCat[0].toUpperCase():"—"} sub={topCat?`${topCat[1]} marché${topCat[1]>1?"s":""}`:null} color={topCat?CAT_COLOR[topCat[0]]:"#444"}/>
              <StatCard emoji="📋" title="TOTAL MARCHÉS" value={markets.length} sub={`${resolvedMkts.length} clôturés · ${markets.filter(m=>!m.resolved).length} actifs`}/>
            </div>

            <div style={{fontSize:9,color:"#555",letterSpacing:2,marginBottom:10,fontWeight:"bold"}}>JOUEURS</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:16,marginBottom:24}}>
              <StatCard emoji="⚡" title="JOUEUR LE + ACTIF" value={mostActive?`${mostActive.avatar} ${mostActive.pseudo}`:"—"} sub={mostActive?`${betsByPlayer[mostActive.id]} paris passés`:null} color="#a855f7"/>
              <StatCard emoji="🎯" title="MEILLEUR WIN RATE" value={bestWinRate?`${bestWinRate.avatar} ${bestWinRate.pseudo}`:"—"} sub={bestWinRate?`${bestWinRate.winRate}% (min. 5 paris)`:null} color="#10b981"/>
              <StatCard emoji="💸" title="PLUS GROS GAIN" value={biggestWin.pseudo?`${biggestWin.pseudo}`:"—"} sub={biggestWin.pseudo?`+${biggestWin.gain.toLocaleString()} SC sur "${biggestWin.market?.slice(0,25)}..."`:null} color="#ffd700"/>
            </div>

            <div style={{fontSize:9,color:"#555",letterSpacing:2,marginBottom:10,fontWeight:"bold"}}>FUN</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:8}}>
              <StatCard emoji="✅" title="RATIO OUI / NON" value={`${yesRatio}% OUI`} sub={`${100-yesRatio}% NON — ${allBets.length} paris au total`} color="#10b981"/>
              <StatCard emoji="👥" title="JOUEURS INSCRITS" value={players.length} sub={`+ 1 organisateur`}/>
            </div>
          </div>
        );
      })()}

      {/* CASINO */}
      {view==="casino" && (
        <div style={{maxWidth:600,margin:"0 auto",padding:"28px 20px",position:"relative",zIndex:1}}>
          <div style={{marginBottom:20}}>
            <div style={{fontSize:8,color:"#ffdc32",letterSpacing:4,marginBottom:5}}>JOUE TON CAPITAL</div>
            <div style={{fontSize:24,fontWeight:"bold"}}>🎰 Casino</div>
          </div>

          {/* Solde */}
          <div style={{background:"#111",border:"1px solid #ffdc3230",borderRadius:10,
            padding:"12px 18px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
            <div style={{fontSize:9,color:"#555",letterSpacing:2}}>TON SOLDE</div>
            <div style={{fontSize:20,fontWeight:"bold",color:"#ffdc32"}}>
              💰 {(myUserFresh||me).wallet.toLocaleString()} SC
            </div>
          </div>

          {/* Onglets */}
          <div style={{display:"flex",gap:4,marginBottom:20}}>
            {[["blackjack","🃏 Blackjack"],["slots","🎰 Slot Machine"]].map(([t,lbl])=>(
              <button key={t} onClick={()=>setCasinoTab(t)} style={{
                flex:1,background:casinoTab===t?"#ffdc32":"#111",
                color:casinoTab===t?"#0d0d0d":"#555",
                border:casinoTab===t?"none":"1px solid #252525",
                padding:"8px",borderRadius:6,cursor:"pointer",
                fontWeight:"bold",fontSize:10,fontFamily:"inherit",letterSpacing:1}}>
                {lbl}
              </button>
            ))}
          </div>

          {/* BLACKJACK */}
          {casinoTab==="blackjack" && (<>
            {bjPhase==="bet" && (
              <div style={{background:"#141414",border:"1px solid #2a2a2a",borderRadius:12,padding:32,textAlign:"center"}}>
                <div style={{fontSize:11,color:"#444",letterSpacing:2,marginBottom:16}}>TA MISE</div>
                <div style={{display:"flex",gap:16,justifyContent:"center",marginBottom:16,flexWrap:"wrap"}}>
                  {[50,100,200,500,1000].map(v=>(
                    <button key={v} onClick={()=>setBjBet(v)}
                      style={{background:bjBet===v?"#ffdc32":"#1a1a1a",color:bjBet===v?"#0d0d0d":"#555",
                        border:bjBet===v?"none":"1px solid #252525",padding:"8px 16px",borderRadius:6,
                        cursor:"pointer",fontWeight:"bold",fontSize:11,fontFamily:"inherit"}}>
                      {v} SC
                    </button>
                  ))}
                </div>
                <input type="number" value={bjBet} min={50} onChange={e=>setBjBet(e.target.value)}
                  style={{background:"#0d0d0d",border:"1px solid #2a2a2a",color:"#e8e0d0",
                    padding:"10px 16px",borderRadius:6,fontSize:16,fontFamily:"inherit",
                    outline:"none",width:140,textAlign:"center",marginBottom:20}}/>
                <div/>
                <button onClick={bjStart}
                  style={{background:"#ffdc32",color:"#0d0d0d",border:"none",
                    padding:"12px 32px",borderRadius:6,cursor:"pointer",
                    fontWeight:"bold",fontSize:13,fontFamily:"inherit",letterSpacing:1}}>
                  🃏 JOUER
                </button>
                <div style={{fontSize:9,color:"#333",marginTop:12}}>Mise min : 50 SC · Blackjack = x1.5</div>
              </div>
            )}
            {(bjPhase==="play"||bjPhase==="done") && (()=>{
              const CardComp = ({card, hidden=false}) => (
                <div style={{
                  width:56,height:80,background:hidden?"#1a1a1a":"#fff",
                  border:`2px solid ${hidden?"#333":["♥","♦"].includes(card?.s)?"#ef4444":"#1a1a1a"}`,
                  borderRadius:6,display:"flex",flexDirection:"column",
                  alignItems:"center",justifyContent:"center",
                  color:hidden?"transparent":["♥","♦"].includes(card?.s)?"#ef4444":"#111",
                  fontSize:hidden?20:15,fontWeight:"bold",position:"relative",
                  boxShadow:"0 2px 8px rgba(0,0,0,0.4)"}}>
                  {hidden ? <span style={{color:"#333",fontSize:24}}>?</span> : <>
                    <div style={{position:"absolute",top:4,left:6,fontSize:11,lineHeight:1}}>{card.v}</div>
                    <div style={{fontSize:20}}>{card.s}</div>
                    <div style={{position:"absolute",bottom:4,right:6,fontSize:11,lineHeight:1,transform:"rotate(180deg)"}}>{card.v}</div>
                  </>}
                </div>
              );
              const pVal = bjHandValue(bjPlayer);
              const dVal = bjPhase==="done" ? bjHandValue(bjDealer) : bjHandValue([bjDealer[0]]);
              const resultColor = bjResult==="win"||bjResult==="blackjack"?"#10b981":bjResult==="push"?"#ffdc32":"#ef4444";
              return (
                <div>
                  <div style={{background:"#141414",border:"1px solid #2a2a2a",borderRadius:12,padding:20,marginBottom:12}}>
                    <div style={{fontSize:9,color:"#444",letterSpacing:2,marginBottom:12}}>CROUPIER {bjPhase==="done"?`— ${dVal}`:""}</div>
                    <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                      {bjDealer.map((card,i)=>(<CardComp key={i} card={card} hidden={bjPhase==="play"&&i===1}/>))}
                    </div>
                  </div>
                  <div style={{background:"#111",border:`1px solid ${bjPhase==="done"?resultColor+"40":"#1a1a1a"}`,borderRadius:10,padding:20,marginBottom:16}}>
                    <div style={{fontSize:9,color:"#444",letterSpacing:2,marginBottom:12}}>TOI — {pVal} {pVal>21?"💥":pVal===21?"⚡":""}</div>
                    <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                      {bjPlayer.map((card,i)=>(<CardComp key={i} card={card}/>))}
                    </div>
                  </div>
                  {bjPhase==="done"&&bjMsg&&(
                    <div style={{background:resultColor+"15",border:`1px solid ${resultColor}40`,borderRadius:10,padding:"14px 20px",textAlign:"center",marginBottom:16}}>
                      <div style={{fontSize:16,fontWeight:"bold",color:resultColor}}>{bjMsg}</div>
                    </div>
                  )}
                  {bjPhase==="play"&&(
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={bjHit} style={{flex:1,background:"#10b981",color:"#fff",border:"none",padding:"12px",borderRadius:6,cursor:"pointer",fontWeight:"bold",fontSize:12,fontFamily:"inherit"}}>➕ TIRER</button>
                      <button onClick={()=>bjStand()} style={{flex:1,background:"#ef4444",color:"#fff",border:"none",padding:"12px",borderRadius:6,cursor:"pointer",fontWeight:"bold",fontSize:12,fontFamily:"inherit"}}>✋ RESTER</button>
                      {bjPlayer.length===2&&(<button onClick={bjDouble} style={{flex:1,background:"#f97316",color:"#fff",border:"none",padding:"12px",borderRadius:6,cursor:"pointer",fontWeight:"bold",fontSize:12,fontFamily:"inherit"}}>✖2 DOUBLER</button>)}
                    </div>
                  )}
                  {bjPhase==="done"&&(
                    <button onClick={()=>{setBjPhase("bet");setBjPlayer([]);setBjDealer([]);setBjResult(null);setBjMsg("");}}
                      style={{width:"100%",background:"#ffdc32",color:"#0d0d0d",border:"none",padding:"12px",borderRadius:6,cursor:"pointer",fontWeight:"bold",fontSize:12,fontFamily:"inherit",marginTop:8}}>
                      🔄 NOUVELLE PARTIE
                    </button>
                  )}
                </div>
              );
            })()}
          </>)}

          {/* SLOT MACHINE */}
          {casinoTab==="slots" && (
            <div>
              {/* Tableau des gains */}
              <div style={{background:"#141414",border:"1px solid #2a2a2a",borderRadius:12,
                padding:"12px 16px",marginBottom:16}}>
                <div style={{fontSize:9,color:"#444",letterSpacing:2,marginBottom:16,fontWeight:"bold"}}>TABLEAU DES GAINS</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
                  {[["💎💎💎","x20 🔥"],["7️⃣7️⃣7️⃣","x15"],["🍒🍒🍒","x10"],["⭐⭐⭐","x8"],["🍋🍋🍋","x5"],["🔔🔔🔔","x4"],["🍇🍇🍇","x3"],["2 identiques","x1.5"]].map(([sym,mult])=>(
                    <div key={sym} style={{display:"flex",justifyContent:"space-between",fontSize:10,
                      padding:"3px 6px",background:"#111",borderRadius:6}}>
                      <span>{sym}</span>
                      <span style={{color:"#ffdc32",fontWeight:"bold"}}>{mult}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Machine */}
              <div style={{background:"#141414",border:"1px solid #2a2a2a",borderRadius:12,padding:32,textAlign:"center"}}>
                {/* Rouleaux */}
                <div style={{display:"flex",gap:16,justifyContent:"center",marginBottom:24}}>
                  {slotReels.map((sym,i)=>(
                    <div key={i} style={{width:80,height:80,background:"#111",border:"2px solid #252525",
                      borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:36,boxShadow:"inset 0 2px 8px rgba(0,0,0,0.5)",
                      transition:slotSpinning?"none":"all 0.3s",
                      filter:slotSpinning?"blur(2px)":"none",
                      transform:slotSpinning?"scale(0.95)":"scale(1)"}}>
                      {sym}
                    </div>
                  ))}
                </div>

                {/* Résultat */}
                {slotMsg && !slotSpinning && (
                  <div style={{marginBottom:16,padding:"10px 16px",borderRadius:8,
                    background:slotResult==="win"?"#0a150a":slotResult==="small"?"#1a1200":"#1a0505",
                    border:`1px solid ${slotResult==="win"?"#10b98140":slotResult==="small"?"#ffdc3240":"#ef444440"}`,
                    color:slotResult==="win"?"#10b981":slotResult==="small"?"#ffdc32":"#ef4444",
                    fontWeight:"bold",fontSize:13}}>
                    {slotMsg}
                  </div>
                )}

                {/* Mise */}
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:9,color:"#444",letterSpacing:2,marginBottom:8}}>MISE</div>
                  <div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:10,flexWrap:"wrap"}}>
                    {[50,100,200,500,1000].map(v=>(
                      <button key={v} onClick={()=>setSlotBet(v)}
                        style={{background:slotBet===v?"#ffdc32":"#1a1a1a",color:slotBet===v?"#0d0d0d":"#555",
                          border:slotBet===v?"none":"1px solid #252525",padding:"6px 12px",borderRadius:6,
                          cursor:"pointer",fontWeight:"bold",fontSize:10,fontFamily:"inherit"}}>
                        {v}
                      </button>
                    ))}
                  </div>
                  <input type="number" value={slotBet} min={50} onChange={e=>setSlotBet(e.target.value)}
                    style={{background:"#0d0d0d",border:"1px solid #2a2a2a",color:"#e8e0d0",
                      padding:"8px 14px",borderRadius:6,fontSize:14,fontFamily:"inherit",
                      outline:"none",width:120,textAlign:"center"}}/>
                </div>

                <button onClick={slotSpin} disabled={slotSpinning}
                  style={{background:slotSpinning?"#1a1a1a":"#ffdc32",
                    color:slotSpinning?"#444":"#0d0d0d",border:"none",
                    padding:"14px 40px",borderRadius:6,cursor:slotSpinning?"not-allowed":"pointer",
                    fontWeight:"bold",fontSize:14,fontFamily:"inherit",letterSpacing:2}}>
                  {slotSpinning?"⏳ ...":"🎰 SPIN !"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADMIN PANEL */}
      {view==="admin" && isAdmin && (
        <div style={{maxWidth:1000,margin:"0 auto",padding:"28px 20px",position:"relative",zIndex:1}}>
          <div style={{marginBottom:24}}>
            <div style={{fontSize:8,color:"#a855f7",letterSpacing:4,marginBottom:5}}>PANNEAU ADMINISTRATEUR</div>
            <div style={{fontSize:24,fontWeight:"bold"}}>👑 Admin Panel</div>
          </div>
          <div style={{display:"flex",gap:4,marginBottom:20,borderBottom:"1px solid #222",paddingBottom:12}}>
            {[["markets","📊 Marchés"],["users","👥 Joueurs"],["renames","✏️ Pseudos"+(pendingRenames.length>0?` (${pendingRenames.length})`:"")],["lottery","🎰 Loterie"],["announce","📢 Annonces"]].map(([t,lbl])=>(
              <button key={t} onClick={()=>setAdminTab(t)} style={{
                background:adminTab===t?"#a855f715":"transparent",color:adminTab===t?"#a855f7":"#444",
                border:adminTab===t?"1px solid #a855f730":"1px solid transparent",
                padding:"6px 14px",borderRadius:6,cursor:"pointer",fontSize:9,fontWeight:"bold",
                fontFamily:"inherit",letterSpacing:1}}>{lbl}</button>
            ))}
          </div>

          {adminTab==="lottery" && (
            <div>
              <div style={{background:"#141414",border:"1px solid #2a2a2a",borderRadius:12,padding:24,marginBottom:16}}>
                <div style={{fontSize:10,color:"#555",letterSpacing:2,marginBottom:16,fontWeight:"bold"}}>LOTERIE EN COURS</div>
                {(()=>{
                  const weekKey = getWeekKey();
                  const lot = lottery;
                  const participants = lot.participants||[];
                  const active = lot.week===weekKey && participants.length>0;
                  return (
                    <>
                      <div style={{display:"flex",gap:20,marginBottom:16,flexWrap:"wrap"}}>
                        <div>
                          <div style={{fontSize:8,color:"#444",letterSpacing:2,marginBottom:4}}>CAGNOTTE</div>
                          <div style={{fontSize:22,fontWeight:"bold",color:"#ffdc32"}}>
                            💰 {active?lot.pool:0} SC
                          </div>
                        </div>
                        <div>
                          <div style={{fontSize:8,color:"#444",letterSpacing:2,marginBottom:4}}>PARTICIPANTS</div>
                          <div style={{fontSize:22,fontWeight:"bold",color:"#ccc"}}>
                            {active?participants.length:0} joueur{participants.length>1?"s":""}
                          </div>
                        </div>
                      </div>
                      {active && (
                        <div style={{marginBottom:16}}>
                          <div style={{fontSize:8,color:"#444",letterSpacing:2,marginBottom:8}}>LISTE</div>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                            {participants.map(p=>(
                              <span key={p.userId} style={{fontSize:10,background:"#1a1a1a",
                                padding:"3px 8px",borderRadius:6,color:"#ccc"}}>{p.pseudo}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      <button onClick={drawLottery} disabled={!active}
                        style={{background:active?"#ffdc32":"#1a1a1a",color:active?"#0d0d0d":"#444",
                          border:"none",padding:"10px 20px",borderRadius:6,
                          cursor:active?"pointer":"not-allowed",
                          fontWeight:"bold",fontSize:11,fontFamily:"inherit",letterSpacing:1}}>
                        🎰 LANCER LE TIRAGE
                      </button>
                      {!active && <div style={{fontSize:10,color:"#333",marginTop:8}}>Aucun participant cette semaine.</div>}
                    </>
                  );
                })()}
              </div>

              {/* Cashprize hebdo */}
              <div style={{background:"#111",border:"1px solid #ffd70030",borderRadius:10,padding:24}}>
                <div style={{fontSize:10,color:"#ffd700",letterSpacing:2,marginBottom:4,fontWeight:"bold"}}>⭐ CASHPRIZE MEILLEUR PARIEUR</div>
                <div style={{fontSize:10,color:"#444",marginBottom:16}}>
                  Distribue une récompense au meilleur parieur de la semaine.
                  {weeklyBestUser
                    ? <span style={{color:"#10b981"}}> Actuellement : {weeklyBestUser.avatar} {weeklyBestUser.pseudo} (+{weeklyBest.profit.toLocaleString()} SC)</span>
                    : <span style={{color:"#333"}}> Aucun éligible cette semaine.</span>}
                </div>
                <div style={{display:"flex",gap:16,alignItems:"center"}}>
                  <input type="number" value={cashprizeAmt} onChange={e=>setCashprizeAmt(e.target.value)}
                    min={1} style={{width:100,background:"#0d0d0d",border:"1px solid #2a2a2a",
                      color:"#e8e0d0",padding:"8px 12px",borderRadius:6,fontSize:13,
                      fontFamily:"inherit",outline:"none"}}/>
                  <span style={{fontSize:11,color:"#444"}}>SC</span>
                  <button onClick={()=>{
                    if (!weeklyBestUser) return showToast("Aucun éligible !","err");
                    const amt = parseInt(cashprizeAmt);
                    if (!amt||amt<1) return showToast("Montant invalide","err");
                    const cur = usersRef.current;
                    const notif = {
                      id:`n_${Date.now()}`, ts:Date.now(), read:false,
                      won:true, marketTitle:"⭐ Cashprize meilleur parieur de la semaine !",
                      marketEmoji:"⭐", amount:0, gain:amt, profit:amt,
                    };
                    const newU = cur.map(u=>u.id!==weeklyBestUser.id?u:{
                      ...u, wallet:u.wallet+amt,
                      notifications:[...(u.notifications||[]),notif].slice(-30)
                    });
                    saveU(newU);
                    const fm = newU.find(u=>u.id===me?.id);
                    if (fm) setMe(fm);
                    showToast(`🎉 ${amt} SC envoyés à ${weeklyBestUser.pseudo} !`);
                  }} disabled={!weeklyBestUser}
                    style={{background:weeklyBestUser?"#ffd700":"#1a1a1a",
                      color:weeklyBestUser?"#0d0d0d":"#444",border:"none",
                      padding:"8px 16px",borderRadius:6,cursor:weeklyBestUser?"pointer":"not-allowed",
                      fontWeight:"bold",fontSize:10,fontFamily:"inherit",letterSpacing:1}}>
                    🏆 ENVOYER LE CASHPRIZE
                  </button>
                </div>
              </div>
            </div>
          )}

          {adminTab==="announce" && (
            <div>
              <div style={{background:"#111",border:"1px solid #6366f130",borderRadius:10,padding:24}}>
                <div style={{fontSize:10,color:"#6366f1",letterSpacing:2,marginBottom:16,fontWeight:"bold"}}>
                  📢 ENVOYER UNE ANNONCE À TOUS LES JOUEURS
                </div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:9,color:"#444",letterSpacing:2,marginBottom:6}}>TITRE</div>
                  <input value={annTitle} onChange={e=>setAnnTitle(e.target.value)}
                    maxLength={60}
                    style={{width:"100%",background:"#0d0d0d",border:"1px solid #2a2a2a",
                      color:"#e8e0d0",padding:"9px 12px",borderRadius:6,fontSize:12,
                      fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                </div>
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:9,color:"#444",letterSpacing:2,marginBottom:6}}>MESSAGE</div>
                  <textarea value={annBody} onChange={e=>setAnnBody(e.target.value)}
                    rows={10}
                    style={{width:"100%",background:"#0d0d0d",border:"1px solid #2a2a2a",
                      color:"#e8e0d0",padding:"9px 12px",borderRadius:6,fontSize:11,
                      fontFamily:"inherit",outline:"none",resize:"vertical",
                      boxSizing:"border-box",lineHeight:1.7}}/>
                </div>
                <button onClick={sendAnnouncement}
                  style={{background:"#6366f1",color:"#fff",border:"none",
                    padding:"10px 20px",borderRadius:6,cursor:"pointer",
                    fontWeight:"bold",fontSize:10,fontFamily:"inherit",letterSpacing:1}}>
                  📢 ENVOYER À TOUS
                </button>
                <div style={{fontSize:9,color:"#333",marginTop:8}}>
                  L'annonce apparaîtra dans la cloche 🔔 de chaque joueur.
                </div>
              </div>
            </div>
          )}

          {adminTab==="markets" && (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {markets.length===0&&<div style={{color:"#333",textAlign:"center",padding:40}}>Aucun marché.</div>}
              {[...markets].sort((a,b)=>b.ts-a.ts).map(mkt=>{
                const odds=computeOdds(mkt);
                return (
                  <div key={mkt.id} style={{background:"#141414",border:"1px solid #2a2a2a",borderRadius:12,
                    padding:"18px 20px",display:"flex",gap:16,alignItems:"center",flexWrap:"wrap",
                    opacity:mkt.resolved?0.6:1}}>
                    <span style={{fontSize:20}}>{mkt.emoji}</span>
                    <div style={{flex:1,minWidth:200}}>
                      <div style={{fontSize:12,fontWeight:"bold",marginBottom:2}}>{mkt.title}</div>
                      <div style={{fontSize:9,color:"#444"}}>{mkt.creatorPseudo} · {odds.total.toLocaleString()} SC · {(mkt.bets||[]).filter(b=>!b.isPenalty).length} paris</div>
                    </div>
                    {mkt.resolved ? (
                      <span style={{fontSize:10,color:mkt.result==="yes"?"#10b981":"#ef4444",fontWeight:"bold"}}>
                        {mkt.result==="yes"?"✅ OUI":"❌ NON"} · RÉSOLU
                      </span>
                    ) : (
                      <>
                        <button onClick={()=>pinMarket(mkt.id)}
                          style={{background:mkt.pinned?"#ffd70020":"transparent",
                            border:`1px solid ${mkt.pinned?"#ffd70050":"#252525"}`,
                            color:mkt.pinned?"#ffd700":"#555",
                            padding:"6px 10px",borderRadius:6,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>
                          📌
                        </button>
                        <button onClick={()=>setResolveModal(mkt)}
                          style={{background:"#a855f715",border:"1px solid #a855f730",color:"#a855f7",
                            padding:"6px 12px",borderRadius:6,cursor:"pointer",fontSize:9,
                            fontWeight:"bold",fontFamily:"inherit",letterSpacing:1}}>
                          CLÔTURER
                        </button>
                      </>
                    )}
                    <button onClick={()=>setDelConfirm({type:"market",market:mkt})}
                      style={{background:"#ef444410",border:"1px solid #ef444425",color:"#ef4444",
                        padding:"6px 10px",borderRadius:6,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>
                      🗑
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {adminTab==="users" && (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {visibleUsers.map(u=>(
                <div key={u.id} style={{background:"#141414",border:"1px solid #2a2a2a",borderRadius:12,
                  padding:"18px 20px",display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{fontSize:20}}>{u.avatar}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:"bold"}}>{u.pseudo}
                      {u.banned&&<span style={{marginLeft:8,fontSize:9,color:"#ef4444"}}>BANNI</span>}
                    </div>
                    <div style={{fontSize:9,color:"#444"}}>{u.wallet.toLocaleString()} SC</div>
                  </div>
                  <button onClick={()=>{setWalletModal(u);setWalletAmt("");}}
                    style={{background:"#ffdc3215",border:"1px solid #ffdc3230",color:"#ffdc32",
                      padding:"6px 10px",borderRadius:6,cursor:"pointer",fontSize:9,fontWeight:"bold",fontFamily:"inherit"}}>
                    💰 Wallet
                  </button>
                  <button onClick={()=>{setRenamModal(u);setRenamInput("");setRenamErr("");}}
                    style={{background:"#3b82f615",border:"1px solid #3b82f630",color:"#3b82f6",
                      padding:"6px 10px",borderRadius:6,cursor:"pointer",fontSize:9,fontWeight:"bold",fontFamily:"inherit"}}>
                    ✏️ Renommer
                  </button>
                  <button onClick={()=>setBanConfirm(u)}
                    style={{background:u.banned?"#10b98115":"#ef444415",
                      border:`1px solid ${u.banned?"#10b98130":"#ef444430"}`,
                      color:u.banned?"#10b981":"#ef4444",
                      padding:"6px 10px",borderRadius:6,cursor:"pointer",fontSize:9,fontWeight:"bold",fontFamily:"inherit"}}>
                    {u.banned?"✅ Débannir":"🚫 Bannir"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {adminTab==="renames" && (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {pendingRenames.length===0&&<div style={{color:"#333",textAlign:"center",padding:40}}>Aucune demande en attente.</div>}
              {pendingRenames.map(u=>(
                <div key={u.id} style={{background:"#141414",border:"1px solid #2a2a2a",borderRadius:12,
                  padding:"18px 20px",display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{fontSize:20}}>{u.avatar}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:"bold"}}>{u.pseudo}</div>
                    <div style={{fontSize:10,color:"#ffdc32",marginTop:2}}>Souhaite → « {u.renameRequest} »</div>
                  </div>
                  <button onClick={()=>{setRenamModal(u);setRenamInput(u.renameRequest||"");setRenamErr("");}}
                    style={{background:"#3b82f615",border:"1px solid #3b82f630",color:"#3b82f6",
                      padding:"6px 10px",borderRadius:6,cursor:"pointer",fontSize:9,fontWeight:"bold",fontFamily:"inherit"}}>
                    ✏️ Renommer
                  </button>
                  <button onClick={()=>adminAllowRename(u.id)}
                    style={{background:"#10b98115",border:"1px solid #10b98130",color:"#10b981",
                      padding:"6px 10px",borderRadius:6,cursor:"pointer",fontSize:9,fontWeight:"bold",fontFamily:"inherit"}}>
                    ✅ Autoriser
                  </button>
                  <button onClick={()=>adminDenyRename(u.id)}
                    style={{background:"#ef444415",border:"1px solid #ef444430",color:"#ef4444",
                      padding:"6px 10px",borderRadius:6,cursor:"pointer",fontSize:9,fontWeight:"bold",fontFamily:"inherit"}}>
                    ❌ Refuser
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL MOT DE PASSE ADMIN */}
      {adminPwModal && (
        <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.92)",
          backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={()=>{setAdminPwModal(false);setAdminPwInput("");setAdminPwErr("");}}>
          <div style={{background:"#111",border:"2px solid #a855f7",borderRadius:10,padding:32,maxWidth:340,width:"100%"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:17,fontWeight:"bold",color:"#a855f7",marginBottom:16}}>👑 Connexion Admin</div>
            <PwField value={adminPwInput} onChange={e=>setAdminPwInput(e.target.value)} placeholder="Mot de passe admin"/>
            {adminPwErr&&<div style={{color:"#ef4444",fontSize:11,marginTop:8}}>{adminPwErr}</div>}
            <button onClick={handleAdminLogin} style={{...S.btn("#a855f7","#fff",{marginTop:14})}}>→ CONFIRMER</button>
          </div>
        </div>
      )}

      {/* MODAL PARIER */}
      {betModal && (
        <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.92)",
          backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={()=>setBetModal(null)}>
          <div style={{background:"#111",border:"2px solid #ffdc32",borderRadius:10,padding:26,maxWidth:400,width:"100%"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:20,marginBottom:4}}>{betModal.emoji}</div>
            <div style={{fontSize:14,fontWeight:"bold",marginBottom:14,lineHeight:1.4}}>{betModal.title}</div>
            <div style={{fontSize:9,color:"#444",letterSpacing:2,marginBottom:8}}>TON CHOIX</div>
            <div style={{display:"flex",gap:16,marginBottom:16}}>
              {[["yes","✅ OUI","#10b981"],["no","❌ NON","#ef4444"]].map(([s,lbl,c])=>{
                const betOdds = computeOdds(betModal);
                const cote = s==="yes"
                  ? (betOdds.yesTotal>0?(betOdds.total/betOdds.yesTotal).toFixed(2):"0")
                  : (betOdds.noTotal>0?(betOdds.total/betOdds.noTotal).toFixed(2):"0");
                return (
                  <button key={s} onClick={()=>setBetSide(s)} style={{flex:1,padding:"11px",
                    border:betSide===s?`2px solid ${c}`:"1px solid #252525",
                    background:betSide===s?`${c}18`:"#0d0d0d",color:betSide===s?c:"#555",
                    borderRadius:6,cursor:"pointer",fontFamily:"inherit"}}>
                    <div style={{fontWeight:"bold",fontSize:14}}>{lbl}</div>
                    <div style={{fontSize:11,marginTop:3,opacity:0.8}}>x{cote}</div>
                  </button>
                );
              })}
            </div>
            <div style={{fontSize:9,color:"#444",letterSpacing:2,marginBottom:8}}>MISE (SC)</div>
            <div style={{display:"flex",gap:6,marginBottom:5}}>
              <input type="number" min={10} value={betAmount} onChange={e=>setBetAmount(e.target.value)}
                style={{flex:1,background:"#0d0d0d",border:"1px solid #2a2a2a",color:"#e8e0d0",
                  padding:"9px 12px",borderRadius:6,fontSize:17,fontWeight:"bold",fontFamily:"inherit",outline:"none"}}/>
              {[25,50,100,250].map(v=>(
                <button key={v} onClick={()=>setBetAmount(v)} style={{background:"#0d0d0d",border:"1px solid #2a2a2a",
                  color:"#555",padding:"0 8px",borderRadius:6,cursor:"pointer",fontSize:10,fontFamily:"inherit",flexShrink:0}}>{v}</button>
              ))}
            </div>
            {!isAdmin && <div style={{fontSize:9,color:"#333",marginBottom:8}}>Solde : {me?.wallet?.toLocaleString()} SC</div>}
            {isAdmin && <div style={{fontSize:9,color:"#a855f7",marginBottom:8}}>Solde admin : {me?.wallet?.toLocaleString()} SC 👑</div>}
            {betSide && betAmount && parseInt(betAmount)>=10 && betModal && (()=>{
              const odds = computeOdds(betModal);
              const amt = parseInt(betAmount)||0;
              const sideTotal = betSide==="yes" ? odds.yesTotal : odds.noTotal;
              const newSideTotal = sideTotal + amt;
              const newTotal = odds.total + amt;
              const cote = newSideTotal>0 ? newTotal/newSideTotal : 1;
              const gain = Math.round(amt * cote);
              const profit = gain - amt;
              return (
                <div style={{background:"#0a150a",border:"1px solid #10b98130",borderRadius:6,
                  padding:"8px 12px",marginBottom:16,fontSize:10}}>
                  <span style={{color:"#444"}}>Gain potentiel : </span>
                  <span style={{color:"#10b981",fontWeight:"bold"}}>{gain.toLocaleString()} SC</span>
                  <span style={{color:"#10b98180"}}> (+{profit.toLocaleString()} SC · x{cote.toFixed(2)})</span>
                </div>
              );
            })()}
            <button onClick={placeBet} disabled={!betSide} style={{...S.btn(
              betSide?"#ffdc32":"#1a1a1a", betSide?"#0d0d0d":"#444",
              {cursor:betSide?"pointer":"not-allowed"})}}>
              {betSide?`→ MISER ${betAmount} SC sur "${betSide==="yes"?"OUI":"NON"}`:"Choisis OUI ou NON d'abord"}
            </button>
            <button onClick={()=>setBetModal(null)} style={{...S.btn("transparent","#333",{marginTop:8,border:"1px solid #222",fontSize:11})}}>Annuler</button>
          </div>
        </div>
      )}

      {/* MODAL CRÉER */}
      {createOpen && me && (
        <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.92)",
          backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={()=>setCreateOpen(false)}>
          <div style={{background:"#111",border:"2px solid #ffdc32",borderRadius:10,padding:26,maxWidth:400,width:"100%"}}
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
                    borderRadius:10,padding:4,cursor:"pointer"}}>{e}</button>
                ))}
              </div>
            </Field>
            <Field label="TITRE">
              <textarea value={draft.title} onChange={e=>setDraft(d=>({...d,title:e.target.value}))}
                placeholder="Ex: Le prof de maths sera absent lundi ?"
                rows={3} style={{width:"100%",background:"#0d0d0d",border:"1px solid #2a2a2a",
                  color:"#e8e0d0",padding:"10px 12px",borderRadius:6,fontSize:12,
                  fontFamily:"inherit",outline:"none",resize:"none",boxSizing:"border-box"}}/>
            </Field>
            <Field label="CATÉGORIE">
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {["profs","eleves","cours","vie scolaire","hors les murs"].map(cat=>(
                  <button key={cat} onClick={()=>setDraft(d=>({...d,category:cat}))} style={{
                    background:draft.category===cat?`${CAT_COLOR[cat]}20`:"transparent",
                    color:draft.category===cat?CAT_COLOR[cat]:"#444",
                    border:draft.category===cat?`1px solid ${CAT_COLOR[cat]}50`:"1px solid #252525",
                    padding:"5px 10px",borderRadius:6,cursor:"pointer",fontSize:9,
                    fontWeight:"bold",fontFamily:"inherit",letterSpacing:1}}>
                    {cat.toUpperCase()}
                  </button>
                ))}
              </div>
            </Field>
            {draftErr&&<div style={{color:"#ef4444",fontSize:11,marginBottom:16,padding:"8px 12px",background:"#1a0505",borderRadius:6}}>{draftErr}</div>}
            <Field label="DATE LIMITE DE PARI (optionnel)">
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <input type="datetime-local" value={draft.deadline}
                  onChange={e=>setDraft(d=>({...d,deadline:e.target.value}))}
                  style={{flex:1,background:"#1a1a1a",border:"1px solid #333",color:"#e8e0d0",
                    padding:"8px 12px",borderRadius:6,fontSize:11,fontFamily:"inherit",outline:"none",
                    colorScheme:"dark"}}/>
                {draft.deadline && (
                  <button onClick={()=>setDraft(d=>({...d,deadline:""}))}
                    style={{background:"transparent",border:"none",color:"#555",cursor:"pointer",fontSize:13}}>✕</button>
                )}
              </div>
              {draft.deadline && (
                <div style={{fontSize:9,color:"#444",marginTop:4}}>
                  ⏳ Les paris seront bloqués après cette date
                </div>
              )}
            </Field>
            <button onClick={createMarket} style={{...S.btn("#ffdc32","#0d0d0d")}}>→ PUBLIER</button>
            <button onClick={()=>setCreateOpen(false)} style={{...S.btn("transparent","#333",{marginTop:8,border:"1px solid #222",fontSize:11})}}>Annuler</button>
          </div>
        </div>
      )}

      {/* MODAL ANNONCE */}
      {announceOpen && (
        <div style={{position:"fixed",inset:0,zIndex:400,background:"rgba(0,0,0,0.95)",
          backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={()=>setAnnounceOpen(null)}>
          <div style={{background:"#111",border:"2px solid #6366f1",borderRadius:10,
            padding:32,maxWidth:480,width:"100%",maxHeight:"80vh",overflowY:"auto"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:9,color:"#6366f1",letterSpacing:3,marginBottom:16,fontWeight:"bold"}}>
              📢 ANNONCE
            </div>
            <div style={{fontSize:16,fontWeight:"bold",marginBottom:4,color:"#a5b4fc"}}>
              {announceOpen.marketTitle}
            </div>
            <div style={{fontSize:9,color:"#444",marginBottom:16}}>
              {new Date(announceOpen.ts).toLocaleDateString("fr-FR",{day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"})}
            </div>
            <div style={{fontSize:12,color:"#ccc",lineHeight:1.8,whiteSpace:"pre-wrap"}}>
              {announceOpen.annBody}
            </div>
            <button onClick={()=>setAnnounceOpen(null)}
              style={{marginTop:20,background:"#6366f1",color:"#fff",border:"none",
                padding:"8px 20px",borderRadius:6,cursor:"pointer",
                fontWeight:"bold",fontSize:10,fontFamily:"inherit"}}>
              ✓ Fermer
            </button>
          </div>
        </div>
      )}

      {/* MODAL RÉSOUDRE */}
      {resolveModal && (
        <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.92)",
          backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={()=>setResolveModal(null)}>
          <div style={{background:"#111",border:"2px solid #a855f7",borderRadius:10,padding:32,maxWidth:400,width:"100%"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:16,fontWeight:"bold",marginBottom:8}}>Clôturer ce marché</div>
            <div style={{fontSize:13,color:"#888",marginBottom:20,fontStyle:"italic"}}>« {resolveModal.title} »</div>
            <div style={{fontSize:9,color:"#444",letterSpacing:2,marginBottom:10}}>QUI GAGNE ?</div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>resolveMarket(resolveModal.id,"yes")}
                style={{...S.btn("#10b981","#fff",{flex:1})}}>✅ OUI gagne</button>
              <button onClick={()=>resolveMarket(resolveModal.id,"no")}
                style={{...S.btn("#ef4444","#fff",{flex:1})}}>❌ NON gagne</button>
            </div>
            <button onClick={()=>setResolveModal(null)}
              style={{...S.btn("transparent","#333",{marginTop:8,border:"1px solid #222",fontSize:11})}}>Annuler</button>
          </div>
        </div>
      )}

      {/* MODAL WALLET ADMIN */}
      {walletModal && (
        <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.92)",
          backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={()=>setWalletModal(null)}>
          <div style={{background:"#111",border:"2px solid #ffdc32",borderRadius:10,padding:32,maxWidth:340,width:"100%"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:16,fontWeight:"bold",marginBottom:4}}>💰 Modifier le wallet</div>
            <div style={{fontSize:12,color:"#888",marginBottom:4}}>{walletModal.pseudo}</div>
            <div style={{fontSize:13,color:"#ffdc32",marginBottom:16}}>Solde actuel : {walletModal.wallet.toLocaleString()} SC</div>
            <input type="number" value={walletAmt} onChange={e=>setWalletAmt(e.target.value)}
              placeholder="Ex: +500 ou -200"
              style={{width:"100%",background:"#0d0d0d",border:"1px solid #2a2a2a",color:"#e8e0d0",
                padding:"10px 12px",borderRadius:6,fontSize:15,fontFamily:"inherit",outline:"none",boxSizing:"border-box",marginBottom:12}}/>
            <button onClick={()=>adminSetWallet(walletModal.id)}
              style={{...S.btn("#ffdc32","#0d0d0d")}}>✓ APPLIQUER</button>
            <button onClick={()=>setWalletModal(null)}
              style={{...S.btn("transparent","#333",{marginTop:8,border:"1px solid #222",fontSize:11})}}>Annuler</button>
          </div>
        </div>
      )}

      {/* MODAL RENOMMER */}
      {renamModal && (
        <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.92)",
          backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={()=>setRenamModal(null)}>
          <div style={{background:"#111",border:"2px solid #3b82f6",borderRadius:10,padding:32,maxWidth:340,width:"100%"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:16,fontWeight:"bold",marginBottom:4}}>✏️ Renommer</div>
            <div style={{fontSize:12,color:"#888",marginBottom:16}}>Actuel : <b>{renamModal.pseudo}</b></div>
            <input value={renamInput} onChange={e=>setRenamInput(e.target.value)} placeholder="Nouveau pseudo..."
              style={{width:"100%",background:"#0d0d0d",border:"1px solid #2a2a2a",color:"#e8e0d0",
                padding:"10px 12px",borderRadius:6,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",marginBottom:8}}/>
            {renamErr&&<div style={{color:"#ef4444",fontSize:11,marginBottom:8}}>{renamErr}</div>}
            <button onClick={()=>adminRename(renamModal.id)}
              style={{...S.btn("#3b82f6","#fff")}}>✓ RENOMMER</button>
            <button onClick={()=>setRenamModal(null)}
              style={{...S.btn("transparent","#333",{marginTop:8,border:"1px solid #222",fontSize:11})}}>Annuler</button>
          </div>
        </div>
      )}

      {/* MODAL BAN */}
      {banConfirm && (
        <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.92)",
          backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={()=>setBanConfirm(null)}>
          <div style={{background:"#111",border:"2px solid #ef4444",borderRadius:10,padding:32,maxWidth:340,width:"100%"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:16,fontWeight:"bold",marginBottom:8}}>
              {banConfirm.banned?"Débannir":"Bannir"} {banConfirm.pseudo} ?
            </div>
            {!banConfirm.banned&&<div style={{fontSize:11,color:"#555",marginBottom:20}}>
              Ses marchés actifs seront supprimés et ses parieurs remboursés.</div>}
            <div style={{display:"flex",gap:16,marginTop:16}}>
              <button onClick={()=>setBanConfirm(null)}
                style={{...S.btn("transparent","#555",{flex:1,border:"1px solid #2a2a2a"})}}>Annuler</button>
              <button onClick={()=>adminBan(banConfirm.id)}
                style={{...S.btn(banConfirm.banned?"#10b981":"#ef4444","#fff",{flex:1})}}>
                {banConfirm.banned?"✅ Débannir":"🚫 Bannir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUPPRESSION / RETRAIT */}
      {delConfirm && (
        <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.92)",
          backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={()=>setDelConfirm(null)}>
          <div style={{background:"#111",border:"2px solid #ef4444",borderRadius:10,padding:32,maxWidth:400,width:"100%"}}
            onClick={e=>e.stopPropagation()}>
            {delConfirm.type==="market" ? (
              <>
                <div style={{fontSize:28,marginBottom:10}}>🗑</div>
                <div style={{fontSize:16,fontWeight:"bold",marginBottom:8}}>
                  {delConfirm.market.resolved?"Supprimer ce marché résolu ?":"Supprimer ce marché ?"}
                </div>
                <div style={{fontSize:13,color:"#888",marginBottom:16,fontStyle:"italic"}}>« {delConfirm.market.title} »</div>
                <div style={{fontSize:11,color:"#555",marginBottom:22,lineHeight:1.6,padding:"10px 12px",background:"#1a1a1a",borderRadius:6}}>
                  {delConfirm.market.resolved
                    ? "ℹ️ Ce marché est déjà résolu. Suppression définitive sans remboursement."
                    : `⚠️ Les ${(delConfirm.market.bets||[]).filter(b=>!b.isPenalty).length} paris actifs seront remboursés.`}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setDelConfirm(null)} style={{...S.btn("transparent","#555",{flex:1,border:"1px solid #2a2a2a"})}}>← ANNULER</button>
                  <button onClick={()=>deleteMarket(delConfirm.market.id)} style={{...S.btn("#ef4444","#fff",{flex:1})}}>🗑 SUPPRIMER</button>
                </div>
              </>
            ) : (
              <>
                <div style={{fontSize:28,marginBottom:10}}>↩</div>
                <div style={{fontSize:16,fontWeight:"bold",marginBottom:8}}>Retirer ton pari ?</div>
                <div style={{fontSize:13,color:"#888",marginBottom:16,fontStyle:"italic"}}>« {delConfirm.market.title} »</div>
                {(()=>{
                  const b=(delConfirm.market.bets||[]).find(x=>x.userId===me?.id);
                  const penalty = b ? Math.floor(b.amount*0.5) : 0;
                  const refund  = b ? b.amount - penalty : 0;
                  return (
                    <div style={{marginBottom:22,padding:"12px 14px",background:"#1a1a1a",borderRadius:6,border:"1px solid #2a2a2a",lineHeight:2}}>
                      <div style={{fontSize:11,color:"#555"}}>Mise initiale : <span style={{color:"#e8e0d0",fontWeight:"bold"}}>{b?.amount} SC</span></div>
                      <div style={{fontSize:11,color:"#10b981"}}>✅ Remboursé : <span style={{fontWeight:"bold"}}>{refund} SC</span></div>
                      <div style={{fontSize:11,color:"#ef4444"}}>🔥 Pénalité (50%) : <span style={{fontWeight:"bold"}}>−{penalty} SC → cagnotte</span></div>
                      <div style={{fontSize:10,color:"#444",marginTop:4}}>La pénalité est distribuée aux gagnants à la clôture.</div>
                    </div>
                  );
                })()}
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setDelConfirm(null)} style={{...S.btn("transparent","#555",{flex:1,border:"1px solid #2a2a2a"})}}>← GARDER</button>
                  <button onClick={()=>deleteBet(delConfirm.market.id)} style={{...S.btn("#ef4444","#fff",{flex:1})}}>↩ RETIRER (−50%)</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
