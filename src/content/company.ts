/**
 * Business content migrated from idealservicestaff.com.
 * Figures, testimonials and outcomes are reproduced exactly as published on
 * the original site — do not add new claims here without a source.
 */

/** "Why Families Choose Us" (homepage + services page). */
export const keyStats = [
  { value: 97, suffix: "%", label: "Caregiver retention rate", note: "Industry average: 65%" },
  { value: 4.9, decimals: 1, suffix: "/5", label: "Average client satisfaction", note: "Client satisfaction score" },
  { value: 90, suffix: " min", label: "Response for most inquiries", note: "Same-day emergency placements possible" },
];

/** Homepage counters — the original site states these as "100s of". */
export const reachStats = [
  { label: "Patients cared for", value: "100s" },
  { label: "Caregivers & staff", value: "100s" },
  { label: "Cities across the USA", value: "100s" },
];

/** "Why Families Choose Us Over Competitors" — titles only on the original site. */
export const differentiators = ["No Fees", "Flexible Scheduling", "Rapid Response", "Continuous Service"];

export const familyReasons = [
  "97% caregiver retention rate (industry average: 65%)",
  "4.9/5 average client satisfaction score",
  "90-minute response for most inquiries",
  "No long-term contracts",
  "Possible same-day emergency placements",
];

/** Caregiver standards — from the Legal Disclosure ("Caregiver Qualifications & Supervision"). */
export const credentials = [
  { title: "CA Home Care Aide Registry", text: "Current registration (HSC §1796.45)" },
  { title: "Live Scan fingerprinting", text: "Plus ongoing registry monitoring" },
  { title: "CPR / First Aid certified", text: "From organizations like the American Red Cross" },
  { title: "Annual TB clearance", text: "And regular health screenings" },
  { title: "HIPAA compliance program", text: "Overseen by a Privacy Officer" },
];

/** "Our 5-Step Screening Process" — homepage. */
export const screeningSteps = [
  { title: "In-Depth Interviews", text: "We evaluate experience, personality, and trustworthiness." },
  { title: "Background Checks", text: "Criminal record, abuse registries, and reference checks." },
  { title: "Skills Testing", text: "Practical testing of mobility assistance, emergency response, and communication." },
  { title: "Trial Shifts", text: "Some clients like a trial run before a permanent placement." },
  { title: "Ongoing Training", text: "Caregivers attend monthly workshops in dementia care, fall prevention, and more." },
];

/** "Three-Tier Quality System" — services page. */
export const qualityTiers = [
  { cadence: "Weekly", title: "Supervisor Visits", items: ["Care plan audits", "Skills verification", "Client interviews"] },
  { cadence: "Monthly", title: "Performance Reviews", items: ["Documentation accuracy", "Timeliness metrics", "Client satisfaction scores"] },
  { cadence: "Quarterly", title: "Improvement Plans", items: ["Training adjustments", "Protocol updates", "Technology enhancements"] },
];

export const qualityProgram = [
  "Supervisory visits (random quality checks)",
  "Client feedback system (real-time contact)",
  "Caregiver performance metrics",
  "Continuous improvement process",
];

/**
 * How care starts — combines the contact page steps, the services page
 * "Getting Started" programme and the homepage consultation copy.
 */
export const processSteps = [
  {
    title: "Free consultation",
    lead: "Call, WhatsApp or send a request.",
    text: "Call us for a complimentary, no-obligation consultation — or drop us a voice note or message. We listen first.",
    points: ["No-obligation conversation", "Phone, WhatsApp or online form", "Same-day emergency placements possible"],
  },
  {
    title: "Needs assessment",
    lead: "A 90-minute assessment.",
    text: "We evaluate your needs in detail so the care plan reflects real life, not a template.",
    points: ["Home safety evaluation", "Medical history review", "Identification of care priorities"],
  },
  {
    title: "Individualized care plan",
    lead: "Customized to your needs.",
    text: "Your plan sets out exactly who does what, when — and what to do if something changes.",
    points: ["Service schedule", "Special protocols", "Emergency contacts"],
  },
  {
    title: "Caregiver matching",
    lead: "Meet before you commit.",
    text: "We match skills and personality, then you meet your caregiver in person or by video call.",
    points: ["Alignment of skills", "Personality match", "Introduction meeting"],
  },
  {
    title: "Care begins — and keeps improving",
    lead: "Start care with confidence.",
    text: "Care starts with assurance, backed by supervisor visits, real-time feedback and continuous improvement.",
    points: ["Weekly supervisor visits", "Client feedback system", "Quarterly improvement plans"],
  },
];

