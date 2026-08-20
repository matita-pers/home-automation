#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include <HTTPClient.h>

#include "config.h"

// check that config.h is configured properly
#ifndef MAX_401_RETRIES
#error "MAX_401_RETRIES not defined"
#elif MAX_401_RETRIES <= 0
#error "MAX_401_RETRIES must be greater than 0"
#endif

#ifndef DEVICE_ID
#error "DEVICE_ID not defined"
#else
static_assert(sizeof(DEVICE_ID) > 1, "DEVICE_ID cannot be empty");
#endif

#ifndef SERVER_URL
#error "SERVER_URL not defined"
#else
static_assert(sizeof(SERVER_URL) > 1, "SERVER_URL cannot be empty");
#endif

Preferences prefs;
WebServer server(80);

String ssid;
String password;
String token;

bool isAPMode = false;
int unauthCount = 0;

const char* AP_SSID = "ESP32_Config_AP";

void handleRoot() {
    String html = "<!DOCTYPE html><html><body style='font-family:sans-serif;'>";
    html += "<h2>ESP32 Network & Auth Setup</h2>";
    html += "<form method='POST' action='/save'>";
    html += "<label>WiFi SSID:</label><br>";
    html += "<input type='text' name='ssid' required><br><br>";
    html += "<label>WiFi Password:</label><br>";
    html += "<input type='password' name='password'><br><br>";
    html += "<label>Auth Token:</label><br>";
    html += "<input type='text' name='token' required><br><br>";
    html += "<input type='submit' value='Save & Connect'>";
    html += "</form></body></html>";
    
    server.send(200, "text/html", html);
}

void handleSave() {
    if (server.hasArg("ssid") && server.hasArg("token")) {
        ssid = server.arg("ssid");
        password = server.arg("password");
        token = server.arg("token");

        // Save credentials to Flash (NVS)
        prefs.begin("config", false);
        prefs.putString("ssid", ssid);
        prefs.putString("password", password);
        prefs.putString("token", token);
        prefs.end();

        server.send(200, "text/html", "<h3>Saved! Restarting ESP32...</h3>");
        
        delay(1000);
        ESP.restart(); // Reboot to apply and enter Station mode
    } else {
        server.send(400, "text/plain", "Error: Missing SSID or Token");
    }
}

// ------------------------------------------------------------------------------
// Core Logic
// ------------------------------------------------------------------------------
void startAPMode() {
    isAPMode = true;
    WiFi.mode(WIFI_AP);
    WiFi.softAP(AP_SSID);
    
    server.on("/", handleRoot);
    server.on("/save", HTTP_POST, handleSave);
    server.begin();
}

void setup() {
    Serial.begin(115200);
    delay(1000);

    // Read config from Flash
    // The 'true' parameter opens preferences in Read-Only mode
    prefs.begin("config", true);
    ssid = prefs.getString("ssid", "");
    password = prefs.getString("password", "");
    token = prefs.getString("token", "");
    prefs.end();

    // Check if device is unconfigured
    if (ssid == "" || token == "") {
        startAPMode();
    } else {
        // Attempt to connect to WiFi
        WiFi.mode(WIFI_STA);
        WiFi.begin(ssid.c_str(), password.c_str());
        
        int retries = 0;
        while (WiFi.status() != WL_CONNECTED && retries < 20) {
            delay(500);
            retries++;
        }

        // If it fails to connect, fallback to AP mode so user can fix credentials
        if (WiFi.status() != WL_CONNECTED) {
            startAPMode();
        }
    }
}

void loop() {
    if (isAPMode) {
        // Just serve the config page
        server.handleClient();
    } else {
        // Station Mode: Push telemetry data
        if (WiFi.status() == WL_CONNECTED) {
            HTTPClient http;
            
            // Build URL with DEVICE_ID as requested
            String url = String(SERVER_URL) + DEVICE_ID;
            
            // 10 second timeout for Vercel cold starts
            http.setTimeout(10000);
            http.begin(url);
            http.addHeader("Content-Type", "application/json");
            http.addHeader("X-API-Key", token);

            // TODO: Replace with real sensor reads
            String payload = "{\"sensor_1\": 24.5, \"sensor_2\": 60.1}"; 
            
            int httpCode = http.POST(payload);

            if (httpCode == 401) {
                unauthCount++;
                if (unauthCount >= MAX_401_RETRIES) {
                    // Void the token in flash
                    prefs.begin("config", false);
                    prefs.remove("token"); 
                    prefs.end();
                    
                    // Restart to trigger AP mode on next boot
                    ESP.restart(); 
                }
            } else if (httpCode == 200 || httpCode == 201) {
                // Reset counter on successful transmission
                unauthCount = 0; 
            }
            
            http.end();
        }
        
        // Wait before next transmission
        delay(5000); 
    }
}
