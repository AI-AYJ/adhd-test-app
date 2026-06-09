import Link from "next/link";
import { Gowun_Dodum, Jua } from "next/font/google";

const gowunDodum = Gowun_Dodum({
  weight: "400",
  subsets: ["latin"],
  preload: false,
});

const jua = Jua({
  weight: "400",
  subsets: ["latin"],
  preload: false,
});

const steps = [
  {
    number: "01",
    title: "가볍게 체크",
    body: "부주의, 충동성, 과잉행동 경향을 일상 문항으로 편하게 살펴봅니다.",
  },
  {
    number: "02",
    title: "짧은 집중 과제",
    body: "설문 뒤 짧은 CPT를 진행해 집중 흐름과 반응 패턴을 함께 봅니다.",
  },
  {
    number: "03",
    title: "부드러운 결과 안내",
    body: "위험도만 보여주지 않고 지금 시도할 수 있는 생활 방향까지 정리합니다.",
  },
];

const symptomCards = [
  {
    title: "자꾸 잊어버려요",
    body: "약속, 준비물, 마감일이 머릿속에서 자주 사라지는 느낌이 들 때가 있습니다.",
  },
  {
    title: "집중이 쉽게 흔들려요",
    body: "해야 할 일은 알지만 소리, 생각, 주변 자극에 금방 끌려가기도 합니다.",
  },
  {
    title: "시작이 자꾸 늦어져요",
    body: "미루고 싶은 마음이 커져서 마지막 순간에야 움직이는 패턴이 반복됩니다.",
  },
];

const faqs = [
  {
    question: "이 검사는 진단서인가요?",
    answer: "아닙니다. FAST는 초기 스크리닝 도구이며, 진단은 전문 의료기관의 평가가 필요합니다.",
  },
  {
    question: "얼마나 걸리나요?",
    answer: "설문과 짧은 집중 과제를 합쳐 약 5분 안에 흐름을 마치는 구성을 목표로 합니다.",
  },
  {
    question: "기존 FAST 기능은 유지되나요?",
    answer: "네. 이 데모는 랜딩 디자인 시안이고, 실제 설문, CPT, 결과 로직은 기존 흐름과 연결할 수 있습니다.",
  },
];

function SoftLogo() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#6b8df2] text-base font-bold text-white shadow-[0_10px_24px_rgba(80,119,220,0.22)]">
        F
      </span>
      <div>
        <p className={`${jua.className} text-xl font-normal leading-5 text-[#30364a]`}>FAST</p>
        <p className="text-xs font-medium text-[#76809a]">ADHD screening</p>
      </div>
    </div>
  );
}

function MindBubble({
  color,
  children,
  className,
}: {
  color: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`absolute grid h-24 w-28 place-items-center rounded-[45%_55%_48%_52%] ${className ?? ""}`}
      style={{ backgroundColor: color }}
    >
      {children}
    </div>
  );
}

function SoftFigure({
  color,
  className,
  children,
}: {
  color: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`absolute bottom-14 flex flex-col items-center ${className ?? ""}`}>
      <div className="relative h-32 w-28">
        <div className="absolute left-1/2 top-3 h-24 w-20 -translate-x-1/2 rounded-[55%_45%_48%_52%]" style={{ backgroundColor: color }} />
        <div className="absolute left-1/2 top-[5.8rem] h-20 w-24 -translate-x-1/2 rounded-t-[3.5rem]" style={{ backgroundColor: color }} />
        {children}
      </div>
    </div>
  );
}

