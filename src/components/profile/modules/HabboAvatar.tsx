"use client";

import { buildHabboAvatarUrl } from "@/lib/habbo-imaging";

export type HabboAvatarProps = {
  nick: string;
  size?: 's' | 'm' | 'l';
  className?: string;
};

export function HabboAvatar({ nick, size = 'm', className }: HabboAvatarProps) {
  const src = buildHabboAvatarUrl(nick, {
    direction: 2,
    head_direction: 3,
    img_format: "png",
    size,
  });
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={nick} className={className ?? "w-10 h-10 rounded"} />;
}

export function HabboHeadOnly({ nick, size = 's', className }: HabboAvatarProps) {
  const src = buildHabboAvatarUrl(nick || "", {
    direction: 2,
    head_direction: 3,
    img_format: "png",
    size,
    headonly: 1,
  });
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={nick} className={className ?? "w-12 h-12 rounded"} />;
}
