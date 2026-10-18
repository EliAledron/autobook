import React, { useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { colors, sh, ErrorModal } from "../screens/dashboardShared";
import { Gauge, X } from "lucide-react";

export default function UpdateMileageModal({ isOpen, onClose, vehicle, onUpdated }) {
  if (!isOpen || !vehicle) return null;

  const [mileage, setMileage] = useState(vehicle.mileage || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async (e) => {
    e.preventDefault();
    if (!mileage || isNaN(Number(mileage)) || Number(mileage) < 0) {
      setError("Please enter a valid odometer reading (km).");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const numVal = parseInt(mileage, 10);
      await updateDoc(doc(db, "vehicles", vehicle.id), {
        mileage: numVal,
        updatedAt: serverTimestamp(),
      });
      if (onUpdated) onUpdated(numVal);
      onClose();
    } catch (err) {
      console.error("Error updating mileage:", err);
      setError("Failed to update odometer: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const vehicleLabel = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,38,64,0.6)",
        backdropFilter: "blur(6px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        boxSizing: "border-box",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: colors.white,
          borderRadius: "24px",
          width: "100%",
          maxWidth: "420px",
          padding: "24px",
          boxShadow: "0 12px 36px rgba(0,0,0,0.2)",
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: colors.infoBg,
                color: colors.info,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Gauge size={20} />
            </div>
            <div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: colors.textPrimary }}>Update Odometer</div>
              <div style={{ fontSize: "12px", color: colors.textSecondary }}>{vehicleLabel}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: colors.bg,
              border: "none",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: colors.textSecondary,
            }}
          >
            <X size={16} />
          </button>
        </div>

        <ErrorModal error={error} onClose={() => setError("")} />

        <form onSubmit={handleSave}>
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                fontSize: "11px",
                color: colors.textSecondary,
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "6px",
                display: "block",
              }}
            >
              Current Odometer Reading (km)
            </label>
            <input
              type="number"
              placeholder="e.g. 45200"
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
              autoFocus
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: "14px",
                border: `1.5px solid ${colors.border}`,
                fontSize: "16px",
                fontWeight: "700",
                background: "#f9fafb",
                color: colors.textPrimary,
                fontFamily: "inherit",
                boxSizing: "border-box",
                outline: "none",
              }}
              required
            />
            <div style={{ fontSize: "12px", color: colors.textMuted, marginTop: "6px", lineHeight: 1.4 }}>
              Your maintenance roadmap uses this to calculate mileage-based service intervals (e.g. Oil change every 5,000 km).
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "12px",
                border: `1px solid ${colors.border}`,
                background: colors.bg,
                color: colors.textSecondary,
                fontSize: "14px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 2,
                padding: "12px",
                borderRadius: "12px",
                border: "none",
                background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`,
                color: "#fff",
                fontSize: "14px",
                fontWeight: "800",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(42,82,152,0.25)",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Updating..." : "Save Odometer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
