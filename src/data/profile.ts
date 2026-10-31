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
  { label: "GitHub", href: "#github" },
  { label: "About", href: "#about" },
  { label: "AI Assistant", href: "#assistant" },
  { label: "Contact", href: "#contact" },
];

export const featuredRole = {
  badge: "Current work",
  dates: "Jan 2026 to present",
  titleLines: ["Technology for", "the classroom."],
  employer: "Full Stack Developer · LEAP English & Digital Class",
  description:
    "Registration, class schedules, attendance, and report card approvals in one internal platform.",
  figures: [
    {
      value: 50,
      prefix: "~",
      caption: "staff supported",
      shortCaption: "staff",
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
      caption: "modules in one application",
      shortCaption: "modules",
    },
  ],
  stack: ["Laravel", "Livewire", "MariaDB"],
  modules: [
    {
      icon: UserPlus,
      name: "Registration",
      detail: "Online registration and student data",
    },
    {
      icon: CalendarDays,
      name: "Scheduling",
      detail: "Class schedules and teacher assignments",
    },
    {
      icon: ClipboardCheck,
      name: "Attendance",
      detail: "Daily attendance records by class and session",
    },
    {
      icon: FileCheck,
      name: "Report cards",
      detail: "Staged approvals before publication",
    },
  ],
  practices: [
    "Role-based access",
    "Queued tasks",
    "Audit logs",
    "Feature testing",
  ],
};

export const experience = [
  {
    dates: "Feb to Apr 2026",
    icon: Workflow,
    title: "Backend Developer",
    studioTitle: "Backend",
    studioOrganization: "Inimedia",
    organization: "PT Inimedia Kreatif Indonesia · Freelance",
    description:
      "Payment APIs, authentication, webhook retries, and reconciliation in a Node.js microservices backend.",
    stack: "Node.js · Microservices · JWT · API keys · RBAC",
  },
  {
    dates: "Dec 2025 to Jan 2026",
    icon: Wrench,
    title: "Full Stack Web Developer",
    studioTitle: "Full Stack",
    studioOrganization: "LEAP",
    organization: "LEAP English & Digital Class · Internship",
    description:
      "Reviewed legacy question bank workflows and improved existing features.",
    stack: "Legacy workflows · Application maintenance",
  },
];

export const about = {
  titleLines: ["Practical.", "Careful."],
  description:
    "I build web applications and APIs with help from AI and agent-based workflows.",
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
    label: "Programming languages",
    value: "PHP, JavaScript, TypeScript, Solidity, Python",
  },
  {
    icon: Database,
    label: "Data and tools",
    value: "MariaDB, MySQL, Git, Postman, VS Code",
  },
  {
    icon: Sprout,
    label: "Currently learning",
    value: "Mobile app development with Expo",
  },
];

export const contact = {
  title: "Let's build something useful.",
  description: "Have a web application, API, or workflow in mind? Let's talk.",
};

export const chat = {
  assistant: "Rahmat's assistant",
  initials: "RM",
  status: "Online · AI assistant",
  greeting:
    "Hello! I'm Rahmat's AI assistant. Ask me about his experience, skills, or how to contact him.",
  suggestions: [
    "What is Rahmat working on?",
    "What technologies does Rahmat use?",
    "How can I contact Rahmat?",
  ],
};
