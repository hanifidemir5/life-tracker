"use client";

import { useRouter } from "next/navigation";
import { Book, MapPin, Smile, Box } from "lucide-react";

export default function Home() {
  const router = useRouter();

  const categories = [
    {
      id: "book",
      name: "Kitaplarım",
      icon: <Book className="w-8 h-8 text-blue-500" />,
      color: "hover:bg-blue-50",
    },
    {
      id: "place",
      name: "Gezilen Yerler",
      icon: <MapPin className="w-8 h-8 text-red-500" />,
      color: "hover:bg-red-50",
    },
    {
      id: "lego",
      name: "Lego Dünyası",
      icon: <Box className="w-8 h-8 text-yellow-500" />,
      color: "hover:bg-yellow-50",
    },
    {
      id: "activity",
      name: "Aktiviteler",
      icon: <Smile className="w-8 h-8 text-green-500" />,
      color: "hover:bg-green-50",
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-3">
          Life Tracker
        </h1>
        <p className="text-gray-500 text-lg">
          Takip etmek istediğin listeyi seç.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl w-full">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => router.push(`/${cat.id}`)}
            className={`flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-sm border border-gray-200 transition-all transform hover:-translate-y-1 hover:shadow-lg ${cat.color}`}
          >
            <div className="mb-4 bg-gray-50 p-4 rounded-full">{cat.icon}</div>
            <span className="text-xl font-semibold text-gray-800">
              {cat.name}
            </span>
          </button>
        ))}
      </div>
    </main>
  );
}
