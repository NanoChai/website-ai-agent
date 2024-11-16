export interface PaymentRequest {
  service: `0x${string}`;
  amount: string;
  userAddress: `0x${string}`;
  chainId: string;
  nonce?: string;
}

export interface FetchArticlesParams {
  userSignature: string;
  restakerSignature: string;
  userAddress: string;
  messageHash: string;
  restakerAddress: string;
  url: string;
}