/*
  Warnings:

  - The primary key for the `Anime` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Made the column `animefireUrl` on table `Anime` required. This step will fail if there are existing NULL values in that column.
  - Made the column `stremioId` on table `Anime` required. This step will fail if there are existing NULL values in that column.
  - Made the column `type` on table `Anime` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Anime" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imdbId" TEXT NOT NULL,
    "animefireUrl" TEXT NOT NULL,
    "stremioId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "poster" TEXT,
    "background" TEXT,
    "genres" TEXT,
    "releaseYear" INTEGER,
    "episodesData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastSearchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Anime" ("animefireUrl", "background", "createdAt", "description", "episodesData", "genres", "id", "imdbId", "lastSearchedAt", "poster", "releaseYear", "stremioId", "title", "type", "updatedAt") SELECT "animefireUrl", "background", "createdAt", "description", "episodesData", "genres", "id", "imdbId", "lastSearchedAt", "poster", "releaseYear", "stremioId", "title", "type", "updatedAt" FROM "Anime";
DROP TABLE "Anime";
ALTER TABLE "new_Anime" RENAME TO "Anime";
CREATE UNIQUE INDEX "Anime_imdbId_key" ON "Anime"("imdbId");
CREATE UNIQUE INDEX "Anime_animefireUrl_key" ON "Anime"("animefireUrl");
CREATE UNIQUE INDEX "Anime_stremioId_key" ON "Anime"("stremioId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
