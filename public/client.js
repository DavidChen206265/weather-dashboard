const socket = io();

const chatWindow = document.getElementById("chat-window");
const unitButton = document.getElementById("unitsButton");
const locationInput = document.getElementById("location-input");
const locationDisplay = document.getElementById("location-display");
const searchButton = document.getElementById("search-button");
const currentLocationButton = document.getElementById("current-location-button");
const placeSelectionBar = document.getElementById("place-selection-bar");


// location
let userLocation = { lat: 48.4359, lng: -123.3516 };
let currentUserLocation = { lat: 48.4359, lng: -123.3516 };

let locationSearchingData = '';

let units = "C";

window.onload = (event) => {
  updateCurrentLocation().then(getLocationName(currentUserLocation.lat, currentUserLocation.lng));
  getSevenDayForecast();
};

async function getSevenDayForecast() {
  sendUserLocation(true);
  socket.emit("get_seven") 
  
}
socket.on("sevenDayForecast", async (info) => {
  for(let r = 0; r < 7; r++){
    let emoji = "";
    //set background colours based off weather code
    document.getElementById("daybox" + r).style.color = "#000";
    if(info.daily.weather_code[r] == 3){
      document.getElementById("daybox" + r).style.backgroundColor = "#BBB";
      emoji = "☁️";
    }else if(info.daily.weather_code[r] == 1){
      document.getElementById("daybox" + r).style.backgroundColor = "#87CEEB";
      emoji = "☀️";
    }else if(info.daily.weather_code[r] > 50){
      document.getElementById("daybox" + r).style.backgroundColor = "#29395b";
      document.getElementById("daybox" + r).style.color = "#FFF";
      emoji = "🌧️";
    }else{
      document.getElementById("daybox" + r).style.backgroundColor = "#87CEEB";
      emoji = "☀️";
    }
    //set Inner text with values
    if(units == "C"){
      document.getElementById("daybox" + r).innerHTML = emoji + "<br>" + info.daily.temperature_2m_max[r] + "°C<br>" + info.daily.temperature_2m_min[r] + "°C"
    }else{
      document.getElementById("daybox" + r).innerHTML = emoji + "<br>" + Math.floor((info.daily.temperature_2m_max[r] * 9 / 5) + 32) + "°F<br>" + Math.floor((info.daily.temperature_2m_min[r] * 9 / 5) + 32) + "°F"
    }
    
    //info.daily.temperature_2m_max[r] <<-- where we can print to the nodes
    //info.daily.temperature_2m_min[r]
    //info.daily.weather_code[r]
  }
});

// connected to the server
socket.on("connect", async () => {
  chatWindow.innerHTML =
    '<div style="color: green;">System: Connected to the server.</div>';

  sendUserLocation(true);
});

// listen for AI response from server
socket.on("ai_response", (msg) => {

  if (msg === "Waiting...") {
    chatWindow.innerHTML += `<div class="msg-ai" id="loading"><strong>AI:</strong> ${msg}</div>`;
  } else {
    const loadingNode = document.getElementById("loading");
    if (loadingNode) loadingNode.remove(); // remove loading sign
    chatWindow.innerHTML += `<div class="msg-ai"><strong>AI:</strong> ${msg}</div>`;
  }
  chatWindow.scrollTop = chatWindow.scrollHeight;
});

// listen for location name response
socket.on("location_name_response", (locationNameData) => {

  console.log('Location Name Data: ' + locationNameData);
  
  locationDisplay.innerText = '';

  if (Object.hasOwn(locationNameData, "address")) {
    if (Object.hasOwn(locationNameData.address, "suburb")) {
      locationDisplay.innerText += (locationNameData.address.suburb + ', ');

    } 
    if (Object.hasOwn(locationNameData.address, "neighborhood")) {
      locationDisplay.innerText += (locationNameData.address.neighborhood + ', ');
    } 
    if (Object.hasOwn(locationNameData.address, "city")) {
      locationDisplay.innerText += (locationNameData.address.city + ', ');
    } 
    if (Object.hasOwn(locationNameData.address, "county")) {
      locationDisplay.innerText += (locationNameData.address.county + ', ');
    } 
    if (Object.hasOwn(locationNameData.address, "state")) {
      locationDisplay.innerText += (locationNameData.address.state);
    } 
  } else {
    console.log('No address available!');
  }

})

// listen for location searching response
socket.on("location_response", (msg) => {

  locationData = '';

  if (msg === "Waiting...") {
    placeSelectionBar.innerHTML = '';
  } else if (msg.length === 0) {
    placeSelectionBar.innerHTML = 'No Results Found';
  } else if (msg.error) {
    placeSelectionBar.innerHTML = 'No Results Found';
  } else {

    // if the data is valid

    locationSearchingData = msg;
    let place;
    for (let i = 0; i < msg.length; i++) {
      place = msg[i];
      placeSelectionBar.innerHTML += `<div class="place-selection" id="${place.lat},${place.lon}">${place.display_name}</div>`;
    }

    // add eventlisteners
    for (let t = 0; t < msg.length; t++) {
      place = msg[t];

      document.getElementById(place.lat + "," + place.lon).addEventListener("click", function selectLocation() {
        let position = this.id.split(",");
        console.log(position);

        // set userLocation
        userLocation.lat = position[0];
        userLocation.lng = position[1];

        // update location name
        getLocationName(userLocation.lat, userLocation.lng);

        console.log("lat:" + userLocation.lat + " long:" + userLocation.lng);
        console.log(``);
        for (let j = 0; j < locationSearchingData.length; j++) {
          document.getElementById(locationSearchingData[j].lat + "," + locationSearchingData[j].lon).removeEventListener("click", selectLocation);
        }
        placeSelectionBar.innerHTML = '';
        locationInput.value = '';
      });

    }
  }
});

// send message to server
function requireWeatherData() {

  // show user's message in chatWindow
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // send user location
  sendUserLocation();

  // send request to server
  socket.emit("require_weather_data", units);

}

// press Enter to search for location
function checkEnter(e) {
  if (e.key === "Enter") searchLocation();
}

function searchLocation() {

  console.log('Searching for: ' + locationInput.value);


  let searchText = locationInput.value;

  // check for input
  if (!searchText) {
    alert('Please enter a place to search for.');
    return;
  }

  // send search request
  socket.emit("search_for_location", searchText);

}

function getLocationName(lat, lng) {

  // send search request
  socket.emit("require_location_name", lat, lng);

}

// send user location to server
function sendUserLocation(isCurrent = false) {

  // send location to server
  socket.emit("send_location", userLocation, isCurrent);
}

function updateCurrentLocation() {

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {

        // get the location
        userLocation.lat = position.coords.latitude;
        userLocation.lng = position.coords.longitude;
        console.log(`User current location: lat_${userLocation.lat}, lng_${userLocation.lng}`);

        resolve();
      },
      (error) => {
        console.error(error);
        reject(error);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });

}

function switchUnits() {
  if (units == "C") {
    units = "F";
    unitButton.innerHTML = "°F";
  } else {
    units = "C";
    unitButton.innerHTML = "°C";
  }
  console.log("Units:" + units);
}

function backToCurrentLocation() {
  updateCurrentLocation().then(getLocationName(currentUserLocation.lat, currentUserLocation.lng));
  sendUserLocation(true);
}