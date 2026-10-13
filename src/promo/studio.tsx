"use client";

/** Picks what /promo renders: ?view=avatar | monogram | wordmark | post-welcome | post-anne | video */

import { useState } from "react";
import { AvatarMonogram, AvatarWordmark, WordmarkTransparent } from "./brand";
import { PostAnneMaju, PostWelcome } from "./posts";
import { IntroVideo } from "./video";

export default function PromoStudio() {
  const [view] = useState(() => (typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("view") ?? ""));
  switch (view) {
    case "avatar":
      return <AvatarWordmark />;
    case "monogram":
      return <AvatarMonogram />;
    case "wordmark":
      return <WordmarkTransparent />;
    case "post-welcome":
      return <PostWelcome />;
    case "post-anne":
      return <PostAnneMaju />;
    case "video":
      return <IntroVideo />;
    default:
      return <p className="p-6 font-bold">?view=avatar | monogram | wordmark | post-welcome | post-anne | video</p>;
  }
}
