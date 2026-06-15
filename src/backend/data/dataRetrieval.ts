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

    for (let p of pagesArray) {
        const title = p.title;
        const new_url = parse_url + `&page=${title}`;
        console.log(new_url);

        const req = await fetch(new_url);
        const json = await req.json();
        // console.log(json);
        const content = json.parse.text["*"];

        articleArray.push({title: title, content: content});
    }

    // const testPages : string[] = ["Parsnip", "Alex", "Community Center", "Blacksmith", "The Desert", "Spring", "Chicken", "Pickaxes", "Energy", "Fishing", "Secret Notes", "Luck", "Diamond", "Friendship", "Bundles"]
    // for (let i of testPages) {
    //     const title = i;
    //     const new_url = parse_url + `&page=${i}`;
    //     // console.log(new_url);
    //
    //     const req = await fetch(new_url);
    //     const json = await req.json();
    //     // console.log(json);
    //     const content = json.parse.text["*"];
    //
    //     articleArray.push({title: title, content: content});
    // }

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

const parseContentHTML = (article : Record<string, string>) : Array<Record<string, string>> => {
    const $ = cheerio.load(article.content);
    const formattedContent : Array<Record<string, string>> = [];

    $("#navbox").remove()
    $("#toc").remove();
    $("#gallery").remove();

    const infobox = $("#infoboxtable");
    if (infobox.length > 0) {
        // console.log("Found infobox");
        const infoboxArray = parseInfoboxData($, infobox.get(0) as Element);
        formattedContent.push({articleTitle: article.title, sectionTitle: "infobox", content: infoboxArray.join("\n")})
    }

    const sections = $('h2');
    // console.log(sections);

    sections.each((i, section) => {
        const skippableSections : string[] = ["Crop Growth Calendar", "Stages", "Quotes", "Questions", "Timeline", "Schedule", "Portraits", "Gallery", "External Links", "References", "Energy Cost", "Remixed Bundles"]
        const textArray : string[] = [];
        let listArray : string[] = [];
        let tableArray : string[] = [];
        let contentString : string = "";

        const sectionTitle : string = $(section).text().trim().replace("[edit]", "");
        // console.log(sectionTitle);
        if (!skippableSections.includes(sectionTitle)) {
            const content = $(section).nextUntil('h2');
            content.each((i, element) => {
                if (!("tagName" in element)) return;
                const tag: string = element.tagName.toLowerCase();
                if (tag == "p") {
                    $(element).find("img").remove();
                    $(element).find("style").remove();
                    $(element).find("[style*='display: none']").remove();
                    textArray.push($(element).text().trim());
                } else if (tag == "ul") {
                    // console.log("Found list");
                    listArray = parseListData($, element);
                } else {
                    const tableHeaderId = $(element).find("th").attr("id");
                    const tableStyle = $(element).attr("style");

                    if (tableStyle && tableStyle.includes("border-collapse")) {
                        return;
                    } else if (tableHeaderId && tableHeaderId.includes("Bundle")) {
                        // console.log("Found bundle table");
                        tableArray.push(parseBundleTable($, element));
                    } else if ($(element).attr("class") != "squote") {
                        // console.log("Found table");
                        tableArray.push(...parseTableData($, element));
                    }
                }
            })
            if (textArray.length > 0) {
                contentString += textArray.join("\n");
            }

            if (listArray.length > 0) {
                contentString += listArray.join("\n");
            }

            if (tableArray.length > 0) {
                contentString += tableArray.join("\n");
            }

            formattedContent.push({articleTitle: article.title, sectionTitle: sectionTitle, content: contentString});
        }
    })

    return formattedContent;
}

const parseListData = ($ : CheerioAPI, element : Element) : string[] => {
    const listArray : string[] = [];

    const listItems = $(element).children("li");
    if (listItems.length > 0) {
        listItems.each((i, item) => {
            $(item).find("img").remove();
            $(item).find("style").remove();
            $(item).find("[style*='display: none']").remove();

            const textContent = $(item).text().trim();
            if (textContent.length > 0) {
                listArray.push(textContent);
            }
        })
    }

    return listArray;
}

