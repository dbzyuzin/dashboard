# Secure Dashboard

Персональный дашборд с клиентским шифрованием (AES-256-GCM).

## Стек

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** Go (chi router, pgx)
- **База:** PostgreSQL
- **Деплой:** Docker (multi-stage build, Go раздаёт статику через embed)

## Структура

```
├── src/
│   ├── components/     # React компоненты
│   ├── hooks/          # useAuth, useDashboard, useDragAndDrop
│   ├── utils/
│   │   ├── crypto.ts   # AES-256-GCM шифрование
│   │   ├── storage.ts  # localStorage + backend синхронизация
│   │   └── api.ts      # API клиент
│   └── types/          # TypeScript типы
├── backend/
│   └── main.go         # Go сервер (API + статика)
├── Dockerfile          # Production build
└── docker-compose.yml  # app + postgres
```

## Архитектура

- Пароль → SHA-256 хеш → ключ для шифрования + идентификатор в бэкенде
- Данные шифруются на клиенте, сервер хранит только зашифрованные blob'ы
- `localOnly: true` — только localStorage, `false` — синхронизация с бэкендом

## Запуск

```bash
# Dev (только frontend)
npm run dev

# Dev front + backend + dev postgres
docker-compose up --build
```

## API

- `GET /api/health` — healthcheck
- `GET /api/data/{hash}` — получить дашборд
- `POST /api/data/{hash}` — сохранить дашборд

## Правила

- Не пиши лишних комментариев в коде
