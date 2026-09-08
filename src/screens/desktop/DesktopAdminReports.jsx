import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../../firebase";
import { colors } from "../dashboardShared";
import RoleBasedWrapper from "../../components/RoleBasedWrapper";
import { BarChart3, Users, Wrench, Calendar, ClipboardList, TrendingUp } from "lucide-react";

export default function DesktopAdminReports() {
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let usersList = [];
    let bookingsList = [];
    let loaded = 0;

    const checkLoaded = () => {
      loaded++;
      if (loaded === 2) {
        setUsers(usersList);
        setBookings(bookingsList);
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

    return () => {
      unsubUsers();
      unsubBookings();
    };
  }, []);

  const totalUsers = users.length;
  const totalOwners = users.filter(u => u.role?.toLowerCase() === "owner").length;
  const totalCustomers = users.filter(u => !u.role || u.role?.toLowerCase() === "customer").length;
  
  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter(b => b.status === "pending" || b.status === "quoted").length;
  const completedBookings = bookings.filter(b => b.status === "completed" || b.status === "paid").length;
  const canceledBookings = bookings.filter(b => b.status === "cancelled" || b.status === "rejected").length;

  // Monthly breakdown for current year
  const currentYear = new Date().getFullYear();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const bookingsByMonth = new Array(12).fill(0);

  bookings.forEach(b => {
    let dateStr = b.date; // Usually YYYY-MM-DD
    if (dateStr && typeof dateStr === "string") {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        if (y === currentYear && m >= 0 && m < 12) {
          bookingsByMonth[m]++;
        }
      }
    } else if (b.createdAt?.seconds) {
      const d = new Date(b.createdAt.seconds * 1000);
      if (d.getFullYear() === currentYear) bookingsByMonth[d.getMonth()]++;
    }
  });

  return (
    <RoleBasedWrapper title="System Reports">
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: "800", color: colors.textPrimary, margin: "0 0 8px 0" }}>System Analytics</h1>
            <p style={{ margin: 0, color: colors.textSecondary, fontSize: "15px" }}>Global platform statistics, bookings tracking, and user growth.</p>
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
              <MetricCard title="All-Time Bookings" value={totalBookings} icon={<ClipboardList />} color={colors.success} bg="#ecfdf5" />
              <MetricCard title="Pending / Quoted" value={pendingBookings} icon={<TrendingUp />} color={colors.warning} bg="#fffbeb" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              
              {/* BOOKINGS BREAKDOWN */}
              <div style={{ background: "#fff", borderRadius: "20px", border: `1px solid ${colors.border}`, padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "700", color: colors.textPrimary, marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <BarChart3 size={18} color={colors.textSecondary} /> Global Bookings Status
                </h3>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <ProgressRow label="Pending / Quoted" count={pendingBookings} total={totalBookings} color={colors.warning} />
                  <ProgressRow label="Completed / Paid" count={completedBookings} total={totalBookings} color={colors.success} />
                  <ProgressRow label="Canceled / Rejected" count={canceledBookings} total={totalBookings} color={colors.danger} />
                </div>
              </div>

              {/* MONTHLY TRENDS */}
              <div style={{ background: "#fff", borderRadius: "20px", border: `1px solid ${colors.border}`, padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "700", color: colors.textPrimary, marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Calendar size={18} color={colors.textSecondary} /> {currentYear} Bookings Trend
                </h3>
                
                <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "140px", marginTop: "32px", paddingBottom: "8px", borderBottom: `1px solid ${colors.border}` }}>
                  {months.map((m, i) => {
                    const max = Math.max(...bookingsByMonth, 1);
                    const height = (bookingsByMonth[i] / max) * 100;
                    return (
                      <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "100%", height: "100px", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                          <div style={{ width: "60%", height: `${height}%`, background: colors.navy, borderRadius: "4px 4px 0 0", minHeight: bookingsByMonth[i] > 0 ? "4px" : "0", transition: "height 0.3s" }} title={`${bookingsByMonth[i]} bookings`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: "8px", paddingTop: "8px" }}>
                  {months.map(m => (
                    <div key={m} style={{ flex: 1, textAlign: "center", fontSize: "11px", color: colors.textSecondary, fontWeight: "600" }}>{m}</div>
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
