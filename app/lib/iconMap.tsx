import {
  Book,
  MapPin,
  Smile,
  Box,
  Circle,
  Heart,
  Music,
  Camera,
  Coffee,
  Gamepad2,
} from "lucide-react";

export const iconMap: Record<string, any> = {
  Book,
  MapPin,
  Smile,
  Box,
  Heart,
  Music,
  Camera,
  Coffee,
  Gamepad2,
  Circle,
};

export const getIconComponent = (iconName: string, className?: string) => {
  const Icon = iconMap[iconName] || Circle;
  return <Icon className={className} />;
};

// GÜNCELLENMİŞ RENK LİSTESİ
// 'dotColor' alanlarını ekledik, böylece replace yapmaya gerek kalmadı.
export const colorOptions = [
  {
    name: "Mavi",
    value: "hover:bg-blue-50",
    iconColor: "text-blue-500",
    dotColor: "bg-blue-500",
  },
  {
    name: "Kırmızı",
    value: "hover:bg-red-50",
    iconColor: "text-red-500",
    dotColor: "bg-red-500",
  },
  {
    name: "Yeşil",
    value: "hover:bg-green-50",
    iconColor: "text-green-500",
    dotColor: "bg-green-500",
  },
  {
    name: "Sarı",
    value: "hover:bg-yellow-50",
    iconColor: "text-yellow-500",
    dotColor: "bg-yellow-500",
  },
  {
    name: "Mor",
    value: "hover:bg-purple-50",
    iconColor: "text-purple-500",
    dotColor: "bg-purple-500",
  },
  {
    name: "Pembe",
    value: "hover:bg-pink-50",
    iconColor: "text-pink-500",
    dotColor: "bg-pink-500",
  },
];
