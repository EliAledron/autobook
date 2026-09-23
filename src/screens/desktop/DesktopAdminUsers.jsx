import React, { useEffect, useState } from "react";
import { collection, onSnapshot, updateDoc, doc, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { colors, ConfirmModal } from "../dashboardShared";
import RoleBasedWrapper from "../../components/RoleBasedWrapper";
import { Check, X, Ban, Trash2, Search, UserCheck, Eye } from "lucide-react";

const getUserActivityStatus = (lastActiveAt) => {
  if (!lastActiveAt) return { text: "No data", color: colors.textMuted, dot: colors.border };
  
  const d = lastActiveAt?.seconds ? new Date(lastActiveAt.seconds * 1000) : new Date(lastActiveAt);
  if (isNaN(d.getTime())) return { text: "No data", color: colors.textMuted, dot: colors.border };

  const now = new Date();
  const diffMs = now - d;
  const diffMins = diffMs / (1000 * 60);
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffMins < 15) return { text: "Online now", color: colors.success, dot: colors.success };
  if (diffHours < 24) return { text: "Active today", color: colors.info, dot: colors.info };
  if (diffDays < 7) return { text: `Active ${Math.floor(diffDays)}d ago`, color: colors.textSecondary, dot: colors.warning };
  
  return { text: "Inactive", color: colors.textMuted, dot: colors.danger };
};

