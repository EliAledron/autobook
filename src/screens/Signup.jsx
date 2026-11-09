import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import BackButton from "../components/BackButton";
import { sendCustomVerificationEmail } from "../utils/notifications";
import { getFriendlyErrorMessage } from "../utils/authErrorUtils";
import { AlertTriangle, Car, Store, Wrench, Paperclip, FileText, CreditCard, Camera } from "lucide-react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";

const ROLES = ["Customer", "Owner"]; // "Mechanic" hidden for now

const MECHANIC_SPECIALTIES = [
  "General Mechanic", "Engine Specialist", "Electrical Specialist",
  "Aircon Specialist", "Underchassis/Suspension", "Brake Specialist",
  "Transmission Specialist", "Body & Paint",
];

const COLORS_LIST = ["White", "Black", "Silver", "Gray", "Red", "Blue", "Green", "Yellow", "Orange", "Brown", "Other"];

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

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
    <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.8 6.5 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.6-8 19.6-20 0-1.3-.1-2.7-.4-4z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.8 6.5 29.2 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.8-1.8 13.4-4.7l-6.2-5.2C29.3 35.5 26.8 36 24 36c-5.2 0-9.7-3.3-11.3-8H6.4C9.7 38.9 16.3 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C40.9 35.4 44 30.1 44 24c0-1.3-.1-2.7-.4-4z" />
  </svg>
);

