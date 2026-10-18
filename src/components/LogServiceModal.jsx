import React, { useState } from "react";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { colors, sh, ErrorModal, SuccessModal } from "../screens/dashboardShared";
import { Wrench, Calendar, Gauge, Store, FileText, DollarSign, X } from "lucide-react";

const STANDARD_SERVICES = [
  { key: "oil", label: "Oil Change" },
  { key: "tire", label: "Tire Rotation" },
  { key: "brake", label: "Brake Inspection" },
  { key: "aircon", label: "Aircon Cleaning" },
  { key: "battery", label: "Battery Check" },
  { key: "checkup", label: "General Checkup / PMS" },
  { key: "other", label: "Other Service" },
];

export default function LogServiceModal({
  isOpen,
  onClose,
  vehicles = [],
  selectedVehicleId,
  prefilledService = "",
  currentMileage = "",
  userId,
  onServiceLogged,
}) {
  if (!isOpen) return null;

  const activeVehicle = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0] || null;
  const [vehicleId, setVehicleId] = useState(activeVehicle?.id || "");
  
  // Find standard match or default to oil
  const matchedService = STANDARD_SERVICES.find(
    (s) => s.label.toLowerCase() === prefilledService.toLowerCase() || s.key === prefilledService.toLowerCase()
  );

  const [serviceKey, setServiceKey] = useState(matchedService ? matchedService.key : "oil");
  const [customServiceName, setCustomServiceName] = useState(matchedService ? "" : prefilledService);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [mileage, setMileage] = useState(currentMileage || activeVehicle?.mileage || "");
  const [shopName, setShopName] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vehicleId) {
      setError("Please select a vehicle.");
      return;
    }
    if (!date) {
      setError("Please select the service date.");
      return;
    }
    if (serviceKey === "other" && !customServiceName.trim()) {
      setError("Please enter the name of the custom service.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const selectedStandard = STANDARD_SERVICES.find((s) => s.key === serviceKey);
      const finalServiceName = serviceKey === "other" ? customServiceName.trim() : selectedStandard.label;
      const parsedMileage = mileage ? parseInt(mileage, 10) : null;
      const parsedCost = cost ? parseFloat(cost) : null;

      // 1. Add log to serviceLogs collection
      await addDoc(collection(db, "serviceLogs"), {
        ownerId: userId,
        vehicleId: vehicleId,
        serviceKey: serviceKey,
        serviceType: finalServiceName,
        date: date,
        mileage: parsedMileage,
        shopName: shopName.trim() || "Self-Serviced / Garage",
        cost: parsedCost,
        notes: notes.trim(),
        isManual: true,
        createdAt: serverTimestamp(),
      });

      // 2. If entered mileage is higher than vehicle's current mileage, update vehicle
      const targetVehicle = vehicles.find((v) => v.id === vehicleId);
      if (parsedMileage && (!targetVehicle?.mileage || parsedMileage > Number(targetVehicle.mileage))) {
        try {
          await updateDoc(doc(db, "vehicles", vehicleId), {
            mileage: parsedMileage,
            updatedAt: serverTimestamp(),
          });
        } catch (e) {
          console.error("Failed to auto-update vehicle mileage:", e);
        }
      }

      if (onServiceLogged) onServiceLogged();
      onClose();
    } catch (err) {
      console.error("Error logging service:", err);
      setError("Failed to save service log: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "12px",
    border: `1.5px solid ${colors.border}`,
    fontSize: "14px",
    background: "#f9fafb",
    color: colors.textPrimary,
    fontFamily: "inherit",
    boxSizing: "border-box",
    outline: "none",
  };

  const labelStyle = {
    fontSize: "12px",
    color: colors.textSecondary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "6px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  };

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
          maxWidth: "520px",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "24px",
          boxShadow: "0 12px 36px rgba(0,0,0,0.2)",
          boxSizing: "border-box",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "14px",
                background: colors.infoBg,
                color: colors.info,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Wrench size={22} />
            </div>
            <div>
              <div style={{ fontSize: "18px", fontWeight: "800", color: colors.textPrimary }}>Log Past Service</div>
              <div style={{ fontSize: "12px", color: colors.textSecondary }}>Reset your maintenance timer & update records</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: colors.bg,
              border: "none",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: colors.textSecondary,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <ErrorModal error={error} onClose={() => setError("")} />

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Vehicle Selector (if multiple vehicles exist) */}
          {vehicles.length > 1 && (
            <div>
              <label style={labelStyle}>Target Vehicle *</label>
              <select
                value={vehicleId}
                onChange={(e) => {
                  setVehicleId(e.target.value);
                  const v = vehicles.find((veh) => veh.id === e.target.value);
                  if (v?.mileage) setMileage(v.mileage);
                }}
                style={inputStyle}
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {[v.year, v.make, v.model].filter(Boolean).join(" ")} ({v.plate})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Service Type Selection */}
          <div>
            <label style={labelStyle}>Service Performed *</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", marginBottom: "8px" }}>
              {STANDARD_SERVICES.map((s) => {
                const isSelected = serviceKey === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setServiceKey(s.key)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "12px",
                      fontSize: "13px",
                      fontWeight: "700",
                      cursor: "pointer",
                      border: isSelected ? `2px solid ${colors.blue}` : `1px solid ${colors.border}`,
                      background: isSelected ? "rgba(37,99,235,0.08)" : "#fff",
                      color: isSelected ? colors.blue : colors.textPrimary,
                      textAlign: "left",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
            {serviceKey === "other" && (
              <input
                type="text"
                placeholder="Enter custom service name (e.g. Spark Plugs, Coolant Flush)"
                value={customServiceName}
                onChange={(e) => setCustomServiceName(e.target.value)}
                style={inputStyle}
                required
              />
            )}
          </div>

          {/* Date & Mileage */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>
                <Calendar size={13} /> Service Date *
              </label>
              <input
                type="date"
                max={new Date().toISOString().split("T")[0]}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>
                <Gauge size={13} /> Odometer (km)
              </label>
              <input
                type="number"
                placeholder="e.g. 45000"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Shop / Provider & Cost */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>
                <Store size={13} /> Provider / Garage
              </label>
              <input
                type="text"
                placeholder="e.g. Shell, DIY, Motech"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>
                <DollarSign size={13} /> Cost (₱)
              </label>
              <input
                type="number"
                placeholder="e.g. 2500"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>
              <FileText size={13} /> Notes / Details
            </label>
            <textarea
              rows={2}
              placeholder="e.g. 5W-30 Full Synthetic, replaced OEM oil filter & crush washer"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* Submit Buttons */}
          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "14px",
                borderRadius: "14px",
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
                padding: "14px",
                borderRadius: "14px",
                border: "none",
                background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`,
                color: "#fff",
                fontSize: "14px",
                fontWeight: "800",
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(42,82,152,0.25)",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Saving Log..." : "Log Service & Reset Timer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
