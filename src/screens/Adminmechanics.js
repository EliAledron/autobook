import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, updateDoc, doc, getDoc, query, where, addDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { sh, colors, getInitials, EmptyState } from "./dashboardShared";
import SkeletonLoader from "./SkeletonLoader";
import TopbarAvatar from "./TopbarAvatar";
import BackButton from "../components/BackButton";

const verifyStyle = (verified) =>
  verified
    ? sh.badge(colors.successBg, colors.success)
    : sh.badge(colors.warningBg, colors.warning);

/* ─── Cloudinary config ───────────────────────────────────────── */
const CLOUDINARY_CLOUD = "dpwojan8w";
const CLOUDINARY_PRESET = "autobook_uploads";

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
    throw new Error(`Upload failed: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return data.secure_url;
}

function formatCurrency(n) {
  return "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 });
}

function parsePriceValue(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const match = String(val).replace(/,/g, '').match(/\d+/);
  return match ? Number(match[0]) : 0;
}

const keyframes = `
  @property --fill-angle {
    syntax: "<angle>";
    inherits: false;
    initial-value: 0deg;
  }
  @keyframes gauge-fill {
    from { --fill-angle: 0deg; }
    to { --fill-angle: 180deg; }
  }
  .gauge-chart-mask {
    position: absolute; top: -1px; left: -1px; width: calc(100% + 2px); height: calc(200% + 2px); border-radius: 50%;
    background: conic-gradient(from 270deg, transparent 0deg, transparent var(--fill-angle, 180deg), var(--card-bg, #ffffff) var(--fill-angle, 180deg), var(--card-bg, #ffffff) 180deg, transparent 180deg);
    animation: gauge-fill 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .gauge-needle {
    position: absolute; bottom: 0; left: 50%; width: 4px; height: calc(100% - 12px);
    background: #111827; border-radius: 4px 4px 0 0;
    transform-origin: bottom center;
    transform: translateX(-50%) rotate(calc(var(--fill-angle, 180deg) - 90deg));
    animation: gauge-fill 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    z-index: 2;
  }
  .gauge-needle::after {
    content: ""; position: absolute; bottom: -4px; left: -4px; width: 12px; height: 12px;
    background: #111827; border-radius: 50%;
  }
`;

// ─── Add / Edit Mechanic Modal ────────────────────────────────────────────────
function MechanicFormModal({ existing, onClose, onSaved, ownerId, shopId }) {
  const STANDARD_SPECIALTIES = [
    "General Mechanic", "Engine Specialist", "Electrical Specialist",
    "Aircon Specialist", "Underchassis/Suspension", "Brake Specialist",
    "Transmission Specialist", "Body & Paint"
  ];

  const [name, setName] = useState(existing?.name || existing?.displayName || "");
  const [phone, setPhone] = useState(existing?.phone || "");
  const [specializations, setSpecializations] = useState(
    existing?.specializations && Array.isArray(existing.specializations)
      ? existing.specializations
      : (existing?.specialization ? [existing.specialization] : [])
  );
  const [specInput, setSpecInput] = useState("");
  const [certs, setCerts] = useState(
    existing?.certifications && Array.isArray(existing.certifications)
      ? existing.certifications.map(c => ({ ...c, photoFile: null, localPreview: null }))
      : (typeof existing?.certifications === "string" && existing.certifications ? [{ name: existing.certifications, issuingBody: "", date: "", photoURL: "", photoFile: null, localPreview: null }] : [])
  );
  const [notes, setNotes] = useState(existing?.notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const inputStyle = {
    width: "100%", padding: "14px 16px", borderRadius: "14px",
    border: `1.5px solid ${colors.border}`, fontSize: "14px",
    background: "#f9fafb", color: colors.textPrimary,
    fontFamily: "inherit", boxSizing: "border-box", outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  const emptyCert = () => ({ name: "", issuingBody: "", date: "", photoURL: "", photoFile: null, localPreview: null });
  const addCert = () => setCerts([...certs, emptyCert()]);
  const removeCert = (idx) => setCerts(certs.filter((_, i) => i !== idx));
  const updateCert = (idx, field, value) => {
    const updated = [...certs];
    updated[idx] = { ...updated[idx], [field]: value };
    setCerts(updated);
  };
  const handleCertPhotoChange = (e, idx) => {
    const file = e.target.files[0];
    if (!file) return;
    const updated = [...certs];
    updated[idx] = { ...updated[idx], photoFile: file, localPreview: URL.createObjectURL(file) };
    setCerts(updated);
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Please enter the mechanic's name."); return; }
    if (specializations.length === 0) { setError("Please add at least one specialization."); return; }
    setError("");
    setSaving(true);
    try {
      const resolvedCerts = await Promise.all(
        certs.map(async (cert) => {
          let certPhotoURL = cert.photoURL || "";
          if (cert.photoFile) {
            certPhotoURL = await uploadToCloudinary(cert.photoFile);
          }
          return { name: cert.name, issuingBody: cert.issuingBody, date: cert.date, photoURL: certPhotoURL };
        })
      );

      const data = {
        name: name.trim(), phone: phone.trim(), specializations,
        specialization: specializations.join(", "), // Kept for backward compatibility
        certifications: resolvedCerts, notes: notes.trim(),
        ownerId, shopId, updatedAt: serverTimestamp(),
      };
      if (existing?.id) {
        await updateDoc(doc(db, "shopMechanics", existing.id), data);
        onSaved({ id: existing.id, ...data });
      } else {
        data.createdAt = serverTimestamp();
        data.available = true;
        data.verified = false;
        const ref = await addDoc(collection(db, "shopMechanics"), data);
        onSaved({ id: ref.id, ...data });
      }
      onClose();
    } catch (e) { setError("Failed to save: " + e.message); }
    setSaving(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,38,64,0.6)", backdropFilter: "blur(6px)", zIndex: 110, display: "flex", alignItems: "flex-end", animation: "ab-fade-in 0.2s ease-out" }} onClick={onClose}>
      <div style={{ background: colors.white, borderRadius: "28px 28px 0 0", width: "100%", padding: "2rem 1.5rem", maxHeight: "92vh", overflowY: "auto", animation: "ab-slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards", boxShadow: "0 -4px 24px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontWeight: "800", fontSize: "18px", color: colors.navy }}>{existing ? "✏️ Edit Mechanic" : "👷 Add Mechanic"}</div>
          <button onClick={onClose} style={{ background: colors.bg, border: "none", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", cursor: "pointer", color: colors.textSecondary }}>×</button>
        </div>
        {error && <div style={{ background: colors.dangerBg, border: `1px solid ${colors.danger}`, borderRadius: "10px", padding: "8px 12px", fontSize: "12px", color: colors.danger, marginBottom: "1rem", fontWeight: "600" }}>{error}</div>}
        {[
          { label: "Full Name *", placeholder: "e.g. Juan dela Cruz", value: name, set: (val) => setName(val.replace(/[^a-zA-Z\s]/g, '')) },
          { label: "Phone Number", placeholder: "e.g. 09171234567", value: phone, set: (val) => setPhone(val.replace(/[^0-9+]/g, '')) },
        ].map(({ label, placeholder, value, set }) => (
          <div key={label} style={{ marginBottom: "1.25rem" }}>
            <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>{label}</div>
            <input style={inputStyle} placeholder={placeholder} value={value} onChange={e => set(e.target.value)} />
          </div>
        ))}
        
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Specializations *</div>
          
          {/* Modern Token Input Box */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", padding: "10px", borderRadius: "14px", border: `1.5px solid ${colors.border}`, background: "#f9fafb", transition: "all 0.2s ease" }}>
            {specializations.map(s => (
              <div key={s} style={{ background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`, color: "#fff", padding: "6px 12px", borderRadius: "10px", fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 2px 6px rgba(42,82,152,0.2)" }}>
                {s}
                <button onClick={() => setSpecializations(specializations.filter(x => x !== s))} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: "16px", padding: 0, display: "flex", alignItems: "center", opacity: 0.8, transition: "opacity 0.2s" }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.8}>×</button>
              </div>
            ))}
            <input
              style={{ border: "none", background: "transparent", outline: "none", fontSize: "14px", color: colors.textPrimary, flex: 1, minWidth: "150px", padding: "4px 0", fontFamily: "inherit" }}
              placeholder={specializations.length === 0 ? "e.g. Engine Specialist (press Enter)" : "Add another..."}
              value={specInput}
              onChange={e => setSpecInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  const val = specInput.trim().replace(/,$/, '');
                  if (val && !specializations.includes(val)) {
                    setSpecializations([...specializations, val]);
                    setSpecInput("");
                  }
                }
              }}
            />
            {specInput.trim() && (
              <button onClick={(e) => { e.preventDefault(); const val = specInput.trim(); if (val && !specializations.includes(val)) { setSpecializations([...specializations, val]); setSpecInput(""); } }} style={{ background: colors.infoBg, color: colors.info, border: "none", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", fontWeight: "700", cursor: "pointer", transition: "all 0.2s", marginLeft: "auto" }}>
                Add
              </button>
            )}
          </div>

          {/* Suggested specializations */}
          {STANDARD_SPECIALTIES.filter(s => !specializations.includes(s)).length > 0 && (
            <div style={{ marginTop: "12px" }}>
              <div style={{ fontSize: "11px", color: colors.textMuted, fontWeight: "600", marginBottom: "8px" }}>Suggested:</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {STANDARD_SPECIALTIES.filter(s => !specializations.includes(s)).map(s => (
                  <button key={s} onClick={(e) => { e.preventDefault(); setSpecializations([...specializations, s]); }} style={{ background: colors.white, border: `1px solid ${colors.border}`, padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: "600", color: colors.textSecondary, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s ease", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }} onMouseEnter={e => { e.currentTarget.style.borderColor = colors.blue; e.currentTarget.style.color = colors.blue; }} onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.textSecondary; }}>
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Certifications</div>
          {certs.map((cert, idx) => (
            <div key={idx} style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: "12px", padding: "12px", marginBottom: "10px" }}>
              <input style={{ ...inputStyle, marginBottom: "8px", background: colors.white }} placeholder="Certificate name (e.g. TESDA NC II)" value={cert.name} onChange={(e) => updateCert(idx, "name", e.target.value)} />
              <input style={{ ...inputStyle, marginBottom: "8px", background: colors.white }} placeholder="Issuing body (e.g. TESDA)" value={cert.issuingBody} onChange={(e) => updateCert(idx, "issuingBody", e.target.value)} />
              <div onClick={() => document.getElementById(`certPhoto_${idx}`)?.click()} style={{ width: "100%", height: cert.localPreview || cert.photoURL ? "auto" : "70px", background: colors.white, borderRadius: "10px", border: `1.5px dashed ${colors.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: colors.textMuted, cursor: "pointer", overflow: "hidden", marginBottom: "8px", boxSizing: "border-box" }}>
                {cert.localPreview || cert.photoURL ? <img src={cert.localPreview || cert.photoURL} alt="cert" style={{ width: "100%", objectFit: "cover", borderRadius: "8px" }} /> : "📎 Tap to upload certificate photo"}
              </div>
              <input id={`certPhoto_${idx}`} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleCertPhotoChange(e, idx)} />
              <button onClick={() => removeCert(idx)} style={{ background: "none", border: "none", color: colors.danger, fontSize: "12px", fontWeight: "600", cursor: "pointer", padding: 0 }}>Remove</button>
            </div>
          ))}
          <button onClick={addCert} style={{ width: "100%", padding: "11px", background: colors.white, border: `1.5px dashed ${colors.blue}`, color: colors.blue, fontSize: "13px", fontWeight: "600", borderRadius: "12px", cursor: "pointer", fontFamily: "inherit" }}>+ Add certification</button>
        </div>
        
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Notes (optional)</div>
          <textarea style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} placeholder="Any additional notes..." value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <button onClick={handleSubmit} disabled={saving} style={{ ...sh.primaryBtn, padding: "16px", borderRadius: "16px", fontSize: "15px", boxShadow: "0 8px 20px rgba(42,82,152,0.25)" }}>{saving ? "Saving..." : existing ? "Save Changes" : "Add Mechanic"}</button>
        <div style={{ height: "12px" }} />
        <button onClick={onClose} style={{ ...sh.outlineBtn, padding: "16px", borderRadius: "16px", fontSize: "15px", border: "none", background: colors.bg, color: colors.textSecondary, fontWeight: "700" }}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Mechanic Detail / Drill-in Modal ─────────────────────────────────────────
function MechanicDetailModal({ mechanic, allBookings, allCarParts, allRequests, onClose, onEdit, onDelete, onToggleVerify, savingVerify }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [linkEmail, setLinkEmail] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkMsg, setLinkMsg] = useState(null);
  const [linkedUserId, setLinkedUserId] = useState(mechanic.userId || null);

  const mJobs = allBookings.filter(b => b.mechanicId === mechanic.id);
  const mParts = allCarParts.filter(p => p.mechanicId === mechanic.id);
  const mRequests = allRequests.filter(r => r.assignedMechanicId === mechanic.id);
  const completedJobs = mJobs.filter(b => (b.status || "").toLowerCase() === "completed");
  const activeJobs = mJobs.filter(b => !["completed", "cancelled"].includes((b.status || "").toLowerCase()));
  const totalPartsCost = mParts.reduce((s, p) => s + parsePriceValue(p.price) * Number(p.quantity || 1), 0);

  const statusStyle = (s) => {
    if ((s || "").toLowerCase() === "completed") return sh.badge(colors.successBg, colors.success);
    if ((s || "").toLowerCase() === "in progress") return sh.badge(colors.infoBg, colors.info);
    if ((s || "").toLowerCase() === "cancelled") return sh.badge(colors.dangerBg, colors.danger);
    return sh.badge(colors.warningBg, colors.warning);
  };

  const tabs = ["overview", "jobs", "parts", "requests"];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,38,64,0.6)", backdropFilter: "blur(6px)", zIndex: 105, display: "flex", alignItems: "flex-end", animation: "ab-fade-in 0.2s ease-out" }} onClick={onClose}>
      <div style={{ background: colors.white, borderRadius: "28px 28px 0 0", width: "100%", padding: "2rem 1.5rem", maxHeight: "92vh", overflowY: "auto", animation: "ab-slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards", boxShadow: "0 -4px 24px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: colors.infoBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", fontWeight: "700", color: colors.info, flexShrink: 0 }}>
              {getInitials(mechanic.name || mechanic.displayName || "M")}
            </div>
            <div>
              <div style={{ fontWeight: "800", fontSize: "18px", color: colors.textPrimary, marginBottom: "2px" }}>
                {mechanic.name || mechanic.displayName || "No Name"}
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                <span style={verifyStyle(mechanic.verified)}>{mechanic.verified ? "✓ Verified" : "Unverified"}</span>
              </div>
              <div style={{ fontSize: "13px", color: colors.textSecondary, fontWeight: "500" }}>{mechanic.specializations ? mechanic.specializations.join(", ") : (mechanic.specialization || "General Mechanic")}</div>
              {mechanic.phone && <div style={{ fontSize: "12px", color: colors.textMuted, marginTop: "2px" }}>📞 {mechanic.phone}</div>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: colors.bg, border: "none", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", cursor: "pointer", color: colors.textSecondary }}>×</button>
        </div>

        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: mechanic.available !== false ? colors.successBg : colors.dangerBg,
            border: mechanic.available !== false ? `1.5px solid rgba(22,163,74,0.3)` : `1.5px solid rgba(220,38,38,0.3)`,
            borderRadius: "16px", padding: "14px 18px", marginBottom: "1rem", transition: "all 0.2s ease",
            boxShadow: mechanic.available !== false ? "0 4px 12px rgba(22,163,74,0.1)" : "none"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>{mechanic.available !== false ? "🟢" : "🔴"}</span>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "14px", fontWeight: "800", color: mechanic.available !== false ? colors.success : colors.danger }}>{mechanic.available !== false ? "Available" : "Unavailable (On a job)"}</span>
              <span style={{ fontSize: "11px", color: mechanic.available !== false ? "#15803d" : "#991b1b", opacity: 0.7, marginTop: "2px", fontWeight: "600" }}>Automatically updated based on active jobs</span>
            </div>
          </div>
        </div>

        {mechanic.certifications && Array.isArray(mechanic.certifications) && mechanic.certifications.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Certifications</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {mechanic.certifications.map((cert, idx) => (
                <div key={idx} style={{ background: colors.infoBg, border: `1px solid ${colors.info}`, borderRadius: "10px", padding: "10px 12px", display: "flex", gap: "10px", alignItems: "center" }}>
                  {(cert.photoURL || cert.localPreview) && <img src={cert.photoURL || cert.localPreview} alt="cert" style={{ width: "42px", height: "42px", objectFit: "cover", borderRadius: "8px", flexShrink: 0 }} />}
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: colors.info }}>{cert.name || "Unnamed Certificate"}</div>
                    {(cert.issuingBody || cert.date) && (
                      <div style={{ fontSize: "11px", color: colors.info, opacity: 0.8, marginTop: "2px" }}>
                        {cert.issuingBody} {cert.issuingBody && cert.date ? "·" : ""} {cert.date}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {typeof mechanic.certifications === "string" && mechanic.certifications && (
          <div style={{ background: colors.infoBg, border: `1px solid ${colors.info}`, borderRadius: "10px", padding: "8px 12px", marginBottom: "1rem", fontSize: "12px", color: colors.info }}>🏅 <strong>Certifications:</strong> {mechanic.certifications}</div>
        )}

        <div style={{ display: "flex", gap: "8px", marginBottom: "1.5rem", overflowX: "auto", paddingBottom: "4px", scrollbarWidth: "none" }}>
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: "10px 20px", borderRadius: "14px", fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", background: activeTab === tab ? colors.navy : colors.bg, color: activeTab === tab ? "#fff" : colors.textSecondary, border: "none", transition: "all 0.2s", boxShadow: activeTab === tab ? "0 4px 12px rgba(26,58,92,0.25)" : "none" }}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "1rem" }}>
              {[
                ["Active Jobs", activeJobs.length, "🔧", colors.infoBg, colors.info],
                ["Completed", completedJobs.length, "✅", colors.successBg, colors.success],
                ["Parts Cost", formatCurrency(totalPartsCost), "🔩", colors.dangerBg, colors.danger],
              ].map(([label, val, icon, bg, color]) => (
                <div key={label} style={{ background: bg, borderRadius: "20px", padding: "20px", textAlign: "center", border: `1px solid ${color}30` }}>
                  <div style={{ fontSize: "20px", marginBottom: "8px" }}>{icon}</div>
                  <div style={{ fontSize: String(val).includes("₱") ? "14px" : "22px", fontWeight: "800", color }}>{val}</div>
                  <div style={{ fontSize: "12px", color, fontWeight: "700", marginTop: "4px" }}>{label}</div>
                </div>
              ))}
            </div>
            <button
              onClick={() => onToggleVerify(mechanic)}
              disabled={savingVerify}
              style={{
                width: "100%", padding: "16px", marginBottom: "1.25rem",
                background: mechanic.verified ? colors.dangerBg : `linear-gradient(135deg, ${colors.success}, #15803d)`,
                color: mechanic.verified ? colors.danger : "#fff",
                fontSize: "15px", fontWeight: "700",
                border: mechanic.verified ? `1.5px solid rgba(220,38,38,0.3)` : "none",
                borderRadius: "16px", cursor: "pointer", fontFamily: "inherit",
                opacity: savingVerify ? 0.7 : 1,
                boxShadow: mechanic.verified ? "none" : "0 8px 20px rgba(22,163,74,0.25)",
                transition: "all 0.2s ease",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
              }}
            >
              {savingVerify ? "Saving..." : mechanic.verified ? (
                <><span style={{ fontSize: "16px" }}>✕</span> Remove Verification</>
              ) : (
                <><span style={{ fontSize: "16px" }}>✓</span> Verify Mechanic</>
              )}
            </button>

            {/* Link User Account */}
            <div style={{ background: linkedUserId ? colors.successBg : colors.bg, border: `1.5px solid ${linkedUserId ? colors.success + "50" : colors.border}`, borderRadius: "16px", padding: "16px", marginBottom: "1rem" }}>
              <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                🔗 Linked App Account
                {linkedUserId && <span style={{ ...sh.badge(colors.successBg, colors.success), marginLeft: "6px" }}>Linked ✓</span>}
              </div>
              {linkedUserId ? (
                <div style={{ fontSize: "13px", color: colors.success, fontWeight: "600" }}>
                  ✅ This mechanic has a linked AutoBook account. They receive job notifications directly.
                  <button
                    onClick={async () => {
                      try {
                        const { updateDoc, doc } = await import("firebase/firestore");
                        await updateDoc(doc(db, "shopMechanics", mechanic.id), { userId: null });
                        setLinkedUserId(null);
                        setLinkMsg({ type: "success", text: "Account unlinked." });
                      } catch (e) { setLinkMsg({ type: "error", text: "Failed to unlink." }); }
                    }}
                    style={{ display: "block", marginTop: "10px", background: "none", border: `1px solid ${colors.danger}`, color: colors.danger, borderRadius: "10px", padding: "8px 14px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Unlink Account
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: "12px", color: colors.textMuted, marginBottom: "10px" }}>Link this mechanic to their AutoBook account so they receive notifications when assigned a job.</div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="email"
                      placeholder="Mechanic's registered email"
                      value={linkEmail}
                      onChange={e => { setLinkEmail(e.target.value); setLinkMsg(null); }}
                      style={{ flex: 1, padding: "10px 12px", borderRadius: "10px", border: `1.5px solid ${colors.border}`, fontSize: "13px", outline: "none", background: colors.white, fontFamily: "inherit" }}
                    />
                    <button
                      disabled={linkLoading || !linkEmail.trim()}
                      onClick={async () => {
                        setLinkLoading(true); setLinkMsg(null);
                        try {
                          const { getDocs, collection, query, where, updateDoc, doc } = await import("firebase/firestore");
                          const uSnap = await getDocs(query(collection(db, "users"), where("email", "==", linkEmail.trim())));
                          if (uSnap.empty) { setLinkMsg({ type: "error", text: "No user found with that email." }); setLinkLoading(false); return; }
                          const found = uSnap.docs[0];
                          await updateDoc(doc(db, "shopMechanics", mechanic.id), { userId: found.id });
                          setLinkedUserId(found.id);
                          setLinkEmail("");
                          setLinkMsg({ type: "success", text: `Linked to ${found.data().displayName || linkEmail}!` });
                        } catch (e) { setLinkMsg({ type: "error", text: "Link failed. Try again." }); }
                        setLinkLoading(false);
                      }}
                      style={{ padding: "10px 16px", borderRadius: "10px", background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`, color: "#fff", fontSize: "13px", fontWeight: "700", border: "none", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
                    >
                      {linkLoading ? "..." : "Link"}
                    </button>
                  </div>
                  {linkMsg && (
                    <div style={{ marginTop: "8px", fontSize: "12px", fontWeight: "600", color: linkMsg.type === "success" ? colors.success : colors.danger }}>
                      {linkMsg.type === "success" ? "✅ " : "❌ "}{linkMsg.text}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {activeTab === "jobs" && (
          <div style={{ ...sh.card, marginBottom: "1rem" }}>
            {mJobs.length === 0 ? <div style={{ padding: "20px", textAlign: "center", color: colors.textMuted, fontSize: "13px" }}>No jobs assigned yet.</div>
              : mJobs.slice(0, 10).map((b, i) => (
                <div key={b.id} className="owner-list-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", borderBottom: i < mJobs.length - 1 ? `1px solid #f1f5f9` : "none", borderRadius: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ ...sh.rowIcon(colors.infoBg), fontSize: "14px" }}>{b.status === "Completed" ? "✅" : "🔧"}</div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "700", color: colors.textPrimary, marginBottom: "2px" }}>{b.serviceType || "Service"}</div>
                      <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "500" }}>{b.customerName || "Customer"} · {b.date || "—"}</div>
                    </div>
                  </div>
                  <span style={statusStyle(b.status)}>{b.status || "Pending"}</span>
                </div>
              ))}
          </div>
        )}

        {activeTab === "parts" && (
          <div style={{ ...sh.card, marginBottom: "1rem" }}>
            {mParts.length === 0 ? <div style={{ padding: "20px", textAlign: "center", color: colors.textMuted, fontSize: "13px" }}>No parts assigned to this mechanic.</div>
              : mParts.slice(0, 10).map((p, i) => (
                <div key={p.id} className="owner-list-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", borderBottom: i < mParts.length - 1 ? `1px solid #f1f5f9` : "none", borderRadius: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ ...sh.rowIcon(colors.warningBg), fontSize: "16px" }}>🔩</div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "700", color: colors.textPrimary, marginBottom: "2px" }}>{p.partName}</div>
                      <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "500" }}>Qty: {p.quantity} · {typeof p.price === 'string' && (p.price.includes('-') || p.price.includes('+')) ? `₱${p.price}` : formatCurrency(p.price)} each</div>
                    </div>
                  </div>
                  <div style={{ fontSize: "15px", fontWeight: "800", color: colors.navy }}>{formatCurrency(parsePriceValue(p.price) * Number(p.quantity))}+</div>
                </div>
              ))}
            {mParts.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "10px", marginTop: "4px", borderTop: `1.5px solid ${colors.border}` }}>
                <span style={{ fontSize: "13px", fontWeight: "700", color: colors.textSecondary }}>Total</span>
                <span style={{ fontSize: "14px", fontWeight: "800", color: colors.navy }}>{formatCurrency(totalPartsCost)}+</span>
              </div>
            )}
          </div>
        )}

        {activeTab === "requests" && (
          <div style={{ ...sh.card, marginBottom: "1rem" }}>
            {mRequests.length === 0 ? <div style={{ padding: "20px", textAlign: "center", color: colors.textMuted, fontSize: "13px" }}>No requests assigned to this mechanic.</div>
              : mRequests.slice(0, 10).map((r, i) => (
                <div key={r.id} className="owner-list-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", borderBottom: i < mRequests.length - 1 ? `1px solid #f1f5f9` : "none", borderRadius: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ ...sh.rowIcon(colors.bg), fontSize: "16px" }}>📍</div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "700", color: colors.textPrimary, marginBottom: "2px" }}>{r.customerName || "Customer"}</div>
                      <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "500" }}>{r.address || "No address"}</div>
                    </div>
                  </div>
                  <span style={{ ...statusStyle(r.status), padding: "4px 10px", borderRadius: "8px" }}>{r.status || "Pending"}</span>
                </div>
              ))}
          </div>
        )}

        <div style={{ display: "flex", gap: "10px", marginTop: "4px", marginBottom: "12px" }}>
          <button
            onClick={() => onEdit(mechanic)}
            style={{
              flex: 1, padding: "14px",
              background: `linear-gradient(135deg, ${colors.info}, #1e40af)`,
              color: "#fff", fontSize: "14px", fontWeight: "700",
              border: "none", borderRadius: "16px", cursor: "pointer",
              fontFamily: "inherit", transition: "all 0.2s ease",
              boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
            }}
          >
            <span style={{ fontSize: "16px" }}>✏️</span> Edit
          </button>
          <button
            onClick={() => onDelete(mechanic)}
            style={{
              flex: 1, padding: "14px",
              background: colors.dangerBg, color: colors.danger,
              fontSize: "14px", fontWeight: "700",
              border: `1.5px solid rgba(220,38,38,0.3)`,
              borderRadius: "16px", cursor: "pointer",
              fontFamily: "inherit", transition: "all 0.2s ease",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
            }}
          >
            <span style={{ fontSize: "16px" }}>🗑️</span> Remove
          </button>
        </div>
        <button onClick={onClose} style={{ ...sh.outlineBtn, padding: "14px", borderRadius: "16px", fontSize: "14px", border: "none", background: colors.bg, color: colors.textSecondary, fontWeight: "700" }}>Close</button>
      </div>
    </div>
  );
}

