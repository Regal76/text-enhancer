window.addEventListener('DOMContentLoaded', () => {
    const { electronAPI } = window;
    const input = document.getElementById('instructionInput');
    const submitBtn = document.getElementById('submitBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    if (!electronAPI) {
        console.error('electronAPI is not available. Preload failed.');
        return;
    }

    function submit() {
        const instruction = input.value.trim();
        if (instruction) {
            electronAPI.submitCustomPrompt(instruction);
        } else {
            electronAPI.cancelCustomPrompt();
        }
    }

    function cancel() {
        electronAPI.cancelCustomPrompt();
    }

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancel();
        }
    });

    submitBtn.addEventListener('click', submit);
    cancelBtn.addEventListener('click', cancel);

    if (electronAPI.onResetDialog) {
        electronAPI.onResetDialog(() => {
            input.value = '';
            input.focus();
        });
    }

    input.focus();
});
