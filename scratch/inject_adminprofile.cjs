const fs = require('fs');
let code = fs.readFileSync('src/screens/Profile.jsx', 'utf8');

if (!code.includes('DesktopAdminProfile')) {
  // Inject imports and logic
  code = code.replace(
    'export default function Profile() {',
    `import DesktopAdminProfile from "./desktop/DesktopAdminProfile";\n\nexport default function Profile() {`
  );
  
  code = code.replace(
    '  const [uid, setUid] = useState("");',
    `  const isAdmin = userProfile?.role?.toLowerCase() === "admin";\n  if (isAdmin) return <DesktopAdminProfile />;\n\n  const [uid, setUid] = useState("");`
  );

  fs.writeFileSync('src/screens/Profile.jsx', code);
}
