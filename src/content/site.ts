/**
 * Company identity & contact details — migrated verbatim from
 * idealservicestaff.com (contact page, header, footer).
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://idealservicestaff.com").replace(/\/$/, "");

export const site = {
  name: "Ideal Service Staff",
  legalName: "Ideal Select Care and Support Service Staff",
  shortName: "IdealServiceStaff",
  tagline: "Your partner of choice for compassionate healthcare staff",
  description:
    "Ideal Service Staff connects families, healthcare organizations and individuals with reliable, compassionate and qualified non-medical healthcare professionals — caregivers, aides, CNAs and support staff.",
  phone: "(310) 462-1700",
  phoneHref: "tel:+13104621700",
  /** The contact page invites visitors to "Make a Call / WhatsApp" on the same line. */
  whatsappHref: "https://wa.me/13104621700",
  email: "Info@idealservicestaff.com",
  emailHref: "mailto:Info@idealservicestaff.com",
  address: {
    street: "330 W. Olive St",
    city: "Inglewood",
    region: "CA",
    postalCode: "90301",
    country: "US",
  },
  mapQuery: "330 W. Olive St, Inglewood, CA 90301",
  hours: [
    { days: "Mon – Fri", time: "8:00 AM – 8:00 PM", schema: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "08:00", closes: "20:00" },
    { days: "Saturday", time: "9:00 AM – 4:00 PM", schema: ["Saturday"], opens: "09:00", closes: "16:00" },
    { days: "Sunday", time: "9:00 AM – 6:00 PM", schema: ["Sunday"], opens: "09:00", closes: "18:00" },
  ],
  social: {
    facebook: "https://www.facebook.com/share/16LZSdWGpG/",
    linkedin: "https://www.linkedin.com/company/idealservicestaff/",
    x: "https://x.com/idealservstaff",
  },
} as const;

/** Network affiliation confirmed by Ideal Service Staff (badge supplied by the company). */
export const affiliation = {
  name: "Hospitals Without Walls",
  tagline: "A Global Network of Patient-Centered Healthcare Providers",
  image: "/images/affiliation-hospitals-without-walls.webp",
} as const;

export type NavLink = { label: string; href: string; description?: string; external?: boolean };
export type NavItem = NavLink & { children?: NavLink[] };

export const mainNav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/non-medical-home-care-experts/" },
  {
    label: "Services",
    href: "/services/",
    children: [
      { label: "All Services", href: "/services/", description: "Every role and care program we staff" },
      { label: "Personal Care Aides", href: "/services/personal-care-aides/", description: "Hands-on help with daily living" },
      { label: "Home Health Aides", href: "/services/home-health-aides/", description: "Support for recovery at home" },
      { label: "Nurses & CNAs", href: "/services/nurses-and-cnas/", description: "Nursing assistants and nurse staffing" },
      { label: "Companion Caregivers", href: "/services/companion-caregivers/", description: "Friendship, engagement and routine" },
      { label: "Services Booking", href: "/services-booking/", description: "Request a consultation time" },
    ],
  },
  { label: "How It Works", href: "/how-it-works/" },
  { label: "Careers", href: "/get-job/" },
  { label: "Blog", href: "/blog/" },
  { label: "Contact Us", href: "/contact/" },
];

export const footerNav = {
  company: [
    { label: "About Us", href: "/non-medical-home-care-experts/" },
    { label: "How It Works", href: "/how-it-works/" },
    { label: "Our Blog", href: "/blog/" },
    { label: "Careers", href: "/get-job/" },
    { label: "Apply for a Position", href: "/careers/apply/" },
    { label: "Contact Us", href: "/contact/" },
  ],
  care: [
    { label: "Request Care", href: "/get-care/" },
    { label: "Services Booking", href: "/services-booking/" },
    { label: "Sign In / My Account", href: "/sign-in/" },
    { label: "Create an Account", href: "/register/" },
    { label: "Customer Dashboard", href: "/customer/dashboard/" },
    { label: "Employee Dashboard", href: "/employee/dashboard/" },
  ],
  legal: [
    { label: "Legal Disclosure", href: "/legal-disclosure/" },
    { label: "Privacy Policy", href: "/privacy-policy/" },
    { label: "Terms & Conditions", href: "/terms-and-conditions/" },
    { label: "SMS Terms & Conditions", href: "/sms-terms-conditions/" },
  ],
} satisfies Record<string, NavLink[]>;
