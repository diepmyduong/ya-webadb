import { type Adb } from "@yume-chan/adb";
import {
    WrapConsumableStream,
    WrapReadableStream,
} from "@yume-chan/stream-extra";
import { existsSync } from "fs";
import { stat } from "fs/promises";
import type { IAdbTaskProvider } from "../type.js";
import { ProgressStream, createReadableStream } from "../utils/stream.js";

export type UploadParams = {
    filePath: string;
    fileName: string;
};

export class UploadTask implements IAdbTaskProvider<UploadParams> {
    name = "upload";

    async execute(params: UploadParams, adb: Adb, __: any) {
        const { filePath, fileName } = params;
        // check if file exists
        if (existsSync(filePath) === false) {
            throw new Error(`File not found: ${filePath}`);
        }

        // upload file

        const fileStat = await stat(filePath);

        const sync = await adb.sync();
        try {
            await sync.write({
                file: new WrapReadableStream(createReadableStream(filePath))
                    .pipeThrough(new WrapConsumableStream())
                    .pipeThrough(
                        new ProgressStream((uploaded) => {
                            if (uploaded !== fileStat.size) {
                                // console.log(
                                //     `Uploaded ${uploaded / fileStat.size}`,
                                // );
                            } else {
                                console.log(`Upload done`);
                            }
                        }),
                    ),
                filename: fileName,
            });
        } finally {
            await sync.dispose();
        }

        return {
            fileName,
        };
    }
}
