import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import BackButton from "../components/BackButton";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";

const ROLES = ["Customer", "Owner", "Mechanic"];

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
  const [step, setStep] = useState(1);
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

  const [createdUser, setCreatedUser] = useState(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const saveUser = async (user, resolvedRole, names, permitUrl = "", shopNameStr = "", extraData = {}) => {
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
    }
    if (isMechanic) {
      userData.shopName = extraData.shopName || "";
      userData.specialization = extraData.specialization || "";
    }
    await setDoc(doc(db, "users", user.uid), userData);

    // Notify Admin about new user registration
    await addDoc(collection(db, "adminAlerts"), {
      type: "new_user",
      title: "New User Registration 👤",
      message: `${dName} just registered as a ${finalRole} and is waiting for approval.`,
      read: false,
      createdAt: serverTimestamp(),
    });
  };

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
      setStep(2); // mechanic step 2
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
      setError(
        err.code === "auth/email-already-in-use"
          ? "This email is already registered."
          : err.message
      );
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

      if (role === "Owner" || role === "Mechanic") {
        setStep(2);
      } else {
        setStep(3);
      }
    } catch (err) {
      setError("Google sign-up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMechanicSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!mechShopName.trim()) return setError("Please enter the shop name you work at.");
    if (!mechSpecialization) return setError("Please select your specialization.");

    setLoading(true);
    try {
      let user = createdUser;
      if (!user) {
        const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
        user = newUser;
        const dName = [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(" ");
        await updateProfile(user, { displayName: dName });
      }
      await saveUser(
        user, role,
        { firstName: firstName.trim(), middleName: middleName.trim(), lastName: lastName.trim() },
        "", "",
        { shopName: mechShopName.trim(), specialization: mechSpecialization }
      );
      navigate("/pending");
    } catch (err) {
      setError(err.code === "auth/email-already-in-use" ? "This email is already registered." : err.message);
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
      const permitUrl = await uploadToCloudinary(permitFile);
      await executeSignup(permitUrl, shopName.trim());
    } catch (err) {
      setError(err.message || "Failed to upload permit.");
      setLoading(false);
    }
  };

  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!vehicleMake.trim() || !vehicleModel.trim()) return setError("Vehicle make and model are required.");
    if (!vehiclePlate.trim()) return setError("Vehicle plate number is required.");

    setLoading(true);
    try {
      let user = createdUser;
      // If user was not created via Google, create them now with email/password
      if (!user) {
        const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
        user = newUser;
        const dName = [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(" ");
        await updateProfile(user, { displayName: dName });
      }
      
      // Save user data to 'users' collection
      await saveUser(user, role, { firstName: firstName.trim(), middleName: middleName.trim(), lastName: lastName.trim() });

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

      navigate("/pending");
    } catch (err) {
      setError(err.code === "auth/email-already-in-use" ? "This email is already registered." : err.message);
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.topAccent} />
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
          <div style={s.errorBox}>
            <span style={s.errorDot} />
            {error}
          </div>
        )}

        <div style={s.card}>
          {step === 1 ? (
            <>
              <label style={s.label}>First Name</label>
              <input
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value.replace(/[^a-zA-Z\s-]/g, ''))}
                style={s.input}
                required
              />

              <label style={s.label}>Middle Name</label>
              <input
                type="text"
                placeholder="Middle name (optional)"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value.replace(/[^a-zA-Z\s-]/g, ''))}
                style={s.input}
              />

              <label style={s.label}>Last Name</label>
              <input
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value.replace(/[^a-zA-Z\s-]/g, ''))}
                style={s.input}
                required
              />

              <label style={s.label}>Email</label>
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={s.input}
                required
              />

              <label style={s.label}>Password</label>
              <input
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={s.input}
                required
              />

              <label style={s.label}>Confirm password</label>
              <input
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={s.input}
                required
              />

              <label style={s.label}>I am a…</label>
              <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
                {ROLES.map((r) => {
                  const roleIcon = r === "Customer" ? "🚗" : r === "Owner" ? "🏪" : "🔧";
                  const roleSub  = r === "Customer" ? "Book services" : r === "Owner" ? "Manage the shop" : "Fix & repair";
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => { setRole(r); setError(""); }}
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
              <h3 style={{ marginTop: 0, color: "#111827", fontSize: "18px", fontWeight: "700" }}>🔧 Mechanic Details</h3>
              <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "16px", marginTop: "-4px" }}>Tell us about your skills and the shop you work at.</p>

              <label style={s.label}>Shop Name You Work At *</label>
              <input
                type="text"
                placeholder="e.g. JME Auto Shop"
                value={mechShopName}
                onChange={(e) => setMechShopName(e.target.value)}
                style={s.input}
                required
              />

              <label style={s.label}>Your Specialization *</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px" }}>
                {MECHANIC_SPECIALTIES.map((spec) => (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => setMechSpecialization(spec)}
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

              <button
                onClick={handleMechanicSubmit}
                style={{ ...s.primaryBtn, opacity: loading ? 0.75 : 1 }}
                disabled={loading}
              >
                {loading ? "Submitting…" : "Complete Sign Up"}
              </button>
              <button onClick={() => setStep(1)} style={{ ...s.outlineBtn, marginTop: "8px" }} disabled={loading}>Back</button>
            </>
          ) : step === 2 ? (
            <>
              <h3 style={{ marginTop: 0, color: "#111827", fontSize: "18px", fontWeight: "700" }}>Shop Details</h3>
              <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "16px", marginTop: "-4px" }}>Please provide your auto shop details and proof of business.</p>

              <label style={s.label}>Shop Name</label>
              <input
                type="text"
                placeholder="Your shop name"
                value={shopName}
                onChange={(e) => setShopName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                style={s.input}
                required
              />

              <label style={s.label}>Business Permit / Proof</label>
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
                  }
                }}
              />
              <div
                onClick={() => document.getElementById("permitUpload").click()}
                style={{
                  width: "100%", height: permitPreview ? "160px" : "100px",
                  background: "#f9fafb", borderRadius: "10px",
                  border: "1.5px dashed #e5e7eb",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", overflow: "hidden", marginBottom: "20px",
                  fontSize: "13px", color: "#9ca3af",
                }}
              >
                {permitPreview
                  ? <img src={permitPreview} alt="permit" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }} />
                  : "📎 Tap to upload permit photo"
                }
              </div>

              <button
                onClick={handleOwnerSubmit}
                style={{ ...s.primaryBtn, opacity: loading ? 0.75 : 1 }}
                disabled={loading}
              >
                {loading ? "Submitting…" : "Complete Sign Up"}
              </button>
              <button
                onClick={() => setStep(1)}
                style={{ ...s.outlineBtn, marginTop: "8px" }}
                disabled={loading}
              >
                Back
              </button>
            </>
          ) : ( // Step 3: Customer Vehicle Registration
            <>
              <h3 style={{ marginTop: 0, color: "#111827", fontSize: "18px", fontWeight: "700" }}>Vehicle Details</h3>
              <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "16px", marginTop: "-4px" }}>Please register your primary vehicle to continue.</p>

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
                  : "📷 Tap to upload photo"
                }
              </div>

              <label style={s.label}>Vehicle Make *</label>
              <input type="text" placeholder="e.g. Toyota" value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} style={s.input} required />

              <label style={s.label}>Vehicle Model *</label>
              <input type="text" placeholder="e.g. Vios" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} style={s.input} required />

              <label style={s.label}>Year</label>
              <input type="text" placeholder="e.g. 2023" value={vehicleYear} onChange={(e) => setVehicleYear(e.target.value.replace(/[^0-9]/g, ''))} style={s.input} />

              <label style={s.label}>Plate Number *</label>
              <input type="text" placeholder="ABC 1234" value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} style={s.input} required />

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
                onClick={() => setStep(1)}
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
    background: "#f5f7fa",
    display: "flex",
    flexDirection: "column",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    position: "relative",
  },
  topAccent: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: "220px",
    background: "linear-gradient(160deg, #1a3a5c 0%, #2a5298 100%)",
    zIndex: 0,
    borderBottomLeftRadius: "32px",
    borderBottomRightRadius: "32px",
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
    width: "80px", height: "80px", borderRadius: "50%",
    border: "3px solid rgba(70,233,255,0.8)",
    padding: "3px",
    background: "rgba(255,255,255,0.15)",
    marginBottom: "12px",
    overflow: "hidden",
  },
  logo: { width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" },
  appName: { fontSize: "22px", fontWeight: "700", color: "#fff", margin: "0 0 4px", letterSpacing: "0.5px" },
  tagline: { fontSize: "14px", color: "rgba(255,255,255,0.75)", margin: 0 },
  backBtn: { position: "absolute", top: "24px", left: "24px", background: "transparent", border: "none", display: "flex", alignItems: "center", gap: "6px", color: "#fff", fontSize: "15px", fontWeight: "600", cursor: "pointer", zIndex: 10, padding: "8px 12px", borderRadius: "20px", transition: "background 0.2s ease" },
  errorBox: {
    width: "100%", maxWidth: "400px",
    display: "flex", alignItems: "center", gap: "8px",
    background: "#fff3f3", border: "1px solid #fca5a5",
    borderRadius: "10px", padding: "10px 14px",
    fontSize: "13px", color: "#b91c1c", marginBottom: "12px", boxSizing: "border-box",
  },
  errorDot: {
    width: "6px", height: "6px", borderRadius: "50%",
    background: "#ef4444", flexShrink: 0, display: "inline-block",
  },
  card: {
    width: "100%", maxWidth: "400px",
    background: "#ffffff", borderRadius: "20px",
    padding: "24px 20px", boxSizing: "border-box",
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
  },
  label: {
    display: "block", fontSize: "12px", fontWeight: "600",
    color: "#6b7280", letterSpacing: "0.4px", textTransform: "uppercase", marginBottom: "6px",
  },
  input: {
    display: "block", width: "100%", padding: "13px 14px", fontSize: "15px",
    border: "1.5px solid #e5e7eb", borderRadius: "10px", outline: "none",
    background: "#f9fafb", color: "#111827", boxSizing: "border-box",
    marginBottom: "16px", appearance: "none", fontFamily: "inherit",
  },
  primaryBtn: {
    width: "100%", padding: "14px",
    background: "linear-gradient(135deg, #1a3a5c, #2a5298)",
    color: "#fff", fontSize: "15px", fontWeight: "600",
    border: "none", borderRadius: "12px", cursor: "pointer",
    marginTop: "4px", marginBottom: "16px", fontFamily: "inherit",
  },
  outlineBtn: {
    width: "100%", padding: "14px",
    background: "transparent", color: "#6b7280",
    fontSize: "15px", fontWeight: "600",
    border: "1.5px solid #e5e7eb", borderRadius: "12px",
    cursor: "pointer", fontFamily: "inherit",
  },
  divider: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" },
  dividerLine: { flex: 1, height: "1px", background: "#e5e7eb" },
  dividerLabel: { fontSize: "13px", color: "#9ca3af" },
  googleBtn: {
    width: "100%", padding: "13px 14px",
    background: "#fff", border: "1.5px solid #e5e7eb",
    borderRadius: "12px", fontSize: "15px", fontWeight: "600",
    color: "#374151", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
    fontFamily: "inherit",
  },
  switchRow: {
    display: "flex", alignItems: "center", gap: "8px", marginTop: "24px",
    padding: "16px 20px", background: "#ffffff", borderRadius: "14px",
    width: "100%", maxWidth: "400px", boxSizing: "border-box",
    justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  switchText: { fontSize: "14px", color: "#6b7280" },
  switchBtn: {
    fontSize: "14px", fontWeight: "700", color: "#2a5298",
    background: "none", border: "none", cursor: "pointer", padding: 0,
  },
};