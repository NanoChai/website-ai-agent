"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useArticles } from "@/hooks/useArticles";
import { FetchArticlesParams } from '@/types';
import { useDynamicContext, useEmbeddedWallet } from "@dynamic-labs/sdk-react-core";

// Add OpenRouter API configuration
const OPENROUTER_API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
const API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Add SignatureCache class at the top level
class SignatureCache {
  private signatures: Array<{
    userSignature: string;
    restakerSignature: string;
    userAddress: string;
    messageHash: string;
    restakerAddress: string;
  }> = [];
  private isFetching = false;

  private readonly SERVICE_ADDRESS = "0xefDD4C11efD4df6F1173150e89102D343ae50AA4" as `0x${string}`;
  private readonly AMOUNT = "1";
  private readonly CHAIN_ID = "84532";

  async getSignatures(): Promise<{
    userSignature: string;
    restakerSignature: string;
    userAddress: string;
    messageHash: string;
    restakerAddress: string;
  }> {
    if (this.signatures.length > 0) {
      return this.signatures.shift()!;
    }

    if (!this.isFetching) {
      this.fetchSignatureBatch();
    }

    return await this.waitForSignature();
  }

  private async fetchSignatureBatch() {
    this.isFetching = true;
    try {
      const restakerUrl = process.env.NEXT_PUBLIC_RESTAKER_URL;
      if (!restakerUrl) {
        throw new Error("RESTAKER_URL is not defined");
      }

      const requests = Array(5).fill(null).map(() => 
        fetch(`${restakerUrl}/sign-spend`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userAddress: "", // This will be filled by the caller
            serviceAddress: this.SERVICE_ADDRESS,
            amount: this.AMOUNT,
            chainId: this.CHAIN_ID,
            userSig: "hard-code",
          }),
        }).then(res => res.json())
      );

      const responses = await Promise.all(requests);
      this.signatures.push(...responses.map(response => ({
        userSignature: response.userSignature,
        restakerSignature: response.signature,
        userAddress: response.userAddress,
        messageHash: response.messageHash,
        restakerAddress: response.restaker
      })));
    } finally {
      this.isFetching = false;
    }
  }

  private async waitForSignature() {
    const startTime = Date.now();
    while (this.signatures.length === 0 && Date.now() - startTime < 5000) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (this.signatures.length === 0) {
      const restakerUrl = process.env.NEXT_PUBLIC_RESTAKER_URL;
      if (!restakerUrl) {
        throw new Error("RESTAKER_URL is not defined");
      }

      const response = await fetch(`${restakerUrl}/sign-spend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAddress: "", 
          serviceAddress: this.SERVICE_ADDRESS,
          amount: this.AMOUNT,
          chainId: this.CHAIN_ID,
          userSig: "hard-code",
        }),
      }).then(res => res.json());
      
      return {
        userSignature: response.userSignature,
        restakerSignature: response.signature,
        userAddress: response.userAddress,
        messageHash: response.messageHash,
        restakerAddress: response.restaker
      };
    }

    return this.signatures.shift()!;
  }
}

// Create singleton instance
const signatureCache = new SignatureCache();

export default function Home() {
  const { primaryWallet } = useDynamicContext();
  const [userInput, setUserInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{role: string, content: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { articles, isLoading: articlesLoading, fetchArticles } = useArticles();

  // Add state variables for required parameters
  const [userSignature, setUserSignature] = useState<string>('');
  const [restakerSignature, setRestakerSignature] = useState<string>('');
  const [userAddress, setUserAddress] = useState<string>('');
  const [messageHash, setMessageHash] = useState<string>('');
  const [restakerAddress, setRestakerAddress] = useState<string>('');

  // Add state for tracking signature status
  const [hasValidSignatures, setHasValidSignatures] = useState(false);

  // Modify handleChat function
  const handleChat = async () => {
    if (!primaryWallet?.address) {
      return;
    }
    
    if (!userInput.trim()) return;
    
    setIsLoading(true);
    const newMessage = { role: 'user', content: userInput };
    
    try {
      const hasDogKeyword = userInput.toLowerCase().includes('dog') || 
                           userInput.toLowerCase().includes('doge') || 
                           userInput.toLowerCase().includes('puppy');
      
      let articleData = null;
      
      if (hasDogKeyword) {
        try {
          // Get signatures from cache
          const signatureData = await signatureCache.getSignatures();
          
          // Update state with signature data
          setUserSignature(signatureData.userSignature);
          setRestakerSignature(signatureData.restakerSignature);
          setUserAddress(signatureData.userAddress);
          setMessageHash(signatureData.messageHash);
          setRestakerAddress(signatureData.restakerAddress);
          
          const targetUrl = process.env.NEXT_PUBLIC_DOGSITE_URL;
          
          const response = await fetch(`${targetUrl}/api/paywall`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userSignature: signatureData.userSignature,
              restakerSignature: signatureData.restakerSignature,
              userAddress: signatureData.userAddress,
              messageHash: signatureData.messageHash,
              restakerAddress: signatureData.restakerAddress,
              url: `${targetUrl}/articles`
            })
          });
          
          if (response.status === 402) {
            throw new Error('Payment required for accessing dog content');
          }
          
          if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
          }
          
          const result = await response.json();
          articleData = result.data;
        } catch (signError) {
          console.error('Error getting signatures:', signError);
          throw new Error('Failed to obtain required signatures');
        }
      }

      // Update system prompt for Doge theme
      const aiMessages = [
        { 
          role: 'system', 
          content: 'You are a playful Doge AI assistant. Respond in a fun, meme-like way using Doge speak (like "much wow", "very smart", "such knowledge"). Share interesting facts about dogs and keep the tone lighthearted and entertaining. Occasionally use dog-related emojis 🐕 🦮 🐾.' 
        },
        ...chatHistory,
        newMessage
      ];

      if (articleData) {
        aiMessages.push({
          role: 'system',
          content: `Here are some relevant articles: ${JSON.stringify(articleData)}`
        });
      }

      const aiResponse = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: "anthropic/claude-3-sonnet",
          messages: aiMessages
        }),
      });
      
      const data = await aiResponse.json();
      setChatHistory(prev => [...prev, newMessage, {
        role: 'assistant',
        content: data.choices[0].message.content
      }]);
      setUserInput('');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleArticleAnalysis = async () => {
    try {
      await fetchArticles({
        userSignature,
        restakerSignature,
        userAddress,
        messageHash,
        restakerAddress,
        url: 'https://external-api.com/articles'
      });
    } catch (error) {
      console.error('Error fetching articles:', error);
    }
  };

  // Update capabilities array
  const capabilities = [
    {
      category: "Doge Knowledge",
      title: "Much Smart Doge AI",
      author: "DogeBot",
      timeAgo: "Real-time",
      excerpt: "Very knowledge about doges and puppers. Much facts. Such entertainment. Wow!"
    }
  ];

  // Update features array
  const aiFeatures = [
    "Real-time Doge Facts",
    "Much Article Knowledge",
    "Very Dog Statistics",
    "Such Breed Info",
    "Wow Dog Trivia"
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Update header */}
      <header className="border-b">
        <div className="container mx-auto px-4">
          <div className="py-6 text-center">
            <div className="text-6xl mb-2">🦴</div>
            <h1 className="text-7xl text-black font-mono tracking-tight">Doge AI Assistant</h1>
            <p className="mt-2 text-black font-mono">Much Knowledge • Very Smart • Wow</p>
          </div>
        </div>
      </header>

      {/* Update chat interface with login check */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto mb-8">
          <div className="bg-gray-50 p-4 rounded-lg h-[400px] overflow-y-auto mb-4">
            {!primaryWallet?.address ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                Please connect your wallet to start chatting
              </div>
            ) : chatHistory.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                Start a conversation about dogs!
              </div>
            ) : (
              chatHistory.map((msg, index) => (
                <div key={index} className={`mb-4 ${msg.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block p-3 rounded-lg ${
                    msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-200'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className={`flex-1 px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                !primaryWallet?.address ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
              placeholder={primaryWallet?.address ? "Ask me anything..." : "Connect wallet to chat"}
              disabled={!primaryWallet?.address}
            />
            <button
              onClick={handleChat}
              disabled={isLoading || !primaryWallet?.address}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Thinking...' : 'Send'}
            </button>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main capabilities section */}
          <div className="lg:col-span-2">
            <h2 className="text-3xl font-semibold mb-6">AI Capabilities</h2>
            <div className="space-y-6">
              {capabilities.map((item, index) => (
                <div key={index} className="border-b pb-6">
                  <div className="text-sm text-gray-500 mb-2">
                    {item.category} • By {item.author} • {item.timeAgo}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.excerpt}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar features */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Key Features</h2>
              <ul className="space-y-3">
                {aiFeatures.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <span className="mr-2">✨</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Learn More section without Premium Features */}
            <div className="mt-6 bg-gray-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Learn More</h2>
              <ul className="space-y-3">
                <li>
                  <Link href="/docs" className="text-blue-600 hover:underline">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="/examples" className="text-blue-600 hover:underline">
                    Example Use Cases
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Articles section */}
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={handleArticleAnalysis}
          disabled={articlesLoading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 mb-4"
        >
          {articlesLoading ? 'Fetching Articles...' : 'Fetch Articles'}
        </button>

        {articles.length > 0 && (
          <div className="grid gap-4">
            {articles.map((article, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded shadow">
                <p className="text-sm text-gray-500">
                  {article.author} • {article.timestamp}
                </p>
                <p className="mt-2">{article.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
