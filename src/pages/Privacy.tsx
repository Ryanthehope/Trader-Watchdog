import { Link } from "react-router-dom";

export function Privacy() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-20">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
        Trader Watchdog
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold text-white">
        Privacy policy
      </h1>
      <p className="mt-4 text-sm text-slate-500">Last updated: March 2026</p>

      <div className="prose prose-invert mt-10 max-w-none space-y-8 text-sm leading-relaxed text-slate-400">
        <p>
          This policy explains how Trader Watchdog collects, uses, stores, and
          protects personal information when you use our website, apply to
          become a verified member, use the member portal, or interact with
          verified business profiles. We process personal data in line with UK
          data protection law (including the UK GDPR and the Data Protection Act
          2018).
        </p>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            Who we are
          </h2>
          <p className="mt-2">
            Trader Watchdog operates the verification and directory service
            available at this website. For data protection purposes, we act as
            the controller of personal data described in this policy (except
            where trades process homeowner data themselves — for example when
            you contact a member directly).
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            What we collect
          </h2>
          <p className="mt-2">
            Depending on how you use the service, we may process:
          </p>
          <ul className="mt-3 list-inside list-disc space-y-2 text-slate-400">
            <li>
              <strong className="text-slate-300">Identity and contact details</strong>{" "}
              — for example name, email address, telephone number, and postcode
              when you submit an application, contact a
              verified member through our site, sign in to an account, or
              contact us.
            </li>
            <li>
              <strong className="text-slate-300">Application and verification data</strong>{" "}
              — information and documents you provide so we can carry out checks
              and maintain an accurate listing (for example trade category,
              insurance references, company details, and uploaded files where
              applicable).
            </li>
            <li>
              <strong className="text-slate-300">Account and membership data</strong>{" "}
              — portal login identifiers, subscription or billing references where
              you pay online, and records of membership status.
            </li>
            <li>
              <strong className="text-slate-300">Usage and technical data</strong>{" "}
              — such as IP address, browser type, approximate location derived
              from IP, and security logs where needed to protect the service.
            </li>
            <li>
              <strong className="text-slate-300">Communications</strong> — content
              of messages you send us, and (where enabled) spam-prevention data
              such as reCAPTCHA results.
            </li>
            <li>
              <strong className="text-slate-300">Reviews and enquiries</strong>{" "}
              — text you submit as a homeowner review, or messages routed
              through profile contact forms, including the details needed to
              display or deliver them.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            How we use your information
          </h2>
          <p className="mt-2">We use personal data to:</p>
          <ul className="mt-3 list-inside list-disc space-y-2">
            <li>Provide the directory, verification, and member portal features.</li>
            <li>
              Process applications, carry out checks, and publish or update
              verified listings as described on the site.
            </li>
            <li>
              Communicate with you about your account, membership, or support
              requests.
            </li>
            <li>
              Process payments where you subscribe or pay fees through our
              payment providers.
            </li>
            <li>
              Operate security, prevent abuse, enforce our terms, and meet legal
              obligations.
            </li>
            <li>
              Improve the service and understand aggregate usage (we do not sell
              your personal data as a product).
            </li>
          </ul>
          <p className="mt-3">
            Where UK GDPR applies, we rely on appropriate lawful bases — for
            example performance of a contract, legitimate interests (such as
            running a secure platform and improving the service), compliance
            with legal obligations, or consent where we ask for it clearly
            (such as non-essential cookies).
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            Sharing and processors
          </h2>
          <p className="mt-2">
            We may share data with trusted service providers who help us host the
            site, send email, take payments, prevent fraud, or analyse errors —
            only on our instructions and under appropriate contracts. We may
            disclose information if required by law or to protect rights and
            safety. Verified member profiles are published as you would expect in
            a directory; do not post sensitive information you do not want shown.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            International transfers
          </h2>
          <p className="mt-2">
            Where any provider processes data outside the UK, we ensure
            appropriate safeguards (such as UK adequacy regulations or standard
            contractual clauses) are in place where required.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            How long we keep data
          </h2>
          <p className="mt-2">
            We retain personal data only as long as necessary for the purposes
            above — for example for the life of an active listing and a reasonable
            period afterwards for legal, accounting, or dispute resolution
            purposes. Review moderation records and security logs may be kept for
            shorter or longer periods depending on the context.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            Security
          </h2>
          <p className="mt-2">
            We use appropriate technical and organisational measures to protect
            personal data. No online service can be guaranteed 100% secure; if
            you have reason to believe there has been unauthorised access,
            please tell us promptly.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            Your rights
          </h2>
          <p className="mt-2">
            Under UK data protection law you may have the right to request access
            to your personal data, correction of inaccuracies, erasure in certain
            cases, restriction of processing, objection to processing based on
            legitimate interests, and data portability where applicable. You may
            also lodge a complaint with the Information Commissioner&apos;s
            Office (ICO). To exercise your rights or ask questions, contact us via
            the{" "}
            <Link to="/contact" className="text-brand-400 hover:text-brand-300">
              Contact
            </Link>{" "}
            page.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            Cookies
          </h2>
          <p className="mt-2">
            We use cookies and similar technologies as needed for the site to
            function, for security, and (where we offer them) for analytics or
            preferences. You can control cookies through your browser settings;
            disabling some cookies may limit features.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            Changes
          </h2>
          <p className="mt-2">
            We may update this policy from time to time. The &quot;Last
            updated&quot; date at the top will change when we do; continued use
            of the site after changes means you accept the updated policy where
            the law allows.
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
