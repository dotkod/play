import { NextResponse } from "next/server";
import { getSessionUsername } from "@/shared/server/auth";

export async function GET() {
  const username = await getSessionUsername();
  return NextResponse.json({ username });
}
