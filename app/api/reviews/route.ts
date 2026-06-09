import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type ReviewRow = {
  id: string;
  report_id: string | null;
  rating: number;
  content: string;
  created_at: string;
};

function getKoreanTimestamp() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().replace("T", " ").replace("Z", "");
}

function toRating(value: unknown) {
  const rating = Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return null;
  }

  return rating;
}

function toContent(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 500);
}

function toReportId(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rating = toRating(searchParams.get("rating"));
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 50, 1), 100);

  let query = supabase
    .from("reviews")
    .select("id, report_id, rating, content, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (rating) {
    query = query.eq("rating", rating);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data: (data ?? []) as ReviewRow[] });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const rating = toRating(body.rating);
    const content = toContent(body.content);

    if (!rating) {
      return NextResponse.json(
        { success: false, error: "별점을 1점부터 5점까지 선택해 주세요." },
        { status: 400 },
      );
    }

    if (!content) {
      return NextResponse.json(
        { success: false, error: "리뷰 내용을 입력해 주세요." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("reviews")
      .insert({
        report_id: toReportId(body.report_id),
        rating,
        content,
        created_at: getKoreanTimestamp(),
      })
      .select("id, report_id, rating, content, created_at")
      .single();

    if (error) {
      console.error("Supabase insert error in /api/reviews:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Unexpected error in /api/reviews POST:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
