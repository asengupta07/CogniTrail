import { generate, generateAlt } from "../lib/genai";
import { parseUntilJson } from "../lib/parseUntilJson";


const getWikipediaTopic = async (query: string): Promise<string> => {
    const prompt = `You are an expert on wikipedia articles. You are given a query and you need to return the wikipedia topic that is most relevant to the query. If the topic cannot be determined, return "false" in the "canBeDetermined" field.

    QUERY:
    ${query}

    OUTPUT JSON FORMAT:
    {
        "topic": "<most relevant wikipedia topic>",
        "canBeDetermined": "<true or false>"
    }

    IMPORTANT INSTRUCTIONS:
    - The topic must be a wikipedia topic
    - The topic must be a single topic, not a list of topics
    - The topic must be a topic that is relevant to the query
    - If the topic cannot be determined, return "false" in the "canBeDetermined" field

    The response must be valid JSON that can be parsed without errors. There should be no text before or after the JSON object.
    
    The response JSON is:`;
    const res = await generateAlt(prompt);
    if (!res)
        return "";
    const topic = parseUntilJson(res);
    return topic.topic;
}

const countTokens = (article: string): number => {
    const tokens = article.length / 3;
    return tokens;
}

const clipArticle = (article: string, maxTokens: number): string => {
    const tokens = countTokens(article);
    if (tokens <= maxTokens)
        return article;
    const clippedArticle = article.slice(0, maxTokens);
    return clippedArticle;
}

const generateWithRetry = async (prompt: string, article: string, maxRetries: number = 3): Promise<Record<string, any>> => {
    let currentMaxTokens = 20_000;
    let retryCount = 0;

    while (retryCount < maxRetries) {
        try {
            let fullPrompt = prompt;
            if (retryCount > 0) {
                const clippedArticle = clipArticle(article, currentMaxTokens);
                fullPrompt = prompt.replace('{article}', clippedArticle);
            } else {
                fullPrompt = prompt.replace('{article}', article);
            }
            const res = await generateAlt(fullPrompt);
            if (!res) return {};
            return parseUntilJson(res);
        } catch (error: any) {
            if (error.status === 413) {
                // Reduce token limit by 50% each retry
                console.log("Error Message: ", error.message);
                console.log("Requested Tokens: ", error.error?.message?.match(/Requested (\d+)/)?.[1] || "Unknown");
                currentMaxTokens = Math.floor(currentMaxTokens * 0.50);
                retryCount++;
                console.log(`Retry ${retryCount}: Reducing token limit to ${currentMaxTokens}`);
            } else {
                throw error;
            }
        }
    }
    return {};
}

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
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }
    throw lastError;
};

export async function getNodeWithChildren(query: string): Promise<Record<string, any>> {
    return retryOperation(async () => {
        if (!query)
            return {};
        const wikipediaTopic = await retryOperation(() => getWikipediaTopic(query));
        if (!wikipediaTopic)
            return {};
        if (wikipediaTopic === "false")
            return {
                title: query,
                summary: "No Wikipedia topic found",
                keywords: [],
            };
        const topic = wikipediaTopic.trim().replace(/\s+/g, '%20');
        const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${topic}&format=json`
        const response = await retryOperation(() => fetch(url));
        const data = await response.json();
        const pageId = data.query.search[0].pageid;
        const articleUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=true&pageids=${pageId}&format=json`
        const articleResponse = await retryOperation(() => fetch(articleUrl));
        const articleData = await articleResponse.json();
        const article = articleData.query.pages[pageId].extract;
        
        const prompt = `You are an expert in the field of ${topic}. You are given an article about the topic. Your task is to:

        1. Create a comprehensive summary that:
           - Captures all key technical information
           - Includes an ELI5 (Explain Like I'm 5) explanation
           - Is concise yet informative
           - Maintains accuracy while being accessible
           - The summary must be 2 paragraphs long at max and paragraphs should be very concise and to the point

        2. Generate a list of relevant keywords that are related to the topic but not the topic itself. These keywords should represent concepts that are:
           - Closely related to the main topic
           - Either not directly mentioned in the summary OR mentioned but not explained in depth
           - Important for understanding the broader context
           - Specific and meaningful (avoid generic terms)
           - Can include terms that are mentioned in the summary but have deeper aspects worth exploring

        IMPORTANT INSTRUCTIONS:
        - The keywords must be either:
          a) Mentioned in the summary but not explained in detail, OR
          b) Not mentioned in the summary but are important related concepts
        - Ensure all special characters in the JSON output are properly escaped
        - The response must be valid JSON that can be parsed without errors
        - Do not include any text before or after the JSON object
        - Escape all quotes, newlines, and other special characters in the summary text

        OUTPUT JSON FORMAT:
        {
            "summary": "escaped summary text with proper JSON escaping",
            "keywords": ["keyword1", "keyword2", "keyword3", ...]
        }

        ARTICLE:
        {article}`;

        const res = await retryOperation(() => generateWithRetry(prompt, article));
        const node = {
            title: wikipediaTopic.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            ...res
        }
        return node;
    });
}