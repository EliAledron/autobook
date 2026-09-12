const fs = require('fs');

let file = fs.readFileSync('src/screens/Pendingapproval.jsx', 'utf8');

// 1. Add state for reason
if (!file.includes('const [reason, setReason] = useState("");')) {
  file = file.replace(
    'const [name, setName] = useState("");',
    'const [name, setName] = useState("");\n  const [reason, setReason] = useState("");\n  const [reapplying, setReapplying] = useState(false);'
  );
}

// 2. Fetch reason in snapshot
file = file.replace(
  'setName(data.displayName?.split(" ")[0] || "there");',
  'setName(data.displayName?.split(" ")[0] || "there");\n        setReason(data.rejectionReason || "");'
);

// 3. Import updateDoc
if (!file.includes('updateDoc')) {
  file = file.replace(
    'import { doc, onSnapshot } from "firebase/firestore";',
    'import { doc, onSnapshot, updateDoc } from "firebase/firestore";'
  );
}

// 4. Add handleReapply function
if (!file.includes('const handleReapply = async () => {')) {
  file = file.replace(
    'const handleLogout = async () => {',
    `const handleReapply = async () => {
    if (!auth.currentUser) return;
    setReapplying(true);
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), { status: "pending", rejectionReason: null });
    } catch (e) {
      console.error(e);
    }
    setReapplying(false);
  };

  const handleLogout = async () => {`
  );
}

// 5. Update UI
const oldRejectedUI = /\{status === "rejected" && \([\s\S]*?Your application was not approved\. Please contact the admin\.\r?\n\s*<\/p>[\s\S]*?<\/button>\r?\n\s*<\/>\r?\n\s*\)\}/g;

const newRejectedUI = `{status === "rejected" && (
            <>
              <div style={s.icon}><XCircle size={48} /></div>
              <h2 style={s.title}>Application Rejected</h2>
              <p style={s.subtitle}>
                Unfortunately, your application to join the platform was not approved at this time.
              </p>
              
              {reason && (
                <div style={{ background: "rgba(255,255,255,0.1)", padding: "16px", borderRadius: "12px", width: "100%", boxSizing: "border-box", marginBottom: "24px", borderLeft: "4px solid #ef4444" }}>
                  <div style={{ fontSize: "12px", textTransform: "uppercase", fontWeight: "700", color: "#fca5a5", marginBottom: "4px" }}>Admin Note:</div>
                  <div style={{ fontSize: "14px", color: "#fff", lineHeight: "1.5" }}>{reason}</div>
                </div>
              )}

              <button style={{ ...s.logoutBtn, background: "#3b82f6", color: "#fff", border: "none", marginBottom: "12px" }} onClick={handleReapply} disabled={reapplying}>
                {reapplying ? "Submitting..." : "Fix & Re-apply"}
              </button>

              <button style={s.logoutBtn} onClick={handleLogout}>
                Back to login
              </button>
            </>
          )}`;

if (oldRejectedUI.test(file)) {
  file = file.replace(oldRejectedUI, newRejectedUI);
  fs.writeFileSync('src/screens/Pendingapproval.jsx', file);
  console.log("Replaced Rejected UI successfully!");
} else {
  console.log("Could not find rejected UI to replace.");
}
