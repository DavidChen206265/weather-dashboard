const socket = io();

const chatWindow = document.getElementById("chat-window");
const userInput = document.getElementById("userInput");
const unitButton = document.getElementById("unitsButton");

// connected to the server
socket.on("connect", () => {
  chatWindow.innerHTML =
    '<div style="color: green;">System: Conncected to the server.</div>';
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

let units = "C";

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
// send message to server
function sendMessage() {
  const location = "";
  
  // send text to server
  socket.emit("ask_ai", location, units);
}

// press Enter to send the message
function checkEnter(e) {
  if (e.key === "Enter") sendMessage();
}
