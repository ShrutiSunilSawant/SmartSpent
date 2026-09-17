# 💸 SmartSpent — The Finance Agent

> A fully local, privacy-first AI finance agent that tracks spending, scans receipts, detects anomalies, forecasts expenses, and answers financial questions in natural language. No cloud. No API keys. Completely free.

---

## 🚀 Features

**💬 AI Financial Assistant**
Ask questions like "Where am I overspending?" or "Can I afford a $500 vacation?" The agent analyzes your actual spending data and responds in plain English using a locally running LLM.

**📊 Interactive Dashboard**
Real-time overview of total spending, monthly averages, top categories, and anomaly alerts with animated charts.

**🧾 Receipt & Invoice Scanner**
Upload a photo or PDF invoice. AI extracts the amount, merchant, date, and category automatically using computer vision.

**⚠️ Anomaly Detection**
Machine learning flags unusual transactions automatically — large purchases, duplicate charges, or out-of-pattern spending.

**📈 Spending Forecast**
Predicts your next 3 months of spending using time-series models with a Prophet → ARIMA → Moving Average fallback chain.

**🏷️ Auto Categorization**
Every new expense is automatically classified into Food, Transport, Shopping, etc. using a trained Naive Bayes classifier.

**🧠 Conversation Memory**
The AI remembers context across sessions using vector embeddings. Ask follow-up questions without repeating yourself.

**🔒 100% Private**
Everything runs on your machine. No OpenAI. No cloud. No data leaves your computer.

---

## 📊 Key Components

### Dashboard
Real-time stat cards showing total spent, monthly average, top category, and anomaly count. Area chart of spending trends, pie chart of category breakdown, recent expenses list with anomaly indicators, and AI savings insights panel.

### Expenses
Full CRUD — add, edit, delete expenses with search and filter by category, date, and amount. Every new entry runs automatic ML category prediction and anomaly detection.

### Analytics
Monthly spending bar chart, category breakdown pie chart, 3-month spending forecast, anomalous expenses list, AI savings insights, and horizontal category comparison chart.

### AI Assistant
Natural language chat interface powered by a LangGraph agent. Shows reasoning steps (context load → spending analysis → anomaly check → forecast → response) and which data tools were used. Includes quick prompt suggestions to get started.

### Receipt Scanner
Drag and drop image or PDF upload with image quality validation (blur detection, brightness checks). Runs OpenCV preprocessing then Tesseract OCR and returns an editable confirmation form with an OCR confidence score before saving.

---

## 💻 Installation

