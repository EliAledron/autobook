import React, { useState, useRef } from "react";
import { updateProfile } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { colors } from "../dashboardShared";
import RoleBasedWrapper from "../../components/RoleBasedWrapper";
import { useUser } from "../../UserContext";
import { User, Mail, Camera, Save } from "lucide-react";

export default function DesktopAdminProfile() {
  const { userProfile, refreshUserProfile } = useUser();
  const [name, setName] = useState(userProfile?.name || userProfile?.displayName || "");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

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
      alert("Failed to update profile");
    }
    setSaving(false);
  };

  return (
    <RoleBasedWrapper title="Admin Profile">
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "32px" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: "800", color: colors.textPrimary, margin: "0 0 8px 0" }}>Profile Settings</h1>
            <p style={{ margin: 0, color: colors.textSecondary, fontSize: "15px" }}>Manage your platform administrator account details.</p>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: "20px", border: `1px solid ${colors.border}`, padding: "32px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: "24px", marginBottom: "32px", paddingBottom: "32px", borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ width: "80px", height: "80px", borderRadius: "20px", background: colors.navy, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", fontWeight: "800" }}>
              {(name || "A")[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: "20px", fontWeight: "800", color: colors.textPrimary }}>{name || "Admin User"}</div>
              <div style={{ fontSize: "14px", color: colors.textSecondary, marginTop: "4px" }}>Super Administrator</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "400px" }}>
            
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Full Name</label>
              <div style={{ position: "relative" }}>
                <User size={18} color={colors.textMuted} style={{ position: "absolute", left: "16px", top: "15px" }} />
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  style={{ width: "100%", padding: "14px 16px 14px 44px", borderRadius: "12px", border: `1px solid ${colors.border}`, background: "#f8fafc", fontSize: "15px", color: colors.textPrimary, outline: "none", boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: colors.textSecondary, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Email Address</label>
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

            <button 
              onClick={handleSave}
              disabled={saving}
              style={{ marginTop: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", padding: "16px", borderRadius: "12px", background: colors.navy, color: "#fff", fontSize: "15px", fontWeight: "700", border: "none", cursor: saving ? "not-allowed" : "pointer" }}
            >
              <Save size={18} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
            {success && <div style={{ textAlign: "center", color: colors.success, fontSize: "14px", fontWeight: "600" }}>Profile updated successfully!</div>}

          </div>

        </div>

      </div>
    </RoleBasedWrapper>
  );
}
