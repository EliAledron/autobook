const fs = require('fs');

let file = fs.readFileSync('src/screens/AdminUsers.jsx', 'utf8');

// 1. Add State for ConfirmProps if missing
if (!file.includes('confirmProps')) {
  file = file.replace(
    'const [error, setError] = useState("");',
    'const [error, setError] = useState("");\n  const [confirmProps, setConfirmProps] = useState({ isOpen: false, title: "", message: "", type: "primary", onConfirm: null, requireInput: false, inputPlaceholder: "" });'
  );
} else {
  // Update confirmProps state
  file = file.replace(
    'const [confirmProps, setConfirmProps] = useState({ isOpen: false, title: "", message: "", type: "primary", onConfirm: null });',
    'const [confirmProps, setConfirmProps] = useState({ isOpen: false, title: "", message: "", type: "primary", onConfirm: null, requireInput: false, inputPlaceholder: "" });'
  );
}

// 2. Add requireInput to ConfirmModal tag
if (!file.includes('requireInput={confirmProps.requireInput}')) {
  file = file.replace(
    /<ConfirmModal\s+isOpen=\{confirmProps.isOpen\}\s+title=\{confirmProps.title\}\s+message=\{confirmProps.message\}\s+type=\{confirmProps.type\}/g,
    '<ConfirmModal \n          isOpen={confirmProps.isOpen}\n          title={confirmProps.title}\n          message={confirmProps.message}\n          type={confirmProps.type}\n          requireInput={confirmProps.requireInput}\n          inputPlaceholder={confirmProps.inputPlaceholder}'
  );
}

// 3. Replace updateStatus logic
const oldUpdate = /const updateStatus = async \(id, status\) => \{[\s\S]*?setSelected\(\(prev\) => \(\{ \.\.\.prev, \.\.\.updates \}\)\);\r?\n\s*setSaving\(false\);\r?\n\s*\};/g;

const newUpdate = `const updateStatus = (id, status) => {
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
          await proceedUpdateStatus(id, status, inputValue);
        }
      });
      return;
    }
    proceedUpdateStatus(id, status);
  };

  const proceedUpdateStatus = async (id, status, inputValue) => {
    setSaving(true);
    try {
      const updates = { status };
      if (status === "rejected" && inputValue) {
        updates.rejectionReason = inputValue;
      }
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
      console.error(err);
    }
    setSaving(false);
    if (status !== "restricted" && status !== "rejected" && selected) {
      setSelected({ ...selected, status });
    } else {
      setSelected(null);
    }
  };`;

file = file.replace(oldUpdate, newUpdate);

// Strip window.confirm from UI
file = file.replace(
  'if (window.confirm("Are you sure you want to restrict this user? They will lose access to their account.")) {\r\n                          updateStatus(selected.id, "restricted");\r\n                        }',
  'updateStatus(selected.id, "restricted");'
);
file = file.replace(
  'if (window.confirm("Are you sure you want to restrict this user? They will lose access to their account.")) {\n                          updateStatus(selected.id, "restricted");\n                        }',
  'updateStatus(selected.id, "restricted");'
);

fs.writeFileSync('src/screens/AdminUsers.jsx', file);
