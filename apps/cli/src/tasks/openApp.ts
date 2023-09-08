import type { Adb } from "@yume-chan/adb";
import { readProtocolResult } from "../common.js";
import type { ITaskProvider } from "../type.js";

export type OpenAppParams = {
    packageName: string;
    activityName?: string;
};

export class OpenAppTask implements ITaskProvider {
    name = "open-app";

    async execute(params: any, adb: Adb, context: any) {
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
