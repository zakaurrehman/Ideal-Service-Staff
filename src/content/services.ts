/**
 * Healthcare staffing roles — the 13 specialties listed on the original
 * homepage ("Who Are Ideal-Service Staff Healthcare Workers?").
 *
 * The original site listed these roles by title only. The short role
 * descriptions below are plain-language explanations of each role, written to
 * stay inside the scope set by the Legal Disclosure (non-medical ADL/IADL
 * support; no licensed clinical procedures). Review before launch.
 */
export type ServiceCategory = "home" | "clinical" | "professional";

export type Service = {
  slug: string;
  title: string;
  category: ServiceCategory;
  icon: IconKey;
  image: string;
  imagePosition?: string;
  summary: string;
  description: string[];
  tasks: string[];
};

export type IconKey =
  | "stethoscope"
  | "brain"
  | "handHeart"
  | "house"
  | "heartPulse"
  | "heartHandshake"
  | "userCheck"
  | "microscope"
  | "leaf"
  | "accessibility"
  | "pill"
  | "smile"
  | "clipboard";

export const serviceCategories: { id: ServiceCategory | "all"; label: string }[] = [
  { id: "all", label: "All specialties" },
  { id: "home", label: "Home & personal care" },
  { id: "clinical", label: "Clinical support" },
  { id: "professional", label: "Professional support" },
];

