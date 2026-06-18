
import { useId, useEffect } from "react"
import { Check, Minus } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useTheme } from "@/contexts/ThemeContext"
import { useTranslation } from "react-i18next"

// Preload theme preview images once per app session
let themePreviewCacheInitialized = false;
function preloadThemePreviewImages(urls: string[]) {
  try {
    urls.forEach((url) => {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
    });
  } catch {
    // no-op
  }
}

export default function ThemeSelector() {
  const id = useId()
  const { theme, setTheme, effectiveTheme  } = useTheme()
  const { t } = useTranslation()
  
  const items = [
    { value: "system", label: t("system"),  image: "/ui-system.png" },
    { value: "light",  label: t("light"),   image: "/ui-light.png" },
    { value: "dark",   label: t("dark"),    image: "/ui-dark.png" },
  ]
  const isInverted = effectiveTheme === "light"

  // Preload thumbnails on first mount
  useEffect(() => {
    if (!themePreviewCacheInitialized) {
      preloadThemePreviewImages(items.map((i) => i.image))
      themePreviewCacheInitialized = true
    }
  }, [items])

  return (
    <fieldset className="space-y-4">
      <legend className="text-foreground text-sm leading-none font-medium">
        {t("choose_a_theme")}
      </legend>

      <RadioGroup
        className="flex gap-3"
        value={theme}
        onValueChange={(value) => setTheme(value as "system" | "light" | "dark")}
      >
        {items.map((item) => {
          const isSel = theme === item.value
          // if this element is non-invertable *and* we’re in inverted mode,
          // force it back to the “un-selected” styles:
          const highlightClasses = isSel
            ? (isInverted
                ? "border-input bg-accent"
                : "border-ring bg-accent")
            : (isInverted ? "border-ring" : "border-input")

          return (
            <label key={item.value} className="cursor-pointer">
              <RadioGroupItem
                id={`${id}-${item.value}`}
                value={item.value}
                className="sr-only"
              />

              <img
                src={item.image}
                alt={item.label}
                width={88}
                height={70}
                loading="eager"
                decoding="async"
                className={`
                  relative overflow-hidden rounded-md border shadow-xs
                  transition-[color,box-shadow] outline-none non-invertable
                  ${highlightClasses}
                `}
              />

              <span
                className={`
                  mt-2 flex items-center gap-1
                  ${isSel ? "text-foreground" : "text-muted-foreground/70"}
                `}
              >
                {isSel ? (
                  <Check size={16} aria-hidden="true" />
                ) : (
                  <Minus size={16} aria-hidden="true" />
                )}
                <span className="text-xs font-medium">{item.label}</span>
              </span>
            </label>
          )
        })}
      </RadioGroup>
    </fieldset>
  )
}
