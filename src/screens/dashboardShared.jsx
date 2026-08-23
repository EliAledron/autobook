// Shared styles, helpers, and components for AutoBook dashboards
import React, { useState, useRef, useEffect } from "react";

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
        {icon}
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
    padding: "calc(0.9rem + 1px) 1.25rem 0.9rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "sticky",
    top: -1,
    zIndex: 10,
    marginTop: "-1px",
    marginBottom: "-1px",
    borderTop: "none",
    borderBottom: "none",
    boxShadow: "none",
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
    background: `linear-gradient(180deg, ${colors.navy} 0%, ${colors.blue} 100%)`,
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

// ─── Shared Search Bar ──────────────────────────────────────────────────────
export function SharedSearchBar({ value, onChange, placeholder = "Search...", style }) {
  return (
    <div style={{ position: "relative", flex: 1, ...style }}>
      <svg style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", width: "18px", height: "18px", color: colors.textMuted, pointerEvents: "none" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%", padding: "14px 40px",
          borderRadius: "24px", border: `1px solid transparent`,
          fontSize: "14px", backgroundColor: "#f1f5f9",
          color: colors.textPrimary, fontFamily: "inherit",
          boxSizing: "border-box", outline: "none",
          transition: "all 0.2s ease",
          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)"
        }}
        onFocus={(e) => { e.target.style.border = `1px solid ${colors.blue}`; e.target.style.backgroundColor = colors.white; e.target.style.boxShadow = "0 4px 12px rgba(42,82,152,0.1)"; }}
        onBlur={(e) => { e.target.style.border = `1px solid transparent`; e.target.style.backgroundColor = "#f1f5f9"; e.target.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.02)"; }}
      />
      {value && (
        <button onClick={() => onChange("")} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "#e2e8f0", border: "none", borderRadius: "50%", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#475569" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      )}
    </div>
  );
}

// ─── Shared Custom Dropdown ───────────────────────────────────────────────────
export function CustomDropdown({ value, onChange, options, style, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOpt = options.find(o => String(o.value) === String(value));
  
  const {
    flex, flexShrink, flexGrow, flexBasis,
    width, minWidth, maxWidth,
    margin, marginTop, marginBottom, marginLeft, marginRight,
    ...innerStyle
  } = style || {};

  const wrapperStyle = {
    position: "relative", fontFamily: "inherit",
    flex, flexShrink, flexGrow, flexBasis,
    width, minWidth, maxWidth,
    margin, marginTop, marginBottom, marginLeft, marginRight,
  };

  return (
    <div ref={ref} style={wrapperStyle}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: innerStyle.padding || "12px 36px 12px 14px",
          borderRadius: innerStyle.borderRadius || "12px",
          border: isOpen ? `1.5px solid ${colors.blue}` : (innerStyle.border || `1.5px solid ${colors.border}`),
          fontSize: innerStyle.fontSize || "13px",
          fontWeight: innerStyle.fontWeight || "600",
          backgroundColor: innerStyle.backgroundColor || innerStyle.background || colors.white,
          color: selectedOpt ? colors.textPrimary : colors.textMuted,
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: isOpen ? "0 4px 12px rgba(42,82,152,0.1)" : (innerStyle.boxShadow || "none"),
          transition: "all 0.2s ease",
          height: "100%",
          boxSizing: "border-box"
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selectedOpt ? selectedOpt.label : (placeholder || "Select...")}
        </span>
        <svg style={{ position: "absolute", right: "14px", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>

      {isOpen && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          marginTop: "6px",
          backgroundColor: colors.white,
          borderRadius: "12px",
          border: `1px solid ${colors.border}`,
          boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
          zIndex: 100,
          maxHeight: "220px",
          overflowY: "auto",
          padding: "6px",
          boxSizing: "border-box"
        }}>
          {options.map((opt, i) => (
            <div 
              key={i}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bg}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: innerStyle.fontSize || "13px",
                fontWeight: String(opt.value) === String(value) ? "700" : "500",
                color: String(opt.value) === String(value) ? colors.blue : colors.textPrimary,
                backgroundColor: String(opt.value) === String(value) ? colors.infoBg : "transparent",
                cursor: "pointer",
                transition: "background 0.1s ease"
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Shared Filter Select ───────────────────────────────────────────────────
export function SharedFilterSelect({ value, onChange, options, style }) {
  return (
    <CustomDropdown 
      value={value}
      onChange={onChange}
      options={options}
      style={{
        padding: "14px 36px 14px 16px",
        borderRadius: "24px",
        border: "1px solid transparent",
        backgroundColor: "#f1f5f9",
        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)",
        ...style
      }}
    />
  );
}
