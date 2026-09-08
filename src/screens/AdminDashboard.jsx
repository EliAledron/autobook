import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";
import AdminLayout from "../components/AdminLayout";
import { Users, ClipboardList, AlertTriangle, CheckCircle } from "lucide-react";
import { colors } from "./dashboardShared";

export default function AdminDashboard({ user }) {
  const navigate = useNavigate();
  const firstName = user?.name?.split(" ")[0] || "Admin";

  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [allBookings, setAllBookings] = useState([]);

  useEffect(() => {
    const unsubscribers = [];

    unsubscribers.push(onSnapshot(collection(db, "users"), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(list);
      setPendingUsers(list.filter(u => (u.status || "pending") === "pending"));
      setApprovedUsers(list.filter(u => u.status === "approved"));
    }));

    unsubscribers.push(onSnapshot(collection(db, "bookings"), (snap) => {
      setAllBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }));

    const qAlerts = query(
      collection(db, "adminAlerts"),
      where("type", "in", ["new_user", "shop_report", "new_rating", "system_alert"])
    );
    unsubscribers.push(onSnapshot(qAlerts, (snap) => {
      setUnreadAlerts(snap.docs.filter(d => !d.data().read).length);
    }));

    return () => unsubscribers.forEach(u => u());
  }, []);

  return (
    <AdminLayout>
      <div style={{ padding: "0 32px 32px" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "32px", marginTop: "32px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: "800", color: colors.textPrimary, margin: "0 0 8px 0" }}>Overview</h1>
            <p style={{ margin: 0, color: colors.textSecondary, fontSize: "15px" }}>Welcome back, {firstName}. Here is what's happening across the platform today.</p>
          </div>
        </div>

        {/* STATS GRID */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px", marginBottom: "32px" }}>
          {[
            { label: "Total Users", val: users.length, color: colors.navy, icon: <Users size={24} color={colors.navy} />, bg: "#eef2ff" },
            { label: "Active Shops/Users", val: approvedUsers.length, color: colors.success, icon: <CheckCircle size={24} color={colors.success} />, bg: "#ecfdf5" },
            { label: "Global Bookings", val: allBookings.length, color: colors.info, icon: <ClipboardList size={24} color={colors.info} />, bg: "#eff6ff" },
            { label: "System Alerts", val: unreadAlerts, color: colors.danger, icon: <AlertTriangle size={24} color={colors.danger} />, bg: "#fef2f2" }
          ].map((m, i) => (
            <div key={i} style={{ background: "#fff", padding: "24px", borderRadius: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", border: `1px solid ${colors.border}`, display: "flex", flexDirection: "column" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: m.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                {m.icon}
              </div>
              <div style={{ fontSize: "32px", fontWeight: "800", color: colors.textPrimary, marginBottom: "4px" }}>{m.val}</div>
              <div style={{ fontSize: "14px", fontWeight: "600", color: colors.textSecondary }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* SPLIT SECTION */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          
          {/* PENDING APPROVALS */}
          <div style={{ background: "#fff", borderRadius: "20px", border: `1px solid ${colors.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.02)", padding: "24px", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: colors.textPrimary }}>Pending Approvals</h3>
              <span onClick={() => navigate("/admin/users")} style={{ fontSize: "13px", fontWeight: "700", color: colors.blue, cursor: "pointer" }}>View All &rarr;</span>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {pendingUsers.length === 0 ? (
                <div style={{ padding: "32px 0", textAlign: "center", color: colors.textMuted, fontSize: "14px", fontWeight: "500" }}>No pending approvals right now.</div>
              ) : (
                pendingUsers.slice(0, 4).map((u, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "12px", background: "#f8fafc", borderRadius: "12px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: colors.warningBg, display: "flex", alignItems: "center", justifyContent: "center", color: colors.warning, fontWeight: "bold" }}>{u.displayName?.[0] || u.name?.[0] || "?"}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: "700", color: colors.textPrimary }}>{u.displayName || u.name || "Unknown"}</div>
                      <div style={{ fontSize: "12px", color: colors.textSecondary }}>{u.email}</div>
                    </div>
                    <div style={{ padding: "4px 10px", background: colors.warningBg, color: colors.warning, fontSize: "11px", fontWeight: "800", borderRadius: "10px" }}>{u.role || "User"}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RECENT BOOKINGS */}
          <div style={{ background: "#fff", borderRadius: "20px", border: `1px solid ${colors.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.02)", padding: "24px", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: colors.textPrimary }}>Recent Bookings</h3>
              <span onClick={() => navigate("/admin/bookings")} style={{ fontSize: "13px", fontWeight: "700", color: colors.blue, cursor: "pointer" }}>View All &rarr;</span>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {allBookings.length === 0 ? (
                <div style={{ padding: "32px 0", textAlign: "center", color: colors.textMuted, fontSize: "14px", fontWeight: "500" }}>No recent bookings.</div>
              ) : (
                allBookings.slice(-4).reverse().map((b, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "12px", borderBottom: i < 3 ? `1px solid ${colors.border}` : "none" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: colors.infoBg, display: "flex", alignItems: "center", justifyContent: "center", color: colors.info }}>
                      <ClipboardList size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: "700", color: colors.textPrimary }}>{b.serviceType || "Service"}</div>
                      <div style={{ fontSize: "12px", color: colors.textSecondary }}>{b.customerName || "Unknown Customer"}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "13px", fontWeight: "800", color: colors.textPrimary }}>{b.status || "Pending"}</div>
                      <div style={{ fontSize: "11px", color: colors.textMuted }}>{b.date || "No date"}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </AdminLayout>
  );
}
