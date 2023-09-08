// make a 10mb file
import fs from "fs";

const file = fs.createWriteStream("./big.file");

for (let i = 0; i <= 100000; i++) {
    file.write(
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ",
    );
}

file.end();
