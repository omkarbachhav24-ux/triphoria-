import React, { useState } from 'react';
import { ExternalLink, AlertCircle, RefreshCw } from 'lucide-react';
import { InstagramEmbed } from './InstagramEmbed';

export const getAutoThumbnail = (url = '', fallbackThumbnail = '') => {
  if (fallbackThumbnail && !fallbackThumbnail.includes('unsplash.com/photo-1509198397868')) {
    return fallbackThumbnail;
  }
  if (!url) return 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&q=80&w=1000';

  // 1. YouTube Thumbnail
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const ytMatch = url.match(youtubeRegex);
  if (ytMatch && ytMatch[1]) {
    return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  }

  // 2. Vimeo Thumbnail
  const vimeoRegex = /(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)([0-9]+)/i;
  const vimMatch = url.match(vimeoRegex);
  if (vimMatch && vimMatch[1]) {
    return `https://vumbnail.com/${vimMatch[1]}.jpg`;
  }

  // 3. Instagram Content Placeholder
  if (url.includes('instagram.com')) {
    return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1000';
  }

  // 4. Studio Cinematic Poster Fallback
  return fallbackThumbnail || 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&q=80&w=1000';
};

export const extractVideoEmbed = (url = '') => {
  if (!url) return { type: 'unknown', url: '' };

  // 1. YouTube Matchers
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const ytMatch = url.match(youtubeRegex);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      videoId: ytMatch[1],
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&rel=0&modestbranding=1`
    };
  }

  // 2. Vimeo Matchers
  const vimeoRegex = /(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)([0-9]+)/i;
  const vimMatch = url.match(vimeoRegex);
  if (vimMatch && vimMatch[1]) {
    return {
      type: 'vimeo',
      videoId: vimMatch[1],
      embedUrl: `https://player.vimeo.com/video/${vimMatch[1]}?autoplay=1&badge=0`
    };
  }

  // 3. Instagram Matchers
  if (url.includes('instagram.com')) {
    return {
      type: 'instagram',
      url: url
    };
  }

  // 4. Google Drive Matchers
  const driveFileRegex = /drive\.google\.com\/file\/d\/([^/?#&]+)/i;
  const driveMatch = url.match(driveFileRegex);
  if (driveMatch && driveMatch[1]) {
    return {
      type: 'google_drive',
      embedUrl: `https://drive.google.com/file/d/${driveMatch[1]}/preview`,
      url: url
    };
  }

  // 5. Direct Video Stream (MP4, WebM, MOV, or storage URL)
  return {
    type: 'direct',
    url: url
  };
};

export const VideoPlayer = ({ 
  src = '', 
  playbackUrl = '',
  socialUrl = '',
  socialProvider = 'none',
  poster = '', 
  title = '', 
  aspectRatio = '16:9',
  autoPlay = true, 
  muted = true,
  loop = true,
  className = ""
}) => {
  const [hasError, setHasError] = useState(false);

  // Active Playback Source (TRIPHORIA native video playback asset)
  const activePlaybackSrc = playbackUrl || src;

  // Derive Aspect Ratio Class & Frame Sizing
  const getAspectRatioClasses = (ratio) => {
    switch (ratio) {
      case '9:16':
        return 'aspect-[9/16] max-w-[360px] mx-auto';
      case '1:1':
        return 'aspect-square max-w-[480px] mx-auto';
      case '4:5':
        return 'aspect-[4/5] max-w-[420px] mx-auto';
      case '16:9':
      default:
        return 'aspect-[16/9] w-full';
    }
  };

  const frameClass = getAspectRatioClasses(aspectRatio);

  // 1. If direct playback URL or HTML5 video asset exists (and hasn't errored), render native TRIPHORIA player
  if (activePlaybackSrc && !hasError && !activePlaybackSrc.includes('instagram.com')) {
    const parsedPlayback = extractVideoEmbed(activePlaybackSrc);

    // If active playback source is an embeddable iframe provider (YouTube / Vimeo / Drive)
    if (parsedPlayback.type === 'youtube') {
      return (
        <div className={`w-full bg-black rounded-xl overflow-hidden relative ${frameClass}`}>
          <iframe
            src={parsedPlayback.embedUrl}
            title={title || "YouTube Video Stream"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full border-0"
            onError={() => setHasError(true)}
          />
          {socialUrl && (
            <a
              href={socialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-3 right-3 z-20 text-[11px] font-mono bg-black/80 hover:bg-black text-white backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 flex items-center gap-1.5 cursor-pointer transition-all shadow-xl hover:scale-105"
            >
              <span>View Source</span>
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      );
    }

    if (parsedPlayback.type === 'vimeo') {
      return (
        <div className={`w-full bg-black rounded-xl overflow-hidden relative ${frameClass}`}>
          <iframe
            src={parsedPlayback.embedUrl}
            title={title || "Vimeo Video Stream"}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
            onError={() => setHasError(true)}
          />
          {socialUrl && (
            <a
              href={socialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-3 right-3 z-20 text-[11px] font-mono bg-black/80 hover:bg-black text-white backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 flex items-center gap-1.5 cursor-pointer transition-all shadow-xl hover:scale-105"
            >
              <span>View Source</span>
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      );
    }

    // Direct Native HTML5 Video Stream
    return (
      <div className={`w-full bg-black rounded-xl overflow-hidden relative shadow-2xl ${frameClass} ${className}`}>
        <video
          src={activePlaybackSrc}
          poster={poster}
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          playsInline
          controls
          preload="metadata"
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
        />

        {/* View on Instagram / Social Button Overlay */}
        {socialUrl && (
          <a
            href={socialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-3 right-3 z-20 text-[11px] font-mono bg-black/75 hover:bg-black/95 text-white backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 flex items-center gap-1.5 cursor-pointer transition-all shadow-xl hover:scale-105"
          >
            <span>View on {socialProvider === 'instagram' ? 'Instagram' : socialProvider === 'youtube' ? 'YouTube' : 'Social'} ↗</span>
          </a>
        )}
      </div>
    );
  }

  // 2. If no direct playback URL is present, or if direct playback errored, fall back to social URL / official embed
  if (socialUrl || activePlaybackSrc?.includes('instagram.com')) {
    const targetSocialUrl = socialUrl || activePlaybackSrc;
    const parsedSocial = extractVideoEmbed(targetSocialUrl);

    if (parsedSocial.type === 'instagram') {
      return (
        <div className="relative w-full">
          <InstagramEmbed url={targetSocialUrl} title={title} />
          {socialUrl && (
            <div className="mt-2 text-center">
              <a
                href={socialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-mono text-[#00CDB8] hover:underline"
              >
                <span>View on Instagram</span>
                <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>
      );
    }
  }

  // 3. Error / Stream Unavailable Fallback Card
  return (
    <div className={`w-full bg-[#17181B] rounded-xl flex flex-col items-center justify-center p-6 text-center text-white space-y-3 border border-white/10 relative overflow-hidden ${frameClass}`}>
      {poster && (
        <img 
          src={poster} 
          alt={title || "Video thumbnail"} 
          className="absolute inset-0 w-full h-full object-cover opacity-20 filter blur-sm"
        />
      )}
      <div className="relative z-10 space-y-3 flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <AlertCircle size={24} />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-white">Media Playback Asset Unavailable</h4>
          <p className="text-xs text-[#A1A1A6] max-w-sm leading-relaxed">
            No direct video playback asset found or stream connection was restricted.
          </p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          {socialUrl && (
            <a
              href={socialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono bg-[#00CDB8] text-[#111111] hover:bg-[#00E6CE] px-4 py-2 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_15px_rgba(0,205,184,0.2)]"
            >
              <span>View on Instagram ↗</span>
            </a>
          )}
          <button
            onClick={() => setHasError(false)}
            className="text-xs font-mono bg-white/[0.05] hover:bg-white/10 text-white px-3.5 py-2 rounded-lg border border-white/10 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RefreshCw size={12} />
            <span>Retry</span>
          </button>
        </div>
      </div>
    </div>
  );
};
