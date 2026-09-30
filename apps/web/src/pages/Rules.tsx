import { Link } from 'react-router-dom';
import { makeCard } from '@take6/shared';
import { GameCard } from '../components/GameCard';
import { Bullhead } from '../art/icons';
import { useLang } from '../i18n';

const row = (...v: number[]) => v.map(makeCard);

export function Rules() {
  const { lang } = useLang();
  if (lang === 'zh') return <RulesZh />;
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="eyebrow">How to play</div>
      <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight">Bullheads rules in two minutes</h1>
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

      <Section title="FAQ">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-white">Is this the same as 6 nimmt! or Take 5?</h3>
            <p className="mt-1">
              Bullheads uses the same classic 104-card rules, so if you know 6 nimmt!, Take 5 or Take 6, you already know how to play.
              Bullheads is an independent game and is not affiliated with or endorsed by AMIGO Spiele, who publish 6 nimmt!®.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-white">Is it free?</h3>
            <p className="mt-1">Yes. Everything that affects play is free. The optional Plus upgrade removes ads and adds cosmetic card styles and characters.</p>
          </div>
          <div>
            <h3 className="font-semibold text-white">How many people can play?</h3>
            <p className="mt-1">2 to 10 players per table. Empty seats can be filled with bots, and you can play solo against bots any time.</p>
          </div>
          <div>
            <h3 className="font-semibold text-white">Do I need to download anything?</h3>
            <p className="mt-1">No. It runs in any modern browser on phones, tablets and computers. Share a 4-letter room code and friends can join instantly.</p>
          </div>
        </div>
      </Section>

      <div className="mt-10">
        <Link to="/" className="btn btn-primary btn-lg">Start playing</Link>
      </div>
    </div>
  );
}

function RulesZh() {
  const example = row(12, 17, 20, 24, 27);
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="eyebrow">遊戲規則</div>
      <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight">兩分鐘學會 Bullheads 牛頭卡牌</h1>
      <p className="mt-3 text-lg text-fog">目標只有一個：吃到的牛頭越少越好。剩下的全靠時機和膽量。</p>

      <Section title="牌組">
        <p>共 104 張牌，編號 1–104，每張牌上的牛頭就是罰分。大多數牌是 1 個牛頭；5 的倍數 2 個，10 的倍數 3 個，同位數（11、22…）5 個，55 則有 7 個。</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {[8, 15, 30, 44, 55].map((v) => (
            <GameCard key={v} card={makeCard(v)} width={62} />
          ))}
        </div>
      </Section>

      <Section title="開局">
        <p>每位玩家拿 10 張牌，桌上翻開 4 張牌作為 4 列的開頭。</p>
      </Section>

      <Section title="每一回合">
        <ol className="list-decimal space-y-2 pl-5">
          <li>所有人同時從手牌中秘密選一張牌，全部選好後一起翻開。</li>
          <li>從最小的牌開始，依序放到「最後一張比它小、而且數字最接近」的那一列。</li>
          <li>如果你的牌會成為某列的<b>第六張</b>，你就要把那列原本的五張牌全部收走（牛頭算進你的分數），你的牌變成新一列的開頭。</li>
          <li>如果你的牌比每一列的最後一張都小，你可以任選一列收走，並用你的牌取代它。</li>
        </ol>
        <div className="mt-5 panel p-4">
          <div className="text-sm text-fog">在這裡出 29，就會吃下整列：</div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {example.map((c) => (
              <GameCard key={c.value} card={c} width={48} />
            ))}
            <span className="mx-1 text-fog">←</span>
            <GameCard card={makeCard(29)} width={48} className="ring-2 ring-bull" />
            <span className="ml-2 flex items-center gap-1 font-display text-xl font-extrabold text-bull">
              +{example.reduce((s, c) => s + c.bullheads, 0)} <Bullhead size={16} />
            </span>
          </div>
        </div>
      </Section>

      <Section title="勝負">
        <p><b>快速局：</b>打一手 10 回合，牛頭最少的人獲勝。<b>搶 66 模式：</b>持續發新牌，任何人累積到 66 個牛頭時遊戲結束，總分最低者獲勝。</p>
      </Section>

      <Section title="常見問題">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-white">這跟《誰是牛頭王》(6 nimmt!) 一樣嗎？</h3>
            <p className="mt-1">
              Bullheads 使用相同的經典 104 張牌規則，玩過《誰是牛頭王》、6 nimmt!、Take 5 或 Take 6 的人馬上就會玩。
              Bullheads 是獨立製作的遊戲，與 AMIGO Spiele（6 nimmt!® 發行商）及其代理商無任何關係。
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-white">要錢嗎？</h3>
            <p className="mt-1">完全免費。所有影響遊戲的內容都免費，Plus 只是去除廣告並加上外觀造型。</p>
          </div>
          <div>
            <h3 className="font-semibold text-white">幾個人可以玩？</h3>
            <p className="mt-1">每桌 2 到 10 人。空位可以補電腦玩家，也可以隨時一個人對電腦練習。</p>
          </div>
          <div>
            <h3 className="font-semibold text-white">需要下載嗎？</h3>
            <p className="mt-1">不用。手機、平板、電腦的瀏覽器都能玩。分享 4 碼房號，朋友馬上就能加入。</p>
          </div>
        </div>
      </Section>

      <div className="mt-10">
        <Link to="/" className="btn btn-primary btn-lg">開始玩</Link>
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
