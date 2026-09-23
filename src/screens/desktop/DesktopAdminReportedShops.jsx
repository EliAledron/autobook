import React, { useEffect, useState } from "react";
import { collection, onSnapshot, updateDoc, doc, getDoc, getDocs, query, where, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { colors, ErrorModal, SuccessModal, ConfirmModal } from "../dashboardShared";
import RoleBasedWrapper from "../../components/RoleBasedWrapper";
import { ShieldAlert, CheckCircle, Search, Ban, Flag, Trash2, Eye, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function DesktopAdminReportedShops() {
  const [reports, setReports] = useState([]);
  const [shopsMap, setShopsMap] = useState({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubAlerts = onSnapshot(query(collection(db, "adminAlerts"), where("type", "==", "shop_report")), (snap) => {
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setReports(arr.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0)));
      setLoading(false);
    });

    const unsubShops = onSnapshot(collection(db, "shops"), (snap) => {
      const sm = {};
      snap.forEach(d => { sm[d.id] = d.data(); });
      setShopsMap(sm);
    });

    return () => {
      unsubAlerts();
      unsubShops();
    };
  }, []);

  const dismissReport = (id) => {
    setConfirmAction({
      type: 'dismiss',
      id,
      title: 'Dismiss Report',
      message: 'Dismiss this report?'
    });
  };

  const executeDismiss = async (id) => {
    setActionLoading(id);
    try { await deleteDoc(doc(db, "adminAlerts", id)); } catch (e) {}
    setActionLoading(null);
  };

  const banShopOwner = (report) => {
    setConfirmAction({
      type: 'ban',
      report,
      title: 'Restrict Shop Owner',
      message: 'Are you sure you want to restrict the owner of this shop? They will lose access to the platform.'
    });
  };

  const executeBan = async (report) => {
    setActionLoading(report.shopId);
    try {
      const q = query(collection(db, "users"), where("shopId", "==", report.shopId));
      const s = await getDocs(q);
      s.docs.forEach(async (d) => {
        if (d.data().role?.toLowerCase() === "owner") {
          await updateDoc(doc(db, "users", d.id), { status: "restricted" });
        }
      });
      await deleteDoc(doc(db, "adminAlerts", report.id));
      setSuccessMsg("Shop Owner has been restricted.");
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to ban shop.");
    }
    setActionLoading(null);
  };

  const giveWarning = (report) => {
    setConfirmAction({
      type: 'warning',
      report,
      title: 'Issue Warning',
      message: 'Are you sure you want to issue a warning to this shop?'
    });
  };

  const executeWarning = async (report) => {
    setActionLoading(report.id);
    try {
      const sRef = doc(db, "shops", report.shopId);
      const sSnap = await getDoc(sRef);
      let currentWarnings = 0;
      if (sSnap.exists()) {
        currentWarnings = sSnap.data().warnings || 0;
        await updateDoc(sRef, { warnings: currentWarnings + 1 });
        
        import("firebase/firestore").then(({ addDoc, collection, serverTimestamp }) => {
          if (sSnap.data().ownerId) {
            addDoc(collection(db, "notifications"), {
              userId: sSnap.data().ownerId,
              title: "Official Warning",
              message: `Your shop has received an official warning regarding a recent report. You now have ${currentWarnings + 1}/3 warnings. After 3 warnings, your shop may be banned.`,
              read: false,
              createdAt: serverTimestamp(),
              type: "system"
            }).catch(err => console.error("Notification failed", err));
          }
        });
      }
      await deleteDoc(doc(db, "adminAlerts", report.id));
      setSuccessMsg("Warning issued successfully.");
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to issue warning.");
    }
    setActionLoading(null);
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'dismiss') executeDismiss(confirmAction.id);
    if (confirmAction.type === 'ban') executeBan(confirmAction.report);
    if (confirmAction.type === 'warning') executeWarning(confirmAction.report);
    setConfirmAction(null);
  };

  const filteredReports = reports.filter(r => {
    const s = search.toLowerCase();
    return (r.shopName || "").toLowerCase().includes(s) || 
           (r.reason || r.message || "").toLowerCase().includes(s);
  });

  return (
    <>
      <SuccessModal message={successMsg} onClose={() => setSuccessMsg("")} />
      <ErrorModal error={errorMsg} onClose={() => setErrorMsg("")} />
      <ConfirmModal 
        isOpen={!!confirmAction} 
        title={confirmAction?.title} 
        message={confirmAction?.message} 
        onConfirm={handleConfirmAction} 
        onCancel={() => setConfirmAction(null)} 
        type="danger" 
      />
      <RoleBasedWrapper title="Reported Shops">
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: "800", color: colors.textPrimary, margin: "0 0 8px 0" }}>Reported Shops</h1>
            <p style={{ margin: 0, color: colors.textSecondary, fontSize: "15px" }}>Review flags against auto shops and take disciplinary action if necessary.</p>
          </div>
        </div>

        {/* CONTROLS */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: "24px", background: "#fff", padding: "16px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", border: `1px solid ${colors.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#f8fafc", padding: "10px 16px", borderRadius: "12px", border: `1px solid ${colors.border}`, width: "350px" }}>
            <Search size={18} color={colors.textMuted} />
            <input 
              type="text" 
              placeholder="Search reports..." 
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
                <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", width: "50px" }}><Flag size={16} /></th>
                <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", width: "200px" }}>Reported Shop</th>
                <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Reason for Report</th>
                <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", width: "160px" }}>Reporter</th>
                <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", width: "160px" }}>Date</th>
                <th style={{ padding: "16px 24px", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "right", width: "140px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ padding: "48px", textAlign: "center", color: colors.textMuted }}>Loading reports...</td></tr>
              ) : filteredReports.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: "48px", textAlign: "center", color: colors.textMuted }}>
                  <ShieldAlert size={32} color={colors.textMuted} style={{ marginBottom: "12px", opacity: 0.5 }} />
                  <div>No shops have been reported recently.</div>
                </td></tr>
              ) : (
                filteredReports.map(r => (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: "16px 24px", verticalAlign: "top" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: colors.dangerBg, color: colors.danger, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Flag size={16} />
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px", verticalAlign: "top" }}>
                      <div style={{ fontWeight: "700", fontSize: "14px", color: colors.textPrimary }}>{r.shopName || "Unknown"}</div>
                      {r.shopId && <div style={{ fontSize: "12px", color: colors.textSecondary }}>ID: {r.shopId}</div>}
                      {r.shopId && shopsMap[r.shopId] && (
                        <div style={{ fontSize: "11px", fontWeight: "700", color: colors.warning, marginTop: "4px" }}>
                          Warnings: {shopsMap[r.shopId].warnings || 0}/3
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ fontSize: "14px", color: colors.textPrimary, lineHeight: "1.5" }}>{r.reason || r.message || "No reason provided"}</div>
                    </td>
                    <td style={{ padding: "16px 24px", verticalAlign: "top" }}>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: colors.textSecondary }}>Hidden for Privacy</div>
                    </td>
                    <td style={{ padding: "16px 24px", verticalAlign: "top", fontSize: "14px", color: colors.textSecondary }}>
                      {r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000).toLocaleDateString() : "Unknown"}
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "right", verticalAlign: "top" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                        <button onClick={() => navigate("/customer/shop-profile", { state: { shopId: r.shopId } })} style={{ width: "36px", height: "36px", borderRadius: "10px", background: colors.infoBg, color: colors.info, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="View Shop Profile">
                          <Eye size={18} />
                        </button>
                        <button disabled={actionLoading === r.id} onClick={() => dismissReport(r.id)} style={{ width: "36px", height: "36px", borderRadius: "10px", background: colors.successBg, color: colors.success, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Dismiss Report">
                          <CheckCircle size={18} />
                        </button>
                        {r.shopId && shopsMap[r.shopId] && (shopsMap[r.shopId].warnings || 0) >= 3 ? (
                          <button disabled={actionLoading === r.shopId} onClick={() => banShopOwner(r)} style={{ width: "36px", height: "36px", borderRadius: "10px", background: colors.dangerBg, color: colors.danger, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Ban Shop Owner">
                            <Ban size={18} />
                          </button>
                        ) : (
                          <button disabled={actionLoading === r.id} onClick={() => giveWarning(r)} style={{ width: "36px", height: "36px", borderRadius: "10px", background: colors.warningBg, color: colors.warning, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Issue Warning">
                            <AlertTriangle size={18} />
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
