const socket = io();

// ui
const chatWindow = document.getElementById("chat-window");

const locationInput = document.getElementById("location-input");
const placeSelectionBar = document.getElementById("place-selection-bar");

// displays
const locationDisplay = document.getElementById("location-display");
const currentWeatherDisplay = document.getElementById("current-weather-display");
const todayTemperatureDisplay = document.getElementById("today-temperature-display");
const hourlyForecastBox = document.getElementById("hourlyForecastBox");

// buttons
const searchButton = document.getElementById("search-button");
const currentLocationButton = document.getElementById("current-location-button");
const unitButton = document.getElementById("unitsButton");
const tempButton = document.getElementById("tempbtn");
const rainButton = document.getElementById("rainbtn");

// location
let userLocation = { lat: 48.4359, lng: -123.3516 };
let currentUserLocation = { lat: 48.4359, lng: -123.3516 };

// helpers
let locationSearchingData = ''; // stores the locations' data included in the previous location search
let days = ["Sun", "Mon", "Tues", "Wed", "Thurs", "Fri", "Sat"];

let units = "C"; // unit to display

// weather map
let initialWeatherConfig = null;

// setup mapbox
// note: this accessToken is a public key, so it is safe to be in client.js
mapboxgl.accessToken = 'pk.eyJ1IjoiZGF2aWRjaGVuMjA2MjY1IiwiYSI6ImNtbWI1OXZ3ZTBmbnAycXBybHBlMnV3dDIifQ.1kx9xZYECXeQpEP-J7EKXA';
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v11',
  center: [userLocation.lng, userLocation.lat],
  zoom: 9
});

window.onload = (event) => {

  // get the forecast for the user's location by default
  updateCurrentLocation().then(getLocationName(currentUserLocation.lat, currentUserLocation.lng));
  getSevenDayForecast();
  getHourlyForecast();
  getCurrentWeather();
};

async function getSevenDayForecast() {
  sendUserLocation();
  socket.emit("get_seven");
}

// process the 7 day forecast
socket.on("sevenDayForecast", async (info) => {
  let today = new Date();
  let dayoftheweek = today.getDay();
  let printedday = ""; // day to print 
  let emoji = ""; // emoji to print

  // for each day's forecast:
  for (let r = 0; r < 7; r++) {

    // get day of the week
    if (r == 0) {
      printedday = "Today";
      dayoftheweek++;
    } else {
      printedday = days[dayoftheweek];
      dayoftheweek++;
    }
    if (dayoftheweek == 7) {
      dayoftheweek = 0;
    };

    // assign emojis according to the weather code
    if (info.daily.weather_code[r] == 3) {
      emoji = "☁️";
    } else if (info.daily.weather_code[r] == 1) {
      emoji = "☀️";
    } else if (info.daily.weather_code[r] > 50) {
      emoji = "🌧️";
    } else {
      emoji = "☀️";
    }

    //set Inner text with values and correct units
    if (units == "C") {
      document.getElementById("daybox" + r).innerHTML = printedday + "<br>" + emoji + "<br>" + info.daily.temperature_2m_max[r] + "°C&uarr;<br>" + info.daily.temperature_2m_min[r] + "°C&darr;"
    } else {
      document.getElementById("daybox" + r).innerHTML = printedday + "<br>" + emoji + "<br>" + Math.floor((info.daily.temperature_2m_max[r] * 9 / 5) + 32) + "°F&uarr;<br>" + Math.floor((info.daily.temperature_2m_min[r] * 9 / 5) + 32) + "°F&darr;"
    }

    // update todayTemperatureDisplay
    if (units == "C") {
      todayTemperatureDisplay.innerText = info.daily.temperature_2m_max[0] + '° | ' + info.daily.temperature_2m_min[0] + '°';
    } else {
      todayTemperatureDisplay.innerText = Math.floor((info.daily.temperature_2m_max[0] * 9 / 5) + 32) + '° | ' + Math.floor((info.daily.temperature_2m_min[0] * 9 / 5) + 32) + '°';
    }
  } // function
});

