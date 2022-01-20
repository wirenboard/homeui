Wiren Board MQTT Conventions
================================

The basic abstractions are *devices* and their *controls*. 

Each *device* has some *controls* assigned to it, i.e. parameters that can be controlled or monitored. *Devices* and *controls* are identified by names (arbitrary strings), and have some metadata. Metadata messages are published on device startup with `retained` flag set.
For example, some room lighting control *device* with one input (for wall switch) and one output (for controlling the lamp) *controls* is represented with MQTT topics as following:

* `/devices/RoomLight/meta/name` - 'Light in my room', human-friendly description of the *device*
* `/devices/RoomLight/meta/error` - device-level error state, non-null means there was an error (usable as Last Will and Testament)
* `/devices/RoomLight/controls/Lamp` - contains current lamp state, '0' = off, '1' = on
* `/devices/RoomLight/controls/Lamp/on` - send a message with this topic and payload of '0'/'1' to turn lamp off or on
* `/devices/RoomLight/controls/Lamp/meta/type` - 'switch' (binary value)
* `/devices/RoomLight/controls/Lamp/meta/order` - '1'
* `/devices/RoomLight/controls/Switch` - contains current wall switch state
* `/devices/RoomLight/controls/Switch/meta/type` - 'switch'
* `/devices/RoomLight/controls/Switch/meta/readonly` - '1', it doesn't make sense trying to control a wall switch over MQTT
* `/devices/RoomLight/controls/Switch/meta/error` - 'r', non-null value means there was an error reading or writing the control. In this case  `/devices/RoomLight/controls/Switch` contains last known good value.
* `/devices/RoomLight/controls/Switch/meta/order` - '2' a value that is used to arrange controls in some order (Lamp will be before Switch)

Each *device* usually represents the single physical device or one of the integrated peripheral of a complex physical device, although there are some boundary cases where the distinction is not clear. The small and not-so-complex real-world devices (say, wireless wheather sensor) are ought to be represented by a single *device* in the MQTT hierarchy. 
Each *device* must be handled by a single driver or publisher, though it's not enforced in any way.

The *Conventions* are based on [HomA MQTT Conventions](https://github.com/binarybucks/homA/wiki/Conventions). The main changes are: no configuration is stored in MQTT (as MQTT is not so good as a database) and the *control* types system is more developed and complicated.

### Control Types
The meta topic ```/devices/<device_id>/controls/<control_id>/meta/type``` defines different types of controls that decide which interface is shown to the user.

#### Switch
A control that toggles it's value when pressed by the user.
* Meta topic value: switch
* Possible values: 0 or 1

#### Alarm
A control that indicates whether an alarm is active.
* Meta topic value: alarm
* Possible values: 0 or 1

#### Push button
A stateless push button

* Meta topic value: pushbutton
* Possible values: 1
* Messages may lack retained flag


#### Range
A range slider that takes integer values between 0 and any other integer that is greater 1
* Meta topic value: range
* Possible values: min - max
* Default max: 255
* Defailt min: 0
Different values can be set by publishing an arbitrary integer that is in range from ```/devices/<device_id>/controls/<control_id>/meta/min``` to ```/devices/<device_id>/controls/<control_id>/meta/max```.

#### RGB color control
R/W control for color
* Meta topic value: rgb
* Possible values: "R;G;B" , i.e. three semicolon-delimited numbers.
The numbers itself must be integers between 0 and 255.


#### Text
A read-only control that displays it's value as text.
* Meta topic value: text
* Possible values: Anything

#### Generic value type control

A control for a arbitrary value.

* Meta type value: value
* Possible values: float
Different values can be set by publishing an arbitrary float that is in range from ```/devices/<device_id>/controls/<control_id>/meta/min``` to ```/devices/<device_id>/controls/<control_id>/meta/max```.
Units should be specified in ```/devices/<device_id>/controls/<control_id>/meta/units``` topic.
Precision could be specified in ```/devices/<device_id>/controls/<control_id>/meta/precision``` topic. The value is rounded to defined precision by a driver and it is also used by `wb-mqtt-homeui` during user input validation.

#### Specific value type controls

A read-only control for a certain type of value.

| Type 	| meta/type	| units  	| value format  	|   	|
|---	|---	|---	|---	|---	|
| Temperature  	| temperature| °C  	| float  	|   	|
| Relative humidity  	| rel_humidity| %, RH  	| float, 0 - 100  	|   	|
| Atmospheric pressure  	| atmospheric_pressure | millibar (100 Pa)  	| float  	|   	|
| Precipitation rate (rainfall rate) | rainfall | mm per hour | float | |
| Wind speed |  wind_speed | m/s | float | |
| Power |  power | watt | float | |
| Power consumption |  power_consumption | kWh | float | |
| Voltage |  voltage | volts | float | |
| Water flow | water_flow | m^3 / hour | float ||
| Water total consumption | water_consumption | m^3  | float ||
| Resistance | resistance | Ohm  | float ||
| Gas concentration | concentration | ppm  | float (unsigned) ||
| Heat power | heat_power | Gcal / hour | float ||
| Heat energy | heat_energy | Gcal | float ||


#### Errors

`/devices/+/controls/+/meta/error` topics can contain a combination of values:
- `r` - read from device error
- `w` - write to device error
- `p` - read period miss