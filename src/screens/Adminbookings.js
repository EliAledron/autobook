import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, updateDoc, doc, getDoc, addDoc, serverTimestamp, query, where, deleteDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { sh, colors, EmptyState, getInitials } from "./dashboardShared";
import SkeletonLoader from "./SkeletonLoader";
import TopbarAvatar from "./TopbarAvatar";
import BackButton from "../components/BackButton";

const STATUS_TABS = ["All", "Pending", "In Progress", "Completed", "Cancelled"];

const statusStyle = (status) => {
  switch ((status || "").toLowerCase()) {
    case "completed":   return sh.badge(colors.successBg, colors.success);
    case "in progress": return sh.badge(colors.infoBg, colors.info);
    case "cancelled":   return sh.badge(colors.dangerBg, colors.danger);
    default:            return sh.badge(colors.warningBg, colors.warning);
  }
};

const statusIcon = (status) => {
  switch ((status || "").toLowerCase()) {
    case "completed":   return "✅";
    case "in progress": return "🔧";
    case "cancelled":   return "❌";
    default:            return "🕐";
  }
};

const getSortTime = (booking) => {
  if (booking.createdAt?.toDate) return booking.createdAt.toDate().getTime();
  if (booking.createdAt?.seconds) return booking.createdAt.seconds * 1000;
  if (booking.date) return new Date(booking.date).getTime();
  return 0;
};

