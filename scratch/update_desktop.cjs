const fs = require('fs');

let file = fs.readFileSync('src/screens/desktop/DesktopAdminUsers.jsx', 'utf8');

file = file.replace(
  'const [confirmProps, setConfirmProps] = useState({ isOpen: false, title: "", message: "", type: "primary", onConfirm: null });',
  'const [confirmProps, setConfirmProps] = useState({ isOpen: false, title: "", message: "", type: "primary", onConfirm: null, requireInput: false, inputPlaceholder: "" });'
);

file = file.replace(
  '<ConfirmModal \r\n          isOpen={confirmProps.isOpen}\r\n          title={confirmProps.title}\r\n          message={confirmProps.message}\r\n          type={confirmProps.type}',
  '<ConfirmModal \r\n          isOpen={confirmProps.isOpen}\r\n          title={confirmProps.title}\r\n          message={confirmProps.message}\r\n          type={confirmProps.type}\r\n          requireInput={confirmProps.requireInput}\r\n          inputPlaceholder={confirmProps.inputPlaceholder}'
);
// fallback for \n
if (!file.includes('requireInput={confirmProps.requireInput}')) {
  file = file.replace(
    '<ConfirmModal \n          isOpen={confirmProps.isOpen}\n          title={confirmProps.title}\n          message={confirmProps.message}\n          type={confirmProps.type}',
    '<ConfirmModal \n          isOpen={confirmProps.isOpen}\n          title={confirmProps.title}\n          message={confirmProps.message}\n          type={confirmProps.type}\n          requireInput={confirmProps.requireInput}\n          inputPlaceholder={confirmProps.inputPlaceholder}'
  );
}

const oldHandle = /const handleStatusUpdate = async \(id, status\) => \{[\s\S]*?setActionLoading\(null\);\r?\n\s*\}\r?\n\s*\};/g;

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

file = file.replace(oldHandle, newHandle);

fs.writeFileSync('src/screens/desktop/DesktopAdminUsers.jsx', file);