const parseInfoboxData = ($ : CheerioAPI, element : Element) : string[] => {
    const infoboxArray : string[] = [];

    const infoboxRows = $(element).children("tbody").children("tr");

    if (infoboxRows.length > 0) {
        infoboxRows.each((i, row) => {
            const nestedTable = $(row).children("td").children("table");
            if ($(row).find('[colspan="2"]').length == 0 && nestedTable.length == 0) {
                $(row).find("img").remove();
                $(row).find("style").remove();
                $(row).find("[style*='display: none']").remove();

                const key = $(row).children("td").first().text().trim();
                const value = $(row).children("td").eq(1).text().trim();

                if (key.length > 0 && value.length > 0) {
                    infoboxArray.push(`${key}: ${value}`);
                }
            } else if (nestedTable.length > 0 && $(nestedTable).find('img[alt*="Energy"]').length > 0) {
                const nestedTableRows = $(nestedTable).children("tbody").children("tr");
                if (nestedTableRows.length > 0) {
                    nestedTableRows.each((j, row) => {
                        $(row).find("img").remove();
                        $(row).find("style").remove();
                        $(row).find("[style*='display: none']").remove();

                        const quality = ["Base", "Silver", "Gold", "Iridium"];

                        const energy = $(row).children("td").eq(1).text().trim();
                        const health = $(row).children("td").eq(3).text().trim();

                        // console.log(`${energy} / ${health}`);

                        if (energy.length > 0 && health.length > 0) {
                            const textContent = `${quality[j]}: ${energy} energy / ${health} health`;

                            infoboxArray.push(textContent);
                        }
                    })
                }
            }
        })
    }

    return infoboxArray;
}

const parseBundleTable = ($ : CheerioAPI, element : Element) : string => {
    const header = $(element).find("th").first();
    const bundleTitle = header.text().trim();

    const rows = $(element).children("tbody").children("tr");
    const itemsAndSources : string[] = [];
    if (rows.length > 0) {
        rows.each((i, row) => {
            if ($(row).children("td").length >= 2) {
                $(row).find("img").remove();
                $(row).find("style").remove();
                $(row).find("[style*='display: none']").remove();
                const itemName = $(row).children("td").eq(-2).text().trim();
                const source = $(row).children("td").last().text().trim();

                itemsAndSources.push(`${itemName} (${source})`)
            }
        })
    }
    return `${bundleTitle}: ${itemsAndSources.join(", ")}`
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

    const rows = $(element).children("tbody").children("tr");
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
            const nestedTable = $(value).children("table");
            const breaks = $(value).find("br");

            if (nestedTable.length != 0 && $(nestedTable).find('img[alt*="Quality Icon"]').length > 0) {
                nestedTable.each((i, nestedTables) => {
                    const nestedTableDataArray : string[] = []
                    const nestedTableRows = $(nestedTables).children("tbody").children("tr");
                    nestedTableRows.each((row, nestedRows) => {
                        const nestedTableData = $(nestedRows).children("td");
                        nestedTableData.each((i, nestedData) => {
                            const quality = ["Base", "Silver", "Gold", "Iridium"];
                            $(nestedData).find("img").remove();
                            $(nestedData).find("style").remove();
                            $(nestedData).find("[style*='display: none']").remove();

                            const cellText = $(nestedData).text().trim()
                            if (cellText.length > 0) {
                                const textContent = `${quality[row]}: ${cellText}`;
                                // console.log(textContent);
                                nestedTableDataArray.push(textContent);
                            }
                        })
                    })

                    if (nestedTableDataArray.length > 0) {
                        // console.log(nestedTableDataArray);

                        const nestedTableString = nestedTableDataArray.join(", ");
                        // console.log(nestedTableString);

                        tableDataArray.push(nestedTableString);
                    }

                })
            } else if (breaks.length != 0) {
                let htmlString = $(value).html();
                // console.log(htmlString);
                if (htmlString) {
                    htmlString = htmlString.replaceAll("<br>", " / ")
                    // console.log(htmlString);
                    const $cleanedString = cheerio.load(htmlString);
                    const text = $cleanedString.text().trim();
                    // console.log(text);

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

// const testHTMLParser = async () => {
//     await getAllArticles();
//
//     // for (let article of articleArray) {
//     //     // console.log(article.title);
//     //     parseContentHTML(article);
//     // }
//     console.log(parseContentHTML(articleArray[14]));
// }
// testHTMLParser();

export default { getAllArticles, parseContentHTML };