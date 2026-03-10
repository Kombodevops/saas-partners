type ReservaEmailBase = {
  restauranteNombre: string;
  salaNombre?: string;
  planNombre?: string;
  fecha?: string;
  horaInicio?: string;
  horaFin?: string;
  aforoMin?: string | number;
  aforoMax?: string | number;
};

const BRAND = {
  primary: '#7472FD',
  secondary: '#E2FF00',
  dark: '#100E2F',
};

const buildHeader = (logoUrl?: string) =>
  logoUrl
    ? `<div style="margin:0 0 16px;"><img src="${logoUrl}" alt="Komvo" style="height:32px;display:block;" /></div>`
    : '';

const buildCta = (url: string) => `
  <a href="${url}" style="display:inline-block;background:${BRAND.primary};color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;">
    Ver reserva
  </a>
`;

const buildFooter = () => `
  <div style="margin-top:20px;border-top:1px solid #e2e8f0;padding-top:14px;font-size:12px;color:#475569;">
    <p style="margin:0 0 8px;">Síguenos:</p>
    <p style="margin:0;">
      <a href="https://www.instagram.com/komvoapp/" style="color:${BRAND.primary};text-decoration:none;margin-right:10px;">Instagram</a>
      <a href="https://es.linkedin.com/company/komvo" style="color:${BRAND.primary};text-decoration:none;margin-right:10px;">LinkedIn</a>
      <a href="https://www.tiktok.com/@komvoapp" style="color:${BRAND.primary};text-decoration:none;">TikTok</a>
    </p>
  </div>
`;

export const buildReservaCreadaEmail = (params: {
  isAdhoc: boolean;
  isConsumoLibreSinAnticipo: boolean;
  manageUrl: string;
  logoUrl?: string;
  data: ReservaEmailBase;
}) => {
  const { isAdhoc, isConsumoLibreSinAnticipo, manageUrl, logoUrl, data } = params;
  const cta = buildCta(manageUrl);
  const header = buildHeader(logoUrl);
  const footer = buildFooter();
  if (isAdhoc) {
    return {
      subject: 'Presupuesto personalizado listo - Komvo',
      htmlContent: `
        <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
          ${header}
          <h2 style="margin:0 0 12px;">Presupuesto personalizado listo</h2>
          <p style="margin:0 0 8px;">El restaurante te ha enviado un presupuesto personalizado para tu reserva.</p>
          <p style="margin:0 0 16px;">Para formalizarla, debes realizar el pago completo del importe indicado por el restaurante.</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin-bottom:16px;">
            <p style="margin:0 0 6px;"><strong>Restaurante:</strong> ${data.restauranteNombre}</p>
            <p style="margin:0 0 6px;"><strong>Espacio:</strong> ${data.salaNombre ?? ''}</p>
            <p style="margin:0 0 6px;"><strong>Fecha:</strong> ${data.fecha ?? ''}</p>
            <p style="margin:0 0 6px;"><strong>Horario:</strong> ${data.horaInicio ?? ''} - ${data.horaFin ?? ''}</p>
            <p style="margin:0;"><strong>Aforo:</strong> ${data.aforoMin ?? ''} - ${data.aforoMax ?? ''}</p>
          </div>
          <p style="margin:0 0 12px;">Revisa el presupuesto y completa el pago aquí:</p>
          ${cta}
          ${footer}
        </div>
      `,
    };
  }

  if (isConsumoLibreSinAnticipo) {
    return {
      subject: 'Reserva de consumo libre pendiente de confirmación - Komvo',
      htmlContent: `
        <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
          ${header}
          <h2 style="margin:0 0 12px;">Reserva de consumo libre pendiente de confirmación</h2>
          <p style="margin:0 0 8px;">El restaurante ha creado una reserva de consumo libre en el local.</p>
          <p style="margin:0 0 16px;">Para confirmarla, debes acceder al enlace y validar la reserva.</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin-bottom:16px;">
            <p style="margin:0 0 6px;"><strong>Restaurante:</strong> ${data.restauranteNombre}</p>
            <p style="margin:0 0 6px;"><strong>Espacio:</strong> ${data.salaNombre ?? ''}</p>
            <p style="margin:0 0 6px;"><strong>Fecha:</strong> ${data.fecha ?? ''}</p>
            <p style="margin:0 0 6px;"><strong>Horario:</strong> ${data.horaInicio ?? ''} - ${data.horaFin ?? ''}</p>
            <p style="margin:0;"><strong>Aforo:</strong> ${data.aforoMin ?? ''} - ${data.aforoMax ?? ''}</p>
          </div>
          <p style="margin:0 0 12px;">Confirma tu reserva aquí:</p>
          ${cta}
          ${footer}
        </div>
      `,
    };
  }

  return {
    subject: 'Nueva reserva creada - Komvo',
    htmlContent: `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
        ${header}
        <h2 style="margin:0 0 12px;">Tu reserva está creada</h2>
        <p style="margin:0 0 16px;">Se ha creado una nueva reserva en Komvo.</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin-bottom:16px;">
          <p style="margin:0 0 6px;"><strong>Restaurante:</strong> ${data.restauranteNombre}</p>
          <p style="margin:0 0 6px;"><strong>Sala:</strong> ${data.salaNombre ?? ''}</p>
          <p style="margin:0 0 6px;"><strong>Plan:</strong> ${data.planNombre ?? ''}</p>
          <p style="margin:0 0 6px;"><strong>Fecha:</strong> ${data.fecha ?? ''}</p>
          <p style="margin:0 0 6px;"><strong>Horario:</strong> ${data.horaInicio ?? ''} - ${data.horaFin ?? ''}</p>
          <p style="margin:0;"><strong>Aforo:</strong> ${data.aforoMin ?? ''} - ${data.aforoMax ?? ''}</p>
        </div>
        <p style="margin:0 0 12px;">Gestiona tu reserva aquí:</p>
        ${cta}
        ${footer}
      </div>
    `,
  };
};

