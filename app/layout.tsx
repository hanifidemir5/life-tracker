import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Plus } from "lucide-react";
import Link from "next/link";

// 1. İMPORTLARIMIZI EKLEYELİM
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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

        {/* 2. TOAST CONTAINER'I EN ALTA EKLEYELİM */}
        <ToastContainer
          position="bottom-center" // Mesajlar altta çıksın
          autoClose={3000} // 3 saniye sonra kapansın
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </body>
    </html>
  );
}
