// app/layout.tsx dosyasının içi (ilgili kısımları güncelle)

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// İkonu import etmeyi unutma
import { Plus } from "lucide-react";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Life Tracker",
  description: "Hayatını organize et",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}

        {/* GLOBAL EKLE BUTONU */}
        <Link
          href="/add"
          className="fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-xl transition-transform hover:scale-110 flex items-center justify-center z-50"
        >
          <Plus className="w-8 h-8" />
        </Link>
      </body>
    </html>
  );
}
