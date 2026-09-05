import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import BackButton from "../components/BackButton";
import { AlertTriangle, CheckCircle } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err) {
      const bad = ["auth/user-not-found", "auth/invalid-email"];
      setError(bad.includes(err.code) ? "Invalid email address or user not found." : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.topAccent} />
      <div style={{ position: "absolute", top: 20, left: 10, zIndex: 10 }}>
        <BackButton variant="light" />
      </div>
      <div style={s.scroll}>
        <div style={s.header}>
          <div style={s.logoRing}>
            <img src="/autobook-logo.png" alt="AutoBook" style={s.logo} />
          </div>
          <h1 style={s.appName}>AutoBook</h1>
          <p style={s.tagline}>Reset your password</p>
        </div>

        {error && (
          <div style={s.errorOverlay}>
            <div style={s.errorModal}>
              <div style={s.errorModalIcon}><AlertTriangle size={24} color="#ef4444" /></div>
              <h3 style={s.errorModalTitle}>Oops!</h3>
              <p style={s.errorModalText}>{error}</p>
              <button style={s.errorModalBtn} onClick={() => setError("")}>Okay</button>
            </div>
          </div>
        )}

        {success && (
          <div style={s.errorOverlay}>
            <div style={s.errorModal}>
              <div style={{...s.errorModalIcon, background: "#dcfce7"}}><CheckCircle size={24} color="#16a34a" /></div>
              <h3 style={s.errorModalTitle}>Check your email</h3>
              <p style={s.errorModalText}>We've sent you instructions to reset your password. Please check your inbox and spam folder.</p>
              <button style={{...s.errorModalBtn, background: "#16a34a"}} onClick={() => navigate("/login")}>Back to Login</button>
            </div>
          </div>
        )}

        <div style={s.card}>
          <p style={s.instructions}>Enter the email address associated with your account, and we'll send you a link to reset your password.</p>
          <label style={s.label}>Email</label>
          <input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={s.input}
            required
          />

          <button
            onClick={handleResetPassword}
            style={{ ...s.primaryBtn, opacity: loading ? 0.75 : 1 }}
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "#f5f7fa", display: "flex", flexDirection: "column", fontFamily: "'Inter', system-ui, -apple-system, sans-serif", position: "relative" },
  topAccent: { position: "absolute", top: 0, left: 0, right: 0, height: "220px", background: "linear-gradient(160deg, #1a3a5c 0%, #2a5298 100%)", zIndex: 0, borderBottomLeftRadius: "32px", borderBottomRightRadius: "32px" },
  scroll: { flex: 1, padding: "0 20px 40px", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", zIndex: 1 },
  header: { display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "52px", marginBottom: "24px" },
  logoRing: { width: "80px", height: "80px", borderRadius: "50%", border: "3px solid rgba(70,233,255,0.8)", padding: "3px", background: "rgba(255,255,255,0.15)", marginBottom: "12px", overflow: "hidden" },
  logo: { width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" },
  appName: { fontSize: "22px", fontWeight: "700", color: "#fff", margin: "0 0 4px", letterSpacing: "0.5px" },
  tagline: { fontSize: "14px", color: "rgba(255,255,255,0.75)", margin: 0 },
  errorOverlay: {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 9999,
    padding: "20px",
  },
  errorModal: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "24px",
    width: "100%",
    maxWidth: "320px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
    animation: "ab-zoom-in 0.3s ease backwards",
  },
  errorModalIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    background: "#fee2e2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    marginBottom: "16px",
  },
  errorModalTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#111827",
    margin: "0 0 8px 0",
  },
  errorModalText: {
    fontSize: "14px",
    color: "#4b5563",
    margin: "0 0 24px 0",
    lineHeight: "1.5",
  },
  errorModalBtn: {
    width: "100%",
    padding: "12px",
    background: "#ef4444",
    color: "#fff",
    fontSize: "15px",
    fontWeight: "700",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  card: { width: "100%", maxWidth: "400px", background: "#ffffff", borderRadius: "20px", padding: "24px 20px", boxSizing: "border-box", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" },
  instructions: { fontSize: "14px", color: "#4b5563", marginBottom: "20px", lineHeight: "1.5", textAlign: "center" },
  label: { display: "block", fontSize: "12px", fontWeight: "600", color: "#6b7280", letterSpacing: "0.4px", textTransform: "uppercase", marginBottom: "6px" },
  input: { display: "block", width: "100%", padding: "13px 14px", fontSize: "15px", border: "1.5px solid #e5e7eb", borderRadius: "10px", outline: "none", background: "#f9fafb", color: "#111827", boxSizing: "border-box", marginBottom: "24px", appearance: "none", fontFamily: "inherit" },
  primaryBtn: { width: "100%", padding: "14px", background: "linear-gradient(135deg, #1a3a5c, #2a5298)", color: "#fff", fontSize: "15px", fontWeight: "600", border: "none", borderRadius: "12px", cursor: "pointer" },
};
