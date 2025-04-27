import { useState, useEffect, useRef } from 'react';
import Button from './Button';

// Import type (only for TypeScript)
import type MicRecorderType from 'mic-recorder-to-mp3';

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

const AudioRecorder = ({
  onRecordingComplete,
  isRecording,
  onStartRecording,
  onStopRecording,
}: AudioRecorderProps) => {
  const [recordingTime, setRecordingTime] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recorderRef = useRef<MicRecorderType | null>(null);

  // Set mounted state and initialize recorder
  useEffect(() => {
    setIsMounted(true);
    
    if (typeof window !== 'undefined') {
      // Import and initialize the recorder only on client side
      import('mic-recorder-to-mp3').then((MicRecorderModule) => {
        const MicRecorder = MicRecorderModule.default;
        recorderRef.current = new MicRecorder({ 
          bitRate: 128,
          prefix: 'data:audio/mp3;base64,',
        });
      }).catch(error => {
        console.error("Failed to load mic-recorder module:", error);
      });
    }
    
    return () => {
      setIsMounted(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!isMounted) return;

    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordingTime(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isMounted]);

  // Handle starting the recording
  const handleStart = () => {
    if (!recorderRef.current) return;
    
    try {
      recorderRef.current.start()
        .then(() => {
          // Recording started
          onStartRecording();
        })
        .catch((error: Error) => {
          console.error('Error starting recording:', error);
        });
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  // Handle stopping the recording
  const handleStop = () => {
    if (!recorderRef.current) return;
    
    try {
      recorderRef.current.stop()
        .getMp3()
        .then(([, blob]: [ArrayBuffer, Blob]) => {
          // Use the blob directly from mic-recorder rather than creating a new one
          // This is more reliable as it's properly formatted by the recorder
          onRecordingComplete(blob);
          onStopRecording();
        })
        .catch((error: Error) => {
          console.error('Error stopping recording:', error);
          onStopRecording();
        });
    } catch (error) {
      console.error('Failed to stop recording:', error);
      onStopRecording();
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="w-full max-w-md p-6 border border-border rounded-md bg-background shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3>Session Recording</h3>
          {isRecording && isMounted && (
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse mr-2" />
              <span className="text-sm font-mono">{formatTime(recordingTime)}</span>
            </div>
          )}
        </div>
        
        <div className="flex justify-center mb-4">
          {isRecording ? (
            <Button 
              variant="secondary" 
              onClick={handleStop}
              className="flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect x="6" y="6" width="8" height="8" />
              </svg>
              End Session
            </Button>
          ) : (
            <Button 
              onClick={handleStart}
              className="flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <circle cx="10" cy="10" r="5" />
              </svg>
              Start Session
            </Button>
          )}
        </div>
        
        {isRecording && (
          <p className="text-sm text-center text-gray-500">
            Recording patient session. Click &quot;End Session&quot; when you&apos;re done.
          </p>
        )}
      </div>
    </div>
  );
};

export default AudioRecorder; 