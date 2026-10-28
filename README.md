# KOFA: Autonomous AI Conversational Commerce & Inventory Platform 🚀

[![Python](https://img.shields.io/badge/Python-3.11%2B-blue?logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109%2B-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Redis](https://img.shields.io/badge/Redis-Cache%20%26%20Queues-DC382D?logo=redis)](https://redis.io)
[![Meta WhatsApp API](https://img.shields.io/badge/WhatsApp-Cloud%20API-25D366?logo=whatsapp)](https://developers.facebook.com)
[![Azure Cloud](https://img.shields.io/badge/Azure-Cloud%20VPS-0078D4?logo=microsoftazure)](https://azure.microsoft.com)
[![Pydantic v2](https://img.shields.io/badge/Pydantic-v2%20Schema%20Validation-E92063?logo=pydantic)](https://pydantic.dev)

An enterprise-grade conversational commerce and inventory orchestration engine designed for high-velocity merchant operations. **KOFA** bridges the gap between unstructured social commerce (WhatsApp Business API) and structured relational ERP/inventory backends using asynchronous webhooks, Redis session caching, and deterministic multi-model LLM routing (Google Gemini + OpenAI/Claude).

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    Customer["Customer on WhatsApp"] -->|Inbound Message| MetaCloud["Meta WhatsApp Cloud API"]
    MetaCloud -->|HTTPS POST Webhook| Ingress["FastAPI Webhook Receiver\n(HMAC-SHA256 Signature Verify)"]

    subgraph Core ["KOFA Orchestration Core"]
        Ingress --> Queue["Redis Queue Worker\n(Async Task Delegation)"]
        Queue --> State["Session & State Manager\n(Conversation Memory)"]
        State --> Router{"Intent & LLM Router"}

        Router -->|Catalog / Price Query| Gemini["Google Gemini 2.5 Flash\n(Fast Structured JSON)"]
        Router -->|Complex Negotiation| Claude["Anthropic Claude / GPT-4o\n(Tool Calling)"]

        Gemini --> Validator["Pydantic v2 Schema Validator\n(Deterministic Fallback Guard)"]
        Claude --> Validator
    end

    subgraph DataLayer ["Data & Transaction Engine"]
        Validator --> DB[("Relational Database\nPostgreSQL / SQLite")]
        Validator --> Inventory["Stock Lock & Order Sync Engine"]
    end

    Validator -->|Structured Outbound Payload| MetaCloud
    MetaCloud -->|Delivered WhatsApp Message| Customer
```

---

## ⚡ Key Engineering Highlights

### 1. Zero-Downtime Webhook Plumbing & Signature Verification
* **Challenge:** Meta requires a `200 OK` webhook acknowledgment within 3 seconds, or it retries exponentially, triggering duplicated order confirmations and conversation race conditions.
* **Solution:** Decoupled ingress from execution. The lightweight FastAPI receiver validates the `X-Hub-Signature-256` HMAC header, acknowledges Meta in `< 80ms`, and offloads LLM processing to Redis background workers.

### 2. Strict Pydantic Schema Compliance & Hallucination Defense
* **Challenge:** Commercial transactions cannot tolerate hallucinated stock counts, invalid SKU prices, or corrupted JSON formats.
* **Solution:** All LLM outputs are piped into strict Pydantic models. Any payload failing validation immediately routes to a deterministic recovery prompt, guaranteeing 100% schema compliance before database write operations.

### 3. Redis Stateful Session Management
* Multi-turn order creation requires continuous conversational state (selected items, shipping address, payment status). KOFA maintains session TTLs in Redis to prevent state loss during intermittent network disconnects.

### 4. Dual-Persona Conversational Engine
* Includes toggleable persona routing supporting standard executive English as well as localized Nigerian English / Pidgin for high-conversion merchant-customer rapport.

---

## 📁 Repository Structure

```text
kofa/
├── chatbot/                     # FastAPI Backend & Orchestration Core
│   ├── main.py                  # API Ingress & Webhook Routes
│   ├── config.py                # Pydantic Settings & Environment Loading
│   ├── conversation.py          # State Machine & Session Logic
│   ├── intent.py                # LLM Intent Classifier & Prompt Routing
│   ├── inventory.py             # Stock Allocation & Reservation Engine
│   ├── payment.py               # Payment Verification & Checkout Handlers
│   ├── response_formatter.py    # WhatsApp Cloud API Message Serializer
│   └── routers/                 # Modular Domain Controllers (Delivery, Analytics, Expenses)
├── mobile/                      # React Native / Expo Merchant App
├── landing/                     # Merchant Onboarding Frontend
├── supabase/                    # Relational Schema & Migration Definitions
└── tests/                       # Automated Test Suite (Pytest)
```

---

## 🚀 Quickstart & Setup

### 1. Clone & Environment Setup
```bash
git clone https://github.com/juggernaut7777/kofa.git
cd kofa

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your development keys:
```bash
cp .env.example .env
```
```env
# Application Settings
DEBUG=False
PORT=8000

# WhatsApp Cloud API
WHATSAPP_PHONE_ID=your_phone_id_here
WHATSAPP_ACCESS_TOKEN=your_meta_token_here
WHATSAPP_VERIFY_TOKEN=your_webhook_verify_token

# AI Providers
GEMINI_API_KEY=your_gemini_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Redis & Database
REDIS_URL=redis://localhost:6379/0
DATABASE_URL=sqlite:///./kofa.db
```

### 3. Launch Development Server
```bash
uvicorn chatbot.main:app --host 0.0.0.0 --port 8000 --reload
```
* **API Ingress:** `http://localhost:8000`
* **Interactive Docs (Swagger):** `http://localhost:8000/docs`

---

## 👨‍💻 Architect & Lead Developer
**David (Nnaemeka) Ogbonnaya** — Staff Backend & AI Automation Engineer  
Abuja, Nigeria (WAT / GMT+1) | [GitHub Profile](https://github.com/juggernaut7777)
