import React, { useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";
import { colors, sh, ErrorModal, SuccessModal, CustomDropdown } from "../screens/dashboardShared";
import { 
  X, Search, HelpCircle, Send, ChevronDown, ChevronUp, 
  LifeBuoy, MessageSquare, AlertTriangle, CheckCircle2, Clock, FileText 
} from "lucide-react";

const FAQ_LIST = [
  {
    q: "How do I book an auto service?",
    category: "Bookings",
    a: "Select 'Book a Service' from your Customer Dashboard. Choose a nearby shop, select the required service (such as Oil Change or Brake Inspection), pick your preferred date and time, choose your registered vehicle, and confirm your appointment."
  },
  {
    q: "How do I track my active bookings?",
    category: "Bookings",
    a: "Navigate to 'Bookings History' from the dashboard or bottom navigation. Each booking displays its current progress status (Pending, In Progress, Completed, or Cancelled) with a live progress stepper."
  },
  {
    q: "How does payment work?",
    category: "Payments",
    a: "All service payments are currently settled face-to-face at the auto shop upon completion of the service. Once the mechanic finishes the work, the shop issues a digital receipt in the app detailing the final amount and date to pay."
  },
  {
    q: "How can I cancel or reschedule a booking?",
    category: "Bookings",
    a: "Open 'Bookings History', click on any booking in 'Pending' status, and tap 'Cancel this booking'. If your booking is already marked 'In Progress', please contact the shop directly or submit a support ticket."
  },
  {
    q: "How do I register or update my vehicles?",
    category: "Vehicles",
    a: "Tap 'My Vehicles' from the dashboard. You can add new vehicles by specifying the make, model, year, and plate number, as well as manage your existing car profiles."
  },
  {
    q: "What should I do if a shop doesn't respond or does poor work?",
    category: "Disputes",
    a: "You can tap 'Report an Issue with this Booking' directly from the booking details in Booking History, or report the shop directly on their shop profile page. Our platform admin team reviews all reports promptly."
  },
  {
    q: "How are auto shops verified on AutoBook?",
    category: "General",
    a: "Every auto shop and mechanic registered on AutoBook undergoes an identity and credentials verification process. Platform administrators review shop documentation before approving accounts for public booking."
  }
];

const TICKET_CATEGORIES = [
  "Booking Issue",
  "Shop & Service Dispute",
  "Payment / Billing Question",
  "Account & Login",
  "App Bug or Technical Glitch",
  "General Inquiry"
];

export default function HelpSupportModal({ onClose, userProfile, defaultTab = "faq" }) {
  const [activeTab, setActiveTab] = useState(defaultTab); // "faq" | "ticket" | "my_tickets"
  const [search, setSearch] = useState("");
  const [expandedFaq, setExpandedFaq] = useState(0);

  // New ticket state
  const [category, setCategory] = useState("General Inquiry");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [submitting, setSubmitting] = useState(false);

  // My tickets state
  const [myTickets, setMyTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  // Modals / Feedback
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const user = auth.currentUser;
  const uid = user?.uid || userProfile?.id;
  const email = user?.email || userProfile?.email || "";
  const name = userProfile?.name || user?.displayName || "Customer";

  // Listen to user's tickets
  useEffect(() => {
    if (!uid) {
      setLoadingTickets(false);
      return;
    }

    const q = query(
      collection(db, "supportTickets"),
      where("customerId", "==", uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setMyTickets(list);
      setLoadingTickets(false);
    }, (err) => {
      console.warn("Tickets snapshot error:", err);
      setLoadingTickets(false);
    });

    return () => unsub();
  }, [uid]);

  const handleSubmitTicket = async (e) => {
    e?.preventDefault();
    if (!subject.trim()) return setErrorMsg("Please provide a subject for your request.");
    if (!message.trim()) return setErrorMsg("Please enter a detailed message explaining your issue.");
    if (!uid) return setErrorMsg("You must be logged in to submit a support ticket.");

    setSubmitting(true);
    try {
      const ticketNumber = `AB-${Date.now().toString().slice(-6)}`;
      const docRef = await addDoc(collection(db, "supportTickets"), {
        ticketNumber,
        customerId: uid,
        customerName: name,
        customerEmail: email,
        category,
        subject: subject.trim(),
        message: message.trim(),
        priority,
        status: "open",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Notify platform admins
      await addDoc(collection(db, "adminAlerts"), {
        type: "support_ticket",
        ticketId: docRef.id,
        ticketNumber,
        title: `New Ticket: ${subject.trim()}`,
        message: `${name} (${category}): ${message.trim().slice(0, 100)}...`,
        read: false,
        createdAt: serverTimestamp(),
      });

      setSuccessMsg(`Ticket #${ticketNumber} created! Our support team has been notified and will review your request.`);
      setSubject("");
      setMessage("");
      setCategory("General Inquiry");
      setPriority("Normal");
      setActiveTab("my_tickets");
    } catch (err) {
      console.error("Failed to submit support ticket:", err);
      setErrorMsg("Failed to submit your support ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFaqs = FAQ_LIST.filter(f => 
    f.q.toLowerCase().includes(search.toLowerCase()) || 
    f.a.toLowerCase().includes(search.toLowerCase()) ||
    f.category.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status) => {
    switch ((status || "").toLowerCase()) {
      case "resolved":
        return <span style={{ background: colors.successBg, color: colors.success, padding: "4px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "4px" }}><CheckCircle2 size={12} /> Resolved</span>;
      case "in_progress":
      case "in progress":
        return <span style={{ background: colors.infoBg, color: colors.info, padding: "4px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "4px" }}><Clock size={12} /> In Progress</span>;
      case "closed":
        return <span style={{ background: "#f3f4f6", color: "#6b7280", padding: "4px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: "700" }}>Closed</span>;
      default:
        return <span style={{ background: colors.warningBg, color: colors.warning, padding: "4px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "4px" }}><Clock size={12} /> Open</span>;
    }
  };

  return (
    <>
      <ErrorModal error={errorMsg} onClose={() => setErrorMsg("")} />
      <SuccessModal message={successMsg} onClose={() => setSuccessMsg("")} />

      <div 
        style={{
          position: "fixed", inset: 0,
          background: "rgba(15, 38, 64, 0.65)",
          backdropFilter: "blur(6px)",
          zIndex: 1100,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "16px",
          fontFamily: "'Inter', system-ui, sans-serif"
        }}
        onClick={onClose}
      >
        <div 
          style={{
            background: colors.white,
            width: "100%", maxWidth: "620px",
            maxHeight: "90vh",
            borderRadius: "24px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            display: "flex", flexDirection: "column",
            overflow: "hidden",
            position: "relative"
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* HEADER */}
          <div style={{
            background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`,
            color: "#fff",
            padding: "24px 24px 18px",
            position: "relative"
          }}>
            <button
              onClick={onClose}
              style={{
                position: "absolute", top: "18px", right: "18px",
                background: "rgba(255,255,255,0.15)", border: "none",
                width: "32px", height: "32px", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#fff"
              }}
            >
              <X size={18} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <LifeBuoy size={20} color="#fff" />
              </div>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", letterSpacing: "-0.3px" }}>AutoBook Help & Support</h2>
            </div>
            <p style={{ margin: 0, fontSize: "13px", opacity: 0.85 }}>
              Find instant answers to common questions or submit a ticket to our team.
            </p>

            {/* TAB SELECTOR */}
            <div style={{
              display: "flex", gap: "8px", marginTop: "16px",
              background: "rgba(0,0,0,0.2)", padding: "4px", borderRadius: "12px"
            }}>
              <button
                onClick={() => setActiveTab("faq")}
                style={{
                  flex: 1, padding: "8px 12px", borderRadius: "8px", border: "none",
                  background: activeTab === "faq" ? colors.white : "transparent",
                  color: activeTab === "faq" ? colors.navy : "rgba(255,255,255,0.85)",
                  fontWeight: "700", fontSize: "13px", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  transition: "all 0.15s ease"
                }}
              >
                <HelpCircle size={15} /> FAQs
              </button>
              <button
                onClick={() => setActiveTab("ticket")}
                style={{
                  flex: 1, padding: "8px 12px", borderRadius: "8px", border: "none",
                  background: activeTab === "ticket" ? colors.white : "transparent",
                  color: activeTab === "ticket" ? colors.navy : "rgba(255,255,255,0.85)",
                  fontWeight: "700", fontSize: "13px", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  transition: "all 0.15s ease"
                }}
              >
                <Send size={15} /> Contact Support
              </button>
              <button
                onClick={() => setActiveTab("my_tickets")}
                style={{
                  flex: 1, padding: "8px 12px", borderRadius: "8px", border: "none",
                  background: activeTab === "my_tickets" ? colors.white : "transparent",
                  color: activeTab === "my_tickets" ? colors.navy : "rgba(255,255,255,0.85)",
                  fontWeight: "700", fontSize: "13px", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  transition: "all 0.15s ease", position: "relative"
                }}
              >
                <FileText size={15} /> My Tickets
                {myTickets.length > 0 && (
                  <span style={{
                    background: activeTab === "my_tickets" ? colors.navy : colors.accent,
                    color: activeTab === "my_tickets" ? "#fff" : colors.navy,
                    fontSize: "10px", padding: "1px 6px", borderRadius: "10px", fontWeight: "800"
                  }}>
                    {myTickets.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* BODY */}
          <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>

            {/* TAB 1: FAQs */}
            {activeTab === "faq" && (
              <div>
                <div style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  background: "#f8fafc", padding: "10px 14px", borderRadius: "12px",
                  border: `1px solid ${colors.border}`, marginBottom: "16px"
                }}>
                  <Search size={16} color={colors.textMuted} />
                  <input
                    type="text"
                    placeholder="Search topics (e.g., booking, payment, cancel)..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                      border: "none", outline: "none", background: "transparent",
                      width: "100%", fontSize: "13px", color: colors.textPrimary
                    }}
                  />
                  {search && (
                    <button 
                      onClick={() => setSearch("")} 
                      style={{ background: "none", border: "none", cursor: "pointer", color: colors.textMuted }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {filteredFaqs.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "36px 16px", color: colors.textSecondary }}>
                      <HelpCircle size={32} color={colors.textMuted} style={{ marginBottom: "8px" }} />
                      <div style={{ fontWeight: "700", marginBottom: "4px" }}>No answers found</div>
                      <div style={{ fontSize: "13px" }}>Try searching for a different keyword or submit a ticket directly.</div>
                    </div>
                  ) : (
                    filteredFaqs.map((faq, index) => {
                      const isOpen = expandedFaq === index;
                      return (
                        <div
                          key={index}
                          style={{
                            border: `1px solid ${isOpen ? colors.blue : colors.border}`,
                            borderRadius: "14px",
                            overflow: "hidden",
                            background: isOpen ? "#f8fafc" : "#fff",
                            transition: "all 0.2s ease"
                          }}
                        >
                          <div
                            onClick={() => setExpandedFaq(isOpen ? null : index)}
                            style={{
                              padding: "14px 16px",
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              cursor: "pointer",
                              userSelect: "none"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <span style={{
                                fontSize: "10px", fontWeight: "800", textTransform: "uppercase",
                                padding: "2px 8px", borderRadius: "6px",
                                background: isOpen ? "rgba(42, 82, 152, 0.1)" : "#f1f5f9",
                                color: isOpen ? colors.blue : colors.textSecondary
                              }}>
                                {faq.category}
                              </span>
                              <span style={{ fontSize: "14px", fontWeight: "700", color: colors.textPrimary }}>
                                {faq.q}
                              </span>
                            </div>
                            <span style={{ color: colors.textSecondary, marginLeft: "8px" }}>
                              {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </span>
                          </div>

                          {isOpen && (
                            <div style={{
                              padding: "0 16px 16px 16px",
                              fontSize: "13.5px",
                              color: colors.textSecondary,
                              lineHeight: "1.6",
                              borderTop: `1px solid ${colors.border}`,
                              paddingTop: "12px"
                            }}>
                              {faq.a}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* HELPFUL BANNER */}
                <div style={{
                  marginTop: "20px", padding: "16px", borderRadius: "14px",
                  background: colors.infoBg, border: `1px solid rgba(37, 99, 235, 0.15)`,
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px"
                }}>
                  <div>
                    <div style={{ fontWeight: "700", fontSize: "13.5px", color: colors.info, marginBottom: "2px" }}>Still have questions?</div>
                    <div style={{ fontSize: "12.5px", color: colors.textSecondary }}>Our team is here to assist you with any concern.</div>
                  </div>
                  <button
                    onClick={() => setActiveTab("ticket")}
                    style={{
                      background: colors.navy, color: "#fff", border: "none",
                      padding: "8px 14px", borderRadius: "10px", fontSize: "12.5px", fontWeight: "700",
                      cursor: "pointer", whiteSpace: "nowrap"
                    }}
                  >
                    Open Ticket
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: SUBMIT TICKET */}
            {activeTab === "ticket" && (
              <form onSubmit={handleSubmitTicket} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
                    Issue Category
                  </label>
                  <CustomDropdown
                    value={category}
                    onChange={setCategory}
                    options={TICKET_CATEGORIES.map(cat => ({ value: cat, label: cat }))}
                    placeholder="Select an issue category..."
                    style={{
                      width: "100%",
                      padding: "13px 40px 13px 16px",
                      borderRadius: "14px",
                      border: `1.5px solid ${colors.border}`,
                      backgroundColor: "#f8fafc",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: colors.textPrimary
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
                    Subject <span style={{ color: colors.danger }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Brief summary of your issue..."
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    style={{
                      width: "100%", padding: "12px 14px", borderRadius: "12px",
                      border: `1px solid ${colors.border}`, background: "#f8fafc",
                      fontSize: "14px", color: colors.textPrimary, outline: "none", boxSizing: "border-box"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
                    Priority
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {["Normal", "High", "Urgent"].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        style={{
                          flex: 1, padding: "8px 12px", borderRadius: "10px",
                          border: `1.5px solid ${priority === p ? colors.blue : colors.border}`,
                          background: priority === p ? "rgba(42, 82, 152, 0.08)" : "#fff",
                          color: priority === p ? colors.blue : colors.textSecondary,
                          fontWeight: "700", fontSize: "12px", cursor: "pointer"
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
                    Detailed Message <span style={{ color: colors.danger }}>*</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Please describe what happened, including any relevant booking details, dates, or error messages..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    style={{
                      width: "100%", padding: "12px 14px", borderRadius: "12px",
                      border: `1px solid ${colors.border}`, background: "#f8fafc",
                      fontSize: "14px", color: colors.textPrimary, outline: "none",
                      resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", lineHeight: "1.5"
                    }}
                  />
                </div>

                <div style={{ fontSize: "12px", color: colors.textMuted }}>
                  Logged in as: <strong>{name}</strong> ({email || "No email linked"})
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`,
                    color: "#fff", border: "none", borderRadius: "14px",
                    padding: "14px", fontSize: "14px", fontWeight: "700",
                    cursor: submitting ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    boxShadow: "0 4px 16px rgba(26,58,92,0.2)",
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  <Send size={16} />
                  {submitting ? "Submitting Ticket..." : "Submit Support Ticket"}
                </button>
              </form>
            )}

            {/* TAB 3: MY TICKETS */}
            {activeTab === "my_tickets" && (
              <div>
                {loadingTickets ? (
                  <div style={{ textAlign: "center", padding: "36px", color: colors.textMuted }}>
                    Loading your tickets...
                  </div>
                ) : myTickets.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 16px" }}>
                    <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: colors.infoBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                      <FileText size={24} color={colors.info} />
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: "700", color: colors.textPrimary, marginBottom: "4px" }}>
                      No support tickets yet
                    </div>
                    <p style={{ fontSize: "13px", color: colors.textSecondary, marginBottom: "16px" }}>
                      Whenever you submit a question or issue, you can track its progress and admin responses right here.
                    </p>
                    <button
                      onClick={() => setActiveTab("ticket")}
                      style={{
                        background: colors.navy, color: "#fff", border: "none",
                        padding: "10px 18px", borderRadius: "12px", fontSize: "13px", fontWeight: "700",
                        cursor: "pointer"
                      }}
                    >
                      Create a Ticket
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {myTickets.map(t => (
                      <div
                        key={t.id}
                        style={{
                          background: "#fff",
                          border: `1px solid ${colors.border}`,
                          borderRadius: "14px",
                          padding: "16px",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "12px", fontWeight: "800", color: colors.navy }}>
                              {t.ticketNumber || `#${t.id.slice(-6)}`}
                            </span>
                            <span style={{ fontSize: "11px", fontWeight: "700", color: colors.textSecondary, background: "#f3f4f6", padding: "2px 6px", borderRadius: "6px" }}>
                              {t.category || "General"}
                            </span>
                          </div>
                          {getStatusBadge(t.status)}
                        </div>

                        <div style={{ fontSize: "14px", fontWeight: "700", color: colors.textPrimary, marginBottom: "6px" }}>
                          {t.subject}
                        </div>

                        <div style={{ fontSize: "13px", color: colors.textSecondary, lineHeight: "1.5", marginBottom: "10px", background: "#f8fafc", padding: "10px", borderRadius: "8px" }}>
                          {t.message}
                        </div>

                        {/* ADMIN RESOLUTION NOTE IF ANY */}
                        {t.adminNotes && (
                          <div style={{
                            background: "#f0fdf4", border: "1px solid #bbf7d0",
                            padding: "10px 12px", borderRadius: "10px",
                            fontSize: "12.5px", color: "#166534", marginBottom: "10px"
                          }}>
                            <div style={{ fontWeight: "800", textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.5px", marginBottom: "2px" }}>
                              Admin Resolution Note:
                            </div>
                            {t.adminNotes}
                          </div>
                        )}

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: colors.textMuted }}>
                          <span>Priority: <strong>{t.priority || "Normal"}</strong></span>
                          <span>
                            {t.createdAt?.seconds 
                              ? new Date(t.createdAt.seconds * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) 
                              : "Just now"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
