import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  effectiveTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>("system");

  const getEffectiveTheme = (): "light" | "dark" => {
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return theme as "light" | "dark";
  };

  const [effectiveTheme, setEffectiveTheme] = useState<"light" | "dark">(
    getEffectiveTheme()
  );

  useEffect(() => {
    const updateEffectiveTheme = () => {
      setEffectiveTheme(getEffectiveTheme());
    };

    updateEffectiveTheme();

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", updateEffectiveTheme);
      return () =>
        mediaQuery.removeEventListener("change", updateEffectiveTheme);
    }
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark", "invert");
    root.classList.add(effectiveTheme);

    // only add the "invert" class in light mode
    if (effectiveTheme === "light") {
      root.classList.add("invert");
    }
  }, [effectiveTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, effectiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
