// File: netlify/functions/chat-proxy.js

const { GoogleGenAI } = require("@google/genai");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const data = JSON.parse(event.body);
        const { prompt, visionData, history } = data;

        if (!GEMINI_API_KEY) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Server Configuration Error: GEMINI_API_KEY environment variable not set in Netlify settings.' })
            };
        }

        const ai = new GoogleGenAI(GEMINI_API_KEY);
        
        // --- System Prompt (UPDATED for Stability) ---
        const systemPrompt = "तुम जार्विस हो, एक दोस्ताना AI असिस्टेंट। तुम्हारा लिंग स्त्रीलिंग है, इसलिए अपने बारे में बात करते समय हमेशा feminine Hindi grammar (जैसे 'मैं हूँ', 'मैंने किया') का उपयोग करो। किसी व्यक्ति के बारे में बात करते समय, उनके सही लिंग का उपयोग करो। तुम्हारे जवाब तथ्यात्मक, विस्तृत और सहायक होने चाहिए।";

        const contents = [];
        contents.push({ role: 'system', parts: [{ text: systemPrompt }] });

        if (history && history.length > 0) {
            history.forEach(msg => {
                if (msg.role !== 'system') {
                    contents.push({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] });
                }
            });
        }
        
        let currentPromptText = prompt;
        if (visionData && visionData !== 'कुछ विशेष नहीं दिख रहा') {
            currentPromptText = `🚨 CAMERA INPUT RECEIVED: (Objects Detected: ${visionData}). Now, please answer the user's request based on this visual information: "${prompt}"`;
        }
        
        contents.push({ role: 'user', parts: [{ text: currentPromptText }] });

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contents,
            config: {
                temperature: 0.6,    // Stability increased
                maxOutputTokens: 400,  // Max length increased
                topP: 0.9,
            }
        });

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response)
        };
    } catch (error) {
        console.error("Function Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'AI service error. Please check Netlify logs for details.' })
        };
    }
};
