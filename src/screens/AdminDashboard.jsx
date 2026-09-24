import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";
import AdminLayout from "../components/AdminLayout";
import { Users, ClipboardList, AlertTriangle, CheckCircle } from "lucide-react";
import { colors } from "./dashboardShared";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar, Legend
} from "recharts";

export default function AdminDashboard({ user }) {
  const navigate = useNavigate();
  const firstName = user?.name?.split(" ")[0] || "Admin";

  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [allBookings, setAllBookings] = useState([]);
  const [shops, setShops] = useState([]);

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

    unsubscribers.push(onSnapshot(collection(db, "shops"), (snap) => {
      setShops(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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

  // DATA PROCESSING FOR GRAPHS
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // 1. User Growth (Cumulative over months this year)
  const userGrowthData = React.useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const counts = new Array(12).fill(0);
    
    users.forEach(u => {
      let d = null;
      if (u.createdAt?.seconds) d = new Date(u.createdAt.seconds * 1000);
      else if (u.createdAt) d = new Date(u.createdAt);
      
      // If we don't have a date, let's just dump it in Jan for fallback, or skip it.
      if (d && d.getFullYear() === currentYear) {
        counts[d.getMonth()]++;
      } else if (!d) {
        counts[0]++; // Fallback for dummy data without dates
      }
    });

    let cumulative = 0;
    return months.map((m, i) => {
      cumulative += counts[i];
      return { name: m, Users: cumulative, New: counts[i] };
    }).filter((_, i) => i <= currentMonth); 
  }, [users, currentMonth, currentYear]);

  // 2. Shop Status (Donut Chart)
  const shopStatusData = React.useMemo(() => {
    let active = 0;
    let pending = 0;
    let archived = 0;
    shops.forEach(s => {
      const st = (s.status || "").toLowerCase();
      if (st === "archived") archived++;
      else if (st === "pending") pending++;
      else active++;
    });
    return [
      { name: 'Active', value: active, color: colors.success },
      { name: 'Pending', value: pending, color: colors.warning },
      { name: 'Archived', value: archived, color: colors.danger }
    ].filter(d => d.value > 0);
  }, [shops]);

  // 3. Bookings by Service (Stacked Bar Chart)
  const chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
  const { bookingsData, uniqueServices } = React.useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const data = months.map(m => ({ name: m }));
    const servicesSet = new Set();

    allBookings.forEach(b => {
      let mIndex = -1;
      if (b.date && typeof b.date === 'string') {
        const parts = b.date.split('-');
        if (parts.length >= 2 && parseInt(parts[0]) === currentYear) {
          mIndex = parseInt(parts[1]) - 1;
        }
      } else if (b.createdAt?.seconds) {
        const d = new Date(b.createdAt.seconds * 1000);
        if (d.getFullYear() === currentYear) mIndex = d.getMonth();
      }

      if (mIndex >= 0 && mIndex < 12) {
        const service = b.serviceType || b.service || "Other";
        servicesSet.add(service);
        if (!data[mIndex][service]) data[mIndex][service] = 0;
        data[mIndex][service]++;
      }
    });

    const finalUniqueServices = new Set();
    const trendingData = data.map(monthData => {
      let topService = null;
      let max = 0;
      for (const [key, val] of Object.entries(monthData)) {
        if (key !== 'name' && val > max) {
          max = val;
          topService = key;
        }
      }
      
      const newMonthData = { name: monthData.name };
      if (topService) {
        newMonthData[topService] = max;
        finalUniqueServices.add(topService);
      }
      return newMonthData;
    });

    return { bookingsData: trendingData.filter((_, i) => i <= currentMonth), uniqueServices: Array.from(finalUniqueServices) };
  }, [allBookings, currentMonth, currentYear]);

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
            { label: "Total Users", val: users.length, color: colors.navy, icon: <Users size={24} color={colors.navy} />, bg: "#eef2ff", path: "/admin/users" },
            { label: "Active Shops", val: shops.filter(s => s.status !== 'archived' && s.status !== 'pending').length, color: colors.success, icon: <CheckCircle size={24} color={colors.success} />, bg: "#ecfdf5", path: "/admin/shops" },
            { label: "Overall Bookings", val: allBookings.length, color: colors.info, icon: <ClipboardList size={24} color={colors.info} />, bg: "#eff6ff", path: "/admin/reports" },
            { label: "System Alerts", val: unreadAlerts, color: colors.danger, icon: <AlertTriangle size={24} color={colors.danger} />, bg: "#fef2f2", path: "/admin/alerts" }
          ].map((m, i) => (
            <div key={i} onClick={() => navigate(m.path)} style={{ background: "#fff", padding: "24px", borderRadius: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", border: `1px solid ${colors.border}`, display: "flex", flexDirection: "column", cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
              <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: m.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                {m.icon}
              </div>
              <div style={{ fontSize: "32px", fontWeight: "800", color: colors.textPrimary, marginBottom: "4px" }}>{m.val}</div>
              <div style={{ fontSize: "14px", fontWeight: "600", color: colors.textSecondary }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* NEW GRAPHS SECTION */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", marginBottom: "32px" }}>
          
          {/* User Growth */}
          <div style={{ background: "#fff", borderRadius: "20px", border: `1px solid ${colors.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.02)", padding: "24px", display: "flex", flexDirection: "column" }}>
            <h3 style={{ margin: "0 0 24px 0", fontSize: "16px", fontWeight: "700", color: colors.textPrimary }}>User Growth ({currentYear})</h3>
            <div style={{ flex: 1, minHeight: "220px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userGrowthData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors.navy} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={colors.navy} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.border} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: colors.textSecondary }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: colors.textSecondary }} />
                  <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                  <Area type="monotone" dataKey="Users" stroke={colors.navy} strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Active Shops Distribution */}
          <div style={{ background: "#fff", borderRadius: "20px", border: `1px solid ${colors.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.02)", padding: "24px", display: "flex", flexDirection: "column" }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: "700", color: colors.textPrimary }}>Shop Status</h3>
            <div style={{ flex: 1, minHeight: "220px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {shopStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={shopStatusData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                      {shopStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} itemStyle={{ color: colors.textPrimary, fontWeight: "700" }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", fontWeight: "600", color: colors.textSecondary }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ color: colors.textMuted, fontSize: "14px" }}>No shop data</div>
              )}
            </div>
          </div>

          {/* Bookings Overview */}
          <div style={{ background: "#fff", borderRadius: "20px", border: `1px solid ${colors.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.02)", padding: "24px", display: "flex", flexDirection: "column" }}>
            <h3 style={{ margin: "0 0 24px 0", fontSize: "16px", fontWeight: "700", color: colors.textPrimary }}>Booking Volume</h3>
            <div style={{ flex: 1, minHeight: "220px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bookingsData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.border} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: colors.textSecondary }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: colors.textSecondary }} />
                  <RechartsTooltip cursor={{ fill: "#f1f5f9" }} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", fontWeight: "600", paddingTop: "10px" }} />
                  {uniqueServices.map((service, index) => (
                    <Bar key={service} dataKey={service} stackId="a" fill={chartColors[index % chartColors.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* SPLIT SECTION (Pending Approvals & Recent Bookings) */}
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
              <span onClick={() => navigate("/admin/reports")} style={{ fontSize: "13px", fontWeight: "700", color: colors.blue, cursor: "pointer" }}>View All &rarr;</span>
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
