# Tasks Management API

Backend частина застосунку для керування задачами.

Застосунок реалізований на **NestJS + TypeScript** та використовує **PostgreSQL** як основну базу даних і **Prisma ORM** для роботи з нею.

## Стек

* NestJS
* TypeScript
* PostgreSQL
* Prisma ORM
* JWT
* bcrypt
* Socket.IO
* class-validator
* @nestjs/throttler
* Helmet
* Jest
* Docker
* GitHub Actions

---

# Архітектура

Застосунок побудований за клієнт-серверною архітектурою:

```text
React Frontend
      │
      │ REST API / WebSocket
      ▼
NestJS Backend
      │
      │ Prisma ORM
      ▼
PostgreSQL
```

Backend відповідає за:

* аутентифікацію та авторизацію;
* управління Workspaces;
* управління Projects;
* управління Tasks;
* перевірку permissions;
* фільтрацію та пагінацію задач;
* зберігання історії зміни статусів;
* real-time оновлення через Socket.IO;
* валідацію вхідних даних;
* захист API.

---

# Структура проєкту

```text
backend/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
│
├── src/
│   ├── auth/
│   ├── users/
│   ├── workspaces/
│   ├── projects/
│   ├── tasks/
│   ├── prisma/
│   └── app.module.ts
│
├── test/
│
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

Backend поділений на окремі NestJS modules відповідно до відповідальності:

* `Auth`
* `Users`
* `Workspaces`
* `Projects`
* `Tasks`
* `Prisma`

Контролери відповідають за HTTP endpoints, а сервіси містять основну бізнес-логіку.

---

# База даних

Для зберігання даних використовується **PostgreSQL**.

PostgreSQL обрано через реляційну структуру застосунку та велику кількість зв'язків між сутностями.

Реляційна модель дозволяє забезпечувати цілісність даних та зручно працювати зі зв'язками між користувачами, робочими просторами, проєктами та задачами.

## Prisma

Для роботи з PostgreSQL використовується Prisma ORM.

Prisma забезпечує:

* type-safe запити;
* міграції бази даних;
* генерацію TypeScript типів;
* зручну роботу зі зв'язками;
* централізоване визначення схеми бази даних.

---

# Аутентифікація

Для аутентифікації використовується:

* JWT access token;
* JWT refresh token;
* HTTP-only cookie для refresh token;
* bcrypt для хешування паролів;
* NestJS Guards.

Access token передається у заголовку:

```text
Authorization: Bearer <access_token>
```

Refresh token зберігається в HTTP-only cookie та недоступний безпосередньо з JavaScript.

Основні endpoints:

```text
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
```

## Захист від brute-force

Для authentication endpoints використовується `@nestjs/throttler`.

Rate limiting обмежує кількість запитів до endpoint авторизації та зменшує ризик brute-force атак.

## Security headers

Для додаткового захисту HTTP-запитів використовується **Helmet**.

---

# Workspaces

Основні endpoints:

```text
POST   /workspaces
GET    /workspaces
PATCH  /workspaces/:id
DELETE /workspaces/:id

POST   /workspaces/:id/members
DELETE /workspaces/:id/members/me
```

Workspace може містити декілька проєктів та користувачів.

---

# Projects

Проєкт належить конкретному Workspace.

Основні endpoints:

```text
POST   /workspaces/:workspaceId/projects
GET    /workspaces/:workspaceId/projects
GET    /workspaces/:workspaceId/projects/:projectId
PATCH  /workspaces/:workspaceId/projects/:projectId
DELETE /workspaces/:workspaceId/projects/:projectId
```

Управління учасниками:

```text
POST   /workspaces/:workspaceId/projects/:projectId/members
PATCH  /workspaces/:workspaceId/projects/:projectId/members/:userId
DELETE /workspaces/:workspaceId/projects/:projectId/members/:userId
```

---

# Tasks

Основні endpoints:

```text
GET    /workspaces/:workspaceId/projects/:projectId/tasks
POST   /workspaces/:workspaceId/projects/:projectId/tasks
PATCH  /workspaces/:workspaceId/projects/:projectId/tasks/:taskId
DELETE /workspaces/:workspaceId/projects/:projectId/tasks/:taskId

GET    /workspaces/:workspaceId/projects/:projectId/tasks/:taskId/history
```

## Фільтрація

Фільтрація задач виконується **на backend**, до застосування пагінації.

Підтримуються фільтри:

```text
status
priority
assignee
```

Це дозволяє коректно працювати з фільтрами разом із cursor-based pagination.

Наприклад:

```text
GET /tasks?status=IN_PROGRESS&priority=HIGH
```

Backend формує відповідний database query, тому frontend не обмежений лише вже завантаженою сторінкою задач.

## Cursor pagination

Для пагінації використовується cursor-based pagination.

Основні параметри:

```text
cursor
limit
```

Приклад:

```text
GET /tasks?limit=20
```

Після отримання першої сторінки клієнт використовує cursor для отримання наступної:

```text
GET /tasks?limit=20&cursor=<cursor>
```

Це дозволяє ефективно працювати з великою кількістю задач.

---

# Permissions

Для проєктів використовується рольова модель.

У поточній реалізації права на зміну задач обмежені користувачами з відповідними permissions проєкту.

Таке рішення було прийнято в межах тестового завдання, щоб зосередитися на основній бізнес-логіці та контролі доступу.

Member без необхідних permissions може переглядати доступні йому дані, але не може виконувати операції, для яких потрібні права на зміну.

Модель permissions може бути розширена в майбутньому, наприклад:

```text
OWNER
ADMIN
MEMBER
VIEWER
```

з окремими правами на:

* створення задач;
* редагування;
* видалення;
* призначення assignee;
* управління учасниками;
* управління проєктом.

---

# Real-time

Для real-time оновлень використовується **Socket.IO**.

Backend відправляє події при:

* створенні задачі;
* оновленні задачі;
* видаленні задачі;
* створенні запису історії зміни статусу.

Це дозволяє клієнтам отримувати актуальні зміни без перезавантаження сторінки.

---

# Environment Variables

Для локального запуску необхідно створити `.env` на основі `.env.example`.

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tasks?schema=public"

JWT_ACCESS_SECRET="access"
JWT_REFRESH_SECRET="refresh"

PORT=3001
```

