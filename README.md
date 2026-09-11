# better_screening-BE

Backend for **Better Screening** — a multi-tenant AI recruitment/interview platform.
NestJS + PostgreSQL/TypeORM for relational data, Redis/BullMQ for the async
speech-to-text and evaluation pipeline. See the full architecture and build plan at
`/home/prince/.claude/plans/hi-this-is-merry-milner.md` (or wherever it's been moved to
in this repo going forward).

## Status: Phase 1 — foundation

What's implemented so far:
- Project scaffold (NestJS 11, TypeScript, path aliases `@config/*` `@core/*` `@module/*`,
  ESLint/Prettier, Jest unit + e2e config).
- `docker-compose.yml`: Postgres, Redis, MinIO (+ bucket bootstrap), Maildev (local SMTP
  inbox for dev).
- Core cross-cutting pieces: global exception filter + response envelope
  (`{isError, message, data}`), env loader (no `@nestjs/config`), JWT (`@nestjs/jwt` +
  `@nestjs/passport`), a minimal `MailService` (nodemailer).
- `OrganizationsModule` — org profile + settings (1:1), created with sensible defaults
  on signup.
- `UsersModule` — org-scoped users, roles (`admin`/`recruiter`).
- `AuthModule` — signup (creates an Organization + its first admin user), login,
  forgot/reset password, team invite + accept-invite. All wired to real Postgres via
  TypeORM, with a migration already generated and applied.

Not yet built (see the plan file's build order): Jobs/Candidates/Interviews CRUD, the
candidate portal (`InterviewSessionModule`), the BullMQ queue pipeline
(`TranscriptIngestionModule`/`EvaluationModule`), `StorageModule` (S3/MinIO recordings +
resumes), `LlmModule` (question generation / email drafting / evaluation), notifications,
dashboard, search.

## Getting started

```bash
cp .env.example .env      # adjust if your local ports differ
npm install

# Start Postgres, Redis, MinIO (+ bucket bootstrap), Maildev
docker compose up -d postgres redis minio minio-init maildev

# Run the first migration
npm run migration:run

npm run start:dev         # http://localhost:3000, Swagger at /docs
```

> If you already run Postgres locally on 5432, this compose file maps the container to
> host port **5433** instead (see `docker-compose.yml` and `.env.example`) to avoid the
> clash — the `app` service itself still talks to `postgres:5432` over the internal
> Docker network, unaffected.

### Useful scripts

```bash
npm run build              # tsc build
npm run lint                # eslint --fix
npm test                    # unit tests (*.spec.ts)
npm run test:e2e            # e2e tests — needs docker compose services running
npm run migration:generate -- src/core/database/migrations/SomeName
npm run migration:run
npm run migration:revert
```

### Conventions

- Feature modules live under `src/modules/<feature>/{*.module,*.controller,*.service,dto/,entities/}`.
- Cross-cutting concerns live under `src/core/{database,queue,mail,jwt,dispatchers,logger,utils}`.
- Every tenant-scoped entity extends `OrgScopedEntity` (adds an indexed `organizationId`);
  multi-tenancy is enforced **explicitly** in service code — every repository call that
  touches a tenant table takes `organizationId` from the authenticated user/token, not
  from an implicit global filter.
- Controllers return either a plain payload or `{ message, data }`; the per-controller
  `TransformInterceptor` wraps it into `{ isError: false, message, data }`. The global
  `GlobalExceptionFilter` normalizes every thrown error into `{ isError: true, message,
  data: null }`.
- `life-vault-be` (a sibling project) was used only as a scaffolding/tooling reference
  (folder shape, path aliases, bootstrap style) — no business logic, auth
  implementation, or storage/mail code was ported from it; this project's data layer
  (Postgres/TypeORM) and queue layer (BullMQ/Redis) are built fresh.
