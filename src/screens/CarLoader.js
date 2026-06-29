import React, { useEffect, useState } from "react";

const keyframes = `
  @keyframes ab-wheel  { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
  @keyframes ab-road   { 0%{transform:translateX(0)} 100%{transform:translateX(-94px)} }
  @keyframes ab-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
  @keyframes ab-pulse  { 0%,100%{opacity:1} 50%{opacity:0.3} }
  @keyframes ab-puff   { 0%{opacity:0.5;transform:translateX(0) scale(1)} 100%{opacity:0;transform:translateX(-24px) scale(2)} }
  @keyframes ab-progress { 0%{width:0%} 100%{width:92%} }
  @keyframes ab-tip-in { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes ab-glow   { 0%,100%{box-shadow:0 0 16px rgba(70,233,255,0.3)} 50%{box-shadow:0 0 32px rgba(70,233,255,0.7)} }
  @keyframes ab-streak { 0%{opacity:0;transform:translateX(-40px)} 60%{opacity:1} 100%{opacity:0;transform:translateX(280px)} }
`;

const TIPS = [
  "Finding the best mechanics near you…",
  "Checking your maintenance schedule…",
  "Loading your booking history…",
  "Syncing your vehicle data…",
  "Almost ready, hold tight!",
];

export default function CarLoader({ text = "Loading AutoBook" }) {
  const [tipIndex, setTipIndex] = useState(0);
  const [tipVisible, setTipVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipVisible(false);
      setTimeout(() => {
        setTipIndex(i => (i + 1) % TIPS.length);
        setTipVisible(true);
      }, 300);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <style>{keyframes}</style>
      <div style={s.page}>

        {/* Light streak effect across background */}
        <div style={s.streak1} />
        <div style={s.streak2} />

        {/* Brand header */}
        <div style={s.brand}>
          Auto<span style={s.brandAccent}>Book</span>
        </div>

        {/* Car + road scene */}
        <div style={s.scene}>

          {/* Speed streaks behind car */}
          <div style={s.speedLines}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ ...s.speedLine, width: `${28 + i * 14}px`, animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>

          {/* Road */}
          <div style={s.road}>
            <div style={s.roadDashes}>
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} style={s.dash} />
              ))}
            </div>
          </div>

          {/* Car */}
          <div style={s.carWrap}>
            {/* Exhaust puffs */}
            <div style={s.exhaustWrap}>
              <div style={{ ...s.puff, animationDelay: "0s" }} />
              <div style={{ ...s.puff, width: 6, height: 6, animationDelay: "0.18s" }} />
              <div style={{ ...s.puff, width: 5, height: 5, animationDelay: "0.36s" }} />
            </div>

            {/* Car body */}
            <div style={s.carOuter}>
              {/* Roof + windows */}
              <div style={s.carRoof}>
                <div style={s.winFront} />
                <div style={s.winRear} />
              </div>
              {/* Body */}
              <div style={s.carBody}>
                <div style={s.headlight} />
                <div style={s.headlightBeam} />
                <div style={s.taillight} />
              </div>
              {/* Wheels */}
              <div style={s.wheelsRow}>
                <div style={s.wheelGap} />
                <div style={s.wheelGroup}>
                  <div style={s.wheel}><div style={s.spoke} /></div>
                </div>
                <div style={{ flex: 1 }} />
                <div style={s.wheelGroup}>
                  <div style={s.wheel}><div style={s.spoke} /></div>
                </div>
                <div style={s.wheelGap} />
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={s.progressTrack}>
          <div style={s.progressFill} />
          <div style={s.progressGlow} />
        </div>

        {/* Loading text */}
        <div style={s.loaderText}>
          {text}
          <span style={s.dots}>
            <span style={{ ...s.dot, animationDelay: "0s" }} />
            <span style={{ ...s.dot, animationDelay: "0.2s" }} />
            <span style={{ ...s.dot, animationDelay: "0.4s" }} />
          </span>
        </div>

        {/* Cycling tip */}
        <div style={{ ...s.tip, opacity: tipVisible ? 1 : 0, animation: tipVisible ? "ab-tip-in 0.3s ease" : "none" }}>
          {TIPS[tipIndex]}
        </div>

      </div>
    </>
  );
}

