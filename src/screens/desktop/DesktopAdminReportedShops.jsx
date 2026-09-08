import React, { useEffect, useState } from "react";
import { collection, onSnapshot, updateDoc, doc, getDoc, getDocs, query, where, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { colors } from "../dashboardShared";
import RoleBasedWrapper from "../../components/RoleBasedWrapper";
import { ShieldAlert, CheckCircle, Search, Ban, Flag, Trash2 } from "lucide-react";

export default function DesktopAdminReportedShops() {
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    // Fetch all shop_report alerts to aggregate reports by shop
    const unsub = onSnapshot(query(collection(db, "adminAlerts"), where("type", "==", "shop_report")), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setReports(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const dismissReport = async (id) => {
    if (!window.confirm("Dismiss this report?")) return;
    setActionLoading(id);
    try { await deleteDoc(doc(db, "adminAlerts", id)); } catch (e) {}
    setActionLoading(null);
  };

  const banShopOwner = async (shopId) => {
    if (!window.confirm("Are you sure you want to restrict the owner of this shop? They will lose access to the platform.")) return;
    setActionLoading(shopId);
    try {
      // Find the user with this shopId and role 'owner'
      const q = query(collection(db, "users"), where("shopId", "==", shopId));
      const s = await getDocs(q);
      s.docs.forEach(async (d) => {
        if (d.data().role?.toLowerCase() === "owner") {
          await updateDoc(doc(db, "users", d.id), { status: "restricted" });
        }
      });
      alert("Shop Owner has been restricted.");
    } catch (e) {
      console.error(e);
      alert("Failed to ban shop.");
    }
    setActionLoading(null);
  };

  const filteredReports = reports.filter(r => {
    const s = search.toLowerCase();
    return (r.shopName || "").toLowerCase().includes(s) || 
           (r.reason || r.message || "").toLowerCase().includes(s) ||
           (r.reporterName || "").toLowerCase().includes(s);
  });

  return (
    <RoleBasedWrapper title="Reported Shops">
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: "800", color: colors.textPrimary, margin: "0 0 8px 0" }}>Reported Shops</h1>
            <p style={{ margin: 0, color: colors.textSecondary, fontSize: "15px" }}>Review flags against auto shops and take disciplinary action if necessary.</p>
          </div>
        </div>

        {/* CONTROLS */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: "24px", background: "#fff", padding: "16px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", border: `1px solid ${colors.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#f8fafc", padding: "10px 16px", borderRadius: "12px", border: `1px solid ${colors.border}`, width: "350px" }}>
            <Search size={18} color={colors.textMuted} />
            <input 
              type="text" 
              placeholder="Search reports..." 
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
                <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", width: "50px" }}><Flag size={16} /></th>
                <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", width: "200px" }}>Reported Shop</th>
                <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Reason for Report</th>
                <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", width: "160px" }}>Reporter</th>
                <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", width: "160px" }}>Date</th>
                <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "right", width: "140px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ padding: "48px", textAlign: "center", color: colors.textMuted }}>Loading reports...</td></tr>
              ) : filteredReports.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: "48px", textAlign: "center", color: colors.textMuted }}>
                  <ShieldAlert size={32} color={colors.textMuted} style={{ marginBottom: "12px", opacity: 0.5 }} />
                  <div>No shops have been reported recently.</div>
                </td></tr>
              ) : (
                filteredReports.map(r => (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: "16px 24px", verticalAlign: "top" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: colors.dangerBg, color: colors.danger, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Flag size={16} />
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px", verticalAlign: "top" }}>
                      <div style={{ fontWeight: "700", fontSize: "14px", color: colors.textPrimary }}>{r.shopName || "Unknown"}</div>
                      {r.shopId && <div style={{ fontSize: "12px", color: colors.textSecondary }}>ID: {r.shopId}</div>}
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ fontSize: "14px", color: colors.textPrimary, lineHeight: "1.5" }}>{r.reason || r.message || "No reason provided"}</div>
                    </td>
                    <td style={{ padding: "16px 24px", verticalAlign: "top" }}>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: colors.textPrimary }}>{r.reporterName || "Anonymous"}</div>
                    </td>
                    <td style={{ padding: "16px 24px", verticalAlign: "top", fontSize: "14px", color: colors.textSecondary }}>
                      {r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000).toLocaleDateString() : "Unknown"}
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "right", verticalAlign: "top" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                        <button disabled={actionLoading === r.id} onClick={() => dismissReport(r.id)} style={{ width: "36px", height: "36px", borderRadius: "10px", background: colors.successBg, color: colors.success, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Dismiss Report">
                          <CheckCircle size={18} />
                        </button>
                        <button disabled={actionLoading === r.shopId} onClick={() => banShopOwner(r.shopId)} style={{ width: "36px", height: "36px", borderRadius: "10px", background: colors.dangerBg, color: colors.danger, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Ban Shop Owner">
                          <Ban size={18} />
                        </button>
                      </div>
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
