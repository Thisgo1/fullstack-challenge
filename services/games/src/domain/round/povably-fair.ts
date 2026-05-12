import { createHmac, createHash, randomBytes } from 'node:crypto';

export class ProvablyFair {
  static generateSeed(): string {
    return randomBytes(32).toString('hex');
  }

  static hashSeed(seed: string): string {
   return createHash('sha256').update(seed).digest('hex');
  }

  static calculateCrashPoint(seed: string, serverSecret: string): number {
     const hmac = createHmac('sha256', serverSecret)
    .update(seed)
    .digest('hex');

    // House edge: 1% de chance de crash instantâneo
    const h = parseInt(hmac.slice(0, 8), 16);
    if (h % 100 === 0) return 100;

    // 52 bits de precisão — máximo seguro para float IEEE 754
    const e = BigInt(`0x${hmac.slice(0, 13)}`);
    const divisor = 2n ** 52n;

    // 99 já incorpora o house edge de 1%.
    // O resultado está em centésimos: 150 = 1.50x, 200 = 2.00x
    const floatResult = 99 / (1 - Number(e) / Number(divisor));

    // SEM o * 100 — floatResult já está na escala correta
    return Math.max(100, Math.round(floatResult));
  }

  static nextSeed(currentSeed: string): string {
    return createHash('sha256').update(currentSeed).digest('hex');
  }

  static verify(seed: string, expectedHash: string, serverSecret: string):{
    valid: boolean;
    crashPoint: number;
    computedHash: string} {
      const computedHash = this.hashSeed(seed);
      const crashPoint = this.calculateCrashPoint(seed, serverSecret);
      return {
        valid: computedHash === expectedHash,
        crashPoint: crashPoint,
        computedHash
    };
  }
}
