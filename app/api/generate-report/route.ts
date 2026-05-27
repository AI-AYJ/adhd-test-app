import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type ReportMetrics = {
  inattention_count?: number;
  hyperactivity_count?: number;
  cpt_attention?: number;
  cpt_timeliness?: number;
  cpt_impulsivity?: number;
  cpt_hyperactivity?: number;
  gaze_off_task_ratio?: number;
  head_movement_variability?: number;
  final_risk_level?: string | null;
};

type NormalizedReportMetrics = {
  inattention_count: number;
  hyperactivity_count: number;
  cpt_attention: number;
  cpt_timeliness: number;
  cpt_impulsivity: number;
  cpt_hyperactivity: number;
  gaze_off_task_ratio: number;
  head_movement_variability: number;
  final_risk_level: string;
};

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getKoreanTimestamp() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().replace("T", " ").replace("Z", "");
}

function normalizeMetrics(body: Record<string, unknown>): NormalizedReportMetrics {
  return {
    inattention_count: toNumber(body.inattention_count),
    hyperactivity_count: toNumber(body.hyperactivity_count),
    cpt_attention: toNumber(body.cpt_attention),
    cpt_timeliness: toNumber(body.cpt_timeliness),
    cpt_impulsivity: toNumber(body.cpt_impulsivity),
    cpt_hyperactivity: toNumber(body.cpt_hyperactivity),
    gaze_off_task_ratio: toNumber(body.gaze_off_task_ratio),
    head_movement_variability: toNumber(body.head_movement_variability),
    final_risk_level:
      typeof body.final_risk_level === "string" && body.final_risk_level.trim()
        ? body.final_risk_level
        : "분석 완료",
  };
}

function buildPrompt(metrics: NormalizedReportMetrics) {
  return `당신은 ADHD 선별검사 결과를 보호자와 성인 사용자에게 설명하는 정신건강의학과 임상심리 전문가입니다.

아래 설문 및 CPT, 시선 추적, 움직임 데이터를 바탕으로 병원에서 제공하는 검사 결과지처럼 친절하고 정확한 한국어 리포트를 작성해 주세요.

[입력 데이터]
- 설문 부주의 응답 수: ${metrics.inattention_count}
- 설문 과활동성/충동성 응답 수: ${metrics.hyperactivity_count}
- CPT 정반응 수: ${metrics.cpt_attention}
- CPT 평균 반응시간: ${metrics.cpt_timeliness}ms
- CPT 오경보 수: ${metrics.cpt_impulsivity}
- CPT 과활동성 점수: ${metrics.cpt_hyperactivity}
- 과제 중 시선 이탈률: ${metrics.gaze_off_task_ratio}%
- 머리 움직임 변동성: ${metrics.head_movement_variability}
- 시스템 산출 위험도: ${metrics.final_risk_level}

[작성 형식]
1. 반드시 HTML 문단 형태로만 작성해 주세요. 각 문단은 <p>...</p>로 감싸 주세요.
2. 각 문단의 맨 앞에는 <strong>검사 개요</strong>, <strong>검사 태도 및 수행 흐름</strong>, <strong>핵심 소견</strong>, <strong>주의 지속성</strong>, <strong>반응 속도와 일관성</strong>, <strong>충동성 및 반응 조절</strong>, <strong>시선 및 움직임</strong>, <strong>일상 기능에서의 의미</strong>, <strong>종합 의견</strong>, <strong>권장 사항</strong>, <strong>추적 관찰 포인트</strong> 중 하나의 제목을 넣어 주세요.
3. 진단을 단정하지 말고, "선별검사 결과", "가능성", "추가 평가가 필요할 수 있음"처럼 임상적으로 조심스러운 표현을 사용해 주세요.
4. 숫자를 그대로 나열하지 말고, 각 지표가 실제 집중, 반응 억제, 과제 유지, 시선 유지에 어떤 의미를 갖는지 충분히 풀어서 설명해 주세요.
5. 검사 결과가 높게 나온 영역과 상대적으로 안정적인 영역을 구분해서 설명해 주세요.
6. 보호자 또는 사용자가 바로 이해할 수 있도록 쉬운 표현을 쓰되, 결과지처럼 전문적인 문장으로 작성해 주세요.
7. 불안감을 과하게 키우지 말고, 필요한 경우 전문가 상담, 수면/환경/학습 습관 점검, 추가 종합심리검사를 권장해 주세요.
8. 전체 길이는 11~14문단으로 작성하고, 각 문단은 2~4문장으로 충분히 길게 작성해 주세요.
9. 마지막 문단에는 이 검사가 확정 진단이 아니라 선별 목적이라는 점과, 일상 기능 저하가 있으면 전문가 상담이 필요하다는 점을 분명히 적어 주세요.`;
}

function extractTextFromLLMResponse(data: any) {
  return (
    data?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text ?? "").join("") ||
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
    throw new Error("LLM 응답에 리포트 내용이 없습니다.");
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
  const apiKey = process.env.JAEMINAI_API_KEY;
  const llmUrl = process.env.JAEMINAI_LLM_URL;

  if (!apiKey || !llmUrl) {
    throw new Error("JAEMINAI_API_KEY 또는 JAEMINAI_LLM_URL 환경변수가 없습니다.");
  }

  const prompt = buildPrompt(metrics);
  const isGeminiUrl = llmUrl.includes("generativelanguage.googleapis.com");
  const url = isGeminiUrl
    ? `${llmUrl}${llmUrl.includes("?") ? "&" : "?"}key=${apiKey}`
    : llmUrl;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(isGeminiUrl ? {} : { Authorization: `Bearer ${apiKey}` }),
    },
    body: JSON.stringify(
      isGeminiUrl
        ? {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.45,
              topK: 40,
              topP: 0.9,
              maxOutputTokens: 4200,
            },
          }
        : {
            model: process.env.JAEMINAI_LLM_MODEL ?? "jaeminai-llm",
            prompt,
            temperature: 0.45,
            max_tokens: 4200,
          },
    ),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`LLM 요청 실패: ${JSON.stringify(data)}`);
  }

  return ensureHtmlParagraphs(extractTextFromLLMResponse(data));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const metrics = normalizeMetrics(body);
    const report = await generateReportWithLLM(metrics);

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
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data, id: data?.id });
  } catch (err) {
    console.error("Error in /api/generate-report:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
