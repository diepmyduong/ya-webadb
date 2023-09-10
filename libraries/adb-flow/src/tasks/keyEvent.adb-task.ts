import type { Adb } from "@yume-chan/adb";
import type { IAdbTaskProvider } from "../type.js";
import { AndroidKeyCode } from "../utils/android-key-code.js";
import { readProtocolResult } from "../utils/function.js";

export type KeyEventParams = {
    keyCode: number;
    longpress?: boolean;
};

export class KeyEventTask implements IAdbTaskProvider<KeyEventParams> {
    name = "key-event";

    keyMap = Object.keys(AndroidKeyCode).reduce(
        (map, key) => ({
            ...map,
            [AndroidKeyCode[key as keyof typeof AndroidKeyCode]]: key,
        }),
        {} as any,
    );

    async execute(params: KeyEventParams, adb: Adb, __: any) {
        const { keyCode, longpress = false } = params;

        // sample command: adb shell input keyevent 3
        let cmd = `input keyevent ${
            this.keyMap[keyCode] ? this.keyMap[keyCode] : keyCode
        }`;
        if (longpress) {
            cmd += " --longpress";
        }

        await adb.subprocess
            .shell(cmd)
            .then(readProtocolResult)
            .then(console.log);
    }
}

export default KeyEventTask;
