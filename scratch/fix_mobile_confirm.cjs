const fs = require('fs');

let mobile = fs.readFileSync('src/screens/AdminUsers.jsx', 'utf8');

// 1. Inject ConfirmModal into imports
if (!mobile.includes('ConfirmModal')) {
  mobile = mobile.replace(
    'import { ErrorModal, colors, getInitials } from "./dashboardShared";',
    'import { ErrorModal, ConfirmModal, colors, getInitials } from "./dashboardShared";'
  );
}

// 2. Add State for ConfirmProps
if (!mobile.includes('confirmProps')) {
  mobile = mobile.replace(
    'const [error, setError] = useState("");',
    'const [error, setError] = useState("");\n  const [confirmProps, setConfirmProps] = useState({ isOpen: false, title: "", message: "", type: "primary", onConfirm: null });'
  );
}

// 3. Replace updateStatus with confirm logic
const oldUpdateStart = `  const updateStatus = async (id, status) => {
    let msg = "";
    if (status === "approved") msg = "Are you sure you want to approve this user?";
    else if (status === "rejected") msg = "Are you sure you want to reject this user?";
    // restrict already has a confirm in the UI, but we can add it here and remove the UI one later if needed.
    // To be safe, only check approve/reject here if restrict isn't checked
    if (msg && !window.confirm(msg)) return;`;

const newUpdateStart = `  const updateStatus = (id, status) => {
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
          await proceedUpdateStatus(id, status);
        }
      });
      return;
    }
    proceedUpdateStatus(id, status);
  };

  const proceedUpdateStatus = async (id, status) => {`;

mobile = mobile.replace(oldUpdateStart, newUpdateStart);

// 4. Inject <ConfirmModal /> at the end
if (!mobile.includes('<ConfirmModal')) {
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
}

fs.writeFileSync('src/screens/AdminUsers.jsx', mobile);
