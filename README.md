This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Gemini Integration

This app includes server-side API routes for Gemini embedding and LLM calls.

- `POST /api/gemini/embeddings` - Gemini embedding generation and optional Supabase storage
- `POST /api/gemini/llm` - Gemini LLM call

Create a `.env.local` file with your Gemini key and model names. The app builds Gemini request URLs from the model names.

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_LLM_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


<div align="center">


# 🧠 ADHD AI Screening System

### AI 기반 ADHD 선별검사 및 행동 분석 플랫폼

ADHD 설문검사, CPT(Continuous Performance Test), 시선 추적(Eye Tracking), AI 리포트 생성을 통합한 웹 기반 ADHD 선별검사 시스템

<br>

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Gemini](https://img.shields.io/badge/Gemini-AI-4285F4)](https://ai.google.dev/)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-FF6F00)](https://mediapipe.dev/)

<br>

🌐 **Live Demo**

https://adhd-test-app-9ovm.vercel.app/

</div>

---

## 📌 Project Overview

ADHD는 대표적인 신경발달장애 중 하나로 조기 발견과 평가가 중요합니다.

본 프로젝트는 ADHD 선별검사를 웹 환경에서 수행할 수 있도록 설계된 AI 기반 통합 평가 시스템입니다.

사용자는 ADHD 설문검사와 CPT(Continuous Performance Test)를 수행하며, 검사 과정에서 수집되는 행동 데이터와 시선 추적 데이터를 기반으로 AI가 결과를 분석하여 맞춤형 리포트를 제공합니다.

---

## 🎯 Objectives

- ADHD 선별검사의 접근성 향상
- 웹 기반 행동 데이터 수집
- 시선 추적 기반 집중도 측정
- AI 기반 결과 해석 자동화
- 사용자 맞춤형 피드백 제공

---

# ✨ Features

## 📋 ADHD Questionnaire

DSM 기반 ADHD 설문 검사

### 분석 항목

- Inattention (부주의성)
- Hyperactivity (과잉행동)
- Impulsivity (충동성)

---

## 🎮 CPT Test

Continuous Performance Test

### 측정 항목

- Attention Score
- Response Accuracy
- Reaction Time
- Impulsivity
- Hyperactivity

---

## 👁️ Eye Tracking

MediaPipe FaceMesh 기반 시선 추적

### 측정 항목

- Gaze Off-Task Ratio
- Focus Consistency
- Head Movement Variability

---

## 🤖 AI Report Generation

Google Gemini 기반 분석

### 제공 내용

- ADHD 위험도 평가
- 행동 패턴 분석
- 검사 결과 요약
- 맞춤형 피드백

---

# 🏗️ System Architecture

```text
┌──────────────────────┐
│      User            │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ ADHD Questionnaire   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│      CPT Test        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│    Eye Tracking      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│      Supabase        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│     Gemini AI        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  ADHD Risk Report    │
└──────────────────────┘
```

---

# 🖥️ Screenshots

## Main Page

![Main](docs/main-page.png)

---

## ADHD Questionnaire

![Questionnaire](docs/questionnaire.png)

---

## CPT Test

![CPT](docs/cpt-test.png)

---

## AI Analysis Report

![Report](docs/report.png)

---

# 🧠 ADHD Analysis Pipeline

## Input Features

### Questionnaire

- Inattention Count
- Hyperactivity Count

### CPT Metrics

- Attention Score
- Timeliness Score
- Impulsivity Score
- Hyperactivity Score

### Eye Tracking Metrics

- Gaze Off-Task Ratio
- Head Movement Variability

---

## AI Processing

Gemini AI analyzes the collected behavioral data and generates a personalized ADHD screening report.

```text
Questionnaire
      +
CPT Metrics
      +
Eye Tracking
      ↓
 Feature Extraction
      ↓
 Gemini Analysis
      ↓
 ADHD Risk Assessment
      ↓
 Personalized Report
```

---

# 🗄️ Database Schema

## user_results

| Field | Type |
|---------|---------|
| id | UUID |
| created_at | Timestamp |
| inattention_count | Integer |
| hyperactivity_count | Integer |
| cpt_attention | Float |
| cpt_timeliness | Float |
| cpt_impulsivity | Float |
| cpt_hyperactivity | Float |
| gaze_off_task_ratio | Float |
| head_movement_variability | Float |
| ai_report | Text |

---

# 🛠 Tech Stack

## Frontend

- Next.js 15
- React
- TypeScript
- Tailwind CSS

## Backend

- Next.js API Routes

## Database

- Supabase

## AI

- Google Gemini API

## Computer Vision

- MediaPipe FaceMesh

## Deployment

- Vercel

---

# 📂 Project Structure

```bash
my-app
│
├── app
│   ├── api
│   │   ├── analyze
│   │   ├── generate-report
│   │   └── results
│   │
│   ├── report
│   └── page.tsx
│
├── components
│
├── lib
│   ├── gemini.ts
│   └── supabase.ts
│
├── public
│
└── docs
```

---

# 🚀 Installation

## Clone Repository

```bash
git clone https://github.com/AI-AYJ/adhd-test-app.git
```

## Move Directory

```bash
cd adhd-test-app
```

## Install Packages

```bash
npm install
```

## Environment Variables

Create `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

GEMINI_API_KEY=
```

## Run Development Server

```bash
npm run dev
```

---

# 📊 Example Result

```text
ADHD Risk Level : Moderate

Inattention : High
Hyperactivity : Moderate

Key Findings

• Frequent attention shifts detected
• Elevated CPT impulsivity score
• Increased gaze deviation ratio

AI Interpretation

The user demonstrates patterns associated
with attentional difficulties and may benefit
from further professional evaluation.
```

---

# 🔬 Future Work

- ADHD/Non-ADHD 분류 모델 구축
- 머신러닝 기반 위험도 예측
- 장기 추적 데이터 분석
- 모바일 환경 최적화
- 의료기관 연계 기능

---

# 👨‍💻 Team

Capstone Design Project

AI-Based ADHD Screening System

2026

---

<div align="center">

### ⭐ If you found this project interesting, please consider giving it a star!

</div>
