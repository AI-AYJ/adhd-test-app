'use client';
import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
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

type PublicReview = {
  id: string;
  report_id: string | null;
  rating: number;
  content: string;
  created_at: string;
};

const LOCAL_REVIEW_STORAGE_KEY = "fast-review-cache";

const reasonCards = [
  {
    title: "자꾸 잊어버려요",
    description: "약속, 준비물, 마감일이 머릿속에서 자주 사라지는 느낌이 들 때가 있습니다.",
  },
  {
    title: "집중이 쉽게 흐트러져요",
    description: "해야 할 일은 알지만 소리, 생각, 주변 자극에 금방 끌려가기도 합니다.",
  },
  {
    title: "시작이 자꾸 늦어져요",
    description: "미루고 싶은 마음이 커져서 마지막 순간에야 움직이는 패턴이 반복됩니다.",
  },
];

const featureHighlights = [
  {
    label: "FAST 장점",
    value: "5분",
    title: "짧은 시간 안에 초기 신호를 확인합니다",
    description: "긴 검사처럼 부담스럽지 않게 설문과 CPT를 이어서 진행합니다.",
  },
  {
    label: "진행 방식",
    value: "2단계",
    title: "설문 응답과 CPT 수행을 함께 봅니다",
    description: "문항 답변만이 아니라 과제를 수행하는 흐름까지 참고합니다.",
  },
  {
    label: "결과 제공",
    value: "RAW",
    title: "분석 가능한 결과 데이터를 제공합니다",
    description: "설문, 시선, CPT 데이터를 바탕으로 결과 요약을 확인할 수 있습니다.",
  },
];

const heroFactCards = [
  {
    title: "약 5분 소요",
    description: "부담을 낮추고 핵심만 차분하게 확인합니다.",
  },
  {
    title: "DSM-5 기반 문항",
    description: "ADHD 주요 경향을 묻는 문항으로 구성했습니다.",
  },
  {
    title: "설문 + CPT 통합",
    description: "응답과 과제 수행 흐름을 함께 참고합니다.",
  },
];

const processSteps = [
  {
    step: "01",
    title: "환경 점검",
    description: "조명, 카메라, 화면 위치를 먼저 확인해 데이터 품질을 맞춥니다.",
  },
  {
    step: "02",
    title: "설문 응답",
    description: "부주의와 과잉행동·충동성 문항에 차분히 답변합니다.",
  },
  {
    step: "03",
    title: "CPT 수행",
    description: "짧은 과제를 진행하며 반응과 집중 유지 흐름을 기록합니다.",
  },
  {
    step: "04",
    title: "결과 요약",
    description: "설문, 시선, CPT 데이터를 함께 정리해 현재 경향을 보여줍니다.",
  },
];

const faqItems = [
  {
    question: "FAST는 진단서인가요?",
    answer: "아닙니다. FAST는 ADHD 경향을 빠르게 살펴보는 초기 스크리닝 도구이며, 의학적 진단을 대신하지 않습니다.",
  },
  {
    question: "카메라와 시선 데이터는 왜 사용하나요?",
    answer: "설문 중 집중 흐름과 CPT 수행 패턴을 함께 참고하기 위해 사용합니다. 결과 해석은 응답 데이터와 행동 지표를 함께 봅니다.",
  },
  {
    question: "결과가 높게 나오면 어떻게 해야 하나요?",
    answer: "일상 기능 저하가 크거나 어려움이 지속된다면 정신건강의학과 또는 전문 상담 기관의 평가를 권장합니다.",
  },
  {
    question: "검사는 얼마나 걸리나요?",
    answer: "설문과 CPT를 포함해 약 5분 안에 마치는 흐름을 목표로 설계했습니다.",
  },
];

function readCachedReviews() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(LOCAL_REVIEW_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as PublicReview[]) : [];
  } catch {
    return [];
  }
}

function mergeReviews(remoteReviews: PublicReview[], cachedReviews: PublicReview[]) {
  const merged = new Map<string, PublicReview>();

  [...cachedReviews, ...remoteReviews].forEach((review) => {
    if (!review?.id || !review.content?.trim()) return;
    merged.set(review.id, {
      ...review,
      content: review.content.trim(),
      rating: Number(review.rating),
    });
  });

  return Array.from(merged.values());
}

