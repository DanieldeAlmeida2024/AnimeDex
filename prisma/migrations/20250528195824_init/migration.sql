-- CreateTable
CREATE TABLE "Anime" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "poster" TEXT,
    "description" TEXT,
    "releaseYear" INTEGER,
    "genres" TEXT,
    "animefireUrl" TEXT NOT NULL,
    "lastUpdated" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Anime_animefireUrl_key" ON "Anime"("animefireUrl");

-- CreateIndex
CREATE UNIQUE INDEX "Anime_title_type_key" ON "Anime"("title", "type");
