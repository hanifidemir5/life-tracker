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
      <body className={`${inter.className} min-h-screen w-full mt-36`}>
        <QueryProvider>
          <LanguageProvider>
            <ThemeProvider>
              <Header />
              {children}

              {/* GLOBAL EKLE BUTONU - Sadece Ana Sayfada Göster (Layout'ta path kontrolü zor olduğu için burada bırakıp, kategori sayfasında üstüne binen butonu kullanabiliriz ama çirkin olur. En iyisi Layout'tan kaldırıp sayfalara eklemek.) */}
              {/* Şimdilik kaldırıyorum, çünkü her sayfaya (Home ve Category) özel ekledim/ekleyeceğim. */}
              {/* <Link href="/add"
              className="fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-xl transition-transform hover:scale-110 flex items-center justify-center z-50"
            >
              <Plus className="w-8 h-8" />
            </Link> */}

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
            </ThemeProvider>
          </LanguageProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
