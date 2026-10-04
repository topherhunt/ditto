- 

## Feedback from 2026-10-04 Luis call

### Now

- [x] On the dashboard at the top, if you haven't already, if your account hasn't already been flagged as dismissed for this, there should be an invitation, like a like a bright blue alert info invitation to download the app. And you can click on that link to install it on your phone or device. And once you dismiss that invitation, it's persisted across your whole account. So it doesn't keep annoying you. I thought I already added this but I don't know where it is now.
- [x] On the friends page on the top, the find a friend search input needs to be reduced to just a button which opens a pop-up. And you need to have the find new friends next to that. So you can search for friends andor you can add yourself to the Find a Friends board both at the top of the Friends page because currently it's too hard to discover that functionality.
- [x] Leaderboard:
  - N active total this week
  - Show everyone who has practiced this week. And you can also page back to past weeks.
  - Remove the day/week/month toggle?
- [x] Everything that is accessible from the accounts menu or the account menu must also be accessible from the dashboard. So you don't need to tap the account menu in order to discover things like your friends list and make new friends and leaderboard. (Luis couldn't find the "Find new friends" button.)
- [x] In geeral, think through implications: People don't read things that aren't on the dashboard.
  - "About" link
  - Settings link
  - Feedback
  - leaderboard & friends
- [x] Dashboard -> Your Practice: need to get rid of the emphasis on "what you haven't done" and instead emphasize your progress towards the currently-targeted level, as a line chart growing up per day.
  - Also show the # of stars you've earned total and today, as an animated pop-in. Maybe put them on the chart somehow?
  - Inspect the "N% del camino hacia A1" - how's that calculated?
- [x] Dashboard, bottom 3 buttons, should link to the activity homepage, not jump straight into an activity.
- [x] Go through the old quizzer translator bugs folder and identify any problems with the quiz decks. also review all of the popular quiz decks and ensure there are no significant errors in them. Especially distractors that are actually correct or things like that.
- [x] Remove the legacy unscoped typing URLs (`/:lang/lesson/...`, `/:lang/test/...`, `/:lang/review`, `/:lang/notebook`, `/:lang/mistakes/practice`) by Fri 2026-10-02: delete `web/src/pages/LegacyRedirect.tsx` and its routes in `web/src/main.tsx`.
- [x] First-class feedback-gatherer UI that prompts for and collects users' wishes, needs, priorities, and feedback in a structured usable way. This replaces the Google Form that the dashboard's feedback card and the footer link to (`FEEDBACK_URL`).
- [ ] Leaderboard: your friends should be highlighted a brighter color so you can pick them out from the public. Maybe w a icon showing that they're a friend of yours.
  - [ ] Have a toggleable leaderboard mode to just show your friends. Default to including public.
- It's time to talk through with Claude how to add notifications, like reminders for for practicing every day. And maybe the reminder includes some little nudge about what your goal is or how many stars you need or what your progress is towards the lesson completions. so something that kind of nudges you and includes a little bit of personal content about where you are.
  - remind about races too
- [ ] In the talking activity, there should also be a notebook of your mistakes, which tracks sentences that you had trouble with so that you can review them and clear them out of the notebook.
- [ ] Also the talking activity needs to have a representation of earning stars, and we need to ensure that that's roughly balanced per effort unit with the stars that you earn in the typing activity.
- Plan out: support chat w friends -- only in a language you're learning.
- [ ] Think through a friendlier onboarding & welcome for absolute beginners.
  - [ ] The Type activity's extra step probably doesn't add anything. Show it in the SAME step, so the user can hear, read, see translation, and then type it in. Only the 1st time you get that item (same as before).
  - [ ] Have Claude brainstorm and think through with me what would make for a friendly or welcome experience so the user doesn't feel that they were just dropped in. Especially on the initial dashboard page.
  - [ ] Have some sort of little one-line feedback widget or button on the dashboard page. Asking you how your experience is going and what's missing. Button opens a pop-up that invites you to share what you're struggling with or what could be better. For example: users may indicate that the initial onboarding experience feels overwhelming, or there's too many options, or they don't know what to do next, or the experience is too structured & they want more flexibility, or they want a specific feature that's missing, etc.
- Friends list: should show basic stats about each friend. # stars, etc.
- When you go to a friend's profile and and then click to do an activity they've done or accept a challenge they've done or whatever, and you do it, it should send them a notification indicating that you've done an activity they also did. Clicking it links to a page comparing all activities you've both done (ordered by recency) with time & scores for each. (This notification type should be "idempotent" per friend, so if they do 12 activities since you last checked, you only see 1 notification saying "X did N activitiies you also did" or sth like that -- rather than 12 different notifications.)
- Talk activity: "Past conversations" title should be renamed to "Continue a past conversation" to emphasize that this is actionable.
- Quizzer: talk through w Claude how to make the difficulty buttons less painful to use. What if we reduce it to just easy/hard? Or, Is there any way we could remove this entirely, and use time as a proxy, or use repeated correctness as a proxy for easy? Or maybe replace it with a 1/4-col "Hard", 1/2-col "OK", and 1/4-col "Easy"?
- Currently, it feels like I've done very in-depth thinking about the UI and polish and mechanics of the type activity, but not so much about the incentives and motivation and reward stars and review mechanics for the talk or quiz activities. I should do a deep dive on those as well. Also, not just incentives and stars and rewards, but also noting mistakes and review and kind of collecting things to coach you on and support you on. Ideally, there should be a pool of items to review that's shared between different activities, but at the very least, each activity should have ways of tracking what you need reviewing.
- The talk activity currently lets you just pick your level. It doesn't give you any guidance on how to pick your level or what you should be considering when you choose one or what are the implications of choosing one. I feel like the coach should recommend one for you and maybe even set a default for you based on your recent activity and what you've done in this talking app in the past and what you've done in other apps in the past.
- [ ] Stars: Expand this system from just "indicating how much you've mastered each Type lesson" to "a unified progress metric, and a currency you can spend down".
  - So this would mean in addition to the type activity, the talk activity and quiz activities can earn you stars at roughly the same effort rate. And the more stars you get, the higher your overall score or identity. And you people can see that on your profile. Like it's like a primary metric of how engaged you are in this app is how many stars you've earned. And the leaderboard shows it basically tracks how many stars people are earning on a day or week or month basis or something like that.
  - The dashboard already shows a total and today's count, with a stand-in for Talk and Quiz: each conversation or quiz session that counts as a lesson is 1 star, and a Type lesson's stars count on the day it was last practiced. Properly design how Talk and Quiz earn stars, balanced per unit of effort against Type, and record star events with timestamps so "today" and the leaderboard can use them.
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

### Wishlist

- Put something about friends on the dashboard to nudge people to connect and find friends.
  - Friends section on the dashboard, below "Ways to practice".
- Record daily progress snapshots (percent toward the target level, per language), so the dashboard chart's history is real. Quiz graduation has no timestamps, so the chart spreads the quiz share over days by answers given.
