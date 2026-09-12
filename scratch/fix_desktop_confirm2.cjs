const fs = require('fs');

let desktop = fs.readFileSync('src/screens/desktop/DesktopAdminUsers.jsx', 'utf8');

const regexStatus = /const handleStatusUpdate = async \(id, status\) => \{[\s\S]*?setActionLoading\(null\);\n  \};/g;

const newHandleStart = `const handleStatusUpdate = async (id, status) => {
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
          setActionLoading(id);
          try {
            await updateDoc(doc(db, "users", id), { status });
          } catch (e) {
            console.error("Failed to update status", e);
          }
          setActionLoading(null);
        }
      });
      return;
    }
  };`;

desktop = desktop.replace(regexStatus, newHandleStart);

const regexDelete = /const handleDelete = async \(id\) => \{[\s\S]*?setActionLoading\(null\);\n  \};/g;

const newDeleteStart = `const handleDelete = async (id) => {
    setConfirmProps({
      isOpen: true,
      title: "Delete User",
      message: "Are you sure you want to permanently delete this user? This cannot be undone.",
      type: "danger",
      onConfirm: async () => {
        setConfirmProps({ isOpen: false });
        setActionLoading(id);
        try {
          await deleteDoc(doc(db, "users", id));
        } catch (e) {
          console.error("Failed to delete", e);
        }
        setActionLoading(null);
      }
    });
    return;
  };`;

desktop = desktop.replace(regexDelete, newDeleteStart);

fs.writeFileSync('src/screens/desktop/DesktopAdminUsers.jsx', desktop);
