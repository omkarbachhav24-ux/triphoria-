import React, { useEffect, useState, useRef } from 'react';
import { ExternalLink } from 'lucide-react';

const InstagramIcon = ({ size = 20, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

export const loadInstagramSDK = () => {
  return new Promise((resolve, reject) => {
    if (window.instgrm && window.instgrm.Embeds) {
      resolve(window.instgrm);
      return;
    }

    const existingScript = document.getElementById('instagram-embed-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        if (window.instgrm) resolve(window.instgrm);
        else reject(new Error('Instagram SDK not available'));
      });
      existingScript.addEventListener('error', (err) => reject(err));
      return;
    }

    const script = document.createElement('script');
    script.id = 'instagram-embed-script';
    script.src = 'https://www.instagram.com/embed.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.instgrm) {
        resolve(window.instgrm);
      } else {
        reject(new Error('Instagram SDK window.instgrm missing'));
      }
    };
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
};

export const InstagramEmbed = ({ url, title = 'Instagram Reel' }) => {
  const [status, setStatus] = useState('loading'); // 'loading' | 'loaded' | 'error'
  const containerRef = useRef(null);

  // Normalize URL to standard permalink format
  const cleanUrl = url.endsWith('/') ? url : `${url}/`;

  useEffect(() => {
    let isMounted = true;

    const initEmbed = async () => {
      try {
        await loadInstagramSDK();
        if (!isMounted) return;

        if (window.instgrm?.Embeds?.process && containerRef.current) {
          window.instgrm.Embeds.process(containerRef.current);
          setStatus('loaded');
        } else {
          setStatus('error');
        }
      } catch (err) {
        console.warn('[INSTAGRAM EMBED] SDK initialization or embed processing failed:', err);
        if (isMounted) setStatus('error');
      }
    };

    initEmbed();

    // Verification timer: if frame loading is blocked by network or adblocker after 5s
    const timer = setTimeout(() => {
      if (isMounted && containerRef.current) {
        const iframe = containerRef.current.querySelector('iframe');
        if (!iframe && status === 'loading') {
          setStatus('error');
        }
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [cleanUrl]);

  if (status === 'error') {
    return (
      <div className="w-full aspect-video bg-[#17181B] rounded-xl flex flex-col items-center justify-center p-6 text-center text-white border border-white/10 space-y-3">
        <div className="w-12 h-12 rounded-full bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
          <InstagramIcon size={24} />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-white">Instagram Reel unavailable</h4>
          <p className="text-xs text-[#A1A1A6] max-w-sm">
            The official Instagram embed player could not be initialized in this browser frame.
          </p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_15px_rgba(236,72,153,0.3)] hover:scale-[1.02]"
        >
          <span>Watch on Instagram</span>
          <ExternalLink size={13} />
        </a>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full flex justify-center items-center overflow-hidden min-h-[350px] max-h-[600px] bg-black/40 rounded-xl p-2">
      <blockquote
        className="instagram-media"
        data-instgrm-captioned
        data-instgrm-permalink={cleanUrl}
        data-instgrm-version="14"
        style={{
          background: '#0B0C0F',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          boxShadow: 'none',
          margin: '0 auto',
          maxWidth: '540px',
          minWidth: '280px',
          padding: '0',
          width: '100%'
        }}
      >
        <div style={{ padding: '16px' }}>
          <a
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#0B0C0F',
              lineHeight: '1.4',
              padding: '8px',
              textAlign: 'center',
              textDecoration: 'none',
              width: '100%',
              display: 'block',
              color: '#00CDB8',
              fontSize: '13px',
              fontFamily: 'monospace'
            }}
          >
            Loading official Instagram Reel...
          </a>
        </div>
      </blockquote>
    </div>
  );
};
