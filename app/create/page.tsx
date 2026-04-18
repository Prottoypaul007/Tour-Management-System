import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createEventWithInvites } from '../actions';
import CreateEventForm from './CreateEventForm'; // Import your new Client Component!

export default async function CreateEventPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-10 relative overflow-hidden flex items-center justify-center">
      
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 pointer-events-none"></div>

      <div className="relative w-full max-w-2xl mx-auto py-10">
        <Link href="/" className="text-emerald-400 hover:text-emerald-300 mb-6 inline-flex items-center font-medium transition gap-2 text-sm md:text-base">&larr; Back to Dashboard</Link>
        
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 md:p-10 rounded-3xl shadow-2xl">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white flex items-center gap-3">
            <span className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400 text-2xl">✈️</span>
            Plan a New Tour
          </h1>
          <p className="text-gray-400 mb-8 ml-1">Set up your ledger and invite your travel buddies.</p>
          
          {/* Inject the interactive form here, passing the secure server action to it */}
          <CreateEventForm action={createEventWithInvites} />

        </div>
      </div>
    </main>
  );
}