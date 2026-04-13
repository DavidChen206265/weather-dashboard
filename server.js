require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// AI API request variables
const API_BASE_URL = "https://api.cetaceang.qzz.io/v1/chat/completions";
const MODEL_ID = "gpt-oss-20b";

// after a client connected
io.on("connection", (socket) => {
  console.log("A client has connected.");

  // ask AI
  socket.on("ask_ai", async (question) => {
    try {
      // send back the waiting status
      socket.emit("ai_response", "Waiting...");
      
      let weatherResponse = await fetch("https://api.open-meteo.com/v1/forecast?latitude=48.4359&longitude=-123.3516&hourly=temperature_2m,wind_speed_10m,precipitation,precipitation_probability&forecast_days=1");
      let weatherData = await weatherResponse.json();
      let currentTemp = await weatherData.hourly.temperature_2m[0];
      let currentWind = await weatherData.hourly.wind_speed_10m[0];
      let currentRain = await weatherData.hourly.precipitation[0];
      let currentRainChance = await weatherData.hourly.precipitation_probability[0];
      console.log(currentTemp);
      console.log(currentWind);
      console.log(currentRain);
      console.log(currentRainChance);
      let prompt = `You are a helpful weather assistant.
                    Here is the weather data:
                    Temperature: ${currentTemp}°C,
                    Precipitation: ${currentRain} mm,
                    Wind Speed: ${currentWind} km/h,
                    Chance of Rain: ${currentRainChance} %,
                    
                    Write a short, helpful summary for a student.
                    Include:
                    - What the weather feels like
                    - What they should do or wear
                    
                    Keep it under 4 sentences.
                    Make sure to integrate all the exact raw data figures into your response. 
                    `;
      // send a request and wait for the response
      const response = await fetch(API_BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.API_KEY}`,
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

  // disconnect
  socket.on("disconnect", () => {
    console.log("A client has disconnected.");
  });
});




const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is up, visit http://localhost:${PORT}`);
});
