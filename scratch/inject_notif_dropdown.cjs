const fs = require('fs');

let code = fs.readFileSync('src/components/AdminLayout.jsx', 'utf8');

// Add state
if (!code.includes('const [alertsList, setAlertsList] = useState([]);')) {
  code = code.replace('const [unreadAlerts, setUnreadAlerts] = useState(0);', 'const [unreadAlerts, setUnreadAlerts] = useState(0);\n  const [alertsList, setAlertsList] = useState([]);\n  const [showNotif, setShowNotif] = useState(false);');
}

// Update onSnapshot
const oldSnap = `    unsubscribers.push(onSnapshot(qAlerts, (snap) => {
      setUnreadAlerts(snap.docs.filter(d => !d.data().read).length);
    }));`;
const newSnap = `    unsubscribers.push(onSnapshot(qAlerts, (snap) => {
      const list = snap.docs.map(d => ({id: d.id, ...d.data()}));
      list.sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
      setAlertsList(list);
      setUnreadAlerts(list.filter(d => !d.read).length);
    }));`;
if (code.includes(oldSnap)) {
  code = code.replace(oldSnap, newSnap);
}

// Update UI
const oldBell = `<div onClick={() => navigate("/admin/alerts")} style={{ position: "relative", cursor: "pointer", color: colors.textSecondary }}>
                <Bell size={24} />
                {unreadAlerts > 0 && <span style={{ position: "absolute", top: -2, right: -2, width: 10, height: 10, background: colors.danger, borderRadius: "50%", border: "2px solid #fff" }} />}
              </div>`;
const newBell = `<div style={{ position: "relative" }}>
                <div onClick={() => setShowNotif(!showNotif)} style={{ position: "relative", cursor: "pointer", color: colors.textSecondary }}>
                  <Bell size={24} />
                  {unreadAlerts > 0 && <span style={{ position: "absolute", top: -2, right: -2, width: 10, height: 10, background: colors.danger, borderRadius: "50%", border: "2px solid #fff" }} />}
                </div>

                {showNotif && (
                  <>
                    <div onClick={() => setShowNotif(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} />
                    <div style={{ position: "absolute", top: "40px", right: 0, width: "360px", background: "#fff", borderRadius: "16px", boxShadow: "0 10px 40px rgba(0,0,0,0.1)", border: \`1px solid \${colors.border}\`, zIndex: 1000, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                      <div style={{ padding: "16px", borderBottom: \`1px solid \${colors.border}\`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: colors.textPrimary }}>Notifications</h3>
                        {unreadAlerts > 0 && <span style={{ fontSize: "12px", color: colors.textSecondary }}>{unreadAlerts} unread</span>}
                      </div>
                      <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                        {alertsList.length === 0 ? (
                          <div style={{ padding: "32px", textAlign: "center", color: colors.textMuted, fontSize: "14px" }}>No notifications yet.</div>
                        ) : (
                          alertsList.slice(0, 8).map(a => (
                            <div key={a.id} onClick={() => { setShowNotif(false); navigate("/admin/alerts"); }} style={{ padding: "16px", borderBottom: \`1px solid \${colors.border}\`, display: "flex", gap: "12px", cursor: "pointer", background: !a.read ? "rgba(42, 82, 152, 0.03)" : "#fff", transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={(e) => e.currentTarget.style.background = !a.read ? "rgba(42, 82, 152, 0.03)" : "#fff"}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: "14px", fontWeight: !a.read ? "800" : "500", color: colors.textPrimary, marginBottom: "4px" }}>{a.title}</div>
                                <div style={{ fontSize: "13px", color: colors.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.message}</div>
                                <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "8px" }}>{a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000).toLocaleString() : "Just now"}</div>
                              </div>
                              {!a.read && <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: colors.navy, marginTop: "6px", flexShrink: 0 }} />}
                            </div>
                          ))
                        )}
                      </div>
                      <div onClick={() => { setShowNotif(false); navigate("/admin/alerts"); }} style={{ padding: "12px", textAlign: "center", background: "#f8fafc", color: colors.navy, fontSize: "13px", fontWeight: "700", cursor: "pointer", borderTop: \`1px solid \${colors.border}\` }}>
                        View all notifications
                      </div>
                    </div>
                  </>
                )}
              </div>`;
if (code.includes('onClick={() => navigate("/admin/alerts")}')) {
  code = code.replace(oldBell, newBell);
}

fs.writeFileSync('src/components/AdminLayout.jsx', code);
