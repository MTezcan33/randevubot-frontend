export const triggerCreateInstanceWebhook = async (companyData) => {
  const webhookUrl = import.meta.env.VITE_N8N_CREATE_INSTANCE_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error("VITE_N8N_CREATE_INSTANCE_WEBHOOK_URL is not defined in .env file");
    throw new Error("Webhook URL is not configured.");
  }

  const payload = {
    record: {
      ...companyData,
      whatsappNumber: companyData.whatsapp_number,
    },
    // Add any other top-level properties if n8n expects them
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Webhook failed with status:", response.status, "Body:", errorBody);
      throw new Error(`Webhook request failed with status ${response.status}`);
    }
    
    // Assuming n8n returns a JSON response on success
    const result = await response.json();
    return result;

  } catch (error) {
    console.error("Error triggering create instance webhook:", error);
    throw error;
  }
};