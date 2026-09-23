# Real-Time Chat Application

A modern, production-ready, full-stack real-time messaging application built with **React (Vite)**, **FastAPI**, **PostgreSQL**, **Redis**, **WebSockets**, and **Docker**.

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Python](https://img.shields.io/badge/Python-3.11%2B-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688)
![Docker](https://img.shields.io/badge/Docker-Enabled-2496ed)

---

## 🌟 Key Features

- 🔐 **Authentication & Security**
  - Registration, Login, Logout with JWT access tokens.
  - Secure bcrypt password hashing.
  - Protected API routes & persistent auth sessions.
  - User fields: `id`, `username`, `email`, `bio`, `profile_picture`, `is_active`, `last_seen`.

- 💬 **Private 1-on-1 Chat**
  - User search by username or email.
  - Instant bi-directional messaging over FastAPI WebSockets.
  - Soft delete own messages.
  - Read receipts & unread message badges.

- 👥 **Group Chat & Roles**
  - Create custom groups with title & group avatar.
  - Admin and Member role management.
  - Add & remove group members.
  - Real-time notifications for group invitations and member updates.

- ⚡ **Real-Time Infrastructure**
  - WebSockets (`/ws/chat/{conversation_id}`) backed by Redis Pub/Sub.
  - Real-time typing indicators (`typing_start`, `typing_stop`).
  - Online/Offline user presence tracking (`user_online`, `user_offline`).
  - Real-time notification events.

- 📁 **File & Image Sharing**
  - Upload images, PDFs, Word documents, text files, and archives.
  - MIME type and file size validation (10MB limit).
  - Image inline preview & file download cards.

- 🔍 **Full-Text Message Search**
  - Search keyword across all user conversations (`GET /api/messages/search`).
  - Filter search by specific conversation with pagination.

- 🎨 **Modern Glassmorphic UI**
  - Custom CSS design system with dark mode glassmorphism.
  - Responsive layouts for Desktop, Laptop, Tablet, and Mobile devices.

---

## 🏗️ Architecture & Technology Stack

```text
                 INTERNET
                    |
          ┌─────────▼─────────┐
          │ React Frontend    │ (Vite + React Router + Axios)
          │ Vercel / Nginx    │
          └─────────┬─────────┘
                    |
             HTTPS / WSS
                    |
          ┌─────────▼─────────┐
          │ FastAPI Backend   │ (Python + Pydantic + PyJWT)
          │ Render / Uvicorn  │
          └──────┬──────┬─────┘
                 │      │
          ┌──────▼─┐  ┌─▼──────┐
          │Postgres│  │ Redis  │ (Pub/Sub + Presence)
          │Cloud   │  │Cloud   │
          └────────┘  └────────┘
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL & Redis (or Docker)

### 1. Backend Setup

```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env

# Run database migrations
alembic upgrade head

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```

FastAPI Interactive Documentation:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Health Check: `http://localhost:8000/health`

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🐳 Docker Setup

Run the entire application stack (PostgreSQL, Redis, FastAPI backend, and Nginx frontend) with a single command:

```bash
docker compose up --build
```

Access:
- Frontend UI: `http://localhost:80` or `http://localhost:5173`
- Backend API: `http://localhost:8000`

---

## 🧪 Automated Testing

### Backend Unit & Integration Tests (`pytest`)

```bash
cd backend
python -m pytest -v
```

Tests cover:
- Database connectivity & `/health` endpoint.
- Registration, Login, JWT issuance, profile updates.
- User search, private chat creation, group chat creation.
- Message sending, deletion, read receipts, and search.
- File upload validation (type & size limits).
- Notification creation and mark-as-read endpoints.

### Frontend Build Verification

```bash
cd frontend
npm run build
```

---

## 📖 Deployment Guide

For complete step-by-step instructions on deploying the backend to **Render**, the database to **Managed PostgreSQL**, Redis to **Managed Redis**, and the frontend to **Vercel**, consult [`DEPLOYMENT.md`](file:///c:/Users/Suresh%20Mandamanedi/OneDrive/Pictures/Desktop/Real%20time%20Chat/DEPLOYMENT.md).

---

## 📜 License

This project is licensed under the MIT License.
