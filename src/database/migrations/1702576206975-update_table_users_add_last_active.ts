import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableUsersAddLastActive1702576206975 implements MigrationInterface {
    name = 'UpdateTableUsersAddLastActive1702576206975';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD "lastActive" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_4bb22bb50c4db496a7166184da" ON "users" ("lastActive")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "public"."IDX_4bb22bb50c4db496a7166184da"
        `);
        await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN "lastActive"
        `);
    }
}
