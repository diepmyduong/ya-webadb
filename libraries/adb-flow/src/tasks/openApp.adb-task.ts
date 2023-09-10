import type { Adb } from "@yume-chan/adb";
import type { IAdbTaskProvider } from "../type.js";
import { readProtocolResult } from "../utils/function.js";

export type OpenAppParams = {
    packageName: string;
    activityName?: string;
};

export class OpenAppTask implements IAdbTaskProvider<OpenAppParams> {
    name = "open-app";

    async execute(params: OpenAppParams, adb: Adb, __: any) {
        let { packageName, activityName } = params as OpenAppParams;

        if (!activityName) {
            await adb.subprocess
                .shell(`am start --activity-clear-task ${packageName}`)
                .then(readProtocolResult)
                .then(console.log);
        } else {
            const cmd = `am start --activity-clear-task -n ${packageName}/${activityName}`;
            await adb.subprocess
                .shell(cmd)
                .then(readProtocolResult)
                .then(console.log);
        }
    }
}

export default OpenAppTask;
