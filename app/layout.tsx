import type { Metadata, Viewport } from "next";
import { Newsreader, Hanken_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const serif = Newsreader({ variable: "--font-serif", subsets: ["latin"], style: ["normal", "italic"], weight: ["400", "500"] });
const body = Hanken_Grotesk({ variable: "--font-body", subsets: ["latin"] });
const code = IBM_Plex_Mono({ variable: "--font-code", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Ahead · Capture before. Rebuild after.",
  description:
    "Save your hair colour and brows before chemotherapy. Later, see your brows redrawn and wigs matched to the hair you saved, on your own face.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f3ee" },
    { media: "(prefers-color-scheme: dark)", color: "#111614" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${serif.variable} ${body.variable} ${code.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
