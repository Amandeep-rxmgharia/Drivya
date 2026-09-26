import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import logo from '../../assets/images/logo-transparent.png';
import {
  ArrowLeft,
  ShieldCheck,
  Eye,
  Database,
  Lock,
  Globe,
  UserCheck,
  Trash2,
  Cookie,
  Bell,
  Baby,
  Scale,
  Mail,
  ChevronUp,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const EFFECTIVE_DATE = "September 26, 2026";

const sections = [
  {
    id: "overview",
    icon: Eye,
    title: "1. Overview",
    content: [
      `This Privacy Policy explains how Drivya, developed and maintained by Amandeep Singh ("Drivya," "we," "us," or "our"), collects, uses, stores, shares, and protects your personal information when you use the Drivya platform and related services ("the Service").`,
      `We are committed to protecting your privacy and handling your data transparently. This policy applies to all users of Drivya, whether using free or paid subscription plans, and covers interactions through our website, web application, and API.`,
      `By creating an account or using the Service, you consent to the practices described in this Privacy Policy. If you do not agree, please do not use the Service.`,
      `The data controller responsible for your personal data is Amandeep Singh, reachable at drivya.app@gmail.com.`,
    ],
  },
  {
    id: "data-collection",
    icon: Database,
    title: "2. Information We Collect",
    content: [
      `We collect the minimum information necessary to provide, improve, and secure the Service. The types of information we collect include:`,
    ],
    subsections: [
      {
        title: "2.1 Account Information",
        content:
          "When you register, we collect your full name, email address, and password (hashed using bcrypt with a high salt factor). If you sign in via Google or GitHub OAuth, we receive your name, email, and a provider-specific user ID. We never receive or store your Google or GitHub password.",
      },
      {
        title: "2.2 Profile & Preferences",
        content:
          "This includes your avatar image URL, preferred language, timezone, storage preferences (trash auto-empty interval, storage alerts), sharing defaults (link access level, expiry, password preferences, public profile visibility), and notification settings (login alerts).",
      },
      {
        title: "2.3 Files & Content",
        content:
          "Files you upload are stored on Cloudflare R2 object storage infrastructure. We store file metadata (name, size, MIME type, directory structure, share links, starred/trash status) in our database. We do not scan, analyze, or access the contents of your files except when technically necessary to provide the Service (e.g., generating previews, serving download requests).",
      },
      {
        title: "2.4 Billing & Payment Data",
        content:
          "When you subscribe to a paid plan, payment processing is handled entirely by Razorpay (PCI-DSS Level 1 compliant). We store your Razorpay customer ID, subscription ID, plan type, billing period, subscription status, and the last 4 digits and type of your payment method. We never have access to your full card number, CVV, or banking credentials.",
      },
      {
        title: "2.5 Usage & Analytics Data",
        content:
          "We track storage used, bandwidth consumed, and general usage patterns (e.g., login frequency, feature usage) to provide dashboard analytics and enforce plan limits. We may collect device type, browser version, IP address, and approximate location for security, fraud prevention, and service optimization purposes.",
      },
      {
        title: "2.6 Security Data",
        content:
          "If you enable Two-Factor Authentication (2FA), we store your encrypted TOTP secret (AES-256-GCM encryption at rest) and bcrypt-hashed backup codes. Login session data and security tokens are stored temporarily for authentication purposes.",
      },
    ],
  },
  {
    id: "data-usage",
    icon: UserCheck,
    title: "3. How We Use Your Information",
    content: [
      `We process your information based on the following legal bases: your consent (e.g., creating an account), contractual necessity (e.g., providing the Service you signed up for), legitimate interests (e.g., security, fraud prevention), and compliance with legal obligations (e.g., tax and financial records). Specifically, we use your information for the following purposes:`,
    ],
    list: [
      "Provide, maintain, and improve the Service — including file storage, sharing, and sync functionality.",
      "Authenticate your identity and secure your account, including 2FA verification and login alerts.",
      "Process subscription payments and manage billing through Razorpay.",
      "Enforce storage and bandwidth limits associated with your subscription plan.",
      "Send essential account notifications — security alerts, billing updates, and service announcements.",
      "Detect, prevent, and respond to fraud, abuse, security incidents, and policy violations.",
      "Generate aggregated, anonymized analytics to improve platform performance and user experience.",
      "Comply with applicable legal obligations, regulatory requirements, and law enforcement requests.",
    ],
    afterList: [
      `We do not sell your personal data. We do not use your files for advertising, machine learning training, or any purpose beyond providing the Service.`,
    ],
  },
  {
    id: "data-storage",
    icon: Lock,
    title: "4. Data Storage & Security",
    content: [
      `Your files are stored on Cloudflare R2, a globally distributed, S3-compatible object storage service that provides high durability and availability. File metadata and account data are stored in encrypted MongoDB databases.`,
      `We implement multiple layers of security to protect your data:`,
    ],
    list: [
      "All data in transit is encrypted via TLS 1.2+ (HTTPS).",
      "Sensitive credentials (TOTP secrets, OAuth tokens) are encrypted at rest using AES-256-GCM.",
      "Passwords are hashed using bcrypt with high-cost salt rounds — never stored in plain text.",
      "2FA backup codes are individually bcrypt-hashed and single-use.",
      "API endpoints enforce rate limiting and input validation.",
      "Session tokens use secure, HttpOnly cookies with strict SameSite attributes.",
    ],
    afterList: [
      `Despite our best efforts, no method of electronic storage or transmission is 100% secure. We cannot guarantee absolute security, but we continuously monitor and update our security practices to address emerging threats.`,
    ],
  },
  {
    id: "third-party",
    icon: Globe,
    title: "5. Third-Party Services",
    content: [
      `We integrate with the following third-party services to operate the platform. Each processes data according to their own privacy policies:`,
    ],
    thirdParties: [
      {
        name: "Cloudflare (R2 Storage)",
        purpose:
          "File storage infrastructure. Your uploaded files reside on Cloudflare's global network.",
        url: "https://www.cloudflare.com/privacypolicy/",
      },
      {
        name: "Razorpay",
        purpose:
          "Subscription billing and payment processing. Handles all payment card data.",
        url: "https://razorpay.com/privacy/",
      },
      {
        name: "Google OAuth",
        purpose:
          "Optional sign-in provider. We request the email, profile, and openid OAuth scopes to receive your name and email upon consent. We do not request access to your Gmail, Google Calendar, or other Google services beyond authentication.",
        url: "https://policies.google.com/privacy",
      },
      {
        name: "GitHub OAuth",
        purpose:
          "Optional sign-in provider. Receives basic profile data upon user consent.",
        url: "https://docs.github.com/en/site-policy/privacy-policies",
      },
      {
        name: "Google Drive",
        purpose:
          "Optional cloud integration for importing and exporting files. OAuth tokens are encrypted at rest (AES-256-GCM). Access can be revoked any time from Settings.",
        url: "https://policies.google.com/privacy",
      },
      {
        name: "Dropbox",
        purpose:
          "Optional cloud integration for importing and exporting files. OAuth tokens are encrypted at rest (AES-256-GCM). Access can be revoked any time from Settings.",
        url: "https://www.dropbox.com/privacy",
      },
    ],
    afterList: [
      `We only share the minimum data necessary for each third-party integration to function. We do not sell or trade your data with any third parties for their independent marketing purposes.`,
    ],
  },
  {
    id: "sharing-disclosure",
    icon: ShieldCheck,
    title: "6. Data Sharing & Disclosure",
    content: [
      `We do not sell, rent, or trade your personal information. We may share data only in the following limited circumstances:`,
    ],
    list: [
      "With service providers (Cloudflare, Razorpay) who process data on our behalf under strict contractual obligations.",
      "When required by law, regulation, legal process, or governmental request.",
      "To protect the rights, property, or safety of Drivya, our users, or the public.",
      "In connection with a merger, acquisition, or asset sale — in which case you will be notified of any change in data ownership or processing.",
      "With your explicit consent for any purpose not described in this policy.",
    ],
  },
  {
    id: "cookies",
    icon: Cookie,
    title: "7. Cookies & Local Storage",
    content: [
      `Drivya uses cookies and browser local storage for essential service functionality:`,
    ],
    list: [
      "Authentication session cookies — to keep you signed in securely.",
      "Theme preference — to remember your light/dark mode selection.",
      "\"Remember Me\" preference — stores your email locally for login convenience (opt-in only).",
    ],
    afterList: [
      `We do not use tracking cookies, advertising cookies, or third-party analytics cookies. We do not participate in cross-site tracking or retargeting networks.`,
    ],
  },
  {
    id: "retention",
    icon: Trash2,
    title: "8. Data Retention & Deletion",
    content: [
      `We retain your data only for as long as necessary to provide the Service and fulfill the purposes described in this policy:`,
    ],
    list: [
      "Active accounts: Data is retained as long as your account is active.",
      "Trashed files: Deleted files remain in Trash for your configured retention period (5–90 days, default 30 days), then are permanently deleted from all storage replicas.",
      "Deactivated accounts: Account data is preserved for up to 90 days to allow reactivation, after which it may be permanently deleted.",
      "Deleted accounts: Upon account deletion, all personal data and files are purged within 30 days.",
      "Billing records: Transaction records may be retained for up to 7 years as required by applicable tax and financial regulations.",
      "Security logs: Login and access logs may be retained for up to 12 months for security and abuse prevention.",
    ],
    afterList: [
      `Anonymized, aggregated data that cannot identify individual users may be retained indefinitely for analytical and service improvement purposes.`,
    ],
  },
  {
    id: "your-rights",
    icon: UserCheck,
    title: "9. Your Rights",
    content: [
      `Depending on your jurisdiction, you may have the following rights regarding your personal data:`,
    ],
    list: [
      "Access — Request a copy of the personal data we hold about you.",
      "Correction — Request correction of inaccurate or incomplete data.",
      "Deletion — Request deletion of your account and all associated data.",
      "Portability — Request your data in a structured, machine-readable format.",
      "Restriction — Request that we limit processing of your data in certain circumstances.",
      "Objection — Object to processing based on legitimate interests.",
      "Withdrawal of Consent — Withdraw consent for optional processing activities at any time.",
    ],
    afterList: [
      `To exercise any of these rights, contact us at drivya.app@gmail.com. We will respond to verified requests within 30 days. You can also delete your account, manage connected integrations, and download your data directly through the Settings page.`,
      `We process your data in compliance with applicable data protection laws, including the Indian Digital Personal Data Protection Act (DPDPA) 2023 and the EU General Data Protection Regulation (GDPR) where applicable.`,
    ],
  },
  {
    id: "children",
    icon: Baby,
    title: "10. Children's Privacy",
    content: [
      `Drivya is not intended for use by children under the age of 16. We do not knowingly collect personal information from children under 16. If we discover that we have collected data from a child under 16 without verifiable parental consent, we will delete such data promptly.`,
      `If you are a parent or guardian and believe your child has provided personal information to Drivya, please contact us at drivya.app@gmail.com so we can take appropriate action.`,
    ],
  },
  {
    id: "notifications",
    icon: Bell,
    title: "11. Communication & Notifications",
    content: [`We may send you the following types of communications:`],
    list: [
      "Essential service emails — account verification, password resets, security alerts, and billing confirmations. These cannot be opted out of as they are necessary for service operation.",
      "Login alerts — notifications when your account is accessed from a new device or location. These can be toggled in Settings.",
      "Service announcements — important updates about the platform, policy changes, or maintenance windows.",
    ],
    afterList: [
      `We do not send promotional marketing emails or share your email with third parties for marketing purposes.`,
    ],
  },
  {
    id: "changes",
    icon: Scale,
    title: "12. Changes to This Policy",
    content: [
      `We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. When we make material changes, we will:`,
    ],
    list: [
      "Update the \"Effective Date\" at the top of this page.",
      "Provide notice through an in-app notification or email for significant changes.",
      "Allow a reasonable period before changes take effect for material modifications.",
    ],
    afterList: [
      `Your continued use of the Service after changes become effective constitutes acceptance of the updated policy. We encourage you to review this page periodically.`,
    ],
  },
  {
    id: "contact",
    icon: Mail,
    title: "13. Contact Us",
    content: [
      `If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please reach out:`,
    ],
    contact: true,
  },
];

export default function PrivacyPolicy() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans select-none w-full">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 right-1/3 w-[600px] h-[600px] rounded-full bg-[radial-gradient(closest-side,var(--ambient-blob-b),transparent)] opacity-15 blur-3xl" />
      </div>

      {/* Ultra-Minimalist Floating Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/10 transition-all">
        <div className="w-full px-6 md:px-12 lg:px-20 py-3.5 flex items-center justify-between">
          {/* Left: Back button + Logo + Title breadcrumb */}
          <div className="flex items-center gap-4">
            <Link
              to="/auth"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/30 bg-background/40 hover:bg-background/80 hover:border-border/60 text-xs font-medium transition-all group"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Back</span>
            </Link>

            <div className="h-4 w-[1px] bg-border/40 hidden sm:block" />

            <Link to="/auth" className="flex items-center gap-2 group">
              <span className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
                <img className="h-5" src={logo} alt="" />
              </span>
              <span className="font-display text-lg font-bold tracking-tight text-foreground">
                Drivya
              </span>
            </Link>

            <span className="text-xs text-muted-foreground hidden md:inline font-medium">
              / Privacy Policy
            </span>
          </div>

          {/* Right: Compact Segmented Switcher & Theme Toggle */}
          <div className="flex items-center gap-3">
            <div className="flex items-center p-0.5 bg-muted/40 border border-border/20 rounded-full text-xs font-semibold">
              <Link
                to="/terms"
                className="px-3 py-1 rounded-full text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms
              </Link>
              <span className="px-3 py-1 rounded-full bg-background text-foreground shadow-sm border border-border/30">
                Privacy
              </span>
            </div>

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Full-Width Content Container */}
      <main className="relative z-10 w-full px-6 md:px-16 lg:px-24 xl:px-36 py-12">
        {/* Header Title Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="pb-8 border-b border-border/15 mb-10 space-y-3"
        >
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Privacy Policy
          </h1>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Drivya </span>
            <span>•</span>
            <span className="font-mono">Last updated: {EFFECTIVE_DATE}</span>
          </div>
        </motion.div>

        {/* Continuous Flow Document */}
        <div className="space-y-10">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <motion.section
                key={section.id}
                id={section.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ duration: 0.4, delay: index * 0.02 }}
                className="border-b border-border/10 pb-8 last:border-b-0"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
                    {section.title}
                  </h2>
                </div>

                <div className="space-y-3 text-muted-foreground text-sm leading-relaxed pl-0 md:pl-11">
                  {section.content.map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}

                  {/* Subsections */}
                  {section.subsections && (
                    <div className="my-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {section.subsections.map((sub, i) => (
                        <div
                          key={i}
                          className="p-3.5 rounded-xl bg-muted/15 border border-border/10 space-y-1"
                        >
                          <h3 className="text-xs font-bold text-foreground">
                            {sub.title}
                          </h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {sub.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {section.list && (
                    <div className="my-3 grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                      {section.list.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/15 border border-border/10 text-xs text-foreground/90"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Third party services */}
                  {section.thirdParties && (
                    <div className="my-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {section.thirdParties.map((tp, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl bg-muted/15 border border-border/10 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground">
                              {tp.name}
                            </span>
                            {tp.url && (
                              <a
                                href={tp.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-semibold"
                              >
                                Policy <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {tp.purpose}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {section.afterList &&
                    section.afterList.map((p, i) => (
                      <p key={i} className="pt-1">
                        {p}
                      </p>
                    ))}

                  {section.contact && (
                    <div className="mt-4 p-4 rounded-xl bg-muted/20 border border-border/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="font-bold text-foreground">
                          Drivya — Amandeep Singh
                        </p>
                        <p className="text-muted-foreground mt-0.5">
                          Questions about privacy or exercising data rights?
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                        href='mailto:drivya.app@gmail.com'
                          className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all shadow-glow"
                        >
                          drivya.app@gmail.com
                        </a>
                        <a
                        href='mailto:aman9251813@gmail.com'
                          className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all shadow-glow"
                        >
                          aman9251813@gmail.com
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </motion.section>
            );
          })}
        </div>

        {/* Footer Note */}
        <footer className="mt-14 pt-6 border-t border-border/15 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Drivya.</p>
          <div className="flex items-center gap-3">
            <Link to="/terms" className="hover:text-foreground text-primary font-semibold">
              Terms of Service →
            </Link>
            <span>•</span>
            <Link to="/auth" className="hover:text-foreground">
              Sign In
            </Link>
          </div>
        </footer>
      </main>

      {/* Floating Scroll-to-Top Button */}
      {showScrollTop && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 h-10 w-10 rounded-full bg-gradient-primary text-primary-foreground shadow-glow flex items-center justify-center hover:opacity-90 transition-all cursor-pointer"
        >
          <ChevronUp className="h-4 w-4" />
        </motion.button>
      )}
    </div>
  );
}
