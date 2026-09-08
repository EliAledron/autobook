import React, { useEffect, useState } from "react";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import { colors } from "../dashboardShared";
import RoleBasedWrapper from "../../components/RoleBasedWrapper";
import { Star, Trash2, Search, MessageSquare } from "lucide-react";

export default function DesktopAdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Note: Assuming reviews are kept in a global 'reviews' collection, 
    // or we might need a collectionGroup if nested. Adjust based on Firebase schema.
    const unsub = onSnapshot(collection(db, "reviews"), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setReviews(list);
      setLoading(false);
    }, (err) => {
      console.warn("Failed to fetch global reviews, they might not exist yet or collection is different", err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const deleteReview = async (id) => {
    if (!window.confirm("Permanently delete this review from the platform?")) return;
    try { await deleteDoc(doc(db, "reviews", id)); } catch (e) {}
  };

  const filteredReviews = reviews.filter(r => {
    const s = search.toLowerCase();
    return (r.customerName || "").toLowerCase().includes(s) || 
           (r.comment || "").toLowerCase().includes(s) || 
           (r.shopName || "").toLowerCase().includes(s);
  });

  return (
    <RoleBasedWrapper title="Platform Reviews">
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: "800", color: colors.textPrimary, margin: "0 0 8px 0" }}>Platform Reviews</h1>
            <p style={{ margin: 0, color: colors.textSecondary, fontSize: "15px" }}>Monitor and moderate all customer reviews left across AutoBook.</p>
          </div>
        </div>

        {/* CONTROLS */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: "24px", background: "#fff", padding: "16px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", border: `1px solid ${colors.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#f8fafc", padding: "10px 16px", borderRadius: "12px", border: `1px solid ${colors.border}`, width: "350px" }}>
            <Search size={18} color={colors.textMuted} />
            <input 
              type="text" 
              placeholder="Search by customer, comment, or shop..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: "14px", color: colors.textPrimary }}
            />
          </div>
        </div>

        {/* TABLE */}
        <div style={{ background: "#fff", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", border: `1px solid ${colors.border}`, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: `1px solid ${colors.border}` }}>
                <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Rating</th>
                <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", width: "300px" }}>Review</th>
                <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Customer</th>
                <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Shop</th>
                <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Date</th>
                <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ padding: "48px", textAlign: "center", color: colors.textMuted }}>Loading reviews...</td></tr>
              ) : filteredReviews.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: "48px", textAlign: "center", color: colors.textMuted }}>
                  <MessageSquare size={32} color={colors.textMuted} style={{ marginBottom: "12px", opacity: 0.5 }} />
                  <div>No reviews match your search.</div>
                </td></tr>
              ) : (
                filteredReviews.map(r => (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ display: "flex", gap: "2px" }}>
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={16} fill={i < (r.rating || 5) ? colors.warning : "none"} color={i < (r.rating || 5) ? colors.warning : colors.border} />
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ fontSize: "14px", color: colors.textPrimary, lineHeight: "1.5", wordBreak: "break-word" }}>"{r.comment || "No comment provided."}"</div>
                    </td>
                    <td style={{ padding: "16px 24px", verticalAlign: "top" }}>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: colors.textPrimary }}>{r.customerName || "Anonymous"}</div>
                    </td>
                    <td style={{ padding: "16px 24px", verticalAlign: "top" }}>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: colors.textPrimary }}>{r.shopName || "Unknown Shop"}</div>
                    </td>
                    <td style={{ padding: "16px 24px", verticalAlign: "top", fontSize: "14px", color: colors.textSecondary }}>
                      {r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000).toLocaleDateString() : "Unknown"}
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "right", verticalAlign: "top" }}>
                      <button onClick={() => deleteReview(r.id)} style={{ width: "36px", height: "36px", borderRadius: "10px", background: colors.dangerBg, color: colors.danger, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }} title="Delete Review">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </RoleBasedWrapper>
  );
}
