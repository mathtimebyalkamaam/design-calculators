// Get the theme switch checkbox and the body element
const themeSwitch = document.getElementById('theme-switch');
const body = document.body;

// Function to apply the theme based on the 'isDark' boolean
function applyTheme(isDark) {
    if (isDark) {
        body.classList.add('dark-theme');
    } else {
        body.classList.remove('dark-theme');
    }
}

// Check for saved theme preference in localStorage on page load
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        themeSwitch.checked = true; // Set the checkbox state
        applyTheme(true); // Apply the dark theme
    } else {
        themeSwitch.checked = false; // Set the checkbox state
        applyTheme(false); // Apply the light theme (default)
    }
});

// Listen for changes on the theme switch checkbox
themeSwitch.addEventListener('change', () => {
    if (themeSwitch.checked) {
        applyTheme(true); // Apply dark theme
        localStorage.setItem('theme', 'dark'); // Save preference
    } else {
        applyTheme(false); // Apply light theme
        localStorage.setItem('theme', 'light'); // Save preference
    }
});