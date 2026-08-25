const fs = require('fs');
const path = 'src/screens/OwnerDashboard.jsx';
let text = fs.readFileSync(path, 'utf8');

// 1. Find the first occurrence of `const [animate, setAnimate] = useState(false);` and all subsequent useEffects until `const firstName` and remove them.
text = text.replace(/  const \[animate, setAnimate\] = useState\(false\);\r?\n(?:  useEffect\(\(\) => \{\r?\n    setAnimate\(false\);\r?\n    const t = setTimeout\(\(\) => setAnimate\(true\), 100\);\r?\n    return \(\) => clearTimeout\(t\);\r?\n  \}, \[\]\);\r?\n)+/, '');

// 2. Find where allBookings is declared and insert the correct animate logic after it.
if (!text.includes('setAnimate(false); // trigger')) {
  text = text.replace(/(const \[allBookings, setAllBookings\] = useState\(\[\]\);\r?\n)/, `$1  const [animate, setAnimate] = useState(false);\n  useEffect(() => {\n    if (allBookings.length === 0 && users.length === 0) return;\n    setAnimate(false); // trigger\n    const t = setTimeout(() => setAnimate(true), 100);\n    return () => clearTimeout(t);\n  }, [allBookings.length, users.length]);\n`);
}

fs.writeFileSync(path, text);
console.log('Fixed OwnerDashboard cleanly');
