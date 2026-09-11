import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationsAndActivity1789132463131 implements MigrationInterface {
  name = 'NotificationsAndActivity1789132463131';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('evaluation_ready', 'general')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "organizationId" uuid NOT NULL, "userId" uuid NOT NULL, "type" "public"."notifications_type_enum" NOT NULL DEFAULT 'general', "title" character varying NOT NULL, "body" text, "link" character varying, "readAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_928914a0743f50e6f83a90cdda" ON "notifications" ("organizationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_692a909ee0fa9383e7859f9b40" ON "notifications" ("userId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."activity_logs_type_enum" AS ENUM('job_created', 'candidate_created', 'candidate_stage_changed', 'interview_scheduled', 'evaluation_completed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "activity_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "organizationId" uuid NOT NULL, "type" "public"."activity_logs_type_enum" NOT NULL, "message" character varying NOT NULL, "actorUserId" uuid, CONSTRAINT "PK_f25287b6140c5ba18d38776a796" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_97f652d54fa17db1d697aea924" ON "activity_logs" ("organizationId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_97f652d54fa17db1d697aea924"`);
    await queryRunner.query(`DROP TABLE "activity_logs"`);
    await queryRunner.query(`DROP TYPE "public"."activity_logs_type_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_692a909ee0fa9383e7859f9b40"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_928914a0743f50e6f83a90cdda"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
  }
}
