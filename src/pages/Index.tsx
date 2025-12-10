import { Hero } from "@/components/Hero";
import { Plans } from "@/components/Plans";
import { HowToJoin } from "@/components/HowToJoin";
import { HowItWorks } from "@/components/HowItWorks";
import { MMNSection } from "@/components/MMNSection";
import { Footer } from "@/components/Footer";
import { VideoBackground } from "@/components/ui/video-background";

const VIDEO_URL = "https://fkdaaxaybuynohmnatdv.supabase.co/storage/v1/object/public/videos//videooficialytech.mp4";

const Index = () => {
  return (
    <>
      {/* Fixed Video Background */}
      <VideoBackground videoUrl={VIDEO_URL} overlayOpacity={65} />
      
      <main className="relative min-h-screen z-10">
        <Hero />
        <Plans />
        <HowToJoin />
        <HowItWorks />
        <MMNSection />
        <Footer />
      </main>
    </>
  );
};

export default Index;
