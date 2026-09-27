import type { Metadata, Viewport } from "next";
import { Caveat, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
});

const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-caveat",
});

export const metadata: Metadata = {
  title: {
    default: "Walpole Bay Conditions",
    template: "%s · Walpole Bay Conditions",
  },
  description:
    "Today's tide, weather, bathing-water notes, and a provisional wall reading for Walpole Bay Tidal Pool, Margate. Not a swim score.",
  applicationName: "Walpole Bay Conditions",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Walpole Bay",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#f3efe6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${instrument.variable} ${plex.variable} ${caveat.variable}`}>
      <body>
        <Script id="walpole-sw" strategy="beforeInteractive">
          {`window.addEventListener("load",function(){var el=document.getElementById("offline-flag");function sync(){if(el)el.hidden=navigator.onLine}sync();window.addEventListener("online",sync);window.addEventListener("offline",sync);if("serviceWorker"in navigator)navigator.serviceWorker.register("/sw.js").catch(function(){})});`}
        </Script>
        {children}
      </body>
    </html>
  );
}
