/**
 * @jest-environment jsdom
 */

import React from 'react';

import * as mobx from 'mobx';

import DownloadBackupModalState from '../../../app/scripts/react-directives/firmware-update/modal';

it('initializes without id', () => {

    const spyMakeAutoObservable = jest.spyOn(mobx, 'makeAutoObservable');
    const modalState = new DownloadBackupModalState();

    expect(modalState.id).toBe('downloadBackupModal');
    expect(modalState.active).toBe(false);
    expect(modalState.isFirstPage).toBe(true);
    expect(modalState.mode).toBe(undefined);
    expect(modalState.onCancel).toBe(undefined);
    expect(modalState.onDownloadClick).toBe(undefined);
    expect(spyMakeAutoObservable).toHaveBeenCalledWith(modalState);

});

it('initializes with id', () => {

        const spyMakeAutoObservable = jest.spyOn(mobx, 'makeAutoObservable');
        const modalState = new DownloadBackupModalState('test');

        expect(modalState.id).toBe('test');
        expect(modalState.active).toBe(false);
        expect(modalState.isFirstPage).toBe(true);
        expect(modalState.onCancel).toBe(undefined);
        expect(modalState.onDownloadClick).toBe(undefined);
        expect(spyMakeAutoObservable).toHaveBeenCalledWith(modalState);

});

it('downloads url', async () => {

    const dummyLink = document.createElement('a');
    jest.spyOn(document, 'createElement').mockReturnValue(dummyLink);
    jest.spyOn(document.body, 'appendChild');
    jest.spyOn(document.body, 'removeChild');
    jest.spyOn(dummyLink, 'click');
    jest.spyOn(dummyLink, 'setAttribute');
    const modalState = new DownloadBackupModalState();

    modalState.download('https://example.com');

    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(document.body.appendChild).toHaveBeenCalledWith(dummyLink);
    expect(dummyLink.setAttribute).toHaveBeenCalledWith('href', 'https://example.com');
    expect(dummyLink.setAttribute).toHaveBeenCalledWith('download', true);
    expect(dummyLink.style.display).toBe('none');
    expect(dummyLink.click).toHaveBeenCalled();
    expect(document.body.removeChild).toHaveBeenCalledWith(dummyLink);

});

it('shows modal', async () => {

    const modalState = new DownloadBackupModalState();
    const spyDownload = jest.spyOn(modalState, 'download');

    modalState.show('testvalue');

    expect(modalState.onCancel).not.toBe(undefined);
    expect(modalState.onDownloadClick).not.toBe(undefined);
    expect(modalState.isFirstPage).toBe(true);
    expect(modalState.active).toBe(true);
    expect(modalState.mode).toBe('testvalue');

    modalState.onCancel();

    expect(modalState.active).toBe(false);

    modalState.onDownloadClick();

    expect(modalState.isFirstPage).toBe(false);
    expect(spyDownload).toHaveBeenCalledWith('/fwupdate/download/rootfs');

});

afterEach(() => {
  jest.restoreAllMocks();
});
