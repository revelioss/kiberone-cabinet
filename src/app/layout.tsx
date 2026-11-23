import type { Metadata, Viewport } from "next";
import { Manrope, Unbounded } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
});

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: {
    default: "Кабинет ученика",
    template: "%s · KIBERone Караганда",
  },
  description: "Личный кабинет ученика школы программирования KIBERone Караганда",
  applicationName: "KIBERone Караганда",
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    title: "KIBERone",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#17315c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className={`${manrope.variable} ${unbounded.variable} antialiased`}>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