function HeroPeopleIllustration() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[72%] overflow-hidden" aria-hidden="true">
      <div className="absolute bottom-14 left-[17%] h-[82%] w-[70%] rounded-t-[100%] bg-[#b8c8fb]/70" />

      <div className="absolute bottom-12 left-[7%] h-24 w-12 rotate-[-22deg] rounded-[70%_30%_45%_55%] bg-[#80b23b]" />
      <div className="absolute bottom-14 left-[11%] h-20 w-9 rotate-[-8deg] rounded-[60%_40%_45%_55%] bg-[#9bcf61]" />
      <div className="absolute bottom-12 right-[3%] h-28 w-12 rotate-[24deg] rounded-[35%_65%_55%_45%] bg-[#80b23b]" />
      <div className="absolute bottom-13 right-[8%] h-20 w-9 rotate-[8deg] rounded-[35%_65%_55%_45%] bg-[#a5d86a]" />

      <SoftFigure color="#f6a0b5" className="left-[28%]">
        <MindBubble color="#ffa7b7" className="-left-2 -top-11 rotate-[-8deg]">
          <div className="relative h-14 w-14 rounded-full bg-[#ffe6ea]">
            <span className="absolute left-3 top-3 h-8 w-8 rounded-full border-2 border-[#6d4b55]" />
            <span className="absolute left-5 top-2 h-9 w-7 rotate-45 rounded-full border-2 border-[#6d4b55]" />
            <span className="absolute left-2 top-5 h-7 w-10 rotate-[-20deg] rounded-full border-2 border-[#6d4b55]" />
          </div>
        </MindBubble>
      </SoftFigure>

      <SoftFigure color="#9c5d72" className="left-[42%] scale-90">
        <MindBubble color="#c8849d" className="-left-3 -top-3 h-20 w-24 rotate-[12deg]">
          <div className="relative h-11 w-14 rounded-[55%] bg-[#a46d84]">
            <span className="absolute left-4 top-3 h-px w-7 rotate-[22deg] bg-[#9ad4f1]" />
            <span className="absolute left-3 top-6 h-px w-8 rotate-[-18deg] bg-[#9ad4f1]" />
            <span className="absolute left-2 top-3 h-2 w-2 rounded-full border border-[#9ad4f1]" />
            <span className="absolute right-3 bottom-3 h-2 w-2 rounded-full border border-[#9ad4f1]" />
          </div>
        </MindBubble>
      </SoftFigure>

      <SoftFigure color="#aac34c" className="left-[53%]">
        <MindBubble color="#adbf4f" className="-left-2 -top-12 rotate-[10deg]">
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 9 }).map((_, index) => (
              <span key={index} className="h-3 w-3 rounded-full bg-[#ffc86b]" />
            ))}
          </div>
        </MindBubble>
      </SoftFigure>

      <SoftFigure color="#ffad38" className="left-[67%] scale-[0.82]">
        <MindBubble color="#ffbe56" className="-left-3 -top-6 h-20 w-24 rotate-[-13deg]">
          <div className="relative h-12 w-16">
            <span className="absolute left-1 top-2 text-xl font-bold text-[#e95d78]">♥</span>
            <span className="absolute right-2 top-2 h-3 w-3 rounded-full bg-[#e95d78]" />
            <span className="absolute left-7 top-1 h-3 w-3 rotate-45 bg-[#e95d78]" />
            <span className="absolute bottom-2 left-5 h-3 w-3 rounded-full bg-[#f1849a]" />
            <span className="absolute bottom-1 right-4 h-4 w-4 rotate-45 bg-[#ffdf8a]" />
          </div>
        </MindBubble>
      </SoftFigure>

      <SoftFigure color="#5d91e3" className="left-[79%]">
        <MindBubble color="#6a9deb" className="-left-1 -top-11 rotate-[6deg]">
          <div className="grid grid-cols-2 gap-1">
            <span className="h-5 w-5 rounded-md bg-[#ff7b8a]" />
            <span className="h-5 w-5 rounded-md bg-[#9fc65f]" />
            <span className="h-5 w-5 rounded-md bg-[#ffc15c]" />
            <span className="h-5 w-5 rounded-md bg-[#ff8b8b]" />
          </div>
        </MindBubble>
      </SoftFigure>

      <div className="absolute -bottom-24 left-1/2 h-44 w-[140%] -translate-x-1/2 rounded-[50%_50%_0_0] bg-white" />
    </div>
  );
}

