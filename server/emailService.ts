/**
 * Service d'envoi d'emails via Microsoft Graph API
 * Utilise OAuth2 Client Credentials pour obtenir un token d'accès
 */

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedToken.accessToken;
  }

  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("AZURE_TENANT_ID, AZURE_CLIENT_ID et AZURE_CLIENT_SECRET doivent être configurés");
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Échec obtention token Azure: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return data.access_token;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const mailFrom = process.env.AZURE_MAIL_FROM;
  if (!mailFrom) {
    throw new Error("AZURE_MAIL_FROM doit être configuré");
  }

  const accessToken = await getAccessToken();
  const graphUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailFrom)}/sendMail`;

  const response = await fetch(graphUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        subject: options.subject,
        body: { contentType: "HTML", content: options.html },
        toRecipients: [{ emailAddress: { address: options.to } }],
      },
      saveToSentItems: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Échec envoi Graph API: ${response.status} - ${errorText}`);
  }

  console.log(`[Graph API] Email envoyé à ${options.to}`);
}
