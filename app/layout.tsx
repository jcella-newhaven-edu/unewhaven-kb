import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer"
import { themeScript } from "@/components/ThemeToggle";

export const metadata: Metadata = { title: "Knowledge Base" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the theme script adds the "dark" class before React loads.
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Navbar />
        {children}
        <Footer/>
      </body>
    </html>
  );
}
