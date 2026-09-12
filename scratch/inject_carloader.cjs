const fs = require('fs');
let content = fs.readFileSync('src/screens/PendingApproval.jsx', 'utf8');

// Import
if (!content.includes('import CarLoader')) {
  content = content.replace(
    'import { useNavigate } from "react-router-dom";',
    'import { useNavigate } from "react-router-dom";\nimport CarLoader from "../components/CarLoader";'
  );
}

// Replace the Hourglass loader
const oldLoader = `{status === "loading" && (
          <div style={s.stateContainer}>
            <div style={{ ...s.iconWrap, background: "#f1f5f9", color: "#64748b", animation: "pulse-soft 2s infinite" }}>
              <Hourglass size={40} />
            </div>
            <h2 style={s.title}>Loading...</h2>
          </div>
        )}`;

const newLoader = `{status === "loading" && (
          <div style={s.stateContainer}>
            <CarLoader text="Loading your profile..." />
          </div>
        )}`;

content = content.replace(oldLoader, newLoader);

fs.writeFileSync('src/screens/PendingApproval.jsx', content);