export const buildReservaEstadoEmail = (params: {
  accepted: boolean;
  manageUrl: string;
  motivo?: string;
  logoUrl?: string;
  data: ReservaEmailBase;
}) => {
  const { accepted, manageUrl, motivo, logoUrl, data } = params;
  const cta = buildCta(manageUrl);
  const header = buildHeader(logoUrl);
  const footer = buildFooter();
  if (accepted) {
    return {
      subject: 'Reserva aceptada - Komvo',
      htmlContent: `
        <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
          ${header}
          <h2 style="margin:0 0 12px;">Tu reserva ha sido aceptada</h2>
          <p style="margin:0 0 16px;">El restaurante ha aceptado la reserva y ahora puedes gestionarla desde el enlace.</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin-bottom:16px;">
            <p style="margin:0 0 6px;"><strong>Restaurante:</strong> ${data.restauranteNombre}</p>
            <p style="margin:0 0 6px;"><strong>Espacio:</strong> ${data.salaNombre ?? ''}</p>
            <p style="margin:0 0 6px;"><strong>Plan:</strong> ${data.planNombre ?? ''}</p>
            <p style="margin:0 0 6px;"><strong>Fecha:</strong> ${data.fecha ?? ''}</p>
            <p style="margin:0;"><strong>Horario:</strong> ${data.horaInicio ?? ''} - ${data.horaFin ?? ''}</p>
          </div>
          <p style="margin:0 0 12px;">Gestiona tu reserva aquí:</p>
          ${cta}
          ${footer}
        </div>
      `,
    };
  }

  const motivoBlock = motivo ? `<p><strong>Motivo:</strong> ${motivo}</p>` : '';
  return {
    subject: 'Reserva cancelada - Komvo',
    htmlContent: `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
        ${header}
        <h2 style="margin:0 0 12px;">Reserva cancelada</h2>
        <p style="margin:0 0 8px;">El restaurante ha cancelado tu reserva.</p>
        ${motivoBlock}
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin:16px 0;">
          <p style="margin:0 0 6px;"><strong>Restaurante:</strong> ${data.restauranteNombre}</p>
          <p style="margin:0 0 6px;"><strong>Espacio:</strong> ${data.salaNombre ?? ''}</p>
          <p style="margin:0 0 6px;"><strong>Plan:</strong> ${data.planNombre ?? ''}</p>
          <p style="margin:0 0 6px;"><strong>Fecha:</strong> ${data.fecha ?? ''}</p>
          <p style="margin:0;"><strong>Horario:</strong> ${data.horaInicio ?? ''} - ${data.horaFin ?? ''}</p>
        </div>
        <p style="margin:0 0 12px;">Puedes revisar los detalles en el enlace:</p>
        ${cta}
        ${footer}
      </div>
    `,
  };
};

