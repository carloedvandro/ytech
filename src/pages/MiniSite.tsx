import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Hero } from "@/components/Hero";
import { Plans } from "@/components/Plans";
import { HowToJoin } from "@/components/HowToJoin";
import { HowItWorks } from "@/components/HowItWorks";
import { MMNSection } from "@/components/MMNSection";
import { MiniSiteCTA } from "@/components/MiniSiteCTA";
import { Footer } from "@/components/Footer";
import { VideoBackground } from "@/components/ui/video-background";
import { Loader2 } from "lucide-react";

const VIDEO_URL = "https://fkdaaxaybuynohmnatdv.supabase.co/storage/v1/object/public/videos//videooficialytech.mp4";

interface ReferrerData {
  id: string;
  full_name: string;
  username: string;
  status: string;
}

const MiniSite = () => {
  const { username } = useParams<{ username: string }>();
  const [referrer, setReferrer] = useState<ReferrerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const loadReferrer = async () => {
      if (!username) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, username, status')
          .eq('username', username)
          .eq('status', 'active')
          .is('deleted_at', null)
          .single();

        if (error || !data) {
          console.error('Referrer not found:', error);
          setNotFound(true);
        } else {
          setReferrer(data as ReferrerData);
        }
      } catch (err) {
        console.error('Error loading referrer:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    loadReferrer();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !referrer) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      {/* Fixed Video Background */}
      <VideoBackground videoUrl={VIDEO_URL} overlayOpacity={65} />
      
      <main className="relative min-h-screen z-10">
        <div className="bg-gradient-to-br from-primary/5 via-transparent to-primary/5 py-4 border-b border-primary/20">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm text-muted-foreground">
              Você foi convidado por{" "}
              <span className="font-semibold text-primary">{referrer.full_name}</span>
            </p>
          </div>
        </div>
        
        <Hero referrerUsername={referrer.username} />
        <Plans referrerUsername={referrer.username} />
        <HowToJoin />
        <HowItWorks />
        <MMNSection />
        <MiniSiteCTA referrerUsername={referrer.username} />
        <Footer />
      </main>
    </>
  );
};

export default MiniSite;