-- AlterTable
ALTER TABLE "education" ADD COLUMN     "cv_id" UUID;

-- AlterTable
ALTER TABLE "experience" ADD COLUMN     "cv_id" UUID;

-- AlterTable
ALTER TABLE "project" ADD COLUMN     "cv_id" UUID,
ALTER COLUMN "technologies" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "education" ADD CONSTRAINT "education_cv_id_fkey" FOREIGN KEY ("cv_id") REFERENCES "cvs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience" ADD CONSTRAINT "experience_cv_id_fkey" FOREIGN KEY ("cv_id") REFERENCES "cvs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_cv_id_fkey" FOREIGN KEY ("cv_id") REFERENCES "cvs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
