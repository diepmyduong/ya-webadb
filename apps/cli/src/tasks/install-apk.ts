import { type Adb } from "@yume-chan/adb";
import { PackageManager } from "@yume-chan/android-bin";
import {
    WrapConsumableStream,
    WrapReadableStream,
} from "@yume-chan/stream-extra";
import { existsSync } from "fs";
import { stat } from "fs/promises";
import { ProgressStream, createReadableStream } from "../common.js";
import type { ITaskProvider } from "../type.js";

export type InstallApkParams = {
    apkPath: string;
};

export class InstallApkTask implements ITaskProvider {
    name = "install-apk";

    async execute(params: InstallApkParams, adb: Adb, context: any) {
        const { apkPath } = params;

        // check if the file exists
        if (existsSync(apkPath) === false) {
            throw new Error(`File ${apkPath} does not exist`);
        }

        const start = Date.now();
        const fileStat = await stat(apkPath);
        const pm = new PackageManager(adb);
        await pm.installStream(
            fileStat.size,
            new WrapReadableStream(createReadableStream(apkPath))
                .pipeThrough(new WrapConsumableStream())
                .pipeThrough(
                    new ProgressStream((uploaded) => {
                        if (uploaded !== fileStat.size) {
                            // console.log(`Uploaded ${uploaded / fileStat.size}`);
                        } else {
                            console.log(`Upload done`);
                        }
                    }),
                ),
        );

        const elapsed = Date.now() - start;

        const transferRate = (
            fileStat.size /
            (elapsed / 1000) /
            1024 /
            1024
        ).toFixed(2);
        console.log(`Install finished in ${elapsed}ms at ${transferRate}MB/s`);
    }
}
