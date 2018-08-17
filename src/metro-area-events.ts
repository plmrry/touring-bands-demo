import {
  default as xs,
  Stream
} from "xstream";
import flattenConcurrently from "xstream/extra/flattenConcurrently";

const colors = require("colors/safe");
const debug = require("debug")("metro-area-events");

import { getAllPages, getPage } from "./getAllPages";

process.stdin.on("data", data => {
  const metro_area_id = data.toString().replace("\n", "");
  const url = metroAreaUrl(metro_area_id);
  getAllPages(url)
    .debug(p => debug(`Got page ${colors.red(p.resultsPage.page)}`))
    .map(JSON.stringify)
    .addListener({
      next: line => console.log(line)
    });
});

const songkick_api_prefix = `http://api.songkick.com/api/3.0/`;

function metroAreaUrl(id) {
  return `${songkick_api_prefix}metro_areas/${id}/calendar.json?apikey=${process.env.SONGKICK_API_KEY}`;
}
