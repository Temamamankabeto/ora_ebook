# ORA eBook Publishing System (Node.js + React + PostgreSQL `pg`)

This repository implements the **ORA eBook Publishing Workflow**:

Author submission → Editor screening → Reviewer feedback → Editor decision / revision → Finance clearance → Digital production → Publication → Public library + access logs.

## Tech
- Backend: Node.js + Express
- Database: PostgreSQL (driver: **pg** only)
- Auth: JWT + Roles (AUTHOR, EDITOR, REVIEWER, FINANCE, CONTENT_MANAGER, ADMIN)
- Frontend: React + Vite + React Router

## Quick start (local)

### 1) Create DB + run schema
```bash
createdb ora_ebook
psql -d ora_ebook -f backend/sql/001_schema.sql
psql -d ora_ebook -f backend/sql/002_seed.sql
```

### 2) Backend
```bash
cd backend
cp .env.example .env
npm i
npm run dev
```

### 3) Frontend
```bash
cd ../frontend
npm i
npm run dev
```

Open:
- API: http://localhost:5000/health
- Web: http://localhost:5173

## Demo users
Seed creates roles only. Create users via UI (Register) and select role.

## Notes
- File uploads are stored in `backend/uploads/` (local disk). In production use object storage.
- Embargo rules:
  - OPEN: always accessible
  - RESTRICTED: requires login
  - EMBARGOED: requires login and only after embargo date

## Scripts
Backend:
- `npm run dev` (nodemon)
Frontend:
- `npm run dev` (vite)

