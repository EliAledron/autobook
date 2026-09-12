const fs = require('fs');

let file = fs.readFileSync('src/screens/desktop/DesktopAdminUsers.jsx', 'utf8');

const regex = /const handleStatusUpdate = async \(id, status\) => \{[\s\S]*?setActionLoading\(null\);\r?\n\s*\}\r?\n\s*\};/g;

const newHandle = `const handleStatusUpdate = async (id, status) => {
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
  };`;

if (regex.test(file)) {
  file = file.replace(regex, newHandle);
  fs.writeFileSync('src/screens/desktop/DesktopAdminUsers.jsx', file);
  console.log("Replaced handleStatusUpdate using regex.");
} else {
  console.log("Regex did not match. Trying split method.");
  const parts = file.split('const handleStatusUpdate = async (id, status) => {');
  if (parts.length > 1) {
    const endPart = parts[1].split('const handleDelete = async (id) => {');
    if (endPart.length > 1) {
      file = parts[0] + newHandle + '\n\n  const handleDelete = async (id) => {' + endPart[1];
      fs.writeFileSync('src/screens/desktop/DesktopAdminUsers.jsx', file);
      console.log("Replaced using split method.");
    } else {
      console.log("End part not found.");
    }
  } else {
    console.log("Start part not found.");
  }
}
