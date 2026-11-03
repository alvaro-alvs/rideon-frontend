import { PublicHeader } from "@/app/components/public-header";
import { HeroSection } from "@/app/components/hero-section";
import { StatsSection } from "@/app/components/landing/stats-section";
import { FeaturesSection } from "@/app/components/landing/features-section";
import { PlatformSection } from "@/app/components/landing/platform-section";
import { HowItWorksSection } from "@/app/components/landing/how-it-works-section";
import { CTASection } from "@/app/components/landing/cta-section";
import { FooterSection } from "@/app/components/landing/footer-section";

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground antialiased selection:bg-primary selection:text-white">
      <PublicHeader />
      <main>
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <PlatformSection />
        <HowItWorksSection />
        <CTASection />
      </main>
      <FooterSection />
    </div>
  );
}
