import type { Adb } from "@yume-chan/adb";
import { existsSync, mkdirSync, unlinkSync } from "fs";
import { makeScreenshot } from "../common.js";
import { templateMatcher } from "../templateMatcher.js";
import type { ITaskProvider } from "../type.js";
import { SwipeTask } from "./swipe.js";

export type SwipeOnNotFoundOptions = {
    swipeOnNotFound?: boolean; // default: false, if true, swipe screen and search again
    swipeDirection?: "up" | "down" | "left" | "right"; // default: "up"
    swipeSteps?: number[]; // swipe distance for each step, default: [100, 100]
};

export type SearchTemplateRegionParams = {
    templatePath: string;
    confidence?: number; // default: 0.7, threshold for match
    scaleSteps?: number[]; // default: [1, 0.9, 0.8, 0.7, 0.6, 0.5], scale template image to search
} & SwipeOnNotFoundOptions;

export class SearchTemplateRegionTask implements ITaskProvider {
    name = "search-template-region";

    swipeTask = new SwipeTask();

    async execute(
        params: SearchTemplateRegionParams,
        adb: Adb,
        context: any,
    ): Promise<any> {
        const {
            templatePath,
            confidence = 0.7,
            scaleSteps = [1, 0.9, 0.8, 0.7, 0.6, 0.5],
            swipeOnNotFound = false,
            swipeDirection = "up",
            swipeSteps = [100, 100],
        } = params;

        // verify templatePath
        if (existsSync(templatePath) === false) {
            throw new Error(`templatePath: ${templatePath} not exists`);
        }

        const matchRegion = await this.searchTemplateRegion(
            adb,
            templatePath,
            confidence,
            scaleSteps,
        );

        if (!matchRegion && swipeOnNotFound) {
            for (const step of swipeSteps) {
                await this.swipeTask.execute(
                    { action: swipeDirection, distance: step },
                    adb,
                    context,
                );
                const matchRegion = await this.searchTemplateRegion(
                    adb,
                    templatePath,
                    confidence,
                    scaleSteps,
                );
                if (matchRegion) {
                    return matchRegion;
                }
            }
            return null;
        } else {
            return matchRegion;
        }
    }

    private async searchTemplateRegion(
        adb: Adb,
        templatePath: string,
        confidence: number,
        scaleSteps: number[],
    ) {
        mkdirSync("tmp", { recursive: true });
        const screenshotPath = `tmp/screenshot-${new Date().getTime()}.png`;
        await makeScreenshot(adb, screenshotPath);

        // find region of image
        const matchRegion = await templateMatcher(
            screenshotPath,
            templatePath,
            {
                confidence: confidence,
                scaleSteps: scaleSteps,
                output: "output.png",
            },
        );
        unlinkSync(screenshotPath);
        if (!matchRegion) {
            return null;
        }
        const { tx, ty, bx, by } = matchRegion;
        return {
            ...matchRegion,
            center: [(tx + bx) / 2, (ty + by) / 2],
        };
    }
}
