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

  return (
    <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "16px" }}>
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
