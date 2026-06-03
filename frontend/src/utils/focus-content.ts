export const focusToMainContent = (delay: number = 0) => {
  setTimeout(() => {
    if (document.activeElement instanceof HTMLInputElement) {
      return;
    }

    let focusedBlock: HTMLElement | null = document.querySelector('main');
    if (focusedBlock.querySelector('.login-form')) {
      focusedBlock = focusedBlock.querySelector('input');
    } else if (focusedBlock.querySelector('h1')) {
      focusedBlock = focusedBlock.querySelector('h1');
    }
    focusedBlock?.focus();
  }, delay);
};
