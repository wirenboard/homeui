export const focusToMainContent = (delay: number = 0) => {
  setTimeout(() => {
    let focusedBlock: HTMLElement | null
      = document.querySelector('main.page')
      || document.querySelector('#page-wrapper');

    if (focusedBlock.querySelector('h1')) {
      focusedBlock = focusedBlock.querySelector('h1');
    }
    focusedBlock?.focus();
  }, delay);
};
