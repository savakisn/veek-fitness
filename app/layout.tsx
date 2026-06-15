import type { Metadata, Viewport } from "next";
import { Lato } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/bottom-nav";
import { Pwa } from "@/components/pwa";
import { Toaster } from "@/components/ui/sonner";

// Lato wired as --font-sans (the variable globals.css expects). Fixes the serif
// fallback bug and matches the company typeface.
const lato = Lato({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cadence",
  description: "Move well, eat well, together.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Cadence" },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${lato.variable} dark h-full antialiased`} style={{ colorScheme: "dark" }}>
      <body className="bg-background min-h-full">
        <div className="mx-auto min-h-dvh max-w-md pb-[calc(5rem+env(safe-area-inset-bottom))]">{children}</div>
        <BottomNav />
        <Pwa />
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
