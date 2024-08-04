export function setDifference<T>(setA: Set<T>, setB: Set<T>): Set<T> {
  return new Set([...setA].filter(item => !setB.has(item)));
}
