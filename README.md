# To Do API

A NestJS backend for a task management app with JWT authentication, PostgreSQL persistence through Prisma, offline sync support, and web push notifications for task reminders.

## What This Project Includes

- User registration, login, logout, and session tracking
- Task CRUD with status, priority, due dates, reminders, soft delete, and pagination
- Offline-friendly sync endpoint with operation replay and conflict detection
- Web push subscription storage and test notification delivery
- Scheduled reminder notifications for incomplete tasks
- Swagger API documentation with bearer token support

## Tech Stack

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- JWT
- Web Push

## Prerequisites

Make sure these are installed before you start:

- Node.js 20 or newer
- npm
- PostgreSQL

## Environment Variables

Create a local environment file from the example:

```bash
cp .env.example .env
```

Set the following values in `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/todo_app?schema=public"
JWT_SECRET="replace-with-a-secure-secret"
VAPID_SUBJECT="mailto:you@example.com"
VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
PORT=3000
```

Notes:

- `DATABASE_URL` is required for Prisma and PostgreSQL.
- `JWT_SECRET` is recommended for any shared or deployed environment. If omitted, the app falls back to `dev-secret`.
- `VAPID_*` values are required only if you want browser push notifications to work.
- `PORT` is optional and defaults to `3000`.

## Installation

1. Install dependencies:

```bash
npm install
```

2. Create the database in PostgreSQL if it does not already exist.

3. Apply Prisma migrations:

```bash
npm run prisma:migrate
```

4. Start the development server:

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000` by default.

## API Documentation

Swagger is enabled locally at:

```text
http://localhost:3000/api
```

Use the Swagger `Authorize` button with a bearer token returned from login or registration.

## Main Endpoints

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`

### Users

- `GET /users/me`

### Tasks

- `POST /tasks`
- `GET /tasks`
- `GET /tasks/:id`
- `PATCH /tasks/:id`
- `DELETE /tasks/:id`

Task records support:

- `status`: `TODO`, `IN_PROGRESS`, `DONE`
- `priority`: `LOW`, `MEDIUM`, `HIGH`
- optional `dueDate` and `reminderAt`
- pagination, filtering, searching, and sorting on list requests

### Sync

- `POST /sync`

The sync API accepts batched create, update, and delete operations and returns:

- per-operation results
- replay protection for duplicate operation IDs
- conflict responses when a task version has changed on the server
- changed tasks since the client’s last sync timestamp

### Notifications

- `POST /notifications/subscriptions`
- `DELETE /notifications/subscriptions`
- `POST /notifications/test`

Reminder notifications are processed every minute for tasks with a due reminder that has not already been sent.

## Available Scripts

```bash
npm run start
npm run start:dev
npm run start:debug
npm run build
npm run start:prod
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
npm run test
npm run test:e2e
npm run test:cov
npm run lint
```

## Development Notes

- CORS is enabled for local frontend ports `3001`, `5173`, `5174`, and `4173`, plus the deployed Netlify client currently listed in `src/main.ts`.
- Task deletion is soft delete based, so deleted records are tracked for sync workflows.
- Push subscriptions that return `404` or `410` during delivery are automatically marked deleted.

## Testing

Run the test suites with:

```bash
npm run test
npm run test:e2e
```

## License

This project is currently marked `UNLICENSED` in `package.json`.
