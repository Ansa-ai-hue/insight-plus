
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

type Flashcard = {
  front: string;
  back: string;
};

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is missing." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const text = body.text;

    if (typeof text !== "string" || text.trim().length < 50) {
      return NextResponse.json(
        { error: "Please upload a readable PDF first." },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `Create exactly 10 useful study flashcards from this material.

Return ONLY valid JSON in this format:
{
  "flashcards": [
    {
      "front": "Question or key term",
      "back": "Clear answer or explanation"
    }
  ]
}

Rules:
- Create exactly 10 different flashcards.
- Cover important concepts and definitions.
- Keep questions short and answers clear.
- Use only the supplied study material.
- Do not repeat cards.
- Return valid JSON only.

Study material:
${text.slice(0, 20000)}`,
      config: {
        temperature: 0.3,
        responseMimeType: "application/json",
      },
    });

    if (!response.text) {
      throw new Error("Gemini returned an empty response.");
    }

    const result = JSON.parse(response.text);
    const flashcards: Flashcard[] = result.flashcards;

    if (
      !Array.isArray(flashcards) ||
      flashcards.length !== 10 ||
      flashcards.some(
        (card) =>
          typeof card.front !== "string" ||
          typeof card.back !== "string"
      )
    ) {
      throw new Error("Invalid flashcards format.");
    }

    return NextResponse.json({
      success: true,
      flashcards,
    });
  } catch (error) {
    console.error("Flashcards Error:", error);

    const apiError = error as { status?: number };

    return NextResponse.json(
      {
        error:
          apiError.status === 429
            ? "Gemini quota reached. Please try again later."
            : "Unable to generate flashcards. Please try again.",
      },
      { status: apiError.status === 429 ? 429 : 500 }
    );
  }
}
