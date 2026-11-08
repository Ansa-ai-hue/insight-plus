import { NextResponse } from "next/server";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import path from "node:path";
import { pathToFileURL } from "node:url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(
  path.join(
    process.cwd(),
    "node_modules",
    "pdfjs-dist",
    "legacy",
    "build",
    "pdf.worker.mjs",
  ),
).href;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please upload a PDF file." },
        { status: 400 },
      );
    }

    if (
      file.type !== "application/pdf" ||
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return NextResponse.json(
        { error: "Only PDF files are allowed." },
        { status: 400 },
      );
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: "PDF must be smaller than 20 MB." },
        { status: 400 },
      );
    }

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
    }).promise;

    let extractedText = "";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();

      const pageText = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");

      extractedText += `\n\nPage ${pageNumber}\n${pageText}`;
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: "No readable text found. This may be a scanned PDF." },
        { status: 422 },
      );
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      totalPages: pdf.numPages,
      extractedText,
    });
  } catch (error) {
    console.error("PDF extraction error:", error);

    return NextResponse.json(
      { error: "Unable to read this PDF. Please try another file." },
      { status: 500 },
    );
  }
}
