/**
 * Mock CommonJS do pacote uuid para testes Jest.
 * Evita "SyntaxError: Unexpected token 'export'" com uuid ESM ao carregar app.
 */
function v4() {
  return '00000000-0000-0000-0000-000000000000';
}
module.exports = { v4 };
module.exports.v4 = v4;
