import type { RegisterFormData } from '@/lib/validators/register.validator';

const buildHeader = (logoUrl?: string) =>
  logoUrl
    ? `<div style="margin:0 0 16px;"><img src="${logoUrl}" alt="Komvo" style="height:32px;display:block;" /></div>`
    : '';

const buildFooter = () => `
  <div style="margin-top:20px;border-top:1px solid #e2e8f0;padding-top:14px;font-size:12px;color:#475569;">
    <p style="margin:0 0 8px;">Síguenos:</p>
    <p style="margin:0;">
      <a href="https://www.instagram.com/komvoapp/" style="color:#7472FD;text-decoration:none;margin-right:10px;">Instagram</a>
      <a href="https://es.linkedin.com/company/komvo" style="color:#7472FD;text-decoration:none;margin-right:10px;">LinkedIn</a>
      <a href="https://www.tiktok.com/@komvoapp" style="color:#7472FD;text-decoration:none;">TikTok</a>
    </p>
  </div>
`;

export const buildRegisterAdminEmail = (data: RegisterFormData, logoUrl?: string) => ({
  subject: `Nueva solicitud de registro - ${data.nombre} ${data.apellidos}`,
  htmlContent: `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      ${buildHeader(logoUrl)}
      <h2 style="margin:0 0 12px;">Nueva solicitud de registro</h2>
      <p style="margin:0 0 12px;">Se ha recibido una nueva solicitud en Komvo Partners.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;">
        <p style="margin:0 0 6px;"><strong>Nombre:</strong> ${data.nombre} ${data.apellidos}</p>
        <p style="margin:0 0 6px;"><strong>Email:</strong> ${data.email}</p>
        <p style="margin:0;"><strong>Teléfono:</strong> ${data.prefijo} ${data.telefono}</p>
      </div>
      ${buildFooter()}
    </div>
  `,
});

export const buildRegisterPartnerEmail = (logoUrl?: string) => ({
  subject: 'Solicitud recibida - Komvo Partners',
  htmlContent: `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      ${buildHeader(logoUrl)}
      <h2 style="margin:0 0 12px;">Hemos recibido tu solicitud</h2>
      <p style="margin:0 0 8px;">Gracias por registrarte en Komvo Partners.</p>
      <p style="margin:0 0 8px;">En breve te contactaremos al número que nos has indicado para validar tu cuenta y darte acceso.</p>
      <p style="margin:0;">Muy pronto podrás empezar a atraer grupos a tus locales desde el marketplace.</p>
      ${buildFooter()}
    </div>
  `,
});
