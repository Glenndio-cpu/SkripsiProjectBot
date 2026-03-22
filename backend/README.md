# Backend PuskesBot

Backend service untuk API aplikasi PuskesBot menggunakan Flask.

## Prasyarat

- Python 3.10+
- pip
- MySQL (sesuai konfigurasi environment)

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Konfigurasi Environment

Buat file environment backend sesuai kebutuhan aplikasi (database, auth, API key, dan integrasi lain). Jangan commit file env rahasia ke repository.

## Menjalankan Backend (Development)

```bash
cd backend
source .venv/bin/activate
python wsgi.py
```

## Menjalankan Backend (Gunicorn)

```bash
cd backend
source .venv/bin/activate
gunicorn -c gunicorn.conf.py wsgi:app
```

## Menjalankan Migrasi

```bash
cd backend
source .venv/bin/activate
python scripts/run_migrations.py
```

## Struktur Ringkas

- app/: source utama backend
- app/routes/: routing endpoint
- migrations/: SQL migrasi database
- scripts/: helper script backend
- wsgi.py: entrypoint aplikasi
