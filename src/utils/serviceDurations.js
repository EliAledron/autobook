// Service Duration Knowledge Base & Time Calculation Utilities for AutoBook

export const SERVICE_DURATIONS = [
  // Quick Maintenance (~30-60 mins / 1-2 slots)
  { keywords: ["oil", "filter", "fluid", "wash", "top-up"], label: "Quick Maintenance", durationMin: 60, display: "~45 mins – 1 hr", slots: 2 },
  { keywords: ["tire rotation", "tire patch", "wheel balancing"], label: "Tire Maintenance", durationMin: 45, display: "~30 – 45 mins", slots: 1 },
  { keywords: ["battery check", "battery replacement", "spark plug"], label: "Battery & Ignition", durationMin: 45, display: "~30 – 45 mins", slots: 1 },

  // Standard Repairs (~1.5-2.5 hrs / 3-4 slots)
  { keywords: ["brake", "rotor", "pad", "flush"], label: "Brake Service", durationMin: 120, display: "~1.5 – 2.5 hrs", slots: 4 },
  { keywords: ["aircon", "air con", "ac ", "freon", "recharge"], label: "Aircon Service", durationMin: 120, display: "~1.5 – 2.5 hrs", slots: 4 },
  { keywords: ["alignment", "shock", "strut", "suspension"], label: "Suspension & Alignment", durationMin: 90, display: "~1 – 2 hrs", slots: 3 },
  { keywords: ["tune-up", "tune up", "pms", "preventive", "general", "checkup"], label: "PMS / General Checkup", durationMin: 120, display: "~2 – 3 hrs", slots: 4 },
  { keywords: ["diagnostic", "engine diagnostic", "wiring", "electrical", "alternator", "starter"], label: "Diagnostics & Electrical", durationMin: 90, display: "~1.5 – 2 hrs", slots: 3 },
  { keywords: ["detail", "upholstery", "interior"], label: "Detailing", durationMin: 150, display: "~2.5 – 3.5 hrs", slots: 5 },

  // Major Repairs (~3-5 hrs / 6-10 slots)
  { keywords: ["transmission", "clutch", "gearbox"], label: "Transmission Service", durationMin: 180, display: "~3 – 4 hrs", slots: 6 },
  { keywords: ["timing belt", "engine rebuild", "motor"], label: "Major Engine Work", durationMin: 240, display: "~4 – 6 hrs", slots: 8 },
  { keywords: ["paint", "body", "dent", "windshield"], label: "Paint & Body Work", durationMin: 240, display: "~Half Day / Major Job", slots: 8 },
];

export const ALL_TIME_SLOTS = [
  "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", 
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", 
  "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", 
  "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", 
  "04:00 PM", "04:30 PM", "05:00 PM"
];

export const getServiceDuration = (serviceName = "") => {
  const lower = (serviceName || "").toLowerCase();
  for (const item of SERVICE_DURATIONS) {
    if (item.keywords.some(kw => lower.includes(kw))) {
      return item;
    }
  }
  return { label: "Standard Service", durationMin: 60, display: "~1 – 2 hrs", slots: 2 };
};

// Helper to calculate expected ready time from drop-off time
export const calculateReadyTime = (dropOffTimeStr, durationMinutes = 60) => {
  if (!dropOffTimeStr) return "";
  const parts = dropOffTimeStr.split(" ");
  if (parts.length < 2) return "";
  const [timePart, modifier] = parts;
  let [hours, minutes] = timePart.split(":");
  hours = parseInt(hours, 10);
  minutes = parseInt(minutes, 10) || 0;
  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

  const totalMinutes = hours * 60 + minutes + durationMinutes;
  let endHour = Math.floor(totalMinutes / 60);
  const endMin = totalMinutes % 60;

  let endModifier = "AM";
  if (endHour >= 12) {
    endModifier = "PM";
    if (endHour > 12) endHour -= 12;
  }
  if (endHour === 0) endHour = 12;

  const formattedMin = String(endMin).padStart(2, "0");
  return `${endHour}:${formattedMin} ${endModifier}`;
};

// Check how many bookings overlap with a given time slot
export const getConcurrentBookingsAtSlot = (dayBookings = [], targetSlot) => {
  const targetIdx = ALL_TIME_SLOTS.indexOf(targetSlot);
  if (targetIdx === -1) return 0;

  let count = 0;
  dayBookings.forEach((b) => {
    if ((b.status || "").toLowerCase() === "cancelled") return;
    const bStartIdx = ALL_TIME_SLOTS.indexOf(b.time);
    if (bStartIdx === -1) {
      if (b.time === targetSlot) count++;
      return;
    }

    const durationInfo = getServiceDuration(b.serviceType);
    const slotsNeeded = Math.max(1, durationInfo.slots || 2);
    const bEndIdx = bStartIdx + slotsNeeded;

    if (targetIdx >= bStartIdx && targetIdx < bEndIdx) {
      count++;
    }
  });

  return count;
};
