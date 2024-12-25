import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTableUsersAddRole1703644949702 implements MigrationInterface {
    name = 'UpdateTableUsersAddRole1703644949702';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "role" smallint NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
    }
}
