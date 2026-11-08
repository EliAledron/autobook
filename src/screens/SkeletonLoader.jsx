import React from "react";
import { colors, sh } from "./dashboardShared";

export default function SkeletonLoader({ count = 3, type = "card" }) {
  // Ultra-smooth pulsing animation for pixel-accurate skeleton loading
  const skeletonKeyframes = `
    @keyframes skeletonPulseLight {
      0% { background-position: 100% 50%; }
      100% { background-position: 0 50%; }
    }
    @keyframes skeletonPulseDark {
      0% { background-position: 100% 50%; }
      100% { background-position: 0 50%; }
    }
  `;

  // Shimmer for light cards and surfaces
  const lightShimmer = (height, width = "100%", borderRadius = "12px", extra = {}) => ({
    height,
    width,
    borderRadius,
    background: `linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)`,
    backgroundSize: "400% 100%",
    animation: "skeletonPulseLight 1.5s ease-in-out infinite",
    boxSizing: "border-box",
    ...extra
  });

  // Shimmer for inside dark navy hero headers
  const darkShimmer = (height, width = "100%", borderRadius = "12px", extra = {}) => ({
    height,
    width,
    borderRadius,
    background: `linear-gradient(90deg, rgba(255,255,255,0.08) 25%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0.08) 75%)`,
    backgroundSize: "400% 100%",
    animation: "skeletonPulseDark 1.5s ease-in-out infinite",
    boxSizing: "border-box",
    ...extra
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. CUSTOMER DASHBOARD (Pixel-accurate to CustomerDashboard.jsx)
  // ─────────────────────────────────────────────────────────────────────────────
  if (type === "dashboard" || type === "customer-dashboard") {
    return (
      <div style={{ ...sh.page, paddingBottom: "80px", position: "relative" }}>
        <style>{skeletonKeyframes}</style>

        {/* Real Topbar */}
        <div style={sh.topbar}>
          <div style={sh.topbarLogo}>Auto<span style={sh.topbarAccent}>Book</span></div>
          <div style={sh.topbarRight}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
              <div style={darkShimmer("12px", "70px", "6px")} />
              <div style={darkShimmer("10px", "45px", "4px")} />
            </div>
            <div style={darkShimmer("34px", "34px", "50%")} />
          </div>
        </div>

        {/* Real Hero Banner */}
        <div style={{ ...sh.hero, paddingBottom: "1.25rem", borderRadius: "0 0 24px 24px", position: "relative", zIndex: 1, overflow: "hidden" }}>
          {/* Role Pill */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(70,233,255,0.18)", border: "0.5px solid rgba(70,233,255,0.4)", borderRadius: "20px", padding: "3px 10px", marginBottom: "0.5rem" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: colors.accent }} />
            <span style={{ fontSize: "10px", color: colors.accent, fontWeight: "600", letterSpacing: "0.5px", textTransform: "uppercase" }}>Customer</span>
          </div>

          {/* Greeting & Subtitle */}
          <div style={{ marginBottom: "0.25rem" }}>
            <div style={darkShimmer("24px", "55%", "8px")} />
          </div>
          <div>
            <div style={darkShimmer("14px", "42%", "6px")} />
          </div>
        </div>

        {/* Content Section */}
        <div style={{ ...sh.content, paddingTop: "0.85rem", position: "relative", zIndex: 2 }}>
          
          {/* My Bookings Section Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "0.75rem", marginTop: "0.25rem" }}>
            <div style={{ width: "5px", height: "20px", borderRadius: "3px", background: colors.accent }} />
            <span style={{ fontSize: "18px", fontWeight: "800", color: colors.textPrimary, letterSpacing: "-0.3px" }}>My Bookings</span>
          </div>

          {/* Gauge Card Skeleton */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px", marginBottom: "1rem" }}>
            <div style={{ ...sh.card, display: "flex", alignItems: "center", gap: "20px", marginBottom: 0 }}>
              {/* Semi-circle Gauge placeholder */}
              <div style={{ width: "120px", height: "60px", flexShrink: 0, position: "relative", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                <div style={lightShimmer("60px", "120px", "60px 60px 0 0")} />
              </div>
              {/* 4 Status Rows on Right */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                {[1, 2, 3, 4].map(r => (
                  <div key={r} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "60%" }}>
                      <div style={lightShimmer("10px", "10px", "3px")} />
                      <div style={lightShimmer("12px", "65%", "4px")} />
                    </div>
                    <div style={lightShimmer("12px", "20px", "4px")} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions Section Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "0.75rem", marginTop: "1.25rem" }}>
            <div style={{ width: "5px", height: "20px", borderRadius: "3px", background: colors.accent }} />
            <span style={{ fontSize: "18px", fontWeight: "800", color: colors.textPrimary, letterSpacing: "-0.3px" }}>Quick Actions</span>
          </div>

          {/* 2x2 Quick Actions Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "1rem" }}>
            {[1, 2, 3, 4].map(idx => (
              <div key={idx} style={{ background: colors.white, borderRadius: "20px", padding: "16px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "12px", border: `1px solid ${colors.border}`, boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
                <div style={lightShimmer("48px", "48px", "16px")} />
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={lightShimmer("15px", "70%", "6px")} />
                  <div style={lightShimmer("11px", "50%", "4px")} />
                </div>
              </div>
            ))}
          </div>

          {/* Maintenance Roadmap Section Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "0.75rem", marginTop: "1.25rem" }}>
            <div style={{ width: "5px", height: "20px", borderRadius: "3px", background: colors.accent }} />
            <span style={{ fontSize: "18px", fontWeight: "800", color: colors.textPrimary, letterSpacing: "-0.3px" }}>Maintenance Roadmap</span>
          </div>

          {/* Vehicle Selector Card */}
          <div style={{ ...sh.card, padding: "16px", marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={lightShimmer("14px", "40%", "6px")} />
              <div style={lightShimmer("20px", "60px", "10px")} />
            </div>
            <div style={lightShimmer("10px", "100%", "5px")} />
          </div>

          {/* Recent Activity Section Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "0.75rem", marginTop: "1.25rem" }}>
            <div style={{ width: "5px", height: "20px", borderRadius: "3px", background: colors.accent }} />
            <span style={{ fontSize: "18px", fontWeight: "800", color: colors.textPrimary, letterSpacing: "-0.3px" }}>Recent Activity</span>
          </div>

          {/* Recent Activity List Card */}
          <div style={{ background: colors.white, borderRadius: "24px", border: `1px solid ${colors.border}`, boxShadow: "0 4px 24px rgba(0,0,0,0.04)", overflow: "hidden", marginBottom: "1.5rem" }}>
            {[1, 2].map((k, i) => (
              <div key={k} style={{ padding: "16px", borderBottom: i === 0 ? "1px solid #f1f5f9" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "65%" }}>
                  <div style={lightShimmer("15px", "60%", "6px")} />
                  <div style={lightShimmer("12px", "40%", "4px")} />
                </div>
                <div style={lightShimmer("24px", "65px", "8px")} />
              </div>
            ))}
          </div>

        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. MECHANIC DASHBOARD (Pixel-accurate to MechanicDashboard.jsx)
  // ─────────────────────────────────────────────────────────────────────────────
  if (type === "mechanic-dashboard") {
    return (
      <div style={{ ...sh.page, paddingBottom: "80px", position: "relative" }}>
        <style>{skeletonKeyframes}</style>

        {/* Topbar */}
        <div style={sh.topbar}>
          <div style={sh.topbarLogo}>Auto<span style={sh.topbarAccent}>Book</span></div>
          <div style={sh.topbarRight}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
              <div style={darkShimmer("12px", "70px", "6px")} />
              <div style={darkShimmer("10px", "45px", "4px")} />
            </div>
            <div style={darkShimmer("34px", "34px", "50%")} />
          </div>
        </div>

        {/* Mechanic Hero Header */}
        <div style={{ background: `linear-gradient(135deg, #0f2942 0%, #1a3a5c 50%, #1e4d8c 100%)`, padding: "1.5rem 1.25rem 4.5rem", position: "relative", overflow: "hidden" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(70,233,255,0.18)", border: "0.5px solid rgba(70,233,255,0.4)", borderRadius: "20px", padding: "3px 10px", marginBottom: "0.5rem" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: colors.accent }} />
            <span style={{ fontSize: "10px", color: colors.accent, fontWeight: "600", letterSpacing: "0.5px", textTransform: "uppercase" }}>Mechanic</span>
          </div>

          <div style={{ marginBottom: "0.25rem" }}>
            <div style={darkShimmer("24px", "55%", "8px")} />
          </div>
          <div>
            <div style={darkShimmer("13px", "40%", "6px")} />
          </div>

          {/* 3 Floating Stat Pills */}
          <div style={{ display: "flex", gap: "8px", marginTop: "1.25rem", flexWrap: "wrap" }}>
            {[1, 2, 3].map(p => (
              <div key={p} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "12px", padding: "8px 14px", display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={darkShimmer("16px", "24px", "6px")} />
                <div style={darkShimmer("11px", "45px", "4px")} />
              </div>
            ))}
          </div>
        </div>

        {/* Content Section */}
        <div style={{ ...sh.content, position: "relative", zIndex: 2 }}>
          {/* Active Job Card */}
          <div style={{ ...sh.card, marginTop: "-2rem", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={lightShimmer("16px", "45%", "6px")} />
              <div style={lightShimmer("22px", "70px", "8px")} />
            </div>
            <div style={lightShimmer("14px", "75%", "6px", { marginBottom: "8px" })} />
            <div style={lightShimmer("12px", "35%", "4px")} />
          </div>

          {/* Section: Job Requests */}
          <div style={{ ...sh.sectionLabel, marginTop: "1.5rem" }}>Assigned Jobs</div>
          {[1, 2].map(k => (
            <div key={k} style={{ ...sh.card, padding: "16px", marginBottom: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={lightShimmer("15px", "50%", "6px")} />
                <div style={lightShimmer("18px", "60px", "8px")} />
              </div>
              <div style={lightShimmer("12px", "80%", "4px")} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. PROFILE SCREEN (Pixel-accurate to Profile.jsx)
  // ─────────────────────────────────────────────────────────────────────────────
  if (type === "profile") {
    return (
      <div style={{ ...sh.page, paddingBottom: "80px", position: "relative" }}>
        <style>{skeletonKeyframes}</style>

        {/* Topbar with Back button & Edit pill */}
        <div style={sh.topbar}>
          <div style={{ width: "36px", height: "36px" }} />
          <div style={darkShimmer("32px", "64px", "24px")} />
        </div>

        {/* Curved Hero Header */}
        <div style={{
          background: `linear-gradient(145deg, #0f2640 0%, #1a3a5c 40%, #2a5298 100%)`,
          padding: "1.5rem 1.25rem 3rem",
          alignItems: "center", display: "flex", flexDirection: "column",
          borderBottomLeftRadius: "32px", borderBottomRightRadius: "32px",
          boxShadow: "0 10px 30px rgba(15, 38, 64, 0.15)",
          position: "relative", overflow: "hidden"
        }}>
          {/* Centered 92px Avatar Circle */}
          <div style={{ marginBottom: "16px" }}>
            <div style={darkShimmer("92px", "92px", "50%", { border: "3px solid rgba(255,255,255,0.3)" })} />
          </div>

          {/* User Name */}
          <div style={{ marginBottom: "8px", width: "100%", display: "flex", justifyContent: "center" }}>
            <div style={darkShimmer("22px", "140px", "8px")} />
          </div>

          {/* Role Pill */}
          <div style={darkShimmer("22px", "85px", "20px")} />
        </div>

        {/* Floating Detail Card */}
        <div style={{ padding: "1.25rem", maxWidth: "480px", margin: "-1.5rem auto 0", width: "100%", boxSizing: "border-box", position: "relative", zIndex: 2 }}>
          <div style={{ background: colors.white, borderRadius: "20px", padding: "24px 20px", border: `1px solid ${colors.border}`, boxShadow: "0 10px 30px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", gap: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <div style={lightShimmer("18px", "18px", "4px")} />
              <div style={lightShimmer("16px", "120px", "6px")} />
            </div>

            {/* 4 Input Field Rows */}
            {[1, 2, 3, 4].map(idx => (
              <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={lightShimmer("11px", "25%", "4px")} />
                <div style={lightShimmer("44px", "100%", "12px")} />
              </div>
            ))}
          </div>

          {/* Log Out Button */}
          <div style={{ marginTop: "1.5rem" }}>
            <div style={lightShimmer("48px", "100%", "14px")} />
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. SHOPS & MECHANICS (Pixel-accurate to FindMechanic.jsx)
  // ─────────────────────────────────────────────────────────────────────────────
  if (type === "shops" || type === "shop") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <style>{skeletonKeyframes}</style>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{
            background: colors.white,
            borderRadius: "16px",
            border: `1px solid ${colors.border}`,
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            padding: "12px 14px",
            boxSizing: "border-box"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={lightShimmer("46px", "46px", "12px")} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={lightShimmer("15px", "55%", "6px")} />
                <div style={lightShimmer("12px", "30%", "4px")} />
                <div style={lightShimmer("12px", "40%", "4px")} />
              </div>
              <div style={lightShimmer("30px", "30px", "50%")} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 4b. SHOP SELECT (Pixel-accurate to ShopSelect.jsx)
  if (type === "shop-select") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <style>{skeletonKeyframes}</style>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{
            background: colors.white,
            borderRadius: "16px",
            border: `1px solid ${colors.border}`,
            boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
            padding: "14px 16px",
            boxSizing: "border-box"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
              <div style={lightShimmer("48px", "48px", "12px")} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={lightShimmer("15px", "55%", "6px")} />
                <div style={lightShimmer("12px", "30%", "4px")} />
                <div style={lightShimmer("12px", "40%", "4px")} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={lightShimmer("34px", "50%", "12px")} />
              <div style={lightShimmer("34px", "50%", "12px")} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. VEHICLES LIST (Pixel-accurate to MyVehicles.jsx)
  // ─────────────────────────────────────────────────────────────────────────────
  if (type === "vehicles" || type === "vehicle") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <style>{skeletonKeyframes}</style>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{
            background: colors.white,
            borderRadius: "20px",
            border: `1px solid ${colors.border}`,
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
            padding: "16px",
            boxSizing: "border-box"
          }}>
            {/* 160px Vehicle Photo Banner */}
            <div style={lightShimmer("160px", "100%", "14px", { marginBottom: "12px" })} />

            {/* Info Row: Make/Model & Plate + Edit Button */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={lightShimmer("16px", "55%", "6px")} />
                <div style={lightShimmer("13px", "40%", "4px")} />
              </div>
              <div style={lightShimmer("32px", "65px", "10px")} />
            </div>
          </div>
        ))}
        {/* Prominent Bottom Add Button Placeholder */}
        <div style={lightShimmer("52px", "100%", "18px", { marginTop: "4px" })} />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. BOOKING HISTORY (Pixel-accurate to BookingHistory.jsx)
  // ─────────────────────────────────────────────────────────────────────────────
  if (type === "history" || type === "bookings") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <style>{skeletonKeyframes}</style>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{
            background: colors.white,
            borderRadius: "16px",
            border: `1px solid ${colors.border}`,
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            boxSizing: "border-box"
          }}>
            {/* Status pill & badges row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={lightShimmer("22px", "70px", "8px")} />
              <div style={lightShimmer("12px", "50px", "4px")} />
            </div>

            {/* Service Title */}
            <div style={lightShimmer("16px", "60%", "6px")} />

            {/* Shop name & contacts row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={lightShimmer("13px", "45%", "4px")} />
              <div style={{ display: "flex", gap: "6px" }}>
                <div style={lightShimmer("24px", "24px", "6px")} />
                <div style={lightShimmer("24px", "24px", "6px")} />
              </div>
            </div>

            {/* Date and divider */}
            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={lightShimmer("12px", "40%", "4px")} />
              <div style={lightShimmer("12px", "20px", "4px")} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. ALERTS & NOTIFICATIONS (Pixel-accurate to Alerts.jsx)
  // ─────────────────────────────────────────────────────────────────────────────
  if (type === "alerts" || type === "notifications") {
    return (
      <div style={{ background: colors.white, borderRadius: "20px", border: `1px solid ${colors.border}`, padding: "16px", boxShadow: "0 4px 16px rgba(0,0,0,0.03)" }}>
        <style>{skeletonKeyframes}</style>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ display: "flex", gap: "12px", padding: "12px 0", borderBottom: i < count - 1 ? `1px solid ${colors.border}` : "none", alignItems: "flex-start" }}>
            {/* 40x40 Icon Square */}
            <div style={lightShimmer("40px", "40px", "12px")} />

            {/* Title & Message */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={lightShimmer("14px", "55%", "6px")} />
                <div style={lightShimmer("10px", "35px", "4px")} />
              </div>
              <div style={lightShimmer("12px", "85%", "4px")} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. SOCIAL / SHOP FEED (Pixel-accurate to ShopFeed.jsx)
  // ─────────────────────────────────────────────────────────────────────────────
  if (type === "post" || type === "feed") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <style>{skeletonKeyframes}</style>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{
            background: colors.white,
            borderRadius: "20px",
            padding: "20px",
            border: `1px solid ${colors.border}`,
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            boxSizing: "border-box"
          }}>
            {/* Header: 42x42 Avatar + Shop Name + Star Ratings */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={lightShimmer("42px", "42px", "50%")} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={lightShimmer("15px", "45%", "6px")} />
                <div style={lightShimmer("11px", "30%", "4px")} />
              </div>
            </div>

            {/* Post Caption text lines */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={lightShimmer("13px", "95%", "4px")} />
              <div style={lightShimmer("13px", "70%", "4px")} />
            </div>

            {/* 180px Photo block */}
            <div style={lightShimmer("180px", "100%", "14px")} />

            {/* Like & Comment action row */}
            <div style={{ display: "flex", gap: "16px", paddingTop: "4px" }}>
              <div style={lightShimmer("24px", "65px", "12px")} />
              <div style={lightShimmer("24px", "65px", "12px")} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. BOOKING FORM (Pixel-accurate to BookService.jsx)
  // ─────────────────────────────────────────────────────────────────────────────
  if (type === "booking-form") {
    return (
      <div style={{ ...sh.page, paddingBottom: "80px", position: "relative" }}>
        <style>{skeletonKeyframes}</style>

        {/* Topbar */}
        <div style={sh.topbar}>
          <div style={{ width: "36px", height: "36px" }} />
        </div>

        {/* Hero banner */}
        <div style={sh.hero}>
          <div style={{ marginBottom: "0.5rem" }}><div style={darkShimmer("18px", "70px", "12px")} /></div>
          <div style={{ marginBottom: "0.25rem" }}><div style={darkShimmer("24px", "50%", "8px")} /></div>
          <div><div style={darkShimmer("13px", "35%", "6px")} /></div>
        </div>

        {/* Form Content */}
        <div style={{ ...sh.content, position: "relative", zIndex: 2 }}>
          {[1, 2, 3].map(k => (
            <div key={k} style={{ ...sh.card, display: "flex", flexDirection: "column", gap: "10px", marginBottom: "1rem" }}>
              <div style={lightShimmer("14px", "35%", "4px")} />
              <div style={lightShimmer("46px", "100%", "12px")} />
            </div>
          ))}
          <div style={lightShimmer("52px", "100%", "16px", { marginTop: "1rem" })} />
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. SHOP PROFILE (Pixel-accurate to AutoShopProfile.jsx)
  // ─────────────────────────────────────────────────────────────────────────────
  if (type === "shop-profile") {
    return (
      <div style={{ maxWidth: "1200px", margin: "0 auto", width: "100%", boxSizing: "border-box", padding: "16px" }}>
        <style>{skeletonKeyframes}</style>

        {/* Modern Shop Hero Cover Header */}
        <div style={{
          position: "relative", width: "100%", minHeight: "260px",
          borderRadius: "24px", overflow: "hidden",
          background: `linear-gradient(135deg, #0f2640, #1a3a5c)`,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          display: "flex", flexDirection: "column", justifyContent: "flex-end",
          padding: "20px 24px", boxSizing: "border-box"
        }}>
          <div style={{ display: "flex", gap: "20px", alignItems: "flex-end", flexWrap: "wrap", position: "relative", zIndex: 1 }}>
            {/* 88px Shop Circle Logo */}
            <div style={darkShimmer("88px", "88px", "50%", { border: "3px solid rgba(255,255,255,0.2)" })} />

            <div style={{ flex: 1, minWidth: "200px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={darkShimmer("28px", "220px", "8px")} />
              <div style={darkShimmer("14px", "160px", "6px")} />
              <div style={darkShimmer("14px", "120px", "6px")} />
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div style={{ display: "flex", gap: "10px", marginTop: "1rem", flexWrap: "wrap" }}>
          <div style={lightShimmer("42px", "110px", "12px")} />
          <div style={lightShimmer("42px", "120px", "12px")} />
          <div style={lightShimmer("42px", "90px", "12px")} />
        </div>

        {/* Services Section */}
        <div style={{ marginTop: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "1rem" }}>
            <div style={{ width: "4px", height: "18px", borderRadius: "2px", background: colors.accent }} />
            <div style={lightShimmer("18px", "140px", "6px")} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
            {[1, 2, 3].map(k => (
              <div key={k} style={{ ...sh.card, padding: "16px", display: "flex", flexDirection: "column", gap: "8px", marginBottom: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={lightShimmer("16px", "60%", "6px")} />
                  <div style={lightShimmer("16px", "50px", "6px")} />
                </div>
                <div style={lightShimmer("12px", "85%", "4px")} />
                <div style={lightShimmer("36px", "100%", "10px", { marginTop: "6px" })} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 11. REVIEWS (Pixel-accurate to CustomerReviews.jsx)
  // ─────────────────────────────────────────────────────────────────────────────
  if (type === "reviews") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <style>{skeletonKeyframes}</style>

        {/* Rating Summary Card */}
        <div style={{ ...sh.card, display: "flex", alignItems: "center", gap: "20px", marginBottom: 0 }}>
          <div style={lightShimmer("48px", "64px", "12px")} />
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
            <div style={lightShimmer("18px", "110px", "6px")} />
            <div style={lightShimmer("13px", "160px", "4px")} />
          </div>
        </div>

        {/* Review Cards */}
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ ...sh.card, padding: "16px", display: "flex", flexDirection: "column", gap: "10px", marginBottom: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={lightShimmer("40px", "40px", "50%")} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={lightShimmer("15px", "40%", "6px")} />
                <div style={lightShimmer("12px", "30%", "4px")} />
              </div>
              <div style={lightShimmer("14px", "60px", "6px")} />
            </div>
            <div style={lightShimmer("13px", "90%", "4px")} />
            <div style={lightShimmer("13px", "65%", "4px")} />
          </div>
        ))}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 12. ROW LIST (Pixel-accurate for list items inside sh.card)
  // ─────────────────────────────────────────────────────────────────────────────
  if (type === "rows" || type === "row-list") {
    return (
      <div style={{ width: "100%" }}>
        <style>{skeletonKeyframes}</style>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            padding: "16px",
            borderBottom: i < count - 1 ? "1px solid #f1f5f9" : "none",
            boxSizing: "border-box"
          }}>
            {/* 44x44 icon container */}
            <div style={lightShimmer("44px", "44px", "14px", { flexShrink: 0 })} />

            {/* Title & Subtitle column */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={lightShimmer("14px", "55%", "6px")} />
              <div style={lightShimmer("12px", "40%", "4px")} />
              <div style={lightShimmer("10px", "25%", "4px")} />
            </div>

            {/* Status pill on right */}
            <div style={lightShimmer("24px", "68px", "12px", { flexShrink: 0 })} />
          </div>
        ))}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 13. DEFAULT CARD / LIST FALLBACK
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%", boxSizing: "border-box" }}>
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
          alignItems: type === "list" ? "center" : "flex-start",
          boxSizing: "border-box"
        }}>
          {type === "list" && (
            <div style={lightShimmer("50px", "50px", "50%")} />
          )}
          
          <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={lightShimmer("16px", "40%", "8px")} />
            <div style={lightShimmer("12px", "70%", "6px")} />
            {type === "card" && <div style={lightShimmer("12px", "90%", "6px", { marginTop: "4px" })} />}
            {type === "card" && (
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <div style={lightShimmer("32px", "80px", "16px")} />
                <div style={lightShimmer("32px", "80px", "16px")} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
