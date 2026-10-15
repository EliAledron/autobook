import React, { useEffect, useState } from "react";
import { 
  collection, onSnapshot, updateDoc, doc, deleteDoc, 
  addDoc, serverTimestamp, query, orderBy 
} from "firebase/firestore";
import { db } from "../../firebase";
import { colors, ErrorModal, SuccessModal, ConfirmModal } from "../dashboardShared";
import RoleBasedWrapper from "../../components/RoleBasedWrapper";
import { useUser } from "../../UserContext";
import { 
  LifeBuoy, Search, Filter, CheckCircle2, Clock, 
  AlertTriangle, X, Send, Store, Calendar, ExternalLink, 
  Trash2, Eye, ShieldAlert, MessageSquare, Check, ChevronRight 
} from "lucide-react";

export default function DesktopAdminSupportTickets() {
  const { userProfile } = useUser();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "open" | "in_progress" | "resolved" | "closed"
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Selected ticket for modal
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [updating, setUpdating] = useState(false);

  // Confirmation & Feedback
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const q = collection(db, "supportTickets");
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setTickets(list);
      setLoading(false);
    }, (err) => {
      console.error("Support tickets snapshot error:", err);
      setErrorMsg("Failed to load support tickets.");
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Update selected ticket response when opened
  useEffect(() => {
    if (selectedTicket) {
      setAdminResponse(selectedTicket.adminNotes || "");
    }
  }, [selectedTicket]);

  // Statistics
  const totalCount = tickets.length;
  const openCount = tickets.filter(t => (t.status || "open").toLowerCase() === "open").length;
  const inProgressCount = tickets.filter(t => (t.status || "").toLowerCase() === "in_progress").length;
  const resolvedCount = tickets.filter(t => (t.status || "").toLowerCase() === "resolved").length;

  // Filtered tickets
  const filteredTickets = tickets.filter(t => {
    const currentStatus = (t.status || "open").toLowerCase();
    if (statusFilter !== "all" && currentStatus !== statusFilter) return false;
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;

    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (t.ticketNumber || "").toLowerCase().includes(s) ||
      (t.subject || "").toLowerCase().includes(s) ||
      (t.message || "").toLowerCase().includes(s) ||
      (t.customerName || "").toLowerCase().includes(s) ||
      (t.customerEmail || "").toLowerCase().includes(s) ||
      (t.shopName || "").toLowerCase().includes(s) ||
      (t.bookingId || "").toLowerCase().includes(s)
    );
  });

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedTicket) return;
    setUpdating(true);
    try {
      const ticketRef = doc(db, "supportTickets", selectedTicket.id);
      await updateDoc(ticketRef, {
        status: newStatus,
        adminNotes: adminResponse.trim(),
        updatedAt: serverTimestamp(),
        resolvedBy: userProfile?.name || "Admin",
        ...(newStatus === "resolved" ? { resolvedAt: serverTimestamp() } : {})
      });

      // Send in-app notification to the customer
      if (selectedTicket.customerId) {
        await addDoc(collection(db, "notifications"), {
          userId: selectedTicket.customerId,
          type: "support_update",
          title: `Support Ticket #${selectedTicket.ticketNumber || selectedTicket.id.slice(-6)}: ${newStatus === "resolved" ? "Resolved" : "Updated"}`,
          message: adminResponse.trim() 
            ? `Admin response: ${adminResponse.trim()}`
            : `Your support ticket has been marked as ${newStatus.replace("_", " ")}.`,
          read: false,
          createdAt: serverTimestamp(),
        });
      }

      setSuccessMsg(`Ticket updated to ${newStatus.replace("_", " ")}.`);
      setSelectedTicket(prev => prev ? { ...prev, status: newStatus, adminNotes: adminResponse.trim() } : null);
    } catch (err) {
      console.error("Failed to update ticket status:", err);
      setErrorMsg("Failed to update ticket status.");
    } finally {
      setUpdating(false);
    }
  };

  const executeDelete = async (ticketId) => {
    try {
      await deleteDoc(doc(db, "supportTickets", ticketId));
      setSuccessMsg("Ticket dismissed successfully.");
      if (selectedTicket?.id === ticketId) setSelectedTicket(null);
    } catch (err) {
      console.error("Failed to delete ticket:", err);
      setErrorMsg("Failed to delete ticket.");
    }
    setConfirmDelete(null);
  };

  const getStatusBadge = (status) => {
    switch ((status || "open").toLowerCase()) {
      case "resolved":
        return <span style={{ background: colors.successBg, color: colors.success, padding: "4px 10px", borderRadius: "8px", fontSize: "12px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "4px" }}><CheckCircle2 size={13} /> Resolved</span>;
      case "in_progress":
        return <span style={{ background: colors.infoBg, color: colors.info, padding: "4px 10px", borderRadius: "8px", fontSize: "12px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "4px" }}><Clock size={13} /> In Progress</span>;
      case "closed":
        return <span style={{ background: "#f3f4f6", color: "#6b7280", padding: "4px 10px", borderRadius: "8px", fontSize: "12px", fontWeight: "700" }}>Closed</span>;
      default:
        return <span style={{ background: colors.warningBg, color: colors.warning, padding: "4px 10px", borderRadius: "8px", fontSize: "12px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "4px" }}><Clock size={13} /> Open</span>;
    }
  };

  const getPriorityBadge = (p) => {
    switch ((p || "Normal").toLowerCase()) {
      case "urgent":
        return <span style={{ background: colors.dangerBg, color: colors.danger, padding: "2px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "800", textTransform: "uppercase" }}>Urgent</span>;
      case "high":
        return <span style={{ background: "#ffedd5", color: "#ea580c", padding: "2px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "800", textTransform: "uppercase" }}>High</span>;
      default:
        return <span style={{ background: "#f1f5f9", color: "#64748b", padding: "2px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "800", textTransform: "uppercase" }}>Normal</span>;
    }
  };

  return (
    <>
      <SuccessModal message={successMsg} onClose={() => setSuccessMsg("")} />
      <ErrorModal error={errorMsg} onClose={() => setErrorMsg("")} />
      
      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Dismiss Support Ticket"
        message="Are you sure you want to permanently remove this ticket from the system?"
        onConfirm={() => executeDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
        type="danger"
      />

      <RoleBasedWrapper title="Support Tickets">
        <div style={{ maxWidth: "1240px", margin: "0 auto", padding: "32px", fontFamily: "'Inter', sans-serif" }}>
          
          {/* HEADER */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
            <div>
              <h1 style={{ fontSize: "28px", fontWeight: "800", color: colors.textPrimary, margin: "0 0 8px 0" }}>
                Customer Support Tickets
              </h1>
              <p style={{ margin: 0, color: colors.textSecondary, fontSize: "15px" }}>
                Manage customer inquiries, booking disputes, bug reports, and resolution notes.
              </p>
            </div>
          </div>

          {/* STATS CARDS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "28px" }}>
            <div style={{ background: "#fff", padding: "20px", borderRadius: "18px", border: `1px solid ${colors.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Total Tickets</div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: colors.navy }}>{totalCount}</div>
            </div>
            <div style={{ background: "#fff", padding: "20px", borderRadius: "18px", border: `1px solid ${colors.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: colors.warning, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Open Tickets</div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: colors.warning }}>{openCount}</div>
            </div>
            <div style={{ background: "#fff", padding: "20px", borderRadius: "18px", border: `1px solid ${colors.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: colors.info, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>In Progress</div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: colors.info }}>{inProgressCount}</div>
            </div>
            <div style={{ background: "#fff", padding: "20px", borderRadius: "18px", border: `1px solid ${colors.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: colors.success, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Resolved</div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: colors.success }}>{resolvedCount}</div>
            </div>
          </div>

          {/* CONTROLS & FILTERS */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "#fff", padding: "16px 20px", borderRadius: "16px",
            border: `1px solid ${colors.border}`, marginBottom: "24px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)", flexWrap: "wrap", gap: "16px"
          }}>
            {/* STATUS TABS */}
            <div style={{ display: "flex", gap: "6px", background: "#f1f5f9", padding: "4px", borderRadius: "12px" }}>
              {[
                { id: "all", label: "All" },
                { id: "open", label: "Open", count: openCount },
                { id: "in_progress", label: "In Progress" },
                { id: "resolved", label: "Resolved" },
                { id: "closed", label: "Closed" }
              ].map(tab => {
                const isActive = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    style={{
                      border: "none",
                      background: isActive ? "#fff" : "transparent",
                      color: isActive ? colors.navy : colors.textSecondary,
                      padding: "8px 14px", borderRadius: "8px",
                      fontWeight: isActive ? "700" : "600",
                      fontSize: "13px", cursor: "pointer",
                      boxShadow: isActive ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
                      display: "flex", alignItems: "center", gap: "6px",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span style={{
                        background: colors.warning, color: "#fff",
                        fontSize: "10px", padding: "1px 6px", borderRadius: "8px", fontWeight: "800"
                      }}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* SEARCH & CATEGORY */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                style={{
                  padding: "10px 14px", borderRadius: "12px", border: `1px solid ${colors.border}`,
                  background: "#f8fafc", fontSize: "13px", color: colors.textPrimary, outline: "none"
                }}
              >
                <option value="all">All Categories</option>
                <option value="Booking Issue">Booking Issue</option>
                <option value="Shop & Service Dispute">Shop Dispute</option>
                <option value="Payment / Billing Question">Payment / Billing</option>
                <option value="Account & Login">Account & Login</option>
                <option value="App Bug or Technical Glitch">Bug / Tech Glitch</option>
                <option value="General Inquiry">General Inquiry</option>
              </select>

              <div style={{
                display: "flex", alignItems: "center", gap: "10px",
                background: "#f8fafc", padding: "10px 16px", borderRadius: "12px",
                border: `1px solid ${colors.border}`, width: "280px"
              }}>
                <Search size={16} color={colors.textMuted} />
                <input
                  type="text"
                  placeholder="Search tickets, customers, shops..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: "13px", color: colors.textPrimary }}
                />
                {search && (
                  <button onClick={() => setSearch("")} style={{ border: "none", background: "none", cursor: "pointer", color: colors.textMuted }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* TICKETS TABLE */}
          <div style={{ background: "#fff", borderRadius: "18px", border: `1px solid ${colors.border}`, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: `1px solid ${colors.border}` }}>
                  <th style={{ padding: "16px 20px", fontSize: "12px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Ticket</th>
                  <th style={{ padding: "16px 20px", fontSize: "12px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Subject & Category</th>
                  <th style={{ padding: "16px 20px", fontSize: "12px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Customer</th>
                  <th style={{ padding: "16px 20px", fontSize: "12px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Linked Shop / Booking</th>
                  <th style={{ padding: "16px 20px", fontSize: "12px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Date</th>
                  <th style={{ padding: "16px 20px", fontSize: "12px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Status</th>
                  <th style={{ padding: "16px 20px", fontSize: "12px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ padding: "48px", textAlign: "center", color: colors.textMuted }}>
                      Loading support tickets...
                    </td>
                  </tr>
                ) : filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: "48px", textAlign: "center" }}>
                      <LifeBuoy size={36} color={colors.textMuted} style={{ marginBottom: "12px", opacity: 0.5 }} />
                      <div style={{ fontWeight: "700", color: colors.textPrimary, marginBottom: "4px" }}>No tickets found</div>
                      <div style={{ fontSize: "13px", color: colors.textSecondary }}>
                        {search || statusFilter !== "all" || categoryFilter !== "all" 
                          ? "Try clearing filters to see more results." 
                          : "Everything is quiet! There are currently no customer support tickets."}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map(ticket => (
                    <tr key={ticket.id} style={{ borderBottom: `1px solid ${colors.border}`, transition: "background 0.15s ease" }} onMouseEnter={e => e.currentTarget.style.background = "#fafafa"} onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                      
                      {/* Ticket Number & Priority */}
                      <td style={{ padding: "16px 20px", verticalAlign: "top" }}>
                        <div style={{ fontWeight: "800", fontSize: "13px", color: colors.navy, marginBottom: "4px" }}>
                          {ticket.ticketNumber || `#${ticket.id.slice(-6)}`}
                        </div>
                        {getPriorityBadge(ticket.priority)}
                      </td>

                      {/* Subject & Category */}
                      <td style={{ padding: "16px 20px", verticalAlign: "top", maxWidth: "280px" }}>
                        <div style={{ fontWeight: "700", fontSize: "14px", color: colors.textPrimary, marginBottom: "4px" }}>
                          {ticket.subject}
                        </div>
                        <div style={{ fontSize: "12px", color: colors.blue, fontWeight: "600" }}>
                          {ticket.category || "General"}
                        </div>
                        <div style={{ fontSize: "12px", color: colors.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "4px" }}>
                          {ticket.message}
                        </div>
                      </td>

                      {/* Customer */}
                      <td style={{ padding: "16px 20px", verticalAlign: "top" }}>
                        <div style={{ fontWeight: "700", fontSize: "13px", color: colors.textPrimary }}>
                          {ticket.customerName || "Customer"}
                        </div>
                        <div style={{ fontSize: "12px", color: colors.textSecondary }}>
                          {ticket.customerEmail || "No email"}
                        </div>
                      </td>

                      {/* Linked Shop / Booking */}
                      <td style={{ padding: "16px 20px", verticalAlign: "top" }}>
                        {ticket.shopName || ticket.bookingId ? (
                          <div>
                            {ticket.shopName && (
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "600", color: colors.textPrimary }}>
                                <Store size={14} color={colors.navy} /> {ticket.shopName}
                              </div>
                            )}
                            {ticket.bookingId && (
                              <div style={{ fontSize: "11px", color: colors.textSecondary, marginTop: "2px" }}>
                                Booking #{ticket.bookingId.slice(-6)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: "12px", color: colors.textMuted, fontStyle: "italic" }}>None</span>
                        )}
                      </td>

                      {/* Date */}
                      <td style={{ padding: "16px 20px", verticalAlign: "top", fontSize: "13px", color: colors.textSecondary }}>
                        {ticket.createdAt?.seconds 
                          ? new Date(ticket.createdAt.seconds * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) 
                          : "Unknown"}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "16px 20px", verticalAlign: "top" }}>
                        {getStatusBadge(ticket.status)}
                      </td>

                      {/* Action */}
                      <td style={{ padding: "16px 20px", verticalAlign: "top", textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                          <button
                            onClick={() => setSelectedTicket(ticket)}
                            style={{
                              background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`,
                              color: "#fff", border: "none", borderRadius: "10px",
                              padding: "8px 14px", fontSize: "12.5px", fontWeight: "700",
                              cursor: "pointer", display: "flex", alignItems: "center", gap: "6px"
                            }}
                          >
                            <Eye size={14} /> Review
                          </button>
                          <button
                            onClick={() => setConfirmDelete(ticket.id)}
                            style={{
                              background: colors.dangerBg, color: colors.danger, border: "none",
                              borderRadius: "10px", padding: "8px", cursor: "pointer"
                            }}
                            title="Dismiss ticket"
                          >
                            <Trash2 size={14} />
                          </button>
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

      {/* TICKET REVIEW & RESOLUTION MODAL */}
      {selectedTicket && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(15, 38, 64, 0.65)",
            backdropFilter: "blur(6px)",
            zIndex: 1300,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px",
            fontFamily: "'Inter', sans-serif"
          }}
          onClick={() => setSelectedTicket(null)}
        >
          <div
            style={{
              background: colors.white,
              width: "100%", maxWidth: "680px",
              maxHeight: "90vh",
              borderRadius: "24px",
              boxShadow: "0 25px 65px rgba(0,0,0,0.3)",
              display: "flex", flexDirection: "column",
              overflow: "hidden", position: "relative"
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* MODAL HEADER */}
            <div style={{
              background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`,
              color: "#fff", padding: "24px 28px", position: "relative"
            }}>
              <button
                onClick={() => setSelectedTicket(null)}
                style={{
                  position: "absolute", top: "20px", right: "20px",
                  background: "rgba(255,255,255,0.15)", border: "none",
                  width: "32px", height: "32px", borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "#fff"
                }}
              >
                <X size={18} />
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: "800", background: "rgba(255,255,255,0.2)", padding: "4px 10px", borderRadius: "8px" }}>
                  {selectedTicket.ticketNumber || `#${selectedTicket.id.slice(-6)}`}
                </span>
                <span style={{ fontSize: "12px", fontWeight: "700", background: "rgba(255,255,255,0.2)", padding: "4px 10px", borderRadius: "8px" }}>
                  {selectedTicket.category || "General Inquiry"}
                </span>
                {getPriorityBadge(selectedTicket.priority)}
              </div>

              <h2 style={{ margin: "0 0 4px 0", fontSize: "20px", fontWeight: "800", color: "#fff" }}>
                {selectedTicket.subject}
              </h2>
              <div style={{ fontSize: "13px", opacity: 0.85 }}>
                Submitted by <strong>{selectedTicket.customerName}</strong> ({selectedTicket.customerEmail})
              </div>
            </div>

            {/* MODAL BODY */}
            <div style={{ padding: "24px 28px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
              
              {/* CURRENT STATUS BAR */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "#f8fafc", padding: "14px 18px", borderRadius: "14px",
                border: `1px solid ${colors.border}`
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase" }}>Current Status:</span>
                  {getStatusBadge(selectedTicket.status)}
                </div>
                <div style={{ fontSize: "12px", color: colors.textMuted }}>
                  Created: {selectedTicket.createdAt?.seconds ? new Date(selectedTicket.createdAt.seconds * 1000).toLocaleString() : "Unknown"}
                </div>
              </div>

              {/* LINKED BOOKING / SHOP INFO */}
              {(selectedTicket.shopName || selectedTicket.bookingId) && (
                <div style={{
                  background: "rgba(42, 82, 152, 0.05)", border: `1px solid rgba(42, 82, 152, 0.15)`,
                  borderRadius: "14px", padding: "16px"
                }}>
                  <div style={{ fontSize: "11px", fontWeight: "800", color: colors.navy, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                    Associated Booking Reference
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", fontSize: "13px" }}>
                    <div>
                      <div style={{ color: colors.textSecondary, fontSize: "11px" }}>Auto Shop</div>
                      <div style={{ fontWeight: "700", color: colors.textPrimary }}>{selectedTicket.shopName || "N/A"}</div>
                    </div>
                    {selectedTicket.serviceType && (
                      <div>
                        <div style={{ color: colors.textSecondary, fontSize: "11px" }}>Service</div>
                        <div style={{ fontWeight: "700", color: colors.textPrimary }}>{selectedTicket.serviceType}</div>
                      </div>
                    )}
                    {selectedTicket.bookingId && (
                      <div>
                        <div style={{ color: colors.textSecondary, fontSize: "11px" }}>Booking ID</div>
                        <div style={{ fontWeight: "700", color: colors.textPrimary }}>#{selectedTicket.bookingId.slice(-6)}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CUSTOMER MESSAGE */}
              <div>
                <div style={{ fontSize: "12px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                  Customer's Inquiry / Complaint
                </div>
                <div style={{
                  background: "#f8fafc", border: `1px solid ${colors.border}`,
                  borderRadius: "14px", padding: "16px", fontSize: "14px",
                  color: colors.textPrimary, lineHeight: "1.6", whiteSpace: "pre-wrap"
                }}>
                  {selectedTicket.message}
                </div>
              </div>

              {/* ADMIN RESPONSE / RESOLUTION NOTES */}
              <div>
                <div style={{ fontSize: "12px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                  Admin Resolution Note & Customer Reply
                </div>
                <textarea
                  rows={4}
                  placeholder="Type your resolution note or message for the customer here (e.g. 'Investigated with shop owner, approved reschedule and issued 20% discount coupon')..."
                  value={adminResponse}
                  onChange={e => setAdminResponse(e.target.value)}
                  style={{
                    width: "100%", padding: "14px", borderRadius: "14px",
                    border: `1.5px solid ${colors.border}`, background: "#fff",
                    fontSize: "14px", color: colors.textPrimary, outline: "none",
                    fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", lineHeight: "1.5"
                  }}
                />
                <div style={{ fontSize: "12px", color: colors.textMuted, marginTop: "6px" }}>
                  Saving status will automatically dispatch an in-app alert with your response to the customer.
                </div>
              </div>

              {/* STATUS ACTION BUTTONS */}
              <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: "20px" }}>
                <div style={{ fontSize: "12px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>
                  Change Status & Notify Customer:
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    disabled={updating}
                    onClick={() => handleUpdateStatus("in_progress")}
                    style={{
                      flex: 1, padding: "12px 16px", borderRadius: "12px",
                      background: colors.infoBg, border: `1.5px solid ${colors.info}`,
                      color: colors.info, fontWeight: "700", fontSize: "13px",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
                    }}
                  >
                    <Clock size={16} /> Mark In Progress
                  </button>

                  <button
                    disabled={updating}
                    onClick={() => handleUpdateStatus("resolved")}
                    style={{
                      flex: 1, padding: "12px 16px", borderRadius: "12px",
                      background: colors.successBg, border: `1.5px solid ${colors.success}`,
                      color: colors.success, fontWeight: "700", fontSize: "13px",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
                    }}
                  >
                    <CheckCircle2 size={16} /> Mark Resolved
                  </button>

                  <button
                    disabled={updating}
                    onClick={() => handleUpdateStatus("closed")}
                    style={{
                      padding: "12px 16px", borderRadius: "12px",
                      background: "#f3f4f6", border: `1.5px solid ${colors.border}`,
                      color: colors.textSecondary, fontWeight: "700", fontSize: "13px",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
                    }}
                  >
                    <X size={16} /> Close Ticket
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
