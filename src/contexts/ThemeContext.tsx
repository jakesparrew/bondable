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
  const [theme, setTheme] = useState<Theme>("light");

  // Bondable is light-only: a real light theme via :root tokens (no dark, no invert hack).
  const getEffectiveTheme = (): "light" | "dark" => "light";

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
    // Force a real light theme. No "dark", no "invert" filter hack.
    const root = document.documentElement;
    root.classList.remove("light", "dark", "invert");
    root.classList.add("light");
  }, [effectiveTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, effectiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
