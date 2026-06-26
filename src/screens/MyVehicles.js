import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { sh, colors } from "./dashboardShared";

const emptyVehicle = () => ({ make: "", model: "", year: "", plate: "", color: "", photoURL: "", photoFile: null, localPreview: null });

const COLORS_LIST = ["White", "Black", "Silver", "Gray", "Red", "Blue", "Green", "Yellow", "Orange", "Brown", "Other"];

export default function MyVehicles() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [uid, setUid] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyVehicle());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { navigate("/login"); return; }
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

  const handlePreSubmit = () => {
    if (!form.make.trim() || !form.model.trim()) { setError("Make and model are required."); return; }
    if (!form.plate.trim()) { setError("Plate number is required."); return; }
    setError("");
    setShowConfirm(true);
  };

  const handleSave = async () => {
    setShowConfirm(false);
    setSaving(true);

    try {
      let finalPhotoURL = form.photoURL;
      if (form.photoFile) {
        const storage = getStorage();
        const storageRef = ref(storage, `vehiclePhotos/${uid}/${form.plate}_${Date.now()}`);
        await uploadBytes(storageRef, form.photoFile);
        finalPhotoURL = await getDownloadURL(storageRef);
      }

      const data = {
        ownerId: uid,
        make: form.make.trim(),
        model: form.model.trim(),
        year: form.year.trim(),
        plate: form.plate.trim().toUpperCase(),
        color: form.color,
        photoURL: finalPhotoURL,
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, "vehicles", editingId), data);
      } else {
        await addDoc(collection(db, "vehicles"), { ...data, createdAt: serverTimestamp() });
      }

      await loadVehicles(uid);
      setShowForm(false);
      setEditingId(null);
      setForm(emptyVehicle());
    } catch (e) {
      setError("Failed to save: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (v) => {
    setForm({ ...v, photoFile: null, localPreview: null });
    setEditingId(v.id);
    setShowForm(true);
    setError("");
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
    fontFamily: "inherit", boxSizing: "border-box", outline: "none", marginBottom: "16px",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  return (
    <div style={sh.page}>
      {/* TOPBAR */}
      <div style={sh.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
          <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: colors.accent, fontSize: "18px", cursor: "pointer", padding: 0 }}>←</button>
          <div style={sh.topbarLogo}>Auto<span style={sh.topbarAccent}>Book</span></div>
        </div>
        {!showForm && (
          <button
            onClick={() => { setForm(emptyVehicle()); setEditingId(null); setShowForm(true); setError(""); }}
            style={{ background: colors.accent, border: "none", color: colors.navy, fontSize: "13px", fontWeight: "700", padding: "8px 16px", borderRadius: "20px", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 12px rgba(70,233,255,0.2)" }}
          >
            + Add
          </button>
        )}
      </div>

      {/* HERO */}
      <div style={sh.hero}>
        <div style={sh.rolePill}><div style={sh.roleDot} /><span style={sh.roleText}>Vehicles</span></div>
        <div style={sh.heroGreeting}>My Vehicles</div>
        <div style={sh.heroSub}>Manage your registered cars.</div>
      </div>

      <div style={sh.content}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: colors.textMuted, fontSize: "13px" }}>Loading...</div>
        ) : showForm ? (
          <>
            <div style={{ ...sh.sectionLabel, fontSize: "13px", color: colors.textPrimary, letterSpacing: "0.5px" }}>{editingId ? "Edit vehicle" : "Add new vehicle"}</div>
            {error && (
              <div style={{ background: colors.dangerBg, border: `1px solid ${colors.danger}`, borderRadius: "14px", padding: "12px 16px", fontSize: "13px", color: colors.danger, marginBottom: "1rem" }}>{error}</div>
            )}

            {/* VEHICLE PHOTO */}
            <div style={{ ...sh.card, padding: "24px", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: colors.warningBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>📷</div>
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
                  : "🚗 Tap to add vehicle photo"
                }
              </div>
            </div>

            {/* VEHICLE DETAILS */}
            <div style={{ ...sh.card, padding: "24px", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: colors.infoBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>🚗</div>
                <div style={{ fontSize: "16px", fontWeight: "800", color: colors.textPrimary }}>Vehicle Details</div>
              </div>
              
              <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "11px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Make</div>
                  <input style={{ ...inputStyle, marginBottom: 0 }} placeholder="e.g. Toyota" value={form.make} onChange={(e) => setForm((f) => ({ ...f, make: e.target.value }))} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "11px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Model</div>
                  <input style={{ ...inputStyle, marginBottom: 0 }} placeholder="e.g. Vios" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} />
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "11px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Year</div>
                  <input style={{ ...inputStyle, marginBottom: 0 }} placeholder="e.g. 2020" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "11px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Plate Number</div>
                  <input style={{ ...inputStyle, marginBottom: 0 }} placeholder="Plate number" value={form.plate} onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value }))} />
                </div>
              </div>

              {/* Color picker */}
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
            <button onClick={() => { setShowForm(false); setEditingId(null); setError(""); }} style={{ ...sh.outlineBtn, padding: "16px", borderRadius: "16px", fontSize: "15px", border: "none", background: colors.bg, color: colors.textSecondary, fontWeight: "700", marginBottom: "2rem" }}>Cancel</button>
          </>
        ) : (
          <>
            <div style={{ ...sh.sectionLabel, fontSize: "13px", color: colors.textPrimary, letterSpacing: "0.5px" }}>Your vehicles ({vehicles.length})</div>
            {vehicles.length === 0 ? (
              <div style={{ background: colors.white, borderRadius: "20px", border: `1px solid ${colors.border}`, boxShadow: "0 4px 20px rgba(0,0,0,0.05)", padding: "40px 20px", textAlign: "center", marginBottom: "1.5rem" }}>
                <div style={{ fontSize: "40px", marginBottom: "10px" }}>🚗</div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: colors.textPrimary, marginBottom: "8px" }}>No vehicles added yet.</div>
                <div style={{ fontSize: "13px", color: colors.textSecondary, marginBottom: "1.5rem" }}>Register your car to easily book services.</div>
                <button
                  onClick={() => { setForm(emptyVehicle()); setEditingId(null); setShowForm(true); }}
                  style={{ ...sh.primaryBtn, width: "auto", padding: "14px 28px", borderRadius: "14px" }}
                >
                  + Add your first vehicle
                </button>
              </div>
            ) : (
              vehicles.map((v) => (
                <div key={v.id} style={{ background: colors.white, borderRadius: "20px", border: `1px solid ${colors.border}`, boxShadow: "0 4px 20px rgba(0,0,0,0.05)", padding: "16px", marginBottom: "1.25rem" }}>
                  {v.photoURL && (
                    <img src={v.photoURL} alt="vehicle" style={{ display: "block", width: "100%", height: "160px", objectFit: "cover", borderRadius: "14px", marginBottom: "12px" }} />
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: "800", fontSize: "16px", color: colors.textPrimary, marginBottom: "4px" }}>
                        {v.year} {v.make} {v.model}
                      </div>
                      <div style={{ fontSize: "13px", color: colors.textSecondary, fontWeight: "500" }}>
                        {v.plate} {v.color ? `· ${v.color}` : ""}
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
              ))
            )}
          </>
        )}
      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,38,64,0.6)", backdropFilter: "blur(6px)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowConfirm(false)}>
          <div style={{ background: colors.white, borderRadius: "24px", width: "90%", maxWidth: "340px", padding: "24px", textAlign: "center", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: colors.infoBg, color: colors.info, fontSize: "28px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>🚗</div>
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