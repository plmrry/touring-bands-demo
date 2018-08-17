import toursPath from "./output/tours-with-polylines.ndjson";
import mapData from "./map/us.json";

d3.select("body")
  .append("div")
  .append("button")
  .attr("id", "animate")
  .text("Play All")
  .on("click", animate);

const START_DATE = new Date("2016-09-01");

d3.select("body")
  .append("div")
  .append("button")
  .text("Play in Order")
  .on("click", playInOrder);

const loading = d3
  .select("body")
  .append("h2")
  .text("Loading...");

function playInOrder() {
  d3.selectAll(".tour-path path").attr("stroke-dasharray", function(d) {
    return `0,${this._length}`;
  });

  const i = d3.interpolate(START_DATE, new Date("2016-12-31"));

  d3.transition()
    .ease(d3.easeLinear)
    .duration(20e3)
    .tween("time", function() {
      return function(t) {
        const date = i(t);

        d3.selectAll(".tour-path path").attr("stroke-dasharray", function(d) {
          // const size = 100;
          const pos = this._length * this.timescale(date);
          return `${pos},${this._length}`;
        });

        d3.selectAll(".event").style("opacity", function(d) {
          return date - this._date > 0 ? 0.6 : 0;
        });
      };
    });
}

function animate() {
  d3.selectAll(".tour-path path")
    // .attr("stroke-dasharray", "0, 1")
    .transition()
    .ease(d3.easeLinear)
    .duration(7e3)
    .attrTween("stroke-dasharray", tweenDash);
}

function tweenDash() {
  var l = this.getTotalLength(),
    // i = d3.interpolateString("0," + l, l + "," + l);
    i = d3.interpolateString(`0,${l}`, `${l},${l}`);

  return function(t) {
    return i(t);
  };
}

const [width, height] = [900, 900];

const exclude = [
  "Alaska",
  "Hawaii",
  "Puerto Rico",
  "United States Virgin Islands",
  "Commonwealth of the Northern Mariana Islands",
  "Guam",
  "American Samoa"
];

const decoder = new TextDecoder();

let buffer = "";

console.log("start");

d3.text(toursPath, data => {
  const rows = data.split("\n");

  const tours = rows
    .filter(r => r.length)
    .map(r => JSON.parse(r))
    // .filter((d, i) => i < 100)
    .filter(d => {
      const first_event = d.events[0];
      return new Date(first_event._date) - START_DATE > 0;
      // const last_event = d.events[d.events.length - 1];
      // return (new Date(last_event._date) - START_DATE > 60);
    })
    .filter((d, i) => i < 10);

  console.log("tours", tours.length);

  console.log("map");

  const feature = {
    type: "FeatureCollection",
    features: mapData.features.filter(
      f => exclude.indexOf(f.properties.NAME) === -1
    )
  };

  const projection = d3
    .geoConicConformal()
    .parallels([33, 45])
    .rotate([96, -39])
    .fitSize([width, height], feature);

  var path = d3.geoPath().projection(projection);

  loading.remove();
  render(tours, feature.features, path, projection);

});

function render(tours, features, path, projection) {
  const svg = d3
    .select("body")
    .selectAll(".tour-map")
    .data([tours])
    .enter()
    .append("div")
    .style("display", "inline-block")
    .append("svg")
    .classed("tour-map", true)
    .attr("width", width)
    .attr("height", height);

  svg
    .append("g")
    .classed("states", true)
    .selectAll(".state")
    .data(features)
    .enter()
    .append("path")
    .classed("state", true)
    .attr("d", path);

  const tourLine = d3.line();

  const tour = svg
    .selectAll(".tour")
    .data(d => d)
    .enter()
    .append("g")
    .each(function(d) {
      const { artist_id, events } = d;
      console.log(artist_id);
      console.log(
        events[0].performance
          .map(p => p.artist)
          .filter(a => a.id === artist_id)[0].displayName
      );
    })
    .classed("tour", true);

  tour
    .append("g")
    .classed("tour-path", true)
    .append("path")
    .property("timescale", function(d) {
      const first_date = d.polylines[0].from_date;
      const domain = [first_date]
        .concat(d.polylines.map(d => d.to_date))
        .map(d => new Date(d));
      const range = [0].concat(d.polylines.map(d => d.relative_distance));
      const timeScale = d3
        .scaleTime()
        .domain(domain)
        .range(range)
        .clamp(true);

      return timeScale;
    })
    .attr("d", function(d) {
      return tourLine(d.polyline.map(c => projection([c[1], c[0]])));
    })
    .property("_length", function() {
      return this.getTotalLength();
    })
    .attr("stroke-dasharray", function(d) {
      return `0,${this._length}`;
    });

  tour
    .selectAll(".event")
    .data(d => d.events)
    .enter()
    .append("g")
    .classed("event", true)
    .property("_date", d => new Date(d._date))
    .attr("transform", d => {
      const [x, y] = projection([d.location.lng, d.location.lat]);
      return `translate(${x}, ${y})`;
    })
    .append("circle")
    .attr("r", 1)
    .style("fill", "#444");
}
