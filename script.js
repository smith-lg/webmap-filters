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
    });


map.on('load', () => {

    map.addSource('my-data', {
        type: 'geojson',
        data: exampledata,
    });

    map.addLayer({
        'id': 'air-pts',
        'type': 'circle',
        'source': 'my-data',
        'paint': {
            'circle-radius': 4,
            'circle-color': '#ffea00'
        },
        'filter': ['==', ['get', 'air'], 'true']
    });

    map.addLayer({
        'id': 'sound-pts',
        'type': 'circle',
        'source': 'my-data',
        'paint': {
            'circle-radius': 6,
            'circle-color': '#7300e6'
        },
        'filter': ['==', ['get', 'sound'], 'true'],
    }, 'air-pts');

    //Alt option to add as single layer and set paint properties based on fields using case expression
    //See commented code line 176 for this approach (untested!)

});


/*--------------------------------------------------------------------
FILTERS
--------------------------------------------------------------------*/

//Store all checkbox objects in map as variable
const checkboxes = document.querySelectorAll('input[type="checkbox"]');

let values = [];
let years = [];
let seasons = [];
let events = [];

//For each checkbox object, extract id and create event listener for each time a checkbox is checked or unchecked
checkboxes.forEach((checkbox) => {

    //Initially add all checkbox id values to values array (as opening map has all checkboxes selected)
    values.push(checkbox.id)

    checkbox.addEventListener('change', (e) => {
        //Each time a user checks or unchecks any checkbox, the id of the checkbox will be added or removed 
        if (checkbox.checked) {
            values.push(checkbox.id)
        } else {
            values = values.filter(value => value !== checkbox.id); //remove checkbox id from values array if not checked
        };
        console.log(values)



        //YEARS
        //Based on selected years return corresponding field name and use to build query using OR logic
        //In mapbox expressions OR is represented by 'any' keyword (see https://docs.mapbox.com/mapbox-gl-js/style-spec/expressions/#any)
        years = values.map(value => {
            if (value === 'yr_2023') {
                return 2023; //matches attribute value in 'year' field
            } else if (value === 'yr_2022') {
                return 2022;
            } else if (value === 'yr_2021') {
                return 2021;
            } else {
                return undefined;
            }
        }).filter(value => value !== undefined);

        //Create filter using 'any' keyword (equivalent of OR logic)
        //use Array.map() method to select each yr value from years array and concatenate w/ ['any']
        let yearfilter = ['any'].concat(years.map(yr => ['==', ['get', 'year'], yr])); //'year' represents field name and yr represents the value (e.g., 2023) based on selected checkbox



        //SEASONS
        seasons = values.map(value => {
            if (value === 'season_su') {
                return 'Summer';
            } else if (value === 'season_wi') {
                return 'Winter';
            } else {
                return undefined;
            }
        }).filter(value => value !== undefined);

        let seasonfilter = ['any'].concat(seasons.map(ssn => ['==', ['get', 'season'], ssn]));



        //EVENTS
        events = values.map(value => {
            if (value === 'polln_air') {
                return 'air'; //matches field name in example data
            } else if (value === 'polln_sound') {
                return 'sound';
            } else {
                return undefined;
            }
        }).filter(value => value !== undefined); //remove all other values from array


        //*IF data are presented as separate layers (e.g., multiple .addLayer events), loop through event names and set a new filter for each
        events.forEach((event) => {

            let eventfilter = ['==', ['get', event], 'true'] //event type filter e.g., ['get', 'air'], true

            //FULL FILTER inc selected years, season, event type
            let filter = ['all', yearfilter, seasonfilter, eventfilter]

            //Use mapbox setfiler method to show only points that match filter
            let layername = `${event}-pts`; //Use temperate literal to create string that matches layer id e.g., air-pts
            map.setFilter(layername, filter);

        })


        // //*IF data are presented as single layer, create single filter
        // let eventfilter = ['any'].concat(events.map(event => ['==', ['get', event], true]));
        // let filter = ['all', yearfilter, seasonfilter, eventfilter]

        // map.setFilter('my-pts', filter);

    });




});



//Quick code to change visibility of data layers while retaining filters (could be more streamlined and integrated above)
document.getElementById('polln_air').addEventListener('change', (e) => {
    map.setLayoutProperty( 
        'air-pts',
        'visibility',
        e.target.checked ? 'visible' : 'none'
    );
});

document.getElementById('polln_sound').addEventListener('change', (e) => {
    map.setLayoutProperty( 
        'sound-pts',
        'visibility',
        e.target.checked ? 'visible' : 'none'
    );
});



/*--------------------------------------------------------------------
TEST
--------------------------------------------------------------------*/

//Quick pop-up code to check points on map reflect selected filters
map.on('click', ['air-pts', 'sound-pts'], (e) => {
    const features = map.queryRenderedFeatures(e.point, {layers: ['air-pts', 'sound-pts']});

    const description = features.map((feature => {
        return "<b>Location:</b> " + feature.properties.location + "<br>" +
            "<b>Year:</b> " + feature.properties.year + "<br>" +
            "<b>Season:</b> " + feature.properties.season + "<br>" +
            "<b>Air:</b> " + feature.properties.air + "<br>" +
            "<b>Sound:</b> " + feature.properties.sound + "<br>" + "<br>" ;
    })).join("");

    new mapboxgl.Popup()
        .setLngLat(e.lngLat) 
        .setHTML(description)
        .addTo(map);
});