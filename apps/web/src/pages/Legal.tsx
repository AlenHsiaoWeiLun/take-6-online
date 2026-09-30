import { BRAND } from '../brand';

/**
 * Starter legal copy so AdSense and Stripe have pages to point at.
 * Have it reviewed for your jurisdiction before launch.
 */
export function Privacy() {
  return (
    <Doc title="Privacy Policy">
      <p>This policy explains what {BRAND.name} (“we”) collects and why.</p>
      <h2>What we collect</h2>
      <ul>
        <li><b>Guest play:</b> a random identifier and the display name and character you choose, stored in your browser.</li>
        <li><b>Accounts:</b> if you sign in, your email address and basic profile from the sign-in provider (via Supabase), plus your game statistics.</li>
        <li><b>Payments:</b> purchases are processed by Stripe. We receive a record of the purchase but never your full card details.</li>
        <li><b>Gameplay:</b> the moves in each game, kept in memory while the game runs, and final results for signed-in players.</li>
      </ul>
      <h2>Advertising and cookies</h2>
      <p>
        Free players see ads served by Google AdSense. Google and its partners may use cookies to serve ads based on your visits to this and other sites.
        You can opt out of personalised advertising at <a href="https://adssettings.google.com">adssettings.google.com</a>. Plus members are never shown ads.
      </p>
      <h2>Your choices</h2>
      <p>You can delete your account and statistics at any time by emailing <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>.</p>
      <h2>Contact</h2>
      <p>{BRAND.company} · <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a></p>
    </Doc>
  );
}

export function Terms() {
  return (
    <Doc title="Terms of Service">
      <p>By playing {BRAND.name} you agree to these terms.</p>
      <h2>Fair play</h2>
      <p>Be kind. Don’t use offensive names, automate play, or exploit bugs. We may remove players or names that break these rules.</p>
      <h2>{BRAND.plus}</h2>
      <p>
        Plus is a one-time digital purchase that removes ads and unlocks cosmetic items on your account for as long as the service runs.
        If something isn’t right, contact us within 14 days of purchase for a refund. Refunded purchases remove Plus from the account.
      </p>
      <h2>Availability</h2>
      <p>The game is provided “as is”. We work to keep it online but can’t guarantee uninterrupted service.</p>
      <h2>Contact</h2>
      <p><a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a></p>
    </Doc>
  );
}

function Doc({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl px-4 py-12 leading-relaxed text-mist [&_a]:text-hay [&_a]:underline [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white [&_li]:mt-2 [&_p]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
      <h1 className="font-display text-4xl font-extrabold text-white">{title}</h1>
      <p className="text-sm text-fog">Last updated {new Date(2026, 8, 30).toLocaleDateString('en-US', { dateStyle: 'long' })}</p>
      {children}
    </article>
  );
}
