import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableNotificationsTimestamps1701606370097 implements MigrationInterface {
    name = 'UpdateTableNotificationsTimestamps1701606370097';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "notifications"
            ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        `);
        await queryRunner.query(`
            ALTER TABLE "notifications"
            ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "notifications" DROP COLUMN "updatedAt"
        `);
        await queryRunner.query(`
            ALTER TABLE "notifications" DROP COLUMN "createdAt"
        `);
    }
}