### Prerequisites
- Python 3.11 or higher
- Node.js 18 or higher
- [Ollama](https://ollama.com) for local LLM inference
- [Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki) for receipt scanning (Windows only)

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/smartspent.git
cd smartspent
```

### 2. Backend setup

```bash
cd backend

python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac / Linux

pip install -r requirements.txt

cp .env.example .env
```

Open `.env` and set `TESSERACT_PATH` if you are on Windows.

### 3. Seed sample data (optional but recommended)

```bash
python -m app.utils.seed_data
```

### 4. Start the backend

```bash
python -m uvicorn app.main:app --reload --port 8000
```

### 5. Frontend setup

Open a new terminal and run:

```bash
cd frontend
npm install
npm run dev
```

### 6. Open the app

Visit **http://localhost:5173** in your browser.

All three services need to run simultaneously — the backend on port 8000, the frontend on port 5173, and Ollama on port 11434.

---

## 🤖 Setting Up Ollama

SmartSpent uses Ollama to run AI models locally. This is required for the AI Assistant feature.

Visit [ollama.com](https://ollama.com) and download the installer for your operating system. Then pull the recommended model:

```bash
ollama pull qwen2.5:3b
```

Start Ollama in a separate terminal and keep it running while using the app:

```bash
ollama serve
```

**Other supported models**

```bash
ollama pull phi3      # Microsoft Phi-3
ollama pull llama3    # Meta Llama 3 — best quality, slowest
```

To switch models open `backend/.env` and change the `OLLAMA_MODEL` value.

---

## 🔧 Troubleshooting

**uvicorn command not found**
```bash
python -m uvicorn app.main:app --reload --port 8000
```

**No module named uvicorn**
```bash
pip install --force-reinstall --no-cache-dir uvicorn[standard]
```
If that fails, run your terminal as Administrator on Windows.

**OCR shows wrong results or fails**
Make sure Tesseract is installed and the path in `.env` matches your installation:
```
TESSERACT_PATH=C:\Program Files\Tesseract-OCR\tesseract.exe
```
Verify it works with:
```bash
"C:/Program Files/Tesseract-OCR/tesseract.exe" --version
```

**AI Assistant times out**
Make sure `ollama serve` is running in a separate terminal. Switch to a faster model by setting `OLLAMA_MODEL=qwen2.5:3b` in `.env`. The qwen2.5:3b model is significantly faster than phi3 on CPU.

**Analytics shows no data**
Run the seeder:
```bash
python -m app.utils.seed_data
```
If it says already seeded, stop the backend, delete `financial_copilot.db`, then run the seeder again and restart.

**ECONNREFUSED errors in the browser**
The backend is not running. Start it with:
```bash
cd backend && python -m uvicorn app.main:app --reload --port 8000
```

---

## 📂 Project Structure

```
smartspent/
├── backend/
│   ├── app/
│   │   ├── ai/               LangGraph agent, tools, memory, prompts
│   │   ├── ml/               Categorizer, anomaly detector, forecaster
│   │   ├── api/              FastAPI route handlers
│   │   ├── services/         Business logic for expenses, analytics, OCR, AI
│   │   ├── models/           SQLAlchemy ORM models
│   │   ├── schemas/          Pydantic v2 request and response schemas
│   │   └── utils/            Config, database, logger, seed data
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   └── src/
│       ├── pages/            Dashboard, Expenses, Analytics, Assistant, OCR
│       ├── components/       Sidebar layout
│       └── services/         Axios API client
└── README.md
```

---

## 🎯 ML Models Explained

**Expense Categorizer (TF-IDF + Naive Bayes)**
Trained on 96 merchant to category examples at startup. Classifies new expenses into Food, Transport, Shopping, and other categories based on merchant name and description. Runs automatically on every new expense.

**Anomaly Detector (IsolationForest)**
Uses feature engineering across amount, log-amount, day of week, hour, and encoded category to identify statistically unusual transactions. Flags them automatically and surfaces them on the Analytics page.

**Spending Forecaster (Prophet → ARIMA → Moving Average)**
Three-tier fallback chain. Prophet handles rich time-series patterns. ARIMA serves as a statistical fallback. Moving Average runs when data is too sparse for either model.

---

## 🔧 Technologies Used

**Frontend**
React 18, Vite, Tailwind CSS, Recharts, Framer Motion, lucide-react

**Backend**
FastAPI, SQLAlchemy, SQLite, Pydantic v2, Python 3.12, Loguru, Uvicorn

**AI and Agents**
LangChain, LangGraph, Ollama, ChromaDB

**Machine Learning**
scikit-learn (TF-IDF, Naive Bayes, IsolationForest), Prophet, ARIMA

**Computer Vision**
OpenCV, pytesseract, PyMuPDF, Pillow

---

## 🙏 Acknowledgments

[Ollama](https://ollama.com) for making local LLM inference accessible to everyone.
[LangChain](https://langchain.com) and [LangGraph](https://langchain-ai.github.io/langgraph) for the agent framework.
[FastAPI](https://fastapi.tiangolo.com) for the excellent Python web framework.
[Prophet](https://facebook.github.io/prophet/) by Meta for time-series forecasting.
The open-source community for all the incredible libraries that made this possible.

---

Built with ❤️ using FastAPI, React, LangGraph, and Ollama
