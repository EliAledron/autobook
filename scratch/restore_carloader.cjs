const fs = require('fs');

// Update CarLoader.jsx to support fullWidth
let loader = fs.readFileSync('src/components/CarLoader.jsx', 'utf8');
loader = loader.replace('export default function CarLoader({ text = "Loading..." }) {', 'export default function CarLoader({ text = "Loading...", fullWidth = false }) {');
loader = loader.replace('maxWidth: "400px",', 'maxWidth: fullWidth ? "100vw" : "400px",'); // scene
loader = loader.replace('maxWidth: "400px",', 'maxWidth: fullWidth ? "100vw" : "400px",'); // road
// Also change the animation to be continuous or relative to the container? The ab-drive animation uses 100vw.
// So if the container is 400px, 100vw means it will drive past the screen!
// Let's modify the animation to use 100% instead of 100vw if we want it to stay in the box.
loader = loader.replace('translateX(calc(100vw + 120px))', 'translateX(calc(100% + 120px))');
fs.writeFileSync('src/components/CarLoader.jsx', loader);

// Update PendingApproval.jsx
let pending = fs.readFileSync('src/screens/PendingApproval.jsx', 'utf8');

const newLoaderUI = `        {status === "loading" && (
          <div style={s.stateContainer}>
            <CarLoader text="Loading your profile..." />
          </div>
        )}`;

// We remove the CarLoader from the inside of the card
pending = pending.replace(newLoaderUI, '');

// And we inject it right above the card, but ONLY when status === "loading" or maybe the user meant they want it there ALL THE TIME?
// "i want the design of my car loader t be implemented here too only the car loading animation" -> "only the car loading animation". Wait, the user said "i want the car loading animation to be in the pending screen just like m old onoe". In the old one, the car loader was always there.
// But they explicitly added "only the car loading animation" - they mean they ONLY want the old car animation back, but keep the rest of the new UI!
// So let's add the car loader to the top of the page, above the card.
// Wait, I will just put it at the top of the page.
pending = pending.replace(
  '<div style={s.card}>',
  `{status === "loading" ? (
        <div style={{ width: "100%", marginBottom: "40px" }}>
          <CarLoader text="" fullWidth={true} />
        </div>
      ) : (
        <div style={{ width: "100%", marginBottom: "40px", opacity: 0 }}>
          <CarLoader text="" fullWidth={true} />
        </div>
      )}
      
      <div style={s.card}>`
);

// We need to add the hourglass back for the loading state inside the card!
// Wait! If we put the car loader OUTSIDE the card, do we want a card when loading?
// The user just said "i want the car loading animation to be in the pending screen just like m old onoe".
// Let's restore the exact UI of the loading state inside the card but replace the Hourglass with the CarLoader! Wait, no, they said "just like my old one".
// Let's just put the CarLoader fullWidth above the card when status === "loading", AND put an Hourglass inside.
// Actually, I'll just change the CarLoader to be full width above the card AT ALL TIMES. Because in the old UI, it drove across the screen no matter what status they were in!
pending = pending.replace(
  `{status === "loading" ? (
        <div style={{ width: "100%", marginBottom: "40px" }}>
          <CarLoader text="" fullWidth={true} />
        </div>
      ) : (
        <div style={{ width: "100%", marginBottom: "40px", opacity: 0 }}>
          <CarLoader text="" fullWidth={true} />
        </div>
      )}`,
      `<div style={{ width: "100%", position: "absolute", top: "10%", left: 0 }}>
        <CarLoader text="" fullWidth={true} />
      </div>`
);

// I removed the CarLoader from the loading state earlier, let me put the Hourglass back.
pending = pending.replace(
  `      <div style={s.card}>`,
  `      <div style={s.card}>
        {status === "loading" && (
          <div style={s.stateContainer}>
            <div style={{ ...s.iconWrap, background: "#f1f5f9", color: "#64748b", animation: "pulse-soft 2s infinite" }}>
              <Hourglass size={40} />
            </div>
            <h2 style={s.title}>Loading...</h2>
          </div>
        )}`
);

fs.writeFileSync('src/screens/PendingApproval.jsx', pending);
