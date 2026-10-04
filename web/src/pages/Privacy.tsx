import { A } from "@solidjs/router";
import { CONTACT_EMAIL, FEEDBACK_URL } from "../links.ts";

// Every claim here must match the code. docs/privacy.md lists what to update when data handling changes.
export function Privacy() {
  const mail = () => <a class="qa-contact-email" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
  return (
    <article class="qa-privacy">
      <h1 class="h4 mb-1">Privacy policy</h1>
      <p class="text-body-secondary small">Last updated 1 October 2026</p>

      <div class="alert alert-secondary">
        <strong>In short:</strong> Ditto keeps what it needs to run your practice and nothing more. There are no ads, no trackers and no third-party analytics, and your data is never sold. AI features send exercise text and, in conversation mode, your voice to OpenAI, without your name or email. We never store your voice. You can get a copy of your data or have your account deleted by emailing {mail()}.
      </div>

      <h2 class="h5 mt-4">Who we are</h2>
      <p>Ditto (ditto.topherhunt.com) is a free language-practice app run by Topher Hunt, an individual, who is the controller of your personal data. For anything about your data, email {mail()}.</p>

      <h2 class="h5 mt-4">What we store and why</h2>
      <ul class="d-flex flex-column gap-2">
        <li><strong>Your Google account ID and email</strong>, to sign you in. We don't store your Google name or photo.</li>
        <li><strong>Your username, interface language, the languages you study, your practice settings and profile visibility</strong>, to run the app the way you set it up.</li>
        <li><strong>Your practice:</strong> the answers you type, your results, mistakes and the "Why?" explanations you ask for, review schedule, lessons completed, level tests and quizzes. This is the learning record your notebook, reviews and progress are built from.</li>
        <li><strong>Your conversations:</strong> the text of both sides, the transcripts of what you said and the feedback you got. We don't keep your voice: each recording is sent for transcription and then discarded. A copy stays in your browser for 30 days so you can replay it, and signing out deletes it.</li>
        <li><strong>Social features:</strong> friends and friend requests, races, notifications, people you block, and your post on the make-new-friends board if you make one.</li>
        <li><strong>Reports:</strong> problems you report with course content, and reports you make about another learner (we keep a copy of the username and board post you reported, since both can change).</li>
        <li><strong>Usage metrics:</strong> how many minutes per day you spend in each part of the app (for example "lessons, Italian, 12 minutes") and when you last used it. We use this to learn which features help people. Per-person figures are deleted after 90 days, leaving only totals that identify no one.</li>
        <li><strong>Language requests:</strong> if you use "Other..." to ask for a language, we keep a count of the two languages you chose, per day. If you are signed in we also keep a one-way hash of your account's public ID next to that pair, only so asking twice isn't counted twice. The hash isn't shown to anyone and we don't store anything you type.</li>
        <li><strong>AI costs:</strong> each AI request made for you, with its cost, to enforce the free daily allowance and plan our budget.</li>
      </ul>
      <p>We need the first six to provide the service you signed up for (performance of a contract). Reports about other learners, usage metrics, language requests and AI costs are kept because we have a legitimate interest in keeping the community safe, improving the app and keeping it affordable.</p>
      <p>We don't record your IP address, device, browser or location, and we don't use your data for advertising.</p>

      <h2 class="h5 mt-4">Cookies and browser storage</h2>
      <p>One cookie keeps you signed in for up to 30 days. Your browser also remembers a few display choices, such as your interface language, theme and the language you practiced last, and your recent conversation recordings (see above). We use no advertising, tracking or analytics cookies, so there is nothing to consent to.</p>

      <h2 class="h5 mt-4">What other learners see</h2>
      <ul class="d-flex flex-column gap-2">
        <li>Other learners know you only by your username. Your email is never shown to them, including your friends.</li>
        <li>If your profile is public (the default), anyone signed in can see your username, the language you most recently practiced and your lesson counts. If it's private, strangers see only your username.</li>
        <li>Friends see your progress details, and you appear on their weekly leaderboard.</li>
        <li>A post on the make-new-friends board shows your language, level, recent activity and blurb to every learner, even if your profile is private. Take it down any time.</li>
        <li>Friend search matches an exact username or email and shows only the username. So someone who already knows your email can find your username, but never the other way round.</li>
      </ul>
      <p>The operator can see all stored data, to run the app, answer support requests and review reports.</p>

      <h2 class="h5 mt-4">Who else processes your data</h2>
      <ul class="d-flex flex-column gap-2">
        <li><strong>RackNerd</strong> (United States) hosts the server, which stores the database and nightly backups.</li>
        <li><strong>OpenAI</strong> (United States) powers the AI features. For a "Why?" explanation we send the exercise and the answer you typed. In conversation mode we send each voice recording for transcription, the conversation's text for replies and feedback, and text to be spoken. We never send your name, email, username or account ID. Under OpenAI's API terms, this data isn't used to train their models and is kept for up to 30 days, for abuse monitoring.</li>
        <li><strong>Healthchecks.io</strong> alerts the operator when the server fails or goes silent. The server sends it a fixed status message and, after an error, the error's type (such as "TypeError"), never anything about a learner.</li>
        <li><strong>Google</strong> (United States) signs you in, under <a href="https://policies.google.com/privacy">Google's own privacy policy</a>. The <a href={FEEDBACK_URL}>feedback form</a> is also a Google Form, so anything you write in it is stored by Google.</li>
      </ul>
      <p>If you're in the European Economic Area, the UK or Switzerland, this means your data goes to the United States. OpenAI processes it under a data processing agreement and is certified under the EU-U.S. Data Privacy Framework.</p>

      <h2 class="h5 mt-4">How long we keep it</h2>
      <p>Your account, practice and conversations are kept while your account exists. Per-person usage metrics are kept for 90 days. Nightly backups are kept for 14 days, so data you delete is gone from them within two weeks.</p>

      <h2 class="h5 mt-4">Your rights</h2>
      <p>You can change your username, profile visibility and settings any time in Settings. By emailing {mail()}, you can also:</p>
      <ul>
        <li>get a copy of your data, in a machine-readable format;</li>
        <li>have anything inaccurate corrected;</li>
        <li>have your account and everything linked to it deleted;</li>
        <li>object to or ask us to restrict any use of your data.</li>
      </ul>
      <p>We'll answer within 30 days. If you're unhappy with how we handle your data, you can complain to your local data protection authority.</p>

      <h2 class="h5 mt-4">Children</h2>
      <p>Ditto is for people aged 16 and over. If we learn that an account belongs to someone younger, we'll delete it.</p>

      <h2 class="h5 mt-4">Security</h2>
      <p>All traffic is encrypted (HTTPS), sign-in tokens are stored only as hashes, and only the operator has access to the server. If a breach puts your data at risk, we'll tell you promptly.</p>

      <h2 class="h5 mt-4">Changes</h2>
      <p>When what we store or who processes it changes, we'll update this page and the date at the top, and announce significant changes in the app.</p>

      <p class="mt-4 text-body-secondary small">See also the <A href="/terms">terms of service</A>.</p>
    </article>
  );
}
