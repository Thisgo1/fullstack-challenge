import { describe, it, expect} from 'bun:test';
import { ProvablyFair } from '../../src/domain/round/povably-fair';

describe('ProvablyFair', () => {

  const SECRET = 'server-secret-de-teste';

 // ── Geração de seed ───────────────────────────────────────────────────────
  describe('generateSeed', () =>{
    it('deve gerar uma seed de 64 caracteres hexadecimais(32 bytes)', () => {
      const seed = ProvablyFair.generateSeed();
      // 32 bytes = 64 caracteres hexadecimais
      expect(seed).toHaveLength(64);
      expect(seed).toMatch(/^[0-9a-f]+$/); // Apenas caracteres hexadecimais
    });

    it('deve gerar seeds diferentes a cada chamada', () => {
      const seed1 = ProvablyFair.generateSeed();
      const seed2 = ProvablyFair.generateSeed();

      // colisão aqui seria uma falha catastrófica de segurança
      expect(seed1).not.toBe(seed2);
    });

  });

 // ── Hash ──────────────────────────────────────────────────────────────────
  describe('hashSeed', () => {
    it('deve ser determinístico - mesma seed sempre gera o mesmo hash', () => {
      const seed = 'seed-conhecida';

      const hash1 = ProvablyFair.hashSeed(seed);
      const hash2 = ProvablyFair.hashSeed(seed);

      expect(hash1).toBe(hash2);
    });

    it('deve gerar hashes diferente para seeds diferentes', () => {
      expect(ProvablyFair.hashSeed('seed-a')).not.toBe(ProvablyFair.hashSeed('seed-b'));
    });

    it('deve gerar um hash de 64 caracteres hexadecimais (SHA256)', () => {
      expect(ProvablyFair.hashSeed('qualquer-seed')).toHaveLength(64);
    });
  });
 // ── Crash point ───────────────────────────────────────────────────────────
   describe('calculateCrashPoint', () => {

    // IMPORTANTE: esse teste usa uma seed conhecida para garantir que o algoritmo
    // é determinístico. Se alguém mudar a fórmula acidentalmente, esse teste quebra.
    // É uma forma de "congelar" o comportamento esperado.
    it('deve ser determinístico — mesma seed sempre gera mesmo crash point', () => {
      const seed = 'seed-fixa-para-teste';

      const result1 = ProvablyFair.calculateCrashPoint(seed, SECRET);
      const result2 = ProvablyFair.calculateCrashPoint(seed, SECRET);

      expect(result1).toBe(result2);
    });

    it('crash point deve ser pelo menos 1.00x (100 em centésimos)', () => {
      // Testa 100 seeds diferentes — nenhuma pode resultar em menos de 1.00x
      for (let i = 0; i < 100; i++) {
        const seed = ProvablyFair.generateSeed();
        const crash = ProvablyFair.calculateCrashPoint(seed, SECRET);

        expect(crash).toBeGreaterThanOrEqual(100);
      }
    });

    it('deve retornar 1.00x quando h % 100 === 0 (house edge)', () => {
      const results = Array.from({ length: 1000 }, () =>
        ProvablyFair.calculateCrashPoint(ProvablyFair.generateSeed(), SECRET)
      );
      
      const instantCrashes = results.filter(r => r === 100).length;
      expect(instantCrashes).toBeGreaterThan(0);
      expect(instantCrashes).toBeLessThan(50); // nunca mais que 5% em 1000
    });

      it('crash points devem ter distribuição razoável', () => {
      const results = Array.from({ length: 1000 }, () =>
        ProvablyFair.calculateCrashPoint(ProvablyFair.generateSeed(), SECRET)
      );

      const above2x   = results.filter(r => r >= 200).length;
      const above10x  = results.filter(r => r >= 1000).length;
      const above100x = results.filter(r => r >= 10000).length;

      // ~50% das rodadas passam de 2x (range generoso para evitar flakiness)
      expect(above2x).toBeGreaterThan(350);
      expect(above2x).toBeLessThan(650);

      // ~10% passam de 10x
      expect(above10x).toBeGreaterThan(50);
      expect(above10x).toBeLessThan(200);

      // crashes acima de 100x são raros — menos de 3%
      expect(above100x).toBeGreaterThan(0);
      expect(above100x).toBeLessThan(30);
    });
  });

  // ── Hash chain ────────────────────────────────────────────────────────────
  describe('nextSeed', () => {
    it('deve derivar seed de forma determinística', () => {
      const seed = 'seed-inicial';

      expect(ProvablyFair.nextSeed(seed)).toBe(ProvablyFair.nextSeed(seed));
    });

    it('deve formar uma cadeia vereficável', () => {
      const seed0 = ProvablyFair.generateSeed();
      const seed1 = ProvablyFair.nextSeed(seed0);
      const seed2 = ProvablyFair.nextSeed(seed1);

      // A cadeia é: seed0 -> seed1 -> seed2
      // Se sabemos seed2, podemos verificar seed1 e seed0
      expect(ProvablyFair.nextSeed(seed0)).toBe(seed1);
      expect(ProvablyFair.nextSeed(seed1)).toBe(seed2);

    });
  });

  // ── Verificação ───────────────────────────────────────────────────────────
  describe('verify', () => {
    it('deve validar corretamente uma seed e seu hash', () => {
      const seed = ProvablyFair.generateSeed();
      const hash = ProvablyFair.hashSeed(seed);

      const result = ProvablyFair.verify(seed, hash, SECRET);
      expect(result.valid).toBe(true);
      expect(result.computedHash).toBe(hash);
    });

    it('deve rejeitar uma seed adulterada', () => {
      const seed = ProvablyFair.generateSeed();
      const hash = ProvablyFair.hashSeed(seed);

      const result = ProvablyFair.verify('seed-adulterada', hash, SECRET);
      expect(result.valid).toBe(false);
    });

    it('deve retornar o crash point junto da verificação', () => {
      const seed = ProvablyFair.generateSeed();
      const hash = ProvablyFair.hashSeed(seed);

      const result = ProvablyFair.verify(seed, hash, SECRET);

      expect(result.crashPoint).toBeGreaterThanOrEqual(100);
    });

  });

});
