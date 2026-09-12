const fs = require('fs');
let f = fs.readFileSync('src/components/AdminLayout.jsx', 'utf8');
f = f.replace('import, { useEffect', 'import { useEffect');
fs.writeFileSync('src/components/AdminLayout.jsx', f);
