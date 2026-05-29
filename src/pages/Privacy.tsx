import { Link } from "react-router-dom";

export function Privacy() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-20">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
        Trader Watchdog
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold text-white">
        Privacy Policy
      </h1>
      <p className="mt-4 text-sm text-slate-500">Effective: 1 June 2026</p>

      <div className="prose prose-invert mt-10 max-w-none space-y-8 text-sm leading-relaxed text-slate-400">

        <section>
          <h2 className="font-display text-lg font-semibold text-white">1. Introduction</h2>
          <p className="mt-2">
            Trader Watchdog Ltd ("we", "us", "our") is committed to protecting your personal data and
            respecting your privacy. This Privacy Policy explains how we collect, use, store, share,
            and protect your information when you use the Trader Watchdog website, services, and
            verification platform.
          </p>
          <p className="mt-2">
            We comply with the UK General Data Protection Regulation (UK GDPR) and the Data Protection
            Act 2018.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">2. Who We Are</h2>
          <p className="mt-2">
            Trader Watchdog Ltd — registered in England and Wales, Company No: 17173750.<br />
            Registered Office: 4th Floor, 205 Regent St, London, W1B 4HB, England.<br />
            Email:{" "}
            <a href="mailto:admin@traderwatchdog.co.uk" className="text-brand-300 hover:text-brand-200">
              admin@traderwatchdog.co.uk
            </a>
          </p>
          <p className="mt-2">
            We are the data controller for all personal data processed through our website and
            verification platform.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">3. Data We Collect</h2>

          <h3 className="mt-4 font-semibold text-slate-300">3.1 Information you provide directly</h3>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Name and contact details</li>
            <li>Business name and trading address</li>
            <li>Email address and phone number</li>
            <li>Verification documents (insurance certificates, licences, qualifications)</li>
            <li>Identity documents (for verification only; never published)</li>
            <li>Payment and subscription information</li>
            <li>Complaint or enquiry details</li>
          </ul>

          <h3 className="mt-4 font-semibold text-slate-300">3.2 Information collected automatically</h3>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>IP address</li>
            <li>Device and browser information</li>
            <li>Usage data and analytics</li>
            <li>
              Cookie data (see our{" "}
              <Link to="/cookies" className="text-brand-300 hover:text-brand-200">
                Cookie Policy
              </Link>
              )
            </li>
          </ul>

          <h3 className="mt-4 font-semibold text-slate-300">3.3 Information from third parties</h3>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Insurance providers (for validation)</li>
            <li>Licensing bodies</li>
            <li>Public registers</li>
            <li>Payment processors</li>
          </ul>

          <h3 className="mt-4 font-semibold text-slate-300">3.4 Information we do not collect</h3>
          <p className="mt-2">
            We do not collect, store, or process personal information from members of the public who
            use the Trader Watchdog website to view trader verification pages. Householders can search
            and view trader information anonymously without creating an account or providing any
            personal details.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">4. How We Use Your Information</h2>
          <p className="mt-2">We use personal data for the following purposes:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>To operate and manage the Trader Watchdog platform</li>
            <li>To verify trader identity, insurance, and legal compliance</li>
            <li>To manage trader subscriptions and accounts</li>
            <li>To respond to enquiries, complaints, and support requests</li>
            <li>To improve website performance and user experience</li>
            <li>To meet our legal and regulatory obligations</li>
          </ul>

          <h3 className="mt-4 font-semibold text-slate-300">4.1 Creation of a Public Verification Portal</h3>
          <p className="mt-2">
            When a trader is successfully verified, we use the information they provide (such as
            business name, trading address, insurance details, licences, memberships, and verification
            status) to create a publicly accessible verification portal. This portal allows householders
            to confirm that the trader is verified by Trader Watchdog Ltd.
          </p>
          <p className="mt-2">
            Only information relevant to verification is displayed publicly. We do not publish sensitive
            personal data, identity documents, or any information not required for public verification.
          </p>

          <h3 className="mt-4 font-semibold text-slate-300">4.2 QR Code Access</h3>
          <p className="mt-2">
            Verified traders are issued a unique QR code that links directly to their public
            verification portal. The QR code is not displayed on the portal, but may be used by the
            trader on vehicles, stationery, advertising, or other materials to allow the public to
            access their portal quickly.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">5. Public Information</h2>

          <h3 className="mt-4 font-semibold text-slate-300">5.1 What may be displayed publicly</h3>
          <p className="mt-2">
            We may display the following trader information on their public verification portal:
          </p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Business name</li>
            <li>Trading name</li>
            <li>Business address</li>
            <li>Verification status</li>
            <li>Insurance validity (pass/fail only)</li>
            <li>Licence, qualifications, or membership confirmations</li>
          </ul>

          <h3 className="mt-4 font-semibold text-slate-300">5.2 Personal Data Used as Business Information</h3>
          <p className="mt-2">
            We display the same business information that a trader uses on their invoices, business
            documents, and public-facing materials. If a trader chooses to operate under their personal
            name or uses their home address as their business address, this information will appear
            publicly on their verification portal. This is because it forms part of their official
            business identity and is required to confirm that the trader is genuine and contactable.
          </p>
          <p className="mt-2">
            Traders may provide alternative business contact details if they do not wish to use
            personal information for public display.
          </p>

          <h3 className="mt-4 font-semibold text-slate-300">5.3 What we never display</h3>
          <p className="mt-2">We do not display:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Identity documents</li>
            <li>Full insurance documents</li>
            <li>Personal home addresses (unless used as the business address by the trader)</li>
            <li>Personal phone numbers (unless used as the business phone number)</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">6. Legal Bases for Processing</h2>
          <p className="mt-2">We process personal data under the following lawful bases:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li><strong>Contract</strong> – to provide our services to traders and users</li>
            <li><strong>Legitimate interests</strong> – to operate a safe and trustworthy verification platform</li>
            <li><strong>Legal obligation</strong> – to comply with regulatory requirements</li>
            <li><strong>Consent</strong> – for cookies and optional communications</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">7. Sharing Your Information</h2>
          <p className="mt-2">We may share personal data with:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Identity and document verification partners</li>
            <li>Insurance validation partners</li>
            <li>Payment processors</li>
            <li>IT and hosting providers</li>
            <li>Councils or enforcement bodies (where legally required)</li>
          </ul>
          <p className="mt-2">We never sell personal data.</p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">8. Data Retention</h2>
          <p className="mt-2">
            We retain personal data in accordance with our Data Retention &amp; Deletion Policy,
            ensuring data is kept only as long as necessary for legal, operational, or verification
            purposes.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">9. Your Rights</h2>
          <p className="mt-2">Under UK GDPR, you have the right to:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion</li>
            <li>Restrict processing</li>
            <li>Object to processing</li>
            <li>Withdraw consent</li>
            <li>Request data portability</li>
            <li>Make a complaint to the ICO</li>
          </ul>
          <p className="mt-2">
            To exercise your rights, contact us at:{" "}
            <a href="mailto:admin@traderwatchdog.co.uk" className="text-brand-300 hover:text-brand-200">
              admin@traderwatchdog.co.uk
            </a>
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">10. Cookies</h2>
          <p className="mt-2">
            We use cookies to improve website performance, analyse usage, and support secure login.
            For full details, see our{" "}
            <Link to="/cookies" className="text-brand-300 hover:text-brand-200">
              Cookie Policy
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">11. Data Security</h2>
          <p className="mt-2">
            We use technical and organisational measures to protect your data, including encryption,
            secure servers, access controls, and regular security reviews. However, no online system
            is completely secure.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">12. International Transfers</h2>
          <p className="mt-2">
            If we transfer data outside the UK, we ensure appropriate safeguards are in place, such
            as adequacy regulations or standard contractual clauses.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">13. Complaints</h2>
          <p className="mt-2">
            If you have concerns about how we handle your data, contact us at{" "}
            <a href="mailto:admin@traderwatchdog.co.uk" className="text-brand-300 hover:text-brand-200">
              admin@traderwatchdog.co.uk
            </a>
            . You may also contact the{" "}
            <strong>Information Commissioner's Office (ICO)</strong>.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">14. Changes to This Policy</h2>
          <p className="mt-2">
            We may update this Privacy Policy from time to time. The latest version will always be
            available on our website.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">15. Contact Us</h2>
          <p className="mt-2">For questions about this Privacy Policy:</p>
          <p className="mt-2">
            Trader Watchdog Ltd<br />
            Registered Office: 4th Floor, 205 Regent St, London, W1B 4HB, England<br />
            Email:{" "}
            <a href="mailto:admin@traderwatchdog.co.uk" className="text-brand-300 hover:text-brand-200">
              admin@traderwatchdog.co.uk
            </a>
          </p>
        </section>

      </div>
    </main>
  );
}