export const buildReservaUpdateEmail = (params: {
  subject: string;
  intro: string;
  changes: string[];
  manageUrl: string;
  logoUrl?: string;
}) => {
  const { subject, intro, changes, manageUrl, logoUrl } = params;
  const listItems = changes.map((item) => `<li>${item}</li>`).join('');
  const header = buildHeader(logoUrl);
  const footer = buildFooter();
  return {
    subject: `${subject} - Komvo`,
    htmlContent: `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
        ${header}
        <h2 style="margin:0 0 12px;">${subject}</h2>
        <p style="margin:0 0 12px;">${intro}</p>
        <ul style="margin:0 0 16px;padding-left:18px;">${listItems}</ul>
        ${buildCta(manageUrl)}
        ${footer}
      </div>
    `,
  };
};

export const buildFechaLimiteEmail = (params: { fechaLimitePago: string; manageUrl: string; logoUrl?: string }) => {
  const { fechaLimitePago, manageUrl, logoUrl } = params;
  const header = buildHeader(logoUrl);
  const footer = buildFooter();
  return {
    subject: 'Fecha límite de pago actualizada - Komvo',
    htmlContent: `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
        ${header}
        <h2 style="margin:0 0 12px;">Actualización de fecha límite de pago</h2>
        <p style="margin:0 0 8px;">La fecha límite de pago de tu reserva ha sido actualizada.</p>
        <p style="margin:0 0 16px;"><strong>Nueva fecha límite:</strong> ${fechaLimitePago}</p>
        ${buildCta(manageUrl)}
        ${footer}
      </div>
    `,
  };
};

export const buildCambioEstadoEmail = (params: { accepted: boolean; manageUrl: string; logoUrl?: string }) => {
  const { accepted, manageUrl, logoUrl } = params;
  const cta = buildCta(manageUrl);
  const header = buildHeader(logoUrl);
  const footer = buildFooter();
  return accepted
    ? {
        subject: 'Cambio de reserva aceptado - Komvo',
        htmlContent: `
          <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
            ${header}
            <h2 style="margin:0 0 12px;">Cambio de reserva aceptado</h2>
            <p style="margin:0 0 16px;">El restaurante ha aceptado el cambio solicitado y tu reserva ha sido actualizada.</p>
            ${cta}
            ${footer}
          </div>
        `,
      }
    : {
        subject: 'Cambio de reserva rechazado - Komvo',
        htmlContent: `
          <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
            ${header}
            <h2 style="margin:0 0 12px;">Cambio de reserva rechazado</h2>
            <p style="margin:0 0 16px;">El restaurante no ha podido aceptar el cambio solicitado.</p>
            ${cta}
            ${footer}
          </div>
        `,
      };
};

export const buildExpiradaEstadoEmail = (params: { confirmed: boolean; manageUrl: string; logoUrl?: string }) => {
  const { confirmed, manageUrl, logoUrl } = params;
  const cta = buildCta(manageUrl);
  const header = buildHeader(logoUrl);
  const footer = buildFooter();
  return confirmed
    ? {
        subject: 'Reserva confirmada por el restaurante - Komvo',
        htmlContent: `
          <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
            ${header}
            <h2 style="margin:0 0 12px;">Reserva confirmada</h2>
            <p style="margin:0 0 16px;">El restaurante ha confirmado tu reserva.</p>
            ${cta}
            ${footer}
          </div>
        `,
      }
    : {
        subject: 'Reserva cancelada definitivamente - Komvo',
        htmlContent: `
          <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
            ${header}
            <h2 style="margin:0 0 12px;">Reserva cancelada</h2>
            <p style="margin:0 0 16px;">El restaurante ha cancelado definitivamente la reserva.</p>
            ${cta}
            ${footer}
          </div>
        `,
      };
};

export const buildReservaManageEmail = (params: { manageUrl: string; logoUrl?: string }) => {
  const { manageUrl, logoUrl } = params;
  const header = buildHeader(logoUrl);
  const footer = buildFooter();
  return {
    subject: 'Gestiona tu reserva - Komvo',
    htmlContent: `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
        ${header}
        <h2 style="margin:0 0 12px;">Gestiona tu reserva</h2>
        <p style="margin:0 0 16px;">Puedes gestionar tu reserva desde el siguiente enlace:</p>
        ${buildCta(manageUrl)}
        ${footer}
      </div>
    `,
  };
};
