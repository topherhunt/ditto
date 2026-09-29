# Ditto: agent notes

The design doc is [docs/plan.md](docs/plan.md); the README covers setup and commands.

## Identity privacy (hard rule)

Learners are known to each other only by their username. Never break these:

- A learner's email, Google name and Google photo are never shown to, or sent in any API response to, another learner. That includes friends. We don't store the Google name or photo at all (migration 021 dropped them), so don't add them back.
- The email is visible only to its owner (Settings) and to the operator on `/admin` pages. It is used to sign in and to send friend requests by exact email.
- Users are identified outside the server by `users.public_id`, a random 10-character ID from a 64-character alphabet that the DB assigns on insert. Use it in URLs (`/people/:publicId`) and in API inputs and outputs. The numeric `users.id` never leaves the server.
- Public profiles (`users.profile_public`, on by default) show a stranger only the username, the language most recently practiced, lesson counts and an Add friend button. Private ones show a stranger only the username and the button, and are left off the everyone leaderboard. Progress details are for the learner and their friends.
