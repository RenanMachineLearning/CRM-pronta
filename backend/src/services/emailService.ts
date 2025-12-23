/**
 * Serviço de envio de email
 * 
 * Gerencia envio de emails do sistema.
 * Na V1: apenas loga em console (DEV).
 * Na V2: implementar envio real via SMTP.
 */

export class EmailService {
  /**
   * Envia email de reset de senha
   * 
   * @param email - Email do destinatário
   * @param token - Token de reset
   * @param tenantId - ID do tenant
   * 
   * @remarks
   * - V1: Apenas loga em console (DEV)
   * - V2: Implementar envio real via SMTP
   * - Link format: ${FRONTEND_URL}/reset-password?token=${token}&tenant=${tenantId}
   */
  static async sendPasswordResetEmail(
    email: string,
    token: string,
    tenantId: string
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}&tenant=${tenantId}`;

    if (process.env.NODE_ENV === 'development' || !process.env.EMAIL_HOST) {
      // Log em DEV (não enviar email real)
      console.log('=== Password Reset Email (DEV) ===');
      console.log(`To: ${email}`);
      console.log(`Reset URL: ${resetUrl}`);
      console.log(`Token: ${token}`);
      console.log(`Tenant ID: ${tenantId}`);
      console.log('================================');
      return;
    }

    // PROD: Implementar envio real (V2)
    // TODO: Implementar envio via SMTP quando email estiver configurado
    // Exemplo futuro:
    // const transporter = nodemailer.createTransport({...});
    // await transporter.sendMail({
    //   from: process.env.EMAIL_USER,
    //   to: email,
    //   subject: 'Reset de Senha',
    //   html: `...`
    // });
  }
}

