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

type Chunk = {
    id : number,
    title : string,
    body: string,
    similarity: number
}

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
    if (!userQuery.content) {
        return {error: "No question present in request body", status: 400};
    }

    console.time('embeddings');
    const userQueryEmbeddings = await createEmbeddings(userQuery.content);
    console.timeEnd('embeddings');

    if (!userQueryEmbeddings) {
        return {error: "An error occurred creating embeddings for the user's query", status: 500};
    }

    // console.log(userQueryEmbeddings)
    let chunkData;
    let attempt = 1;
    let success = false;

    while (!success) {
        console.log(`Attempt: ${attempt}`);
        console.time('rpc');
        const {data, error}: { data: Chunk[] | null, error: any } = await supabase.rpc(
            'get_relevant_chunks',
            {
                query_vector: userQueryEmbeddings,
                match_threshold: 0.5,
                match_count: 15
            }
        )
        console.timeEnd('rpc');

        if (error && error.code == '57014' && attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 2**(attempt - 1)*1000));
            attempt++;
        } else if (error && attempt == 3) {
            console.error(error);
            return {error: "An error occurred retrieving relevant chunks from database.", status: 500};
        } else if (!error) {
            chunkData = data;
            success = true;
        }
    }

    if (!chunkData) {
        return {error: 'No chunks were retrieved from database.', status: 500}
    }

    // console.log(data);
    let cleanedData = chunkData.map(chunk => `${chunk.title}: ${chunk.body}`).join("\n\n---\n\n")

    const response = await client.chat.completions.create({
        model: "gpt-5.4-mini",
        messages: [{
            role: "system",
            content: 'You are a Stardew Valley expert. Given the following chunks of information from the official Wiki page, answer the question using only that information. It must be outputted as plain text. If you are unsure and the answer is not explicitly written in the documentation, say "Sorry, I am unable to answer that. Please consult the official Stardew Valley Wiki at https://stardewvalleywiki.com/Stardew_Valley_Wiki."'
        }, {role: "user", content: `Context: ${cleanedData}\n\nQuestion: ${userQuery.content}`}],
        max_completion_tokens: 512,
        temperature: 0,
        stream: false
    })

    const answer = response.choices[0].message.content;

    if (!answer) {
        return {error: "Failed to generate a response.", status: 500}
    }

    // console.log(response.choices[0].message.content);
    return {answer: answer}
}

export async function POST(request : NextRequest) {
    try {
        const body = await request.json();
        const response = await getResponse(body);

        if (response.answer) {
            return NextResponse.json(response, {status: 200})
        } else {
            return NextResponse.json({error: response.error}, {status: response.status})
        }
    } catch (e) {
        return NextResponse.json({error: "An error occurred in retrieving a response" + e}, {status: 500});
    }
}