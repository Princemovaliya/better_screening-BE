import { MigrationInterface, QueryRunner } from 'typeorm';

export class EvaluationAndEmails1789131184738 implements MigrationInterface {
  name = 'EvaluationAndEmails1789131184738';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."interview_summaries_recommendation_enum" AS ENUM('strong_hire', 'hire', 'no_hire', 'strong_no_hire')`,
    );
    await queryRunner.query(
      `CREATE TABLE "interview_summaries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "organizationId" uuid NOT NULL, "interviewId" uuid NOT NULL, "overallScore" numeric NOT NULL, "recommendation" "public"."interview_summaries_recommendation_enum" NOT NULL, "strengths" jsonb NOT NULL, "weaknesses" jsonb NOT NULL, "observations" text NOT NULL, "communicationNote" text NOT NULL, "competencyScores" jsonb NOT NULL, "rawLlmResponse" jsonb NOT NULL, CONSTRAINT "PK_68c33901233c61d02e57ee7e620" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_551d156357c179ed6015fc3f07" ON "interview_summaries" ("organizationId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_7ad37087a5bb3218be9dc9486c" ON "interview_summaries" ("interviewId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "interview_question_analyses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "organizationId" uuid NOT NULL, "interviewId" uuid NOT NULL, "interviewQuestionId" uuid NOT NULL, "score" numeric NOT NULL, "feedback" text NOT NULL, CONSTRAINT "UQ_d9f8aba51f0af25ca4d7c2c42bc" UNIQUE ("interviewId", "interviewQuestionId"), CONSTRAINT "PK_241c5e9eee89522bd14ab9b9083" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_83e3cafacd65efca04f110d984" ON "interview_question_analyses" ("organizationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_360094873925784be76d2b2315" ON "interview_question_analyses" ("interviewId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."candidate_emails_type_enum" AS ENUM('invitation', 'reminder', 'passed', 'rejected', 'offer', 'followup')`,
    );
    await queryRunner.query(
      `CREATE TABLE "candidate_emails" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "organizationId" uuid NOT NULL, "candidateId" uuid NOT NULL, "type" "public"."candidate_emails_type_enum" NOT NULL, "subject" character varying NOT NULL, "body" text NOT NULL, "sentByUserId" uuid, "sentAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_7b1977dc64cf0996099d3efae85" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_da86bb49f24e6993531178c429" ON "candidate_emails" ("organizationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_982bb0252942839c0b67c68fd6" ON "candidate_emails" ("candidateId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "candidate_emails" ADD CONSTRAINT "FK_d43b9c7b16aa1613af3681ee46a" FOREIGN KEY ("sentByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "candidate_emails" DROP CONSTRAINT "FK_d43b9c7b16aa1613af3681ee46a"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_982bb0252942839c0b67c68fd6"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_da86bb49f24e6993531178c429"`);
    await queryRunner.query(`DROP TABLE "candidate_emails"`);
    await queryRunner.query(`DROP TYPE "public"."candidate_emails_type_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_360094873925784be76d2b2315"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_83e3cafacd65efca04f110d984"`);
    await queryRunner.query(`DROP TABLE "interview_question_analyses"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_7ad37087a5bb3218be9dc9486c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_551d156357c179ed6015fc3f07"`);
    await queryRunner.query(`DROP TABLE "interview_summaries"`);
    await queryRunner.query(`DROP TYPE "public"."interview_summaries_recommendation_enum"`);
  }
}
