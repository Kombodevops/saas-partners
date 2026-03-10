import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthGate } from "./auth-gate";
import { RestaurantesProvider } from "@/components/shared/restaurantes-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Komvo Event Manager",
  description: "Gestión de reservas y grupos para restaurantes.",
  icons: {
    icon: "/komvo/1-5c1ad366.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthGate>
          <RestaurantesProvider>{children}</RestaurantesProvider>
        </AuthGate>
      </body>
    </html>
  );
}