export default function DesktopAdminUsers() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmProps, setConfirmProps] = useState({ isOpen: false, title: "", message: "", type: "primary", onConfirm: null, requireInput: false, inputPlaceholder: "", inputOptions: null });
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setUsers(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, search]);

  const handleStatusUpdate = async (id, status) => {
    let title = "";
    let message = "";
    let type = "primary";
    let requireInput = false;
    let inputPlaceholder = "";
    let inputOptions = null;

    if (status === "approved") {
      title = "Approve User";
      message = "Are you sure you want to approve this user? They will gain access to the platform.";
      type = "blueGradient";
    } else if (status === "rejected") {
      title = "Reject User";
      message = "Are you sure you want to reject this user's application? Please select a reason below.";
      type = "danger";
      requireInput = true;
      inputPlaceholder = "Select rejection reason...";
      inputOptions = [
        { label: "Invalid Documents", value: "Invalid Documents" },
        { label: "Incomplete Profile", value: "Incomplete Profile" },
        { label: "Suspicious Activity", value: "Suspicious Activity" },
        { label: "Other", value: "Other" }
      ];
    } else if (status === "restricted") {
      title = "Restrict User";
      message = "Are you sure you want to restrict this user? Please select a reason below.";
      type = "danger";
      requireInput = true;
      inputPlaceholder = "Select restriction reason...";
      inputOptions = [
        { label: "Violation of Terms", value: "Violation of Terms" },
        { label: "Too Many Reports", value: "Too Many Reports" },
        { label: "Fraudulent Activity", value: "Fraudulent Activity" },
        { label: "Other", value: "Other" }
      ];
    }

    if (title) {
      setConfirmProps({
        isOpen: true, title, message, type, requireInput, inputPlaceholder, inputOptions,
        onConfirm: async (inputValue) => {
          setConfirmProps({ isOpen: false });
          setActionLoading(id);
          try {
            const updates = { status };
            if (status === "rejected" && inputValue) {
              updates.rejectionReason = inputValue;
            }
            if (status === "approved") {
              updates.lateCancellations = 0;
              updates.cooldownUntil = null;
            }

            const targetUser = users.find(u => u.id === id);
            if (status === "approved" && targetUser && (targetUser.role || "").toLowerCase() === "owner" && !targetUser.shopId) {
              const shopData = {
                name: targetUser.shopName || "Auto Shop",
                shortName: (targetUser.shopName || "Shop").split(" ")[0],
                ownerId: targetUser.id,
                rating: 0,
                reviews: 0,
                icon: "store",
                tagline: "Quality auto services",
                bg: colors.infoBg,
                accent: colors.info,
                createdAt: serverTimestamp()
              };
              const newShopRef = await addDoc(collection(db, "shops"), shopData);
              updates.shopId = newShopRef.id;
            }
            
            await updateDoc(doc(db, "users", id), updates);

            // Create In-App Notification
            if (status === "approved" || status === "rejected") {
              await addDoc(collection(db, "notifications"), {
                userId: id,
                title: status === "approved" ? "Account Approved 🎉" : "Application Update",
                message: status === "approved" ? "Your account has been fully approved. Welcome to AutoBook!" : "Your application was not approved. Admin Note: " + (inputValue || "Please check your details."),
                read: false,
                createdAt: serverTimestamp(),
                type: "system"
              });
            }

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

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

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
          inputOptions={confirmProps.inputOptions}
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
                <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Date Joined</th>
                <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" style={{ padding: "48px", textAlign: "center", color: colors.textMuted }}>Loading users...</td></tr>
              ) : currentUsers.length === 0 ? (
                <tr><td colSpan="4" style={{ padding: "48px", textAlign: "center", color: colors.textMuted }}>No users found for this filter.</td></tr>
              ) : (
                currentUsers.map(u => (
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

                    <td style={{ padding: "16px 24px", fontSize: "14px", color: colors.textSecondary }}>
                      {u.createdAt?.seconds ? new Date(u.createdAt.seconds * 1000).toLocaleDateString() : "Unknown"}
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "right" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                        {filter === "pending" && (
                          <>
                            <button onClick={() => setSelectedUser(u)} style={{ width: "36px", height: "36px", borderRadius: "10px", background: colors.infoBg, color: colors.info, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="View Profile">
                              <Eye size={18} />
                            </button>
                            <button disabled={actionLoading === u.id} onClick={() => handleStatusUpdate(u.id, "approved")} style={{ width: "36px", height: "36px", borderRadius: "10px", background: colors.successBg, color: colors.success, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Approve">
                              <Check size={18} />
                            </button>
                            <button disabled={actionLoading === u.id} onClick={() => handleStatusUpdate(u.id, "rejected")} style={{ width: "36px", height: "36px", borderRadius: "10px", background: colors.dangerBg, color: colors.danger, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Reject">
                              <X size={18} />
                            </button>
                          </>
                        )}
                        {filter === "approved" && (
                          <>
                            <button onClick={() => setSelectedUser(u)} style={{ width: "36px", height: "36px", borderRadius: "10px", background: colors.infoBg, color: colors.info, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="View Profile">
                              <Eye size={18} />
                            </button>
                            <button disabled={actionLoading === u.id} onClick={() => handleStatusUpdate(u.id, "restricted")} style={{ width: "36px", height: "36px", borderRadius: "10px", background: colors.dangerBg, color: colors.danger, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Restrict Access">
                              <Ban size={18} />
                            </button>
                          </>
                        )}
                        {filter === "restricted" && (
                          <>
                            <button onClick={() => setSelectedUser(u)} style={{ width: "36px", height: "36px", borderRadius: "10px", background: colors.infoBg, color: colors.info, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="View Profile">
                              <Eye size={18} />
                            </button>
                            <button disabled={actionLoading === u.id} onClick={() => handleStatusUpdate(u.id, "approved")} style={{ width: "36px", height: "36px", borderRadius: "10px", background: colors.successBg, color: colors.success, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Restore Access">
                              <UserCheck size={18} />
                            </button>
                          </>
                        )}
                        {filter === "rejected" && (
                          <>
                            <button onClick={() => setSelectedUser(u)} style={{ width: "36px", height: "36px", borderRadius: "10px", background: colors.infoBg, color: colors.info, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="View Profile">
                              <Eye size={18} />
                            </button>
                            <button disabled={actionLoading === u.id} onClick={() => handleStatusUpdate(u.id, "approved")} style={{ width: "36px", height: "36px", borderRadius: "10px", background: colors.successBg, color: colors.success, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Approve User">
                              <UserCheck size={18} />
                            </button>
                          </>
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
          
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderTop: `1px solid ${colors.border}`, background: "#f8fafc" }}>
              <div style={{ fontSize: "14px", color: colors.textSecondary }}>
                Showing {indexOfFirstUser + 1} to {Math.min(indexOfLastUser, filteredUsers.length)} of {filteredUsers.length} users
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                  disabled={currentPage === 1}
                  style={{ padding: "6px 12px", borderRadius: "8px", border: `1px solid ${colors.border}`, background: currentPage === 1 ? "#f1f5f9" : "#fff", color: currentPage === 1 ? colors.textMuted : colors.textPrimary, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
                >
                  Previous
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", background: currentPage === i + 1 ? colors.navy : "transparent", color: currentPage === i + 1 ? "#fff" : colors.textPrimary, fontWeight: "600", cursor: "pointer" }}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                  disabled={currentPage === totalPages}
                  style={{ padding: "6px 12px", borderRadius: "8px", border: `1px solid ${colors.border}`, background: currentPage === totalPages ? "#f1f5f9" : "#fff", color: currentPage === totalPages ? colors.textMuted : colors.textPrimary, cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DESKTOP USER DETAIL MODAL */}
      {selectedUser && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
            zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px"
          }}
          onClick={() => setSelectedUser(null)}
        >
          <div
            style={{
              background: colors.white, borderRadius: "24px",
              width: "100%", maxWidth: "500px", padding: "2rem",
              maxHeight: "90vh", overflowY: "auto",
              boxShadow: "0 20px 40px rgba(0,0,0,0.15)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div
                  style={{
                    width: "60px", height: "60px", borderRadius: "50%",
                    background: colors.navy, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: "22px", fontWeight: "700", color: "#fff",
                  }}
                >
                  {(selectedUser.displayName || selectedUser.name || "?")[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: "800", fontSize: "20px", color: colors.textPrimary, marginBottom: "2px" }}>
                    {selectedUser.displayName || selectedUser.name || "Unknown"}
                  </div>
                  <div style={{ fontSize: "14px", color: colors.textSecondary }}>
                    {selectedUser.email}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: colors.textMuted, padding: "4px" }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              {[
                ["Role", selectedUser.role || "Customer"],
                ["Status", selectedUser.status || "pending"],
                ["Phone", selectedUser.phone || "N/A"],
                ["Address", selectedUser.address || "N/A"],
                ["Shop Name", selectedUser.shopName],
                ["Joined", selectedUser.createdAt?.seconds ? new Date(selectedUser.createdAt.seconds * 1000).toLocaleDateString() : "N/A"],
                ["Last Active", getUserActivityStatus(selectedUser.lastActiveAt).text]
              ].map(([label, value]) => {
                if (!value && (label === "Shop Name" || label === "Address" || label === "Phone")) return null;
                return (
                  <div key={label}>
                    <div style={{ fontSize: "12px", color: colors.textMuted, fontWeight: "700", textTransform: "uppercase", marginBottom: "4px", letterSpacing: "0.5px" }}>
                      {label}
                    </div>
                    <div style={{ fontSize: "15px", fontWeight: label === "Role" || label === "Status" || label === "Last Active" ? "700" : "500", color: label === "Last Active" ? getUserActivityStatus(selectedUser.lastActiveAt).color : colors.textPrimary, textTransform: label === "Role" || label === "Status" ? "capitalize" : "none" }}>
                      {value}
                    </div>
                  </div>
                )
              })}
            </div>

            {(selectedUser.businessPermitUrl || selectedUser.dtiUrl || selectedUser.licenseUrl) && (
              <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: `1px solid ${colors.border}` }}>
                <div style={{ fontSize: "12px", color: colors.textMuted, fontWeight: "700", textTransform: "uppercase", marginBottom: "12px", letterSpacing: "0.5px" }}>Documents</div>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  {selectedUser.businessPermitUrl && <a href={selectedUser.businessPermitUrl} target="_blank" rel="noreferrer" style={{ fontSize: "13px", background: colors.infoBg, color: colors.info, padding: "8px 16px", borderRadius: "12px", textDecoration: "none", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>Permit ↗</a>}
                  {selectedUser.dtiUrl && <a href={selectedUser.dtiUrl} target="_blank" rel="noreferrer" style={{ fontSize: "13px", background: colors.infoBg, color: colors.info, padding: "8px 16px", borderRadius: "12px", textDecoration: "none", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>DTI ↗</a>}
                  {selectedUser.licenseUrl && <a href={selectedUser.licenseUrl} target="_blank" rel="noreferrer" style={{ fontSize: "13px", background: colors.infoBg, color: colors.info, padding: "8px 16px", borderRadius: "12px", textDecoration: "none", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>License ↗</a>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </RoleBasedWrapper>
    </>
  );
}
