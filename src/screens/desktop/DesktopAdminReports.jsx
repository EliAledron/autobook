import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../../firebase";
import { colors } from "../dashboardShared";
import RoleBasedWrapper from "../../components/RoleBasedWrapper";
import { BarChart3, Users, Wrench, Calendar, ClipboardList, TrendingUp, Flame } from "lucide-react";

export default function DesktopAdminReports() {
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let usersList = [];
    let bookingsList = [];
    let shopsList = [];
    let loaded = 0;

    const checkLoaded = () => {
      loaded++;
      if (loaded === 3) {
        setUsers(usersList);
        setBookings(bookingsList);
        setShops(shopsList);
        setLoading(false);
      }
    };

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      usersList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      checkLoaded();
    });

    const unsubBookings = onSnapshot(collection(db, "bookings"), (snap) => {
      bookingsList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      checkLoaded();
    });

    const unsubShops = onSnapshot(collection(db, "shops"), (snap) => {
      shopsList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      checkLoaded();
    });

    return () => {
      unsubUsers();
      unsubBookings();
      unsubShops();
    };
  }, []);

  const totalUsers = users.length;
  const totalOwners = shops.length;
  const totalCustomers = users.filter(u => !u.role || u.role?.toLowerCase() === "customer").length;
  
  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter(b => (b.status || "Pending").toLowerCase() === "pending" || (b.status || "").toLowerCase() === "quoted" || (b.status || "").toLowerCase() === "in progress").length;
  const completedBookings = bookings.filter(b => (b.status || "").toLowerCase() === "completed" || (b.status || "").toLowerCase() === "paid").length;
  const canceledBookings = bookings.filter(b => (b.status || "").toLowerCase() === "cancelled" || (b.status || "").toLowerCase() === "rejected" || (b.status || "").toLowerCase() === "canceled").length;

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [hoveredMonth, setHoveredMonth] = useState(null);

  // Extract all unique years from bookings, but ensure at least recent years are always selectable
  const availableYears = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = new Set([currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4]);
    
    bookings.forEach(b => {
      if (b.date && typeof b.date === "string") {
        const y = parseInt(b.date.split("-")[0], 10);
        if (!isNaN(y) && y >= 2000 && y <= 2100) years.add(y);
      } else if (b.createdAt?.seconds) {
        const y = new Date(b.createdAt.seconds * 1000).getFullYear();
        if (y >= 2000 && y <= 2100) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [bookings]);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const bookingsByMonth = new Array(12).fill(0);
  const servicesByMonth = Array.from({ length: 12 }, () => ({}));
  let overallServices = {};

  bookings.forEach(b => {
    let mIndex = -1;
    let bYear = -1;
    
    let dateStr = b.date; // Usually YYYY-MM-DD
    if (dateStr && typeof dateStr === "string") {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        bYear = parseInt(parts[0], 10);
        mIndex = parseInt(parts[1], 10) - 1;
      }
    } else if (b.createdAt?.seconds) {
      const d = new Date(b.createdAt.seconds * 1000);
      bYear = d.getFullYear();
      mIndex = d.getMonth();
    }

    if (bYear === selectedYear && mIndex >= 0 && mIndex < 12) {
      bookingsByMonth[mIndex]++;
      const sType = b.serviceType || b.service || "General Service";
      servicesByMonth[mIndex][sType] = (servicesByMonth[mIndex][sType] || 0) + 1;
    }
    
    // Calculate overall booming for the selected year
    if (bYear === selectedYear) {
      const sTypeAll = b.serviceType || b.service || "General Service";
      overallServices[sTypeAll] = (overallServices[sTypeAll] || 0) + 1;
    }
  });

  const getTopService = (mIndex) => {
    const services = servicesByMonth[mIndex];
    let max = 0;
    let top = null;
    for (const [s, count] of Object.entries(services)) {
      if (count > max) { max = count; top = s; }
    }
    return top ? { name: top, count: max } : null;
  };

  let overallTop = "None";
  let overallMax = 0;
  for (const [s, count] of Object.entries(overallServices)) {
    if (count > overallMax) { overallMax = count; overallTop = s; }
  }

  return (
    <RoleBasedWrapper title="System Reports">
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: "800", color: colors.textPrimary, margin: "0 0 8px 0" }}>System Analytics</h1>
            <p style={{ margin: 0, color: colors.textSecondary, fontSize: "15px" }}>Overall platform statistics, bookings tracking, and user growth.</p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: colors.textMuted }}>Loading global analytics...</div>
        ) : (
          <>
            {/* OVERVIEW METRICS */}
            <h2 style={{ fontSize: "18px", fontWeight: "700", color: colors.textPrimary, marginBottom: "16px" }}>Platform Health</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px", marginBottom: "32px" }}>
              <MetricCard title="Total Platform Users" value={totalUsers} icon={<Users />} color={colors.navy} bg="#eef2ff" />
              <MetricCard title="Total Auto Shops" value={totalOwners} icon={<Wrench />} color={colors.info} bg="#eff6ff" />
              <MetricCard title="Overall Bookings" value={totalBookings} icon={<ClipboardList />} color={colors.success} bg="#ecfdf5" />
              <MetricCard title="Pending / Quoted" value={pendingBookings} icon={<TrendingUp />} color={colors.warning} bg="#fffbeb" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              
              {/* BOOKINGS BREAKDOWN */}
              <div style={{ background: "#fff", borderRadius: "20px", border: `1px solid ${colors.border}`, padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "700", color: colors.textPrimary, marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <BarChart3 size={18} color={colors.textSecondary} /> Overall Bookings Status
                </h3>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <ProgressRow label="Pending / Quoted" count={pendingBookings} total={totalBookings} color={colors.warning} />
                  <ProgressRow label="Completed / Paid" count={completedBookings} total={totalBookings} color={colors.success} />
                  <ProgressRow label="Canceled / Rejected" count={canceledBookings} total={totalBookings} color={colors.danger} />
                </div>
              </div>

              {/* MONTHLY TRENDS */}
              <div style={{ background: "#fff", borderRadius: "20px", border: `1px solid ${colors.border}`, padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "700", color: colors.textPrimary, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                    <Calendar size={18} color={colors.textSecondary} /> 
                    <select 
                      value={selectedYear} 
                      onChange={e => setSelectedYear(Number(e.target.value))}
                      style={{ padding: "4px 8px", borderRadius: "8px", border: `1px solid ${colors.border}`, fontSize: "14px", fontWeight: "700", outline: "none", cursor: "pointer", background: "#f8fafc" }}
                    >
                      {availableYears.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    Trends
                  </h3>
                  {overallMax > 0 && (
                    <span style={{ fontSize: "12px", background: "#fef08a", color: "#854d0e", padding: "4px 10px", borderRadius: "12px", fontWeight: "800", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <Flame size={14} /> Booming: {overallTop}
                    </span>
                  )}
                </div>
                
                <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "140px", marginTop: "32px", paddingBottom: "8px", borderBottom: `1px solid ${colors.border}`, position: "relative" }}>
                  {months.map((m, i) => {
                    const max = Math.max(...bookingsByMonth, 1);
                    const height = (bookingsByMonth[i] / max) * 100;
                    const topSvc = getTopService(i);
                    const isHovered = hoveredMonth === i;
                    
                    return (
                      <div 
                        key={m} 
                        style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", position: "relative" }}
                        onMouseEnter={() => setHoveredMonth(i)}
                        onMouseLeave={() => setHoveredMonth(null)}
                      >
                        <div style={{ width: "100%", height: "100px", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                          <div style={{ width: "60%", height: `${height}%`, background: isHovered ? colors.blue : colors.navy, borderRadius: "4px 4px 0 0", minHeight: bookingsByMonth[i] > 0 ? "4px" : "0", transition: "all 0.2s ease", cursor: "pointer", opacity: hoveredMonth !== null && !isHovered ? 0.5 : 1 }} />
                        </div>
                        
                        {/* CUSTOM TOOLTIP */}
                        {isHovered && (
                          <div style={{ position: "absolute", bottom: "110px", left: "50%", transform: "translateX(-50%)", background: "#1e293b", color: "#fff", padding: "10px 14px", borderRadius: "8px", fontSize: "12px", whiteSpace: "nowrap", zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", pointerEvents: "none" }}>
                            <div style={{ fontWeight: "700", marginBottom: "4px", fontSize: "13px", color: "#94a3b8" }}>{m} {selectedYear}</div>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "4px" }}>
                              <span>Total Bookings:</span>
                              <span style={{ fontWeight: "700" }}>{bookingsByMonth[i]}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
                              <span>Top Service:</span>
                              <span style={{ fontWeight: "700", color: "#60a5fa" }}>{topSvc ? `${topSvc.name} (${topSvc.count})` : "None"}</span>
                            </div>
                            {/* Tooltip Arrow */}
                            <div style={{ position: "absolute", bottom: "-4px", left: "50%", transform: "translateX(-50%) rotate(45deg)", width: "8px", height: "8px", background: "#1e293b" }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: "8px", paddingTop: "8px" }}>
                  {months.map((m, i) => (
                    <div key={m} style={{ flex: 1, textAlign: "center", fontSize: "11px", color: hoveredMonth === i ? colors.blue : colors.textSecondary, fontWeight: "700", transition: "color 0.2s" }}>{m}</div>
                  ))}
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </RoleBasedWrapper>
  );
}

function MetricCard({ title, value, icon, color, bg }) {
  return (
    <div style={{ background: "#fff", padding: "24px", borderRadius: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", border: `1px solid ${colors.border}`, display: "flex", flexDirection: "column" }}>
      <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px", color: color }}>
        {icon}
      </div>
      <div style={{ fontSize: "32px", fontWeight: "800", color: colors.textPrimary, marginBottom: "4px" }}>{value}</div>
      <div style={{ fontSize: "14px", fontWeight: "600", color: colors.textSecondary }}>{title}</div>
    </div>
  );
}

function ProgressRow({ label, count, total, color }) {
  const percent = total === 0 ? 0 : Math.round((count / total) * 100);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px", fontWeight: "600" }}>
        <span style={{ color: colors.textPrimary }}>{label}</span>
        <span style={{ color: colors.textSecondary }}>{count} ({percent}%)</span>
      </div>
      <div style={{ width: "100%", height: "8px", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
        <div style={{ width: `${percent}%`, height: "100%", background: color, borderRadius: "4px" }} />
      </div>
    </div>
  );
}
