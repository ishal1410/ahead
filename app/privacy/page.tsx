import type { Metadata } from "next";
import { LegalPage, ISSUES, PERFECT_CORP, a } from "../ahead/Legal";

export const metadata: Metadata = { title: "Privacy · Ahead", description: "What Ahead collects, where it goes, and how to delete it." };

export default function Privacy() {
  return (
    <LegalPage title="Privacy" updated="30 October 2026">
      <section>
        <h2>What Ahead collects</h2>
        <ul>
          <li>The photo you choose on the Photo step, only after you tick the consent box.</li>
          <li>Where you tapped on it (hair and brow), the colours read from those taps, the hair shade you confirm on the ring, your hair length and the brow shape you choose.</li>
        </ul>
        <p>There are no accounts, no analytics and no advertising cookies. Maya&apos;s demo uses pre-rendered images and uploads nothing.</p>
      </section>
      <section>
        <h2>Where your photo goes</h2>
        <p>
          Your browser sends the photo to Ahead&apos;s server. The server resizes it in memory and sends it to Perfect Corp&apos;s YouCam API, which renders the brow and wig try-ons. The try-on images come back from YouCam&apos;s storage. Ahead&apos;s server does not write your photo or the results to disk or a database, and does not log them.
        </p>
        <p>
          To limit abuse, the server counts requests per network address in memory for up to 24 hours. Our hosting platform may keep its own standard request logs.
        </p>
      </section>
      <section>
        <h2>What stays in your browser</h2>
        <ul>
          <li>When you save, your Look Passport (including a small copy of the photo) is kept in this browser&apos;s localStorage. It stays until you delete it.</li>
          <li>Until you save, the unsaved page (a small copy of the photo and your taps) is kept in this tab&apos;s sessionStorage so a refresh doesn&apos;t lose it. It goes when you close the tab.</li>
          <li>The demo and the looks you tried on are kept in this tab&apos;s sessionStorage.</li>
        </ul>
      </section>
      <section>
        <h2>How long it is kept</h2>
        <p>Ahead keeps nothing on its server. What Perfect Corp keeps, and for how long, is governed by Perfect Corp&apos;s own terms and its <a href={PERFECT_CORP} className={a} target="_blank" rel="noopener noreferrer">YouCam API privacy policy</a> on perfectcorp.com.</p>
      </section>
      <section>
        <h2>How to delete it</h2>
        <p>Use &ldquo;Delete my passport&rdquo; at the bottom of any Ahead screen. It removes the saved passport and this tab&apos;s session data. Clearing this site&apos;s data in your browser settings does the same.</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>Questions or requests: open an issue at <a href={ISSUES} className={a}>github.com/ishal1410/ahead/issues</a>.</p>
      </section>
    </LegalPage>
  );
}
