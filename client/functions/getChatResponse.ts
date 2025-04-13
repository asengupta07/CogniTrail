import { generateAlt } from "../lib/genai";

const countTokens = (article: string): number => {
  const tokens = article.length / 3;
  return tokens;
};

const clipArticle = (article: string, maxTokens: number): string => {
  const tokens = countTokens(article);
  if (tokens <= maxTokens) return article;
  const clippedArticle = article.slice(0, maxTokens);
  return clippedArticle;
};

const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.log(`Attempt ${attempt} failed:`, error);
      if (attempt < maxRetries) {
        console.log(`Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
};

const getWikipediaArticle = async (topic: string): Promise<string> => {
  topic = topic.trim().replace(/\s+/g, "%20");
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${topic}&format=json`;
  const response = await retryOperation(() => fetch(url));
  const data = await response.json();
  const pageId = data.query.search[0].pageid;
  const articleUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=true&pageids=${pageId}&format=json`;
  const articleResponse = await retryOperation(() => fetch(articleUrl));
  const articleData = await articleResponse.json();
  const article = articleData.query.pages[pageId].extract;
  return clipArticle(article, 50_000);
};

export const getChatResponse = async (
  query: string,
  chatHistory: string[],
  nodeTitle: string
): Promise<string> => {
  const article = await getWikipediaArticle(nodeTitle);
  const prompt = `You are an expert in the field of ${nodeTitle}. You are given an article about ${nodeTitle} as context. You are currently in a chat with a user who is asking questions about ${nodeTitle}. 
    
    Here is the chat history:
    ${chatHistory.join("\n")}
    
    Here is the user's latest query:
    ${query}
    
    Your response should be concise and to the point, and should be no more than 2 paragraphs.
    Here is the article about ${nodeTitle}:
    ${article}

    Your response:
    `;
  const response = await generateAlt(prompt);
  return response || "";
};
