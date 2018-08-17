const colors = require("colors/safe");
const debug = require("debug")("metro-area-events");
const readline = require("readline");

import xs from "xstream";
import flattenSequentially from "xstream/extra/flattenSequentially";
import flattenConcurrently from "xstream/extra/flattenConcurrently";
import delay from "xstream/extra/delay";

import { getAllPages, getPage } from "./getAllPages";
import line$ from "./lineStream";
import flattenParallel from "./flattenParallel";

let count = 0;

const MAX_DAYS_OLD = 365;
const MIN_DATE = "2016-01-01";
const TODAY: any = new Date();

line$()
  .map(JSON.parse)
  .compose(input$ => {
    return xs.create({
      start: out => {
        let queue = []
        let open = true
        function onNext(item) {
          if (!item) return; // Queue is empty
          if (!open) { // Gate is closed
            queue.push(item)
          } else { // Gate is open
            // console.error('CLOSE GATE')
            open = false;
            // console.error('ITEM', item);
            out.next(item);
            setTimeout(() => {
              open = true;
              if (queue.length > 0) onNext(queue.shift())
            }, 100)
          }
        }
        input$.addListener({
          next: onNext
        })
      },
      stop: () => {}
    })
  })
  .map((d: any) => {
    const { artist_id } = d;
    const url = gigographyUrl(artist_id, MIN_DATE);
    return xs.of(url)
      .debug(() => debug(colors.red(`Artist: ${++count}`)))
      .map(getAllPages)
      .compose(flattenConcurrently)
      .map(p => p.resultsPage.results.event)
      .fold((prev, events) => prev.concat(events), [])
      .last()
      .map(events => {
        return {
          artist_id,
          events
        };
      });
  })
  .compose(flattenParallel(2))
  .map(JSON.stringify)
  .addListener({
    next: d => console.log(d)
  });

const songkick_api_prefix = `http://api.songkick.com/api/3.0/`;

function gigographyUrl(id, min_date) {
  return `${songkick_api_prefix}artists/${id}/gigography.json?apikey=${process.env.SONGKICK_API_KEY}&min_date=${min_date}`;
}
