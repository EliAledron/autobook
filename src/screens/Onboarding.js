import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";

/* ─── Google Icon ─────────────────────────────────────────────── */
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
    <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.8 6.5 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.6-8 19.6-20 0-1.3-.1-2.7-.4-4z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.8 6.5 29.2 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.8-1.8 13.4-4.7l-6.2-5.2C29.3 35.5 26.8 36 24 36c-5.2 0-9.7-3.3-11.3-8H6.4C9.7 38.9 16.3 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C40.9 35.4 44 30.1 44 24c0-1.3-.1-2.7-.4-4z" />
  </svg>
);

/* ─── Feature data ────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: "🔔",
    title: "Real-Time Notification System",
    desc: "Instant updates and alerts for bookings and service progress.",
  },
  {
    icon: "⚙️",
    title: "Rule-Based Maintenance Information",
    desc: "Automated tracking and smart reminders for routine car care.",
  },
  {
    icon: "🩺",
    title: "Diagnostic Support",
    desc: "Identify vehicle issues and get expert service recommendations.",
  },
];

const ROLES = ["Customer", "Owner", "Mechanic"];

const MECHANIC_SPECIALTIES = [
  "General Mechanic", "Electrician", "Aircon Tech",
  "Transmission", "Engine Specialist", "Underside/Suspension",
  "Paint & Body", "Tire & Alignment"
];

const COLORS_LIST = ["White", "Black", "Silver", "Gray", "Red", "Blue", "Green", "Yellow", "Orange", "Brown", "Other"];

/* ─── Cloudinary config ───────────────────────────────────────── */
const CLOUDINARY_CLOUD = "dpwojan8w";
const CLOUDINARY_PRESET = "autobook_uploads";

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Upload failed: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return data.secure_url;
}

/* ─── Firebase helpers ────────────────────────────────────────── */
async function checkStatusAndNavigate(uid, navigate, setError) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) { navigate("/dashboard"); return; }
  const { status, role = "" } = snap.data();
  const r = role.toLowerCase();
  if (r === "admin") { navigate("/dashboard"); return; }
  if (status === "approved") { navigate("/dashboard"); return; }
  if (status === "rejected") { setError("Your account has been rejected. Contact support."); return; }
  navigate("/pending");
}

const saveUser = async (user, resolvedRole, namesObj, permitUrl = "", shopNameStr = "", specializationStr = "", extraData = {}) => {
    const finalRole = resolvedRole || "Customer";
    const isOwner = finalRole.toLowerCase() === "owner";
    const isMechanic = finalRole.toLowerCase() === "mechanic";
    
    const fName = namesObj?.firstName || "";
    const mName = namesObj?.middleName || "";
    const lName = namesObj?.lastName || "";
    const computedDisplayName = [fName, mName, lName].filter(Boolean).join(" ");
    
    const dName = computedDisplayName || user.displayName || user.email;

    const userData = {
      email: user.email,
      displayName: dName,
      firstName: fName,
      middleName: mName,
      lastName: lName,
      role: finalRole,
      status: "pending",
      createdAt: serverTimestamp(),
    };
  if (isOwner) {
    userData.businessPermitUrl = permitUrl;
    userData.shopName = shopNameStr;
  } else if (isMechanic) {
    userData.shopName = shopNameStr;
    userData.specialization = specializationStr;
  }
  if (extraData.licenseUrl) {
    userData.licenseUrl = extraData.licenseUrl;
  }
  await setDoc(doc(db, "users", user.uid), userData);

    await addDoc(collection(db, "adminAlerts"), {
      type: "new_user",
      title: "New User Registration 👤",
      message: `${dName} just registered as a ${finalRole} and is waiting for approval.`,
      read: false,
      createdAt: serverTimestamp(),
    });
}

