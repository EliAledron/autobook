import React, { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { colors, sh } from "../screens/dashboardShared";
import { Star, X } from "lucide-react";

export default function ReviewAppModal({ onClose, userProfile }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "reviews"), {
        type: "platform", // Distinction from shop reviews
        rating,
        comment: comment.trim(),
        customerId: userProfile?.id || "unknown",
        customerName: userProfile?.name || userProfile?.displayName || "User",
        createdAt: serverTimestamp(),
      });
      // Also notify admins
      await addDoc(collection(db, "adminAlerts"), {
        type: "new_rating",
        title: "New Platform Review",
        message: `${rating} Stars: ${comment.trim()}`,
        customerName: userProfile?.name || userProfile?.displayName || "User",
        read: false,
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
      setTimeout(() => onClose(), 2000);
    } catch (e) {
      console.error(e);
      alert("Failed to submit review. Try again later.");
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "#fff", width: "100%", maxWidth: "400px", borderRadius: "24px", padding: "24px", position: "relative" }}>
        
        <button onClick={onClose} style={{ position: "absolute", top: "16px", right: "16px", background: "rgba(0,0,0,0.05)", border: "none", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <X size={18} color={colors.textSecondary} />
        </button>

        {success ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ width: "64px", height: "64px", background: colors.successBg, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Star size={32} fill={colors.success} color={colors.success} />
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: "800", color: colors.textPrimary, marginBottom: "8px" }}>Thank You!</h2>
            <p style={{ color: colors.textSecondary, fontSize: "14px", margin: 0 }}>Your feedback helps us improve the platform.</p>
          </div>
        ) : (
          <>
            <h2 style={{ margin: "0 0 8px 0", fontSize: "20px", fontWeight: "800", color: colors.textPrimary }}>Rate AutoBook</h2>
            <p style={{ margin: "0 0 24px 0", fontSize: "14px", color: colors.textSecondary, lineHeight: "1.5" }}>How is your experience with our platform?</p>
            
            <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "24px" }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div 
                  key={i} 
                  onMouseEnter={() => setHovered(i)} 
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setRating(i)}
                  style={{ cursor: "pointer", transition: "transform 0.1s" }}
                >
                  <Star size={36} fill={i <= (hovered || rating) ? colors.warning : "none"} color={i <= (hovered || rating) ? colors.warning : colors.border} />
                </div>
              ))}
            </div>

            <textarea 
              placeholder="Tell us more about your experience... (optional)"
              value={comment}
              onChange={e => setComment(e.target.value)}
              style={{ width: "100%", height: "100px", padding: "16px", borderRadius: "16px", border: `1px solid ${colors.border}`, background: "#f8fafc", fontFamily: "inherit", fontSize: "14px", color: colors.textPrimary, resize: "none", boxSizing: "border-box", marginBottom: "24px" }}
            />

            <button 
              disabled={rating === 0 || saving}
              onClick={handleSubmit}
              style={{ width: "100%", padding: "16px", borderRadius: "16px", background: rating > 0 ? colors.navy : colors.border, color: rating > 0 ? "#fff" : colors.textMuted, fontSize: "15px", fontWeight: "800", border: "none", cursor: rating > 0 ? "pointer" : "not-allowed" }}
            >
              {saving ? "Submitting..." : "Submit Review"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
