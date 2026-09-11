import { MigrationInterface, QueryRunner } from 'typeorm';

export class InterviewSession1789129149052 implements MigrationInterface {
  name = 'InterviewSession1789129149052';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."interview_answers_status_enum" AS ENUM('uploaded', 'transcribed', 'scored')`,
    );
    await queryRunner.query(
      `CREATE TABLE "interview_answers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "interviewId" uuid NOT NULL, "interviewQuestionId" uuid NOT NULL, "organizationId" uuid NOT NULL, "recordingStoragePath" character varying NOT NULL, "recordingMimeType" character varying NOT NULL, "recordingDurationSeconds" integer, "recordingSizeBytes" integer, "status" "public"."interview_answers_status_enum" NOT NULL DEFAULT 'uploaded', CONSTRAINT "UQ_4400b26e274b0f804cd235c34c0" UNIQUE ("interviewId", "interviewQuestionId"), CONSTRAINT "PK_b29d79de5cfb62e8ca9376d96a1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_17eca8252a33a852d196d6da33" ON "interview_answers" ("interviewId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c23f152ee71a96a4ad1eb905ee" ON "interview_answers" ("organizationId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."interview_access_tokens_status_enum" AS ENUM('active', 'expired', 'revoked', 'used')`,
    );
    await queryRunner.query(
      `CREATE TABLE "interview_access_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "interviewId" uuid NOT NULL, "candidateId" uuid NOT NULL, "organizationId" uuid NOT NULL, "tokenHash" character varying NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "consumedAt" TIMESTAMP WITH TIME ZONE, "status" "public"."interview_access_tokens_status_enum" NOT NULL DEFAULT 'active', CONSTRAINT "PK_0fb246c67b6a793245316c62b3d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f2f826bb9ba5d1d36a286b5080" ON "interview_access_tokens" ("interviewId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_31271a4e7bbf5753ebc5c2081b" ON "interview_access_tokens" ("organizationId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_36a4ec48745fa377a833b8f869" ON "interview_access_tokens" ("tokenHash") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_36a4ec48745fa377a833b8f869"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_31271a4e7bbf5753ebc5c2081b"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f2f826bb9ba5d1d36a286b5080"`);
    await queryRunner.query(`DROP TABLE "interview_access_tokens"`);
    await queryRunner.query(`DROP TYPE "public"."interview_access_tokens_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c23f152ee71a96a4ad1eb905ee"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_17eca8252a33a852d196d6da33"`);
    await queryRunner.query(`DROP TABLE "interview_answers"`);
    await queryRunner.query(`DROP TYPE "public"."interview_answers_status_enum"`);
  }
}
