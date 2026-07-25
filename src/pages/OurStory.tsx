import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useSiteData } from "../context/SiteDataContext";

const articleParagraphs = [
  "Trader Watchdog was not created in a boardroom. It was not dreamed up by a marketing team.",
  "It began with something far more ordinary, and far more painful. It began when I trusted the wrong trader.",
  "After a lifetime of running businesses, solving problems, and building things from scratch, I did not expect to be caught out. But I was. When I looked deeper, I discovered stories from other people who had been misled in exactly the same way. I realised I was not the first, and I would not be the last.",
  "I felt frustrated, misled, and determined not to let it go. So I took the trader to court. No solicitor. No legal training. Just a belief that what happened was wrong.",
  "It took eighteen months of hearings, paperwork, delays and personal expense, but I won. In that long, exhausting process, I learned something important.",
  "Homeowners are told to check reviews before hiring, but reviews and recommendations alone are not enough. They do not tell you if a trader is insured. They do not confirm identity. They do not show whether a trader is legally allowed to do the work. They do not protect you from someone who knows how to look legitimate online.",
  "I found websites that claimed to verify traders, but most were really job marketing platforms. The few that offered genuine verification had fees set so high they were only realistic for larger companies.",
  "That left Britain's army of self-employed workers and small businesses, the people who maintain and improve our homes every day, without any independent way to show their professionalism and legitimacy. Yet these are the very traders most at risk of being unfairly labelled rogue simply because they do not have access to the same tools or visibility as big firms.",
  "There was no simple, trustworthy way to check the facts. So I decided to build one.",
  "The result was Trader Watchdog, the platform I wish had existed before I opened my door to the wrong person. It could have saved me a lot of time, trouble and expense.",
  "But the benefit was not just for the householder. It gave honest, local traders a way to stand out from those who cut corners, at a fair, affordable price. Rogue traders can buy reviews and recommendations online. But they cannot get verified.",
  "Trader Watchdog was not created because of a business opportunity. It was created because of a personal experience, one that thousands of people go through every year.",
  "I know what it feels like to be let down. I know how stressful disputes can be. And I know how important it is to protect your home.",
  "Trader Watchdog exists so you do not have to go through the same thing.",
  "I launched Trader Watchdog here in Oxfordshire, and now it is expanding nationwide, helping protect more households and supporting genuine traders everywhere.",
  "If Trader Watchdog prevents even one person from going through what I did, it will have been worth every hour spent building it. But I believe it will do far more than that.",
  "It will help restore trust. It will help protect families. And it will help honest traders shine.",
  "That is why I built Trader Watchdog. And that is why I am proud to share it with you.",
];

const founderBrief = [
  "Research a trader's identity, insurance and legitimacy before even speaking to them.",
  "Provide clear, factual information instead of confusing reviews.",
  "Offer free, anonymous access for householders.",
  "Keep everything in one place and easy to use.",
];

function usePageMeta(title: string, description: string) {
  useEffect(() => {
    const previousTitle = document.title;
    const descriptionTag = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = descriptionTag?.getAttribute("content") ?? null;

    document.title = title;
    if (descriptionTag) {
      descriptionTag.setAttribute("content", description);
    }

    return () => {
      document.title = previousTitle;

      if (descriptionTag) {
        if (previousDescription === null) {
          descriptionTag.removeAttribute("content");
        } else {
          descriptionTag.setAttribute("content", previousDescription);
        }
      }
    };
  }, [description, title]);
}

function StoryHeader({ brandName }: { brandName: string }) {
  return (
    <section className="border-y border-brand-800/70 bg-brand-700 px-4 py-10 text-white sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-100">
          {brandName}
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Our Story
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-100 sm:text-lg">
          The founder's story behind Trader Watchdog and the experience that led to the platform.
        </p>
      </div>
    </section>
  );
}

function FounderBriefCard() {
  return (
    <div className="rounded-[1.75rem] border border-brand-100 bg-brand-50 px-6 py-6">
      <h3 className="font-display text-2xl font-bold text-brand-800">
        The brief was simple
      </h3>
      <ul className="mt-4 space-y-3 text-base leading-relaxed text-brand-900">
        {founderBrief.map((item) => (
          <li key={item} className="flex gap-3">
            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-600" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FounderSignature() {
  return (
    <div className="border-t border-slate-200 pt-6">
      <p className="font-display text-2xl font-bold text-slate-900">
        Nigel Broderick
      </p>
      <p className="mt-1 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
        Founder, Trader Watchdog Ltd
      </p>
    </div>
  );
}

function StorySidebar() {
  return (
    <aside className="space-y-6" aria-label="Founder story highlights">
      <figure className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)]">
        <div className="aspect-[4/5] w-full overflow-hidden">
          <img
            src="/nigel1.png"
            alt="Nigel Broderick"
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </div>
        <figcaption className="sr-only">
          Nigel Broderick, founder of Trader Watchdog.
        </figcaption>
      </figure>

      <section className="rounded-[1.75rem] border border-slate-200 bg-[#F7F9FC] p-6 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
          Why it matters
        </p>
        <p className="mt-4 font-display text-2xl font-bold leading-tight text-slate-900">
          Honest traders can buy visibility, but they cannot buy verification.
        </p>
        <p className="mt-4 text-base leading-relaxed text-slate-700">
          The platform exists to give householders clearer facts and to give genuine small traders a fairer way to stand out.
        </p>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
          Explore more
        </p>
        <div className="mt-4 flex flex-col gap-3">
          <Link
            to="/news-and-views"
            className="inline-flex min-h-[3rem] items-center justify-center rounded-full bg-brand-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
          >
            Visit News and Views
          </Link>
          <Link
            to="/join"
            className="inline-flex min-h-[3rem] items-center justify-center rounded-full border border-slate-300 px-5 text-sm font-semibold text-slate-900 transition-colors hover:border-slate-400 hover:bg-slate-50"
          >
            Join Trader Watchdog
          </Link>
        </div>
      </section>
    </aside>
  );
}

export function OurStory() {
  const { brandName } = useSiteData();
  const description =
    "Read the founder's story behind Trader Watchdog and why the platform was built to give householders clearer facts and honest traders a fairer way to stand out.";

  usePageMeta(`Our Story | ${brandName}`, description);

  return (
    <main className="small-print-on-light bg-white text-slate-900">
      <StoryHeader brandName={brandName} />

      <section className="px-4 py-12 sm:px-6 sm:py-16" aria-labelledby="our-story-article-title">
        <div className="mx-auto max-w-6xl">
          <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_60px_-40px_rgba(15,23,42,0.28)]">
            <div className="bg-[#F7F9FC] px-6 py-8 sm:px-8 sm:py-10">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-700">
                Founder story
              </p>
              <h2 id="our-story-article-title" className="mt-3 max-w-4xl font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                A Personal Story From Our Founder
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-700 sm:text-lg">
                The experience that led to Trader Watchdog and the reasoning behind the platform.
              </p>
            </div>

            <div className="grid gap-10 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
              <div className="space-y-5 text-base leading-relaxed text-slate-700 sm:text-lg">
                {articleParagraphs.slice(0, 9).map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}

                <FounderBriefCard />

                {articleParagraphs.slice(9).map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}

                <FounderSignature />
              </div>

              <StorySidebar />
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}