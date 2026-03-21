/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        discord: {
          primary: "#5865f2",
          green: "#57f287",
          yellow: "#fee75c",
          fuchsia: "#eb459e",
          red: "#ed4245",
          bg: "#141422",
          "bg-dark": "#0f0f17",
          "bg-darker": "#0a0a0f",
          sidebar: "#0f0f17",
          "channel-bar": "#0f0f17",
          input: "#1a1a2e",
          "text-primary": "#f2f3f5",
          "text-secondary": "#b5bac1",
          "text-muted": "#6d6f78",
          "text-link": "#00a8fc",
          "header-primary": "#f2f3f5",
          "header-secondary": "#b5bac1",
        },
      },
    },
  },
  plugins: [],
};
