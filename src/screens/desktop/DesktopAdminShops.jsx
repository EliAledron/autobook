import React, { useEffect, useState } from "react";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import { colors, ConfirmModal } from "../dashboardShared";
import RoleBasedWrapper from "../../components/RoleBasedWrapper";
import { Search, Store, MapPin, Star, Eye, Archive, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function DesktopAdminShops() {
  const [shops, setShops] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmProps, setConfirmProps] = useState({ isOpen: false, title: "", message: "", type: "primary", onConfirm: null });
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "shops"), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setShops(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleArchive = async (shop) => {
    setConfirmProps({
      isOpen: true,
      title: "Archive Shop",
      message: "Are you sure you want to archive this shop? Please select a reason below.",
      type: "danger",
      requireInput: true,
      inputPlaceholder: "Select reason for archiving...",
      inputOptions: [
        { label: "Terms Violation", value: "Terms Violation" },
        { label: "Shop Inactive", value: "Shop Inactive" },
        { label: "Customer Complaints", value: "Customer Complaints" },
        { label: "Other", value: "Other" }
      ],
      onConfirm: async (inputValue) => {
        setConfirmProps({ isOpen: false });
        setActionLoading(shop.id);
        try {
          if (shop.ownerId) {
            import("firebase/firestore").then(({ addDoc, collection, serverTimestamp }) => {
              addDoc(collection(db, "notifications"), {
                userId: shop.ownerId,
                title: "Shop Archived",
                message: `Your shop "${shop.name || 'Auto Shop'}" has been archived from AutoBook. Reason: ${inputValue || 'Violation of platform policies.'}`,
                read: false,
                createdAt: serverTimestamp(),
                type: "system"
              }).catch(err => console.error("Notification failed", err));
            });
          }
          import("firebase/firestore").then(async ({ updateDoc }) => {
            await updateDoc(doc(db, "shops", shop.id), { status: "archived" });
          });
        } catch (e) {
          console.error("Failed to archive", e);
        }
        setActionLoading(null);
      }
    });
  };

  const [showArchived, setShowArchived] = useState(false);

  const handleRestore = async (shop) => {
    setConfirmProps({
      isOpen: true,
      title: "Restore Shop",
      message: "Are you sure you want to restore this shop? It will be visible to users again.",
      type: "success",
      requireInput: false,
      onConfirm: async () => {
        setConfirmProps({ isOpen: false });
        setActionLoading(shop.id);
        try {
          if (shop.ownerId) {
            import("firebase/firestore").then(({ addDoc, collection, serverTimestamp }) => {
              addDoc(collection(db, "notifications"), {
                userId: shop.ownerId,
                title: "Shop Restored",
                message: `Your shop "${shop.name || 'Auto Shop'}" has been successfully restored and is now visible on AutoBook!`,
                read: false,
                createdAt: serverTimestamp(),
                type: "system"
              }).catch(err => console.error("Notification failed", err));
            });
          }
          import("firebase/firestore").then(async ({ updateDoc }) => {
            await updateDoc(doc(db, "shops", shop.id), { status: "active" });
          });
        } catch (e) {
          console.error("Failed to restore", e);
        }
        setActionLoading(null);
      }
    });
  };

  const filteredShops = shops.filter(s => {
    if (showArchived) {
      if (s.status !== "archived") return false;
    } else {
      if (s.status === "archived") return false;
    }
    const q = search.toLowerCase();
    return (s.name || "").toLowerCase().includes(q) ||
           (s.tagline || "").toLowerCase().includes(q) ||
           (s.address || "").toLowerCase().includes(q);
  });

  return (
    <>
      <ConfirmModal 
          isOpen={confirmProps.isOpen}
          title={confirmProps.title}
          message={confirmProps.message}
          type={confirmProps.type}
          requireInput={confirmProps.requireInput}
          inputPlaceholder={confirmProps.inputPlaceholder}
          inputOptions={confirmProps.inputOptions}
        onCancel={() => setConfirmProps({ isOpen: false })}
        onConfirm={confirmProps.onConfirm}
      />
      <RoleBasedWrapper title="Registered Shops">
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
            <div>
              <h1 style={{ fontSize: "28px", fontWeight: "800", color: colors.textPrimary, margin: "0 0 8px 0" }}>Registered Shops</h1>
              <p style={{ margin: 0, color: colors.textSecondary, fontSize: "15px" }}>View and manage all active auto shops on the platform.</p>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", background: "#fff", padding: "16px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", border: `1px solid ${colors.border}` }}>
            
            <div style={{ fontSize: "14px", fontWeight: "700", color: colors.textPrimary, display: "flex", alignItems: "center", gap: "8px" }}>
              <Store size={20} color={colors.info} />
              Total Shops: {shops.filter(s => s.status !== "archived").length}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button 
                onClick={() => setShowArchived(!showArchived)}
                style={{
                  padding: "10px 16px", 
                  borderRadius: "12px", 
                  border: `1px solid ${showArchived ? colors.info : colors.border}`,
                  background: showArchived ? colors.infoBg : "#fff",
                  color: showArchived ? colors.info : colors.textSecondary,
                  fontSize: "14px", fontWeight: "600", cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                {showArchived ? "Viewing Archived" : "Show Archived"}
              </button>
              
              <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#f8fafc", padding: "10px 16px", borderRadius: "12px", border: `1px solid ${colors.border}`, width: "300px" }}>
                <Search size={18} color={colors.textMuted} />
                <input 
                  type="text" 
                  placeholder="Search shops..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: "14px", color: colors.textPrimary }}
                />
              </div>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", border: `1px solid ${colors.border}`, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: `1px solid ${colors.border}` }}>
                  <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Shop Name</th>
                  <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Location</th>
                  <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Rating</th>
                  <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Date Registered</th>
                  <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" style={{ padding: "48px", textAlign: "center", color: colors.textMuted }}>Loading shops...</td></tr>
                ) : filteredShops.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: "48px", textAlign: "center", color: colors.textMuted }}>No shops found.</td></tr>
                ) : (
                  filteredShops.map(s => (
                    <tr key={s.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                          <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: s.bg || colors.infoBg, color: s.accent || colors.info, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {s.logo ? (
                              <img src={s.logo} alt="" style={{ width: "100%", height: "100%", borderRadius: "10px", objectFit: "cover" }} />
                            ) : (
                              <Store size={20} />
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: "700", fontSize: "15px", color: colors.textPrimary }}>{s.name || "Unnamed Shop"}</div>
                            <div style={{ fontSize: "13px", color: colors.textSecondary }}>{s.tagline || "No tagline provided"}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", color: colors.textSecondary }}>
                          <MapPin size={16} />
                          {s.address || "No address"}
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Star size={16} color={colors.warning} fill={colors.warning} />
                          <span style={{ fontSize: "14px", fontWeight: "700", color: colors.textPrimary }}>
                            {Number(s.rating || 0).toFixed(1)}
                          </span>
                          <span style={{ fontSize: "12px", color: colors.textMuted }}>
                            ({s.reviews || 0})
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px", fontSize: "14px", color: colors.textSecondary }}>
                        {s.createdAt?.seconds ? new Date(s.createdAt.seconds * 1000).toLocaleDateString() : "Unknown"}
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                          <button onClick={() => navigate("/customer/shop-profile", { state: { shopId: s.id } })} style={{ width: "36px", height: "36px", borderRadius: "10px", background: colors.infoBg, color: colors.info, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }} title="View Shop Profile">
                            <Eye size={18} />
                          </button>
                          {s.status === "archived" ? (
                            <button disabled={actionLoading === s.id} onClick={() => handleRestore(s)} style={{ width: "36px", height: "36px", borderRadius: "10px", background: colors.successBg, color: colors.success, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }} title="Restore Shop">
                              <RotateCcw size={18} />
                            </button>
                          ) : (
                            <button disabled={actionLoading === s.id} onClick={() => handleArchive(s)} style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#fef2f2", color: colors.danger, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }} title="Archive Shop">
                              <Archive size={18} />
                            </button>
                          )}
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
    </>
  );
}
