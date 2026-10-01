import { format } from "node:util";

/** Set by systemd when stdout and stderr go to the journal; unset in dev, where `<3>` prefixes would just be noise. */
const toJournal = Boolean(process.env.JOURNAL_STREAM);
const PRIORITY = { error: 3, warn: 4 } as const;

/** journald reads a leading `<N>` as the line's syslog priority, but only per line, so a stack trace is tagged line by line. */
export const priorityTagged = (level: keyof typeof PRIORITY, args: unknown[]) =>
  format(...args).split("\n").map((line) => `<${PRIORITY[level]}>${line}`).join("\n");

/** Errors and warnings carry a journal priority, so `journalctl -p warning` finds them (the daily archive timer in devops/provision.sh keeps them). */
export const log = {
  error: (...args: unknown[]) => (toJournal ? console.error(priorityTagged("error", args)) : console.error(...args)),
  warn: (...args: unknown[]) => (toJournal ? console.warn(priorityTagged("warn", args)) : console.warn(...args)),
};