socket.on("current_weather_response", async (info) => {
  let emoji = "";

  // assign emojis according to the weather code
  if (info.current.weather_code == 3 || info.current.weather_code == 2 || info.current.weather_code == 1) {
    emoji = "☁️";
  } else if (info.current.weather_code == 0) {
    emoji = "☀️";
  } else if (info.current.weather_code > 50) {
    emoji = "🌧️";
  } else {
    emoji = "☀️";
  }

  // use correct unit
  let shownTemperature = info.current.temperature_2m;
  if (units === 'F') shownTemperature = Math.floor((info.current.temperature_2m * 9 / 5) + 32);

  // update currentWeatherDisplay
  currentWeatherDisplay.innerText = emoji + ' ' + shownTemperature + '°';
});

// connected to the server
socket.on("connect", async () => {
  chatWindow.innerHTML =
    '<div style="color: green;">System: Connected to the server.</div>';

  sendUserLocation(true);
});

// accept weather config
socket.on('weather-config', (config) => {
  initialWeatherConfig = config;
  if (map.loaded()) {
    addWeatherMapLayer();
  }
});

// add weather map layer to openbox map
map.on('load', () => {
  if (initialWeatherConfig) {
    addWeatherMapLayer();
  }
});

// process the hourly forecast
socket.on('hourly_forecast_response', (info) => {
  hourlyForecastBox.innerHTML = '';

  let emoji = "";
  let shownTemperature = 0;
  let shownDate;
  let localDay;
  let currentDay;
  let localDate = new Date().toLocaleString('en-US', { hour12: false });
  localDay = localDate.split(',')[0];
  localDate = localDate.substring(localDate.length - 8, localDate.length - 3);
  console.log('Local date: ' + localDate); // Displays the full local date and time string


  // add hourly data
  for (let i = 0; i < 48; i++) {

    // convert time
    shownDate = info.hourly.time[i];
    shownDate = new Date(shownDate + "Z").toLocaleString('en-US', { hour12: false });
    currentDay = shownDate.split(',')[0];
    shownDate = shownDate.substring(shownDate.length - 8, shownDate.length - 3);

    // only show current & later weather 
    if (localDay === currentDay && localDate.substring(0, localDate.length - 3) === shownDate.substring(0, shownDate.length - 3)) {
      hourlyForecastBox.innerHTML = '';
      shownDate = 'Now';
    }

    //set weather code emojis
    if (info.hourly.weather_code[i] == 3 || info.hourly.weather_code[i] == 2) {
      emoji = "☁️";
    } else if (info.hourly.weather_code[i] == 1) {
      emoji = "☀️";
    } else if (info.hourly.weather_code[i] > 50) {
      emoji = "🌧️";
    } else {
      emoji = "☀️";
    }

    // use correct unit
    shownTemperature = info.hourly.temperature_2m[i];
    if (units === 'F') shownTemperature = Math.floor((shownTemperature * 9 / 5) + 32);

    // add an hour's item into the hourlyForecastBox
    hourlyForecastBox.innerHTML += `
            <div class="forecast-item">
                <span class="temp">${shownTemperature}°</span>
                <span class="icon">${emoji}</span>
                <span class="wind">${info.hourly.wind_speed_10m[i]}m/s</span>
                <span class="time">${shownDate}</span>
            </div>`;
  }
});

// listen for AI response from server
socket.on("ai_response", (msg) => {

  if (msg === "Waiting...") {

    // display waiting message
    chatWindow.innerHTML += `<div div class="msg-ai" id = "loading" > <strong>AI:</strong> ${msg}</div > `;
  } else {

    // display AI's response
    const loadingNode = document.getElementById("loading");
    if (loadingNode) loadingNode.remove(); // remove loading sign
    chatWindow.innerHTML += `<div div class="msg-ai" > <strong>AI:</strong> ${msg}</div > `;
  }

  // auto scroll to the latest reply
  chatWindow.scrollTop = chatWindow.scrollHeight;
});

