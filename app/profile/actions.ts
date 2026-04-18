'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return redirect('/login');

  const fullName = formData.get('fullName') as string;

  // Update the user's secure auth metadata
  const { error } = await supabase.auth.updateUser({
    data: { full_name: fullName }
  });

  if (error) {
    console.error("Profile Update Error:", error.message);
    return redirect('/profile?message=Failed to update name. Please try again.');
  }

  // Refresh the entire layout so the dashboard immediately shows the new name
  revalidatePath('/', 'layout');
  redirect('/profile?success=Name updated successfully!');
}