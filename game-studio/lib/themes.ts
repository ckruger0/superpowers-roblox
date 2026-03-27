// Single unified palette — warm parchment base, lavender accent
export const palette = {
  // Backgrounds
  bg: "#ece5dd",
  bgCard: "#f5f0eb",
  bgCardHover: "#ebe3da",
  bgInput: "#f5f0eb",

  // Borders
  border: "#e0d5c9",
  borderLight: "#e8dfd6",
  borderDashed: "#cfc2b4",

  // Text
  textPrimary: "#3d2e1e",
  textSecondary: "#5c4f3d",
  textMuted: "#8a7d6b",
  textFaint: "#b0a48e",

  // Accent (lavender)
  accent: "#c5a3d9",
  accentDark: "#8b6baa",
  accentBg: "#e8daf0",
  accentText: "#6b4d8a",

  // Status
  success: "#7bb89a",
  successBg: "#d4e8de",
  successText: "#3d6b55",

  // Section colors (for GDD cards)
  rose: { text: "#b44d6e", bg: "#fdf2f5", border: "#f0d0da" },
  emerald: { text: "#3d7a5c", bg: "#f0f8f4", border: "#c8e4d4" },
  amber: { text: "#8b6520", bg: "#fdf8f0", border: "#f0dfc4" },
  sky: { text: "#2d6a8a", bg: "#f0f7fb", border: "#c4dff0" },
};

// Re-export Tab type for backwards compat
export type Tab = "ideate" | "design" | "create";

// Theme object for components that still reference it
export interface Theme {
  toolbarBg: string;
  toolbarBorder: string;
  toolbarActiveBtn: string;
  toolbarText: string;
  toolbarHover: string;
  thinkingColor: string;
  bubbleBg: string;
  bubbleBorder: string;
  bubbleAccent: string;
  bubbleBtnBg: string;
  bubbleBtnBorder: string;
  bubbleBtnHover: string;
  canvasBg: string;
}

// Single theme used everywhere
export const theme: Theme = {
  toolbarBg: `bg-[${palette.bgCard}]`,
  toolbarBorder: `border-[${palette.borderLight}]`,
  toolbarActiveBtn: `bg-[${palette.accent}] text-white`,
  toolbarText: `text-[${palette.textMuted}]`,
  toolbarHover: `hover:text-[${palette.textSecondary}] hover:bg-[${palette.bgCardHover}]`,
  thinkingColor: `bg-[${palette.accent}]`,
  bubbleBg: `bg-[${palette.bgCard}]`,
  bubbleBorder: `border-[${palette.borderLight}]`,
  bubbleAccent: `text-[${palette.accentDark}]`,
  bubbleBtnBg: `bg-[${palette.bgCardHover}]`,
  bubbleBtnBorder: `border-[${palette.border}]`,
  bubbleBtnHover: `hover:bg-[${palette.accentBg}] hover:border-[${palette.accent}] hover:text-[${palette.accentText}]`,
  canvasBg: palette.bg,
};

// Keep themes export for any code that still references it
export const themes: Record<Tab, Theme> = {
  ideate: theme,
  design: theme,
  create: theme,
};
