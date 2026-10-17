// Role presets: picking a role up front lets the app suggest skills, a summary
// and example bullet points, and match keywords in job ads.

export type Role = {
  id: string;
  label: string;
  headline: string;
  skills: string[];
  // Summary pieces: {years} and {skills} get filled in.
  summaryLead: string;
  summaryValue: string;
  bullets: string[];
  // Extra words that show up in job ads for this role.
  keywords: string[];
};

export const ROLES: Role[] = [
  {
    id: "fresh",
    label: "Fresh Graduate",
    headline: "Fresh Graduate",
    skills: ["MS Office", "Communication", "Teamwork", "Time Management", "Problem Solving", "Research", "Presentation Skills", "Email Etiquette"],
    summaryLead: "Motivated {degree} graduate",
    summaryValue: "eager to learn, quick to adapt and ready to contribute from day one",
    bullets: [
      "Completed a final-year project on [topic], presented to a panel of [3] faculty members",
      "Led a team of [4] students to deliver a semester project ahead of the deadline",
      "Volunteered with [organisation], helping [50+] people",
    ],
    keywords: ["graduate", "trainee", "internship", "entry level", "fresh"],
  },
  {
    id: "sales",
    label: "Sales & Retail",
    headline: "Sales Associate",
    skills: ["Customer Service", "Cash Handling", "Product Knowledge", "Upselling", "Inventory Management", "POS Systems", "Negotiation", "Target Achievement"],
    summaryLead: "Results-driven sales professional",
    summaryValue: "who builds customer trust and consistently meets sales targets",
    bullets: [
      "Served [60+] customers daily while keeping the shop floor organised",
      "Achieved [110%] of the monthly sales target for [6] consecutive months",
      "Managed daily cash and card transactions with zero discrepancies",
      "Maintained stock records and reduced shortages by [20%]",
    ],
    keywords: ["sales", "retail", "store", "shop", "customer", "target", "pos"],
  },
  {
    id: "csr",
    label: "Call Center / CSR",
    headline: "Customer Service Representative",
    skills: ["Customer Service", "Active Listening", "Complaint Handling", "CRM Software", "Bilingual Communication", "Typing (40+ WPM)", "Problem Solving", "Patience"],
    summaryLead: "Customer-focused service representative",
    summaryValue: "who resolves issues calmly and keeps customers coming back",
    bullets: [
      "Handled [80+] inbound calls per day with a [95%] satisfaction score",
      "Resolved customer complaints on the first call in [85%] of cases",
      "Logged and tracked tickets accurately in the CRM system",
    ],
    keywords: ["call center", "csr", "customer support", "inbound", "outbound", "crm", "bpo"],
  },
  {
    id: "accounts",
    label: "Accountant",
    headline: "Accountant",
    skills: ["Bookkeeping", "MS Excel", "QuickBooks", "Tally", "Bank Reconciliation", "Accounts Payable", "Accounts Receivable", "Tax Filing (FBR)", "Financial Reporting"],
    summaryLead: "Detail-oriented accountant",
    summaryValue: "who keeps accurate books and delivers reports on time",
    bullets: [
      "Maintained ledgers and daily bookkeeping for a business with [PKR 5M+] monthly turnover",
      "Prepared monthly bank reconciliations with zero unexplained differences",
      "Filed sales tax and income tax returns on the FBR portal on time",
    ],
    keywords: ["accounts", "accountant", "finance", "ledger", "reconciliation", "audit", "tax", "fbr", "excel"],
  },
  {
    id: "teacher",
    label: "Teacher",
    headline: "Teacher",
    skills: ["Lesson Planning", "Classroom Management", "Student Assessment", "Parent Communication", "MS Office", "Curriculum Development", "Online Teaching"],
    summaryLead: "Dedicated teacher",
    summaryValue: "who makes lessons clear, engaging and results-focused",
    bullets: [
      "Taught [Subject] to classes of [35+] students in grades [6–8]",
      "Improved class pass rate from [70%] to [92%] in one academic year",
      "Planned weekly lessons and assessments aligned with the curriculum",
    ],
    keywords: ["teacher", "teaching", "school", "students", "lecturer", "tutor", "academy"],
  },
  {
    id: "driver",
    label: "Driver / Rider",
    headline: "Professional Driver",
    skills: ["Safe Driving", "Route Planning", "Vehicle Maintenance", "Valid Driving License", "Punctuality", "Customer Handling", "Google Maps"],
    summaryLead: "Reliable and safety-conscious driver",
    summaryValue: "with a clean record and strong knowledge of city routes",
    bullets: [
      "Completed [20+] deliveries or trips daily with on-time arrival",
      "Maintained a clean driving record with zero accidents over [3] years",
      "Carried out routine vehicle checks to keep it in good condition",
    ],
    keywords: ["driver", "rider", "delivery", "license", "vehicle", "transport", "logistics"],
  },
  {
    id: "developer",
    label: "Software Developer",
    headline: "Software Developer",
    skills: ["JavaScript", "TypeScript", "React", "Node.js", "SQL", "Git", "REST APIs", "Problem Solving"],
    summaryLead: "Software developer",
    summaryValue: "who builds reliable, user-friendly applications",
    bullets: [
      "Built [3] production features in React used by [10,000+] users",
      "Reduced page load time by [40%] by optimising API calls",
      "Wrote automated tests that raised code coverage to [80%]",
    ],
    keywords: ["developer", "software", "engineer", "frontend", "backend", "full stack", "react", "node", "javascript", "python"],
  },
  {
    id: "design",
    label: "Graphic Designer",
    headline: "Graphic Designer",
    skills: ["Adobe Photoshop", "Adobe Illustrator", "Figma", "Canva", "Branding", "Social Media Design", "Typography"],
    summaryLead: "Creative graphic designer",
    summaryValue: "who turns ideas into clean, on-brand visuals",
    bullets: [
      "Designed [100+] social media posts that grew engagement by [35%]",
      "Created brand identities for [8] small businesses",
      "Delivered print and digital designs on tight deadlines",
    ],
    keywords: ["designer", "graphic", "photoshop", "illustrator", "figma", "creative", "branding"],
  },
  {
    id: "health",
    label: "Nurse / Healthcare",
    headline: "Staff Nurse",
    skills: ["Patient Care", "Vital Signs Monitoring", "Medication Administration", "First Aid & CPR", "Infection Control", "Record Keeping", "Compassion"],
    summaryLead: "Compassionate healthcare professional",
    summaryValue: "committed to safe, high-quality patient care",
    bullets: [
      "Provided care to [15+] patients per shift in a [50]-bed ward",
      "Administered medicines and monitored vital signs accurately",
      "Maintained patient records in line with hospital policy",
    ],
    keywords: ["nurse", "nursing", "hospital", "patient", "clinic", "healthcare", "pnc"],
  },
  {
    id: "admin",
    label: "Office / Admin",
    headline: "Office Assistant",
    skills: ["MS Office", "Data Entry", "Filing & Records", "Scheduling", "Email Correspondence", "Front Desk", "Typing (40+ WPM)"],
    summaryLead: "Organised office professional",
    summaryValue: "who keeps daily operations running smoothly",
    bullets: [
      "Managed schedules and meetings for a team of [12]",
      "Entered and maintained [500+] records per week with high accuracy",
      "Handled front-desk visitors, calls and correspondence",
    ],
    keywords: ["admin", "office", "assistant", "receptionist", "data entry", "clerk", "coordinator"],
  },
  {
    id: "technician",
    label: "Technician / Electrician",
    headline: "Electrical Technician",
    skills: ["Electrical Wiring", "Troubleshooting", "Equipment Maintenance", "Safety Procedures", "Reading Diagrams", "Hand & Power Tools", "Solar Installation"],
    summaryLead: "Skilled technician",
    summaryValue: "who fixes problems quickly and works safely",
    bullets: [
      "Installed and repaired wiring in [50+] homes and offices",
      "Carried out preventive maintenance that reduced breakdowns by [30%]",
      "Followed safety procedures with zero incidents",
    ],
    keywords: ["technician", "electrician", "maintenance", "repair", "wiring", "dae", "mechanical", "solar"],
  },
  {
    id: "chef",
    label: "Cook / Restaurant",
    headline: "Cook",
    skills: ["Food Preparation", "Pakistani Cuisine", "Kitchen Hygiene", "Menu Planning", "Inventory Control", "Teamwork", "Speed Under Pressure"],
    summaryLead: "Reliable cook",
    summaryValue: "who prepares tasty food quickly and keeps the kitchen clean",
    bullets: [
      "Prepared [150+] meals per day in a busy restaurant kitchen",
      "Kept the kitchen in line with food hygiene standards",
      "Helped plan menus and reduce food waste by [15%]",
    ],
    keywords: ["cook", "chef", "kitchen", "restaurant", "hotel", "food", "catering"],
  },
  {
    id: "marketing",
    label: "Digital Marketing",
    headline: "Digital Marketing Executive",
    skills: ["Social Media Marketing", "Facebook & Instagram Ads", "SEO", "Content Writing", "Google Analytics", "Canva", "Email Marketing"],
    summaryLead: "Digital marketer",
    summaryValue: "who grows audiences and turns clicks into customers",
    bullets: [
      "Grew Instagram followers from [2K] to [15K] in [6] months",
      "Ran Facebook ad campaigns with a [3x] return on ad spend",
      "Wrote SEO content that doubled monthly website visitors",
    ],
    keywords: ["marketing", "digital", "social media", "seo", "ads", "content", "campaign"],
  },
  {
    id: "other",
    label: "Something else",
    headline: "",
    skills: ["Communication", "Teamwork", "Time Management", "Problem Solving", "MS Office", "Reliability"],
    summaryLead: "Reliable professional",
    summaryValue: "who learns quickly and takes ownership of the work",
    bullets: [],
    keywords: [],
  },
];

export const roleById = (id: string) => ROLES.find((r) => r.id === id) ?? ROLES[ROLES.length - 1];

// Every skill across every role, for matching job ads against skills.
export const ALL_SKILLS = Array.from(new Set(ROLES.flatMap((r) => r.skills)));
