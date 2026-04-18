import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { SubmitButton } from '@/components/SubmitButton';
import { updateProfile } from './actions';

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string, success?: string }>;
}) {
  const { message, success } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const currentName = user.user_metadata?.full_name || '';

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-10 relative overflow-hidden flex items-center justify-center">
      
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 pointer-events-none"></div>

      <div className="relative w-full max-w-lg mx-auto">
        <Link href="/" className="text-emerald-400 hover:text-emerald-300 mb-6 inline-flex items-center font-medium transition gap-2 text-sm md:text-base">&larr; Back to Dashboard</Link>
        
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 md:p-10 rounded-3xl shadow-2xl">
          <h1 className="text-3xl font-bold mb-2 text-white flex items-center gap-3">
            <span className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400 text-xl">⚙️</span>
            Profile Settings
          </h1>
          <p className="text-gray-400 mb-8 ml-1">Update your personal information.</p>

          {message && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-4 py-3 rounded-xl mb-6 text-sm font-medium flex items-center gap-2">
              <span>⚠️</span> {message}
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl mb-6 text-sm font-medium flex items-center gap-2 animate-pulse">
              <span>✅</span> {success}
            </div>
          )}
          
          <form className="flex flex-col gap-6">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase ml-1 block mb-2 tracking-wider">Display Name</label>
              <input 
                type="text" 
                name="fullName" 
                defaultValue={currentName}
                placeholder="e.g., Rahim Uddin" 
                required 
                className="w-full bg-black/20 border border-white/10 text-white placeholder-gray-500 p-4 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none text-lg"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase ml-1 block mb-2 tracking-wider">Account Email (Read Only)</label>
              <input 
                type="email" 
                defaultValue={user.email}
                disabled 
                className="w-full bg-white/5 border border-white/5 text-gray-500 p-4 rounded-xl cursor-not-allowed outline-none text-lg"
              />
            </div>

            <SubmitButton 
              formAction={updateProfile as any} 
              text="Update Profile" 
              loadingText="Saving..." 
              className="mt-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold py-4 px-4 rounded-xl hover:from-emerald-700 hover:to-emerald-600 transition-all shadow-lg hover:shadow-emerald-500/30 transform hover:-translate-y-0.5 w-full text-lg"
            />
          </form>
        </div>
      </div>
    </main>
  );
}