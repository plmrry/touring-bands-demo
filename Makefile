NEW_YORK=7644

# export SONGKICK_API_KEY=6ny....
# export GOOGLE_MAPS_API_KEY=AIza....
export DEBUG=*

polylines: output/tours.ndjson
	cat output/tours.ndjson \
	  | node_modules/.bin/ts-node src/get-polylines.ts \
		> output/tours-with-polylines.ndjson

tours: output/nyc-artists.ndjson
	cat $< \
	  | node_modules/.bin/ts-node src/artist-gigography.ts \
	  | node_modules/.bin/ts-node src/artist-tours.ts \
	  | node_modules/.bin/ndjson-split \
	  | node_modules/.bin/ndjson-map 'd.num_events = d.events.length, d' \
	  | node_modules/.bin/ndjson-map 'd.avg_speed = d.distance_km / d.days, d' \
	  | node_modules/.bin/ndjson-map 'd.min_lng = d.lng_extent[0], d.max_lng = d.lng_extent[1], d' \
	  | node_modules/.bin/ndjson-filter 'd.max_lng < -60' \
	  | node_modules/.bin/ndjson-filter 'd.num_events > 10 && d.avg_speed > 0 && d.avg_speed < 1000' \
	  > output/tours-`node -e 'console.log(Date.now())'`.ndjson

output/nyc-artists.ndjson: output/nyc-events.ndjson
	cat $< \
		| node_modules/.bin/ndjson-map 'd.resultsPage.results.event' \
		| node_modules/.bin/ndjson-split \
		| node_modules/.bin/ndjson-map 'd.performance' \
		| node_modules/.bin/ndjson-split \
		| node_modules/.bin/ndjson-map '{ artist_id: d.artist.id }' \
		| node_modules/.bin/ndjson-reduce \
		| node_modules/.bin/ndjson-map --require u=underscore 'u.uniq(d, false, e => e.artist_id)' \
		| node_modules/.bin/ndjson-split \
		> $@

output/nyc-events.ndjson:
	echo $(NEW_YORK) \
		| node_modules/.bin/ts-node src/metro-area-events.ts > $@

clean:
	rm -rf output
	rm -rf map
	mkdir output
	mkdir map

map: map/us.json

map/us.json: map/cb_2015_us_state_5m.shp
	node_modules/.bin/shp2json $< -o $@

map/cb_2015_us_state_5m.shp: map/cb_2015_us_state_5m.zip
	unzip -d ./map -o \
    $< \
    cb_2015_us_state_5m.shp \
    cb_2015_us_state_5m.dbf

map/cb_2015_us_state_5m.zip:
	mkdir -p map
	curl -o $@ http://www2.census.gov/geo/tiger/GENZ2015/shp/cb_2015_us_state_5m.zip
