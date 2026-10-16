import React, { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase";
import { colors, ErrorModal, SuccessModal, CustomDropdown } from "../screens/dashboardShared";
import { X, AlertTriangle, Send, Store, Calendar, Car, ShieldAlert } from "lucide-react";

const ISSUE_TYPES = [
  "Shop No-Show / Unresponsive",
  "Incomplete or Faulty Repair",
  "Unexpected Price / Overcharging Dispute",
  "Rude or Unprofessional Behavior",
  "Unauthorized Work or Replaced Parts",
  "Cancellation or Schedule Conflict",
  "Other Issue"
];

export default function BookingIssueModal({ booking, onClose, onSuccess }) {
  const [issueType, setIssueType] = useState(ISSUE_TYPES[0]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!booking) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!description.trim()) {
      return setErrorMsg("Please explain the issue you experienced with this booking.");
    }

    const user = auth.currentUser;
    if (!user) {
      return setErrorMsg("You must be signed in to report a booking issue.");
    }

    setSubmitting(true);
    try {
      const ticketNumber = `BK-${Date.now().toString().slice(-6)}`;
      const docRef = await addDoc(collection(db, "supportTickets"), {
        ticketNumber,
        bookingId: booking.id,
        shopId: booking.shopId || null,
        shopName: booking.shopName || "Auto Shop",
        serviceType: booking.serviceType || "Automotive Service",
        category: "Booking Issue",
        issueType,
        subject: `Dispute: ${booking.serviceType || "Service"} at ${booking.shopName || "Shop"}`,
        message: description.trim(),
        customerId: user.uid,
        customerName: user.displayName || "Customer",
        customerEmail: user.email || "",
        priority: "High",
        status: "open",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Notify platform administrators
      await addDoc(collection(db, "adminAlerts"), {
        type: "support_ticket",
        ticketId: docRef.id,
        ticketNumber,
        bookingId: booking.id,
        shopId: booking.shopId || null,
        title: `Booking Dispute: ${booking.shopName || "Shop"}`,
        message: `${user.displayName || user.email} reported ${issueType} on booking #${booking.id.slice(-6)}: ${description.trim().slice(0, 100)}...`,
        read: false,
        createdAt: serverTimestamp(),
      });

      setSuccessMsg(`Issue report #${ticketNumber} filed. Our support team will review this dispute and follow up.`);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1800);
    } catch (err) {
      console.error("Failed to submit booking issue:", err);
      setErrorMsg("Failed to submit report. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <>
      <ErrorModal error={errorMsg} onClose={() => setErrorMsg("")} />
      <SuccessModal message={successMsg} onClose={() => setSuccessMsg("")} />

      <div
        style={{
          position: "fixed", inset: 0,
          background: "rgba(15, 38, 64, 0.65)",
          backdropFilter: "blur(6px)",
          zIndex: 1200,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "16px",
          fontFamily: "'Inter', system-ui, sans-serif"
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: colors.white,
            width: "100%", maxWidth: "520px",
            maxHeight: "90vh",
            borderRadius: "24px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            overflowY: "auto",
            position: "relative",
            padding: "24px"
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* CLOSE BTN */}
          <button
            onClick={onClose}
            style={{
              position: "absolute", top: "18px", right: "18px",
              background: "#f3f4f6", border: "none",
              width: "32px", height: "32px", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: colors.textSecondary
            }}
          >
            <X size={18} />
          </button>

          {/* HEADER */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <div style={{
              width: "48px", height: "48px", borderRadius: "14px",
              background: colors.dangerBg, color: colors.danger,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
            }}>
              <ShieldAlert size={26} />
            </div>
            <div>
              <h2 style={{ margin: "0 0 4px 0", fontSize: "19px", fontWeight: "800", color: colors.textPrimary }}>
                Report an Issue
              </h2>
              <div style={{ fontSize: "13px", color: colors.textSecondary }}>
                File a dispute or request assistance for this booking.
              </div>
            </div>
          </div>

          {/* BOOKING SUMMARY BOX */}
          <div style={{
            background: "#f8fafc", border: `1px solid ${colors.border}`,
            borderRadius: "16px", padding: "14px", marginBottom: "20px"
          }}>
            <div style={{ fontSize: "11px", fontWeight: "800", textTransform: "uppercase", color: colors.navy, marginBottom: "8px", letterSpacing: "0.5px" }}>
              Booking Reference: #{booking.id.slice(-6)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", color: colors.textPrimary }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700" }}>
                <Store size={15} color={colors.blue} /> {booking.shopName || "Auto Shop"}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: colors.textSecondary }}>
                <Calendar size={15} /> {booking.serviceType} • {booking.date || "Scheduled Date"}
              </div>
              {booking.vehicleLabel && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: colors.textSecondary }}>
                  <Car size={15} /> {booking.vehicleLabel}
                </div>
              )}
            </div>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
                What went wrong? <span style={{ color: colors.danger }}>*</span>
              </label>
              <CustomDropdown
                value={issueType}
                onChange={setIssueType}
                options={ISSUE_TYPES.map(t => ({ value: t, label: t }))}
                placeholder="Select issue type..."
                style={{
                  width: "100%",
                  padding: "13px 40px 13px 16px",
                  borderRadius: "14px",
                  border: `1.5px solid ${colors.border}`,
                  backgroundColor: "#f8fafc",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: colors.textPrimary
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
                Describe what happened <span style={{ color: colors.danger }}>*</span>
              </label>
              <textarea
                rows={4}
                placeholder="Provide as much detail as possible (e.g. promised work not done, unexpected charges, shop not available, etc.)..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: "12px",
                  border: `1px solid ${colors.border}`, background: "#f8fafc",
                  fontSize: "14px", color: colors.textPrimary, outline: "none",
                  resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", lineHeight: "1.5"
                }}
              />
            </div>

            <div style={{ background: "rgba(220, 38, 38, 0.05)", border: "1px solid rgba(220, 38, 38, 0.2)", borderRadius: "12px", padding: "12px", fontSize: "12px", color: "#991b1b", lineHeight: "1.4" }}>
              Our support team will inspect the shop's record and contact both you and the shop owner to resolve the situation fairly.
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1, padding: "14px", borderRadius: "14px",
                  background: colors.bg, border: `1px solid ${colors.border}`,
                  color: colors.textSecondary, fontWeight: "700", fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  flex: 2, padding: "14px", borderRadius: "14px",
                  background: colors.danger, border: "none",
                  color: "#fff", fontWeight: "700", fontSize: "14px",
                  cursor: submitting ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  opacity: submitting ? 0.7 : 1,
                  boxShadow: "0 4px 14px rgba(220, 38, 38, 0.3)"
                }}
              >
                <Send size={16} />
                {submitting ? "Filing Report..." : "Submit Issue Report"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
