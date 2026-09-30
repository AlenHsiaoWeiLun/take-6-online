-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "peakRating" INTEGER NOT NULL DEFAULT 1200,
ADD COLUMN     "ratedGames" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rating" INTEGER NOT NULL DEFAULT 1200;

-- AlterTable
ALTER TABLE "MatchPlayer" ADD COLUMN     "ratingBefore" INTEGER,
ADD COLUMN     "ratingDelta" INTEGER;

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "profileId" UUID,
    "name" TEXT,
    "email" TEXT,
    "topic" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "page" TEXT,
    "userAgent" TEXT,
    "handled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Feedback_createdAt_idx" ON "Feedback"("createdAt");

-- CreateIndex
CREATE INDEX "Profile_rating_idx" ON "Profile"("rating");

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Keep the Supabase Data API locked out of the new table too.
ALTER TABLE "Feedback" ENABLE ROW LEVEL SECURITY;
