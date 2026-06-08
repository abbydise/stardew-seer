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