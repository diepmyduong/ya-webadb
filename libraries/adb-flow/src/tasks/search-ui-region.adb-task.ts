import type { Adb } from "@yume-chan/adb";
import cheerio from "cheerio";
import fs, { unlink } from "fs/promises";

import type { IAdbTaskProvider } from "../type.js";
import { DumpUITask, type DumpUIParams } from "./dump-ui.adb-task.js";
import type { SwipeOnNotFoundOptions } from "./search-template-region.adb-task.js";
import { SwipeTask } from "./swipe.adb-task.js";
import { TapTask } from "./tap.adb-task.js";

export type TapBoundsOptions = {
    center?: boolean; // default: false, tap center of bounds
    offset?: [number, number]; // default: [0, 0], tap offset of bounds
};

export type SearchUIRegionParams = {
    query: string;
    debug?: boolean;
    tap?: TapBoundsOptions;
} & DumpUIParams &
    SwipeOnNotFoundOptions;

export class SearchUIRegion implements IAdbTaskProvider<SearchUIRegionParams> {
    name = "search-ui-region";

    dumpUITask = new DumpUITask();
    swipeTask = new SwipeTask();
    tapTask = new TapTask();

    async execute(
        params: SearchUIRegionParams,
        adb: Adb,
        context: any,
    ): Promise<any> {
        const {
            query,
            swipeOnNotFound = false,
            swipeDirection = "up",
            swipeSteps = [500, 500],
            debug = false,
            tap,
            ...dumpUIParams
        } = params;

        const searchUIBounds = async () => {
            const { xml } = await this.dumpUITask.execute(
                dumpUIParams,
                adb,
                context,
            );

            // read xml file
            const xmlData = await fs.readFile(xml, "utf-8");

            if (debug === false) {
                await unlink(xml); // delete xml file
            }
            const $ = cheerio.load(xmlData, {
                xmlMode: true,
            });

            const boundsValue = $(query).attr("bounds");
            return boundsValue;
        };

        let boundsValue = await searchUIBounds();

        if (!boundsValue && swipeOnNotFound) {
            for (const step of swipeSteps) {
                await this.swipeTask.execute(
                    { action: swipeDirection, distance: step },
                    adb,
                    context,
                );
                boundsValue = await searchUIBounds();
                if (boundsValue) {
                    break;
                }
            }

            if (!boundsValue) {
                throw new Error(`not found element: ${query}`);
            }
        } else if (!boundsValue) {
            throw new Error(`not found element: ${query}`);
        }

        // parse bounds [x1, y1][x2, y2]
        const [x1, y1, x2, y2] = boundsValue.match(/(\d+)/g)!;

        if (tap) {
            const { center, offset } = tap;
            if (center) {
                await this.tapTask.execute(
                    {
                        point: [
                            (Number(x1) + Number(x2)) / 2,
                            (Number(y1) + Number(y2)) / 2,
                        ],
                    },
                    adb,
                    context,
                );
            } else if (offset) {
                await this.tapTask.execute(
                    {
                        point: [Number(x1) + offset[0], Number(y1) + offset[1]],
                    },
                    adb,
                    context,
                );
            }
        }

        return {
            bounds: [
                [Number(x1), Number(y1)],
                [Number(x2), Number(y2)],
            ],
            center: [
                (Number(x1) + Number(x2)) / 2,
                (Number(y1) + Number(y2)) / 2,
            ],
        };
    }
}

export default SearchUIRegion;
