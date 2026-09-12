import React from "react";

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db, auth } from "../firebase";
import { signOut } from "firebase/auth";
import TopbarAvatar from "../screens/TopbarAvatar";
import { Users, FileText, Wrench, AlertTriangle, MessageSquare, ShieldAlert, ClipboardList, LogOut, LayoutDashboard, Search, Bell } from "lucide-react";
import { colors } from "../screens/dashboardShared";
import { useUser } from "../UserContext";

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile } = useUser();
  const firstName = userProfile?.name?.split(" ")[0] || "Admin";

  const [pendingUsers, setPendingUsers] = useState(0);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [alertsList, setAlertsList] = useState([]);
  const [showNotif, setShowNotif] = useState(false);

  useEffect(() => {
    const unsubscribers = [];

    unsubscribers.push(onSnapshot(collection(db, "users"), (snap) => {
      setPendingUsers(snap.docs.filter(d => (d.data().status || "pending") === "pending").length);
    }));

    const qAlerts = query(
      collection(db, "adminAlerts"),
      where("type", "in", ["new_user", "shop_report", "new_rating", "system_alert"])
    );
    unsubscribers.push(onSnapshot(qAlerts, (snap) => {
      const list = snap.docs.map(d => ({id: d.id, ...d.data()}));
      list.sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
      setAlertsList(list);
      setUnreadAlerts(list.filter(d => !d.read).length);
    }));

    return () => unsubscribers.forEach(u => u());
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const SIDEBAR_LINKS = [
    { label: "Dashboard", icon: <LayoutDashboard size={20} />, path: "/dashboard" },
    { label: "User Approvals", icon: <Users size={20} />, path: "/admin/users", badge: pendingUsers },
    { label: "System Reports", icon: <FileText size={20} />, path: "/admin/reports" },
    { label: "Reported Shops", icon: <ShieldAlert size={20} />, path: "/admin/reported-shops" },
    { label: "Global Alerts", icon: <AlertTriangle size={20} />, path: "/admin/alerts", badge: unreadAlerts },
    { label: "Platform Reviews", icon: <MessageSquare size={20} />, path: "/admin/reviews" }
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f4f7fa", fontFamily: "Inter, sans-serif" }}>
      
      {/* SIDEBAR */}
      <div style={{ width: "260px", background: colors.navy, color: "#fff", display: "flex", flexDirection: "column", flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.1)" }}>
        <div onClick={() => navigate("/dashboard")} style={{ padding: "24px", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}>
          <div style={{ width: "32px", height: "32px", background: colors.accent, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: colors.navy }}>A</div>
          <div style={{ fontSize: "20px", fontWeight: "800", letterSpacing: "-0.5px" }}>Auto<span style={{ color: colors.accent }}>Book</span></div>
        </div>
        
        <div style={{ padding: "24px 16px", flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px", paddingLeft: "12px" }}>Platform Admin</div>
          
          {SIDEBAR_LINKS.map((link, i) => {
            const isActive = location.pathname === link.path;
            return (
              <div key={i} onClick={() => navigate(link.path)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: "12px", background: isActive ? "rgba(255,255,255,0.1)" : "transparent", color: isActive ? "#fff" : "rgba(255,255,255,0.7)", cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={e => !isActive && (e.currentTarget.style.background = "rgba(255,255,255,0.05)")} onMouseLeave={e => !isActive && (e.currentTarget.style.background = "transparent")}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", fontWeight: isActive ? "700" : "500", fontSize: "14px" }}>
                  <span style={{ opacity: isActive ? 1 : 0.7 }}>{link.icon}</span>
                  {link.label}
                </div>
                {link.badge > 0 && (
                  <div style={{ background: colors.danger, color: "#fff", fontSize: "11px", fontWeight: "800", padding: "2px 8px", borderRadius: "10px" }}>{link.badge}</div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ padding: "24px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <div onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: "12px", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: "14px", fontWeight: "600", padding: "12px 16px", borderRadius: "12px", transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <LogOut size={20} />
            Sign Out
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        
        {/* TOP NAV */}
        <div style={{ height: "76px", background: "#fff", borderBottom: `1px solid ${colors.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", color: colors.textSecondary }}>
            <Search size={20} />
            <input type="text" placeholder="Search..." style={{ border: "none", outline: "none", fontSize: "15px", background: "transparent", width: "300px", fontFamily: "inherit" }} />
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <div style={{ position: "relative" }}>
              <div onClick={() => setShowNotif(!showNotif)} style={{ position: "relative", cursor: "pointer", color: colors.textSecondary }}>
                <Bell size={24} />
                {unreadAlerts > 0 && <span style={{ position: "absolute", top: -2, right: -2, width: 10, height: 10, background: colors.danger, borderRadius: "50%", border: "2px solid #fff" }} />}
              </div>

              {showNotif && (
                <>
                  <div onClick={() => setShowNotif(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} />
                  <div style={{ position: "absolute", top: "40px", right: 0, width: "360px", background: "#fff", borderRadius: "16px", boxShadow: "0 10px 40px rgba(0,0,0,0.1)", border: `1px solid ${colors.border}`, zIndex: 1000, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    <div style={{ padding: "16px", borderBottom: `1px solid ${colors.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: colors.textPrimary }}>Notifications</h3>
                      {unreadAlerts > 0 && <span style={{ fontSize: "12px", color: colors.textSecondary }}>{unreadAlerts} unread</span>}
                    </div>
                    <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                      {alertsList.length === 0 ? (
                        <div style={{ padding: "32px", textAlign: "center", color: colors.textMuted, fontSize: "14px" }}>No notifications yet.</div>
                      ) : (
                        alertsList.slice(0, 8).map(a => (
                          <div key={a.id} onClick={() => { setShowNotif(false); navigate("/admin/alerts"); }} style={{ padding: "16px", borderBottom: `1px solid ${colors.border}`, display: "flex", gap: "12px", cursor: "pointer", background: !a.read ? "rgba(42, 82, 152, 0.03)" : "#fff", transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={(e) => e.currentTarget.style.background = !a.read ? "rgba(42, 82, 152, 0.03)" : "#fff"}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "14px", fontWeight: !a.read ? "800" : "500", color: colors.textPrimary, marginBottom: "4px" }}>{a.title}</div>
                              <div style={{ fontSize: "13px", color: colors.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.message}</div>
                              <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "8px" }}>{a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000).toLocaleString() : "Just now"}</div>
                            </div>
                            {!a.read && <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: colors.navy, marginTop: "6px", flexShrink: 0 }} />}
                          </div>
                        ))
                      )}
                    </div>
                    <div onClick={() => { setShowNotif(false); navigate("/admin/alerts"); }} style={{ padding: "12px", textAlign: "center", background: "#f8fafc", color: colors.navy, fontSize: "13px", fontWeight: "700", cursor: "pointer", borderTop: `1px solid ${colors.border}` }}>
                      View all notifications
                    </div>
                  </div>
                </>
              )}
            </div>
            <div style={{ width: "1px", height: "32px", background: colors.border }} />
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "14px", fontWeight: "700", color: colors.textPrimary }}>{userProfile?.displayName || userProfile?.name || "Admin"}</div>
                <div style={{ fontSize: "12px", color: colors.textSecondary }}>Super Admin</div>
              </div>
              
            <TopbarAvatar onClick={() => navigate("/profile")} />
            </div>
          </div>
        </div>

        {/* INJECTED PAGE CONTENT */}
        <div style={{ flex: 1, overflowY: "auto", position: "relative", background: "#f4f7fa" }}>
          {/* We remove padding here because some pages might need full width, 
              or they can add padding themselves. Most admin pages use sh.page padding. */}
          {children}
        </div>
      </div>
    </div>
  );
}
