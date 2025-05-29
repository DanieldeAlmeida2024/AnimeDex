/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Anime` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Anime" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "poster" TEXT,
    "background" TEXT,
    "animefireUrl" TEXT NOT NULL,
    "description" TEXT,
    "genres" TEXT,
    "releaseYear" INTEGER,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "episodes_data" TEXT
);
INSERT INTO "new_Anime" ("animefireUrl", "background", "description", "genres", "id", "lastUpdated", "poster", "releaseYear", "title", "type") SELECT "animefireUrl", "background", "description", "genres", "id", "lastUpdated", "poster", "releaseYear", "title", "type" FROM "Anime";
DROP TABLE "Anime";
ALTER TABLE "new_Anime" RENAME TO "Anime";
CREATE UNIQUE INDEX "Anime_animefireUrl_key" ON "Anime"("animefireUrl");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
