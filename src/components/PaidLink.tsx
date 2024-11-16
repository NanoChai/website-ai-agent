"use client";

import { useSignRequest } from "@/hooks/useSignRequest";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface PaidLinkProps {
  articleId: string;
  children: React.ReactNode;
}

export function PaidLink({ articleId, children }: PaidLinkProps) {
  const { signRequest } = useSignRequest();
  const [content, setContent] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const { primaryWallet } = useDynamicContext();
  const [signedRequest, setSignedRequest] = useState<any>(null);

  useEffect(() => {
    const preSignRequest = async () => {
      if (primaryWallet?.address && !signedRequest) {
        try {
          const request = await signRequest();
          setSignedRequest(request);
        } catch (error) {
          console.error("Failed to pre-sign request:", error);
        }
      }
    };

    preSignRequest();
  }, [primaryWallet?.address, signRequest, signedRequest]);

  const handleClick = async () => {
    if (!signedRequest) {
      console.error("No signed request available");
      return;
    }

    setIsLoading(true);
    const url = window.location.pathname;
    try {
      const contentRequest = await fetch("/api/paywall", {
        method: "POST",
        body: JSON.stringify({ ...signedRequest, url, articleId }),
      });
      const contentResponse = await contentRequest.json();
      
      if (contentResponse.data && contentResponse.data.content) {
        setContent(contentResponse.data.content);
      } else {
        console.error("Failed to unlock content");
      }
    } catch (error) {
      console.error("Error fetching content:", error);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return <div className="p-4"><Loader2 className="animate-spin h-6 w-6" /></div>;
  }

  if (!primaryWallet?.address) {
    return (
      <div>
        {children}
        <div className="mt-4 px-4 py-2 text-gray-600 italic">
          Login to see exclusive content
        </div>
      </div>
    );
  }

  return (
    <div>
      {content ? (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg animate-fadeIn">
          <p className="text-black">{content}</p>
        </div>
      ) : (
        <div>
          {children}
          <button 
            onClick={handleClick}
            disabled={!signedRequest}
            className="mt-4 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 
              text-white rounded-lg font-medium
              hover:from-purple-700 hover:to-blue-700 
              transform hover:scale-105 transition-all duration-200
              shadow-lg hover:shadow-xl
              relative overflow-hidden
              before:absolute before:inset-0
              before:bg-gradient-to-r before:from-white/20 before:to-transparent
              before:translate-x-[-100%] before:hover:translate-x-[100%]
              before:transition-transform before:duration-700
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="relative inline-flex items-center">
              {signedRequest ? "✨ Read Full Article ✨" : "Preparing..."}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
