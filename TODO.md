### Now

- [ ] Test and confirm with Luis and others that people can access the app fine.
- [ ] Improving the UI
  - [ ] Fix the Internal Error
  - [ ] Revise & polish the French typing course content
  - [ ] Revise & polish the Greek typing course content
  - [ ] Confirmed there was no French or Greek changes to the flashcards, and thus nothing needs to be revised or polished up there. 
  - [ ] The name should be "Ditto", not translated. Confirm that this is the case in all languages. 
  - [ ] Add a favicon.
  - [ ] Add an "Install to home screen" guidance page - walk users through how to install the icon on their phone. Is there a prompt API for this?
  - [ ] Type - when in activity, need some 1-line hint of what to do. And/or a "Help" ? link.
  - [ ] Improve the "Engaged time by activity" To ensure it answers the questions that I need answered. For example, which activities type versus talk versus quiz? 
    - [ ] How many peolpe were ACTIVELY ENGAGED today?
    - [ ] What were they working on? Time spent total per activity, drill dow n

### Wishlist

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
- [x] Add Greek (content written and validated; audio not yet rendered, and a native spelling/tonos review is open)
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
