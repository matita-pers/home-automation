#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include <HTTPClient.h>

#define VERSION "0.0.1"
//#define PROD false

#include "config.h"
// compile-time checks of configs are here
#include "preconditions.h"

Preferences prefs;
WebServer server(80);

String ssid;
String password;
String token;

const String url = SERVER_URL "/internal/device/" DEVICE_ID "/bulk";

bool isAPMode = false;
int unauthCount = 0;

void setupPage() {
    String html = "<!DOCTYPE html><html><body style='font-family:sans-serif;'>";
    html += "<h2>ESP32 Network & Auth Setup</h2>";
    html += "<p>Device id: <b>" DEVICE_ID "</b></p>";
    html += "<form method='POST' action='/save'>";
    html += "<label>WiFi SSID:</label><br>";
    html += "<input type='text' name='ssid' default='" + ssid + "' required><br><br>";
    html += "<label>WiFi Password:</label><br>";
    html += "<input type='text' name='password' default='" + password + "' ><br><br>";
    html += "<label>Auth Token:</label><br>";
    html += "<input type='text' name='token' default='" + token + "' required><br><br>";
    html += "<input type='submit' value='Save & Connect'>";
    html += "</form></body></html>";

    server.send(200, "text/html", html);
}

void handleSave() {
    if (!(server.hasArg("ssid") || server.hasArg("token"))) {
        server.send(400, "text/plain", "Error: Missing SSID or Token");
        return;
    }
    ssid = server.arg("ssid");
    password = server.arg("password");
    token = server.arg("token");

    prefs.begin("config", false);
    prefs.putString("ssid", ssid);
    prefs.putString("password", password);
    prefs.putString("token", token);
    prefs.end();

    server.send(200, "text/html", "<h3>Saved! Restarting ESP32...</h3>");

    delay(1000);
    ESP.restart(); // Reboot to apply and enter Station mode
}

void startAPMode() {
    isAPMode = true;
    WiFi.mode(WIFI_AP);
    WiFi.softAP(AP_SSID);
    
    server.on("/", setupPage);
    server.on("/save", HTTP_POST, handleSave);
    server.begin();
}

void setup() {
    Serial.begin(9600);
    
    // Read config from Flash
    // The 'true' parameter opens preferences in Read-Only mode
    prefs.begin("config", true);
    ssid = prefs.getString("ssid", "");
    password = prefs.getString("password", "");
    token = prefs.getString("token", "");
    prefs.end();

    delay(250);

    while (Serial.available())

    if (ssid == "" || token == "") {
        startAPMode();
        Serial.println("wifi creds missing");
        return;
    }

    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid.c_str(), password.c_str());
    WiFi.setAutoReconnect(true);
    
    //20 is an arbitrary large number
    int retries = 0;
    while (WiFi.status() != WL_CONNECTED && retries < 20) {
        retries++;
        //use increasing wait time. why? idk, a fixed one felt wrong
        delay(500 * retries);
        Serial.println("wifi not connected...");
    }

    // If it fails to connect after 20 tries, fallback to AP mode so user can fix credentials
    if (WiFi.status() != WL_CONNECTED) {
        startAPMode();
        Serial.println("wifi creds wrong");
    }

    Serial.println("Starting...");
    Serial.println("url=" + url);
    Serial.println("sid=" + ssid);
    Serial.println("pwd=" + password);
    Serial.println("token=" + token);
}

void loop() {
    if (isAPMode) {
        server.handleClient();
        return;
    }

    if (WiFi.status() != WL_CONNECTED) {
        WiFi.reconnect();
        Serial.print("WiFi: st:");
        Serial.print(WiFi.status());
        Serial.println("; manual reconneconnection");
        delay(1000); // wait a second
        return;
    }
    HTTPClient http;
    
    http.setTimeout(10000); //10s
    http.begin(url);
    http.addHeader("Content-Type", "text/plain");
    http.addHeader("Authorization", "Basic: " DEVICE_ID " " + token);
    http.setUserAgent("esp32bridge-" DEVICE_ID "/" VERSION);

    // TODO: Replace with real sensor reads
    String payload = "<example:1.4;time:15;sent:19;>"; 

    int httpCode = http.POST(payload);
    Serial.print("sent data, got: ");
    Serial.println(httpCode);

    if (MAX_401_RETRIES > 0) {
        if (httpCode == 401 || httpCode == 404 || httpCode == 403) {
            unauthCount++;
            if (unauthCount >= MAX_401_RETRIES) {
                // Void the token in flash
                prefs.begin("config", false);
                prefs.remove("token"); 
                prefs.end();
                
                // Restart to trigger AP mode on next boot
                ESP.restart();
            }
        } else if (httpCode >= 200 && httpCode < 300) {
            // Reset counter on successful transmission
            unauthCount = 0; 
        }
    }
    
    http.end();
    
    delay(WAIT_TIME);
}
