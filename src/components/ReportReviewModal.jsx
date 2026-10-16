import React, { useState } from "react";
import { collection, addDoc, updateDoc, doc, serverTimestamp, increment } from "firebase/firestore";
import { db } from "../firebase";
import { colors, CustomDropdown } from "../screens/dashboardShared";
import { Flag, X, Star, AlertTriangle, ShieldAlert, CheckCircle } from "lucide-react";

const REPORT_REASONS = [
  "Inappropriate or offensive language",
  "Harassment, personal attack, or defamation",
  "Fake, fabricated, or competitor review",
  "Spam, advertisement, or promotion",
  "Wrong shop or irrelevant to service",
  "Other violation or dispute"
];

export default function ReportReviewModal({ isOpen, onClose, review, currentUser, onSuccess }) {
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !review) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!selectedReason) {
      setError("Please select a reason for reporting this review.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const reviewId = review.id;
      const reviewSource = review.source || "shop";
      const reporterId = currentUser?.id || currentUser?.uid || "anonymous";
      const reporterName = currentUser?.name || currentUser?.displayName || "User";
      const reporterEmail = currentUser?.email || "";
      const reporterRole = currentUser?.role || "customer";

      // 1. Create entry in reviewReports collection
      const reportRef = await addDoc(collection(db, "reviewReports"), {
        reviewId,
        reviewSource,
        reviewRating: Number(review.rating) || 5,
        reviewComment: review.comment || review.text || "",
        reviewerName: review.customerName || review.userName || "Customer",
        shopId: review.shopId || "",
        shopName: review.shopName || "",
        serviceType: review.serviceType || "",
        reporterId,
        reporterName,
        reporterEmail,
        reporterRole,
        reason: selectedReason,
        details: details.trim(),
        status: "pending",
        createdAt: serverTimestamp()
      });

      // 2. Mark the target review/booking document as reported
      try {
        const targetCollection = reviewSource === "shop" ? "bookings" : "reviews";
        await updateDoc(doc(db, targetCollection, reviewId), {
          isReported: true,
          lastReportReason: selectedReason,
          lastReportedAt: serverTimestamp(),
          reportCount: increment(1)
        });
      } catch (err) {
        console.warn("Could not update review document with isReported flag:", err);
      }

      // 3. Notify admins via adminAlerts
      try {
        await addDoc(collection(db, "adminAlerts"), {
          type: "review_report",
          title: `Review Reported: ${review.shopName || "AutoBook"}`,
          message: `${reporterName} (${reporterRole}) reported a review by ${review.customerName || review.userName || "Customer"}: "${selectedReason}"`,
          reviewId,
          shopId: review.shopId || "",
          shopName: review.shopName || "",
          reportId: reportRef.id,
          reason: selectedReason,
          details: details.trim(),
          read: false,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.warn("Could not create admin alert for review report:", err);
      }

      setDetails("");
      setSelectedReason(REPORT_REASONS[0]);
      onClose();
      if (onSuccess) {
        onSuccess("Review reported successfully. Our moderation team will investigate.");
      }
    } catch (err) {
      console.error("Failed to submit review report:", err);
      setError("Failed to submit report: " + (err.message || "Please try again later."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 38, 64, 0.65)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: "'Inter', sans-serif"
      }}
      onClick={() => !submitting && onClose()}
    >
      <div
        style={{
          background: colors.white,
          width: "100%",
          maxWidth: "480px",
          borderRadius: "24px",
          boxShadow: "0 25px 65px rgba(0,0,0,0.3)",
          overflow: "hidden",
          position: "relative",
          padding: "26px"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          disabled={submitting}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            background: "#f3f4f6",
            border: "none",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: submitting ? "not-allowed" : "pointer",
            color: colors.textSecondary
          }}
        >
          <X size={18} />
        </button>

        {/* HEADER */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <div style={{
            width: "44px", height: "44px", borderRadius: "14px",
            background: colors.dangerBg, color: colors.danger,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: colors.textPrimary }}>
              Report Review
            </h3>
            <div style={{ fontSize: "12.5px", color: colors.textMuted }}>
              Flag review for moderation or guideline violations
            </div>
          </div>
        </div>

        {/* REVIEW SNIPPET */}
        <div style={{
          background: "#f8fafc",
          border: `1px solid ${colors.border}`,
          borderRadius: "14px",
          padding: "14px",
          marginBottom: "18px",
          fontSize: "13px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontWeight: "700", color: colors.textPrimary }}>
              {review.customerName || review.userName || "Customer"}
            </span>
            <div style={{ display: "flex", gap: "2px" }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={12}
                  fill={s <= Math.round(Number(review.rating)) ? "#f59e0b" : "none"}
                  color={s <= Math.round(Number(review.rating)) ? "#f59e0b" : "#d1d5db"}
                />
              ))}
            </div>
          </div>
          <div style={{ color: colors.textSecondary, fontStyle: "italic", lineHeight: "1.4", wordBreak: "break-word" }}>
            "{((review.comment || review.text || "No text comment.")).slice(0, 140)}
            {((review.comment || review.text || "")).length > 140 ? "..." : ""}"
          </div>
        </div>

        {error && (
          <div style={{
            background: colors.dangerBg, color: colors.danger,
            padding: "10px 14px", borderRadius: "12px", fontSize: "13px",
            fontWeight: "600", marginBottom: "14px"
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
              Reason for Report *
            </label>
            <CustomDropdown
              value={selectedReason}
              onChange={(val) => setSelectedReason(val)}
              options={REPORT_REASONS.map((r) => ({ value: r, label: r }))}
              placeholder="Select a reason..."
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "12px",
                border: `1.5px solid ${colors.border}`,
                background: "#f9fafb",
                fontSize: "13.5px",
                fontWeight: "600"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
              Additional Details (Optional)
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Describe what occurred or how this review violates community standards..."
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "12px",
                border: `1.5px solid ${colors.border}`,
                background: "#f9fafb",
                fontSize: "13px",
                fontFamily: "inherit",
                resize: "vertical",
                boxSizing: "border-box",
                outline: "none"
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "12px",
                border: `1px solid ${colors.border}`,
                background: colors.white,
                color: colors.textSecondary,
                fontWeight: "700",
                fontSize: "13px",
                cursor: submitting ? "not-allowed" : "pointer"
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "12px",
                border: "none",
                background: colors.danger,
                color: "#fff",
                fontWeight: "700",
                fontSize: "13px",
                cursor: submitting ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                boxShadow: "0 4px 14px rgba(239, 68, 68, 0.25)",
                opacity: submitting ? 0.7 : 1
              }}
            >
              <Flag size={14} />
              {submitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
