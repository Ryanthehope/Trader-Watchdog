import { Link } from "react-router-dom";

export function Terms() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-20">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
        Trader Watchdog
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold text-white">
        Terms &amp; Conditions
      </h1>
      <p className="mt-4 text-sm text-slate-500">Effective Date: 12 June 2026</p>

      <div className="prose prose-invert mt-10 max-w-none space-y-8 text-sm leading-relaxed text-slate-400">
        <p>
          These Terms &amp; Conditions govern the use of the Trader Watchdog verification
          service and public portal. By submitting an application or using the
          platform, you agree to these terms.
        </p>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            1. About Trader Watchdog
          </h2>
          <p className="mt-2">
            Trader Watchdog is a verification and public visibility platform for
            UK traders. We verify identity, address, insurance and legally
            required licences, and provide a simple Green Flag/Red Flag status
            for householders.
          </p>
          <p className="mt-2">
            Trader Watchdog Ltd is registered in England &amp; Wales. Website:
            www.traderwatchdog.co.uk.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            2. Application and Verification Process
          </h2>
          <ul className="mt-3 list-inside list-disc space-y-2">
            <li>
              Traders submit an application by providing accurate identity,
              address, insurance and licence information.
            </li>
            <li>
              Card details are collected at the point of application, but no
              payment is taken until the application has been reviewed and
              approved.
            </li>
            <li>Verification checks are completed before approval.</li>
            <li>
              If approved, the trader is granted a Green Flag status and their
              public portal listing is activated.
            </li>
            <li>
              If not approved, no payment is taken and stored card details are
              removed from the system.
            </li>
            <li>
              Trader Watchdog may request additional documentation if required
              to complete verification.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            3. Fees and Payment
          </h2>
          <p className="mt-2">Two fees are payable only upon approval:</p>
          <ul className="mt-3 list-inside list-disc space-y-2">
            <li>
              Registration Fee – £15. Covers the cost of identity, address,
              insurance and licence verification.
            </li>
            <li>
              Annual Portal Fee – £75. Provides 12 months of public visibility
              on the Trader Watchdog portal.
            </li>
            <li>Payments are processed securely via Stripe.</li>
            <li>Prices exclude VAT unless otherwise stated.</li>
            <li>If an application is not approved, no fees are charged.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            4. Portal Listing and Renewal
          </h2>
          <ul className="mt-3 list-inside list-disc space-y-2">
            <li>
              The Annual Portal Fee provides 12 months of public listing and
              Green Flag status.
            </li>
            <li>
              The Annual Portal Fee renews automatically 12 months from the
              approval date.
            </li>
            <li>Renewal reminders are sent in advance of any renewal payment.</li>
            <li>
              Traders may cancel at any time before the renewal date to prevent
              renewal charges.
            </li>
            <li>
              Renewal payments are non-refundable once processed, except where
              required by law.
            </li>
            <li>
              If a trader cancels, their portal listing will be removed at the
              end of the current 12-month period.
            </li>
            <li>
              Traders must stop using the Green Flag badge once their portal
              period ends.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            5. Refunds and Cancellations
          </h2>
          <p className="mt-2">
            Refunds are only relevant after approval, as no payment is taken
            before approval.
          </p>
          <p className="mt-2">A full refund may be issued if:</p>
          <ul className="mt-3 list-inside list-disc space-y-2">
            <li>A payment was taken in error.</li>
            <li>A duplicate payment occurred.</li>
            <li>A technical issue prevented portal activation after approval.</li>
            <li>
              Trader Watchdog is unable to activate the trader&apos;s portal
              listing after approval.
            </li>
          </ul>
          <p className="mt-4">Refunds are not provided when:</p>
          <ul className="mt-3 list-inside list-disc space-y-2">
            <li>
              Verification has been completed and the trader has been approved.
            </li>
            <li>
              The trader has received their Green Flag status and portal listing.
            </li>
            <li>The trader cancels during the 12-month portal period.</li>
            <li>
              The trader is removed for breaching these Terms &amp; Conditions or
              providing false information.
            </li>
          </ul>
          <p className="mt-4">
            Refunds are processed back to the original payment method via Stripe.
            Refund processing typically takes 5–10 working days.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            6. Trader Responsibilities
          </h2>
          <ul className="mt-3 list-inside list-disc space-y-2">
            <li>
              Traders must provide accurate and truthful information during the
              application process.
            </li>
            <li>
              Traders must maintain valid insurance and any legally required
              licences throughout their portal period.
            </li>
            <li>
              Traders must notify Trader Watchdog immediately of any changes to
              their insurance, address, or licensing status.
            </li>
            <li>
              Traders must not misuse the Green Flag badge or misrepresent their
              verification status.
            </li>
            <li>
              Misrepresentation may result in removal from the portal without
              refund.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            7. Use of the Green Flag Badge
          </h2>
          <ul className="mt-3 list-inside list-disc space-y-2">
            <li>
              The Green Flag badge may only be used by approved traders with an
              active portal listing.
            </li>
            <li>
              The badge may be used on websites, vans, uniforms, business cards
              and marketing materials while active.
            </li>
            <li>Use of the badge must cease immediately if:</li>
          </ul>
          <ul className="mt-3 list-inside list-disc space-y-2">
            <li>The trader cancels.</li>
            <li>The portal period expires.</li>
            <li>The trader is removed for breach of terms.</li>
            <li>Verification status changes.</li>
          </ul>
          <p className="mt-4">
            Continued use of the badge after removal may result in legal action.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            8. Platform Accuracy and Limitations
          </h2>
          <ul className="mt-3 list-inside list-disc space-y-2">
            <li>Trader Watchdog verifies information at the point of approval.</li>
            <li>
              Ongoing insurance or licence validity is the responsibility of the
              trader.
            </li>
            <li>
              Trader Watchdog is not liable for losses arising from a trader&apos;s
              actions, omissions, or conduct.
            </li>
            <li>
              The platform provides verification status only; it does not
              guarantee workmanship or outcomes.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            9. Removal from the Platform
          </h2>
          <p className="mt-2">A trader may be removed without refund if:</p>
          <ul className="mt-3 list-inside list-disc space-y-2">
            <li>False or misleading information was provided.</li>
            <li>Insurance or licences lapse.</li>
            <li>Complaints indicate serious misconduct.</li>
            <li>The trader breaches these Terms &amp; Conditions.</li>
            <li>The trader misuses the Green Flag badge.</li>
          </ul>
          <p className="mt-4">
            Trader Watchdog reserves the right to remove traders at its
            discretion to protect householders.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            10. Data Protection
          </h2>
          <ul className="mt-3 list-inside list-disc space-y-2">
            <li>
              Trader Watchdog processes personal data in accordance with UK
              GDPR.
            </li>
            <li>
              Verification documents are stored securely and used only for
              verification purposes.
            </li>
            <li>Full details are available in our Privacy Policy.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            11. Changes to These Terms
          </h2>
          <p className="mt-2">
            Trader Watchdog may update these Terms &amp; Conditions from time to
            time. Traders will be notified of material changes.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            12. Contact Information
          </h2>
          <p className="mt-2">
            For questions relating to applications, payments, cancellations or
            refunds, email Trader Watchdog Support at{" "}
            <a
              href="mailto:support@traderwatchdog.co.uk"
              className="text-brand-400 hover:text-brand-300"
            >
              support@traderwatchdog.co.uk
            </a>
            .
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
