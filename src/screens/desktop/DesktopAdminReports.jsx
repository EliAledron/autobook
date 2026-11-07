import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import { colors, CustomDropdown } from "../dashboardShared";
import RoleBasedWrapper from "../../components/RoleBasedWrapper";
import { useUser } from "../../UserContext";
import { BarChart3, Users, Wrench, Calendar, ClipboardList, TrendingUp, Flame, Download, FileText, X, Check } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";

export default function DesktopAdminReports() {
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  const { userProfile } = useUser();
  const [showExportModal, setShowExportModal] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState("");

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

  const chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
  const trendingServicesSet = new Set();
  const chartData = months.map((m, i) => {
    const services = servicesByMonth[i];
    let topService = null;
    let max = 0;
    for (const [s, count] of Object.entries(services)) {
      if (count > max) { max = count; topService = s; }
    }
    const dataObj = { name: m };
    if (topService) {
      dataObj[topService] = max;
      trendingServicesSet.add(topService);
    }
    return dataObj;
  });
  const uniqueServices = Array.from(trendingServicesSet);

  // ── CSV Export Helper ──────────────────────────────────────────
  const downloadCSV = (filename, rows) => {
    const processRow = (row) => {
      return row.map(val => {
        if (val === null || val === undefined) return '""';
        let stringVal = String(val).replace(/"/g, '""');
        return `"${stringVal}"`;
      }).join(',');
    };

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + rows.map(processRow).join('\r\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportBookingsCSV = () => {
    const rows = [
      ["Booking ID", "Customer Name", "Customer Email", "Customer Phone", "Shop Name", "Service", "Date", "Time Slot", "Status", "Vehicle", "Price", "Notes", "Created At"],
      ...bookings.map(b => [
        b.id || "",
        b.userName || b.customerName || b.name || "N/A",
        b.userEmail || b.email || "N/A",
        b.userPhone || b.phone || "N/A",
        b.shopName || "N/A",
        b.serviceType || b.service || "General Service",
        b.date || "N/A",
        b.time || b.timeSlot || "N/A",
        b.status || "Pending",
        b.vehicleModel ? `${b.vehicleYear || ''} ${b.vehicleMake || ''} ${b.vehicleModel}`.trim() : (b.vehicle || "N/A"),
        b.totalCost || b.price || b.estimatedCost || "N/A",
        b.notes || b.issueDescription || "",
        b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000).toLocaleString() : (b.createdAt ? new Date(b.createdAt).toLocaleString() : "N/A")
      ])
    ];
    downloadCSV(`autobook_all_bookings_${new Date().toISOString().slice(0,10)}.csv`, rows);
    setDownloadNotice("Detailed Bookings CSV downloaded!");
    setTimeout(() => setDownloadNotice(""), 3500);
  };

  const exportMetricsCSV = () => {
    const rows = [
      ["AutoBook Platform Analytics Summary"],
      ["Generated On", new Date().toLocaleString()],
      ["Year Filter", String(selectedYear)],
      [],
      ["Metric Category", "Indicator", "Value"],
      ["Users", "Total Platform Users", totalUsers],
      ["Users", "Customers", totalCustomers],
      ["Users", "Auto Shop Owners", totalOwners],
      ["Bookings", "Overall Bookings (All Time)", totalBookings],
      ["Bookings", "Pending / Quoted / In Progress", pendingBookings],
      ["Bookings", "Completed / Paid", completedBookings],
      ["Bookings", "Canceled / Rejected", canceledBookings],
      ["Trending", "Most Demanded Service", overallTop],
      [],
      [`Monthly Booking Breakdown (${selectedYear})`],
      ["Month", "Bookings Count", "Top Demanded Service", "Service Bookings"],
      ...months.map((m, i) => {
        const top = getTopService(i);
        return [m, bookingsByMonth[i], top ? top.name : "None", top ? top.count : 0];
      })
    ];
    downloadCSV(`autobook_analytics_summary_${selectedYear}.csv`, rows);
    setDownloadNotice("Analytics Summary CSV downloaded!");
    setTimeout(() => setDownloadNotice(""), 3500);
  };

  const exportShopsCSV = () => {
    const rows = [
      ["Shop ID", "Shop Name", "Owner ID", "Rating", "Review Count", "Status", "Address / Location", "Created Date"],
      ...shops.map(s => [
        s.id || "",
        s.name || "N/A",
        s.ownerId || "N/A",
        s.rating !== undefined ? Number(s.rating).toFixed(1) : "0.0",
        s.reviews || s.reviewCount || 0,
        s.status || "Active",
        s.address || s.location || "N/A",
        s.createdAt?.seconds ? new Date(s.createdAt.seconds * 1000).toLocaleDateString() : "N/A"
      ])
    ];
    downloadCSV(`autobook_registered_shops_${new Date().toISOString().slice(0,10)}.csv`, rows);
    setDownloadNotice("Registered Shops CSV downloaded!");
    setTimeout(() => setDownloadNotice(""), 3500);
  };

  // ── Print-ready Executive PDF Helper ──────────────────────────
  const exportExecutivePDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow pop-ups in your browser to view and print the executive PDF report.");
      return;
    }

    const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const reportTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const adminName = userProfile?.displayName || userProfile?.name || "Platform Admin";

    const recentBookings = [...bookings].sort((a,b) => {
      const da = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.date ? new Date(a.date).getTime() : 0);
      const db = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.date ? new Date(b.date).getTime() : 0);
      return db - da;
    }).slice(0, 10);

    const fulfillmentPercent = totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0;
    const pendingPercent = totalBookings > 0 ? Math.round((pendingBookings / totalBookings) * 100) : 0;
    const canceledPercent = totalBookings > 0 ? Math.round((canceledBookings / totalBookings) * 100) : 0;

    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>AutoBook Executive Platform Report - ${reportDate}</title>
          <style>
            @page { size: letter; margin: 15mm; }
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 24px; background: #fff; line-height: 1.5; }
            .header-bar { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2a5298; padding-bottom: 16px; margin-bottom: 24px; }
            .brand { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; color: #1e293b; }
            .brand span { color: #0284c7; }
            .meta { text-align: right; font-size: 12px; color: #64748b; }
            .meta-item { margin-bottom: 2px; }
            .meta-bold { font-weight: 700; color: #0f172a; }
            .title-area { margin-bottom: 20px; }
            .title-area h1 { margin: 0 0 4px 0; font-size: 20px; font-weight: 800; color: #0f172a; }
            .title-area p { margin: 0; font-size: 13px; color: #64748b; }
            .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
            .kpi-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; }
            .kpi-value { font-size: 24px; font-weight: 800; color: #1e293b; }
            .kpi-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-top: 4px; letter-spacing: 0.5px; }
            .section-title { font-size: 15px; font-weight: 800; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin: 24px 0 12px 0; display: flex; justify-content: space-between; align-items: center; }
            .summary-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
            .summary-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
            .progress-item { margin-bottom: 12px; }
            .progress-header { display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; margin-bottom: 4px; }
            .progress-bar { width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
            .progress-fill { height: 100%; border-radius: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
            th { background: #f8fafc; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; padding: 10px 12px; border: 1px solid #e2e8f0; text-align: left; }
            td { padding: 9px 12px; border: 1px solid #e2e8f0; color: #334155; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; text-transform: capitalize; }
            .badge-completed { background: #ecfdf5; color: #047857; }
            .badge-pending { background: #fffbeb; color: #b45309; }
            .badge-canceled { background: #fef2f2; color: #b91c1c; }
            .footer { margin-top: 36px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; }
            .print-btn-bar { margin-bottom: 20px; display: flex; gap: 10px; justify-content: flex-end; }
            .print-btn { background: #2a5298; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 13px; }
            @media print {
              body { padding: 0; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="print-btn-bar no-print">
            <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
            <button class="print-btn" style="background: #64748b;" onclick="window.close()">Close Window</button>
          </div>

          <div class="header-bar">
            <div>
              <div class="brand">Auto<span>Book</span></div>
              <div style="font-size: 12px; color: #64748b; font-weight: 600; margin-top: 2px;">Automotive Service Booking Platform</div>
            </div>
            <div class="meta">
              <div class="meta-item"><span class="meta-bold">Report Type:</span> Executive Platform Analytics</div>
              <div class="meta-item"><span class="meta-bold">Generated On:</span> ${reportDate} ${reportTime}</div>
              <div class="meta-item"><span class="meta-bold">Generated By:</span> ${adminName}</div>
            </div>
          </div>

          <div class="title-area">
            <h1>Platform Performance & Analytics Summary</h1>
            <p>Official summary of platform health, booking statuses, service trends, and registered autoshops.</p>
          </div>

          <div class="kpi-grid">
            <div class="kpi-box">
              <div class="kpi-value">${totalUsers}</div>
              <div class="kpi-label">Total Users</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-value">${totalOwners}</div>
              <div class="kpi-label">Active Auto Shops</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-value">${totalBookings}</div>
              <div class="kpi-label">Total Bookings</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-value">${completedBookings}</div>
              <div class="kpi-label">Completed Services</div>
            </div>
          </div>

          <div class="summary-cards">
            <div class="summary-card">
              <div style="font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 12px;">Booking Status Breakdown</div>
              <div class="progress-item">
                <div class="progress-header">
                  <span>Completed / Paid</span>
                  <span>${completedBookings} (${fulfillmentPercent}%)</span>
                </div>
                <div class="progress-bar"><div class="progress-fill" style="width: ${fulfillmentPercent}%; background: #10b981;"></div></div>
              </div>
              <div class="progress-item">
                <div class="progress-header">
                  <span>Pending / Quoted</span>
                  <span>${pendingBookings} (${pendingPercent}%)</span>
                </div>
                <div class="progress-bar"><div class="progress-fill" style="width: ${pendingPercent}%; background: #f59e0b;"></div></div>
              </div>
              <div class="progress-item">
                <div class="progress-header">
                  <span>Canceled / Rejected</span>
                  <span>${canceledBookings} (${canceledPercent}%)</span>
                </div>
                <div class="progress-bar"><div class="progress-fill" style="width: ${canceledPercent}%; background: #ef4444;"></div></div>
              </div>
            </div>

            <div class="summary-card">
              <div style="font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 12px;">Yearly Service Trends (${selectedYear})</div>
              <div style="font-size: 13px; margin-bottom: 8px;"><strong>Most Demanded Service:</strong> ${overallTop}</div>
              <div style="font-size: 13px; margin-bottom: 8px;"><strong>Customer Accounts:</strong> ${totalCustomers}</div>
              <div style="font-size: 13px;"><strong>Shop Partner Accounts:</strong> ${totalOwners}</div>
            </div>
          </div>

          <div class="section-title">
            <span>Recent Bookings (Snapshot)</span>
            <span style="font-size: 11px; font-weight: 600; color: #64748b;">Showing last ${recentBookings.length} records</span>
          </div>

          <table>
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Customer</th>
                <th>Shop</th>
                <th>Service</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${recentBookings.map(b => {
                const s = (b.status || 'Pending').toLowerCase();
                const cls = (s === 'completed' || s === 'paid') ? 'badge-completed' : ((s === 'cancelled' || s === 'rejected' || s === 'canceled') ? 'badge-canceled' : 'badge-pending');
                return `
                  <tr>
                    <td><code>${(b.id || '').slice(0, 8)}...</code></td>
                    <td><strong>${b.userName || b.customerName || b.name || 'Customer'}</strong></td>
                    <td>${b.shopName || 'Shop'}</td>
                    <td>${b.serviceType || b.service || 'General Service'}</td>
                    <td>${b.date || 'N/A'}</td>
                    <td><span class="badge ${cls}">${b.status || 'Pending'}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="footer">
            <span>AutoBook Administration Management System</span>
            <span>Confidential - For Platform Administrator Use Only</span>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <RoleBasedWrapper title="System Reports">
      <div style={{ padding: "32px" }}>
        
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: "800", color: colors.textPrimary, margin: "0 0 8px 0" }}>System Analytics</h1>
            <p style={{ margin: 0, color: colors.textSecondary, fontSize: "15px" }}>Overall platform statistics, bookings tracking, and user growth.</p>
          </div>

          <button
            onClick={() => setShowExportModal(true)}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              background: colors.navy, color: "#fff",
              border: "none", borderRadius: "12px",
              padding: "12px 20px", fontSize: "14px", fontWeight: "700",
              cursor: "pointer", boxShadow: "0 4px 14px rgba(42, 82, 152, 0.2)",
              transition: "transform 0.2s, background 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
          >
            <Download size={18} />
            Download Reports
          </button>
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
                    <CustomDropdown
                      value={selectedYear}
                      onChange={val => setSelectedYear(Number(val))}
                      options={availableYears.map(y => ({ value: y, label: y }))}
                      style={{ minWidth: "90px", padding: "6px 36px 6px 12px", borderRadius: "10px", border: `1px solid ${colors.border}`, fontSize: "14px", fontWeight: "700", background: "#f8fafc" }}
                    />
                    Trends
                  </h3>
                  {overallMax > 0 && (
                    <span style={{ fontSize: "12px", background: "#fef08a", color: "#854d0e", padding: "4px 10px", borderRadius: "12px", fontWeight: "800", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <Flame size={14} /> Booming: {overallTop}
                    </span>
                  )}
                </div>
                
                <div style={{ height: "200px", marginTop: "32px", position: "relative" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
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
          </>
        )}

        {/* ── DOWNLOAD REPORTS MODAL ─────────────────────────── */}
        {showExportModal && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", padding: "20px" }}>
            <div style={{ background: "#fff", borderRadius: "24px", width: "100%", maxWidth: "660px", boxShadow: "0 20px 50px rgba(0,0,0,0.2)", overflow: "hidden", display: "flex", flexDirection: "column", animation: "modalIn 0.2s ease-out" }}>
              
              {/* MODAL HEADER */}
              <div style={{ padding: "24px 28px", borderBottom: `1px solid ${colors.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", color: colors.navy }}>
                    <Download size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: colors.textPrimary }}>Download Platform Reports</h3>
                    <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: colors.textSecondary }}>Export official analytics as PDF or Excel-ready CSV spreadsheets.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowExportModal(false)}
                  style={{ background: "#f1f5f9", border: "none", width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: colors.textSecondary, transition: "background 0.2s" }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* NOTICE BANNER */}
              {downloadNotice && (
                <div style={{ padding: "12px 28px", background: "#ecfdf5", borderBottom: "1px solid #a7f3d0", color: colors.success, fontSize: "13px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Check size={16} /> {downloadNotice}
                </div>
              )}

              {/* REPORT OPTIONS */}
              <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "14px", maxHeight: "60vh", overflowY: "auto" }}>
                
                {/* 1. EXECUTIVE SUMMARY PDF */}
                <div style={{ border: `1px solid ${colors.border}`, borderRadius: "16px", padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", background: "#f8fafc", transition: "all 0.2s" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                    <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", color: "#0284c7", flexShrink: 0 }}>
                      <FileText size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: "800", color: colors.textPrimary, display: "flex", alignItems: "center", gap: "8px" }}>
                        Executive Analytics Summary
                        <span style={{ fontSize: "10px", fontWeight: "800", background: "#e0f2fe", color: "#0369a1", padding: "2px 8px", borderRadius: "6px" }}>PDF / PRINT</span>
                      </div>
                      <div style={{ fontSize: "13px", color: colors.textSecondary, marginTop: "4px", lineHeight: "1.4" }}>
                        Print-ready executive summary featuring platform KPIs, service trends, and booking fulfillment ratios.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={exportExecutivePDF}
                    style={{ flexShrink: 0, padding: "10px 18px", borderRadius: "10px", background: colors.navy, color: "#fff", border: "none", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <FileText size={15} /> Print / PDF
                  </button>
                </div>

                {/* 2. DETAILED BOOKINGS CSV */}
                <div style={{ border: `1px solid ${colors.border}`, borderRadius: "16px", padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", background: "#f8fafc", transition: "all 0.2s" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                    <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", color: colors.success, flexShrink: 0 }}>
                      <ClipboardList size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: "800", color: colors.textPrimary, display: "flex", alignItems: "center", gap: "8px" }}>
                        All Bookings Dataset
                        <span style={{ fontSize: "10px", fontWeight: "800", background: "#ecfdf5", color: "#047857", padding: "2px 8px", borderRadius: "6px" }}>CSV / EXCEL</span>
                      </div>
                      <div style={{ fontSize: "13px", color: colors.textSecondary, marginTop: "4px", lineHeight: "1.4" }}>
                        Complete records of all {totalBookings} customer bookings with dates, shops, prices, and statuses.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={exportBookingsCSV}
                    style={{ flexShrink: 0, padding: "10px 18px", borderRadius: "10px", background: "#059669", color: "#fff", border: "none", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <Download size={15} /> CSV
                  </button>
                </div>

                {/* 3. PLATFORM METRICS CSV */}
                <div style={{ border: `1px solid ${colors.border}`, borderRadius: "16px", padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", background: "#f8fafc", transition: "all 0.2s" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                    <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "#f3e8ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#7c3aed", flexShrink: 0 }}>
                      <BarChart3 size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: "800", color: colors.textPrimary, display: "flex", alignItems: "center", gap: "8px" }}>
                        Platform Health & Monthly Trends
                        <span style={{ fontSize: "10px", fontWeight: "800", background: "#f3e8ff", color: "#6d28d9", padding: "2px 8px", borderRadius: "6px" }}>CSV / EXCEL</span>
                      </div>
                      <div style={{ fontSize: "13px", color: colors.textSecondary, marginTop: "4px", lineHeight: "1.4" }}>
                        Aggregated platform health counts and {selectedYear} monthly service demand breakdown.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={exportMetricsCSV}
                    style={{ flexShrink: 0, padding: "10px 18px", borderRadius: "10px", background: "#7c3aed", color: "#fff", border: "none", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <Download size={15} /> CSV
                  </button>
                </div>

                {/* 4. AUTO SHOPS DIRECTORY CSV */}
                <div style={{ border: `1px solid ${colors.border}`, borderRadius: "16px", padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", background: "#f8fafc", transition: "all 0.2s" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                    <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "#fffbeb", display: "flex", alignItems: "center", justifyContent: "center", color: "#d97706", flexShrink: 0 }}>
                      <Wrench size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: "800", color: colors.textPrimary, display: "flex", alignItems: "center", gap: "8px" }}>
                        Auto Shops Directory
                        <span style={{ fontSize: "10px", fontWeight: "800", background: "#fffbeb", color: "#b45309", padding: "2px 8px", borderRadius: "6px" }}>CSV / EXCEL</span>
                      </div>
                      <div style={{ fontSize: "13px", color: colors.textSecondary, marginTop: "4px", lineHeight: "1.4" }}>
                        Directory of all {totalOwners} auto shops with ratings, total reviews, and operating statuses.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={exportShopsCSV}
                    style={{ flexShrink: 0, padding: "10px 18px", borderRadius: "10px", background: "#d97706", color: "#fff", border: "none", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <Download size={15} /> CSV
                  </button>
                </div>

              </div>

              {/* MODAL FOOTER */}
              <div style={{ padding: "16px 28px", borderTop: `1px solid ${colors.border}`, background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: "12px", color: colors.textMuted }}>
                  Exports contain real-time platform data from Firebase Firestore
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  style={{ padding: "8px 20px", borderRadius: "10px", border: `1px solid ${colors.border}`, background: "#fff", color: colors.textPrimary, fontSize: "13px", fontWeight: "700", cursor: "pointer" }}
                >
                  Close
                </button>
              </div>

            </div>
          </div>
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
