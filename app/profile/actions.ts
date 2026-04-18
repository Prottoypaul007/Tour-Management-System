'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function createEventWithInvites(formData: FormData) {
  const supabase = await createClient();
  
  // 1. Verify the user is logged in
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect('/login');

  // 2. Extract the form data
  const name = formData.get('name') as string;
  const start_date = formData.get('start_date') as string;
  const end_date = formData.get('end_date') as string;
  const rawEmails = formData.get('emails') as string;

  // 3. Create the Event in the database
  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert([{ 
      name, 
      start_date, 
      end_date, 
      manager_id: user.id 
    }])
    .select()
    .single();

  if (eventError || !event) {
    console.error("Error creating event:", eventError?.message);
    // Redirect back to the create page with an error if it fails
    return redirect('/create?message=Failed to create event. Please try again.');
  }

  // 4. Automatically add the Manager as the first active member of the tour
  await supabase.from('event_members').insert([{
    event_id: event.id,
    member_email: user.email,
    user_id: user.id
  }]);

  // 5. Process Invites (if any emails were entered)
  if (rawEmails && rawEmails.trim() !== '') {
    // Smart split: handles commas, semicolons, spaces, and new lines
    const emails = rawEmails.split(/[,;\n\s]+/).map(e => e.trim()).filter(e => e !== '');

    for (const email of emails) {
      // Prevent the manager from accidentally inviting themselves
      if (email.toLowerCase() === user.email?.toLowerCase()) continue;

      // Check if this invited friend already has an account on the platform
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      // Add them to the event roster (Auto-links their ID if they already exist!)
      await supabase.from('event_members').insert([{
        event_id: event.id,
        member_email: email,
        user_id: existingUser?.id || null 
      }]);
    }
  }

  // 6. Success! Redirect the user straight back to their new dashboard
  redirect('/');
}