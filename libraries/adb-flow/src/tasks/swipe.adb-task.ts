import _ from "lodash";
import type { IAdbTaskProvider } from "../type.js";
import { readProtocolResult } from "../utils/function.js";
export type SwipeParams = {
    action: "up" | "down" | "left" | "right" | "point";
    distance?: number; // for up/down/left/right
    vector?: number[]; // for point
};

export class SwipeTask implements IAdbTaskProvider<SwipeParams> {
    name: string = "swipe";

    async execute(params: SwipeParams, adb: any, __: any) {
        const { action, distance = _.random(50, 100), vector } = params;
        let from: number[] = [0, 0];
        let to: number[] = [0, 0];

        const framebuffer = await adb.framebuffer();
        const centerPoint = [framebuffer.width / 2, framebuffer.height / 2];

        switch (action) {
            case "down": {
                from = [
                    centerPoint[0]!,
                    Math.max(centerPoint[1]! - distance / 2, 100),
                ];
                to = [
                    centerPoint[0]!,
                    Math.min(
                        centerPoint[1]! + distance / 2,
                        framebuffer.height - 100,
                    ),
                ];
                break;
            }
            case "up": {
                from = [
                    centerPoint[0]!,
                    Math.min(
                        centerPoint[1]! + distance / 2,
                        framebuffer.height - 100,
                    ),
                ];
                to = [
                    centerPoint[0]!,
                    Math.max(centerPoint[1]! - distance / 2, 100),
                ];
                break;
            }
            case "left": {
                from = [
                    Math.min(
                        centerPoint[0]! + distance / 2,
                        framebuffer.width - 100,
                    ),
                    centerPoint[1]!,
                ];
                to = [
                    Math.max(
                        centerPoint[0]! - distance / 2,
                        framebuffer.width - 100,
                    ),
                    centerPoint[1]!,
                ];
                break;
            }
            case "right": {
                from = [
                    Math.max(centerPoint[0]! - distance / 2, framebuffer.width),
                    centerPoint[1]!,
                ];
                to = [
                    Math.min(centerPoint[0]! + distance / 2, framebuffer.width),
                    centerPoint[1]!,
                ];
                break;
            }
            case "point": {
                if (!vector) {
                    throw new Error("vector is required");
                }
                const [x1, y1, x2, y2] = vector;
                from = [Number(x1), Number(y1)];
                to = [Number(x2), Number(y2)];
                break;
            }
        }
        // sample command: adb shell input swipe 100 500 100 1450
        const cmd = `input swipe ${from.join(" ")} ${to.join(" ")}`;
        console.log(`action: ${action} cmd: ${cmd}`);
        await adb.subprocess
            .shell(`input swipe ${from.join(" ")} ${to.join(" ")}`)
            .then(readProtocolResult)
            .then(console.log);
    }
}

export default SwipeTask;
