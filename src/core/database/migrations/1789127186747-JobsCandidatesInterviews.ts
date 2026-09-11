import { MigrationInterface, QueryRunner } from 'typeorm';

export class JobsCandidatesInterviews1789127186747 implements MigrationInterface {
  name = 'JobsCandidatesInterviews1789127186747';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."interview_round_questions_questiontype_enum" AS ENUM('technical', 'behavioral', 'situational', 'experience', 'culture')`,
    );
    await queryRunner.query(
      `CREATE TABLE "interview_round_questions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "roundTemplateId" uuid NOT NULL, "questionText" text NOT NULL, "questionType" "public"."interview_round_questions_questiontype_enum" NOT NULL DEFAULT 'technical', "orderIndex" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_ab5ccb31ffb5f6b355de201c3e1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_77ff366830052381f88453916c" ON "interview_round_questions" ("roundTemplateId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."interview_round_templates_type_enum" AS ENUM('ai_interview', 'technical', 'hr')`,
    );
    await queryRunner.query(
      `CREATE TABLE "interview_round_templates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "jobId" uuid NOT NULL, "organizationId" uuid NOT NULL, "name" character varying NOT NULL, "type" "public"."interview_round_templates_type_enum" NOT NULL DEFAULT 'technical', "orderIndex" integer NOT NULL DEFAULT '0', "durationMinutes" integer NOT NULL DEFAULT '30', "defaultInterviewerUserId" uuid, CONSTRAINT "PK_13ff50af43d854a4f1dae274678" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f23e3fbd741a1c1a7d62456e3c" ON "interview_round_templates" ("jobId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_38139a1a9d69a1071029501384" ON "interview_round_templates" ("organizationId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."job_skills_level_enum" AS ENUM('beginner', 'intermediate', 'advanced', 'expert')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."job_skills_importance_enum" AS ENUM('low', 'medium', 'high')`,
    );
    await queryRunner.query(
      `CREATE TABLE "job_skills" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "jobId" uuid NOT NULL, "name" character varying NOT NULL, "level" "public"."job_skills_level_enum" NOT NULL DEFAULT 'intermediate', "required" boolean NOT NULL DEFAULT true, "importance" "public"."job_skills_importance_enum" NOT NULL DEFAULT 'high', "orderIndex" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_79dc7f5be80bfe7a4e590a71041" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_aef367731b3f3e78ea90892fd4" ON "job_skills" ("jobId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."jobs_employmenttype_enum" AS ENUM('full_time', 'part_time', 'contract', 'internship')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."jobs_status_enum" AS ENUM('draft', 'open', 'closed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "organizationId" uuid NOT NULL, "title" character varying NOT NULL, "department" character varying NOT NULL, "location" character varying, "employmentType" "public"."jobs_employmenttype_enum" NOT NULL DEFAULT 'full_time', "experienceMin" integer, "experienceMax" integer, "salaryMin" numeric, "salaryMax" numeric, "salaryCurrency" character varying NOT NULL DEFAULT 'INR', "positionsCount" integer NOT NULL DEFAULT '1', "status" "public"."jobs_status_enum" NOT NULL DEFAULT 'draft', "description" text NOT NULL DEFAULT '', "createdByUserId" uuid, CONSTRAINT "PK_cf0a6c42b72fcc7f7c237def345" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_08bdc8b939f39e6d55b4c38cfb" ON "jobs" ("organizationId") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_a0c30e3eb9649fe7fbcd336a63" ON "jobs" ("status") `);
    await queryRunner.query(
      `CREATE TABLE "candidate_notes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "organizationId" uuid NOT NULL, "candidateId" uuid NOT NULL, "authorUserId" uuid, "body" text NOT NULL, CONSTRAINT "PK_25351db72cc3434a653f4ca3d6d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9d9e2d7e23ff5a7e91851baa68" ON "candidate_notes" ("organizationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7e4e4e1d182f0ff348ade667d6" ON "candidate_notes" ("candidateId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "candidate_skills" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "candidateId" uuid NOT NULL, "name" character varying NOT NULL, CONSTRAINT "PK_e1bb466425868a6a6169ee0ee8f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bab0ed80e495eb71be3cbf8c13" ON "candidate_skills" ("candidateId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."candidates_stage_enum" AS ENUM('applied', 'screening', 'interview', 'hr_review', 'offer', 'hired', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "candidates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "organizationId" uuid NOT NULL, "jobId" uuid NOT NULL, "name" character varying NOT NULL, "email" character varying NOT NULL, "phone" character varying, "experienceYears" integer, "currentCompany" character varying, "location" character varying, "stage" "public"."candidates_stage_enum" NOT NULL DEFAULT 'applied', "overallScore" numeric, "resumePath" character varying, "resumeText" text, "resumeSummary" text, "education" character varying, "rejectReason" character varying, CONSTRAINT "PK_140681296bf033ab1eb95288abb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d56a47318062e86ca2585103af" ON "candidates" ("organizationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_426d378178da5713f1ab30daab" ON "candidates" ("jobId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c0de76a18c2a505ceb01674682" ON "candidates" ("email") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5f228b58143c96f42b12f0a5b5" ON "candidates" ("stage") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."interview_questions_questiontype_enum" AS ENUM('technical', 'behavioral', 'situational', 'experience', 'culture')`,
    );
    await queryRunner.query(
      `CREATE TABLE "interview_questions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "interviewId" uuid NOT NULL, "orderIndex" integer NOT NULL DEFAULT '0', "questionText" text NOT NULL, "questionType" "public"."interview_questions_questiontype_enum" NOT NULL DEFAULT 'technical', CONSTRAINT "PK_2ef2c099d8bc521e9b89e986b3c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_511bc17de23229727c1f5183d9" ON "interview_questions" ("interviewId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."interviews_type_enum" AS ENUM('ai_interview', 'technical', 'hr')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."interviews_status_enum" AS ENUM('scheduled', 'invitation_sent', 'in_progress', 'pending_evaluation', 'completed', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "interviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "organizationId" uuid NOT NULL, "candidateId" uuid NOT NULL, "jobId" uuid NOT NULL, "roundTemplateId" uuid, "roundIndex" integer NOT NULL, "roundName" character varying NOT NULL, "type" "public"."interviews_type_enum" NOT NULL, "scheduledAt" TIMESTAMP WITH TIME ZONE NOT NULL, "durationMinutes" integer NOT NULL, "interviewerUserId" uuid, "timezone" character varying NOT NULL DEFAULT 'Asia/Kolkata (IST)', "status" "public"."interviews_status_enum" NOT NULL DEFAULT 'scheduled', "overallScore" numeric, "createdByUserId" uuid, "startedAt" TIMESTAMP WITH TIME ZONE, "autoSubmittedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_8f34b20f56ff9561c705ed5ef8b" UNIQUE ("candidateId", "roundIndex"), CONSTRAINT "PK_fd41af1f96d698fa33c2f070f47" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8cf1a0367209ecf220b3ff78bf" ON "interviews" ("organizationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9b47fb5a4e06ccb14d20d2f06f" ON "interviews" ("candidateId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_86c6a5b65c91b118189dc011aa" ON "interviews" ("jobId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a09afa22ecf3c7889499c4a9ae" ON "interviews" ("status") `,
    );
    await queryRunner.query(
      `ALTER TABLE "interview_round_questions" ADD CONSTRAINT "FK_77ff366830052381f88453916c3" FOREIGN KEY ("roundTemplateId") REFERENCES "interview_round_templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "interview_round_templates" ADD CONSTRAINT "FK_f23e3fbd741a1c1a7d62456e3c8" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "interview_round_templates" ADD CONSTRAINT "FK_ea314762f98911b56c63d0868f5" FOREIGN KEY ("defaultInterviewerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_skills" ADD CONSTRAINT "FK_aef367731b3f3e78ea90892fd47" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "jobs" ADD CONSTRAINT "FK_08bdc8b939f39e6d55b4c38cfb9" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "jobs" ADD CONSTRAINT "FK_ddaf4636da23c02caf299852cb3" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "candidate_notes" ADD CONSTRAINT "FK_7e4e4e1d182f0ff348ade667d6c" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "candidate_notes" ADD CONSTRAINT "FK_c648c8323e0d7d79e2c9a878d90" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "candidate_skills" ADD CONSTRAINT "FK_bab0ed80e495eb71be3cbf8c138" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "candidates" ADD CONSTRAINT "FK_426d378178da5713f1ab30daabc" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "interview_questions" ADD CONSTRAINT "FK_511bc17de23229727c1f5183d90" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "interviews" ADD CONSTRAINT "FK_9b47fb5a4e06ccb14d20d2f06fd" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "interviews" ADD CONSTRAINT "FK_86c6a5b65c91b118189dc011aaa" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "interviews" ADD CONSTRAINT "FK_18a2c5f2a7652f68e9db7103f0d" FOREIGN KEY ("interviewerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "interviews" ADD CONSTRAINT "FK_1f43852b7ee7d1938e73b1dd6a0" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "interviews" DROP CONSTRAINT "FK_1f43852b7ee7d1938e73b1dd6a0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interviews" DROP CONSTRAINT "FK_18a2c5f2a7652f68e9db7103f0d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interviews" DROP CONSTRAINT "FK_86c6a5b65c91b118189dc011aaa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interviews" DROP CONSTRAINT "FK_9b47fb5a4e06ccb14d20d2f06fd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interview_questions" DROP CONSTRAINT "FK_511bc17de23229727c1f5183d90"`,
    );
    await queryRunner.query(
      `ALTER TABLE "candidates" DROP CONSTRAINT "FK_426d378178da5713f1ab30daabc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "candidate_skills" DROP CONSTRAINT "FK_bab0ed80e495eb71be3cbf8c138"`,
    );
    await queryRunner.query(
      `ALTER TABLE "candidate_notes" DROP CONSTRAINT "FK_c648c8323e0d7d79e2c9a878d90"`,
    );
    await queryRunner.query(
      `ALTER TABLE "candidate_notes" DROP CONSTRAINT "FK_7e4e4e1d182f0ff348ade667d6c"`,
    );
    await queryRunner.query(`ALTER TABLE "jobs" DROP CONSTRAINT "FK_ddaf4636da23c02caf299852cb3"`);
    await queryRunner.query(`ALTER TABLE "jobs" DROP CONSTRAINT "FK_08bdc8b939f39e6d55b4c38cfb9"`);
    await queryRunner.query(
      `ALTER TABLE "job_skills" DROP CONSTRAINT "FK_aef367731b3f3e78ea90892fd47"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interview_round_templates" DROP CONSTRAINT "FK_ea314762f98911b56c63d0868f5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interview_round_templates" DROP CONSTRAINT "FK_f23e3fbd741a1c1a7d62456e3c8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interview_round_questions" DROP CONSTRAINT "FK_77ff366830052381f88453916c3"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_a09afa22ecf3c7889499c4a9ae"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_86c6a5b65c91b118189dc011aa"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9b47fb5a4e06ccb14d20d2f06f"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8cf1a0367209ecf220b3ff78bf"`);
    await queryRunner.query(`DROP TABLE "interviews"`);
    await queryRunner.query(`DROP TYPE "public"."interviews_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."interviews_type_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_511bc17de23229727c1f5183d9"`);
    await queryRunner.query(`DROP TABLE "interview_questions"`);
    await queryRunner.query(`DROP TYPE "public"."interview_questions_questiontype_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5f228b58143c96f42b12f0a5b5"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c0de76a18c2a505ceb01674682"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_426d378178da5713f1ab30daab"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d56a47318062e86ca2585103af"`);
    await queryRunner.query(`DROP TABLE "candidates"`);
    await queryRunner.query(`DROP TYPE "public"."candidates_stage_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bab0ed80e495eb71be3cbf8c13"`);
    await queryRunner.query(`DROP TABLE "candidate_skills"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_7e4e4e1d182f0ff348ade667d6"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9d9e2d7e23ff5a7e91851baa68"`);
    await queryRunner.query(`DROP TABLE "candidate_notes"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a0c30e3eb9649fe7fbcd336a63"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_08bdc8b939f39e6d55b4c38cfb"`);
    await queryRunner.query(`DROP TABLE "jobs"`);
    await queryRunner.query(`DROP TYPE "public"."jobs_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."jobs_employmenttype_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_aef367731b3f3e78ea90892fd4"`);
    await queryRunner.query(`DROP TABLE "job_skills"`);
    await queryRunner.query(`DROP TYPE "public"."job_skills_importance_enum"`);
    await queryRunner.query(`DROP TYPE "public"."job_skills_level_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_38139a1a9d69a1071029501384"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f23e3fbd741a1c1a7d62456e3c"`);
    await queryRunner.query(`DROP TABLE "interview_round_templates"`);
    await queryRunner.query(`DROP TYPE "public"."interview_round_templates_type_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_77ff366830052381f88453916c"`);
    await queryRunner.query(`DROP TABLE "interview_round_questions"`);
    await queryRunner.query(`DROP TYPE "public"."interview_round_questions_questiontype_enum"`);
  }
}
