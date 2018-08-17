
import xs from "xstream";
import flattenSequentially from "xstream/extra/flattenSequentially";
import delay from "xstream/extra/delay";

import { request$ } from "./getAllPages";
import line$ from "./lineStream";

const readline = require("readline");
const _ = require("underscore");
const d3 = require("d3");
const geolib = require("geolib");
const request = require("request");
const polyline = require("@mapbox/polyline");
const debug = require("debug")("polylines");

line$()
  .map(JSON.parse)
  .map(tour => {
    const requests: any[] = tour.events
      .map(e => {
        const l = e.location;
        e._latlng = `${l.lat},${l.lng}`;
        return e;
      })
      .reduce((prev, curr, index, array) => {
        if (index === 0) return [];
        return prev.concat({
          from: array[index - 1],
          to: curr
        });
      }, [])
      .map(req => {
        return {
          from_date: req.from._date,
          to_date: req.to._date,
          url: mapsRequest(req.from._latlng, req.to._latlng)
        };
      });
    return xs.fromArray(requests)
      .map(obj => {
        return xs.of(obj.url)
          .compose(delay(500))
          .map(url => request$(url))
          .compose(flattenSequentially)
          .map(data => JSON.parse(data.body))
          .map(body => {
            const distance = body.routes[0].legs[0].distance.value;
            const line = body.routes[0].overview_polyline.points;
            const decoded = polyline.decode(line);
          // })
          // .map(line => polyline.decode(line))
          // .map(polyline => {
            obj.distance = distance;
            obj.polyline = decoded;
            return obj;
          });
      })
      .compose(flattenSequentially)
      .fold((p, c) => p.concat(c), [])
      .last()
      .map(polylines => {
        const total_distance = polylines.reduce((p, c) => p + c.distance, 0);

        polylines.forEach((p, index, array) => {
          if (index === 0) p.cumulative_distance = p.distance;
          else {
            p.cumulative_distance = array[index - 1].cumulative_distance + p.distance;
          };
        });

        polylines.forEach(p => p.relative_distance = p.cumulative_distance / total_distance);

        tour.polylines = polylines;
        tour.polyline = polylines.reduce((p, c) => p.concat(c.polyline), []);
        return tour;
      });
  })
  .compose(flattenSequentially)
  // .debug()
  .addListener({
    next: obj => {
      debug("got one");
      // console.log(obj.polylines[0]);
      console.log(JSON.stringify(obj));
    }
  });

// readline$()
//   // .map(line => xs.of(line).compose(delay(1000)))
//   // .compose(flattenSequentially)
//   .map((line: any) => {
//     const obj = JSON.parse(line);
//     const requests = obj.events
//       .map(e => {
//         const l = e.location;
//         e._latlng = `${l.lat},${l.lng}`;
//         return e;
//       })
//       .reduce((prev, curr, index, array) => {
//         if (index === 0) return [];
//         return prev.concat({
//           from: array[index - 1]._latlng,
//           to: curr._latlng
//         });
//       }, [])
//       .map(req => mapsRequest(req.from, req.to));
//     // console.log(requests);
//     return xs.fromArray(requests)
//       .map(req => xs.of(req).compose(delay(500)))
//       .compose(flattenSequentially)
//       .map(req => request$(req))
//       .compose(flattenSequentially)
//       .map(data => JSON.parse(data.body))
//       .map(body => body.routes[0].overview_polyline.points)
//       .map(line => polyline.decode(line))
//       .fold((p, c) => p.concat(c), [])
//       .last()
//       .map(polyline => {
//         obj.polyline = polyline;
//         return obj;
//       });
//   })
//   .compose(flattenSequentially)
//   .addListener({
//     next: obj => {
//       debug("got one");
//       console.log(JSON.stringify(obj));
//     }
//   });

// readline.createInterface({
//   input: process.stdin,
//   output: null
// }).on("line", line => {
//   const obj = JSON.parse(line);
//   const locations = obj.events
//     .map(e => e.location)
//     .map(l => `${l.lat},${l.lng}`);
//   const requests = locations
//     .reduce((prev, curr, index, array) => {
//       if (index === 0) return [];
//       return prev.concat({
//         from: array[index - 1],
//         to: curr
//       });
//     }, [])
//     .map(req => mapsRequest(req.from, req.to));
//   xs.fromArray(requests)
//     .map(req => xs.periodic(500).take(1).mapTo(req))
//     .compose(flattenSequentially)
//     .map(req => request$(req))
//     .compose(flattenSequentially)
//     .map(data => JSON.parse(data.body))
//     .map(body => body.routes[0].overview_polyline.points)
//     .map(line => polyline.decode(line))
//     .fold((p, c) => p.concat(c), [])
//     .last()
//     .addListener({
//       next: polyline => {
//         obj.polyline = polyline;
//         console.log(JSON.stringify(obj));
//       }
//     });
// });

function readline$() {
  return xs.create({
    start: listener => {
      readline
        .createInterface({
          input: process.stdin,
          output: null
        })
        .on("line", line => {
          listener.next(line);
        })
        .on("close", () => {
          listener.complete();
        });
    },
    stop: () => {}
  });
}

function mapsRequest(from, to) {
  return `https://maps.googleapis.com/maps/api/directions/json?origin=${from}&destination=${to}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
}
