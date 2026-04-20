require("dotenv").config();
const { log } = require("console");
const express = require("express");
const http = require("http");
const https = require('https');
const { Server } = require("socket.io");
const axios = require('axios');
const path = require('path');
require('events').EventEmitter.defaultMaxListeners = 50;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// user location
let userLocation = { lat: 48.4359, lng: -123.3516 };
let currentUserLocation = { lat: 48.4359, lng: -123.3516 };

app.use(express.static("public"));

// AI API request variables
const API_BASE_URL = "https://api.cetaceang.qzz.io/v1/chat/completions";
const MODEL_ID = "gpt-oss-20b";

// keys
const AI_API_KEY = process.env.AI_API_KEY;
const GEO_API_KEY = process.env.GEO_API_KEY;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

const mapboxAgent = new https.Agent({ 
    keepAlive: true, 
    maxSockets: 50 
});

// after a client connected
io.on("connection", (socket) => {
  console.log("A client has connected.");

  // weather map settings
  socket.emit('weather-config', {
    layer: 'temp_new',
    opacity: 0.6
  });

  // ask AI
  socket.on("require_weather_data", async (units) => {
    try {
      // send back the waiting status
      socket.emit("ai_response", "Waiting...");

      const now = new Date();
      const hour = now.getHours();

      let weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${userLocation.lat}&longitude=${userLocation.lng}&hourly=temperature_2m,wind_speed_10m,precipitation,precipitation_probability&forecast_days=1`);
      console.log(userLocation.lat + "," + userLocation.lng);
      let weatherData = await weatherResponse.json();
      let currentTemp = await weatherData.hourly.temperature_2m[hour];
      if (units == "F") {
        currentTemp = (currentTemp * 9 / 5) + 32;
      }
      let currentWind = await weatherData.hourly.wind_speed_10m[hour];
      let currentRain = await weatherData.hourly.precipitation[hour];
      let currentRainChance = await weatherData.hourly.precipitation_probability[hour];
      console.log(currentTemp);
      console.log(currentWind);
      console.log(currentRain);
      console.log(currentRainChance);
      let prompt = `You are a helpful weather assistant.
                    Here is the weather data:
                    Temperature: ${currentTemp}°${units},
                    Precipitation: ${currentRain} mm,
                    Wind Speed: ${currentWind} km/h,
                    Chance of Rain: ${currentRainChance} %,
                    Current time (hour): ${hour} (0 is midnight and 23 is 11PM)
                    
                    Write a short, helpful summary for a student.
                    Include:
                    - What the weather feels like
                    - What they should do or wear
                    
                    Keep it under 4 sentences.
                    Make sure to integrate all the exact raw data figures into your response, except the current hour. 
                    `;
      // send a request and wait for the response
      const response = await fetch(API_BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL_ID,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed, status code: ${response.status}`);
      }

      const data = await response.json();

      // get the message
      const aiMessage = data.choices[0].message.content;

      // send back the response
      socket.emit("ai_response", aiMessage);
    } catch (error) {
      console.error("API error:", error);
      socket.emit("ai_response", `[Error]: ${error.message}`);
    }
  });

  // require location name
  socket.on("require_location_name", async (lat, lng) => {
    try {

      let locationNameResponse = await fetch(`https://us1.locationiq.com/v1/reverse?key=${GEO_API_KEY}&lat=${lat}&lon=${lng}&format=json`);
      let locationNameData = await locationNameResponse.json();

      // send back the response
      socket.emit("location_name_response", locationNameData);

    } catch (error) {
      console.error("API error:", error);
      socket.emit("location_name_response", `[Error]: ${error.message}`);
    }
  });

  // get the seven day forecast
  socket.on("get_seven", async () => {
    let sevenDayForecast = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${userLocation.lat}&longitude=${userLocation.lng}&daily=temperature_2m_max,temperature_2m_min,weather_code`);
    let sevenDayForecastInfo = await sevenDayForecast.json();
    socket.emit("sevenDayForecast", sevenDayForecastInfo);
  });

  socket.on("send_location", async (location, isCurrent) => {

    if (isCurrent) {
      currentUserLocation.lat = location.lat;
      currentUserLocation.lng = location.lng;
      console.log(`Current user location: lat_${currentUserLocation.lat}, lng_${currentUserLocation.lng}`);
    } else {
      userLocation.lat = location.lat;
      userLocation.lng = location.lng;
      console.log(`User location: lat_${userLocation.lat}, lng_${userLocation.lng}`);
    }

  });

  // search for location
  socket.on("search_for_location", async (searchText) => {
    try {

      console.log('User searches for: ' + searchText);

      // send back the waiting status
      socket.emit("location_response", "Waiting...");

      let locationResponse = await fetch(`https://us1.locationiq.com/v1/search?key=${GEO_API_KEY}&q=${searchText}&format=json&limit=20&bounded=0&importancesort=0&viewbox=${currentUserLocation.lng + 1},${currentUserLocation.lat + 1},${currentUserLocation.lng - 1},${currentUserLocation.lat - 1}`);
      let locationData = await locationResponse.json();

      console.log(locationData);

      // send back the waiting status
      socket.emit("location_response", locationData);

    } catch (error) {
      console.error("API error:", error);
    }
  });

  // disconnect
  socket.on("disconnect", () => {
    console.log("A client has disconnected.");
  });
});

// weather map proxy
app.get('/weather-proxy/:layer/:z/:x/:y', async (req, res) => {
  const { layer, z, x, y } = req.params;
  const url = `https://tile.openweathermap.org/map/${layer}/${z}/${x}/${y}.png?appid=${OPENWEATHER_API_KEY}`;

  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
      httpsAgent: mapboxAgent,
    });

    res.setHeader('Content-Type', response.headers['content-type']);
    response.data.pipe(res);
  } catch (error) {
    res.status(500).send('Error fetching tile');
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is up, visit http://localhost:${PORT}`);
});
