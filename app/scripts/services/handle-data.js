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
    }
}