/** "Real Impact Stories" — homepage + services page. */
export const impactStories = [
  {
    title: "Preventing Rehospitalization",
    image: "/images/home-health-walker.webp",
    actions: ["Implemented strict fall prevention protocol", "Coordinated with home health nurses", "Ensured medication adherence"],
    result: "Full recovery with zero complications",
  },
  {
    title: "Dementia Care Innovation",
    image: "/images/senior-companion.webp",
    actions: ["Introduced cognitive stimulation activities", "Established structured evening routine", "Trained family on communication techniques"],
    result: "50% reduction in evening agitation episodes",
  },
];

/** "Evidence-Based Protocols" — About page. */
export const protocols = [
  {
    title: "Fall Prevention Program",
    items: ["Home safety assessments using CDC guidelines", "Mobility assistance techniques from physical therapy", "Transfer training certified by rehabilitation specialists"],
    result: { value: 72, suffix: "%", label: "fewer falls than industry average" },
  },
  {
    title: "Cognitive Support System",
    items: ["Validation therapy for dementia care", "Reminiscence techniques backed by neuropsychology", "Sundowning management strategies"],
    result: { value: 65, suffix: "%", label: "reduction in agitation episodes" },
  },
];

/** "We integrate smart solutions" — homepage, services page and About page. */
export const technology = [
  { icon: "video", title: "Telecommunication with your provider", text: "Stay in touch with your care team, and meet caregivers by video call." },
  { icon: "smartphone", title: "Medication management apps", text: "Digital tools that support reminders and adherence." },
  { icon: "users", title: "Family portal for updates", text: "Regular updates to family members, wherever they are." },
  { icon: "radar", title: "Remote monitoring", text: "Available with client consent." },
  { icon: "bell", title: "Emergency alert integration", text: "Alerts that connect clients to help quickly." },
  { icon: "fileHeart", title: "Electronic health records", text: "Continuity of information across caregivers and providers." },
] as const;

export const careCoordination = [
  "Electronic health records for continuity",
  "Regular updates to family members",
  "Collaboration with medical providers",
  "Transition planning for hospital discharges",
];

export type Testimonial = {
  quote: string;
  name: string;
  location: string;
  outcomeLabel: string;
  outcomes: string[];
};

/** "What Our Clients Say" — reproduced verbatim. */
export const testimonials: Testimonial[] = [
  {
    quote:
      "After my father’s hip replacement, we needed reliable care during his 8-week recovery. IdealServiceStaff provided an incredible caregiver who not only helped with physical therapy exercises but kept his spirits up during a challenging time. Their team coordinated with his surgeon’s office to ensure all mobility restrictions were followed. What could have been a stressful recovery became a period of meaningful progress.",
    name: "Johnson Family",
    location: "Los Angeles, CA",
    outcomeLabel: "Key Results",
    outcomes: ["Full mobility regained 3 weeks ahead of prognosis", "Zero complications or readmissions", "Seamless transition back to independent living"],
  },
  {
    quote:
      "Caring for my abuelita with Alzheimer’s was becoming overwhelming. The caregiver IdealServiceStaff matched with us speaks Spanish fluently and understands our cultural traditions. She uses special techniques to redirect my grandmother’s anxiety and even got her participating in music therapy again. For the first time in years, I can sleep through the night knowing she’s in good hands.",
    name: "María G.",
    location: "Phoenix, AZ",
    outcomeLabel: "Notable Outcomes",
    outcomes: ["60% reduction in evening agitation episodes", "Improved nutrition through culturally appropriate meals", "Family caregiver stress levels decreased significantly"],
  },
  {
    quote:
      "Five years into our journey with Parkinson’s, we’d cycled through three agencies before finding IdealServiceStaff. Their caregivers receive specialized training in movement disorder support. The difference is night and day – they know exactly how to assist with freezing episodes and medication timing. Most importantly, they treat my husband with dignity while helping him maintain independence.",
    name: "Williams Family",
    location: "San Diego, CA",
    outcomeLabel: "Documented Improvements",
    outcomes: ["Better medication adherence (from 70% to 98%)", "Increased safe mobility through proper transfer techniques", "Enhanced quality of life through tailored activities"],
  },
  {
    quote:
      "After my husband’s stroke, we were lost trying to navigate his recovery. IdealServiceStaff assigned a caregiver with rehabilitation experience who became our lifeline. She created a daily routine that incorporated his speech therapy exercises into normal conversations and found adaptive tools so he could feed himself again. Six months later, his neurologist said his progress was ‘remarkable’ – we credit much of that to the dedicated care he received.",
    name: "Henderson Family",
    location: "Austin, TX",
    outcomeLabel: "Key Improvements Noted",
    outcomes: ["Regained 80% of speech capabilities (per clinical assessment)", "Achieved independent feeding within 3 months", "Depression screening scores improved by 65%"],
  },
  {
    quote:
      "When we brought my father home for hospice care, Ideal Service Staff provided the most gentle, respectful caregiver imaginable. She somehow knew exactly when to give us space and when to step in. Her knowledge of pain management techniques and ability to keep Dad comfortable while preserving his dignity was a gift we’ll never forget. She even continued checking on our family after he passed – that’s the kind of care that goes beyond professional duty.",
    name: "Melissa W.",
    location: "Santa Fe, NM",
    outcomeLabel: "Family Noted",
    outcomes: ["Pain consistently managed below level 3 on scale", "Created meaningful final moments through life review", "Provided crucial grief resources for family"],
  },
  {
    quote:
      "As full-time caregivers for our adult son with cerebral palsy, we were burning out fast. IdealServiceStaff’s respite care gave us our marriage back. Their caregiver learned all his unique communication methods and even helped him start a small vegetable garden – something we never had the energy to attempt. Now we have regular date nights knowing he’s happy and engaged at home.",
    name: "David and Sarah R.",
    location: "Portland, OR",
    outcomeLabel: "Documented Impact",
    outcomes: ["Parents’ stress levels decreased by 40% (per surveys)", "Client achieved new skill milestones with dedicated support", "Family avoided institutional placement crisis"],
  },
];

