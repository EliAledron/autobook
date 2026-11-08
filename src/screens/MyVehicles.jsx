import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, serverTimestamp } from "firebase/firestore";
import { sh, colors, EmptyState, ErrorModal, SuccessModal } from "./dashboardShared";
import BackButton from "../components/BackButton";
import SkeletonLoader from "./SkeletonLoader";
import { Camera, Car, FileText, Plus, AlertCircle } from "lucide-react";

/* ── Cloudinary config ── */
const CLOUDINARY_CLOUD = "dpwojan8w";
const CLOUDINARY_PRESET = "autobook_uploads";

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_PRESET);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
      { method: "POST", body: formData, signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Upload failed: ${err.error?.message || res.statusText}`);
    }
    const data = await res.json();
    return data.secure_url;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Upload timed out. Please check your internet connection.");
    }
    throw err;
  }
}

const emptyVehicle = () => ({ make: "", model: "", year: "", plate: "", color: "", mileage: "", photoURL: "", photoFile: null, localPreview: null, permitURL: "", permitFile: null, permitPreview: null });

const COLORS_LIST = ["White", "Black", "Silver", "Gray", "Red", "Blue", "Green", "Yellow", "Orange", "Brown", "Other"];

export default function MyVehicles() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const permitRef = useRef(null);

  // Field refs for bringing user directly to missed/mistaken fields
  const permitBoxRef = useRef(null);
  const makeRef = useRef(null);
  const modelRef = useRef(null);
  const yearRef = useRef(null);
  const plateRef = useRef(null);

  const [uid, setUid] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyVehicle());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { navigate("/"); return; }
      setUid(u.uid);
      await loadVehicles(u.uid);
      setLoading(false);
    });
    return () => unsub();
  }, [navigate]);

  const loadVehicles = async (ownerId) => {
    try {
      const snap = await getDocs(query(collection(db, "vehicles"), where("ownerId", "==", ownerId)));
      setVehicles(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) { setVehicles([]); }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setForm((f) => ({ ...f, photoFile: file, localPreview: URL.createObjectURL(file) }));
  };

  const handlePermitChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setForm((f) => ({ ...f, permitFile: file, permitPreview: URL.createObjectURL(file) }));
    if (fieldErrors.permit) {
      setFieldErrors((prev) => ({ ...prev, permit: null }));
    }
  };

  const handlePreSubmit = () => {
    const errs = {};
    let targetRef = null;

    if (!form.permitURL && !form.permitFile) {
      errs.permit = "Car permit (Proof of ownership) is required.";
      if (!targetRef) targetRef = permitBoxRef;
    }
    if (!form.make || !form.make.trim()) {
      errs.make = "Car brand is required.";
      if (!targetRef) targetRef = makeRef;
    }
    if (!form.model || !form.model.trim()) {
      errs.model = "Model is required.";
      if (!targetRef) targetRef = modelRef;
    }
    if (form.year && form.year.trim()) {
      const y = parseInt(form.year.trim(), 10);
      const maxYear = new Date().getFullYear() + 1;
      if (isNaN(y) || y < 1900 || y > maxYear) {
        errs.year = `Valid year required (1900 - ${maxYear}).`;
        if (!targetRef) targetRef = yearRef;
      }
    }
    if (!form.plate || !form.plate.trim()) {
      errs.plate = "Plate number is required.";
      if (!targetRef) targetRef = plateRef;
    }

    setFieldErrors(errs);

    if (Object.keys(errs).length > 0) {
      // Smoothly bring the user directly to the first missing / mistaken input field
      if (targetRef && targetRef.current) {
        targetRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        if (targetRef.current.focus) {
          setTimeout(() => targetRef.current?.focus(), 250);
        }
      }
      return;
    }

    setError("");
    setShowConfirm(true);
  };

  const handleSave = async () => {
    setShowConfirm(false);
    setSaving(true);
    setError("");

    const currentUid = uid || auth.currentUser?.uid;
    if (!currentUid) {
      setError("You must be logged in to save a vehicle.");
      setSaving(false);
      return;
    }

    try {
      let finalPhotoURL = form.photoURL || "";
      let finalPermitURL = form.permitURL || "";

      if (form.photoFile) {
        finalPhotoURL = await uploadToCloudinary(form.photoFile);
      }

      if (form.permitFile) {
        finalPermitURL = await uploadToCloudinary(form.permitFile);
      }

      const data = {
        ownerId: currentUid,
        make: (form.make || "").trim(),
        model: (form.model || "").trim(),
        year: form.year ? String(form.year).trim() : "",
        plate: (form.plate || "").trim().toUpperCase(),
        color: form.color || "White",
        mileage: form.mileage !== "" && form.mileage !== null && !isNaN(Number(form.mileage)) ? Number(form.mileage) : null,
        photoURL: finalPhotoURL,
        permitURL: finalPermitURL,
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, "vehicles", editingId), data);
      } else {
        await addDoc(collection(db, "vehicles"), { ...data, createdAt: serverTimestamp() });
      }

      await loadVehicles(currentUid);
      setShowForm(false);
      setEditingId(null);
      setFieldErrors({});
      setForm(emptyVehicle());
      setSuccessMsg(editingId ? "Vehicle updated successfully!" : "Vehicle registered successfully!");
    } catch (e) {
      console.error("Save vehicle error:", e);
      setError("Failed to save: " + (e.message || "Unknown error occurred."));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (v) => {
    setForm({ ...v, mileage: v.mileage || "", photoFile: null, localPreview: null, permitFile: null, permitPreview: null });
    setEditingId(v.id);
    setFieldErrors({});
    setShowForm(true);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await deleteDoc(doc(db, "vehicles", id));
      setVehicles((prev) => prev.filter((v) => v.id !== id));
    } catch (e) { console.error(e); }
    setDeleting(null);
  };

  const inputStyle = {
    width: "100%", padding: "14px 16px", borderRadius: "14px",
    border: `1.5px solid ${colors.border}`, fontSize: "14px",
    background: "#f9fafb", color: colors.textPrimary,
    fontFamily: "inherit", boxSizing: "border-box", outline: "none", marginBottom: "4px",
    transition: "border-color 0.2s, box-shadow 0.2s, background-color 0.2s",
  };

  const getDynamicInputStyle = (hasError) => ({
    ...inputStyle,
    border: hasError ? "1.5px solid #ef4444" : `1.5px solid ${colors.border}`,
    background: hasError ? "#fef2f2" : "#f9fafb",
    boxShadow: hasError ? "0 0 0 3px rgba(239, 68, 68, 0.18)" : "none",
    animation: hasError ? "ab-shake 0.35s ease" : "none",
  });

  return (
    <div style={sh.page}>
      <style>{`
        @keyframes ab-shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-4px); }
          40%, 80% { transform: translateX(4px); }
        }
      `}</style>

      <SuccessModal message={successMsg} onClose={() => setSuccessMsg("")} />
      <ErrorModal error={error} onClose={() => setError("")} />

      {/* TOPBAR */}
      <div style={sh.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
          <BackButton />
        </div>
      </div>

      {/* HERO */}
      <div style={sh.hero}>
        <div style={sh.rolePill}><div style={sh.roleDot} /><span style={sh.roleText}>Vehicles</span></div>
        <div style={sh.heroGreeting}>My Vehicles</div>
        <div style={sh.heroSub}>Manage your registered cars.</div>
      </div>

      <div style={sh.content} className="stagger-slide-up">
        {loading ? (
          <SkeletonLoader count={2} type="vehicles" />
        ) : showForm ? (
          <>
            <div style={{ ...sh.sectionLabel, fontSize: "13px", color: colors.textPrimary, letterSpacing: "0.5px" }}>
              {editingId ? "Edit vehicle" : "Add new vehicle"}
            </div>

            {/* ERROR BANNER IF ANY FIELD IS MISSED */}
            {Object.keys(fieldErrors).some(k => fieldErrors[k]) && (
              <div style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "14px",
                padding: "12px 16px",
                marginBottom: "1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                color: "#b91c1c",
                fontSize: "13px",
                fontWeight: "600",
                animation: "ab-shake 0.35s ease"
              }}>
                <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
                <span>Please complete the highlighted field{Object.values(fieldErrors).filter(Boolean).length > 1 ? "s" : ""} below.</span>
              </div>
            )}

            {/* VEHICLE PHOTO */}
            <div style={{ ...sh.card, padding: "24px", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: colors.warningBg, display: "flex", alignItems: "center", justifyContent: "center", color: colors.warning }}><Camera size={16} /></div>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: colors.textPrimary }}>Vehicle Photo</div>
                </div>
                {(form.localPreview || form.photoURL) && (
                  <button
                    onClick={() => setForm(f => ({ ...f, photoFile: null, localPreview: null, photoURL: "" }))}
                    style={{ background: colors.dangerBg, color: colors.danger, border: "none", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Remove Photo
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoChange} />
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  width: "100%", height: form.localPreview || form.photoURL ? "180px" : "100px",
                  background: colors.bg, borderRadius: "14px",
                  border: form.localPreview || form.photoURL ? "none" : `1.5px dashed ${colors.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", overflow: "hidden",
                  fontSize: "13px", color: colors.textMuted,
                  position: "relative"
                }}
              >
                {form.localPreview || form.photoURL
                  ? <img src={form.localPreview || form.photoURL} alt="vehicle" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  : <span style={{display:'flex', alignItems:'center', gap:'6px'}}><Car size={16} /> Tap to add vehicle photo</span>
                }
              </div>
            </div>

            {/* CAR PERMIT (REQUIRED) */}
            <div ref={permitBoxRef} style={{
              ...sh.card,
              padding: "24px",
              marginBottom: "1.5rem",
              border: fieldErrors.permit ? "1.5px solid #ef4444" : `1px solid ${colors.border}`,
              background: fieldErrors.permit ? "#fffcfc" : colors.white,
              boxShadow: fieldErrors.permit ? "0 0 0 3px rgba(239, 68, 68, 0.15), 0 4px 16px rgba(0,0,0,0.04)" : "0 4px 16px rgba(0,0,0,0.04)",
              animation: fieldErrors.permit ? "ab-shake 0.35s ease" : "none",
              transition: "all 0.2s ease"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: fieldErrors.permit ? "#fee2e2" : colors.successBg, display: "flex", alignItems: "center", justifyContent: "center", color: fieldErrors.permit ? "#dc2626" : colors.success }}>
                    <FileText size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: "800", color: fieldErrors.permit ? "#dc2626" : colors.textPrimary }}>
                      Car Permit / Proof of Ownership *
                    </div>
                    <div style={{ fontSize: "12px", color: colors.textSecondary }}>Official Receipt / Certificate of Registration (OR/CR)</div>
                  </div>
                </div>
                {(form.permitPreview || form.permitURL) && (
                  <button
                    onClick={() => {
                      setForm(f => ({ ...f, permitFile: null, permitPreview: null, permitURL: "" }));
                    }}
                    style={{ background: colors.dangerBg, color: colors.danger, border: "none", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Remove Permit
                  </button>
                )}
              </div>
              <input ref={permitRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePermitChange} />
              <div
                onClick={() => permitRef.current?.click()}
                style={{
                  width: "100%", height: form.permitPreview || form.permitURL ? "180px" : "100px",
                  background: fieldErrors.permit ? "#fef2f2" : colors.bg,
                  borderRadius: "14px",
                  border: form.permitPreview || form.permitURL ? "none" : fieldErrors.permit ? "2px dashed #ef4444" : `1.5px dashed ${colors.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", overflow: "hidden",
                  fontSize: "13px", color: fieldErrors.permit ? "#dc2626" : colors.textMuted,
                  position: "relative",
                  transition: "all 0.2s ease"
                }}
              >
                {form.permitPreview || form.permitURL
                  ? <img src={form.permitPreview || form.permitURL} alt="permit" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  : <span style={{display:'flex', alignItems:'center', gap:'6px'}}><FileText size={16} /> Tap to upload OR/CR photo</span>
                }
              </div>
              {fieldErrors.permit && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#dc2626", fontSize: "12px", fontWeight: "600", marginTop: "10px" }}>
                  <AlertCircle size={14} /> {fieldErrors.permit}
                </div>
              )}
            </div>

            {/* VEHICLE DETAILS */}
            <div style={{ ...sh.card, padding: "24px", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: colors.infoBg, display: "flex", alignItems: "center", justifyContent: "center", color: colors.info }}><Car size={16} /></div>
                <div style={{ fontSize: "16px", fontWeight: "800", color: colors.textPrimary }}>Vehicle Details</div>
              </div>
              
              <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "11px", color: fieldErrors.make ? "#dc2626" : colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                    Car Brand *
                  </div>
                  <input
                    ref={makeRef}
                    style={getDynamicInputStyle(!!fieldErrors.make)}
                    placeholder="e.g. Toyota"
                    value={form.make}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, make: e.target.value }));
                      if (fieldErrors.make) setFieldErrors(prev => ({ ...prev, make: null }));
                    }}
                  />
                  {fieldErrors.make && (
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#dc2626", fontSize: "11px", fontWeight: "600", marginTop: "4px" }}>
                      <AlertCircle size={12} /> {fieldErrors.make}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "11px", color: fieldErrors.model ? "#dc2626" : colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                    Model *
                  </div>
                  <input
                    ref={modelRef}
                    style={getDynamicInputStyle(!!fieldErrors.model)}
                    placeholder="e.g. Vios"
                    value={form.model}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, model: e.target.value }));
                      if (fieldErrors.model) setFieldErrors(prev => ({ ...prev, model: null }));
                    }}
                  />
                  {fieldErrors.model && (
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#dc2626", fontSize: "11px", fontWeight: "600", marginTop: "4px" }}>
                      <AlertCircle size={12} /> {fieldErrors.model}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "11px", color: fieldErrors.year ? "#dc2626" : colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                    Year
                  </div>
                  <input
                    ref={yearRef}
                    style={getDynamicInputStyle(!!fieldErrors.year)}
                    placeholder="e.g. 2020"
                    value={form.year}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, year: e.target.value.replace(/[^0-9]/g, '') }));
                      if (fieldErrors.year) setFieldErrors(prev => ({ ...prev, year: null }));
                    }}
                  />
                  {fieldErrors.year && (
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#dc2626", fontSize: "11px", fontWeight: "600", marginTop: "4px" }}>
                      <AlertCircle size={12} /> {fieldErrors.year}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "11px", color: fieldErrors.plate ? "#dc2626" : colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                    Plate Number *
                  </div>
                  <input
                    ref={plateRef}
                    style={getDynamicInputStyle(!!fieldErrors.plate)}
                    placeholder="Plate number"
                    value={form.plate}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, plate: e.target.value }));
                      if (fieldErrors.plate) setFieldErrors(prev => ({ ...prev, plate: null }));
                    }}
                  />
                  {fieldErrors.plate && (
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#dc2626", fontSize: "11px", fontWeight: "600", marginTop: "4px" }}>
                      <AlertCircle size={12} /> {fieldErrors.plate}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "11px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Current Mileage / Odometer (km)</div>
                <input
                  type="number"
                  style={{ ...inputStyle, marginBottom: 0 }}
                  placeholder="e.g. 45000 (optional)"
                  value={form.mileage}
                  onChange={(e) => setForm((f) => ({ ...f, mileage: e.target.value }))}
                />
              </div>

              <div style={{ fontSize: "11px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>Color</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {COLORS_LIST.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    style={{
                      padding: "8px 16px", borderRadius: "20px", fontSize: "13px",
                      fontWeight: "700", cursor: "pointer", fontFamily: "inherit",
                      background: form.color === c ? `linear-gradient(135deg, ${colors.navy}, ${colors.blue})` : colors.bg,
                      color: form.color === c ? "#fff" : colors.textSecondary,
                      border: form.color === c ? "none" : `1px solid ${colors.border}`,
                      boxShadow: form.color === c ? "0 4px 12px rgba(26,58,92,0.2)" : "none",
                      transition: "all 0.2s",
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handlePreSubmit} disabled={saving} style={{ ...sh.primaryBtn, padding: "16px", borderRadius: "16px", fontSize: "15px", boxShadow: "0 8px 20px rgba(42,82,152,0.25)", opacity: saving ? 0.75 : 1 }}>
              {saving ? "Saving..." : editingId ? "Save Changes" : "Add Vehicle"}
            </button>
            <div style={{ height: "12px" }} />
            <button onClick={() => { setShowForm(false); setEditingId(null); setError(""); setFieldErrors({}); }} disabled={saving} style={{ ...sh.outlineBtn, padding: "16px", borderRadius: "16px", fontSize: "15px", border: "none", background: colors.bg, color: colors.textSecondary, fontWeight: "700", marginBottom: "2rem" }}>Cancel</button>
          </>
        ) : (
          <>
            <div style={{ ...sh.sectionLabel, fontSize: "13px", color: colors.textPrimary, letterSpacing: "0.5px" }}>Your vehicles ({vehicles.length})</div>
            {vehicles.length === 0 ? (
              <EmptyState
                icon={<Car size={48} color={colors.navy} />}
                title="No vehicles added yet"
                subtitle="Register your car to easily book services and track maintenance."
                action={
                  <button
                    onClick={() => { setForm(emptyVehicle()); setEditingId(null); setFieldErrors({}); setShowForm(true); }}
                    style={{ ...sh.primaryBtn, width: "auto", padding: "14px 28px", borderRadius: "14px", fontSize: "14px" }}
                  >
                    + Add Your First Vehicle
                  </button>
                }
              />
            ) : (
              <>
                {vehicles.map((v) => (
                  <div key={v.id} style={{ background: colors.white, borderRadius: "20px", border: `1px solid ${colors.border}`, boxShadow: "0 4px 20px rgba(0,0,0,0.05)", padding: "16px", marginBottom: "1.25rem" }}>
                    {v.photoURL && (
                      <img src={v.photoURL} alt="vehicle" style={{ display: "block", width: "100%", height: "160px", objectFit: "cover", borderRadius: "14px", marginBottom: "12px" }} />
                    )}
                    {v.permitURL && (
                      <div style={{ fontSize: "12px", color: colors.success, background: colors.successBg, padding: "6px 12px", borderRadius: "8px", marginBottom: "12px", display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: "700" }}>
                        <FileText size={14} /> Proof of Ownership Attached
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: "800", fontSize: "16px", color: colors.textPrimary, marginBottom: "4px" }}>
                          {v.year} {v.make} {v.model}
                        </div>
                        <div style={{ fontSize: "13px", color: colors.textSecondary, fontWeight: "500" }}>
                          {v.plate} {v.color ? `· ${v.color}` : ""} {v.mileage ? `· ${Number(v.mileage).toLocaleString()} km` : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button
                          onClick={() => handleEdit(v)}
                          style={{ background: colors.infoBg, color: colors.info, border: "none", padding: "8px 14px", borderRadius: "10px", cursor: "pointer", fontSize: "12px", fontWeight: "700", fontFamily: "inherit" }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(v.id)}
                          disabled={deleting === v.id}
                          style={{ background: colors.dangerBg, color: colors.danger, border: "none", padding: "8px 14px", borderRadius: "10px", cursor: "pointer", fontSize: "12px", fontWeight: "700", fontFamily: "inherit" }}
                        >
                          {deleting === v.id ? "..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* PROMINENT BOTTOM CENTER ADD BUTTON */}
                <div style={{ marginTop: "0.5rem", marginBottom: "2rem", display: "flex", justifyContent: "center" }}>
                  <button
                    onClick={() => { setForm(emptyVehicle()); setEditingId(null); setFieldErrors({}); setShowForm(true); setError(""); }}
                    style={{
                      ...sh.primaryBtn,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                      padding: "16px 24px",
                      borderRadius: "18px",
                      fontSize: "15px",
                      fontWeight: "800",
                      boxShadow: "0 8px 24px rgba(26,58,92,0.25)",
                      width: "100%",
                      letterSpacing: "0.3px",
                    }}
                  >
                    <Plus size={20} strokeWidth={2.5} /> Add Vehicle
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,38,64,0.6)", backdropFilter: "blur(6px)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowConfirm(false)}>
          <div style={{ background: colors.white, borderRadius: "24px", width: "90%", maxWidth: "340px", padding: "24px", textAlign: "center", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: colors.infoBg, color: colors.info, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><Car size={28} /></div>
            <h3 style={{ margin: "0 0 8px", fontSize: "18px", color: colors.textPrimary, fontWeight: "800" }}>Confirm Vehicle</h3>
            <p style={{ margin: "0 0 24px", fontSize: "13px", color: colors.textSecondary, lineHeight: "1.5" }}>
              Are you sure you want to {editingId ? "save changes to" : "add"} <strong>{form.make} {form.model}</strong> ({form.plate.trim().toUpperCase()})?
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setShowConfirm(false)} style={{ flex: 1, padding: "14px", borderRadius: "14px", background: colors.bg, border: `1px solid ${colors.border}`, color: colors.textSecondary, fontWeight: "700", cursor: "pointer", fontFamily: "inherit", fontSize: "14px" }}>Cancel</button>
              <button onClick={handleSave} style={{ flex: 1, padding: "14px", borderRadius: "14px", background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`, border: "none", color: "#fff", fontWeight: "700", cursor: "pointer", fontFamily: "inherit", fontSize: "14px", boxShadow: "0 4px 12px rgba(26,58,92,0.2)" }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
