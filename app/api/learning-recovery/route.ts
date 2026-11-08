import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is missing." },
        { status: 500 },
      );
    }

    const { questions, answers, text } = await request.json();

    if (
      !Array.isArray(questions) ||
      !Array.isArray(answers) ||
      questions.length === 0 ||
      questions.length !== answers.length
    ) {
      return NextResponse.json(
        { error: "Complete quiz questions and answers are required." },
        { status: 400 },
      );
    }

    const results = questions.map((question: any, index: number) => {
      const selected = answers[index];
      const correct = question.correctAnswer;

      if (
        !Array.isArray(question.options) ||
        !Number.isInteger(selected) ||
        selected < 0 ||
        selected >= question.options.length ||
        !Number.isInteger(correct) ||
        correct < 0 ||
        correct >= question.options.length
      ) {
        throw new Error(`Invalid answer data at question ${index + 1}.`);
      }

      return {
        questionNumber: index + 1,
        question: question.question,
        studentAnswer: question.options[selected],
        correctAnswer: question.options[correct],
        explanation: question.explanation,
        isCorrect: selected === correct,
      };
    });

    const wrongAnswers = results.filter((item) => !item.isCorrect);

    const correctCount = results.length - wrongAnswers.length;

    if (wrongAnswers.length === 0) {
      return NextResponse.json({
        success: true,
        report: `# Excellent Work!

You answered all ${results.length} questions correctly.

- **Correct answers:** ${correctCount}
- **Wrong answers:** 0
- **Accuracy:** 100%

There are no incorrect answers to analyze. Continue practicing with more challenging questions to strengthen your knowledge.`,
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `You are an expert AI learning recovery tutor.

Analyze ONLY the student's incorrect quiz answers.

QUIZ SUMMARY:
Total questions: ${results.length}
Correct answers: ${correctCount}
Wrong answers: ${wrongAnswers.length}

VERIFIED INCORRECT ANSWERS:
${JSON.stringify(wrongAnswers, null, 2)}

STUDY MATERIAL:
${typeof text === "string" ? text.slice(0, 10000) : "Not provided."}

IMPORTANT RULES:
- Analyze only questions marked isCorrect: false.
- The studentAnswer and correctAnswer are already verified by the backend.
- Never describe a correct answer as a mistake.
- Identify weak topics only when supported by the incorrect questions.
- Do not invent lecture numbers, section numbers, or syllabus details.
- If a topic cannot be identified confidently, say so.
- Explain why each selected answer is incorrect and why the correct answer is right.
- Do not claim the student has a repeated weakness based on only one mistake.

Create a student-friendly report with these sections:

1. Quiz Performance Summary
Show correct answers, wrong answers, and accuracy percentage.

2. Actual Mistakes
For each incorrect question, show:
- Question
- Student's selected answer
- Correct answer
- Why the selected answer is incorrect
- Explanation of the correct answer

3. Weak Topics
Identify topics supported by the actual mistakes.

4. Why You May Be Struggling
Explain possible misunderstandings without making unsupported assumptions.

5. Three Targeted Practice Questions
Create three new questions based on the identified weak concepts. Include four options and the correct answer with a short explanation.

6. Study Recommendation
Give a short, practical revision plan.

Use clear headings and Markdown. Be accurate and never invent information.`,
      config: {
        temperature: 0.2,
      },
    });

    if (!response.text) {
      throw new Error("Empty recovery report.");
    }

    return NextResponse.json({
      success: true,
      report: response.text,
    });
  } catch (error) {
    console.error("Learning Recovery Error:", error);

    const apiError = error as { status?: number };

    return NextResponse.json(
      {
        error:
          apiError.status === 429
            ? "Gemini quota reached. Please try again later."
            : apiError.status === 503
              ? "Gemini is busy. Please try again shortly."
              : "Unable to generate your learning recovery report.",
      },
      {
        status:
          apiError.status === 429 ? 429 : apiError.status === 503 ? 503 : 500,
      },
    );
  }
}