/** Original "Why Choose Us" pillars — services page. */
export const carePillars = [
  {
    title: "Our Care Adapts to Your Needs",
    text: "Different people have different needs, and those needs can change, sometimes quickly. Our caregivers have the resources, skills, and training to respond rapidly and adapt their care as circumstances evolve.",
  },
  {
    title: "We Will Guide You With Grace",
    text: "When someone you love needs help, it can be hard to know what to do or even where to start. This is where our care begins. We’re here to offer you the care and clarity you need with dignity and respect.",
  },
  {
    title: "We Deliver with Heart",
    text: "A warm smile. A kind word. A friend’s hand to hold your own. These seem like small things, but they can make the difference between someone who is merely receiving care and someone who feels truly cared for.",
  },
  {
    title: "Statewide Reach. Neighborly Spirit",
    text: "Wherever you are, we bring the same local, personal attention — caregivers who respond rapidly and adapt their care as circumstances evolve.",
  },
];

/** Services page intro advantages. */
export const serviceAdvantages = [
  { value: "40–60%", label: "cost savings over licensed care" },
  { value: "Same-day", label: "placements" },
  { value: "Advanced", label: "condition training" },
  { value: "Actual", label: "continuity of care" },
];

/** About page content. */
export const about = {
  purposeIntro:
    "At the core of Ideal Service Staff lies a profound commitment to transforming the non-medical caregiving industry through professional excellence and compassionate service. Our purpose extends far beyond simply providing caregivers – we exist to fundamentally improve how society supports aging individuals and those with disabilities in maintaining their independence and quality of life.",
  dimensions: [
    {
      title: "Client-Centered Care Revolution",
      text: "We challenge the status quo of impersonal, task-oriented care by implementing a relationship-based model where caregivers truly know and understand their clients’ unique needs, preferences, and life stories.",
    },
    {
      title: "Caregiver Professionalization Movement",
      text: "We are leading the charge to recognize non-medical caregiving as the skilled profession it truly is. Through training programs, career advancement pathways, and professional development, we’re demonstrating that quality care requires specialized knowledge and deserves appropriate compensation and respect.",
    },
    {
      title: "Healthcare System Partnership",
      text: "We serve as a vital bridge between clinical healthcare and daily living needs. By coordinating closely with medical professionals and implementing evidence-based protocols, we help reduce hospital readmissions, improve chronic disease management, and support overall wellness – all while keeping costs significantly lower than institutional care options.",
    },
  ],
  need: [
    { value: "70%", text: "of Americans turning 65 will need some form of long-term care in their lifetimes.", source: "U.S. Department of Health and Human Services" },
    { value: "1 in 5", text: "U.S. residents will be of retirement age by 2030, when all baby boomers are over 65.", source: "U.S. Census Bureau" },
    { value: "90%", text: "of older adults want to remain in their own homes as they age.", source: "AARP" },
  ],
  adls: ["Bathing and personal hygiene", "Dressing and grooming", "Toileting and continence care", "Mobility and transfers", "Eating and feeding assistance"],
  iadls: ["Meal preparation and nutrition", "Medication reminders", "Light housekeeping", "Transportation", "Companionship and cognitive engagement"],
  mission:
    "To provide exceptional non-medical home care that enhances quality of life through professional caregivers, personalized service, and innovative solutions – enabling individuals to maintain their independence and dignity in the comfort of their own homes.",
  vision: [
    {
      title: "Professional non-medical home care becomes standard",
      text: "We foresee a future where non-medical caregivers are recognized as essential healthcare team members, with:",
      items: ["Standardized professional certification", "Career lattice advancement opportunities", "Competitive compensation and benefits", "Integration with medical care systems"],
    },
    {
      title: "Aging in place becomes more accessible",
      text: "We’re working toward communities where:",
      items: ["Home care options are affordable and available to all who need them", "Housing includes universal design principles", "Technology supports independent living"],
    },
  ],
  values: [
    {
      title: "Compassion with Professionalism",
      text: "We combine heartfelt care with clinical-grade standards, understanding that empathy and expertise must work together. Our caregivers are trained to provide emotional support while maintaining appropriate professional boundaries.",
    },
    {
      title: "Respect for Individuality",
      text: "We honor each client’s unique personality, preferences, and life story. Care plans are customized rather than standardized, recognizing that quality of life means different things to different people.",
    },
    {
      title: "Commitment to Excellence",
      text: "We continually raise the bar for non-medical care through ongoing training, quality improvement initiatives, and adoption of evidence-based practices. Good enough is never good enough for our clients.",
    },
  ],
  leadership:
    "The leadership team at Ideal Service Staff brings together clinical knowledge, operational experience, and visionary thinking that collectively drives our organization’s continued excellence. Our leaders have been selected not just for their credentials, but for their demonstrated commitment to elevating the entire caregiving profession through innovative practices and compassionate leadership.",
  careModel: [
    { title: "Professionalized Caregiving Workforce", items: ["200+ hour certification program (vs. 75-hour state minimum)", "Specialized training tracks (dementia, rehabilitation, etc.)", "Career lattice with 5 advancement levels"] },
    { title: "Integrated Care Coordination", items: careCoordination },
  ],
};

