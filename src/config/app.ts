// Base configuration type
export type BaseAppConfig = {
  name: string;
  description: string;
  theme: string;
  ai: {
    provider: string;
    model: string;
    apiKey?: string;
    apiUrl: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
  };
  images: {
    logo: string;
    favicon: string;
    hero: string;
    placeholders: {
      post: string;
      profile: string;
    };
    icons: Record<string, string>;
  };
};

// Default base configuration
export const APP_CONFIG: BaseAppConfig = {
  name: "AI Assistant",
  description: "Your intelligent AI companion powered by Claude 3 Sonnet",
  theme: "ai-assistant",
  ai: {
    provider: "openrouter",
    model: "anthropic/claude-3-sonnet",
    apiUrl: "https://openrouter.ai/api/v1/chat/completions",
    temperature: 0.7,
    maxTokens: 4096,
    systemPrompt: "You are a helpful AI assistant powered by Claude 3 Sonnet. You aim to provide accurate, helpful, and engaging responses while maintaining a friendly demeanor."
  },
  images: {
    logo: "/images/ai-logo.svg",
    favicon: "/images/ai-favicon.ico",
    hero: "/images/ai-hero.jpg",
    placeholders: {
      post: "/images/placeholder-post.jpg",
      profile: "/images/placeholder-profile.jpg",
    },
    icons: {
      bot: "🤖",
      user: "👤",
      send: "📤",
      loading: "⏳"
    }
  }
} as const;