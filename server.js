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
const MODEL_ID = "kimi-k2.5";

// after a client connected
io.on("connection", (socket) => {
  console.log("A client has connected.");

  // ask AI
  socket.on("ask_ai", async (question) => {
    try {
      // send back the waiting status
      socket.emit("ai_response", "Waiting...");

      // send a request and wait for the response
      const response = await fetch(API_BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL_ID,
          messages: [{ role: "user", content: question }],
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
