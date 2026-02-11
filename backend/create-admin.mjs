
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "./src/utils/password";
import crypto from "crypto";

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    // Obter o tenant demo
    const tenant = await prisma.tenant.findUnique({
      where: { slug: "demo" }
    });

    if (!tenant) {
      console.error("Tenant demo não encontrado");
      return;
    }

    // Verificar se o usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { 
        tenantId_email: {
          tenantId: tenant.id,
          email: "admin@demo.com"
        }
      }
    });

    if (existingUser) {
      console.log("Usuário administrador já existe");
      console.log("Email: admin@demo.com");
      console.log("Senha: admin123");
      return;
    }

    // Obter a role Admin
    const adminRole = await prisma.role.findFirst({
      where: { 
        tenantId: tenant.id,
        name: "Admin"
      }
    });

    if (!adminRole) {
      console.error("Role Admin não encontrada");
      return;
    }

    // Criar usuário administrador
    const passwordHash = await hashPassword("admin123");
    
    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: "admin@demo.com",
        name: "Admin Demo",
        passwordHash: passwordHash,
        tenantId: tenant.id,
        status: "ACTIVE",
      }
    });

    // Associar usuário à role Admin
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: adminRole.id
      }
    });

    console.log("Usuário administrador criado com sucesso:");
    console.log("Email: admin@demo.com");
    console.log("Senha: admin123");
    console.log("Tenant ID:", tenant.id);
    console.log("User ID:", user.id);
  } catch (error) {
    console.error("Erro ao criar usuário administrador:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();

