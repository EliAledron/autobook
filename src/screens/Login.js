import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
    <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.8 6.5 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.6-8 19.6-20 0-1.3-.1-2.7-.4-4z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.8 6.5 29.2 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.8-1.8 13.4-4.7l-6.2-5.2C29.3 35.5 26.8 36 24 36c-5.2 0-9.7-3.3-11.3-8H6.4C9.7 38.9 16.3 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C40.9 35.4 44 30.1 44 24c0-1.3-.1-2.7-.4-4z" />
  </svg>
);

async function checkStatusAndNavigate(uid, navigate, setError) {
  const snap = await getDoc(doc(db, "users", uid));

  if (!snap.exists()) {
    navigate("/dashboard");
    return;
  }

  const data = snap.data();
  const status = data.status || "pending";
  const role = (data.role || "").toLowerCase();

  // Legacy Admin roles get direct access
  if (role === "admin") {
    navigate("/dashboard");
    return;
  }

  if (status === "approved") {
    navigate("/dashboard");
    return;
  }

  if (status === "rejected") {
    setError("Your account has been rejected. Please contact support.");
    return;
  }

  navigate("/pending");
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      await checkStatusAndNavigate(user.uid, navigate, setError);
    } catch (err) {
      const bad = ["auth/user-not-found", "auth/wrong-password", "auth/invalid-credential"];
      setError(bad.includes(err.code) ? "Incorrect email or password." : err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      await checkStatusAndNavigate(result.user.uid, navigate, setError);
    } catch {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.topAccent} />
      <button style={s.backBtn} onClick={() => navigate(-1)} aria-label="Back" onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
        <span>Back</span>
      </button>
      <div style={s.scroll}>
        <div style={s.header}>
          <div style={s.logoRing}>
            <img src="/autobook-logo.png" alt="AutoBook" style={s.logo} />
          </div>
          <h1 style={s.appName}>AutoBook</h1>
          <p style={s.tagline}>Welcome back</p>
        </div>

        {error && (
          <div style={s.errorBox}>
            <span style={s.errorDot} />
            {error}
          </div>
        )}

        <div style={s.card}>
          <label style={s.label}>Email</label>
          <input type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} style={s.input} required />

          <label style={s.label}>Password</label>
          <input type="password" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} style={s.input} required />

          <button onClick={handleLogin} style={{ ...s.primaryBtn, opacity: loading ? 0.75 : 1 }} disabled={loading}>
            {loading ? "Signing in…" : "Log in"}
          </button>

          <div style={s.divider}>
            <div style={s.dividerLine} /><span style={s.dividerLabel}>or</span><div style={s.dividerLine} />
          </div>

          <button onClick={handleGoogleLogin} style={s.googleBtn} disabled={loading}>
            <GoogleIcon />Continue with Google
          </button>
        </div>

        <div style={s.switchRow}>
          <span style={s.switchText}>Don't have an account?</span>
          <button style={s.switchBtn} onClick={() => navigate("/signup")}>Sign up</button>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "#f5f7fa", display: "flex", flexDirection: "column", fontFamily: "'Segoe UI', system-ui, sans-serif", position: "relative" },
  topAccent: { position: "absolute", top: 0, left: 0, right: 0, height: "220px", background: "linear-gradient(160deg, #1a3a5c 0%, #2a5298 100%)", zIndex: 0, borderBottomLeftRadius: "32px", borderBottomRightRadius: "32px" },
  scroll: { flex: 1, padding: "0 20px 40px", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", zIndex: 1 },
  header: { display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "52px", marginBottom: "24px" },
  logoRing: { width: "80px", height: "80px", borderRadius: "50%", border: "3px solid rgba(70,233,255,0.8)", padding: "3px", background: "rgba(255,255,255,0.15)", marginBottom: "12px", overflow: "hidden" },
  logo: { width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" },
  appName: { fontSize: "22px", fontWeight: "700", color: "#fff", margin: "0 0 4px", letterSpacing: "0.5px" },
  tagline: { fontSize: "14px", color: "rgba(255,255,255,0.75)", margin: 0 },
  backBtn: { position: "absolute", top: "24px", left: "24px", background: "transparent", border: "none", display: "flex", alignItems: "center", gap: "6px", color: "#fff", fontSize: "15px", fontWeight: "600", cursor: "pointer", zIndex: 10, padding: "8px 12px", borderRadius: "20px", transition: "background 0.2s ease" },
  errorBox: { width: "100%", maxWidth: "400px", display: "flex", alignItems: "center", gap: "8px", background: "#fff3f3", border: "1px solid #fca5a5", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#b91c1c", marginBottom: "12px", boxSizing: "border-box" },
  errorDot: { width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444", flexShrink: 0, display: "inline-block" },
  card: { width: "100%", maxWidth: "400px", background: "#ffffff", borderRadius: "20px", padding: "24px 20px", boxSizing: "border-box", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" },
  label: { display: "block", fontSize: "12px", fontWeight: "600", color: "#6b7280", letterSpacing: "0.4px", textTransform: "uppercase", marginBottom: "6px" },
  input: { display: "block", width: "100%", padding: "13px 14px", fontSize: "15px", border: "1.5px solid #e5e7eb", borderRadius: "10px", outline: "none", background: "#f9fafb", color: "#111827", boxSizing: "border-box", marginBottom: "16px", appearance: "none", fontFamily: "inherit" },
  primaryBtn: { width: "100%", padding: "14px", background: "linear-gradient(135deg, #1a3a5c, #2a5298)", color: "#fff", fontSize: "15px", fontWeight: "600", border: "none", borderRadius: "12px", cursor: "pointer", marginTop: "4px", marginBottom: "16px" },
  divider: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" },
  dividerLine: { flex: 1, height: "1px", background: "#e5e7eb" },
  dividerLabel: { fontSize: "13px", color: "#9ca3af" },
  googleBtn: { width: "100%", padding: "13px 14px", background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: "12px", fontSize: "15px", fontWeight: "600", color: "#374151", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", fontFamily: "inherit" },
  switchRow: { display: "flex", alignItems: "center", gap: "8px", marginTop: "24px", padding: "16px 20px", background: "#ffffff", borderRadius: "14px", width: "100%", maxWidth: "400px", boxSizing: "border-box", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
  switchText: { fontSize: "14px", color: "#6b7280" },
  switchBtn: { fontSize: "14px", fontWeight: "700", color: "#2a5298", background: "none", border: "none", cursor: "pointer", padding: 0 },
};