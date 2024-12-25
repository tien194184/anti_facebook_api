import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableNotificationsAddCoins1703645018314 implements MigrationInterface {
    name = 'UpdateTableNotificationsAddCoins1703645018314';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" ADD "coins" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "coins"`);
    }
}
