import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const payload = await req.text();
    const data = JSON.parse(payload);
    const { user, email_data } = data;

    if (!user?.email) {
      return new Response("Missing user email", { status: 400 });
    }

    // Extract email data
    const {
      token,
      token_hash,
      redirect_to,
      email_action_type,
      site_url,
    } = email_data;

    let subject = "";
    let htmlContent = "";

    // Handle different email types
    switch (email_action_type) {
      case "signup":
        subject = "Confirma tu cuenta - Liquid Intelligence";
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333; text-align: center;">¡Bienvenido a Liquid Intelligence!</h1>
            <p style="color: #666; font-size: 16px;">
              Hola ${user.user_metadata?.first_name || ""},
            </p>
            <p style="color: #666; font-size: 16px;">
              Gracias por registrarte en Liquid Intelligence. Para completar tu registro, 
              confirma tu dirección de email haciendo clic en el botón de abajo:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${site_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-size: 16px; 
                        font-weight: bold;
                        display: inline-block;">
                Confirmar Email
              </a>
            </div>
            <p style="color: #999; font-size: 14px;">
              Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:
            </p>
            <p style="color: #667eea; font-size: 14px; word-break: break-all;">
              ${site_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}
            </p>
            <p style="color: #999; font-size: 14px; margin-top: 30px;">
              Si no te has registrado en Liquid Intelligence, puedes ignorar este email.
            </p>
          </div>
        `;
        break;

      case "recovery":
        subject = "Restablecer contraseña - Liquid Intelligence";
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333; text-align: center;">Restablecer contraseña</h1>
            <p style="color: #666; font-size: 16px;">
              Hola ${user.user_metadata?.first_name || ""},
            </p>
            <p style="color: #666; font-size: 16px;">
              Hemos recibido una solicitud para restablecer tu contraseña. 
              Haz clic en el botón de abajo para crear una nueva contraseña:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${site_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-size: 16px; 
                        font-weight: bold;
                        display: inline-block;">
                Restablecer Contraseña
              </a>
            </div>
            <p style="color: #999; font-size: 14px;">
              Este enlace expirará en 1 hora por seguridad.
            </p>
            <p style="color: #999; font-size: 14px; margin-top: 30px;">
              Si no solicitaste restablecer tu contraseña, puedes ignorar este email.
            </p>
          </div>
        `;
        break;

      default:
        subject = "Notificación - Liquid Intelligence";
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Liquid Intelligence</h1>
            <p>Tienes una notificación pendiente.</p>
            <a href="${site_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}">
              Hacer clic aquí
            </a>
          </div>
        `;
        break;
    }

    // Send email using Resend
    const { error } = await resend.emails.send({
      from: "Liquid Intelligence <noreply@resend.dev>", // Update this with your verified domain
      to: [user.email],
      subject: subject,
      html: htmlContent,
    });

    if (error) {
      console.error("Error sending email:", error);
      throw error;
    }

    console.log("Auth email sent successfully to:", user.email);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-auth-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});