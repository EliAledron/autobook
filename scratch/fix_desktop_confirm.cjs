const fs = require('fs');

let desktop = fs.readFileSync('src/screens/desktop/DesktopAdminUsers.jsx', 'utf8');

// 1. Inject ConfirmModal into imports
if (!desktop.includes('ConfirmModal')) {
  desktop = desktop.replace(
    'import { colors } from "../dashboardShared";',
    'import { colors, ConfirmModal } from "../dashboardShared";'
  );
}

// 2. Add State for ConfirmProps
if (!desktop.includes('confirmProps')) {
  desktop = desktop.replace(
    'const [actionLoading, setActionLoading] = useState(null);',
    'const [actionLoading, setActionLoading] = useState(null);\n  const [confirmProps, setConfirmProps] = useState({ isOpen: false, title: "", message: "", type: "primary", onConfirm: null });'
  );
}

// 3. Replace handleStatusUpdate
const oldHandleStart = `  const handleStatusUpdate = async (id, status) => {
    let msg = "";
    if (status === "approved") msg = "Are you sure you want to approve this user?";
    else if (status === "rejected") msg = "Are you sure you want to reject this user?";
    else if (status === "restricted") msg = "Are you sure you want to restrict this user?";
    if (msg && !window.confirm(msg)) return;`;

const newHandleStart = `  const handleStatusUpdate = async (id, status) => {
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
    }`;

desktop = desktop.replace(oldHandleStart, newHandleStart);

// 4. Replace handleDelete
const oldDeleteStart = `  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this user?")) return;`;

const newDeleteStart = `  const handleDelete = async (id) => {
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
    return;`;

desktop = desktop.replace(oldDeleteStart, newDeleteStart);

// 5. Inject <ConfirmModal /> at the end
if (!desktop.includes('<ConfirmModal')) {
  desktop = desktop.replace(
    '  return (\n    <RoleBasedWrapper',
    `  return (
    <>
      <ConfirmModal 
        isOpen={confirmProps.isOpen}
        title={confirmProps.title}
        message={confirmProps.message}
        type={confirmProps.type}
        onCancel={() => setConfirmProps({ isOpen: false })}
        onConfirm={confirmProps.onConfirm}
      />
    <RoleBasedWrapper`
  );
  desktop = desktop.replace('</RoleBasedWrapper>\n  );\n}', '</RoleBasedWrapper>\n    </>\n  );\n}');
}

fs.writeFileSync('src/screens/desktop/DesktopAdminUsers.jsx', desktop);
