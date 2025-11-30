# Secure Dashboard — Полная спецификация проекта

## Обзор проекта

**Secure Dashboard** — это минималистичное веб-приложение для хранения и организации ссылок с клиентской криптографией. Приложение поставляется как единый Docker-контейнер со статическими файлами.

### Ключевые принципы
- **Zero-knowledge**: сервер не знает ничего о данных пользователя
- **Локальное хранение**: все данные в localStorage браузера
- **Клиентское шифрование**: AES-256-GCM шифрование в браузере
- **Один бинарник**: Docker-образ с nginx и статикой

---

## Технический стек

| Компонент | Технология |
|-----------|------------|
| Frontend | React 18 + TypeScript |
| Стилизация | Tailwind CSS |
| Сборка | Vite |
| Криптография | Web Crypto API (встроенный в браузер) |
| Контейнер | Docker + nginx:alpine |
| Хранение | localStorage |

---

## Архитектура приложения

```
src/
├── main.tsx                    # Точка входа
├── App.tsx                     # Корневой компонент с роутингом состояний
├── components/
│   ├── LoginScreen.tsx         # Экран ввода пароля
│   ├── Dashboard.tsx           # Основной дашборд
│   ├── GroupCard.tsx           # Карточка группы ссылок
│   ├── LinkItem.tsx            # Отдельная ссылка
│   ├── AddLinkModal.tsx        # Модалка добавления ссылки
│   ├── AddGroupModal.tsx       # Модалка добавления группы
│   ├── EditModeToolbar.tsx     # Панель режима редактирования
│   └── SettingsModal.tsx       # Настройки (экспорт/импорт)
├── hooks/
│   ├── useAuth.ts              # Хук аутентификации
│   ├── useDashboard.ts         # Хук управления данными дашборда
│   └── useDragAndDrop.ts       # Хук drag-and-drop
├── utils/
│   ├── crypto.ts               # Функции шифрования/дешифрования
│   ├── storage.ts              # Работа с localStorage
│   └── constants.ts            # Константы (соли)
├── types/
│   └── index.ts                # TypeScript типы
└── styles/
    └── index.css               # Tailwind импорты
```

---

## Модель данных

### TypeScript типы (`src/types/index.ts`)

```typescript
// Отдельная ссылка
interface Link {
  id: string;           // UUID v4
  title: string;        // Название ссылки
  url: string;          // URL
  favicon?: string;     // Base64 favicon или URL
  createdAt: number;    // Unix timestamp
}

// Группа ссылок
interface LinkGroup {
  id: string;           // UUID v4
  name: string;         // Название группы
  color: string;        // HEX цвет группы
  links: Link[];        // Ссылки в группе
  order: number;        // Порядок отображения
  isCollapsed: boolean; // Свёрнута ли группа
}

// Корневые ссылки (без группы)
interface RootLinks {
  links: Link[];        // Ссылки вне групп
}

// Полная структура дашборда
interface DashboardData {
  version: 1;           // Версия схемы данных
  groups: LinkGroup[];  // Группы
  rootLinks: Link[];    // Ссылки без группы
  settings: {
    theme: 'dark';      // Тема (пока только dark)
  };
}

// Состояние приложения
interface AppState {
  isAuthenticated: boolean;
  isEditMode: boolean;
  dashboardData: DashboardData | null;
}
```

---

## Криптографическая схема

### Константы (`src/utils/constants.ts`)

```typescript
// ВАЖНО: Эти значения должны быть уникальными и длинными
export const STORAGE_KEY_SALT = 'sd_storage_v1_k8x2mN9pL4qR7wE3';
export const ENCRYPTION_SALT = 'sd_encrypt_v1_J5hT2yU8iO1pA6sD';
export const PBKDF2_ITERATIONS = 100000;
```

### Алгоритм работы (`src/utils/crypto.ts`)

#### 1. Генерация ключа хранения (для localStorage key)
```typescript
async function generateStorageKey(password: string): Promise<string> {
  // 1. Создаём ключ через PBKDF2
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  // 2. Деривируем биты с солью для хранения
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(STORAGE_KEY_SALT),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  
  // 3. Конвертируем в hex-строку для ключа localStorage
  return Array.from(new Uint8Array(bits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

#### 2. Генерация ключа шифрования
```typescript
async function generateEncryptionKey(password: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(ENCRYPTION_SALT),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}
```

#### 3. Шифрование данных
```typescript
async function encryptData(data: DashboardData, password: string): Promise<string> {
  const key = await generateEncryptionKey(password);
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV для AES-GCM
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(JSON.stringify(data))
  );
  
  // Формат: base64(iv + encrypted)
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}
```

#### 4. Дешифрование данных
```typescript
async function decryptData(encryptedString: string, password: string): Promise<DashboardData | null> {
  try {
    const key = await generateEncryptionKey(password);
    const combined = Uint8Array.from(atob(encryptedString), c => c.charCodeAt(0));
    
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
  } catch {
    return null; // Неверный пароль или повреждённые данные
  }
}
```

---

## Хранение данных (`src/utils/storage.ts`)

```typescript
// Сохранение в localStorage
async function saveDashboard(data: DashboardData, password: string): Promise<void> {
  const storageKey = await generateStorageKey(password);
  const encrypted = await encryptData(data, password);
  localStorage.setItem(`dashboard_${storageKey}`, encrypted);
}

