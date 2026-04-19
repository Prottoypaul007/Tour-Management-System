import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SubmitButton } from '@/components/SubmitButton';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string, success: string }>;
}) {
  const { message, success } = await searchParams;
  
  const signUp = async (formData: FormData) => {
    'use server';
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;
    const supabase = await createClient();

    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          full_name: fullName 
        }
      }
    });
    
    if (error) {
      console.error("Signup Error:", error.message);
      return redirect(`/login?message=${error.message}`);
    }
    
    return redirect(`/login?success=Account created! Please log in.`);
  };

  const signIn = async (formData: FormData) => {
    'use server';
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      console.error("Login Error:", error.message);
      return redirect(`/login?message=${error.message}`);
    }
    
    return redirect('/'); 
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 md:p-10 rounded-3xl shadow-2xl">
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 text-emerald-400 text-3xl mb-4 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
              🗺️
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Tour Manager</h1>
            <p className="text-gray-400 text-sm">Sign in to manage your shared ledgers</p>
          </div>
          
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

          <form className="flex flex-col gap-5">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase ml-1 block mb-2 tracking-wider">
                Full Name <span className="text-gray-500 normal-case font-normal">(For New Accounts)</span>
              </label>
              <input 
                type="text" 
                name="fullName" 
                placeholder="e.g., Rahim Uddin" 
                className="w-full bg-black/20 border border-white/10 text-white placeholder-gray-600 p-4 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase ml-1 block mb-2 tracking-wider">Email Address</label>
              <input 
                type="email" 
                name="email" 
                placeholder="name@example.com" 
                required 
                className="w-full bg-black/20 border border-white/10 text-white placeholder-gray-600 p-4 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1 tracking-wider">Password</label>
                {/* NEW: Password length hint */}
                <span className="text-[10px] text-gray-500 tracking-wide">Min 6 characters</span>
              </div>
              <input 
                type="password" 
                name="password" 
                placeholder="••••••••" 
                required 
                minLength={6} // NEW: Prevents submission if less than 6 chars
                className="w-full bg-black/20 border border-white/10 text-white placeholder-gray-600 p-4 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none"
              />
            </div>
            
            <div className="flex flex-col gap-4 mt-4">
              <SubmitButton 
                formAction={signIn as any} 
                text="Log In" 
                loadingText="Authenticating..." 
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold py-4 rounded-xl hover:from-emerald-700 hover:to-emerald-600 transition-all shadow-lg hover:shadow-emerald-500/30 transform hover:-translate-y-0.5 text-lg"
              />
              
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-wider font-bold">
                  <span className="bg-[#151f2b] px-4 text-gray-500 rounded-full">Or</span>
                </div>
              </div>
              
              <SubmitButton 
                formAction={signUp as any} 
                text="Create Account" 
                loadingText="Setting up..." 
                className="w-full bg-white/5 text-white border border-white/10 font-bold py-4 rounded-xl hover:bg-white/10 transition-all text-lg"
              />
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}