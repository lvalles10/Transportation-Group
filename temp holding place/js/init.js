const map = L.map('map').setView([34.063634, -118.295405], 13);
//changed zoom

const url = "https://spreadsheets.google.com/feeds/list/1SuwSP45miCu_YN4_dKbZb1NAtOMC-P-Jv-iMCCrdZSE/od6/public/values?alt=json";

let scroller = scrollama();

let Esri_WorldGrayCanvas = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
	maxZoom: 16
});

Esri_WorldGrayCanvas.addTo(map)

fetch(url)
	.then(response => {
		return response.json();
		})
    .then(data =>{
                // console.log(data)
                formatData(data)
        }
)

let KTownResident = L.featureGroup();
let NotKTownResident = L.featureGroup();

let exampleOptions = {
    radius: 10,
    fillColor: "#ff7800",
    color: "#000",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.4
};

let allLayers;

// this is the boundary layer located as a geojson in the /data/ folder 
const boundaryLayer = "./data/la_zipcodes.geojson"
let boundary; // place holder for the data
let collected; // variable for turf.js collected points 
let allPoints = []; // array for all the data points

//function for clicking on polygons
function onEachFeature(feature, layer) {
    console.log(feature.properties)
    if (feature.properties.values) {
        //count the values within the polygon by using .length on the values array created from turf.js collect
        let count = feature.properties.values.length
        console.log(count) // see what the count is on click
        let text = count.toString() // convert it to a string
        layer.bindPopup(text); //bind the pop up to the number
    }
}

// for coloring the polygon
function getStyles(data){
    console.log(data)
    let myStyle = {
        "color": "#ff7800",
        "weight": 1,
        "opacity": .0,
        "stroke": .5
    };
    if (data.properties.values.length > 0){
        myStyle.opacity = 0
        
    }

    return myStyle
}

function getBoundary(layer){
    fetch(layer)
    .then(response => {
        return response.json();
        })
    .then(data =>{
                //set the boundary to data
                boundary = data

                // run the turf collect geoprocessing
                collected = turf.collect(boundary, thePoints, 'KTownResident', 'values');
                // just for fun, you can make buffers instead of the collect too:
                // collected = turf.buffer(thePoints, 50,{units:'miles'});
                console.log(collected.features)

                // here is the geoJson of the `collected` result:
                L.geoJson(collected,{onEachFeature: onEachFeature,style:function(feature)
                {
                    console.log(feature)
                    if (feature.properties.values.length > 0) {
                        return {color: "#ff0000",stroke: false};
                    }
                    else{
                        // make the polygon gray and blend in with basemap if it doesn't have any values
                        return{opacity:0,color:"#efefef" } //ALbert: my bad! I did `color =` instead of `color:`
                    }
                }
                // add the geojson to the map
                    }).addTo(map)
        }
    )   
}

console.log(boundary)

function addMarker(data){
    let kTownResidentData = data.KtownResident
    // create the turfJS point
    let thisPoint = turf.point([Number(data.lng),Number(data.lat)],{kTownResidentData}) //capitalization issue here!
    // you want to use the KTownResident variable!

    // put all the turfJS points into `allPoints`
    allPoints.push(thisPoint)
    if(data.ktownresident == "Yes"){
        exampleOptions.fillColor = "lightblue"
        KTownResident.addLayer(L.circleMarker([data.lat,data.lng],exampleOptions).bindPopup(`<h2>Koreatown resident</h2>`+ '' + `<p>Most frequented location: ${data.address}`))
        createButtons(data.lat,data.lng,data.address)
        }
    else{
        exampleOptions.fillColor = "hotpink"
        NotKTownResident.addLayer(L.circleMarker([data.lat,data.lng],exampleOptions).bindPopup(`<h2>Not a Koreatown resident</h2>`+ '' + `<p>Most frequented location: ${data.address}`))
        createButtons(data.lat,data.lng,data.address)
    }
    return data.address, data.communityissues
}

function createButtons(lat,lng,title){
    const newButton = document.createElement("button");
    newButton.id = "button"+title;
    newButton.innerHTML = title;
    newButton.setAttribute("class","step") // add the class called "step" to the button or div
    newButton.setAttribute("data-step",newButton.id) // add a data-step for the button id to know which step we are on
    newButton.setAttribute("lat",lat); 
    newButton.setAttribute("lng",lng);
    newButton.addEventListener('click', function(){
        map.flyTo([lat,lng]);
    })
    const spaceForButtons = document.getElementById('contents')
    spaceForButtons.appendChild(newButton);
}

