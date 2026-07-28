import fs from "node:fs";
import path from "node:path";
import { Problem, ProblemSchema } from "@algoshell/shared";
import { config } from "../config";

interface Manifest {
  schemaVersion: number;
  version: string;
  problems: Array<{ id: string; file: string; order: number }>;
}

class ProblemStore {
  private problems = new Map<string, Problem>();
  private orderedIds: string[] = [];
  private errors: Array<{ file: string; error: string }> = [];
  version = "unknown";

  load() {
    this.problems.clear();
    this.orderedIds = [];
    this.errors = [];
    const manifestPath = path.join(config.problemDir, "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Manifest;
    this.version = manifest.version;

    for (const entry of [...manifest.problems].sort((a, b) => a.order - b.order)) {
      try {
        const fullPath = path.resolve(config.problemDir, entry.file);
        if (!fullPath.startsWith(path.resolve(config.problemDir) + path.sep)) {
          throw new Error("Problem path escaped the whitelist directory");
        }
        const parsed = ProblemSchema.safeParse(JSON.parse(fs.readFileSync(fullPath, "utf8")));
        if (!parsed.success) {
          throw new Error(parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "));
        }
        if (parsed.data.id !== entry.id) throw new Error("Manifest id does not match problem id");
        if (this.problems.has(parsed.data.id)) throw new Error("Duplicate problem id");
        this.problems.set(parsed.data.id, parsed.data);
        this.orderedIds.push(parsed.data.id);
      } catch (error) {
        this.errors.push({ file: entry.file, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  get(id: string) {
    return this.problems.get(id) ?? null;
  }

  all() {
    return this.orderedIds.map((id) => this.problems.get(id)!).filter(Boolean);
  }

  indexOf(id: string) {
    return this.orderedIds.indexOf(id);
  }

  report() {
    return {
      version: this.version,
      valid: this.problems.size,
      expected: 100,
      errors: this.errors
    };
  }
}

export const problemStore = new ProblemStore();
problemStore.load();
