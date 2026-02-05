# 🔬 Innovate Research - Implementation Plan

> AI-Powered Deep Research Platform by InnovateHub Inc.
> Target: Production-ready webapp with API for AI agents and external apps

---

## 📋 Executive Summary

**Innovate Research** is an advanced AI-powered research platform that automates comprehensive internet research, data analysis, and report generation in multiple formats optimized for both human consumption and AI agent knowledge bases.

---

## 🎯 Core Features

### 1. Multi-Source Research Engine
- **Web Search Integration** (Brave, Google, Bing APIs)
- **Deep Web Crawling** with JS rendering (Playwright/Puppeteer)
- **Social Media Scraping** (Twitter, LinkedIn, Facebook)
- **News Aggregation** (Google News, RSS feeds)
- **Academic Sources** (Google Scholar, ArXiv, PubMed)
- **Patent Databases** (USPTO, Google Patents)
- **Company Data** (Crunchbase, LinkedIn Company)

### 2. AI Analysis Pipeline
- **Entity Extraction** (people, companies, products, locations)
- **Sentiment Analysis** (brand perception, reviews)
- **Relationship Mapping** (competitors, partners, investors)
- **Trend Detection** (market trends, keyword analysis)
- **Fact Verification** (cross-reference multiple sources)
- **Gap Analysis** (identify missing information)

### 3. Multi-Format Export
| Format | Use Case | Features |
|--------|----------|----------|
| **PDF** | Executive reports | Branded, charts, TOC |
| **Markdown** | Documentation | GitHub-ready, structured |
| **CSV/Excel** | Data analysis | Tabular data, metrics |
| **JSON** | API integration | Structured, typed |
| **JSONL** | AI training | Vector-ready chunks |
| **RAG Format** | AI agents | Embeddings + metadata |

### 4. AI Agent Integration
- **OpenAPI 3.0** specification
- **Webhook callbacks** for async research
- **Streaming results** (SSE/WebSocket)
- **Batch API** for bulk research
- **SDK packages** (Python, Node.js, PHP)

### 5. Research Templates
- Company Profile
- Competitor Analysis
- Market Research
- Person/Executive Profile
- Product Analysis
- Industry Overview
- SWOT Analysis
- Due Diligence

### 6. Collaboration Features
- Team workspaces
- Shared research projects
- Version history
- Comments & annotations
- Export sharing links

### 7. Monetization (DirectPay/NexusPay)
| Plan | Price | Credits/Month | Features |
|------|-------|---------------|----------|
| FREE | ₱0 | 5 reports | Basic templates |
| STARTER | ₱499 | 25 reports | All templates, PDF export |
| PRO | ₱1,499 | 100 reports | API access, webhooks |
| ENTERPRISE | ₱4,999 | Unlimited | Custom templates, priority |

---

## 🏗️ Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                   │
│  Landing │ Dashboard │ Research UI │ Reports │ Admin Panel  │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS
┌─────────────────────────┴───────────────────────────────────┐
│                    NGINX (Reverse Proxy)                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│                 BACKEND API (Express + TypeScript)           │
│  Auth │ Research │ Export │ Webhooks │ Admin │ Payments     │
└───┬─────────┬─────────┬─────────┬─────────┬─────────────────┘
    │         │         │         │         │
┌───┴───┐ ┌───┴───┐ ┌───┴───┐ ┌───┴───┐ ┌───┴───┐
│ Redis │ │Postgres│ │ MinIO │ │Queue │ │OpenAI │
│ Cache │ │  DB   │ │Storage│ │BullMQ │ │ LLM   │
└───────┘ └───────┘ └───────┘ └───────┘ └───────┘

┌─────────────────────────────────────────────────────────────┐
│              RESEARCH WORKERS (Background Jobs)              │
│  Crawler │ Scraper │ Analyzer │ Generator │ Exporter        │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
/srv/apps/innovate-research/
├── docker-compose.yml
├── .env
├── README.md
├── IMPLEMENTATION_PLAN.md
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── index.ts
│       ├── config/
│       ├── middleware/
│       │   ├── auth.ts
│       │   └── rateLimit.ts
│       ├── routes/
│       │   ├── auth.ts
│       │   ├── research.ts
│       │   ├── reports.ts
│       │   ├── exports.ts
│       │   ├── templates.ts
│       │   ├── webhooks.ts
│       │   ├── payments.ts
│       │   └── admin.ts
│       ├── services/
│       │   ├── search/
│       │   │   ├── brave.ts
│       │   │   ├── google.ts
│       │   │   └── aggregator.ts
│       │   ├── crawler/
│       │   │   ├── playwright.ts
│       │   │   ├── extractor.ts
│       │   │   └── renderer.ts
│       │   ├── analysis/
│       │   │   ├── llm.ts
│       │   │   ├── entities.ts
│       │   │   ├── sentiment.ts
│       │   │   └── relationships.ts
│       │   ├── export/
│       │   │   ├── pdf.ts
│       │   │   ├── markdown.ts
│       │   │   ├── csv.ts
│       │   │   ├── json.ts
│       │   │   └── rag.ts
│       │   ├── directpay.ts
│       │   └── queue.ts
│       ├── workers/
│       │   ├── research.worker.ts
│       │   ├── crawler.worker.ts
│       │   └── export.worker.ts
│       └── utils/
│           ├── embeddings.ts
│           └── chunker.ts
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       │   ├── LandingPage.tsx
│       │   ├── Navigation.tsx
│       │   ├── AuthPage.tsx
│       │   ├── Dashboard.tsx
│       │   ├── ResearchForm.tsx
│       │   ├── ResearchProgress.tsx
│       │   ├── ReportViewer.tsx
│       │   ├── ExportPanel.tsx
│       │   ├── TemplateSelector.tsx
│       │   ├── AdminDashboard.tsx
│       │   └── ApiDocs.tsx
│       └── lib/
│           └── api.ts
│
└── workers/
    ├── Dockerfile
    └── ... (worker processes)