// listen for location name response
socket.on("location_name_response", (locationNameData) => {

  // display location name
  locationDisplay.innerText = '';

  // add location name properties if they are in the response
  if (Object.hasOwn(locationNameData, "address")) {
    if (Object.hasOwn(locationNameData.address, "suburb")) {
      locationDisplay.innerText += (locationNameData.address.suburb);
    } else if (Object.hasOwn(locationNameData.address, "neighbourhood")) {
      locationDisplay.innerText += (locationNameData.address.neighbourhood);
    }
    if (Object.hasOwn(locationNameData.address, "city")) {
      locationDisplay.innerText += ('  (' + locationNameData.address.city + ')');
    } else if (Object.hasOwn(locationNameData.address, "county")) {
      locationDisplay.innerText += ('  (' + locationNameData.address.county + ')');
    } else if (Object.hasOwn(locationNameData.address, "state")) {
      locationDisplay.innerText += ('  (' + locationNameData.address.state + ')');
    }
  } else {
    console.log('No address available!');
  }
})

// listen for location searching response
socket.on("location_response", (msg) => {

  locationData = '';

  // update searchSelectionBar
  if (msg.length === 0 || msg.error) {
    placeSelectionBar.innerHTML = 'No Results Found';
  } else if (msg === 'Waiting...') {
    placeSelectionBar.innerHTML = 'Searching...';
  } else {

    // if the data is valid
    placeSelectionBar.innerHTML = '';

    locationSearchingData = msg;
    let place;
    for (let i = 0; i < msg.length; i++) {
      place = msg[i];

      // identify each place selection with its coordinates 
      placeSelectionBar.innerHTML += `<div div class="place-selection" id = "${place.lat},${place.lon}" > ${place.display_name}</div > `;
    }

    // add the cancel button
    placeSelectionBar.innerHTML += `<div div class="place-selection" id = "place-selection-cancel" > Cancel</div > `;

    // add eventListeners for each location
    for (let t = 0; t < msg.length; t++) {
      place = msg[t];

      document.getElementById(place.lat + "," + place.lon).addEventListener("click", selectLocation);

      // add eventListener for cancel 
      document.getElementById('place-selection-cancel').addEventListener("click", cancelSelection);

    }
  }
});

// cancel the current search
function cancelSelection() {

  // remove eventListeners
  for (let j = 0; j < locationSearchingData.length; j++) {
    document.getElementById(locationSearchingData[j].lat + "," + locationSearchingData[j].lon).removeEventListener("click", selectLocation);
  }
  document.getElementById('place-selection-cancel').removeEventListener("click", cancelSelection);

  // reset selection bar
  placeSelectionBar.innerHTML = '';
  locationInput.value = '';
}

// select this location to view its weather
function selectLocation() {
  let position = this.id.split(",");

  // update the viewing location
  userLocation.lat = position[0];
  userLocation.lng = position[1];

  // update map center
  map.flyTo({ center: [userLocation.lng, userLocation.lat] });

  // update seven day & 24 hour forecast
  getSevenDayForecast();
  getHourlyForecast();

  // update location name
  getLocationName(userLocation.lat, userLocation.lng);

  // remove eventListeners
  for (let j = 0; j < locationSearchingData.length; j++) {
    document.getElementById(locationSearchingData[j].lat + "," + locationSearchingData[j].lon).removeEventListener("click", selectLocation);
  }
  document.getElementById('place-selection-cancel').removeEventListener("click", cancelSelection);

  // reset selection bar
  placeSelectionBar.innerHTML = '';
  locationInput.value = '';

  // update current weather
  getCurrentWeather();
}

