"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ReportData = {
  id: string;
  created_at: string;
  final_risk_level: string | null;
  report: string | null;
  inattention_count: number;
  hyperactivity_count: number;
  cpt_attention: number;
  cpt_timeliness: number;
  cpt_impulsivity: number;
  cpt_hyperactivity: number;
  gaze_off_task_ratio: number;
  head_movement_variability: number;
};

type MetricTone = "emerald" | "amber" | "rose" | "blue";

type Metric = {
  label: string;
  value: string;
  detail: string;
  score: number;
  tone: MetricTone;
};

const toneClass: Record<MetricTone, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  blue: "bg-blue-500",
};

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function percent(value: number) {
  return `${Math.round(value)}%`;
}

function getTone(score: number): MetricTone {
  if (score >= 70) return "rose";
  if (score >= 40) return "amber";
  return "emerald";
}

function getConcernLabel(score: number) {
  if (score >= 70) return "높은 주의";
  if (score >= 40) return "관찰 필요";
  return "양호 범위";
}

function buildMetrics(report: ReportData): Metric[] {
  const inattentionScore = clamp((report.inattention_count / 9) * 100);
  const hyperactivityScore = clamp((report.hyperactivity_count / 9) * 100);
  const omissionScore = clamp(100 - (report.cpt_attention / 20) * 100);
  const impulsivityScore = clamp((report.cpt_impulsivity / 8) * 100);
  const gazeScore = clamp(report.gaze_off_task_ratio);
  const movementScore = clamp((report.head_movement_variability / 180) * 100);

  return [
    {
      label: "부주의 경향",
      value: `${report.inattention_count}개`,
      detail: "설문에서 부주의 관련 응답이 얼마나 두드러졌는지 봅니다.",
      score: inattentionScore,
      tone: getTone(inattentionScore),
    },
    {
      label: "과활동/충동성",
      value: `${report.hyperactivity_count}개`,
      detail: "움직임, 충동 반응, 기다림 어려움과 관련된 응답입니다.",
      score: hyperactivityScore,
      tone: getTone(hyperactivityScore),
    },
    {
      label: "주의 지속성",
      value: `${report.cpt_attention}회`,
      detail: "CPT에서 목표 자극을 놓치지 않고 반응한 정도입니다.",
      score: omissionScore,
      tone: getTone(omissionScore),
    },
    {
      label: "반응 조절",
      value: `${report.cpt_impulsivity}회`,
      detail: "누르지 말아야 할 상황에서 반응한 횟수입니다.",
      score: impulsivityScore,
      tone: getTone(impulsivityScore),
    },
    {
      label: "시선 이탈",
      value: percent(report.gaze_off_task_ratio),
      detail: "과제 중 화면/자극 영역 밖으로 시선이 벗어난 비율입니다.",
      score: gazeScore,
      tone: getTone(gazeScore),
    },
    {
      label: "움직임 변동성",
      value: `${Math.round(report.head_movement_variability)}`,
      detail: "검사 중 머리 움직임이 얼마나 불안정했는지 나타냅니다.",
      score: movementScore,
      tone: getTone(movementScore),
    },
  ];
}

function MetricBar({ metric }: { metric: Metric }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-slate-950">{metric.label}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{metric.detail}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-slate-950">{metric.value}</p>
          <p className="mt-1 text-[11px] font-bold text-slate-500">{getConcernLabel(metric.score)}</p>
        </div>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${toneClass[metric.tone]}`}
          style={{ width: `${clamp(metric.score)}%` }}
        />
      </div>
    </div>
  );
}

export default function ReportDetailPage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReport() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/analyze?id=${encodeURIComponent(id)}`);
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error || `서버 오류: ${res.status}`);
        }

        setReport(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }

    if (id) loadReport();
  }, [id]);

  const metrics = useMemo(() => (report ? buildMetrics(report) : []), [report]);
  const totalScore = useMemo(() => {
    if (!metrics.length) return 0;
    return Math.round(metrics.reduce((sum, metric) => sum + metric.score, 0) / metrics.length);
  }, [metrics]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
          리포트를 불러오는 중입니다...
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
        <div className="mx-auto max-w-5xl rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-700 shadow-sm">
          <p className="font-black">오류 발생</p>
          <p className="mt-2">{error || "리포트를 찾을 수 없습니다."}</p>
          <Link
            href="/"
            className="mt-5 inline-flex rounded-full bg-rose-600 px-5 py-3 text-sm font-black text-white transition hover:bg-rose-700"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-6 lg:py-12">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-600">
                ADHD Screening Report
              </p>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                주의력 검사 종합 리포트
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                이 리포트는 설문, CPT 수행, 시선 추적, 움직임 지표를 함께 본 선별검사 결과입니다.
                의학적 진단을 확정하는 자료가 아니며, 필요 시 전문가 평가와 함께 해석해야 합니다.
              </p>
              <p className="mt-3 text-sm font-semibold text-slate-500">
                검사일: {new Date(report.created_at).toLocaleString("ko-KR")}
              </p>
            </div>

            <div className="min-w-[220px] rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">종합 주의도</p>
              <p className="mt-3 text-4xl font-black text-slate-950">{totalScore}</p>
              <p className="mt-1 text-sm font-bold text-slate-600">{report.final_risk_level || getConcernLabel(totalScore)}</p>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white">
                <div className={`h-full rounded-full ${toneClass[getTone(totalScore)]}`} style={{ width: `${totalScore}%` }} />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {metrics.map((metric) => (
            <MetricBar key={metric.label} metric={metric} />
          ))}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.26em] text-blue-600">LLM Clinical Summary</p>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">임상 해석</h2>
              </div>
            </div>
            <div className="mt-6 space-y-4 text-[15px] leading-8 text-slate-700 [&_p]:mb-4 [&_strong]:text-slate-950">
              {report.report ? (
                <div dangerouslySetInnerHTML={{ __html: report.report }} />
              ) : (
                <p className="text-slate-500">리포트 내용이 없습니다.</p>
              )}
            </div>
          </article>

          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">해석 안내</p>
            <h2 className="mt-3 text-xl font-black text-slate-950">다음 단계</h2>
            <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
              <p>
                검사 결과는 당일 컨디션, 수면, 화면 환경, 긴장도에 영향을 받을 수 있습니다.
              </p>
              <p>
                일상 기능 저하가 함께 보이면 정신건강의학과 또는 임상심리 전문가와 추가 평가를 권장합니다.
              </p>
              <p>
                보호자나 본인이 느끼는 어려움, 학교나 직장 상황, 과거력까지 함께 보아야 더 정확합니다.
              </p>
            </div>
          </aside>
        </section>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-50"
          >
            새 검사 시작
          </Link>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800"
          >
            리포트 인쇄
          </button>
        </div>
      </main>
    </div>
  );
}
