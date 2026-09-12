const fs = require('fs');
const path = require('path');

const filesToInject = [
  'src/screens/CustomerDashboard.jsx',
  'src/screens/OwnerDashboard.jsx',
  'src/screens/MechanicDashboard.jsx',
  'src/components/AdminLayout.jsx'
];

filesToInject.forEach(filepath => {
  if (!fs.existsSync(filepath)) return;
  let file = fs.readFileSync(filepath, 'utf8');

  // Inject import if not exists
  if (!file.includes('NotificationBell')) {
    // find a place to put import. Just after React
    if (filepath.includes('AdminLayout')) {
       file = file.replace('import React', 'import React from "react";\nimport NotificationBell from "./NotificationBell";\nimport');
    } else {
       file = file.replace('import React', 'import React from "react";\nimport NotificationBell from "../components/NotificationBell";\nimport');
    }
  }

  // Inject component
  if (!file.includes('<NotificationBell />')) {
    file = file.replace('<TopbarAvatar', '<NotificationBell />\n            <TopbarAvatar');
  }

  // Fix duplicate react import if any
  file = file.replace(/import React from "react";\nimport React/g, 'import React');

  fs.writeFileSync(filepath, file);
  console.log(`Injected into ${filepath}`);
});
