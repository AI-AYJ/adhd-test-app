'use client';
import { useEffect, useState, type MouseEvent } from "react";
import Script from "next/script";
import "../public/style.css";

type SurveyControls = {
  ensureCameraStarted?: () => void | Promise<void>;
  getAnsweredCount?: (part?: number | null) => number;
  getDomAnsweredCount?: (part?: number | null) => number;
  goToStep3?: () => void;
  openEnvironmentCheck?: () => boolean | Promise<boolean>;
  questionsPart1Length?: number;
  questionsPart2Length?: number;
  scrollToFirstUnanswered?: (part: number) => void;
  setStep?: (step: number, options?: { focusStepTarget?: boolean; skipScroll?: boolean }) => void;
  showCptExperience?: () => void;
  syncAnswersFromDom?: () => void;
};

function FASTLogoMark() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-200 bg-[linear-gradient(135deg,#eff6ff_0%,#dbeafe_100%)] shadow-[0_10px_24px_rgba(59,130,246,0.16)]">
      <div className="relative h-6 w-6">
        <span className="absolute left-0 top-0 h-3 w-3 rounded-sm bg-slate-950"></span>
        <span className="absolute right-0 top-0 h-3 w-3 rounded-sm bg-blue-500"></span>
        <span className="absolute left-0 bottom-0 h-3 w-3 rounded-sm bg-cyan-400"></span>
        <span className="absolute right-0 bottom-0 h-3 w-3 rounded-sm bg-slate-200"></span>
      </div>
    </div>
  );
}

function HeroScreeningIllustration() {
  return (
    <div className="landing-float relative mx-auto h-[26rem] w-full max-w-[34rem]" style={{ animationDelay: "0.4s" }}>
      <div className="absolute left-6 top-8 h-28 w-28 rounded-full bg-cyan-100/80"></div>
      <div className="absolute right-6 top-0 h-24 w-24 rounded-full bg-blue-100/80"></div>
      <div className="absolute bottom-2 left-16 right-10 top-20 rounded-[2.5rem] bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.10),_transparent_50%),linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)]"></div>

      <div className="absolute right-2 top-16 w-40 rounded-[1.5rem] border border-cyan-200 bg-white/95 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.10)]">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-600">Risk Check</p>
        <div className="mt-3 flex items-end gap-2">
          <span className="h-8 w-4 rounded-t-md bg-blue-200"></span>
          <span className="h-12 w-4 rounded-t-md bg-cyan-300"></span>
          <span className="h-16 w-4 rounded-t-md bg-slate-900"></span>
        </div>
        <p className="mt-3 text-sm font-bold text-slate-500">위험도 분류</p>
      </div>

      <div className="absolute bottom-6 left-20 right-6 rotate-[-11deg] rounded-[2.25rem] border border-slate-300 bg-[#dfe7f3] p-4 shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
        <div className="rounded-[1.9rem] border border-slate-800 bg-[linear-gradient(180deg,#1e293b_0%,#0f172a_100%)] p-3">
          <div className="rounded-[1.4rem] bg-[linear-gradient(180deg,#f6fbff_0%,#ffffff_100%)] p-4">
            <div className="flex items-center justify-between">
              <div className="h-2 w-16 rounded-full bg-slate-200"></div>
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300"></span>
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400"></span>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-[1rem] bg-slate-950 px-3 py-3 text-center text-xs font-black uppercase tracking-[0.16em] text-white">Survey</div>
              <div className="rounded-[1rem] bg-violet-50 px-3 py-3 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-900">CPT</div>
            </div>
            <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <div className="mx-auto h-3 w-32 rounded-full bg-slate-200"></div>
              <div className="relative mt-5 h-28 rounded-[1.5rem] bg-white">
                <div className="absolute left-1/2 top-1/2 h-16 w-36 -translate-x-1/2 -translate-y-1/2 rounded-[1.5rem] border-2 border-cyan-300 bg-cyan-50/70"></div>
                <span className="absolute left-[43%] top-[42%] h-3 w-3 rounded-full bg-cyan-400"></span>
                <span className="absolute left-[49%] top-[49%] h-3 w-3 rounded-full bg-cyan-500"></span>
                <span className="absolute left-[54%] top-[56%] h-3 w-3 rounded-full bg-cyan-400"></span>
                <span className="absolute left-[52%] top-[61%] h-3.5 w-3.5 rounded-full bg-rose-500"></span>
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-4 h-3 w-32 rounded-full bg-slate-400/60"></div>
      </div>
    </div>
  );
}

function BenefitCaptureIllustration() {
  const points = [
    { left: "48%", top: "47%" },
    { left: "51%", top: "51%" },
    { left: "54%", top: "55%" },
    { left: "57%", top: "49%" },
    { left: "46%", top: "56%" },
    { left: "52%", top: "60%" },
    { left: "59%", top: "58%" },
    { left: "43%", top: "52%" }
  ];

  return (
    <div className="landing-float relative mx-auto h-72 w-full max-w-[25rem]">
      <div className="absolute left-3 top-10 h-24 w-24 rounded-full bg-cyan-100/90"></div>
      <div className="absolute right-2 top-2 h-28 w-28 rounded-full bg-blue-100/80"></div>
      <div className="absolute inset-x-8 bottom-2 top-8 rounded-[2.25rem] border border-slate-200 bg-white/90 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="absolute left-6 top-6 h-40 w-36 rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-4">
          <div className="h-3 rounded-full bg-blue-100"></div>
          <div className="mt-4 h-2 rounded-full bg-slate-100"></div>
          <div className="mt-3 h-2 w-5/6 rounded-full bg-slate-100"></div>
          <div className="mt-3 h-2 w-4/6 rounded-full bg-slate-100"></div>
          <div className="mt-5 flex items-center gap-2">
            <span className="h-5 w-5 rounded-full bg-emerald-500/80"></span>
            <span className="h-5 w-5 rounded-full bg-blue-500/80"></span>
            <span className="h-5 w-5 rounded-full bg-violet-500/70"></span>
          </div>
        </div>

        <div className="absolute right-6 top-8 h-36 w-36 rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f5fbff_100%)] p-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-slate-950 text-2xl text-white">+</div>
          <div className="mt-4 rounded-[1rem] bg-cyan-50 p-3">
            <div className="mx-auto h-10 w-20 rounded-[1rem] border-2 border-cyan-300"></div>
          </div>
        </div>

        <div className="absolute left-1/2 top-[56%] h-24 w-28 -translate-x-1/2 -translate-y-1/2 rounded-[1.5rem] border-2 border-cyan-300 bg-cyan-50/70"></div>
        {points.map((point, index) => (
          <span
            key={`${point.left}-${point.top}`}
            className={`absolute h-3 w-3 rounded-full ${index === points.length - 1 ? "bg-rose-500" : "bg-cyan-400/80"}`}
            style={{ left: point.left, top: point.top }}
          ></span>
        ))}
      </div>
    </div>
  );
}

