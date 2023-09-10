import { exec } from "child_process";
import path from "path";
import type { MatchRegion } from "../type.js";

/**
 * Find the match region of template image in background image
 * @param backgroundImg background image path
 * @param templateImg template image path
 * @param options match options
 * @returns match region
 */
export function templateMatcher(
    backgroundImg: string,
    templateImg: string,
    options: {
        confidence?: number;
        scaleSteps?: number[];
        output?: string | undefined;
    } = {},
) {
    const pythonScriptPath = path.resolve(
        __dirname,
        "../../scripts/template-matcher.py",
    );
    let cmd = `python3 ${pythonScriptPath} ${backgroundImg} ${templateImg}`;

    if (options.confidence) {
        cmd += ` -c ${options.confidence}`;
    }
    if (options.scaleSteps) {
        cmd += ` -s ${options.scaleSteps.join(",")}`;
    }
    if (options.output) {
        cmd += ` -o ${options.output}`;
    }

    console.log("cmd", cmd);

    return new Promise<MatchRegion | null>((resolve, reject) => {
        exec(cmd, (err: any, stdout: any, __: any) => {
            if (err) {
                console.log(err);
                reject(err);
            }
            try {
                const matchRegion = JSON.parse(stdout);
                resolve(matchRegion);
            } catch (err) {
                resolve(null);
            }
        });
    });
}
