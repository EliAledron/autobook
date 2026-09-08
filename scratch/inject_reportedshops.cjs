const fs = require('fs');

// 1. App.jsx
let appCode = fs.readFileSync('src/App.jsx', 'utf8');
if (!appCode.includes('DesktopAdminReportedShops')) {
  appCode = appCode.replace('import AdminLayout from "./components/AdminLayout";', 'import AdminLayout from "./components/AdminLayout";\nimport DesktopAdminReportedShops from "./screens/desktop/DesktopAdminReportedShops";');
  
  appCode = appCode.replace('<Route path="/admin/reports" element={<AdminReports />} />', '<Route path="/admin/reports" element={<AdminReports />} />\n          <Route path="/admin/reported-shops" element={<DesktopAdminReportedShops />} />');
  
  fs.writeFileSync('src/App.jsx', appCode);
}

// 2. AdminLayout.jsx
let layoutCode = fs.readFileSync('src/components/AdminLayout.jsx', 'utf8');
if (!layoutCode.includes('/admin/reported-shops')) {
  // Add icon import
  layoutCode = layoutCode.replace('AlertTriangle, MessageSquare,', 'AlertTriangle, MessageSquare, ShieldAlert,');
  
  // Add sidebar link
  layoutCode = layoutCode.replace('{ label: "Global Alerts",', '{ label: "Reported Shops", icon: <ShieldAlert size={20} />, path: "/admin/reported-shops" },\n    { label: "Global Alerts",');
  
  fs.writeFileSync('src/components/AdminLayout.jsx', layoutCode);
}
