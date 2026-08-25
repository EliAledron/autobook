const fs = require('fs');
const files = ['AdminUsers.jsx', 'Adminbookings.jsx', 'Adminmechanics.jsx', 'BookingHistory.jsx', 'CustomerDashboard.jsx', 'Mechanicrequests.jsx', 'OwnerDashboard.jsx'];

files.forEach(f => {
  const path = 'src/screens/' + f;
  let text = fs.readFileSync(path, 'utf8');
  
  // 1. Add animate state if not exists
  if (!text.includes('const [animate, setAnimate]')) {
    text = text.replace(/const \[([a-zA-Z]+), set\1\] = useState\([^)]*\);/, (match) => {
      return match + '\n  const [animate, setAnimate] = useState(false);\n  useEffect(() => {\n    setAnimate(false);\n    const t = setTimeout(() => setAnimate(true), 100);\n    return () => clearTimeout(t);\n  }, []);';
    });
  }

  // 2. Remove ONLY the gauge CSS from keyframes (if it exists)
  text = text.replace(/@property\s+--fill-angle\s*\{[\s\S]*?initial-value:\s*0deg;\s*\}/, '');
  text = text.replace(/@keyframes\s+gauge-fill\s*\{[\s\S]*?to\s*\{\s*--fill-angle:\s*180deg;\s*\}\s*\}/, '');
  text = text.replace(/\.gauge-chart-mask\s*\{[\s\S]*?animation:\s*gauge-fill[^}]+\}/, '');
  text = text.replace(/\.gauge-needle\s*\{[\s\S]*?animation:\s*gauge-fill[^}]+\}/, '');
  text = text.replace(/\.gauge-needle::after\s*\{[\s\S]*?border-radius:\s*50%;\s*\}/, '');

  // 3. Replace mask
  const maskReplacement = (m, g1) => `{${g1} > 0 && (
                    <div style={{
                      position: "absolute", top: 0, left: 0, width: "100%", height: "200%", borderRadius: "50%",
                      background: colors.white,
                      clipPath: "polygon(0 0, 100% 0, 100% 50%, 0 50%)",
                      transform: \`rotate(\${animate ? 180 : 0}deg)\`,
                      transformOrigin: "center center",
                      transition: "transform 1s cubic-bezier(0.16, 1, 0.3, 1)"
                    }} />
                  )}`;

  text = text.replace(/\{([^{}]+) > 0 && <div className="gauge-chart-mask"[^>]*><\/div>\}/g, maskReplacement);
  text = text.replace(/\{([^{}]+) > 0 && <div className="gauge-chart-mask"[^>]*>\s*<\//g, maskReplacement);
  text = text.replace(/\{([^{}]+) > 0 && <div className="gauge-chart-mask"[^>]*\/>\}/g, maskReplacement);
  text = text.replace(/\{([a-zA-Z0-9_.]+) > 0 && <div className="gauge-chart-mask"[^>]*\/>\}/g, maskReplacement);

  // 4. Replace needle
  const needleReplacement = `<div style={{
                    position: "absolute", bottom: 0, left: "50%", width: "4px", height: "100%",
                    background: "#111827", borderRadius: "4px 4px 0 0",
                    transformOrigin: "bottom center",
                    transform: \`translateX(-50%) rotate(\${animate ? 90 : -90}deg)\`,
                    transition: "transform 1s cubic-bezier(0.16, 1, 0.3, 1)",
                    zIndex: 2
                  }}>
                    <div style={{
                      position: "absolute", bottom: "-4px", left: "-4px", width: "12px", height: "12px",
                      background: "#111827", borderRadius: "50%"
                    }} />
                  </div>`;
  text = text.replace(/<div className="gauge-needle">\s*<\/div>/g, needleReplacement);
  text = text.replace(/<div className="gauge-needle"><\/div>/g, needleReplacement);
  text = text.replace(/<div className="gauge-needle"\s*\/>/g, needleReplacement);

  fs.writeFileSync(path, text);
});
console.log('done');
