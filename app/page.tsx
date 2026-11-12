import { PublicHeader } from "@/app/components/public-header";
import { HeroSection } from "@/app/components/hero-section";
import { PlatformSection } from "@/app/components/landing/platform-section";
import { HowItWorksSection } from "@/app/components/landing/how-it-works-section";
import { FeaturesSection } from "@/app/components/landing/features-section";
import { StatsSection } from "@/app/components/landing/stats-section";
import { CTASection } from "@/app/components/landing/cta-section";
import { FooterSection } from "@/app/components/landing/footer-section";

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground antialiased selection:bg-primary selection:text-white">
      <PublicHeader />
      <main>
        <HeroSection />
        <PlatformSection />
        <HowItWorksSection />
        <FeaturesSection />
        <StatsSection />
        <CTASection />
      </main>
      <FooterSection />
    </div>
  );
}
