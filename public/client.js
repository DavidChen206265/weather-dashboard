const socket = io();

const chatWindow = document.getElementById("chat-window");
const userInput = document.getElementById("userInput");

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

// send message to server
function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  // show user's message in chatWindow
  chatWindow.innerHTML += `<div class="msg-user"><strong>You:</strong> ${text}</div>`;
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // send text to server
  socket.emit("ask_ai", text);
  
  userInput.value = ""; 
}

// press Enter to send the message
function checkEnter(e) {
  if (e.key === "Enter") sendMessage();
}
