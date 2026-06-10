# 📌 CATalyst  
**Agentic Research Gap Finder for Thesis and Research Writing**

CATalyst is an AI-powered system designed to help students and researchers discover **research gaps, analyze academic papers, and ideate topics** using an **agentic workflow architecture powered by n8n**.

It reduces the manual effort of reading multiple papers and improves the quality and speed of research topic formulation.

---

## 🚀 Features

- 📄 Research paper extraction and structuring  
- 🔍 Automated research gap detection  
- 🧠 Gaps and topic suggestion using AI reasoning
- 🧩 Agentic workflow (n8n)   
- 👤 Workspace-based research organization system

---

## 🏗️ System Architecture

CATalyst follows a **decoupled frontend–backend architecture**.

---

## 🔹 Frontend (Client)

frontend/
├── api/
├── components/
├── context/
├── layouts/
├── pages/
├── routes/
├── services/
└── main.jsx


---

## 🔹 Backend (Server)

- Node.js v20 LTS
- Express.js v4.18+
- Supabase (PostgreSQL + Auth)
- dotenv v16+
- CORS v2+
- Axios v1.6+


backend/
├── common/
│ └── config/
│ └── supabaseClient.js
├── middlewares/
├── modules/
│ ├── auth/
│ ├── workspace/
│ ├── extractor/
│ ├── summary/
│ ├── gap/
│ └── topic/
├── routes/
└── server.js


---

## 🧠 Core Modules

### 🔐 Authentication Module
- Supabase Auth (email/password)
- JWT session handling
- Protected routes via middleware

### 📁 Workspace Module
- Create, update, delete workspaces
- Each workspace contains workflows

### 📄 Extractor Module
- Extracts structured content from research papers

### 🧾 Summary Module
- Generates concise summaries of papers

### 🧩 Gap Module
- Detects research gaps using AI comparison

### 🎯 Topic Module
- Suggests possible research topics

---

## 🔄 Workflow Pipeline

1. User logs in  
2. Creates a workspace  
3. Uploads research papers  
4. System processes:
   - Extraction → Summary → Gap Analysis → Topic Generation  
5. Results displayed in step-based UI  
6. User refines outputs iteratively  

---

## 🗄️ Database (Supabase)

Tables:

- auth.users
- workflows
- extractor_table
- summary_table
- gap_table
- topic_table

Relationships:
- Users → Workflows → Module outputs

---

## ⚙️ Tech Stack

### Frontend
| Tech | Version |
|------|--------|
| React | 18+ |
| Bootstrap | 5.3 |
| Axios | 1.6+ |
| React Router | 6+ |
| Supabase JS | 2+ |

### Backend
| Tech | Version |
|------|--------|
| Node.js | 20 LTS |
| Express | 4.18+ |
| dotenv | 16+ |
| CORS | 2+ |

### AI Layer
- LLM API integration

---

## 🚀 Deployment Instructions

---

## 🔹 Frontend Deployment (Vercel)

### Install dependencies
```bash
cd frontend
npm install

npm run build
```
Environment variables

VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_BASE_URL=https://your-backend-url.com

- React (Vite) v5+
- Bootstrap v5.3
- Axios v1.6+
- React Router DOM v6+
- Supabase JS v2+
- Context API

## 🔹 Backend Deployment (Render)
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
JWT_SECRET=your_secret
```bash
cd backend
npm install
npm run dev
```
👥 Test Accounts
🔵 Student / Researcher / Demo User
Email: test67@gmail.com
Password: test67

# Future Improvements
- Multi-user collaboration
- Graph-based visualization dashboard
- PDF full-text parsing
- Export to Word/PDF
- Improved LLM tuning for academic research

