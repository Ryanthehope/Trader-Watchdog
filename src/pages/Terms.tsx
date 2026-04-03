import { Link } from "react-router-dom";

export function Terms() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-20">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
        TradeVerify
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold text-white">
        Terms of use
      </h1>
      <p className="mt-4 text-sm text-slate-500">Last updated: March 2026</p>

      <div className="prose prose-invert mt-10 max-w-none space-y-8 text-sm leading-relaxed text-slate-400">
        <p>
          These terms govern your access to and use of the TradeVerify website
          and related services. By using the site you agree to them. If you do
          not agree, please do not use the service.
        </p>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            The service
          </h2>
          <p className="mt-2">
            TradeVerify provides information about trades businesses that have
            gone through our verification process, tools for members (such as the
            member portal), and public profile pages. Verification reflects checks
            at a point in time and ongoing membership rules — it is not a
            guarantee of future conduct, workmanship quality, or that every risk
            is eliminated. You remain responsible for your own hiring decisions,
            contracts, and due diligence.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            Eligibility and accounts
          </h2>
          <p className="mt-2">
            You must provide accurate information when you register, apply, or
            submit forms. You are responsible for keeping login credentials
            confidential and for activity under your account. We may suspend or
            close accounts that breach these terms or put the service or others
            at risk.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            Acceptable use
          </h2>
          <p className="mt-2">You agree not to:</p>
          <ul className="mt-3 list-inside list-disc space-y-2">
            <li>
              Use the site unlawfully or in a way that infringes others&apos;
              rights.
            </li>
            <li>
              Attempt to gain unauthorised access to systems, data, or accounts.
            </li>
            <li>
              Scrape, harvest, or bulk-collect data from the service without our
              written permission, except as allowed by normal browsing.
            </li>
            <li>
              Submit false, misleading, or defamatory reviews or enquiries, or
              use listings to harass businesses or individuals.
            </li>
            <li>
              Upload malware or content that is illegal, hateful, or otherwise
              harmful.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            Listings, reviews, and content
          </h2>
          <p className="mt-2">
            Public profile content is provided by members and TradeVerify staff as
            applicable. Reviews may be moderated. We may remove or refuse content
            that breaches law, these terms, or our moderation standards. You grant
            us a licence to host, display, and process content you submit for the
            purpose of operating the service.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            Fees
          </h2>
          <p className="mt-2">
            Where membership or other fees apply, they are described at the point
            of purchase or in your member portal. Taxes may apply as required by
            law. Failure to pay may result in suspension of member features.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            Intellectual property
          </h2>
          <p className="mt-2">
            The TradeVerify name, branding, site design, and original content are
            protected by intellectual property laws. You may not copy or reuse
            them except as allowed by law or with our permission. Member-provided
            logos and text remain yours, subject to the licence above.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            Disclaimer and limitation of liability
          </h2>
          <p className="mt-2">
            The service is provided &quot;as is&quot; to the fullest extent
            permitted by law. We do not warrant that the site will be uninterrupted
            or error-free. To the extent permitted by applicable law, TradeVerify
            and its operators exclude liability for indirect or consequential
            losses, loss of profit, or loss of data arising from your use of the
            site or reliance on information on it. Nothing in these terms excludes
            or limits liability that cannot legally be excluded (including death
            or personal injury caused by negligence, fraud, or other liabilities
            that cannot be limited under English law). Our total liability for
            claims arising from the service in any twelve-month period may be
            limited to the amount you paid us in fees in that period, where such a
            cap is permitted.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            Third parties
          </h2>
          <p className="mt-2">
            The site may link to third-party websites or services. We are not
            responsible for their content or practices. Contracts you enter with
            trades are between you and them; TradeVerify is not a party to those
            contracts unless we expressly say otherwise in writing.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            Suspension and termination
          </h2>
          <p className="mt-2">
            We may suspend or terminate access to the service where we reasonably
            need to — for example for breach of terms, legal requirements, or
            security. You may stop using the site at any time; provisions that
            reasonably should survive (such as liability limits and governing
            law) will continue to apply.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            Changes
          </h2>
          <p className="mt-2">
            We may update these terms. We will indicate the date of the latest
            version. Continued use after changes constitutes acceptance of the
            updated terms where the law allows. If changes are material, we may
            provide additional notice where appropriate.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            Governing law
          </h2>
          <p className="mt-2">
            These terms are governed by the laws of England and Wales. The courts
            of England and Wales have exclusive jurisdiction, except where you
            are a consumer resident in another part of the UK and mandatory
            consumer protections give you the right to bring proceedings in your
            local courts.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            Contact
          </h2>
          <p className="mt-2">
            Questions about these terms? Use our{" "}
            <Link to="/contact" className="text-brand-400 hover:text-brand-300">
              Contact
            </Link>{" "}
            page.
          </p>
        </section>
      </div>

      <Link
        to="/"
        className="mt-12 inline-block text-sm font-medium text-brand-400 hover:text-brand-300"
      >
        ← Back to home
      </Link>
    </main>
  );
}
