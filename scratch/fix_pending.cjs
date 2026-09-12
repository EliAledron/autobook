const fs = require('fs');

let pending = fs.readFileSync('src/screens/PendingApproval.jsx', 'utf8');

// Regex replace to ensure we catch whitespace variations
const regex = /if\s*\(!user\)\s*\{\s*navigate\("\/"\);\s*return;\s*\}/g;

pending = pending.replace(
  regex,
  `if (!user) {
        navigate("/");
        return;
      }

      if (!user.emailVerified) {
        setStatus("unverified");
        return;
      }`
);

fs.writeFileSync('src/screens/PendingApproval.jsx', pending);