/* ═══════════════════════════════════════════════════════════════
   MAIN ONBOARDING COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function Onboarding() {
  // null | "signup" | "login"
  const [drawerScreen, setDrawerScreen] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  const openDrawer = (target) => {
    setDrawerScreen(target);
    setTimeout(() => setDrawerOpen(true), 10);
  };
  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setDrawerScreen(null), 450); // wait for slide down animation
  };
  return (
    <>
      <style>
        {`
          @keyframes ab-fade-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes ab-zoom-in {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes ab-shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-4px); }
            40%, 80% { transform: translateX(4px); }
          }
          .ab-input { transition: all 0.2s ease; }
          .ab-input:focus {
            border-color: #2a5298 !important;
            box-shadow: 0 0 0 4px rgba(42,82,152,0.1) !important;
            background: #ffffff !important;
          }
          .ab-btn { transition: all 0.2s ease; }
          .ab-btn:active:not(:disabled) {
            transform: translateY(0);
          }
          .ab-glass-btn { transition: all 0.2s ease; }
          .ab-glass-btn:active {
            transform: translateY(0);
          }
          .ab-back-btn { transition: all 0.2s ease; }
          .ab-back-btn:active {
            transform: scale(0.9);
          }
          @keyframes ab-float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
          }
          .ab-feature-card { transition: all 0.3s ease; }
        `}
      </style>
      <div style={s.root}>
        {/* ── Landing (always behind) ── */}
        <LandingContent onSignup={() => openDrawer("signup")} onLogin={() => openDrawer("login")} />
          {drawerOpen && <div style={s.backdrop} onClick={closeDrawer} />}

        {/* ── Drawer panel — slides up from bottom carrying the form ── */}
        <div
          style={{
            ...s.drawer,
            transform: drawerOpen ? "translateY(0%)" : "translateY(100%)",
          }}
        >
          {drawerScreen === "signup" && <SignupForm goBack={closeDrawer} navigate={navigate} />}
          {drawerScreen === "login" && <LoginForm goBack={closeDrawer} navigate={navigate} />}
        </div>
      </div>
    </>
  );
}

