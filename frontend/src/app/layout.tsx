import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Providers } from "@/lib/providers";
import "./globals.css";

// Fonts are self-hosted (latin-subset variable woff2 committed under ./fonts)
// rather than fetched from Google at build time. `next/font/google` downloads
// the font during the build, and that fetch is intermittently flaky on CI
// (it can throw "Cannot read properties of null" when Google returns an
// unexpected CSS shape). Shipping the files makes builds fully deterministic;
// the runtime result is identical — next/font self-hosts either way.
const inter = localFont({
  src: "./fonts/Inter-latin.woff2",
  weight: "100 900", // variable font: full weight range
  style: "normal",
  variable: "--font-inter",
  display: "swap",
});

const sora = localFont({
  src: "./fonts/Sora-latin.woff2",
  weight: "100 800", // variable font: covers 400/500/600/700 used in the UI
  style: "normal",
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Spend Jot — jot expenses in seconds",
  description:
    "A fast, friendly way to track your daily spending. Jot an expense, see where your money goes.",
  icons: { icon: "/brand/spendjot-icon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F4FF" },
    { media: "(prefers-color-scheme: dark)", color: "#13111C" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${sora.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
