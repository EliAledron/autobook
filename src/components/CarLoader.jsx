import React from "react";

const keyframes = `
  @keyframes ab-drive  { 0%{transform:translateX(-120px)} 100%{transform:translateX(calc(100% + 120px))} }
  @keyframes ab-wheel  { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
  @keyframes ab-road   { 0%{transform:translateX(0)} 100%{transform:translateX(-80px)} }
  @keyframes ab-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
  @keyframes ab-pulse  { 0%,100%{opacity:1} 50%{opacity:0.35} }
`;

export default function CarLoader({ text = "Loading...", fullWidth = false }) {
  return (
    <div style={s.container}>
      <style>{keyframes}</style>
      
      <div style={s.scene}>
        <div style={s.carGroup}>
          <div style={s.exhaust}>
            <div style={{ ...s.puff, animationDelay: "0s" }} />
            <div style={{ ...s.puff, width: 4, height: 4, animationDelay: "0.1s" }} />
            <div style={{ ...s.puff, width: 3, height: 3, animationDelay: "0.2s" }} />
          </div>

          <div style={s.carBody}>
            <div style={s.carRoof}>
              <div style={s.winFront} />
              <div style={s.winRear} />
            </div>
            <div style={s.headlight} />
            <div style={s.taillight} />

            <div style={{ ...s.wheelWrap, right: 10, left: "auto" }}>
              <div style={s.wheel}><div style={s.spoke} /></div>
            </div>

            <div style={{ ...s.wheelWrap, left: 10 }}>
              <div style={s.wheel}><div style={s.spoke} /></div>
            </div>
          </div>
        </div>
      </div>

      <div style={s.road}>
        <div style={s.roadDashes}>
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} style={s.dash} />
          ))}
        </div>
      </div>

      {text && <div style={s.text}>{text}</div>}
    </div>
  );
}

const s = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "20px 0",
    overflow: "hidden", // Important so the car doesn't cause horizontal scroll
  },
  scene: {
    width: "100%",
    maxWidth: fullWidth ? "100vw" : "400px",
    height: "60px",
    position: "relative",
    overflow: "hidden",
  },
  carGroup: {
    position: "absolute",
    bottom: "8px",
    animation: "ab-drive 2s infinite, ab-bounce 0.4s infinite",
  },
  exhaust: {
    position: "absolute",
    left: "-16px",
    top: "14px",
    display: "flex",
    gap: "3px",
  },
  puff: {
    width: 6,
    height: 6,
    background: "#94a3b8", // Darkened for light background visibility
    borderRadius: "50%",
    animation: "ab-pulse 0.3s infinite",
  },
  carBody: {
    width: "80px",
    height: "28px",
    background: "#f97316",
    borderRadius: "6px",
    position: "relative",
  },
  carRoof: {
    position: "absolute",
    top: "-16px",
    left: "12px",
    width: "48px",
    height: "18px",
    background: "#ea6c0a",
    borderRadius: "6px",
  },
  winFront: {
    position: "absolute",
    top: "3px",
    left: "4px",
    width: "18px",
    height: "12px",
    background: "rgba(255,255,255,0.8)", // Whitish for light background
  },
  winRear: {
    position: "absolute",
    top: "3px",
    left: "25px",
    width: "18px",
    height: "12px",
    background: "rgba(255,255,255,0.8)",
  },
  headlight: {
    position: "absolute",
    right: "-4px",
    top: "9px",
    width: "6px",
    height: "6px",
    background: "#fef08a",
    borderRadius: "50%",
  },
  taillight: {
    position: "absolute",
    left: "-4px",
    top: "9px",
    width: "5px",
    height: "5px",
    background: "#ef4444",
    borderRadius: "50%",
    animation: "ab-pulse 0.4s infinite",
  },
  wheelWrap: {
    position: "absolute",
    bottom: "-8px",
  },
  wheel: {
    width: "16px",
    height: "16px",
    background: "#1e293b",
    borderRadius: "50%",
    border: "3px solid #94a3b8",
    animation: "ab-wheel 0.35s linear infinite",
  },
  spoke: {
    width: "1.5px",
    height: "7px",
    background: "#94a3b8",
  },
  road: {
    width: "100%",
    maxWidth: fullWidth ? "100vw" : "400px",
    height: "6px",
    background: "#e2e8f0", // Lightened road
    overflow: "hidden",
    borderRadius: "3px",
    marginBottom: "16px",
  },
  roadDashes: {
    display: "flex",
    gap: "16px",
    animation: "ab-road 0.5s linear infinite",
  },
  dash: {
    width: "24px",
    height: "2px",
    background: "#94a3b8", // Darkened dash for contrast
  },
  text: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#64748b",
  }
};
