#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "";
const char* password = "";
const char* serverUrl = "http://35.189.172.86/api/events";
const char* apiKey = "";

String previousMessage = ""; // Ensure the request is not sent twice

void setup() {
  Serial.begin(115200);  // For debugging
  Serial2.begin(9600, SERIAL_8N1, 16, 17);   // UART for micro:bit communication

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
}

void loop() {
  // Check for UART message from micro:bit
  if (Serial2.available()) {
    String message = Serial2.readStringUntil('\n');
    message.trim();
    // Serial2.println(message);
    
    if (message == "OPEN" || message == "CLOSED") {
      String status = message;
      status.toLowerCase();

      if (previousMessage != status){
        sendDoorEvent(status);
        previousMessage = status;
      }
    }
  }
}

void sendDoorEvent(String status) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-Key", apiKey);
    
    String payload = "{\"status\":\"" + status + "\"}";
    int httpCode = http.POST(payload);
    
    if (httpCode > 0) {
      Serial.printf("Event sent: %s (HTTP %d)\n", status.c_str(), httpCode);
    } else {
      Serial.printf("Error sending event: %s\n", http.errorToString(httpCode).c_str());
    }
    http.end();
  }
}