import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { themeScript } from "@/lib/theme";

const geist = localFont({
  src: "./fonts/geist-latin.woff2",
  weight: "400 800",
  variable: "--font-kb-geist",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "IT Knowledge Base | University of New Haven",
    template: "%s | IT Knowledge Base",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the theme script adds the "dark" class before React loads.
    <html lang="en" className={`h-full antialiased ${geist.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <a
          href="#kb-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-60 focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:text-link focus:outline-2 focus:outline-focus"
        >
          Skip to content
        </a>
        <Navbar />
        <div id="kb-content" tabIndex={-1} className="flex flex-1 flex-col focus:outline-none">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
