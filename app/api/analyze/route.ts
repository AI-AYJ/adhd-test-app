import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNonEmptyString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function toJsonObject(value: unknown) {
  return value && typeof value === "object" ? value : null;
}

function getKoreanTimestamp() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().replace("T", " ").replace("Z", "");
}

function buildAnalyzePayload(body: Record<string, unknown>) {
  const headRotationVariability = toNumber(
    body.head_rotation_variability ?? body.head_movement_variability,
  );

  return {
    created_at: getKoreanTimestamp(),
    inattention_count: toNumber(body.inattention_count),
    hyperactivity_count: toNumber(body.hyperactivity_count),
    cpt_attention: toNumber(body.cpt_attention),
    cpt_timeliness: toNumber(body.cpt_timeliness),
    cpt_impulsivity: toNumber(body.cpt_impulsivity),
    cpt_hyperactivity: toNumber(body.cpt_hyperactivity),
    gaze_off_task_ratio: toNumber(body.gaze_off_task_ratio),
    head_movement_variability: headRotationVariability,
    head_pose_forward_ratio: toNumber(body.head_pose_forward_ratio),
    head_pose_left_ratio: toNumber(body.head_pose_left_ratio),
    head_pose_right_ratio: toNumber(body.head_pose_right_ratio),
    head_pose_down_ratio: toNumber(body.head_pose_down_ratio),
    head_yaw_std: toNumber(body.head_yaw_std),
    head_pitch_std: toNumber(body.head_pitch_std),
    head_roll_std: toNumber(body.head_roll_std),
    head_rotation_variability: headRotationVariability,
    head_attention_score: toNumber(body.head_attention_score),
    head_attention_score_adjusted: toNumber(body.head_attention_score_adjusted),
    head_pose_raw: toJsonObject(body.head_pose_raw),
    final_risk_level: toNonEmptyString(body.final_risk_level, "분석 대기"),
    report: toNonEmptyString(body.report, "리포트 생성 대기 중"),
  };
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

    return NextResponse.json({ success: true, data });``
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
    const body = (await req.json()) as Record<string, unknown>;
    const payload = buildAnalyzePayload(body);

    const { data, error } = await supabase
      .from("user_results")
      .insert(payload)
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