// Загрузка из localStorage
async function loadDashboard(password: string): Promise<DashboardData | null> {
  const storageKey = await generateStorageKey(password);
  const encrypted = localStorage.getItem(`dashboard_${storageKey}`);
  
  if (!encrypted) {
    return null; // Нет данных для этого пароля
  }
  
  return decryptData(encrypted, password);
}

// Проверка существования дашборда для пароля
async function dashboardExists(password: string): Promise<boolean> {
  const storageKey = await generateStorageKey(password);
  return localStorage.getItem(`dashboard_${storageKey}`) !== null;
}
```

---

## Компоненты UI

### 1. LoginScreen (`src/components/LoginScreen.tsx`)

**Описание**: Полноэкранный экран с единственным полем ввода пароля по центру.

**Поведение**:
- При вводе пароля и нажатии Enter:
  1. Генерируется storage key
  2. Проверяется наличие данных в localStorage
  3. Если данные есть — дешифруются и загружается дашборд
  4. Если данных нет — создаётся пустой дашборд и сохраняется
- При неверном пароле к существующим данным — показать ошибку "Неверный пароль или данные не найдены"
- Анимация загрузки во время криптографических операций

**UI требования**:
- Тёмный фон (#0a0a0a или similar)
- Поле ввода по центру экрана, минималистичное
- Кнопка входа или Enter для подтверждения
- Индикатор загрузки (spinner) при обработке

### 2. Dashboard (`src/components/Dashboard.tsx`)

**Описание**: Основной экран с группами ссылок и отдельными ссылками.

**Структура**:
```
┌─────────────────────────────────────────────────────┐
│  [Logo/Title]                    [Edit] [Settings]  │  <- Header
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ Group 1     │  │ Group 2     │  │ Ungrouped   │  │
│  │ ─────────── │  │ ─────────── │  │ ─────────── │  │
│  │ • Link 1    │  │ • Link 1    │  │ • Link 1    │  │
│  │ • Link 2    │  │ • Link 2    │  │ • Link 2    │  │
│  │ [Open All]  │  │ [Open All]  │  │             │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
│                                                     │
│  [+ Add Group]  [+ Add Link]                        │  <- В режиме редактирования
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Функции**:
- Отображение групп в виде карточек (grid layout)
- Отображение ссылок без группы отдельным блоком
- Кнопка "Open All" для группы — открывает все ссылки группы в новых вкладках
- Клик по ссылке — открытие в новой вкладке (`target="_blank" rel="noopener"`)
- Header с кнопками Edit и Settings

**Режим редактирования**:
- Появляются кнопки удаления на группах и ссылках
- Появляются кнопки "+ Add Group" и "+ Add Link"
- Drag-and-drop для перемещения:
  - Ссылок внутри группы
  - Ссылок между группами
  - Групп между собой
- Редактирование названий групп и ссылок по клику

### 3. GroupCard (`src/components/GroupCard.tsx`)

**Props**:
```typescript
interface GroupCardProps {
  group: LinkGroup;
  isEditMode: boolean;
  onOpenAll: () => void;
  onDeleteGroup: () => void;
  onUpdateGroup: (updates: Partial<LinkGroup>) => void;
  onDeleteLink: (linkId: string) => void;
  onUpdateLink: (linkId: string, updates: Partial<Link>) => void;
  onDragStart: (e: DragEvent, type: 'link' | 'group', id: string) => void;
  onDrop: (e: DragEvent) => void;
}
```

**UI**:
- Заголовок с названием группы и цветным индикатором
- Кнопка сворачивания/разворачивания
- Список ссылок
- Кнопка "Open All" внизу карточки
- В режиме редактирования: кнопка удаления, drag handle

### 4. LinkItem (`src/components/LinkItem.tsx`)

**Props**:
```typescript
interface LinkItemProps {
  link: Link;
  isEditMode: boolean;
  onDelete: () => void;
  onUpdate: (updates: Partial<Link>) => void;
  onDragStart: (e: DragEvent) => void;
}
```

