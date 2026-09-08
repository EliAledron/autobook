const fs = require('fs');
let code = fs.readFileSync('src/screens/Profile.jsx', 'utf8');

// Inject import
if (!code.includes('DesktopAdminProfile')) {
  code = code.replace(
    'export default function Profile() {',
    'import DesktopAdminProfile from "./desktop/DesktopAdminProfile";\n\nexport default function Profile() {'
  );
}

// Extract userProfile
if (!code.includes('const { userProfile, refreshUserProfile } = useUser();')) {
  code = code.replace(
    'const { refreshUserProfile } = useUser();',
    'const { userProfile, refreshUserProfile } = useUser();'
  );
}

// Inject conditional return
if (!code.includes('if (isAdmin) return <DesktopAdminProfile />;')) {
  code = code.replace(
    'const [uid, setUid] = useState("");',
    'const isAdmin = userProfile?.role?.toLowerCase() === "admin";\n  if (isAdmin) return <DesktopAdminProfile />;\n\n  const [uid, setUid] = useState("");'
  );
}

fs.writeFileSync('src/screens/Profile.jsx', code);
