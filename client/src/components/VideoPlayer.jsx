import { useState, useRef } from "react";

export default function VideoPlayer() {
  const [muted, setMuted] = useState(true);
  const [hovered, setHovered] = useState(false);
  const videoRef = useRef(null);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  return (
    <div className="min-h-screen  flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-4xl">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-neutral-500 mb-2">
            Getting Started
          </p>
          <h1 className="text-4xl  text-dark font-bold leading-tight tracking-tight">
            Setup & Demo
          </h1>
          <div className="mt-3 h-px w-16 bg-gradient-to-r from-white/40 to-transparent" />
        </div>

        {/* Video container */}
        <div
          className="relative group rounded-2xl overflow-hidden ring-1 ring-white/10 bg-black"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <video
            ref={videoRef}
            src="https://res.cloudinary.com/dmhykhefr/video/upload/v1778566879/0506_rkrccf.mp4"
            autoPlay
            loop
            muted
            playsInline
            controls
            className="w-full block"
          />

          {/* Mute/Unmute overlay button */}
          <button
            onClick={toggleMute}
            aria-label={muted ? "Unmute video" : "Mute video"}
            className={`
              absolute top-4 right-4 z-10
              flex items-center gap-2.5
              px-5 py-3
              rounded-full
              backdrop-blur-md
              border border-white/20
              text-white text-sm font-medium tracking-wide
              transition-all duration-300 ease-out
              ${hovered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"}
              ${muted
                ? "bg-white/10 hover:bg-white/20"
                : "bg-white/20 hover:bg-white/30"
              }
            `}
          >
            {muted ? (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
                <span>Unmute</span>
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
                <span>Mute</span>
              </>
            )}
          </button>

          {/* Always-visible mute indicator (bottom corner) */}
          <button
            onClick={toggleMute}
            aria-label={muted ? "Unmute video" : "Mute video"}
            className={`
              absolute bottom-16 right-4 z-10
              w-12 h-12
              flex items-center justify-center
              rounded-full
              backdrop-blur-md
              border border-white/20
              text-white
              transition-all duration-200
              ${muted ? "bg-black/50 hover:bg-black/70" : "bg-white/20 hover:bg-white/30"}
            `}
          >
            {muted ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            )}
          </button>
        </div>

        {/* Footer label */}
        <div className="mt-5 flex items-center gap-2 text-neutral-600 text-xs tracking-wide">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Video autoplays muted — click the button to enable audio
        </div>
      </div>
    </div>
  );
}