import { GroundingChunk, GeminiSettings } from "../types";

const OPENAI_API_BASE = 'https://api.openai.com/v1';

interface OpenAIResponse {
    output_text?: string;
    output?: any; // Can vary, but typically has message objects
    tools?: any[];
}

/**
 * Runs OpenAI Deep Research using the Responses API.
 * Uses a long timeout to allow the research to complete synchronously (or via long-polling if implemented by fetch).
 * 
 * @param prompt - The user prompt for research.
 * @param modelId - The OpenAI model ID (e.g., o3-deep-research).
 * @param apiKey - The OpenAI API Key.
 * @param onStatusUpdate - Callback for status messages.
 * @param signal - AbortSignal for cancellation.
 * @param customInstructions - Optional global instructions.
 */
export const runOpenAIDeepResearch = async (
    prompt: string,
    modelId: string,
    apiKey: string,
    onStatusUpdate?: (status: string) => void,
    signal?: AbortSignal,
    customInstructions?: string
): Promise<{ text: string; sources: GroundingChunk[] }> => {
    if (!apiKey) throw new Error("OpenAI API Key is missing.");

    onStatusUpdate?.("Initializing OpenAI Deep Research Agent...");

    // Construct the Tools payload
    const tools = [
        { type: "web_search_preview" }
        // file_search or code_interpreter can be added here if we support them later
    ];

    // Construct the Request Body
    // Based on user docs: client.responses.create({ model, input, tools, ... })
    // Maps to POST /v1/responses
    const body = {
        model: modelId,
        input: prompt,
        tools: tools,
        // instructions: customInstructions // The API supports 'instructions' field for prompt engineering
    };

    if (customInstructions) {
        (body as any).instructions = customInstructions;
    }

    try {
        onStatusUpdate?.("Agent is thinking & researching (this takes 2-10 mins)...");

        const response = await fetch(`${OPENAI_API_BASE}/responses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body),
            signal: signal,
            // Increase timeout for fetch if environment supports it, but standard fetch signal handles abort
            // Note: Browsers may time out after a few minutes. 
            // User docs recommend background=true for reliability, but without a backend callback handler, 
            // we rely on the long-lived connection or the browser's willingness to wait.
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`OpenAI API Error: ${errorData?.error?.message || response.statusText}`);
        }

        const data: any = await response.json();

        // Parse Output
        // The docs say "The output from a deep research model is the same as any other via the Responses API"
        // and example shows accessing `response.output_text`.
        // However, for sources, we need to inspect the message content or annotations.

        // Check for output_text first (simplest)
        let text = data.output_text || "";

        // If output_text is missing, try to parse from the 'message' object described in docs
        // "message": { "content": [ { "type": "output_text", "text": "...", "annotations": [...] } ] }
        let sources: GroundingChunk[] = [];

        // There might be a 'message' field in the response or inside an 'output' object
        // The structure can vary based on exact API version, but looking at docs:
        // JSON output example shows:
        // { "type": "message", "content": [...] }
        // But the top level response object usually has these fields.

        // Let's look for annotations in the data structure
        // If output_text is present, it's likely the flat text. 
        // We need to find the rich object for annotations.

        // Scan for 'annotations' recursively or in known paths
        // Path 1: data.output (if it exists) -> message -> content
        // Path 2: data (if it is the message object itself, unlikely)

        // Looking at the example:
        // response.output_text is printed.
        // "Output structure... Responses may include output items like... message: The model's final answer with inline citations."
        // It seems 'output_text' is a helper property in the SDK, but the raw JSON might be different.

        // Let's assume the raw JSON has an 'output' or 'choices' equivalent.
        // Docs say: "The output from a deep research model ... will contain a listing of web search calls ... and message."

        // We will look for a "message" type item in the output array if it exists
        // OR just parse text if we can't find structured sources.

        // Attempt to extract sources from 'annotations' if available in the response
        // Using a broad search strategy since exact JSON path wasn't explicitly dumped for the *entire* response body
        // but snippets were shown.

        // Heuristic: specific fields mentioned
        if (data.output_text) {
            text = data.output_text;
        }

        // If we have a list of outputs/events
        const outputItems = Array.isArray(data) ? data : (data.output || []); // 'output' array mentioned in docs

        // Iterate to find the final message
        const messageItem = outputItems.find((item: any) => item.type === 'message');
        if (messageItem && messageItem.content) {
            const textContent = messageItem.content.find((c: any) => c.type === 'output_text');
            if (textContent) {
                text = textContent.text || text; // Prefer structured text if available
                if (textContent.annotations) {
                    textContent.annotations.forEach((ann: any) => {
                        if (ann.url && ann.title) {
                            sources.push({
                                web: {
                                    uri: ann.url,
                                    title: ann.title
                                }
                            });
                        }
                    });
                }
            }
        } else {
            // Fallback: IF the API returns flat text with markdown links [Title](url), we can regex them
            // (Same regex as Gemini implementation)
            const sourceRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
            let match;
            while ((match = sourceRegex.exec(text)) !== null) {
                const uri = match[2];
                if (!sources.some(s => s.web?.uri === uri)) {
                    sources.push({
                        web: { title: match[1], uri: uri }
                    });
                }
            }
        }

        return { text, sources };

    } catch (error: any) {
        if (error.name === 'AbortError' || signal?.aborted) {
            throw new DOMException("Aborted", "AbortError");
        }
        throw error;
    }
};
