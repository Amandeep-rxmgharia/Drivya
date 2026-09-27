import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import logo from '../../assets/images/logo-transparent.png';
import {
  ArrowLeft,
  FileText,
  Shield,
  CreditCard,
  Users,
  AlertTriangle,
  Scale,
  Ban,
  RefreshCw,
  HardDrive,
  Share2,
  ChevronUp,
  Mail,
  CheckCircle2,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const EFFECTIVE_DATE = "September 26, 2026";

const sections = [
  {
    id: "acceptance",
    icon: FileText,
    title: "1. Acceptance of Terms",
    content: [
      `By creating an account, accessing, or using Drivya ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree with any part of these Terms, you must not use the Service.`,
      `These Terms constitute a legally binding agreement between you ("User," "you," or "your") and Drivya, developed and maintained by Amandeep Singh ("Drivya," "we," "us," or "our"). We reserve the right to update these Terms at any time. When we do, we will revise the "Last Updated" date at the top of this page and, for material changes, notify you via email or in-app notification. Your continued use of the Service after changes take effect constitutes acceptance of the revised Terms.`,
    ],
  },
  {
    id: "eligibility",
    icon: Users,
    title: "2. Eligibility & Account Registration",
    content: [
      `You must be at least 16 years of age to use Drivya. By registering, you represent that all information you provide is accurate, current, and complete. You may register using an email/password, or via third-party OAuth providers (Google, GitHub).`,
      `You are solely responsible for maintaining the confidentiality of your account credentials, including any two-factor authentication (2FA) backup codes. You agree to notify us immediately of any unauthorized use of your account. Drivya will not be liable for losses arising from unauthorized account access that results from your failure to safeguard your credentials.`,
      `We reserve the right to suspend or terminate accounts that contain false information, violate these Terms, or remain inactive for an extended period as described in our data retention policies.`,
    ],
  },
  {
    id: "service-description",
    icon: HardDrive,
    title: "3. The Service — Cloud Storage",
    content: [
      `Drivya provides a cloud-based file storage, management, and sharing platform. Your files are uploaded to and stored on Cloudflare's global object storage network (Cloudflare R2), which provides durable, geographically distributed storage infrastructure.`,
      `While we leverage Cloudflare's enterprise-grade infrastructure to ensure high availability and durability, Drivya does not guarantee that files will never be lost, corrupted, or become inaccessible. You are strongly encouraged to maintain independent backups of any critical files. The Service is provided "as is" without warranty of uninterrupted or error-free operation.`,
      `We may impose reasonable limits on file sizes, upload rates, and API requests to maintain platform stability and fair usage for all users. These limits vary by subscription plan and are subject to change with notice.`,
    ],
  },
  {
    id: "subscriptions",
    icon: CreditCard,
    title: "4. Subscriptions, Billing & Payments",
    content: [
      `Drivya offers a free tier and multiple paid subscription plans (including Spark Go, Boost, Pro, and Apex). Each plan specifies storage capacity, bandwidth allocation, and feature access.`,
      `All payments are securely processed through Razorpay, a PCI-DSS compliant payment gateway. By subscribing, you authorize Razorpay to charge your selected payment method on a recurring basis (monthly or yearly) until cancelled. We do not directly store your full payment card details; they are handled and encrypted by Razorpay.`,
      `Subscription upgrades take effect immediately with prorated billing. Downgrades are scheduled to take effect at the end of your current billing cycle. If you exceed your plan's storage limit after a downgrade, you may be required to delete files to comply with the new plan's allocation.`,
      `Refunds for subscription payments are processed on a prorated basis when upgrading mid-cycle. We reserve the right to adjust pricing for future billing cycles with at least 30 days' advance notice. Cancellations can be initiated at any time through your account settings, and your plan benefits remain active until the end of the current paid period.`,
    ],
  },
  {
    id: "sharing",
    icon: Share2,
    title: "5. File Sharing & Public Links",
    content: [
      `Drivya allows you to share files and directories via public or password-protected links. When you share content, you are granting access to the shared content to anyone who possesses the link (and password, if applicable).`,
      `You are solely responsible for the content you share and must ensure that sharing does not violate any applicable laws, third-party rights, or these Terms. Drivya is not responsible for any consequences arising from your decision to share files publicly.`,
      `We reserve the right to disable or remove shared links that are reported for abuse, violate these Terms, or distribute prohibited content without prior notice.`,
    ],
  },
  {
    id: "acceptable-use",
    icon: Shield,
    title: "6. Acceptable Use Policy",
    content: [`You agree not to use Drivya to:`],
    list: [
      "Store, distribute, or share content that is illegal, infringing, defamatory, obscene, or harmful (including malware, viruses, or phishing materials).",
      "Violate any intellectual property rights, privacy rights, or other rights of any third party.",
      "Attempt to gain unauthorized access to any part of the Service, other accounts, computer systems, or networks.",
      "Use automated scripts, bots, or crawlers to interact with the Service without prior written authorization.",
      "Resell, redistribute, or sublicense access to the Service without our express written consent.",
      "Circumvent storage limits, bandwidth quotas, or any technical restrictions enforced by the platform.",
      "Use the Service for cryptocurrency mining, file relay services, or any compute-intensive operations unrelated to personal or business file storage.",
    ],
    afterList: [
      `Violation of this policy may result in immediate account suspension or termination, at our sole discretion, with or without notice.`,
    ],
  },
  {
    id: "ip-ownership",
    icon: Scale,
    title: "7. Intellectual Property & Ownership",
    content: [
      `You retain full ownership of all files and content you upload to Drivya. We do not claim any intellectual property rights over your content. By uploading content, you grant Drivya a limited, non-exclusive license to store, process, transmit, and display your content solely for the purpose of providing the Service to you.`,
      `All rights, title, and interest in the Drivya platform — including its design, code, branding, trademarks, and proprietary technology — remain the exclusive property of Drivya. You may not copy, modify, reverse-engineer, or create derivative works of any part of the Service.`,
    ],
  },
  {
    id: "data-retention",
    icon: RefreshCw,
    title: "8. Data Retention & Deletion",
    content: [
      `Files you delete are moved to Trash, where they remain for a configurable retention period (default: 30 days, adjustable in settings to 5–90 days). After this period, trashed files are permanently deleted from our storage infrastructure, including all Cloudflare R2 replicas.`,
      `Upon account deletion, all associated files, directories, sharing links, and personal data are permanently purged within 30 days. Certain anonymized, aggregated data (e.g., usage statistics) may be retained for analytical purposes and cannot be traced back to individual users.`,
      `Deactivated accounts retain data for up to 90 days. After this period, the account and all associated data may be permanently deleted without additional notice.`,
    ],
  },
  {
    id: "liability",
    icon: AlertTriangle,
    title: "9. Limitation of Liability",
    content: [
      `TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, DRIVYA AND ITS DEVELOPER SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF DATA, PROFITS, REVENUE, OR BUSINESS OPPORTUNITIES, REGARDLESS OF THE CAUSE OF ACTION OR THEORY OF LIABILITY.`,
      `Our total aggregate liability for any claims arising from or relating to these Terms or the Service shall not exceed the total amount you have paid to Drivya in subscription fees during the twelve (12) months immediately preceding the event giving rise to the claim.`,
      `This limitation applies even if Drivya has been advised of the possibility of such damages and regardless of whether the remedy fails of its essential purpose.`,
    ],
  },
  {
    id: "termination",
    icon: Ban,
    title: "10. Termination",
    content: [
      `You may terminate your account at any time through the Settings page. Upon voluntary termination, your access to the Service will end immediately, and your data will be scheduled for permanent deletion in accordance with our data retention policy.`,
      `We reserve the right to suspend or terminate your account immediately and without prior notice if: (a) you violate these Terms; (b) your account is used for illegal activity; (c) continued provision of the Service to you would create legal or security risks for us or other users; or (d) your account is flagged for abuse by our automated systems or moderation team.`,
      `Upon termination by Drivya for cause, you are not entitled to any refund for unused subscription time. Sections 7 (Intellectual Property), 9 (Limitation of Liability), and 11 (Governing Law) survive termination.`,
    ],
  },
  {
    id: "governing-law",
    icon: Scale,
    title: "11. Governing Law & Dispute Resolution",
    content: [
      `These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any disputes arising from these Terms or the Service shall be subject to the exclusive jurisdiction of the courts located in New Delhi, India.`,
      `Before initiating any formal legal proceedings, you agree to first attempt to resolve disputes informally by contacting us at drivya.app@gmail.com. We will make good-faith efforts to resolve any issues within 30 days of receiving your notice.`,
    ],
  },
  {
    id: "contact",
    icon: Mail,
    title: "12. Contact Information",
    content: [
      `If you have any questions, concerns, or feedback regarding these Terms of Service, please contact us:`,
    ],
    contact: true,
  },
];

export default function TermsOfService() {
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
        <div className="absolute -top-40 left-1/3 w-[600px] h-[600px] rounded-full bg-[radial-gradient(closest-side,var(--ambient-blob-a),transparent)] opacity-15 blur-3xl" />
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
              / Terms of Service
            </span>
          </div>

          {/* Right: Compact Segmented Switcher & Theme Toggle */}
          <div className="flex items-center gap-3">
            <div className="flex items-center p-0.5 bg-muted/40 border border-border/20 rounded-full text-xs font-semibold">
              <span className="px-3 py-1 rounded-full bg-background text-foreground shadow-sm border border-border/30">
                Terms
              </span>
              <Link
                to="/privacy"
                className="px-3 py-1 rounded-full text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy
              </Link>
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
            Terms of Service
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
                          Questions? Reach out to us.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                       <a
                        href='mailto:aman9251813@gmail.com'
                          className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all shadow-glow"
                        >
                          aman9251813@gmail.com
                        </a>
                        <a
                          href="mailto:drivya.app@gmail.com"
                          className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all shadow-glow"
                        >
                          drivya.app@gmail.com
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
          <p>© {new Date().getFullYear()} Drivya </p>
          <div className="flex items-center gap-3">
            <Link to="/privacy" className="hover:text-foreground text-primary font-semibold">
              Privacy Policy →
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
