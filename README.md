An animated map of bands on tour.

Given a musician, the Songkick API can supply that artist's history of performances, 
or "gigography." 

Here, gigographies for an arbitrary sample of artists are scraped from the
Songkick API. They are then filtered for artists who seem to be "on tour" -- meaning
they performed at a series of events in different cities -- and who
also seem to be driving (based on how fast they travel).

The events in these gigographies are tied to venues with geographic coordinates. 
These lists of coordinates are passed into the Google directions API, which returns
a polyline.

So, these maps show where an artist _may_ have driven as they were on tour through the country.