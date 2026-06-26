// Shared styles, helpers, and components for AutoBook dashboards

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

export const sh = {
  page: {
    minHeight: "100vh",
    background: colors.bg,
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    display: "flex",
    flexDirection: "column",
    paddingBottom: "72px",
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
  },
  statLabel: { fontSize: "12px", color: colors.textSecondary, marginBottom: "4px" },
  statValue: { fontSize: "24px", fontWeight: "700", color: colors.textPrimary },
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