### Control Types
The meta topic ```/devices/$SystemId/controls/$deviceUniqueControlId/meta/type``` defines different types of controls that decide which interface is shown to the user.

#### Switch
A control that toggles it's value when pressed by the user.
* Meta topic value: switch
* Possible values: 0 or 1

#### Push button
A stateless push button

* Meta topic value: pushbutton
* Possible values: 1
* Messages may lack retained flag


#### Range
A range slider that takes integer values between 0 and any other integer that is greater 1
* Meta topic value: range
* Possible values: 0 - max
* Default max: 255
Different values can be set by publishing an arbitrary integer that is greater than 1 to ```/devices/$SystemId/controls/$deviceUniqueControlId/meta/max```.

#### RGB color control
R/W control for color
* Meta topic value: pushbutton
* Possible values: "R;G;B" , i.e. three semicolon-delimited numbers.
The numbers itself must be integers between 0 and 255.


#### Text
A read-only control that displays it's value as text.
* Meta topic value: text
* Possible values: Anything

#### Generic value type control

A read-only control for a arbitrary value.

* Meta type value: "value"
* Possible values: float

Units should be specified in "meta/units" topic.



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