Файл `.env` не повинен додаватися до Git.

У репозиторії присутній `.env.example` з необхідними змінними середовища.

---

# Запуск через Docker

Backend має власний `docker-compose.yml`.

Docker Compose запускає:

```text
NestJS Backend
      │
      ▼
PostgreSQL
```

Для запуску достатньо Docker та Docker Compose.

Node.js і PostgreSQL локально встановлювати не потрібно.

У директорії backend виконати:

```bash
docker compose up --build
```

Після запуску:

```text
Backend:
http://localhost:3001

PostgreSQL:
localhost:5432
```

Prisma migrations застосовуються під час запуску backend.

Для зупинки:

```bash
docker compose down
```

Для повного видалення контейнерів разом із database volume:

```bash
docker compose down -v
```

> Frontend не запускається з цього `docker-compose.yml`. Frontend має окремий репозиторій та власний Docker Compose.

---

# Локальний запуск без Docker

Необхідні:

* Node.js;
* PostgreSQL.

Встановити залежності:

```bash
npm install
```

Створити `.env`:

```bash
cp .env.example .env
```

Застосувати migrations:

```bash
npx prisma migrate deploy
```

Запустити development server:

```bash
npm run start:dev
```

Backend буде доступний за адресою:

```text
http://localhost:3001
```

---

# API

## Auth

```text
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
```

## Workspaces

```text
POST   /workspaces
GET    /workspaces
PATCH  /workspaces/:id
DELETE /workspaces/:id
POST   /workspaces/:id/members
DELETE /workspaces/:id/members/me
```

## Projects

```text
POST   /workspaces/:workspaceId/projects
GET    /workspaces/:workspaceId/projects
GET    /workspaces/:workspaceId/projects/:projectId
PATCH  /workspaces/:workspaceId/projects/:projectId
DELETE /workspaces/:workspaceId/projects/:projectId

POST   /workspaces/:workspaceId/projects/:projectId/members
PATCH  /workspaces/:workspaceId/projects/:projectId/members/:userId
DELETE /workspaces/:workspaceId/projects/:projectId/members/:userId
```

## Tasks

```text
GET    /workspaces/:workspaceId/projects/:projectId/tasks
POST   /workspaces/:workspaceId/projects/:projectId/tasks
PATCH  /workspaces/:workspaceId/projects/:projectId/tasks/:taskId
DELETE /workspaces/:workspaceId/projects/:projectId/tasks/:taskId

GET    /workspaces/:workspaceId/projects/:projectId/tasks/:taskId/history
```

---

# Тестування

Для backend реалізовані unit та E2E тести.

## Unit tests

Unit-тестами покрита основна бізнес-логіка:

### Tasks

Перевіряються:

* створення задачі;
* permissions при створенні;
* перевірка assignee;
* оновлення задачі;
* permissions при оновленні;
* видалення задачі;
* permissions при видаленні;
* отримання задач;
* перевірка доступу до проєкту;
* фільтрація;
* pagination.

### Auth

Перевіряються основні сценарії аутентифікації та відповідна бізнес-логіка.

### Workspaces

Перевіряються основні операції та permissions.

### Projects

Перевіряються основні операції та permissions.

Запуск unit tests:

```bash
npm test
```

---

# E2E

Реалізований E2E сценарій основного користувацького flow:

```text
Registration
      ↓
Login
      ↓
Create Workspace
      ↓
Create Project
      ↓
Create Task
```

Запуск:

```bash
npm run test:e2e
```

---

# Postman

Для ручного тестування API підготовлена **Postman collection**.

Для protected endpoints використовується access token, отриманий після авторизації.

Collection дозволяє перевіряти основні API сценарії:

* authentication;
* workspaces;
* projects;
* project members;
* tasks;
* task history;
* filtering;
* pagination.

---

# CI

Для проєкту налаштований GitHub Actions workflow.

При push запускаються автоматичні перевірки:

```text
Push
 ↓
Install dependencies
 ↓
Lint
 ↓
Tests
```

Це дозволяє автоматично перевіряти код перед подальшим використанням змін.

---

# Що можна покращити

За наявності додаткового часу можна було б:

* розширити E2E покриття;
* додати Swagger/OpenAPI документацію;
* розширити permissions model;
* додати більш детальне централізоване логування;
* додати monitoring;
* реалізувати refresh token rotation;
* додати audit log для критичних операцій;
* додати Redis для масштабування WebSocket;
* розширити можливості фільтрації та сортування задач.