'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return redirect('/login');

  const fullName = formData.get('fullName') as string;

  // 1. Update the hidden Auth Metadata (keeps the session/cookies updated)
  const { error: authError } = await supabase.auth.updateUser({
    data: { full_name: fullName }
  });

  if (authError) {
    console.error("Auth Update Error:", authError.message);
    return redirect('/profile?message=Failed to update secure profile.');
  }

  // 2. NEW: Update your public 'users' table (keeps the database/ledger updated)
  const { error: dbError } = await supabase
    .from('users')
    .update({ name: fullName }) // 'name' matches your database column
    .eq('id', user.id);

  if (dbError) {
    console.error("Database Update Error:", dbError.message);
    return redirect('/profile?message=Failed to update public database.');
  }

  // Refresh the entire layout so the dashboard instantly shows the new name
  revalidatePath('/', 'layout');
  redirect('/profile?success=Name updated successfully!');
}