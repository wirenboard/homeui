import React from 'react';

import FirmwareUpdateStore from '../../../app/scripts/react-directives/firmware-update/store';

it("initializes store", () => {

    let store = new FirmwareUpdateStore();

    expect(store.destination).toBe("/fwupdate/upload");
    expect(store.accept).toBe(".fit");
    expect(store.expandRootfs).toBe(false);
    expect(store.receivedFirstStatus).toBe(false);
    expect(store.uploading).toBe(false);
    expect(store.running).toBe(false);
    expect(store.progressPercents).toBe(0);
    expect(store.logRows).toEqual([]);
    expect(store.stateType).toBe("");
    expect(store.stateMsg).toBe("");
    expect(store.doneLabel).toBe("");
    expect(store.isDone).toBe(false);
    expect(store.error).toBe(null);
    expect(store._mqttStatusIsSet).toBe(false);
    expect(store._timer).toBe(null);
    expect(store.modalState).toBeDefined();
    expect(store.modalState.id).toBe("downloadBackupModal");

});

it("sets expandRootfs", () => {

    let store = new FirmwareUpdateStore();

    store.setExpandRootfs(true);
    expect(store.expandRootfs).toBe(true);

    store.setExpandRootfs(false);
    expect(store.expandRootfs).toBe(false);

});

it("adds log row", () => {

    let store = new FirmwareUpdateStore();

    store.addLogRow("row1");
    expect(store.logRows).toEqual(["row1"]);

    store.addLogRow("row2");
    expect(store.logRows).toEqual(["row1", "row2"]);

});

it("clears log", () => {

    let store = new FirmwareUpdateStore();

    store.addLogRow("row1");
    store.addLogRow("row2");
    expect(store.logRows).toEqual(["row1", "row2"]);

    store.clearLog();
    expect(store.logRows).toEqual([]);

});

it("shows state", () => {

    let store = new FirmwareUpdateStore();

    store.showState("type1", "msg1");
    expect(store.stateType).toBe("type1");
    expect(store.stateMsg).toBe("msg1");

    store.showState("type2", "msg2");
    expect(store.stateType).toBe("type2");
    expect(store.stateMsg).toBe("msg2");

});

it("shows done button", () => {

    let store = new FirmwareUpdateStore();

    store.showDoneButton("msg1");
    expect(store.isDone).toBe(true);
    expect(store.doneLabel).toBe("msg1");
    expect(store._mqttStatusIsSet).toBe(false);

    store.showDoneButton();
    expect(store.isDone).toBe(true);
    expect(store.doneLabel).toBe("system.buttons.dismiss");
    expect(store._mqttStatusIsSet).toBe(false);

});

it("handles done click", () => {

    let store = new FirmwareUpdateStore();

    store.isDone = true;
    store.running = true;
    store.uploading = true;
    store.logRows = ["row1", "row2"];

    store.onDoneClick();
    expect(store.isDone).toBe(false);
    expect(store.running).toBe(false);
    expect(store.uploading).toBe(false);
    expect(store.logRows).toEqual([]);

});

it("sets timeout with clear", () => {

    jest.useFakeTimers();
    jest.spyOn(global, 'setTimeout');
    jest.spyOn(global, 'clearTimeout');
    const spyShowState = jest.spyOn(FirmwareUpdateStore.prototype, 'showState');
    const spyShowDoneButton = jest.spyOn(FirmwareUpdateStore.prototype, 'showDoneButton');
    const store = new FirmwareUpdateStore();
    store._timer = 31337;

    store.setTimeout(1000, "message");

    expect(store.running).toBe(true);
    expect(store._timer).not.toBe(null);
    expect(clearTimeout).toHaveBeenCalledWith(31337);
    expect(setTimeout).toHaveBeenCalled();
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000000);
    expect(spyShowState).not.toBeCalled();
    expect(spyShowDoneButton).not.toBeCalled();

    jest.runAllTimers();

    expect(store._timer).toBe(null);
    expect(spyShowState).toHaveBeenCalledWith("danger", "message");
    expect(spyShowDoneButton).toHaveBeenCalled();

});

