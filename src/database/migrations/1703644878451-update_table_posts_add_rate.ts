import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTablePostsAddRate1703644878451 implements MigrationInterface {
    name = 'UpdateTablePostsAddRate1703644878451';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "posts" ADD "rate" smallint`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "rate"`);
    }
}
