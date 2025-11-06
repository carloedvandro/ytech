import { Hero } from "@/components/Hero";
import { Plans } from "@/components/Plans";
import { HowToJoin } from "@/components/HowToJoin";
import { HowItWorks } from "@/components/HowItWorks";
import { MMNSection } from "@/components/MMNSection";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <main className="min-h-screen">
      <Hero />
      <Plans />
      <HowToJoin />
      <HowItWorks />
      <MMNSection />
      <Footer />
    </main>
  );
};

export default Index;
