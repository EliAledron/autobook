import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sh, colors } from "./dashboardShared";
import BackButton from "../components/BackButton";

const SYMPTOMS = [
  { 
    id: "s1", 
    label: "Squeaking or grinding brakes", 
    icon: "🛑", 
    causes: "Worn brake pads, rusted rotors, or debris caught in the brake assembly.", 
    action: "Have the brake system inspected and replace worn components immediately.", 
    service: "Brake Inspection", 
    severity: "High",
    questions: [
      { id: "q1", text: "When do you hear the noise?", type: "select", options: ["Only when braking", "While driving", "When turning"] },
      { id: "q2", text: "How long have you noticed this?", type: "select", options: ["Just started", "A few weeks", "More than a month"] }
    ],
    rules: [
      {
        conditions: { q1: "While driving" },
        overrides: { 
          severity: "Critical", 
          causes: "Constant grinding indicates complete brake pad failure; the metal backing plate is grinding directly into the rotors.", 
          action: "Do not drive the vehicle. Immediate brake overhaul required.", 
          service: "Complete Brake System Overhaul" 
        }
      },
      {
        conditions: { q1: "Only when braking", q2: "Just started" },
        overrides: { 
          severity: "Low", 
          causes: "Minor surface rust or temporary brake dust accumulation.", 
          action: "Perform a visual inspection and clean the brake assembly if the noise persists.", 
          service: "Brake Cleaning & Inspection" 
        }
      }
    ]
  },
  { 
    id: "s2", 
    label: "AC is blowing warm air", 
    icon: "❄️", 
    causes: "Low refrigerant (Freon), failing compressor, or a leak in the hoses.", 
    action: "Check system pressure, inspect for leaks, and recharge Freon.", 
    service: "Aircon Diagnostics & Freon", 
    severity: "Medium",
    questions: [
      { id: "q3", text: "How long has the AC been blowing warm?", type: "select", options: ["Just happened", "1-3 months", "6 months", "1 year or more"] },
      { id: "q4", text: "Does it work sometimes?", type: "select", options: ["Always warm", "Cold at first, then warm", "Only warm during the day"] }
    ],
    rules: [
      {
        conditions: { q4: "Cold at first, then warm" },
        overrides: { 
          severity: "Medium", 
          causes: "Moisture in the AC system causing the expansion valve to freeze, or a failing compressor clutch.", 
          action: "Evacuate the system, replace the receiver drier, and recharge.", 
          service: "AC Deep Diagnostics & Freon" 
        }
      },
      {
        conditions: { q3: "1 year or more" },
        overrides: { 
          severity: "High", 
          causes: "Severe system leak leading to completely depleted refrigerant over a long period.", 
          action: "Perform a UV dye leak test to find the compromised hose or seal before recharging.", 
          service: "Full AC Leak Test & Recharge" 
        }
      }
    ]
  },
  { 
    id: "s3", 
    label: "Engine check light is on", 
    icon: "💡", 
    causes: "Faulty sensors (like O2 or MAF), a loose gas cap, or an engine misfire.", 
    action: "Scan the vehicle's OBD2 port for specific error codes.", 
    service: "Full Engine Diagnostics", 
    severity: "High",
    questions: [
      { id: "q5", text: "Is the check engine light flashing?", type: "select", options: ["Solid", "Flashing", "It goes on and off"] },
      { id: "q6", text: "Do you feel any loss of power?", type: "select", options: ["No, feels normal", "Yes, a little", "Yes, severe loss of power"] }
    ],
    rules: [
      {
        conditions: { q5: "Flashing" },
        overrides: { 
          severity: "Critical", 
          causes: "Severe engine misfire. Unburned fuel is dumping into the exhaust system.", 
          action: "Stop driving immediately! Tow the car to prevent catastrophic catalytic converter damage.", 
          service: "Emergency Engine Diagnostics" 
        }
      },
      {
        conditions: { q6: "Yes, severe loss of power" },
        overrides: { 
          severity: "High", 
          causes: "Limp mode activated due to a critical sensor, timing, or transmission failure.", 
          action: "Scan OBD2 port immediately and avoid high speeds or heavy acceleration.", 
          service: "Advanced Engine & Transmission Diagnostics" 
        }
      }
    ]
  },
  { 
    id: "s4", 
    label: "Car pulls to one side", 
    icon: "🛣️", 
    causes: "Uneven tire pressure, poor wheel alignment, or worn suspension parts.", 
    action: "Check tire pressure and perform a full 4-wheel alignment.", 
    service: "Wheel Alignment", 
    severity: "Medium",
    questions: [
      { id: "q7", text: "When does the car pull?", type: "select", options: ["While driving straight", "Only when braking", "Only when accelerating"] },
      { id: "q8", text: "Did you hit a pothole recently?", type: "select", options: ["Yes", "No", "Not sure"] }
    ],
    rules: [
      {
        conditions: { q7: "Only when braking" },
        overrides: { 
          severity: "High", 
          causes: "A stuck brake caliper on one side, causing uneven braking force.", 
          action: "Inspect and rebuild or replace the sticking brake caliper.", 
          service: "Brake Caliper Inspection & Repair" 
        }
      },
      {
        conditions: { q8: "Yes" },
        overrides: { 
          severity: "Medium", 
          causes: "Bent suspension component (like a control arm) or severe wheel misalignment from impact.", 
          action: "Thoroughly inspect the underchassis for bent parts before performing an alignment.", 
          service: "Underchassis Inspection & Alignment" 
        }
      }
    ]
  },
  { 
    id: "s5", 
    label: "Steering wheel vibrates", 
    icon: "🛞", 
    causes: "Unbalanced tires, a bent wheel, or warped brake rotors.", 
    action: "Balance all four tires and inspect steering/suspension components.", 
    service: "Tire Balancing / Rotation", 
    severity: "Medium",
    questions: [
      { id: "q9", text: "At what speed does it vibrate?", type: "select", options: ["Low speeds (0-40 kph)", "Highway speeds (80+ kph)", "Only when braking"] },
      { id: "q10", text: "When were your tires last balanced?", type: "select", options: ["Recently", "6+ months ago", "More than a year ago", "Don't know"] }
    ],
    rules: [
      {
        conditions: { q9: "Only when braking" },
        overrides: { 
          severity: "High", 
          causes: "Warped brake rotors (disc runout) causing feedback through the steering rack.", 
          action: "Measure rotor thickness and resurface or replace the brake rotors.", 
          service: "Brake Rotor Resurfacing/Replacement" 
        }
      },
      {
        conditions: { q9: "Highway speeds" },
        overrides: { 
          severity: "Medium", 
          causes: "Imbalanced wheels or a slightly bent rim amplifying vibrations at high speed.", 
          action: "Perform a dynamic wheel balance on all four tires and inspect rims for bends.", 
          service: "High-Speed Wheel Balancing" 
        }
      }
    ]
  },
  { 
    id: "s6", 
    label: "Strange ticking under hood", 
    icon: "🛢️", 
    causes: "Low oil level, valve train noise, or an exhaust leak.", 
    action: "Check engine oil level immediately and top up or replace if needed.", 
    service: "Oil Change / Engine Check", 
    severity: "High",
    questions: [
      { id: "q11", text: "When is the ticking loudest?", type: "select", options: ["At startup (cold)", "All the time", "When accelerating"] },
      { id: "q12", text: "When was your last oil change?", type: "select", options: ["Recently", "Over 6 months ago", "Not sure"] }
    ],
    rules: [
      {
        conditions: { q11: "When accelerating" },
        overrides: { severity: "High", causes: "A possible exhaust manifold leak or serious valvetrain wear under load.", service: "Engine & Exhaust Diagnostics" }
      },
      {
        conditions: { q11: "At startup (cold)", q12: "Over 6 months ago" },
        overrides: { severity: "Medium", causes: "Low oil pressure or degraded oil failing to lubricate the lifters quickly.", action: "Perform an oil and filter change as soon as possible." }
      }
    ]
  },
  { 
    id: "s7", 
    label: "Battery dies frequently", 
    icon: "🔋", 
    causes: "An old battery, a failing alternator, or a parasitic power drain.", 
    action: "Test battery health and check the alternator's charging output.", 
    service: "Battery & Alternator Test", 
    severity: "Medium",
    questions: [
      { id: "q13", text: "How old is the battery?", type: "select", options: ["Less than 1 year", "1-3 years", "Over 3 years", "Not sure"] },
      { id: "q14", text: "Does the battery light come on while driving?", type: "select", options: ["Yes", "No", "Sometimes"] }
    ],
    rules: [
      {
        conditions: { q14: "Yes" },
        overrides: { severity: "Critical", causes: "The alternator is failing to charge the battery while the engine is running.", action: "Do not drive far. The vehicle will eventually stall once the battery depletes.", service: "Alternator Replacement" }
      },
      {
        conditions: { q13: "Over 3 years", q14: "No" },
        overrides: { severity: "High", causes: "The battery has likely reached the end of its chemical lifespan and can no longer hold a charge.", action: "Replace the car battery.", service: "Battery Replacement" }
      }
    ]
  },
  { 
    id: "s8", 
    label: "Puddle of fluid under car", 
    icon: "💧", 
    causes: "Coolant leak, engine oil leak, or transmission fluid leak.", 
    action: "Identify the fluid type by color/smell and trace the leak source.", 
    service: "Fluid Leak Inspection", 
    severity: "Medium",
    questions: [
      { id: "q15", text: "What color is the fluid?", type: "select", options: ["Black/Brown (Oil)", "Green/Pink (Coolant)", "Red (Transmission)", "Clear (Water)"] },
      { id: "q16", text: "How big is the puddle?", type: "select", options: ["Few drops", "Small puddle", "Large puddle"] }
    ],
    rules: [
      {
        conditions: { q15: "Clear (Water)" },
        overrides: { severity: "Low", causes: "Normal condensation dripping from the Air Conditioning system.", action: "No action required, this is completely normal.", service: "General Diagnostics" }
      },
      {
        conditions: { q15: "Green/Pink (Coolant)", q16: "Large puddle" },
        overrides: { severity: "Critical", causes: "A major failure in the cooling system (radiator, hose, or water pump).", action: "Do NOT drive the car. The engine will overheat rapidly and cause catastrophic damage.", service: "Cooling System Overhaul" }
      }
    ]
  }
];