it("sets timeout without clear", () => {

    jest.useFakeTimers();
    jest.spyOn(global, 'setTimeout');
    jest.spyOn(global, 'clearTimeout');
    const spyShowState = jest.spyOn(FirmwareUpdateStore.prototype, 'showState');
    const spyShowDoneButton = jest.spyOn(FirmwareUpdateStore.prototype, 'showDoneButton');
    const store = new FirmwareUpdateStore();

    store.setTimeout(1000, "message");

    expect(store.running).toBe(true);
    expect(store._timer).not.toBe(null);
    expect(clearTimeout).not.toBeCalled();
    expect(setTimeout).toHaveBeenCalled();
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000000);
    expect(spyShowState).not.toBeCalled();
    expect(spyShowDoneButton).not.toBeCalled();

    jest.runAllTimers();

    expect(store._timer).toBe(null);
    expect(spyShowState).toHaveBeenCalledWith("danger", "message");
    expect(spyShowDoneButton).toHaveBeenCalled();

});

it("sets progress timeout", () => {

    const spySetTimeout = jest.spyOn(FirmwareUpdateStore.prototype, 'setTimeout');
    const store = new FirmwareUpdateStore();

    store.setProgressTimeout();

    expect(spySetTimeout).toHaveBeenCalled();
    expect(spySetTimeout).toHaveBeenCalledWith(60, 'system.errors.stalled');

});

it("sets reboot timeout", () => {

    const spySetTimeout = jest.spyOn(FirmwareUpdateStore.prototype, 'setTimeout');
    const store = new FirmwareUpdateStore();

    store.setRebootTimeout();

    expect(spySetTimeout).toHaveBeenCalled();
    expect(spySetTimeout).toHaveBeenCalledWith(300, 'system.errors.reboot');

});

it("clears timeout", () => {

        jest.useFakeTimers();
        jest.spyOn(global, 'clearTimeout');
        const store = new FirmwareUpdateStore();
        store._timer = 31337;

        store.clearTimeouts();

        expect(store._timer).toBe(null);
        expect(clearTimeout).toHaveBeenCalledWith(31337);

});

it('can upload', () => {

    const store = new FirmwareUpdateStore();
    store.uploading = false;
    store.running = false;
    store.receivedFirstStatus = true;

    expect(store.canUpload).toBe(true);

    store.uploading = false;
    store.running = false;
    store.receivedFirstStatus = false;

    expect(store.canUpload).toBe(false);

    store.uploading = false;
    store.running = true;
    store.receivedFirstStatus = true;

    expect(store.canUpload).toBe(false);

    store.uploading = true;
    store.running = false;
    store.receivedFirstStatus = true;

    expect(store.canUpload).toBe(false);

});

it('in progress', () => {

        const store = new FirmwareUpdateStore();
        store.uploading = false;
        store.running = false;

        expect(store.inProgress).toBe(false);


        store.uploading = true;
        store.running = false;

        expect(store.inProgress).toBe(true);

        store.uploading = false;
        store.running = true;

        expect(store.inProgress).toBe(true);

        store.uploading = true;
        store.running = true;

        expect(store.inProgress).toBe(true);

});

it('on upload start', () => {

    spyCLearLog = jest.spyOn(FirmwareUpdateStore.prototype, 'clearLog');
    spyShowState = jest.spyOn(FirmwareUpdateStore.prototype, 'showState');
    const store = new FirmwareUpdateStore();
    store.uploading = false;
    store.progressPercents = 95;

    store.onUploadStart();

    expect(store.uploading).toBe(true);
    expect(store.progressPercents).toBe(0);
    expect(spyCLearLog).toHaveBeenCalled();
    expect(spyShowState).toHaveBeenCalledWith("info", "system.states.uploading");

});

afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
});
