import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, orderBy, query, doc, getDoc, where } from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { sh, colors, EmptyState, getInitials } from "./dashboardShared";
import SkeletonLoader from "./SkeletonLoader";
import TopbarAvatar from "./TopbarAvatar";
import BackButton from "../components/BackButton";

function formatDate(createdAt) {
  if (!createdAt) return "—";
  try {
    const d = createdAt?.seconds
      ? new Date(createdAt.seconds * 1000)
      : new Date(createdAt);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  } catch { return "—"; }
}

function formatTime(createdAt) {
  if (!createdAt) return "";
  try {
    const d = createdAt?.seconds
      ? new Date(createdAt.seconds * 1000)
      : new Date(createdAt);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

function getDateKey(createdAt) {
  if (!createdAt) return "unknown";
  try {
    const d = createdAt?.seconds
      ? new Date(createdAt.seconds * 1000)
      : new Date(createdAt);
    if (isNaN(d.getTime())) return "unknown";
    return d.toISOString().slice(0, 10);
  } catch { return "unknown"; }
}

export default function AdminCarParts() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [mechanics, setMechanics] = useState([]);
  const [search, setSearch] = useState("");

  const fetchParts = useCallback(async (shopId, isAdmin = false) => {
    setLoading(true);
    try {
      const q = isAdmin ? query(collection(db, "carParts"), orderBy("createdAt", "desc")) : query(collection(db, "carParts"), where("shopId", "==", shopId || "invalid"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setParts(list);
      const mechMap = {};
      list.forEach((p) => {
        if (p.mechanicId && !mechMap[p.mechanicId]) {
          mechMap[p.mechanicId] = p.mechanicName || "Mechanic";
        }
      });
      setMechanics(Object.entries(mechMap).map(([id, name]) => ({ id, name })));
    } catch (e) {
      try {
        const q2 = isAdmin ? collection(db, "carParts") : query(collection(db, "carParts"), where("shopId", "==", shopId || "invalid"));
        const snap2 = await getDocs(q2);
        const list2 = snap2.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setParts(list2);
        const mechMap2 = {};
        list2.forEach((p) => {
          if (p.mechanicId && !mechMap2[p.mechanicId]) {
            mechMap2[p.mechanicId] = p.mechanicName || "Mechanic";
          }
        });
        setMechanics(Object.entries(mechMap2).map(([id, name]) => ({ id, name })));
      } catch (e2) { setParts([]); }
    }
    setLoading(false);
  }, []);

  // Fetch logged-in admin profile
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        const userObj = snap.exists() ? { id: snap.id, ...snap.data() } : { id: firebaseUser.uid };
        setCurrentUser(userObj);
        
        const isAdmin = (userObj?.role || "").toLowerCase() === "admin";
        let shopId = userObj?.shopId;
        if (!isAdmin && userObj?.shopName) {
          const sName = userObj.shopName.toUpperCase();
          if (sName.includes("JME")) shopId = "JME";
          else if (sName.includes("GRHE")) shopId = "GRHE";
        }
        if (!isAdmin && userObj?.id) {
          try {
            const sQuery = query(collection(db, "shops"), where("ownerId", "==", userObj.id));
            const sSnap = await getDocs(sQuery);
            if (!sSnap.empty) {
              if (!shopId) shopId = sSnap.docs[0].id;
              for (const docSnap of sSnap.docs) {
                const fetchedName = (docSnap.data().name || "").toUpperCase();
                if (fetchedName.includes("JME")) { shopId = "JME"; break; }
                if (fetchedName.includes("GRHE")) { shopId = "GRHE"; break; }
              }
            }
          } catch(e) {}
        }
        await fetchParts(shopId, isAdmin);
      } else {
        navigate("/login");
      }
    });
    return () => unsub();
  }, [navigate, fetchParts]);

  const todayStr = new Date().toISOString().slice(0, 10);

  const filtered = parts.filter((p) => {
    if (filter === "today" && getDateKey(p.createdAt) !== todayStr) return false;
    if (filter !== "all" && filter !== "today" && p.mechanicId !== filter) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      return (
        String(p.partName || "").toLowerCase().includes(s) ||
        String(p.mechanicName || "").toLowerCase().includes(s) ||
        String(p.notes || "").toLowerCase().includes(s)
      );
    }
    return true;
  });

  const grouped = filtered.reduce((acc, p) => {
    const key = getDateKey(p.createdAt);
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});
  const groupKeys = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1));

  const pillStyle = (active) => ({
    padding: "6px 14px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
    border: active ? "none" : `1px solid ${colors.border}`,
    background: active
      ? `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`
      : colors.white,
    color: active ? "#fff" : colors.textSecondary,
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
    flexShrink: 0,
    boxShadow: active ? "0 2px 8px rgba(26,58,92,0.25)" : "none",
  });

  return (
    <div style={sh.page}>

      {/* TOPBAR */}
      <div style={sh.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <BackButton />
          <div style={sh.topbarLogo}>Auto<span style={sh.topbarAccent}>Book</span></div>
        </div>

        {/* Profile — same as AdminUsers */}
        <div style={sh.topbarRight}>
          <div style={sh.topbarMeta}>
            <div style={sh.topbarName}>{currentUser?.displayName || "Owner"}</div>
            <div>{currentUser?.role || "Owner"}</div>
          </div>
          <TopbarAvatar onClick={() => navigate("/profile")} />
        </div>
      </div>

      {/* HERO — same gradient as AdminUsers */}
      <div style={sh.hero}>
        <div style={sh.rolePill}>
          <div style={sh.roleDot} />
          <span style={sh.roleText}>Car Parts</span>
        </div>
        <div style={sh.heroGreeting}>Car Parts Orders</div>
        <div style={sh.heroSub}>Track all parts ordered by mechanics.</div>

        {/* Summary stats inside hero */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "1rem" }}>
          {[
            { label: "Total orders", value: parts.length, sub: "All time" },
            { label: "Today's orders", value: parts.filter((p) => getDateKey(p.createdAt) === todayStr).length, sub: "Today" },
          ].map((s, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.12)", borderRadius: "12px", padding: "10px", textAlign: "center", border: "0.5px solid rgba(255,255,255,0.15)" }}>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "#fff", lineHeight: 1.2 }}>{s.value}</div>
              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.7)", fontWeight: "600", marginTop: "2px" }}>{s.label}</div>
              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.45)", marginTop: "1px" }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={sh.content}>

        {/* SEARCH */}
        <div style={{ position: "relative", marginBottom: "0.75rem" }}>
          <svg style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", width: "18px", height: "18px", color: colors.textMuted, pointerEvents: "none" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            placeholder="Search parts, mechanic, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "12px 40px",
              borderRadius: "24px", border: `1px solid transparent`,
              fontSize: "13px", backgroundColor: "#f1f5f9",
              color: colors.textPrimary, fontFamily: "inherit",
              boxSizing: "border-box", outline: "none",
              transition: "all 0.2s ease",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)"
            }}
            onFocus={(e) => { e.target.style.border = `1px solid ${colors.blue}`; e.target.style.backgroundColor = colors.white; e.target.style.boxShadow = "0 4px 12px rgba(42,82,152,0.1)"; }}
            onBlur={(e) => { e.target.style.border = `1px solid transparent`; e.target.style.backgroundColor = "#f1f5f9"; e.target.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.02)"; }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "#e2e8f0", border: "none", borderRadius: "50%", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#475569" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        {/* FILTER PILLS */}
        <div style={sh.sectionLabel}>Filter</div>
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px", marginBottom: "1rem" }}>
          <button style={pillStyle(filter === "all")} onClick={() => setFilter("all")}>All</button>
          <button style={pillStyle(filter === "today")} onClick={() => setFilter("today")}>
            Today {parts.filter((p) => getDateKey(p.createdAt) === todayStr).length > 0
              ? `(${parts.filter((p) => getDateKey(p.createdAt) === todayStr).length})`
              : ""}
          </button>
          {mechanics.map((m) => (
            <button key={m.id} style={pillStyle(filter === m.id)} onClick={() => setFilter(m.id)}>
              {String(m.name || "Mechanic").split(" ")[0]}
            </button>
          ))}
        </div>

        {/* FILTERED TOTAL */}
        {filtered.length > 0 && (
          <div style={{
            background: colors.infoBg, border: `1px solid ${colors.info}`,
            borderRadius: "12px", padding: "10px 14px", marginBottom: "1rem",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: "12px", fontWeight: "600", color: colors.info }}>
              {filtered.length} order{filtered.length !== 1 ? "s" : ""} shown
            </span>
          </div>
        )}

        {/* CONTENT */}
        {loading ? (
          <SkeletonLoader count={3} type="card" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="🔩"
            title="No parts found"
            subtitle={search ? "Try a different search term." : "No car parts have been ordered yet."}
          />
        ) : (
          groupKeys.map((dateKey) => {
            const groupParts = grouped[dateKey];
            const isToday = dateKey === todayStr;

            const labelDate = (() => {
              if (dateKey === "unknown") return "Unknown date";
              try {
                const d = new Date(dateKey + "T00:00:00");
                if (isNaN(d.getTime())) return dateKey;
                if (isToday) return "Today";
                return d.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
              } catch { return dateKey; }
            })();

            return (
              <div key={dateKey} style={{ marginBottom: "1.25rem" }}>
                {/* Date group header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{
                      fontSize: "11px", fontWeight: "700",
                      color: isToday ? colors.info : colors.textMuted,
                      textTransform: "uppercase", letterSpacing: "0.6px",
                    }}>
                      {labelDate}
                    </span>
                    {isToday && (
                      <span style={{ background: colors.infoBg, color: colors.info, fontSize: "10px", fontWeight: "700", borderRadius: "8px", padding: "2px 7px" }}>
                        LIVE
                      </span>
                    )}
                  </div>
                </div>

                <div style={sh.card}>
                  {groupParts.map((p, i) => {
                    return (
                      <div
                        key={p.id}
                        style={{
                          display: "flex", alignItems: "flex-start", gap: "12px",
                          padding: "12px 0",
                          borderBottom: i < groupParts.length - 1 ? `1px solid ${colors.border}` : "none",
                        }}
                      >
                        <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: colors.warningBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
                          🔩
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "13px", fontWeight: "700", color: colors.textPrimary }}>
                            {p.partName || "Unknown Part"}
                          </div>
                          <div style={{ fontSize: "11px", color: colors.textSecondary, marginTop: "2px" }}>
                            Qty: {p.quantity || 1}
                          </div>
                          {p.notes && (
                            <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "2px", fontStyle: "italic" }}>
                              "{p.notes}"
                            </div>
                          )}
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
                            <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: colors.infoBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: "700", color: colors.info, flexShrink: 0 }}>
                              {getInitials(p.mechanicName || "M")}
                            </div>
                            <span style={{ fontSize: "11px", color: colors.textSecondary, fontWeight: "600" }}>
                              {p.mechanicName || "Unknown Mechanic"}
                            </span>
                            <span style={{ fontSize: "10px", color: colors.textMuted }}>
                              · {formatTime(p.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}