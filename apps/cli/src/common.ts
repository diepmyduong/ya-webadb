import type { Adb, AdbSubprocessProtocol } from "@yume-chan/adb";
import { Consumable, InspectStream } from "@yume-chan/stream-extra";
import { createReadStream, createWriteStream } from "fs";
import { PNG } from "pngjs";
import { ReadableStream } from "web-streams-polyfill";

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

export async function delay(timeMs: number) {
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            resolve();
        }, timeMs);
    });
}

export function createReadableStream(filePath: string) {
    const readStream = createReadStream(filePath);

    return new ReadableStream({
        start(controller) {
            readStream.on("data", (chunk) => {
                controller.enqueue(chunk);
            });

            readStream.on("end", () => {
                controller.close();
            });

            readStream.on("error", (error) => {
                console.log("ERROR" + error);
                controller.error(error);
            });
        },
    }) as any;
}

export class ProgressStream extends InspectStream<Consumable<Uint8Array>> {
    public constructor(onProgress: (value: number) => void) {
        let progress = 0;
        super((chunk) => {
            progress += chunk.value.byteLength;
            onProgress(progress);
        });
    }
}
