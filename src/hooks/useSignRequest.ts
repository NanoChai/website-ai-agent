import { getPaymentHash } from "@/utils/getPaymentHash";
import { getPaymentRequest } from "@/utils/getPaymentRequest";
import { getRestakerSignature } from "@/utils/getRestakerSignature";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

export const useSignRequest = () => {
  const { primaryWallet } = useDynamicContext();

  const signRequest = async () => {
    if (!primaryWallet) {
      throw new Error("Primary wallet is not available");
    }
    const paymentRequest = getPaymentRequest();
    const { signature: restakerSignature, nonce } = await getRestakerSignature(
      paymentRequest
    );
    const messageHash = getPaymentHash({
      ...paymentRequest,
      nonce: BigInt(nonce),
    });
    const userSignature = await primaryWallet.signMessage(messageHash);
    const userAddress = primaryWallet.address;
    return {
      userSignature,
      restakerSignature,
      messageHash,
      userAddress,
    };
  };

  return { signRequest };
};
