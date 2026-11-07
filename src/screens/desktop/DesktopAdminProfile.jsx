import React, { useState, useRef } from "react";
import { updateProfile } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { colors, ErrorModal } from "../dashboardShared";
import RoleBasedWrapper from "../../components/RoleBasedWrapper";
import { useUser } from "../../UserContext";
import { User, Mail, Camera, Save } from "lucide-react";

export default function DesktopAdminProfile() {
  const { userProfile, refreshUserProfile } = useUser();
  const [name, setName] = useState(userProfile?.name || userProfile?.displayName || "");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: name });
      }
      if (userProfile?.id) {
        await updateDoc(doc(db, "users", userProfile.id), { name });
      }
      await refreshUserProfile();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to update profile");
    }
    setSaving(false);
  };

  return (
    <>
      <ErrorModal error={errorMsg} onClose={() => setErrorMsg("")} />
      <RoleBasedWrapper title="Admin Profile">
      <div style={{ padding: "32px" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: "800", color: colors.textPrimary, margin: "0 0 8px 0" }}>Profile Settings</h1>
            <p style={{ margin: 0, color: colors.textSecondary, fontSize: "15px" }}>Manage your platform administrator account details.</p>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: "20px", border: `1px solid ${colors.border}`, padding: "40px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "48px", alignItems: "flex-start" }}>
            
            {/* LEFT COLUMN: AVATAR & ADMIN IDENTITY */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingRight: "32px", borderRight: `1px solid ${colors.border}` }}>
              <div style={{ width: "96px", height: "96px", borderRadius: "24px", background: colors.navy, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px", fontWeight: "800", boxShadow: "0 4px 14px rgba(42, 82, 152, 0.2)" }}>
                {(name || "A")[0].toUpperCase()}
              </div>
              <div style={{ fontSize: "20px", fontWeight: "800", color: colors.textPrimary, marginTop: "16px" }}>
                {name || "Admin User"}
              </div>
              <div style={{ fontSize: "12px", fontWeight: "700", color: colors.navy, background: "#eef2ff", padding: "4px 12px", borderRadius: "20px", marginTop: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Super Administrator
              </div>

              <div style={{ width: "100%", marginTop: "32px", background: "#f8fafc", borderRadius: "14px", padding: "16px", border: `1px solid ${colors.border}`, textAlign: "left" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Account Details</div>
                <div style={{ fontSize: "13px", color: colors.textSecondary, marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
                  <span>Role</span>
                  <span style={{ fontWeight: "700", color: colors.textPrimary }}>Platform Admin</span>
                </div>
                <div style={{ fontSize: "13px", color: colors.textSecondary, marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
                  <span>Status</span>
                  <span style={{ fontWeight: "700", color: colors.success }}>Active</span>
                </div>
                <div style={{ fontSize: "13px", color: colors.textSecondary, display: "flex", justifyContent: "space-between" }}>
                  <span>Permissions</span>
                  <span style={{ fontWeight: "700", color: colors.textPrimary }}>Full Access</span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: EDIT FORM */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "600px" }}>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: "800", color: colors.textPrimary, margin: "0 0 6px 0" }}>Personal Information</h2>
                <p style={{ margin: 0, color: colors.textSecondary, fontSize: "14px" }}>Update your administrator profile details.</p>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Full Name</label>
                <div style={{ position: "relative" }}>
                  <User size={18} color={colors.textMuted} style={{ position: "absolute", left: "16px", top: "15px" }} />
                  <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    placeholder="Enter your name"
                    style={{ width: "100%", padding: "14px 16px 14px 44px", borderRadius: "12px", border: `1px solid ${colors.border}`, background: "#f8fafc", fontSize: "15px", color: colors.textPrimary, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label style={{ fontSize: "13px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Email Address</label>
                  <span style={{ fontSize: "12px", color: colors.textMuted }}>Managed by Auth</span>
                </div>
                <div style={{ position: "relative" }}>
                  <Mail size={18} color={colors.textMuted} style={{ position: "absolute", left: "16px", top: "15px" }} />
                  <input 
                    type="email" 
                    value={auth.currentUser?.email || ""} 
                    disabled
                    style={{ width: "100%", padding: "14px 16px 14px 44px", borderRadius: "12px", border: `1px solid ${colors.border}`, background: "#f1f5f9", fontSize: "15px", color: colors.textMuted, outline: "none", boxSizing: "border-box", cursor: "not-allowed" }}
                  />
                </div>
              </div>

              <div style={{ paddingTop: "8px" }}>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "14px 32px", borderRadius: "12px", background: colors.navy, color: "#fff", fontSize: "15px", fontWeight: "700", border: "none", cursor: saving ? "not-allowed" : "pointer" }}
                >
                  <Save size={18} />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>

              {success && (
                <div style={{ padding: "12px 16px", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "10px", color: colors.success, fontSize: "14px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
                  ✓ Profile updated successfully!
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </RoleBasedWrapper>
    </>
  );
}
