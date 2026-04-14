const socket = io();

const chatWindow = document.getElementById("chat-window");
const userInput = document.getElementById("userInput");
const unitButton = document.getElementById("unitsButton");

// location
let userLocation = {lat: 48.4359, lng: -123.3516};

let units = "C";


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

// send message to server
function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  // show user's message in chatWindow
  chatWindow.innerHTML += `<div class="msg-user"><strong>You:</strong> ${text}</div>`;
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // send text to server
  socket.emit("ask_ai", units);
  
  userInput.value = ""; 
}

// press Enter to send the message
function checkEnter(e) {
  if (e.key === "Enter") sendMessage();
}

// send user location to server
function sendUserLocation() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {

        // get the location
        userLocation.lat = position.coords.latitude;
        userLocation.lng = position.coords.longitude;
        console.log(`User location: lat_${userLocation.lat}, lng_${userLocation.lng}`);
        
        // send location to server
        socket.emit("send_location", userLocation);
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

function switchUnits(){
  if(units == "C"){
    units = "F";
    unitButton.innerHTML = "°F";
  }else{
    units = "C";
    unitButton.innerHTML = "°C";
  }
  console.log("Units:" + units);
}
