const fs = require('fs');

let shared = fs.readFileSync('src/screens/dashboardShared.jsx', 'utf8');

const oldConfirmModalRegex = /export function ConfirmModal\(\{ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel", type = "primary" \}\) \{[\s\S]*?<\/div>\s*<\/div>\s*\);\s*\}/g;

const newConfirmModal = `export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel", type = "primary", requireInput = false, inputPlaceholder = "Type here..." }) {
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (isOpen) setInputValue("");
  }, [isOpen]);

  if (!isOpen) return null;

  const typeColors = {
    primary: { bg: colors.navy, text: "#fff", iconBg: "rgba(15, 38, 64, 0.1)", iconColor: colors.navy },
    danger: { bg: colors.danger, text: "#fff", iconBg: colors.dangerBg, iconColor: colors.danger },
    success: { bg: colors.success, text: "#fff", iconBg: colors.successBg, iconColor: colors.success }
  };

  const style = typeColors[type] || typeColors.primary;
  
  const isConfirmDisabled = requireInput && !inputValue.trim();

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999, backgroundColor: "rgba(15,38,64,0.6)", padding: "24px",
      backdropFilter: "blur(6px)"
    }} onClick={onCancel}>
      <div style={{
        background: colors.white, borderRadius: "20px", padding: "28px 24px",
        maxWidth: "340px", width: "100%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)", textAlign: "center",
        animation: "ab-fade-in 0.2s ease-out"
      }} onClick={e => e.stopPropagation()}>
        
        <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: style.iconBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          {type === "danger" && (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={style.iconColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          )}
          {type === "success" && (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={style.iconColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          )}
          {type === "primary" && (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={style.iconColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          )}
        </div>

        <div style={{ fontSize: "18px", fontWeight: "800", color: colors.textPrimary, marginBottom: "8px" }}>{title}</div>
        <div style={{ fontSize: "14px", color: colors.textSecondary, lineHeight: "1.5", marginBottom: "24px" }}>{message}</div>
        
        {requireInput && (
          <div style={{ marginBottom: "24px" }}>
            <textarea 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={inputPlaceholder}
              style={{
                width: "100%", padding: "14px", borderRadius: "12px", border: \`1px solid \${colors.border}\`,
                fontSize: "14px", color: colors.textPrimary, fontFamily: "inherit", boxSizing: "border-box",
                outline: "none", resize: "none", minHeight: "80px", backgroundColor: "#f8fafc"
              }}
              onFocus={(e) => e.target.style.border = \`1px solid \${style.iconColor}\`}
              onBlur={(e) => e.target.style.border = \`1px solid \${colors.border}\`}
            />
          </div>
        )}

        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "14px", borderRadius: "14px", background: colors.bg, border: \`1px solid \${colors.border}\`, color: colors.textSecondary, fontWeight: "700", cursor: "pointer", fontSize: "14px", transition: "all 0.2s" }}>
            {cancelText}
          </button>
          <button onClick={() => isConfirmDisabled ? null : onConfirm(inputValue)} disabled={isConfirmDisabled} style={{ flex: 1, padding: "14px", borderRadius: "14px", background: style.bg, border: "none", color: style.text, fontWeight: "700", cursor: isConfirmDisabled ? "not-allowed" : "pointer", fontSize: "14px", transition: "all 0.2s", opacity: isConfirmDisabled ? 0.5 : 1, boxShadow: !isConfirmDisabled && type === "danger" ? "0 4px 12px rgba(220,38,38,0.25)" : (!isConfirmDisabled && type === "success" ? "0 4px 12px rgba(22,163,74,0.25)" : "none") }}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}`;

shared = shared.replace(oldConfirmModalRegex, newConfirmModal);

fs.writeFileSync('src/screens/dashboardShared.jsx', shared);
