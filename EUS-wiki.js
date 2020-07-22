const fs = require("fs"),
      download = require("download"),
      emoji = require("../misc/emoji_list.json");

// Defines the function of this module
const MODULE_FUNCTION = "handle_requests",

// Base path for module folder creation and navigation
BASE_PATH = "/EUS-wiki";

// Only ran on startup so using sync functions is fine
// Makes the folders for files of the module
if (!fs.existsSync(__dirname + BASE_PATH)) {
    fs.mkdirSync(__dirname + BASE_PATH);
    console.log(`[EUS-wiki] Made EUS-wiki module folder`);
}
if (!fs.existsSync(__dirname + BASE_PATH + "/files")) {
    fs.mkdirSync(__dirname + BASE_PATH + "/files");
    console.log(`[EUS-wiki] Made EUS-wiki module files folder`);
    // Download page files
    // Download page template files
    // needs to be done
}
if (!fs.existsSync(__dirname + BASE_PATH + "/files/css")) {
    fs.mkdirSync(__dirname + BASE_PATH + "/files/css");
    console.log(`[EUS-wiki] Made EUS-wiki module css folder`);
}
if (!fs.existsSync(__dirname + BASE_PATH + "/files/css/main.css")) {
    download("https://raw.githubusercontent.com/tgpethan/EUS-wiki/master/EUS-wiki/files/css/main.css", __dirname + BASE_PATH + "/files/css");
    console.log(`[EUS-wiki] Downloaded EUS-wiki main.css`);
}
if (!fs.existsSync(__dirname + BASE_PATH + "/files/js")) {
    fs.mkdirSync(__dirname + BASE_PATH + "/files/js");
    console.log(`[EUS-wiki] Made EUS-wiki module js folder`);
}
if (!fs.existsSync(__dirname + BASE_PATH + "/files/js/navHelper.js")) {
    download("https://raw.githubusercontent.com/tgpethan/EUS-wiki/master/EUS-wiki/files/js/navHelper.js", __dirname + BASE_PATH + "/files/js");
    console.log(`[EUS-wiki] Downloaded EUS-wiki navHelper.js`);
}


module.exports = {
    extras:async function() {
        /*
            Anything else that needs to be loaded into the framework
            can be done here, this is used for things like busboy that
            need to be put to the express server to work
            The express server is accessable from global.app
        */
    },
    get:async function(req, res) {
        /*
            req - Request from client
            res - Response from server
        */

        // Anything that needs to be done in a GET request can be done here

        // Set some headers
        res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
        res.set("X-XSS-Protection", "1; mode=block");
        res.set("Feature-Policy", "fullscreen 'none'");
        res.set("Referrer-Policy", "strict-origin-when-cross-origin");
        res.set("Content-Security-Policy", "block-all-mixed-content;frame-ancestors 'self'");
        res.set("X-Frame-Options", "SAMEORIGIN");
        res.set("X-Content-Type-Options", "nosniff");

        // Make sure the file exists
        const url = filterURL(req.url);

        fs.access(__dirname + BASE_PATH + "/files" + url, fs.constants.F_OK, (err) => {
            if (err) {
                // Check if the wiki page exists
                fs.access(__dirname + BASE_PATH + "/EUS-wiki-pages" + url + ".md", fs.constants.F_OK, (error) => {
                    if (error && url != "/index.html") {
                        // File doesn't exist, return a 404 to the client.
                        global.modules.consoleHelper.printWarn(emoji.page, `${req.method}: ${req.url} was requested - Returned 404`);
                        res.status(404).send("404!<hr>Revolution");
                    } else {
                        return constructPage(req, res, __dirname + BASE_PATH + "/EUS-wiki-pages" + url + ".md");
                    }
                });
            } else {
                // File does exist, send the file back to the client.
                global.modules.consoleHelper.printInfo(emoji.page, `${req.method}: ${req.url} was requested`);
                res.sendFile(__dirname + BASE_PATH + "/files" + req.url);
            }
        });
    },
    post:async function(req, res) {
        /*
            req - Request from client
            res - Response from server
        */

        // Anything that needs to be done with a POST can be done here.
    }
}

module.exports.MOD_FUNC = MODULE_FUNCTION;

function filterURL(url) {
    url = url.split("?")[0];
    if (url == "/") url = "/index.html";
    if (url[url.length - 1] == "/") url = url + "index.html";
    return url;
}

function constructPage(req, res, pageLocation) {
    let startTime = new Date().getTime();
    fs.readFile(__dirname + BASE_PATH + "/EUS-wiki-pages/page-template.html", (er, data) => {
        if (er) return res.status(500).send("500 - Internal Server Error<hr>EUS-Wiki");
        if (req.url == "/") res.send(
            data.toString()
            .replace("[&e3-title]", "Home")
            .replace("[&e3-pageslist]", generatePageList(getMdPageName(req.url)))
            .replace("[&e3-pagecontent]", "Click a page to start reading")
        );
        else {
            fs.readFile(pageLocation, (err, d) => {
                res.send(
                    data.toString()
                    .replace("[&e3-title]", getMdPageName(req.url))
                    .replace("[&e3-pageslist]", generatePageList(getMdPageName(req.url)))
                    .replace("[&e3-pagecontent]", parseMd(d, req.url))
                );
                global.modules.consoleHelper.printInfo(emoji.page, `${req.url} took ${new Date().getTime() - startTime}ms to generate page`);
            });
        }
    });
}

