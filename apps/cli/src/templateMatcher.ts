import { exec } from "child_process";

export type MatchRegion = {
    tx: number;
    ty: number;
    bx: number;
    by: number;
    confidence: string;
    scale: string;
};

export function templateMatcher(
    backgroundImg: string,
    templateImg: string,
    options: {
        confidence?: number;
        scaleSteps?: number[];
    } = {},
) {
    const cmd = `python3 scripts/template-matcher.py ${backgroundImg} ${templateImg}`;

    if (options.confidence) {
        cmd.concat(` -c ${options.confidence}`);
    }
    if (options.scaleSteps) {
        cmd.concat(` -s ${options.scaleSteps.join(",")}`);
    }

    return new Promise<MatchRegion>((resolve, reject) => {
        exec(cmd, (err: any, stdout: any, stderr: any) => {
            if (err) {
                console.log(err);
                reject(err);
            }
            console.log("stdout", stdout);
            const matchRegion = JSON.parse(stdout);
            resolve(matchRegion);
        });
    });
}
