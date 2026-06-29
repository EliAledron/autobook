// Shared styles, helpers, and components for AutoBook dashboards
import React from "react";

export function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

export const colors = {
  navy: "#1a3a5c",
  blue: "#2a5298",
  accent: "#46e9ff",
  orange: "#f97316",
  bg: "#f5f7fa",
  white: "#ffffff",
  border: "#e5e7eb",
  textPrimary: "#111827",
  textSecondary: "#6b7280",
  textMuted: "#9ca3af",
  success: "#16a34a",
  successBg: "#dcfce7",
  warning: "#d97706",
  warningBg: "#fef3c7",
  info: "#2563eb",
  infoBg: "#dbeafe",
  danger: "#dc2626",
  dangerBg: "#fee2e2",
};

const SVG_ICONS = {
  "🔔": <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 01-3.46 0"></path></svg>,
  "🔩": <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
  "📅": <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  "⭐": <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>,
  "👥": <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  "🏪": <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>,
  "🔧": <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"></path></svg>,
  "📍": <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>,
  "🚗": <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 16H9m10 0h3v-3.15a1 1 0 00-.84-.99L16 11l-2.7-3.6a2 2 0 00-1.6-.8H9a2 2 0 00-1.6.8L4.7 11l-5.16.86a1 1 0 00-.84.99V16h3m10 0a2 2 0 11-4 0m4 0a2 2 0 10-4 0m-10 0a2 2 0 11-4 0m4 0a2 2 0 10-4 0"></path></svg>
};

