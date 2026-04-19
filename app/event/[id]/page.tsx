import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { SubmitButton } from '@/components/SubmitButton'; 
import { addTransaction, deleteTransaction, addMember, removeMember } from './actions';

export default async function EventDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: event } = await supabase.from('events').select('*').eq('id', id).single();
  const { data: members } = await supabase.from('event_members').select('*, users(name)').eq('event_id', id);
  const { data: transactions } = await supabase.from('transactions').select('*, users(name)').eq('event_id', id).order('created_at', { ascending: false });
  const { data: splits } = await supabase.from('expense_splits').select('*, transactions!inner(*)').eq('transactions.event_id', id);

  const balances: Record<string, number> = {};
  members?.forEach(m => { if (m.user_id) balances[m.user_id] = 0; });
  
  transactions?.filter(t => t.type === 'DEPOSIT').forEach(t => {
    if (t.payer_id && balances[t.payer_id] !== undefined) balances[t.payer_id] += Number(t.amount);
  });
  transactions?.filter(t => t.type === 'PERSONAL_EXPENSE').forEach(t => {
    if (t.payer_id && balances[t.payer_id] !== undefined) balances[t.payer_id] -= Number(t.amount);
  });
  splits?.forEach(s => {
    if (s.user_id && balances[s.user_id] !== undefined) balances[s.user_id] -= Number(s.amount_owed);
  });

  // --- NEW CASH MATH ---
  const totalTourCost = transactions?.filter(t => t.type === 'SHARED_EXPENSE').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  const totalDepositsAll = transactions?.filter(t => t.type === 'DEPOSIT').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  const totalPersonalCostsAll = transactions?.filter(t => t.type === 'PERSONAL_EXPENSE').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  
  const availableBalance = totalDepositsAll - totalTourCost - totalPersonalCostsAll;
  // ---------------------

  const debtors: any[] = [];
  const creditors: any[] = [];
  for (const [userId, bal] of Object.entries(balances)) {
    const memberName = members?.find(m => m.user_id === userId)?.users?.name || 'Pending Member';
    if (bal < -0.01) debtors.push({ id: userId, name: memberName, amount: Math.abs(bal) });
    if (bal > 0.01) creditors.push({ id: userId, name: memberName, amount: bal });
  }

  const settlements = [];
  let d = 0, c = 0;
  while (d < debtors.length && c < creditors.length) {
    const settleAmount = Math.min(debtors[d].amount, creditors[c].amount);
    settlements.push({
      from: debtors[d].name,
      to: creditors[c].name,
      amount: settleAmount
    });
    debtors[d].amount -= settleAmount;
    creditors[c].amount -= settleAmount;
    if (debtors[d].amount < 0.01) d++;
    if (creditors[c].amount < 0.01) c++;
  }

  const depositsList = transactions?.filter(t => t.type === 'DEPOSIT') || [];
  const spendsList = transactions?.filter(t => t.type !== 'DEPOSIT') || [];
  const isManager = event?.manager_id === user.id;

  const myBalance = balances[user.id] || 0;
  const myDeposits = transactions?.filter(t => t.type === 'DEPOSIT' && t.payer_id === user.id) || [];
  const mySplits = splits?.filter(s => s.user_id === user.id) || [];
  const myPersonalCosts = transactions?.filter(t => t.type === 'PERSONAL_EXPENSE' && t.payer_id === user.id) || [];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-10">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-64 md:w-96 h-64 md:h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
        <div className="absolute bottom-0 left-0 w-64 md:w-96 h-64 md:h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
      </div>

      <div className="relative max-w-6xl mx-auto">
        <Link href="/" className="text-emerald-400 hover:text-emerald-300 mb-4 md:mb-6 inline-flex items-center font-medium transition gap-2 text-sm md:text-base">&larr; Back to Dashboard</Link>
        
        {/* --- UPGRADED HEADER WITH DUAL METRICS --- */}
        <div className="bg-gradient-to-r from-emerald-900/40 via-emerald-800/40 to-cyan-900/40 backdrop-blur-xl border border-emerald-500/30 p-5 md:p-8 rounded-2xl mb-8 md:mb-10 shadow-2xl flex justify-between items-center flex-col lg:flex-row gap-6">
          <div className="text-center lg:text-left w-full lg:w-auto">
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">{event?.name}</h1>
            <p className="text-emerald-300 text-sm md:text-lg">💰 Dynamic Financial Ledger</p>
          </div>
          
          <div className="flex gap-4 w-full lg:w-auto flex-col sm:flex-row">
            {/* NEW: Manager's Available Balance */}
            <div className={`text-center lg:text-right bg-gradient-to-br p-4 md:p-6 rounded-xl border backdrop-blur-sm shadow-lg flex-1 min-w-[200px] ${availableBalance >= 0 ? 'from-blue-500/20 to-cyan-500/20 border-blue-400/30' : 'from-rose-500/20 to-orange-500/20 border-rose-400/30'}`}>
              <p className={`text-xs md:text-sm font-bold uppercase tracking-wider mb-1 md:mb-2 ${availableBalance >= 0 ? 'text-blue-300' : 'text-rose-300'}`}>Manager's Cash</p>
              <p className={`text-3xl md:text-4xl font-mono font-bold ${availableBalance >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>{availableBalance.toFixed(2)} ৳</p>
            </div>

            {/* Total Tour Cost */}
            <div className="text-center lg:text-right bg-gradient-to-br from-emerald-500/20 to-teal-500/20 p-4 md:p-6 rounded-xl border border-emerald-400/30 backdrop-blur-sm shadow-lg flex-1 min-w-[200px]">
              <p className="text-emerald-300 text-xs md:text-sm font-bold uppercase tracking-wider mb-1 md:mb-2">Total Tour Cost</p>
              <p className="text-3xl md:text-4xl font-mono text-emerald-400 font-bold">{totalTourCost.toFixed(2)} ৳</p>
            </div>
          </div>
        </div>
        {/* --------------------------------------- */}

        <div className="relative w-full">
          <input type="radio" name="tab" id="tab1" className="hidden peer/tab1" defaultChecked />
          <input type="radio" name="tab" id="tab2" className="hidden peer/tab2" />
          <input type="radio" name="tab" id="tab3" className="hidden peer/tab3" />
          <input type="radio" name="tab" id="tab4" className="hidden peer/tab4" />
          <input type="radio" name="tab" id="tab5" className="hidden peer/tab5" />
          <input type="radio" name="tab" id="tab6" className="hidden peer/tab6" />
          <input type="radio" name="tab" id="tab7" className="hidden peer/tab7" />

          <div className="flex gap-2 md:gap-3 pb-6 md:pb-8 overflow-x-auto snap-x no-scrollbar">
            <label htmlFor="tab1" className="snap-start cursor-pointer px-4 py-2 md:px-6 md:py-3 text-sm md:text-base rounded-xl font-bold transition-all duration-200 text-white border-2 bg-white/5 border-white/20 hover:border-emerald-400/50 whitespace-nowrap peer-checked/tab1:bg-gradient-to-r peer-checked/tab1:from-emerald-600 peer-checked/tab1:to-emerald-500 peer-checked/tab1:border-emerald-400/80 peer-checked/tab1:shadow-lg peer-checked/tab1:shadow-emerald-500/50">📝 Log Transaction</label>
            <label htmlFor="tab2" className="snap-start cursor-pointer px-4 py-2 md:px-6 md:py-3 text-sm md:text-base rounded-xl font-bold transition-all duration-200 text-white border-2 bg-white/5 border-white/20 hover:border-emerald-400/50 whitespace-nowrap peer-checked/tab2:bg-gradient-to-r peer-checked/tab2:from-emerald-600 peer-checked/tab2:to-emerald-500 peer-checked/tab2:border-emerald-400/80 peer-checked/tab2:shadow-lg peer-checked/tab2:shadow-emerald-500/50">👥 Event Members</label>
            <label htmlFor="tab3" className="snap-start cursor-pointer px-4 py-2 md:px-6 md:py-3 text-sm md:text-base rounded-xl font-bold transition-all duration-200 text-white border-2 bg-white/5 border-white/20 hover:border-emerald-400/50 whitespace-nowrap peer-checked/tab3:bg-gradient-to-r peer-checked/tab3:from-emerald-600 peer-checked/tab3:to-emerald-500 peer-checked/tab3:border-emerald-400/80 peer-checked/tab3:shadow-lg peer-checked/tab3:shadow-emerald-500/50">⚖️ Live Balances</label>
            <label htmlFor="tab4" className="snap-start cursor-pointer px-4 py-2 md:px-6 md:py-3 text-sm md:text-base rounded-xl font-bold transition-all duration-200 text-white border-2 bg-white/5 border-white/20 hover:border-emerald-400/50 whitespace-nowrap peer-checked/tab4:bg-gradient-to-r peer-checked/tab4:from-emerald-600 peer-checked/tab4:to-emerald-500 peer-checked/tab4:border-emerald-400/80 peer-checked/tab4:shadow-lg peer-checked/tab4:shadow-emerald-500/50">👤 My History</label>
            <label htmlFor="tab5" className="snap-start cursor-pointer px-4 py-2 md:px-6 md:py-3 text-sm md:text-base rounded-xl font-bold transition-all duration-200 text-white border-2 bg-white/5 border-white/20 hover:border-emerald-400/50 whitespace-nowrap peer-checked/tab5:bg-gradient-to-r peer-checked/tab5:from-emerald-600 peer-checked/tab5:to-emerald-500 peer-checked/tab5:border-emerald-400/80 peer-checked/tab5:shadow-lg peer-checked/tab5:shadow-emerald-500/50">🤝 Settle Up</label>
            <label htmlFor="tab6" className="snap-start cursor-pointer px-4 py-2 md:px-6 md:py-3 text-sm md:text-base rounded-xl font-bold transition-all duration-200 text-white border-2 bg-white/5 border-white/20 hover:border-emerald-400/50 whitespace-nowrap peer-checked/tab6:bg-gradient-to-r peer-checked/tab6:from-emerald-600 peer-checked/tab6:to-emerald-500 peer-checked/tab6:border-emerald-400/80 peer-checked/tab6:shadow-lg peer-checked/tab6:shadow-emerald-500/50">💰 Deposits</label>
            <label htmlFor="tab7" className="snap-start cursor-pointer px-4 py-2 md:px-6 md:py-3 text-sm md:text-base rounded-xl font-bold transition-all duration-200 text-white border-2 bg-white/5 border-white/20 hover:border-emerald-400/50 whitespace-nowrap peer-checked/tab7:bg-gradient-to-r peer-checked/tab7:from-emerald-600 peer-checked/tab7:to-emerald-500 peer-checked/tab7:border-emerald-400/80 peer-checked/tab7:shadow-lg peer-checked/tab7:shadow-emerald-500/50">💸 Expenses</label>
          </div>

          {/* TAB 1: LOG TRANSACTION */}
          <div className="hidden peer-checked/tab1:block">
            {isManager ? (
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 p-5 md:p-8 rounded-2xl shadow-xl">
                <h2 className="text-xl md:text-2xl font-bold mb-6 md:mb-8 text-white border-b border-white/20 pb-4 flex items-center gap-2"><span>📝</span> Log Transaction</h2>
                <form className="flex flex-col gap-4 md:gap-5 max-w-2xl">
                  <input type="hidden" name="event_id" value={id} />
                  <div>
                    <label className="text-xs font-bold text-emerald-300 uppercase ml-1 block mb-1 md:mb-2">Transaction Type</label>
                    <select name="type" required className="w-full bg-slate-800 border border-white/20 text-white p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 transition text-sm md:text-base">
                      <option value="DEPOSIT">💰 Member Deposit</option>
                      <option value="SHARED_EXPENSE">🍽️ Shared Expense</option>
                      <option value="PERSONAL_EXPENSE">🛍️ Personal Expense</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-emerald-300 uppercase ml-1 block mb-1 md:mb-2">Who Paid?</label>
                    <select name="payer_id" className="w-full bg-slate-800 border border-white/20 text-white p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 transition text-sm md:text-base">
                      <option value="">Select Member...</option>
                      {members?.filter(m => m.is_active !== false).map(m => m.user_id && (<option key={m.user_id} value={m.user_id}>{m.users?.name || m.member_email}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-emerald-300 uppercase ml-1 block mb-1 md:mb-2">Amount</label>
                    <input type="number" step="0.01" name="amount" placeholder="0.00" required className="w-full bg-slate-800 border border-white/20 text-white p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 transition font-mono text-sm md:text-base"/>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-emerald-300 uppercase ml-1 block mb-1 md:mb-2">Description</label>
                    <input type="text" name="description" placeholder="e.g., Bus Tickets" required className="w-full bg-slate-800 border border-white/20 text-white p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 transition text-sm md:text-base"/>
                  </div>
                  
                  <SubmitButton 
                    formAction={addTransaction as any} 
                    text="✓ Save Entry" 
                    loadingText="Processing..." 
                    className="mt-2 md:mt-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold py-3 px-4 rounded-lg hover:from-emerald-700 hover:to-emerald-600 transition-all shadow-lg transform hover:scale-[1.02] w-full"
                  />
                </form>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-xl border border-blue-400/20 p-8 md:p-12 rounded-2xl text-center"><span className="text-5xl md:text-6xl block mb-4 md:mb-6">🔒</span><h2 className="text-2xl md:text-3xl font-bold mb-2 md:mb-3 text-white">Viewer Mode</h2><p className="text-blue-200 text-sm md:text-base">Only the Event Manager can log transactions.</p></div>
            )}
          </div>

          {/* TAB 2: EVENT MEMBERS */}
          <div className="hidden peer-checked/tab2:block">
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 p-5 md:p-8 rounded-2xl shadow-xl">
              <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-white border-b border-white/20 pb-4 flex items-center gap-2"><span>👥</span> Event Members</h2>
              
              {isManager && (
                <form className="flex flex-col sm:flex-row gap-2 mb-6 md:mb-8">
                  <input type="hidden" name="event_id" value={id} />
                  <input type="email" name="email" placeholder="friend@email.com" required className="flex-1 bg-slate-800 border border-white/20 text-white p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 transition text-sm"/>
                  <SubmitButton formAction={addMember as any} text="Add Member" loadingText="Adding..." className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold py-3 sm:py-2 px-5 rounded-lg hover:from-emerald-700 transition shadow-md w-full sm:w-auto text-sm" />
                </form>
              )}

              <ul className="space-y-2 md:space-y-3">
                {members?.map(m => (
                  <li key={m.id} className={`py-3 px-3 md:px-4 flex justify-between items-center bg-white/5 hover:bg-white/10 rounded-lg transition border border-white/10 group ${m.is_active === false ? 'opacity-50 grayscale' : ''}`}>
                    <div className="truncate pr-2">
                      <span className="text-sm md:text-base font-semibold text-white block truncate">
                        {m.users?.name || m.member_email}
                        {m.is_active === false && <span className="ml-2 text-[10px] text-rose-300 border border-rose-500/50 bg-rose-500/10 px-2 py-0.5 rounded uppercase">Removed</span>}
                      </span>
                      {!m.user_id && <span className="text-xs text-gray-400 italic">Pending Invite</span>}
                    </div>
                    
                    {m.user_id === event?.manager_id ? (
                      <span className="text-[10px] md:text-xs text-emerald-400 bg-emerald-500/20 px-2 md:px-3 py-1 rounded-full font-bold border border-emerald-400/30 whitespace-nowrap">Manager</span>
                    ) : (
                      isManager && m.is_active !== false && (
                        <form action={removeMember as any}>
                          <input type="hidden" name="event_id" value={id} />
                          <input type="hidden" name="member_email" value={m.member_email} />
                          <button type="submit" className="text-[10px] md:text-xs text-red-400 font-bold hover:bg-red-500/20 px-2 py-1 rounded opacity-100 md:opacity-0 group-hover:opacity-100 transition">Remove</button>
                        </form>
                      )
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* TAB 3: LIVE BALANCES */}
          <div className="hidden peer-checked/tab3:block">
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 p-5 md:p-8 rounded-2xl shadow-xl">
              <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-white border-b border-white/20 pb-4 flex items-center gap-2"><span>⚖️</span> Live Balances</h2>
              <ul className="space-y-2 md:space-y-3">
                {members?.map(m => {
                  if (!m.user_id) return (<li key={m.id} className="py-3 px-3 md:px-4 flex justify-between items-center text-gray-400 text-xs md:text-sm bg-white/5 rounded-lg border border-white/10"><span className="truncate pr-2">{m.member_email}</span><span className="bg-yellow-500/20 text-yellow-300 px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-bold whitespace-nowrap">Pending</span></li>);
                  const bal = balances[m.user_id] || 0;
                  return (<li key={m.user_id} className={`py-3 px-3 md:px-4 flex justify-between items-center text-white bg-white/5 rounded-lg border border-white/10 ${m.is_active === false ? 'opacity-50' : ''}`}><span className="font-semibold text-sm md:text-base truncate pr-2">{m.users?.name} {m.is_active === false && '(Removed)'}</span><span className={`font-mono font-bold text-sm md:text-lg px-2 md:px-4 py-1 md:py-2 rounded-lg border whitespace-nowrap ${bal >= 0 ? 'text-emerald-400 border-emerald-400/30 bg-emerald-500/10' : 'text-rose-400 border-rose-400/30 bg-rose-500/10'}`}>{bal >= 0 ? '+' : ''}{bal.toFixed(2)} ৳</span></li>);
                })}
              </ul>
            </div>
          </div>

          {/* TAB 4: MY HISTORY */}
          <div className="hidden peer-checked/tab4:block">
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 p-5 md:p-8 rounded-2xl shadow-xl">
              <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-white border-b border-white/20 pb-4 flex items-center gap-2">
                <span>👤</span> My Personal History
              </h2>
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 md:p-8 mb-6 md:mb-8 text-center shadow-inner">
                <p className="text-gray-300 text-xs md:text-sm font-bold uppercase tracking-wider mb-2">My Current Balance</p>
                <p className={`text-4xl md:text-6xl font-mono font-bold ${myBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {myBalance >= 0 ? '+' : ''}{myBalance.toFixed(2)} ৳
                </p>
                <p className="text-xs md:text-sm text-gray-400 mt-2 md:mt-4">{myBalance >= 0 ? 'You have extra funds in the tour wallet.' : 'You owe money to the group.'}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                <div className="bg-white/5 p-4 md:p-6 rounded-xl border border-emerald-500/20">
                  <h3 className="text-lg md:text-xl font-bold text-emerald-300 mb-3 md:mb-4 border-b border-emerald-500/30 pb-2 flex items-center gap-2"><span>💳</span> Money Deposited</h3>
                  <ul className="space-y-2 md:space-y-3 max-h-80 overflow-y-auto pr-1 md:pr-2">
                    {myDeposits.length > 0 ? myDeposits.map(t => (
                      <li key={t.id} className="flex justify-between items-center bg-black/20 p-2 md:p-3 rounded-lg border border-white/5">
                        <div className="truncate pr-2"><span className="font-bold text-white block text-sm md:text-base truncate">{t.description}</span><span className="text-[10px] md:text-xs text-gray-400">Deposit</span></div><span className="font-mono text-emerald-400 font-bold text-sm md:text-base whitespace-nowrap">+{Number(t.amount).toFixed(2)} ৳</span>
                      </li>
                    )) : <p className="text-gray-400 italic text-xs md:text-sm py-4">You haven't deposited any money yet.</p>}
                  </ul>
                </div>
                <div className="bg-white/5 p-4 md:p-6 rounded-xl border border-rose-500/20">
                  <h3 className="text-lg md:text-xl font-bold text-rose-300 mb-3 md:mb-4 border-b border-rose-500/30 pb-2 flex items-center gap-2"><span>📉</span> My Tour Costs</h3>
                  <ul className="space-y-2 md:space-y-3 max-h-80 overflow-y-auto pr-1 md:pr-2">
                    {mySplits.length > 0 || myPersonalCosts.length > 0 ? (
                      <>
                        {mySplits.map(s => (
                          <li key={s.id} className="flex justify-between items-center bg-black/20 p-2 md:p-3 rounded-lg border border-white/5"><div className="truncate pr-2"><span className="font-bold text-white block text-sm md:text-base truncate">{(s.transactions as any)?.description || 'Shared Cost'}</span><span className="text-[10px] md:text-xs text-gray-400">My Share</span></div><span className="font-mono text-rose-400 font-bold text-sm md:text-base whitespace-nowrap">-{Number(s.amount_owed).toFixed(2)} ৳</span></li>
                        ))}
                        {myPersonalCosts.map(t => (
                          <li key={t.id} className="flex justify-between items-center bg-black/20 p-2 md:p-3 rounded-lg border border-white/5"><div className="truncate pr-2"><span className="font-bold text-white block text-sm md:text-base truncate">{t.description}</span><span className="text-[10px] md:text-xs text-gray-400">Personal Expense</span></div><span className="font-mono text-rose-400 font-bold text-sm md:text-base whitespace-nowrap">-{Number(t.amount).toFixed(2)} ৳</span></li>
                        ))}
                      </>
                    ) : <p className="text-gray-400 italic text-xs md:text-sm py-4">No costs have been assigned to you yet.</p>}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* TAB 5: SETTLE UP */}
          <div className="hidden peer-checked/tab5:block">
            <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-xl border border-blue-400/30 p-5 md:p-8 rounded-2xl shadow-xl">
              <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-white border-b border-blue-400/30 pb-4 flex items-center gap-2"><span>🤝</span> Settle Up</h2>
              {settlements.length > 0 ? (
                <ul className="space-y-2 md:space-y-3">
                  {settlements.map((s, idx) => (
                    <li key={idx} className="flex justify-between items-center bg-white/5 p-3 md:p-4 rounded-lg border border-white/10 flex-wrap gap-2"><span className="text-sm md:text-base text-white truncate max-w-[60%]"><span className="text-rose-400 font-bold">{s.from}</span> <span className="text-gray-400">owes</span> <span className="text-emerald-400 font-bold">{s.to}</span></span><span className="font-mono font-bold text-sm md:text-base text-blue-300 bg-blue-500/20 px-2 md:px-3 py-1 rounded-lg border border-blue-400/30 whitespace-nowrap">{s.amount.toFixed(2)} ৳</span></li>
                  ))}
                </ul>
              ) : (<p className="text-center py-6 md:py-8 text-emerald-300 font-semibold text-base md:text-lg">✨ Everyone is perfectly settled up!</p>)}
            </div>
          </div>

          {/* TAB 6: DEPOSITS */}
          <div className="hidden peer-checked/tab6:block">
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-emerald-500/30 p-5 md:p-8 rounded-2xl shadow-xl">
              <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-emerald-300 border-b border-emerald-500/30 pb-4 flex items-center gap-2 md:gap-3"><span className="text-2xl md:text-3xl">💰</span> Deposits</h2>
              <div className="max-h-96 overflow-y-auto pr-1 md:pr-2 space-y-2 md:space-y-3">
                {depositsList.length > 0 ? (
                  <>
                    {depositsList.map(t => (
                      <li key={t.id} className="py-3 md:py-4 px-3 md:px-4 flex justify-between items-center text-white bg-white/5 rounded-lg border border-white/5 group list-none"><div className="truncate pr-2"><span className="font-bold block text-white text-sm md:text-lg truncate">{t.description}</span><span className="text-[10px] md:text-sm text-gray-300 mt-1 block truncate">💳 {t.users?.name || 'Member'}</span></div><div className="flex items-center gap-2 md:gap-4"><span className="font-mono font-bold text-emerald-400 text-sm md:text-lg bg-emerald-500/20 px-2 md:px-3 py-1 rounded-lg border border-emerald-400/30 whitespace-nowrap">+{Number(t.amount).toFixed(2)} ৳</span>{isManager && (<form action={deleteTransaction as any}><input type="hidden" name="tx_id" value={t.id}/><input type="hidden" name="event_id" value={id}/><button type="submit" className="opacity-100 md:opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition text-lg md:text-xl p-1" title="Delete">🗑️</button></form>)}</div></li>
                    ))}
                  </>
                ) : (<p className="text-gray-400 italic text-xs md:text-sm p-4 md:p-6 text-center border-2 border-dashed border-emerald-500/30 rounded-lg">📭 No deposits logged.</p>)}
              </div>
            </div>
          </div>

          {/* TAB 7: EXPENSES */}
          <div className="hidden peer-checked/tab7:block">
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-rose-500/30 p-5 md:p-8 rounded-2xl shadow-xl">
              <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-rose-300 border-b border-rose-500/30 pb-4 flex items-center gap-2 md:gap-3"><span className="text-2xl md:text-3xl">💸</span> Tour Expenses</h2>
              <div className="max-h-96 overflow-y-auto pr-1 md:pr-2 space-y-2 md:space-y-3">
                {spendsList.length > 0 ? (
                  <>
                    {spendsList.map(t => (
                      <li key={t.id} className="py-3 md:py-4 px-3 md:px-4 flex justify-between items-center text-white bg-white/5 rounded-lg border border-white/5 group list-none"><div className="truncate pr-2"><span className="font-bold block text-white text-sm md:text-lg truncate">{t.description}</span><span className="text-[10px] md:text-sm text-gray-300 mt-1 block truncate"><span className="bg-gray-500/30 px-1 md:px-2 py-0.5 md:py-1 rounded text-[9px] md:text-xs mr-1 md:mr-2 border border-gray-400/30">{t.type.replace('_', ' ')}</span>{t.payer_id ? `💳 ${t.users?.name || 'Member'}` : '🔄 System'}</span></div><div className="flex items-center gap-2 md:gap-4"><span className="font-mono font-bold text-rose-400 text-sm md:text-lg bg-rose-500/20 px-2 md:px-3 py-1 rounded-lg border border-rose-400/30 whitespace-nowrap">-{Number(t.amount).toFixed(2)} ৳</span>{isManager && (<form action={deleteTransaction as any}><input type="hidden" name="tx_id" value={t.id}/><input type="hidden" name="event_id" value={id}/><button type="submit" className="opacity-100 md:opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition text-lg md:text-xl p-1" title="Delete">🗑️</button></form>)}</div></li>
                    ))}
                  </>
                ) : (<p className="text-gray-400 italic text-xs md:text-sm p-4 md:p-6 text-center border-2 border-dashed border-rose-500/30 rounded-lg">📭 No expenses logged.</p>)}
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}