import { Resend } from 'resend';

// This pulls the key you added to your .env.local file
const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendReceipt(email: string, amount: number, description: string, type: string) {
  try {
    await resend.emails.send({
      from: 'Tour Manager <onboarding@resend.dev>',
      to: email,
      subject: `Tour Receipt: ${description}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #047857;">Transaction Confirmed 💸</h2>
          <p>Your recent transaction has been logged securely in the Tour Ledger.</p>
          <ul style="background-color: #f9fafb; padding: 15px; border-radius: 5px; list-style: none;">
            <li><strong>Type:</strong> ${type.replace('_', ' ')}</li>
            <li><strong>Amount:</strong> ${amount.toFixed(2)} ৳</li>
            <li><strong>Description:</strong> ${description}</li>
          </ul>
          <p>Check your live dashboard to see your updated balance.</p>
        </div>
      `
    });
  } catch (error) {
    console.error("Email failed to send:", error);
  }
}