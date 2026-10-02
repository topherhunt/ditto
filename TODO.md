### Now

- [ ] Remove the legacy unscoped typing URLs (`/:lang/lesson/...`, `/:lang/test/...`, `/:lang/review`, `/:lang/notebook`, `/:lang/mistakes/practice`) by Fri 2026-10-02: delete `web/src/pages/LegacyRedirect.tsx` and its routes in `web/src/main.tsx`.
- Friends list: should show basic stats about each friend. # stars, etc.
- When you go to a friend's profile and and then click to do an activity they've done or accept a challenge they've done or whatever, and you do it, it should send them a notification indicating that you've done an activity they also did. Clicking it links to a page comparing all activities you've both done (ordered by recency) with time & scores for each. (This notification type should be "idempotent" per friend, so if they do 12 activities since you last checked, you only see 1 notification saying "X did N activitiies you also did" or sth like that -- rather than 12 different notifications.)
- Put something about friends on the dashboard to nudge people to connect and find friends.
  - Friends section on the dashboard, below "Ways to practice".
- Talk activity: "Past conversations" title should be renamed to "Continue a past conversation" to emphasize that this is actionable.
- Quizzer: talk through w Claude how to make the difficulty buttons less painful to use. What if we reduce it to just easy/hard? Or, Is there any way we could remove this entirely, and use time as a proxy, or use repeated correctness as a proxy for easy? Or maybe replace it with a 1/4-col "Hard", 1/2-col "OK", and 1/4-col "Easy"?
- Currently, it feels like I've done very in-depth thinking about the UI and polish and mechanics of the type activity, but not so much about the incentives and motivation and reward stars and review mechanics for the talk or quiz activities. I should do a deep dive on those as well. Also, not just incentives and stars and rewards, but also noting mistakes and review and kind of collecting things to coach you on and support you on. Ideally, there should be a pool of items to review that's shared between different activities, but at the very least, each activity should have ways of tracking what you need reviewing.
- The talk activity currently lets you just pick your level. It doesn't give you any guidance on how to pick your level or what you should be considering when you choose one or what are the implications of choosing one. I feel like the coach should recommend one for you and maybe even set a default for you based on your recent activity and what you've done in this talking app in the past and what you've done in other apps in the past.
- First-class feedback-gatherer UI that prompts for and collects users' wishes, needs, priorities, and feedback in a structured usable way.
- [ ] Stars: Expand this system from just "indicating how much you've mastered each Type lesson" to "a unified progress metric, and a currency you can spend down".
  - So this would mean in addition to the type activity, the talk activity and quiz activities can earn you stars at roughly the same effort rate. And the more stars you get, the higher your overall score or identity. And you people can see that on your profile. Like it's like a primary metric of how engaged you are in this app is how many stars you've earned. And the leaderboard shows it basically tracks how many stars people are earning on a day or week or month basis or something like that.
  - To make gaming the system less tempting, the coach should also have some feedback if it appears that you are working on things that are too easy for you. Like if you're not struggling, then the coach should be like, Hey, you are not living up to your potential. Work on the harder stuff, bro, or something like that. If you're never getting anything wrong, then or if that you're going through the stars too quickly per item, then that should be feedback from your coach. What do you think?
- [ ] Set up PWA phone notifications
  - TIme to study today
  - Make up for lost time! Challenge: Earn 9 stars today
  - Your friend <x> just hit <milestone> stars / level. Congratulate them.
- Currently playing audio on-demand in the Talk activity has a lag. Could each spoken gloss have its audio lazily cached on the server, hashed, so we can play it immediately the next time? And should this audio pool be merged with the pool used for the Type activity, so words generated for type don't need to be regenerated for Talk? or should the pools be kept separate because it's conceptually cleaner that way and the cost difference is trivial?

### Unorganized

- Support self-service account deletion (but preserve anonymous activity metrics & API call ledger)
- Support self-service full data download/export
- Cache / store glossed / tooltipped audio so it plays faster & avoids extra GPT-4o calls?
- Support direct messaging friends. (but only in the language you're learning!! to force you to really practice. It can be translated for them if need be.) With some prompting/recoms of what to send them.
- Social & leaderboard rethink:
  - [ ] Make the leaderboard more in-depth and rich qua content & comparisons & details about each person. Brainstorm w Claude.
    - Combined activity score.
    - encouraging and giving kudos.
    - Sending challenges to friends. "Ghost races" and similar.
  - [ ] Score a general proxy for activity across Type, Talk and Quiz, not just typed lessons.
  - [ ] Empty state: when you have no friends yet, prompt you to invite some.
  - [x] "Make new friends" board: opt in with a one-line blurb, see everyone else on it in random order, 3 friend requests a day.
  - [x] Block or report anyone from their profile; the operator takes down board posts or clears usernames at `/admin/user-reports`.
  - [ ] Send friends words of encouragement.
- Support slowing down audio in Talk mode?
- Stream on-demand audio to reduce wait times, rather than waiting until the full clip is returned?
- Find nicer `wrong` sound that's gentler on the ears. Search the marimba sound effects.
- [ ] separate mode for pronunciation coach. Words, then sentences, very precisely.
- Set up email sending. For user welcome email / accounin-app notifications
- [ ] Once the dollar spend cap is verified in production, drop the unused `explain_usage` table with a migration.When you go to a friend's page and you do an activity they've done, it should send them a notification. 
