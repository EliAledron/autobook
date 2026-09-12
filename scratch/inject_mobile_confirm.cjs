const fs = require('fs');

let mobile = fs.readFileSync('src/screens/AdminUsers.jsx', 'utf8');

if (!mobile.includes('ConfirmModal')) {
  mobile = mobile.replace(
    'import { ErrorModal, colors, getInitials } from "./dashboardShared";',
    'import { ErrorModal, ConfirmModal, colors, getInitials } from "./dashboardShared";'
  );

  const confirmState = `  const [confirmProps, setConfirmProps] = useState({ isOpen: false, title: "", message: "", type: "primary", onConfirm: null });\n\n  const updateStatus`;
  mobile = mobile.replace('  const updateStatus', confirmState);

  const newStatusUpdate = `const updateStatus = async (id, status) => {
    let title = "";
    let message = "";
    let type = "primary";

    if (status === "approved") {
      title = "Approve User";
      message = "Are you sure you want to approve this user? They will gain access to the platform.";
      type = "success";
    } else if (status === "rejected") {
      title = "Reject User";
      message = "Are you sure you want to reject this user's application?";
      type = "danger";
    } else if (status === "restricted") {
      title = "Restrict User";
      message = "Are you sure you want to restrict this user? They will lose access immediately.";
      type = "danger";
    }

    if (title) {
      setConfirmProps({
        isOpen: true, title, message, type,
        onConfirm: async () => {
          setConfirmProps({ isOpen: false });
          setSaving(true);
          try {
            const updates = { status };
            if (status === "approved" && selected && (selected.role || "").toLowerCase() === "owner" && !selected.shopId) {
              const shopData = {
                name: selected.shopName || "Auto Shop",
                shortName: (selected.shopName || "Shop").split(" ")[0],
                ownerId: selected.id,
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
          } catch (err) {
            setError(err.message);
          }
          setSaving(false);
          if (status !== "restricted" && status !== "rejected" && selected) {
            setSelected({ ...selected, status });
          } else {
            setSelected(null);
          }
        }
      });
      return;
    }
  };`;
  
  const regex = /const updateStatus = async \(id, status\) => \{[\s\S]*?setSelected\(null\);\n    \}\n  \};/g;
  mobile = mobile.replace(regex, newStatusUpdate);

  mobile = mobile.replace(
    'return (',
    `return (
    <>
      <ConfirmModal 
        isOpen={confirmProps.isOpen}
        title={confirmProps.title}
        message={confirmProps.message}
        type={confirmProps.type}
        onCancel={() => setConfirmProps({ isOpen: false })}
        onConfirm={confirmProps.onConfirm}
      />`
  );
  mobile = mobile.replace('</div>\n  );\n}', '</div>\n    </>\n  );\n}');

  // Remove the old confirm for restrict:
  mobile = mobile.replace('if (window.confirm("Are you sure you want to restrict this user? They will lose access to their account.")) {\n                          updateStatus(selected.id, "restricted");\n                        }', 'updateStatus(selected.id, "restricted");');

  fs.writeFileSync('src/screens/AdminUsers.jsx', mobile);
}
