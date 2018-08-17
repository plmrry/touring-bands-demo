import {
  default as xs,
  Stream
} from "xstream";

import flattenSequentially from "xstream/extra/flattenSequentially";
import flattenConcurrently from "xstream/extra/flattenConcurrently";
import delay from "xstream/extra/delay";
import * as request from "request";

const colors = require("colors/safe");
const debug = require("debug")("scrape");

export function getAllPages(url): Stream<any> {
  return xs.create({
    start: listener => _getAllPages(url, 1, listener),
    stop: () => {}
  });
}

function _getAllPages(url, page_num: number = 1, listener) {
  getPage(url, page_num)
    .debug((d) => debug('GOT PAGE', d))
    .addListener({
      next: page => {
        if (typeof(page.resultsPage.results.event) !== "undefined") {
          listener.next(page);
          _getAllPages(url, page_num + 1, listener);
        } else {
          listener.complete();
        }
      }
    });
}

export function getPage(uri, page) {
  return requestJson$(`${uri}&page=${page}`);
}

function requestJson$(url) {
  return request$(url)
    .map(data => JSON.parse(data.body));
}

export function request$(url): Stream<any> {
  debug("GET", url);
  return xs.create({
    start: listener => request(url, (err, data: any) => {
      if (err) listener.error(err);
      else {
        listener.next(data);
        listener.complete();
      }
    }),
    stop: () => {}
  });
}
