import "./globals.css";
import type { Metadata } from "next";
import { CommerceProvider } from "@/lib/commerce";
import { LanguageProvider } from "@/lib/language";

export const metadata: Metadata = {
  metadataBase: new URL("https://miobeauty.shop"),
  title: {
    default: "MIO Beauty",
    template: "%s | MIO Beauty",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      {
        url: "/android-chrome-192x192.png",
        type: "image/png",
        sizes: "192x192",
      },
      {
        url: "/android-chrome-512x512.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <LanguageProvider>
          <CommerceProvider>{children}</CommerceProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
