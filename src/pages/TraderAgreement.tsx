export function TraderAgreement() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-20">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
        Trader Watchdog
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold text-white">
        Trader Agreement
      </h1>
      <p className="mt-4 text-sm text-slate-500">Effective Date: 12 June 2026</p>

      <div className="prose prose-invert mt-10 max-w-none space-y-8 text-sm leading-relaxed text-slate-400">
        <p>
          This Trader Agreement sets out the terms you agree to when applying
          for verification and a public listing on the Trader Watchdog portal.
          By submitting an application, you confirm that you understand and
          accept the terms below.
        </p>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">1. Application and Verification</h2>
          <ul className="mt-3 list-inside list-disc space-y-2">
            <li>
              You must provide accurate and truthful information during your
              application, including identity, address, insurance and any
              legally required licences.
            </li>
            <li>
              Card details are collected at the point of application, but no
              payment is taken until your application has been reviewed and
              approved.
            </li>
            <li>Verification checks are completed before approval.</li>
            <li>
              If approved, you will receive a Green Flag status and your public
              portal listing will be activated.
            </li>
            <li>
              If your application is not approved, no payment is taken and your
              stored card details will be removed from the system.
            </li>
            <li>
              Trader Watchdog may request additional documentation if required
              to complete verification.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">2. Fees Payable on Approval</h2>
          <p className="mt-2">Two fees are charged only if your application is approved:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>
              Registration Fee – £15. Covers the cost of identity, address,
              insurance and licence verification.
            </li>
            <li>
              Annual Portal Fee – £75. Provides 12 months of public visibility
              on the Trader Watchdog portal.
            </li>
          </ul>
          <p className="mt-2">
            Payments are processed securely via Stripe. Prices exclude VAT
            unless otherwise stated.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">3. Portal Listing and Renewal</h2>
          <ul className="mt-3 list-inside list-disc space-y-2">
            <li>
              Your Annual Portal Fee provides 12 months of public listing and
              Green Flag status.
            </li>
            <li>
              Your Annual Portal Fee renews automatically 12 months from the
              approval date.
            </li>
            <li>
              You will receive renewal reminders before any renewal payment is
              taken.
            </li>
            <li>
              You may cancel at any time before the renewal date to prevent
              renewal charges.
            </li>
            <li>
              Renewal payments are non-refundable once processed, except where
              required by law.
            </li>
            <li>
              If you cancel, your portal listing will remain active until the
              end of the current 12-month period.
            </li>
            <li>
              You must stop using the Green Flag badge once your portal period
              ends.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">4. Refunds</h2>
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
              Trader Watchdog is unable to activate your portal listing after
              approval.
            </li>
          </ul>
          <p className="mt-4">Refunds are not provided when:</p>
          <ul className="mt-3 list-inside list-disc space-y-2">
            <li>
              Verification has been completed and you have been approved.
            </li>
            <li>
              You have received your Green Flag status and portal listing.
            </li>
            <li>You cancel during the 12-month portal period.</li>
            <li>
              You are removed for breaching this Agreement or providing false
              information.
            </li>
          </ul>
          <p className="mt-2">
            Refunds are processed back to the original payment method via
            Stripe.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">5. Your Responsibilities</h2>
          <ul className="mt-3 list-inside list-disc space-y-2">
            <li>
              You must maintain valid insurance and any legally required
              licences throughout your portal period.
            </li>
            <li>
              You must notify Trader Watchdog immediately of any changes to your
              insurance, address, or licensing status.
            </li>
            <li>
              You must not misuse the Green Flag badge or misrepresent your
              verification status.
            </li>
            <li>
              You must not provide false, misleading or incomplete information.
            </li>
            <li>
              Misrepresentation may result in removal from the portal without
              refund.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">6. Use of the Green Flag Badge</h2>
          <ul className="mt-3 list-inside list-disc space-y-2">
            <li>
              You may use the Green Flag badge only while you have an active
              portal listing.
            </li>
            <li>
              You may display the badge on your website, van, uniform, business
              cards and marketing materials.
            </li>
            <li>You must stop using the badge immediately if:</li>
          </ul>
          <ul className="mt-3 list-inside list-disc space-y-2">
            <li>You cancel.</li>
            <li>Your portal period expires.</li>
            <li>You are removed for breach of terms.</li>
            <li>Your verification status changes.</li>
          </ul>
          <p className="mt-4">
            Continued use of the badge after removal may result in legal action.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">7. Removal from the Platform</h2>
          <p className="mt-2">You may be removed without refund if:</p>
          <ul className="mt-3 list-inside list-disc space-y-2">
            <li>You provided false or misleading information.</li>
            <li>Your insurance or licences lapse.</li>
            <li>Serious complaints are received.</li>
            <li>You breach this Agreement.</li>
            <li>You misuse the Green Flag badge.</li>
          </ul>
          <p className="mt-4">
            Trader Watchdog may remove traders at its discretion to protect
            householders.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">8. Data Protection</h2>
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
      </div>
    </main>
  );
}
