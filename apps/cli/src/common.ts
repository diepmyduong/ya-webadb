import type { Adb, AdbSubprocessProtocol } from "@yume-chan/adb";
import { createWriteStream } from "fs";
import { PNG } from "pngjs";

export async function readProtocolResult(protocol: AdbSubprocessProtocol) {
    const reader = protocol.stdout.getReader();
    const decoder = new TextDecoder();
    let result = "";
    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        result += decoder.decode(value);
    }
    return result;
}

export async function makeScreenshot(adb: Adb, output: string) {
    const framebuffer = await adb.framebuffer();

    return new Promise<void>((resolve, reject) => {
        const png = new PNG({
            width: framebuffer.width,
            height: framebuffer.height,
        });
        png.data = Buffer.from(framebuffer.data);

        const writeStream = createWriteStream(output);
        png.pack().pipe(writeStream);

        writeStream.once("finish", () => {
            resolve();
        });
        writeStream.once("error", (e) => {
            reject(e);
        });
    });
}
