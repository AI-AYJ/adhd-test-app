"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AnalyzeItem = {
  id: string;
  created_at: string;
  final_risk_level: string | null;
  report: string | null;
  inattention_count?: number;
  hyperactivity_count?: number;
  gaze_off_task_ratio?: number;
};

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export default function ReportPage() {
  const [items, setItems] = useState<AnalyzeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReports() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/analyze");
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error || `서버 오류: ${res.status}`);
        }

        setItems(Array.isArray(json.data) ? json.data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-6 lg:py-12">
        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-600">Report Archive</p>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">최근 생성된 리포트</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                저장된 ADHD 선별검사 리포트를 다시 확인할 수 있습니다.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
            >
              홈으로 돌아가기
            </Link>
          </div>
        </section>

        <section className="space-y-4">
          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
              데이터를 불러오는 중입니다...
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-700 shadow-sm">
              <p className="font-black">오류 발생</p>
              <p className="mt-2">{error}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
              아직 저장된 리포트가 없습니다. CPT를 완료한 뒤 리포트 생성을 눌러 주세요.
            </div>
          ) : (
            items.map((item) => (
              <Link key={item.id} href={`/report/${item.id}`} className="block">
                <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-200 hover:shadow-[0_20px_50px_rgba(15,23,42,0.10)] sm:p-7">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">검사일</p>
                      <p className="mt-2 text-base font-black text-slate-950">
                        {new Date(item.created_at).toLocaleString("ko-KR")}
                      </p>
                    </div>
                    <span className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700">
                      {item.final_risk_level || "분석 완료"}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-bold text-slate-400">부주의</p>
                      <p className="mt-1 text-xl font-black">{item.inattention_count ?? 0}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-bold text-slate-400">과활동/충동성</p>
                      <p className="mt-1 text-xl font-black">{item.hyperactivity_count ?? 0}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-bold text-slate-400">시선 이탈</p>
                      <p className="mt-1 text-xl font-black">{Math.round(item.gaze_off_task_ratio ?? 0)}%</p>
                    </div>
                  </div>

                  <p className="mt-5 line-clamp-2 text-sm leading-6 text-slate-500">
                    {item.report ? stripHtml(item.report) : "리포트 내용이 없습니다."}
                  </p>
                </article>
              </Link>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
