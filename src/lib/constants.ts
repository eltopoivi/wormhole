// Deep Dark Theme — Premium Discord-inspired palette
export const COLORS = {
  // Backgrounds (deepest to lightest)
  bgDeepest: "#1a1a1e",    // Deepest layer
  bgDark: "#1e1f23",       // Sidebar background
  bgBase: "#2b2d31",       // Main content background (dark gray)
  bgElevated: "#32343a",   // Cards, elevated surfaces
  bgFloat: "#383a40",      // Floating elements, modals
  bgHover: "#3f4147",      // Hover states
  bgActive: "#45474e",     // Active/selected states

  // Own messages highlight
  bgOwnMessage: "rgba(88, 101, 242, 0.08)",

  // Accent
  accent: "#5865f2",       // Discord blurple
  accentHover: "#4752c4",
  accentLight: "rgba(88, 101, 242, 0.15)",
  accentGlow: "rgba(88, 101, 242, 0.3)",

  // Status colors
  green: "#57f287",
  yellow: "#fee75c",
  red: "#ed4245",
  fuchsia: "#eb459e",
  orange: "#f47b67",

  // Text
  textPrimary: "#f2f3f5",
  textSecondary: "#b5bac1",
  textMuted: "#6d6f78",
  textFaint: "#44464f",
  textLink: "#00a8fc",

  // Borders
  border: "rgba(255,255,255,0.06)",
  borderLight: "rgba(255,255,255,0.1)",
  borderAccent: "rgba(88, 101, 242, 0.4)",

  // Glass
  glass: "rgba(20, 20, 34, 0.75)",
  glassBorder: "rgba(255,255,255,0.08)",

  // Input
  inputBg: "#1a1a2e",
  inputBorder: "rgba(255,255,255,0.08)",

  // Scrollbar
  scrollbar: "rgba(255,255,255,0.1)",
  scrollbarHover: "rgba(255,255,255,0.2)",

  // Online indicator
  online: "#23a55a",
} as const;

// Legacy alias for existing code
export const DISCORD_COLORS = {
  primary: COLORS.accent,
  green: COLORS.green,
  yellow: COLORS.yellow,
  fuchsia: COLORS.fuchsia,
  red: COLORS.red,
  bg: COLORS.bgBase,
  bgDark: COLORS.bgDark,
  bgDarker: COLORS.bgDeepest,
  sidebar: COLORS.bgDark,
  channelBar: COLORS.bgDark,
  input: COLORS.inputBg,
  textPrimary: COLORS.textPrimary,
  textSecondary: COLORS.textSecondary,
  textMuted: COLORS.textMuted,
  textLink: COLORS.textLink,
  headerPrimary: COLORS.textPrimary,
  headerSecondary: COLORS.textSecondary,
} as const;

export const DEFAULT_AVATAR_URL =
  "https://cdn.discordapp.com/embed/avatars/0.png";