export default function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      // Don't auto-redirect if the user is in the middle of completing the form steps
      if (step > 1 || loading) return;

      if (u) {
        try {
          const snap = await getDoc(doc(db, "users", u.uid));
          if (!snap.exists()) {
            return; // Profile document not created yet — do NOT navigate to /dashboard!
          }
          const { status, role = "" } = snap.data();
          if (status === "restricted") { navigate("/restricted", { replace: true }); return; }
          // Require email verification and approval
          if (!u.emailVerified && role.toLowerCase() !== "admin") { navigate("/pending", { replace: true }); return; }
          if (status !== "approved" && role.toLowerCase() !== "admin") { navigate("/pending", { replace: true }); return; }
          navigate("/dashboard", { replace: true });
        } catch (e) {
          console.error("Signup auth check error:", e);
        }
      }
    });
    return () => unsub();
  }, [navigate, step, loading]);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("");

  // Step 2 Owner fields
  const [shopName, setShopName] = useState("");
  const [permitFile, setPermitFile] = useState(null);
  const [permitPreview, setPermitPreview] = useState(null);
  const [dtiFile, setDtiFile] = useState(null);
  const [dtiPreview, setDtiPreview] = useState(null);

  // Step 2 Mechanic fields
  const [mechShopName, setMechShopName] = useState("");
  const [mechSpecialization, setMechSpecialization] = useState("");

  // Step 3 Customer fields
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [vehiclePhotoFile, setVehiclePhotoFile] = useState(null);
  const [vehiclePhotoPreview, setVehiclePhotoPreview] = useState(null);

  const [licenseFile, setLicenseFile] = useState(null);
  const [licensePreview, setLicensePreview] = useState(null);

  const [createdUser, setCreatedUser] = useState(null);

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Field refs for auto-scrolling to missed/mistaken fields
  const firstNameRef = useRef(null);
  const lastNameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const roleBoxRef = useRef(null);

  const shopNameRef = useRef(null);
  const permitBoxRef = useRef(null);
  const dtiBoxRef = useRef(null);

  const mechShopRef = useRef(null);
  const mechSpecializationBoxRef = useRef(null);

  const licenseBoxRef = useRef(null);
  const makeRef = useRef(null);
  const modelRef = useRef(null);
  const yearRef = useRef(null);
  const plateRef = useRef(null);

  const scrollToRef = (ref) => {
    if (ref && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
      if (ref.current.focus) {
        setTimeout(() => ref.current?.focus(), 250);
      }
    }
  };

  const clearFieldError = (field) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const renderFieldError = (field) => {
    if (!fieldErrors[field]) return null;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#dc2626", fontSize: "11px", fontWeight: "600", marginTop: "-12px", marginBottom: "16px" }}>
        <AlertTriangle size={13} color="#dc2626" /> {fieldErrors[field]}
      </div>
    );
  };

  const getFieldInputStyle = (field, customBase = {}) => ({
    ...s.input,
    ...customBase,
    ...(fieldErrors[field] ? {
      border: "2px solid #ef4444",
      backgroundColor: "#fef2f2",
      animation: "ab-shake 0.35s ease",
      marginBottom: "8px",
    } : {}),
  });

  const saveUser = async (user, resolvedRole, names, permitUrl = "", shopNameStr = "", extraData = {}, dtiUrl = "") => {
    const finalRole = resolvedRole || "Customer";
    const isOwner = finalRole.toLowerCase() === "owner";
    const isMechanic = finalRole.toLowerCase() === "mechanic";
    
    const fName = names?.firstName || "";
    const mName = names?.middleName || "";
    const lName = names?.lastName || "";
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
      userData.dtiUrl = dtiUrl;
    }
    if (isMechanic) {
      userData.shopName = extraData.shopName || "";
      userData.specialization = extraData.specialization || "";
    }
    if (extraData.licenseUrl) {
      userData.licenseUrl = extraData.licenseUrl;
    }
    await setDoc(doc(db, "users", user.uid), userData);

    // Notify Admin about new user registration
    await addDoc(collection(db, "adminAlerts"), {
      type: "new_user",
      title: "New User Registration",
      message: `${dName} just registered as a ${finalRole} and is waiting for approval.`,
      read: false,
      createdAt: serverTimestamp(),
    });
  };

  const handleNext = async (e) => {
    e.preventDefault();
    setError("");
    const errs = {};
    let firstRef = null;

    if (!firstName.trim()) {
      errs.firstName = "First name is required.";
      if (!firstRef) firstRef = firstNameRef;
    }
    if (!lastName.trim()) {
      errs.lastName = "Last name is required.";
      if (!firstRef) firstRef = lastNameRef;
    }
    if (!email.trim() || !email.includes("@")) {
      errs.email = "Please enter a valid email address.";
      if (!firstRef) firstRef = emailRef;
    }
    if (!password || password.length < 6) {
      errs.password = "Password must be at least 6 characters.";
      if (!firstRef) firstRef = passwordRef;
    }
    if (password !== confirmPassword) {
      errs.confirmPassword = "Passwords do not match.";
      if (!firstRef) firstRef = confirmPasswordRef;
    }
    if (!role) {
      errs.role = "Please select a role to continue.";
      if (!firstRef) firstRef = roleBoxRef;
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      scrollToRef(firstRef);
      return;
    }

    setFieldErrors({});
    if (role === "Owner") {
      setStep(2);
    } else if (role === "Mechanic") {
      setStep(2); // mechanic step 2
    } else {
      setStep(3);
    }
  };

  const executeSignup = async (permitUrl = "", shopNameStr = "", dtiUrl = "") => {
    setLoading(true);
    try {
      let dName = [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(" ");
      let user = createdUser;
      if (!user) {
        try {
          const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
          sendCustomVerificationEmail().catch((e) => console.warn("Email send background error:", e));
          user = newUser;
        } catch (authErr) {
          if (authErr.code === "auth/email-already-in-use") {
            try {
              const { user: existingUser } = await signInWithEmailAndPassword(auth, email, password);
              user = existingUser;
            } catch (_signInErr) {
              throw new Error("This email is already registered. If you already have an account, please log in with your password, or use a different email to sign up.");
            }
          } else {
            throw authErr;
          }
        }
        await updateProfile(user, { displayName: dName });
      }
      sessionStorage.setItem("justLoggedIn", "true");
      await saveUser(user, role, { firstName: firstName.trim(), middleName: middleName.trim(), lastName: lastName.trim() }, permitUrl, shopNameStr, {}, dtiUrl);
      navigate("/pending", { replace: true });
    } catch (err) {
      console.error("Execute signup error:", err);
      setError(getFriendlyErrorMessage(err, "signup"));
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (!role) {
      setFieldErrors({ role: "Please select a role before continuing with Google." });
      scrollToRef(roleBoxRef);
      return;
    }
    setError("");
    setFieldErrors({});
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      const user = result.user;
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) { navigate("/pending"); return; }
      setCreatedUser(user);
      const parts = (user.displayName || "").split(" ");
      setFirstName(parts[0] || "");
      setLastName(parts.length > 1 ? parts.slice(1).join(" ") : "");
      setMiddleName("");
      setEmail(user.email || "");
      if (role === "Owner" || role === "Mechanic") setStep(2);
      else setStep(3);
    } catch (err) {
      console.error("Google sign-up error:", err);
      const friendly = getFriendlyErrorMessage(err, "signup");
      if (friendly) setError(friendly);
      setLoading(false);
    }
  };

  const handleMechanicSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const errs = {};
    let firstRef = null;

    if (!mechShopName.trim()) {
      errs.mechShopName = "Please enter the shop name you work at.";
      if (!firstRef) firstRef = mechShopRef;
    }
    if (!mechSpecialization) {
      errs.mechSpecialization = "Please select your specialization.";
      if (!firstRef) firstRef = mechSpecializationBoxRef;
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      scrollToRef(firstRef);
      return;
    }

    setFieldErrors({});
    setLoading(true);
    try {
      let user = createdUser;
      if (!user) {
        try {
          const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
          sendCustomVerificationEmail().catch((e) => console.warn("Email send background error:", e));
          user = newUser;
        } catch (authErr) {
          if (authErr.code === "auth/email-already-in-use") {
            try {
              const { user: existingUser } = await signInWithEmailAndPassword(auth, email, password);
              user = existingUser;
            } catch (_signInErr) {
              throw new Error("This email is already registered. If you already have an account, please log in with your password, or use a different email to sign up.");
            }
          } else {
            throw authErr;
          }
        }
        const dName = [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(" ");
        await updateProfile(user, { displayName: dName });
      }
      await saveUser(
        user, role,
        { firstName: firstName.trim(), middleName: middleName.trim(), lastName: lastName.trim() },
        "", "",
        { shopName: mechShopName.trim(), specialization: mechSpecialization }
      );
      navigate("/pending", { replace: true });
    } catch (err) {
      console.error("Mechanic signup error:", err);
      setError(getFriendlyErrorMessage(err, "signup"));
      setLoading(false);
    }
  };

  const handleOwnerSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const errs = {};
    let firstRef = null;

    if (!shopName.trim()) {
      errs.shopName = "Please enter your shop name.";
      if (!firstRef) firstRef = shopNameRef;
    }
    if (!permitFile) {
      errs.permit = "Business permit / proof of business is required.";
      if (!firstRef) firstRef = permitBoxRef;
    }
    if (!dtiFile) {
      errs.dti = "DTI Certificate is required.";
      if (!firstRef) firstRef = dtiBoxRef;
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      scrollToRef(firstRef);
      return;
    }

    setFieldErrors({});
    setLoading(true);
    try {
      const permitUrl = await uploadToCloudinary(permitFile);
      const dtiUrl = await uploadToCloudinary(dtiFile);
      await executeSignup(permitUrl, shopName.trim(), dtiUrl);
    } catch (err) {
      console.error("Owner submit error:", err);
      setError(getFriendlyErrorMessage(err, "signup"));
      setLoading(false);
    }
  };

  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const errs = {};
    let firstRef = null;

    if (!licenseFile) {
      errs.license = "Driver's license is required.";
      if (!firstRef) firstRef = licenseBoxRef;
    }
    if (!vehicleMake.trim()) {
      errs.vehicleMake = "Car brand is required.";
      if (!firstRef) firstRef = makeRef;
    }
    if (!vehicleModel.trim()) {
      errs.vehicleModel = "Vehicle model is required.";
      if (!firstRef) firstRef = modelRef;
    }
    if (vehicleYear.trim()) {
      const y = parseInt(vehicleYear.trim(), 10);
      const maxYear = new Date().getFullYear() + 1;
      if (isNaN(y) || y < 1900 || y > maxYear) {
        errs.vehicleYear = `Please enter a valid year (1900 - ${maxYear}).`;
        if (!firstRef) firstRef = yearRef;
      }
    }
    if (!vehiclePlate.trim()) {
      errs.vehiclePlate = "Vehicle plate number is required.";
      if (!firstRef) firstRef = plateRef;
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      scrollToRef(firstRef);
      return;
    }

    setFieldErrors({});
    setLoading(true);
    try {
      let user = createdUser;
      // If user was not created via Google, create them now with email/password
      if (!user) {
        try {
          const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
          sendCustomVerificationEmail().catch((e) => console.warn("Email send background error:", e));
          user = newUser;
        } catch (authErr) {
          if (authErr.code === "auth/email-already-in-use") {
            try {
              const { user: existingUser } = await signInWithEmailAndPassword(auth, email, password);
              user = existingUser;
            } catch (_signInErr) {
              throw new Error("This email is already registered. If you already have an account, please log in with your password, or use a different email to sign up.");
            }
          } else {
            throw authErr;
          }
        }
        const dName = [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(" ");
        await updateProfile(user, { displayName: dName });
      }
      
      let licenseUrl = null;
      if (licenseFile) {
        licenseUrl = await uploadToCloudinary(licenseFile);
      }

      // Save user data to 'users' collection
      await saveUser(user, role, { firstName: firstName.trim(), middleName: middleName.trim(), lastName: lastName.trim() }, "", "", { licenseUrl });

      // Upload vehicle photo if it exists
      let vehiclePhotoUrl = null;
      if (vehiclePhotoFile) {
        vehiclePhotoUrl = await uploadToCloudinary(vehiclePhotoFile);
      }

      // Save vehicle data to 'vehicles' collection
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

      navigate("/pending", { replace: true });
    } catch (err) {
      console.error("Customer submit error:", err);
      setError(getFriendlyErrorMessage(err, "signup"));
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <style>{`
        @keyframes ab-shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-4px); }
          40%, 80% { transform: translateX(4px); }
        }
      `}</style>
      {/* Background with blur and navy gradient overlay matching Onboarding */}
      <div style={s.bgImage} />
      <div style={s.bgOverlay} />
      <div style={{position: "absolute", top: 20, left: 10, zIndex: 10}}>
        <BackButton variant="light" />
      </div>
      <div style={s.scroll}>
        <div style={s.header}>
          <div style={s.logoRing}>
            <img src="/autobook-logo.png" alt="AutoBook" style={s.logo} />
          </div>
          <h1 style={s.appName}>AutoBook</h1>
          <p style={s.tagline}>Create your account</p>
        </div>

        {error && (
          <div style={s.errorOverlay}>
            <div style={s.errorModal}>
              <div style={s.errorModalIcon}><AlertTriangle size={24} /></div>
              <h3 style={s.errorModalTitle}>Oops!</h3>
              <p style={s.errorModalText}>{getFriendlyErrorMessage(error, "signup")}</p>
              <button style={s.errorModalBtn} onClick={() => setError("")}>Okay</button>
            </div>
          </div>
        )}

        <div style={s.card}>
          {step === 1 ? (
            <>
              <label style={s.label}>First Name *</label>
              <input
                ref={firstNameRef}
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value.replace(/[^a-zA-Z\s-]/g, ''));
                  clearFieldError("firstName");
                }}
                style={getFieldInputStyle("firstName")}
                required
              />
              {renderFieldError("firstName")}

              <label style={s.label}>Middle Name</label>
              <input
                type="text"
                placeholder="Middle name (optional)"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value.replace(/[^a-zA-Z\s-]/g, ''))}
                style={s.input}
              />

              <label style={s.label}>Last Name *</label>
              <input
                ref={lastNameRef}
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value.replace(/[^a-zA-Z\s-]/g, ''));
                  clearFieldError("lastName");
                }}
                style={getFieldInputStyle("lastName")}
                required
              />
              {renderFieldError("lastName")}

              <label style={s.label}>Email *</label>
              <input
                ref={emailRef}
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError("email");
                }}
                style={getFieldInputStyle("email")}
                required
              />
              {renderFieldError("email")}

              <label style={s.label}>Password *</label>
              <input
                ref={passwordRef}
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError("password");
                }}
                style={getFieldInputStyle("password")}
                required
              />
              {renderFieldError("password")}

              <label style={s.label}>Confirm password *</label>
              <input
                ref={confirmPasswordRef}
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  clearFieldError("confirmPassword");
                }}
                style={getFieldInputStyle("confirmPassword")}
                required
              />
              {renderFieldError("confirmPassword")}

              <label style={s.label}>I am a… *</label>
              <div
                ref={roleBoxRef}
                style={{
                  display: "flex", gap: "8px",
                  marginBottom: fieldErrors.role ? "8px" : "20px",
                  flexWrap: "wrap",
                  padding: fieldErrors.role ? "4px" : "0",
                  borderRadius: "14px",
                  border: fieldErrors.role ? "2px solid #ef4444" : "none",
                  background: fieldErrors.role ? "rgba(239,68,68,0.06)" : "transparent",
                  animation: fieldErrors.role ? "ab-shake 0.35s ease" : "none",
                }}
              >
                {ROLES.map((r) => {
                  const roleIcon = r === "Customer" ? <Car size={16} style={{marginBottom: "-2px"}} /> : r === "Owner" ? <Store size={16} style={{marginBottom: "-2px"}} /> : <Wrench size={16} style={{marginBottom: "-2px"}} />;
                  const roleSub  = r === "Customer" ? "Book services" : r === "Owner" ? "Manage the shop" : "Fix & repair";
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => { setRole(r); setError(""); clearFieldError("role"); }}
                      style={{
                        flex: 1, minWidth: "90px", padding: "14px 8px", borderRadius: "12px", fontSize: "13px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit",
                        border: role === r ? "none" : "1.5px solid #e5e7eb",
                        background: role === r ? "linear-gradient(135deg, #1a3a5c, #2a5298)" : "#f9fafb",
                        color: role === r ? "#fff" : "#6b7280",
                        boxShadow: role === r ? "0 4px 12px rgba(26,58,92,0.25)" : "none",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {roleIcon} {r}
                      <div style={{ fontSize: "10px", fontWeight: "500", marginTop: "4px", opacity: 0.75 }}>{roleSub}</div>
                    </button>
                  );
                })}
              </div>
              {renderFieldError("role")}

              <button
                onClick={handleNext}
                style={{ ...s.primaryBtn, opacity: loading ? 0.75 : 1 }}
                disabled={loading}
              >
                {loading ? "Please wait…" : role ? "Next Step" : "Create Account"}
              </button>

              <div style={s.divider}>
                <div style={s.dividerLine} />
                <span style={s.dividerLabel}>or</span>
                <div style={s.dividerLine} />
              </div>

              <button onClick={handleGoogleSignup} style={s.googleBtn} disabled={loading}>
                <GoogleIcon />
                Continue with Google
              </button>
            </>
          ) : step === 2 && role === "Mechanic" ? (
            <>
              <h3 style={{ marginTop: 0, color: "#111827", fontSize: "18px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}><Wrench size={18} /> Mechanic Details</h3>
              <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "16px", marginTop: "-4px" }}>Tell us about your skills and the shop you work at.</p>

              <label style={s.label}>Shop Name You Work At *</label>
              <input
                ref={mechShopRef}
                type="text"
                placeholder="e.g. JME Auto Shop"
                value={mechShopName}
                onChange={(e) => {
                  setMechShopName(e.target.value);
                  clearFieldError("mechShopName");
                }}
                style={getFieldInputStyle("mechShopName")}
                required
              />
              {renderFieldError("mechShopName")}

              <label style={s.label}>Your Specialization *</label>
              <div
                ref={mechSpecializationBoxRef}
                style={{
                  display: "flex", flexWrap: "wrap", gap: "8px",
                  marginBottom: fieldErrors.mechSpecialization ? "8px" : "20px",
                  padding: fieldErrors.mechSpecialization ? "4px" : "0",
                  borderRadius: "14px",
                  border: fieldErrors.mechSpecialization ? "2px solid #ef4444" : "none",
                  background: fieldErrors.mechSpecialization ? "rgba(239,68,68,0.06)" : "transparent",
                  animation: fieldErrors.mechSpecialization ? "ab-shake 0.35s ease" : "none",
                }}
              >
                {MECHANIC_SPECIALTIES.map((spec) => (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => {
                      setMechSpecialization(spec);
                      clearFieldError("mechSpecialization");
                    }}
                    style={{
                      padding: "8px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit",
                      border: mechSpecialization === spec ? "none" : "1.5px solid #e5e7eb",
                      background: mechSpecialization === spec ? "linear-gradient(135deg, #1a3a5c, #2a5298)" : "#f9fafb",
                      color: mechSpecialization === spec ? "#fff" : "#6b7280",
                      boxShadow: mechSpecialization === spec ? "0 4px 12px rgba(26,58,92,0.25)" : "none",
                      transition: "all 0.15s ease",
                    }}
                  >{spec}</button>
                ))}
              </div>
              {renderFieldError("mechSpecialization")}

              <button
                onClick={handleMechanicSubmit}
                style={{ ...s.primaryBtn, opacity: loading ? 0.75 : 1 }}
                disabled={loading}
              >
                {loading ? "Submitting…" : "Complete Sign Up"}
              </button>
              <button onClick={() => { setStep(1); setFieldErrors({}); }} style={{ ...s.outlineBtn, marginTop: "8px" }} disabled={loading}>Back</button>
            </>
          ) : step === 2 ? (
            <>
              <h3 style={{ marginTop: 0, color: "#111827", fontSize: "18px", fontWeight: "700" }}>Shop Details</h3>
              <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "16px", marginTop: "-4px" }}>Please provide your auto shop details and proof of business.</p>

              <label style={s.label}>Shop Name *</label>
              <input
                ref={shopNameRef}
                type="text"
                placeholder="Your shop name"
                value={shopName}
                onChange={(e) => {
                  setShopName(e.target.value.replace(/[^a-zA-Z\s]/g, ''));
                  clearFieldError("shopName");
                }}
                style={getFieldInputStyle("shopName")}
                required
              />
              {renderFieldError("shopName")}

              <label style={s.label}>Business Permit / Proof *</label>
              <input
                type="file"
                accept="image/*"
                id="permitUpload"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setPermitFile(file);
                    setPermitPreview(URL.createObjectURL(file));
                    clearFieldError("permit");
                  }
                }}
              />
              <div
                ref={permitBoxRef}
                onClick={() => document.getElementById("permitUpload").click()}
                style={{
                  width: "100%", height: permitPreview ? "160px" : "100px",
                  background: fieldErrors.permit ? "#fef2f2" : "#f9fafb",
                  borderRadius: "10px",
                  border: fieldErrors.permit ? "2px dashed #ef4444" : "1.5px dashed #e5e7eb",
                  animation: fieldErrors.permit ? "ab-shake 0.35s ease" : "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", overflow: "hidden",
                  marginBottom: fieldErrors.permit ? "8px" : "20px",
                  fontSize: "13px",
                  color: fieldErrors.permit ? "#dc2626" : "#9ca3af",
                }}
              >
                {permitPreview
                  ? <img src={permitPreview} alt="permit" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }} />
                  : <div style={{display: "flex", alignItems: "center", gap: "4px"}}><Paperclip size={14} /> Tap to upload permit photo</div>
                }
              </div>
              {renderFieldError("permit")}

              <label style={s.label}>DTI Certificate *</label>
              <input
                type="file"
                accept="image/*"
                id="dtiUpload"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setDtiFile(file);
                    setDtiPreview(URL.createObjectURL(file));
                    clearFieldError("dti");
                  }
                }}
              />
              <div
                ref={dtiBoxRef}
                onClick={() => document.getElementById("dtiUpload").click()}
                style={{
                  width: "100%", height: dtiPreview ? "160px" : "100px",
                  background: fieldErrors.dti ? "#fef2f2" : "#f9fafb",
                  borderRadius: "10px",
                  border: fieldErrors.dti ? "2px dashed #ef4444" : "1.5px dashed #e5e7eb",
                  animation: fieldErrors.dti ? "ab-shake 0.35s ease" : "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", overflow: "hidden",
                  marginBottom: fieldErrors.dti ? "8px" : "20px",
                  fontSize: "13px",
                  color: fieldErrors.dti ? "#dc2626" : "#9ca3af",
                }}
              >
                {dtiPreview
                  ? <img src={dtiPreview} alt="DTI" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }} />
                  : <div style={{display: "flex", alignItems: "center", gap: "4px"}}><FileText size={14} /> Tap to upload DTI Certificate</div>
                }
              </div>
              {renderFieldError("dti")}

              <button
                onClick={handleOwnerSubmit}
                style={{ ...s.primaryBtn, opacity: loading ? 0.75 : 1 }}
                disabled={loading}
              >
                {loading ? "Submitting…" : "Complete Sign Up"}
              </button>
              <button
                onClick={() => { setStep(1); setFieldErrors({}); }}
                style={{ ...s.outlineBtn, marginTop: "8px" }}
                disabled={loading}
              >
                Back
              </button>
            </>
          ) : ( // Step 3: Customer Vehicle Registration
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
                    clearFieldError("license");
                  }
                }}
              />
              <div
                ref={licenseBoxRef}
                onClick={() => document.getElementById("licenseUpload").click()}
                style={{
                  width: "100%", height: licensePreview ? "160px" : "100px",
                  background: fieldErrors.license ? "#fef2f2" : "#f9fafb",
                  borderRadius: "10px",
                  border: fieldErrors.license ? "2px dashed #ef4444" : "1.5px dashed #e5e7eb",
                  animation: fieldErrors.license ? "ab-shake 0.35s ease" : "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", overflow: "hidden",
                  marginBottom: fieldErrors.license ? "8px" : "20px",
                  fontSize: "13px",
                  color: fieldErrors.license ? "#dc2626" : "#9ca3af",
                }}
              >
                {licensePreview
                  ? <img src={licensePreview} alt="license" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }} />
                  : <div style={{display: "flex", alignItems: "center", gap: "4px"}}><CreditCard size={14} /> Tap to upload driver's license</div>
                }
              </div>
              {renderFieldError("license")}

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
                  background: "#f9fafb", borderRadius: "10px",
                  border: "1.5px dashed #e5e7eb",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", overflow: "hidden", marginBottom: "20px",
                  fontSize: "13px", color: "#9ca3af",
                }}
              >
                {vehiclePhotoPreview
                  ? <img src={vehiclePhotoPreview} alt="vehicle" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }} />
                  : <div style={{display: "flex", alignItems: "center", gap: "4px"}}><Camera size={14} /> Tap to upload photo</div>
                }
              </div>

              <label style={s.label}>Car Brand *</label>
              <input
                ref={makeRef}
                type="text"
                placeholder="e.g. Toyota"
                value={vehicleMake}
                onChange={(e) => {
                  setVehicleMake(e.target.value);
                  clearFieldError("vehicleMake");
                }}
                style={getFieldInputStyle("vehicleMake")}
                required
              />
              {renderFieldError("vehicleMake")}

              <label style={s.label}>Vehicle Model *</label>
              <input
                ref={modelRef}
                type="text"
                placeholder="e.g. Vios"
                value={vehicleModel}
                onChange={(e) => {
                  setVehicleModel(e.target.value);
                  clearFieldError("vehicleModel");
                }}
                style={getFieldInputStyle("vehicleModel")}
                required
              />
              {renderFieldError("vehicleModel")}

              <label style={s.label}>Year</label>
              <input
                ref={yearRef}
                type="text"
                placeholder="e.g. 2023"
                value={vehicleYear}
                onChange={(e) => {
                  setVehicleYear(e.target.value.replace(/[^0-9]/g, ''));
                  clearFieldError("vehicleYear");
                }}
                style={getFieldInputStyle("vehicleYear")}
              />
              {renderFieldError("vehicleYear")}

              <label style={s.label}>Plate Number *</label>
              <input
                ref={plateRef}
                type="text"
                placeholder="ABC 1234"
                value={vehiclePlate}
                onChange={(e) => {
                  setVehiclePlate(e.target.value);
                  clearFieldError("vehiclePlate");
                }}
                style={getFieldInputStyle("vehiclePlate")}
                required
              />
              {renderFieldError("vehiclePlate")}

              <label style={s.label}>Color</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px" }}>
                {COLORS_LIST.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setVehicleColor(c)}
                    style={{
                      padding: "8px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit",
                      border: vehicleColor === c ? "none" : "1.5px solid #e5e7eb",
                      background: vehicleColor === c ? "linear-gradient(135deg, #1a3a5c, #2a5298)" : "#f9fafb",
                      color: vehicleColor === c ? "#fff" : "#6b7280",
                      boxShadow: vehicleColor === c ? "0 4px 12px rgba(26,58,92,0.25)" : "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <button onClick={handleCustomerSubmit} style={{ ...s.primaryBtn, opacity: loading ? 0.75 : 1 }} disabled={loading}>
                {loading ? "Creating Account…" : "Complete Sign Up"}
              </button>
              <button
                onClick={() => { setStep(1); setFieldErrors({}); }}
                style={{ ...s.outlineBtn, marginTop: "8px" }}
                disabled={loading}
              >
                Back
              </button>
            </>
          )}
        </div>

        <div style={s.switchRow}>
          <span style={s.switchText}>Already have an account?</span>
          <button style={s.switchBtn} onClick={() => navigate("/login")}>
            Log in
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#0f2640",
    display: "flex",
    flexDirection: "column",
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    position: "relative",
    overflowX: "hidden",
  },
  bgImage: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundImage: "url('/autobook-bg.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    filter: "blur(8px)",
    transform: "scale(1.08)",
    zIndex: 0,
    pointerEvents: "none",
  },
  bgOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "linear-gradient(160deg, rgba(15,38,64,0.78), rgba(42,82,152,0.55))",
    zIndex: 0,
    pointerEvents: "none",
  },
  scroll: {
    flex: 1,
    padding: "0 20px 40px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    position: "relative",
    zIndex: 1,
  },
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingTop: "52px",
    marginBottom: "24px",
  },
  logoRing: {
    width: "76px",
    height: "76px",
    borderRadius: "22px",
    border: "2px solid rgba(70,233,255,0.7)",
    padding: "4px",
    background: "rgba(255,255,255,0.12)",
    backdropFilter: "blur(8px)",
    marginBottom: "12px",
    overflow: "hidden",
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: "100%", height: "100%", objectFit: "contain", borderRadius: "18px" },
  appName: {
    fontSize: "26px",
    fontWeight: "800",
    color: "#fff",
    margin: "0 0 4px",
    letterSpacing: "-0.5px",
    background: "linear-gradient(to right, #ffffff, #46e9ff)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  tagline: { fontSize: "14px", color: "rgba(255,255,255,0.75)", margin: 0 },
  backBtn: {
    position: "absolute",
    top: "24px",
    left: "24px",
    background: "transparent",
    border: "none",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#fff",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    zIndex: 10,
    padding: "8px 12px",
    borderRadius: "20px",
    transition: "background 0.2s ease",
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
  card: {
    width: "100%",
    maxWidth: "400px",
    background: "#ffffff",
    borderRadius: "20px",
    padding: "24px 20px",
    boxSizing: "border-box",
    boxShadow: "0 12px 36px rgba(0,0,0,0.25)",
  },
  label: {
    display: "block",
    fontSize: "12px",
    fontWeight: "600",
    color: "#6b7280",
    letterSpacing: "0.4px",
    textTransform: "uppercase",
    marginBottom: "6px",
  },
  input: {
    display: "block",
    width: "100%",
    padding: "13px 14px",
    fontSize: "15px",
    border: "1.5px solid #e5e7eb",
    borderRadius: "10px",
    outline: "none",
    background: "#f9fafb",
    color: "#111827",
    boxSizing: "border-box",
    marginBottom: "16px",
    appearance: "none",
    fontFamily: "inherit",
  },
  primaryBtn: {
    width: "100%",
    padding: "14px",
    background: "linear-gradient(135deg, #1a3a5c, #2a5298)",
    color: "#fff",
    fontSize: "15px",
    fontWeight: "600",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    marginTop: "4px",
    marginBottom: "16px",
    fontFamily: "inherit",
  },
  outlineBtn: {
    width: "100%",
    padding: "14px",
    background: "transparent",
    color: "#6b7280",
    fontSize: "15px",
    fontWeight: "600",
    border: "1.5px solid #e5e7eb",
    borderRadius: "12px",
    cursor: "pointer",
    fontFamily: "inherit",
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
  switchRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "20px",
    padding: "14px 20px",
    background: "rgba(255, 255, 255, 0.12)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    backdropFilter: "blur(10px)",
    borderRadius: "14px",
    width: "100%",
    maxWidth: "400px",
    boxSizing: "border-box",
    justifyContent: "center",
    boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
  },
  switchText: { fontSize: "14px", color: "rgba(255,255,255,0.85)", margin: 0 },
  switchBtn: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#46e9ff",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    textDecoration: "underline",
    textUnderlineOffset: "3px",
  },
};
