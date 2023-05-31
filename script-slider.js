/*--------------------------------------------------------------------
INITIALIZE MAP
--------------------------------------------------------------------*/
mapboxgl.accessToken = 'pk.eyJ1IjoibGdzbWl0aCIsImEiOiJja29uNGs1cmYwYnN2MnBwMzM2cDQyN2NrIn0.lZvjUUK8Pc2JDq0tuSRrKQ';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [-79.7, 44.3],
    zoom: 6
});


/*--------------------------------------------------------------------
MAP CONTROLS
--------------------------------------------------------------------*/
map.addControl(new mapboxgl.NavigationControl());
map.addControl(new mapboxgl.FullscreenControl());

const geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl,
    countries: "ca"
});

document.getElementById('geocoder').appendChild(geocoder.onAdd(map));

document.getElementById('returnbutton').addEventListener('click', () => {
    map.flyTo({
        center: [-79.7, 44.3],
        zoom: 6,
        essential: true
    });
});


/*--------------------------------------------------------------------
ACCESS AND VISUALIZE DATA
--------------------------------------------------------------------*/
let exampledata;

fetch('https://raw.githubusercontent.com/smith-lg/webmap-filters/main/dummydata.geojson')
    .then(response => response.json())
    .then(response => {
        exampledata = response;


        //Convert date values stored as 'dd/mm/yyyy' to numeric timestamps for use in mapbox expressions
        exampledata.features.forEach(feature => {
            const dateString = feature.properties.date; // Access 'date' property in exampledata
            const [day, month, year] = dateString.split('/'); // Parse the date string to obtain day, month, and year values
            const date = new Date(`${month}/${day}/${year}`); // Create a new Date object using parsed values

            feature.properties.date = date.getTime(); // Update the date field with the numeric timestamp

        });
    });

//Initialize timeslider and value range before map load
const slider = document.getElementById('time-range-slider');
const sliderValues = document.getElementById('slider-values');

const startDate = new Date('2020-01-01');
const endDate = new Date('2023-12-31');

const startValue = startDate.getTime();
const endValue = endDate.getTime();

noUiSlider.create(slider, {
    start: [startValue, endValue],
    connect: true,
    range: {
        'min': startValue,
        'max': endValue
    }
});



map.on('load', () => {

    map.addSource('my-data', {
        type: 'geojson',
        data: exampledata,
    });

    map.addLayer({
        'id': 'my-pnts',
        'type': 'circle',
        'source': 'my-data',
        'paint': {
            'circle-radius': 4,
            'circle-color': '#0d6efd'
        }
    });

    //Add timeslider event handler to map load event to ensure map style finsihes loading before
    slider.noUiSlider.on('update', (values) => {
        let lowerValue = new Date(parseInt(values[0]));
        let upperValue = new Date(parseInt(values[1]));

        sliderValues.innerHTML = `From: ${lowerValue.toLocaleDateString()}<br>To: ${upperValue.toLocaleDateString()}`;

        let lowerValueStamp = lowerValue.getTime(); // Convert date to numeric timestamp for use in expression
        let upperValueStamp = upperValue.getTime();

        // Show data points within timeslider range
        map.setFilter('my-pnts', ['all', ['>=', ['get', 'date'], lowerValueStamp], ['<=', ['get', 'date'], upperValueStamp]]);
    });
});


/*--------------------------------------------------------------------
TEST
--------------------------------------------------------------------*/

//Quick pop-up code to check points on map reflect selected value range
//Note: In dummy data, multiple points exist in same location to represent records at different time points
map.on('click', (e) => {
    let features = map.queryRenderedFeatures(e.point, { layers: ['my-pnts'] });
  
    let description = '';
  
    //For each point under mouse click, list the date (converted from numeric string to date format)
    features.forEach(feature => {
      description += `<p>${new Date(feature.properties.date).toLocaleDateString()}</p>`;
    });
  
    new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML(description)
      .addTo(map);
  });