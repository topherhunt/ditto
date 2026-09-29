- [x] Port Quizzer app into Ditto. As "Quiz" mode.
- [ ] Polish up the Talk feature
- [ ] Polish up the current featureset (Type and Talk)
- [ ] Polish up the onboarding & settings user flow
- [ ] redeploy to a European host VPS since I can't use US hosting for this app. confirm that the trip across the Atlantic will not be a significant drawback for people in Colombia with a slow internet connection.
- [ ] Draft up industry standard privacy policy in terms of use and data policy. ensure that this is GDPR compliant in a low-maintenance easy-to-follow way.
- [ ] Publish the Google Oauth app so people aren't blocked from accessing.
- [ ] test and confirm with Luis and others that people can access the app fine.

- [ ] A splash page introducing all of these tools. Give the pricing breakdown.
- [ ] When you first go to ditto.topherhunt.com, see the home page w an overview of features, what you can do , what to expect, how to make the most out if it. And then you can log in.
- [ ] Better onboarding: "Interface lanugage" needs to be clearer, eg "What larguage do you speak". Then ask "What languages do you want to learn?" (Gather feedback on any unsupported laguages, allow the user to request others.) Hints about keyboard usage (space to jump between words, enter)
- [ ] separate mode for pronunciation coach. Words, then sentences, very precisely.
- [ ] Ensure I'm protected from people overusing it & racking up api bill. Audit what my liabilities are and how to monitor them.
- [ ] By November 2026: revisit Talk's TTS. Italian and English use Kokoro on OpenRouter, which says questions as statements, so we bend their ends up 4 semitones with Praat (a hack, sometimes audible). Dutch uses Piper Ronnie (the only passably natural Dutch voice as of September 2026). Look for better Dutch voices and a cheap, fast TTS with real question intonation (Gemini Flash TTS rises but takes 1-3 s).
- [ ] Ensure the conversation mode is designed to be as cheap as possible. Does that mean STT and TTS should both be on my server? Or Modal? Cloudflare Workers?

- [ ] Track my total OpenAI API token spend. Is there a way to do that via the an API request from the token itself, or do I need to track it in the database per request somehow?
- [ ] Change the leaderboard to be in-depth and rich, but only be among your friends and their friends. So the only people you should see on the leaderboard are people you know, or 2nd-degree friends THEY know.

- Instrumentation
  - Track metrics: # users active per day, max # concurrent users, basic APM (rps per hour bucket, etc)
