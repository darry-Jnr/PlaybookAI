import type { BookSpec } from "./types";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

const STORY_INSTRUCTION = `You are a children's book author for ages 3-8. Given the seed below, produce a JSON storybook with 6-12 pages. Keep sentences short and playful.
First pick a \`style_prompt\`: ONE sentence locking the visual look for every page (palette + illustration style + mood, e.g. 'Soft watercolour storybook art, warm pastel palette, friendly rounded characters, whimsical lighting, gentle textures').
Then pick a \`cover_prompt\`: a vivid scene for the cover that includes room for the title.
Then pick a \`back_cover_blurb\`: a short, heartwarming 1-2 sentence description of the story to be shown on the back cover (e.g. 'Follow Twinkle on a magical journey to discover that true light comes from within.').
Then for every page write an \`illustration_prompt\` (one descriptive sentence, whimsical, age-appropriate) and \`text\` (1-3 short sentences of story text, ages 3-8, large-font friendly).
Every page's illustration should show the page's action clearly.

Return ONLY valid JSON matching this structure:
{
  "title": "string",
  "age_range": "string",
  "style_prompt": "string",
  "cover_prompt": "string",
  "back_cover_blurb": "string",
  "pages": [
    {
      "illustration_prompt": "string",
      "text": "string",
      "alt_text": "string | null"
    }
  ],
  "total_pages": "int"
}`;

export async function planStory(prompt: string): Promise<BookSpec> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set.");
  }
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: `${STORY_INSTRUCTION}\n\nSEED: ${prompt}`,
        },
      ],
      temperature: 0.8,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Story planner error (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string") {
    throw new Error("Story planner returned an empty response.");
  }
  return JSON.parse(text) as BookSpec;
}
