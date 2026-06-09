import { NextResponse } from "next/server";
import { requestGEMINIEmbedding, requestGEMINILLM } from "@/lib/gemini";
import { ADHD_REPORT_SYSTEM_PROMPT } from "@/lib/prompts/adhdReportSystemPrompt";
import { supabase, supabaseUrl } from "@/lib/supabase";

type NormalizedReportMetrics = {
  inattention_count: number;
  hyperactivity_count: number;
  cpt_attention: number;
  cpt_timeliness: number;
  cpt_impulsivity: number;
  cpt_hyperactivity: number;
  gaze_off_task_ratio: number;
  head_movement_variability: number;
  head_pose_forward_ratio: number;
  head_pose_left_ratio: number;
  head_pose_right_ratio: number;
  head_pose_down_ratio: number;
  head_yaw_std: number;
  head_pitch_std: number;
  head_roll_std: number;
  head_rotation_variability: number;
  head_attention_score: number;
  head_attention_score_adjusted: number;
  head_pose_raw: Record<string, unknown> | null;
  final_risk_level: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  choices?: Array<{
    message?: { content?: string };
    text?: string;
  }>;
  text?: string;
  content?: string;
  output_text?: string;
};

type RagMatch = {
  title?: string | null;
  content?: string | null;
  source?: string | null;
  page_start?: number | null;
  section?: string | null;
  similarity?: number | null;
};

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toJsonObject(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function getKoreanTimestamp() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().replace("T", " ").replace("Z", "");
}

function normalizeMetrics(body: Record<string, unknown>): NormalizedReportMetrics {
  const headRotationVariability = toNumber(
    body.head_rotation_variability ?? body.head_movement_variability,
  );

  return {
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
    final_risk_level:
      typeof body.final_risk_level === "string" && body.final_risk_level.trim()
        ? body.final_risk_level
        : "분석 완료",
  };
}

function buildRagQuery(metrics: NormalizedReportMetrics) {
  return [
    `ASRS 부주의 응답 수: ${metrics.inattention_count}`,
    `ASRS 과잉행동 및 충동성 응답 수: ${metrics.hyperactivity_count}`,
    `CPT 주의 지표: ${metrics.cpt_attention}`,
    `CPT 반응 속도 및 일관성 지표: ${metrics.cpt_timeliness}`,
    `CPT 충동성 지표: ${metrics.cpt_impulsivity}`,
    `CPT 과잉행동 보조 지표: ${metrics.cpt_hyperactivity}`,
    `시선 이탈 비율: ${metrics.gaze_off_task_ratio}`,
    `머리 움직임 변동성: ${metrics.head_movement_variability}`,
    `머리 회전 변동성: ${metrics.head_rotation_variability}`,
    `정면 유지 비율: ${metrics.head_pose_forward_ratio}`,
    `보정 집중도: ${metrics.head_attention_score_adjusted}`,
    `좌측 회전 비율: ${metrics.head_pose_left_ratio}`,
    `우측 회전 비율: ${metrics.head_pose_right_ratio}`,
    `하방 회전 비율: ${metrics.head_pose_down_ratio}`,
    `시스템 1차 참고 위험도: ${metrics.final_risk_level}`,
  ].join("\n");
}

function formatRetrievedContext(matches: RagMatch[]) {
  return matches
    .filter((match) => match.content)
    .map((match, index) => {
      const title = match.title || "참고 문서";
      const page = match.page_start ? `, p.${match.page_start}` : "";
      const section = match.section ? `, ${match.section}` : "";
      const source = match.source ? `, ${match.source}` : "";
      return `[${index + 1}] ${title}${page}${section}${source}\n${match.content}`;
    })
    .join("\n\n");
}

