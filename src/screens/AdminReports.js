import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { sh, colors, getInitials, EmptyState } from "./dashboardShared";
import SkeletonLoader from "./SkeletonLoader";
import TopbarAvatar from "./TopbarAvatar";
import BackButton from "../components/BackButton";

// ─── Helpers ────────────────────────────────────────────────────────────────

function toDate(val) {
  if (!val) return null;
  if (val?.seconds) return new Date(val.seconds * 1000);
  if (typeof val === "string") {
    const parts = val.split("-");
    if (parts.length === 3) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return new Date(val);
  }
  if (val instanceof Date) return val;
  return null;
}

function parsePrice(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const match = String(val).replace(/,/g, '').match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function isSameDay(date, target) {
  if (!date || isNaN(date.getTime())) return false;
  return (
    date.getFullYear() === target.getFullYear() &&
    date.getMonth()    === target.getMonth()    &&
    date.getDate()     === target.getDate()
  );
}

function isSameMonth(date, target) {
  if (!date || isNaN(date.getTime())) return false;
  return (
    date.getFullYear() === target.getFullYear() &&
    date.getMonth()    === target.getMonth()
  );
}

function formatDate(d) {
  return d.toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminReports() {
  const navigate = useNavigate();

  // ✅ FIX 1: Fetch logged-in admin's own Firestore data
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        const userObj = snap.exists() ? { id: snap.id, ...snap.data() } : { id: firebaseUser.uid };
        setCurrentUser(userObj);
        await fetchAll(userObj);
      } else {
        navigate("/login");
      }
    });
    return () => unsub();
  }, [navigate]);

  const [bookings,  setBookings]  = useState([]);
  const [carParts,  setCarParts]  = useState([]);
  const [loading,   setLoading]   = useState(true);

  const now = new Date();
  const [selMonth, setSelMonth] = useState(now.getMonth());
  const [selYear,  setSelYear]  = useState(now.getFullYear());
  const [selDay, setSelDay] = useState(now.toISOString().slice(0, 10));
  const [excludeCancelled, setExcludeCancelled] = useState(true);

    const fetchAll = async (userObj) => {
      setLoading(true);
      const isAdmin = (userObj?.role || "").toLowerCase() === "admin";
      
      let shopId = userObj?.shopId;
      if (!isAdmin && userObj?.shopName) {
        const sName = userObj.shopName.toUpperCase();
        if (sName.includes("JME")) shopId = "JME";
        else if (sName.includes("GRHE")) shopId = "GRHE";
      }
      if (!shopId && !isAdmin && userObj?.id) {
        try {
          const sQuery = query(collection(db, "shops"), where("ownerId", "==", userObj.id));
          const sSnap = await getDocs(sQuery);
          if (!sSnap.empty) {
            shopId = sSnap.docs[0].id;
            const fetchedName = (sSnap.docs[0].data().name || "").toUpperCase();
            if (fetchedName.includes("JME")) shopId = "JME";
            else if (fetchedName.includes("GRHE")) shopId = "GRHE";
          }
        } catch(e) {}
      }
      if (!shopId && !isAdmin && userObj?.shopName) {
        const sName = userObj.shopName.toUpperCase();
        if (sName.includes("JME")) shopId = "JME";
        else if (sName.includes("GRHE")) shopId = "GRHE";
        else shopId = userObj.shopName;
      }

      const bQuery = isAdmin ? collection(db, "bookings") : query(collection(db, "bookings"), where("shopId", "==", shopId || "invalid"));
      const cpQuery = isAdmin ? collection(db, "carParts") : query(collection(db, "carParts"), where("shopId", "==", shopId || "invalid"));
      const [bSnap, pSnap] = await Promise.all([
        getDocs(bQuery),
        getDocs(cpQuery),
      ]);
      let bList = bSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      if (shopId && userObj?.shopName && !isAdmin) {
        try {
          const bSnapName = await getDocs(query(collection(db, "bookings"), where("shopName", "==", userObj.shopName)));
          bList = [...bList, ...bSnapName.docs.map((d) => ({ id: d.id, ...d.data() }))];
          bList = Array.from(new Map(bList.map(b => [b.id, b])).values());
        } catch(e) {}
      }

      setBookings(bList);
      setCarParts(pSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };

  const monthTarget = new Date(selYear, selMonth, 1);

  const monthlyBookings = bookings.filter((b) =>
  isSameMonth(toDate(b.date || b.createdAt), monthTarget) &&
  (b.status || "").toLowerCase() === "completed"
);
  const monthlyParts = carParts.filter((p) =>
    isSameMonth(toDate(p.date || p.createdAt), monthTarget)
  );

  const eodTarget = (() => {
    const [y, m, d] = selDay.split("-").map(Number);
    return new Date(y, m - 1, d);
  })();

  const eodBookings = bookings.filter((b) =>
  isSameDay(toDate(b.date || b.createdAt), eodTarget) &&
  (b.status || "").toLowerCase() === "completed"
);
  const eodParts = carParts.filter((p) =>
    isSameDay(toDate(p.date || p.createdAt), eodTarget)
  );

  const monthlyRevenue = monthlyBookings.reduce((sum, b) => sum + parsePrice(b.price), 0) + 
                         monthlyParts.reduce((sum, p) => sum + (parsePrice(p.price) * (Number(p.quantity) || 1)), 0);
  const eodRevenue = eodBookings.reduce((sum, b) => sum + parsePrice(b.price), 0) + 
                     eodParts.reduce((sum, p) => sum + (parsePrice(p.price) * (Number(p.quantity) || 1)), 0);

  const barData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const bTotal = bookings
      .filter((b) => {
        if (!isSameMonth(toDate(b.date || b.createdAt), d)) return false;
        if (excludeCancelled && (b.status || "").toLowerCase() === "cancelled") return false;
        return true;
      }).length;
    const pTotal = carParts
      .filter((p) => isSameMonth(toDate(p.date || p.createdAt), d)).length;
    return { label: MONTHS[d.getMonth()], value: bTotal + pTotal };
  });
  const barMax = Math.max(...barData.map((b) => b.value), 1);

  const servicesBreakdown = {};
  monthlyBookings.forEach(b => {
    const sType = b.serviceType || "Other";
    servicesBreakdown[sType] = (servicesBreakdown[sType] || 0) + 1;
  });
  
  let topServices = Object.entries(servicesBreakdown)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
    
  if (topServices.length > 5) {
    const othersCount = topServices.slice(4).reduce((sum, s) => sum + s.count, 0);
    topServices = [
      ...topServices.slice(0, 4),
      { name: "Others", count: othersCount }
    ];
  }

  const PIE_COLORS = [colors.navy, colors.blue, colors.info, colors.success, colors.warning, colors.orange, colors.danger];
  let currentPct = 0;
  const gradientStops = monthlyBookings.length > 0 ? topServices.map((ts, i) => {
    const pct = (ts.count / monthlyBookings.length) * 50;
    const start = currentPct;
    const end = currentPct + pct;
    currentPct = end;
    return `${PIE_COLORS[i % PIE_COLORS.length]} ${start}% ${end}%`;
  }).join(", ") : "";
  const fullGradient = monthlyBookings.length > 0 ? `conic-gradient(from 270deg, ${gradientStops}, transparent 50%)` : `conic-gradient(from 270deg, ${colors.border} 0% 50%, transparent 50%)`;

  const inputStyle = {
    padding: "14px 16px", borderRadius: "14px",
    border: `1.5px solid ${colors.border}`, fontSize: "14px", fontWeight: "600",
    background: colors.white, color: colors.textPrimary,
    fontFamily: "inherit", outline: "none",
    boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
  };

  const keyframes = `
  @property --fill-angle {
    syntax: "<angle>";
    inherits: false;
    initial-value: 0deg;
  }
  @keyframes gauge-fill {
    from { --fill-angle: 0deg; }
    to { --fill-angle: 180deg; }
  }
  .gauge-chart-mask {
    position: absolute; inset: -1px; border-radius: 50%;
    background: conic-gradient(from 270deg, transparent 0deg, transparent var(--fill-angle, 180deg), var(--card-bg, #ffffff) var(--fill-angle, 180deg), var(--card-bg, #ffffff) 180deg, transparent 180deg);
    animation: gauge-fill 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .gauge-needle {
    position: absolute; bottom: 0; left: 50%; width: 4px; height: 50%;
    background: #111827; border-radius: 4px 4px 0 0;
    transform-origin: bottom center;
    transform: translateX(-50%) rotate(calc(var(--fill-angle, 180deg) - 90deg));
    animation: gauge-fill 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    z-index: 2;
  }
  .gauge-needle::after {
    content: ""; position: absolute; bottom: -4px; left: -4px; width: 12px; height: 12px;
    background: #111827; border-radius: 50%;
  }
  `;

  return (
    <div style={sh.page}>
      <style>{keyframes}</style>

      {/* TOPBAR */}
      <div style={sh.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <BackButton />
          <div style={sh.topbarLogo}>Auto<span style={sh.topbarAccent}>Book</span></div>
        </div>
        <div style={sh.topbarRight}>
          <div style={sh.topbarMeta}>
            {/* ✅ FIX 1: Real admin name */}
            <div style={sh.topbarName}>{currentUser?.displayName || "Admin"}</div>
            <div>{currentUser?.role || "Admin"}</div>
          </div>
          <TopbarAvatar onClick={() => navigate("/profile")} />
        </div>
      </div>

      {/* HERO */}
      <div style={sh.hero}>
        <div style={sh.rolePill}>
          <div style={sh.roleDot} />
          <span style={sh.roleText}>Reports</span>
        </div>
        <div style={sh.heroGreeting}>Analytics & Reports</div>
        <div style={sh.heroSub}>Monthly insights and end-of-day summaries.</div>
      </div>

      <div style={sh.content}>

        {loading ? (
          <SkeletonLoader count={3} type="card" />
        ) : (
          <>
            <div style={sh.sectionLabel}>📊 Monthly Analytics</div>

            <div style={{ display: "flex", gap: "10px", marginBottom: "1.5rem", alignItems: "center" }}>
              <select value={selMonth} onChange={(e) => setSelMonth(Number(e.target.value))} style={{...inputStyle, flex: 1}}>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              <select value={selYear} onChange={(e) => setSelYear(Number(e.target.value))} style={{...inputStyle, flex: 1}}>
                {[now.getFullYear() - 1, now.getFullYear()].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px", marginBottom: "1.5rem" }}>
              <div style={{ ...sh.card, display: "flex", alignItems: "center", gap: "20px", marginBottom: 0 }}>
                <div style={{
                  width: "140px", height: "70px", flexShrink: 0, position: "relative", overflow: "hidden",
                  display: "flex", alignItems: "flex-end", justifyContent: "center"
                }}>
                  <div style={{
                    position: "absolute", top: 0, left: 0, width: "140px", height: "140px", borderRadius: "50%",
                    background: fullGradient,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                  }} />
                  {monthlyBookings.length > 0 && <div className="gauge-chart-mask" style={{ "--card-bg": colors.white }} />}
                  <div className="gauge-needle" />
                  <div style={{
                    width: "90px", height: "45px", background: colors.white, borderRadius: "45px 45px 0 0",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
                    paddingBottom: "6px", position: "relative", zIndex: 3, boxShadow: "inset 0 4px 8px rgba(0,0,0,0.05)"
                  }}>
                    <span style={{ fontSize: "24px", fontWeight: "800", color: colors.textPrimary, lineHeight: 1 }}>{monthlyBookings.length}</span>
                    <span style={{ fontSize: "9px", color: colors.textSecondary, fontWeight: "700", marginTop: "2px" }}>SERVICES</span>
                  </div>
                </div>

                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                  {topServices.length > 0 ? topServices.map((ts, i) => (
                    <div key={ts.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                        <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }}></div>
                        <span style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={ts.name}>{ts.name}</span>
                      </div>
                      <span style={{ fontSize: "13px", fontWeight: "800", color: colors.textPrimary, paddingLeft: "8px" }}>{ts.count}</span>
                    </div>
                  )) : (
                    <div style={{ fontSize: "12px", color: colors.textMuted }}>No services completed.</div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px", marginBottom: "1.5rem" }}>
              {[
                { label: "Total Bookings", value: monthlyBookings.length, icon: "📅", color: colors.navy },
                { label: "Est. Revenue", value: `₱${monthlyRevenue.toLocaleString("en-PH")}`, icon: "💰", color: colors.success },
                { label: "Parts Ordered", value: monthlyParts.length, icon: "🔩", color: colors.warning },
              ].map((stat, i) => (
                <div key={i} style={{ borderRadius: "20px", padding: "16px", border: `1px solid ${colors.border}`, background: colors.white, boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                    <div style={{ fontSize: "20px" }}>{stat.icon}</div>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: colors.textSecondary }}>{stat.label}</div>
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: "800", color: stat.color }}>{stat.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.65rem" }}>
              <div style={{ ...sh.sectionLabel, marginBottom: 0 }}>Activity trend (last 6 months)</div>
              <label style={{ fontSize: "12px", color: colors.textSecondary, display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontWeight: "600" }}>
                <input type="checkbox" checked={excludeCancelled} onChange={(e) => setExcludeCancelled(e.target.checked)} style={{ cursor: "pointer", margin: 0 }} />
                Exclude Cancelled
              </label>
            </div>
            <div style={{ ...sh.card, marginBottom: "1.5rem", borderRadius: "24px", padding: "24px 20px" }}>
              <div style={{ position: "relative", height: "180px", display: "flex", alignItems: "flex-end", gap: "12px", paddingBottom: "1px" }}>
                {/* Horizontal guide lines */}
                <div style={{ position: "absolute", top: "20px", left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", pointerEvents: "none", zIndex: 0 }}>
                  {[1, 0.75, 0.5, 0.25, 0].map((tier, i) => (
                    <div key={tier} style={{ width: "100%", height: "1px", background: i === 4 ? colors.border : colors.bg, position: "relative" }}>
                      {tier === 1 && barMax > 1 && <span style={{ position: "absolute", top: "-8px", left: 0, fontSize: "10px", color: colors.textMuted, fontWeight: "700" }}>{barMax}</span>}
                    </div>
                  ))}
                </div>

                {/* Bars */}
                {barData.map((bar) => {
                  const heightPct = barMax > 0 ? (bar.value / barMax) * 100 : 0;
                  return (
                    <div key={bar.label} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", zIndex: 1, position: "relative" }}>
                      <div
                        style={{
                          width: "100%",
                          maxWidth: "36px",
                          height: `calc(${heightPct}% - 20px)`,
                          minHeight: bar.value > 0 ? "4px" : "0",
                          borderRadius: "6px 6px 0 0",
                          background: bar.value > 0
                            ? `linear-gradient(180deg, ${colors.blue} 0%, rgba(42,82,152,0.4) 100%)`
                            : "transparent",
                          transition: "height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                          boxShadow: bar.value > 0 ? "0 4px 12px rgba(42,82,152,0.15)" : "none",
                          position: "relative"
                        }}
                      >
                        <div style={{ position: "absolute", top: "-20px", left: "50%", transform: "translateX(-50%)", fontSize: "12px", color: bar.value > 0 ? colors.navy : "transparent", fontWeight: "800", transition: "all 0.3s ease" }}>
                          {bar.value > 0 ? bar.value : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                {barData.map((bar) => (
                  <div key={bar.label} style={{ flex: 1, textAlign: "center", fontSize: "11px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {bar.label}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...sh.sectionLabel, marginBottom: "1.5rem" }}>
              <span style={{ background: colors.warningBg, color: colors.warning, padding: "6px 12px", borderRadius: "8px" }}>
                🗓 End of Day Report
              </span>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <input
                type="date"
                value={selDay}
                onChange={(e) => setSelDay(e.target.value)}
                style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
              />
            </div>

            <div style={{
              ...sh.card,
              background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`,
              border: "none",
              borderRadius: "20px",
              padding: "24px",
              marginBottom: "1.5rem",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
                    Summary for {formatDate(eodTarget)}
                  </div>
                  <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.9)", fontWeight: "500" }}>
                    {eodBookings.length} service{eodBookings.length !== 1 ? "s" : ""} · {eodParts.length} part order{eodParts.length !== 1 ? "s" : ""}
                    {eodRevenue > 0 && ` · ₱${eodRevenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`}
                  </div>
                </div>
              </div>
            </div>

            <div style={sh.sectionLabel}>Car services</div>
            <div style={{ ...sh.card, marginBottom: "1.5rem", padding: 0, overflow: "hidden", borderRadius: "20px" }}>
              {eodBookings.length === 0 ? (
                <EmptyState
                  icon="📅"
                  title="No bookings recorded"
                  subtitle="No bookings were completed on this day."
                />
              ) : (
                <>
                  {eodBookings.map((b, i) => (
                    <div
                      key={b.id}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "16px", background: colors.white,
                        borderBottom: i < eodBookings.length - 1 ? `1px solid ${colors.bg}` : "none",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                        <div style={{ ...sh.rowIcon(colors.infoBg), fontSize: "16px" }}>🔧</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "14px", fontWeight: "800", color: colors.textPrimary, marginBottom: "2px" }}>
                            {b.serviceType || b.service || "Service"}
                          </div>
                          <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "500" }}>
                            {b.customerName || "Customer"}
                            {b.mechanicName ? ` · ${b.mechanicName}` : ""}
                          </div>
                        </div>
                      </div>
                      {b.price !== undefined && parsePrice(b.price) > 0 && (
                        <div style={{ fontSize: "14px", fontWeight: "800", color: colors.navy, marginLeft: "12px" }}>
                          ₱{parsePrice(b.price).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>

            <div style={sh.sectionLabel}>Car parts ordered</div>
            <div style={{ ...sh.card, marginBottom: "1.5rem", padding: 0, overflow: "hidden", borderRadius: "20px" }}>
              {eodParts.length === 0 ? (
                <EmptyState
                  icon="🔩"
                  title="No parts ordered"
                  subtitle="No car parts were ordered on this day."
                />
              ) : (
                <>
                  {eodParts.map((p, i) => (
                    <div
                      key={p.id}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "16px", background: colors.white,
                        borderBottom: i < eodParts.length - 1 ? `1px solid ${colors.bg}` : "none",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                        <div style={{ ...sh.rowIcon(colors.warningBg), fontSize: "16px" }}>🔩</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "14px", fontWeight: "800", color: colors.textPrimary, marginBottom: "2px" }}>
                            {p.partName || p.name || "Part"}
                          </div>
                          <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "500" }}>
                            Qty: {p.quantity || 1}
                          </div>
                        </div>
                      </div>
                      {p.price !== undefined && parsePrice(p.price) > 0 && (
                        <div style={{ fontSize: "14px", fontWeight: "800", color: colors.navy, marginLeft: "12px" }}>
                          ₱{(parsePrice(p.price) * (Number(p.quantity) || 1)).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </div>

    </div>
  );
}