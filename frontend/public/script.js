window.Module =
  {
    serial: new SerialPort(),

    async request(type, data) {
      let json = JSON.stringify(data);

      function wait(resolve) {
        if (this.finished) {
          resolve();
          return;
        }

        setTimeout(wait.bind(this, resolve), 1);
      }

      this.finished = false;

      switch (type) {
        case 'configGetDeviceTypes': this.configGetDeviceTypes(json); break;
        case 'configGetSchema': this.configGetSchema(json); break;
        case 'portScan': this.portScan(json); break;
        case 'deviceLoadConfig': this.deviceLoadConfig(json); break;
        case 'deviceSet': this.deviceSet(json); break;
      }

      await new Promise(wait.bind(this));
      return this.reply;
    },

    parseReply(reply) {
      this.reply = JSON.parse(reply);

      if (this.reply.error)
        this.print('request error ' + this.reply.error.code + ': ' + this.reply.error.message);

      this.finished = true;
    },

    setStatus(text) {
      this.print(text);
    },

    print(text) {
      console.log(text);
    },
  };

class PortScan {
  baudRate = [115200, 57600, 38400, 19200, 9600, 4800, 2400, 1200];
  parity = ['N', 'E', 'O'];

  async request(start) {
    let request =
      {
        command: 96,
        mode: start ? 'start' : 'next',
        baud_rate: this.baudRate[this.baudRateIndex],
        data_bits: 8,
        parity: this.parity[this.parityIndex],
        stop_bits: 2,
      };

    return await Module.request('portScan', request);
  }

  async exec() {
    let devices = new Array();
    let start = true;

    this.baudRateIndex = 0;

    while (this.baudRateIndex < this.baudRate.length) {
      this.parityIndex = 0;

      while (this.parityIndex < this.parity.length) {
        let reply = await this.request(start);

        if (reply.result?.devices?.length) {
          reply.result.devices.forEach((device) => devices.push(device));
          start = false;
          continue;
        }

        this.parityIndex++;
        start = true;
      }

      this.baudRateIndex++;
      start = true;
    }

    return { devices: devices };
  }
}

window.PortScan = PortScan;
