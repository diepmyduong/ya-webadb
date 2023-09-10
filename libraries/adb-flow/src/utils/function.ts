import type { Adb, AdbSubprocessProtocol } from "@yume-chan/adb";
import { createWriteStream } from "fs";
import { PNG } from "pngjs";

export async function delay(timeMs: number) {
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            resolve();
        }, timeMs);
    });
}

/**
 * Read stdout of the protocol and return it as string
 * @param protocol Adb subprocess protocol
 * @returns stdout of the protocol
 */
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

/**
 * Make screenshot and save it to the output path
 * @param adb adb instance
 * @param output image output path
 * @returns void
 */
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
