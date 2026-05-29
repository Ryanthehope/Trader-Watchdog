export function RefundsPolicy() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-20">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
        Trader Watchdog
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold text-white">
        Refunds &amp; Cancellation Policy
      </h1>
      <p className="mt-4 text-sm text-slate-500">Effective: 1 June 2026</p>

      <div className="prose prose-invert mt-10 max-w-none space-y-8 text-sm leading-relaxed text-slate-400">

        <section>
          <h2 className="font-display text-lg font-semibold text-white">1. Purpose of This Policy</h2>
          <p className="mt-2">
            This policy explains how refunds, cancellations, renewals, and cooling-off rights apply to
            Trader Watchdog subscriptions and services. It applies to all traders who purchase a
            verification subscription or any paid service offered by Trader Watchdog Ltd.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">2. How Payments Work</h2>
          <p className="mt-2">
            When you apply to become a verified trader, you will be asked to set up a GoCardless Direct
            Debit mandate. This authorises Trader Watchdog to collect payments when they become due.
            <strong> No payment is taken at the point of application.</strong>
          </p>
          <p className="mt-2">
            Once our verification checks are completed, the following fees become due:
          </p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>A non-refundable registration fee, and</li>
            <li>The first year's annual subscription</li>
          </ul>
          <p className="mt-2">
            These fees cover the cost of processing your application, completing due diligence, and
            providing your verification, QR code, and public profile for 12 months.
          </p>
          <p className="mt-2">After verification checks are completed:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>
              <strong>If approved:</strong> The registration fee and first year's annual subscription
              will be collected via GoCardless.
            </li>
            <li>
              <strong>If not approved:</strong> Only the non-refundable registration fee will be
              collected. No subscription payment will be taken.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">3. Cooling-Off Period</h2>
          <p className="mt-2">Under UK consumer contract regulations:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>
              Traders who purchase a subscription online are entitled to a 14-day cooling-off period,
              unless verification work has already begun.
            </li>
            <li>
              If verification checks, document reviews, or badge-issuance processes have started at the
              trader's request, the trader waives the right to a full cooling-off refund.
            </li>
            <li>
              If a trader cancels within the cooling-off period <strong>before</strong> any
              verification work begins, a full refund will be issued.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">4. Refund Eligibility</h2>

          <h3 className="mt-4 font-semibold text-slate-300">4.1 Full Refund</h3>
          <p className="mt-2">A full refund may be issued if:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Cancellation occurs within the 14-day cooling-off period, and</li>
            <li>No verification work has started.</li>
          </ul>

          <h3 className="mt-4 font-semibold text-slate-300">4.2 Partial Refund</h3>
          <p className="mt-2">A partial refund may be issued if:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Cancellation occurs within the cooling-off period after verification work has begun.</li>
            <li>The refund will be reduced to reflect the proportion of work already completed.</li>
          </ul>

          <h3 className="mt-4 font-semibold text-slate-300">4.3 No Refund</h3>
          <p className="mt-2">Refunds will <strong>not</strong> be issued if:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>The subscription has been active for more than 14 days</li>
            <li>Verification has been completed and the badge issued</li>
            <li>The trader has breached the Terms of Use or Misrepresentation Policy</li>
            <li>The trader has been removed for providing false or misleading information</li>
            <li>The renewal payment has already been processed (see Section 5)</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">5. Subscription Renewals</h2>
          <p className="mt-2">Your subscription renews 12 months from the date your verification is approved.</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Subscriptions renew automatically unless cancelled.</li>
            <li>
              You will receive renewal reminders 30 days and 14 days before the renewal date,
              including the renewal date and price.
            </li>
            <li>
              You may cancel at any time before the renewal date to avoid further charges.
            </li>
            <li>
              Refunds are not provided for renewal payments once the renewal has been processed,
              except where required by law.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">6. Cancelling Your Subscription</h2>
          <p className="mt-2">You may cancel your subscription at any time by:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Logging into your Trader Dashboard and selecting Manage Subscription, or</li>
            <li>
              Contacting us at{" "}
              <a href="mailto:admin@traderwatchdog.co.uk" className="text-brand-300 hover:text-brand-200">
                admin@traderwatchdog.co.uk
              </a>
            </li>
          </ul>
          <p className="mt-2">If you cancel:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Your verification remains active until the end of your current paid period</li>
            <li>No further subscription payments will be taken</li>
            <li>Registration fees and subscription payments are non-refundable, except where required by law</li>
          </ul>
          <p className="mt-2">
            Cancellation stops future renewals but does <strong>not</strong> automatically generate a
            refund unless the conditions in Section 4 are met.
          </p>
          <p className="mt-2">
            You may also cancel your GoCardless mandate directly with your bank, but doing so will
            immediately suspend your verification if a payment becomes due.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">7. Verification Work Already Started</h2>
          <p className="mt-2">Verification work includes:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Reviewing documents</li>
            <li>Checking public records</li>
            <li>Contacting licensing bodies</li>
            <li>Assessing insurance evidence</li>
            <li>Conducting risk and legitimacy checks</li>
            <li>Preparing the public verification portal</li>
            <li>Issuing the verification badge</li>
          </ul>
          <p className="mt-2">
            Once any of these actions begin, the subscription is considered partially used, and full
            refunds are no longer available.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">8. Badge Removal After Cancellation</h2>
          <p className="mt-2">When a subscription is cancelled:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>
              The trader must stop using the Trader Watchdog logo and QR code once the subscription ends.
            </li>
            <li>
              Continued badge use after cancellation is considered misrepresentation and may result in
              enforcement action.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">9. Failed or Cancelled Direct Debits</h2>
          <p className="mt-2">If a renewal payment fails or your mandate is cancelled, we may:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Request updated payment details</li>
            <li>Retry the payment</li>
            <li>Suspend or remove your verification until payment is successfully collected</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">10. How Refunds Are Issued</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Refunds are processed to the original payment method.</li>
            <li>Processing typically takes 5–10 working days, depending on the payment provider.</li>
            <li>Trader Watchdog will confirm the refund decision in writing.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">11. Exceptional Circumstances</h2>
          <p className="mt-2">
            Trader Watchdog may, at its discretion, issue refunds outside the standard criteria in
            cases such as duplicate payments, technical errors, or platform-side issues preventing
            verification from being completed.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">12. Contact</h2>
          <p className="mt-2">For refund or cancellation queries, contact:</p>
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
