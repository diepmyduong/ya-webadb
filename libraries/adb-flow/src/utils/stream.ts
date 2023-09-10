import {
    Consumable,
    InspectStream,
    ReadableStream,
} from "@yume-chan/stream-extra";
import { ReadStream, createReadStream } from "fs";

export function createReadableStream(filePath: string): ReadableStream {
    const readStream = createReadStream(filePath);

    const iterator = nodeStreamToIterator(readStream);
    const webStream = iteratorToStream(iterator);

    return webStream;
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
/**
 * From https://github.com/MattMorgis/async-stream-generator
 */

async function* nodeStreamToIterator(stream: ReadStream) {
    for await (const chunk of stream) {
        yield chunk;
    }
}
/**
 * Taken from Next.js doc
 * https://nextjs.org/docs/app/building-your-application/routing/router-handlers#streaming
 * Itself taken from mozilla doc
 * https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream#convert_async_iterator_to_stream
 * @param {*} iterator
 * @returns {ReadableStream}
 */
function iteratorToStream(iterator: AsyncGenerator<Uint8Array>) {
    return new ReadableStream({
        async pull(controller) {
            const { value, done } = await iterator.next();

            if (done) {
                controller.close();
            } else {
                controller.enqueue(new Uint8Array(value));
            }
        },
    });
}
