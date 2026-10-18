import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.resolve(__dirname, '..', 'public', 'index.html');

test('Dashboard: HTML Static Invariants and Security Guardrails', () => {
  assert.ok(fs.existsSync(htmlPath), 'index.html must exist');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Verify BN254 Curve Equation & Constants
  assert.ok(html.includes('y^2 = x^3 + 3 (mod q)'), 'Must display BN254 curve equation');
  assert.ok(html.includes('21888242871839275222246405745257275088696311157297823662689037894645226208583'), 'Must display field modulus q');
  assert.ok(html.includes('21888242871839275222246405745257275088548364400416034343698204186575808495617'), 'Must display scalar order r');

  // Verify Precompile 0x08
  assert.ok(html.includes('0x08'), 'Must reference EIP-197 pairing precompile 0x08');
  assert.ok(html.includes('170,000 gas'), 'Must display 4-pair gas cost');

  // Verify Proof Byte Dimensions
  assert.ok(html.includes('64 B'), 'G1 point byte size');
  assert.ok(html.includes('128 B'), 'G2 point byte size');
  assert.ok(html.includes('256 B'), 'Total proof byte size');

  // Verify Pairing Verification Equation
  assert.ok(html.includes('e(A, B) = e(alpha_1, beta_2) * e(L, gamma_2) * e(C, delta_2)'), 'Must state pairing equation');

  // Verify Production Certification Lock & Zero Spend Guardrails
  assert.ok(
    html.includes('DEPLOYMENT: LOCKED (0/1,000 CERTIFIED)'),
    'Must display persistent mainnet deployment lock badge'
  );
  assert.ok(html.includes('ZERO GAS & ZERO CLOUD SPEND'), 'Must display zero spend invariant');
});
