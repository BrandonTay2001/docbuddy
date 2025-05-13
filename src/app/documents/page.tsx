'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Button from '@/components/Button';
import { getUserProfile } from '@/lib/auth';

interface Session {
  id: string;
  name: string;
  created_at: string;
  document_url: string;
}

export default function Documents() {
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    setIsMounted(true);
    
    const fetchData = async () => {
      try {
        const user = await getUserProfile();
        if (!user) {
          throw new Error('User not found');
        }

        // Fetch user sessions
        const response = await fetch(`/api/sessions?userId=${user.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch sessions');
        }
        const data = await response.json();
        setSessions(data.sessions);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Show a simple loading state during SSR
  if (!isMounted) {
    return <div className="min-h-screen" />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-accent rounded-full border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="min-h-screen p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-12 pb-4 border-b border-border">
          <h1 className="text-3xl font-bold">Patient Documents</h1>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="secondary">Back to Dashboard</Button>
            </Link>
          </div>
        </header>

        <div className="mb-8">
          <p className="mb-6">
            Documents generated from your sessions will appear here. 
            Currently, documents are saved locally to your device when generated.
          </p>
          
          <div className="flex justify-start mb-8">
            <div className="flex gap-4">
              <Link href="/documents/new">
                <Button>Create New Document</Button>
              </Link>
              <Link href="/session/new">
                <Button variant="secondary">Start New Session</Button>
              </Link>
            </div>
          </div>
        </div>
        
        {sessions.length > 0 ? (
          <div className="space-y-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="p-4 border border-border rounded-md bg-background hover:bg-accent/5 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <Link href={`/documents/edit/${session.id}`} className="hover:underline">
                    <div>
                      <h3 className="text-lg font-semibold">{session.name}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(session.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        window.open(session.document_url, '_blank');
                      }}
                    >
                      View Report
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 border border-border rounded-md bg-background text-center">
            <h3 className="text-xl font-bold mb-4">No Documents Found</h3>
            <p className="text-gray-500 mb-6">
              You haven&apos;t created any documents yet. Use the buttons above to create documents manually or start a new recording session.
            </p>
          </div>
        )}
      </div>
    </main>
  );
} 