"use client";

import { useSession } from "next-auth/react";
import { buildHabboAvatarUrl } from "@/lib/habbo-imaging";

const RANDOM_FIGURES = [
  "hr-3163-1395-42.hd-180-10.ch-3030-1408-92.lg-3116-1408-92.sh-3115-1408-92",
  "hr-893-42.hd-180-1.ch-210-92.lg-270-92.sh-290-92",
  "hr-115-42.hd-195-19.ch-3030-92.lg-270-92.sh-290-92",
  "hr-828-42.hd-180-3.ch-255-92.lg-280-92.sh-295-92.wa-2007-92",
  "hr-545-42.hd-600-10.ch-665-92.lg-710-92.sh-725-92.he-1610-92",
];

function getRandomFigure() {
  return RANDOM_FIGURES[Math.floor(Math.random() * RANDOM_FIGURES.length)];
}

export default function SadAvatar({ className }: { className?: string }) {
  const { data: session } = useSession();
  const nick = (session?.user as any)?.nick;

  // If logged in: use the user's avatar with sad gesture
  // If not: use a random figure
  const src = nick
    ? buildHabboAvatarUrl(nick, {
        direction: 2,
        head_direction: 3,
        gesture: "sad",
        action: "wav",
        size: "l",
        img_format: "png",
      })
    : `https://www.habbo.fr/habbo-imaging/avatarimage?figure=${getRandomFigure()}&direction=2&head_direction=3&gesture=sad&action=wav&size=l&img_format=png`;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={className || "h-[130px] w-auto image-pixelated"}
      onError={(e) => {
        // Fallback to random figure if user avatar fails
        const img = e.target as HTMLImageElement;
        if (!img.dataset.retried) {
          img.dataset.retried = "1";
          img.src = `https://www.habbo.fr/habbo-imaging/avatarimage?figure=${getRandomFigure()}&direction=2&head_direction=3&gesture=sad&action=wav&size=l&img_format=png`;
        }
      }}
    />
  );
}