async function retrieveRagContext(metrics: NormalizedReportMetrics) {
  const queryEmbedding = await requestGEMINIEmbedding(buildRagQuery(metrics));
  const { data, error } = await supabase.rpc("match_rag_documents", {
    query_embedding: queryEmbedding,
    match_count: 5,
    match_threshold: 0.2,
    filter_category: null,
  });

  if (error) {
    console.error("RAG retrieval failed in /api/generate-report:", error);
    return "";
  }

  return formatRetrievedContext((data ?? []) as RagMatch[]);
}

function buildReportPrompt(metrics: NormalizedReportMetrics, retrievedContext: string) {
  return `다음 입력을 바탕으로 ADHD 스크리닝 리포트를 작성해 주세요.

입력:
${JSON.stringify(metrics, null, 2)}

RAG 참고 문맥:
${retrievedContext || "없음"}

주의:
- 입력에 없는 값은 만들지 마세요.
- RAG 참고 문맥이 있으면 우선 반영하되, 진단처럼 표현하지 마세요.
- 모든 문단은 <p>...</p> HTML 형식으로 작성하세요.
- 사용자를 ADHD로 진단하지 말고, 선별검사 결과와 가능성 중심으로 설명하세요.
- 머리 회전 변동성은 과제 중 자세 변화의 일관성을 보여주는 보조 지표로 설명하세요.
- 정면 유지 비율이 낮거나 보정 집중도가 낮으면 과제 중 주의가 흔들렸을 가능성을 부드럽게 설명하세요.
- head_rotation_variability가 12 이상이거나, head_pose_forward_ratio가 80 미만이거나, head_attention_score_adjusted가 65 미만이면 머리 자세 기반 집중 상태를 안정적이거나 높은 수준이라고 표현하지 마세요.
- 위 조건에 해당하면 머리 방향 변화가 잦았고 과제 몰입이 흔들렸을 가능성을 명시하세요.
- 문장은 차분하고 불안감을 과도하게 주지 않는 톤으로 작성하세요.
- 마지막 문단에는 이 결과가 진단이 아니라 선별검사 결과이며, 필요 시 전문의 상담이 필요하다는 점을 포함하세요.`;
}

function extractTextFromLLMResponse(data: GeminiResponse) {
  return (
    data?.candidates?.[0]?.content?.parts?.map((part) => part?.text ?? "").join("") ||
    data?.choices?.[0]?.message?.content ||
    data?.choices?.[0]?.text ||
    data?.text ||
    data?.content ||
    data?.output_text ||
    ""
  );
}

function ensureHtmlParagraphs(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("LLM response did not include report text.");
  }

  if (/<p[\s>]/i.test(trimmed)) {
    return trimmed;
  }

  return trimmed
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${line}</p>`)
    .join("");
}

async function generateReportWithLLM(metrics: NormalizedReportMetrics) {
  const retrievedContext = await retrieveRagContext(metrics);
  const prompt = buildReportPrompt(metrics, retrievedContext);
  const data = await requestGEMINILLM({
    prompt,
    systemInstruction: ADHD_REPORT_SYSTEM_PROMPT,
    model: process.env.GEMINI_LLM_MODEL ?? "gemini-2.5-flash",
    temperature: 0.45,
    max_tokens: 4200,
    topK: 40,
    topP: 0.9,
  });

  return ensureHtmlParagraphs(extractTextFromLLMResponse(data));
}

export async function POST(req: Request) {
  let stage = "parse-request";

  try {
    const body = (await req.json()) as Record<string, unknown>;
    stage = "normalize-metrics";
    const metrics = normalizeMetrics(body);

    stage = "generate-report";
    const report = await generateReportWithLLM(metrics);

    stage = "save-report";
    const { data, error } = await supabase
      .from("user_results")
      .insert({
        created_at: getKoreanTimestamp(),
        ...metrics,
        report,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error in /api/generate-report:", error);
      return NextResponse.json(
        { success: false, stage, error: error.message, details: error, supabaseUrl },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data, id: data?.id });
  } catch (err) {
    console.error(`Error in /api/generate-report at ${stage}:`, err);
    return NextResponse.json(
      { success: false, stage, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
