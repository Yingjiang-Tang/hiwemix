import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

// TODO(owner): 责任上限金额（CNY 1,000）为上架默认值，上线前请按法务意见确认
export const metadata: Metadata = {
  title: "Terms of Service | HIWE MIX",
  description: "Terms of Service for the HIWE MIX car refinish formula search service.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="November 21, 2026">
      <h2>1. Acceptance of These Terms</h2>
      <p>
        These Terms of Service (“Terms”) govern your access to and use of the HIWE MIX Formula
        Search website and related services (the “Service”), operated by{" "}
        <strong>HIWE Automotive Refinish Co., Ltd.</strong> (“we”, “us”, “our”). By creating an account, signing
        in, or otherwise using the Service, you agree to be bound by these Terms. If you do not
        agree, do not use the Service.
      </p>

      <h2>2. The Service</h2>
      <p>
        The Service is a professional reference tool that helps automotive refinish technicians
        find paint mixing formulas by vehicle brand, model year, or color code. Formula data is
        compiled from manufacturer documentation and third-party sources. The Service is intended
        for use by businesses and individuals trained in automotive refinishing, and not for
        consumer automotive use.
      </p>

      <h2>3. Accounts</h2>
      <ul>
        <li>You must provide accurate and current information and keep it up to date.</li>
        <li>
          You are responsible for maintaining the confidentiality of your credentials and for all
          activity that occurs under your account.
        </li>
        <li>
          Notify us immediately at <strong>info@hiwe.com</strong> if you suspect unauthorized
          access to your account.
        </li>
        <li>
          We may suspend or terminate accounts that violate these Terms or that we reasonably
          believe present a security or legal risk.
        </li>
      </ul>

      <h2>4. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>
          copy, scrape, crawl, or bulk-extract formula data or other content, or resell,
          sublicense, or publicly redistribute it;
        </li>
        <li>
          attempt to access accounts, systems, or data you are not authorized to access, or probe,
          scan, or test the vulnerability of the Service;
        </li>
        <li>
          interfere with or disrupt the Service, including through automated requests outside the
          normal user interface;
        </li>
        <li>use the Service in violation of applicable law or the rights of any third party;</li>
        <li>misrepresent your identity or affiliation.</li>
      </ul>

      <h2>5. Formula Data and Professional Judgment</h2>
      <p>
        <strong>
          Formula data is provided for reference only and must be verified before use.
        </strong>{" "}
        Color appearance and mixing results vary with lighting, screen calibration, product batch,
        variant, and application method. You must:
      </p>
      <ul>
        <li>verify every formula against the paint manufacturer’s official documentation;</li>
        <li>perform a spray-out test before applying any mixed paint; and</li>
        <li>exercise your own professional judgment in product selection and mixing.</li>
      </ul>
      <p>
        We do not warrant that any formula is complete, current, or accurate for your specific
        vehicle, variant, product line, or conditions, and we are not responsible for the outcome
        of any repair.
      </p>

      <h2>6. Intellectual Property</h2>
      <p>
        The Service, including its software, design, database structure, and the compilation of
        formula data, is owned by us or our licensors and protected by intellectual property laws.
        Subject to these Terms, we grant you a limited, non-exclusive, non-transferable, revocable
        license to access and use the Service for your internal business purposes. You may print or
        copy individual formula results for use in your own repair work. No other rights are
        granted.
      </p>

      <h2>7. Third-Party Services</h2>
      <p>
        Sign-in through Google or Facebook and underlying infrastructure services (including
        database, authentication, hosting, and content delivery providers) are operated by third
        parties and subject to their own terms and policies. We are not responsible for third-party
        services.
      </p>

      <h2>8. Disclaimer of Warranties</h2>
      <p>
        To the maximum extent permitted by law, the Service is provided{" "}
        <strong>“as is” and “as available”</strong>, without warranties of any kind, whether
        express, implied, or statutory, including implied warranties of merchantability, fitness
        for a particular purpose, title, and non-infringement. We do not warrant that the Service
        will be uninterrupted, error-free, or free of harmful components, or that any data will be
        accurate or complete.
      </p>

      <h2>9. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, we will not be liable for any indirect, incidental,
        special, consequential, or punitive damages, or for any loss of profits, revenue, data,
        goodwill, or business opportunity, arising out of or related to your use of or inability to
        use the Service. Our aggregate liability for all claims relating to the Service will not
        exceed <strong>the greater of the amount you paid us in the twelve months before the
        event giving rise to the claim, or CNY 1,000</strong>. Nothing in these Terms limits
        liability that cannot be limited by applicable law.
      </p>

      <h2>10. Indemnification</h2>
      <p>
        You agree to indemnify and hold harmless HIWE Automotive Refinish Co., Ltd. and its officers, employees,
        and agents from any claims, damages, liabilities, and expenses (including reasonable legal
        fees) arising from your use of the Service, your violation of these Terms, or your
        violation of any law or third-party right.
      </p>

      <h2>11. Termination</h2>
      <p>
        We may suspend or terminate your access at any time if you violate these Terms or if we
        discontinue the Service. You may stop using the Service at any time and request deletion of
        your account as described in our Privacy Policy. Provisions that by their nature should
        survive termination (including Sections 5, 6, 8, 9, and 10) will survive.
      </p>

      <h2>12. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. Material changes will be announced on this
        page or by email before they take effect, and the “Last updated” date will be revised.
        Continued use of the Service after changes take effect constitutes acceptance of the
        updated Terms.
      </p>

      <h2>13. Governing Law and Disputes</h2>
      <p>
        These Terms are governed by the laws of <strong>the People’s Republic of China</strong>, without regard to
        its conflict-of-law rules. Any dispute arising out of or relating to these Terms or the
        Service will be subject to the exclusive jurisdiction of the courts of{" "}
        <strong>Guangzhou, Guangdong, China</strong>, unless mandatory law provides otherwise.
      </p>

      <h2>14. General</h2>
      <p>
        These Terms constitute the entire agreement between you and us regarding the Service and
        supersede any prior agreements. If any provision is found unenforceable, the remaining
        provisions will remain in effect. Our failure to enforce a provision is not a waiver. You
        may not assign these Terms without our written consent; we may assign them in connection
        with a merger, acquisition, or sale of assets.
      </p>

      <h2>15. Contact</h2>
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
