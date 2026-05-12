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

export default function App() {
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
