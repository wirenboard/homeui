/**
 * Created by ozknemoy on 09.05.2017.
 */

export default function handleDataService() {
    this.copyToClipboard = (val)=> {
        var activeElement = document.activeElement;
    
        var selBox = document.createElement('textarea');
        selBox.style.position = 'fixed';
        selBox.style.left = '0';
        selBox.style.top = '0';
        selBox.style.opacity = '0';
        selBox.value = val;
    
        document.body.appendChild(selBox);
        selBox.focus();
        selBox.select();
    
        document.execCommand('copy');
        document.body.removeChild(selBox);
    
        if (activeElement) {
            activeElement.focus();
        }
    };

    // разница дат в минутах
    this.diffDatesInMinutes = (start, end) => {
        const s = new Date(start),
            e = new Date(end);
        return ((+end) - (+start)) /  60000
    };

    this.getOffset = function () {
        return (new Date).getTimezoneOffset();
    };

    // разбивает дни на сегменты из N дней
    // rangInterval параметр длины интервала графика если не указана начальная точка
    // start, end  - Date() или undefined
    this.splitDate = (start, end, days = 10,rangInterval = 1)=> {
        var _end = end? end : new Date();// если нету то = текущим дате и времени
        // если нету то = end - инетервал days вместе с минутами
        var _start = start ? start :  new Date(+_end - 24 * 60 * 60 * 1000 * rangInterval);

        var diffDays = (_end - _start) / 1000/ 60/ 60/ 24;
        // здесь и ниже: не _end, а исходный end: если конец интервала не был задан, то нам нужно будет так и запрашивать последний чанк с открытым концом
        if (diffDays <= days) return [_start, end];
        var ret = [_start];
        var iter = Math.floor(diffDays / days) + 1;
        console.log(iter);
        for (var i = 1; i < iter; i++) {
            var actualD = new Date(+_start + i * days * 24 * 60 * 60 * 1000);
            if (actualD < _end) {
                ret.push(actualD);
            }
        }
        ret.push(end);
        return ret
    };

    this.historyStartTS = () => {
        var d = new Date();
        d.setTime(new Date().getTime());
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    }

}
