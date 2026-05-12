import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/drivya/Navbar";
import { Hero } from "@/components/drivya/Hero";
import { SocialProof } from "@/components/drivya/SocialProof";
import { Features } from "@/components/drivya/Features";
import { Showcase } from "@/components/drivya/Showcase";
import { HowItWorks } from "@/components/drivya/HowItWorks";
import { Security } from "@/components/drivya/Security";
import { Pricing } from "@/components/drivya/Pricing";
import { Testimonials } from "@/components/drivya/Testimonials";
import { FAQ } from "@/components/drivya/FAQ";
import { CTA } from "@/components/drivya/CTA";
import { Footer } from "@/components/drivya/Footer";
import { MouseGlow } from "@/components/drivya/MouseGlow";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Drivya — Cloud storage for modern teams" },
      { name: "description", content: "Drivya is the fast, private and beautifully designed cloud storage built for creators, developers and teams. 10GB free." },
      { property: "og:title", content: "Drivya — Cloud storage for modern teams" },
      { property: "og:description", content: "Upload, organize and share at the speed of thought. End-to-end encrypted by default." },
    ],
  }),
});

function Index() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <MouseGlow />
      <Navbar />
      <Hero />
      <SocialProof />
      <Features />
      <Showcase />
      <HowItWorks />
      <Security />
      <Pricing />
      <Testimonials />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}
