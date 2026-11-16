import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  Instrument_Serif,
  Inter,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ThreadCard — Turn Threads posts into images",
  description:
    "Paste a public Threads post link, style it, and download a crisp PNG. Free, no sign-up, no watermark.",
  applicationName: "ThreadCard",
  openGraph: {
    title: "ThreadCard — Turn Threads posts into images",
    description:
      "Paste a public Threads post link, style it, and download a crisp PNG.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "ThreadCard",
    description: "Turn Threads posts into shareable images.",
  },
};

const themeScript = `(function(){try{var stored=localStorage.getItem("threadcard.theme");var dark=stored?stored==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",dark);document.documentElement.style.colorScheme=dark?"dark":"light";}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${inter.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <noscript>
          <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-center text-sm text-amber-900">
            Aktifkan JavaScript untuk memakai ThreadCard. / Enable JavaScript
            to use ThreadCard.
          </div>
        </noscript>
        {children}
      </body>
    </html>
  );
}
