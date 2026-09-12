const fs = require('fs');
let mobile = fs.readFileSync('src/screens/AdminUsers.jsx', 'utf8');

mobile = mobile.replace(
  '  return (\r\n    <div style={sh.page}>',
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
      <div style={sh.page}>`
);

mobile = mobile.replace(
  '  return (\n    <div style={sh.page}>',
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
      <div style={sh.page}>`
);

mobile = mobile.replace(
  '    </div>\r\n  );\r\n}',
  '    </div>\r\n    </>\r\n  );\r\n}'
);
mobile = mobile.replace(
  '    </div>\n  );\n}',
  '    </div>\n    </>\n  );\n}'
);

fs.writeFileSync('src/screens/AdminUsers.jsx', mobile);
