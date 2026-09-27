import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({
  theme: "light",
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem("cw_theme");
      if (saved === "dark" || saved === "light") return saved;
      return "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    if (theme === "dark") {
      document.body.classList.add("dark-theme");
      document.body.classList.remove("light-theme");
    } else {
      document.body.classList.add("light-theme");
      document.body.classList.remove("dark-theme");
    }
    try {
      localStorage.setItem("cw_theme", theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const triggerTransition = () => {
    try {
      const root = document.documentElement;
      root.classList.add("theme-transitioning");
      if (window.__themeTransitionTimeout) {
        clearTimeout(window.__themeTransitionTimeout);
      }
      window.__themeTransitionTimeout = setTimeout(() => {
        root.classList.remove("theme-transitioning");
      }, 450);
    } catch {
      // ignore
    }
  };

  const toggleTheme = () => {
    triggerTransition();
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const setTheme = (newTheme) => {
    if (newTheme === "dark" || newTheme === "light") {
      triggerTransition();
      setThemeState(newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === "dark", toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: "light",
      isDark: false,
      toggleTheme: () => {},
      setTheme: () => {},
    };
  }
  return context;
}

export default ThemeContext;
