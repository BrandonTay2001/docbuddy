'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Button from '@/components/Button';
import Input from '@/components/Input';
import AudioRecorder from '@/components/AudioRecorder';
import { transcribeAudioElevenlabs } from '@/lib/elevenlabs';
import { getUserProfile } from '@/lib/auth';

export default function NewSession() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [suggestedDiagnosis, setSuggestedDiagnosis] = useState('');
  const [summary, setSummary] = useState('');
  const [suggestedPrescription, setSuggestedPrescription] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [finalDiagnosis, setFinalDiagnosis] = useState('');
  const [finalPrescription, setFinalPrescription] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [error, setError] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  // const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);

  // Use refs to store the DOM elements once they're available
  const recorderMicRef = useRef<HTMLElement | null>(null);
  const recorderStopRef = useRef<HTMLElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Set up DOM references after mount
  useEffect(() => {
    setIsMounted(true);
    
    // Set a timeout to ensure the elements are in the DOM
    timeoutRef.current = setTimeout(() => {
      recorderMicRef.current = document.querySelector('.audio-recorder-mic') as HTMLElement;
      recorderStopRef.current = document.querySelector('.audio-recorder-stop') as HTMLElement;
    }, 1000);
    
    return () => {
      setIsMounted(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleStartRecording = () => {
    setIsRecording(true);
    
    // Try to find the element if it wasn't found initially
    if (!recorderMicRef.current) {
      recorderMicRef.current = document.querySelector('.audio-recorder-mic') as HTMLElement;
    }
    
    // Only access DOM when mounted
    if (isMounted && recorderMicRef.current) {
      recorderMicRef.current.click();
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    
    // Try to find the element if it wasn't found initially
    if (!recorderStopRef.current) {
      recorderStopRef.current = document.querySelector('.audio-recorder-stop') as HTMLElement;
    }
    
    // Only access DOM when mounted
    if (isMounted && recorderStopRef.current) {
      recorderStopRef.current.click();
    }
  };

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setError('');
    
    try {
      // Store the audio blob and create a URL for playback
      // setAudioBlob(audioBlob);
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      
      // Step 1: Transcribe the audio
      const transcriptText = await transcribeAudioElevenlabs(audioBlob);
      setTranscript(transcriptText);
      
      // Step 2: Analyze the transcript for diagnosis and prescription suggestions
      const user = await getUserProfile();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Use the API route for transcript analysis
      const searchParams = new URLSearchParams({
        userId: user.id,
        transcript: transcriptText
      });
      
      const analysisResponse = await fetch(`/api/sessions?${searchParams.toString()}`, {
        method: 'OPTIONS'
      });
      
      if (!analysisResponse.ok) {
        throw new Error('Failed to analyze transcript');
      }
      
      const { analysis } = await analysisResponse.json();
      
      // Set the analysis results
      setSummary(analysis.summary);
      setSuggestedDiagnosis(analysis.suggestedDiagnosis);
      setSuggestedPrescription(analysis.suggestedPrescription);
      
      // Pre-fill the final diagnosis and prescription with suggestions
      setFinalDiagnosis(analysis.suggestedDiagnosis);
      setFinalPrescription(analysis.suggestedPrescription);
      
      setIsComplete(true);
    } catch (error) {
      console.error('Error processing recording:', error);
      setError('An error occurred while processing the recording. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateDocument = async () => {
    if (!patientName || !patientAge || !finalDiagnosis || !finalPrescription) {
      setError('Please fill out all required fields.');
      return;
    }
    
    try {
      setIsProcessing(true);

      const user = await getUserProfile();
      if (!user) {
        throw new Error('User not found');
      }
      
      // Save session data and get document URL
      const sessionResponse = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          patientName,
          patientAge,
          transcript,
          summary,
          suggestedDiagnosis,
          suggestedPrescription,
          finalDiagnosis,
          finalPrescription,
          doctorNotes,
        }),
      });

      if (!sessionResponse.ok) {
        throw new Error('Failed to save session data');
      }

      const { documentUrl } = await sessionResponse.json();
      
      // Open the document in a new tab
      if (isMounted && documentUrl) {
        window.open(documentUrl, '_blank');
      }
    } catch (error) {
      console.error('Error generating document:', error);
      setError('An error occurred while generating the document. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Cleanup audio URL when component unmounts
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Show a simple loading state during SSR
  if (!isMounted) {
    return <div className="min-h-screen" />;
  }

  return (
    <main className="min-h-screen p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">New Patient Session</h1>
            <div className="flex gap-4">
              <Button 
                variant="secondary"
                onClick={() => window.open('/session/new', '_blank')}
              >
                Parallel Session
              </Button>
              <Link href="/dashboard">
                <Button variant="secondary">Back to Dashboard</Button>
              </Link>
            </div>
          </div>
        </header>
        
        {error && (
          <div className="mb-6 p-3 text-sm bg-red-100 text-red-800 rounded-md">
            {error}
          </div>
        )}
        
        {isProcessing && (
          <div className="flex justify-center items-center p-12">
            <div className="animate-spin h-8 w-8 border-2 border-accent rounded-full border-t-transparent mr-2" />
            <p>Processing...</p>
          </div>
        )}
        
        {!isComplete ? (
          <>
            <div className="mb-8">
              <p className="mb-4">
                Start recording your patient session. When you&apos;re done, click &quot;End Session&quot; to transcribe
                and analyze the conversation.
              </p>
              
              <AudioRecorder
                onRecordingComplete={handleRecordingComplete}
                isRecording={isRecording}
                onStartRecording={handleStartRecording}
                onStopRecording={handleStopRecording}
              />
            </div>
          </>
        ) : (
          <>
            {audioUrl && (
              <div className="mb-6 p-6 rounded-md bg-background">
                <audio 
                  controls 
                  className="w-full"
                  src={audioUrl}
                >
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}

            <div className="mb-6 relative">
              <div className={`p-6 border border-border rounded-md bg-background ${!showTranscript ? 'blur-sm' : ''}`}>
                <h2 className="text-xl font-bold mb-4">Transcript</h2>
                <div className="p-4 bg-input rounded-md max-h-48 overflow-y-auto">
                  <p className="whitespace-pre-wrap">{transcript}</p>
                </div>  
              </div>
              
              {!showTranscript && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button
                    variant="secondary"
                    onClick={() => setShowTranscript(true)}
                  >
                    Show Transcript
                  </Button>
                </div>
              )}
            </div>

            <div className="mb-6 p-6 border border-border rounded-md bg-background">
              <h2 className="text-xl font-bold mb-4">Editable Summary</h2>
              <div className="mb-2">
                <textarea
                  id="summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="input w-full min-h-[100px] p-3 whitespace-pre-wrap"
                  placeholder="Edit summary"
                />
              </div>
            </div>
            
            <div className="mb-8 p-6 border border-border rounded-md bg-background">
              <h2 className="text-xl font-bold mb-4">AI Suggestions</h2>
              
              <div className="mb-4">
                <h3 className="font-medium mb-2">Suggested Diagnosis</h3>
                <div className="p-3 bg-input rounded-md max-h-32 overflow-y-auto">
                  <p className="whitespace-pre-wrap">{suggestedDiagnosis}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Suggested Prescription</h3>
                <div className="p-3 bg-input rounded-md max-h-32 overflow-y-auto">
                  <p className="whitespace-pre-wrap">{suggestedPrescription}</p>
                </div>
              </div>
            </div>
            
            <div className="mb-8 p-6 border border-border rounded-md bg-background">
              <h2 className="text-xl font-bold mb-4">Patient Information</h2>
              
              <Input
                label="Patient Name"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="John Doe"
                required
                fullWidth
              />
              
              <Input
                label="Patient Age"
                value={patientAge}
                onChange={(e) => setPatientAge(e.target.value)}
                placeholder="45"
                required
                fullWidth
              />
            </div>
            
            <div className="mb-8 p-6 border border-border rounded-md bg-background">
              <h2 className="text-xl font-bold mb-4">Doctor&apos;s Assessment</h2>
              
              <div className="mb-4">
                <label htmlFor="final-diagnosis" className="block mb-2 text-sm font-medium">
                  Final Diagnosis
                </label>
                <textarea
                  id="final-diagnosis"
                  value={finalDiagnosis}
                  onChange={(e) => setFinalDiagnosis(e.target.value)}
                  className="input w-full min-h-32"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="final-prescription" className="block mb-2 text-sm font-medium">
                  Final Prescription
                </label>
                <textarea
                  id="final-prescription"
                  value={finalPrescription}
                  onChange={(e) => setFinalPrescription(e.target.value)}
                  className="input w-full min-h-32"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="doctor-notes" className="block mb-2 text-sm font-medium">
                  Additional Notes (Optional)
                </label>
                <textarea
                  id="doctor-notes"
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  className="input w-full min-h-24"
                  placeholder="Add any additional notes or observations"
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button 
                onClick={async () => {
                  await handleGenerateDocument();
                  window.location.href = '/dashboard';
                }}
                disabled={isProcessing}
              >
                Generate Document
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}