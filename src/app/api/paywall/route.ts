import { verifySignatures } from "@/utils/verifySignatures";
import { NextRequest, NextResponse } from "next/server";
import { lockedContent } from "./content";

export const POST = async (request: NextRequest) => {
  const headers = {
    'Access-Control-Allow-Origin': 'https://website-ai-agent.vercel.app',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { headers, status: 200 });
  }

  const body = await request.json();

  const {
    userSignature,
    restakerSignature,
    userAddress,
    messageHash,
    restakerAddress,
    url,
  } = body;

  if (
    !userSignature ||
    !restakerSignature ||
    !userAddress ||
    !messageHash ||
    !restakerAddress ||
    !url
  ) {
    return NextResponse.json({ message: "Payment Required" }, { 
      status: 402,
      headers 
    });
  }

  let isValid = false;

  try {
    isValid = await verifySignatures(body);
  } catch (e) {
    console.log(e);
  }

  if (!isValid) {
    return NextResponse.json({ message: "Invalid Signature" }, { 
      status: 400,
      headers 
    });
  }

  const data = lockedContent.data[url as keyof typeof lockedContent.data];

  if (!data) {
    return NextResponse.json({ message: "No content found" }, { 
      status: 404,
      headers 
    });
  }

  return NextResponse.json({ data }, { headers });
};

