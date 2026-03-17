import { useEffect, useState } from "react";

export default function SchoolMarket() {
  const [tick, setTick] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => !t), 900);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0d0d0d",
      fontFamily: "'Courier New', monospace",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "40px 20px",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        backgroundImage:
          "linear-gradient(rgba(255,220,50,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,220,50,0.04) 1px, transparent 1px)",
        backgroundSize: "44px 44px",
      }}/>
      <div style={{ position: "relative", zIndex: 1, maxWidth: 480 }}>
        <div style={{
          fontSize: 30,
          fontWeight: "bold",
          letterSpacing: 4,
          color: "#ffdc32",
          marginBottom: 36,
        }}>
          SM<span style={{ color: "#555" }}>.</span>
        </div>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontSize: 10,
          letterSpacing: 2,
          color: "#ef4444",
          background: "rgba(239,68,68,0.1)",
          border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: 4,
          padding: "5px 14px",
          marginBottom: 28,
        }}>
          <div style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#ef4444",
            opacity: tick ? 1 : 0.25,
            transition: "opacity 0.3s ease",
          }}/>
          SUSPENDU
        </div>
        <div style={{
          fontSize: 15,
          fontWeight: "bold",
          color: "#e8e0d0",
          letterSpacing: 1,
          marginBottom: 14,
          lineHeight: 1.6,
        }}>
          SchoolMarket est temporairement hors ligne.
        </div>
        <div style={{
          fontSize: 11,
          color: "#555",
          letterSpacing: 1,
          lineHeight: 1.9,
          marginBottom: 36,
        }}>
          Suite à des abus répétés, nous avons dû fermer l'accès au site.<br/>
          Merci à tous ceux qui ont joué fair-play.
        </div>
        <div style={{
          width: 40,
          height: 1,
          background: "#ffdc32",
          margin: "0 auto 28px",
        }}/>
        <div style={{
          fontSize: 10,
          letterSpacing: 3,
          color: "#ffdc32",
          opacity: 0.85,
        }}>
          ↗ UNE MEILLEURE VERSION AVEC DE NOUVELLES FONCTIONNALITÉS ARRIVE BIENTÔT
        </div>
      </div>
    </div>
  );
}
