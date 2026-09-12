const fs = require('fs');

let pending = fs.readFileSync('src/screens/PendingApproval.jsx', 'utf8');

if (!pending.includes('handleResendEmail')) {
  // Add sendEmailVerification to imports
  pending = pending.replace(
    'import { onAuthStateChanged, signOut } from "firebase/auth";',
    'import { onAuthStateChanged, signOut, sendEmailVerification } from "firebase/auth";'
  );

  const resendLogic = `
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleResendEmail = async () => {
    if (auth.currentUser && resendCooldown === 0) {
      try {
        await sendEmailVerification(auth.currentUser);
        alert("Verification email resent! Please check your inbox and spam folder.");
        setResendCooldown(60);
        const interval = setInterval(() => {
          setResendCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } catch (err) {
        alert("Error resending email: " + err.message);
      }
    }
  };
`;
  pending = pending.replace('const handleCheckVerification = async () => {', resendLogic + '\n  const handleCheckVerification = async () => {');

  const resendButton = `
              <button style={{...s.logoutBtn, background: "transparent", border: "1px solid rgba(70, 233, 255, 0.5)", color: "#46e9ff", width: "100%", marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "center"}} onClick={handleResendEmail} disabled={resendCooldown > 0}>
                {resendCooldown > 0 ? \`Resend available in \${resendCooldown}s\` : 'Resend Verification Email'}
              </button>
`;
  pending = pending.replace('I have verified my email\n              </button>', 'I have verified my email\n              </button>\n' + resendButton);

  fs.writeFileSync('src/screens/PendingApproval.jsx', pending);
}