**UI**:
- Favicon (если есть) + название
- Клик открывает URL в новой вкладке
- В режиме редактирования: кнопка удаления, drag handle, редактирование по клику

### 5. AddLinkModal (`src/components/AddLinkModal.tsx`)

**Поля формы**:
- URL (обязательное) — при вводе пытается автоматически получить title и favicon
- Title (опциональное, автозаполняется)
- Группа (выпадающий список, включая "Без группы")

**Поведение**:
- При вставке URL — попытка извлечь title через fetch (если CORS позволяет)
- Favicon: использовать Google Favicon API: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`

### 6. AddGroupModal (`src/components/AddGroupModal.tsx`)

**Поля формы**:
- Название группы (обязательное)
- Цвет (color picker с предустановленными цветами)

### 7. SettingsModal (`src/components/SettingsModal.tsx`)

**Функции**:
- **Экспорт**: кнопка "Скачать резервную копию"
  - Скачивается файл `dashboard-backup-{date}.json`
  - Содержимое: зашифрованная строка (та же что в localStorage)
- **Импорт**: кнопка "Загрузить резервную копию"
  - Выбор файла + ввод пароля от этого файла
  - При успехе — данные заменяют текущие
  - При ошибке — сообщение "Неверный пароль или повреждённый файл"
- **Выход**: кнопка "Выйти" — очищает состояние и возвращает на LoginScreen

### 8. EditModeToolbar (`src/components/EditModeToolbar.tsx`)

**Описание**: Плавающая панель внизу экрана в режиме редактирования.

**Содержимое**:
- Кнопка "+ Группа"
- Кнопка "+ Ссылка"
- Кнопка "Готово" (выход из режима редактирования)

---

## Drag and Drop

### Реализация (`src/hooks/useDragAndDrop.ts`)

Использовать нативный HTML5 Drag and Drop API.

**Типы перетаскивания**:
1. Ссылка внутри группы — изменение order
2. Ссылка в другую группу — перемещение между массивами
3. Ссылка в "корень" — перемещение в rootLinks
4. Группа — изменение order группы

**Данные при перетаскивании**:
```typescript
interface DragData {
  type: 'link' | 'group';
  id: string;
  sourceGroupId: string | null; // null для rootLinks
}
```

**Визуальная индикация**:
- При перетаскивании: уменьшение opacity исходного элемента
- Drop zone: подсветка border при наведении
- Индикатор позиции вставки (линия между элементами)

---

## Адаптивный дизайн

### Breakpoints (Tailwind)

```
sm: 640px   — 1 колонка групп
md: 768px   — 2 колонки групп
lg: 1024px  — 3 колонки групп
xl: 1280px  — 4 колонки групп
```

### Мобильная версия
- Группы в одну колонку
- Увеличенные touch targets (min 44x44px)
- Swipe для удаления в режиме редактирования (опционально)
- Модалки на весь экран

---

## Docker конфигурация

### Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем package files
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci

# Копируем исходники
COPY . .

# Собираем приложение
RUN npm run build

# Production stage
FROM nginx:alpine

# Копируем собранные файлы
COPY --from=builder /app/dist /usr/share/nginx/html

# Копируем конфиг nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Открываем порт
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### docker-compose.yml (опционально, для удобства)

```yaml
version: '3.8'

services:
  secure-dashboard:
    build: .
    ports:
      - "8080:80"
    restart: unless-stopped
