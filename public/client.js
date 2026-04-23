const socket = io();

const chatWindow = document.getElementById("chat-window");
const unitButton = document.getElementById("unitsButton");
const locationInput = document.getElementById("location-input");
const locationDisplay = document.getElementById("location-display");
const searchButton = document.getElementById("search-button");
const currentLocationButton = document.getElementById("current-location-button");
const placeSelectionBar = document.getElementById("place-selection-bar");
const currentWeatherDisplay = document.getElementById("current-weather-display");
const todayTemperatureDisplay = document.getElementById("today-temperature-display");
const hourlyForecastBox = document.getElementById("hourlyForecastBox");

// location
let userLocation = { lat: 48.4359, lng: -123.3516 };
let currentUserLocation = { lat: 48.4359, lng: -123.3516 };

let locationSearchingData = '';

let units = "C";

// weather map
let initialWeatherConfig = null;

mapboxgl.accessToken = 'pk.eyJ1IjoiZGF2aWRjaGVuMjA2MjY1IiwiYSI6ImNtbWI1OXZ3ZTBmbnAycXBybHBlMnV3dDIifQ.1kx9xZYECXeQpEP-J7EKXA';
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v11',
  center: [userLocation.lng, userLocation.lat],
  zoom: 9
});

window.onload = (event) => {
  updateCurrentLocation().then(getLocationName(currentUserLocation.lat, currentUserLocation.lng));
  getSevenDayForecast();
  getHourlyForecast();
  getCurrentWeather();
};

async function getSevenDayForecast() {
  sendUserLocation();
  socket.emit("get_seven");
}

let days = ["Sun", "Mon", "Tues", "Wed", "Thurs", "Fri", "Sat"];

socket.on("sevenDayForecast", async (info) => {
  let today = new Date();
  let dayoftheweek = today.getDay();
  let printedday = "";
  for (let r = 0; r < 7; r++) {

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

    let emoji = "";
    //set background colours based off weather code
    if (info.daily.weather_code[r] == 3) {
      
      emoji = "☁️";
    } else if (info.daily.weather_code[r] == 1) {
      
      emoji = "☀️";
    } else if (info.daily.weather_code[r] > 50) {
      
      emoji = "🌧️";
    } else {
      
      emoji = "☀️";
    }
    //set Inner text with values
    if (units == "C") {
      document.getElementById("daybox" + r).innerHTML = printedday + "<br>" + emoji + "<br>" + info.daily.temperature_2m_max[r] + "°C&uarr;<br>" + info.daily.temperature_2m_min[r] + "°C&darr;"
    } else {
      document.getElementById("daybox" + r).innerHTML = printedday + "<br>" + emoji + "<br>" + Math.floor((info.daily.temperature_2m_max[r] * 9 / 5) + 32) + "°F&uarr;<br>" + Math.floor((info.daily.temperature_2m_min[r] * 9 / 5) + 32) + "°F&darr;"
    }

    //info.daily.temperature_2m_max[r] <<-- where we can print to the nodes
    //info.daily.temperature_2m_min[r]
    //info.daily.weather_code[r]

    // update todayTemperatureDisplay
    if (units == "C") {
      todayTemperatureDisplay.innerText = info.daily.temperature_2m_max[0] + '° | ' + info.daily.temperature_2m_min[0] + '°';
    } else {
      todayTemperatureDisplay.innerText = Math.floor((info.daily.temperature_2m_max[0] * 9 / 5) + 32) + '° | ' + Math.floor((info.daily.temperature_2m_min[0] * 9 / 5) + 32) + '°';
    }

  }
});

socket.on("current_weather_response", async (info) => {
  console.log("Current Weather:", info.current);
  let emoji = "";
  //set background colours based off weather code
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

socket.on('weather-config', (config) => {
  initialWeatherConfig = config;

  if (map.loaded()) {
    addWeatherMapLayer();
  }
});

map.on('load', () => {
  if (initialWeatherConfig) {
    addWeatherMapLayer();
  }
});

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
    chatWindow.innerHTML += `<div div class="msg-ai" id = "loading" > <strong>AI:</strong> ${msg}</div > `;
  } else {
    const loadingNode = document.getElementById("loading");
    if (loadingNode) loadingNode.remove(); // remove loading sign
    chatWindow.innerHTML += `<div div class="msg-ai" > <strong>AI:</strong> ${msg}</div > `;
  }
  chatWindow.scrollTop = chatWindow.scrollHeight;
});

// listen for location name response
socket.on("location_name_response", (locationNameData) => {

  console.log('Location Name Data: ' + JSON.stringify(locationNameData));

  // display location name
  locationDisplay.innerText = '';

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

  if (msg.length === 0) {
    placeSelectionBar.innerHTML = 'No Results Found';
  } else if (msg === 'Waiting...') {
    placeSelectionBar.innerHTML = 'Searching...';
  } else if (msg.error) {
    placeSelectionBar.innerHTML = 'No Results Found';
  } else {

    // if the data is valid
    placeSelectionBar.innerHTML = '';

    locationSearchingData = msg;
    let place;
    for (let i = 0; i < msg.length; i++) {
      place = msg[i];
      placeSelectionBar.innerHTML += `<div div class="place-selection" id = "${place.lat},${place.lon}" > ${place.display_name}</div > `;
    }
    placeSelectionBar.innerHTML += `<div div class="place-selection" id = "place-selection-cancel" > Cancel</div > `;


    // add eventListeners
    for (let t = 0; t < msg.length; t++) {
      place = msg[t];

      document.getElementById(place.lat + "," + place.lon).addEventListener("click", selectLocation);

      // add eventListener for cancel 
      document.getElementById('place-selection-cancel').addEventListener("click", cancelSelection);

    }
  }
});

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

function selectLocation() {
  let position = this.id.split(",");
  console.log(position);

  // set userLocation
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

const tempButton = document.getElementById("tempbtn")
const rainButton = document.getElementById("rainbtn")

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

function getCurrentWeather() {
  socket.emit('get_current_weather');
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
  getSevenDayForecast();
  getHourlyForecast();
  getCurrentWeather();
}

function getHourlyForecast() {

  socket.emit('require_hourly_forecast');
}

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
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('sw.js').then(function(registration) {
      console.log('Service Worker registered with scope:', registration.scope);
    }, function(error) {
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