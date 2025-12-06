// File: netlify/functions/chat-proxy.js (Updated with Stricter Grammar Logic)

const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const body = JSON.parse(event.body);
        const { prompt, visionData, history = [] } = body; 
        
        if (!GEMINI_API_KEY) {
            return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured on Netlify. Please set GEMINI_API_KEY environment variable.' }) };
        }
        
        // 🚨 UPDATE: System Prompt for Gender Distinction
        const systemPrompt = `तुम जार्विस हो, एक दोस्ताना AI असिस्टेंट। तुम्हारा व्यक्तिगत लिंग (personal gender) स्त्रीलिंग है, इसलिए अपने बारे में बात करते समय हमेशा **feminine Hindi grammar** (जैसे 'मैं हूँ', 'मैं कर सकती हूँ', 'मैंने किया') का उपयोग करो। हालांकि, किसी **पुरुष या पुरुष वैज्ञानिक** के बारे में बात करते समय, उनके लिंग का सम्मान करते हुए, **सही masculine grammar** (जैसे 'वह महान थे', 'उन्होंने आविष्कार किया था') का उपयोग करो। तुम्हारे जवाब तथ्यात्मक, विस्तृत और सहायक होने चाहिए।`;
        
        // --- 1. Conversation Contents (Multi-turn Setup) ---
        const contents = [];

        // Add the System Instruction
        contents.push({ role: 'system', parts: [{ text: systemPrompt }] });

        // Add previous history
        history.forEach(msg => {
            if (msg.role !== 'system') {
                contents.push({ role: msg.role, parts: [{ text: msg.text }] });
            }
        });
        
        // --- 2. Current User Prompt (Vision Fix Incorporated) ---
        let currentPromptText = prompt;
        
        if (visionData && visionData !== 'कुछ विशेष नहीं दिख रहा') {
            currentPromptText = `🚨 CAMERA INPUT RECEIVED: (Objects Detected: ${visionData}). Now, please answer the user's request based on this visual information: "${prompt}"`;
        }

        contents.push({ role: 'user', parts: [{ text: currentPromptText }] });

        const api_url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
        const nodeFetch = require('node-fetch');

        const response = await nodeFetch(api_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: contents, 
                generationConfig: {
                    temperature: 0.7, 
                    maxOutputTokens: 180, 
                    topP: 0.9
                }
            })
        });

        const data = await response.json();
        
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        };
    } catch (error) {
        console.error("Function Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Serverless Function execution failed: ' + error.message })
        };
    }
};