```

---

## Структура файлов проекта

```
secure-dashboard/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── LoginScreen.tsx
│   │   ├── Dashboard.tsx
│   │   ├── GroupCard.tsx
│   │   ├── LinkItem.tsx
│   │   ├── AddLinkModal.tsx
│   │   ├── AddGroupModal.tsx
│   │   ├── EditModeToolbar.tsx
│   │   └── SettingsModal.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useDashboard.ts
│   │   └── useDragAndDrop.ts
│   ├── utils/
│   │   ├── crypto.ts
│   │   ├── storage.ts
│   │   └── constants.ts
│   ├── types/
│   │   └── index.ts
│   └── styles/
│       └── index.css
├── public/
│   └── favicon.svg
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── Dockerfile
├── nginx.conf
├── docker-compose.yml
└── README.md
```

---

## Package.json

```json
{
  "name": "secure-dashboard",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

---

## Цветовая схема (Dark Theme)

```css
/* Основные цвета */
--bg-primary: #0a0a0a;      /* Основной фон */
--bg-secondary: #141414;    /* Фон карточек */
--bg-tertiary: #1f1f1f;     /* Фон при hover */

--text-primary: #ffffff;    /* Основной текст */
--text-secondary: #a0a0a0;  /* Вторичный текст */
--text-muted: #6b6b6b;      /* Приглушённый текст */

--border: #2a2a2a;          /* Границы */
--border-hover: #3a3a3a;    /* Границы при hover */

--accent: #3b82f6;          /* Акцентный цвет (синий) */
--accent-hover: #2563eb;    /* Акцент при hover */

--danger: #ef4444;          /* Цвет удаления */
--success: #22c55e;         /* Цвет успеха */

/* Предустановленные цвета групп */
--group-blue: #3b82f6;
--group-green: #22c55e;
--group-purple: #a855f7;
--group-orange: #f97316;
--group-pink: #ec4899;
--group-cyan: #06b6d4;
--group-yellow: #eab308;
--group-red: #ef4444;
```

---

## Алгоритм работы приложения

### 1. Первый запуск (новый пользователь)
```
1. Пользователь открывает приложение
2. Видит экран ввода пароля
3. Вводит пароль и нажимает Enter
4. Система генерирует storage key из пароля
5. Проверяет localStorage — данных нет
6. Создаёт пустой DashboardData
7. Шифрует и сохраняет в localStorage
8. Показывает пустой дашборд
```

### 2. Повторный вход (существующий пользователь)
```
1. Пользователь открывает приложение
2. Видит экран ввода пароля
3. Вводит пароль
4. Система генерирует storage key
5. Находит данные в localStorage
6. Дешифрует данные
7. Если успешно — показывает дашборд
8. Если ошибка — показывает "Неверный пароль"
```

### 3. Добавление ссылки
```
1. Пользователь в режиме редактирования
2. Нажимает "+ Ссылка"
3. Открывается модалка
4. Вводит URL (title подтягивается автоматически)
5. Выбирает группу (или "Без группы")
6. Нажимает "Добавить"
7. Ссылка добавляется в DashboardData
8. Данные шифруются и сохраняются
```

### 4. Экспорт данных
```
1. Пользователь открывает Settings
2. Нажимает "Скачать резервную копию"
3. Формируется файл с зашифрованными данными
4. Браузер скачивает файл
```

### 5. Импорт данных
```
1. Пользователь открывает Settings
2. Нажимает "Загрузить резервную копию"
3. Выбирает файл
4. Вводит пароль от этого файла
5. Система пытается дешифровать
6. При успехе — данные заменяют текущие
7. При ошибке — сообщение об ошибке
```

---

## Критерии приёмки

### Функциональные требования
- [ ] Работает ввод пароля и создание нового дашборда
- [ ] Работает вход с существующим паролем
- [ ] Отображаются группы и ссылки
- [ ] Клик по ссылке открывает её в новой вкладке
- [ ] "Open All" открывает все ссылки группы
- [ ] Режим редактирования включается/выключается
- [ ] Можно добавлять группы
- [ ] Можно добавлять ссылки
- [ ] Можно удалять группы и ссылки
- [ ] Работает drag-and-drop для перемещения
- [ ] Работает экспорт в файл
- [ ] Работает импорт из файла с вводом пароля
- [ ] Данные сохраняются между сессиями
- [ ] Разные пароли = разные дашборды

### Нефункциональные требования
- [ ] Адаптивный дизайн (mobile-first)
- [ ] Тёмная тема
- [ ] Сборка в Docker-образ
- [ ] Запуск одной командой: `docker run -p 8080:80 secure-dashboard`

---

## Команды для сборки и запуска

```bash
# Разработка
npm install
npm run dev

# Сборка
npm run build

# Docker сборка
docker build -t secure-dashboard .

# Docker запуск
docker run -p 8080:80 secure-dashboard

# Или с docker-compose
docker-compose up -d
```

---

## Примечания для агента

1. **Не использовать внешние библиотеки для криптографии** — Web Crypto API встроен в браузер и достаточен

2. **UUID генерация**: использовать `crypto.randomUUID()` (встроен в браузер)

3. **Favicon API**: `https://www.google.com/s2/favicons?domain=${domain}&sz=32` — работает без CORS

4. **Автозаполнение title**: попытка fetch URL может не сработать из-за CORS — это нормально, пользователь введёт вручную

5. **Сохранение данных**: сохранять при каждом изменении (добавление, удаление, перемещение)

6. **Безопасность**: 
   - Пароль не хранится нигде
   - Ключи деривируются из пароля каждый раз
   - При закрытии вкладки состояние теряется (нужен повторный ввод пароля)

7. **Дизайн**: свобода творчества в рамках тёмной темы и описанной структуры