function BenefitEvidenceIllustration() {
  return (
    <div className="landing-float relative mx-auto h-72 w-full max-w-[25rem]" style={{ animationDelay: "0.8s" }}>
      <div className="absolute left-0 top-6 h-28 w-28 rounded-full bg-blue-100/70"></div>
      <div className="absolute right-4 top-10 h-24 w-24 rounded-full bg-emerald-100/80"></div>
      <div className="absolute inset-x-10 bottom-4 top-6 rounded-[2.25rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="absolute left-6 right-6 top-6 rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[1rem] bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Task AOI</p>
              <p className="mt-2 text-2xl font-black text-slate-900">76</p>
            </div>
            <div className="rounded-[1rem] bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">CPT</p>
              <p className="mt-2 text-2xl font-black text-slate-900">84</p>
            </div>
          </div>
          <div className="mt-4 flex items-end gap-2">
            <span className="h-12 w-8 rounded-t-xl bg-blue-200"></span>
            <span className="h-16 w-8 rounded-t-xl bg-cyan-300"></span>
            <span className="h-10 w-8 rounded-t-xl bg-slate-200"></span>
            <span className="h-20 w-8 rounded-t-xl bg-slate-900"></span>
          </div>
        </div>

        <div className="absolute bottom-6 left-6 right-6 grid grid-cols-[1fr_auto] gap-4">
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <div className="h-2 rounded-full bg-slate-200"></div>
            <div className="mt-3 h-2 w-5/6 rounded-full bg-slate-200"></div>
            <div className="mt-3 h-2 w-4/6 rounded-full bg-slate-200"></div>
          </div>
          <div className="flex h-24 w-24 items-center justify-center rounded-[1.5rem] bg-[linear-gradient(180deg,#0f172a_0%,#1e3a8a_100%)] text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)]">
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100">Admin</p>
              <p className="mt-1 text-2xl font-black">✓</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkflowIllustration() {
  const surveyLabels = ["0", "1", "2", "3", "4"];

  return (
    <div className="relative overflow-hidden rounded-[2.25rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f6fbff_100%)] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="absolute left-10 top-10 h-28 w-28 rounded-full bg-blue-100/70"></div>
      <div className="absolute right-12 top-12 h-24 w-24 rounded-full bg-cyan-100/80"></div>
      <div className="absolute bottom-8 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full bg-indigo-100/70"></div>

      <div className="relative grid gap-5 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <div className="rounded-[1.8rem] border border-slate-200 bg-white/95 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600">Survey</p>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">문항 응답</p>
          </div>
          <div className="mt-4 rounded-[1.75rem] border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_42%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4">
            <div className="mx-auto h-2.5 w-28 rounded-full bg-slate-200"></div>
            <div className="mx-auto mt-5 flex min-h-[13.5rem] max-w-[24rem] flex-col items-center justify-between rounded-[1.6rem] px-4 py-4 text-center">
              <p className="text-base font-bold leading-snug tracking-tight text-slate-800 md:text-lg">
                <span className="mr-1 font-black italic text-blue-600/40">Q8.</span>
                해야 할 일을 자주 잊어버리나요?
              </p>
              <div className="grid w-full grid-cols-5 gap-2">
                {surveyLabels.map((label, index) => (
                  <div key={label} className="flex flex-col items-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-[3px] text-sm font-black ${
                        index === 3
                          ? "border-blue-500 bg-blue-500 text-white shadow-[0_8px_20px_rgba(59,130,246,0.25)]"
                          : "border-slate-100 bg-white text-slate-300"
                      }`}
                    >
                      {label}
                    </div>
                    <span className="mt-2 text-[9px] font-black uppercase tracking-[0.12em] text-slate-300">
                      {index === 0 ? "Low" : index === 4 ? "High" : "Rate"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex flex-col items-center gap-3 text-slate-300">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-black text-slate-500 shadow-[0_12px_24px_rgba(15,23,42,0.05)]">
            →
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Continue</p>
        </div>

        <div className="rounded-[1.8rem] border border-slate-200 bg-white/95 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-600">CPT</p>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">주의력 과제</p>
          </div>
          <div className="mt-4 rounded-[1.75rem] border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_42%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4">
            <div className="mx-auto h-2.5 w-28 rounded-full bg-slate-200"></div>
            <div className="relative mt-5 flex min-h-[13.5rem] items-center justify-center overflow-hidden rounded-[1.6rem] bg-white">
              <div className="absolute left-[14%] top-[18%] flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-[0_8px_18px_rgba(15,23,42,0.08)] text-lg">🎭</div>
              <div className="absolute right-[16%] top-[20%] flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-[0_8px_18px_rgba(15,23,42,0.08)] text-lg">🚗</div>
              <div className="absolute left-[18%] bottom-[16%] flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-[0_8px_18px_rgba(15,23,42,0.08)] text-lg">🐚</div>
              <div className="absolute right-[14%] bottom-[14%] flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-[0_8px_18px_rgba(15,23,42,0.08)] text-lg">🍷</div>
              <div className="flex h-36 w-28 items-center justify-center rounded-[1.5rem] border border-slate-300 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] shadow-[0_18px_36px_rgba(15,23,42,0.12)]">
                <div className="relative h-full w-full text-rose-600">
                  <div className="absolute left-3 top-3 flex flex-col items-center leading-none">
                    <span className="text-lg font-black">3</span>
                    <span className="text-sm">♥</span>
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-2xl">
                    <div>♥</div>
                    <div>♥</div>
                    <div>♥</div>
                  </div>
                  <div className="absolute bottom-3 right-3 flex rotate-180 flex-col items-center leading-none">
                    <span className="text-lg font-black">3</span>
                    <span className="text-sm">♥</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-4 text-center text-[11px] font-black uppercase tracking-[0.26em] text-slate-400">
              빨간 하트 3개 카드면 Space
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [surveyStarted, setSurveyStarted] = useState(false);

  const getSurveyControls = (): SurveyControls | null => {
    if (typeof window === "undefined") return null;
    return (window as Window & { __surveyControls?: SurveyControls }).__surveyControls ?? null;
  };

  const getCheckedCount = (containerId: string) =>
    document.querySelectorAll(`#${containerId} input[type="radio"]:checked`).length;

  const setFallbackStep = (step: number) => {
    [1, 2, 3].forEach((value) => {
      const element = document.getElementById(`step${value}`);
      if (!element) return;
      const isActive = value === step;
      element.hidden = !isActive;
      element.setAttribute("aria-hidden", String(!isActive));
      element.classList.toggle("active", isActive);
      (element as HTMLElement).style.display = isActive ? "block" : "none";
    });

    const indicator = document.getElementById("stepIndicator");
    if (indicator) indicator.textContent = `STEP ${step} / 3`;
  };

  const handleNextClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    const controls = getSurveyControls();
    controls?.syncAnswersFromDom?.();

    const answered =
      controls?.getAnsweredCount?.(1) ??
      controls?.getDomAnsweredCount?.(1) ??
      getCheckedCount("part1-questions");
    const required = controls?.questionsPart1Length ?? 9;

    if (answered < required) {
      controls?.scrollToFirstUnanswered?.(1);
      return;
    }

    controls?.setStep?.(2, { focusStepTarget: true });
    controls?.ensureCameraStarted?.();

    if (!controls?.setStep) {
      setFallbackStep(2);
    }
  };

  const handlePrevClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const controls = getSurveyControls();
    controls?.setStep?.(1, { focusStepTarget: true });
    if (!controls?.setStep) {
      setFallbackStep(1);
    }
  };

  const handleSubmitClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    const controls = getSurveyControls();
    controls?.syncAnswersFromDom?.();

    const answered =
      controls?.getAnsweredCount?.(2) ??
      controls?.getDomAnsweredCount?.(2) ??
      getCheckedCount("part2-questions");
    const required = controls?.questionsPart2Length ?? 9;

    if (answered < required) {
      controls?.scrollToFirstUnanswered?.(2);
      return;
    }

    controls?.goToStep3?.();
    if (!controls?.goToStep3) {
      setFallbackStep(3);
    }
  };

  useEffect(() => {
    if (!surveyStarted) return;

    const controls = getSurveyControls();
    controls?.setStep?.(1, { skipScroll: true });

    if (!controls?.setStep) {
      setFallbackStep(1);
    }

    window.requestAnimationFrame(() => {
      const firstQuestion = document.querySelector('#part1-questions [data-question-index="0"]') as HTMLElement | null;
      firstQuestion?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [surveyStarted]);

  useEffect(() => {
    if (surveyStarted) return;

    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-landing-reveal]"));
    if (!nodes.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.18,
      rootMargin: "0px 0px -12% 0px"
    });

    nodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, [surveyStarted]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleCalibrationComplete = () => {
      setSurveyStarted(true);
    };

    window.addEventListener("fast:calibration-complete", handleCalibrationComplete);

    return () => {
      window.removeEventListener("fast:calibration-complete", handleCalibrationComplete);
    };
  }, []);

  const handleStartScreening = () => {
    const attemptOpenEnvironmentCheck = (attempt = 0) => {
      const opened = getSurveyControls()?.openEnvironmentCheck?.();
      if (opened) return;
      if (attempt >= 20) {
        setSurveyStarted(true);
        return;
      }

      window.setTimeout(() => attemptOpenEnvironmentCheck(attempt + 1), 50);
    };

    attemptOpenEnvironmentCheck();
  };

  return (
    <>
    <div id="surveyExperience">
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {surveyStarted ? (
                <>
                  <span className="text-xl font-black tracking-tighter text-slate-900 italic">FAST</span>
                  <div className="h-4 w-px bg-gray-200"></div>
                </>
              ) : (
                <>
                  <FASTLogoMark />
                  <div>
                      <p className="text-2xl font-black tracking-[-0.08em] text-slate-950">FAST</p>
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Focus Allocation Screening Test</p>
                  </div>
                </>
              )}
              <span id="stepIndicator" className={`text-xs font-bold text-blue-600 tracking-widest uppercase ${surveyStarted ? "" : "hidden"}`}>STEP 1 / 2</span>
            </div>
            <div className={`w-48 bg-gray-100 h-1.5 rounded-full overflow-hidden ${surveyStarted ? "" : "hidden"}`}>
                <div id="progressBar" className="progress-bar bg-blue-600 h-full w-0"></div>
            </div>
            {!surveyStarted ? (
              <button
                type="button"
                onClick={handleStartScreening}
                className="rounded-full bg-slate-950 px-6 py-3 text-xs font-black uppercase tracking-[0.24em] text-white transition-all hover:scale-[1.02] hover:bg-black"
              >
                진행 시작
              </button>
            ) : null}
        </div>
    </nav>

    <main className="max-w-6xl mx-auto px-6 py-10 md:py-14">
        {!surveyStarted ? (
        <>
        <section className="relative overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-[0_32px_120px_rgba(15,23,42,0.10)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_36%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]"></div>
            <div className="relative grid gap-10 px-8 py-10 md:px-12 md:py-14 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
                <div className="max-w-[38rem] lg:max-w-none">
                    <div className="inline-flex items-center gap-3 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.32em] text-blue-700">
                        <span>FAST</span>
                        <span className="h-1 w-1 rounded-full bg-blue-400"></span>
                        <span>Home ADHD Screening</span>
                    </div>
                    <h1 className="mt-6 text-5xl font-black leading-[0.96] tracking-[-0.06em] text-slate-950 md:text-6xl">
                        <span className="whitespace-nowrap">ADHD 초기</span>
                        <br />
                        <span className="whitespace-nowrap">스크리닝 도구</span>
                    </h1>
                    <p className="mt-6 max-w-[34rem] text-2xl font-black leading-[1.18] tracking-tight text-slate-900 md:text-3xl">
                        <span className="whitespace-nowrap">집에서 가볍게</span>
                        <br />
                        <span className="whitespace-nowrap">ADHD 위험도를 확인해보세요</span>
                    </p>
                    <p className="mt-6 max-w-[44rem] text-base font-semibold leading-8 text-slate-500 md:text-[1.05rem] md:leading-8 lg:whitespace-nowrap">
                        FAST는 집에서 진행할 수 있는 ADHD 초기 스크리닝 웹입니다.
                    </p>
                </div>

                <div className="relative">
                    <HeroScreeningIllustration />
                </div>
            </div>
        </section>

        <section className="mt-10 grid gap-8 lg:grid-cols-2">
            <article
              data-landing-reveal
              className="landing-reveal rounded-[2.5rem] border border-slate-200 bg-white px-8 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]"
              style={{ transitionDelay: "60ms" }}
            >
                <BenefitCaptureIllustration />
                <div className="mt-6 text-center">
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-600">FAST 장점</p>
                    <h3 className="mt-3 text-[clamp(1rem,1.5vw,1.82rem)] font-black leading-[1.12] tracking-[-0.03em] text-slate-900 whitespace-nowrap">
                        약 5분 안에 ADHD 위험도를 분류합니다
                    </h3>
                    <p className="mt-4 text-base font-medium leading-8 text-slate-500">
                        설문과 CPT를 합쳐 약 5분이면 초기 위험 신호를
                        <br />
                        빠르게 확인할 수 있습니다.
                    </p>
                </div>
            </article>

            <article
              data-landing-reveal
              className="landing-reveal rounded-[2.5rem] border border-slate-200 bg-white px-8 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]"
              style={{ transitionDelay: "160ms" }}
            >
                <BenefitEvidenceIllustration />
                <div className="mt-6 text-center">
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-blue-600">결과 분석 제공</p>
                    <h3 className="mt-3 text-[clamp(1rem,1.5vw,1.82rem)] font-black leading-[1.12] tracking-[-0.03em] text-slate-900 whitespace-nowrap">
                        RAW 데이터와 분석 결과를 제공합니다
                    </h3>
                    <p className="mt-4 text-base font-medium leading-8 text-slate-500">
                        설문, 시선, CPT 데이터를 RAW로 제공하고
                        <br />
                        LLM이 이를 바탕으로 결과를 분석합니다.
                    </p>
                </div>
            </article>
        </section>

        <section
          data-landing-reveal
          className="landing-reveal mt-10 rounded-[2.75rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-8 py-10 shadow-[0_28px_100px_rgba(15,23,42,0.08)] md:px-10 md:py-12"
          style={{ transitionDelay: "80ms" }}
        >
            <div className="max-w-3xl">
                <div className="inline-flex max-w-full items-center gap-3 overflow-x-auto rounded-[1.25rem] border border-blue-200 bg-blue-50/80 px-4 py-3 text-left">
                    <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-blue-500"></div>
                    <p className="whitespace-nowrap text-[13px] font-semibold leading-7 text-slate-600 md:text-sm">
                        검사 시작과 함께 WebGazer와 MediaPipe가 백그라운드에서 계속 동작하며 시선과 얼굴 데이터를 기록합니다.
                    </p>
                </div>
                <p className="mt-6 text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">작동 방식</p>
                <h3 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">FAST는 이렇게 진행됩니다</h3>
                <p className="mt-4 text-base font-medium leading-8 text-slate-500">
                    설문, CPT를 순서대로 거쳐 결과를 도출합니다.
                </p>
            </div>

            <div className="mt-8">
                <WorkflowIllustration />
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.75rem] border border-slate-200 bg-white/90 p-6">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-2xl font-black text-slate-700">1</div>
                    <h4 className="mt-5 text-2xl font-black tracking-tight text-slate-900">설문 응답</h4>
                    <p className="mt-3 text-base font-medium leading-8 text-slate-500">
                        부주의 / 충동성·과잉행동을 파악할 수 있는 문항에 답변합니다.
                    </p>
                </div>
                <div className="rounded-[1.75rem] border border-slate-200 bg-white/90 p-6">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-2xl font-black text-slate-700">2</div>
                    <h4 className="mt-5 text-2xl font-black tracking-tight text-slate-900">결과 요약</h4>
                    <p className="mt-3 text-base font-medium leading-8 text-slate-500">
                        CPT와 함께 수집한 지표를 결과로 보여줍니다.
                    </p>
                </div>
            </div>
        </section>
        </>
        ) : null}

        <div className={surveyStarted ? "" : "hidden"} aria-hidden={surveyStarted ? "false" : "true"}>
        <div id="step1" className="step-content active" aria-hidden="false">
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
                <button type="button" id="nextBtn" onClick={handleNextClick} className="group relative bg-slate-900 text-white font-black py-5 px-20 rounded-full transition-all hover:bg-black hover:scale-105 shadow-xl disabled:opacity-10 disabled:cursor-not-allowed">
                    다음 단계로 이동
                    <svg className="inline-block ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                </button>
            </div>
        </div>

        <div id="step2" className="step-content" hidden aria-hidden="true">
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
                <button type="button" id="submitBtn" onClick={handleSubmitClick} className="group relative bg-violet-600 text-white font-black py-5 px-24 rounded-full transition-all hover:bg-violet-700 hover:scale-105 shadow-xl disabled:opacity-10 disabled:cursor-not-allowed">
                    문진 완료 및 CPT 시작
                </button>
                <button type="button" id="prevBtn" onClick={handlePrevClick} className="text-slate-400 hover:text-slate-900 font-bold transition-colors">이전 질문으로 돌아가기</button>
            </div>
        </div>

        <div id="step3" className="step-content" hidden aria-hidden="true"></div>
        </div>
    </main>

    <section id="environmentCheckOverlay" className="hidden fixed inset-0 z-[80] overflow-y-auto bg-slate-950/70 px-4 py-3 backdrop-blur-md" aria-hidden="true">
      <div className="mx-auto flex h-full w-full max-w-4xl items-center justify-center">
        <div className="w-full overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-[0_40px_140px_rgba(15,23,42,0.36)]">
          <div className="grid gap-0 lg:grid-cols-[0.88fr_1.12fr]">
            <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_40%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 md:p-6 lg:border-b-0 lg:border-r">
              <div className="inline-flex items-center gap-3 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-blue-700">
                <span>FAST</span>
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                <span>환경 점검</span>
              </div>

              <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950 md:text-4xl">
                <span className="block">검사 전에</span>
                <span className="mt-1 block">조명과 위치를</span>
                <span className="mt-1 block">먼저 확인합니다</span>
              </h2>

              <p id="environmentSummary" className="mt-3 max-w-xl text-base font-semibold leading-8 text-slate-600 md:text-lg">
                아래의 안내사항을 맞춰주시길 권장합니다.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div id="environmentLightCard" className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Lighting</p>
                  <p id="environmentLightStatus" className="mt-2 whitespace-pre-line text-lg font-black tracking-tight text-emerald-600">
                    불을 켜고{"\n"}진행해주세요
                  </p>
                  <p id="environmentLightHint" className="mt-2 whitespace-pre-line text-xs font-medium leading-5 text-slate-500">
                    실내 조명을 켠 상태에서{"\n"}진행하는 것을 권장합니다.
                  </p>
                </div>

                <div id="environmentPositionCard" className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Position</p>
                  <p id="environmentPositionStatus" className="mt-2 whitespace-pre-line text-lg font-black tracking-tight text-emerald-600">
                    얼굴이 중앙으로{"\n"}오게 해주세요
                  </p>
                  <p id="environmentPositionHint" className="mt-2 whitespace-pre-line text-xs font-medium leading-5 text-slate-500">
                    얼굴 전체가 화면 중앙{"\n"}네모에 들어오게 해주세요.
                  </p>
                </div>

                <div id="environmentPrivacyCard" className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Privacy</p>
                  <p id="environmentPrivacyStatus" className="mt-2 whitespace-pre-line text-lg font-black tracking-tight text-emerald-600">
                    검사하는 본인만{"\n"}화면에 나오게 해주세요
                  </p>
                  <p id="environmentPrivacyHint" className="mt-2 whitespace-pre-line text-xs font-medium leading-5 text-slate-500">
                    배경이나 다른 사람이{"\n"}보이지 않도록 해주세요.
                  </p>
                </div>

                <div id="environmentVolumeCard" className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Volume</p>
                  <p id="environmentVolumeStatus" className="mt-2 whitespace-pre-line text-lg font-black tracking-tight text-emerald-600">
                    볼륨을 70% 이상{"\n"}맞춰주세요
                  </p>
                  <p id="environmentVolumeHint" className="mt-2 whitespace-pre-line text-xs font-medium leading-5 text-slate-500">
                    진행 중 음성 안내를 쉽게{"\n"}들을 수 있도록 해주세요.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button type="button" id="environmentContinueBtn" className="rounded-full bg-slate-950 px-7 py-3 text-sm font-black uppercase tracking-[0.24em] text-white transition disabled:cursor-not-allowed disabled:opacity-25">
                  계속 진행
                </button>
                <button type="button" id="environmentCloseBtn" className="rounded-full border border-slate-300 bg-white px-7 py-3 text-sm font-black uppercase tracking-[0.24em] text-slate-700 transition hover:border-slate-900 hover:text-slate-900">
                  닫기
                </button>
              </div>
            </div>

            <div className="bg-slate-950 p-3 md:p-4 flex items-center justify-center">
              <div className="environment-check-shell relative mx-auto w-full max-w-[46rem] overflow-hidden rounded-[2rem] border border-emerald-400/40 bg-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.36)]">
                <video id="environmentWebcamPreview" autoPlay playsInline muted />
                <canvas id="environmentGuideOverlay"></canvas>
                <div id="environmentGuideBox" className="environment-check-guide-box pointer-events-none absolute left-1/2 top-1/2 h-[42%] min-h-[13rem] w-[28%] min-w-[12rem] max-w-[15rem] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border-[3px] border-cyan-400 transition-all duration-300"></div>
                <div className="pointer-events-none absolute left-5 top-5">
                  <div id="environmentCameraBadge" className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-white backdrop-blur">
                    Camera preview
                  </div>
                </div>
                <div className="pointer-events-none absolute inset-x-5 bottom-5 rounded-[1.25rem] border border-white/12 bg-slate-950/72 px-4 py-2 text-center backdrop-blur">
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-300">Center Guide</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-white md:text-sm">
                    카메라 화면을 보고 얼굴 전체가 중앙 네모에 들어오게 해주세요.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="calibrationOverlay" className="hidden fixed inset-0 z-[85] bg-slate-950/72 backdrop-blur-sm" aria-hidden="true">
      <div id="calibrationStage" className="relative h-screen w-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.10),_transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(241,245,249,0.98)_100%)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(180deg,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:84px_84px] opacity-40"></div>

        <div className="pointer-events-none absolute left-6 top-6 z-10">
          <div className="calibration-preview-shell relative h-56 w-[18rem] overflow-hidden rounded-[1.75rem] border border-emerald-400/35 bg-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.36)]">
            <video id="calibrationWebcamPreview" autoPlay playsInline muted />
          </div>
        </div>

        <button
          type="button"
          id="calibrationCloseBtn"
          className="absolute right-6 top-6 z-20 rounded-full border border-slate-300 bg-white/88 px-5 py-3 text-sm font-black uppercase tracking-[0.24em] text-slate-700 shadow-[0_16px_40px_rgba(15,23,42,0.12)] transition hover:border-slate-900 hover:text-slate-900"
        >
          닫기
        </button>

        <div id="calibrationPointsLayer" className="absolute inset-0 z-[5]"></div>
        <div id="calibrationReviewLayer" className="pointer-events-none absolute inset-0 z-[4] hidden"></div>

        <div id="calibrationIntroCard" className="absolute left-1/2 top-1/2 z-[12] w-[min(92vw,40rem)] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-slate-200 bg-white px-8 py-8 shadow-[0_36px_120px_rgba(15,23,42,0.22)] md:px-10 md:py-10">
          <div className="inline-flex items-center gap-3 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-amber-600">
            <span>WebGazer</span>
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
            <span>Calibration</span>
          </div>

          <h2 className="mt-6 text-4xl font-black tracking-[-0.05em] text-slate-950 md:text-5xl">
            보정을 먼저 끝내고
            <span className="mt-2 block">시선 추적을 시작합니다</span>
          </h2>

          <p id="calibrationSummary" className="mt-6 text-base font-semibold leading-8 text-slate-600 md:text-lg">
            화면 가장자리 점들을 먼저 다섯 번씩 클릭하고, 마지막에 중앙 점까지 완료하면 실제 시선 추적을 시작합니다.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-rose-500">Step 1</p>
              <p className="mt-3 text-xl font-black tracking-tight text-slate-900">외곽 점 8개</p>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                빨간 점을 다섯 번씩 클릭하면 색이 점점 진해지고, 완료되면 노란색으로 고정됩니다.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-500">Step 2</p>
              <p className="mt-3 text-xl font-black tracking-tight text-slate-900">중앙 점 1개</p>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                외곽 점이 끝나면 중앙 점이 나타납니다. 클릭하는 동안에는 항상 마우스를 눈으로 따라가 주세요.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" id="calibrationStartBtn" className="rounded-full bg-slate-950 px-7 py-4 text-sm font-black uppercase tracking-[0.24em] text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-25">
              보정 시작
            </button>
          </div>
        </div>

        <div id="calibrationControlPanel" className="hidden absolute left-0 top-0 z-[11] w-[min(92vw,22rem)] rounded-[1.75rem] border border-white/75 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur">
          <div id="calibrationControlDragHandle" className="mb-5 flex cursor-grab justify-center py-1 active:cursor-grabbing">
            <span className="h-1.5 w-16 rounded-full bg-slate-200"></span>
          </div>
          <p id="calibrationPanelTitle" className="text-[11px] font-black uppercase tracking-[0.28em] text-sky-500">Manual Calibration</p>
          <p id="calibrationMiniSummary" className="mt-4 text-base font-semibold leading-7 text-slate-700">
            외곽 점을 먼저 다섯 번씩 클릭해 주세요.
          </p>

          <div id="calibrationStatsGrid" className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Completed</p>
              <p id="calibrationCompletedCount" className="mt-2 text-2xl font-black tracking-tight text-slate-900">0 / 9</p>
            </div>
            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Clicks</p>
              <p id="calibrationClickCount" className="mt-2 text-2xl font-black tracking-tight text-slate-900">0 / 45</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button type="button" id="calibrationResetBtn" className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-black uppercase tracking-[0.22em] text-slate-700 transition hover:border-slate-900 hover:text-slate-900">
              다시 보정
            </button>
            <button type="button" id="calibrationContinueBtn" className="hidden rounded-full bg-amber-400 px-6 py-3 text-sm font-black uppercase tracking-[0.22em] text-slate-950 transition hover:bg-amber-300">
              설문 시작
            </button>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-5 left-1/2 z-[2] w-[min(86vw,30rem)] -translate-x-1/2">
          <div className="rounded-[1.6rem] border border-white/75 bg-white/88 px-6 py-4 text-center shadow-[0_20px_70px_rgba(15,23,42,0.10)] backdrop-blur">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-500">Always follow the mouse with your eyes</p>
            <p id="calibrationInstructionText" className="mt-2 text-base font-semibold leading-7 text-slate-700">
              각 점을 다섯 번씩 클릭하면 노란색으로 바뀌고, 외곽 점이 끝나면 중앙 점이 나타납니다.
            </p>
          </div>
        </div>

        <div id="calibrationCursorDot" className="hidden" aria-hidden="true"></div>
      </div>
    </section>

    <footer className={`max-w-6xl mx-auto px-6 py-20 border-t border-gray-50 mt-20 ${surveyStarted ? "" : "hidden"}`}>
        <p className="text-center text-slate-300 text-sm font-medium">© 2024 AI Cognitive Health Project. All rights reserved.</p>
    </footer>

    <div className="tracker-hidden" aria-hidden="true">
        <video id="webcam" autoPlay playsInline muted />
        <canvas id="output_canvas"></canvas>
    </div>
    </div>

    <section id="cptExperience" className="hidden fixed inset-0 z-[90] overflow-y-auto bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] text-slate-900">
      <div className="min-h-screen">
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-xl font-black tracking-tighter text-slate-900 italic">FAST</span>
              <div className="h-4 w-px bg-gray-200"></div>
              <span className="text-xs font-bold text-blue-600 tracking-widest uppercase">STEP 3 / 3</span>
            </div>
            <div className="text-sm font-bold text-slate-400">CPT Screening</div>
          </div>
        </nav>

        <div className="max-w-6xl mx-auto px-6 py-10 md:py-14">
          <div className="mb-10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.5 12h15m-7.5-7.5v15" />
              </svg>
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">CPT 주의력 측정</h2>
            <p className="mt-4 text-lg text-slate-500 font-medium max-w-3xl mx-auto leading-relaxed">
              설문 결과에 이어 실제 반응 수행을 확인하는 단계입니다.
            </p>
          </div>

          <div id="cpt-app" className="mx-auto flex min-h-[calc(100vh-16rem)] w-full max-w-4xl flex-col gap-6">
            <div className="bg-white rounded-[2rem] relative overflow-hidden flex-1 flex items-center justify-center border border-slate-200 shadow-[0_24px_80px_rgba(15,23,42,0.08)] min-h-[32rem]" id="cpt-game-container">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_42%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]"></div>
              <div
                id="cpt-task-aoi"
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 h-[24rem] w-[17rem] max-w-[calc(100%-7rem)] -translate-x-1/2 -translate-y-1/2 rounded-[2.2rem] opacity-0"
              ></div>

              <div id="cpt-stimulus-container" className="z-10 flex w-full flex-col items-center px-8 text-center">
                <div className="cpt-stage-shell">
                  <div id="cpt-stimulus-content" className="cpt-target-card"></div>
                  <div id="cpt-fixation-cross" className="hidden text-6xl text-slate-300">+</div>
                </div>
                <p id="cpt-instruction" className="hidden text-slate-400 text-sm tracking-[0.28em] uppercase font-bold">Initializing...</p>
              </div>

              <div id="cpt-visual-distractors" className="absolute inset-0 pointer-events-none"></div>

              <div id="cpt-overlay" className="absolute inset-0 bg-white/92 backdrop-blur-sm flex items-center justify-center z-50 text-center p-12">
                <div className="max-w-2xl rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.10)] p-10">
                  <p className="text-xs font-black uppercase tracking-[0.32em] text-blue-600 mb-4">Performance Task</p>
                  <h1 className="text-4xl font-black mb-4 text-slate-900 tracking-tight">FAST Card CPT</h1>
                  <p className="mb-8 text-slate-500 leading-relaxed text-base">
                    화면 중앙 카드 중 <span className="text-rose-500 font-bold">빨간 하트 3개</span> 카드가 나타날 때만 <span className="bg-slate-100 px-2 py-1 rounded text-slate-900 font-mono">Space</span>를 누르세요. 다른 카드는 무시합니다. 4단계 distractor 난이도로 진행되며 약 1분 내외가 소요됩니다.
                  </p>
                  <button type="button" id="cpt-start-btn" className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-10 py-4 rounded-full font-black text-lg transition-all disabled:opacity-30 shadow-xl hover:scale-[1.02]" disabled>
                    실행 및 측정 시작
                  </button>
                  <p id="cpt-loading-status" className="mt-6 text-xs text-slate-400 italic uppercase tracking-[0.28em]">Model loading...</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.24em] text-slate-400">
              <span>CPT Progress</span>
              <span><span id="cpt-current-trial">0</span> / 20</span>
            </div>
            <div className="rounded-full bg-slate-100 overflow-hidden h-2 border border-slate-200">
              <div id="cpt-total-progress" className="h-full bg-gradient-to-r from-blue-600 to-indigo-700 w-0 transition-all duration-500"></div>
            </div>
          </div>

          <div className="tracker-hidden" aria-hidden="true">
            <video id="cpt-webcam" autoPlay playsInline muted />
            <canvas id="cpt-output_canvas"></canvas>
            <div id="cpt-event-log"></div>
            <div id="cpt-live-attentive">0%</div>
            <div id="cpt-bar-attentive"></div>
            <div id="cpt-live-yaw">0.0°</div>
            <div id="cpt-yaw-cursor"></div>
            <div id="cpt-indicator-gaze"></div>
            <div id="cpt-indicator-head"></div>
            <div id="cpt-live-webgazer-state">IDLE</div>
            <div id="cpt-live-webgazer-samples">0</div>
            <div id="cpt-live-webgazer-coords">x -, y -</div>
          </div>
        </div>
      </div>

    </section>

    <section id="resultsExperience" className="hidden fixed inset-0 z-[100] overflow-y-auto bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] text-slate-900">
      <div className="min-h-screen">
        <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <span className="text-xl font-black tracking-tighter text-slate-900 italic">FAST</span>
              <div className="h-4 w-px bg-gray-200"></div>
              <span className="text-xs font-bold uppercase tracking-widest text-blue-600">RESULTS</span>
            </div>
            <button type="button" id="resultsAdminBtn" className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-black text-slate-700 transition hover:border-slate-900 hover:text-slate-900">
              관리자용
            </button>
          </div>
        </nav>

        <div className="mx-auto max-w-6xl space-y-8 px-6 py-10 md:py-14">
          <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-10">
            <div className="max-w-4xl">
              <p className="text-xs font-black uppercase tracking-[0.32em] text-blue-600">Survey Result</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900 md:text-5xl">설문 결과 요약</h2>
              <p id="summaryIntro" className="mt-5 text-base font-medium leading-relaxed text-slate-500 md:text-lg">
                응답 패턴과 설문 중 측정된 집중 흐름을 함께 정리했습니다.
              </p>
            </div>

            <div id="summaryScreeningBreakdown" className="mt-10 grid gap-5 lg:grid-cols-3 text-left"></div>

            <div id="summaryCards" className="mt-8 grid gap-5 md:grid-cols-2 text-left"></div>

            <div className="mt-10 rounded-[2rem] border border-slate-100 bg-slate-50 p-8 text-left">
              <h3 className="text-2xl font-black text-slate-900">한눈에 보기</h3>
              <div id="summaryHighlights" className="mt-4 space-y-3 text-base leading-7 text-slate-600"></div>
            </div>
          </section>

          <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.32em] text-indigo-600">CPT Result</p>
                <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900 md:text-5xl">CPT 결과 요약</h2>
                <p className="mt-5 max-w-3xl text-base font-medium leading-relaxed text-slate-500 md:text-lg">
                  설문 이후 수행한 반응 과제에서 주의력, 충동성, 반응 일관성, 시선 분산 경향을 함께 정리했습니다.
                </p>
              </div>
              <div id="cpt-res-timestamp" className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-mono text-blue-600"></div>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-4">
              <div className="summary-card rounded-3xl border border-slate-200 p-6">
                <p className="mb-1 text-[10px] font-bold uppercase text-slate-500">주의력 (Omission)</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900" id="cpt-res-omission-rate">0</span><span className="text-sm text-slate-500">%</span>
                </div>
                <p className="mt-2 text-[9px] text-slate-400">표적 무반응 비율</p>
              </div>
              <div className="summary-card rounded-3xl border border-slate-200 p-6">
                <p className="mb-1 text-[10px] font-bold uppercase text-slate-500">충동성 (Commission)</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900" id="cpt-res-commission-rate">0</span><span className="text-sm text-slate-500">%</span>
                </div>
                <p className="mt-2 text-[9px] text-slate-400">오답 클릭 비율</p>
              </div>
              <div className="summary-card rounded-3xl border border-slate-200 p-6">
                <p className="mb-1 text-[10px] font-bold uppercase text-slate-500">반응 일관성 (RT SD)</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900" id="cpt-res-rt-sd">0</span><span className="text-sm text-slate-500">ms</span>
                </div>
                <p className="mt-2 text-[9px] text-slate-400">주의력 유지의 안정성</p>
              </div>
              <div className="summary-card rounded-3xl border border-slate-200 p-6">
                <p className="mb-1 text-[10px] font-bold uppercase text-slate-500">시선 이탈 척도</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900" id="cpt-res-distraction">0</span><span className="text-sm text-slate-500">%</span>
                </div>
                <p className="mt-2 text-[9px] text-slate-400">방해물에 의한 시선 분산</p>
              </div>
            </div>

            <div className="mt-10 grid gap-8 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-8 lg:col-span-2">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900"><span className="h-5 w-1 rounded-full bg-blue-600"></span> 정성적 행동 분석</h3>
                <div id="cpt-interpretation-text" className="space-y-4 text-sm leading-relaxed text-slate-600"></div>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-4 md:flex-row">
              <button type="button" id="cpt-restart-btn" className="flex-1 rounded-2xl bg-slate-900 py-4 font-bold text-white transition hover:bg-black">처음부터 다시 하기</button>
              <button type="button" id="cpt-download-raw" className="flex-1 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 py-4 font-bold text-white shadow-lg transition hover:scale-[1.01]">Raw 데이터 Export (.json)</button>
            </div>
          </section>
        </div>
      </div>
    </section>

    <section id="adminExperience" className="hidden fixed inset-0 z-[110] overflow-y-auto bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] text-slate-900">
      <div className="min-h-screen">
        <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <span className="text-xl font-black tracking-tighter text-slate-900 italic">FAST</span>
              <div className="h-4 w-px bg-gray-200"></div>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">관리자용</span>
            </div>
            <button type="button" id="adminBackBtn" className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-black text-slate-700 transition hover:border-slate-900 hover:text-slate-900">
              결과로 돌아가기
            </button>
          </div>
        </nav>

        <div className="mx-auto max-w-6xl space-y-8 px-6 py-10 md:py-14">
          <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-10">
            <div className="max-w-4xl">
              <p className="text-xs font-black uppercase tracking-[0.32em] text-slate-500">Admin Review</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900 md:text-5xl">WebGazer 검증 데이터</h2>
              <p className="mt-5 text-base font-medium leading-relaxed text-slate-500 md:text-lg">
                설문과 CPT 진행 동안 저장된 WebGazer 샘플을 단계별로 다시 확인하는 관리자용 화면입니다.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-4">
              <div className="summary-card rounded-3xl border border-slate-200 p-6">
                <p className="text-[10px] font-bold uppercase text-slate-500">Status</p>
                <p id="admin-combined-status" className="mt-3 text-2xl font-black text-slate-900">Idle</p>
                <p id="admin-combined-phase" className="mt-2 text-sm text-slate-500">SURVEY + CPT</p>
              </div>
              <div className="summary-card rounded-3xl border border-slate-200 p-6">
                <p className="text-[10px] font-bold uppercase text-slate-500">Survey Samples</p>
                <p id="admin-survey-valid-count" className="mt-3 text-2xl font-black text-slate-900">0</p>
                <p id="admin-survey-raw-count" className="mt-2 text-sm text-slate-500">raw 0 callbacks</p>
              </div>
              <div className="summary-card rounded-3xl border border-slate-200 p-6">
                <p className="text-[10px] font-bold uppercase text-slate-500">CPT Samples</p>
                <p id="admin-cpt-valid-count" className="mt-3 text-2xl font-black text-slate-900">0</p>
                <p id="admin-cpt-raw-count" className="mt-2 text-sm text-slate-500">raw 0 callbacks</p>
              </div>
              <div className="summary-card rounded-3xl border border-slate-200 p-6">
                <p className="text-[10px] font-bold uppercase text-slate-500">Combined Window</p>
                <p id="admin-combined-window" className="mt-3 text-2xl font-black text-slate-900">0.0s</p>
                <p id="admin-total-valid-count" className="mt-2 text-sm text-slate-500">0 valid samples</p>
              </div>
            </div>
          </section>

          <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-black uppercase tracking-[0.32em] text-violet-600">Live Debug</p>
                <h3 className="mt-4 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">실시간 예측 점 검증</h3>
                <p className="mt-4 text-base font-medium leading-relaxed text-slate-500">
                  목표 점을 바라보면 예측 점이 어디에 찍히는지 바로 확인할 수 있습니다. 새 점을 눌러 위치를 바꾸거나 박스를 클릭해 직접 목표 점을 지정하세요.
                </p>
              </div>
              <div className="flex gap-3">
                <button type="button" id="admin-debug-center-btn" className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:border-slate-900 hover:text-slate-900">
                  중앙 점
                </button>
                <button type="button" id="admin-debug-random-btn" className="rounded-full bg-slate-900 px-5 py-3 text-sm font-black text-white transition hover:bg-black">
                  새 점
                </button>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-4">
              <div className="summary-card rounded-3xl border border-slate-200 p-5">
                <p className="text-[10px] font-bold uppercase text-slate-500">Debug Status</p>
                <p id="admin-debug-status" className="mt-3 text-2xl font-black text-slate-900">Idle</p>
                <p id="admin-debug-phase" className="mt-2 text-sm text-slate-500">DEBUG</p>
              </div>
              <div className="summary-card rounded-3xl border border-slate-200 p-5">
                <p className="text-[10px] font-bold uppercase text-slate-500">Target Point</p>
                <p id="admin-debug-target-coords" className="mt-3 text-2xl font-black text-slate-900">x -, y -</p>
                <p id="admin-debug-target-label" className="mt-2 text-sm text-slate-500">센터 고정</p>
              </div>
              <div className="summary-card rounded-3xl border border-slate-200 p-5">
                <p className="text-[10px] font-bold uppercase text-slate-500">Predicted Point</p>
                <p id="admin-debug-predicted-coords" className="mt-3 text-2xl font-black text-slate-900">x -, y -</p>
                <p id="admin-debug-sample-age" className="mt-2 text-sm text-slate-500">No recent sample</p>
              </div>
              <div className="summary-card rounded-3xl border border-slate-200 p-5">
                <p className="text-[10px] font-bold uppercase text-slate-500">Error</p>
                <p id="admin-debug-error" className="mt-3 text-2xl font-black text-slate-900">-</p>
                <p id="admin-debug-quality" className="mt-2 text-sm text-slate-500">점 하나를 바라보고 확인하세요</p>
              </div>
            </div>

            <div id="admin-debug-surface" className="relative mt-8 h-80 overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_40%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
              <div className="absolute inset-x-8 top-1/2 h-px -translate-y-1/2 bg-slate-100"></div>
              <div className="absolute inset-y-8 left-1/2 w-px -translate-x-1/2 bg-slate-100"></div>
              <div id="admin-debug-target-dot" className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-indigo-600 shadow-[0_0_0_10px_rgba(79,70,229,0.16)]"></div>
              <div id="admin-debug-predicted-dot" className="absolute hidden h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-rose-500 shadow-[0_0_0_10px_rgba(239,68,68,0.14)]"></div>
              <div className="absolute left-6 top-6 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-indigo-600">
                Target
              </div>
              <div className="absolute right-6 top-6 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-rose-500">
                Predicted
              </div>
              <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs font-bold uppercase tracking-[0.28em] text-slate-400">
                클릭해서 목표 점 위치 변경
              </p>
            </div>
          </section>

          <div className="grid gap-8 lg:grid-cols-2">
            <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.32em] text-blue-600">Survey</p>
                  <h3 className="mt-3 text-3xl font-black tracking-tight text-slate-900">설문 단계 Gaze</h3>
                </div>
                <div className="text-right">
                  <p id="admin-survey-coverage" className="text-xs font-black uppercase tracking-[0.24em] text-cyan-600">0% valid</p>
                  <p id="admin-survey-rate" className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">0.0 sps</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="summary-card rounded-3xl border border-slate-200 p-5">
                  <p className="text-[10px] font-bold uppercase text-slate-500">Latest Gaze</p>
                  <p id="admin-survey-coords" className="mt-3 text-2xl font-black text-slate-900">x -, y -</p>
                  <p id="admin-survey-time" className="mt-2 text-sm text-slate-500">No recent sample</p>
                </div>
                <div className="summary-card rounded-3xl border border-slate-200 p-5">
                  <p className="text-[10px] font-bold uppercase text-slate-500">Viewport</p>
                  <p id="admin-survey-viewport" className="mt-3 text-2xl font-black text-slate-900">0 x 0</p>
                  <p id="admin-survey-window" className="mt-2 text-sm text-slate-500">0.0s capture window</p>
                </div>
              </div>

              <canvas id="admin-survey-canvas" className="webgazer-preview-canvas mt-6"></canvas>

              <div className="mt-6">
                <h4 className="text-sm font-black uppercase tracking-[0.22em] text-slate-500">Recent Samples</h4>
                <div id="admin-survey-recent" className="mt-4 space-y-2 font-mono text-xs text-slate-600"></div>
              </div>
            </section>

            <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.32em] text-indigo-600">CPT</p>
                  <h3 className="mt-3 text-3xl font-black tracking-tight text-slate-900">CPT 단계 Gaze</h3>
                </div>
                <div className="text-right">
                  <p id="admin-cpt-coverage" className="text-xs font-black uppercase tracking-[0.24em] text-cyan-600">0% valid</p>
                  <p id="admin-cpt-rate" className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">0.0 sps</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="summary-card rounded-3xl border border-slate-200 p-5">
                  <p className="text-[10px] font-bold uppercase text-slate-500">Latest Gaze</p>
                  <p id="admin-cpt-coords" className="mt-3 text-2xl font-black text-slate-900">x -, y -</p>
                  <p id="admin-cpt-time" className="mt-2 text-sm text-slate-500">No recent sample</p>
                </div>
                <div className="summary-card rounded-3xl border border-slate-200 p-5">
                  <p className="text-[10px] font-bold uppercase text-slate-500">Viewport</p>
                  <p id="admin-cpt-viewport" className="mt-3 text-2xl font-black text-slate-900">0 x 0</p>
                  <p id="admin-cpt-window" className="mt-2 text-sm text-slate-500">0.0s capture window</p>
                </div>
              </div>

              <canvas id="admin-cpt-canvas" className="webgazer-preview-canvas mt-6"></canvas>

              <div className="mt-6">
                <h4 className="text-sm font-black uppercase tracking-[0.22em] text-slate-500">Recent Samples</h4>
                <div id="admin-cpt-recent" className="mt-4 space-y-2 font-mono text-xs text-slate-600"></div>
              </div>
            </section>
          </div>

          <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-10">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.32em] text-slate-500">CPT Events</p>
              <h3 className="mt-4 text-3xl font-black tracking-tight text-slate-900">Recent Events</h3>
              <p className="mt-4 text-base font-medium leading-relaxed text-slate-500">
                CPT 수행 중 기록된 반응 이벤트를 시간순으로 다시 확인합니다.
              </p>
            </div>
            <div id="admin-cpt-events" className="mt-8 space-y-2 font-mono text-xs text-slate-600"></div>
          </section>
        </div>
      </div>
    </section>

    <div id="webgazerLiveDot" className="webgazer-live-dot hidden" aria-hidden="true"></div>

    <Script
      src="/webgazer.js"
      strategy="beforeInteractive"
    />
    <Script src="/script.js?v=20260410-03" strategy="afterInteractive" type="module" />
    </>
  );
}

