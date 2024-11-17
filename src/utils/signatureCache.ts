class SignatureCache {
  private cache: Map<string, string> = new Map();
  private walletAddress: string = '';

  setWalletAddress(address: string) {
    this.walletAddress = address;
  }

  getWalletAddress(): string {
    return this.walletAddress;
  }

  set(key: string, value: string) {
    this.cache.set(key, value);
  }

  get(key: string): string | undefined {
    return this.cache.get(key);
  }

  clear() {
    this.cache.clear();
  }
}

export const signatureCache = new SignatureCache();
