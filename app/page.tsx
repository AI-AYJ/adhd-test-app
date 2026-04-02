'use client';
import Script from "next/script";
import "../public/style.css";

export default function Home() {
  return (
    <>
    <Script src="/script.js" type="module" />
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <span className="text-xl font-black tracking-tighter text-slate-900 italic">ADHD TEST</span>
                <div className="h-4 w-px bg-gray-200"></div>
                <span id="stepIndicator" className="text-xs font-bold text-blue-600 tracking-widest uppercase">STEP 1 / 3</span>
            </div>
            <div className="w-48 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                <div id="progressBar" className="progress-bar bg-blue-600 h-full w-0"></div>
            </div>
        </div>
    </nav>

    <main className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <div id="step1" className="step-content active">
            <div className="mb-20">
                <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
                    Part 1. <span className="text-emerald-600">부주의</span>
                </h2>
                <p className="text-xl text-slate-500 font-medium">
                    집중, 계획, 기억, 마감 관리와 관련된 문항입니다.
                </p>
            </div>

            <div id="part1-questions" className="space-y-32"></div>

            <div className="flex justify-center mt-32">
                <button id="nextBtn" className="group relative bg-slate-900 text-white font-black py-5 px-20 rounded-full transition-all hover:bg-black hover:scale-105 shadow-xl disabled:opacity-10 disabled:cursor-not-allowed">
                    다음 단계로 이동
                    <svg className="inline-block ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                </button>
            </div>
        </div>

        <div id="step2" className="step-content">
            <div className="mb-20">
                <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
                    Part 2. <span className="text-violet-600">과잉행동 · 충동성</span>
                </h2>
                <p className="text-xl text-slate-500 font-medium">
                    움직임 조절, 차례 기다리기, 끼어들기와 관련된 문항입니다.
                </p>
            </div>

            <div id="part2-questions" className="space-y-32"></div>

            <div className="flex flex-col items-center gap-8 mt-32">
                <button id="submitBtn" className="group relative bg-violet-600 text-white font-black py-5 px-24 rounded-full transition-all hover:bg-violet-700 hover:scale-105 shadow-xl disabled:opacity-10 disabled:cursor-not-allowed">
                    문진 완료 및 결과 보기
                </button>
                <button id="prevBtn" className="text-slate-400 hover:text-slate-900 font-bold transition-colors">이전 질문으로 돌아가기</button>
            </div>
        </div>

        <div id="step3" className="step-content text-center py-20">
            <div className="max-w-4xl mx-auto">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-blue-50 text-blue-600 rounded-3xl mb-10">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 17v-6m6 6V7m6 10V4M3 17v-4"/>
                    </svg>
                </div>
                <h2 className="text-5xl font-black text-slate-900 mb-8 tracking-tighter">설문 결과 요약</h2>
                <p id="summaryIntro" className="text-xl text-slate-500 font-medium leading-relaxed mb-16">
                    응답 패턴과 설문 중 측정된 집중 흐름을 함께 정리했습니다.
                </p>

                <div id="summaryCards" className="grid gap-5 md:grid-cols-2 text-left"></div>

                <div className="mt-12 rounded-[2rem] border border-slate-100 bg-slate-50 p-8 text-left">
                    <h3 className="text-2xl font-black text-slate-900 mb-4">한눈에 보기</h3>
                    <div id="summaryHighlights" className="space-y-3 text-slate-600 text-base leading-7"></div>
                </div>

                <div className="mt-8 text-left">
                    <button id="toggleAdminBtn" className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-black text-slate-700 transition hover:border-slate-900 hover:text-slate-900">
                        관리자용 측정 확인 보기
                    </button>
                </div>

                <div id="adminPanel" className="admin-panel-hidden mt-8 rounded-[2rem] border border-slate-200 bg-white p-8 text-left shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400">Admin Mode</p>
                            <h3 className="mt-2 text-2xl font-black text-slate-900">측정 검증 패널</h3>
                            <p id="adminStatusText" className="mt-3 text-sm leading-6 text-slate-500">
                                설문 중 수집된 카메라 흐름과 원시 지표를 확인합니다.
                            </p>
                        </div>
                        <button id="refreshAdminBtn" className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-900 hover:text-slate-900">
                            지표 새로고침
                        </button>
                    </div>

                    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                        <div className="admin-video-shell">
                            <video id="adminWebcam" autoPlay playsInline muted />
                            <canvas id="adminOverlay"></canvas>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="summary-card rounded-[1.5rem] p-5">
                                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">카메라 상태</p>
                                <p id="adminCameraState" className="mt-3 text-2xl font-black text-slate-900">대기</p>
                                <p id="adminFacePresence" className="mt-2 text-sm text-slate-500">얼굴 검출률 0%</p>
                            </div>
                            <div className="summary-card rounded-[1.5rem] p-5">
                                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">주시 판정</p>
                                <p id="adminAttentionState" className="mt-3 text-2xl font-black text-slate-900">미측정</p>
                                <p id="adminAwayRatio" className="mt-2 text-sm text-slate-500">이탈 비율 0%</p>
                            </div>
                            <div className="summary-card rounded-[1.5rem] p-5">
                                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">각도 변동성</p>
                                <p id="adminHeadMotion" className="mt-3 text-2xl font-black text-slate-900">0.0°</p>
                                <p id="adminEuler" className="mt-2 text-sm text-slate-500">yaw 0 / pitch 0 / roll 0</p>
                            </div>
                            <div className="summary-card rounded-[1.5rem] p-5">
                                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">활성 문항</p>
                                <p id="adminQuestionId" className="mt-3 text-2xl font-black text-slate-900">Q-</p>
                                <p id="adminQuestionMeta" className="mt-2 text-sm text-slate-500">체류 0초 / 응답 -</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-6">
                        <h4 className="text-lg font-black text-slate-900">원시 로그 요약</h4>
                        <div id="adminRawMetrics" className="mt-4 grid gap-3 md:grid-cols-2 text-sm text-slate-600"></div>
                    </div>
                </div>

                <div className="mt-12 flex flex-col items-center gap-6">
                    <button id="restartSummaryBtn" className="text-slate-400 hover:text-slate-900 font-bold transition-colors">문항으로 돌아가기</button>
                    <button id="startCptBtn" className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black py-6 px-12 rounded-3xl transition-all shadow-2xl hover:scale-[1.02] flex items-center justify-center gap-4 group">
                        <span className="text-2xl">CPT 단계 시작</span>
                        <svg className="w-8 h-8 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
                    </button>
                </div>
            </div>
        </div>
    </main>

    <footer className="max-w-5xl mx-auto px-6 py-20 border-t border-gray-50 mt-20">
        <p className="text-center text-slate-300 text-sm font-medium">© 2024 AI Cognitive Health Project. All rights reserved.</p>
    </footer>

    <div className="tracker-hidden" aria-hidden="true">
        <video id="webcam" autoPlay playsInline muted />
        <canvas id="output_canvas"></canvas>
    </div>

    <Script src="/script.js" strategy="afterInteractive" type="module" />
    </>
  );
}