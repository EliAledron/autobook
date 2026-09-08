const fs = require('fs');
let code = fs.readFileSync('src/screens/Profile.jsx', 'utf8');

if (!code.includes('ReviewAppModal')) {
  // Import
  code = code.replace('import BackButton from "../components/BackButton";', 'import BackButton from "../components/BackButton";\nimport ReviewAppModal from "../components/ReviewAppModal";');

  // Add state
  code = code.replace('const [error, setError] = useState("");', 'const [error, setError] = useState("");\n  const [showReviewModal, setShowReviewModal] = useState(false);');

  // Add Button
  const signOutButton = '{/* SIGN OUT */}';
  const buttonCode = `        <div style={sh.sectionLabel}>Feedback</div>
        <div className="profile-card" style={{ ...sh.card, padding: 0, borderRadius: "20px", border: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.03)", marginBottom: "32px" }}>
          <button
            className="profile-btn profile-outline-btn"
            style={{ width: "100%", padding: "16px", fontSize: "15px", fontWeight: "700", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "transparent", color: colors.navy }}
            onClick={() => setShowReviewModal(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            Rate AutoBook
          </button>
        </div>

        {/* SIGN OUT */}`;

  code = code.replace(signOutButton, buttonCode);

  // Add Modal
  const modalCode = `      {showReviewModal && <ReviewAppModal onClose={() => setShowReviewModal(false)} userProfile={{id: uid, name: name, role: role}} />}
    </div>
  );
}
`;
  // Safe replacement at the end of the component
  code = code.replace(/    <\/div>\s*<\/div>\s*\);\s*}\s*$/, `      </div>\n${modalCode}`);
  
  fs.writeFileSync('src/screens/Profile.jsx', code);
}