export default function AdminMechanics() {
  const navigate = useNavigate();
  const [mechanics, setMechanics] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [allCarParts, setAllCarParts] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showMechanicForm, setShowMechanicForm] = useState(false);
  const [editingMechanic, setEditingMechanic] = useState(null);
  const [mechanicToDelete, setMechanicToDelete] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        const userObj = snap.exists() ? { id: snap.id, ...snap.data() } : { id: firebaseUser.uid };
        setCurrentUser(userObj);
        await fetchAll(userObj);
      } else {
        navigate("/login");
      }
    });
    return () => unsub();
  }, [navigate]);

    const fetchAll = async (userObj) => {
      setLoading(true);
      const isAdmin = (userObj?.role || "").toLowerCase() === "admin";
      
      let shopId = userObj?.shopId;
      if (!isAdmin && userObj?.shopName) {
        const sName = userObj.shopName.toUpperCase();
        if (sName.includes("JME")) shopId = "JME";
        else if (sName.includes("GRHE")) shopId = "GRHE";
      }
      if (!isAdmin && userObj?.id) {
        try {
          const sQuery = query(collection(db, "shops"), where("ownerId", "==", userObj.id));
          const sSnap = await getDocs(sQuery);
          if (!sSnap.empty) {
            if (!shopId) shopId = sSnap.docs[0].id;
            for (const docSnap of sSnap.docs) {
              const fetchedName = (docSnap.data().name || "").toUpperCase();
              if (fetchedName.includes("JME")) { shopId = "JME"; break; }
              if (fetchedName.includes("GRHE")) { shopId = "GRHE"; break; }
            }
          }
        } catch(e) {}
      }

      const smQuery = isAdmin ? collection(db, "shopMechanics") : query(collection(db, "shopMechanics"), where("shopId", "==", shopId || "invalid"));
      const bQuery = isAdmin ? collection(db, "bookings") : query(collection(db, "bookings"), where("shopId", "==", shopId || "invalid"));
      const cpQuery = isAdmin ? collection(db, "carParts") : query(collection(db, "carParts"), where("shopId", "==", shopId || "invalid"));
      const mrQuery = isAdmin ? collection(db, "mechanicRequests") : query(collection(db, "mechanicRequests"), where("shopId", "==", shopId || "invalid"));

      const [smSnap, bSnap, cpSnap, mrSnap] = await Promise.all([
        getDocs(smQuery),
        getDocs(bQuery),
        getDocs(cpQuery),
        getDocs(mrQuery)
      ]);
      const smList = smSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const bList = bSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      const mrList = mrSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Tag each mechanic with hasActiveJob
      const mechanicsWithStatus = await Promise.all(smList.map(async (m) => {
        const hasActiveBooking = bList.some(
          (b) => b.mechanicId === m.id && (b.status || "").toLowerCase() === "in progress"
        );
        const hasActiveRequest = mrList.some(
          (r) => r.assignedMechanicId === m.id && ["accepted", "pending"].includes((r.status || "pending").toLowerCase())
        );
        const hasActiveJob = hasActiveBooking || hasActiveRequest;
        const shouldBeAvailable = !hasActiveJob;
        if (m.available !== shouldBeAvailable) {
          try { await updateDoc(doc(db, "shopMechanics", m.id), { available: shouldBeAvailable }); m.available = shouldBeAvailable; } catch(e) {}
        }
        return { ...m, hasActiveJob };
      }));

      setMechanics(mechanicsWithStatus);
      setBookings(bList);
      setAllCarParts(cpSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setAllRequests(mrList);
      setLoading(false);
    };

  const getAssignedCount = (mechanicId) =>
    bookings.filter(
      (b) =>
        b.mechanicId === mechanicId &&
        (b.status || "").toLowerCase() !== "completed" &&
        (b.status || "").toLowerCase() !== "cancelled"
    ).length;

  const getCompletedCount = (mechanicId) =>
    bookings.filter(
      (b) =>
        b.mechanicId === mechanicId &&
        (b.status || "").toLowerCase() === "completed"
    ).length;

  const getMechanicBookings = (mechanicId) =>
    bookings.filter((b) => b.mechanicId === mechanicId);

  const getAvailabilityInfo = (m) => {
    if (m.available === false) return { label: "🔴 Unavailable", bg: colors.dangerBg, color: colors.danger };
    return { label: "🟢 Available", bg: colors.successBg, color: colors.success };
  };

  const stats = {
    total: mechanics.length,
    verified: mechanics.filter((m) => m.verified).length,
    available: mechanics.filter((m) => m.available !== false).length,
  };

  const handleToggleVerified = async (mechanic) => {
    setSaving(true);
    const updated = { verified: !mechanic.verified };
    await updateDoc(doc(db, "shopMechanics", mechanic.id), updated);
    setMechanics((prev) =>
      prev.map((m) => (m.id === mechanic.id ? { ...m, ...updated } : m))
    );
    if (selected?.id === mechanic.id) setSelected((prev) => ({ ...prev, ...updated }));
    setSaving(false);
  };

  const handleMechanicSaved = (mechanic) => {
    setMechanics(prev => {
      const exists = prev.find(m => m.id === mechanic.id);
      if (exists) return prev.map(m => m.id === mechanic.id ? mechanic : m);
      return [mechanic, ...prev];
    });
    setEditingMechanic(null);
    setShowMechanicForm(false);
  };

  const handleDeleteMechanic = (mechanic) => setMechanicToDelete(mechanic);

  const confirmDeleteMechanic = async () => {
    if (!mechanicToDelete) return;
    try {
      await deleteDoc(doc(db, "shopMechanics", mechanicToDelete.id));
      setMechanics(prev => prev.filter(m => m.id !== mechanicToDelete.id));
      setSelected(null);
    } catch (e) { console.error(e); }
    setMechanicToDelete(null);
  };

  const filteredMechanics = mechanics.filter((m) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (m.name || m.displayName || "").toLowerCase().includes(s) ||
      (m.specialization || "").toLowerCase().includes(s) ||
      (m.phone || "").toLowerCase().includes(s) ||
      (m.email || "").toLowerCase().includes(s)
    );
  });

  return (
    <div style={sh.page}>
      <style>{keyframes}</style>

      {/* TOPBAR */}
      <div style={sh.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <BackButton />
          <div style={sh.topbarLogo}>Auto<span style={sh.topbarAccent}>Book</span></div>
        </div>
        <div style={sh.topbarRight}>
          <div style={sh.topbarMeta}>
            <div style={sh.topbarName}>{currentUser?.displayName || "Owner"}</div>
            <div>{currentUser?.role || "Owner"}</div>
          </div>
          <TopbarAvatar onClick={() => navigate("/profile")} />
        </div>
      </div>

      {/* HERO */}
      <div style={sh.hero}>
        <div style={sh.rolePill}>
          <div style={sh.roleDot} />
          <span style={sh.roleText}>Mechanics</span>
        </div>
        <div style={sh.heroGreeting}>Mechanics</div>
        <div style={sh.heroSub}>Verify accounts and monitor workload.</div>
      </div>

      <div style={sh.content} className="stagger-slide-up">
        {/* STATS */}
        <div style={sh.sectionLabel}>Overview</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px", marginBottom: "1rem" }}>
          <div style={{ ...sh.card, display: "flex", alignItems: "center", gap: "20px", marginBottom: 0 }}>
            <div style={{
              width: "120px", height: "60px", flexShrink: 0, position: "relative", overflow: "hidden",
              display: "flex", alignItems: "flex-end", justifyContent: "center"
            }}>
              <div style={{
                position: "absolute", top: 0, left: 0, width: "120px", height: "120px", borderRadius: "50%",
                background: stats.total > 0
                ? `conic-gradient(from 270deg,
                    ${colors.success} 0% ${(stats.available / stats.total) * 50}%,
                    ${colors.danger} ${(stats.available / stats.total) * 50}% 50%,
                    transparent 50%
                  )`
                : `conic-gradient(from 270deg, ${colors.border} 0% 50%, transparent 50%)`,
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }} />
              {stats.total > 0 && <div className="gauge-chart-mask" style={{ "--card-bg": colors.white }} />}
              <div className="gauge-needle" />
              <div style={{
                width: "80px", height: "40px", background: colors.white, borderRadius: "40px 40px 0 0",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
                paddingBottom: "4px", position: "relative", zIndex: 3, boxShadow: "inset 0 4px 8px rgba(0,0,0,0.05)"
              }}>
                <span style={{ fontSize: "20px", fontWeight: "800", color: colors.textPrimary, lineHeight: 1 }}>{stats.total}</span>
                <span style={{ fontSize: "8px", color: colors.textSecondary, fontWeight: "700", marginTop: "2px" }}>TEAM</span>
              </div>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "12px", height: "12px", borderRadius: "4px", background: colors.success }}></div>
                  <span style={{ fontSize: "13px", color: colors.textSecondary, fontWeight: "600" }}>Available</span>
                </div>
                <span style={{ fontSize: "14px", fontWeight: "800", color: colors.textPrimary }}>{stats.available}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "12px", height: "12px", borderRadius: "4px", background: colors.danger }}></div>
                  <span style={{ fontSize: "13px", color: colors.textSecondary, fontWeight: "600" }}>Unavailable</span>
                </div>
                <span style={{ fontSize: "14px", fontWeight: "800", color: colors.textPrimary }}>{stats.total - stats.available}</span>
              </div>
            </div>
          </div>

          <div style={{ ...sh.card, marginBottom: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "16px" }}>🏅</span>
                <span style={{ fontSize: "13px", color: colors.textSecondary, fontWeight: "700" }}>Verified Mechanics</span>
              </div>
              <span style={{ fontSize: "14px", fontWeight: "800", color: colors.textPrimary }}>{stats.verified} <span style={{ color: colors.textMuted, fontSize: "12px" }}>/ {stats.total}</span></span>
            </div>
            <div style={{ width: "100%", height: "8px", background: colors.bg, borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ 
                width: `${stats.total > 0 ? (stats.verified / stats.total) * 100 : 0}%`, 
                height: "100%", 
                background: `linear-gradient(90deg, ${colors.success}, #10b981)`,
                borderRadius: "4px",
                transition: "width 0.5s ease-out"
              }}></div>
            </div>
          </div>
        </div>

        {/* INFO NOTE */}
        <div style={{
          background: colors.infoBg, border: `1px solid ${colors.info}`,
          borderRadius: "12px", padding: "10px 14px", marginBottom: "1rem",
          fontSize: "12px", color: colors.info, fontWeight: "500",
        }}>
          ℹ️ Mechanics' availability is automatically managed based on their active jobs.
        </div>

        {/* SEARCH BAR */}
        <div style={{ position: "relative", marginBottom: "1.5rem" }}>
          <svg style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", width: "18px", height: "18px", color: colors.textMuted, pointerEvents: "none" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            placeholder="Search mechanics by name, specialty, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "14px 40px",
              borderRadius: "24px", border: `1px solid transparent`,
              fontSize: "14px", backgroundColor: "#f1f5f9",
              color: colors.textPrimary, fontFamily: "inherit",
              boxSizing: "border-box", outline: "none",
              transition: "all 0.2s ease",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)"
            }}
            onFocus={(e) => { e.target.style.border = `1px solid ${colors.blue}`; e.target.style.backgroundColor = colors.white; e.target.style.boxShadow = "0 4px 12px rgba(42,82,152,0.1)"; }}
            onBlur={(e) => { e.target.style.border = `1px solid transparent`; e.target.style.backgroundColor = "#f1f5f9"; e.target.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.02)"; }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "#e2e8f0", border: "none", borderRadius: "50%", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#475569" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        {/* MECHANICS LIST */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.65rem" }}>
          <div style={{ ...sh.sectionLabel, marginBottom: 0 }}>All Mechanics ({filteredMechanics.length})</div>
          <button onClick={() => { setEditingMechanic(null); setShowMechanicForm(true); }} style={{ background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`, color: "#fff", border: "none", borderRadius: "10px", padding: "6px 14px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}>+ Add</button>
        </div>
        <div style={sh.card}>
          {loading ? (
            <SkeletonLoader count={3} type="list" />
          ) : filteredMechanics.length === 0 ? (
            <EmptyState
              icon="🔧"
              title="No mechanics found"
              subtitle={search ? "No mechanics match your search." : "There are currently no mechanics registered."}
            />
          ) : (
            filteredMechanics.map((m, i) => {
              const assigned = getAssignedCount(m.id);
              const completed = getCompletedCount(m.id);
              const avail = getAvailabilityInfo(m);
              return (
                <div
                  key={m.id}
                  style={{
                    ...sh.rowItem,
                    borderBottom: i === filteredMechanics.length - 1 ? "none" : `1px solid ${colors.border}`,
                    cursor: "pointer",
                  }}
                  onClick={() => setSelected(m)}
                >
                  <div style={{
                    width: "40px", height: "40px", borderRadius: "50%",
                    background: colors.infoBg, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: "14px", fontWeight: "700",
                    color: colors.info, flexShrink: 0,
                  }}>
                    {getInitials(m.name || m.displayName || "M")}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", fontSize: "13px" }}>{m.name || m.displayName || "No name"}</div>
                    <div style={{ fontSize: "12px", color: colors.textSecondary }}>
                      {m.specializations ? m.specializations.join(", ") : (m.specialization || m.email || "General")}{m.phone ? ` · 📞 ${m.phone}` : ""}
                    </div>
                    <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "2px" }}>
                      {assigned} active · {completed} completed
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end" }}>
                    <span style={verifyStyle(m.verified)}>
                      {m.verified ? "✓ Verified" : "Unverified"}
                    </span>
                    <span style={sh.badge(avail.bg, avail.color)}>
                      {avail.label}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MECHANIC DETAIL MODAL */}
      {(showMechanicForm || editingMechanic) && (
        <MechanicFormModal existing={editingMechanic} ownerId={currentUser?.id} shopId={currentUser?.shopId} onClose={() => { setShowMechanicForm(false); setEditingMechanic(null); }} onSaved={handleMechanicSaved} />
      )}

      {selected && (
        <MechanicDetailModal mechanic={selected} allBookings={bookings} allCarParts={allCarParts} allRequests={allRequests} onClose={() => setSelected(null)} onEdit={(m) => { setSelected(null); setEditingMechanic(m); }} onDelete={handleDeleteMechanic} onToggleVerify={handleToggleVerified} savingVerify={saving} />
      )}

      {/* CONFIRM DELETE MODAL */}
      {mechanicToDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,38,64,0.6)", backdropFilter: "blur(6px)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", animation: "ab-fade-in 0.2s ease-out" }} onClick={() => setMechanicToDelete(null)}>
          <div style={{ background: colors.white, borderRadius: "24px", width: "90%", maxWidth: "340px", padding: "24px", textAlign: "center", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: colors.dangerBg, color: colors.danger, fontSize: "28px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>🗑️</div>
            <h3 style={{ margin: "0 0 8px", fontSize: "18px", color: colors.textPrimary, fontWeight: "800" }}>Remove Mechanic?</h3>
            <p style={{ margin: mechanicToDelete.hasActiveJob ? "0 0 16px" : "0 0 24px", fontSize: "13px", color: colors.textSecondary, lineHeight: "1.5" }}>Are you sure you want to remove <strong>{mechanicToDelete.name || mechanicToDelete.displayName}</strong>? This action cannot be undone.</p>
            {mechanicToDelete.hasActiveJob && (
              <div style={{ background: colors.warningBg, color: colors.warning, padding: "12px", borderRadius: "12px", fontSize: "12px", fontWeight: "700", marginBottom: "24px", border: `1.5px solid ${colors.warning}40` }}>
                ⚠️ This mechanic currently has active jobs assigned. Removing them may leave those jobs unassigned.
              </div>
            )}
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setMechanicToDelete(null)} style={{ flex: 1, padding: "14px", borderRadius: "14px", background: colors.bg, border: `1px solid ${colors.border}`, color: colors.textSecondary, fontWeight: "700", cursor: "pointer", fontFamily: "inherit", fontSize: "14px" }}>Cancel</button>
              <button onClick={confirmDeleteMechanic} style={{ flex: 1, padding: "14px", borderRadius: "14px", background: colors.danger, border: "none", color: "#fff", fontWeight: "700", cursor: "pointer", fontFamily: "inherit", fontSize: "14px" }}>Yes, Remove</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
