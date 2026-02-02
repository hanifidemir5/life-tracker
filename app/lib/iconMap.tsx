import {
  Book, MapPin, Music, Camera, Gamepad2,
  Utensils, Coffee,
  Laptop, Tv,
  Palette, Dumbbell, Car,
  Home, Briefcase, GraduationCap, DollarSign,
  Plane, ShoppingCart, Clapperboard, Monitor, Circle
} from "lucide-react";

export const iconMap: Record<string, any> = {
  Book,        // Books / Reading
  MapPin,      // Travel / Places
  Music,       // Music / Albums
  Camera,      // Photography / Memories
  Gamepad2,    // Games
  Clapperboard: Clapperboard, // Movies (using Clapperboard alias if needed or just Clapperboard)
  Tv,          // Series / TV
  Utensils,    // Food / Restaurants
  Coffee,      // Cafes
  Laptop,      // Tech / Electronics
  Monitor,     // Software / Computery stuff
  Palette,     // Art / Hobbies
  Dumbbell,    // Sports / Gym
  Car,         // Vehicles
  Home,        // Living / House
  Briefcase,   // Work
  GraduationCap, // Education
  DollarSign,  // Finance
  Plane,       // Flights / Trips
  ShoppingCart // Shopping
};

export const getIconComponent = (iconName: string, className?: string) => {
  // Eğer iconName bir URL ise (http/https ile başlıyorsa) resim olarak göster
  if (iconName && (iconName.startsWith("http") || iconName.startsWith("/"))) {
    return (
      <img
        src={iconName}
        alt="Category Icon"
        className={`${className} object-cover rounded-full`}
      />
    );
  }

  const Icon = iconMap[iconName] || Circle;
  return <Icon className={className} />;
};

// GÜNCELLENMİŞ RENK LİSTESİ
export const colorOptions = [
  {
    name: "colorBlue",
    value: "hover:bg-blue-50",
    iconColor: "text-blue-500",
    dotColor: "bg-blue-500",
    borderColor: "border-blue-200",
  },
  {
    name: "colorRed",
    value: "hover:bg-red-50",
    iconColor: "text-red-500",
    dotColor: "bg-red-500",
    borderColor: "border-red-200",
  },
  {
    name: "colorGreen",
    value: "hover:bg-green-50",
    iconColor: "text-green-500",
    dotColor: "bg-green-500",
    borderColor: "border-green-200",
  },
  {
    name: "colorYellow",
    value: "hover:bg-yellow-50",
    iconColor: "text-yellow-500",
    dotColor: "bg-yellow-500",
    borderColor: "border-yellow-200",
  },
  {
    name: "colorPurple",
    value: "hover:bg-purple-50",
    iconColor: "text-purple-500",
    dotColor: "bg-purple-500",
    borderColor: "border-purple-200",
  },
  {
    name: "colorPink",
    value: "hover:bg-pink-50",
    iconColor: "text-pink-500",
    dotColor: "bg-pink-500",
    borderColor: "border-pink-200",
  },
  {
    name: "colorOrange",
    value: "hover:bg-orange-50",
    iconColor: "text-orange-500",
    dotColor: "bg-orange-500",
    borderColor: "border-orange-200",
  },
  {
    name: "colorTeal",
    value: "hover:bg-teal-50",
    iconColor: "text-teal-500",
    dotColor: "bg-teal-500",
    borderColor: "border-teal-200",
  },
  {
    name: "colorCyan",
    value: "hover:bg-cyan-50",
    iconColor: "text-cyan-500",
    dotColor: "bg-cyan-500",
    borderColor: "border-cyan-200",
  },
  {
    name: "colorLime",
    value: "hover:bg-lime-50",
    iconColor: "text-lime-500",
    dotColor: "bg-lime-500",
    borderColor: "border-lime-200",
  },
  {
    name: "colorEmerald",
    value: "hover:bg-emerald-50",
    iconColor: "text-emerald-500",
    dotColor: "bg-emerald-500",
    borderColor: "border-emerald-200",
  },
  {
    name: "colorFuchsia",
    value: "hover:bg-fuchsia-50",
    iconColor: "text-fuchsia-500",
    dotColor: "bg-fuchsia-500",
    borderColor: "border-fuchsia-200",
  },
  {
    name: "colorViolet",
    value: "hover:bg-violet-50",
    iconColor: "text-violet-500",
    dotColor: "bg-violet-500",
    borderColor: "border-violet-200",
  },
  {
    name: "colorIndigo",
    value: "hover:bg-indigo-50",
    iconColor: "text-indigo-500",
    dotColor: "bg-indigo-500",
    borderColor: "border-indigo-200",
  },
  {
    name: "colorRose",
    value: "hover:bg-rose-50",
    iconColor: "text-rose-500",
    dotColor: "bg-rose-500",
    borderColor: "border-rose-200",
  },
  {
    name: "colorAmber",
    value: "hover:bg-amber-50",
    iconColor: "text-amber-500",
    dotColor: "bg-amber-500",
    borderColor: "border-amber-200",
  },
  {
    name: "colorSlate",
    value: "hover:bg-slate-50",
    iconColor: "text-slate-500",
    dotColor: "bg-slate-500",
    borderColor: "border-slate-200",
  },
];
