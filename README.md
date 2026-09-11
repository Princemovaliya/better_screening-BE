# better_screening-BE

Backend for **Better Screening** — a multi-tenant AI recruitment/interview platform.
NestJS + PostgreSQL/TypeORM for relational data, Redis/BullMQ for the async
speech-to-text and evaluation pipeline. See the full architecture and build plan at
`/home/prince/.claude/plans/hi-this-is-merry-milner.md` (or wherever it's been moved to
in this repo going forward).

## Status: Phase 5 — LLM integration (evaluation, question generation, email drafting)

What's implemented so far:
- Project scaffold (NestJS 11, TypeScript, path aliases `@config/*` `@core/*` `@module/*`,
  ESLint/Prettier, Jest unit + e2e config).
- `docker-compose.yml`: Postgres, Redis, MinIO (+ bucket bootstrap), Maildev (local SMTP
  inbox for dev).
- Core cross-cutting pieces: global exception filter + response envelope
  (`{isError, message, data}`), env loader (no `@nestjs/config`), JWT (`@nestjs/jwt` +
  `@nestjs/passport`), a `MailService` (nodemailer), `StorageService` (S3-compatible,
  AWS SDK v3 — presigned upload/download URLs, works against MinIO or real S3).
- `OrganizationsModule`, `UsersModule`, `AuthModule` — org signup/login, team invite,
  password reset.
- `JobsModule` — jobs with nested skills + interview round templates + per-round
  questions.
- `CandidatesModule` — candidate CRUD, forward-only stage transitions, notes.
- `InterviewsModule` — schedule/reschedule/cancel, send-invitation (now issues a real
  candidate access token and emails the real interview-room link).
- `InterviewSessionModule` — the **candidate portal** backend: token-only auth (no JWT,
  no account), session fetch (starts the clock on first open, reports per-question
  answered state for resumability), per-question presigned upload + completion, submit
  (idempotent), and a deadline sweep that auto-submits a round whose time ran out.
- `TranscriptIngestionModule` — the STT hand-off boundary (see queue contract below):
  a producer that enqueues `transcript-generation` the moment a round is submitted
  (manually or auto-submitted by the deadline sweep), and a consumer on `transcript-ready`
  that persists `interview_transcripts` and forwards to the fully-internal
  `evaluation-processing` queue. Both consumers are idempotent against BullMQ's
  at-least-once delivery (checked by verified redelivery in testing, not just by
  reading the code).
- `src/scripts/mock-stt-worker.ts` (`npm run mock:stt-worker`) — a standalone stand-in
  for the real vendor's own worker, for local dev only. Consumes `transcript-generation`
  and produces a canned `transcript-ready` job back, so the whole pipeline can be
  exercised end-to-end before a real vendor is wired in.

- `LlmModule` (`src/core/llm`) — a thin, generic "prompt in, structured JSON out"
  wrapper over the Anthropic API (`@anthropic-ai/sdk`), config-driven via
  `LLM_PROVIDER`/`LLM_API_KEY`/`LLM_MODEL`. `LLM_PROVIDER=mock` makes every call site
  return its own deterministic canned response instead of a real call — useful for
  local dev/testing without a key (set it in your own `.env`; `.env.example` documents
  the real default, `anthropic`).
- `EvaluationModule` — owns the actual evaluation logic (resume × job description ×
  transcript), entirely our own LLM call, never the STT vendor's. Consumes the
  internal `evaluation-processing` queue, validates the LLM's structured response
  before persisting anything, writes `interview_summaries` +
  `interview_question_analyses` in one transaction, flips the interview to
  `completed`, and updates the candidate's `overallScore`. Idempotent (skips if a
  summary already exists for the interview) and exposes
  `GET /interviews/:id/evaluation` (status: `not_submitted` / `transcribing` /
  `transcription_failed` / `evaluating` / `completed`) plus
  `POST /interviews/:id/retry-evaluation` (re-enqueues; explicitly retries a job still
  sitting in BullMQ's failed set rather than silently no-opping against it).
- `JobsModule` gained `POST /jobs/:id/rounds/:roundId/questions/generate` — an LLM
  question-suggestion endpoint (nothing persisted; the recruiter edits/keeps/discards
  before saving via the normal job-update endpoint).
- `EmailComposerModule` (new) — `POST /candidates/:id/emails/compose` (LLM draft,
  nothing sent yet), `POST /candidates/:id/emails/send` (sends via `MailService` and
  logs to `candidate_emails`), `GET /candidates/:id/emails` (history).

Not yet built (see the plan file's build order): notifications, dashboard
KPIs/activity feed, search, team management UI, settings pages.

### Candidate portal API (token-only, no JWT)

```
GET  /interview-session/:token                                  session + questions
POST /interview-session/:token/questions/:questionId/upload-url  presigned PUT url
POST /interview-session/:token/questions/:questionId/complete    mark answer uploaded
POST /interview-session/:token/submit                            finish the round
```

### AI pipeline queues (BullMQ / Redis)

```
transcript-generation   we produce, the third-party STT vendor's own worker consumes
                         (enqueued automatically on submit/auto-submit; no resume/JD
                         data in the payload — STT only)
transcript-ready         the vendor produces (transcript only, no scores), we consume
                         (TranscriptReadyProcessor persists interview_transcripts,
                         then forwards to evaluation-processing)
evaluation-processing    fully internal — our own producer/consumer; no consumer yet
                         (that's EvaluationModule, a later phase)
```

For local dev without a real vendor, run `npm run mock:stt-worker` alongside the app —
it consumes `transcript-generation` and produces a canned `transcript-ready` job so the
pipeline can be exercised end-to-end.

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