const s = {
  page: {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999,
    background: "linear-gradient(160deg, #0f2640 0%, #1a3a5c 50%, #0d1f35 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    overflow: "hidden",
    gap: "0px",
  },

  // Background streaks
  streak1: {
    position: "absolute", top: "20%", left: "-10%",
    width: "120%", height: "1px",
    background: "linear-gradient(90deg, transparent, rgba(70,233,255,0.08), transparent)",
    transform: "rotate(-8deg)",
  },
  streak2: {
    position: "absolute", top: "65%", left: "-10%",
    width: "120%", height: "1px",
    background: "linear-gradient(90deg, transparent, rgba(70,233,255,0.06), transparent)",
    transform: "rotate(-8deg)",
  },

  // Brand logo
  brand: {
    fontSize: "26px",
    fontWeight: "800",
    color: "#fff",
    letterSpacing: "-0.5px",
    marginBottom: "48px",
    opacity: 0.95,
  },
  brandAccent: { color: "#46e9ff" },

  // Scene container
  scene: {
    width: "280px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    position: "relative",
    marginBottom: "32px",
  },

  // Speed streaks (horizontal lines behind car for motion feel)
  speedLines: {
    position: "absolute",
    left: "0px",
    top: "50%",
    transform: "translateY(-28px)",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  speedLine: {
    height: "2px",
    background: "linear-gradient(90deg, transparent, rgba(70,233,255,0.25))",
    borderRadius: "1px",
    animation: "ab-streak 0.8s ease-out infinite",
  },

  // Road
  road: {
    width: "280px",
    height: "10px",
    background: "linear-gradient(180deg, #1e3a5f, #162d4a)",
    borderRadius: "5px",
    position: "relative",
    overflow: "hidden",
    order: 2,
    border: "1px solid rgba(70,233,255,0.1)",
  },
  roadDashes: {
    position: "absolute",
    top: "50%",
    left: 0,
    transform: "translateY(-50%)",
    display: "flex",
    gap: "16px",
    animation: "ab-road 0.4s linear infinite",
  },
  dash: {
    width: "24px",
    height: "2px",
    background: "rgba(70,233,255,0.5)",
    borderRadius: "1px",
    flexShrink: 0,
  },

  // Car
  carWrap: {
    order: 1,
    marginBottom: "3px",
    animation: "ab-bounce 0.4s ease-in-out infinite",
    position: "relative",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  exhaustWrap: {
    position: "absolute",
    left: "-8px",
    bottom: "22px",
    display: "flex",
    flexDirection: "row-reverse",
    gap: "3px",
    alignItems: "center",
  },
  puff: {
    width: 8,
    height: 8,
    background: "rgba(255,255,255,0.15)",
    borderRadius: "50%",
    animation: "ab-puff 0.7s ease-out infinite",
  },
  carOuter: {
    width: "120px",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
  },
  carRoof: {
    marginLeft: "20px",
    marginRight: "12px",
    height: "28px",
    background: "linear-gradient(135deg, #ea6c0a, #f97316)",
    borderRadius: "10px 10px 0 0",
    position: "relative",
    display: "flex",
    alignItems: "flex-end",
    padding: "0 5px",
    boxShadow: "inset 0 -2px 6px rgba(0,0,0,0.2)",
  },
  winFront: {
    width: "34px",
    height: "20px",
    background: "linear-gradient(135deg, rgba(70,233,255,0.55), rgba(70,233,255,0.25))",
    borderRadius: "5px 5px 0 0",
    marginRight: "4px",
    border: "1px solid rgba(70,233,255,0.3)",
  },
  winRear: {
    width: "26px",
    height: "18px",
    background: "linear-gradient(135deg, rgba(70,233,255,0.4), rgba(70,233,255,0.15))",
    borderRadius: "5px 5px 0 0",
    border: "1px solid rgba(70,233,255,0.2)",
  },
  carBody: {
    height: "34px",
    background: "linear-gradient(180deg, #f97316, #ea6c0a)",
    borderRadius: "4px 8px 4px 4px",
    position: "relative",
    boxShadow: "0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
  },
  headlight: {
    position: "absolute",
    right: "-5px",
    top: "12px",
    width: "7px",
    height: "8px",
    background: "#fef08a",
    borderRadius: "0 3px 3px 0",
    boxShadow: "0 0 6px rgba(254,240,138,0.8)",
  },
  headlightBeam: {
    position: "absolute",
    right: "-24px",
    top: "13px",
    width: "22px",
    height: "6px",
    background: "linear-gradient(90deg, rgba(254,240,138,0.4), transparent)",
    borderRadius: "0 4px 4px 0",
  },
  taillight: {
    position: "absolute",
    left: "-5px",
    top: "12px",
    width: "5px",
    height: "8px",
    background: "#ef4444",
    borderRadius: "3px 0 0 3px",
    animation: "ab-pulse 0.5s ease-in-out infinite",
    boxShadow: "0 0 6px rgba(239,68,68,0.6)",
  },
  wheelsRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: "-8px",
  },
  wheelGap: { width: "10px" },
  wheelGroup: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  wheel: {
    width: "22px",
    height: "22px",
    background: "#1e293b",
    borderRadius: "50%",
    border: "3px solid #64748b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    animation: "ab-wheel 0.35s linear infinite",
    boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
  },
  spoke: {
    width: "2px",
    height: "10px",
    background: "#94a3b8",
    borderRadius: "1px",
  },

  // Progress bar
  progressTrack: {
    width: "220px",
    height: "4px",
    background: "rgba(255,255,255,0.08)",
    borderRadius: "4px",
    overflow: "visible",
    position: "relative",
    marginBottom: "28px",
  },
  progressFill: {
    height: "100%",
    borderRadius: "4px",
    background: "linear-gradient(90deg, #2a5298, #46e9ff)",
    animation: "ab-progress 3s cubic-bezier(0.4, 0, 0.2, 1) infinite",
  },
  progressGlow: {
    position: "absolute",
    top: "-2px",
    left: 0,
    right: 0,
    height: "8px",
    borderRadius: "4px",
    background: "linear-gradient(90deg, transparent, rgba(70,233,255,0.4), transparent)",
    animation: "ab-progress 3s cubic-bezier(0.4, 0, 0.2, 1) infinite",
    filter: "blur(3px)",
  },

  // Text
  loaderText: {
    fontSize: "16px",
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
    letterSpacing: "0.2px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
  },
  dots: {
    display: "inline-flex",
    gap: "4px",
    alignItems: "center",
  },
  dot: {
    width: "5px",
    height: "5px",
    background: "#46e9ff",
    borderRadius: "50%",
    display: "inline-block",
    animation: "ab-pulse 1s ease-in-out infinite",
  },

  // Cycling tip
  tip: {
    fontSize: "12px",
    fontWeight: "500",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: "0.2px",
    textAlign: "center",
    maxWidth: "240px",
    transition: "opacity 0.3s ease",
  },
};