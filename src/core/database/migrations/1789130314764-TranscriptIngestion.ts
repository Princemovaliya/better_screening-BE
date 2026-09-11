import { MigrationInterface, QueryRunner } from 'typeorm';

export class TranscriptIngestion1789130314764 implements MigrationInterface {
  name = 'TranscriptIngestion1789130314764';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "interview_transcripts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "organizationId" uuid NOT NULL, "interviewId" uuid NOT NULL, "combinedText" text NOT NULL, "perQuestion" jsonb NOT NULL, "language" character varying, "failureReason" text, CONSTRAINT "PK_fb9b52df943cb720c6a4697b297" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_436154ef45fe6c4f9a437364d7" ON "interview_transcripts" ("organizationId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_a179b65ea60979bb17e2ff8705" ON "interview_transcripts" ("interviewId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_a179b65ea60979bb17e2ff8705"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_436154ef45fe6c4f9a437364d7"`);
    await queryRunner.query(`DROP TABLE "interview_transcripts"`);
  }
}
