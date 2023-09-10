/// <reference types="node" />

import fs from "fs";
import yaml from "js-yaml";
import type { IAdbFlow } from "./type.js";

export namespace AdbFlowParser {
    export async function fromFile(flowPath: string): Promise<IAdbFlow> {
        // support json and yaml
        // check file exists
        if (!fs.existsSync(flowPath)) {
            throw new Error(`flow file: ${flowPath} not exists`);
        }

        let json;

        if (flowPath.endsWith(".json")) {
            // read json file
            json = JSON.parse(await fs.promises.readFile(flowPath, "utf-8"));
        } else if (flowPath.endsWith(".yaml") || flowPath.endsWith(".yml")) {
            // read yaml file
            json = yaml.load(await fs.promises.readFile(flowPath, "utf-8"));
        } else {
            throw new Error(`flow file: ${flowPath} not support`);
        }

        if (!json) {
            throw new Error(`flow file: ${flowPath} is not json or yaml`);
        }

        return fromJson(json);
    }

    export async function fromString(flowString: string): Promise<IAdbFlow> {
        // support json and yaml
        // check file exists
        if (!flowString) {
            throw new Error(`flow string is empty`);
        }

        let json: any;
        if (flowString.startsWith("{")) {
            // read json file
            json = JSON.parse(flowString);
        } else if (flowString.startsWith("---")) {
            // read yaml file
            json = yaml.load(flowString);
        }

        if (!json) {
            throw new Error(`flow string is not json or yaml`);
        }

        return fromJson(json);
    }

    function fromJson(json: any): IAdbFlow {
        // validate json
        if (!json.name || !json.tasks) {
            throw new Error(`flow file: name or tasks is empty`);
        }

        return {
            name: json.name,
            tasks: json.tasks.map((task: any) => {
                // validate task
                if (!task.name || !task.taskName) {
                    throw new Error(
                        `flow file: task name or taskName is empty`,
                    );
                }

                return {
                    name: task.name,
                    taskName: task.taskName,
                    taskParams: task.taskParams,
                    delayBeforeMs: task.delayBeforeMs,
                    delayAfterMs: task.delayAfterMs,
                };
            }),
        };
    }
}
