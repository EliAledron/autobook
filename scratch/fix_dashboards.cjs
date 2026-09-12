const fs = require('fs');
['CustomerDashboard.jsx', 'OwnerDashboard.jsx', 'MechanicDashboard.jsx'].forEach(f => {
  let file = 'src/screens/' + f;
  if (!fs.existsSync(file)) return;
  let data = fs.readFileSync(file, 'utf8');
  data = data.replace('import, {', 'import {');
  fs.writeFileSync(file, data);
});
