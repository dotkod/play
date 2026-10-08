import { ImageResponse } from "next/og";
import { googleFont } from "@/shared/og-font";
import { IconArt } from "./icon-art";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default async function Icon() {
  const font = await googleFont("Baloo 2", 800);
  return new ImageResponse(<IconArt size={512} />, { ...size, fonts: font ? [{ name: "Baloo", data: font, weight: 800, style: "normal" }] : undefined });
}
