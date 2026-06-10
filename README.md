# FAST: ADHD Screening Web App

> 설문, CPT, 시선/얼굴 행동 데이터를 활용한 ADHD 초기 스크리닝 웹 애플리케이션

FAST는 웹 환경에서 ADHD 관련 경향을 간단히 확인할 수 있도록 만든 스크리닝 시스템입니다.  
사용자는 설문과 CPT 과제를 진행하고, 검사 결과는 LLM 기반 리포트로 확인할 수 있습니다.

> 본 프로젝트는 의료 진단을 대체하지 않는 참고용 스크리닝 도구입니다.

<br />

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Gemini](https://img.shields.io/badge/Gemini-AI-4285F4)](https://ai.google.dev/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com/)

---

## 📚 Table of Contents

- [Overview](#-overview)
- [Live Demo](#-live-demo)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Installation & Setup](#-installation--setup)
- [Environment Variables](#-environment-variables)
- [Available Scripts](#-available-scripts)
- [Disclaimer](#-disclaimer)

---

## 🧭 Overview

FAST는 ADHD 관련 경향을 빠르게 살펴볼 수 있도록 설계된 웹 기반 스크리닝 앱입니다.

검사는 설문과 CPT 과제로 구성되며, 사용자의 응답과 수행 흐름을 바탕으로 결과를 정리합니다.  
이후 Gemini 기반 LLM이 사용자가 이해하기 쉬운 문장형 리포트를 생성합니다.

---

## 🌐 Live Demo

https://adhd-test-app.vercel.app/

---

## ✨ Key Features

- **ADHD Screening Flow**  
  설문과 CPT를 하나의 검사 흐름으로 제공합니다.

- **CPT-Based Attention Task**  
  짧은 집중 과제를 통해 반응 패턴을 확인합니다.

- **Camera-Based Tracking**  
  WebGazer와 MediaPipe를 활용해 검사 중 시선과 얼굴 자세 정보를 참고합니다.

- **AI Report Generation**  
  Gemini LLM이 검사 결과를 사용자가 이해하기 쉬운 리포트로 생성합니다.

- **Report Archive**  
  생성된 리포트를 다시 확인하고 브라우저 인쇄 기능을 통해 PDF로 저장할 수 있습니다.

---

## 🏗️ System Architecture

![FAST System Architecture](docs/architecture.png)

```text
User
  ↓
FAST Web App
  ↓
Survey + CPT
  ↓
Gaze / Head Pose Tracking
  ↓
Metric Processing
  ↓
Supabase
  ↓
Gemini LLM
  ↓
Screening Report
```

---

## 🛠️ Tech Stack

| Area | Stack |
| --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Tracking | WebGazer, MediaPipe |
| Backend | Next.js API Routes |
| Database | Supabase |
| AI Report | Gemini API |
| Deployment | Vercel |

---

## 🚀 Installation & Setup

```bash
git clone https://github.com/AI-AYJ/adhd-test-app.git
cd adhd-test-app
npm install
npm run dev
```

Development server:

```text
http://localhost:3000
```

---

## 🔐 Environment Variables

Create a `.env.local` file in the project root.

```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
```

---

## 📦 Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

---

## ⚠️ Disclaimer

FAST is not a medical diagnostic tool.

본 시스템은 ADHD를 진단하기 위한 의료기기가 아니라, 사용자의 주의 및 행동 특성을 살펴보기 위한 초기 스크리닝 도구입니다.  
정확한 진단과 치료 여부는 전문 의료진의 평가가 필요합니다.

카메라 영상은 저장, 녹화, 업로드되지 않으며 검사 중 지표 계산을 위해서만 사용됩니다.
