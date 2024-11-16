"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useArticles } from "@/hooks/useArticles";
import { FetchArticlesParams } from '@/types';
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

// Add OpenRouter API configuration
const OPENROUTER_API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
const API_URL = "https://openrouter.ai/api/v1/chat/completions";

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

  // Add chat function
  const handleChat = async () => {
    if (!primaryWallet?.address) {
      return; // Early return if not logged in
    }
    
    if (!userInput.trim()) return;
    
    setIsLoading(true);
    const newMessage = { role: 'user', content: userInput };
    
    try {
      // Check for keywords
      const hasCatKeyword = userInput.toLowerCase().includes('cat');
      const hasDogKeyword = userInput.toLowerCase().includes('dog');
      
      let articleData = null;
      
      if (hasCatKeyword || hasDogKeyword) {
        const targetUrl = hasCatKeyword 
          ? process.env.NEXT_PUBLIC_CATSITE_URL
          : process.env.NEXT_PUBLIC_DOGSITE_URL;
          
        const response = await fetch(`${targetUrl}/api/articles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userSignature,
            restakerSignature,
            userAddress,
            messageHash,
            restakerAddress,
            url: `${targetUrl}/articles`
          })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch articles: ${response.statusText}`);
        }
        
        articleData = await response.json();
      }

      // Include fetched article data in AI context
      const aiMessages = [
        { 
          role: 'system', 
          content: 'You are a playful Dog vs Cat Battle Bot. Use the provided articles to share interesting facts and create fun comparisons between dogs and cats. Keep the tone lighthearted and entertaining.' 
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

  // Replace headlines with AI capabilities
  const capabilities = [
    {
      category: "Pet Battle",
      title: "Dog vs Cat Knowledge Battle",
      author: "Battle Bot",
      timeAgo: "Real-time",
      excerpt: "Engage in epic battles of knowledge about dogs and cats, powered by real blog articles and AI analysis."
    }
  ];

  // Replace sideNews with AI features
  const aiFeatures = [
    "Real-time Dog & Cat Facts",
    "Article-based Knowledge",
    "Battle Statistics",
    "Pet Comparisons",
    "Fun Pet Trivia"
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Update header */}
      <header className="border-b">
        <div className="container mx-auto px-4">
          <div className="py-6 text-center">
            <div className="text-6xl mb-2">🐱 vs 🐕</div>
            <h1 className="text-7xl text-black font-mono tracking-tight">Dog vs Cat Battle Bot</h1>
            <p className="mt-2 text-black font-mono">The Ultimate Pet Knowledge Showdown</p>
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
                Start a conversation about cats or dogs!
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
