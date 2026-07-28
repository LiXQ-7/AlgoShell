import fs from "node:fs";
import path from "node:path";
import { db } from "./database";
import { config } from "../config";

export const createDailyBackup = async () => {
  fs.mkdirSync(config.backupDir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const target = path.join(config.backupDir, `algoshell-${stamp}.db`);
  if (!fs.existsSync(target)) await db.backup(target);
  const backups = fs.readdirSync(config.backupDir)
    .filter((file) => /^algoshell-\d{4}-\d{2}-\d{2}\.db$/.test(file))
    .sort()
    .reverse();
  for (const stale of backups.slice(7)) fs.unlinkSync(path.join(config.backupDir, stale));
};
