const fs = require('fs');
let code = fs.readFileSync('src/screens/Profile.jsx', 'utf8');

const regex = /<button\s+className="profile-save-btn profile-input-row"[\s\S]*?<\/button>/;

const newButton = `<button
              className="profile-save-btn profile-input-row"
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

code = code.replace(regex, newButton);

fs.writeFileSync('src/screens/Profile.jsx', code);
