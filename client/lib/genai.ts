import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

const model = process.env.GROQ_MODEL || "qwen-qwq-32b";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

async function generate(prompt: string) {
    const response = await groq.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
    });
    const contentWithThoughts = response.choices[0].message.content;
    // const contentWithoutThoughts = contentWithThoughts?.split("</think>")[1].trim();
    return contentWithThoughts;
}

async function generateAlt(prompt: string) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
}

export {
    generate,
    generateAlt
}
