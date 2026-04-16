const socket = io();

const chatWindow = document.getElementById("chat-window");
const unitButton = document.getElementById("unitsButton");
const locationInput = document.getElementById("location-input");
const searchButton = document.getElementById("search-button");
const placeSelectionBar = document.getElementById("place-selection-bar");

// location
let userLocation = { lat: 48.4359, lng: -123.3516 };

let locationSearchingData = '';

let units = "C";

window.onload = (event) => {
  updateCurrentLocation();
  getSevenDayForecast();
};

async function getSevenDayForecast() {
  socket.emit("get_seven") 
  
}
socket.on("sevenDayForecast", async (info) => {
  console.log(info);
  for(let r = 0; r < 7; r++){
    //info.daily.temperature_2m_max[r] <<-- where we can print to the nodes
    //info.daily.temperature_2m_min[r]
    //info.daily.weather_code[r]
  }
});

// connected to the server
socket.on("connect", async () => {
  chatWindow.innerHTML =
    '<div style="color: green;">System: Connected to the server.</div>';

  // test
  await sendUserLocation();
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

// listen for location searching response
socket.on("location_response", (msg) => {

  locationData = '';

  if (msg === "Waiting...") {
    placeSelectionBar.innerHTML = '';
  } else if (msg.length === 0) {
    placeSelectionBar.innerHTML = 'No Result Found';
  } else {

    // if the data is valid

    locationSearchingData = msg;
    let place;
    for (let i = 0; i < msg.length; i++) {
      place = msg[i];
      placeSelectionBar.innerHTML += `<div class="place-selection" id="${place.lat},${place.lon}">${place.display_name}</div>`;
    }

    // add eventlisteners
    for (let t = 0; t < msg.length; t++){
      place = msg[t];
      document.getElementById(place.lat + "," + place.lon).addEventListener("click", function selectLocation() {
        let position = this.id.split(",");
        console.log(position);
        userLocation.lat = position[0];
        userLocation.lng = position[1];
        console.log("lat:" + userLocation.lat + " long:" + userLocation.lng);
        console.log(``);
        for (let j = 0; j < locationSearchingData.length; j++) {
          document.getElementById(locationSearchingData[j].lat + "," + locationSearchingData[j].lon).removeEventListener("click", selectLocation);
          //console.log(`deleted ${locationSearchingData[j].display_name}`);
        }
        placeSelectionBar.innerHTML = '';
      })
    }
  }
});

// send message to server
function requireWeatherData() {

  // show user's message in chatWindow
  chatWindow.scrollTop = chatWindow.scrollHeight;

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

// send user location to server
function sendUserLocation() {
  // send location to server
  console.log(userLocation + " Senduserlocation");
  socket.emit("send_location", userLocation);
}

function updateCurrentLocation(){
  
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
