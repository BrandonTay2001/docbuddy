'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { analyzeMedicalTranscript } from '@/lib/openai';
import { generateMedicalDocument } from '@/lib/pdf';
import AudioRecorder from '@/components/AudioRecorder';
import { transcribeAudioElevenlabs } from '@/lib/elevenlabs';

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
      // Step 1: Transcribe the audio
      const transcriptText = await transcribeAudioElevenlabs(audioBlob);
      setTranscript(transcriptText);
      
      // Step 2: Analyze the transcript for diagnosis and prescription suggestions
      const analysis = await analyzeMedicalTranscript(transcriptText);
      // also set the summary
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
      
      const documentData = {
        patientName,
        patientAge,
        date: new Date().toLocaleDateString(),
        summary,
        diagnosis: finalDiagnosis,
        prescription: finalPrescription,
        doctorNotes,
      };
      
      const htmlBytes = await generateMedicalDocument(documentData);
      
      // Only run in browser context
      if (isMounted) {
        // Convert the HTML bytes to a blob and create a download link
        const blob = new Blob([htmlBytes], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${patientName.replace(/\s+/g, '_')}_medical_record.html`;
        
        // Optional: Open the document in a new tab
        window.open(url, '_blank');
        
        // Cleanup the URL object
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 100);
      }
    } catch (error) {
      console.error('Error generating document:', error);
      setError('An error occurred while generating the document. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

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
            <Link href="/dashboard">
              <Button variant="secondary">Back to Dashboard</Button>
            </Link>
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
            <div className="mb-6 p-6 border border-border rounded-md bg-background">
              <h2 className="text-xl font-bold mb-4">Transcript</h2>
              <div className="p-4 bg-input rounded-md max-h-48 overflow-y-auto">
                <p className="whitespace-pre-wrap">{transcript}</p>
              </div>
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
                onClick={handleGenerateDocument}
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