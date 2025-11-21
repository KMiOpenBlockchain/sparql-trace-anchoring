function runAfterHTMLIncluded() {
    /***Cookie Banner ***/

    const cookieBanner = document.getElementById('cookie-banner');
    const noCookies = document.getElementById('no-cookies');

    if (!localStorage.getItem('cookieConsent')) {
        cookieBanner.style.display = 'block';
    }

    // Function to check if the user has given consent
    function hasConsent() {
        const consent = localStorage.getItem('cookieConsent');
        return consent !== null && consent === 'true';
    }

    noCookies.addEventListener('click', function () {
        localStorage.setItem('cookieConsent', 'true');
        cookieBanner.style.display = 'none';
        location.reload(true); // Reload the page to load Matomo Analytics
    });

    /*** End Cookie Banner ***/
};

document.addEventListener('DOMContentLoaded', function () {
    w3.includeHTML(runAfterHTMLIncluded);
});
	