# <img width="207" height="54" alt="image" src="https://github.com/user-attachments/assets/3e121577-0950-4498-9e47-b8e3069a0d45" /> 
FAST: ADHD Screening Web



> 웹캠 기반 행동 분석과 LLM 리포트를 결합한 성인 ADHD 초기 스크리닝 웹 서비스

FAST는 성인 ADHD를 의심하는 사용자가 병원 방문 전 자신의 주의·행동 특성을 간단히 확인해볼 수 있도록 만든 웹 기반 스크리닝 서비스입니다.

사용자는 웹에서 자가보고 설문과 CPT 기반 주의력 과제를 수행하고, 검사 중 나타나는 반응 패턴, 시선 이탈, 머리 움직임 등의 디지털 바이오마커를 바탕으로 결과 리포트를 확인할 수 있습니다.

본 프로젝트는 건양대학교 인공지능학과 4학년 캡스톤디자인 프로젝트로 개발되었습니다.

<img width="635" height="151" alt="image" src="https://github.com/user-attachments/assets/c568bbbb-9759-48bd-b270-0d3da49b9ffd" />

<img width="1199" height="629" alt="캡스톤디자인_시스템아키텍처" src="https://github.com/user-attachments/assets/13d98019-4f51-417e-a533-79c93ad451a1" />

---

## Live Demo

https://adhd-test-app-9ovm.vercel.app/

---

## Why FAST?

성인 ADHD는 일상생활, 학업, 업무 집중도에 큰 영향을 줄 수 있지만, 병원 방문 전에는 자신의 상태를 객관적으로 확인하기 어렵습니다.

FAST는 이러한 접근 장벽을 낮추기 위해, 별도의 장비 없이 웹캠과 브라우저만으로 사용자의 주의 및 행동 특성을 살펴볼 수 있는 스크리닝 환경을 제공합니다.

단순 설문 결과만 보여주는 것이 아니라, 검사 중 사용자의 반응과 행동 데이터를 함께 분석하여 더 직관적인 결과 리포트를 제공하는 것이 특징입니다.

<img width="1217" height="519" alt="image" src="https://github.com/user-attachments/assets/37b10afa-b951-4e96-9df2-641e4984f355" />


---

## 📌 Key Features

### Self-Report Survey

ADHD와 관련된 부주의, 과잉행동, 충동성 특성을 확인하기 위한 자가보고 설문을 제공합니다.

### CPT Attention Task

사용자는 화면에 제시되는 자극에 반응하는 간단한 CPT 과제를 수행합니다.
이를 통해 정반응, 누락 오류, 오반응, 반응시간 등의 주의력 관련 지표를 확인합니다.

### Webcam-Based Behavior Analysis

검사 중 웹캠을 활용해 사용자의 시선 이탈과 머리 움직임을 분석합니다.
이를 통해 과제 수행 중 집중 유지와 관련된 보조 지표를 계산합니다.

### AI-Generated Report

검사 결과는 LLM 기반 리포트로 변환됩니다.
사용자는 단순한 점수표가 아니라, 자신의 주의·행동 특성을 설명형 문장으로 확인할 수 있습니다.

### Result Dashboard

검사 결과는 시각화된 대시보드 형태로 제공되며, 사용자가 주요 지표를 쉽게 이해할 수 있도록 구성했습니다.

---

## System Flow

```text
사용자 접속
   ↓
자가보고 설문 진행
   ↓
웹캠 기반 시선/얼굴 추적
   ↓
CPT 주의력 과제 수행
   ↓
반응 데이터 및 행동 지표 분석
   ↓
LLM 기반 결과 리포트 생성
   ↓
결과 대시보드 제공
```

---

## Tech Stack

* Next.js
* React
* TypeScript
* Tailwind CSS
* Supabase
* WebGazer.js
* MediaPipe Face Landmarker
* Gemini LLM
* Vercel

---

## Preview

FAST는 다음과 같은 흐름으로 구성됩니다.

* ADHD 관련 자가보고 설문
* 웹캠 권한 허용 및 행동 분석 준비
* CPT 기반 주의력 과제
* 시선 이탈 및 머리 움직임 분석
* AI 기반 결과 리포트 생성
* 사용자 친화적인 결과 대시보드 제공

---

## 🙌  Getting Started

### 1. Clone Repository

```bash
git clone https://github.com/AI-AYJ/adhd-test-app.git
cd adhd-test-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

리포트 생성에는 Vercel 또는 `.env.local`의 `GEMINI_API_KEY`가 필요합니다.
기본 설정에서는 Supabase 연결, 임베딩 검색, DB 저장 없이 리포트를 생성하고 표시합니다.
Supabase 환경 변수가 없어도 빌드와 리포트 생성이 가능합니다.
생성 결과는 현재 브라우저 탭의 `sessionStorage`에 임시 보관하며, 새로고침 후에도 같은 탭에서 확인할 수 있습니다.
탭을 닫으면 임시 데이터가 사라지므로 보관하려면 리포트 화면의 **리포트 인쇄 → PDF로 저장**을 사용하세요.
임시 리포트 주소는 다른 브라우저나 기기에서 공유하여 열 수 없으며, DB 기반 리포트 목록에는 추가되지 않습니다.

Supabase를 복구한 뒤 DB 저장과 참고 문서 검색을 다시 사용하려면
`REPORT_DATABASE_ENABLED=true`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`를 설정하세요.
이 경우에도 DB 저장이나 참고 검색에 실패하면 생성된 리포트 자체는 표시됩니다.

GitHub 변경 사항을 반영한 후 연결된 Vercel 프로젝트에서 새로 배포하면 적용됩니다.
기존 Gemini 환경 변수는 유지하고, DB를 사용하지 않는 동안 `REPORT_DATABASE_ENABLED`는 설정하지 않거나 `false`로 두세요.

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

---

## ⚠️ Important Notice

> **FAST is not a medical diagnosis tool.**
> 본 서비스는 ADHD를 진단하거나 치료 여부를 판단하는 의료기기가 아닙니다.

FAST는 사용자가 자신의 주의 및 행동 특성을 이해해볼 수 있도록 돕는 **초기 스크리닝 보조 도구**입니다.
검사 결과는 ADHD 진단을 의미하지 않으며, 결과가 높게 나타나더라도 반드시 전문적인 평가가 필요합니다.

정확한 진단, 치료 여부, 약물 복용 여부는 **정신건강의학과 전문의 또는 관련 전문가와의 상담**을 통해 결정되어야 합니다.

또한 FAST는 사용자의 개인정보 보호를 위해 **웹캠 영상을 저장, 녹화, 업로드하지 않습니다.**
카메라 정보는 검사 중 실시간 행동 지표 계산에만 사용됩니다.



---

## Repository

https://github.com/AI-AYJ/adhd-test-app
