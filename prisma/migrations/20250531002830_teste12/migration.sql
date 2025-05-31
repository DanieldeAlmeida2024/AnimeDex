/*
  Warnings:

  - The primary key for the `Anime` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `episodes_data` on the `Anime` table. All the data in the column will be lost.
  - You are about to drop the column `lastUpdated` on the `Anime` table. All the data in the column will be lost.
  - You are about to alter the column `id` on the `Anime` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - Added the required column `imdbId` to the `Anime` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Anime` table without a default value. This is not possible if the table is not empty.
  - Made the column `poster` on table `Anime` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Anime" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "imdbId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "poster" TEXT NOT NULL,
    "animefireUrl" TEXT NOT NULL,
    "description" TEXT,
    "genres" TEXT,
    "releaseYear" INTEGER,
    "background" TEXT,
    "type" TEXT NOT NULL,
    "episodesData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "stremioId" TEXT,
    "lastSearchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Anime" ("animefireUrl", "background", "description", "genres", "id", "poster", "releaseYear", "title", "type") SELECT "animefireUrl", "background", "description", "genres", "id", "poster", "releaseYear", "title", "type" FROM "Anime";
DROP TABLE "Anime";
ALTER TABLE "new_Anime" RENAME TO "Anime";
CREATE UNIQUE INDEX "Anime_imdbId_key" ON "Anime"("imdbId");
CREATE UNIQUE INDEX "Anime_animefireUrl_key" ON "Anime"("animefireUrl");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
