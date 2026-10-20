# CHDC Full-Stack Application

This repository contains the React/Vite portal in `frontend/` and the Django REST API in `backend/`.

## Prerequisites

- Node.js and npm
- Python 3.12 or newer

## Setup

1. Create the root environment file and update its values as needed:

   ```sh
   cp .env.example .env
   ```

   `VITE_API_BASE_URL` should point to the Django API, normally `http://localhost:8000/api/v1`.

2. Set up and install backend dependencies:

   ```sh
   python -m venv backend/.venv
   source backend/.venv/bin/activate
   python -m pip install -r backend/requirements.txt
   ```

   On Windows PowerShell, activate with `backend\.venv\Scripts\Activate.ps1`.

3. Install frontend and root orchestration dependencies:

   ```sh
   npm install
   npm --prefix frontend install
   ```

4. Apply Django migrations:

   ```sh
   python backend/manage.py migrate
   ```

## Run

Activate `backend/.venv` first, then start both development servers from the repository root:

```sh
npm run dev
```

The portal is available at `http://localhost:5173/`; the API is at `http://localhost:8000/`.

Start only one service with `npm run dev:frontend` or `npm run dev:backend`.

The frontend is configured to load environment values from this repository root. Django loads the same root `.env`. The SQLite database is stored at `backend/db.sqlite3` and is ignored by Git.