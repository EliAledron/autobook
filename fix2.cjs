const fs = require('fs');
const files = ['AdminUsers.jsx', 'Adminbookings.jsx', 'Adminmechanics.jsx', 'BookingHistory.jsx', 'CustomerDashboard.jsx', 'Mechanicrequests.jsx', 'OwnerDashboard.jsx'];

files.forEach(f => {
  const path = 'src/screens/' + f;
  let text = fs.readFileSync(path, 'utf8');
  
  if (!text.includes('const [animate, setAnimate]')) {
    text = text.replace(/const navigate = useNavigate\(\);/, `const navigate = useNavigate();
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    setAnimate(false);
    const t = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(t);
  }, []);`);
    fs.writeFileSync(path, text);
  }
});
console.log('done state inject');
