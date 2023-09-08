import { existsSync } from "fs";
import { readFile } from "fs/promises";
import yaml from "js-yaml";

export async function flowParser(flowPath: string) {
    // support json and yaml
    // check file exists
    if (!existsSync(flowPath)) {
        throw new Error(`flow file: ${flowPath} not exists`);
    }

    if (flowPath.endsWith(".json")) {
        // read json file
        return JSON.parse(await readFile(flowPath, "utf-8"));
    } else if (flowPath.endsWith(".yaml") || flowPath.endsWith(".yml")) {
        // read yaml file
        return yaml.load(await readFile(flowPath, "utf-8"));
    } else {
        throw new Error(`flow file: ${flowPath} not support`);
    }
}
