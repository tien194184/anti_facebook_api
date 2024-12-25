import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTextSearchConfigurationVn1702574096060 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE EXTENSION IF NOT EXISTS unaccent;
        `);
        await queryRunner.query(`
            CREATE TEXT SEARCH CONFIGURATION vn ( COPY = 'simple' );
        `);
        await queryRunner.query(`
            ALTER TEXT SEARCH CONFIGURATION vn
                ALTER MAPPING FOR hword, hword_part, word
                WITH public.unaccent, simple;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TEXT SEARCH CONFIGURATION vn;
        `);
    }
}
