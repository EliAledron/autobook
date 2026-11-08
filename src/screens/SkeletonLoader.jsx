import React from "react";
import { colors } from "./dashboardShared";

export default function SkeletonLoader({ count = 3, type = "card" }) {
  // A sleek pulsing animation for premium skeleton loading
  const skeletonKeyframes = `
    @keyframes skeletonPulse {
      0% { background-position: 100% 50%; }
      100% { background-position: 0 50%; }
    }
  `;

  const getStyle = (height, width = "100%", borderRadius = "12px", extra = {}) => ({
    height,
    width,
    borderRadius,
    background: `linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)`,
    backgroundSize: "400% 100%",
    animation: "skeletonPulse 1.5s ease-in-out infinite",
    ...extra
  });

  // Dedicated Dashboard skeleton layout
  if (type === "dashboard") {
    return (
      <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "18px", maxWidth: "600px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <style>{skeletonKeyframes}</style>
        
        {/* Top Header Row: Greeting & Avatar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", paddingBottom: "4px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "65%" }}>
            <div style={getStyle("26px", "70%", "8px")} />
            <div style={getStyle("14px", "45%", "6px")} />
          </div>
          <div style={getStyle("46px", "46px", "50%")} />
        </div>

        {/* Featured Vehicle / Main Banner Skeleton */}
        <div style={{
          background: "#fff",
          borderRadius: "24px",
          padding: "20px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
          border: `1px solid ${colors.border}`,
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={getStyle("18px", "45%", "8px")} />
            <div style={getStyle("24px", "70px", "12px")} />
          </div>
          <div style={getStyle("110px", "100%", "16px")} />
          <div style={{ display: "flex", gap: "10px" }}>
            <div style={getStyle("34px", "110px", "10px")} />
            <div style={getStyle("34px", "110px", "10px")} />
          </div>
        </div>

        {/* Quick actions / stats pills */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
          {[1, 2, 3].map((k) => (
            <div key={k} style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "16px 10px",
              border: `1px solid ${colors.border}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}>
              <div style={getStyle("28px", "28px", "50%")} />
              <div style={getStyle("12px", "65%", "6px")} />
            </div>
          ))}
        </div>

        {/* Section Title */}
        <div style={getStyle("18px", "40%", "6px", { marginTop: "6px" })} />

        {/* Service cards */}
        {[1, 2].map((k) => (
          <div key={k} style={{
            background: "#fff",
            borderRadius: "20px",
            padding: "18px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
            border: `1px solid ${colors.border}`,
            display: "flex",
            gap: "14px",
            alignItems: "center",
          }}>
            <div style={getStyle("48px", "48px", "14px")} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={getStyle("15px", "60%", "6px")} />
              <div style={getStyle("12px", "85%", "6px")} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Dedicated Profile skeleton layout
  if (type === "profile") {
    return (
      <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "20px", maxWidth: "500px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <style>{skeletonKeyframes}</style>
        
        {/* Avatar center */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "16px 0" }}>
          <div style={getStyle("84px", "84px", "50%")} />
          <div style={getStyle("20px", "45%", "8px")} />
          <div style={getStyle("13px", "30%", "6px")} />
        </div>

        {/* Field inputs card */}
        <div style={{
          background: "#fff",
          borderRadius: "20px",
          padding: "24px 20px",
          border: `1px solid ${colors.border}`,
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}>
          {[1, 2, 3, 4].map((k) => (
            <div key={k} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={getStyle("12px", "30%", "4px")} />
              <div style={getStyle("44px", "100%", "10px")} />
            </div>
          ))}
          <div style={getStyle("48px", "100%", "14px", { marginTop: "10px" })} />
        </div>
      </div>
    );
  }

  // Dedicated Social/Feed Post skeleton layout
  if (type === "post") {
    return (
      <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "16px", maxWidth: "600px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <style>{skeletonKeyframes}</style>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{
            background: "#fff",
            borderRadius: "20px",
            padding: "18px",
            border: `1px solid ${colors.border}`,
            boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={getStyle("42px", "42px", "50%")} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={getStyle("14px", "45%", "6px")} />
                <div style={getStyle("11px", "25%", "4px")} />
              </div>
            </div>
            <div style={getStyle("13px", "90%", "6px")} />
            <div style={getStyle("180px", "100%", "14px")} />
            <div style={{ display: "flex", gap: "16px", paddingTop: "6px" }}>
              <div style={getStyle("24px", "60px", "12px")} />
              <div style={getStyle("24px", "60px", "12px")} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Standard Card / List skeleton
  return (
    <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "16px", maxWidth: "600px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      <style>{skeletonKeyframes}</style>
      
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          background: "#fff",
          borderRadius: "20px",
          padding: "20px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
          border: `1px solid ${colors.border}`,
          display: "flex",
          flexDirection: type === "card" ? "column" : "row",
          gap: "16px",
          alignItems: type === "list" ? "center" : "flex-start"
        }}>
          {type === "list" && (
            <div style={getStyle("50px", "50px", "50%")} />
          )}
          
          <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={getStyle("16px", "40%", "8px")} />
            <div style={getStyle("12px", "70%", "6px")} />
            {type === "card" && <div style={getStyle("12px", "90%", "6px", { marginTop: "4px" })} />}
            {type === "card" && (
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <div style={getStyle("32px", "80px", "16px")} />
                <div style={getStyle("32px", "80px", "16px")} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
