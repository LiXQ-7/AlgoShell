import { problemStore } from "./store";

const report = problemStore.report();
console.log(JSON.stringify(report, null, 2));
if (report.valid !== 100 || report.errors.length) process.exitCode = 1;
