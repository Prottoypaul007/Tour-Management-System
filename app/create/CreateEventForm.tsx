'use client';

import { useState } from 'react';
import { SubmitButton } from '@/components/SubmitButton';

export default function CreateEventForm({ action }: { action: (formData: FormData) => void }) {
  // State to track how many input boxes to show
  const [inviteCount, setInviteCount] = useState<number>(1);

  return (
    <form action={action} className="flex flex-col gap-6">
      <div>
        <label className="text-xs font-bold text-gray-400 uppercase ml-1 block mb-2 tracking-wider">Event Name</label>
        <input type="text" name="name" placeholder="e.g., Sajek 2026" required className="w-full bg-black/20 border border-white/10 text-white placeholder-gray-500 p-4 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none text-lg"/>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-5">
        <div className="w-full">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1 block mb-2 tracking-wider">Start Date</label>
          <input type="date" name="start_date" required className="w-full bg-black/20 border border-white/10 text-white placeholder-gray-500 p-4 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none [color-scheme:dark]"/>
        </div>
        <div className="w-full">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1 block mb-2 tracking-wider">End Date</label>
          <input type="date" name="end_date" required className="w-full bg-black/20 border border-white/10 text-white placeholder-gray-500 p-4 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none [color-scheme:dark]"/>
        </div>
      </div>

      {/* DYNAMIC INVITE SECTION */}
      <div className="bg-white/5 p-6 rounded-2xl border border-white/10 mt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-white/10 pb-4">
          <div>
            <label className="text-sm font-bold text-emerald-300 block tracking-wider">👥 How many friends are you inviting?</label>
            <p className="text-xs text-gray-400 mt-1">Leave at 0 if you want to invite them later.</p>
          </div>
          
          <input 
            type="number" 
            min="0" 
            max="20" 
            value={inviteCount} 
            onChange={(e) => setInviteCount(parseInt(e.target.value) || 0)}
            className="w-24 bg-black/40 border border-white/20 text-emerald-400 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-center text-lg font-bold"
          />
        </div>

        {/* This loop generates exactly the number of boxes the user requested */}
        <div className="space-y-3">
          {Array.from({ length: inviteCount }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <span className="text-gray-500 font-mono text-sm w-6 text-right">{index + 1}.</span>
              <input 
                type="email" 
                name="email" // All boxes have the same name! The server catches them as an array.
                placeholder={`Friend ${index + 1} Email Address`} 
                required
                className="w-full bg-black/20 border border-white/10 text-white placeholder-gray-600 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      <SubmitButton 
        text="Create & Send Invites" 
        loadingText="Setting up your ledger..." 
        className="mt-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold py-4 px-4 rounded-xl hover:from-emerald-700 hover:to-emerald-600 transition-all shadow-lg hover:shadow-emerald-500/30 transform hover:-translate-y-0.5 w-full text-lg"
      />
    </form>
  );
}