import React, { useState } from "react";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { colors, sh, ConfirmModal } from "../screens/dashboardShared";
import { 
  BookOpen, Car, Calendar, Gauge, Store, FileText, 
  Trash2, Plus, CheckCircle2, DollarSign, X, Search, Filter, ShieldCheck
} from "lucide-react";

export default function ServicePassportModal({
  isOpen,
  onClose,
  vehicle,
  serviceLogs = [],
  bookings = [],
  onRefresh,
  onLogNew,
}) {
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  if (!isOpen || !vehicle) return null;

  // 1. Process AutoBook Bookings for this vehicle
  const bookingEntries = (bookings || [])
    .filter((b) => {
      if ((b.status || "").toLowerCase() !== "completed") return false;
      if (b.vehicleId && b.vehicleId !== vehicle.id) return false;
      return true;
    })
    .map((b) => ({
      id: b.id,
      serviceType: b.serviceType || "AutoBook Service",
      date: b.date ? new Date(b.date) : (b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) : new Date()),
      mileage: b.mileage ? Number(b.mileage) : null,
      shopName: b.shopName || "AutoBook Verified Shop",
      cost: b.totalPrice || b.amount || null,
      notes: b.notes || b.serviceNotes || "",
      isManual: false,
      source: "AutoBook Booking",
    }));

  // 2. Process Manual Service Logs for this vehicle
  const manualEntries = (serviceLogs || [])
    .filter((s) => s.vehicleId === vehicle.id)
    .map((s) => ({
      id: s.id,
      serviceType: s.serviceType || "Maintenance Service",
      serviceKey: s.serviceKey || "other",
      date: s.date ? new Date(s.date) : (s.createdAt?.seconds ? new Date(s.createdAt.seconds * 1000) : new Date()),
      mileage: s.mileage ? Number(s.mileage) : null,
      shopName: s.shopName || "Self-Serviced / Garage",
      cost: s.cost ? Number(s.cost) : null,
      notes: s.notes || "",
      isManual: true,
      source: "Manual Log",
    }));

  // Combine and sort newest first
  const allRecords = [...bookingEntries, ...manualEntries].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );

  const filteredRecords = allRecords.filter((r) => {
    // Type filter
    if (filterType !== "all") {
      const match = (r.serviceType || "").toLowerCase().includes(filterType.toLowerCase());
      if (!match) return false;
    }
    // Search filter
    if (search.trim()) {
      const s = search.toLowerCase();
      const matchText = (r.serviceType + " " + r.shopName + " " + r.notes).toLowerCase();
      if (!matchText.includes(s)) return false;
    }
    return true;
  });

  const totalCost = allRecords.reduce((sum, r) => sum + (Number(r.cost) || 0), 0);
  const vehicleLabel = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle";

  const handleDeleteManual = async (id) => {
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, "serviceLogs", id));
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error("Failed to delete log:", e);
    }
    setDeletingId(null);
    setConfirmDelete(null);
  };

  const FILTER_TABS = [
    { key: "all", label: "All Records" },
    { key: "oil", label: "Oil" },
    { key: "tire", label: "Tires" },
    { key: "brake", label: "Brakes" },
    { key: "aircon", label: "Aircon" },
    { key: "battery", label: "Battery" },
    { key: "checkup", label: "PMS / Checkup" },
  ];

  return (
    <>
      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Delete Service Log"
        message="Are you sure you want to remove this service log? This cannot be undone."
        onConfirm={() => handleDeleteManual(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
        type="danger"
        confirmText="Delete Log"
      />

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
            borderRadius: "28px",
            width: "100%",
            maxWidth: "680px",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 16px 40px rgba(0,0,0,0.22)",
            overflow: "hidden",
            boxSizing: "border-box",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: "24px 24px 20px",
              background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`,
              color: "#fff",
              position: "relative",
            }}
          >
            <button
              onClick={onClose}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                background: "rgba(255,255,255,0.15)",
                border: "none",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={18} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "18px",
                  background: vehicle.photoURL ? `url(${vehicle.photoURL}) center/cover` : "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  color: "#fff",
                  flexShrink: 0,
                  border: "2px solid rgba(255,255,255,0.3)",
                }}
              >
                {!vehicle.photoURL && <Car size={26} />}
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "700" }}>
                  Digital Service Passport
                </div>
                <div style={{ fontSize: "22px", fontWeight: "800", letterSpacing: "-0.5px", lineHeight: 1.2 }}>
                  {vehicleLabel}
                </div>
                <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.85)", marginTop: "2px", fontWeight: "600" }}>
                  Plate: <span style={{ color: colors.accent, fontWeight: "800" }}>{vehicle.plate || "No Plate"}</span>
                  {vehicle.mileage && <span> · Odometer: {Number(vehicle.mileage).toLocaleString()} km</span>}
                </div>
              </div>
            </div>

            {/* Top Quick Stats */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "10px",
                background: "rgba(255,255,255,0.1)",
                borderRadius: "16px",
                padding: "12px",
                backdropFilter: "blur(10px)",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", fontWeight: "600" }}>Total Services</div>
                <div style={{ fontSize: "18px", fontWeight: "800", marginTop: "2px" }}>{allRecords.length}</div>
              </div>
              <div style={{ textAlign: "center", borderLeft: "1px solid rgba(255,255,255,0.15)", borderRight: "1px solid rgba(255,255,255,0.15)" }}>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", fontWeight: "600" }}>Total Logged Cost</div>
                <div style={{ fontSize: "18px", fontWeight: "800", marginTop: "2px" }}>
                  {totalCost > 0 ? `₱${totalCost.toLocaleString()}` : "—"}
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", fontWeight: "600" }}>Last Service</div>
                <div style={{ fontSize: "14px", fontWeight: "700", marginTop: "4px" }}>
                  {allRecords.length > 0 ? allRecords[0].date.toLocaleDateString() : "None"}
                </div>
              </div>
            </div>
          </div>

          {/* Subheader Controls */}
          <div style={{ padding: "16px 24px", borderBottom: `1px solid ${colors.border}`, background: "#fff" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "12px" }}>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#f8fafc",
                  padding: "8px 14px",
                  borderRadius: "12px",
                  border: `1px solid ${colors.border}`,
                }}
              >
                <Search size={15} color={colors.textMuted} />
                <input
                  type="text"
                  placeholder="Search logs by shop, service, notes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: "13px" }}
                />
              </div>
              <button
                onClick={() => {
                  onClose();
                  if (onLogNew) onLogNew();
                }}
                style={{
                  padding: "8px 16px",
                  background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`,
                  color: "#fff",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  whiteSpace: "nowrap",
                }}
              >
                <Plus size={15} /> Log Service
              </button>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px" }}>
              {FILTER_TABS.map((tab) => {
                const isActive = filterType === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setFilterType(tab.key)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "16px",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      background: isActive ? colors.navy : "#f1f5f9",
                      color: isActive ? "#fff" : colors.textSecondary,
                      border: "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timeline of Records */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", background: "#f8fafc" }}>
            {filteredRecords.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <BookOpen size={40} color={colors.textMuted} style={{ marginBottom: "12px", opacity: 0.5 }} />
                <div style={{ fontSize: "15px", fontWeight: "800", color: colors.textPrimary, marginBottom: "4px" }}>
                  No service records found
                </div>
                <div style={{ fontSize: "13px", color: colors.textSecondary, marginBottom: "16px", maxWidth: "340px", margin: "0 auto 16px" }}>
                  {search || filterType !== "all"
                    ? "Try clearing your search or filter."
                    : "Keep a complete history of your maintenance. Log past services or book an appointment on AutoBook."}
                </div>
                <button
                  onClick={() => {
                    onClose();
                    if (onLogNew) onLogNew();
                  }}
                  style={{
                    padding: "10px 20px",
                    background: colors.navy,
                    color: "#fff",
                    border: "none",
                    borderRadius: "12px",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  + Log First Service
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {filteredRecords.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      background: "#fff",
                      borderRadius: "18px",
                      padding: "16px",
                      border: `1px solid ${colors.border}`,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                          <span style={{ fontSize: "15px", fontWeight: "800", color: colors.textPrimary }}>
                            {r.serviceType}
                          </span>
                          {!r.isManual ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "11px",
                                fontWeight: "700",
                                background: colors.successBg,
                                color: colors.success,
                                padding: "2px 8px",
                                borderRadius: "8px",
                              }}
                            >
                              <ShieldCheck size={12} /> AutoBook Verified
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: "700",
                                background: "#f1f5f9",
                                color: colors.textSecondary,
                                padding: "2px 8px",
                                borderRadius: "8px",
                              }}
                            >
                              Self-Logged
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "600", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Calendar size={13} color={colors.textMuted} />
                            {r.date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                          </span>
                          {r.mileage && (
                            <>
                              <span>·</span>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: colors.navy }}>
                                <Gauge size={13} /> {r.mileage.toLocaleString()} km
                              </span>
                            </>
                          )}
                          {r.shopName && (
                            <>
                              <span>·</span>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                <Store size={13} color={colors.textMuted} /> {r.shopName}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {r.cost > 0 && (
                          <div style={{ fontSize: "14px", fontWeight: "800", color: colors.navy, background: "#f1f5f9", padding: "4px 8px", borderRadius: "8px" }}>
                            ₱{r.cost.toLocaleString()}
                          </div>
                        )}
                        {r.isManual && (
                          <button
                            disabled={deletingId === r.id}
                            onClick={() => setConfirmDelete(r.id)}
                            style={{
                              background: "#fee2e2",
                              color: colors.danger,
                              border: "none",
                              width: "30px",
                              height: "30px",
                              borderRadius: "8px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                            }}
                            title="Delete manual log"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {r.notes && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: colors.textPrimary,
                          background: "#f8fafc",
                          padding: "8px 12px",
                          borderRadius: "10px",
                          lineHeight: 1.4,
                          border: "1px dashed #e2e8f0",
                        }}
                      >
                        {r.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
