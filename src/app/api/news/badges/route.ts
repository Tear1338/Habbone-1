import { NextResponse } from "next/server";
import { listPublicNewsBadges } from "@/server/directus/news";

export const runtime = "nodejs";
export const revalidate = 300;

export async function GET() {
  try {
    const data = await listPublicNewsBadges();
    return NextResponse.json(
      { data },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
        },
      },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        data: [],
        error: error?.message || "NEWS_BADGES_FETCH_FAILED",
        code: "NEWS_BADGES_FETCH_FAILED",
      },
      { status: 500 },
    );
  }
}
