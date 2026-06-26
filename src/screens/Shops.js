import { colors } from "./dashboardShared";

export const SHOPS = [
  {
    id: "JME",
    name: "JME Car Aircon and Motor Services",
    shortName: "JME",
    icon: "❄️",
    tagline: "Aircon, motor & full car services",
    services: ["Car Aircon", "Motor Repair", "Oil Change", "General Inspection"],
    bg: colors.infoBg,
    accent: colors.info,
    rating: 0,
    reviews: 0,
  },
  {
    id: "GRHE",
    name: "GRHE Auto Services",
    shortName: "GRHE",
    icon: "🔧",
    tagline: "Comprehensive auto repair & maintenance",
    services: ["Brake Repair", "Tire Services", "Engine Tuning", "Electrical"],
    bg: colors.warningBg,
    accent: colors.warning,
    rating: 0,
    reviews: 0,
  },
];