class pageItem {
    constructor(name, url, place) {
        this.type = "pageItem";
        this.name = name;
        this.place = place;
        this.url = url;
    }
}

class folderItem {
    constructor(folderName, array) {
        this.type = "folderItem";
        this.folderName = folderName;
        this.array = array;
    }
}

function generatePageList(pageName) {
    let pageList = [];
    const pagesRoot = fs.readdirSync(__dirname + BASE_PATH + "/EUS-wiki-pages/");

    for (let i = 0; i < pagesRoot.length; i++) {
        const s1 = pagesRoot[i].split(".");
        if (s1[s1.length - 1] == "html") continue;
        if (s1.length >= 2) {
            // Has an extention, clearly a file.
            pageList.push(new pageItem(pagesRoot[i].replace(".md", ""), s1[0], "/" + pagesRoot[i].replace(".md", "")));
        } else {
            // Probably a folder
            pageList.push(new folderItem(s1[0], getFolderContents(__dirname + BASE_PATH + "/EUS-wiki-pages/" + pagesRoot[i])));
        }
    }

    let textToReturn = "";
    for (let i = 0; i < pageList.length; i++) {
        const a = pageList[i].array;
        if (pageList[i].type == "folderItem") {
            textToReturn += `<div class="item-folder" style="margin-left: ${0}px;">${pageList[i].folderName}</div>${folderItemToHtml(pageList[i], 10, pageName)}`;
        } else {
            if (pageList[i].name == pageName) {
                textToReturn += `<div class="item item-selected" style="margin-left: ${0}px;">${pageList[i].name}</div>`;
            } else {
                textToReturn += `<div class="item" onclick="go('${pageList[i].place}')" style="margin-left: ${0}px;">${pageList[i].name}</div>`;
            }
        }
    }

    return textToReturn;
}

function folderItemToHtml(item, offset, pageName) {
    const a = item.array;
    let textToReturn = "";
    if (a == null) return "";
    for (let i = 0; i < a.length; i++) {
        if (a[i].type == "folderItem") {
            textToReturn += `<div class="item-folder" style="margin-left: ${offset}px;">${a[i].folderName}</div>${folderItemToHtml(a[i], offset + 10, pageName)}`;
        } else {
            if (a[i].name == pageName) {
                textToReturn += `<div class="item item-selected" style="margin-left: ${offset}px;">${a[i].name}</div>`;
            } else {
                textToReturn += `<div class="item" onclick="go('${a[i].place}')" style="margin-left: ${offset}px;">${a[i].name}</div>`;
            }
        }
    }

    return textToReturn;
}

function getFolderContents(s) {
    let list = [];
    const pages = fs.readdirSync(s);

    for (let i = 0; i < pages.length; i++) {
        const s1 = pages[i].split(".");
        if (s1.length >= 2) {
            // Has an extention, clearly a file.
            const fle = `${s}/${pages[i]}`.split("/EUS-wiki-pages");
            list.push(new pageItem(s1[0], `${s}/${pages[i]}`, fle[fle.length - 1].replace(".md", "")));
        } else {
            // Probably a folder
            list.push(new folderItem(s1[0], getFolderContents(`${s}/${pages[i]}`)));
        }
    }

    return list;
}

function getMdPageName(s) {
    let s1 = s.split("/");
        s1 = s1[s1.length - 1];

    return s1;
}

function parseMd(s, pageName) {
    s = s.toString().split("\n");
    let codeBlock = false,
        s1 = `<h1>${pageName}</h1><hr class="hr-underline">`;
    for (let i = 0; i < s.length; i++) {
        if (s[i].startsWith("###")) {
            s1 += `<h1>${s[i].replace("### ", "")}</h1><hr class="hr-underline">`;
            continue;
        } else if (s[i].startsWith("##")) {
            s1 += `<h2>${s[i].replace("## ", "")}</h2><hr class="hr-underline">`;
            continue;
        } else if (s[i].startsWith("#")) {
            s1 += `<h3>${s[i].replace("# ", "")}</h3>`
        } else if (s[i].includes("```")) {
            if (codeBlock) {
                codeBlock = false;
                s1 += `</div>`;
            } else {
                codeBlock = true;
                s1 += `<div class="ui-codeblock">`;
            }
        } else {
            if (codeBlock) {
                s1 += `${s[i]}<br>`;
            } else {
                s1 += `<p>${s[i]}</p>`;
            }
            continue;
        }
    }

    return s1;
}