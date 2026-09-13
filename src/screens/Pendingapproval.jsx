import React, { useEffect, useState } from "react";
import { Hourglass, Clock, CheckCircle, XCircle, Mail, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut, sendEmailVerification } from "firebase/auth";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { ErrorModal, SuccessModal } from "./dashboardShared";

const keyframes = `
  @keyframes ab-wheel  { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
  @keyframes ab-road   { 0%{transform:translateX(0)} 100%{transform:translateX(-94px)} }
  @keyframes ab-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
  @keyframes ab-pulse  { 0%,100%{opacity:1} 50%{opacity:0.3} }
  @keyframes ab-puff   { 0%{opacity:0.5;transform:translateX(0) scale(1)} 100%{opacity:0;transform:translateX(-24px) scale(2)} }
  @keyframes ab-streak { 0%{opacity:0;transform:translateX(-40px)} 60%{opacity:1} 100%{opacity:0;transform:translateX(280px)} }
  @keyframes ab-float  { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-8px)} }
`;

export default function PendingApproval() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [reapplying, setReapplying] = useState(false);
  const [devBypass, setDevBypass] = useState(false);

  useEffect(() => {
    let docUnsub = null;

    const authUnsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/");
        return;
      }

      if (!user.emailVerified && !devBypass) {
        setStatus("unverified");
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
        setReason(data.rejectionReason || "");

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
  }, [navigate, devBypass]);

  
  
  const [resendCooldown, setResendCooldown] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleResendEmail = async () => {
    if (auth.currentUser && resendCooldown === 0) {
      try {
        await sendEmailVerification(auth.currentUser);
        setSuccessMsg("Verification email resent! Please check your inbox and spam folder.");
        setResendCooldown(60);
        const interval = setInterval(() => {
          setResendCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } catch (err) {
        setErrorMsg("Error resending email: " + err.message);
      }
    }
  };

  const handleCheckVerification = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        setStatus("loading");
        window.location.reload();
      } else {
        setErrorMsg("Email not verified yet. Please check your inbox or spam folder.");
      }
    }
  };

  const handleReapply = async () => {
    if (!auth.currentUser) return;
    setReapplying(true);
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), { status: "pending", rejectionReason: null });
    } catch (e) {
      console.error(e);
    }
    setReapplying(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <>
      <SuccessModal message={successMsg} onClose={() => setSuccessMsg("")} />
      <ErrorModal error={errorMsg} onClose={() => setErrorMsg("")} />
      <style>{keyframes}</style>

      <div style={s.page}>
        <div style={s.streak1} />
        <div style={s.streak2} />
        {/* ===== ANIMATION ===== */}
        <div style={s.scene}>
          <div style={s.speedLines}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ ...s.speedLine, width: `${28 + i * 14}px`, animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>
          <div style={s.road}>
            <div style={s.roadDashes}>
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} style={s.dash} />
              ))}
            </div>
          </div>
          <div style={s.carWrap}>
            <div style={s.exhaustWrap}>
              <div style={{ ...s.puff, animationDelay: "0s" }} />
              <div style={{ ...s.puff, width: 6, height: 6, animationDelay: "0.18s" }} />
              <div style={{ ...s.puff, width: 5, height: 5, animationDelay: "0.36s" }} />
            </div>
            <div style={s.carOuter}>
              <div style={s.carRoof}>
                <div style={s.winFront} />
                <div style={s.winRear} />
              </div>
              <div style={s.carBody}>
                <div style={s.headlight} />
                <div style={s.headlightBeam} />
                <div style={s.taillight} />
              </div>
              <div style={s.wheelsRow}>
                <div style={s.wheelGap} />
                <div style={s.wheelGroup}>
                  <div style={s.wheel}><div style={s.spoke} /></div>
                </div>
                <div style={{ flex: 1 }} />
                <div style={s.wheelGroup}>
                  <div style={s.wheel}><div style={s.spoke} /></div>
                </div>
                <div style={s.wheelGap} />
              </div>
            </div>
          </div>
        </div>

        {/* ===== CONTENT ===== */}
        <div style={s.content}>
          
          {status === "unverified" && (
            <>
              <div style={{ ...s.icon, animation: "ab-float 2s ease-in-out infinite" }}><Mail size={48} /></div>
              <h2 style={s.title}>Verify your email</h2>
              <p style={s.subtitle}>
                We sent a verification link to your email address. Please click the link to verify your account, then click the button below.
              </p>

              <button style={{...s.logoutBtn, background: "rgba(70, 233, 255, 0.2)", color: "#46e9ff", width: "100%", marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"}} onClick={handleCheckVerification}>
                <RefreshCw size={18} /> I have verified my email
              </button>

              <button style={{...s.logoutBtn, background: "transparent", border: "1px solid rgba(70, 233, 255, 0.5)", color: "#46e9ff", width: "100%", marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "center"}} onClick={handleResendEmail} disabled={resendCooldown > 0}>
                {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : 'Resend Verification Email'}
              </button>

              
              <button style={{...s.logoutBtn, background: "transparent", color: "rgba(255,255,255,0.5)", width: "100%", marginTop: 0}} onClick={handleLogout}>
                Sign out
              </button>

              {import.meta.env.DEV && (
                <button style={{...s.logoutBtn, background: "transparent", border: "1px dashed rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.5)", width: "100%", marginTop: "12px", fontSize: "12px"}} onClick={() => setDevBypass(true)}>
                  Bypass Verification (Dev)
                </button>
              )}
            </>
          )}

          {status === "loading" && (
            <>
              <div style={s.icon}><Hourglass size={48} /></div>
              <h2 style={s.title}>Loading...</h2>
            </>
          )}

          {status === "pending" && (
            <>
              <div style={{ ...s.icon, animation: "ab-float 2s ease-in-out infinite" }}><Clock size={48} /></div>
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
              <div style={{ ...s.icon, animation: "ab-float 1.5s ease-in-out infinite" }}><CheckCircle size={48} /></div>
              <h2 style={s.title}>Approved!</h2>
              <p style={s.subtitle}>Redirecting to dashboard...</p>
            </>
          )}

          {status === "rejected" && (
            <>
              <div style={s.icon}><XCircle size={48} /></div>
              <h2 style={s.title}>Application Rejected</h2>
              <p style={s.subtitle}>
                Unfortunately, your application to join the platform was not approved at this time.
              </p>
              
              {reason && (
                <div style={{ background: "rgba(255,255,255,0.1)", padding: "16px", borderRadius: "12px", width: "100%", boxSizing: "border-box", marginBottom: "24px", borderLeft: "4px solid #ef4444" }}>
                  <div style={{ fontSize: "12px", textTransform: "uppercase", fontWeight: "700", color: "#fca5a5", marginBottom: "4px" }}>Admin Note:</div>
                  <div style={{ fontSize: "14px", color: "#fff", lineHeight: "1.5" }}>{reason}</div>
                </div>
              )}

              <button style={{ ...s.logoutBtn, background: "#3b82f6", color: "#fff", border: "none", marginBottom: "12px", width: "100%" }} onClick={handleReapply} disabled={reapplying}>
                {reapplying ? "Submitting..." : "Re-apply for Review"}
              </button>

              <button style={{ ...s.logoutBtn, background: "transparent", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", marginBottom: "12px", width: "100%" }} onClick={() => window.location.href = "mailto:support@autobook.com"}>
                Contact Support
              </button>

              <button style={{ ...s.logoutBtn, background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", width: "100%", padding: 0 }} onClick={handleLogout}>
                Sign out
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

  streak1: {
    position: "absolute", top: "20%", left: "-10%",
    width: "120%", height: "1px",
    background: "linear-gradient(90deg, transparent, rgba(70,233,255,0.08), transparent)",
    transform: "rotate(-8deg)",
  },
  streak2: {
    position: "absolute", top: "65%", left: "-10%",
    width: "120%", height: "1px",
    background: "linear-gradient(90deg, transparent, rgba(70,233,255,0.06), transparent)",
    transform: "rotate(-8deg)",
  },

  // Scene container
  scene: {
    width: "280px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    position: "relative",
    marginBottom: "32px",
    marginTop: "4rem",
  },

  // Speed streaks (horizontal lines behind car for motion feel)
  speedLines: {
    position: "absolute",
    left: "0px",
    top: "50%",
    transform: "translateY(-28px)",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  speedLine: {
    height: "2px",
    background: "linear-gradient(90deg, transparent, rgba(70,233,255,0.25))",
    borderRadius: "1px",
    animation: "ab-streak 0.8s ease-out infinite",
  },

  // Road
  road: {
    width: "280px",
    height: "10px",
    background: "linear-gradient(180deg, #1e3a5f, #162d4a)",
    borderRadius: "5px",
    position: "relative",
    overflow: "hidden",
    order: 2,
    border: "1px solid rgba(70,233,255,0.1)",
  },
  roadDashes: {
    position: "absolute",
    top: "50%",
    left: 0,
    transform: "translateY(-50%)",
    display: "flex",
    gap: "16px",
    animation: "ab-road 0.4s linear infinite",
  },
  dash: {
    width: "24px",
    height: "2px",
    background: "rgba(70,233,255,0.5)",
    borderRadius: "1px",
    flexShrink: 0,
  },

  // Car
  carWrap: {
    order: 1,
    marginBottom: "3px",
    animation: "ab-bounce 0.4s ease-in-out infinite",
    position: "relative",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  exhaustWrap: {
    position: "absolute",
    left: "-8px",
    bottom: "22px",
    display: "flex",
    flexDirection: "row-reverse",
    gap: "3px",
    alignItems: "center",
  },
  puff: {
    width: 8,
    height: 8,
    background: "rgba(255,255,255,0.15)",
    borderRadius: "50%",
    animation: "ab-puff 0.7s ease-out infinite",
  },
  carOuter: {
    width: "120px",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
  },
  carRoof: {
    marginLeft: "20px",
    marginRight: "12px",
    height: "28px",
    background: "linear-gradient(135deg, #ea6c0a, #f97316)",
    borderRadius: "10px 10px 0 0",
    position: "relative",
    display: "flex",
    alignItems: "flex-end",
    padding: "0 5px",
    boxShadow: "inset 0 -2px 6px rgba(0,0,0,0.2)",
  },
  winFront: {
    width: "34px",
    height: "20px",
    background: "linear-gradient(135deg, rgba(70,233,255,0.55), rgba(70,233,255,0.25))",
    borderRadius: "5px 5px 0 0",
    marginRight: "4px",
    border: "1px solid rgba(70,233,255,0.3)",
  },
  winRear: {
    width: "26px",
    height: "18px",
    background: "linear-gradient(135deg, rgba(70,233,255,0.4), rgba(70,233,255,0.15))",
    borderRadius: "5px 5px 0 0",
    border: "1px solid rgba(70,233,255,0.2)",
  },
  carBody: {
    height: "34px",
    background: "linear-gradient(180deg, #f97316, #ea6c0a)",
    borderRadius: "4px 8px 4px 4px",
    position: "relative",
    boxShadow: "0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
  },
  headlight: {
    position: "absolute",
    right: "-5px",
    top: "12px",
    width: "7px",
    height: "8px",
    background: "#fef08a",
    borderRadius: "0 3px 3px 0",
    boxShadow: "0 0 6px rgba(254,240,138,0.8)",
  },
  headlightBeam: {
    position: "absolute",
    right: "-24px",
    top: "13px",
    width: "22px",
    height: "6px",
    background: "linear-gradient(90deg, rgba(254,240,138,0.4), transparent)",
    borderRadius: "0 4px 4px 0",
  },
  taillight: {
    position: "absolute",
    left: "-5px",
    top: "12px",
    width: "5px",
    height: "8px",
    background: "#ef4444",
    borderRadius: "3px 0 0 3px",
    animation: "ab-pulse 0.5s ease-in-out infinite",
    boxShadow: "0 0 6px rgba(239,68,68,0.6)",
  },
  wheelsRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: "-8px",
  },
  wheelGap: { width: "10px" },
  wheelGroup: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  wheel: {
    width: "22px",
    height: "22px",
    background: "#1e293b",
    borderRadius: "50%",
    border: "3px solid #64748b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    animation: "ab-wheel 0.35s linear infinite",
    boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
  },
  spoke: {
    width: "2px",
    height: "10px",
    background: "#94a3b8",
    borderRadius: "1px",
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
    marginTop: "24px",
    padding: "12px 32px",
    borderRadius: "24px",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    background: "rgba(255, 255, 255, 0.1)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "600",
    transition: "all 0.2s ease",
  },
};
