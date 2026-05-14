import fs from "node:fs/promises";
import path from "node:path";

import { getDb } from "@/lib/db";

const BACKUP_DIRECTORY = path.join(process.cwd(), "backups");
const BACKUP_PREFIX = "stonktracker-refresh-";
const BACKUP_EXTENSION = ".sqlite";
const MAX_BACKUPS = 5;

function getBackupFilename(date = new Date()) {
  const timestamp = date.toISOString().replace(/[:.]/g, "-");
  return `${BACKUP_PREFIX}${timestamp}${BACKUP_EXTENSION}`;
}

async function pruneOldBackups() {
  const entries = await fs.readdir(BACKUP_DIRECTORY, { withFileTypes: true });
  const backupFiles = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.startsWith(BACKUP_PREFIX) &&
        entry.name.endsWith(BACKUP_EXTENSION)
    )
    .map((entry) => entry.name)
    .sort()
    .reverse();

  await Promise.all(
    backupFiles.slice(MAX_BACKUPS).map((filename) => {
      return fs.unlink(path.join(BACKUP_DIRECTORY, filename));
    })
  );
}

export async function backupDatabaseAfterRefresh() {
  await fs.mkdir(BACKUP_DIRECTORY, { recursive: true });

  const backupPath = path.join(BACKUP_DIRECTORY, getBackupFilename());
  await getDb().backup(backupPath);
  await pruneOldBackups();

  return backupPath;
}
