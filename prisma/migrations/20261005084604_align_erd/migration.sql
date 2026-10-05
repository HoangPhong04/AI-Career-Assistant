/*
  Warnings:

  - The primary key for the `cvs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `original_name` on the `cvs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `file_path` on the `cvs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `file_type` on the `cvs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - The `status` column on the `cvs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `score` on the `cvs` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(5,2)`.
  - The primary key for the `interview_questions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `category` on the `interview_questions` table. All the data in the column will be lost.
  - You are about to drop the column `expected_answer` on the `interview_questions` table. All the data in the column will be lost.
  - You are about to drop the column `feedback` on the `interview_questions` table. All the data in the column will be lost.
  - You are about to drop the column `order_no` on the `interview_questions` table. All the data in the column will be lost.
  - You are about to drop the column `question` on the `interview_questions` table. All the data in the column will be lost.
  - You are about to alter the column `score` on the `interview_questions` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(5,2)`.
  - The primary key for the `interview_sessions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `feedback_json` on the `interview_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `target_role` on the `interview_sessions` table. All the data in the column will be lost.
  - The `status` column on the `interview_sessions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `overall_score` on the `interview_sessions` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(5,2)`.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `email` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `password_hash` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `full_name` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - The `role` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `career_roadmaps` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `id` on the `cvs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `cvs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `question_text` to the `interview_questions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `question_type` to the `interview_questions` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `interview_questions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `session_id` on the `interview_questions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `position` to the `interview_sessions` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `interview_sessions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `interview_sessions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `password_hash` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "career_roadmaps" DROP CONSTRAINT "career_roadmaps_cv_id_fkey";

-- DropForeignKey
ALTER TABLE "career_roadmaps" DROP CONSTRAINT "career_roadmaps_user_id_fkey";

-- DropForeignKey
ALTER TABLE "cvs" DROP CONSTRAINT "cvs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "interview_questions" DROP CONSTRAINT "interview_questions_session_id_fkey";

-- DropForeignKey
ALTER TABLE "interview_sessions" DROP CONSTRAINT "interview_sessions_user_id_fkey";

-- AlterTable
ALTER TABLE "cvs" DROP CONSTRAINT "cvs_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
ALTER COLUMN "original_name" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "file_path" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "file_type" SET DATA TYPE VARCHAR(50),
DROP COLUMN "status",
ADD COLUMN     "status" VARCHAR(20) NOT NULL DEFAULT 'UPLOADED',
ALTER COLUMN "score" SET DATA TYPE DECIMAL(5,2),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(6),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(6),
ADD CONSTRAINT "cvs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "interview_questions" DROP CONSTRAINT "interview_questions_pkey",
DROP COLUMN "category",
DROP COLUMN "expected_answer",
DROP COLUMN "feedback",
DROP COLUMN "order_no",
DROP COLUMN "question",
ADD COLUMN     "ai_feedback" TEXT,
ADD COLUMN     "question_text" TEXT NOT NULL,
ADD COLUMN     "question_type" VARCHAR(20) NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "session_id",
ADD COLUMN     "session_id" UUID NOT NULL,
ALTER COLUMN "score" SET DATA TYPE DECIMAL(5,2),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(6),
ADD CONSTRAINT "interview_questions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "interview_sessions" DROP CONSTRAINT "interview_sessions_pkey",
DROP COLUMN "feedback_json",
DROP COLUMN "target_role",
ADD COLUMN     "ended_at" TIMESTAMP(6),
ADD COLUMN     "level" VARCHAR(20),
ADD COLUMN     "position" VARCHAR(100) NOT NULL,
ADD COLUMN     "started_at" TIMESTAMP(6),
ADD COLUMN     "type" VARCHAR(20),
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" VARCHAR(20) NOT NULL DEFAULT 'CREATED',
ALTER COLUMN "overall_score" SET DATA TYPE DECIMAL(5,2),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(6),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(6),
ADD CONSTRAINT "interview_sessions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
ADD COLUMN     "avatar_url" VARCHAR(255),
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "email" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "password_hash" SET NOT NULL,
ALTER COLUMN "password_hash" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "full_name" SET DATA TYPE VARCHAR(100),
DROP COLUMN "role",
ADD COLUMN     "role" VARCHAR(20) NOT NULL DEFAULT 'user',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(6),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(6),
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "career_roadmaps";

-- DropEnum
DROP TYPE "CVStatus";

-- DropEnum
DROP TYPE "InterviewStatus";

-- DropEnum
DROP TYPE "UserRole";

-- CreateTable
CREATE TABLE "cv_skill" (
    "id" UUID NOT NULL,
    "cv_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "level" VARCHAR(20),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cv_skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "category" VARCHAR(50),
    "description" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_goal" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "target_role" VARCHAR(100) NOT NULL,
    "target_level" VARCHAR(20),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "career_goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_roadmap" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "cv_id" UUID,
    "goal_id" UUID,
    "target_role" VARCHAR(100) NOT NULL,
    "target_level" VARCHAR(20),
    "current_skills" JSONB,
    "missing_skills" JSONB,
    "roadmap_json" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "career_roadmap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_step" (
    "id" UUID NOT NULL,
    "roadmap_id" UUID NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "order_index" INTEGER NOT NULL,
    "start_date" DATE,
    "end_date" DATE,
    "status" VARCHAR(255) NOT NULL DEFAULT 'PENDING',
    "resources" JSONB,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roadmap_step_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "school_name" VARCHAR(255) NOT NULL,
    "degree" VARCHAR(100),
    "major" VARCHAR(100),
    "start_date" DATE,
    "end_date" DATE,
    "description" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "company_name" VARCHAR(255) NOT NULL,
    "position" VARCHAR(100),
    "start_date" DATE,
    "end_date" DATE,
    "description" TEXT,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "technologies" VARCHAR(255),
    "start_date" DATE,
    "end_date" DATE,
    "url" VARCHAR(255),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "cvs" ADD CONSTRAINT "cvs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv_skill" ADD CONSTRAINT "cv_skill_cv_id_fkey" FOREIGN KEY ("cv_id") REFERENCES "cvs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv_skill" ADD CONSTRAINT "cv_skill_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_goal" ADD CONSTRAINT "career_goal_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_roadmap" ADD CONSTRAINT "career_roadmap_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_roadmap" ADD CONSTRAINT "career_roadmap_cv_id_fkey" FOREIGN KEY ("cv_id") REFERENCES "cvs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_roadmap" ADD CONSTRAINT "career_roadmap_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "career_goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_step" ADD CONSTRAINT "roadmap_step_roadmap_id_fkey" FOREIGN KEY ("roadmap_id") REFERENCES "career_roadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_questions" ADD CONSTRAINT "interview_questions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education" ADD CONSTRAINT "education_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience" ADD CONSTRAINT "experience_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
