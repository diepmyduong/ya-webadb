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
        output?: string;
    } = {},
) {
    let cmd = `python3 scripts/template-matcher.py ${backgroundImg} ${templateImg}`;

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
        exec(cmd, (err: any, stdout: any, stderr: any) => {
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
