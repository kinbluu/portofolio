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
  role: "Pengembang Full Stack",
  location: "Surabaya, Indonesia",
  locationShort: "Surabaya, ID",
  headlineLines: [
    "Saya membangun aplikasi web yang memudahkan",
    "pekerjaan sehari-hari.",
  ],
  email: "mrahmatmuttaqin@gmail.com",
  linkedin: "https://www.linkedin.com/in/mochammad-rahmat-muttaqin",
  phone: "+6285182120736",
  github: "https://github.com/kinkenkan298",
};

export const navigation = [
  { label: "Karya", href: "#work" },
  { label: "Pengalaman", href: "#experience" },
  { label: "GitHub", href: "#github" },
  { label: "Tentang", href: "#about" },
  { label: "Asisten AI", href: "#assistant" },
  { label: "Kontak", href: "#contact" },
];

export const featuredRole = {
  badge: "Pekerjaan saat ini",
  dates: "Jan 2026 hingga sekarang",
  titleLines: ["Teknologi untuk", "ruang kelas."],
  employer: "Pengembang Full Stack · LEAP English & Digital Class",
  description:
    "Pendaftaran, jadwal kelas, kehadiran, dan persetujuan rapor dalam satu platform internal.",
  figures: [
    {
      value: 50,
      prefix: "~",
      caption: "staf yang didukung",
      shortCaption: "staf",
    },
    {
      value: 1_000,
      prefix: "~",
      caption: "siswa yang dikelola",
      shortCaption: "siswa",
    },
    {
      value: 4,
      prefix: "",
      caption: "modul dalam satu aplikasi",
      shortCaption: "modul",
    },
  ],
  stack: ["Laravel", "Livewire", "MariaDB"],
  modules: [
    {
      icon: UserPlus,
      name: "Pendaftaran",
      detail: "Pendaftaran daring dan data siswa",
    },
    {
      icon: CalendarDays,
      name: "Penjadwalan",
      detail: "Jadwal kelas dan penugasan pengajar",
    },
    {
      icon: ClipboardCheck,
      name: "Kehadiran",
      detail: "Pencatatan kehadiran harian per kelas dan sesi",
    },
    {
      icon: FileCheck,
      name: "Rapor",
      detail: "Persetujuan bertahap sebelum diterbitkan",
    },
  ],
  practices: [
    "Akses berbasis peran",
    "Tugas dalam antrean",
    "Log audit",
    "Pengujian fitur",
  ],
};

export const experience = [
  {
    dates: "Feb hingga Apr 2026",
    icon: Workflow,
    title: "Pengembang Backend",
    studioTitle: "Backend",
    studioOrganization: "Inimedia",
    organization: "PT Inimedia Kreatif Indonesia · Lepas",
    description:
      "API pembayaran, autentikasi, percobaan ulang webhook, dan rekonsiliasi pada backend microservices Node.js.",
    stack: "Node.js · Microservices · JWT · Kunci API · RBAC",
  },
  {
    dates: "Des 2025 hingga Jan 2026",
    icon: Wrench,
    title: "Pengembang Web Full Stack",
    studioTitle: "Full Stack",
    studioOrganization: "LEAP",
    organization: "LEAP English & Digital Class · Magang",
    description:
      "Meninjau alur kerja bank soal lama dan memperbaiki fitur yang sudah ada.",
    stack: "Alur kerja lama · Pemeliharaan aplikasi",
  },
];

export const about = {
  titleLines: ["Praktis.", "Cermat."],
  description:
    "Saya membangun aplikasi web dan API, dengan bantuan AI serta alur kerja berbasis agen.",
  practices: [
    { icon: ShieldCheck, label: "Akses berbasis peran" },
    { icon: Database, label: "Data tervalidasi" },
    { icon: CheckCheck, label: "Alur kerja teruji" },
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
    label: "Bahasa pemrograman",
    value: "PHP, JavaScript, TypeScript, Solidity, Python",
  },
  {
    icon: Database,
    label: "Data dan alat",
    value: "MariaDB, MySQL, Git, Postman, VS Code",
  },
  {
    icon: Sprout,
    label: "Sedang dipelajari",
    value: "Pengembangan aplikasi mobile dengan Expo",
  },
];

export const contact = {
  title: "Mari buat sesuatu yang bermanfaat.",
  description:
    "Aplikasi web, API, atau alur kerja yang lebih baik. Mari berbincang.",
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
