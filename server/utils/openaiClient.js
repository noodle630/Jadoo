"use strict";
// server/openaiClient.js
// OpenAI credentials are loaded from .env or .env.production
const OpenAI = require("openai");
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
if (!process.env.OPENAI_API_KEY) {
    console.warn("[OpenAI] Missing OPENAI_API_KEY. LLM enrichment will not work. Set OPENAI_API_KEY in your .env");
}
module.exports = openai;
