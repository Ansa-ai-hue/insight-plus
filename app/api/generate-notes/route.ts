import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function splitText(text: string, size: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + size, text.length);

    if (end < text.length) {
      const paragraphBreak = text.lastIndexOf("\n", end);
      if (paragraphBreak > start + size * 0.5) {
        end = paragraphBreak;
      }
    }

    chunks.push(text.slice(start, end));
    start = end;
  }

  return chunks;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is missing." },
        { status: 500 },
      );
    }

    const body = await request.json();
    const text = body.text;

    if (typeof text !== "string" || text.trim().length < 50) {
      return NextResponse.json(
        { error: "Please upload a readable PDF first." },
        { status: 400 },
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const chunks = splitText(text, 8000);
    const notesParts: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      let notes: string | undefined;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: `You are an expert university study assistant.

Create detailed, accurate study notes from this section of a PDF.

Rules:
- Cover every topic and subtopic in this section.
- Preserve lecture numbers and headings.
- Explain definitions and important concepts clearly.
- Use bullet points, examples and tables where useful.
- Do not invent information.
- Do not skip important details.
- Write in clear, student-friendly English.

This is part ${i + 1} of ${chunks.length} of the complete PDF.

PDF CONTENT:
${chunks[i]}`,
            config: {
              temperature: 0.3,
            },
          });

          notes = response.text;
          if (!notes) {
            throw new Error("Gemini returned empty notes.");
          }

          break;
        } catch (error) {
          const apiError = error as {
            status?: number;
            message?: string;
          };

          const retryable = apiError.status === 429 || apiError.status === 503;

          if (!retryable || attempt === 3) {
            throw error;
          }

          await sleep(apiError.status === 429 ? 60000 : 20000);
        }
      }

      if (!notes) {
        throw new Error(`Notes generation failed for part ${i + 1}.`);
      }

      notesParts.push(`## Part ${i + 1}\n\n${notes}`);
    }

    return NextResponse.json({
      success: true,
      notes: notesParts.join("\n\n---\n\n"),
      totalParts: chunks.length,
    });
  } catch (error) {
    const apiError = error as {
      status?: number;
      message?: string;
    };

    console.error("Gemini Notes Error:", error);

    if (apiError.status === 429) {
      return NextResponse.json(
        {
          error: "Gemini quota is still exhausted. Please wait and try again.",
        },
        { status: 429 },
      );
    }

    return NextResponse.json(
      {
        error: apiError.message || "Unable to generate notes.",
      },
      { status: apiError.status === 503 ? 503 : 500 },
    );
  }
}
