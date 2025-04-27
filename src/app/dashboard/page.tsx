'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/Button';
import { getUserProfile, signOut } from '@/lib/auth';

export default function Dashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    const fetchUser = async () => {
      try {
        const user = await getUserProfile();
        if (!user) {
          router.push('/auth/signin');
          return;
        }
        setUserName(user.email || '');
      } catch (error) {
        console.error('Error fetching user profile:', error);
        router.push('/auth/signin');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

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
          <h1 className="text-3xl font-bold">DocBuddy</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm">{userName}</span>
            <Button variant="secondary" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </header>

        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Welcome to DocBuddy</h2>
          <p className="mb-6">Use DocBuddy to record, transcribe, and document your patient sessions.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-6 border border-border rounded-md bg-background shadow-sm">
            <h3 className="text-xl font-bold mb-4">New Session</h3>
            <p className="mb-6">Start a new recording session with your patient.</p>
            <Link href="/session/new">
              <Button className="w-full md:w-auto">Start New Session</Button>
            </Link>
          </div>

          <div className="p-6 border border-border rounded-md bg-background shadow-sm">
            <h3 className="text-xl font-bold mb-4">Documents</h3>
            <p className="mb-6">View and manage your patient documents.</p>
            <Link href="/documents">
              <Button className="w-full md:w-auto">View Documents</Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
} 