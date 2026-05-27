import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getKoreanTimestamp() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().replace("T", " ").replace("Z", "");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const { data, error } = await supabase
      .from("user_results")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.code === "PGRST116" ? 404 : 500 },
      );
    }

    return NextResponse.json({ success: true, data });
  }

  const { data, error } = await supabase
    .from("user_results")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { data, error } = await supabase
      .from("user_results")
      .insert({
        created_at: getKoreanTimestamp(),
        inattention_count: toNumber(body.inattention_count),
        hyperactivity_count: toNumber(body.hyperactivity_count),
        cpt_attention: toNumber(body.cpt_attention),
        cpt_timeliness: toNumber(body.cpt_timeliness),
        cpt_impulsivity: toNumber(body.cpt_impulsivity),
        cpt_hyperactivity: toNumber(body.cpt_hyperactivity),
        gaze_off_task_ratio: toNumber(body.gaze_off_task_ratio),
        head_movement_variability: toNumber(body.head_movement_variability),
        final_risk_level: body.final_risk_level ?? "분석 대기",
        report: body.report ?? "리포트 생성 대기 중",
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error in /api/analyze:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data, id: data?.id });
  } catch (err) {
    console.error("Unexpected error in /api/analyze POST:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
