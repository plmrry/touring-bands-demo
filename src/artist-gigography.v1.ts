const colors = require("colors/safe");
const debug = require("debug")("metro-area-events");
const readline = require("readline");

import { getAllPages, getPage } from "./getAllPages";

let count = 0;

const MAX_DAYS_OLD = 365;
const TODAY: any = new Date();

readline.createInterface({
  input: process.stdin,
  output: null
}).on("line", line => {
  const artist_id = JSON.parse(line).artist_id;
  const url = gigographyUrl(artist_id);
  getAllPages(url)
    .map(p => p.resultsPage.results.event)
    .map(events => {
      return events.filter(e => {
        e._date = new Date(e.start.date);
        const days_old = (TODAY - e._date) / 1000 / 60 / 60 / 24;
        return days_old < MAX_DAYS_OLD;
      });
    })
    .fold((prev, events) => prev.concat(events), [])
    .last()
    .map(events => {
      return {
        artist_id,
        events
      };
    })
    .map(JSON.stringify)
    .addListener({
      next: obj => console.log(obj)
    });
});

//
// process.stdin.on("data", data => {
//   console.log(data.toString());
// });

const songkick_api_prefix = `http://api.songkick.com/api/3.0/`;

function gigographyUrl(id) {
  return `${songkick_api_prefix}artists/${id}/gigography.json?apikey=${process.env.SONGKICK_API_KEY}`;
}
