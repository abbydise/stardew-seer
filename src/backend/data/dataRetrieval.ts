import * as cheerio from 'cheerio';
import {CheerioAPI} from "cheerio";
import type { Element } from 'domhandler';

let baseURL : string = 'https://www.stardewvalleywiki.com/mediawiki/api.php?origin=*';
const getpages_params : Record<string, string>= {
    action: "query",
    format: "json",
    list: "allpages",
    aplimit: "max"
}

let getpages_url : string = baseURL;

Object.keys(getpages_params).forEach((key : string) : void => {
    getpages_url += `&${key}=${getpages_params[key]}`
})

let nextArticle : string;
let pagesArray : Array<Record<string, any>> = [];

const getAllTitles = async (url : string) => {
    try {
        const req = await fetch(url);
        const json = await req.json();
        const pages = json.query.allpages;

        for (let p in pages) {
            pagesArray.push(pages[p]);
            // console.log(pages[p].title);
        }

        if (json.continue) {
            // console.log(json.continue.apcontinue);
            nextArticle = json.continue.apcontinue;

            const new_url = getpages_url + "&apcontinue=" + nextArticle;
            await getAllTitles(new_url);
        } else {
            console.log("All done! Retrieved " + pagesArray.length + " pages...");
        }
    } catch (e) {
        console.error(e);
    }
}

// const printPages = async () => {
//     await getAllTitles(getpages_url);
//
//     for (let p in pagesArray) {
//         console.log(pagesArray[p].title);
//     }
// }

// printPages();

let parse_url : string = baseURL;
const parse_params : Record<string, string> = {
    action: "parse",
    format: "json",
    prop: "text"
}

Object.keys(parse_params).forEach((key : string) : void => {
    parse_url += `&${key}=${parse_params[key]}`
})

let articleArray : Array<Record<string, string>> = [];

const getAllArticles = async () => {
    await getAllTitles(getpages_url);

    // for (let p of pagesArray) {
    //     const title = p.title;
    //     const new_url = parse_url + `&page=${title}`;
    //     console.log(new_url);
    //
    //     const req = await fetch(new_url);
    //     const json = await req.json();
    //     // console.log(json);
    //     const content = json.parse.text["*"];
    //
    //     articleArray.push({title: title, content: content});
    // }

    const testPages : string[] = ["Parsnip", "Alex", "Community Center", "Blacksmith", "The Desert", "Spring", "Chicken", "Pickaxes", "Energy", "Fishing", "Secret Notes", "Luck", "Diamond", "Friendship", "Bundles"]
    for (let i of testPages) {
        const title = i;
        const new_url = parse_url + `&page=${i}`;
        // console.log(new_url);

        const req = await fetch(new_url);
        const json = await req.json();
        // console.log(json);
        const content = json.parse.text["*"];

        articleArray.push({title: title, content: content});
    }

    return articleArray;
}

// const printArticles = async() => {
//     await getAllArticles();
//     for (let a in articleArray) {
//         console.log(articleArray[a]);
//     }
// }
//
// printArticles();

const parseContentHTML = (article : Record<string, string>) => {
    const $ = cheerio.load(article.content);

    const sections = $('h2');
    // console.log(sections);

    sections.each((i, section) => {
        const textArray : string[] = []
        let tableArray : string[] = [];
        const content = $(section).nextUntil('h2');
        content.each((i, element) => {
            if (!("tagName" in element)) return;
            const tag : string = element.tagName.toLowerCase();
            if (tag == "p") {
                textArray.push($(element).text().trim());
            } else if (tag == "table" && $(element).attr("id") == "infoboxtable") {
            } else {
                tableArray = parseTableData($, element);
            }
        })
        // console.log(textArray.join(" "));
        console.log(tableArray.join("\n"));
    })
}

const parseTableData = ($ : CheerioAPI, element : Element) : string[] => {
    const tableArray : string[] = [];

    const headers = $(element).find("th");
    const headersArray : string[] = [];
    headers.each((i, header) => {
        headersArray.push($(header).text().trim());
    })
    const headersString = "| " + headersArray.join(" | ") + " |";
    tableArray.push(headersString);

    const separatorArray = headersArray.map((x) => "---");
    const separatorString = "| " + separatorArray.join(" | ") + " |";
    tableArray.push(separatorString);

    const rows = $(element).find("tr");
    rows.each((i, row) => {
        const tableDataArray: string[] = [];
        const data = $(row).find("td");
        data.each((i, value) => {
            if ($(value).text() !== " " && $(value).text().length > 0 && $(value).text().length < 250) tableDataArray.push($(value).text().trim());
        })
        const rowString = "| " + tableDataArray.join(" | ") + " |";
        tableArray.push(rowString);
    })

    return tableArray;
}

const parseInfoboxTableData = ($ : CheerioAPI, element : Element) => {

}

const testHTMLParser = async () => {
    await getAllArticles();

    parseContentHTML(articleArray[0]);
}

testHTMLParser();

export default { getAllArticles, parseContentHTML };