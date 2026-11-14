import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({
  theme: "dark",
  isDark: true,
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem("cw_theme");
      if (saved === "dark" || saved === "light") return saved;
      return "dark";
    } catch {
      return "dark";
    }
  });

  const applyThemeToDom = (newTheme) => {
    const root = document.documentElement;
    root.setAttribute("data-theme", newTheme);
    if (newTheme === "dark") {
      document.body.classList.add("dark-theme");
      document.body.classList.remove("light-theme");
    } else {
      document.body.classList.add("light-theme");
      document.body.classList.remove("dark-theme");
    }
    try {
      localStorage.setItem("cw_theme", newTheme);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    applyThemeToDom(theme);
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
      }, 350);
    } catch {
      // ignore
    }
  };

  const changeTheme = (newTheme) => {
    if (newTheme !== "dark" && newTheme !== "light") return;

    // Use native View Transition API when available for ultra-smooth GPU cross-fade
    if (
      typeof document !== "undefined" &&
      document.startViewTransition &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      document.startViewTransition(() => {
        applyThemeToDom(newTheme);
        setThemeState(newTheme);
      });
    } else {
      triggerTransition();
      applyThemeToDom(newTheme);
      setThemeState(newTheme);
    }
  };

  const toggleTheme = () => {
    changeTheme(theme === "dark" ? "light" : "dark");
  };

  const setTheme = (newTheme) => {
    changeTheme(newTheme);
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
      theme: "dark",
      isDark: true,
      toggleTheme: () => {},
      setTheme: () => {},
    };
  }
  return context;
}

export default ThemeContext;
