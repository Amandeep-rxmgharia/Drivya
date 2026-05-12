import { Section, SectionHeading } from "./Section";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  {
    q: "Is my data really private?",
    a: "Yes. Drivya uses zero-knowledge end-to-end encryption — only you hold the keys, and we cannot read your files.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. Plans are month-to-month and you can downgrade or cancel from your billing settings whenever you want.",
  },
  {
    q: "Do you offer a free plan?",
    a: "Yes — the Free plan includes 10 GB of storage, basic sharing, and sync across two devices. No credit card required.",
  },
  {
    q: "Which platforms are supported?",
    a: "Drivya is available on macOS, Windows, Linux, iOS, Android and the web. Files stay in sync across every device.",
  },
  {
    q: "How fast are uploads?",
    a: "We use parallelized chunked transfers over QUIC, so most users see 5–10x faster uploads compared to legacy cloud storage.",
  },
  {
    q: "Do you support team accounts?",
    a: "Yes. The Team plan includes SSO, SCIM provisioning, audit logs and centralized admin controls.",
  },
];

export function FAQ() {
  return (
    <Section id="faq">
      <SectionHeading eyebrow="FAQ" title="Questions, answered." />
      <div className="mt-12 max-w-3xl mx-auto">
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((f, i) => (
            <AccordionItem key={f.q} value={`item-${i}`} className="glass rounded-2xl px-6 border-0">
              <AccordionTrigger className="text-left font-medium hover:no-underline">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Section>
  );
}
