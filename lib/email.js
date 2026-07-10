import nodemailer from "nodemailer";

export function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

export async function sendDemandNotification({ demand, responsible }) {
  if (!isSmtpConfigured()) {
    throw new Error("SMTP não configurado. Preencha SMTP_HOST e SMTP_FROM no ambiente.");
  }

  if (!responsible?.email) {
    throw new Error("Responsável sem e-mail cadastrado.");
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER && process.env.SMTP_PASSWORD
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      : undefined
  });

  const deadline = demand.deadline ? new Date(`${demand.deadline}T00:00:00`).toLocaleDateString("pt-BR") : "Sem prazo";
  const subject = `Demanda Verve: ${demand.client} - ${demand.title}`;
  const text = [
    `Olá, ${responsible.name}.`,
    "",
    "Você recebeu uma notificação de demanda no painel Verve.",
    "",
    `Cliente: ${demand.client}`,
    `Demanda: ${demand.title}`,
    `Prazo: ${deadline}`,
    `Status: ${demand.done ? "Concluída" : "Pendente"}`,
    "",
    "Acesse o painel para acompanhar e atualizar essa entrega."
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #2a2118; line-height: 1.5;">
      <p>Olá, <strong>${escapeHtml(responsible.name)}</strong>.</p>
      <p>Você recebeu uma notificação de demanda no painel Verve.</p>
      <ul>
        <li><strong>Cliente:</strong> ${escapeHtml(demand.client)}</li>
        <li><strong>Demanda:</strong> ${escapeHtml(demand.title)}</li>
        <li><strong>Prazo:</strong> ${escapeHtml(deadline)}</li>
        <li><strong>Status:</strong> ${demand.done ? "Concluída" : "Pendente"}</li>
      </ul>
      <p>Acesse o painel para acompanhar e atualizar essa entrega.</p>
    </div>
  `;

  return transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: responsible.email,
    replyTo: process.env.SMTP_REPLY_TO || process.env.SMTP_FROM,
    subject,
    text,
    html
  });
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
