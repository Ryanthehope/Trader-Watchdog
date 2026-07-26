import { Link } from "react-router-dom";
import { useSiteData } from "../context/SiteDataContext";

const domesticWasteExclusions = [
  "DIY and construction materials such as rubble, bricks, tiles and plasterboard",
  "Hazardous waste such as chemicals, asbestos, solvents and paint",
  "Batteries and electrical items where special arrangements are required",
  "Business or commercial waste, which is never covered by household services",
];

const recyclingCentreItems = [
  "General household waste",
  "Cardboard and packaging",
  "Garden waste",
  "Small electrical items",
  "Metal, wood and plastics",
  "Old furniture",
  "Mattresses in most areas",
  "White goods such as fridges, freezers and washing machines",
];

const lowerTierItems = [
  "Suitable for many small traders",
  "Covers non-hazardous waste",
  "Free of charge",
  "Quick and simple to obtain",
];

const upperTierItems = [
  "Required for businesses dealing with construction waste, demolition waste or hazardous materials",
  "Involves stricter requirements",
  "Paid licence",
  "Designed for higher-risk waste streams",
];

const householderRiskItems = [
  "You can be fined",
  "Your community suffers the environmental impact",
  "Councils and farmers bear the cost",
  "The trader disappears, leaving you to deal with the consequences",
];

