import React, { useEffect, useState } from "react";
import { Hourglass, Clock, CheckCircle, XCircle, Mail, RefreshCw, LogOut, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CarLoader from "../components/CarLoader";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut, sendEmailVerification } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

const keyframes = `
  @keyframes pulse-soft {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.05); opacity: 0.8; }
  }
`;

export default function PendingApproval() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [name, setName] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let docUnsub = null;

    const authUnsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/");
        return;
      }

      if (!user.emailVerified) {
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

  const handleCheckVerification = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        setStatus("loading");
        window.location.reload();
      } else {
        alert("Email not verified yet. Please check your inbox or spam folder.");
      }
    }
  };

  const handleResendEmail = async () => {
    if (auth.currentUser && resendCooldown === 0) {
      try {
        await sendEmailVerification(auth.currentUser);
        alert("Verification email resent! Please check your inbox and spam folder.");
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
        alert("Error resending email: " + err.message);
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div style={s.page}>
      <style>{keyframes}</style>
      
      <div style={s.card}>
        {status === "loading" && (
          <div style={s.stateContainer}>
            <CarLoader text="Loading your profile..." />
          </div>
        )}

        {status === "unverified" && (
          <div style={s.stateContainer}>
            <div style={{ ...s.iconWrap, background: "#e0f2fe", color: "#0ea5e9" }}>
              <Mail size={40} />
            </div>
            <h2 style={s.title}>Verify your email</h2>
            <p style={s.subtitle}>
              We sent a verification link to your email address. Please click the link to verify your account, then click the button below.
            </p>

            <div style={s.actionGroup}>
              <button style={s.primaryBtn} onClick={handleCheckVerification}>
                <RefreshCw size={18} /> I have verified my email
              </button>
              
              <button 
                style={{ ...s.secondaryBtn, opacity: resendCooldown > 0 ? 0.6 : 1 }} 
                onClick={handleResendEmail} 
                disabled={resendCooldown > 0}
              >
                <Send size={18} />
                {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : 'Resend Verification Email'}
              </button>
              
              <button style={s.ghostBtn} onClick={handleLogout}>
                <LogOut size={18} /> Sign out
              </button>
            </div>
          </div>
        )}

        {status === "pending" && (
          <div style={s.stateContainer}>
            <div style={{ ...s.iconWrap, background: "#fef3c7", color: "#d97706", animation: "pulse-soft 2s infinite" }}>
              <Clock size={40} />
            </div>
            <h2 style={s.title}>Waiting for approval</h2>
            <p style={s.subtitle}>
              Hi {name}! Your account is under review. Please wait for an admin to approve your registration.
            </p>

            <div style={s.actionGroup}>
              <button style={s.ghostBtn} onClick={handleLogout}>
                <LogOut size={18} /> Sign out
              </button>
            </div>
          </div>
        )}

        {status === "approved" && (
          <div style={s.stateContainer}>
            <div style={{ ...s.iconWrap, background: "#dcfce7", color: "#16a34a" }}>
              <CheckCircle size={40} />
            </div>
            <h2 style={s.title}>Approved!</h2>
            <p style={s.subtitle}>Redirecting to your dashboard...</p>
          </div>
        )}

        {status === "rejected" && (
          <div style={s.stateContainer}>
            <div style={{ ...s.iconWrap, background: "#fee2e2", color: "#dc2626" }}>
              <XCircle size={40} />
            </div>
            <h2 style={s.title}>Account Rejected</h2>
            <p style={s.subtitle}>
              Your application was not approved. Please contact the administrator for more information.
            </p>

            <div style={s.actionGroup}>
              <button style={s.ghostBtn} onClick={handleLogout}>
                <LogOut size={18} /> Back to login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#f4f7f9",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    padding: "20px",
  },
  card: {
    background: "#ffffff",
    width: "100%",
    maxWidth: "440px",
    borderRadius: "24px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.05)",
    padding: "48px 32px",
    textAlign: "center",
  },
  stateContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  iconWrap: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "24px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "800",
    color: "#0f2640",
    margin: "0 0 12px 0",
  },
  subtitle: {
    fontSize: "15px",
    color: "#64748b",
    lineHeight: "1.6",
    margin: "0 0 32px 0",
  },
  actionGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    width: "100%",
  },
  primaryBtn: {
    background: "linear-gradient(135deg, #0f2640 0%, #2a5298 100%)",
    color: "#fff",
    border: "none",
    padding: "16px",
    borderRadius: "16px",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    width: "100%",
    boxShadow: "0 4px 12px rgba(15, 38, 64, 0.2)",
  },
  secondaryBtn: {
    background: "#fff",
    color: "#334155",
    border: "1.5px solid #e2e8f0",
    padding: "16px",
    borderRadius: "16px",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    width: "100%",
  },
  ghostBtn: {
    background: "transparent",
    color: "#64748b",
    border: "none",
    padding: "16px",
    borderRadius: "16px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    width: "100%",
  }
};