/* ─── Landing Content ─────────────────────────────────────────── */
function LandingContent({ onSignup, onLogin }) {
  return (
    <div style={s.landing}>

    {/* ✅ NEW BACKGROUND */}
      <div style={s.bgImage} />
      <div style={s.bgOverlay} />

      {/* Hero */}
      <div style={{...s.hero, animation: "ab-zoom-in 0.8s ease backwards"}}>
        <div style={s.logoRing}>
          <img src="/autobook-logo.png" alt="AutoBook" style={s.logoImg} />
        </div>
        <h1 style={s.heroTitle}>AutoBook</h1>
        <p style={s.heroSub}>The all-in-one platform for modern auto shops</p>
      </div>

      {/* Features */}
      <div style={s.featuresWrap}>
        {FEATURES.map((f, i) => (
          <div key={f.title} className="ab-feature-card" style={{
            ...s.featureCard,
            animationDelay: `${i * 0.15}s`,
            ...(FEATURES.length % 2 !== 0 && i === FEATURES.length - 1 ? { gridColumn: "1 / -1" } : {})
          }}>
            <span style={s.featureIcon}>{f.icon}</span>
            <div>
              <p style={s.featureTitle}>{f.title}</p>
              <p style={s.featureDesc}>{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div style={s.ctaWrap}>
        <button className="ab-btn" style={s.ctaPrimary} onClick={onSignup}>
          Create Account
        </button>
        <button className="ab-glass-btn" style={s.ctaSecondary} onClick={onLogin}>
          Already have an account? <strong>Log in</strong>
        </button>
      </div>

      <p style={s.legalNote}>By continuing, you agree to our Terms & Privacy Policy.</p>
    </div>
  );
}

/* ─── Signup Form ─────────────────────────────────────────────── */
function SignupForm({ goBack, navigate }) {
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("");

  const [shopName, setShopName] = useState("");
  const [permitFile, setPermitFile] = useState(null);
  const [permitPreview, setPermitPreview] = useState(null);
  const [createdUser, setCreatedUser] = useState(null);

  const [mechanicShopName, setMechanicShopName] = useState("");
  const [mechanicSpecialization, setMechanicSpecialization] = useState("");

  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [vehiclePhotoFile, setVehiclePhotoFile] = useState(null);
  const [vehiclePhotoPreview, setVehiclePhotoPreview] = useState(null);

  const [licenseFile, setLicenseFile] = useState(null);
  const [licensePreview, setLicensePreview] = useState(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNext = async (e) => {
    e.preventDefault();
    setError("");
    if (!firstName.trim() || !lastName.trim()) return setError("Please enter your first and last name.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (!role) return setError("Please select a role.");

    if (role === "Owner") {
      setStep(2);
    } else if (role === "Mechanic") {
      setStep(4);
    } else {
      setStep(3);
    }
  };

  const executeSignup = async (permitUrl = "", shopNameStr = "") => {
    setLoading(true);
    try {
      let dName = [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(" ");
      let user = createdUser;
      if (!user) {
        const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
        user = newUser;
        await updateProfile(user, { displayName: dName });
      }
      await saveUser(user, role, { firstName: firstName.trim(), middleName: middleName.trim(), lastName: lastName.trim() }, permitUrl, shopNameStr);
      navigate("/pending");
    } catch (err) {
      setError(err.code === "auth/email-already-in-use" ? "This email is already registered." : err.message);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (!role) return setError("Please select a role before continuing with Google.");
    setError("");
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      const user = result.user;
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        navigate("/pending");
        return;
      }
      setCreatedUser(user);
      
      const parts = (user.displayName || "").split(" ");
      setFirstName(parts[0] || "");
      setLastName(parts.length > 1 ? parts.slice(1).join(" ") : "");
      setMiddleName("");
      
      setEmail(user.email || "");

      if (role === "Owner") {
        setStep(2);
      } else if (role === "Mechanic") {
        setStep(4);
      } else {
        setStep(3);
      }
    } catch {
      setError("Google sign-up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOwnerSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!shopName.trim()) return setError("Please enter your shop name.");
    if (!permitFile) return setError("Please upload your business permit.");

    setLoading(true);
    try {
      let user = createdUser;
      if (!user) {
        const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
        user = newUser;
        const dName = [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(" ");
        await updateProfile(user, { displayName: dName });
      }

      const permitUrl = await uploadToCloudinary(permitFile);
      await saveUser(user, role, { firstName: firstName.trim(), middleName: middleName.trim(), lastName: lastName.trim() }, permitUrl, shopName.trim());
      navigate("/pending");
    } catch (err) {
      setError(err.code === "auth/email-already-in-use" ? "This email is already registered." : err.message);
      setLoading(false);
    }
  };

  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!licenseFile) return setError("Driver's license is required.");
    if (!vehicleMake.trim() || !vehicleModel.trim()) return setError("Vehicle make and model are required.");
    if (!vehiclePlate.trim()) return setError("Vehicle plate number is required.");

    setLoading(true);
    try {
      let user = createdUser;
      if (!user) {
        const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
        user = newUser;
        const dName = [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(" ");
        await updateProfile(user, { displayName: dName });
      }
      
      let licenseUrl = null;
      if (licenseFile) {
        licenseUrl = await uploadToCloudinary(licenseFile);
      }

      await saveUser(user, role, { firstName: firstName.trim(), middleName: middleName.trim(), lastName: lastName.trim() }, "", "", "", { licenseUrl });

      let vehiclePhotoUrl = null;
      if (vehiclePhotoFile) {
        vehiclePhotoUrl = await uploadToCloudinary(vehiclePhotoFile);
      }

      await addDoc(collection(db, "vehicles"), {
        ownerId: user.uid,
        make: vehicleMake.trim(),
        model: vehicleModel.trim(),
        year: vehicleYear.trim(),
        plate: vehiclePlate.trim().toUpperCase(),
        color: vehicleColor,
        photoURL: vehiclePhotoUrl,
        createdAt: serverTimestamp(),
      });

      navigate("/pending");
    } catch (err) {
      setError(err.code === "auth/email-already-in-use" ? "This email is already registered." : err.message);
      setLoading(false);
    }
  };

  const handleMechanicSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!mechanicShopName.trim()) return setError("Please enter your shop name or employer.");
    if (!mechanicSpecialization.trim()) return setError("Please select your specialization.");

    setLoading(true);
    try {
      let user = createdUser;
      if (!user) {
        const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
        user = newUser;
        const dName = [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(" ");
        await updateProfile(user, { displayName: dName });
      }

      await saveUser(user, role, { firstName: firstName.trim(), middleName: middleName.trim(), lastName: lastName.trim() }, "", mechanicShopName.trim(), mechanicSpecialization);
      navigate("/pending");
    } catch (err) {
      setError(err.code === "auth/email-already-in-use" ? "This email is already registered." : err.message);
      setLoading(false);
    }
  };

  return (
    <div style={s.formPage}>
      {/* Header stripe */}
      <div style={s.formHeader}>
        <div style={s.formLogoWrap}>
          <img src="/autobook-logo.png" alt="AutoBook" style={s.formLogo} />
        </div>
        <div style={s.formHeaderText}>
          <h2 style={s.formTitle}>Create Account</h2>
          <p style={s.formSub}>Join AutoBook today</p>
        </div>
        <button className="ab-back-btn" style={s.backBtn} onClick={goBack} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div style={s.formScroll}>
        {error && (
          <div style={s.errorOverlay}>
            <div style={s.errorModal}>
              <div style={s.errorModalIcon}>⚠️</div>
              <h3 style={s.errorModalTitle}>Oops!</h3>
              <p style={s.errorModalText}>{error}</p>
              <button style={s.errorModalBtn} onClick={() => setError("")}>Okay</button>
            </div>
          </div>
        )}

        <div style={s.formCard}>
          {step === 1 ? (
            <>
              <label style={s.label}>First Name</label>
              <input className="ab-input" type="text" placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value.replace(/[^a-zA-Z\s-]/g, ''))} style={s.input} />

              <label style={s.label}>Middle Name</label>
              <input className="ab-input" type="text" placeholder="Middle name (optional)" value={middleName} onChange={e => setMiddleName(e.target.value.replace(/[^a-zA-Z\s-]/g, ''))} style={s.input} />

              <label style={s.label}>Last Name</label>
              <input className="ab-input" type="text" placeholder="Last name" value={lastName} onChange={e => setLastName(e.target.value.replace(/[^a-zA-Z\s-]/g, ''))} style={s.input} />

              <label style={s.label}>Email Address</label>
              <input className="ab-input" type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} style={s.input} />

              <label style={s.label}>Create Password</label>
              <input className="ab-input" type="password" placeholder="At least 6 characters" value={password} onChange={e => setPassword(e.target.value)} style={s.input} />

              <label style={s.label}>Confirm Password</label>
              <input className="ab-input" type="password" placeholder="Re-enter your password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={s.input} />

              <label style={s.label}>Select Your Role</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "28px" }}>
                {ROLES.map((r) => {
                  const isSelected = role === r;
                  return (
                  <div
                    key={r}
                    onClick={() => { setRole(r); setError(""); }}
                    style={{
                      padding: "16px 12px",
                      borderRadius: "16px",
                      cursor: "pointer",
                      border: isSelected ? "2px solid #2a5298" : "1.5px solid #e5e7eb",
                      background: isSelected ? "rgba(42,82,152,0.04)" : "#ffffff",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
                      transition: "all 0.2s ease",
                      transform: isSelected ? "translateY(-2px)" : "none",
                      boxShadow: isSelected ? "0 8px 16px rgba(42,82,152,0.12)" : "0 2px 4px rgba(0,0,0,0.02)",
                    }}
                  >
                    <div style={{ fontSize: "28px" }}>{r === "Customer" ? "🚗" : r === "Owner" ? "🏪" : "🔧"}</div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "14px", fontWeight: "800", color: isSelected ? "#1a3a5c" : "#374151" }}>
                        {r} {isSelected && "✅"}
                      </div>
                      <div style={{ fontSize: "11px", fontWeight: "600", color: "#6b7280", marginTop: "4px" }}>
                      {r === "Customer" ? "Book services" : r === "Owner" ? "Manage the shop" : "Service vehicles"}
                      </div>
                    </div>
                  </div>
                  )
                })}
              </div>

              <button onClick={handleNext} className="ab-btn" style={{ ...s.primaryBtn, opacity: loading ? 0.75 : 1 }} disabled={loading}>
                {loading ? "Please wait…" : role ? "Next Step" : "Create Account"}
              </button>

              <div style={s.divider}><div style={s.dividerLine} /><span style={s.dividerLabel}>or</span><div style={s.dividerLine} /></div>

              <button onClick={handleGoogleSignup} className="ab-btn" style={s.googleBtn} disabled={loading}>
                <GoogleIcon />Continue with Google
              </button>
            </>
          ) : step === 2 ? (
            <>
              <h3 style={{ marginTop: 0, color: "#111827", fontSize: "18px", fontWeight: "700" }}>Shop Details</h3>
              <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "16px", marginTop: "-4px" }}>Please provide your auto shop details and proof of business.</p>

              <label style={s.label}>Shop Name</label>
              <input className="ab-input" type="text" placeholder="Your shop name" value={shopName} onChange={e => setShopName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))} style={s.input} />

              <label style={s.label}>Business Permit / Proof</label>
              <input type="file" accept="image/*" id="permitUpload" style={{ display: "none" }} onChange={(e) => {
                const file = e.target.files[0];
                if (file) { setPermitFile(file); setPermitPreview(URL.createObjectURL(file)); }
              }} />
              <div onClick={() => document.getElementById("permitUpload").click()} style={{ width: "100%", height: permitPreview ? "160px" : "100px", background: "#f9fafb", borderRadius: "14px", border: "1.5px dashed #d1d5db", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", marginBottom: "20px", fontSize: "13px", color: "#9ca3af" }}>
                {permitPreview ? <img src={permitPreview} alt="permit" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }} /> : "📎 Tap to upload permit photo"}
              </div>

              <button onClick={handleOwnerSubmit} className="ab-btn" style={{ ...s.primaryBtn, opacity: loading ? 0.75 : 1 }} disabled={loading}>
                {loading ? "Submitting…" : "Complete Sign Up"}
              </button>
              <button onClick={() => setStep(1)} className="ab-btn" style={s.outlineBtn} disabled={loading}>
                Back
              </button>
            </>
          ) : step === 3 ? (
            <>
              <h3 style={{ marginTop: 0, color: "#111827", fontSize: "18px", fontWeight: "700" }}>Verification & Vehicle Details</h3>
              <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "16px", marginTop: "-4px" }}>Please provide your driver's license and register your primary vehicle to continue.</p>

              <label style={s.label}>Driver's License *</label>
              <input
                type="file"
                accept="image/*"
                id="licenseUpload"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setLicenseFile(file);
                    setLicensePreview(URL.createObjectURL(file));
                  }
                }}
              />
              <div
                onClick={() => document.getElementById("licenseUpload").click()}
                style={{
                  width: "100%", height: licensePreview ? "160px" : "100px",
                  background: "#f9fafb", borderRadius: "14px",
                  border: "1.5px dashed #d1d5db",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", overflow: "hidden", marginBottom: "20px",
                  fontSize: "13px", color: "#9ca3af",
                }}
              >
                {licensePreview
                  ? <img src={licensePreview} alt="license" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }} />
                  : "💳 Tap to upload driver's license"
                }
              </div>

              <label style={s.label}>Vehicle Photo (Optional)</label>
              <input
                type="file"
                accept="image/*"
                id="vehiclePhotoUpload"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setVehiclePhotoFile(file);
                    setVehiclePhotoPreview(URL.createObjectURL(file));
                  }
                }}
              />
              <div
                onClick={() => document.getElementById("vehiclePhotoUpload").click()}
                style={{
                  width: "100%", height: vehiclePhotoPreview ? "160px" : "100px",
                  background: "#f9fafb", borderRadius: "14px",
                  border: "1.5px dashed #d1d5db",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", overflow: "hidden", marginBottom: "20px",
                  fontSize: "13px", color: "#9ca3af",
                }}
              >
                {vehiclePhotoPreview
                  ? <img src={vehiclePhotoPreview} alt="vehicle" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }} />
                  : "📷 Tap to upload photo"
                }
              </div>

              <label style={s.label}>Vehicle Make *</label>
              <input className="ab-input" type="text" placeholder="e.g. Toyota" value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} style={s.input} required />

              <label style={s.label}>Vehicle Model *</label>
              <input className="ab-input" type="text" placeholder="e.g. Vios" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} style={s.input} required />

              <label style={s.label}>Year</label>
              <input className="ab-input" type="text" placeholder="e.g. 2023" value={vehicleYear} onChange={(e) => setVehicleYear(e.target.value.replace(/[^0-9]/g, ''))} style={s.input} />

              <label style={s.label}>Plate Number *</label>
              <input className="ab-input" type="text" placeholder="ABC 1234" value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} style={s.input} required />

              <label style={s.label}>Color</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px" }}>
                {COLORS_LIST.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="ab-btn"
                    onClick={() => setVehicleColor(c)}
                    style={{
                      padding: "8px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit",
                      border: vehicleColor === c ? "none" : "1.5px solid #d1d5db",
                      background: vehicleColor === c ? "linear-gradient(135deg, #0f2640, #2a5298)" : "#f9fafb",
                      color: vehicleColor === c ? "#fff" : "#4b5563",
                      boxShadow: vehicleColor === c ? "0 4px 12px rgba(42,82,152,0.2)" : "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <button onClick={handleCustomerSubmit} className="ab-btn" style={{ ...s.primaryBtn, opacity: loading ? 0.75 : 1 }} disabled={loading}>
                {loading ? "Creating Account…" : "Complete Sign Up"}
              </button>
              <button onClick={() => setStep(1)} className="ab-btn" style={s.outlineBtn} disabled={loading}>
                Back
              </button>
            </>
          ) : step === 4 ? (
            <>
              <h3 style={{ marginTop: 0, color: "#111827", fontSize: "18px", fontWeight: "700" }}>Mechanic Details</h3>
              <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "16px", marginTop: "-4px" }}>Please provide your professional details.</p>

              <label style={s.label}>Shop / Employer Name</label>
              <input className="ab-input" type="text" placeholder="Where do you work?" value={mechanicShopName} onChange={e => setMechanicShopName(e.target.value)} style={s.input} />

              <label style={s.label}>Primary Specialization</label>
              <select className="ab-input" value={mechanicSpecialization} onChange={e => setMechanicSpecialization(e.target.value)} style={{...s.input, backgroundColor: '#fff', cursor: 'pointer', appearance: 'none' }}>
                <option value="" disabled>Select specialization...</option>
                {MECHANIC_SPECIALTIES.map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>

              <button onClick={handleMechanicSubmit} className="ab-btn" style={{ ...s.primaryBtn, opacity: loading ? 0.75 : 1 }} disabled={loading}>
                {loading ? "Submitting…" : "Complete Sign Up"}
              </button>
              <button onClick={() => setStep(1)} className="ab-btn" style={s.outlineBtn} disabled={loading}>
                Back
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ─── Login Form ──────────────────────────────────────────────── */
function LoginForm({ goBack, navigate }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      await checkStatusAndNavigate(user.uid, navigate, setError);
    } catch (err) {
      const bad = ["auth/user-not-found", "auth/wrong-password", "auth/invalid-credential"];
      setError(bad.includes(err.code) ? "Incorrect email or password." : err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      await checkStatusAndNavigate(result.user.uid, navigate, setError);
    } catch {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.formPage}>
      {/* Header stripe */}
      <div style={s.formHeader}>
        <div style={s.formLogoWrap}>
          <img src="/autobook-logo.png" alt="AutoBook" style={s.formLogo} />
        </div>
        <div style={s.formHeaderText}>
          <h2 style={s.formTitle}>Welcome Back</h2>
          <p style={s.formSub}>Sign in to your account</p>
        </div>
        <button className="ab-back-btn" style={s.backBtn} onClick={goBack} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div style={s.formScroll}>
        {error && (
          <div style={s.errorOverlay}>
            <div style={s.errorModal}>
              <div style={s.errorModalIcon}>⚠️</div>
              <h3 style={s.errorModalTitle}>Oops!</h3>
              <p style={s.errorModalText}>{error}</p>
              <button style={s.errorModalBtn} onClick={() => setError("")}>Okay</button>
            </div>
          </div>
        )}

        <div style={s.formCard}>
          <label style={s.label}>Email</label>
          <input className="ab-input" type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} style={s.input} />

          <label style={s.label}>Password</label>
          <input className="ab-input" type="password" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} style={s.input} />

          <button onClick={handleLogin} className="ab-btn" style={{ ...s.primaryBtn, opacity: loading ? 0.75 : 1 }} disabled={loading}>
            {loading ? "Signing in…" : "Log In"}
          </button>

          <div style={s.divider}><div style={s.dividerLine} /><span style={s.dividerLabel}>or</span><div style={s.dividerLine} /></div>

          <button onClick={handleGoogleLogin} className="ab-btn" style={s.googleBtn} disabled={loading}>
            <GoogleIcon />Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Styles ──────────────────────────────────────────────────── */
const s = {
  /* Root container — clips the curtain animation */
  root: {
    position: "relative",
    minHeight: "100vh",
    overflow: "hidden",
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    background: "#0f2640",
  },

  /* Drawer — slides up from bottom */
  drawer: {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  willChange: "transform",
  height: "100%",
  background: "#f5f7fa",
  borderRadius: "28px 28px 0 0",
  overflow: "hidden",
  zIndex: 20,
  transform: "translateY(100%)",
  transition: "transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 -10px 40px rgba(0,0,0,0.25)", // 🔥 depth
},

  /* ── Landing ── */
  landing: {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  padding: "0 24px 40px",
  color: "#fff",
  position: "relative",
  overflow: "hidden",
},

bgImage: {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  backgroundImage: "url('/autobook-bg.png')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  filter: "blur(8px)",
  transform: "scale(1.1)",
  zIndex: 0,
},

bgOverlay: {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "linear-gradient(160deg, rgba(15,38,64,0.65), rgba(42,82,152,0.45))",
  zIndex: 1,
},

backdrop: {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.35)",
  zIndex: 15,
},

  hero: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingTop: "64px",
    marginBottom: "36px",
    position: "relative", zIndex: 2,
  },
  logoRing: {
    width: "88px",
    height: "88px",
    borderRadius: "50%",
    border: "3px solid rgba(70,233,255,0.7)",
    padding: "3px",
    background: "rgba(255,255,255,0.12)",
    marginBottom: "16px",
    overflow: "hidden",
    animation: "ab-float 3s ease-in-out infinite",
  },
  logoImg: { width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" },
  heroTitle: {
    fontSize: "36px",
    fontWeight: "800",
    background: "linear-gradient(to right, #ffffff, #46e9ff)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    margin: "0 0 8px",
    letterSpacing: "-0.5px",
  },
  heroSub: {
    fontSize: "14px",
    color: "rgba(255,255,255,0.65)",
    margin: 0,
    textAlign: "center",
    maxWidth: "260px",
    lineHeight: "1.5",
  },

  featuresWrap: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    alignContent: "center",
    marginBottom: "40px",
    flex: 1,
    position: "relative", zIndex: 2,
  },
  featureCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "8px",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "16px",
    padding: "16px",
    backdropFilter: "blur(10px)",
    animation: "ab-fade-up 0.6s ease backwards",
  },
  featureIcon: { fontSize: "24px", lineHeight: 1, flexShrink: 0, marginBottom: "4px" },
  featureTitle: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#fff",
    margin: "0 0 3px",
  },
  featureDesc: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.65)",
    margin: 0,
    lineHeight: "1.45",
  },

  ctaWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginBottom: "20px",
    position: "relative", zIndex: 2,
  },
  ctaPrimary: {
  width: "100%",
  padding: "16px",
  background: "linear-gradient(135deg, #1a3a5c, #2a5298)",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "700",
  border: "none",
  borderRadius: "16px",
  cursor: "pointer",
  fontFamily: "inherit",
  boxShadow: "0 8px 20px rgba(42,82,152,0.35)",
},
  ctaSecondary: {
  width: "100%",
  padding: "15px",
  background: "rgba(255,255,255,0.08)",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600",
  border: "1px solid rgba(255,255,255,0.25)",
  borderRadius: "16px",
  cursor: "pointer",
  fontFamily: "inherit",
  backdropFilter: "blur(6px)",
},
  legalNote: {
    fontSize: "11px",
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
    margin: 0,
    position: "relative", zIndex: 2,
  },

  /* ── Form pages (inside white layer) ── */
  formPage: {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  background: "#f5f7fa",
},
  formHeader: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    background: "linear-gradient(160deg, #0f2640 0%, #2a5298 100%)",
    padding: "32px 20px 24px",
    borderBottomLeftRadius: "28px",
    borderBottomRightRadius: "28px",
    position: "relative",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
  },
  backBtn: {
    background: "rgba(255,255,255,0.15)",
    border: "none",
    borderRadius: "50%",
    width: "36px",
    height: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    cursor: "pointer",
    padding: 0,
    backdropFilter: "blur(4px)",
    flexShrink: 0,
  },
  formLogoWrap: {
    width: "52px",
    height: "52px",
    borderRadius: "50%",
    border: "2px solid rgba(70,233,255,0.7)",
    overflow: "hidden",
    flexShrink: 0,
  },
  formLogo: { width: "100%", height: "100%", objectFit: "cover" },
  formHeaderText: { flex: 1 },
  formTitle: {
    fontSize: "20px",
    fontWeight: "800",
    color: "#fff",
    margin: "0 0 2px",
  },
  formSub: {
    fontSize: "13px",
    color: "rgba(255,255,255,0.65)",
    margin: 0,
  },

  formScroll: {
    flex: 1,
    overflowY: "auto",
    padding: "24px 20px 40px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  errorOverlay: {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 9999,
    padding: "20px",
  },
  errorModal: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "24px",
    width: "100%",
    maxWidth: "320px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
    animation: "ab-zoom-in 0.3s ease backwards",
  },
  errorModalIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    background: "#fee2e2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    marginBottom: "16px",
  },
  errorModalTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#111827",
    margin: "0 0 8px 0",
  },
  errorModalText: {
    fontSize: "14px",
    color: "#4b5563",
    margin: "0 0 24px 0",
    lineHeight: "1.5",
  },
  errorModalBtn: {
    width: "100%",
    padding: "12px",
    background: "#ef4444",
    color: "#fff",
    fontSize: "15px",
    fontWeight: "700",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  formCard: {
    width: "100%",
    maxWidth: "440px",
    background: "#ffffff",
    borderRadius: "20px",
    padding: "24px 20px",
    boxSizing: "border-box",
    boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
  },
  label: {
    display: "block",
    fontSize: "12px",
    fontWeight: "700",
    color: "#4b5563",
    letterSpacing: "0.3px",
    marginBottom: "8px",
  },
  input: {
    display: "block",
    width: "100%",
    padding: "14px 16px",
    fontSize: "15px",
    fontWeight: "500",
    border: "1.5px solid #d1d5db",
    borderRadius: "14px",
    outline: "none",
    background: "#f9fafb",
    color: "#111827",
    boxSizing: "border-box",
    marginBottom: "20px",
    appearance: "none",
    fontFamily: "inherit",
  },
  primaryBtn: {
    width: "100%",
    padding: "16px",
    background: "linear-gradient(135deg, #0f2640, #2a5298)",
    color: "#fff",
    fontSize: "15px",
    fontWeight: "700",
    border: "none",
    borderRadius: "14px",
    cursor: "pointer",
    marginTop: "8px",
    marginBottom: "16px",
    fontFamily: "inherit",
    boxShadow: "0 4px 12px rgba(42,82,152,0.2)",
  },
  outlineBtn: {
    width: "100%", padding: "16px",
    background: "transparent", color: "#6b7280",
    fontSize: "15px", fontWeight: "700",
    border: "1.5px solid #d1d5db", borderRadius: "14px",
    cursor: "pointer", fontFamily: "inherit",
  },
  divider: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" },
  dividerLine: { flex: 1, height: "1px", background: "#e5e7eb" },
  dividerLabel: { fontSize: "13px", color: "#9ca3af" },
  googleBtn: {
    width: "100%",
    padding: "13px 14px",
    background: "#fff",
    border: "1.5px solid #e5e7eb",
    borderRadius: "12px",
    fontSize: "15px",
    fontWeight: "600",
    color: "#374151",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    fontFamily: "inherit",
  },
};
