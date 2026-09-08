const fs = require('fs');
let code = fs.readFileSync('src/screens/Profile.jsx', 'utf8');

if (!code.includes('import { Save }')) {
  code = code.replace(
    'import BackButton from "../components/BackButton";',
    'import BackButton from "../components/BackButton";\nimport { Save } from "lucide-react";'
  );
}

const oldButton = `            <button
              className="profile-btn profile-primary-btn fade-up"
              style={{
                width: "100%", padding: "16px",
                background: \`linear-gradient(135deg, \${colors.navy} 0%, \${colors.blue} 50%, #4facfe 100%)\`,
                color: "#fff", fontSize: "15px", fontWeight: "700",
                border: "none", borderRadius: "16px", cursor: "pointer", 
                fontFamily: "inherit", marginBottom: "20px",
                opacity: saving ? 0.75 : 1,
                animationDelay: "0.3s"
              }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>`;

const newButton = `            <button
              className="profile-btn profile-primary-btn fade-up"
              style={{
                width: "100%", padding: "16px",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                background: colors.navy,
                color: "#fff", fontSize: "15px", fontWeight: "700",
                border: "none", borderRadius: "16px", cursor: "pointer", 
                fontFamily: "inherit", marginBottom: "20px",
                opacity: saving ? 0.75 : 1,
                animationDelay: "0.3s"
              }}
              onClick={handleSave}
              disabled={saving}
            >
              <Save size={18} />
              {saving ? "Saving..." : "Save Changes"}
            </button>`;

code = code.replace(oldButton, newButton);

fs.writeFileSync('src/screens/Profile.jsx', code);
