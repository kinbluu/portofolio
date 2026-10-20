import CalendarDays from "@lucide/astro/icons/calendar-days";
import CheckCheck from "@lucide/astro/icons/check-check";
import ClipboardCheck from "@lucide/astro/icons/clipboard-check";
import CodeXml from "@lucide/astro/icons/code-xml";
import Database from "@lucide/astro/icons/database";
import FileCheck from "@lucide/astro/icons/file-check";
import PanelsTopLeft from "@lucide/astro/icons/panels-top-left";
import Server from "@lucide/astro/icons/server";
import ShieldCheck from "@lucide/astro/icons/shield-check";
import Sprout from "@lucide/astro/icons/sprout";
import UserPlus from "@lucide/astro/icons/user-plus";
import Workflow from "@lucide/astro/icons/workflow";
import Wrench from "@lucide/astro/icons/wrench";

export const profile = {
  name: "Mochammad Rahmat Muttaqin",
  wordmark: "Rahmat.",
  role: "Full Stack Developer",
  location: "Surabaya, Indonesia",
  locationShort: "Surabaya, ID",
  headlineLines: [
    "I build web applications that make",
    "everyday work easier.",
  ],
  email: "mrahmatmuttaqin@gmail.com",
  linkedin: "https://www.linkedin.com/in/mochammad-rahmat-muttaqin",
  phone: "+6285182120736",
  github: "https://github.com/kinkenkan298",
};

export const navigation = [
  { label: "Work", href: "#work" },
  { label: "Experience", href: "#experience" },
  { label: "About", href: "#about" },
  { label: "GitHub", href: "#github" },
  { label: "Contact", href: "#contact" },
];

export const featuredRole = {
  badge: "Current work",
  dates: "Jan 2026 — Present",
  titleLines: ["Software behind", "the classroom."],
  employer: "Full Stack Developer · LEAP English & Digital Class",
  description:
    "Registration, class schedules, attendance and report-card approvals, brought together in one internal platform.",
  figures: [
    {
      value: 50,
      prefix: "~",
      caption: "staff supported",
      shortCaption: "staff supported",
    },
    {
      value: 1_000,
      prefix: "~",
      caption: "students managed",
      shortCaption: "students",
    },
    {
      value: 4,
      prefix: "",
      caption: "modules in one app",
      shortCaption: "modules",
    },
  ],
  stack: ["Laravel", "Livewire", "MariaDB"],
  modules: [
    {
      icon: UserPlus,
      name: "Registration",
      detail: "Online enrolment and student records",
    },
    {
      icon: CalendarDays,
      name: "Scheduling",
      detail: "Class timetables and teacher allocation",
    },
    {
      icon: ClipboardCheck,
      name: "Attendance",
      detail: "Daily check-in per class and session",
    },
    {
      icon: FileCheck,
      name: "Report cards",
      detail: "Multi-step approval before release",
    },
  ],
  practices: [
    "Role-based access",
    "Queued jobs",
    "Audit logs",
    "Feature tests",
  ],
};

export const experience = [
  {
    dates: "Feb — Apr 2026",
    icon: Workflow,
    title: "Backend Developer",
    organization: "PT Inimedia Kreatif Indonesia · Freelance",
    description:
      "Payment APIs, authentication, webhook retries and reconciliation in a Node.js microservices backend.",
    stack: "Node.js · Microservices · JWT · API keys · RBAC",
  },
  {
    dates: "Dec 2025 — Jan 2026",
    icon: Wrench,
    title: "Full Stack Web Developer",
    organization: "LEAP English & Digital Class · Internship",
    description:
      "Reviewed legacy question-bank workflows and fixed existing features.",
    stack: "Legacy workflows · Application maintenance",
  },
];

export const about = {
  titleLines: ["Practical.", "Detail-minded."],
  description:
    "I build web apps and APIs, with AI-assisted coding and agentic workflows as part of my process.",
  practices: [
    { icon: ShieldCheck, label: "Role-based access" },
    { icon: Database, label: "Validated data" },
    { icon: CheckCheck, label: "Tested workflows" },
  ],
};

export const skills = [
  { icon: Server, label: "Backend", value: "Laravel, Livewire, Node.js" },
  {
    icon: PanelsTopLeft,
    label: "Frontend",
    value: "React, Vue.js, Nuxt, HTML, CSS",
  },
  {
    icon: CodeXml,
    label: "Languages",
    value: "PHP, JavaScript, TypeScript, Solidity, Python",
  },
  {
    icon: Database,
    label: "Data & tools",
    value: "MariaDB, MySQL, Git, Postman, VS Code",
  },
  {
    icon: Sprout,
    label: "Currently learning",
    value: "Mobile development with Expo",
  },
];

export const contact = {
  title: "Let’s build something useful.",
  description: "Web apps, APIs or a better workflow. Let’s talk.",
};

export const chat = {
  assistant: "Asisten Rahmat",
  initials: "RM",
  status: "Online · asisten AI",
  greeting:
    "Halo! 👋 Saya asisten AI Rahmat. Tanyakan apa saja seputar pengalaman, keahlian, atau cara menghubunginya.",
  suggestions: [
    "Apa pekerjaan Rahmat saat ini?",
    "Teknologi apa yang dikuasai Rahmat?",
    "Bagaimana cara menghubungi Rahmat?",
  ],
};
