import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTablePasswordHistory1704961304205 implements MigrationInterface {
    name = 'CreateTablePasswordHistory1704961304205';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "password_history" (
                "id" SERIAL NOT NULL,
                "userId" integer NOT NULL,
                "password" character varying NOT NULL,
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_da65ed4600e5e6bc9315754a8b2" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "password_history"
            ADD CONSTRAINT "FK_20c510e5ca12f63b0c915c3e2df" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "password_history" DROP CONSTRAINT "FK_20c510e5ca12f63b0c915c3e2df"
        `);
        await queryRunner.query(`
            DROP TABLE "password_history"
        `);
    }
}