function formatData(theData){
        const formattedData = []
        const rows = theData.feed.entry
        for(const row of rows) {
          const formattedRow = {}
          for(const key in row) {
            if(key.startsWith("gsx$")) {
                  formattedRow[key.replace("gsx$", "")] = row[key].$t
            }
          }
          formattedData.push(formattedRow)
        }
        console.log(formattedData)
        console.log('boundary')
        console.log(boundary)
        formattedData.forEach(addMarker)
        KTownResident.addTo(map)
        NotKTownResident.addTo(map)
        let allLayers = L.featureGroup([KTownResident,NotKTownResident]);

        // step 1: turn allPoints into a turf.js featureCollection
        thePoints = turf.featureCollection(allPoints)
        console.log(thePoints)

        // step 2: run the spatial analysis
        getBoundary(boundaryLayer)
        console.log('boundary')
        console.log(boundary)

        // dont need to fit all layers, just start at ktown first
        // map.fitBounds(allLayers.getBounds());        
}


// dont need this line!
// collected.features.properties.values

scroller
        .setup({
            step: ".step", // this is the name of the class that we are using to step into, it is called "step", not very original
        })
        // do something when you enter a "step":
        .onStepEnter((response) => {
            // you can access these objects: { element, index, direction }
            // use the function to use element attributes of the button 
            // it contains the lat/lng: 
            scrollStepper(response.element.attributes)
        })
        .onStepExit((response) => {
            // { element, index, direction }
            // left this in case you want something to happen when someone
            // steps out of a div to know what story they are on.
        });
        
function scrollStepper(thisStep){
    // optional: console log the step data attributes:
    // console.log("you are in thisStep: "+thisStep)
    let thisLat = thisStep.lat.value
    let thisLng = thisStep.lng.value
    // tell the map to fly to this step's lat/lng pair:
    map.flyTo([thisLat,thisLng])
}


let layers = {
	"Koreatown resident": KTownResident,
	"Not a Koreatown resident": NotKTownResident
}

//L.control.layers(null,layers, {collapsed:false}).addTo(map)

// setup resize event for scrollama incase someone wants to resize the page...
window.addEventListener("resize", scroller.resize);


var legend = L.control({ position: "bottomleft" });

legend.onAdd = function(map) {
  var div = L.DomUtil.create("div", "legend");
  div.innerHTML += "<h4>Legend</h4>";
  div.innerHTML += '<i style="background: lightblue"></i><span id="ktownResident">Koreatown Resident</span><br>';
  div.innerHTML += '<i style="background: pink"></i><span id="notktownResident">Not Koreatown Resident</span><br>';
 // div.innerHTML += '<i style="background: #E6E696"></i><span>Land</span><br>';
 //div.innerHTML += '<i style="background: #E8E6E0"></i><span>Residential</span><br>';
 // div.innerHTML += '<i style="background: #FFFFFF"></i><span>Ice</span><br>';
  //div.innerHTML += '<i class="icon" style="background-image: url(https://d30y9cdsu7xlg0.cloudfront.net/png/194515-200.png);background-repeat: no-repeat;"></i><span>Grænse</span><br>';
  
  return div;
};

legend.addTo(map);

// toggle the legend for ktownResident grouplayer
var ktownResidentLegend = document.getElementById("ktownResident");

ktownResidentLegend.onclick = function() {
  if(map.hasLayer(KTownResident)){
    map.removeLayer(KTownResident)
  }
  else{
    map.addLayer(KTownResident)
  }
  ktownResidentLegend.classList.toggle("disabled");
}
// toggle the legend for nonktownResident grouplayer
var notktownResidentLegend = document.getElementById("notktownResident");

notktownResidentLegend.onclick = function() {
  if(map.hasLayer(NotKTownResident)){
    map.removeLayer(NotKTownResident)
  }
  else{
    map.addLayer(NotKTownResident)
  }
  notktownResidentLegend.classList.toggle("disabled");
}




// Get the modal
var modal = document.getElementById("myModal");

// Get the button that opens the modal
var btn = document.getElementById("myBtn");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

// When the user clicks on the button, open the modal 
btn.onclick = function() {
  modal.style.display = "block";
}

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
  modal.style.display = "none";
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}
document.getElementById("myBtn").click() // simulate click to start modal
