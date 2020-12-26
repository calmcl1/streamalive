# How To Install On A Raspberry Pi
Double-check that Python version 3 and GPIOZero is installed:
```bash
sudo apt install python3 python3-gpiozero
```

## Wiring Up the Pins
Choose a GPIO pin to use as the power supply for the LED. By default, this program uses pin 4 (with the USB ports facing you, this is on the left-hand column of pins, fourth one down.)
Also, identify a ground pin. For example, the nearest ground pin to GPIO pin 4 is board pin 6 (right-hand column, third one down,) but any ground pin can be used.

Then, wire the LED in the following fashion:

```
GPIO pin -> 330-Ohm Resistor -> LED (long leg)
Ground pin -> LED (short leg)
```

## Specifying the GPIO Pin To Use
If you don't want to use GPIO pin 4, you can use any GPIO pin.

For reference, here's a diagram showing the GPIO pin numbering: https://gpiozero.readthedocs.io/en/stable/recipes.html#pin-numbering
Pick any pin that has a 'GPIO' label. The GPIO pin number is the number in the label on the side, not the number in the circle!

When you have identified a pin, replace the number in `streamalive.py` under the variable `LED_GPIO_NUMBER`.

# Running the Software
Open a terminal (Ctrl + Alt + T on a Raspberry Pi) and `cd` to the place where `streamóalive.py` is.

Then, simply run:
```bash
python streamalive.py YOUR-STREAM-URL-HERE
```

Replace `YOUR-STREAM-URL-HERE` with the stream endpoint given to you by your streaming host - the same one that your users listen to.