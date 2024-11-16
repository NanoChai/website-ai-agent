import { ChatOpenAI } from "@langchain/openai";
import { verifySignatures } from "@/utils/verifySignatures";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (request: NextRequest) => {
  const body = await request.json();

  // Reuse your existing signature verification
  let isValid = false;
  try {
    isValid = await verifySignatures(body);
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Invalid Signature" }, { status: 400 });
  }

  if (!isValid) {
    return NextResponse.json({ message: "Invalid Signature" }, { status: 400 });
  }

  try {
    // Fetch articles from external API
    const response = await fetch(process.env.CONTENT_API_URL + '/articles', {
      headers: {
        'Authorization': `Bearer ${process.env.CONTENT_API_KEY}`
      }
    });
    
    const articles = await response.json();

    // Initialize LangChain
    const model = new ChatOpenAI({
      modelName: "gpt-3.5-turbo",
    });

    // Process articles with specific instructions
    const processedResponse = await model.invoke(
      `Analyze these articles and ${body.instruction || 'provide a summary'}:
       ${JSON.stringify(articles)}`
    );

    return NextResponse.json({
      originalArticles: articles,
      processedContent: processedResponse
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ 
      error: "Failed to fetch or process articles" 
    }, { 
      status: 500 
    });
  }
};