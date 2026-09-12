const fs = require('fs');
let f = fs.readFileSync('src/screens/AdminUsers.jsx', 'utf8');
f = f.replace(
  'import { sh, colors, getInitials, EmptyState } from "./dashboardShared";',
  'import { sh, colors, getInitials, EmptyState, ConfirmModal } from "./dashboardShared";'
);
fs.writeFileSync('src/screens/AdminUsers.jsx', f);
