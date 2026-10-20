type Theme = "light" | "dark";

const root = document.documentElement;
const systemTheme = matchMedia("(prefers-color-scheme: dark)");
const buttons = document.querySelectorAll<HTMLButtonElement>(
  "[data-theme-toggle]",
);
const parseTheme = (value: string | null): Theme | null =>
  value === "light" || value === "dark" ? value : null;

let preference: Theme | null = null;

try {
  preference = parseTheme(localStorage.getItem("theme"));
} catch {
  // The theme still works when browser storage is unavailable.
}

const applyTheme = () => {
  const theme = preference ?? (systemTheme.matches ? "dark" : "light");
  root.dataset.theme = theme;

  buttons.forEach((button) => {
    button.setAttribute("aria-pressed", String(theme === "dark"));
    button.title = `Switch to ${theme === "dark" ? "light" : "dark"} mode`;
    button.hidden = false;
  });
};

buttons.forEach((button) => {
  button.addEventListener("click", () => {
    preference = root.dataset.theme === "dark" ? "light" : "dark";
    applyTheme();

    try {
      localStorage.setItem("theme", preference);
    } catch {
      // Keep the user's choice for this visit even if it cannot be saved.
    }
  });
});

systemTheme.addEventListener("change", () => {
  if (preference === null) applyTheme();
});

window.addEventListener("storage", (event) => {
  if (event.key !== "theme" && event.key !== null) return;
  preference = parseTheme(event.newValue);
  applyTheme();
});

applyTheme();
