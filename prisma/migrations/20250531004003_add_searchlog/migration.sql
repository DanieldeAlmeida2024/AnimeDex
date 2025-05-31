-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SearchLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "imdbId" TEXT NOT NULL,
    "searchAt" DATETIME NOT NULL
);
INSERT INTO "new_SearchLog" ("id", "imdbId", "searchAt") SELECT "id", "imdbId", "searchAt" FROM "SearchLog";
DROP TABLE "SearchLog";
ALTER TABLE "new_SearchLog" RENAME TO "SearchLog";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