function pickFeaturedReviews(reviews: PublicReview[]) {
  const fiveStarReviews = reviews.filter(
    (review) => review.rating === 5 && review.content.trim(),
  );
  const shuffled = [...fiveStarReviews].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, fiveStarReviews.length <= 4 ? fiveStarReviews.length : 4);
}

function ReviewStars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1 text-lg text-amber-400" aria-label={`${rating}점 리뷰`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star}>{star <= rating ? "★" : "☆"}</span>
      ))}
    </div>
  );
}

function ReviewCarousel({ reviews }: { reviews: PublicReview[] }) {
  if (!reviews.length) return null;

  const loopReviews = reviews.length === 1
    ? [...reviews, ...reviews, ...reviews, ...reviews]
    : [...reviews, ...reviews];

  return (
    <section
      id="fast-reviews"
      className="mt-14 overflow-hidden rounded-[2.75rem] border border-slate-200 bg-white py-10 shadow-[0_28px_100px_rgba(15,23,42,0.08)]"
    >
      <div className="px-8 md:px-10">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-amber-500">
          Reviews
        </p>
        <div className="mt-4">
          <div>
            <h3 className="text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
              FAST를 사용한 사람들의 후기
            </h3>
          </div>
        </div>
      </div>

      <div className="fast-review-viewport mt-8">
        <div className="fast-review-track">
          {loopReviews.map((review, index) => (
            <article key={`${review.id}-${index}`} className="fast-review-card">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">
                FAST Review
              </p>
              <ReviewStars rating={review.rating} />
              <p className="mt-6 line-clamp-5 text-lg font-bold leading-8 text-slate-800">
                {review.content}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function HeroBackdropScene() {
  return (
    <div className="fast-hero-scene" aria-hidden="true">
      <div className="fast-hero-illustration">
        <div className="fast-hero-blob"></div>
        <div className="fast-hero-foliage fast-hero-foliage-left">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div className="fast-hero-foliage fast-hero-foliage-right">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div className="fast-hero-sprout fast-hero-sprout-left">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div className="fast-hero-sprout fast-hero-sprout-right">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div className="fast-hero-leaf fast-hero-leaf-left"></div>
        <div className="fast-hero-leaf fast-hero-leaf-right"></div>
        <div className="fast-hero-person fast-hero-person-pink">
          <span className="fast-hero-head"></span>
          <span className="fast-hero-body"></span>
          <span className="fast-hero-thought fast-hero-thought-ring"></span>
        </div>
        <div className="fast-hero-person fast-hero-person-plum">
          <span className="fast-hero-head"></span>
          <span className="fast-hero-body"></span>
          <span className="fast-hero-thought fast-hero-thought-line"></span>
        </div>
        <div className="fast-hero-person fast-hero-person-green">
          <span className="fast-hero-head"></span>
          <span className="fast-hero-body"></span>
          <span className="fast-hero-thought fast-hero-thought-dots">
            <i></i>
            <i></i>
            <i></i>
            <i></i>
            <i></i>
            <i></i>
          </span>
        </div>
        <div className="fast-hero-person fast-hero-person-amber">
          <span className="fast-hero-head"></span>
          <span className="fast-hero-body"></span>
          <span className="fast-hero-thought fast-hero-thought-spark">
            <i></i>
            <i></i>
            <i></i>
          </span>
        </div>
        <div className="fast-hero-person fast-hero-person-blue">
          <span className="fast-hero-head"></span>
          <span className="fast-hero-body"></span>
          <span className="fast-hero-thought fast-hero-thought-grid">
            <i></i>
            <i></i>
            <i></i>
            <i></i>
          </span>
        </div>
      </div>
      <div className="fast-hero-wave"></div>
    </div>
  );
}

function HeroFactCards() {
  return (
    <div className="fast-hero-facts">
      {heroFactCards.map((card) => (
        <div key={card.title} className="fast-hero-fact">
          <p className="text-lg font-black tracking-tight text-slate-900">{card.title}</p>
          <p className="mt-2 text-sm font-medium leading-7 text-slate-500">{card.description}</p>
        </div>
      ))}
    </div>
  );
}

function ProcessTimeline() {
  return (
    <div className="fast-process-timeline rounded-[2.25rem] p-5 md:p-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {processSteps.map((item, index) => (
          <article key={item.step} className="fast-process-card rounded-[1.75rem] p-6">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-black text-slate-400">{item.step}</p>
              <div
                className={`h-1.5 flex-1 rounded-full ${
                  index === 0 ? "bg-blue-200" : index === 1 ? "bg-cyan-200" : index === 2 ? "bg-violet-200" : "bg-slate-200"
                }`}
              ></div>
            </div>
            <h3 className="mt-5 text-2xl font-black tracking-tight text-slate-900">{item.title}</h3>
            <p className="mt-3 text-base font-medium leading-8 text-slate-500">{item.description}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [surveyStarted, setSurveyStarted] = useState(false);
  const [featuredReviews, setFeaturedReviews] = useState<PublicReview[]>([]);

  useEffect(() => {
    const mainScriptVersion = "20260609-01";

    const loadMainScript = () => {
      const existingMain = document.getElementById("fast-main-script") as HTMLScriptElement | null;
      if (existingMain?.src.includes(mainScriptVersion)) return;
      existingMain?.remove();

      const script = document.createElement("script");
      script.id = "fast-main-script";
      script.type = "module";
      script.src = `/script.js?v=${mainScriptVersion}`;
      document.body.appendChild(script);
    };

    const existingWebgazer = document.getElementById("fast-webgazer-script") as HTMLScriptElement | null;
    if (existingWebgazer) {
      loadMainScript();
      return;
    }

    const webgazerScript = document.createElement("script");
    webgazerScript.id = "fast-webgazer-script";
    webgazerScript.src = "/webgazer.js";
    webgazerScript.async = false;
    webgazerScript.onload = loadMainScript;
    document.body.appendChild(webgazerScript);
  }, []);

  useEffect(() => {
    if (surveyStarted) return;

    let active = true;

    async function loadReviews() {
      const cachedReviews = readCachedReviews();

      try {
        const res = await fetch("/api/reviews?rating=5&limit=80", { cache: "no-store" });
        const json = (await res.json()) as {
          success?: boolean;
          data?: PublicReview[];
        };

        if (!res.ok || !json.success || !Array.isArray(json.data)) {
          throw new Error("리뷰를 불러오지 못했습니다.");
        }

        if (active) {
          setFeaturedReviews(pickFeaturedReviews(mergeReviews(json.data, cachedReviews)));
        }
      } catch {
        if (active) {
          setFeaturedReviews(pickFeaturedReviews(cachedReviews));
        }
      }
    }

    void loadReviews();

    const handleStorage = () => {
      setFeaturedReviews(pickFeaturedReviews(readCachedReviews()));
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      active = false;
      window.removeEventListener("storage", handleStorage);
    };
  }, [surveyStarted]);

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
    <nav className="fast-site-nav sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="fast-site-nav-inner h-20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {surveyStarted ? (
                <>
                  <span className="text-xl font-black tracking-tighter text-slate-900 italic">FAST</span>
                  <div className="h-4 w-px bg-gray-200"></div>
                </>
              ) : (
                <>
                  <div className="fast-site-brand">
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
            <div className="flex items-center gap-3">
              <Link
                href="/report"
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.24em] text-slate-950 transition-all hover:bg-slate-100"
              >
                리포트 보기
              </Link>
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
        </div>
    </nav>

    <main className="max-w-6xl mx-auto px-6 py-10 md:py-14">
        {!surveyStarted ? (
        <>
        <section className="fast-hero-section relative overflow-hidden">
            <HeroBackdropScene />
            <div className="relative z-10 px-8 pb-10 pt-10 md:px-12 md:pb-12 md:pt-14 lg:px-16 lg:pb-14">
                <div className="fast-hero-copy max-w-[54rem]">
                    <div className="inline-flex items-center gap-3 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.32em] text-blue-700">
                        <span>FAST</span>
                        <span className="h-1 w-1 rounded-full bg-blue-400"></span>
                        <span>Home ADHD Screening</span>
                    </div>
                    <h1 className="fast-hero-title fast-nowrap-desktop mt-6 text-[clamp(2.4rem,5.8vw,5.4rem)] font-black leading-[1.02] tracking-tight text-slate-950">
                        ADHD 초기 스크리닝 도구
                    </h1>
                    <p className="fast-nowrap-desktop mt-6 max-w-none text-3xl font-black leading-tight tracking-tight text-slate-900 md:text-4xl">
                        마음이 자꾸 흩어질 때, 부담 없이 확인해요
                    </p>
                    <p className="fast-nowrap-desktop mt-6 max-w-none text-base font-semibold leading-8 text-slate-500 md:text-lg md:leading-9">
                        설문과 짧은 집중 과제를 통해 부주의, 충동성, 과잉행동 경향을 부담 없이 살펴보는 FAST 데모입니다.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleStartScreening}
                        className="rounded-full bg-blue-600 px-7 py-4 text-sm font-black text-white shadow-[0_18px_34px_rgba(63,109,246,0.24)] transition-all hover:scale-[1.02]"
                      >
                        지금 검사해보기
                      </button>
                      <a
                        href="#fast-flow"
                        className="rounded-full border border-slate-200 bg-white/85 px-7 py-4 text-sm font-black text-slate-700 shadow-[0_14px_30px_rgba(92,108,145,0.10)] transition-all hover:bg-white"
                      >
                        흐름 먼저 보기
                      </a>
                    </div>
                </div>
            </div>
        </section>

        <HeroFactCards />

        <section
          id="fast-reasons"
          data-landing-reveal
          className="landing-reveal fast-reason-section mt-10"
          style={{ transitionDelay: "40ms" }}
        >
            <div className="mx-auto max-w-5xl">
                <p className="text-[11px] font-black tracking-[0.18em] text-blue-600">검사를 받아야 하는 이유</p>
                <h2 className="fast-nowrap-desktop mt-4 max-w-none text-4xl font-black leading-tight tracking-tight text-slate-950 md:text-5xl">
                    단순히 의지가 약해서가 아닐 수 있어요.
                </h2>
                <p className="fast-nowrap-desktop mt-6 max-w-none text-base font-medium leading-8 text-slate-500 md:text-lg">
                    반복되는 잊어버림, 산만함, 미루기는 주의 조절 방식과 연결될 수 있습니다. FAST는 현재 패턴을 먼저 편하게 살펴보는 시작점입니다.
                </p>

                <div className="mt-10 grid gap-5 md:grid-cols-3">
                    {reasonCards.map((card, index) => (
                      <article key={card.title} className="fast-reason-card rounded-[2rem] bg-white p-7 shadow-[0_18px_48px_rgba(95,133,242,0.10)]">
                        <div
                          className={`h-1.5 w-16 rounded-full ${
                            index === 0 ? "bg-blue-500" : index === 1 ? "bg-cyan-400" : "bg-violet-500"
                          }`}
                        ></div>
                        <h3 className="mt-6 text-2xl font-black tracking-tight text-slate-900">
                          {card.title}
                        </h3>
                        <p className="mt-5 text-base font-medium leading-8 text-slate-500">
                          {card.description}
                        </p>
                      </article>
                    ))}
                </div>
            </div>
        </section>

        <section
          id="fast-summary"
          data-landing-reveal
          className="landing-reveal fast-highlight-section mt-10"
          style={{ transitionDelay: "80ms" }}
        >
            <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-600">FAST Summary</p>
                    <h2 className="fast-nowrap-desktop mt-4 text-4xl font-black leading-tight tracking-tight text-slate-950 md:text-5xl">
                        검사는 짧게, 결과는 해석하기 쉽게.
                    </h2>
                    <p className="fast-nowrap-desktop mt-5 text-base font-medium leading-8 text-slate-500 md:text-lg">
                        검사 전 부담을 줄이고, 어떤 흐름으로 결과가 만들어지는지 한 화면에서 이해할 수 있게 정리했습니다.
                    </p>
                    <div className="mt-8 grid grid-cols-3 gap-3">
                        <div className="fast-mini-stat rounded-[1.5rem] px-4 py-5 text-center">
                            <p className="text-2xl font-black text-blue-600">5분</p>
                            <p className="mt-2 text-xs font-bold text-slate-500">예상 소요</p>
                        </div>
                        <div className="fast-mini-stat rounded-[1.5rem] px-4 py-5 text-center">
                            <p className="text-2xl font-black text-blue-600">2단계</p>
                            <p className="mt-2 text-xs font-bold text-slate-500">설문 + CPT</p>
                        </div>
                        <div className="fast-mini-stat rounded-[1.5rem] px-4 py-5 text-center">
                            <p className="text-2xl font-black text-blue-600">RAW</p>
                            <p className="mt-2 text-xs font-bold text-slate-500">데이터 제공</p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4">
                    {featureHighlights.map((feature) => (
                      <article key={feature.title} className="fast-feature-card grid gap-5 rounded-[2rem] bg-white p-6 shadow-[0_18px_48px_rgba(95,133,242,0.10)] sm:grid-cols-[6.5rem_1fr] sm:items-start">
                        <div className="rounded-[1.4rem] bg-blue-50 px-4 py-5 text-center">
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">{feature.label}</p>
                          <p className="mt-3 text-2xl font-black text-slate-900">{feature.value}</p>
                        </div>
                        <div>
                          <h3 className="text-2xl font-black tracking-tight text-slate-900">{feature.title}</h3>
                          <p className="mt-3 text-base font-medium leading-8 text-slate-500">
                            {feature.description}
                          </p>
                        </div>
                      </article>
                    ))}
                </div>
            </div>
        </section>

        <section
          id="fast-flow"
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
                <h3 className="fast-nowrap-desktop mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">FAST는 이렇게 진행됩니다</h3>
                <p className="fast-nowrap-desktop mt-4 text-base font-medium leading-8 text-slate-500">
                    설문, CPT를 순서대로 거쳐 결과를 도출합니다.
                </p>
            </div>

            <div className="mt-8">
                <ProcessTimeline />
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

        <section
          data-landing-reveal
          className="landing-reveal mt-14 px-1 pb-8"
          style={{ transitionDelay: "160ms" }}
        >
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-rose-500">FAQ</p>
                    <h3 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                        검사 전에 궁금한 점
                    </h3>
                    <p className="fast-nowrap-desktop mt-4 text-base font-medium leading-8 text-slate-500">
                        FAST는 진단이 아니라 현재의 경향을 확인하는 참고용 스크리닝입니다.
                    </p>
                </div>

                <div className="space-y-4">
                    {faqItems.map((item) => (
                      <details key={item.question} className="rounded-[2rem] bg-white p-6 shadow-[0_14px_34px_rgba(92,108,145,0.09)]">
                        <summary className="cursor-pointer list-none text-xl font-black text-slate-900">
                          {item.question}
                        </summary>
                        <p className="mt-4 text-base font-medium leading-8 text-slate-500">
                          {item.answer}
                        </p>
                      </details>
                    ))}
                </div>
            </div>
        </section>

        <ReviewCarousel reviews={featuredReviews} />
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

    <section id="environmentCheckOverlay" className="hidden fixed inset-0 z-[80] overflow-y-auto bg-slate-950/70 px-4 py-6 backdrop-blur-md" aria-hidden="true">
      <div className="mx-auto flex min-h-full w-full max-w-[92rem] items-center justify-center">
        <div className="w-full overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-[0_40px_140px_rgba(15,23,42,0.36)]">
          <div className="grid gap-0 lg:grid-cols-[1.12fr_0.88fr]">
            <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_40%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-8 md:p-12 lg:border-b-0 lg:border-r">
              <div className="inline-flex items-center gap-3 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-blue-700">
                <span>FAST</span>
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                <span>환경 점검</span>
              </div>

              <h2 className="mt-6 text-4xl font-black tracking-[-0.05em] text-slate-950 md:text-5xl">
                <span className="block">검사 전에</span>
                <span className="mt-2 block">조명과 화면 환경을</span>
                <span className="mt-2 block">먼저 맞춰주세요</span>
              </h2>

              <p id="environmentSummary" className="mt-6 max-w-xl text-base font-semibold leading-8 text-slate-600 md:text-lg">
                카메라 화면을 보며 조명, 얼굴 위치, 화면 환경을 확인해주세요.
              </p>

              <div className="mt-8 grid gap-5 md:grid-cols-3">
                <div id="environmentLightCard" className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Lighting</p>
                  <p id="environmentLightStatus" className="mt-3 text-xl font-black leading-tight tracking-tight text-amber-600 md:text-2xl">
                    조명을 밝게 맞춰주세요
                  </p>
                  <p id="environmentLightHint" className="mt-3 text-sm font-medium leading-6 text-slate-500">
                    얼굴이 어둡지 않게 실내 조명을 밝혀주세요.
                  </p>
                </div>

                <div id="environmentPositionCard" className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Position</p>
                  <p id="environmentPositionStatus" className="mt-3 text-xl font-black leading-tight tracking-tight text-amber-600 md:text-2xl">
                    얼굴이 중앙에 오게 맞춰주세요
                  </p>
                  <p id="environmentPositionHint" className="mt-3 text-sm font-medium leading-6 text-slate-500">
                    오른쪽 카메라 화면처럼 얼굴 전체가 중앙 네모 안에 들어오게 맞춰주세요.
                  </p>
                </div>

                <div id="environmentSetupCard" className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Setup</p>
                  <p id="environmentSetupStatus" className="mt-3 text-xl font-black leading-tight tracking-tight text-amber-600 md:text-2xl">
                    전체화면으로 진행해주세요
                  </p>
                  <p id="environmentSetupHint" className="mt-3 text-sm font-medium leading-6 text-slate-500">
                    가능하면 전체화면으로 진행해주세요.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button type="button" id="environmentContinueBtn" className="rounded-full bg-slate-950 px-7 py-4 text-sm font-black uppercase tracking-[0.24em] text-white transition disabled:cursor-not-allowed disabled:opacity-25">
                  계속 진행
                </button>
                <button type="button" id="environmentCloseBtn" className="rounded-full border border-slate-300 bg-white px-7 py-4 text-sm font-black uppercase tracking-[0.24em] text-slate-700 transition hover:border-slate-900 hover:text-slate-900">
                  닫기
                </button>
              </div>
            </div>

            <div className="bg-slate-950 p-4 md:p-6">
              <div className="environment-check-shell relative mx-auto flex min-h-[42rem] w-full max-w-[50rem] flex-col justify-between overflow-hidden rounded-[2rem] border border-emerald-400/40 bg-slate-900 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.36)] md:min-h-[46rem] md:p-6">
                <div className="environment-check-preview relative overflow-hidden rounded-[1.75rem] border border-white/10">
                  <video id="environmentWebcamPreview" autoPlay playsInline muted />
                  <canvas id="environmentGuideOverlay"></canvas>
                  <div id="environmentGuideBox" className="environment-check-guide-box pointer-events-none absolute left-1/2 top-1/2 h-[42%] min-h-[13rem] w-[28%] min-w-[12rem] max-w-[15rem] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border-[3px] border-cyan-400 transition-all duration-300"></div>
                  <div className="pointer-events-none absolute left-5 top-5">
                    <div id="environmentCameraBadge" className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-white backdrop-blur">
                      Camera Preview
                    </div>
                  </div>
                  <div className="pointer-events-none absolute right-5 top-5">
                    <div id="environmentFaceBadge" className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-white backdrop-blur">
                      Position Guide
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.25rem] border border-white/12 bg-slate-950/72 px-4 py-4 text-center backdrop-blur md:px-5 md:py-5">
                  <p className="text-[11px] font-black tracking-[0.18em] text-amber-300">영상 저장 안내</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-white md:text-base">
                    카메라 영상은 저장, 녹화, 업로드되지 않습니다. 검사 중 화면 환경 확인과 시선/얼굴 지표 계산에만 사용됩니다.
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

        <div className="pointer-events-none absolute left-5 top-5 z-[6]">
          <div className="calibration-preview-shell relative h-24 w-36 overflow-hidden rounded-[1.15rem] border border-emerald-400/35 bg-slate-900 shadow-[0_18px_48px_rgba(15,23,42,0.24)] sm:h-28 sm:w-44">
            <video id="calibrationWebcamPreview" autoPlay playsInline muted />
          </div>
        </div>

        <button
          type="button"
          id="calibrationCloseBtn"
          className="absolute right-6 top-6 z-30 rounded-full border border-slate-300 bg-white/88 px-5 py-3 text-sm font-black uppercase tracking-[0.24em] text-slate-700 shadow-[0_16px_40px_rgba(15,23,42,0.12)] transition hover:border-slate-900 hover:text-slate-900"
        >
          닫기
        </button>

        <div id="calibrationPointsLayer" className="pointer-events-none absolute inset-0 z-[15]"></div>
        <div id="calibrationReviewLayer" className="pointer-events-none absolute inset-0 z-[9] hidden"></div>

        <div id="calibrationIntroCard" className="absolute left-1/2 top-1/2 z-20 w-[min(92vw,40rem)] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-slate-200 bg-white px-8 py-8 shadow-[0_36px_120px_rgba(15,23,42,0.22)] md:px-10 md:py-10">
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

        <div id="calibrationControlPanel" className="hidden absolute left-0 top-0 z-[25] w-[min(92vw,20rem)] rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur">
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
            <button type="button" id="resultsAdminBtn" className="rounded-full border border-blue-100 bg-white px-6 py-3 text-sm font-black text-slate-700 shadow-[0_12px_26px_rgba(99,123,180,0.12)] transition hover:border-blue-200 hover:text-blue-700">
              관리자용
            </button>
          </div>
        </nav>

        <div className="mx-auto max-w-6xl space-y-8 px-6 py-10 md:py-14">
          <section className="fast-results-panel rounded-[2.75rem] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-10">
            <div className="max-w-4xl">
              <p className="text-xs font-black uppercase tracking-[0.32em] text-blue-600">Survey Result</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900 md:text-5xl">설문 결과 요약</h2>
              <p id="summaryIntro" className="mt-5 text-base font-medium leading-relaxed text-slate-500 md:text-lg">
                응답 패턴과 설문 중 측정된 집중 흐름을 함께 정리했습니다.
              </p>
            </div>

            <div id="summaryScreeningBreakdown" className="mt-10 grid gap-5 lg:grid-cols-3 text-left"></div>

            <div id="summaryCards" className="mt-8 grid gap-5 md:grid-cols-2 text-left"></div>

            <div className="fast-results-note mt-10 rounded-[2rem] border border-slate-100 bg-slate-50 p-8 text-left">
              <h3 className="text-2xl font-black text-slate-900">한눈에 보기</h3>
              <div id="summaryHighlights" className="mt-4 space-y-3 text-base leading-7 text-slate-600"></div>
            </div>
          </section>

          <section className="fast-results-panel rounded-[2.75rem] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-10">
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
              <div className="fast-results-note rounded-[2rem] border border-slate-100 bg-slate-50 p-8 lg:col-span-2">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900"><span className="h-5 w-1 rounded-full bg-blue-600"></span> 정성적 행동 분석</h3>
                <div id="cpt-interpretation-text" className="space-y-4 text-sm leading-relaxed text-slate-600"></div>
              </div>
            </div>

            <article className="fast-results-note mt-10 rounded-[2rem] border border-blue-100 bg-blue-50/70 p-7 text-left md:p-8">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-600">
                Detailed Report
              </p>
              <h3 className="mt-4 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                상세한 해석은 리포트 생성 후 확인할 수 있어요
              </h3>
              <p className="mt-4 max-w-3xl text-base font-medium leading-8 text-slate-600 md:text-lg">
                설문, CPT, 시선 이탈, 머리 자세 지표를 종합한 문장형 리포트는 리포트 생성을 눌러야 볼 수 있습니다.
              </p>

              <div id="result-report-actions" className="mt-7 flex flex-col gap-4 md:flex-row">
                <button type="button" id="cpt-restart-btn" className="flex-1 rounded-full border border-blue-100 bg-white px-8 py-5 text-base font-black text-slate-700 shadow-[0_14px_30px_rgba(99,123,180,0.12)] transition hover:border-blue-200 hover:text-blue-700 md:text-lg">처음부터 다시 하기</button>
              </div>
            </article>
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

    </>
  );
}
