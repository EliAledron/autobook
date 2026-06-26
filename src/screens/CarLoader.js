import React from "react";

const keyframes = `
  @keyframes ab-wheel  { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
  @keyframes ab-road   { 0%{transform:translateX(0)} 100%{transform:translateX(-80px)} }
  @keyframes ab-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
  @keyframes ab-pulse  { 0%,100%{opacity:1} 50%{opacity:0.3} }
  @keyframes ab-fadein { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes ab-puff   { 0%{opacity:0.4;transform:translateX(0) scale(1)} 100%{opacity:0;transform:translateX(-18px) scale(1.8)} }
`;

export default function CarLoader({ text = "Loading AutoBook" }) {
  return (
    <>
      <style>{keyframes}</style>
      <div style={s.page}>

        {/* Car + road scene, all centered */}
        <div style={s.scene}>

          {/* Road — full width, scrolling dashes give motion illusion */}
          <div style={s.road}>
            <div style={s.roadDashes}>
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} style={s.dash} />
              ))}
            </div>
          </div>

          {/* Car sits centered above the road */}
          <div style={s.carWrap}>
            {/* Exhaust puffs float left */}
            <div style={s.exhaustWrap}>
              <div style={{ ...s.puff, animationDelay: "0s" }} />
              <div style={{ ...s.puff, width: 5, height: 5, animationDelay: "0.15s" }} />
              <div style={{ ...s.puff, width: 4, height: 4, animationDelay: "0.3s" }} />
            </div>

            {/* Main car body */}
            <div style={s.carOuter}>
              {/* Roof + windows */}
              <div style={s.carRoof}>
                <div style={s.winFront} />
                <div style={s.winRear} />
              </div>

              {/* Body */}
              <div style={s.carBody}>
                <div style={s.headlight} />
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

        {/* Text */}
        <div style={s.loaderText}>
          {text}
          <span style={s.dots}>
            <span style={{ ...s.dot, animationDelay: "0s" }} />
            <span style={{ ...s.dot, animationDelay: "0.2s" }} />
            <span style={{ ...s.dot, animationDelay: "0.4s" }} />
          </span>
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
    background: "#1a3a5c",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    overflow: "hidden",
  },

  // Outer scene container — fixed size, centered
  scene: {
    width: "240px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    position: "relative",
  },

  // Road strip with scrolling dashes
  road: {
    width: "240px",
    height: "8px",
    background: "#2a5298",
    borderRadius: "4px",
    position: "relative",
    overflow: "hidden",
    order: 2,
  },
  roadDashes: {
    position: "absolute",
    top: "50%",
    left: 0,
    transform: "translateY(-50%)",
    display: "flex",
    gap: "14px",
    animation: "ab-road 0.45s linear infinite",
  },
  dash: {
    width: "20px",
    height: "2px",
    background: "rgba(70,233,255,0.4)",
    borderRadius: "1px",
    flexShrink: 0,
  },

  // Car wrapper sits above the road
  carWrap: {
    order: 1,
    marginBottom: "2px",
    animation: "ab-bounce 0.45s ease-in-out infinite",
    position: "relative",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
  },

  // Exhaust puffs to the left of the car
  exhaustWrap: {
    position: "absolute",
    left: "-4px",
    bottom: "18px",
    display: "flex",
    flexDirection: "row-reverse",
    gap: "3px",
    alignItems: "center",
  },
  puff: {
    width: 7,
    height: 7,
    background: "rgba(255,255,255,0.18)",
    borderRadius: "50%",
    animation: "ab-puff 0.6s ease-out infinite",
  },

  // Car shape container
  carOuter: {
    width: "100px",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
  },

  carRoof: {
    marginLeft: "16px",
    marginRight: "10px",
    height: "22px",
    background: "#ea6c0a",
    borderRadius: "8px 8px 0 0",
    position: "relative",
    display: "flex",
    alignItems: "flex-end",
    padding: "0 4px 0",
  },
  winFront: {
    width: "28px",
    height: "16px",
    background: "rgba(70,233,255,0.5)",
    borderRadius: "4px 4px 0 0",
    marginRight: "4px",
  },
  winRear: {
    width: "22px",
    height: "14px",
    background: "rgba(70,233,255,0.35)",
    borderRadius: "4px 4px 0 0",
  },

  carBody: {
    height: "28px",
    background: "#f97316",
    borderRadius: "4px 6px 4px 4px",
    position: "relative",
  },
  headlight: {
    position: "absolute",
    right: "-4px",
    top: "10px",
    width: "6px",
    height: "7px",
    background: "#fef08a",
    borderRadius: "0 3px 3px 0",
  },
  taillight: {
    position: "absolute",
    left: "-4px",
    top: "10px",
    width: "5px",
    height: "7px",
    background: "#ef4444",
    borderRadius: "3px 0 0 3px",
    animation: "ab-pulse 0.5s ease-in-out infinite",
  },

  // Wheels row sits flush below the body
  wheelsRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: "-6px",
  },
  wheelGap: { width: "8px" },
  wheelGroup: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  wheel: {
    width: "18px",
    height: "18px",
    background: "#1e293b",
    borderRadius: "50%",
    border: "3px solid #94a3b8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    animation: "ab-wheel 0.35s linear infinite",
  },
  spoke: {
    width: "2px",
    height: "8px",
    background: "#94a3b8",
    borderRadius: "1px",
  },

  // Loading text
  loaderText: {
    marginTop: "32px",
    fontSize: "15px",
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    letterSpacing: "0.3px",
    animation: "ab-fadein 0.5s ease",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  dots: {
    display: "inline-flex",
    gap: "4px",
    alignItems: "center",
  },
  dot: {
    width: "4px",
    height: "4px",
    background: "#46e9ff",
    borderRadius: "50%",
    display: "inline-block",
    animation: "ab-pulse 1s ease-in-out infinite",
  },
};