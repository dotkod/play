import { ImageResponse } from "next/og";
import { googleFont } from "@/shared/og-font";
import { IconArt } from "./icon-art";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppIcon() {
  const font = await googleFont("Baloo 2", 800);
  return new ImageResponse(<IconArt size={180} />, { ...size, fonts: font ? [{ name: "Baloo", data: font, weight: 800, style: "normal" }] : undefined });
}
