/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        // Inter
        Inter: ["Inter-Regular", "sans-serif"],
        InterBold: ["Inter-Bold", "sans-serif"],
        InterBlack: ["Inter-Black", "sans-serif"],
        InterMedium: ["Inter-Medium", "sans-serif"],
        InterLight: ["Inter-Light-BETA", "sans-serif"],
        InterExtraBold: ["Inter-ExtraBold", "sans-serif"],
        InterExtraLight: ["Inter-ExtraLight-BETA", "sans-serif"],
        InterSemiBold: ["Inter-SemiBold", "sans-serif"],
        InterThin: ["Inter-Thin-BETA", "sans-serif"],
      
        // Satoshi
        Satoshi: ["Satoshi-Regular", "sans-serif"],
        SatoshiBold: ["Satoshi-Bold", "sans-serif"],
        SatoshiBlack: ["Satoshi-Black", "sans-serif"],
        SatoshiMedium: ["Satoshi-Medium", "sans-serif"],
        SatoshiLight: ["Satoshi-Light", "sans-serif"],
        SatoshiItalic: ["Satoshi-Italic", "sans-serif"], // exists
        SatoshiMediumItalic: ["Satoshi-MediumItalic", "sans-serif"],
      
        // Space Grotesk
        SpaceGrotesk: ["SpaceGrotesk-Regular", "sans-serif"],
        SpaceGroteskBold: ["SpaceGrotesk-Bold", "sans-serif"],
        SpaceGroteskMedium: ["SpaceGrotesk-Medium", "sans-serif"],
        SpaceGroteskLight: ["SpaceGrotesk-Light", "sans-serif"],
        SpaceGroteskSemiBold: ["SpaceGrotesk-SemiBold", "sans-serif"],
      }
      
    },
  },
  plugins: [],
}
