import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Templates de mensagens por email (baseados nos templates WhatsApp)
const emailTemplates = {
  welcome: (data: any) => ({
    subject: '🎉 Bem-vindo à Y-TECH Internet 5G!',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🚀 Y-TECH Internet 5G</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0;">Bem-vindo(a) à nossa família!</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937;">Olá ${data.name}! 🎉</h2>
              <p style="color: #4b5563; line-height: 1.6;">
                É um prazer enorme ter você conosco! Seu cadastro foi realizado com sucesso.
              </p>
              
              <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #166534; margin: 0 0 15px 0;">📋 Seus Dados de Cadastro:</h3>
                <p style="margin: 5px 0;"><strong>Nome:</strong> ${data.name}</p>
                <p style="margin: 5px 0;"><strong>Email:</strong> ${data.email}</p>
                <p style="margin: 5px 0;"><strong>WhatsApp:</strong> ${data.whatsapp}</p>
                <p style="margin: 5px 0;"><strong>CPF:</strong> ${data.cpf}</p>
              </div>

              <h3 style="color: #1f2937;">🔐 Próximos Passos:</h3>
              <ol style="color: #4b5563; line-height: 1.8;">
                <li>Faça login na plataforma: <a href="${data.loginUrl}" style="color: #22c55e;">${data.loginUrl}</a></li>
                <li>Escolha seu plano e realize o pagamento para ativar sua conta</li>
                <li>Após a confirmação do pagamento, você receberá seu link de indicação exclusivo!</li>
              </ol>

              <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #92400e; margin: 0 0 10px 0;">💰 Sistema de Comissões</h3>
                <p style="color: #92400e; margin: 0;">
                  Com seu link de indicação ativo, você poderá convidar outras pessoas e ganhar comissões em até 4 níveis!
                </p>
              </div>

              <p style="color: #4b5563;">
                Estamos muito felizes em tê-lo(a) conosco! Se tiver qualquer dúvida, estamos à disposição.
              </p>
              <p style="color: #166534; font-weight: bold;">Seja bem-vindo(a) e bons negócios! 🎯</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1f2937; padding: 20px 30px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Y-TECH Internet 5G © 2025<br>Yrwen Technology - CNPJ: 30.266.458/0001-58
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  }),

  sim_activated: (data: any) => ({
    subject: `🎉 Seu ${data.productType} foi ATIVADO!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">✅ Ativação Confirmada!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937;">Olá ${data.name}! 🚀</h2>
              <p style="color: #4b5563; line-height: 1.6;">
                Ótimas notícias! Seu <strong>${data.productType}</strong> já está ativo e pronto para uso.
              </p>
              
              <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #166534; margin: 0 0 15px 0;">📱 O que fazer agora:</h3>
                <p style="color: #166534; white-space: pre-wrap;">${data.instructions}</p>
              </div>

              <h3 style="color: #1f2937;">🌐 Teste sua conexão:</h3>
              <ul style="color: #4b5563; line-height: 1.8;">
                <li>Abra o navegador</li>
                <li>Acesse qualquer site</li>
                <li>Faça uma chamada de teste</li>
              </ul>

              <p style="color: #4b5563;">Se tiver qualquer dúvida, estamos à disposição!</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1f2937; padding: 20px 30px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">Y-TECH Internet 5G</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  }),

  payment_pending: (data: any) => ({
    subject: '💰 Pagamento Pendente - Y-TECH Internet 5G',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">💰 Pagamento Pendente</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #4b5563; line-height: 1.6;">Seu pagamento está pendente.</p>
              <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Plano:</strong> ${data.planName}</p>
                <p style="margin: 5px 0;"><strong>Valor:</strong> R$ ${data.amount.toFixed(2)}</p>
              </div>
              <p style="color: #4b5563;">Complete o pagamento para ativar sua conta!</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1f2937; padding: 20px 30px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">Y-TECH Internet 5G</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  }),

  commission_earned: (data: any) => ({
    subject: '💸 Nova Comissão Recebida! - Y-TECH',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">💸 Nova Comissão!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
                <p style="font-size: 36px; font-weight: bold; color: #166534; margin: 0;">R$ ${data.amount.toFixed(2)}</p>
              </div>
              <p style="margin: 5px 0;"><strong>Nível:</strong> ${data.level}</p>
              <p style="margin: 5px 0;"><strong>Indicado:</strong> ${data.referredName}</p>
              <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                <em>Comissão será liberada após confirmação do pagamento.</em>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1f2937; padding: 20px 30px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">Y-TECH Internet 5G</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  }),

  commission_released: (data: any) => ({
    subject: '✅ Comissão Liberada! - Y-TECH',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">✅ Comissão Liberada!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
                <p style="font-size: 36px; font-weight: bold; color: #166534; margin: 0;">R$ ${data.amount.toFixed(2)}</p>
                <p style="color: #166534; margin: 10px 0 0 0;">disponível para saque!</p>
              </div>
              <p style="margin: 5px 0;"><strong>Indicado:</strong> ${data.referredName}</p>
              <p style="margin: 5px 0;"><strong>Nível:</strong> ${data.level}</p>
              <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                Saques disponíveis às sextas-feiras a partir das 00h.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1f2937; padding: 20px 30px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">Y-TECH Internet 5G</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  }),

  withdrawal_confirmed: (data: any) => ({
    subject: '🏦 Solicitação de Saque Recebida - Y-TECH',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🏦 Saque Solicitado</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <div style="background: #eff6ff; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Valor solicitado:</strong> R$ ${data.amount.toFixed(2)}</p>
                <p style="margin: 5px 0;"><strong>Taxa (3%):</strong> R$ ${data.fee.toFixed(2)}</p>
                <p style="margin: 5px 0; font-size: 18px;"><strong>Valor líquido:</strong> R$ ${data.netAmount.toFixed(2)}</p>
              </div>
              <p style="color: #4b5563;">Processamento em até 48h úteis.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1f2937; padding: 20px 30px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">Y-TECH Internet 5G</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  }),

  withdrawal_processed: (data: any) => ({
    subject: '✅ Saque Processado! - Y-TECH',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">✅ Saque Processado!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
                <p style="font-size: 36px; font-weight: bold; color: #166534; margin: 0;">R$ ${data.netAmount.toFixed(2)}</p>
                <p style="color: #166534; margin: 10px 0 0 0;">foram transferidos para sua chave PIX</p>
              </div>
              <p style="color: #4b5563;">Obrigado por fazer parte da Y-TECH! 🚀</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1f2937; padding: 20px 30px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">Y-TECH Internet 5G</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  }),

  charge_reminder: (data: any) => ({
    subject: '⏰ Lembrete de Pagamento - Y-TECH',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">⏰ Lembrete de Pagamento</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937;">Olá ${data.name}!</h2>
              <p style="color: #4b5563;">Seu pagamento está pendente há ${data.daysPending} dias.</p>
              <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Plano:</strong> ${data.planName}</p>
                <p style="margin: 5px 0;"><strong>Valor:</strong> R$ ${data.amount.toFixed(2)}</p>
              </div>
              <p style="color: #4b5563;">Complete o pagamento para manter seus benefícios ativos!</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1f2937; padding: 20px 30px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">Y-TECH Internet 5G</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  }),

  password_reset: (data: any) => ({
    subject: '🔐 Sua Nova Senha Temporária - Y-TECH',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🔐 Nova Senha</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937;">Olá ${data.name}!</h2>
              <p style="color: #4b5563;">Sua conta foi migrada com sucesso para nosso novo sistema.</p>
              <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>📧 Email:</strong> ${data.email}</p>
                <p style="margin: 10px 0; font-size: 24px; text-align: center;">
                  <strong>🔑 Senha:</strong> <code style="background: #dcfce7; padding: 5px 10px; border-radius: 6px;">${data.temporaryPassword}</code>
                </p>
              </div>
              <p style="color: #dc2626; font-weight: bold;">⚠️ IMPORTANTE: Por segurança, altere sua senha após o primeiro login.</p>
              <p style="margin-top: 20px;">
                <a href="${data.loginUrl || 'https://ytech.lovable.app/login'}" style="background: #22c55e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">Acessar a plataforma</a>
              </p>
              <p style="color: #4b5563; margin-top: 20px;">Bem-vindo(a) de volta! 🚀</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1f2937; padding: 20px 30px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">Y-TECH Internet 5G</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  }),

  new_referral: (data: any) => ({
    subject: '🎉 Novo Indicado Cadastrado! - Y-TECH',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎉 Novo Indicado!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937;">Olá ${data.referrerName}! 👋</h2>
              <p style="color: #4b5563;">Você acabou de receber um novo indicado:</p>
              <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>👤 Nome:</strong> ${data.newUserName}</p>
                <p style="margin: 5px 0;"><strong>📧 Email:</strong> ${data.newUserEmail}</p>
                <p style="margin: 5px 0;"><strong>📱 WhatsApp:</strong> ${data.newUserWhatsapp}</p>
              </div>
              <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #92400e; margin: 0 0 10px 0;">💰 Próximos passos:</h3>
                <p style="color: #92400e; margin: 0;">
                  Quando seu indicado realizar o pagamento do primeiro plano, você receberá sua comissão!
                </p>
              </div>
              <p style="color: #4b5563;">Continue compartilhando seu link e ampliando sua rede! 🚀</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1f2937; padding: 20px 30px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">Y-TECH Internet 5G</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  }),

  renewal_early_payment: (data: any) => ({
    subject: '✅ Renovação Antecipada Confirmada! - Y-TECH',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">✅ Renovação Confirmada!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937;">🎉 Seu plano foi renovado com sucesso!</h2>
              <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>📅 Nova data de vencimento:</strong></p>
                <p style="font-size: 24px; font-weight: bold; color: #166534; margin: 10px 0;">
                  ${new Date(data.nextRenewalDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
                <p style="margin: 5px 0;"><strong>💰 Valor pago:</strong> R$ ${data.amount.toFixed(2)}</p>
              </div>
              <p style="color: #4b5563;">
                ✅ Seu plano está ativo e renovado!<br>
                Sua próxima cobrança será gerada automaticamente 30 dias antes do vencimento.
              </p>
              <p style="color: #166534; font-weight: bold;">Obrigado por estar com a Y-TECH! 🚀</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1f2937; padding: 20px 30px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">Y-TECH Internet 5G</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  }),

  renewal_invoice_created: (data: any) => ({
    subject: '🔔 Nova Fatura de Renovação - Y-TECH',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🔔 Fatura de Renovação</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #4b5563;">Olá! Sua fatura de renovação foi criada automaticamente.</p>
              <div style="background: #eff6ff; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>💰 Valor:</strong> R$ ${Number(data.amount).toFixed(2)}</p>
                <p style="margin: 5px 0;"><strong>📅 Vencimento:</strong> ${data.dueDate}</p>
              </div>
              <h3 style="color: #1f2937;">✅ Como pagar:</h3>
              <p style="color: #4b5563;">Acesse a área financeira para visualizar o QR Code PIX e realizar o pagamento.</p>
              <p style="margin-top: 20px;">
                <a href="https://ytech.lovable.app/financial" style="background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">Acessar Área Financeira</a>
              </p>
              <p style="color: #dc2626; font-weight: bold; margin-top: 20px;">
                ⚠️ Importante: Mantenha seu pagamento em dia para não perder os benefícios!
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1f2937; padding: 20px 30px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">Y-TECH Internet 5G</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  }),

  renewal_paid_with_balance: (data: any) => ({
    subject: '🎉 Renovação Confirmada com Saldo! - Y-TECH',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎉 Renovação Confirmada!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937;">✅ Pagamento realizado com seu saldo!</h2>
              <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>💰 Valor descontado:</strong> R$ ${data.amountDeducted.toFixed(2)}</p>
                <p style="margin: 5px 0;"><strong>📊 Saldo restante:</strong> R$ ${data.remainingBalance.toFixed(2)}</p>
              </div>
              <div style="background: #dcfce7; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
                <p style="margin: 0; color: #166534;"><strong>🗓️ Seu plano está ativo até:</strong></p>
                <p style="font-size: 24px; font-weight: bold; color: #166534; margin: 10px 0;">
                  ${new Date(data.nextRenewalDate).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <p style="color: #6b7280; font-size: 14px;">
                <em>A próxima cobrança será gerada automaticamente.</em>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1f2937; padding: 20px 30px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">Y-TECH Internet 5G</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  }),

  renewal_with_discount: (data: any) => ({
    subject: '🎉 Renovação com Desconto! - Y-TECH',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎉 Renovação Confirmada!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>💰 Desconto aplicado:</strong> R$ ${data.discountAmount.toFixed(2)}</p>
                <p style="margin: 5px 0;"><strong>💳 Valor pago:</strong> R$ ${data.paidAmount.toFixed(2)}</p>
                <p style="margin: 5px 0;"><strong>📊 Saldo restante:</strong> R$ ${data.remainingBalance.toFixed(2)}</p>
              </div>
              <p style="color: #166534; font-weight: bold; text-align: center; font-size: 18px;">
                ✅ Seu plano foi renovado com sucesso!
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1f2937; padding: 20px 30px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">Y-TECH Internet 5G</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  }),

  chip_activated_by_user: (data: any) => ({
    subject: '✅ Cliente Confirmou Ativação do Chip - Y-TECH Admin',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">✅ Ativação Confirmada pelo Cliente</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>👤 Cliente:</strong> ${data.fullName}</p>
                <p style="margin: 5px 0;"><strong>📱 WhatsApp:</strong> ${data.whatsapp}</p>
                <p style="margin: 5px 0;"><strong>📡 Tipo:</strong> ${data.activationType === 'esim' ? 'eSIM' : 'Chip Físico'}</p>
              </div>
              <h3 style="color: #166534;">✅ O cliente confirmou que:</h3>
              <ul style="color: #4b5563; line-height: 1.8;">
                <li>Leu o QR Code</li>
                <li>Configurou o ${data.activationType === 'esim' ? 'eSIM' : 'chip'}</li>
                <li>Fez testes de conexão</li>
                <li>O chip está funcionando normalmente</li>
              </ul>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1f2937; padding: 20px 30px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">Y-TECH Internet 5G - Notificação Admin</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  }),
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY não configurada');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { email, messageType, data, userId } = await req.json();

    if (!messageType) {
      throw new Error('Tipo de mensagem é obrigatório');
    }

    // Buscar email do usuário se não fornecido
    let recipientEmail = email;
    let recipientEmails: string[] = [];

    // Para notificações de admin (chip ativado), buscar emails dos admins
    if (messageType === 'chip_activated_by_user') {
      console.log('🔍 Buscando admins para notificação...');
      
      const { data: adminRoles, error: adminError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');
      
      if (adminError) {
        console.error('Erro ao buscar admins:', adminError);
        throw adminError;
      }

      const adminIds = adminRoles?.map(r => r.user_id) || [];
      
      if (adminIds.length === 0) {
        throw new Error('Nenhum admin encontrado');
      }

      const { data: adminProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .in('id', adminIds);
      
      if (profileError) {
        console.error('Erro ao buscar perfis dos admins:', profileError);
        throw profileError;
      }

      recipientEmails = adminProfiles?.map(p => p.email).filter(Boolean) || [];
      console.log(`📧 ${recipientEmails.length} admin(s) serão notificados por email`);
    } else if (userId && !recipientEmail) {
      // Buscar email do perfil do usuário
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();
      
      if (profileError) {
        console.error('Erro ao buscar perfil:', profileError);
        throw new Error('Usuário não encontrado');
      }
      
      if (!profile?.email) {
        console.warn('⚠️ Usuário não possui email cadastrado');
        return new Response(JSON.stringify({ 
          success: false,
          message: 'Usuário não possui email cadastrado'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      recipientEmail = profile.email;
    }

    if (!recipientEmail && recipientEmails.length === 0) {
      throw new Error('Email é obrigatório');
    }

    // Gerar template
    const templateFn = emailTemplates[messageType as keyof typeof emailTemplates];
    if (!templateFn) {
      throw new Error(`Template não encontrado: ${messageType}`);
    }

    const { subject, html } = templateFn(data);
    
    // Definir destinatários
    const toEmails = recipientEmails.length > 0 ? recipientEmails : [recipientEmail];
    
    console.log(`📧 Enviando ${messageType} para ${toEmails.join(', ')}`);

    // Enviar via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Y-TECH Internet 5G <contato@ychat-ia.com.br>',
        to: toEmails,
        subject: subject,
        html: html,
      }),
    });

    const resendData = await resendResponse.json();
    
    if (!resendResponse.ok) {
      console.error('❌ Erro do Resend:', resendData);
      throw new Error(`Erro ao enviar email: ${resendData.message || 'Erro desconhecido'}`);
    }

    console.log('✅ Email enviado:', resendData);

    // Salvar log
    await supabase
      .from('whatsapp_messages')
      .insert({
        user_id: userId || null,
        whatsapp: toEmails[0], // Usar primeiro email como identificador
        message_type: `email_${messageType}`,
        message_content: subject,
        status: 'sent',
        mega_message_id: resendData.id || null,
        metadata: { ...data, channel: 'email', recipients: toEmails }
      });

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Email enviado com sucesso'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
