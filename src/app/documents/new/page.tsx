'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { getUserProfile } from '@/lib/auth';

export default function NewDocument() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  
  // Form state
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [summary, setSummary] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleCreateDocument = async () => {
    if (!patientName || !patientAge || !diagnosis || !prescription) {
      setError('Please fill out all required fields.');
      return;
    }
    
    try {
      setIsProcessing(true);
      setError('');

      // Get current user
      const user = await getUserProfile();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Save to database
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          patientName,
          patientAge,
          transcript: '', // Empty since this is a manual document
          summary,
          suggestedDiagnosis: diagnosis, // Use final diagnosis as suggested
          suggestedPrescription: prescription, // Use final prescription as suggested
          finalDiagnosis: diagnosis,
          finalPrescription: prescription,
          doctorNotes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save document data');
      }
      
      // Only run in browser context
      if (isMounted) {
        const { documentUrl } = await response.json();

        // Open the document in a new tab
        window.open(documentUrl, '_blank');
        
        // Redirect back to documents page
        router.push('/documents');
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
        <header className="flex justify-between items-center mb-12 pb-4 border-b border-border">
          <h1 className="text-3xl font-bold">New Document</h1>
          <Link href="/documents">
            <Button variant="secondary">Back to Documents</Button>
          </Link>
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
        
        <div className="space-y-6">
          <div className="p-6 border border-border rounded-md bg-background">
            <h3 className="text-xl font-bold mb-4">Patient Information</h3>
            
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
          
          <div className="p-6 border border-border rounded-md bg-background">
            <h3 className="text-xl font-bold mb-4">Consultation Summary</h3>
            
            <div className="mb-4">
              <label htmlFor="summary" className="block mb-2 text-sm font-medium">
                Summary
              </label>
              <textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="input w-full min-h-32"
                placeholder="Enter a summary of the consultation..."
              />
            </div>
          </div>
          
          <div className="p-6 border border-border rounded-md bg-background">
            <h3 className="text-xl font-bold mb-4">Doctor&apos;s Assessment</h3>
            
            <div className="mb-4">
              <label htmlFor="diagnosis" className="block mb-2 text-sm font-medium">
                Diagnosis
              </label>
              <textarea
                id="diagnosis"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="input w-full min-h-32"
                required
                placeholder="Enter the diagnosis..."
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="prescription" className="block mb-2 text-sm font-medium">
                Prescription
              </label>
              <textarea
                id="prescription"
                value={prescription}
                onChange={(e) => setPrescription(e.target.value)}
                className="input w-full min-h-32"
                required
                placeholder="Enter the prescription..."
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
          
          <div className="flex justify-end gap-4">
            <Link href="/documents">
              <Button variant="secondary">Cancel</Button>
            </Link>
            <Button 
              onClick={handleCreateDocument}
              disabled={isProcessing}
            >
              Generate Document
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
} 