// ─── Reusable EmptyState Component ───────────────────────────────────────────
export function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div style={{
      background: "#ffffff",
      borderRadius: "24px",
      border: `1px solid ${colors.border}`,
      boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
      padding: "48px 24px",
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "8px",
      marginBottom: "1.5rem",
    }}>
      {/* Illustrated icon circle */}
      <div style={{
        width: "72px", height: "72px", borderRadius: "50%",
        background: `linear-gradient(135deg, ${colors.navy}15, ${colors.blue}20)`,
        border: `2px solid ${colors.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "32px", marginBottom: "8px",
        boxShadow: "0 4px 16px rgba(26,58,92,0.08)",
      }}>
        {SVG_ICONS[icon] || icon}
      </div>
      <div style={{ fontSize: "17px", fontWeight: "800", color: colors.textPrimary, letterSpacing: "-0.2px" }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: "13px", color: colors.textSecondary, fontWeight: "500", maxWidth: "240px", lineHeight: "1.5" }}>
          {subtitle}
        </div>
      )}
      {action && (
        <div style={{ marginTop: "16px" }}>
          {action}
        </div>
      )}
    </div>
  );
}

export const sh = {
  page: {
    minHeight: "100vh",
    background: colors.bg,
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    display: "flex",
    flexDirection: "column",
    paddingBottom: "80px",
  },
  topbar: {
    background: colors.navy,
    padding: "0.9rem 1.25rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  topbarLogo: { color: "#fff", fontSize: "17px", fontWeight: "700" },
  topbarAccent: { color: colors.accent },
  topbarRight: { display: "flex", alignItems: "center", gap: "10px" },
  topbarMeta: { textAlign: "right", fontSize: "12px", color: "rgba(255,255,255,0.7)" },
  topbarName: { color: "#fff", fontWeight: "500", fontSize: "13px" },
  avatar: {
    width: "34px", height: "34px", borderRadius: "50%",
    background: colors.accent, display: "flex", alignItems: "center",
    justifyContent: "center", fontWeight: "700", fontSize: "12px",
    color: colors.navy, flexShrink: 0, cursor: "pointer",
  },
  hero: {
    background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.blue} 100%)`,
    padding: "1.5rem 1.25rem 1.75rem",
  },
  rolePill: {
    display: "inline-flex", alignItems: "center", gap: "6px",
    background: "rgba(70,233,255,0.18)", border: "0.5px solid rgba(70,233,255,0.4)",
    borderRadius: "20px", padding: "3px 10px", marginBottom: "0.5rem",
  },
  roleDot: { width: "6px", height: "6px", borderRadius: "50%", background: colors.accent },
  roleText: { fontSize: "10px", color: colors.accent, fontWeight: "600", letterSpacing: "0.5px", textTransform: "uppercase" },
  heroGreeting: { fontSize: "20px", fontWeight: "700", color: "#fff", marginBottom: "0.2rem" },
  heroSub: { fontSize: "13px", color: "rgba(255,255,255,0.65)" },
  content: { padding: "1.25rem", flex: 1 },
  sectionLabel: {
    fontSize: "11px", fontWeight: "700", color: colors.textMuted,
    letterSpacing: "0.7px", textTransform: "uppercase", marginBottom: "0.65rem",
  },
  card: {
    background: colors.white, borderRadius: "20px",
    padding: "1.25rem", marginBottom: "1.25rem",
    boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
    border: `1px solid ${colors.border}`,
  },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", marginBottom: "1rem" },
  statCard: {
    background: colors.white, borderRadius: "16px",
    padding: "1.25rem", boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
    border: `1px solid ${colors.border}`,
    borderLeft: `4px solid ${colors.accent}`,
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  statLabel: { fontSize: "12px", fontWeight: "600", color: colors.textSecondary, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.4px" },
  statValue: { fontSize: "28px", fontWeight: "800", color: colors.textPrimary, letterSpacing: "-0.5px", lineHeight: 1 },
  actionGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", marginBottom: "1rem" },
  actionBtn: {
    background: colors.white, border: `1.5px solid ${colors.border}`,
    borderRadius: "16px", padding: "1.25rem",
    display: "flex", flexDirection: "column", alignItems: "flex-start",
    gap: "6px", cursor: "pointer", textAlign: "left",
    boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
    transition: "all 0.2s ease",
  },
  actionIcon: { fontSize: "22px" },
  actionLabel: { fontSize: "13px", fontWeight: "600", color: colors.textPrimary },
  actionSub: { fontSize: "11px", color: colors.textSecondary },
  bottomNav: {
    position: "fixed", bottom: 0, left: 0, right: 0,
    background: colors.white, borderTop: `1px solid ${colors.border}`,
    boxShadow: "0 -4px 24px rgba(0,0,0,0.06)",
    display: "none", padding: "8px 0 12px", zIndex: 10,
  },
  navItem: {
    flex: 1, display: "flex", flexDirection: "column",
    alignItems: "center", gap: "3px", cursor: "pointer", border: "none",
    background: "none", padding: "2px 0",
  },
  navIcon: { fontSize: "20px" },
  navLabel: { fontSize: "10px", color: colors.textMuted },
  navLabelActive: { fontSize: "10px", color: colors.navy, fontWeight: "600" },
  badge: (bg, color) => ({
    fontSize: "11px", padding: "2px 8px", borderRadius: "20px",
    fontWeight: "600", background: bg, color: color, display: "inline-block",
  }),
  rowItem: {
    display: "flex", alignItems: "center", gap: "12px",
    padding: "1rem 0", borderBottom: `1px solid ${colors.border}`,
  },
  rowIcon: (bg) => ({
    width: "36px", height: "36px", borderRadius: "10px",
    background: bg, display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: "16px", flexShrink: 0,
  }),
  primaryBtn: {
    width: "100%", padding: "16px",
    background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`,
    color: "#fff", fontSize: "15px", fontWeight: "700",
    border: "none", borderRadius: "16px", cursor: "pointer",
    fontFamily: "inherit", boxShadow: "0 8px 20px rgba(42,82,152,0.25)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  outlineBtn: {
    width: "100%", padding: "16px",
    background: colors.bg, color: colors.textSecondary,
    fontSize: "15px", fontWeight: "700", border: "none",
    borderRadius: "16px", cursor: "pointer", fontFamily: "inherit",
    transition: "background 0.2s ease, color 0.2s ease",
  },
};