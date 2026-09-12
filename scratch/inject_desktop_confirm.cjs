const fs = require('fs');

let desktop = fs.readFileSync('src/screens/desktop/DesktopAdminUsers.jsx', 'utf8');

if (!desktop.includes('ConfirmModal')) {
  desktop = desktop.replace(
    'import { sh, colors, ErrorModal } from "../dashboardShared";',
    'import { sh, colors, ErrorModal, ConfirmModal } from "../dashboardShared";'
  );

  const confirmState = `  const [confirmProps, setConfirmProps] = useState({ isOpen: false, title: "", message: "", type: "primary", onConfirm: null });\n\n  const handleStatusUpdate`;
  desktop = desktop.replace('  const handleStatusUpdate', confirmState);

  const newStatusUpdate = `const handleStatusUpdate = async (id, status) => {
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

    setActionLoading(id);
    try {
      await updateDoc(doc(db, "users", id), { status });
    } catch (e) {
      console.error("Failed to update status", e);
    }
    setActionLoading(null);
  };`;
  
  const regex = /const handleStatusUpdate = async \(id, status\) => \{[\s\S]*?setActionLoading\(null\);\n  \};/g;
  desktop = desktop.replace(regex, newStatusUpdate);

  const newDelete = `const handleDelete = async (id) => {
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
  };`;
  const regexDelete = /const handleDelete = async \(id\) => \{[\s\S]*?setActionLoading\(null\);\n  \};/g;
  desktop = desktop.replace(regexDelete, newDelete);

  desktop = desktop.replace(
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
  desktop = desktop.replace('</div>\n  );\n}', '</div>\n    </>\n  );\n}');

  fs.writeFileSync('src/screens/desktop/DesktopAdminUsers.jsx', desktop);
}
