/**
 * Serviço para buscar e validar tenants no banco de dados
 * 
 * Regra de ouro: Middleware orquestra, Service decide.
 * Toda lógica de validação (existência + status) fica centralizada aqui.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class TenantService {
  /**
   * Busca tenant por ID
   * @param id - UUID do tenant
   * @returns Tenant ou null se não encontrado
   */
  static async findById(id: string) {
    return prisma.tenant.findUnique({
      where: { id },
    });
  }

  /**
   * Busca tenant por slug
   * @param slug - Slug único do tenant
   * @returns Tenant ou null se não encontrado
   */
  static async findBySlug(slug: string) {
    return prisma.tenant.findUnique({
      where: { slug },
    });
  }

  /**
   * Valida tenant por ID: verifica existência e status ativo
   * @param id - UUID do tenant
   * @returns Tenant se válido e ativo, null caso contrário
   */
  static async validateById(id: string) {
    const tenant = await this.findById(id);
    
    if (!tenant || tenant.status !== 'ACTIVE') {
      return null;
    }
    
    return tenant;
  }

  /**
   * Valida tenant por slug: verifica existência e status ativo
   * @param slug - Slug único do tenant
   * @returns Tenant se válido e ativo, null caso contrário
   */
  static async validateBySlug(slug: string) {
    const tenant = await this.findBySlug(slug);
    
    if (!tenant || tenant.status !== 'ACTIVE') {
      return null;
    }
    
    return tenant;
  }
}

