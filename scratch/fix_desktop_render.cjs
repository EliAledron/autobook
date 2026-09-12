const fs = require('fs');
let desktop = fs.readFileSync('src/screens/desktop/DesktopAdminUsers.jsx', 'utf8');

desktop = desktop.replace(
  '  return (\r\n    <RoleBasedWrapper title="User Approvals">',
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
      <RoleBasedWrapper title="User Approvals">`
);

desktop = desktop.replace(
  '    </RoleBasedWrapper>\r\n  );\r\n}',
  '    </RoleBasedWrapper>\r\n    </>\r\n  );\r\n}'
);

// Fallback if \r\n wasn't there
if (!desktop.includes('<ConfirmModal')) {
  desktop = desktop.replace(
    /return \(\s*<RoleBasedWrapper title="User Approvals">/,
    `return (
    <>
      <ConfirmModal 
        isOpen={confirmProps.isOpen}
        title={confirmProps.title}
        message={confirmProps.message}
        type={confirmProps.type}
        onCancel={() => setConfirmProps({ isOpen: false })}
        onConfirm={confirmProps.onConfirm}
      />
      <RoleBasedWrapper title="User Approvals">`
  );
  
  desktop = desktop.replace(
    /<\/RoleBasedWrapper>\s*\);\s*\}/,
    '    </RoleBasedWrapper>\n    </>\n  );\n}'
  );
}

fs.writeFileSync('src/screens/desktop/DesktopAdminUsers.jsx', desktop);