/** Homepage "Why Hire" copy. */
export const whyNonLicensed =
  "Most people believe that only doctors can provide proper care — yet not all needs require a medical license. Around 80% of routine caregiving tasks, such as bathing, meal preparation, transportation and companionship, can be performed safely and effectively by a non-physician care team working in collaboration with the medical team. That is where Ideal Service Staff comes in and shines.";

/** FAQ — every answer is drawn from the original site and its Legal Disclosure. */
export const faqs = [
  {
    q: "What kind of care do your caregivers provide?",
    a: "Non-medical support with Activities of Daily Living — bathing, dressing, mobility assistance, meal preparation, medication reminders, companionship and more. In line with California’s Home Care Services Consumer Protection Act, licensed medical procedures such as injections or catheterization are outside our caregivers’ scope; we coordinate with your medical team instead.",
  },
  {
    q: "How are caregivers screened?",
    a: "Through our 5-step process: in-depth interviews, background checks (criminal record, abuse registries and references), practical skills testing, optional trial shifts, and ongoing monthly training. Caregivers are registered on the CA Home Care Aide Registry, Live Scan fingerprinted and CPR/First Aid certified.",
  },
  {
    q: "How quickly can care start?",
    a: "We respond to most inquiries within 90 minutes, and same-day emergency placements are possible. A 90-minute needs assessment and an individualized care plan come first, so care starts on the right footing.",
  },
  {
    q: "Can we meet the caregiver before care begins?",
    a: "Yes. After matching on skills and personality, you meet your caregiver in person or by video call. Some families also choose a trial shift before a permanent placement.",
  },
  {
    q: "Are there long-term contracts?",
    a: "No long-term contracts. Service agreements begin with an initial 30-day term and then continue month-to-month, with 14-day written cancellation. Full terms are set out in our Legal Disclosure.",
  },
  {
    q: "When can I reach you?",
    a: "Monday to Friday 8 AM – 8 PM, Saturday 9 AM – 4 PM and Sunday 9 AM – 6 PM. Call (310) 462-1700 or send a request online at any time.",
  },
];

/** Careers — from the About page care model and screening copy. */
export const careerBenefits = [
  { title: "Real career growth", text: "A career lattice with 5 advancement levels." },
  { title: "Specialized training", text: "Training tracks in dementia, rehabilitation and more, plus monthly workshops." },
  { title: "Respected as professionals", text: "We advocate for recognition, fair compensation and respect for caregivers." },
  { title: "Meaningful matches", text: "We match you with clients on skills and personality, so relationships last." },
];
