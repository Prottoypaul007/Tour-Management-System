'use client'
import { useFormStatus } from 'react-dom'

interface Props {
  text: string;
  loadingText: string;
  className: string;
  formAction: (formData: FormData) => void; // Added this!
}

export function SubmitButton({ text, loadingText, className, formAction }: Props) {
  const { pending } = useFormStatus()

  return (
    <button 
      formAction={formAction} // THIS IS THE FIX: The engine is now connected
      disabled={pending}
      className={`${className} ${pending ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          {loadingText}
        </span>
      ) : text}
    </button>
  )
}