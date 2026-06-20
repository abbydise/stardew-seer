import 'dotenv/config';
import OpenAI from "openai";

import { createEmbeddings } from '../data/loadData';
import { createClient } from '@supabase/supabase-js';

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
const supabase = createClient(
    process.env.SUPABASE_PROJECT_URL ?? "",
    process.env.SUPABASE_PUBLISHABLE_KEY ?? ""
);

const getResponse = async (userQuery : string) => {
    const userQueryEmbeddings = await createEmbeddings(userQuery);

    const { data } = await supabase.rpc(
        'get_relevant_chunks',
        {
            query_vector: userQueryEmbeddings,
            match_threshold: 0.8,
            match_count: 10
        }
    )

    const response = await client.chat.completions.create({
        model: "gpt-5.4-mini",
        messages: [{role: "system", content: 'You are a Stardew Valley expert. Given the following chunks of information from the official Wiki page, answer the question using only that information. It must be outputted as HTML. If you are unsure and the answer is not explicitly written in the documentation, say "Sorry, I am unable to answer that. Please consult the official Stardew Valley Wiki at https://stardewvalleywiki.com/Stardew_Valley_Wiki." Make sure the URL is in an HTML anchor tag.'}, {role: "user", content: `Context: ${data}\n\nQuestion: ${userQuery}`}],
        max_completion_tokens: 512,
        temperature: 0,
        stream: false
    })

    console.log(response.choices[0].message.content);
}

getResponse("How much does Alex weigh")