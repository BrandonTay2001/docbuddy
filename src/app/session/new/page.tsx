'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Button from '@/components/Button';
import Input from '@/components/Input';
import AudioRecorder from '@/components/AudioRecorder';
import AudioPlayer from '@/components/AudioPlayer';
import { transcribeAudioElevenlabs } from '@/lib/elevenlabs';
import { getUserProfile } from '@/lib/auth';
import { languageOptions } from '@/lib/languageOptions';

// Step enum to track current step in the flow
enum Step {
  RECORD = 0,
  REVIEW = 1,
  COMPLETE = 2
}

export default function NewSession() {
  // Basic state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
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
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>(Step.RECORD);
  
  // Additional state for assessment
  const [examinationResults, setExaminationResults] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderMicRef = useRef<HTMLElement | null>(null);
  const recorderStopRef = useRef<HTMLElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const dropAreaRef = useRef<HTMLDivElement>(null);

  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (isUploading || isProcessing) return;
    
    const files = e.dataTransfer.files;
    if (files.length) {
      handleFile(files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (!file) return;
    
    setIsUploading(true);
    setError('');
    
    try {
      if (!file.type.startsWith('audio/')) {
        throw new Error('Please upload an audio file (mp3, wav, etc.)');
      }
      
      if (file.size > 30 * 1024 * 1024) {
        throw new Error('File size exceeds 30MB limit');
      }
      
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      
      // Move to the review step instead of processing immediately
      setCurrentStep(Step.REVIEW);
      
    } catch (error: unknown) {
      console.error('Error uploading file:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while processing the audio file.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    setIsMounted(true);
    
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
    
    if (!recorderMicRef.current) {
      recorderMicRef.current = document.querySelector('.audio-recorder-mic') as HTMLElement;
    }
    
    if (isMounted && recorderMicRef.current) {
      recorderMicRef.current.click();
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    
    if (!recorderStopRef.current) {
      recorderStopRef.current = document.querySelector('.audio-recorder-stop') as HTMLElement;
    }
    
    if (isMounted && recorderStopRef.current) {
      recorderStopRef.current.click();
    }
  };

  const handlePauseRecording = async (audioBlob: Blob) => {
    try {
      
      // Don't set isProcessing to true as it would show loading indicator
      setError('');

      const user = await getUserProfile();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Convert blob to base64
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to convert audio to base64'));
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(audioBlob);
      });

      // Save or update draft without redirecting
      const endpoint = `/api/drafts${currentDraftId ? `/${currentDraftId}` : ''}`;
      const response = await fetch(endpoint, {
        method: currentDraftId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          audioBlob: base64Audio
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save draft');
      }

      const data = await response.json();
      if (!currentDraftId) {
        setCurrentDraftId(data.draftId);
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      setError('An error occurred while saving the draft. Please try again.');
    }
  };
  
  // Add new resume handler
  const handleResumeRecording = () => {
    // No need to do anything else - just update UI state
  };

  const handleRecordingComplete = async (audioBlob: Blob) => {
    // Save final draft
    try {
      setIsProcessing(true);
      
      const user = await getUserProfile();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Convert blob to base64
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to convert audio to base64'));
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(audioBlob);
      });
      
      // Save or update draft with final audio
      const endpoint = `/api/drafts${currentDraftId ? `/${currentDraftId}` : ''}`;
      const response = await fetch(endpoint, {
        method: currentDraftId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          audioBlob: base64Audio,
          isFinal: true // Mark this as the final version
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save final draft');
      }

      const data = await response.json();
      if (!currentDraftId) {
        setCurrentDraftId(data.draftId);
      }
      
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      
      // Proceed to review step
      setCurrentStep(Step.REVIEW);
    } catch (error) {
      console.error('Error in handleRecordingComplete:', error);
      setError('An error occurred while saving the recording. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Process the audio when the user decides to transcribe
  const processAudioBlob = async () => {
    if (!audioUrl) return;
    
    setIsProcessing(true);
    setError('');
    
    try {
      // Convert audio URL to blob for transcription
      const response = await fetch(audioUrl);
      const audioBlob = await response.blob();
      
      const user = await getUserProfile();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const transcriptText = await transcribeAudioElevenlabs(audioBlob, user.id, selectedLanguage);
      setTranscript(transcriptText);
      
      // Use POST method with data in request body
      const analysisResponse = await fetch('/api/sessions/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          transcript: transcriptText
        }),
      });
      
      if (!analysisResponse.ok) {
        throw new Error('Failed to analyze transcript');
      }
      
      const { analysis } = await analysisResponse.json();
      
      setSummary(analysis.summary);
      setSuggestedDiagnosis(analysis.suggestedDiagnosis);
      setSuggestedPrescription(analysis.suggestedPrescription);
      
      setFinalDiagnosis(analysis.suggestedDiagnosis);
      setFinalPrescription(analysis.suggestedPrescription);
      
      setCurrentStep(Step.COMPLETE);
      
    } catch (error) {
      console.error('Error processing audio:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while processing the audio. Please try again.';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Update the file upload handler to use the common function
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  // Add copyToClipboard function before the handleGenerateDocument function
  const [copySuccess, setCopySuccess] = useState(false);
  
  const copyToClipboard = () => {
    try {
      const formattedText = `Patient: ${patientName || "[Name]"}; Age: ${patientAge || "[Age]"}

Patient complaint and medical history:
${summary}

Examination results:
${examinationResults}

Diagnosis:
${finalDiagnosis}

Management:
${finalPrescription}

Plan:
${treatmentPlan}`;
      
      navigator.clipboard.writeText(formattedText);
      
      // Show success message in green instead of using error state
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
      
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      setError('Failed to copy to clipboard. Please try again.');
    }
  };

  const handleGenerateDocument = async () => {
    if (!patientName || !patientAge || !finalDiagnosis || !finalPrescription) {
      setError('Please fill out all required fields: name, age, final diagnosis, management');
      return;
    }
    
    try {
      setIsProcessing(true);

      const user = await getUserProfile();
      if (!user) {
        throw new Error('User not found');
      }
      
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
          examinationResults,
          treatmentPlan,
          doctorNotes,
          draftId: currentDraftId // Pass the draft ID for cleanup
        }),
      });

      if (!sessionResponse.ok) {
        throw new Error('Failed to save session data');
      }

      const { documentUrl } = await sessionResponse.json();
      
      // Clear the current draft ID since it will be deleted
      setCurrentDraftId(null);
      
      if (isMounted && documentUrl) {
        window.open(documentUrl, '_blank');
      }
      
      window.location.href = '/dashboard';
      
    } catch (error) {
      console.error('Error generating document:', error);
      setError('An error occurred while generating the document. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Add age validation function
  const validateAge = (value: string): string => {
    // Remove any non-numeric characters
    const numericValue = value.replace(/[^0-9]/g, '');
    
    // Convert to number and clamp between 0-150
    const age = parseInt(numericValue, 10);
    
    if (isNaN(age)) return '';
    if (age < 0) return '0';
    if (age > 150) return '150';
    
    return age.toString();
  };

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const validatedAge = validateAge(e.target.value);
    setPatientAge(validatedAge);
  };

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
        
        {/* Progress steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between w-full mb-2">
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                currentStep >= Step.RECORD ? 'bg-accent text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                1
              </div>
              <span className="ml-2 text-sm">Record</span>
            </div>
            <div className={`flex-1 h-1 mx-4 ${currentStep >= Step.REVIEW ? 'bg-accent' : 'bg-gray-200'}`} />
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                currentStep >= Step.REVIEW ? 'bg-accent text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                2
              </div>
              <span className="ml-2 text-sm">Review</span>
            </div>
            <div className={`flex-1 h-1 mx-4 ${currentStep >= Step.COMPLETE ? 'bg-accent' : 'bg-gray-200'}`} />
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                currentStep >= Step.COMPLETE ? 'bg-accent text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                3
              </div>
              <span className="ml-2 text-sm">Complete</span>
            </div>
          </div>
        </div>
        
        {(isProcessing || isUploading) && (
          <div className="flex justify-center items-center p-12">
            <div className="animate-spin h-8 w-8 border-2 border-accent rounded-full border-t-transparent mr-2" />
            <p>{isUploading ? 'Uploading...' : 'Processing...'}</p>
          </div>
        )}
        
        {/* Step 1: Record Audio */}
        {currentStep === Step.RECORD && !isProcessing && !isUploading && (
          <div className="mb-8">
            <p className="mb-4">
              Start recording your patient session or upload an existing audio file. Paused or incomplete recodings will be saved as drafts.
            </p>
            
            <div className="flex flex-col gap-4 mb-4">
              <AudioRecorder
                onRecordingComplete={handleRecordingComplete}
                isRecording={isRecording}
                onStartRecording={handleStartRecording}
                onStopRecording={handleStopRecording}
                onPauseRecording={handlePauseRecording}
                onResumeRecording={handleResumeRecording}
              />
              
              <div className="flex items-center justify-center">
                <div className="flex-grow h-px bg-border" />
                <span className="px-4 text-sm text-muted-foreground font-medium">OR</span>
                <div className="flex-grow h-px bg-border" />
              </div>
              
              <div className="w-full p-6 border border-border rounded-md bg-background">
                <div className="flex justify-between items-center mb-4">
                  <h3>Upload Audio</h3>
                </div>
                
                <div
                  ref={dropAreaRef}
                  className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-md transition-colors w-full ${
                    isDragging 
                      ? 'border-accent bg-accent/5' 
                      : 'border-border hover:border-accent/50'
                  }`}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      fileInputRef.current?.click();
                    }
                  }}
                  style={{ cursor: isUploading || isProcessing ? 'not-allowed' : 'pointer' }}
                >
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    ref={fileInputRef}
                    disabled={isUploading || isProcessing}
                  />
                  
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-12 w-12 text-muted-foreground mb-3"
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                    aria-hidden="true"
                    role="img"
                  >
                    <title>Upload icon</title>
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={1.5} 
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
                    />
                  </svg>
                  
                  <p className="mb-2 text-sm font-medium">
                    {isDragging ? "Drop to upload" : "Drag audio file here or click to browse"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supported formats: MP3, WAV, M4A, etc. (Max 30MB)
                  </p>
                </div>
              </div>
            </div>
            
            {error && (
              <div className="mt-4 p-3 text-sm bg-red-100 text-red-800 rounded-md">
                {error}
              </div>
            )}
          </div>
        )}
        
        {/* Step 2: Review Audio and Select Language */}
        {currentStep === Step.REVIEW && audioUrl && (
          <div className="mb-8">
            <div className="p-6 border border-border rounded-md bg-background mb-4">
              <h2 className="text-xl font-bold mb-4">Review Recording</h2>
              
              <div className="mb-6">
                {/* Replace WaveVisualizer with AudioPlayer */}
                <AudioPlayer audioUrl={audioUrl} />
              </div>
              
              <div className="mb-6">
                <label htmlFor="language-select" className="block mb-2 text-sm font-medium">
                  Select Majority Language in Recording
                </label>
                <select
                  id="language-select"
                  className="input w-full"
                  value={selectedLanguage === null ? '' : selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value === '' ? null : e.target.value)}
                >
                  {languageOptions.map((option) => (
                    <option 
                      key={option.label} 
                      value={option.value === null ? '' : option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-muted-foreground">
                  Choose the majority spoken language in the recording or select `&#34;`Detect`&#34;` for automatic detection.
                </p>
              </div>
              
              <div className="flex justify-between">
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    if (audioUrl) URL.revokeObjectURL(audioUrl);
                    setAudioUrl(null);
                    setCurrentStep(Step.RECORD);
                  }}
                >
                  Back
                </Button>
                <Button onClick={processAudioBlob}>
                  Transcribe & Analyze
                </Button>
              </div>
            </div>
            
            {error && (
              <div className={`mt-4 p-3 text-sm rounded-md ${
                error.includes('Usage limit exceeded') 
                  ? 'bg-orange-100 text-orange-800 border border-orange-200' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {error}
              </div>
            )}
          </div>
        )}
        
        {/* Step 3: Complete - Display Analysis & Continue with Session */}
        {currentStep === Step.COMPLETE && (
          <>
            {audioUrl && (
              <div className="mb-6 p-6 rounded-md bg-background">
                <h2 className="text-xl font-bold mb-4">Recording</h2>
                {/* Replace WaveVisualizer with AudioPlayer */}
                <AudioPlayer audioUrl={audioUrl} />
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

            {/* Moved Patient Information section to appear before Patient Complaint & Medical History */}
            <div className="mb-6 p-6 border border-border rounded-md bg-background">
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
                type="number"
                value={patientAge}
                onChange={handleAgeChange}
                placeholder="45"
                min="0"
                max="150"
                required
                fullWidth
              />
            </div>

            <div className="mb-6 p-6 border border-border rounded-md bg-background">
              <h2 className="text-xl font-bold mb-4">Patient Complaint & Medical History</h2>
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
            
            <div className="mb-4 p-6 border border-border rounded-md bg-background">
              <h2 className="text-xl font-bold mb-4">Doctor&apos;s Assessment</h2>
              
              <div className="mb-4">
                <label htmlFor="examination-results" className="block mb-2 text-sm font-medium">
                  Examination Results
                </label>
                <textarea
                  id="examination-results"
                  value={examinationResults}
                  onChange={(e) => setExaminationResults(e.target.value)}
                  className="input w-full min-h-24"
                  placeholder="Enter physical examination results"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="final-diagnosis" className="block mb-2 text-sm font-medium">
                  Final Diagnosis
                </label>
                <textarea
                  id="final-diagnosis"
                  value={finalDiagnosis}
                  onChange={(e) => setFinalDiagnosis(e.target.value)}
                  className="input w-full min-h-24"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="final-prescription" className="block mb-2 text-sm font-medium">
                  Management
                </label>
                <textarea
                  id="final-prescription"
                  value={finalPrescription}
                  onChange={(e) => setFinalPrescription(e.target.value)}
                  className="input w-full min-h-24"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="treatment-plan" className="block mb-2 text-sm font-medium">
                  Plan
                </label>
                <textarea
                  id="treatment-plan"
                  value={treatmentPlan}
                  onChange={(e) => setTreatmentPlan(e.target.value)}
                  className="input w-full min-h-24"
                  placeholder="Enter follow-up plan, tests, referrals, etc."
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
            
            {error && (
              <div className="mb-4 p-3 text-sm bg-red-100 text-red-800 rounded-md">
                {error}
              </div>
            )}
            
            {/* Add success message */}
            {copySuccess && (
              <div className="mb-4 p-3 text-sm bg-green-100 text-green-800 rounded-md">
                Copied to clipboard!
              </div>
            )}
            
            {/* Change flex to space-between instead of justify-end */}
            <div className="flex justify-between gap-4">
              <Button 
                variant="secondary"
                onClick={copyToClipboard}
                disabled={isProcessing}
              >
                Copy to Clipboard
              </Button>
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