```

---

## 🔌 API Endpoints

### Authentication
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/api-keys
DELETE /api/auth/api-keys/:id
```

### Research
```
POST   /api/research              # Start new research
GET    /api/research              # List user's research
GET    /api/research/:id          # Get research details
GET    /api/research/:id/status   # Get progress (SSE stream)
DELETE /api/research/:id          # Cancel/delete research
```

### Reports
```
GET    /api/reports               # List generated reports
GET    /api/reports/:id           # Get report content
GET    /api/reports/:id/export    # Export to format
POST   /api/reports/:id/share     # Create share link
```

### Templates
```
GET    /api/templates             # List available templates
GET    /api/templates/:id         # Get template details
POST   /api/templates             # Create custom template (Pro+)
```

### Webhooks
```
POST   /api/webhooks              # Register webhook
GET    /api/webhooks              # List webhooks
DELETE /api/webhooks/:id          # Remove webhook
```

### Admin
```
GET    /api/admin/stats           # Platform statistics
GET    /api/admin/users           # User management
GET    /api/admin/research        # All research jobs
```

---

## 🚀 Development Phases

### Phase 1: Foundation (Agent 1 - Backend Core)
- [ ] Project scaffolding & Docker setup
- [ ] Database schema (Prisma)
- [ ] Authentication system (JWT + API keys)
- [ ] Basic API structure

### Phase 2: Research Engine (Agent 2 - Research Services)
- [ ] Search aggregator (Brave API)
- [ ] Web crawler (Playwright)
- [ ] Content extractor
- [ ] LLM analysis pipeline

### Phase 3: Export System (Agent 3 - Export Services)
- [ ] PDF generator (puppeteer-pdf)
- [ ] Markdown formatter
- [ ] CSV/Excel exporter
- [ ] RAG/JSONL formatter
- [ ] Vector embeddings

### Phase 4: Frontend (Agent 4 - UI/UX)
- [ ] Landing page with InnovateHub branding
- [ ] Authentication pages
- [ ] Research dashboard
- [ ] Report viewer & export UI
- [ ] Admin panel

### Phase 5: Integration (All Agents)
- [ ] DirectPay payment integration
- [ ] Webhook system
- [ ] API documentation (Swagger)
- [ ] Testing & deployment

---

## 📊 Database Schema

```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  password      String
  name          String?
  plan          Plan      @default(FREE)
  credits       Int       @default(5)
  createdAt     DateTime  @default(now())
  
  apiKeys       ApiKey[]
  researches    Research[]
  webhooks      Webhook[]
  transactions  Transaction[]
}

model ApiKey {
  id        String   @id @default(uuid())
  key       String   @unique
  name      String
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
  lastUsed  DateTime?
}

model Research {
  id          String         @id @default(uuid())
  userId      String
  user        User           @relation(fields: [userId], references: [id])
  query       String
  template    String
  status      ResearchStatus @default(PENDING)
  progress    Int            @default(0)
  sources     Json?
  analysis    Json?
  report      Json?
  error       String?
  createdAt   DateTime       @default(now())
  completedAt DateTime?
  
  exports     Export[]
}

model Export {
  id          String   @id @default(uuid())
  researchId  String
  research    Research @relation(fields: [researchId], references: [id])
  format      String
  fileUrl     String
  createdAt   DateTime @default(now())
}

model Webhook {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  url       String
  events    String[]
  secret    String
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
}

model Transaction {
  id            String   @id @default(uuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  amount        Decimal
  plan          Plan
  directpayRef  String?
  status        String
  createdAt     DateTime @default(now())
}

enum Plan {
  FREE
  STARTER
  PRO
  ENTERPRISE
}

enum ResearchStatus {
  PENDING
  SEARCHING
  CRAWLING
  ANALYZING
  GENERATING
  COMPLETED
  FAILED
}
```

---

## 🔧 Tech Stack

| Component | Technology |
|-----------|------------|
| **Backend** | Node.js, Express, TypeScript |
| **Frontend** | React, Vite, Tailwind CSS |
| **Database** | PostgreSQL + Prisma |
| **Cache** | Redis |
| **Queue** | BullMQ |
| **Storage** | MinIO (S3-compatible) |
| **Crawler** | Playwright |
| **PDF** | Puppeteer |
| **LLM** | OpenRouter (GPT-4, Claude) |
| **Search** | Brave Search API |
| **Container** | Docker Compose |

---

## 🎨 Branding

- **Logo**: InnovateHub circular badge
- **Colors**: Silver (#C0C0C0), Black (#000), Purple (#8B5CF6)
- **Footer**: "by InnovateHub Philippines"
- **Favicon**: InnovateHub logo

---

## 📅 Timeline

| Phase | Duration | Agents |
|-------|----------|--------|
| Foundation | 30 min | Agent 1 |
| Research Engine | 45 min | Agent 2 |
| Export System | 30 min | Agent 3 |
| Frontend | 45 min | Agent 4 |
| Integration | 30 min | All |
| **Total** | **~3 hours** | 4 agents |

---

## 🚦 Ports

| Service | Port |
|---------|------|
| Frontend | 3103 |
| Backend | 5013 |
| PostgreSQL | 5435 |
| Redis | 6380 |
| MinIO | 9001 |

---

*Created: 2026-02-05 | InnovateHub Inc.*
