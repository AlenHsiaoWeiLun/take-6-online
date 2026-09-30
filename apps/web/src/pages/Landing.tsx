import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { makeCard } from '@take6/shared';
import landings from '../seo/landings.json';
import { HeroArt } from '../art/Illustrations';
import { GameCard } from '../components/GameCard';
import { AdSlot } from '../components/AdSlot';
import { IconArrowRight } from '../art/icons';
import { useLang, type Lang } from '../i18n';

export interface LandingContent {
  path: string;
  lang: Lang;
  alternate: string;
  title: string;
  description: string;
  h1: string;
  lead: string;
  sections: { h2: string; p: string[] }[];
  cta: string;
  disclaimer: string;
}

export const LANDINGS = landings as LandingContent[];

/** Search landing page. The same content is prerendered to static HTML at build time (scripts/prerender.mjs). */
export function Landing({ content }: { content: LandingContent }) {
  const { setLang } = useLang();

  useEffect(() => {
    setLang(content.lang);
    document.title = content.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', content.description);
  }, [content, setLang]);

  return (
    <article className="mx-auto max-w-6xl px-4 py-12">
      <div className="grid items-center gap-10 md:grid-cols-[1.1fr_1fr]">
        <div>
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-balance sm:text-5xl">{content.h1}</h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-fog">{content.lead}</p>
          <Link to="/" className="btn btn-primary btn-lg mt-8">
            {content.cta} <IconArrowRight size={18} />
          </Link>
        </div>
        <HeroArt />
      </div>

      <AdSlot slot="banner" className="my-10" />

      <div className="mx-auto max-w-3xl">
        {content.sections.map((s) => (
          <section key={s.h2} className="mt-10">
            <h2 className="font-display text-2xl font-bold">{s.h2}</h2>
            {s.p.map((p) => (
              <p key={p} className="mt-3 leading-relaxed text-mist">{p}</p>
            ))}
          </section>
        ))}
        <div className="mt-10 flex flex-wrap gap-2">
          {[23, 24, 27, 29, 55].map((v) => (
            <GameCard key={v} card={makeCard(v)} width={56} />
          ))}
        </div>
        <Link to="/" className="btn btn-primary btn-lg mt-10">
          {content.cta} <IconArrowRight size={18} />
        </Link>
        <p className="mt-10 text-xs leading-relaxed text-fog">{content.disclaimer}</p>
      </div>
    </article>
  );
}
