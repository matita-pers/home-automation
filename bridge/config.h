#ifndef CONFIG_H
#define CONFIG_H

#define DEVICE_ID "dhm1"
// the name of the ap that is used to configure the esp32
#define AP_SSID "ESP32_Config_AP"
#define MAX_401_RETRIES -1

// if prod is not defined we are running 
/*
there are 3 enviroment: 
 - prod (uses the vercel link)
 - local prod (flask)
 - dev (flask in debug mode)
*/
#ifndef PROD
#define SERVER_URL "http://10.10.100.1:8050"
#define WAIT_TIME 1000 * 15 /* 15s */
#elif PROD
#define SERVER_URL "https://domotica-matita008s-pers.vercel.app"
#define WAIT_TIME 1000 * 60 * 30 /* 30m */
#else
#define SERVER_URL "http://10.10.100.1:8080"
#define WAIT_TIME 1000 * 60 /* 1m */
#endif

#endif // defined CONFIG_H
