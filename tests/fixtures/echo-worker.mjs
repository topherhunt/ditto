// Stands in for server/speech-worker.py: answers every request with its own pid, and exits when stdin closes.
import { createInterface } from "node:readline";
console.log(JSON.stringify({ ready: true }));
createInterface({ input: process.stdin }).on("line", (line) => console.log(JSON.stringify({ id: JSON.parse(line).id, seconds: process.pid })));
