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

    $("#navbox").remove()
    $("#toc").remove();

    const sections = $('h2');
    // console.log(sections);

    sections.each((i, section) => {
        const textArray : string[] = []
        let tableArray : string[] = [];
        const sectionTitle : string = $(section).text().trim();
        if (!sectionTitle.includes("Calendar") && !sectionTitle.includes("Stage") && !sectionTitle.includes("Quotes")) {
            // console.log($(section).text().trim());
            const content = $(section).nextUntil('h2');
            content.each((i, element) => {
                if (!("tagName" in element)) return;
                const tag: string = element.tagName.toLowerCase();
                if (tag == "p") {
                    textArray.push($(element).text().trim());
                } else if (tag == "ul") {
                    parseListData($, element);
                } else if ($(element).attr("id") == "infoboxtable") {

                } else {
                    if ($(element).attr("class") != "squote") {
                        tableArray = parseTableData($, element);
                    }
                }
            })
            // console.log(textArray.join(" "));

            if (tableArray.length != 0) {
                console.log(tableArray.join("\n"));
            }
        }
    })
}

const parseListData = ($ : CheerioAPI, element : Element) => {

}

const parseTableData = ($ : CheerioAPI, element : Element) : string[] => {
    const tableArray : string[] = [];

    const headers = $(element).find("tbody > tr > th");
    const headersArray : string[] = [];
    headers.each((i, header) => {
        if ($(header).attr("class") != "unsortable" && $(header).text().trim().toLowerCase() != "image") {
            headersArray.push($(header).text().trim());
        }
    })

    if (headersArray.length == 0) {
        return [];
    }
    const headersString = "| " + headersArray.join(" | ") + " |";
    tableArray.push(headersString);

    const separatorArray = headersArray.map((x) => "---");
    const separatorString = "| " + separatorArray.join(" | ") + " |";
    tableArray.push(separatorString);

    const rows = $(element).find("tbody > tr");
    rows.each((i, row) => {
        const tableDataArray: string[] = [];
        if ($(row).children("td").length == 0) {
            return;
        }

        const rowHeaders = $(row).children("th");
        if (rowHeaders.length != 0) {
            rowHeaders.each((i, header) => {
                tableDataArray.push($(header).text().trim());
            })
        }

        const data = $(row).children("td");
        data.each((i, value) => {
            const breaks = $(value).find("br");
            if (breaks.length != 0) {
                let htmlString = $(value).html();
                if (htmlString) {
                    htmlString = htmlString.replaceAll("<br>", "/")
                    const $cleanedString = cheerio.load(htmlString);

                    const text = $cleanedString().text().trim();
                    if (text.length > 0) {
                        tableDataArray.push(text);
                    }
                }
            } else {
                $(value).find("img").remove();
                $(value).find("style").remove();
                $(value).find("[style*='display: none']").remove();
                const textContent = $(value).text().trim();
                if (textContent.length > 0) {
                    tableDataArray.push(textContent);
                }
            }
        })

        if (tableDataArray.length > 0) {
            const rowString = "| " + tableDataArray.join(" | ") + " |";
            tableArray.push(rowString);
        }
    })

    return tableArray;
}

const testHTMLParser = async () => {
    await getAllArticles();

    // for (let article of articleArray) {
    //     // console.log(article.title);
    //     parseContentHTML(article);
    // }
    parseContentHTML(articleArray[6]);
}

testHTMLParser();

export default { getAllArticles, parseContentHTML };