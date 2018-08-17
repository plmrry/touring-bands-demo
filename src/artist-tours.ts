
const readline = require("readline");
const _ = require("underscore");
const d3 = require("d3");
const geolib = require("geolib");

const ON_TOUR_DAYS_BETWEEN = 7;
const MAX_SPEED = 1000;
const MAX_DAYS_OLD = 365;
const TODAY: any = new Date();


readline.createInterface({
  input: process.stdin,
  output: null
}).on("line", line => {
  const obj = JSON.parse(line);
  const { artist_id } = obj;

  const events = obj.events
    .map(e => {
      e._date = new Date(e.start.date);
      return e;
    })
    .filter(e => {
      const days_old = (TODAY - e._date) / 1000 / 60 / 60 / 24;
      return days_old < MAX_DAYS_OLD;
    })
    .filter(e => e.location.lat && e.location.lng);

  events.sort((a, b) => a._date - b._date);

  let current_tour: any = {
    artist_id,
    artist_tour_index: 0,
    events: [],
    tour_id: `${artist_id}-0`,
    days: 0,
    distance_km: 0,
    lng_extent: [],
    lat_extent: []
  };
  const tours = [current_tour];
  events.forEach((event, index) => {
    if (index === 0) {
      current_tour.events.push(event);
    }
    else {
      const last_event = _.last(current_tour.events);
      const days_between = d3.timeDay.count(last_event._date, event._date);
      const distance_meters = geolib.getDistance(
        { latitude: last_event.location.lat, longitude: last_event.location.lng },
        { latitude: event.location.lat, longitude: event.location.lng }
      );
      const distance_km = distance_meters / 1e3;
      const speed = distance_km / days_between;
      if (days_between <= ON_TOUR_DAYS_BETWEEN && !isNaN(speed) && speed > 0 && speed < MAX_SPEED && distance_km < MAX_SPEED) {
        // console.error(distance_km);
        current_tour.distance_km += distance_km;
        current_tour.days += days_between;
        current_tour.lat_extent = d3.extent(current_tour.events, e => e.location.lat);
        current_tour.lng_extent = d3.extent(current_tour.events, e => e.location.lng);
        current_tour.events.push(event);
      }
      else {
        const next_index = current_tour.artist_tour_index + 1;
        current_tour = {
          artist_id: artist_id,
          artist_tour_index: next_index,
          events: [event],
          tour_id: `${artist_id}-${next_index}`,
          days: 0,
          distance_km: 0,
          lng_extent: [],
          lat_extent: []
        };
        tours.push(current_tour);
      }
    }
  });
  console.log(JSON.stringify(tours));
    // .forEach(p => console.dir(p, { colors: true }));
  // console.dir(performances);
  // const artist_id = JSON.parse(line).artist_id;
  // const url = gigographyUrl(artist_id);
  // getAllPages(url)
  //   .map(page => {
  //     return {
  //       artist_id,
  //       page: page.resultsPage.page,
  //       events: page.resultsPage.results.event
  //     };
  //   })
  //   .map(JSON.stringify)
  //   .addListener({
  //     next: page => console.log(page)
  //   });
});
