let currentScanResult = 'safe';

export function getScanPolicy() {
  return currentScanResult;
}

export function setScanPolicy(policy) {
  currentScanResult = policy;
}

export function resolveScanResult() {
  if (currentScanResult === 'random') {
    return Math.random() > 0.5 ? 'safe' : 'hidden';
  }
  return currentScanResult;
}