export default function StrategicCheckup() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState([]);
  const [answers, setAnswers] = useState({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);

  const toggleSymptom = (id) => {
    setResults(null); // Clear previous results if they change selection
    if (selected.includes(id)) {
      setSelected([]);
      setAnswers({});
    } else {
      setSelected([id]);
      setAnswers({});
    }
  };

  const handleAnswerChange = (qId, value) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const executeAnalysis = () => {
    if (selected.length === 0) return;
    
    setIsAnalyzing(true);
    setResults(null);

    // Simulate analysis delay
    setTimeout(() => {
      const matchedSymptoms = SYMPTOMS.filter(s => selected.includes(s.id));

      // --- SMART RULE EVALUATOR ---
      const evaluatedSymptoms = matchedSymptoms.map(s => {
        let result = { ...s, isSmart: false };
        
        if (s.rules) {
          for (let rule of s.rules) {
            // Check if all conditions for this specific rule match the user's answers
            const isMatch = Object.entries(rule.conditions).every(([qId, expectedVal]) => {
              return answers[qId] === expectedVal;
            });

            if (isMatch) {
              result = { ...result, ...rule.overrides, isSmart: true };
              break; // Apply only the first (highest priority) matching rule
            }
          }
        }
        return result;
      });
      // ----------------------------
      
      let recommendedServices = [...new Set(evaluatedSymptoms.map(s => s.service))];
      const isUrgent = evaluatedSymptoms.some(s => s.severity === "High" || s.severity === "Critical");
      const hasCritical = evaluatedSymptoms.some(s => s.severity === "Critical");

      setResults({
        symptomsCount: evaluatedSymptoms.length,
        details: evaluatedSymptoms,
        services: recommendedServices,
        isUrgent,
        hasCritical
      });
      setIsAnalyzing(false);
    }, 1500);
  };

  const allQuestionsAnswered = selected.length > 0 && selected.every(sId => {
    const symptom = SYMPTOMS.find(s => s.id === sId);
    if (!symptom || !symptom.questions) return true;
    return symptom.questions.every(q => answers[q.id]);
  });

  const handleClearAll = () => {
    setSelected([]);
    setAnswers({});
    setResults(null);
  };

  return (
    <div style={sh.page}>
      <style>{`
        @keyframes sc-slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes sc-pulseGlow { 0% { box-shadow: 0 0 0 0 rgba(42, 82, 152, 0.4); } 70% { box-shadow: 0 0 0 15px rgba(42, 82, 152, 0); } 100% { box-shadow: 0 0 0 0 rgba(42, 82, 152, 0); } }
        @keyframes sc-stagger { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .sc-symptom-card { transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1); position: relative; overflow: hidden; }
        .sc-symptom-card:active { transform: scale(0.97); }
      `}</style>

      {/* TOPBAR */}
      <div style={sh.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <BackButton />
          <div style={sh.topbarLogo}>Auto<span style={sh.topbarAccent}>Book</span></div>
        </div>
      </div>

      {/* HERO */}
      <div style={{ ...sh.hero, paddingBottom: "2rem", borderRadius: "0 0 24px 24px", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={sh.rolePill}><div style={sh.roleDot} /><span style={sh.roleText}>Diagnostic Engine</span></div>
            <div style={{ ...sh.heroGreeting, fontSize: "28px", letterSpacing: "-0.5px", marginTop: "8px" }}>Strategic Checkup</div>
            <div style={{ ...sh.heroSub, fontSize: "15px", opacity: 0.9, maxWidth: "250px" }}>Identify issues and get expert service recommendations instantly.</div>
          </div>
          {selected.length > 0 && (
            <button 
              onClick={handleClearAll}
              style={{
                background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)",
                padding: "8px 12px", borderRadius: "14px", fontSize: "12px", fontWeight: "700",
                cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                backdropFilter: "blur(8px)", marginTop: "4px", transition: "all 0.2s"
              }}
            >
              ⟲ Reset
            </button>
          )}
        </div>
      </div>

      <div style={{ ...sh.content, position: "relative", zIndex: 2 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "12px", marginBottom: "2rem" }}>
          {SYMPTOMS.map((s, idx) => {
            const isSelected = selected.includes(s.id);
            return (
              <div
                key={s.id}
                className="sc-symptom-card"
                onClick={() => toggleSymptom(s.id)}
                style={{
                  background: isSelected ? "#f0f9ff" : colors.white,
                  borderRadius: "20px",
                  padding: "20px 16px",
                  cursor: "pointer",
                  border: isSelected ? `2px solid ${colors.blue}` : `2px solid transparent`,
                  boxShadow: isSelected ? "0 8px 20px rgba(42,82,152,0.15)" : "0 4px 12px rgba(0,0,0,0.05)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: "12px",
                  animation: `sc-stagger 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) ${idx * 0.05}s both`
                }}
              >
                {isSelected && (
                  <div style={{ position: "absolute", top: "12px", right: "12px", background: colors.blue, color: "#fff", borderRadius: "50%", width: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "bold" }}>
                    ✓
                  </div>
                )}
                <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: isSelected ? colors.white : colors.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", boxShadow: isSelected ? "0 4px 10px rgba(0,0,0,0.05)" : "none", transition: "all 0.3s ease" }}>
                  {s.icon}
                </div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: isSelected ? colors.navy : colors.textPrimary, lineHeight: "1.4" }}>
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* DIAGNOSTIC QUESTIONS */}
        {selected.length > 0 && !results && (
          <div key={selected.join("-")} style={{ marginBottom: "2rem", animation: "sc-slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
            <div style={{ ...sh.sectionLabel, color: colors.textPrimary, fontSize: "14px", marginBottom: "12px" }}>Diagnostic Details</div>
            {selected.map(sId => {
              const symptom = SYMPTOMS.find(s => s.id === sId);
              if (!symptom || !symptom.questions) return null;
              return (
                <div key={sId} style={{ background: colors.white, borderRadius: "16px", padding: "16px", marginBottom: "12px", border: `1px solid ${colors.border}`, boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <span style={{ fontSize: "18px" }}>{symptom.icon}</span>
                    <span style={{ fontSize: "14px", fontWeight: "700", color: colors.textPrimary }}>{symptom.label}</span>
                  </div>
                  {symptom.questions.map(q => (
                    <div key={q.id} style={{ marginBottom: "12px" }}>
                      <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "600", marginBottom: "6px" }}>{q.text}</div>
                      {q.type === "select" && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                          {q.options.map(opt => {
                            const isSelected = answers[q.id] === opt;
                            return (
                              <button
                                key={opt}
                                onClick={() => handleAnswerChange(q.id, opt)}
                                style={{
                                  padding: "8px 14px",
                                  borderRadius: "20px",
                                  border: isSelected ? `2px solid ${colors.blue}` : `1px solid ${colors.border}`,
                                  background: isSelected ? colors.infoBg : colors.white,
                                  color: isSelected ? colors.navy : colors.textSecondary,
                                  fontSize: "12px",
                                  fontWeight: isSelected ? "700" : "600",
                                  cursor: "pointer",
                                  transition: "all 0.2s",
                                  fontFamily: "inherit",
                                  boxShadow: isSelected ? "0 4px 12px rgba(42,82,152,0.1)" : "none",
                                }}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {!results && (
          <button 
            onClick={executeAnalysis} 
            disabled={!allQuestionsAnswered || isAnalyzing}
            style={{ 
              ...sh.primaryBtn, 
              width: "100%", 
              padding: "18px", 
              borderRadius: "16px", 
              fontSize: "16px", 
              fontWeight: "800",
              opacity: !allQuestionsAnswered ? 0.5 : 1,
              animation: allQuestionsAnswered && !isAnalyzing ? "sc-pulseGlow 2s infinite" : "none",
              transition: "all 0.3s ease",
              marginTop: "1rem"
            }}
          >
            {isAnalyzing ? "Analyzing Symptoms ⚙️..." : "Execute Analysis"}
          </button>
        )}

        {/* DIAGNOSTIC FINDINGS */}
        {results && (
          <div style={{ animation: "sc-slideIn 0.5s ease-out forwards", paddingBottom: "2rem" }}>
            <div style={{ ...sh.sectionLabel, marginBottom: "1rem", color: colors.textPrimary, fontSize: "14px" }}>Analysis Complete</div>
            
            <div style={{ background: colors.white, borderRadius: "24px", border: `1px solid ${colors.border}`, padding: "24px", boxShadow: "0 12px 32px rgba(0,0,0,0.08)", position: "relative", overflow: "hidden" }}>
              {/* Top Accent Gradient */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "6px", background: results.hasCritical ? `linear-gradient(90deg, ${colors.danger}, #991b1b)` : `linear-gradient(90deg, ${colors.navy}, ${colors.blue})` }} />
              
              <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "20px" }}>
                <div style={{ width: "56px", height: "56px", borderRadius: "18px", background: results.hasCritical ? colors.dangerBg : colors.infoBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", flexShrink: 0 }}>
                  {results.hasCritical ? "🚨" : results.isUrgent ? "⚠️" : "📋"}
                </div>
                <div style={{ flex: 1, paddingTop: "4px" }}>
                  <div style={{ fontSize: "20px", fontWeight: "800", color: colors.textPrimary, marginBottom: "4px", letterSpacing: "-0.3px" }}>Diagnostic Report</div>
                  <div style={{ fontSize: "14px", color: colors.textSecondary, fontWeight: "500", lineHeight: 1.4 }}>
                    {results.hasCritical 
                      ? <span style={{ color: colors.danger, fontWeight: "700" }}>Critical issues detected! Immediate attention required.</span>
                      : `Analyzed ${results.symptomsCount} symptom${results.symptomsCount !== 1 ? 's' : ''} from your selection.`
                    }
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
                {results.details.map((item, idx) => (
                  <div key={idx} style={{ background: item.severity === "Critical" ? "#fef2f2" : "#f8fafc", padding: "20px", borderRadius: "16px", border: item.severity === "Critical" ? `1px solid #fecaca` : "1px solid #e2e8f0", position: "relative" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: colors.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>{item.icon}</div>
                      <span style={{ fontSize: "16px", fontWeight: "800", color: item.severity === "Critical" ? colors.danger : colors.navy }}>{item.label}</span>
                    </div>
                    
                    {item.isSmart && (
                      <div style={{ position: "absolute", top: "16px", right: "16px", background: "rgba(37,99,235,0.1)", border: `1px solid rgba(37,99,235,0.2)`, padding: "4px 8px", borderRadius: "8px", fontSize: "10px", fontWeight: "800", color: colors.info, display: "flex", alignItems: "center", gap: "4px" }}>
                        <span>🧠</span> Smart Rule Applied
                      </div>
                    )}
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div>
                        <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "800", color: colors.textMuted, marginBottom: "4px" }}>Possible Causes</div>
                        <div style={{ fontSize: "14px", color: colors.textSecondary, fontWeight: "500", lineHeight: 1.5 }}>{item.causes}</div>
                      </div>
                      
                      <div>
                        <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "800", color: colors.textMuted, marginBottom: "4px" }}>Recommended Action</div>
                        <div style={{ fontSize: "14px", color: colors.textSecondary, fontWeight: "500", lineHeight: 1.5 }}>{item.action}</div>
                      </div>
                      
                      <div style={{ marginTop: "4px", paddingTop: "12px", borderTop: "1px dashed #cbd5e1", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "12px", fontWeight: "800", color: item.severity === "Critical" ? colors.danger : colors.info, textTransform: "uppercase", letterSpacing: "0.5px" }}>Suggested Service:</span>
                        <span style={{ fontSize: "14px", fontWeight: "800", color: item.severity === "Critical" ? colors.danger : colors.textPrimary }}>{item.service}</span>
                        {item.severity === "Critical" && (
                          <span style={{ marginLeft: "auto", background: colors.danger, color: "#fff", padding: "3px 8px", borderRadius: "8px", fontSize: "10px", fontWeight: "800", letterSpacing: "0.5px", textTransform: "uppercase" }}>Critical Severity</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => navigate("/customer/shop-select", { state: { prefilledService: results.services.join(", ") } })} 
                className="sc-symptom-card"
                style={{ width: "100%", padding: "18px", borderRadius: "16px", border: "none", background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`, color: "#fff", fontSize: "16px", fontWeight: "800", cursor: "pointer", boxShadow: "0 8px 20px rgba(42,82,152,0.25)" }}
              >
                Book Now →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}