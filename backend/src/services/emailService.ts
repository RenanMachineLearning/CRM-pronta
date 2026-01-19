/**
 * Serviço de envio de email
 * 
 * Gerencia envio de emails do sistema.
 * Na V1: apenas loga em console (DEV).
 * Na V2: implementar envio real via SMTP.
 */

import { TaskPriority, TaskStatus, TaskType } from '@prisma/client';
import {
  formatDateForEmail,
  translateTaskPriority,
  translateTaskStatus,
  translateTaskType,
  getDaysOverdue,
} from '../utils/taskNotificationHelpers';

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

  /**
   * Envia notificação de tarefa vencida
   * 
   * @param email - Email do destinatário
   * @param task - Dados da tarefa vencida
   * @param tenantId - ID do tenant
   * @param userName - Nome do usuário destinatário (para personalização)
   * @param tenantName - Nome do tenant (opcional, para contexto)
   * 
   * @remarks
   * - V1: Apenas loga em console (DEV)
   * - V2: Implementar envio real via SMTP
   * - Valida formato de email antes de enviar
   * - Formata datas e traduz campos para português
   */
  static async sendOverdueTaskNotification(
    email: string,
    task: {
      id: string;
      title: string;
      description?: string | null;
      dueDate: Date;
      priority: TaskPriority;
      status: string;
      type: TaskType;
      relatedEntityType: string;
      relatedEntityId: string;
    },
    tenantId: string,
    userName?: string,
    tenantName?: string
  ): Promise<void> {
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error(`Formato de email inválido: ${email}`);
    }

    // Validar campos obrigatórios
    if (!task.id || !task.title || !task.dueDate) {
      throw new Error('Campos obrigatórios da tarefa não fornecidos');
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const taskUrl = `${frontendUrl}/tasks/${task.id}/edit`;
    const daysOverdue = getDaysOverdue(task.dueDate);
    const formattedDueDate = formatDateForEmail(task.dueDate);

    if (process.env.NODE_ENV === 'development' || !process.env.EMAIL_HOST) {
      // Log em DEV (não enviar email real)
      console.log('\n=== Tarefa Vencida (DEV) ===');
      console.log(`Para: ${email}`);
      console.log(`Assunto: Tarefa Vencida: ${task.title}`);
      console.log('');
      console.log(`Olá ${userName || 'Usuário'},`);
      console.log('');
      console.log(`A tarefa "${task.title}" está vencida.`);
      if (daysOverdue > 0) {
        console.log(`Dias vencidos: ${daysOverdue}`);
      }
      console.log('');
      console.log(`Data de Vencimento: ${formattedDueDate}`);
      console.log(`Prioridade: ${translateTaskPriority(task.priority)}`);
      console.log(`Status: ${translateTaskStatus(task.status as any)}`);
      console.log(`Tipo: ${translateTaskType(task.type)}`);
      if (task.description) {
        console.log('');
        console.log('Descrição:');
        console.log(task.description);
      }
      console.log('');
      if (task.relatedEntityType) {
        console.log(`Relacionado a: ${task.relatedEntityType} (${task.relatedEntityId})`);
      }
      console.log('');
      console.log(`Acesse a tarefa: ${taskUrl}`);
      console.log('');
      console.log('---');
      console.log(`Tenant: ${tenantName || tenantId}`);
      console.log(`Task ID: ${task.id}`);
      console.log(`Timestamp: ${new Date().toISOString()}`);
      console.log('===========================\n');
      return;
    }

    // PROD: Implementar envio real (V2)
    // TODO: Implementar envio via SMTP quando email estiver configurado
    // Exemplo futuro:
    // const transporter = nodemailer.createTransport({...});
    // await transporter.sendMail({
    //   from: process.env.EMAIL_USER,
    //   to: email,
    //   subject: `Tarefa Vencida: ${task.title}`,
    //   html: `...`
    // });
  }
}