export default function DesignDemoPage() {
  return (
    <main className={`${gowunDodum.className} min-h-screen bg-[#fffaf3] text-[#30364a]`}>
      <header className="sticky top-0 z-50 border-b border-[#dce5f6] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" aria-label="FAST home">
            <SoftLogo />
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-normal text-[#65708a] md:flex">
            <a href="#process">진행 방식</a>
            <a href="#evidence">검사 근거</a>
            <a href="#faq">FAQ</a>
          </nav>
          <Link
            href="/"
            className="rounded-full bg-[#5f85f2] px-5 py-2.5 text-sm font-normal text-white shadow-[0_12px_24px_rgba(95,133,242,0.25)] transition hover:bg-[#4e74df]"
          >
            검사 시작
          </Link>
        </div>
      </header>

      <section className="relative min-h-[74svh] overflow-hidden bg-[#eaf2ff]">
        <HeroPeopleIllustration />
        <div className="relative z-10 mx-auto flex min-h-[74svh] max-w-6xl items-center px-5 pb-28 pt-16">
          <div className="max-w-[36rem]">
            <p className="inline-flex rounded-full bg-white/70 px-4 py-2 text-sm font-normal text-[#5c6f94] shadow-[0_8px_24px_rgba(99,123,180,0.12)]">
              집에서 해보는 ADHD 초기 체크
            </p>
            <h1 className={`${jua.className} mt-6 text-5xl font-normal leading-tight text-[#333744] md:text-6xl`}>
              마음이 자꾸 흩어질 때,
              <br />
              부드럽게 확인해요
            </h1>
            <p className="mt-6 max-w-xl text-xl font-normal leading-9 text-[#485268]">
              설문과 짧은 집중 과제를 통해 부주의, 충동성, 과잉행동 경향을 부담 없이 살펴보는 FAST 데모입니다.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full bg-[#3f6df6] px-8 py-4 text-base font-normal text-white shadow-[0_16px_28px_rgba(63,109,246,0.26)] transition hover:-translate-y-0.5"
              >
                지금 검사해보기
              </Link>
              <a
                href="#process"
                className="inline-flex items-center justify-center rounded-full bg-white/78 px-8 py-4 text-base font-normal text-[#52607a] shadow-[0_12px_26px_rgba(99,123,180,0.14)] transition hover:-translate-y-0.5"
              >
                흐름 먼저 보기
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 pb-12 pt-8">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          {["약 5분 소요", "DSM-5 기반 문항", "설문 + CPT 통합"].map((item) => (
            <div key={item} className="rounded-[1.75rem] bg-[#f7f9ff] px-6 py-5 shadow-[inset_0_0_0_1px_rgba(121,139,180,0.12)]">
              <p className={`${jua.className} text-xl font-normal text-[#3d4660]`}>{item}</p>
              <p className="mt-2 text-sm font-medium leading-6 text-[#7b849a]">부담을 낮추고 핵심만 차분하게 확인합니다.</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#fffaf3] px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-sm font-normal text-[#71964d]">검사를 받아야 하는 이유</p>
            <h2 className={`${jua.className} mt-4 text-4xl font-normal leading-tight text-[#333744] md:text-5xl`}>
              단순히 의지가 약해서가 아닐 수 있어요.
            </h2>
            <p className="mt-5 text-lg font-normal leading-8 text-[#667086]">
              반복되는 잊어버림, 산만함, 미루기는 주의 조절 방식과 연결될 수 있습니다. FAST는 현재 패턴을 먼저 편하게 살펴보는 시작점입니다.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {symptomCards.map((card) => (
              <article key={card.title} className="rounded-[2rem] bg-white p-7 shadow-[0_18px_38px_rgba(94,75,48,0.08)]">
                <div className="mb-6 h-12 w-12 rounded-[1.25rem] bg-[#ffe3af]" />
                <h3 className={`${jua.className} text-2xl font-normal text-[#343949]`}>{card.title}</h3>
                <p className="mt-4 text-base font-normal leading-7 text-[#6f788d]">{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="process" className="bg-[#eef9f1] px-5 py-16">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-start">
          <div>
            <p className="text-sm font-normal text-[#5e8d55]">진행 방식</p>
            <h2 className={`${jua.className} mt-4 text-4xl font-normal leading-tight text-[#333744] md:text-5xl`}>
              짧게 묻고, 차분히 정리해요.
            </h2>
            <p className="mt-5 text-lg font-normal leading-8 text-[#647083]">
              상담형 랜딩의 친근함은 살리고, 기존 FAST의 설문과 CPT 흐름은 결과 신뢰 요소로 유지한 시안입니다.
            </p>
          </div>
          <div className="space-y-4">
            {steps.map((step) => (
              <article key={step.number} className="grid grid-cols-[4rem_1fr] gap-4 rounded-[2rem] bg-white p-6 shadow-[0_16px_34px_rgba(67,111,80,0.08)]">
                <div className={`${jua.className} grid h-14 w-14 place-items-center rounded-2xl bg-[#9fcf72] text-base font-normal text-white`}>
                  {step.number}
                </div>
                <div>
                  <h3 className={`${jua.className} text-2xl font-normal text-[#343949]`}>{step.title}</h3>
                  <p className="mt-2 text-base font-normal leading-7 text-[#6f788d]">{step.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="evidence" className="bg-white px-5 py-16">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-sm font-normal text-[#d97e67]">검사 근거</p>
            <h2 className={`${jua.className} mt-4 text-4xl font-normal leading-tight text-[#333744] md:text-5xl`}>
              과장하지 않고, 참고용으로 분명하게.
            </h2>
            <p className="mt-5 text-lg font-normal leading-8 text-[#667086]">
              DSM-5의 핵심 증상 영역을 참고하되, 이 화면은 의학적 진단이 아니라 초기 스크리닝이라는 점을 명확히 안내합니다.
            </p>
          </div>
          <div className="rounded-[2rem] bg-[#fff0e7] p-7 shadow-[inset_0_0_0_1px_rgba(217,126,103,0.12)]">
            <p className="text-sm font-normal text-[#bc614e]">주의사항</p>
            <p className={`${jua.className} mt-4 text-3xl font-normal leading-9 text-[#3d3a35]`}>
              고위험 결과가 나오거나 일상 기능 저하가 크다면 전문 상담을 권장합니다.
            </p>
            <p className="mt-4 text-base font-normal leading-7 text-[#7a6d65]">
              결과는 응답과 과제 수행 데이터를 바탕으로 한 참고 자료이며, 진단서로 사용되지 않습니다.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#f4f0ff] px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-sm font-normal text-[#7b6acb]">결과 화면 방향</p>
            <h2 className={`${jua.className} mt-4 text-4xl font-normal leading-tight text-[#333744] md:text-5xl`}>
              점수보다 생활에 닿는 언어로.
            </h2>
            <p className="mt-5 text-lg font-normal leading-8 text-[#667086]">
              위험도, 집중 흐름, 산만함 신호, 바로 시도할 수 있는 루틴 제안을 한 화면에서 부드럽게 보여주는 방향입니다.
            </p>
          </div>
          <div className="mt-9 grid gap-5 md:grid-cols-2">
            <div className="rounded-[2rem] bg-white p-7 shadow-[0_16px_34px_rgba(89,74,149,0.08)]">
              <p className={`${jua.className} text-4xl font-normal text-[#7b6acb]`}>Risk</p>
              <p className="mt-3 text-base font-normal leading-7 text-[#6f788d]">초기 위험도와 주요 신호를 쉽게 해석합니다.</p>
            </div>
            <div className="rounded-[2rem] bg-white p-7 shadow-[0_16px_34px_rgba(89,74,149,0.08)]">
              <p className={`${jua.className} text-4xl font-normal text-[#5aa7bc]`}>Focus</p>
              <p className="mt-3 text-base font-normal leading-7 text-[#6f788d]">CPT 기반 집중 흐름을 부담 없는 문장으로 풀어냅니다.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="bg-[#fffaf3] px-5 py-16">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-normal text-[#5f85f2]">FAQ</p>
          <h2 className={`${jua.className} mt-4 text-4xl font-normal leading-tight text-[#333744]`}>자주 묻는 질문</h2>
          <div className="mt-8 space-y-3">
            {faqs.map((faq) => (
              <details key={faq.question} className="rounded-[1.75rem] bg-white p-6 shadow-[0_12px_28px_rgba(94,75,48,0.07)]">
                <summary className={`${jua.className} cursor-pointer list-none text-xl font-normal text-[#343949]`}>
                  {faq.question}
                </summary>
                <p className="mt-3 text-base font-normal leading-7 text-[#6f788d]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-14">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 rounded-[2rem] bg-[#eaf2ff] p-7 md:flex-row md:items-center md:justify-between">
          <div>
            <p className={`${jua.className} text-3xl font-normal text-[#333744]`}>이 톤으로 실제 랜딩에 적용 가능</p>
            <p className="mt-3 text-base font-normal leading-7 text-[#65708a]">
              현재는 데모 페이지입니다. 확정되면 기존 메인 화면의 hero와 안내 섹션부터 이 스타일로 옮기면 됩니다.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-[#5f85f2] px-7 py-4 font-normal text-white shadow-[0_12px_24px_rgba(95,133,242,0.22)]"
          >
            기존 검사로 이동
          </Link>
        </div>
      </section>
    </main>
  );
}