export const services: Service[] = [
  {
    slug: "personal-care-aides",
    title: "Personal Care Aides (PCAs)",
    category: "home",
    icon: "handHeart",
    image: "/images/caregiver-greeting.webp",
    imagePosition: "60% 40%",
    summary: "Dignified, hands-on help with the everyday activities that keep someone comfortable at home.",
    description: [
      "Personal Care Aides help with the Activities of Daily Living that become harder with age, illness or disability — always with patience and respect for privacy.",
      "Every aide is matched to the client’s routines, preferences and personality, so support feels familiar rather than clinical.",
    ],
    tasks: ["Bathing and personal hygiene", "Dressing and grooming", "Toileting and continence care", "Eating and feeding assistance"],
  },
  {
    slug: "home-health-aides",
    title: "Home Health Aides (HHAs)",
    category: "home",
    icon: "house",
    image: "/images/home-health-walker.webp",
    summary: "Steady support at home during recovery, chronic illness or the transition home from hospital.",
    description: [
      "Home Health Aides support clients who are recovering or living with ongoing conditions, working alongside the client’s medical team rather than replacing it.",
      "They follow the individualized care plan, keep routines consistent and keep families informed.",
    ],
    tasks: ["Mobility and transfers", "Medication reminders", "Meal preparation and nutrition", "Light housekeeping"],
  },
  {
    slug: "nurses-and-cnas",
    title: "Nurses & Certified Nursing Assistants (CNAs)",
    category: "clinical",
    icon: "heartPulse",
    image: "/images/team-healthcare-staff.webp",
    imagePosition: "50% 20%",
    summary: "Nursing assistants and nursing staff to fill coverage gaps for families and care organizations.",
    description: [
      "Our nursing staff and Certified Nursing Assistants help families and healthcare organizations cover shifts and gaps in care, so licensed teams can focus on complex treatment.",
      "Staff are placed according to their credentials and the scope of practice each role allows.",
    ],
    tasks: ["Shift and coverage staffing", "Daily living assistance", "Observation and reporting to the care team", "Comfort and safety support"],
  },
  {
    slug: "medical-nursing-assistants",
    title: "Medical / Nursing Assistants",
    category: "clinical",
    icon: "stethoscope",
    image: "/images/team-clinicians.webp",
    imagePosition: "50% 30%",
    summary: "Trained assistants who support clinical teams and patients with day-to-day care tasks.",
    description: [
      "Medical and nursing assistants work alongside physicians and nurses, taking on the routine, hands-on tasks that keep a care setting running smoothly.",
      "They help close staffing gaps while keeping patients comfortable and attended to.",
    ],
    tasks: ["Patient preparation and comfort", "Routine support for clinical teams", "Mobility assistance", "Communication with the care team"],
  },
  {
    slug: "mental-health-services",
    title: "Mental Health Services",
    category: "clinical",
    icon: "brain",
    image: "/images/senior-companion.webp",
    imagePosition: "35% 40%",
    summary: "Calm, consistent support staff for clients living with mental health and cognitive challenges.",
    description: [
      "Support staff trained in de-escalation, routine-building and compassionate communication help clients feel safe and engaged.",
      "Care is coordinated with the client’s clinicians and family so everyone works toward the same goals.",
    ],
    tasks: ["Structured daily routines", "Companionship and cognitive engagement", "Redirection and calming techniques", "Updates for family and clinicians"],
  },
  {
    slug: "personal-caregivers",
    title: "Personal Caregivers",
    category: "home",
    icon: "heartHandshake",
    image: "/images/caregiver-senior-smile.webp",
    summary: "A dedicated caregiver who knows your loved one’s needs, preferences and life story.",
    description: [
      "Personal caregivers provide consistent, relationship-based care — the gentle hand that helps you stand, and the reassuring voice that reminds you to take your medication.",
      "Continuity matters: we aim to keep the same trusted caregiver with each family.",
    ],
    tasks: ["Daily living assistance", "Medication reminders", "Companionship", "Errands and appointments"],
  },
  {
    slug: "personal-assistants",
    title: "Personal Assistants",
    category: "professional",
    icon: "userCheck",
    image: "/images/home-visit-tablet.webp",
    imagePosition: "30% 40%",
    summary: "Practical help with scheduling, errands and the details of everyday life.",
    description: [
      "Different people have different needs, and those needs can change, sometimes quickly. Our personal assistants have the resources, skills and training to respond rapidly and adapt as circumstances evolve.",
    ],
    tasks: ["Scheduling and appointment coordination", "Errands and shopping", "Household organization", "Technology help"],
  },
  {
    slug: "diagnostic-services",
    title: "Diagnostic Services",
    category: "clinical",
    icon: "microscope",
    image: "/images/patient-recovery.webp",
    imagePosition: "40% 40%",
    summary: "Support staff who help diagnostic and clinical teams keep patients comfortable and on schedule.",
    description: [
      "Different people have different needs, and those needs can change, sometimes quickly. Our staff have the resources, skills and training to respond rapidly and adapt as circumstances evolve.",
    ],
    tasks: ["Patient comfort and preparation", "Scheduling support", "Escort to and from appointments", "Coordination with the care team"],
  },
  {
    slug: "therapy-and-respite-care",
    title: "Therapy & Respite Care Workers",
    category: "clinical",
    icon: "leaf",
    image: "/images/respite-sunset.webp",
    summary: "Relief for family caregivers, and support for therapy routines between sessions.",
    description: [
      "Respite care gives family caregivers time to rest and recharge, knowing their loved one is safe, engaged and well looked after.",
      "Our workers can also help weave therapy exercises into everyday routines, in coordination with the client’s therapists.",
    ],
    tasks: ["Short-term and recurring respite", "Support for therapy routines", "Engaging activities", "Family caregiver relief"],
  },
  {
    slug: "mobility-and-transport-aides",
    title: "Mobility & Transport Aides",
    category: "home",
    icon: "accessibility",
    image: "/images/mobility-wheelchair.webp",
    summary: "Safe transfers, mobility support and accompanied transportation to appointments.",
    description: [
      "Mobility aides use safe transfer and mobility-assistance techniques to reduce the risk of falls at home and on the move.",
      "They can accompany clients to appointments, errands and social activities.",
    ],
    tasks: ["Mobility and transfers", "Fall-risk awareness", "Transportation and escort", "Wheelchair and walker assistance"],
  },
  {
    slug: "medication-reminders",
    title: "Medication Reminders",
    category: "home",
    icon: "pill",
    image: "/images/clinician-tablet.webp",
    imagePosition: "50% 25%",
    summary: "Reliable, friendly reminders that help clients stay on track with prescribed routines.",
    description: [
      "Caregivers provide timely reminders so clients take their prescribed medication on schedule — a non-medical service that supports adherence without administering medication.",
    ],
    tasks: ["Scheduled reminders", "Routine tracking", "Refill and pharmacy errands", "Updates to family"],
  },
  {
    slug: "companion-caregivers",
    title: "Companion Caregivers",
    category: "home",
    icon: "smile",
    image: "/images/companion-laughter.webp",
    summary: "Friendship, conversation and engagement that brighten every day.",
    description: [
      "A warm smile. A kind word. A friend’s hand to hold your own. Companion caregivers make the difference between someone who is merely receiving care and someone who feels truly cared for.",
    ],
    tasks: ["Companionship and conversation", "Cognitive engagement", "Hobbies, walks and outings", "Meal preparation"],
  },
  {
    slug: "administrative-support",
    title: "Administrative Support",
    category: "professional",
    icon: "clipboard",
    image: "/images/office-team.webp",
    imagePosition: "50% 30%",
    summary: "Administrative professionals who keep care organizations organized and running.",
    description: [
      "Administrative staff support healthcare organizations and care teams with scheduling, documentation and the day-to-day operations behind good care.",
    ],
    tasks: ["Scheduling and coordination", "Documentation support", "Front-desk and client communication", "Records organization"],
  },
];

