import cheerio from "cheerio";
import fs from "fs";

var xml = fs.readFileSync("tmp/facebook-lite.xml", "utf-8");

var $ = cheerio.load(xml, {
    xmlMode: true,
});

var nodes = $(
    "node[class='android.widget.MultiAutoCompleteTextView'][password=true]",
);

console.log(nodes);
