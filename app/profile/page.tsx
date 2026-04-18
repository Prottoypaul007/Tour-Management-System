import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) redirect('/login');

  const signOut = async () => {
    'use server';
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login');
  };

  const { data: memberships } = await supabase
    .from('event_members')
    .select('*, events(*)') 
    .eq('member_email', user.email)
    .order('joined_at', { ascending: false });

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-10 relative overflow-hidden">
      
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 pointer-events-none"></div>

      <div className="relative max-w-6xl mx-auto">
        
        {/* ENHANCED HEADER */}
        <div className="bg-gradient-to-r from-emerald-900/40 via-emerald-800/40 to-cyan-900/40 backdrop-blur-xl border border-emerald-500/30 p-6 md:p-8 rounded-3xl mb-10 shadow-2xl flex justify-between items-center flex-col md:flex-row gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">My Tours</h1>
            <p className="text-emerald-300 text-base md:text-lg">
              Welcome back, <strong className="text-white">{user.user_metadata?.full_name || 'Explorer'}</strong> 
            </p>
          </div>
          
          <div className="flex gap-3 items-center w-full md:w-auto flex-wrap md:flex-nowrap">
            {/* NEW PROMINENT CREATE BUTTON */}
            <Link href="/create" className="w-full md:w-auto text-center bg-gradient-to-r from-emerald-600 to-emerald-500 text-white border border-emerald-400/50 px-6 py-3 rounded-xl hover:from-emerald-700 hover:to-emerald-600 transition font-bold shadow-lg shadow-emerald-500/20 transform hover:-translate-y-0.5">
              ➕ Plan New Tour
            </Link>
            
            <Link href="/profile" className="flex-1 md:flex-none text-center bg-white/10 hover:bg-white/20 text-white border border-white/10 px-5 py-3 rounded-xl transition backdrop-blur-sm font-medium">
              ⚙️ Settings
            </Link>
            <form action={signOut} className="flex-1 md:flex-none">
              <button className="w-full text-center bg-rose-500/10 text-rose-400 border border-rose-500/20 px-5 py-3 rounded-xl hover:bg-rose-500/20 hover:border-rose-500/40 transition font-medium">
                Log Out
              </button>
            </form>
          </div>
        </div>

        {/* FULL WIDTH TOURS GRID */}
        <div>
          {memberships && memberships.length > 0 ? (
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {memberships.map((membership: any) => {
                if (!membership.events) return null;
                const isManager = membership.events?.manager_id === user.id;

                return (
                  <li key={membership.event_id} className="group">
                    <Link href={`/event/${membership.event_id}`} className="block h-full bg-white/5 backdrop-blur-sm hover:bg-white/10 border border-white/10 hover:border-emerald-500/50 p-6 rounded-3xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10 relative overflow-hidden">
                      {/* Decorative accent */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-bl-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      
                      <div className="flex justify-between items-start mb-6 gap-2 relative z-10">
                        <div className="p-3 bg-black/20 rounded-xl text-emerald-400 text-xl border border-white/5">
                          🗺️
                        </div>
                        {isManager && (
                          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-full">Manager</span>
                        )}
                      </div>

                      <h3 className="font-bold text-2xl text-white mb-2 group-hover:text-emerald-400 transition-colors line-clamp-1 relative z-10">
                        {membership.events?.name}
                      </h3>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-400 relative z-10 font-medium">
                        <span>📅</span>
                        <span>
                          {new Date(membership.events?.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} 
                          {' → '} 
                          {new Date(membership.events?.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="w-full flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-3xl p-12 text-center bg-white/5 backdrop-blur-sm">
              <span className="text-7xl mb-6 opacity-50 grayscale">🏝️</span>
              <h3 className="text-2xl font-bold text-white mb-3">No tours yet</h3>
              <p className="text-gray-400 max-w-md mx-auto text-base mb-8">Ready for an adventure? Create a new tour to set up a shared ledger, or wait for an invitation from a friend.</p>
              <Link href="/create" className="bg-emerald-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-emerald-500 transition shadow-lg">
                Create Your First Tour
              </Link>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}