import xs from "xstream";
const readline = require("readline");


export default function line$() {
  function start(listener) {
    readline
      .createInterface({
        input: process.stdin
      })
      .on("line", l => listener.next(l))
      .on("close", l => listener.complete());
  }
  return xs.create({
    start,
    stop: () => {}
  });
}
