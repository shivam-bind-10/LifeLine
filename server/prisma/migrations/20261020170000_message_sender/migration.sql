CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

ALTER TABLE "Message"
ADD CONSTRAINT "Message_senderId_fkey"
FOREIGN KEY ("senderId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