const verificationNeedItems = [
  "Licensed",
  "Insured",
  "Legitimate",
  "Compliant with waste regulations",
];

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3 text-base leading-relaxed text-slate-700 sm:text-lg">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-600" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function NewsAndViews() {
  const { brandName } = useSiteData();

  return (
    <main className="small-print-on-light bg-white text-slate-900">
      <section className="border-y border-brand-800/70 bg-brand-700 px-4 py-10 text-white sm:px-6 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-100">
            {brandName}
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            News and Views
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-100 sm:text-lg">
            A space for updates, commentary and future articles from Trader Watchdog.
          </p>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_60px_-40px_rgba(15,23,42,0.28)]">
            <div className="bg-[#F7F9FC] px-6 py-8 sm:px-8 sm:py-10">
              <h2 className="mt-3 max-w-5xl font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                FlyTipping: The Growing Environmental Problem Behind Unlicensed Waste Removal
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-700 sm:text-lg">
                Why fly-tipping is a growing environmental and financial problem, and why checking waste-carrier compliance matters before hiring a trader.
              </p>
            </div>

            <div className="grid gap-10 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
              <div className="space-y-8 text-base leading-relaxed text-slate-700 sm:text-lg">
                <div className="space-y-5">
                  <p>
                    Fly-tipping is fast becoming an environmental nightmare. Waste is being dumped in the countryside, on farmland and across urban areas. It is unsightly, polluting and expensive to clear, and the cost is rising every year.
                  </p>
                  <p>
                    Councils in England now spend tens of millions of pounds annually dealing with fly-tipping. Farmers face an estimated £50-£100 million a year in cleanup costs, lost land use and damage to property.
                  </p>
                  <p>
                    Those are the direct costs: the invoices, the labour, the machinery and the repairs. But the indirect costs affect everyone through higher council taxes, higher food prices and higher costs passed through local services. When waste is dumped illegally, the financial burden does not disappear. It simply moves to the people who live and work in the community.
                  </p>
                </div>

                <section className="space-y-5">
                  <h3 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
                    What Household Waste Services Actually Cover
                  </h3>
                  <p>
                    Domestic waste collection is a service provided by local councils. Most everyday household waste is included, but there are important exceptions:
                  </p>
                  <BulletList items={domesticWasteExclusions} />
                  <p>
                    Recycling centres allow householders to dispose of many items free of charge, including:
                  </p>
                  <BulletList items={recyclingCentreItems} />
                  <p>
                    These facilities exist to keep waste out of the environment. But they rely on one thing: people actually using them.
                  </p>
                </section>

                <section className="space-y-5">
                  <h3 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
                    Where the Problem Begins
                  </h3>
                  <p>
                    Some people can transport waste from their home, such as old kitchens, mattresses, fridges or garden clearances, but are not prepared to pay disposal fees for items that fall outside normal household waste rules.
                  </p>
                  <p>
                    Instead of doing the right thing, they look for the cheapest option. And that is where unlicensed waste carriers step in.
                  </p>
                  <p>
                    These are not cheap alternatives. They are antisocial criminal acts waiting to happen. When waste is dumped illegally, the householder who paid for its removal can still be held responsible. And the cost of clearing it falls on councils, farmers and communities, costs that eventually return to householders through taxes and food prices.
                  </p>
                </section>

                <section className="space-y-5">
                  <h3 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
                    Commercial Waste: The Law Is Clear
                  </h3>
                  <p>
                    Any waste removed from a property by a business, whether a one-person operation or a large company, must be licensed by the Environment Agency.
                  </p>
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-[1.5rem] border border-slate-200 bg-[#F7F9FC] p-6">
                      <h4 className="font-display text-xl font-bold text-slate-900">
                        Lower Tier Licence
                      </h4>
                      <div className="mt-4">
                        <BulletList items={lowerTierItems} />
                      </div>
                    </div>
                    <div className="rounded-[1.5rem] border border-slate-200 bg-[#F7F9FC] p-6">
                      <h4 className="font-display text-xl font-bold text-slate-900">
                        Upper Tier Licence
                      </h4>
                      <div className="mt-4">
                        <BulletList items={upperTierItems} />
                      </div>
                    </div>
                  </div>
                  <p>
                    Most domestic-market traders only need a Lower Tier Licence, and there is no reason not to have one. It is free, easy to apply for and legally required.
                  </p>
                  <p>
                    Yet thousands of traders operate without it, and householders rarely know to check.
                  </p>
                </section>

                <section className="space-y-5">
                  <h3 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
                    What Trader Watchdog Can Check, and What It Cannot
                  </h3>
                  <p>
                    Most traders who remove waste do need a licence, and when they apply to Trader Watchdog we ask them directly. If a trader confirms they require a licence, we check it with the Environment Agency. If they state they do not carry waste, for example a computer repairer or a tradesperson whose work does not involve waste removal, we record that declaration on their profile.
                  </p>
                  <div className="rounded-[1.75rem] border border-brand-100 bg-brand-50 px-6 py-6">
                    <p className="font-display text-2xl font-bold text-brand-800">
                      Cost-effective verification with clear limits
                    </p>
                    <p className="mt-4 text-base leading-relaxed text-brand-900 sm:text-lg">
                      Trader Watchdog is designed to give traders a cost-effective verification platform. It does not allow us to stand over every job or see where every load of waste goes, but it does allow us to verify licences where required and record exactly what a trader has declared about their waste-carrying responsibilities.
                    </p>
                  </div>
                  <p>
                    This means householders have clear, factual information before hiring: whether the trader carries waste, and whether the correct licence has been checked if they do.
                  </p>
                </section>

                <section className="space-y-5">
                  <h3 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
                    Why This Matters to Householders
                  </h3>
                  <p>
                    When you hire someone to remove waste, you are trusting them with more than a job. You are trusting them with your legal responsibility.
                  </p>
                  <p>If they dump your waste illegally:</p>
                  <BulletList items={householderRiskItems} />
                  <p>
                    And if you ask whether they are licensed, what are they going to say? They are not going to admit they are unlicensed. Did you ask to see the document? Probably not, because it feels awkward.
                  </p>
                  <p>This is the gap that rogue traders exploit.</p>
                </section>

                <section className="space-y-5">
                  <h3 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
                    The Bottom Line
                  </h3>
                  <p>
                    Fly-tipping is not just an environmental issue. It is a verification issue.
                  </p>
                  <p>Householders need a simple way to check whether a trader is:</p>
                  <BulletList items={verificationNeedItems} />
                  <p>
                    Reviews will not tell you that. Recommendations will not tell you that. Only independent verification can.
                  </p>
                  <p>
                    That is why Trader Watchdog exists: to give householders factual reassurance and to help genuine traders stand out from those who cut corners.
                  </p>
                </section>
              </div>

              <aside className="space-y-6">
                <div className="rounded-[1.75rem] border border-slate-200 bg-[#F7F9FC] p-6 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                    Key point
                  </p>
                  <p className="mt-4 font-display text-2xl font-bold leading-tight text-slate-900">
                    Fly-tipping is not just a waste problem. It is a trust and compliance problem.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    The cheapest quote for waste removal can become the most expensive choice once the legal and environmental costs land elsewhere.
                  </p>
                </div>

                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                    Related pages
                  </p>
                  <div className="mt-4 flex flex-col gap-3">
                    <Link
                      to="/our-story"
                      className="inline-flex min-h-[3rem] items-center justify-center rounded-full bg-brand-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
                    >
                      Visit Our Story
                    </Link>
                    <Link
                      to="/join"
                      className="inline-flex min-h-[3rem] items-center justify-center rounded-full border border-slate-300 px-5 text-sm font-semibold text-slate-900 transition-colors hover:border-slate-400 hover:bg-slate-50"
                    >
                      Join Trader Watchdog
                    </Link>
                  </div>
                </div>
              </aside>
            </div>
          </article>

          <article className="mt-10 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_60px_-40px_rgba(15,23,42,0.28)]">
            <div className="bg-[#F7F9FC] px-6 py-8 sm:px-8 sm:py-10">
              <h2 className="mt-3 max-w-5xl font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Why Reviews and Recommendations No Longer Tell the Whole Story
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-700 sm:text-lg">
                Why reviews and word-of-mouth still matter, but no longer provide enough factual reassurance on their own.
              </p>
            </div>

            <div className="grid gap-10 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
              <div className="space-y-8 text-base leading-relaxed text-slate-700 sm:text-lg">
                <div className="space-y-5">
                  <p>
                    For hundreds of years, recommendations were offered with genuine intent, one person helping another make a decision or find a reliable way to get a job done. They were personal, honest and built on trust.
                  </p>
                  <p>But things have changed.</p>
                  <p>
                    The internet has replaced word-of-mouth recommendations with reviews, and a whole new industry has emerged to provide them. Specialist companies now run review platforms funded by the businesses that want reviews. Search online for buy reviews and you will find countless services offering to create fictitious praise for products or companies.
                  </p>
                  <p>
                    The rise of AI has compounded the problem. Fake reviews can now be written and published faster than authorities can detect them, and some estimates suggest AI-generated reviews are growing by 30% every month.
                  </p>
                  <p>
                    It is becoming common to receive a request for a review immediately after placing an online order, long before the product even arrives. That alone raises the question of how genuine the feedback can really be.
                  </p>
                </div>

                <section className="space-y-5">
                  <h3 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
                    Products vs. Services: A Crucial Difference
                  </h3>
                  <p>
                    Reviewing a product is very different from reviewing a service. Products are physical. They have a function, packaging and instructions. You can usually measure whether they work or not.
                  </p>
                  <p>
                    Services are personal. They rely on skill, care and judgement, and that is what traders supply to homes and gardens. What one person calls a great job might be dismissed by another as unacceptable. Much of it comes down to opinion.
                  </p>
                </section>

                <section className="space-y-5">
                  <h3 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
                    The Hidden Gaps in Recommendations
                  </h3>
                  <p>
                    When someone recommends a painter, window cleaner or any other trader, they are usually basing it on their own experience. They might say the trader arrived on time, cleaned up, was polite and offered a good price.
                  </p>
                  <p>
                    But ask whether they checked the trader's insurance, licences or qualifications, and the answer is usually no. Fortunately, nothing went wrong that time.
                  </p>
                  <p>
                    Now imagine an accident occurs. It was not intentional, but it happened. That is when you discover the trader is not insured or licensed for the work being carried out. That is when everything changes.
                  </p>
                </section>

                <section className="space-y-5">
                  <h3 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
                    The Illusion of Assurance
                  </h3>
                  <p>
                    If you ask a trader whether they are insured, are they going to say no? Of course not. Did you ask to see the document? Probably not, because it feels awkward, as if you do not trust them.
                  </p>
                  <p>And that is the problem.</p>
                  <p>
                    Anyone can write a review or recommendation online. Anyone can say they are insured and compliant. But without independent verification, there is no way to be sure.
                  </p>
                </section>

                <section className="space-y-5">
                  <h3 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
                    The Bottom Line
                  </h3>
                  <p>
                    Genuine reviews and recommendations still have their place. They tell stories, share experiences and highlight good service. But they do not confirm the facts that matter most.
                  </p>
                  <p>
                    That is why Trader Watchdog exists: to provide factual, independent verification that goes beyond opinions and gives householders genuine reassurance.
                  </p>
                  <p>
                    Whether the introduction has come from a friend, an advert or an online job platform, it is the check-before-you-commit diligence recommended by the police, trading standards, councils and community groups. It is the final safety net, and it is free to use.
                  </p>
                </section>
              </div>

              <aside className="space-y-6">
                <div className="rounded-[1.75rem] border border-slate-200 bg-[#F7F9FC] p-6 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                    Key point
                  </p>
                  <p className="mt-4 font-display text-2xl font-bold leading-tight text-slate-900">
                    Reviews can describe an experience, but they cannot independently verify the facts behind it.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-slate-700">
                    The missing checks are usually the ones that only matter after something goes wrong: insurance, licences, legitimacy and compliance.
                  </p>
                </div>

                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                    Related pages
                  </p>
                  <div className="mt-4 flex flex-col gap-3">
                    <Link
                      to="/our-story"
                      className="inline-flex min-h-[3rem] items-center justify-center rounded-full bg-brand-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
                    >
                      Visit Our Story
                    </Link>
                    <Link
                      to="/join"
                      className="inline-flex min-h-[3rem] items-center justify-center rounded-full border border-slate-300 px-5 text-sm font-semibold text-slate-900 transition-colors hover:border-slate-400 hover:bg-slate-50"
                    >
                      Join Trader Watchdog
                    </Link>
                  </div>
                </div>
              </aside>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}