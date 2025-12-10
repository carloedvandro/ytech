import { useState, useRef, useEffect } from "react";

interface VideoBackgroundProps {
  videoUrl: string;
  posterUrl?: string;
  overlayOpacity?: number;
  className?: string;
}

export const VideoBackground = ({
  videoUrl,
  posterUrl = "/og-image.jpg",
  overlayOpacity = 60,
  className = "",
}: VideoBackgroundProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {
        // Autoplay might be blocked, that's okay - poster will show
      });
    }
  }, []);

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Video */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        poster={posterUrl}
        onLoadedData={() => setIsLoaded(true)}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
      >
        <source src={videoUrl} type="video/mp4" />
      </video>

      {/* Poster fallback while loading */}
      {!isLoaded && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${posterUrl})` }}
        />
      )}

      {/* Dark overlay for text readability */}
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: overlayOpacity / 100 }}
      />
    </div>
  );
};
