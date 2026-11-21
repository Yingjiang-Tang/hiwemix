import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

// 数据保留期限（12 个月 / 30 天）为默认值，上线前请按实际运营情况确认
export const metadata: Metadata = {
  title: "Privacy Policy | HIWE MIX",
  description: "How HIWE MIX collects, uses, and protects personal data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="November 21, 2026">
      <h2>1. Who We Are</h2>
      <p>
        This Privacy Policy explains how <strong>HIWE Automotive Refinish Co., Ltd.</strong> (“we”, “us”, “our”)
        collects, uses, and shares personal data when you use the HIWE MIX Formula Search website
        and related services (the “Service”). For the purposes of applicable data protection law,
        we are the data controller of the personal data described below. You can contact us at{" "}
        <strong>info@hiwe.com</strong>.
      </p>

      <h2>2. Information We Collect</h2>
      <h3>a. Account and authentication data</h3>
      <ul>
        <li>your email address and a password (stored in hashed form by our authentication provider);</li>
        <li>
          if you sign in with Google or Facebook, the identifiers and profile details those services
          share with us, such as your name and email address;
        </li>
        <li>session and security information needed to keep you signed in and protect your account.</li>
      </ul>

      <h3>b. Usage and analytics data</h3>
      <p>When you use the Service while signed in, we record:</p>
      <ul>
        <li>pages you visit within the Service;</li>
        <li>
          searches you perform, such as vehicle brand, color code, color name, model year, and the
          number of results returned;
        </li>
        <li>actions such as copying, printing, or favoriting a formula;</li>
        <li>your selected interface language, timestamps, and an anonymous visitor identifier.</li>
      </ul>

      <h3>c. Technical data</h3>
      <p>
        Our hosting, authentication, and database providers process standard technical information
        — such as IP address, browser type, and request logs — to deliver the Service, enforce rate
        limits, and protect against abuse.
      </p>

      <h3>d. Preferences stored on your device</h3>
      <p>
        Your favorites, comparison list, recent searches, language and theme preferences, and
        interface settings are stored in cookies or browser local storage on your device.
      </p>
      <p>
        We do not ask for or intentionally collect payment card data, precise location data, or
        special categories of personal data.
      </p>

      <h2>3. How We Use Information</h2>
      <ul>
        <li>to provide and operate the Service, including search, favorites, comparison, and formula display;</li>
        <li>to authenticate you and maintain your session;</li>
        <li>to protect the Service through rate limiting, abuse prevention, and security monitoring;</li>
        <li>to understand usage in aggregate so we can improve search, formulas, and the interface;</li>
        <li>to respond to your support requests;</li>
        <li>to comply with legal obligations and enforce our Terms of Service.</li>
      </ul>

      <h2>4. Legal Bases for Processing (EEA and UK)</h2>
      <p>
        Where the GDPR or UK GDPR applies, we rely on the following legal bases:{" "}
        <strong>performance of a contract</strong> (providing the Service you requested);{" "}
        <strong>legitimate interests</strong> (security, abuse prevention, improving the Service,
        and aggregate analytics); <strong>consent</strong> (where required, for example for
        non-essential cookies); and <strong>legal obligation</strong> (where we must retain or
        disclose data by law).
      </p>

      <h2>5. Cookies and Similar Technologies</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Purpose</th>
            <th>Type</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>site-language</td>
            <td>Remembers your interface language</td>
            <td>Preference</td>
            <td>1 year</td>
          </tr>
          <tr>
            <td>hiwemix-theme</td>
            <td>Remembers your light or dark theme choice</td>
            <td>Preference</td>
            <td>1 year</td>
          </tr>
          <tr>
            <td>sb-*</td>
            <td>Keeps you signed in; set by our authentication provider</td>
            <td>Strictly necessary</td>
            <td>Session or until sign-out</td>
          </tr>
          <tr>
            <td>hiwe_visitor_id</td>
            <td>Anonymous identifier used to count visits and searches in aggregate</td>
            <td>Analytics</td>
            <td>1 year</td>
          </tr>
        </tbody>
      </table>
      <p>
        Browser local storage is used for favorites, the comparison list, recent searches, the
        position of the back-to-top button, and email cooldown timestamps. You can clear cookies
        and local storage through your browser settings; doing so may reset your preferences. We do
        not use third-party advertising cookies or sell data to advertisers.
      </p>

      <h2>6. How We Share Information</h2>
      <p>We share personal data only as needed to operate the Service:</p>
      <ul>
        <li>
          <strong>Supabase</strong> — database, authentication, and file storage;
        </li>
        <li>
          <strong>Vercel</strong> — website hosting and content delivery;
        </li>
        <li>
          <strong>Google and Facebook</strong> — only if you choose to sign in with those services;
        </li>
        <li>
          professional advisers, auditors, or authorities where required by law, and a successor
          entity in connection with a merger, acquisition, or sale of assets.
        </li>
      </ul>
      <p>
        These providers process data on our behalf under contractual obligations. We do not sell
        personal data.
      </p>

      <h2>7. International Transfers</h2>
      <p>
        Our service providers may store or process data in countries other than the one in which you
        live. Where required, we rely on appropriate safeguards, such as standard contractual
        clauses approved by the European Commission or equivalent mechanisms.
      </p>

      <h2>8. Retention</h2>
      <p>
        We retain account data while your account is active and for a reasonable period afterward
        to meet legal, security, and operational needs. Usage analytics are retained for{" "}
        <strong>12 months</strong> and then deleted or aggregated. Server logs are retained for a
        limited period for security purposes. If you request deletion of your account, we will
        delete or anonymize your personal data within <strong>30 days</strong>, except where we
        must retain records to comply with law.
      </p>

      <h2>9. Your Rights</h2>
      <p>
        Depending on where you live, you may have the right to access, correct, delete, or receive a
        copy of your personal data; to restrict or object to certain processing; and to withdraw
        consent where processing is based on consent. To exercise any of these rights, or to request
        deletion of your account, email <strong>info@hiwe.com</strong>. We may need to verify your
        identity before acting and will respond within the timeframe required by applicable law.
        You also have the right to lodge a complaint with your local data protection authority.
      </p>

      <h2>10. Security</h2>
      <p>
        We use encryption in transit (HTTPS), store passwords in hashed form through our
        authentication provider, and apply access controls and rate limiting. No method of
        transmission or storage is completely secure; please notify us at{" "}
        <strong>info@hiwe.com</strong> if you suspect a security issue.
      </p>

      <h2>11. Children</h2>
      <p>
        The Service is intended for professional use and is not directed to children under 16. We
        do not knowingly collect personal data from children. If you believe a child has provided
        us with personal data, contact us and we will delete it.
      </p>

      <h2>12. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Material changes will be posted on
        this page with a new “Last updated” date, and where required we will notify you by email or
        in the Service.
      </p>

      <h2>13. Contact</h2>
      <p>
        <strong>HIWE Automotive Refinish Co., Ltd.</strong>
        <br />
        104, No.3 Dagang West Street, Baiyun Lake Street, Baiyun District, Guangzhou City, Guangdong Province, China
        <br />
        Email: info@hiwe.com
      </p>
    </LegalPage>
  );
}
