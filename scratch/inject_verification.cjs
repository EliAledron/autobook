const fs = require('fs');

// 1. Signup.jsx
let signup = fs.readFileSync('src/screens/Signup.jsx', 'utf8');

if (!signup.includes('sendEmailVerification')) {
  signup = signup.replace('createUserWithEmailAndPassword,', 'createUserWithEmailAndPassword,\n  sendEmailVerification,');
  
  // There are 3 instances of createUserWithEmailAndPassword (customer, owner, mechanic).
  signup = signup.replace(/const \{ user: newUser \} = await createUserWithEmailAndPassword\(auth, email, password\);/g, 'const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);\n        await sendEmailVerification(newUser);');
  
  fs.writeFileSync('src/screens/Signup.jsx', signup);
}

// 2. PendingApproval.jsx
let pending = fs.readFileSync('src/screens/PendingApproval.jsx', 'utf8');
if (!pending.includes('unverified')) {
  // Add Mail icon
  pending = pending.replace('Hourglass, Clock, CheckCircle, XCircle', 'Hourglass, Clock, CheckCircle, XCircle, Mail, RefreshCw');
  
  // Add state update
  pending = pending.replace(
    'if (!user) {\n        navigate("/");\n        return;\n      }',
    `if (!user) {\n        navigate("/");\n        return;\n      }\n\n      if (!user.emailVerified) {\n        setStatus("unverified");\n      }`
  );

  // Add refresh button logic
  const refreshLogic = `
  const handleCheckVerification = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        setStatus("loading");
        window.location.reload();
      } else {
        alert("Email not verified yet. Please check your inbox or spam folder.");
      }
    }
  };
`;
  pending = pending.replace('const handleLogout = async () => {', refreshLogic + '\n  const handleLogout = async () => {');

  // Add UI for unverified
  const unverifiedUI = `
          {status === "unverified" && (
            <>
              <div style={{ ...s.icon, animation: "ab-float 2s ease-in-out infinite" }}><Mail size={48} /></div>
              <h2 style={s.title}>Verify your email</h2>
              <p style={s.subtitle}>
                We sent a verification link to your email address. Please click the link to verify your account, then click the button below.
              </p>

              <button style={{...s.logoutBtn, background: "rgba(70, 233, 255, 0.2)", color: "#46e9ff", width: "100%", marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"}} onClick={handleCheckVerification}>
                <RefreshCw size={18} /> I have verified my email
              </button>
              
              <button style={{...s.logoutBtn, background: "transparent", color: "rgba(255,255,255,0.5)", width: "100%", marginTop: 0}} onClick={handleLogout}>
                Sign out
              </button>
            </>
          )}
`;
  pending = pending.replace('{status === "loading" && (', unverifiedUI + '\n          {status === "loading" && (');

  fs.writeFileSync('src/screens/PendingApproval.jsx', pending);
}
