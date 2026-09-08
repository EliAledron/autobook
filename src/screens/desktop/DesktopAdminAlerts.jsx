import React, { useEffect, useState } from "react";
import { collection, onSnapshot, updateDoc, doc, deleteDoc, query, where, writeBatch } from "firebase/firestore";
import { db } from "../../firebase";
import { colors } from "../dashboardShared";
import RoleBasedWrapper from "../../components/RoleBasedWrapper";
import { AlertTriangle, CheckCircle, Trash2, Search, Info, ShieldAlert, Star, CheckCheck } from "lucide-react";

export default function DesktopAdminAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("unread");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch alerts meant for global platform admins
    const q = query(
      collection(db, "adminAlerts"), 
      where("type", "in", ["new_user", "shop_report", "new_rating", "system_alert"])
    );
    
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setAlerts(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const markAllAsRead = async () => {
    const unreadAlerts = alerts.filter(a => !a.read);
    if (unreadAlerts.length === 0) return;
    
    const batch = writeBatch(db);
    unreadAlerts.forEach(a => {
      batch.update(doc(db, "adminAlerts", a.id), { read: true });
    });
    try { await batch.commit(); } catch (e) { console.error("Failed to mark all as read", e); }
  };

  const markAsRead = async (id) => {
    try { await updateDoc(doc(db, "adminAlerts", id), { read: true }); } catch (e) {}
  };

  const markAsUnread = async (id) => {
    try { await updateDoc(doc(db, "adminAlerts", id), { read: false }); } catch (e) {}
  };

  const deleteAlert = async (id) => {
    if (!window.confirm("Permanently delete this alert?")) return;
    try { await deleteDoc(doc(db, "adminAlerts", id)); } catch (e) {}
  };

  const getIcon = (type) => {
    if (type === "new_rating") return <Star size={20} color={colors.warning} />;
    if (type === "shop_report" || type === "report") return <ShieldAlert size={20} color={colors.danger} />;
    if (type === "new_user") return <Info size={20} color={colors.info} />;
    return <AlertTriangle size={20} color={colors.textSecondary} />;
  };

  const filteredAlerts = alerts.filter(a => {
    const s = search.toLowerCase();
    const matchSearch = (a.title || "").toLowerCase().includes(s) || (a.message || "").toLowerCase().includes(s) || (a.shopName || "").toLowerCase().includes(s);
    const matchFilter = filter === "all" ? true : filter === "unread" ? !a.read : a.read;
    return matchSearch && matchFilter;
  });

  return (
    <RoleBasedWrapper title="Global Alerts">
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: "800", color: colors.textPrimary, margin: "0 0 8px 0" }}>System Alerts</h1>
            <p style={{ margin: 0, color: colors.textSecondary, fontSize: "15px" }}>Monitor platform activity, shop reports, and automated system warnings.</p>
          </div>
        </div>

        {/* CONTROLS */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", background: "#fff", padding: "16px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", border: `1px solid ${colors.border}` }}>
          <div style={{ display: "flex", gap: "8px" }}>
            {["unread", "read", "all"].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                style={{ 
                  padding: "8px 16px", borderRadius: "10px", fontWeight: "700", fontSize: "14px", cursor: "pointer", border: "none", transition: "all 0.2s",
                  background: filter === f ? colors.navy : "transparent",
                  color: filter === f ? "#fff" : colors.textSecondary,
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {alerts.some(a => !a.read) && (
              <button 
                onClick={markAllAsRead}
                style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", borderRadius: "10px", background: colors.successBg, color: colors.success, fontWeight: "700", fontSize: "13px", cursor: "pointer", border: "none" }}
              >
                <CheckCheck size={18} /> Mark All as Read
              </button>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#f8fafc", padding: "10px 16px", borderRadius: "12px", border: `1px solid ${colors.border}`, width: "300px" }}>
              <Search size={18} color={colors.textMuted} />
              <input 
                type="text" 
                placeholder="Search alerts..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: "14px", color: colors.textPrimary }}
              />
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div style={{ background: "#fff", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", border: `1px solid ${colors.border}`, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: `1px solid ${colors.border}` }}>
                <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", width: "50px" }}>Type</th>
                <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Details</th>
                <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Source</th>
                <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", width: "160px" }}>Date</th>
                <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "right", width: "120px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{ padding: "48px", textAlign: "center", color: colors.textMuted }}>Loading alerts...</td></tr>
              ) : filteredAlerts.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: "48px", textAlign: "center", color: colors.textMuted }}>No alerts found.</td></tr>
              ) : (
                filteredAlerts.map(a => (
                  <tr key={a.id} style={{ borderBottom: `1px solid ${colors.border}`, background: !a.read ? "rgba(42, 82, 152, 0.03)" : "transparent" }}>
                    <td style={{ padding: "16px 24px", verticalAlign: "top" }}>
                      <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {getIcon(a.type)}
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ fontWeight: !a.read ? "800" : "600", fontSize: "15px", color: colors.textPrimary, marginBottom: "4px" }}>{a.title || "Alert"}</div>
                      <div style={{ fontSize: "14px", color: colors.textSecondary, lineHeight: "1.5" }}>{a.message}</div>
                    </td>
                    <td style={{ padding: "16px 24px", verticalAlign: "top" }}>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: colors.textPrimary }}>{a.shopName || a.customerName || "System"}</div>
                      <span style={{ fontSize: "11px", fontWeight: "800", textTransform: "uppercase", color: colors.textMuted }}>{a.type?.replace('_', ' ') || "Notification"}</span>
                    </td>
                    <td style={{ padding: "16px 24px", verticalAlign: "top", fontSize: "14px", color: colors.textSecondary }}>
                      {a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000).toLocaleString() : "Just now"}
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "right", verticalAlign: "top" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                        {!a.read ? (
                          <button onClick={() => markAsRead(a.id)} style={{ width: "36px", height: "36px", borderRadius: "10px", background: colors.successBg, color: colors.success, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Mark as Read">
                            <CheckCircle size={18} />
                          </button>
                        ) : (
                          <button onClick={() => markAsUnread(a.id)} style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#f1f5f9", color: colors.textSecondary, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Mark as Unread">
                            <Info size={18} />
                          </button>
                        )}
                        <button onClick={() => deleteAlert(a.id)} style={{ width: "36px", height: "36px", borderRadius: "10px", background: colors.dangerBg, color: colors.danger, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Delete">
                          <Trash2 size={18} />
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
