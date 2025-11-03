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
        subject = "Confirma tu cuenta - Winerim";
        htmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; background-color: #fef2f2;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; padding: 40px 20px;">
                <tr>
                  <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                      
                      <!-- Header with Wine Glass Icon -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%); padding: 40px 30px; text-align: center;">
                          <div style="font-size: 48px; margin-bottom: 10px;">🍷</div>
                          <h1 style="color: #ffffff; margin: 0; font-family: 'Georgia', serif; font-size: 32px; font-weight: 700;">Winerim</h1>
                          <p style="color: #fecaca; margin: 10px 0 0 0; font-family: Arial, sans-serif; font-size: 16px;">Tu viaje enológico comienza aquí</p>
                        </td>
                      </tr>
                      
                      <!-- Content -->
                      <tr>
                        <td style="padding: 40px 30px;">
                          <h2 style="color: #7f1d1d; margin: 0 0 20px 0; font-family: 'Georgia', serif; font-size: 24px;">
                            ¡Bienvenido${user.user_metadata?.first_name ? ', ' + user.user_metadata.first_name : ''}!
                          </h2>
                          
                          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; font-family: Arial, sans-serif;">
                            Gracias por unirte a <strong>Winerim</strong>, tu plataforma de descubrimiento y recomendación de vinos personalizada.
                          </p>
                          
                          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; font-family: Arial, sans-serif;">
                            Para activar tu cuenta y comenzar a explorar el mundo del vino, confirma tu dirección de email:
                          </p>
                          
                          <!-- CTA Button -->
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td align="center" style="padding: 20px 0;">
                                <a href="${site_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to || 'https://7e9b6f66-d4ee-404a-8678-c9afab22de75.lovableproject.com/'}" 
                                   style="background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%); 
                                          color: #ffffff; 
                                          padding: 16px 40px; 
                                          text-decoration: none; 
                                          border-radius: 8px; 
                                          font-size: 16px; 
                                          font-weight: bold;
                                          display: inline-block;
                                          font-family: Arial, sans-serif;
                                          box-shadow: 0 4px 6px rgba(127, 29, 29, 0.3);">
                                  ✓ Confirmar mi cuenta
                                </a>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Alternative Link -->
                          <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; font-family: Arial, sans-serif;">
                            Si el botón no funciona, copia y pega este enlace en tu navegador:
                          </p>
                          <p style="color: #7f1d1d; font-size: 13px; word-break: break-all; margin: 10px 0; font-family: 'Courier New', monospace; background-color: #fef2f2; padding: 12px; border-radius: 6px; border-left: 4px solid #991b1b;">
                            ${site_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to || 'https://7e9b6f66-d4ee-404a-8678-c9afab22de75.lovableproject.com/'}
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #fef2f2; padding: 30px; text-align: center; border-top: 1px solid #fee2e2;">
                          <p style="color: #9ca3af; font-size: 13px; margin: 0 0 10px 0; font-family: Arial, sans-serif;">
                            Si no te has registrado en Winerim, puedes ignorar este email.
                          </p>
                          <p style="color: #d1d5db; font-size: 12px; margin: 0; font-family: Arial, sans-serif;">
                            © ${new Date().getFullYear()} Winerim. Todos los derechos reservados.
                          </p>
                        </td>
                      </tr>
                      
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `;
        break;


      case "recovery":
        subject = "Restablecer contraseña - Winerim";
        htmlContent = `
          <!DOCTYPE html>
          <html>
            <body style="margin: 0; padding: 0; background-color: #fef2f2;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; padding: 40px 20px;">
                <tr>
                  <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                      <tr>
                        <td style="background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%); padding: 40px 30px; text-align: center;">
                          <div style="font-size: 48px; margin-bottom: 10px;">🍷</div>
                          <h1 style="color: #ffffff; margin: 0; font-family: 'Georgia', serif; font-size: 32px; font-weight: 700;">Winerim</h1>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 40px 30px;">
                          <h2 style="color: #7f1d1d; margin: 0 0 20px 0; font-family: 'Georgia', serif; font-size: 24px;">
                            Restablecer contraseña
                          </h2>
                          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; font-family: Arial, sans-serif;">
                            Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el botón para crear una nueva:
                          </p>
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td align="center" style="padding: 20px 0;">
                                <a href="${site_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to || 'https://7e9b6f66-d4ee-404a-8678-c9afab22de75.lovableproject.com/'}" 
                                   style="background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block; font-family: Arial, sans-serif;">
                                  🔑 Restablecer Contraseña
                                </a>
                              </td>
                            </tr>
                          </table>
                          <p style="color: #ef4444; font-size: 14px; margin: 20px 0; font-family: Arial, sans-serif;">
                            ⏱️ Este enlace expirará en 1 hora por seguridad.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="background-color: #fef2f2; padding: 30px; text-align: center; border-top: 1px solid #fee2e2;">
                          <p style="color: #9ca3af; font-size: 13px; margin: 0; font-family: Arial, sans-serif;">
                            Si no solicitaste este cambio, ignora este email.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
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
      from: "Winerim <noreply@winerim.com>",
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