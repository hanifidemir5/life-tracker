import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/app/components/Header";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { createClient } from "@/app/lib/supabase/server";
import { LanguageProvider } from "@/app/contexts/LanguageContext";
import { ThemeProvider } from "@/app/contexts/ThemeContext";
import QueryProvider from "@/app/providers/QueryProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HeartSync",
  description: "A romantic diary to track and cherish precious moments together",
  icons: {
    icon: "/favicon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen w-full`}>
        <QueryProvider>
          <LanguageProvider>
            <ThemeProvider>
              <Header />
              {children}

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
            </ThemeProvider>
          </LanguageProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
