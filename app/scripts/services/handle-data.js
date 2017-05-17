/**
 * Created by ozknemoy on 09.05.2017.
 */

export default function handleDataService() {
    this.copyToClipboard = (val)=> {
        var selBox = document.createElement('textarea');
        selBox.style.position = 'fixed';
        selBox.style.left = '0';
        selBox.style.top = '0';
        selBox.style.opacity = '0';
        selBox.value = val;//this.text.join('\r\n');

        document.body.appendChild(selBox);
        selBox.focus();
        selBox.select();

        document.execCommand('copy');
        document.body.removeChild(selBox);
    };

    // разница дат. при start=='now' считает от сегодня
// при end==='now' считает до сегодня с округлением в большую сторону
    // может показывать часы если меньше 1 дня
    this.diffDates = (start, end, showHours = false, plusOne = false)=> {
        if (!start || !end) return undefined;
        var endProj;
        end = end === 'now' ? +new Date() : +new Date(end);
        start = start === 'now' ? +new Date() : +new Date(start);
        var _endProj = (end - start) / (24 * 60 * 60000);
        _endProj = plusOne ? _endProj + 1 : _endProj;
        if (showHours && _endProj < 1) {
            //если часы то возвращаю строку а не число
            // отнимаю 4 часа для перевода времени
            endProj = '' + Math.floor(_endProj * 24 - 4)
        } else {
            endProj = Math.ceil(_endProj);
        }
        return (endProj > 0) ? endProj : 0;
    };


    // прибавляет дни к дате
    this.dayPlusNDays = (dayString, n, returnString = true)=> {
        let d = JSON.stringify(new Date(+new Date(dayString) + n * (24 * 60 * 60000))).slice(1, 11);
        return returnString ? d : new Date(d)
    };

    this.dayMinusNDays = (dayString,n, returnString = true)=> {
        let d = JSON.stringify(new Date(+new Date(dayString) - n * (24 * 60 * 60000))).slice(1, 11);
        return returnString ? d : new Date(d)
    };

    this.addZeroToDate = (d)=> {
        return d<10? '0' + d : d
    };

    this.dateYYYYMMDD = (date,withTime = false)=>  {
        if (!date) return null;
        date = typeof date ==='string'? new Date(date) : date;

        var ret = date.getFullYear()
            + "-" + this.addZeroToDate(date.getMonth() + 1)
            + "-" + this.addZeroToDate(date.getDate());
        ret = !withTime? ret : `${ret} ${this.addZeroToDate(date.getHours())}:${this.addZeroToDate(date.getMinutes())}:00`;
        return ret
    };


    // разбивает дни на сегменты из N дней
    // rangInterval параметр общей длины интервала графика если не указано значениt начала графика
    this.splitDate = (start, end, days = 10,rangInterval = days)=> {
        end = end? end : new Date();// если нету то = текущим дате и времени
        end = typeof end ==='string'? end : this.dateYYYYMMDD(end,true);

        start = start? start : this.dayMinusNDays(end,rangInterval);// если нету то = end - инетервал days
        start = typeof start ==='string'? start : this.dateYYYYMMDD(start,true);

        var diffDates = this.diffDates(start, end);
        if (diffDates <= days) return [start,end];
        var ret = [start];
        var iter = Math.floor(diffDates / days) + 1;
        for (var i = 1; i < iter; i++) {
            var actualD = this.dayPlusNDays(start, i * days);
            ret.push(actualD);
            // если последний проход и текущее значение не совпадает с end
            if (i === iter - 1 && actualD !== end) {
                ret.push(end);
            }
        }
        return ret
    };

}