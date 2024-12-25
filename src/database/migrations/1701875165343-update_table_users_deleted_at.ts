import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableUsersDeletedAt1701875165343 implements MigrationInterface {
    name = 'UpdateTableUsersDeletedAt1701875165343';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD "deletedAt" TIMESTAMP WITH TIME ZONE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN "deletedAt"
        `);
    }
}
