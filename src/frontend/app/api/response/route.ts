import 'dotenv/config';
import OpenAI from "openai";

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
const supabase = createClient(
    process.env.SUPABASE_PROJECT_URL ?? "",
    process.env.SUPABASE_PUBLISHABLE_KEY ?? ""
);

const createEmbeddings = async (chunk : string) => {
    try {
        const embedding = await client.embeddings.create({
            model: "text-embedding-3-small",
            input: chunk,
            encoding_format: "float"
        });
        const embeddingValue: number[] = embedding.data[0].embedding;

        return `[${embeddingValue.join(',')}]`;
    } catch (e) {
        console.error(e);
    }
}

const getResponse = async (userQuery: Record<string, string>) => {
    if (!userQuery.question) {
        return {error: "No question present in request body", status: 400};
    }

    const userQueryEmbeddings = await createEmbeddings(userQuery.question);

    if (!userQueryEmbeddings) {
        return {error: "An error occurred creating embeddings for the user's query", status: 500};
    }

    const {data} = await supabase.rpc(
        'get_relevant_chunks',
        {
            query_vector: userQueryEmbeddings,
            match_threshold: 0.8,
            match_count: 10
        }
    )

    const response = await client.chat.completions.create({
        model: "gpt-5.4-mini",
        messages: [{
            role: "system",
            content: 'You are a Stardew Valley expert. Given the following chunks of information from the official Wiki page, answer the question using only that information. It must be outputted as plain text. If you are unsure and the answer is not explicitly written in the documentation, say "Sorry, I am unable to answer that. Please consult the official Stardew Valley Wiki at https://stardewvalleywiki.com/Stardew_Valley_Wiki."'
        }, {role: "user", content: `Context: ${data}\n\nQuestion: ${userQuery.question}`}],
        max_completion_tokens: 512,
        temperature: 0,
        stream: false
    })

    // console.log(response.choices[0].message.content);
    return {answer: response.choices[0].message.content}
}

export async function POST(request : NextRequest) {
    try {
        const body = await request.json();
        const response = await getResponse(body);

        if (response.answer) {
            return NextResponse.json(response, {status: 200})
        } else if (response.status == 400) {
            return NextResponse.json({error: response.error}, {status: response.status})
        } else {
            return NextResponse.json({error: response.error}, {status: response.status})
        }
    } catch (e) {
        console.log(e);
        return NextResponse.json({error: "An error occurred in retrieving a response" + e}, {status: 500});
    }
}