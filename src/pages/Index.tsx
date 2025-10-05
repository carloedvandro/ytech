import { Hero } from "@/components/Hero";
import { Plans } from "@/components/Plans";
import { HowToJoin } from "@/components/HowToJoin";
import { HowItWorks } from "@/components/HowItWorks";
import { MLMSection } from "@/components/MLMSection";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <main className="min-h-screen">
      <Hero />
      <Plans />
      <HowToJoin />
      <HowItWorks />
      <MLMSection />
      <Footer />
    </main>
  );
};

export default Index;
