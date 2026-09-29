- [ ] Polish up the Talk feature
  - [ ] Your speech conversation partner should not steer to end the conversation. Even if you're in the context of ordering some food in a cafe or a drink and you've already ordered, they can take your order and ask if you need anything else, but they they want to leave an opening. They want to invite further dialogue. They don't ever want to steer towards ending the conversation because we want this conversation to stay open-ended. So they can ask you how your day is going, or how long you are visiting here, or if you've seen the beautiful mountains nearby, or who knows what. The LLM can think of something contextually appropriate to suggest next. We just need to encourage it to not try to end conversations. 
- [ ] Polish up the current featureset (Type and Talk)
- [ ] Polish up the onboarding & settings user flow
- [ ] redeploy to a European host VPS since I can't use US hosting for this app. confirm that the trip across the Atlantic will not be a significant drawback for people in Colombia with a slow internet connection.
- [ ] Draft up industry standard privacy policy in terms of use and data policy. ensure that this is GDPR compliant in a low-maintenance easy-to-follow way.
- [ ] Publish the Google Oauth app so people aren't blocked from accessing.
- [ ] test and confirm with Luis and others that people can access the app fine.

- [ ] When you first go to ditto.topherhunt.com, see the home page w an overview of features, what you can do , what to expect, how to make the most out if it. And then you can log in.
- [ ] Port Quizzer app into Ditto. As "Quiz" mode.
- [ ] Better onboarding: "Interface lanugage" needs to be clearer, eg "What larguage do you speak". Then ask "What languages do you want to learn?" (Gather feedback on any unsupported laguages, allow the user to request others.) Hints about keyboard usage (space to jump between words, enter)
- [ ] separate mode for pronunciation coach. Words, then sentences, very precisely.
- [ ] A splash page introducing all of these tools. Give the pricing breakdown.
- [ ] Ensure I'm protected from people overusing it & racking up api bill. Audit what my liabilities are and how to monitor them.
- [ ] Ensure the conversation mode is designed to be as cheap as possible. Does that mean STT and TTS should both be on my server? Or Modal? Cloudflare Workers?

- [ ] Track my total OpenAI API token spend. Is there a way to do that via the an API request from the token itself, or do I need to track it in the database per request somehow?
- [ ] Change the leaderboard to be in-depth and rich, but only be among your friends and their friends. So the only people you should see on the leaderboard are people you know, or 2nd-degree friends THEY know.

- Instrumentation
  - Track metrics: # users active per day, max # concurrent users, basic APM (rps per hour bucket, etc)
