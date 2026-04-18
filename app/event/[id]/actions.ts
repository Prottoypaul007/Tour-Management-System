'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// --- 1. ADD TRANSACTION ---
export async function addTransaction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Not logged in" };

  const event_id = formData.get('event_id') as string;
  
  // SECURITY CHECK: Is this user actually the manager?
  const { data: event } = await supabase.from('events').select('manager_id').eq('id', event_id).single();
  if (event?.manager_id !== user.id) {
    return { success: false, message: "Only the manager can log expenses." };
  }

  const type = formData.get('type') as string; 
  const amount = parseFloat(formData.get('amount') as string);
  const description = formData.get('description') as string;
  const payer_id = formData.get('payer_id') as string; 

  // Save the raw transaction to the ledger
  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .insert([{ 
      event_id, 
      payer_id: payer_id || null, 
      type, 
      amount, 
      description 
    }])
    .select()
    .single();

  if (txError) {
    console.error("Transaction Error:", txError.message);
    return { success: false };
  }

  // --- PRECISION PENNY MATH ALGORITHM ---
  if (type === 'SHARED_EXPENSE') {
    // Only split among ACTIVE members
    const { data: activeMembers } = await supabase
      .from('event_members')
      .select('user_id')
      .eq('event_id', event_id)
      .not('user_id', 'is', null)
      .eq('is_active', true);

    if (activeMembers && activeMembers.length > 0) {
      // Convert to pure cents to avoid JavaScript floating-point errors
      const totalCents = Math.round(amount * 100);
      const memberCount = activeMembers.length;
      const baseSplitCents = Math.floor(totalCents / memberCount);
      let remainderCents = totalCents % memberCount;

      const splits = activeMembers.map(m => {
        let assignedCents = baseSplitCents;
        // Distribute the remainder pennies one-by-one until gone
        if (remainderCents > 0) {
          assignedCents += 1;
          remainderCents -= 1;
        }
        return {
          transaction_id: tx.id,
          user_id: m.user_id,
          amount_owed: assignedCents / 100 // Convert back to standard currency
        };
      });
      await supabase.from('expense_splits').insert(splits);
    }
  }

  revalidatePath(`/event/${event_id}`);
  return { success: true };
}

// --- 2. DELETE TRANSACTION ---
export async function deleteTransaction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Not logged in" };

  const tx_id = formData.get('tx_id') as string;
  const event_id = formData.get('event_id') as string;

  // SECURITY CHECK: Only the manager can delete
  const { data: event } = await supabase.from('events').select('manager_id').eq('id', event_id).single();
  if (event?.manager_id !== user.id) {
    return { success: false, message: "Only the manager can delete." };
  }

  // 1. Delete the splits first (to prevent database relationship errors)
  await supabase.from('expense_splits').delete().eq('transaction_id', tx_id);
  
  // 2. Delete the main transaction
  await supabase.from('transactions').delete().eq('id', tx_id);

  revalidatePath(`/event/${event_id}`);
  return { success: true };
}

// --- 3. ADD MEMBER ---
export async function addMember(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const event_id = formData.get('event_id') as string;
  const email = formData.get('email') as string;

  // SECURITY CHECK
  const { data: event } = await supabase.from('events').select('manager_id').eq('id', event_id).single();
  if (event?.manager_id !== user.id) return { success: false, message: "Unauthorized" };

  // Check if this email already belongs to an active user in the system
  const { data: existingUser } = await supabase.from('users').select('id').eq('email', email).single();

  // Add them to the event
  await supabase.from('event_members').insert([{
    event_id,
    member_email: email,
    user_id: existingUser?.id || null // Link instantly if they already have an account
  }]);

  revalidatePath(`/event/${event_id}`);
  return { success: true };
}

// --- 4. REMOVE MEMBER (SOFT DELETE) ---
export async function removeMember(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const event_id = formData.get('event_id') as string;
  const member_email = formData.get('member_email') as string;

  // SECURITY CHECK
  const { data: event } = await supabase.from('events').select('manager_id').eq('id', event_id).single();
  if (event?.manager_id !== user.id) return { success: false };

  // Prevent the manager from accidentally removing themselves
  if (member_email === user.email) return { success: false, message: "Cannot remove manager" };

  // Soft Delete: Hide them from active calculations, but keep past math intact
  await supabase.from('event_members')
    .update({ is_active: false })
    .eq('event_id', event_id)
    .eq('member_email', member_email);

  revalidatePath(`/event/${event_id}`);
  return { success: true };
}