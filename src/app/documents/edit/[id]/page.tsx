'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/Button';
import { getUserProfile } from '@/lib/auth';

interface Session {
  id: string;
  name: string;
  age: number;
  transcript: string;
  summary: string;
  examination_results: string; // Added field
  final_diagnosis: string;
  final_prescription: string;
  treatment_plan: string; // Added field
  doctor_notes: string;
  document_url: string;
}

export default function EditDocument({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<Session | null>(null);

  // Form state
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [examinationResults, setExaminationResults] = useState(''); // Added field
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState(''); // Added field
  const [doctorNotes, setDoctorNotes] = useState('');

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const user = await getUserProfile();
        if (!user) {
          throw new Error('User not found');
        }

        const response = await fetch(`/api/sessions/${resolvedParams.id}?userId=${user.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch session');
        }
        const data = await response.json();
        setSession(data.session);
        
        // Initialize form state
        setTranscript(data.session.transcript || 'No transcript available: this is a manually-added document');
        setSummary(data.session.summary || '');
        setExaminationResults(data.session.examination_results || ''); // Initialize examination results
        setDiagnosis(data.session.final_diagnosis || '');
        setPrescription(data.session.final_prescription || '');
        setTreatmentPlan(data.session.treatment_plan || ''); // Initialize treatment plan
        setDoctorNotes(data.session.doctor_notes || '');
      } catch (error) {
        console.error('Error fetching session:', error);
        setError('Failed to load session');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [resolvedParams.id]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError('');

      const user = await getUserProfile();
      if (!user) {
        throw new Error('User not found');
      }

      // Update session in database
      const response = await fetch(`/api/sessions/${resolvedParams.id}?userId=${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript,
          summary,
          examinationResults, // Added field
          diagnosis,
          prescription,
          treatmentPlan, // Added field
          doctorNotes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update session');
      }

      const { documentUrl } = await response.json();
      
      // Open the document in a new tab
      window.open(documentUrl, '_blank');
      
      router.push('/documents');
    } catch (error) {
      console.error('Error saving session:', error);
      setError('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 md:p-12">
        <div className="max-w-5xl mx-auto">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen p-6 md:p-12">
        <div className="max-w-5xl mx-auto">
          <p>Session not found</p>
          <Link href="/documents">
            <Button variant="secondary" className="mt-4">Back to Documents</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-12 pb-4 border-b border-border">
          <h1 className="text-3xl font-bold">Edit Document</h1>
          <div className="flex items-center gap-4">
            <Link href="/documents">
              <Button variant="secondary">Back to Documents</Button>
            </Link>
          </div>
        </header>

        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Patient Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="patient-name" className="block text-sm font-medium mb-1">Name</label>
                <p id="patient-name" className="text-gray-700">{session.name}</p>
              </div>
              <div>
                <label htmlFor="patient-age" className="block text-sm font-medium mb-1">Age</label>
                <p id="patient-age" className="text-gray-700">{session.age.toString()}</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Session Details</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="transcript" className="block text-sm font-medium mb-1">Transcript</label>
                <textarea
                  id="transcript"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  className="w-full h-32 p-2 border rounded-md"
                  placeholder="Enter the session transcript..."
                />
              </div>

              <div>
                <label htmlFor="summary" className="block text-sm font-medium mb-1">Summary</label>
                <textarea
                  id="summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full h-32 p-2 border rounded-md"
                  placeholder="Enter the consultation summary..."
                />
              </div>

              <div>
                <label htmlFor="examination-results" className="block text-sm font-medium mb-1">Examination Results</label>
                <textarea
                  id="examination-results"
                  value={examinationResults}
                  onChange={(e) => setExaminationResults(e.target.value)}
                  className="w-full h-32 p-2 border rounded-md"
                  placeholder="Enter physical examination findings..."
                />
              </div>

              <div>
                <label htmlFor="diagnosis" className="block text-sm font-medium mb-1">Final Diagnosis</label>
                <textarea
                  id="diagnosis"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="w-full h-32 p-2 border rounded-md"
                  placeholder="Enter the final diagnosis..."
                />
              </div>

              <div>
                <label htmlFor="prescription" className="block text-sm font-medium mb-1">Management</label>
                <textarea
                  id="prescription"
                  value={prescription}
                  onChange={(e) => setPrescription(e.target.value)}
                  className="w-full h-32 p-2 border rounded-md"
                  placeholder="Enter the management plan..."
                />
              </div>

              <div>
                <label htmlFor="treatment-plan" className="block text-sm font-medium mb-1">Plan</label>
                <textarea
                  id="treatment-plan"
                  value={treatmentPlan}
                  onChange={(e) => setTreatmentPlan(e.target.value)}
                  className="w-full h-32 p-2 border rounded-md"
                  placeholder="Enter follow-up plan, tests, referrals, etc."
                />
              </div>

              <div>
                <label htmlFor="doctor-notes" className="block text-sm font-medium mb-1">Doctor&apos;s Notes</label>
                <textarea
                  id="doctor-notes"
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  className="w-full h-32 p-2 border rounded-md"
                  placeholder="Enter any additional notes..."
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-4">
            <Link href="/documents">
              <Button variant="secondary">Cancel</Button>
            </Link>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}