// add a new weather map layer
function addWeatherMapLayer() {
  if (map.getSource('weather-source')) return;

  map.addSource('weather-source', {
    'type': 'raster',
    'tiles': [
      `${window.location.origin}/weather-proxy/${initialWeatherConfig.layer}/{z}/{x}/{y}`
    ],
    'tileSize': 256
  });

  map.addLayer({
    'id': 'weather-layer',
    'type': 'raster',
    'source': 'weather-source',
    'paint': { 'raster-opacity': initialWeatherConfig.opacity }
  });
}

function changeWeatherLayer(newLayerType) {

  // remove existing layers
  if (map.getLayer('weather-layer')) {
    map.removeLayer('weather-layer');
  }
  if (map.getSource('weather-source')) {
    map.removeSource('weather-source');
  }

  // add new layer
  map.addSource('weather-source', {
    'type': 'raster',
    'tiles': [
      `${window.location.origin}/weather-proxy/${newLayerType}/{z}/{x}/{y}`
    ],
    'tileSize': 256
  });

  // update the color of buttons
  if (newLayerType == 'temp_new') {
    tempButton.style.backgroundColor = "#0056b3";
    rainButton.style.backgroundColor = "#007bff";
  } else {
    tempButton.style.backgroundColor = "#007bff";
    rainButton.style.backgroundColor = "#0056b3";
  };

  // rerender
  map.addLayer({
    'id': 'weather-layer',
    'type': 'raster',
    'source': 'weather-source',
    'paint': {
      'raster-opacity': initialWeatherConfig ? initialWeatherConfig.opacity : 0.6
    }
  });

  console.log(`Change layer to: ${newLayerType}`);
}

// request the AI analysis
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

function getCurrentWeather() {
  socket.emit('get_current_weather');
}

// search for a location
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

// get the name of location by coordinates
function getLocationName(lat, lng) {

  // send search request
  socket.emit("require_location_name", lat, lng);
}

// send user location to server
function sendUserLocation(isCurrent = false) {

  // send location to server
  socket.emit("send_location", userLocation, isCurrent);
}

// get the current user location
function updateCurrentLocation() {

  return new Promise((resolve, reject) => {

    // get user location
    navigator.geolocation.getCurrentPosition(
      (position) => {

        // get the location
        userLocation.lat = position.coords.latitude;
        userLocation.lng = position.coords.longitude;
        console.log(`User current location: lat_${userLocation.lat}, lng_${userLocation.lng}`);

        resolve();
      },
      (err) => {
        if (err.code === 1) {
          console.warn("User denied Location permissions.");
        } else if (err.code === 2) {
          console.warn("Location unavailable (CoreLocation error). Check Wi-Fi/System settings.");
        }
        reject(error);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    ); // getCurrentPosition
  }); // Promise
} // updateCurrentLocation

// switch units to display
function switchUnits() {
  if (units == "C") {
    units = "F";
    unitButton.innerHTML = "°F";
  } else {
    units = "C";
    unitButton.innerHTML = "°C";
  }
  console.log("Units:" + units);

  // request new forecasts
  getSevenDayForecast();
  getHourlyForecast();
  getCurrentWeather();
}

function getHourlyForecast() {
  socket.emit('require_hourly_forecast');
}

// switch the view location back to current location
function backToCurrentLocation() {

  // update current location
  updateCurrentLocation().then(getLocationName(currentUserLocation.lat, currentUserLocation.lng));
  userLocation = currentUserLocation;
  sendUserLocation(true);

  // update map
  map.flyTo({ center: [userLocation.lng, userLocation.lat] });

  // update seven day forecast
  getSevenDayForecast();
}

// load the service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').then(function (registration) {
      console.log('Service Worker registered with scope:', registration.scope);
    }, function (error) {
      console.log('Service Worker registration failed:', error);
    });
  });
}

// handle install prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  const installButton = document.getElementById('installButton');
  installButton.style.display = 'block';

  installButton.addEventListener('click', () => {
    installButton.style.display = 'none';
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      deferredPrompt = null;
    });
  });
});