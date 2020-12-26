from urllib.request import urlopen
import sys
from gpiozero import LED
from time import sleep

# What number GPIO pin is the LED wired to?
# Use this standard: https://gpiozero.readthedocs.io/en/stable/recipes.html#pin-numbering
# On this diagram, use the number on the label, not the number in the circle!
LED_GPIO_NUMBER = 4

# How often (in seconds) should we check that the stream is up?
STREAM_CHECK_INTERVAL = 5

### You shouldn't need to edit below this line! ###

StreamOffLED = LED(LED_GPIO_NUMBER, initial_value=False)

while True:
    try:
        resp = urlopen(sys.argv[1], timeout=5)

        if(resp.info().items()):
            if "audio" in resp.headers.get("content-type"):
                # all is well, turn the light off
                StreamOffLED.off()
            else:
                raise TypeError(
                    "Request did not respond with an audio mime-type!")

    except TypeError as e:
        # all is not well, turn the light on!
        StreamOffLED.on()
        print(f"{stream}"())

    sleep(STREAM_CHECK_INTERVAL)
