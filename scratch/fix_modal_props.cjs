const fs = require('fs');

function fixProps(filepath) {
  let file = fs.readFileSync(filepath, 'utf8');
  if (!file.includes('requireInput={confirmProps.requireInput}')) {
    const oldTag = /<ConfirmModal\s+isOpen=\{confirmProps.isOpen\}\s+title=\{confirmProps.title\}\s+message=\{confirmProps.message\}\s+type=\{confirmProps.type\}/g;
    file = file.replace(oldTag, '<ConfirmModal \n          isOpen={confirmProps.isOpen}\n          title={confirmProps.title}\n          message={confirmProps.message}\n          type={confirmProps.type}\n          requireInput={confirmProps.requireInput}\n          inputPlaceholder={confirmProps.inputPlaceholder}');
    fs.writeFileSync(filepath, file);
    console.log("Fixed", filepath);
  } else {
    console.log("Already fixed", filepath);
  }
}

fixProps('src/screens/desktop/DesktopAdminUsers.jsx');
fixProps('src/screens/AdminUsers.jsx');
