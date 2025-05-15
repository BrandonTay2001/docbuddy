'use client';

import { useRef } from 'react';

interface AudioPlayerProps {
  audioUrl: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl }) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  return (
    <div className="w-full">
      <audio 
        ref={audioRef}
        controls
        className="w-full outline-none"
        src={audioUrl}
        preload="metadata"
      >
        Your browser does not support the audio element.
      </audio>
    </div>
  );
};

export default AudioPlayer;
