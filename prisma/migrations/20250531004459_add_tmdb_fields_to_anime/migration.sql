-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Anime" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "imdbId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "poster" TEXT,
    "animefireUrl" TEXT,
    "description" TEXT,
    "genres" TEXT,
    "releaseYear" INTEGER,
    "background" TEXT,
    "type" TEXT,
    "episodesData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "stremioId" TEXT,
    "lastSearchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Anime" ("animefireUrl", "background", "createdAt", "description", "episodesData", "genres", "id", "imdbId", "lastSearchedAt", "poster", "releaseYear", "stremioId", "title", "type", "updatedAt") SELECT "animefireUrl", "background", "createdAt", "description", "episodesData", "genres", "id", "imdbId", "lastSearchedAt", "poster", "releaseYear", "stremioId", "title", "type", "updatedAt" FROM "Anime";
DROP TABLE "Anime";
ALTER TABLE "new_Anime" RENAME TO "Anime";
CREATE UNIQUE INDEX "Anime_imdbId_key" ON "Anime"("imdbId");
CREATE UNIQUE INDEX "Anime_animefireUrl_key" ON "Anime"("animefireUrl");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
