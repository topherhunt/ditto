### Now

- [ ] Test and confirm with Luis and others that people can access the app fine.
- [ ] Remove the legacy unscoped typing URLs (`/:lang/lesson/...`, `/:lang/test/...`, `/:lang/review`, `/:lang/notebook`, `/:lang/mistakes/practice`) by Fri 2026-10-02: delete `web/src/pages/LegacyRedirect.tsx` and its routes in `web/src/main.tsx`.
- [ ] Improving the UI
  - [x] Fix the Internal Error
  - [x] Sfx when you start & stop recording
  - [x] Revise & polish the Greek typing course content
  - [x] Confirmed there was no French or Greek changes to the flashcards, and thus nothing needs to be revised or polished up there.
  - [x] The name should be "Ditto", not translated. Confirm that this is the case in all languages.
  - [x] Add a favicon.
  - [x] Revise & polish the French typing course content
  - [x] "Missing your language?" popup: 
    - [x] lanugage dropdowns need type-to-filter
    - [x] We also need a link after the languages you're learning list in the settings page. Even though it does the same thing, we want to Make it obvious to the user that we invite feedback on what languages they want to learn not just support for their native langauage as an interface. 
  - [x] I think we don't need to store users' email addresses, so they can be completely pseudonymous, but think this through with Claude. Maybe We can just store a arbitrary Google ID or something. 
  - [ ] Add an "Install to home screen" guidance page - walk users through how to install the icon on their phone. Is there a prompt API for this?
  - [ ] Type - when in activity, need some 1-line hint of what to do. And/or a "Help" ? link.
  - [ ] Improve the "Engaged time by activity" To ensure it answers the questions that I need answered. For example, which activities type versus talk versus quiz?
    - [ ] How many peolpe were ACTIVELY ENGAGED today?
    - [ ] What were they working on? Time spent total per activity, drill dow n
- \[ \]

### Wishlist

- Talk activity: when you tap on a word to translate it, while the speakaloud is loading, show a spinner next to the left of the tooltip. Disappears once the audio plays.
- The talk activity currently lets you just pick your level. It doesn't give you any guidance on how to pick your level or what you should be considering when you choose one or what are the implications of choosing one. I feel like the coach should recommend one for you and maybe even set a default for you based on your recent activity and what you've done in this talking app in the past and what you've done in other apps in the past.
- First-class feedback-gatherer UI that prompts for and collects users' wishes, needs, priorities, and feedback in a structured usable way.
- Review various list UIs for, how painful are they to scroll down and up on a phone? Think: Talk conversation UI (scrolling back up), Type review & notebook, etc. What can be done to surface the content you need to pay attention to near the top and tuck away lower content in expandable accordions in different categories so you don't have to do so much endless scrolling.
- [ ] In the talk activity for the suggested replies, there should be a little play icon to the right of each one so that you can listen to it and then repeat after it if you want.
- [ ] Stars: Expand this system from just "indicating how much you've mastered each Type lesson" to "a unified progress metric, and a currency you can spend down".
  - So this would mean in addition to the type activity, the talk activity and quiz activities can earn you stars at roughly the same effort rate. And the more stars you get, the higher your overall score or identity. And you people can see that on your profile. Like it's like a primary metric of how engaged you are in this app is how many stars you've earned. And the leaderboard shows it basically tracks how many stars people are earning on a day or week or month basis or something like that.
  - To make gaming the system less tempting, the coach should also have some feedback if it appears that you are working on things that are too easy for you. Like if you're not struggling, then the coach should be like, Hey, you are not living up to your potential. Work on the harder stuff, bro, or something like that. If you're never getting anything wrong, then or if that you're going through the stars too quickly per item, then that should be feedback from your coach. What do you think?
- [ ] Set up PWA phone notifications
  - TIme to study today
  - Make up for lost time! Challenge: Earn 9 stars today
  - Your friend <x> just hit <milestone> stars / level. Congratulate them.
- Currently playing audio on-demand in the Talk activity has a lag. Could each spoken gloss have its audio lazily cached on the server, hashed, so we can play it immediately the next time? And should this audio pool be merged with the pool used for the Type activity, so words generated for type don't need to be regenerated for Talk? or should the pools be kept separate because it's conceptually cleaner that way and the cost difference is trivial?

### Unorganized

- Talk:
  - Conversation history should be compacted in a scrollable & hidable div so you don't have trouble getting back up to the top of the page. Or, Talk with Claude to think through what is the best way to do this on mobile. Maybe chats older than the most recent 3 are hidden under a "See chat history" modal that you can easily X out of. But that also introduces friction.... I'd like to hear your suggestions. Maybe just a "Skip to top" button on the left side or sth.
- [ ] Review the mobile UX. Where are back-links non-obvious or confusing?
  - Type page - header is cluttered. Compact the Practice Settings line?
- [ ] Add French
- [x] Add Greek
- [ ] Ensure We have full production logging with log rotation.
- Smoke-test learning in each language to ensure content sounds & looks good
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
- Support slowing down audio as a user setting. Only up to A2.
- Stream on-demand audio to reduce wait times, rather than waiting until the full clip is returned?
- Find nicer `wrong` sound that's gentler on the ears. Search the marimba sound effects.
- [ ] separate mode for pronunciation coach. Words, then sentences, very precisely.
- Set up email sending. For user welcome email / accounin-app notifications
- Experiment with more gpt-4o-mini-tts voices in each language, beyond marin (F) and cedar (M), which all pre-rendered English, Italian and Dutch audio uses as of September 2026.
- \[ \]
- [ ] Once the dollar spend cap is verified in production, drop the unused `explain_usage` table with a migration.
