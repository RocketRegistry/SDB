(function(window, document) {
    function initArticleImageLightbox(root = document) {
        if (root.__articleImageLightboxInitialized) {
            return;
        }

        root.__articleImageLightboxInitialized = true;

        const overlay = document.createElement('div');
        overlay.className = 'lightbox-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.innerHTML = '<button class="lightbox-close" aria-label="Close image">×</button><img class="lightbox-image" alt=""><p class="lightbox-caption"></p>';
        document.body.appendChild(overlay);

        const imageEl = overlay.querySelector('.lightbox-image');
        const captionEl = overlay.querySelector('.lightbox-caption');
        const closeBtn = overlay.querySelector('.lightbox-close');

        const closeLightbox = () => {
            overlay.classList.remove('is-open');
            document.body.classList.remove('lightbox-open');
            imageEl.removeAttribute('src');
            captionEl.textContent = '';
        };

        const images = root.querySelectorAll('img');
        images.forEach((img) => {
            if (img.classList.contains('logo-icon') || img.closest('.navbar')) {
                return;
            }

            img.classList.add('zoomable-image');
            img.addEventListener('click', () => {
                imageEl.src = img.getAttribute('src');
                imageEl.alt = img.getAttribute('alt') || '';
                captionEl.textContent = img.getAttribute('title') || img.getAttribute('alt') || 'Expanded image';
                overlay.classList.add('is-open');
                document.body.classList.add('lightbox-open');
            });
        });

        closeBtn.addEventListener('click', closeLightbox);
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                closeLightbox();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeLightbox();
            }
        });
    }

    window.initArticleImageLightbox = initArticleImageLightbox;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initArticleImageLightbox();
        });
    } else {
        initArticleImageLightbox();
    }
})(window, document);
