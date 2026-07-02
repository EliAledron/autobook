import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { sh, colors, getInitials } from "./dashboardShared";
import { useUser } from "../UserContext";
import BackButton from "../components/BackButton";

const CLOUDINARY_CLOUD = "dpwojan8w";
const CLOUDINARY_PRESET = "autobook_uploads";

function isEmail(str) {
  return typeof str === "string" && str.includes("@");
}

function resolveName(a, b) {
  if (a && !isEmail(a)) return a;
  if (b && !isEmail(b)) return b;
  return "User";
}

const emptyCert = () => ({
  name: "", issuingBody: "", date: "",
  photoURL: "", photoFile: null, localPreview: null,
});

// Upload a file to Cloudinary and return the secure URL
async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Cloudinary upload failed: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return data.secure_url;
}

export default function Profile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { refreshUserProfile } = useUser();

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(false);
  const [error, setError] = useState("");

  const [uid, setUid] = useState("");
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [shopName, setShopName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [localPhotoPreview, setLocalPhotoPreview] = useState(null);
  const [certs, setCerts] = useState([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate("/"); return; }
      setUid(user.uid);
      setEmail(user.email || "");
      setPhotoURL(user.photoURL || "");
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const d = snap.data();
        setName(resolveName(d.displayName, user.displayName));
        setRole(d.role || "Customer");
        setPhone(d.phone || "");
        setAddress(d.address || "");
        setPhotoURL(d.photoURL || user.photoURL || "");
        setShopName(d.shopName || d.shopId || "");
        setCerts(d.certifications || []);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [navigate]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(false), 2500);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setLocalPhotoPreview(URL.createObjectURL(file));
  };

  const handleCertPhotoChange = (e, idx) => {
    const file = e.target.files[0];
    if (!file) return;
    const updated = [...certs];
    updated[idx] = { ...updated[idx], photoFile: file, localPreview: URL.createObjectURL(file) };
    setCerts(updated);
  };

  const addCert = () => setCerts([...certs, emptyCert()]);
  const removeCert = (idx) => setCerts(certs.filter((_, i) => i !== idx));
  const updateCert = (idx, field, value) => {
    const updated = [...certs];
    updated[idx] = { ...updated[idx], [field]: value };
    setCerts(updated);
  };

  const handleSave = async () => {
    if (!name.trim()) { setError("Full name cannot be empty."); return; }
    setError("");
    setSaving(true);
    try {
      let finalPhotoURL = photoURL;

      if (photoFile) {
        finalPhotoURL = await uploadToCloudinary(photoFile);
      }

      const resolvedCerts = await Promise.all(
        certs.map(async (cert, idx) => {
          let certPhotoURL = cert.photoURL || "";
          if (cert.photoFile) {
            certPhotoURL = await uploadToCloudinary(cert.photoFile);
          }
          return { name: cert.name, issuingBody: cert.issuingBody, date: cert.date, photoURL: certPhotoURL };
        })
      );

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: name.trim(),
          photoURL: finalPhotoURL || auth.currentUser.photoURL || "",
        });
      }

      await updateDoc(doc(db, "users", uid), {
        displayName: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        photoURL: finalPhotoURL,
        certifications: resolvedCerts,
      });

      setPhotoURL(finalPhotoURL);
      setPhotoFile(null);
      setLocalPhotoPreview(null);
      setCerts(resolvedCerts.map((c) => ({ ...c, photoFile: null, localPreview: null })));
      setEditing(false);
      await refreshUserProfile(); // update avatar globally across all screens
      showToast("Profile saved!");
    } catch (err) {
      // Show the real error message so you know exactly what's wrong
      setError(err.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "12px 14px", fontSize: "14px",
    border: `1.5px solid ${colors.border}`, borderRadius: "10px",
    outline: "none", background: colors.bg, color: colors.textPrimary,
    boxSizing: "border-box", fontFamily: "inherit",
    transition: "border-color 0.2s",
  };

  const handleLogout = async () => {
    const { signOut } = await import("firebase/auth");
    await signOut(auth);
    navigate("/");
  };

  const displayPhoto = localPhotoPreview || photoURL;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: colors.bg }}>
        <p style={{ color: colors.textMuted, fontFamily: "'Segoe UI', sans-serif" }}>Loading…</p>
      </div>
    );
  }

  return (
    <div style={sh.page}>

      {/* TOPBAR */}
      <div style={sh.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
          <BackButton />
          <div style={sh.topbarLogo}>Auto<span style={sh.topbarAccent}>Book</span></div>
        </div>
        <button
          onClick={() => { setEditing(!editing); setError(""); }}
          style={{
            background: editing ? "rgba(255,255,255,0.2)" : colors.accent,
            border: "none",
            color: editing ? "#fff" : colors.navy,
            fontSize: "12px", fontWeight: "700",
            padding: "6px 16px", borderRadius: "20px", cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {editing ? "Cancel" : "Edit"}
        </button>
      </div>

      {/* HERO */}
      <div style={{ ...sh.hero, alignItems: "center", display: "flex", flexDirection: "column", paddingBottom: "2.5rem" }}>
        <div style={{ position: "relative", marginBottom: "10px" }}>
          <div
            onClick={editing ? () => fileInputRef.current?.click() : undefined}
            style={{
              width: "84px", height: "84px", borderRadius: "50%",
              border: `3px solid ${colors.accent}`,
              overflow: "hidden",
              background: "rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "26px", fontWeight: "700", color: "#fff",
              cursor: editing ? "pointer" : "default", flexShrink: 0,
            }}
          >
            {displayPhoto
              ? <img src={displayPhoto} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span>{getInitials(name)}</span>
            }
          </div>
          {editing && (
            <div style={{ position: "absolute", bottom: 0, right: 0, background: colors.navy, width: "26px", height: "26px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", border: `2px solid ${colors.accent}`, pointerEvents: "none" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
            </div>
          )}
        </div>

        {editing && (
          <>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoChange} />
            <button
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.75)", fontSize: "12px", cursor: "pointer", marginBottom: "6px" }}
              onClick={() => fileInputRef.current?.click()}
            >
              Change photo
            </button>
          </>
        )}

        <div style={sh.heroGreeting}>{name}</div>
        <div style={{ ...sh.heroSub, marginBottom: "10px" }}>{email}</div>
        <div style={sh.rolePill}>
          <div style={sh.roleDot} />
          <span style={sh.roleText}>
            {role}{(role || "").toLowerCase() === "owner" && shopName ? ` · ${shopName}` : ""}
          </span>
        </div>
      </div>

      <div style={sh.content}>

        {/* ERROR */}
        {error && (
          <div style={{
            background: colors.dangerBg, border: `1px solid ${colors.danger}`,
            borderRadius: "12px", padding: "10px 14px", fontSize: "13px",
            color: colors.danger, marginBottom: "1rem",
            display: "flex", alignItems: "flex-start", gap: "8px",
          }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: colors.danger, flexShrink: 0, display: "inline-block", marginTop: "5px" }} />
            <span>{error}</span>
          </div>
        )}

        {/* PERSONAL INFO */}
        <div style={sh.sectionLabel}>Personal information</div>
        <div style={{ ...sh.card, padding: 0, overflow: "hidden" }}>

        {/* Shop Name (Owners only) */}
        {(role || "").toLowerCase() === "owner" && shopName && (
          <div style={{ padding: "16px", borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ color: colors.textMuted, display: "flex" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              </span>
              <div style={{ fontSize: "11px", color: colors.textMuted, fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Shop Name
              </div>
            </div>
            <div style={{ paddingLeft: "24px" }}>
              <div style={{ fontSize: "15px", color: colors.textPrimary, fontWeight: "600" }}>{shopName}</div>
              <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "2px" }}>Your registered shop</div>
            </div>
          </div>
        )}

          {/* Full name */}
          <div style={{ padding: "16px", borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ color: colors.textMuted, display: "flex" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </span>
              <div style={{ fontSize: "11px", color: colors.textMuted, fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Full name
              </div>
            </div>
            <div style={{ paddingLeft: "24px" }}>
              {editing
                ? <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))} placeholder="Full name" />
                : <div style={{ fontSize: "15px", color: colors.textPrimary, fontWeight: "600" }}>{name}</div>
              }
            </div>
          </div>

          {/* Email */}
          <div style={{ padding: "16px", borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ color: colors.textMuted, display: "flex" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              </span>
              <div style={{ fontSize: "11px", color: colors.textMuted, fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Email
              </div>
            </div>
            <div style={{ paddingLeft: "24px" }}>
              <div style={{ fontSize: "15px", color: colors.textPrimary, fontWeight: "500" }}>{email}</div>
              <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "2px" }}>Email cannot be changed here</div>
            </div>
          </div>

          {/* Phone */}
          <div style={{ padding: "16px", borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ color: colors.textMuted, display: "flex" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              </span>
              <div style={{ fontSize: "11px", color: colors.textMuted, fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Contact number
              </div>
            </div>
            <div style={{ paddingLeft: "24px" }}>
              {editing
                ? <input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ''))} placeholder="+63 9XX XXX XXXX" type="tel" />
                : <div style={{ fontSize: "15px", color: phone ? colors.textPrimary : colors.textMuted, fontStyle: phone ? "normal" : "italic", fontWeight: phone ? "500" : "normal" }}>{phone || "Not set"}</div>
              }
            </div>
          </div>

          {/* Address */}
          <div style={{ padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ color: colors.textMuted, display: "flex" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              </span>
              <div style={{ fontSize: "11px", color: colors.textMuted, fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Address
              </div>
            </div>
            <div style={{ paddingLeft: "24px" }}>
              {editing
                ? <input style={inputStyle} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="City, Province" />
                : <div style={{ fontSize: "15px", color: address ? colors.textPrimary : colors.textMuted, fontStyle: address ? "normal" : "italic", fontWeight: address ? "500" : "normal" }}>{address || "Not set"}</div>
              }
            </div>
          </div>
        </div>

        {/* SAVE BUTTON */}
        {editing && (
          <button
            style={{ ...sh.primaryBtn, opacity: saving ? 0.75 : 1, marginBottom: "10px" }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        )}

        {/* SIGN OUT */}
        <div style={sh.sectionLabel}>Account</div>
        <div style={sh.card}>
          <button
            style={{
              width: "100%", padding: "14px",
              background: colors.dangerBg, color: colors.danger,
              fontSize: "14px", fontWeight: "700",
              border: `1px solid rgba(220, 38, 38, 0.3)`,
              borderRadius: "12px", cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              boxShadow: "0 4px 12px rgba(220, 38, 38, 0.1)",
            }}
            onClick={handleLogout}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </div>

      </div>
      
      {/* TOAST */}
      <div
        style={{
          position: "fixed", bottom: "24px", left: "50%",
          transform: toast ? "translate(-50%, 0)" : "translate(-50%, 80px)",
          background: colors.navy, color: "#fff",
          padding: "10px 20px", borderRadius: "20px",
          fontSize: "13px", fontWeight: "600",
          transition: "transform 0.3s ease", zIndex: 100,
          whiteSpace: "nowrap",
        }}
      >
        {toast}
      </div>
    </div>
  );
}