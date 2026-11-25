export const THEME_STORAGE_KEY = "theme";

// Read the preference before paint so the initial page uses the selected theme.
export const themeScript = `(() => {
  try {
    const saved = localStorage.getItem("${THEME_STORAGE_KEY}");
    const dark = saved ? saved === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
  } catch {}
})();`;
