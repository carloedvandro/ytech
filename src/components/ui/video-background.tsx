import { useRef, useEffect } from "react";

interface VideoBackgroundProps {
  videoUrl: string;
  overlayOpacity?: number;
  className?: string;
}

export const VideoBackground = ({
  videoUrl,
  overlayOpacity = 60,
  className = "",
}: VideoBackgroundProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {
        // Autoplay might be blocked
      });
    }
  }, []);

  return (
    <div className={`fixed inset-0 overflow-hidden -z-10 ${className}`}>
      {/* Video */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src={videoUrl} type="video/mp4" />
      </video>

      {/* Dark overlay for text readability */}
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: overlayOpacity / 100 }}
      />
    </div>
  );
};
