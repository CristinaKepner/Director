export function bindStartDialog(state) {
  const dialog = state.root.querySelector("dialog");
  dialog.addEventListener("cancel", () => {
    state.dismissed = true;
  });
  state.openGuide = () => setDialog(state, dialog, true);
  state.closeGuide = () => setDialog(state, dialog, false);
}
export function syncStartDialog(state, empty) {
  const dialog = state.root.querySelector("dialog");
  if (!empty && dialog.open) dialog.close();
  if (empty && !state.dismissed && !dialog.open) dialog.showModal();
}

function setDialog(state, dialog, open) {
  state.dismissed = !open;
  if (open) dialog.showModal();
  else dialog.close();
}
