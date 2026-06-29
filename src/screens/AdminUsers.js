import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { collection, getDocs, updateDoc, doc, getDoc, query, where, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { sh, colors, getInitials, EmptyState } from "./dashboardShared";
import CarLoader from "./CarLoader";
import TopbarAvatar from "./TopbarAvatar";

const FILTER_TABS = ["pending", "approved", "rejected"];

const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : str;

const roleStyle = (r) => {
  if ((r || "").toLowerCase() === "admin")
    return sh.badge(colors.dangerBg, colors.danger);
  return sh.badge(colors.infoBg, colors.info);
};

const statusStyle = (s) => {
  if (s === "approved") return sh.badge(colors.successBg, colors.success);
  if (s === "rejected") return sh.badge(colors.dangerBg, colors.danger);
  return sh.badge(colors.warningBg, colors.warning);
};

function isNew(timestamp) {
  if (!timestamp) return false;
  let ts;
  if (timestamp.toDate) ts = timestamp.toDate().getTime();
  else if (timestamp.seconds) ts = timestamp.seconds * 1000;
  else if (typeof timestamp === 'number') ts = timestamp;
  else ts = new Date(timestamp).getTime();
  const diff = Date.now() - ts;
  return diff < 24 * 60 * 60 * 1000; // Less than 24 hours
}

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
    position: absolute; top: -1px; left: -1px; width: calc(100% + 2px); height: calc(200% + 2px); border-radius: 50%;
    background: conic-gradient(from 270deg, transparent 0deg, transparent var(--fill-angle, 180deg), var(--card-bg, #ffffff) var(--fill-angle, 180deg), var(--card-bg, #ffffff) 180deg, transparent 180deg);
    animation: gauge-fill 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .gauge-needle {
    position: absolute; bottom: 0; left: 50%; width: 4px; height: calc(100% - 12px);
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

export default function AdminUsers() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        const userObj = snap.exists() ? { id: snap.id, ...snap.data() } : { id: firebaseUser.uid };
        setCurrentUser(userObj);
        await fetchUsers(userObj.shopId);
      } else {
        navigate("/login");
      }
    });
    return () => unsub();
  }, [navigate]);

  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [selectedUserVehicles, setSelectedUserVehicles] = useState([]);
  const [selectedUserShop, setSelectedUserShop] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchUsers = async (shopId) => {
    setLoading(true);
    const uQuery = shopId ? query(collection(db, "users"), where("shopId", "==", shopId)) : collection(db, "users");
    const snap = await getDocs(uQuery);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    setUsers(list);
    setLoading(false);
  };

  useEffect(() => {
    const fetchDetails = async () => {
        if (!selected) {
            setSelectedUserVehicles([]);
            setSelectedUserShop(null);
            return;
        }

        setLoadingDetails(true);

        if ((selected.role || "").toLowerCase() === "customer") {
            try {
                const vSnap = await getDocs(query(collection(db, "vehicles"), where("ownerId", "==", selected.id)));
                setSelectedUserVehicles(vSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) {
                console.error("Failed to fetch user vehicles:", e);
                setSelectedUserVehicles([]);
            }
        } else {
            setSelectedUserVehicles([]);
        }

        if ((selected.role || "").toLowerCase() === "owner" && selected.shopId) {
            try {
                const sSnap = await getDoc(doc(db, "shops", selected.shopId));
                if (sSnap.exists()) {
                    setSelectedUserShop({ id: sSnap.id, ...sSnap.data() });
                } else {
                    setSelectedUserShop(null);
                }
            } catch (e) {
                console.error("Failed to fetch user shop:", e);
                setSelectedUserShop(null);
            }
        } else {
            setSelectedUserShop(null);
        }
        setLoadingDetails(false);
    };

    fetchDetails();
  }, [selected]);

  const updateStatus = async (id, status) => {
    setSaving(true);
    
    const updates = { status };

    // Automatically create a shop profile for owners who are just getting approved
    if (status === "approved" && selected && (selected.role || "").toLowerCase() === "owner" && !selected.shopId) {
      try {
        const shopData = {
          name: selected.shopName || "Auto Shop",
          shortName: (selected.shopName || "Shop").split(" ")[0],
          ownerId: selected.id,
          rating: 0,
          reviews: 0,
          icon: "🏪",
          tagline: "Quality auto services",
          bg: colors.infoBg,
          accent: colors.info,
          createdAt: serverTimestamp()
        };

        let customId = null;
        const sName = (selected.shopName || "").toUpperCase();
        if (sName.includes("JME")) customId = "JME";
        else if (sName.includes("GRHE")) customId = "GRHE";

        if (customId) {
          const { setDoc } = await import("firebase/firestore");
          await setDoc(doc(db, "shops", customId), shopData);
          updates.shopId = customId;
        } else {
          const shopRef = await addDoc(collection(db, "shops"), shopData);
          updates.shopId = shopRef.id;
        }
      } catch (err) {
        console.error("Failed to create shop:", err);
      }
    }

    await updateDoc(doc(db, "users", id), updates);
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updates } : u))
    );
    if (selected?.id === id) setSelected((prev) => ({ ...prev, ...updates }));
    setSaving(false);
  };

  const handleDeleteUser = (u) => {
    setUserToDelete(u);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, "users", userToDelete.id));
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setSelected(null);
    } catch (e) {
      console.error("Failed to delete user:", e);
    }
    setSaving(false);
    setUserToDelete(null);
  };

  const filteredUsers = users.filter(
    (u) => (u.status || "pending") === filter
  );

  const stats = {
    total: users.length,
    pending: users.filter((u) => (u.status || "pending") === "pending").length,
    approved: users.filter((u) => u.status === "approved").length,
    rejected: users.filter((u) => u.status === "rejected").length,
  };

  return (
    <div style={sh.page}>

      {/* TOPBAR */}
      <div style={sh.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: "none", border: "none", color: colors.accent, fontSize: "18px", cursor: "pointer", padding: 0 }}
          >
            ←
          </button>
          <div style={sh.topbarLogo}>Auto<span style={sh.topbarAccent}>Book</span></div>
        </div>
        <div style={sh.topbarRight}>
          <div style={sh.topbarMeta}>
            <div style={sh.topbarName}>{currentUser?.displayName || "Owner"}</div>
            <div>{currentUser?.role || "Owner"}</div>
          </div>
          <TopbarAvatar onClick={() => navigate("/profile")} />
        </div>
      </div>

      {/* HERO */}
      <div style={sh.hero}>
        <div style={sh.rolePill}>
          <div style={sh.roleDot} />
          <span style={sh.roleText}>Users</span>
        </div>
        <div style={sh.heroGreeting}>User Management</div>
        <div style={sh.heroSub}>Approve, reject, and manage system accounts.</div>
      </div>

      <div style={sh.content}>

        {/* STATS */}
        <div style={sh.sectionLabel}>Overview</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px", marginBottom: "1rem" }}>
          <div style={{ ...sh.card, display: "flex", alignItems: "center", gap: "20px", marginBottom: 0 }}>
            <div style={{
              width: "120px", height: "60px", flexShrink: 0, position: "relative", overflow: "hidden",
              display: "flex", alignItems: "flex-end", justifyContent: "center"
            }}>
              <div style={{
                position: "absolute", top: 0, left: 0, width: "120px", height: "120px", borderRadius: "50%",
                background: stats.total > 0
                ? `conic-gradient(from 270deg,
                    ${colors.warning} 0% ${(stats.pending / stats.total) * 50}%,
                    ${colors.success} ${(stats.pending / stats.total) * 50}% ${((stats.pending + stats.approved) / stats.total) * 50}%,
                    ${colors.danger} ${((stats.pending + stats.approved) / stats.total) * 50}% 50%,
                    transparent 50%
                  )`
                : `conic-gradient(from 270deg, ${colors.border} 0% 50%, transparent 50%)`,
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }} />
              {stats.total > 0 && <div className="gauge-chart-mask" style={{ "--card-bg": colors.white }} />}
              <div className="gauge-needle" />
              <div style={{
                width: "80px", height: "40px", background: colors.white, borderRadius: "40px 40px 0 0",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
                paddingBottom: "4px", position: "relative", zIndex: 3, boxShadow: "inset 0 4px 8px rgba(0,0,0,0.05)"
              }}>
                <span style={{ fontSize: "20px", fontWeight: "800", color: colors.textPrimary, lineHeight: 1 }}>{stats.total}</span>
                <span style={{ fontSize: "8px", color: colors.textSecondary, fontWeight: "700", marginTop: "2px" }}>USERS</span>
              </div>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "12px", height: "12px", borderRadius: "4px", background: colors.warning }}></div>
                  <span style={{ fontSize: "13px", color: colors.textSecondary, fontWeight: "600" }}>Pending</span>
                </div>
                <span style={{ fontSize: "14px", fontWeight: "800", color: colors.textPrimary }}>{stats.pending}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "12px", height: "12px", borderRadius: "4px", background: colors.success }}></div>
                  <span style={{ fontSize: "13px", color: colors.textSecondary, fontWeight: "600" }}>Approved</span>
                </div>
                <span style={{ fontSize: "14px", fontWeight: "800", color: colors.textPrimary }}>{stats.approved}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "12px", height: "12px", borderRadius: "4px", background: colors.danger }}></div>
                  <span style={{ fontSize: "13px", color: colors.textSecondary, fontWeight: "600" }}>Rejected</span>
                </div>
                <span style={{ fontSize: "14px", fontWeight: "800", color: colors.textPrimary }}>{stats.rejected}</span>
              </div>
            </div>
          </div>
        </div>

        {/* FILTER TABS */}
        <div style={sh.sectionLabel}>Filter by status</div>
        <div style={{ display: "flex", gap: "8px", marginBottom: "1rem" }}>
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                padding: "6px 16px",
                borderRadius: "20px",
                border: filter === tab ? "none" : `1px solid ${colors.border}`,
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "600",
                whiteSpace: "nowrap",
                background: filter === tab
                  ? `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`
                  : colors.white,
                color: filter === tab ? "#fff" : colors.textSecondary,
                boxShadow: filter === tab ? "0 2px 8px rgba(26,58,92,0.25)" : "none",
              }}
            >
              {capitalize(tab)}
              {tab === "pending" && stats.pending > 0 && (
                <span style={{ marginLeft: "6px", background: filter === tab ? colors.white : colors.danger, color: filter === tab ? colors.danger : "#fff", fontSize: "10px", fontWeight: "800", borderRadius: "10px", padding: "2px 6px" }}>
                  {stats.pending}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* USERS LIST */}
        <div style={sh.sectionLabel}>
          {capitalize(filter)} users ({filteredUsers.length})
        </div>
        <div style={sh.card}>
          {loading ? (
            <CarLoader text="Loading users" />
          ) : filteredUsers.length === 0 ? (
            <EmptyState
              icon="👥"
              title={`No ${filter} users`}
              subtitle={`There are currently no users registered as ${filter}.`}
            />
          ) : (
            filteredUsers.map((u, i) => (
              <div
                key={u.id}
                style={{
                  ...sh.rowItem,
                  borderBottom: i === filteredUsers.length - 1 ? "none" : `1px solid ${colors.border}`,
                  cursor: "pointer",
                }}
                onClick={() => setSelected(u)}
              >
                <div
                  style={{
                    width: "40px", height: "40px", borderRadius: "50%",
                    background: colors.infoBg, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: "13px", fontWeight: "700",
                    color: colors.info, flexShrink: 0,
                  }}
                >
                  {getInitials(u.displayName || "U")}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "600", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                    {u.displayName || "No name"}
                    {isNew(u.createdAt) && (
                      <span style={{ fontSize: "9px", fontWeight: "800", background: colors.danger, color: "#fff", padding: "2px 5px", borderRadius: "6px", letterSpacing: "0.5px", boxShadow: "0 2px 4px rgba(220,38,38,0.3)" }}>NEW</span>
                    )}
                  </div>
                  <div style={{ fontSize: "12px", color: colors.textSecondary }}>
                    {u.email}
                  </div>
                  <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "2px" }}>
                    Role: {u.role || "User"}
                  </div>
                </div>

                <span style={statusStyle(u.status || "pending")}>
                  {capitalize(u.status || "pending")}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* USER DETAIL MODAL */}
      {selected && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
            zIndex: 100, display: "flex", alignItems: "flex-end",
          }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{
              background: colors.white, borderRadius: "24px 24px 0 0",
              width: "100%", padding: "1.5rem 1.25rem",
              maxHeight: "85vh", overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "48px", height: "48px", borderRadius: "50%",
                    background: colors.infoBg, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: "16px", fontWeight: "700", color: colors.info,
                  }}
                >
                  {getInitials(selected.displayName || "U")}
                </div>
                <div>
                  <div style={{ fontWeight: "700", fontSize: "15px" }}>
                    {selected.displayName || "No name"}
                  </div>
                  <div style={{ fontSize: "12px", color: colors.textSecondary }}>
                    {selected.email}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: colors.textMuted }}
              >
                ×
              </button>
            </div>

            {[
              ["Role", selected.role || "User"],
              ["Status", selected.status || "pending"],
              ["Shop Name", selected.shopName],
              ["Phone", selected.phone || "N/A"],
              ["Address", selected.address || "N/A"],
              ["Joined", selected.createdAt
                ? new Date(selected.createdAt?.seconds * 1000).toLocaleDateString()
                : "N/A"],
            ].map(([label, value]) => {
              if (!value && (label === "Shop Name" || label === "Address" || label === "Phone")) return null;
              return (
              <div key={label} style={{ marginBottom: "0.75rem" }}>
                <div style={{ fontSize: "11px", color: colors.textMuted, fontWeight: "600", textTransform: "uppercase", marginBottom: "2px" }}>
                  {label}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {label === "Role"
                    ? <span style={roleStyle(value)}>{value}</span>
                    : label === "Status"
                    ? <span style={statusStyle(value)}>{capitalize(value)}</span>
                    : <span style={{ fontSize: "14px", color: colors.textPrimary }}>{value}</span>
                  }
                </div>
              </div>
              )
            })}

            {selected.businessPermitUrl && (
              <div style={{ marginBottom: "0.75rem" }}>
                <div style={{ fontSize: "11px", color: colors.textMuted, fontWeight: "600", textTransform: "uppercase", marginBottom: "2px" }}>Business Permit</div>
                <a href={selected.businessPermitUrl} target="_blank" rel="noreferrer" style={{ fontSize: "13px", color: colors.info, textDecoration: "none", fontWeight: "600" }}>
                  View Document ↗
                </a>
              </div>
            )}

            <div style={{ borderTop: `1px solid ${colors.border}`, margin: "1.25rem 0" }} />

            {loadingDetails ? (
                <div style={{textAlign: 'center', padding: '20px', color: colors.textMuted}}>Loading details...</div>
            ) : (
                <>
                    {/* Customer Vehicles */}
                    {(selected.role || "").toLowerCase() === "customer" && (
                        <div style={{ marginBottom: "1.25rem" }}>
                            <div style={{ fontSize: "11px", color: colors.textMuted, fontWeight: "600", textTransform: "uppercase", marginBottom: "8px" }}>
                                Registered Vehicles ({selectedUserVehicles.length})
                            </div>
                            {selectedUserVehicles.length > 0 ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                    {selectedUserVehicles.map(v => (
                                        <div key={v.id} style={{ display: 'flex', gap: '12px', background: colors.bg, padding: '12px', borderRadius: '12px' }}>
                                            {v.photoURL ? (
                                                <img src={v.photoURL} alt="vehicle" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '60px', height: '60px', borderRadius: '8px', background: colors.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: colors.textMuted }}>🚗</div>
                                            )}
                                            <div>
                                                <div style={{ fontWeight: '700', fontSize: '14px', color: colors.textPrimary }}>{v.year} {v.make} {v.model}</div>
                                                <div style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '2px' }}>{v.plate} • {v.color}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ fontSize: "13px", color: colors.textMuted, padding: "10px", background: colors.bg, borderRadius: "8px", textAlign: "center" }}>
                                    No vehicles registered.
                                </div>
                            )}
                        </div>
                    )}

                    {/* Owner Shop Details */}
                    {(selected.role || "").toLowerCase() === "owner" && selectedUserShop && (
                        <div style={{ marginBottom: "1.25rem" }}>
                            <div style={{ fontSize: "11px", color: colors.textMuted, fontWeight: "600", textTransform: "uppercase", marginBottom: "8px" }}>
                                Shop Details
                            </div>
                            <div style={{ background: colors.bg, padding: '16px', borderRadius: '12px' }}>
                                <div style={{ fontWeight: '700', fontSize: '14px', color: colors.textPrimary, marginBottom: '4px' }}>{selectedUserShop.name}</div>
                                <div style={{ fontSize: '13px', color: colors.textSecondary, fontStyle: 'italic', marginBottom: '10px' }}>"{selectedUserShop.tagline}"</div>
                                <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                                    <strong>Rating:</strong> {Number(selectedUserShop.rating || 0).toFixed(1)} ({selectedUserShop.reviews || 0} reviews)
                                </div>
                                {selectedUserShop.services && selectedUserShop.services.length > 0 && (
                                    <div style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '4px' }}>
                                        <strong>Services:</strong> {selectedUserShop.services.join(', ')}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}

            <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "10px" }}>
              {selected.status === "approved" || selected.status === "rejected" ? (
                <div style={{ fontSize: "13px", color: selected.status === "approved" ? colors.success : colors.danger, fontWeight: "600", padding: "10px", background: selected.status === "approved" ? colors.successBg : colors.dangerBg, borderRadius: "10px", border: `1px solid ${selected.status === "approved" ? "rgba(22,163,74,0.3)" : "rgba(220,38,38,0.3)"}` }}>
                  {selected.status === "approved" ? "✅ This user has been approved." : "❌ This user has been rejected."}
                </div>
              ) : (
                <>
                  <button
                    onClick={() => updateStatus(selected.id, "approved")}
                    disabled={saving}
                    style={{
                      width: "100%", padding: "14px",
                      background: colors.success,
                      color: "#fff", fontSize: "14px", fontWeight: "700",
                      border: "none", borderRadius: "14px",
                      boxShadow: "0 4px 12px rgba(22,163,74,0.25)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {saving ? "Saving..." : "✓ Approve User"}
                  </button>

                  <button
                    onClick={() => updateStatus(selected.id, "rejected")}
                    disabled={saving}
                    style={{
                      width: "100%", padding: "14px",
                      background: colors.danger,
                      color: "#fff", fontSize: "14px", fontWeight: "700",
                      border: "none", borderRadius: "14px",
                      boxShadow: "0 4px 12px rgba(220,38,38,0.25)",
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {saving ? "Saving..." : "✕ Reject User"}
                  </button>
                </>
              )}

              <button
                onClick={() => handleDeleteUser(selected)}
                disabled={saving}
                style={{
                  width: "100%", padding: "14px",
                  background: colors.danger,
                  color: "#fff", fontSize: "14px", fontWeight: "700",
                  border: "none", borderRadius: "14px",
                  boxShadow: "0 4px 12px rgba(220,38,38,0.25)",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {saving ? "Saving..." : "🗑 Remove User"}
              </button>

              <button onClick={() => setSelected(null)} style={sh.outlineBtn}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE USER MODAL */}
      {userToDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,38,64,0.6)", backdropFilter: "blur(6px)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setUserToDelete(null)}>
          <div style={{ background: colors.white, borderRadius: "24px", width: "90%", maxWidth: "340px", padding: "24px", textAlign: "center", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: colors.dangerBg, color: colors.danger, fontSize: "28px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              🗑️
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: "18px", color: colors.textPrimary, fontWeight: "800" }}>Remove User?</h3>
            <p style={{ margin: "0 0 24px", fontSize: "13px", color: colors.textSecondary, lineHeight: "1.5" }}>
              Are you sure you want to completely remove <strong>{userToDelete.displayName || userToDelete.email}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setUserToDelete(null)} style={{ flex: 1, padding: "14px", borderRadius: "14px", background: colors.bg, border: `1px solid ${colors.border}`, color: colors.textSecondary, fontWeight: "700", cursor: "pointer", fontFamily: "inherit", fontSize: "14px" }}>
                Cancel
              </button>
              <button onClick={confirmDeleteUser} disabled={saving} style={{ flex: 1, padding: "14px", borderRadius: "14px", background: colors.danger, border: "none", color: "#fff", fontWeight: "700", cursor: "pointer", fontFamily: "inherit", fontSize: "14px", boxShadow: "0 4px 12px rgba(220,38,38,0.25)" }}>
                {saving ? "Removing..." : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}