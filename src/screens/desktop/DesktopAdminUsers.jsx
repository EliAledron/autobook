import React, { useEffect, useState } from "react";
import { collection, onSnapshot, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { colors, ConfirmModal } from "../dashboardShared";
import RoleBasedWrapper from "../../components/RoleBasedWrapper";
import { Check, X, Ban, Trash2, Search, UserCheck } from "lucide-react";

export default function DesktopAdminUsers() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmProps, setConfirmProps] = useState({ isOpen: false, title: "", message: "", type: "primary", onConfirm: null, requireInput: false, inputPlaceholder: "" });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setUsers(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleStatusUpdate = async (id, status) => {
    let title = "";
    let message = "";
    let type = "primary";
    let requireInput = false;
    let inputPlaceholder = "";

    if (status === "approved") {
      title = "Approve User";
      message = "Are you sure you want to approve this user? They will gain access to the platform.";
      type = "success";
    } else if (status === "rejected") {
      title = "Reject User";
      message = "Are you sure you want to reject this user's application? Please provide a reason below.";
      type = "danger";
      requireInput = true;
      inputPlaceholder = "Reason for rejection (e.g. Invalid documents)...";
    } else if (status === "restricted") {
      title = "Restrict User";
      message = "Are you sure you want to restrict this user? They will lose access immediately.";
      type = "danger";
    }

    if (title) {
      setConfirmProps({
        isOpen: true, title, message, type, requireInput, inputPlaceholder,
        onConfirm: async (inputValue) => {
          setConfirmProps({ isOpen: false });
          setActionLoading(id);
          try {
            const updates = { status };
            if (status === "rejected" && inputValue) {
              updates.rejectionReason = inputValue;
            }
            await updateDoc(doc(db, "users", id), updates);
          } catch (e) {
            console.error("Failed to update status", e);
          }
          setActionLoading(null);
        }
      });
      return;
    }
  };

  const handleDelete = async (id) => {
    setConfirmProps({
      isOpen: true,
      title: "Delete User",
      message: "Are you sure you want to permanently delete this user? This cannot be undone.",
      type: "danger",
      onConfirm: async () => {
        setConfirmProps({ isOpen: false });
        setActionLoading(id);
        try {
          await deleteDoc(doc(db, "users", id));
        } catch (e) {
          console.error("Failed to delete", e);
        }
        setActionLoading(null);
      }
    });
    return;
  };

  const filteredUsers = users.filter(u => {
    const s = search.toLowerCase();
    const matchSearch = (u.displayName || u.name || "").toLowerCase().includes(s) || 
                        (u.email || "").toLowerCase().includes(s) ||
                        (u.shopName || "").toLowerCase().includes(s);
    const matchFilter = (u.status || "pending") === filter;
    return matchSearch && matchFilter;
  });

  const stats = {
    pending: users.filter(u => (u.status || "pending") === "pending").length,
    approved: users.filter(u => u.status === "approved").length,
    rejected: users.filter(u => u.status === "rejected").length,
    restricted: users.filter(u => u.status === "restricted").length
  };

  return (
    <>
      <ConfirmModal 
          isOpen={confirmProps.isOpen}
          title={confirmProps.title}
          message={confirmProps.message}
          type={confirmProps.type}
          requireInput={confirmProps.requireInput}
          inputPlaceholder={confirmProps.inputPlaceholder}
        onCancel={() => setConfirmProps({ isOpen: false })}
        onConfirm={confirmProps.onConfirm}
      />
      <RoleBasedWrapper title="User Approvals">
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px" }}>
        
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: "800", color: colors.textPrimary, margin: "0 0 8px 0" }}>User Approvals</h1>
            <p style={{ margin: 0, color: colors.textSecondary, fontSize: "15px" }}>Manage platform access for Shop Owners, Mechanics, and Customers.</p>
          </div>
        </div>

        {/* CONTROLS */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", background: "#fff", padding: "16px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", border: `1px solid ${colors.border}` }}>
          
          <div style={{ display: "flex", gap: "8px" }}>
            {["pending", "approved", "rejected", "restricted"].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                style={{ 
                  padding: "8px 16px", borderRadius: "10px", fontWeight: "700", fontSize: "14px", cursor: "pointer", border: "none", transition: "all 0.2s",
                  background: filter === f ? colors.navy : "transparent",
                  color: filter === f ? "#fff" : colors.textSecondary,
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                <span style={{ marginLeft: "8px", background: filter === f ? "rgba(255,255,255,0.2)" : colors.border, padding: "2px 8px", borderRadius: "8px", fontSize: "12px", color: filter === f ? "#fff" : colors.textPrimary }}>
                  {stats[f]}
                </span>
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#f8fafc", padding: "10px 16px", borderRadius: "12px", border: `1px solid ${colors.border}`, width: "300px" }}>
            <Search size={18} color={colors.textMuted} />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: "14px", color: colors.textPrimary }}
            />
          </div>
        </div>

        {/* TABLE */}
        <div style={{ background: "#fff", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", border: `1px solid ${colors.border}`, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: `1px solid ${colors.border}` }}>
                <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>User</th>
                <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Role</th>
                <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Shop Affiliation</th>
                <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Date Joined</th>
                <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{ padding: "48px", textAlign: "center", color: colors.textMuted }}>Loading users...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: "48px", textAlign: "center", color: colors.textMuted }}>No users found for this filter.</td></tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: colors.navy, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "16px" }}>
                          {(u.displayName || u.name || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: "700", fontSize: "15px", color: colors.textPrimary }}>{u.displayName || u.name || "Unknown"}</div>
                          <div style={{ fontSize: "13px", color: colors.textSecondary }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <span style={{ background: u.role?.toLowerCase() === 'owner' ? colors.warningBg : colors.infoBg, color: u.role?.toLowerCase() === 'owner' ? colors.warning : colors.info, padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "700", textTransform: "capitalize" }}>
                        {u.role || "Customer"}
                      </span>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: colors.textPrimary }}>{u.shopName || "N/A"}</div>
                      {u.shopId && <div style={{ fontSize: "12px", color: colors.textSecondary }}>ID: {u.shopId}</div>}
                    </td>
                    <td style={{ padding: "16px 24px", fontSize: "14px", color: colors.textSecondary }}>
                      {u.createdAt?.seconds ? new Date(u.createdAt.seconds * 1000).toLocaleDateString() : "Unknown"}
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "right" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                        {filter === "pending" && (
                          <>
                            <button disabled={actionLoading === u.id} onClick={() => handleStatusUpdate(u.id, "approved")} style={{ width: "36px", height: "36px", borderRadius: "10px", background: colors.successBg, color: colors.success, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Approve">
                              <Check size={18} />
                            </button>
                            <button disabled={actionLoading === u.id} onClick={() => handleStatusUpdate(u.id, "rejected")} style={{ width: "36px", height: "36px", borderRadius: "10px", background: colors.dangerBg, color: colors.danger, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Reject">
                              <X size={18} />
                            </button>
                          </>
                        )}
                        {filter === "approved" && (
                          <button disabled={actionLoading === u.id} onClick={() => handleStatusUpdate(u.id, "restricted")} style={{ width: "36px", height: "36px", borderRadius: "10px", background: colors.dangerBg, color: colors.danger, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Restrict Access">
                            <Ban size={18} />
                          </button>
                        )}
                        {filter === "restricted" && (
                          <button disabled={actionLoading === u.id} onClick={() => handleStatusUpdate(u.id, "approved")} style={{ width: "36px", height: "36px", borderRadius: "10px", background: colors.successBg, color: colors.success, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Restore Access">
                            <UserCheck size={18} />
                          </button>
                        )}
                        {(filter === "rejected" || filter === "restricted") && (
                          <button disabled={actionLoading === u.id} onClick={() => handleDelete(u.id)} style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#f1f5f9", color: colors.textSecondary, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Delete Permanently">
                            <Trash2 size={18} />
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
