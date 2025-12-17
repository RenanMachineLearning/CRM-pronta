#!/bin/bash

# Script para testes manuais do middleware de tenant
# Requer que o servidor esteja rodando em http://localhost:5000

BASE_URL="http://localhost:5000"

echo "=== Testes Manuais do Middleware de Tenant ==="
echo ""

# Você precisa ter um tenant válido no banco de dados
# Para obter um tenant válido, execute: docker compose exec backend npx prisma studio
# Ou use o tenant criado pelo seed

echo "1. Teste: Rota pública /health (sem tenant)"
curl -s -X GET "${BASE_URL}/health" | jq .
echo ""

echo "2. Teste: Rota protegida sem tenant (deve retornar 400)"
curl -s -X GET "${BASE_URL}/api/test" | jq .
echo ""

echo "3. Teste: Rota protegida com tenant inválido (deve retornar 403)"
curl -s -X GET "${BASE_URL}/api/test" \
  -H "X-Tenant-Id: 00000000-0000-0000-0000-000000000000" | jq .
echo ""

echo "4. Teste: Rota protegida com tenant válido por ID"
echo "   (Substitua TENANT_ID pelo ID de um tenant válido do seu banco)"
# curl -s -X GET "${BASE_URL}/api/test" \
#   -H "X-Tenant-Id: TENANT_ID" | jq .
echo "   Exemplo: curl -s -X GET \"${BASE_URL}/api/test\" -H \"X-Tenant-Id: <seu-tenant-id>\" | jq ."
echo ""

echo "5. Teste: Rota protegida com tenant válido por slug"
echo "   (Substitua TENANT_SLUG pelo slug de um tenant válido do seu banco)"
# curl -s -X GET "${BASE_URL}/api/test" \
#   -H "X-Tenant-Slug: TENANT_SLUG" | jq .
echo "   Exemplo: curl -s -X GET \"${BASE_URL}/api/test\" -H \"X-Tenant-Slug: <seu-tenant-slug>\" | jq ."
echo ""

echo "=== Para obter um tenant válido, execute: ==="
echo "docker compose -f docker-compose.dev.yml exec backend npx prisma studio"
echo ""

