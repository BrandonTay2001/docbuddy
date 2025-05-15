'use client';

import { useEffect, useRef, useState } from 'react';

interface WaveVisualizerProps {
  audioUrl: string;
}

const WaveVisualizer: React.FC<WaveVisualizerProps> = ({ audioUrl }) => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!audioUrl || !waveformRef.current) return;
    
    // Clean up any existing instance
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }
    
    // Dynamic import of wavesurfer.js to keep it client-side only
    import('wavesurfer.js').then(({ default: WaveSurfer }) => {
      const wavesurfer = WaveSurfer.create({
        container: waveformRef.current!,
        waveColor: '#8e44ad',
        progressColor: '#6366f1',
        cursorColor: '#4f46e5',
        barWidth: 3,
        barGap: 1,
        barRadius: 3,
        height: 80,
        normalize: true,
      });

      wavesurfer.load(audioUrl);
      
      wavesurfer.on('ready', () => {
        setIsLoaded(true);
        wavesurferRef.current = wavesurfer;
      });
      
      wavesurfer.on('play', () => setIsPlaying(true));
      wavesurfer.on('pause', () => setIsPlaying(false));
      wavesurfer.on('finish', () => setIsPlaying(false));
    }).catch(err => {
      console.error('Error loading WaveSurfer:', err);
    });
    
    // Cleanup function
    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
  }, [audioUrl]);

  const togglePlayback = () => {
    if (!wavesurferRef.current || !isLoaded) return;
    
    if (isPlaying) {
      wavesurferRef.current.pause();
    } else {
      wavesurferRef.current.play();
    }
  };

  return (
    <div className="w-full">
      <div className="relative bg-background/5 p-4 rounded-md border border-border">
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-md">
            <div className="animate-spin h-8 w-8 border-2 border-accent rounded-full border-t-transparent"></div>
          </div>
        )}
        
        <div 
          ref={waveformRef} 
          className="w-full rounded-md"
        />
        
        {isLoaded && (
          <div className="flex justify-center mt-3">
            <button 
              className="flex items-center gap-2 px-4 py-2 bg-background hover:bg-accent/10 rounded-md transition-colors"
              onClick={togglePlayback}
            >
              {isPlaying ? (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" />
                  </svg>
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 5v10l8-5-8-5z" />
                  </svg>
                  <span>Play</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaveVisualizer;
