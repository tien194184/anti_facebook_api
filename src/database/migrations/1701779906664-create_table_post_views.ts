import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTablePostViews1701779906664 implements MigrationInterface {
    name = 'CreateTablePostViews1701779906664';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "post_views" (
                "id" SERIAL NOT NULL,
                "userId" integer NOT NULL,
                "postId" integer NOT NULL,
                "count" integer NOT NULL DEFAULT '0',
                CONSTRAINT "PK_c2a8a36a99453e5ac5ddf15cbf7" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_fd26876697cd9b3ab516837c83" ON "post_views" ("userId", "postId")
        `);
        await queryRunner.query(`
            ALTER TABLE "post_views"
            ADD CONSTRAINT "FK_b7972ee9560985909e554848591" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "post_views"
            ADD CONSTRAINT "FK_a05ca4e99f3345db11cfe91ee6e" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "post_views" DROP CONSTRAINT "FK_a05ca4e99f3345db11cfe91ee6e"
        `);
        await queryRunner.query(`
            ALTER TABLE "post_views" DROP CONSTRAINT "FK_b7972ee9560985909e554848591"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_fd26876697cd9b3ab516837c83"
        `);
        await queryRunner.query(`
            DROP TABLE "post_views"
        `);
    }
}
