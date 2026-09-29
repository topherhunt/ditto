- [ ] Draft up industry standard privacy policy in terms of use and data policy. ensure that this is GDPR compliant in a low-maintenance easy-to-follow way. Subprocessors: OpenAI (AI speech & tutoring features), RackNerd (server host).
- [ ] Publish the Google Oauth app so people aren't blocked from accessing.
- \[ \]

- Talk:
  - Conversation history should be compacted in a scrollable & hidable div so you don't have trouble getting back up to the top of the page. Or, Talk with Claude to think through what is the best way to do this on mobile. Maybe chats older than the most recent 3 are hidden under a "See chat history" modal that you can easily X out of. But that also introduces friction.... I'd like to hear your suggestions. Maybe just a "Skip to top" button on the left side or sth.

- Onboarding & overall UI
  - [ ] A splash page introducing all of these tools. Give the pricing breakdown.
  - [ ] When you first go to ditto.topherhunt.com, see the home page w an overview of features, what you can do , what to expect, how to make the most out if it. And then you can log in.
  - [ ] Better onboarding: "Interface lanugage" needs to be clearer, eg "What larguage do you speak". Then ask "What languages do you want to learn?" (Gather feedback on any unsupported laguages, allow the user to request others.) Hints about keyboard usage (space to jump between words, enter)

- Instrumentation & account controls
  - [x] Remove EXPLAIN_DAILY_LIMIT env var, And instead, each user gets an allotment of free credits. If any user exceeds that credit, then they get a congratulations message and a congratulations notification email telling them that they've used up all of their free credits for today. And I'm thrilled that they're using this platform so much, but sorry they'll have to wait for tomorrow.
  - Track metrics: # users active per day, max # concurrent users, basic APM (rps per hour bucket, etc)
  - I need complete tracking in the database in some efficient stats table. I need complete tracking of how much API spend all users have and each user has incurred per day so that I have a dashboard where I can track and I need to be able to review which users are spending the most or incurring the most cost for me.

### Pre launch

- [ ] npm run content:audio -- --prune
- [ ] Ensure:
  - [x] We are tracking and incrementing the API spend for each user per day in a metrics table so that we have per day stats on how much each user is spending. So I can easily tally up the total per user, I can identify heavy users, and also get a sense of what is a reasonable cost window to budget for this app.
  - [ ] test and confirm with Luis and others that people can access the app fine.
  - [ ] the production.inv has production api keys, no dev api keys.
  - [ ] We have full production logging with log rotation.

### For after launch

- Cache / store glossed / tooltipped audio so it plays faster & avoids extra GPT-4o calls?
- Support direct messaging friends. (but only in the language you're learning!! to force you to really practice. It can be translated for them if need be.) With some prompting/recoms of what to send them.
- Social & leaderboard rethink:
  - [x] Limit the leaderboard to you and your friends. No leaderboard of strangers' gobbledygook names. Friends of friends are dropped for good; the matching service below covers meeting new people.
  - [ ] Make the leaderboard more in-depth and rich qua content & comparisons & details about each person. Brainstorm w Claude.
    - Combined activity score.
    - encouraging and giving kudos.
    - Sending challenges to friends. "Ghost races" and similar.
  - [ ] Score a general proxy for activity across Type, Talk and Quiz, not just typed lessons.
  - [ ] Empty state: when you have no friends yet, prompt you to invite some.
  - [x] "Make new friends" board: opt in with a one-line blurb, see everyone else on it in random order, 3 friend requests a day.
  - [ ] Let learners report a board blurb, and let the operator hide it.
  - [ ] Send friends words of encouragement.
- Support slowing down audio as a user setting. Only up to A2.
- Stream on-demand audio to reduce wait times, rather than waiting until the full clip is returned?
- Find nicer `wrong` sound that's gentler on the ears. Search the marimba sound effects.
- [ ] separate mode for pronunciation coach. Words, then sentences, very precisely.
- Set up email sending. For user welcome email / accounin-app notifications
- Experiment with more gpt-4o-mini-tts voices in each language, beyond marin (F) and cedar (M), which all pre-rendered English, Italian and Dutch audio uses as of September 2026.
- \[ \]
- [ ] Once the dollar spend cap is verified in production, drop the unused `explain_usage` table with a migration.
