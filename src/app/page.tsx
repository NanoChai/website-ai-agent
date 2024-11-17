"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useArticles } from "@/hooks/useArticles";
import { FetchArticlesParams } from '@/types';
import { useDynamicContext, useEmbeddedWallet } from "@dynamic-labs/sdk-react-core";
import { useSignRequest } from "@/hooks/useSignRequest";
import { signatureCache } from '@/utils/signatureCache';

// Add OpenRouter API configuration
const OPENROUTER_API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
const API_URL = "https://openrouter.ai/api/v1/chat/completions";

export default function Home() {
  const { primaryWallet } = useDynamicContext();
  const { signRequest } = useSignRequest();
  const [userInput, setUserInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{role: string, content: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { articles, isLoading: articlesLoading, fetchArticles } = useArticles();

  useEffect(() => {
    signatureCache.setWalletAddress(primaryWallet?.address || "");
  }, [primaryWallet?.address]);

  const handleChat = async () => {
    if (!primaryWallet?.address) {
      console.error("Wallet not connected");
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
          // Get signatures using signRequest
          const request = await signRequest();
          if (!request) {
            console.error("Failed to sign request");
            return;
          }

          const contentRequest = await fetch("/api/paywall", {
            method: "POST",
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              ...request, 
              url: `${process.env.NEXT_PUBLIC_DOGSITE_URL}/articles` 
            }),
          });
          const contentResponse = await contentRequest.json();

          if (contentResponse.data) {
            articleData = contentResponse.data;
          } else {
            throw new Error("Failed to unlock content");
          }
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
    if (!primaryWallet?.address) {
      console.error("Wallet not connected");
      return;
    }

    try {
      // Get signatures using signRequest
      const request = await signRequest();
      if (!request) {
        console.error("Failed to sign request");
        return;
      }

      if (!request?.userSignature || !request?.restakerSignature || !request?.userAddress) {
        throw new Error("Missing required signature data");
      }

      await fetchArticles({
        userSignature: request.userSignature,
        restakerSignature: request.restakerSignature,
        userAddress: request.userAddress,
        messageHash: request.messageHash,
        restakerAddress: request.restakerAddress,
        url: `${process.env.NEXT_PUBLIC_DOGSITE_URL}/articles`
      });
    } catch (error) {
      console.error('Error fetching articles:', error);
    }
  };

  // Update capabilities and features arrays
  const capabilities = [
    {
      category: "Doge Knowledge",
      title: "Much Smart Doge AI",
      author: "DogeBot",
      timeAgo: "Real-time",
      excerpt: "Very knowledge about doges and puppers. Much facts. Such entertainment. Wow!"
    }
  ];

  const aiFeatures = [
    "Real-time Doge Facts",
    "Much Article Knowledge",
    "Very Dog Statistics",
    "Such Breed Info",
    "Wow Dog Trivia"
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="container mx-auto px-4">
          <div className="py-6 text-center">
            <div className="text-6xl mb-2">🦴</div>
            <h1 className="text-7xl text-black font-mono tracking-tight">Doge AI Assistant</h1>
            <p className="mt-2 text-black font-mono">Much Knowledge • Very Smart • Wow</p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto mb-8">
          {/* Chat interface */}
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

          {/* Input area */}
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
          {/* Capabilities section */}
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

          {/* Sidebar */}
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
