import { useState } from 'react';
import { FetchArticlesParams } from '@/types';

interface Article {
  content: string;
  timestamp: string;
  author: string;
}

export const useArticles = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchArticles = async (params: FetchArticlesParams) => {
    setIsLoading(true);
    try {
      // Fetch articles from external server that handles paywall verification
      const response = await fetch('https://your-external-server.com/api/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch articles');
      }

      const data = await response.json();
      setArticles(data.articles);
    } catch (error) {
      console.error('Error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { articles, isLoading, fetchArticles };
};