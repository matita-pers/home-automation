#ifndef PRECONDITIONS_H
#define PRECONDITIONS_H

#include "config.h"

#ifndef AP_SSID
#error "AP_SSID not defined"
#else
static_assert(sizeof(AP_SSID) > 1, "AP_SSID cannot be empty");
#endif

#ifndef MAX_401_RETRIES
#error "MAX_401_RETRIES not defined"
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

#endif // PRECONDITIONS_H