function timeAgo(timestamp) {
  if (!timestamp) return "Just now";
  let ts;
  if (timestamp.toDate) ts = timestamp.toDate().getTime();
  else if (timestamp.seconds) ts = timestamp.seconds * 1000;
  else if (typeof timestamp === 'number') ts = timestamp;
  else ts = new Date(timestamp).getTime();

  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

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
  @keyframes pulse-warning {
    0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
    70% { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); }
    100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
  }
  @keyframes ab-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }
  @keyframes ab-slide-right-to-center {
    from { transform: translateX(100vw); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes ab-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes ab-slide-up {
    from { transform: translateY(100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  
  /* Mobile View Fixes */
  @media (max-width: 600px) {
    .calendar-grid { gap: 4px !important; }
    .calendar-cell { min-height: 60px !important; padding: 4px 2px !important; border-radius: 8px !important; }
    .booking-badge { padding: 4px 0 !important; width: 100%; border-radius: 6px !important; }
    .booking-badge-text { display: none !important; }
    .booking-badge-dot { display: block !important; font-size: 11px !important; }
    .calendar-day-header { font-size: 10px !important; }
    
    .overview-card { flex-direction: column !important; text-align: center !important; gap: 12px !important; }
    .overview-stats { width: 100% !important; }
  }
`;

export default function AdminBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  // FIX: combined mechanic list from both users collection and shopMechanics collection
  const [mechanics, setMechanics] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("All");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newMechanic, setNewMechanic] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentShop, setCurrentShop] = useState(null);
  const [dailyCapacity, setDailyCapacity] = useState(8);
  const [savingCapacity, setSavingCapacity] = useState(false);

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

    const fetchAll = async (userObj) => {
      setLoading(true);
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

      if (!isAdmin && shopId) {
        try {
          const sDoc = await getDoc(doc(db, "shops", shopId));
          if (sDoc.exists()) {
            const sData = { id: sDoc.id, ...sDoc.data() };
            setCurrentShop(sData);
            setDailyCapacity(sData.dailyCapacity || 8);
          }
        } catch (e) {}
      }

      let originalShopId = userObj?.shopId;
      let bList = [];
      let smList = [];
      let uList = [];

      if (isAdmin) {
        const [bSnap, smSnap, uSnap] = await Promise.all([
          getDocs(collection(db, "bookings")),
          getDocs(collection(db, "shopMechanics")),
          getDocs(collection(db, "users"))
        ]);
        bList = bSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        smList = smSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        uList = uSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } else {
        const [bSnap1, smSnap1, uSnap] = await Promise.all([
          getDocs(query(collection(db, "bookings"), where("shopId", "==", shopId || "invalid"))),
          getDocs(query(collection(db, "shopMechanics"), where("shopId", "==", shopId || "invalid"))),
          getDocs(collection(db, "users"))
        ]);
        
        bList = bSnap1.docs.map((d) => ({ id: d.id, ...d.data() }));
        smList = smSnap1.docs.map((d) => ({ id: d.id, ...d.data() }));
        uList = uSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        if (originalShopId && originalShopId !== shopId) {
          try {
            const bSnapOld = await getDocs(query(collection(db, "bookings"), where("shopId", "==", originalShopId)));
            bList = [...bList, ...bSnapOld.docs.map((d) => ({ id: d.id, ...d.data() }))];
            const smSnapOld = await getDocs(query(collection(db, "shopMechanics"), where("shopId", "==", originalShopId)));
            const smListOld = smSnapOld.docs.map((d) => ({ id: d.id, ...d.data() }));
            smList = [...smList, ...smListOld];
          } catch(e) {}
        }

        if (userObj?.shopName) {
          try {
            const bSnap2 = await getDocs(query(collection(db, "bookings"), where("shopName", "==", userObj.shopName)));
            bList = [...bList, ...bSnap2.docs.map((d) => ({ id: d.id, ...d.data() }))];
          } catch(e) {}
        }

        try {
          const allBsnap = await getDocs(collection(db, "bookings"));
          const sName = (userObj?.shopName || "").toUpperCase();
          const myBList = allBsnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(b => {
             const bName = (b.shopName || "").toUpperCase();
             if (b.shopId === shopId) return true;
             if (originalShopId && b.shopId === originalShopId) return true;
             if (sName && bName === sName) return true;
             if (sName.includes("JME") && (b.shopId === "JME" || bName.includes("JME"))) return true;
             if (sName.includes("GRHE") && (b.shopId === "GRHE" || bName.includes("GRHE"))) return true;
             if (shopId === "JME" && bName.includes("JME")) return true;
             if (shopId === "GRHE" && bName.includes("GRHE")) return true;
             return false;
          });
          bList = [...bList, ...myBList];
        } catch(e) {}

        bList = Array.from(new Map(bList.map(b => [b.id, b])).values());
        smList = Array.from(new Map(smList.map(m => [m.id, m])).values());

        if (userObj?.id) {
          try {
            const smSnap2 = await getDocs(query(collection(db, "shopMechanics"), where("ownerId", "==", userObj.id)));
            const smList2 = smSnap2.docs.map((d) => ({ id: d.id, ...d.data() }));
            const mergedSm = [...smList, ...smList2];
            smList = Array.from(new Map(mergedSm.map(m => [m.id, m])).values());
          } catch (e) {}
        }
      }

      setBookings(bList);

      const shopMechanics = smList.map((m) => ({
        id: m.id,
        shopId: m.shopId,
        ownerId: m.ownerId,
        displayName: m.name || m.displayName || "Mechanic",
        specialization: m.specialization || "General",
        specializations: m.specializations || [],
        available: m.available !== false,
      }));

      setMechanics(shopMechanics);
      setUsers(uList);
      setLoading(false);
    };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveCapacity = async () => {
    if (!currentShop?.id) return;
    setSavingCapacity(true);
    try {
      await updateDoc(doc(db, "shops", currentShop.id), { dailyCapacity: Number(dailyCapacity) || 8 });
      setCurrentShop(prev => ({ ...prev, dailyCapacity: Number(dailyCapacity) || 8 }));
      showToast("✅ Daily capacity updated successfully!");
    } catch (e) {
      showToast("❌ Failed to update daily capacity.");
    }
    setSavingCapacity(false);
  };

  // Helper: look up mechanic display name from combined list, with fallback to saved name
  const getMechanicName = (mechanicId, fallbackName) => {
    const found = mechanics.find((m) => m.id === mechanicId);
    return found?.displayName || fallbackName || "Unknown Mechanic";
  };

  // Helper: look up customer display name to prevent raw IDs from showing
  const getCustomerName = (booking) => {
    if (!booking) return "Unknown Customer";
    if (booking.customerName) return booking.customerName;
    const uid = booking.customerId || booking.userId;
    if (!uid) return "Unknown Customer";
    const found = users.find((u) => u.id === uid);
    return found?.displayName || found?.name || found?.email || "Unknown Customer";
  };

  const filtered = bookings
    .filter((b) => {
      if (activeTab !== "All" && (b.status || "Pending").toLowerCase() !== activeTab.toLowerCase()) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        const matchService = (b.serviceType || "").toLowerCase().includes(s);
        const matchCustomer = getCustomerName(b).toLowerCase().includes(s);
        const matchMechanic = getMechanicName(b.mechanicId, b.mechanicName).toLowerCase().includes(s);
        const matchVehicle = (b.vehicleLabel || "").toLowerCase().includes(s);
        const matchDate = (b.date || "").toLowerCase().includes(s);
        
        let matchFormattedDate = false;
        if (b.date) {
          const parts = b.date.split("-");
          if (parts.length === 3) {
            const formatted = new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toLowerCase();
            matchFormattedDate = formatted.includes(s);
          }
        }
        if (!matchService && !matchCustomer && !matchMechanic && !matchVehicle && !matchDate && !matchFormattedDate) return false;
      }
      return true;
    })

  // Sort data by creation time (descending)
  const displayData = [...filtered].sort((a, b) => getSortTime(b) - getSortTime(a));

  // Calendar Logic
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMon = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();
  const days = Array(startDay).fill(null).concat(Array.from({ length: daysInMon }, (_, i) => i + 1));
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const bookingsByDate = {};
  bookings.forEach((b) => {
    const d = b.date ? b.date.trim() : "No date";
    if (!bookingsByDate[d]) bookingsByDate[d] = [];
    bookingsByDate[d].push(b);
  });

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => (b.status || "Pending").toLowerCase() === "pending").length,
    inProgress: bookings.filter((b) => (b.status || "").toLowerCase() === "in progress").length,
    completed: bookings.filter((b) => (b.status || "").toLowerCase() === "completed").length,
    cancelled: bookings.filter((b) => (b.status || "").toLowerCase() === "cancelled").length,
  };

  const handleSave = async () => {
    if (!selected) return;

    if ((newStatus === "In Progress" || newStatus === "Completed") && !newMechanic) {
      showToast(`❌ Cannot set to ${newStatus} without an assigned mechanic.`);
      return;
    }

    setSaving(true);
    try {
      const updates = {};
      if (newStatus) updates.status = newStatus;
      if (newMechanic !== undefined) updates.mechanicId = newMechanic || null;
      
      const parsedPrice = newPrice !== "" ? newPrice : undefined;
      if (parsedPrice !== undefined) updates.price = parsedPrice;

      // FIX: also store mechanicName so reports can display it
      if (newMechanic) {
        updates.mechanicName = getMechanicName(newMechanic);
      }

      await updateDoc(doc(db, "bookings", selected.id), updates);

      // Notify customer if price was just set by the admin
      if (parsedPrice !== undefined && selected.price === undefined && selected.customerId) {
        await addDoc(collection(db, "notifications"), {
          userId: selected.customerId,
          title: "Service Quote Updated 💰",
          message: `${selected.shopName || "The shop"} has set a price of ₱${parsedPrice} for your ${selected.serviceType || "service"}.`,
          type: "status_update",
          bookingId: selected.id,
          read: false,
          createdAt: serverTimestamp(),
        });
      }

      if (newStatus === "Pending" && selected.status !== "Pending" && selected.customerId) {
        await addDoc(collection(db, "notifications"), {
          userId: selected.customerId,
          title: "Booking Status Updated 🔄",
          message: `Your booking for ${selected.serviceType || "a service"} at ${selected.shopName || "the shop"} has been moved back to Pending.`,
          type: "status_update",
          bookingId: selected.id,
          read: false,
          createdAt: serverTimestamp(),
        });
      }

      if (newStatus === "Cancelled" && selected.status !== "Cancelled" && selected.customerId) {
        await addDoc(collection(db, "notifications"), {
          userId: selected.customerId,
          title: "Booking Cancelled ❌",
          message: `Your booking for ${selected.serviceType || "a service"} has been cancelled by ${selected.shopName || "the shop"}.`,
          type: "status_update",
          bookingId: selected.id,
          read: false,
          createdAt: serverTimestamp(),
        });
      }

      if (newStatus === "Completed" && selected.status !== "Completed" && selected.customerId) {
        await addDoc(collection(db, "notifications"), {
          userId: selected.customerId,
          title: "Job Completed! ✅",
          message: `Your booking for ${selected.serviceType || "a service"} at ${selected.shopName || "the shop"} has been marked as completed. Thank you for choosing us!`,
          type: "status_update",
          bookingId: selected.id,
          read: false,
          createdAt: serverTimestamp(),
        });
      }

      const assignedMechanicId = newMechanic;
      const previousMechanicId = selected.mechanicId || "";

      if (assignedMechanicId && assignedMechanicId !== previousMechanicId) {
        const mechanicName = getMechanicName(assignedMechanicId);
        // Notify the customer
        if (selected.customerId) {
          await addDoc(collection(db, "notifications"), {
            userId: selected.customerId,
            title: "Mechanic Assigned 🔧",
            message: `Your booking for ${selected.serviceType || "a service"} at ${selected.shopName || "the shop"} on ${selected.date || "your scheduled date"} has been confirmed and assigned to ${mechanicName}. Your mechanic will begin work soon!`,
            type: "booking_confirmed",
            bookingId: selected.id,
            read: false,
            createdAt: serverTimestamp(),
          });
        }
        showToast(`✅ Assigned to ${mechanicName} — notified!`);
      } else {
        showToast("✅ Booking updated successfully!");
      }

      setBookings((prev) => {
        const nextBookings = prev.map((b) => (b.id === selected.id ? { ...b, ...updates } : b));
        const mechanicsToUpdate = Array.from(new Set([previousMechanicId, assignedMechanicId].filter(Boolean)));
        mechanicsToUpdate.forEach(async (mId) => {
          const hasActive = nextBookings.some(b => b.mechanicId === mId && (b.status || "Pending") === "In Progress");
          try {
            await updateDoc(doc(db, "shopMechanics", mId), { available: !hasActive });
            setMechanics((mPrev) => mPrev.map((m) => m.id === mId ? { ...m, available: !hasActive } : m));
          } catch(e) {}
        });
        return nextBookings;
      });
      setSelected(null);
      setNewMechanic("");
      setNewStatus("");
      setNewPrice("");
    } catch (e) {
      console.error(e);
      showToast("❌ Failed to save changes.");
    }
    setSaving(false);
  };

  const handleDelete = () => {
    if (!selected) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "bookings", selected.id));
      const mId = selected.mechanicId;
      setBookings((prev) => {
        const nextBookings = prev.filter((b) => b.id !== selected.id);
        if (mId) {
          const hasActive = nextBookings.some(b => b.mechanicId === mId && (b.status || "Pending") === "In Progress");
          updateDoc(doc(db, "shopMechanics", mId), { available: !hasActive }).catch(()=>{});
          setMechanics((mPrev) => mPrev.map((m) => m.id === mId ? { ...m, available: !hasActive } : m));
        }
        return nextBookings;
      });
      setShowDeleteConfirm(false);
      setSelected(null);
      showToast("🗑️ Booking deleted successfully.");
    } catch (e) {
      console.error("Failed to delete booking:", e);
      showToast("❌ Failed to delete booking.");
    }
    setDeleting(false);
  };

  const inputStyle = {
    width: "100%", padding: "14px 16px", borderRadius: "14px",
    border: `1.5px solid ${colors.border}`, fontSize: "14px",
    background: "#f9fafb", color: colors.textPrimary,
    fontFamily: "inherit", boxSizing: "border-box", outline: "none",
    transition: "all 0.2s ease",
  };

  const renderBookingCard = (b) => {
    const isNewBooking = !b.mechanicId && (b.status || "Pending").toLowerCase() === "pending";

    return (
    <div key={b.id} style={{
      background: isNewBooking ? "#fff5f5" : colors.white,
      borderRadius: "16px",
      border: isNewBooking ? `1px solid ${colors.danger}40` : `1px solid ${colors.border}`,
      borderLeft: isNewBooking ? `5px solid ${colors.danger}` : `1px solid ${colors.border}`,
      boxShadow: isNewBooking ? "0 4px 16px rgba(220,38,38,0.12)" : "0 4px 12px rgba(0,0,0,0.05)",
      padding: "16px",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
    }} 
    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = isNewBooking ? "0 8px 24px rgba(220,38,38,0.2)" : "0 8px 24px rgba(0,0,0,0.1)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = isNewBooking ? "0 4px 16px rgba(220,38,38,0.12)" : "0 4px 12px rgba(0,0,0,0.05)"; }}
    onClick={() => {
      setSelected(b);
      setNewStatus(b.status || "Pending");
      setNewMechanic(b.mechanicId || "");
      setNewPrice(b.price !== undefined ? String(b.price) : "");
    }}>
      {/* Header: Status & Price */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={statusStyle(b.status)}>{b.status || "Pending"}</span>
          {isNewBooking && (
            <span style={{ fontSize: "10px", fontWeight: "800", background: colors.danger, color: "#fff", padding: "3px 6px", borderRadius: "6px", letterSpacing: "0.5px", boxShadow: "0 2px 4px rgba(220,38,38,0.3)" }}>NEW</span>
          )}
        </div>
        {b.price !== undefined ? (
          <span style={{ fontSize: "15px", fontWeight: "800", color: colors.navy }}>₱{String(b.price).includes('-') || String(b.price).includes('+') ? b.price : Number(b.price).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
        ) : (
          <span style={{ fontSize: "11px", color: colors.danger, fontWeight: "700", background: colors.dangerBg, padding: "4px 8px", borderRadius: "8px" }}>⚠ Set price</span>
        )}
      </div>

      {/* Main Info */}
      <div>
        <div style={{ fontWeight: "800", fontSize: "16px", color: colors.textPrimary, marginBottom: "8px", lineHeight: 1.3 }}>
          {b.serviceType || "Service"}
        </div>
        <div style={{ fontSize: "13px", color: colors.textSecondary, display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <span style={{ fontSize: "14px" }}>👤</span> {getCustomerName(b)}
        </div>
        <div style={{ fontSize: "13px", color: colors.textSecondary, display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <span style={{ fontSize: "14px" }}>📅</span> {b.date || "No date"} {b.time && `• ${b.time}`}
        </div>
        {b.vehicleLabel && (
          <div style={{ fontSize: "13px", color: colors.textSecondary, display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "14px" }}>🚗</span> {b.vehicleLabel}
          </div>
        )}
      </div>

      {/* Footer: Mechanic & Time Ago */}
      <div style={{ marginTop: "auto", paddingTop: "12px", borderTop: `1px solid ${colors.bg}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {b.mechanicId ? (
          <div style={{ fontSize: "12px", color: colors.info, fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: colors.infoBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>
              {getInitials(getMechanicName(b.mechanicId, b.mechanicName))}
            </div>
            {getMechanicName(b.mechanicId, b.mechanicName)}
          </div>
        ) : (
          <div style={{ fontSize: "11px", color: colors.warning, fontWeight: "800", display: "flex", alignItems: "center", gap: "6px", background: colors.warningBg, padding: "4px 10px", borderRadius: "8px", border: `1px solid ${colors.warning}40`, animation: "pulse-warning 2s infinite" }}>
            <span style={{ fontSize: "14px" }}>⚠️</span> Needs Mechanic
          </div>
        )}
        <div style={{ fontSize: "11px", color: colors.textMuted, fontWeight: "600" }}>{timeAgo(b.createdAt)}</div>
      </div>
    </div>
    );
  };

  return (
    <div style={sh.page}>
      <style>{keyframes}</style>

      {toast && (
        <div style={{
          position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)",
          background: colors.navy, color: "#fff", padding: "10px 20px",
          borderRadius: "12px", fontSize: "13px", fontWeight: "600",
          zIndex: 999, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", whiteSpace: "nowrap",
        }}>
          {toast}
        </div>
      )}

      {/* TOPBAR */}
      <div style={sh.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <BackButton />
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
        <div style={sh.rolePill}><div style={sh.roleDot} /><span style={sh.roleText}>Bookings</span></div>
        <div style={sh.heroGreeting}>Service Bookings</div>
        <div style={sh.heroSub}>Monitor, reassign, and manage all bookings.</div>
      </div>

      <div style={sh.content}>
        {/* STATS */}
        <div style={sh.sectionLabel}>Overview</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px", marginBottom: "1rem" }}>
          <div className="overview-card" style={{ ...sh.card, display: "flex", alignItems: "center", gap: "20px", marginBottom: 0 }}>
            <div style={{
              width: "120px", height: "60px", flexShrink: 0, position: "relative", overflow: "hidden",
              display: "flex", alignItems: "flex-end", justifyContent: "center"
            }}>
              <div style={{
                position: "absolute", top: 0, left: 0, width: "120px", height: "120px", borderRadius: "50%",
                background: stats.total > 0
                ? `conic-gradient(from 270deg,
                    ${colors.warning} 0% ${(stats.pending / stats.total) * 50}%,
                    ${colors.info} ${(stats.pending / stats.total) * 50}% ${((stats.pending + stats.inProgress) / stats.total) * 50}%,
                    ${colors.success} ${((stats.pending + stats.inProgress) / stats.total) * 50}% ${((stats.pending + stats.inProgress + stats.completed) / stats.total) * 50}%,
                    ${colors.danger} ${((stats.pending + stats.inProgress + stats.completed) / stats.total) * 50}% 50%,
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
                <span style={{ fontSize: "8px", color: colors.textSecondary, fontWeight: "700", marginTop: "2px" }}>JOBS</span>
              </div>
            </div>

            <div className="overview-stats" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: colors.warning }}></div>
                  <span style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "600" }}>Pending</span>
                </div>
                <span style={{ fontSize: "13px", fontWeight: "800", color: colors.textPrimary }}>{stats.pending}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: colors.info }}></div>
                  <span style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "600" }}>In Progress</span>
                </div>
                <span style={{ fontSize: "13px", fontWeight: "800", color: colors.textPrimary }}>{stats.inProgress}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: colors.success }}></div>
                  <span style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "600" }}>Completed</span>
                </div>
                <span style={{ fontSize: "13px", fontWeight: "800", color: colors.textPrimary }}>{stats.completed}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: colors.danger }}></div>
                  <span style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "600" }}>Cancelled</span>
                </div>
                <span style={{ fontSize: "13px", fontWeight: "800", color: colors.textPrimary }}>{stats.cancelled}</span>
              </div>
            </div>
          </div>
        </div>

        {!loading && (currentUser?.role || "").toLowerCase() !== "admin" && currentShop && (
          <div style={{ ...sh.card, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", flexWrap: "wrap", gap: "12px", marginBottom: "1rem" }}>
            <div>
              <div style={{ fontWeight: "800", color: colors.textPrimary, fontSize: "14px", marginBottom: "2px" }}>Daily Booking Capacity</div>
              <div style={{ fontSize: "12px", color: colors.textSecondary }}>Set the maximum number of jobs your shop can take per day.</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input 
                type="number" 
                style={{ width: "64px", padding: "8px 12px", borderRadius: "10px", border: `1.5px solid ${colors.border}`, outline: "none", fontSize: "14px", fontWeight: "700", textAlign: "center", color: colors.textPrimary }} 
                value={dailyCapacity} 
                onChange={(e) => setDailyCapacity(e.target.value)} 
                min="1" 
              />
              <button 
                onClick={handleSaveCapacity} 
                disabled={savingCapacity || Number(dailyCapacity) === (currentShop.dailyCapacity || 8)} 
                style={{ 
                  background: Number(dailyCapacity) === (currentShop.dailyCapacity || 8) ? colors.bg : colors.navy, 
                  color: Number(dailyCapacity) === (currentShop.dailyCapacity || 8) ? colors.textMuted : "#fff", 
                  border: "none", padding: "8px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: "700", 
                  cursor: Number(dailyCapacity) === (currentShop.dailyCapacity || 8) ? "default" : "pointer", 
                  transition: "all 0.2s" 
                }}
              >
                {savingCapacity ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}

        {!loading && bookings.length > 0 && (
          <>
            <div style={{ ...sh.card, padding: "20px", border: `1px solid ${colors.border}` }}>
              {(() => {
                const currentYearNum = new Date().getFullYear();
                const bookingYears = Array.from(new Set(
                  bookings.map(b => {
                    if (!b.date) return null;
                    const match = String(b.date).match(/\b(20\d{2})\b/);
                    return match ? parseInt(match[1], 10) : null;
                  }).filter(Boolean)
                ));
                const minYear = Math.min(currentYearNum - 2, ...bookingYears.length ? bookingYears : [currentYearNum]);
                const maxYear = Math.max(currentYearNum + 5, ...bookingYears.length ? bookingYears : [currentYearNum]);
                const yearOptions = [];
                for(let y = minYear; y <= maxYear; y++) yearOptions.push(y);
                return (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
                    <button onClick={prevMonth} style={{ background: colors.bg, border: `1px solid ${colors.border}`, padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', color: colors.textSecondary, flexShrink: 0 }}>←</button>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <select 
                        value={month} 
                        onChange={(e) => setCurrentDate(new Date(year, Number(e.target.value), 1))}
                        style={{ padding: '6px 12px', borderRadius: '10px', border: `1px solid ${colors.border}`, fontSize: '14px', fontWeight: '800', color: colors.navy, background: colors.white, fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}
                      >
                        {monthNames.map((m, i) => <option key={m} value={i}>{m}</option>)}
                      </select>
                      <select 
                        value={year} 
                        onChange={(e) => setCurrentDate(new Date(Number(e.target.value), month, 1))}
                        style={{ padding: '6px 12px', borderRadius: '10px', border: `1px solid ${colors.border}`, fontSize: '14px', fontWeight: '800', color: colors.navy, background: colors.white, fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}
                      >
                        {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <button onClick={() => setCurrentDate(new Date())} style={{ background: colors.infoBg, color: colors.info, border: "none", padding: '6px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>Today</button>
                    </div>
                    <button onClick={nextMonth} style={{ background: colors.bg, border: `1px solid ${colors.border}`, padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', color: colors.textSecondary, flexShrink: 0 }}>→</button>
                  </div>
                );
              })()}

              <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="calendar-day-header" style={{ textAlign: 'center', fontSize: '12px', fontWeight: '800', color: colors.textMuted, textTransform: "uppercase", marginBottom: "4px" }}>{d}</div>
                ))}
                {days.map((day, idx) => {
                  if (day === null) return <div key={`empty-${idx}`} />;
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const dayBookings = bookingsByDate[dateStr] || [];
                  const hasBookings = dayBookings.length > 0;
                  const hasNewUnassigned = dayBookings.some(b => !b.mechanicId && (b.status || "Pending").toLowerCase() === "pending");
                  
                  return (
                    <div 
                      key={dateStr}
                      className="calendar-cell"
                      onClick={() => { if (hasBookings) setSelectedDateStr(dateStr); }}
                      style={{
                        position: 'relative',
                        background: hasBookings ? colors.infoBg : "#f9fafb",
                        border: `1.5px solid ${hasBookings ? colors.info : "transparent"}`,
                        borderRadius: '14px',
                        padding: '10px 4px',
                        minHeight: '84px',
                        cursor: hasBookings ? 'pointer' : 'default',
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        transition: "all 0.2s",
                        boxShadow: hasBookings ? "0 4px 12px rgba(37,99,235,0.15)" : "inset 0 2px 4px rgba(0,0,0,0.02)"
                      }}
                      onMouseEnter={(e) => { if(hasBookings) e.currentTarget.style.transform = "scale(1.05)"; }}
                      onMouseLeave={(e) => { if(hasBookings) e.currentTarget.style.transform = "scale(1)"; }}
                    >
                      <span style={{ fontSize: '15px', fontWeight: '800', color: hasBookings ? colors.navy : colors.textMuted }}>{day}</span>
                      {hasNewUnassigned && (
                        <div style={{ position: "absolute", top: "-6px", right: "-6px", background: colors.danger, color: "#fff", fontSize: "9px", fontWeight: "800", padding: "3px 6px", borderRadius: "10px", boxShadow: "0 2px 4px rgba(220,38,38,0.3)", zIndex: 5, animation: "ab-bounce 2s infinite" }}>
                          NEW
                        </div>
                      )}
                      {hasBookings && (
                        <div className="booking-badge" style={{ marginTop: 'auto', background: colors.info, color: '#fff', fontSize: '11px', fontWeight: '700', padding: '4px 8px', borderRadius: '10px', textAlign: "center", lineHeight: 1.2 }}>
                          <span className="booking-badge-text">{dayBookings.length} booking{dayBookings.length > 1 ? 's' : ''}</span>
                          <span className="booking-badge-dot" style={{ display: 'none' }}>{dayBookings.length}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {bookingsByDate["No date"] && bookingsByDate["No date"].length > 0 && (
              <div onClick={() => setSelectedDateStr("No date")} style={{ ...sh.card, cursor: "pointer", background: colors.warningBg, border: `1.5px solid ${colors.warning}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ fontWeight: "800", color: colors.warning }}>⚠ Bookings with no specified date</div>
                <div style={{ background: colors.warning, color: "#fff", padding: "4px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: "700" }}>{bookingsByDate["No date"].length} booking{bookingsByDate["No date"].length > 1 ? 's' : ''}</div>
              </div>
            )}
          </>
        )}

        {/* STATUS TABS */}
        <div style={sh.sectionLabel}>Filter by status</div>
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", marginBottom: "1rem", paddingBottom: "4px" }}>
          {STATUS_TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "6px 14px", borderRadius: "20px",
              border: activeTab === tab ? "none" : `1px solid ${colors.border}`,
              cursor: "pointer", fontSize: "12px", fontWeight: "600", whiteSpace: "nowrap",
              fontFamily: "inherit",
              background: activeTab === tab ? `linear-gradient(135deg, ${colors.navy}, ${colors.blue})` : colors.white,
              color: activeTab === tab ? "#fff" : colors.textSecondary,
              boxShadow: activeTab === tab ? "0 2px 8px rgba(26,58,92,0.25)" : "none",
              transition: "all 0.2s ease",
            }}>
              {tab}
            </button>
          ))}
        </div>

        {/* SEARCH BAR */}
        <div style={{ ...sh.sectionLabel, marginTop: "0.5rem" }}>Search Bookings</div>
        <div style={{ position: "relative", marginBottom: "1.5rem" }}>
          <svg style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", width: "18px", height: "18px", color: colors.textMuted, pointerEvents: "none" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            placeholder="Search by customer, service, mechanic, or vehicle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "14px 40px",
              borderRadius: "24px", border: `1px solid transparent`,
              fontSize: "14px", backgroundColor: "#f1f5f9",
              color: colors.textPrimary, fontFamily: "inherit",
              boxSizing: "border-box", outline: "none",
              transition: "all 0.2s ease",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)"
            }}
            onFocus={(e) => { e.target.style.border = `1px solid ${colors.blue}`; e.target.style.backgroundColor = colors.white; e.target.style.boxShadow = "0 4px 12px rgba(42,82,152,0.1)"; }}
            onBlur={(e) => { e.target.style.border = `1px solid transparent`; e.target.style.backgroundColor = "#f1f5f9"; e.target.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.02)"; }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "#e2e8f0", border: "none", borderRadius: "50%", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#475569" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        {/* BOOKINGS LIST */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <div style={{...sh.sectionLabel, marginBottom: 0}}>Bookings ({filtered.length})</div>
        </div>

        {loading ? (
          <SkeletonLoader count={3} type="card" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="📅"
            title="No bookings found"
            subtitle="There are no bookings matching your current filter criteria."
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
            {displayData.map((b) => renderBookingCard(b))}
          </div>
        )}
      </div>

      {/* DATE BOOKINGS MODAL */}
      {selectedDateStr && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,38,64,0.6)", backdropFilter: "blur(6px)", zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setSelectedDateStr(null)}>
          <div style={{ background: colors.white, borderRadius: "24px", width: "95%", maxWidth: "700px", maxHeight: "85vh", overflowY: "auto", padding: "1.5rem 1.25rem", animation: "ab-slide-right-to-center 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '18px', fontWeight: '800', color: colors.navy }}>
                {selectedDateStr === "No date" ? "Unscheduled Bookings" : (() => {
                  const [y, m, d] = selectedDateStr.split("-");
                  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
                })()}
              </div>
              <button onClick={() => setSelectedDateStr(null)} style={{ background: colors.bg, border: "none", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", cursor: "pointer", color: colors.textSecondary }}>×</button>
            </div>
            {(() => {
              const dayBookings = (bookingsByDate[selectedDateStr] || []).sort((a, b) => getSortTime(b) - getSortTime(a));
              const activeBookings = dayBookings.filter(b => b.status !== "Completed" && b.status !== "Cancelled");
              const completedBookings = dayBookings.filter(b => b.status === "Completed");
              const cancelledBookings = dayBookings.filter(b => b.status === "Cancelled");
              
              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "800", color: colors.warning, marginBottom: "10px", paddingBottom: "6px", borderBottom: `2px solid ${colors.warningBg}` }}>Pending Jobs ({activeBookings.length})</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {activeBookings.length === 0 ? <div style={{ padding: "16px", textAlign: "center", color: colors.textMuted, fontSize: "12px", background: colors.bg, borderRadius: "12px" }}>No pending jobs</div> : activeBookings.map((b) => renderBookingCard(b))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "800", color: colors.success, marginBottom: "10px", paddingBottom: "6px", borderBottom: `2px solid ${colors.successBg}` }}>Completed Jobs ({completedBookings.length})</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {completedBookings.length === 0 ? <div style={{ padding: "16px", textAlign: "center", color: colors.textMuted, fontSize: "12px", background: colors.bg, borderRadius: "12px" }}>No completed jobs</div> : completedBookings.map((b) => renderBookingCard(b))}
                    </div>
                  </div>
                  {cancelledBookings.length > 0 && (
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "800", color: colors.danger, marginBottom: "10px", paddingBottom: "6px", borderBottom: `2px solid ${colors.dangerBg}` }}>Cancelled Jobs ({cancelledBookings.length})</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {cancelledBookings.map((b) => renderBookingCard(b))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,38,64,0.6)", backdropFilter: "blur(6px)", zIndex: 100, display: "flex", alignItems: "flex-end", animation: "ab-fade-in 0.2s ease-out" }} onClick={() => setSelected(null)}>
          <div style={{ background: colors.white, borderRadius: "24px 24px 0 0", width: "100%", padding: "1.5rem 1.25rem", maxHeight: "85vh", overflowY: "auto", animation: "ab-slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards", boxShadow: "0 -4px 24px rgba(0,0,0,0.15)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ fontWeight: "700", fontSize: "16px" }}>Booking Detail</div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: colors.textMuted }}>×</button>
            </div>

            {[
              ["Customer Name", getCustomerName(selected)],
              ["Service Type", selected.serviceType || "N/A"],
              ["Date", selected.date || "N/A"],
              ["Time", selected.time || "N/A"],
              ["Notes", selected.notes || "None"],
            ].map(([label, value]) => (
              <div key={label} style={{ marginBottom: "0.75rem" }}>
                <div style={{ fontSize: "11px", color: colors.textMuted, fontWeight: "600", textTransform: "uppercase", marginBottom: "2px" }}>{label}</div>
                <div style={{ fontSize: "14px", color: colors.textPrimary }}>{value}</div>
              </div>
            ))}

            {/* ASSIGN MECHANIC */}
            <div style={{ marginBottom: "1.25rem", padding: !selected.mechanicId ? "16px" : "0", background: !selected.mechanicId ? colors.warningBg : "transparent", borderRadius: "16px", border: !selected.mechanicId ? `2px dashed ${colors.warning}` : "none" }}>
              <div style={{ fontSize: "12px", color: !selected.mechanicId ? colors.warning : colors.textMuted, fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                {!selected.mechanicId && <span style={{ fontSize: "18px", animation: "ab-bounce 1s infinite" }}>⚠️</span>} 
                Assign Mechanic
              </div>
              {!selected.mechanicId && (
                <div style={{ fontSize: "13px", color: colors.warning, fontWeight: "600", marginBottom: "12px", lineHeight: "1.4" }}>
                  A mechanic must be assigned before you can start or complete this job.
                </div>
              )}
              {selected.mechanicId && (
                <div style={{ fontSize: "12px", color: colors.textSecondary, marginBottom: "8px", padding: "6px 10px", background: colors.infoBg, borderRadius: "8px" }}>
                  Assigned Mechanic: {getMechanicName(selected.mechanicId, selected.mechanicName)}
                </div>
              )}
              {(() => {
                if (selected.status === "Completed" || selected.status === "Cancelled") return null;
                const sLower = (selected.serviceType || "").toLowerCase();
                const relevantMechanics = mechanics.filter(m => {
                  // Strictly ensure mechanic belongs to the same shop as the booking
                  if (selected.shopId) {
                    if (m.shopId) {
                      let sameShop = m.shopId === selected.shopId;
                      if (!sameShop && selected.shopName) {
                        const sName = selected.shopName.toUpperCase();
                        if (sName.includes("GRHE") && m.shopId === "GRHE") sameShop = true;
                        if (sName.includes("JME") && m.shopId === "JME") sameShop = true;
                      }
                      if (!sameShop && currentUser?.role?.toLowerCase() !== "admin") {
                        if (m.ownerId === currentUser?.id || m.shopId === currentUser?.shopId) sameShop = true;
                      }
                      if (!sameShop) return false;
                    } else {
                      if (m.ownerId !== currentUser?.id && currentUser?.role?.toLowerCase() !== "admin") return false;
                    }
                  } else if (currentUser?.role?.toLowerCase() !== "admin") {
                    if (m.ownerId !== currentUser?.id) return false;
                  }

                  const specs = m.specializations && m.specializations.length > 0 
                    ? m.specializations 
                    : (m.specialization ? [m.specialization] : ["General Mechanic"]);
                    
                  return specs.some(spec => {
                    const specLower = spec.toLowerCase();
                    if (specLower.includes("general")) return true;
                    if (specLower.includes("brake") && sLower.includes("brake")) return true;
                    if (specLower.includes("aircon") && sLower.includes("aircon")) return true;
                    if (specLower.includes("engine") && (sLower.includes("engine") || sLower.includes("oil"))) return true;
                    if (specLower.includes("electrical") && (sLower.includes("battery") || sLower.includes("electrical") || sLower.includes("light"))) return true;
                    if ((specLower.includes("underchassis") || specLower.includes("suspension")) && (sLower.includes("wheel") || sLower.includes("tire") || sLower.includes("alignment") || sLower.includes("suspension"))) return true;
                    if (sLower.includes(specLower) || specLower.includes(sLower)) return true;
                    return false;
                  });
                });

                if (mechanics.length === 0) {
                  return (
                    <div style={{ fontSize: "12px", color: colors.danger, padding: "8px 10px", background: colors.dangerBg, borderRadius: "8px" }}>
                      ⚠ No mechanics found. Add mechanics from the Owner Dashboard first.
                    </div>
                  );
                } else if (relevantMechanics.length === 0) {
                  return (
                    <div style={{ fontSize: "12px", color: colors.warning, padding: "8px 10px", background: colors.warningBg, borderRadius: "8px" }}>
                      ⚠ No mechanics match the required specialization for this service.
                    </div>
                  );
                } else {
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "240px", overflowY: "auto", padding: "2px" }}>
                      <div 
                        onClick={() => {
                          setNewMechanic("");
                      if (newStatus === "In Progress" || newStatus === "Completed") setNewStatus("Pending");
                        }}
                        style={{ padding: "12px 16px", borderRadius: "14px", border: newMechanic === "" ? `2px solid ${colors.blue}` : `1.5px solid ${colors.border}`, background: newMechanic === "" ? colors.infoBg : colors.white, cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", transition: "all 0.2s ease" }}
                      >
                        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: colors.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>🚫</div>
                        <div style={{ fontSize: "14px", fontWeight: "700", color: newMechanic === "" ? colors.blue : colors.textPrimary }}>Leave Unassigned</div>
                        {newMechanic === "" && <div style={{ marginLeft: "auto", color: colors.blue, fontSize: "18px", fontWeight: "800" }}>✓</div>}
                      </div>
                      {relevantMechanics.map((m) => {
                        const isSelected = newMechanic === m.id;
                        const displaySpec = m.specializations && m.specializations.length > 0 ? m.specializations.join(", ") : m.specialization;
                        return (
                          <div 
                            key={m.id}
                            onClick={() => { 
                              if (m.available) {
                                setNewMechanic(m.id);
                                if (newStatus === "Pending") setNewStatus("In Progress");
                              }
                            }}
                            style={{ padding: "12px 16px", borderRadius: "14px", border: isSelected ? `2px solid ${colors.blue}` : `1.5px solid ${colors.border}`, background: isSelected ? colors.infoBg : (m.available ? colors.white : "#f8fafc"), cursor: m.available ? "pointer" : "not-allowed", opacity: m.available ? 1 : 0.6, display: "flex", alignItems: "center", gap: "12px", transition: "all 0.2s ease", boxShadow: isSelected ? "0 4px 12px rgba(37,99,235,0.1)" : "none" }}
                          >
                            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: isSelected ? colors.blue : colors.infoBg, color: isSelected ? "#fff" : colors.info, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "800", flexShrink: 0 }}>{getInitials(m.displayName)}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "14px", fontWeight: "800", color: isSelected ? colors.blue : colors.textPrimary, display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                                {m.displayName}
                                {!m.available && <span style={{ fontSize: "10px", background: colors.dangerBg, color: colors.danger, padding: "2px 6px", borderRadius: "6px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>Unavailable</span>}
                              </div>
                              <div style={{ fontSize: "12px", color: colors.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: "500" }}>{displaySpec}</div>
                            </div>
                            {isSelected && <div style={{ color: colors.blue, fontSize: "18px", fontWeight: "800" }}>✓</div>}
                          </div>
                        );
                      })}
                    </div>
                  );
                }
              })()}
              {newMechanic && newMechanic !== selected.mechanicId && (
                <div style={{ fontSize: "11px", color: colors.success, marginTop: "6px", fontWeight: "600" }}>
                  ✓ Will be assigned upon saving
                </div>
              )}
            </div>

            {/* STATUS CHANGE */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "11px", color: colors.textMuted, fontWeight: "600", textTransform: "uppercase", marginBottom: "8px" }}>Status</div>
              {selected.status === "Completed" || selected.status === "Cancelled" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ fontSize: "13px", color: selected.status === "Completed" ? colors.success : colors.danger, fontWeight: "600", padding: "10px", background: selected.status === "Completed" ? colors.successBg : colors.dangerBg, borderRadius: "10px", border: `1px solid ${selected.status === "Completed" ? "rgba(22,163,74,0.3)" : "rgba(220,38,38,0.3)"}` }}>
                    {selected.status === "Completed" ? "✅ This booking is completed." : "❌ This booking was cancelled."}
                  </div>
                  {(selected.status === "Cancelled" || selected.status === "Completed") && (
                    <button
                      onClick={async () => {
                        setSaving(true);
                        try {
                          await updateDoc(doc(db, "bookings", selected.id), { status: "Pending" });
                          if (selected.customerId) {
                            await addDoc(collection(db, "notifications"), {
                              userId: selected.customerId,
                              title: "Booking Restored 🔄",
                              message: `Your booking for ${selected.serviceType || "a service"} at ${selected.shopName || "the shop"} has been restored to Pending.`,
                              type: "status_update",
                              read: false,
                              createdAt: serverTimestamp(),
                            });
                          }
                          setBookings(prev => prev.map(b => b.id === selected.id ? { ...b, status: "Pending" } : b));
                          setSelected(prev => ({ ...prev, status: "Pending" }));
                          setNewStatus("Pending");
                          showToast("✅ Booking restored to Pending.");
                        } catch(e) {
                          showToast("❌ Failed to restore booking.");
                        }
                        setSaving(false);
                      }}
                      disabled={saving || deleting}
                      style={{ padding: "10px 14px", background: colors.warningBg, color: colors.warning, border: `1.5px solid rgba(245,158,11,0.3)`, borderRadius: "10px", fontSize: "13px", fontWeight: "700", cursor: "pointer", transition: "all 0.2s", opacity: (saving || deleting) ? 0.7 : 1 }}
                    >
                      {saving ? "Restoring..." : "↩️ Restore to Pending"}
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {["Pending", "In Progress", "Completed", "Cancelled"].map((s) => {
                    const isActive = newStatus === s;
                    let activeBg;
                    switch(s) {
                      case "Completed": activeBg = colors.success; break;
                      case "In Progress": activeBg = colors.info; break;
                      case "Cancelled": activeBg = colors.danger; break;
                      default: activeBg = colors.warning; break; // Pending
                    }
                    return (
                      <button key={s} onClick={() => {
                        if ((s === "In Progress" || s === "Completed") && !newMechanic) {
                          showToast("⚠ Please assign a mechanic first.");
                          return;
                        }
                        setNewStatus(s);
                      }} style={{
                        display: "flex", alignItems: "center", gap: "6px",
                        padding: "8px 14px", borderRadius: "12px", fontSize: "13px",
                        fontWeight: "700", cursor: "pointer", fontFamily: "inherit",
                        background: isActive ? activeBg : colors.white,
                        color: isActive ? "#fff" : colors.textSecondary,
                        border: `1.5px solid ${isActive ? activeBg : colors.border}`,
                        transition: "all 0.2s ease",
                        boxShadow: isActive ? `0 4px 12px ${activeBg}40` : "none",
                      }}>
                        <span style={{ fontSize: "14px", opacity: isActive ? 1 : 0.6 }}>{statusIcon(s)}</span>
                        {s}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PRICE FIELD */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "11px", color: colors.textMuted, fontWeight: "600", textTransform: "uppercase", marginBottom: "6px" }}>Service Price (₱)</div>
              {selected.status === "Completed" || selected.status === "Cancelled" ? (
                <div style={{ fontSize: "15px", color: colors.textPrimary, fontWeight: "700" }}>
                  {selected.price !== undefined ? (String(selected.price).includes('-') || String(selected.price).includes('+') ? `₱${selected.price}` : `₱${Number(selected.price).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`) : "Not set"}
                </div>
              ) : (
                <>
                  {selected.price === undefined && (
                    <div style={{ fontSize: "12px", color: colors.danger, marginBottom: "8px", padding: "6px 10px", background: colors.dangerBg, borderRadius: "8px", fontWeight: "600" }}>
                      ⚠ No price set — required for reports and earnings.
                    </div>
                  )}
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", fontSize: "15px", fontWeight: "700", color: colors.textSecondary }}>₱</span>
                    <select
                      value={newPrice} onChange={(e) => setNewPrice(e.target.value)}
                      style={{ ...inputStyle, paddingLeft: "36px" }}
                      onFocus={(e) => { e.target.style.border = `1.5px solid ${colors.blue}`; e.target.style.backgroundColor = colors.white; e.target.style.boxShadow = "0 4px 12px rgba(42,82,152,0.1)"; }}
                      onBlur={(e) => { e.target.style.border = `1.5px solid ${colors.border}`; e.target.style.backgroundColor = "#f9fafb"; e.target.style.boxShadow = "none"; }}
                    >
                      <option value="">Select a price range</option>
                      <option value="100-200">100 - 200</option>
                      <option value="200-500">200 - 500</option>
                      <option value="500-1000">500 - 1,000</option>
                      <option value="1000-2000">1,000 - 2,000</option>
                      <option value="2000-5000">2,000 - 5,000</option>
                      <option value="5000+">5,000+</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            {selected.status !== "Completed" && selected.status !== "Cancelled" && (
              <>
                <button onClick={handleSave} disabled={saving || deleting} style={{ ...sh.primaryBtn, opacity: (saving || deleting) ? 0.7 : 1 }}>{saving ? "Saving..." : "Save Changes"}</button>
                <div style={{ height: "10px" }} />
              </>
            )}
            <button onClick={handleDelete} disabled={saving || deleting} style={{
              width: "100%", padding: "16px",
              background: colors.dangerBg, color: colors.danger,
              fontSize: "15px", fontWeight: "700",
              border: `1.5px solid rgba(220,38,38,0.3)`, borderRadius: "16px",
              cursor: "pointer", fontFamily: "inherit", marginBottom: "10px",
              opacity: (saving || deleting) ? 0.7 : 1,
            }}>
              {deleting ? "Deleting..." : "Delete Booking"}
            </button>
            <button onClick={() => setSelected(null)} style={sh.outlineBtn}>Cancel</button>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {showDeleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,38,64,0.6)", backdropFilter: "blur(6px)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", animation: "ab-fade-in 0.2s ease-out" }} onClick={() => setShowDeleteConfirm(false)}>
          <div style={{ background: colors.white, borderRadius: "24px", width: "90%", maxWidth: "340px", padding: "24px", textAlign: "center", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: colors.dangerBg, color: colors.danger, fontSize: "28px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>🗑️</div>
            <h3 style={{ margin: "0 0 8px", fontSize: "18px", color: colors.textPrimary, fontWeight: "800" }}>Delete Booking?</h3>
            <p style={{ margin: "0 0 24px", fontSize: "13px", color: colors.textSecondary, lineHeight: "1.5" }}>
              Are you sure you want to delete this booking for <strong>{getCustomerName(selected)}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, padding: "14px", borderRadius: "14px", background: colors.bg, border: `1px solid ${colors.border}`, color: colors.textSecondary, fontWeight: "700", cursor: "pointer", fontFamily: "inherit", fontSize: "14px" }}>Cancel</button>
              <button onClick={confirmDelete} disabled={deleting} style={{ flex: 1, padding: "14px", borderRadius: "14px", background: colors.danger, border: "none", color: "#fff", fontWeight: "700", cursor: "pointer", fontFamily: "inherit", fontSize: "14px", opacity: deleting ? 0.7 : 1 }}>
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}