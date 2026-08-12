import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

const keyframes = `
  @keyframes ab-drive  { 0%{transform:translateX(-120px)} 100%{transform:translateX(calc(100vw + 120px))} }
  @keyframes ab-wheel  { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
  @keyframes ab-road   { 0%{transform:translateX(0)} 100%{transform:translateX(-80px)} }
  @keyframes ab-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
  @keyframes ab-pulse  { 0%,100%{opacity:1} 50%{opacity:0.35} }
  @keyframes ab-float  { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-8px)} }
`;

export default function PendingApproval() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [name, setName] = useState("");

  useEffect(() => {
    let docUnsub = null;

    const authUnsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/");
        return;
      }

      const userRef = doc(db, "users", user.uid);

      docUnsub = onSnapshot(userRef, (snap) => {
        if (!snap.exists()) {
          setStatus("pending");
          return;
        }

        const data = snap.data();
        setName(data.displayName?.split(" ")[0] || "there");

        const currentStatus = data.status || "pending";
        setStatus(currentStatus);

        if (currentStatus === "approved") {
          setTimeout(() => navigate("/dashboard"), 1200);
        }
      });
    });

    return () => {
      authUnsub();
      if (docUnsub) docUnsub();
    };
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <>
      <style>{keyframes}</style>

      <div style={s.page}>
        {/* ===== ANIMATION ===== */}
        <div style={s.scene}>
          <div style={s.carGroup}>
            <div style={s.exhaust}>
              <div style={{ ...s.puff, animationDelay: "0s" }} />
              <div style={{ ...s.puff, width: 4, height: 4, animationDelay: "0.1s" }} />
              <div style={{ ...s.puff, width: 3, height: 3, animationDelay: "0.2s" }} />
            </div>

            <div style={s.carBody}>
              <div style={s.carRoof}>
                <div style={s.winFront} />
                <div style={s.winRear} />
              </div>
              <div style={s.headlight} />
              <div style={s.taillight} />

              <div style={{ ...s.wheelWrap, right: 10, left: "auto" }}>
                <div style={s.wheel}><div style={s.spoke} /></div>
              </div>

              <div style={{ ...s.wheelWrap, left: 10 }}>
                <div style={s.wheel}><div style={s.spoke} /></div>
              </div>
            </div>
          </div>
        </div>

        <div style={s.road}>
          <div style={s.roadDashes}>
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} style={s.dash} />
            ))}
          </div>
        </div>

        {/* ===== CONTENT ===== */}
        <div style={s.content}>
          {status === "loading" && (
            <>
              <div style={s.icon}>⏳</div>
              <h2 style={s.title}>Loading...</h2>
            </>
          )}

          {status === "pending" && (
            <>
              <div style={{ ...s.icon, animation: "ab-float 2s ease-in-out infinite" }}>🕐</div>
              <h2 style={s.title}>Waiting for approval</h2>
              <p style={s.subtitle}>
                Hi {name}! Your account is under review. Please wait for admin approval.
              </p>

              <button style={s.logoutBtn} onClick={handleLogout}>
                Sign out
              </button>
            </>
          )}

          {status === "approved" && (
            <>
              <div style={{ ...s.icon, animation: "ab-float 1.5s ease-in-out infinite" }}>✅</div>
              <h2 style={s.title}>Approved!</h2>
              <p style={s.subtitle}>Redirecting to dashboard...</p>
            </>
          )}

          {status === "rejected" && (
            <>
              <div style={s.icon}>❌</div>
              <h2 style={s.title}>Account rejected</h2>
              <p style={s.subtitle}>
                Your application was not approved. Please contact the admin.
              </p>

              <button style={s.logoutBtn} onClick={handleLogout}>
                Back to login
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/* ===== STYLES ===== */
const s = {
  page: {
    minHeight: "100vh",
    background: "#1a3a5c",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    fontFamily: "Segoe UI, sans-serif",
    paddingBottom: "2rem",
  },

  scene: {
    width: "100vw",
    height: "70px",
    position: "relative",
    overflow: "hidden",
    marginTop: "3rem",
  },

  carGroup: {
    position: "absolute",
    bottom: "8px",
    animation: "ab-drive 2s infinite, ab-bounce 0.4s infinite",
  },

  exhaust: {
    position: "absolute",
    left: "-16px",
    top: "14px",
    display: "flex",
    gap: "3px",
  },

  puff: {
    width: 6,
    height: 6,
    background: "rgba(255,255,255,0.12)",
    borderRadius: "50%",
    animation: "ab-pulse 0.3s infinite",
  },

  carBody: {
    width: "80px",
    height: "28px",
    background: "#f97316",
    borderRadius: "6px",
    position: "relative",
  },

  carRoof: {
    position: "absolute",
    top: "-16px",
    left: "12px",
    width: "48px",
    height: "18px",
    background: "#ea6c0a",
    borderRadius: "6px",
  },

  winFront: {
    position: "absolute",
    top: "3px",
    left: "4px",
    width: "18px",
    height: "12px",
    background: "rgba(70,233,255,0.45)",
  },

  winRear: {
    position: "absolute",
    top: "3px",
    left: "25px",
    width: "18px",
    height: "12px",
    background: "rgba(70,233,255,0.45)",
  },

  headlight: {
    position: "absolute",
    right: "-4px",
    top: "9px",
    width: "6px",
    height: "6px",
    background: "#fef08a",
    borderRadius: "50%",
  },

  taillight: {
    position: "absolute",
    left: "-4px",
    top: "9px",
    width: "5px",
    height: "5px",
    background: "#ef4444",
    borderRadius: "50%",
    animation: "ab-pulse 0.4s infinite",
  },

  wheelWrap: {
    position: "absolute",
    bottom: "-8px",
  },

  wheel: {
    width: "16px",
    height: "16px",
    background: "#1e293b",
    borderRadius: "50%",
    border: "3px solid #94a3b8",
    animation: "ab-wheel 0.35s linear infinite",
  },

  spoke: {
    width: "1.5px",
    height: "7px",
    background: "#94a3b8",
  },

  road: {
    width: "100vw",
    height: "6px",
    background: "#2a5298",
    overflow: "hidden",
  },

  roadDashes: {
    display: "flex",
    gap: "16px",
    animation: "ab-road 0.5s linear infinite",
  },

  dash: {
    width: "24px",
    height: "2px",
    background: "rgba(70,233,255,0.35)",
  },

  content: {
    padding: "2rem",
    maxWidth: "400px",
    textAlign: "center",
    color: "#fff",
  },

  icon: { fontSize: "48px", marginBottom: "1rem" },

  title: { fontSize: "20px", fontWeight: "700" },

  subtitle: { fontSize: "14px", opacity: 0.7, marginTop: "10px" },

  logoutBtn: {
    marginTop: "20px",
    padding: "12px",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
  },
};
