'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function createEventWithInvites(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect('/login');

  const name = formData.get('name') as string;
  const start_date = formData.get('start_date') as string;
  const end_date = formData.get('end_date') as string;
  
  // FIX: Grab all inputs named "email" as an array!
  const rawEmails = formData.getAll('email') as string[];

  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert([{ name, start_date, end_date, manager_id: user.id }])
    .select()
    .single();

  if (eventError || !event) {
    console.error("Error creating event:", eventError?.message);
    return redirect('/create?message=Failed to create event. Please try again.');
  }

  // Add Manager
  await supabase.from('event_members').insert([{
    event_id: event.id,
    member_email: user.email,
    user_id: user.id
  }]);

  // FIX: Process the array of individual email inputs
  if (rawEmails && rawEmails.length > 0) {
    // Clean them up (remove empties and trim spaces)
    const validEmails = rawEmails.map(e => e.trim()).filter(e => e !== '');

    for (const email of validEmails) {
      if (email.toLowerCase() === user.email?.toLowerCase()) continue;

      const { data: existingUser } = await supabase.from('users').select('id').eq('email', email).single();

      await supabase.from('event_members').insert([{
        event_id: event.id,
        member_email: email,
        user_id: existingUser?.id || null 
      }]);
    }
  }

  redirect('/');
}