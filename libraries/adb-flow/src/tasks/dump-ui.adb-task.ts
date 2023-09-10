import type { Adb } from "@yume-chan/adb";
import { createWriteStream } from "fs";
import { mkdir } from "fs/promises";
import { pipeline } from "stream/promises";
import type { IAdbTaskProvider } from "../type";
import { readProtocolResult } from "../utils/function";

export type DumpUIParams = {
    output?: string;
};
export class DumpUITask implements IAdbTaskProvider<DumpUIParams> {
    name = "dump-ui";

    async execute(params: any, adb: Adb, __: any) {
        const { output }: DumpUIParams = params;
        const dumpPath = "/sdcard/window_dump.xml";
        // dump ui to xml
        await adb.subprocess
            .shell(`uiautomator dump ${dumpPath}`)
            .then(readProtocolResult)
            .then(console.log);
        const sync = await adb.sync();
        try {
            // pull xml to local
            const readStream = sync.read(dumpPath);

            await mkdir("tmp", { recursive: true });

            const outputPath =
                output || `tmp/window_dump_${new Date().getTime()}.xml`;

            const writeStream = createWriteStream(outputPath);
            try {
                // Pipe the data from the readable stream to the writable stream
                await pipeline(readStream, writeStream);
            } catch (err) {
                console.error("Pipeline failed.", err);
                throw err;
            }

            return {
                xml: outputPath,
            };
        } finally {
            await sync.dispose();
        }
    }
}

export default DumpUITask;
