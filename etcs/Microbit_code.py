from microbit import *
import music

# Calibrate the compass on first run
compass.calibrate()

uart.init(baudrate=9600, tx=pin1, rx=pin2)

check = 0

THRESHOLD = 100000

while True:
    field_strength = abs(compass.get_x())
    # print(field_strength)

    if field_strength < THRESHOLD:
        # Show warning, send data to ESP32
        if (check == 1):
            check = 0
            display.show(Image.SKULL)
            music.play(music.POWER_DOWN)
            uart.write("OPEN\n")
        else:
            sleep(250)
            check = 1
    else:
        display.show(Image.SMILE)
        uart.write("CLOSED\n")