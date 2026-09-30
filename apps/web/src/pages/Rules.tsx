import { Link } from 'react-router-dom';
import { makeCard } from '@take6/shared';
import { GameCard } from '../components/GameCard';
import { Bullhead } from '../art/icons';

const row = (...v: number[]) => v.map(makeCard);

export function Rules() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="eyebrow">How to play</div>
      <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight">The rules in two minutes</h1>
      <p className="mt-3 text-lg text-fog">Collect as few bullheads as possible. That’s it — the rest is timing and nerve.</p>

      <Section title="The deck">
        <p>104 cards numbered 1–104. Each shows bullheads — penalty points. Most cards have one; multiples of 5 have two, multiples of 10 have three, doubles (11, 22…) have five, and 55 has seven.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {[8, 15, 30, 44, 55].map((v) => (
            <GameCard key={v} card={makeCard(v)} width={62} />
          ))}
        </div>
      </Section>

      <Section title="Setup">
        <p>Each player gets 10 cards. Four cards start the four rows on the table.</p>
      </Section>

      <Section title="Each turn">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Everyone secretly picks one card. When all have chosen, the cards are revealed together.</li>
          <li>Starting with the lowest card, each card goes on the row whose last card is <b>lower and closest</b> to it.</li>
          <li>
            If your card would be the <b>sixth</b> in a row, you take the five cards already there (adding their bullheads to your score) and your card starts a new row.
          </li>
          <li>If your card is lower than the end of every row, you choose any row to take, and your card replaces it.</li>
        </ol>
        <div className="mt-5 panel p-4">
          <div className="text-sm text-fog">Playing a 29 here takes the whole row:</div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {row(12, 17, 20, 24, 27).map((c) => (
              <GameCard key={c.value} card={c} width={48} />
            ))}
            <span className="mx-1 text-fog">←</span>
            <GameCard card={makeCard(29)} width={48} className="ring-2 ring-bull" />
            <span className="ml-2 flex items-center gap-1 font-display text-xl font-extrabold text-bull">
              +{row(12, 17, 20, 24, 27).reduce((s, c) => s + c.bullheads, 0)} <Bullhead size={16} />
            </span>
          </div>
        </div>
      </Section>

      <Section title="Winning">
        <p>
          <b>Quick game:</b> one hand of 10 turns — fewest bullheads wins. <b>Race to 66:</b> keep dealing new hands; the game ends when anyone reaches 66 bullheads, and the lowest total wins.
        </p>
      </Section>

      <Section title="Online etiquette">
        <p>Each turn has a timer set by the host. If you run out of time or drop connection, a cautious bot plays for you until you’re back.</p>
      </Section>

      <div className="mt-10">
        <Link to="/" className="btn btn-primary btn-lg">Start playing</Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <div className="mt-3 leading-relaxed text-mist">{children}</div>
    </section>
  );
}
