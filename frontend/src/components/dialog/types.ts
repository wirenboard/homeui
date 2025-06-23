export interface DialogProps {
  isOpened: boolean;

  // Mimics the `closedby` attribute of dialog
  // https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog#closedby
  closedby?: 'any' | 'closerequest';

  onClose: () => void;
}