export const getService = (slug: string) => services.find((s) => s.slug === slug);

/** Care programs — copy migrated verbatim from the original Services page. */
export const carePrograms = [
  {
    title: "Full Elder Care Solutions",
    icon: "heartHandshake" as IconKey,
    text: "We provide comprehensive, personalized care for seniors, addressing both medical and daily living needs. Our services include assistance with activities of daily living (ADLs), medication management, mobility support, and social engagement, all tailored to promote independence, dignity, and quality of life in the comfort of home or specialized facilities.",
  },
  {
    title: "Post-Hospitalization Care",
    icon: "house" as IconKey,
    text: "Our post-hospitalization program ensures a smooth transition from hospital to home, reducing the risk of readmission. We offer skilled nursing, wound care, rehabilitation support, and medication oversight, combined with personalized recovery plans to help patients regain strength and autonomy safely.",
  },
  {
    title: "Chronic Condition Management",
    icon: "heartPulse" as IconKey,
    text: "We specialize in long-term care for individuals with chronic illnesses such as diabetes, heart disease, or COPD. Our team creates customized care plans that include symptom monitoring, medication adherence, dietary guidance, and lifestyle coaching to stabilize conditions and improve daily functioning.",
  },
  {
    title: "Specialized Memory Care",
    icon: "brain" as IconKey,
    text: "Designed for those with Alzheimer’s, dementia, or cognitive impairments, our memory care services focus on safety, routine, and emotional well-being. We provide structured activities, cognitive stimulation therapies, and a secure environment, supported by trained caregivers who prioritize compassionate, patient-centered interactions.",
  },
  {
    title: "Comprehensive Training",
    icon: "clipboard" as IconKey,
    text: "A thorough and well-rounded approach to learning that covers all essential skills, knowledge, and competencies needed for each role — theoretical instruction, practical exercises, assessments, and ongoing support to ensure complete understanding and effective application.",
  },
  {
    title: "Technology Integration",
    icon: "microscope" as IconKey,
    text: "The use of digital tools and systems — such as electronic health records (EHRs), telehealth platforms, mobile health apps, and medical devices — to enhance patient care, improve efficiency, and support decision-making, so caregivers can deliver more accurate, timely, and personalized care while streamlining communication and documentation.",
  },
];
