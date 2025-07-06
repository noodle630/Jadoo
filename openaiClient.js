"use strict";
// server/openaiClient.ts
import OpenAI from "openai";
import * as dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

if (!process.env.OPENAI_API_KEY) {
    console.warn("[OpenAI] Missing OPENAI_API_KEY. LLM enrichment will not work.");
}

export default openai;
