import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1789125206923 implements MigrationInterface {
  name = 'InitialSchema1789125206923';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."organizations_status_enum" AS ENUM('trial', 'active', 'suspended')`,
    );
    await queryRunner.query(
      `CREATE TABLE "organizations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "status" "public"."organizations_status_enum" NOT NULL DEFAULT 'trial', CONSTRAINT "PK_6b031fcd0863e3f6b44230163f9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_963693341bd612aa01ddf3a4b6" ON "organizations" ("slug") `,
    );
    await queryRunner.query(
      `CREATE TABLE "organization_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "organizationId" uuid NOT NULL, "aiInterviewEnabled" boolean NOT NULL DEFAULT true, "defaultRoundDurationMinutes" integer NOT NULL DEFAULT '30', "defaultTimezone" character varying NOT NULL DEFAULT 'Asia/Kolkata (IST)', "notifyOnEvaluationReady" boolean NOT NULL DEFAULT true, "notifyOnNewApplication" boolean NOT NULL DEFAULT true, "emailSignature" text, CONSTRAINT "REL_c47b2784f7ab57d9ffbb6c83bb" UNIQUE ("organizationId"), CONSTRAINT "PK_67a83a1c6256f927137c33ddd7e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_c47b2784f7ab57d9ffbb6c83bb" ON "organization_settings" ("organizationId") `,
    );
    await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'recruiter')`);
    await queryRunner.query(
      `CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'invited', 'disabled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "organizationId" uuid NOT NULL, "email" character varying NOT NULL, "passwordHash" character varying, "name" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'recruiter', "status" "public"."users_status_enum" NOT NULL DEFAULT 'active', "avatarPath" character varying, "inviteTokenHash" character varying, "inviteTokenExpiresAt" TIMESTAMP WITH TIME ZONE, "resetTokenHash" character varying, "resetTokenExpiresAt" TIMESTAMP WITH TIME ZONE, "lastLoginAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_ddfb7904324cdba38d3c73de93a" UNIQUE ("organizationId", "email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f3d6aea8fcca58182b2e80ce97" ON "users" ("organizationId") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
    await queryRunner.query(
      `ALTER TABLE "organization_settings" ADD CONSTRAINT "FK_c47b2784f7ab57d9ffbb6c83bb9" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_f3d6aea8fcca58182b2e80ce979" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_f3d6aea8fcca58182b2e80ce979"`);
    await queryRunner.query(
      `ALTER TABLE "organization_settings" DROP CONSTRAINT "FK_c47b2784f7ab57d9ffbb6c83bb9"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f3d6aea8fcca58182b2e80ce97"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c47b2784f7ab57d9ffbb6c83bb"`);
    await queryRunner.query(`DROP TABLE "organization_settings"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_963693341bd612aa01ddf3a4b6"`);
    await queryRunner.query(`DROP TABLE "organizations"`);
    await queryRunner.query(`DROP TYPE "public"."organizations_status_enum"`);
  }
}
