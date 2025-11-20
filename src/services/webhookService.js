import { supabase } from '@/lib/supabase';

/**
 * Triggers the n8n webhook to create an Evolution Manager instance.
 * This is now handled by a Supabase Edge Function for better security and reliability.
 * This client-side function now invokes the edge function.
 *
 * @param {object} companyData - The company data.
 * @returns {Promise<{ data: any, error: any }>}
 */
export const triggerCreateInstanceWebhook = async (companyData) => {
  try {
    const { data, error } = await supabase.functions.invoke('create-evolution-instance', {
      body: { companyData },
    });

    if (error) {
      throw new Error(`Webhook invocation failed: ${error.message}`);
    }

    console.log('Webhook invoked successfully:', data);
    return { data, error: null };
  } catch (error) {
    console.error('Error triggering create instance webhook:', error);
    return { data: null, error };
  }
};