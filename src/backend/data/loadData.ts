import 'dotenv/config';
import OpenAI from 'openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

import sql from './db';
import { getAllArticles, parseContentHTML } from "./dataRetrieval";

type databaseEntry = {
    title : string,
    body : string,
    embedding : string
}

const openai = new OpenAI();
const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 100
})

const createChunks = async () => {
    const articleTitles : Array<Record<string, string>> = await getAllArticles();
    const embeddings : Array<databaseEntry> = [];

    try {
        for (let articleTitle of articleTitles) {
            console.log(`DEBUG: STARTING CHUNKING AND EMBEDDING FOR ${articleTitle.title}`)
            const articleContent: Array<Record<string, string>> = parseContentHTML(articleTitle);

            for (let content of articleContent) {
                const title: string = content.articleTitle + "." + content.sectionTitle;
                const sectionContent: string = content.content;

                const chunks: string[] = await textSplitter.splitText(sectionContent);
                for (let chunk of chunks) {
                    const embeddingValue : string | undefined = await createEmbeddings(chunk);

                    if (embeddingValue) {
                        embeddings.push({title: title, body: sectionContent, embedding: embeddingValue});
                    }
                }
            }
            console.log(`DEBUG: COMPLETED CHUNKING AND EMBEDDING FOR ${articleTitle.title}`);
        }
    } catch (e) {
        console.log(e);
    }

    return embeddings;
}

const createEmbeddings = async (chunk : string) => {
    try {
        const embedding = await openai.embeddings.create({
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

const loadIntoDatabase = async () => {
    const databaseEntries : databaseEntry[] = await createChunks()

    try {
        await sql`
            INSERT INTO documents ${
                sql(databaseEntries, 'title', 'body', 'embedding')
            }
        `
        console.log("SUCCESSFULLY UPLOADED TO THE DATABASE");
    } catch (e) {
        console.error(e);
    }
}

loadIntoDatabase();