/**
 * Mean-centered Cosine Similarity
 * For ratings 1-5, subtract 3 (neutral center)
 * Returns similarity percentage (0% to 100%)
 */
export function calculateCosineSimilarity(userVector: number[], candidateVector: number[]): number {
  if (!userVector || !candidateVector || userVector.length !== candidateVector.length) {
    return 50;
  }

  // Mean-center by subtracting 3
  const u = userVector.map((v) => v - 3);
  const c = candidateVector.map((v) => v - 3);

  let dotProduct = 0;
  let normU = 0;
  let normC = 0;

  for (let i = 0; i < u.length; i++) {
    dotProduct += u[i] * c[i];
    normU += u[i] * u[i];
    normC += c[i] * c[i];
  }

  // If either vector has 0 variance (all neutral answers), return 50% baseline
  if (normU === 0 || normC === 0) {
    return 50;
  }

  const rawCosine = dotProduct / (Math.sqrt(normU) * Math.sqrt(normC));
  // Map cosine range [-1, 1] to percentage [0, 100]
  const percentage = Math.round(((rawCosine + 1) / 2) * 100);
  return Math.min(Math.max(percentage, 0), 100);
}
