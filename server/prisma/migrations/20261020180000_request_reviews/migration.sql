CREATE UNIQUE INDEX "Review_requestId_reviewerId_key"
ON "Review"("requestId", "reviewerId");

CREATE INDEX "Review_revieweeId_createdAt_idx"
ON "Review"("revieweeId", "createdAt");

ALTER TABLE "Review"
ADD CONSTRAINT "Review_reviewerId_fkey"
FOREIGN KEY ("reviewerId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Review"
ADD CONSTRAINT "Review_revieweeId_fkey"
FOREIGN KEY ("revieweeId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Review"
ADD CONSTRAINT "Review_rating_check"
CHECK ("rating" BETWEEN 1 AND 5);
