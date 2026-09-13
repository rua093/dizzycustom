(() => {
  if (window.dizzyMagnifyInitialized) return;
  window.dizzyMagnifyInitialized = true;

  const zoomRatio = 2;

  function setSpinner(image, isLoading) {
    const spinner = image.closest('.product__modal-opener')?.querySelector('.loading__spinner');
    spinner?.classList.toggle('hidden', !isLoading);
  }

  function positionOverlay(overlay, image, event) {
    const bounds = image.getBoundingClientRect();
    const x = Math.min(Math.max(event.clientX - bounds.left, 0), bounds.width);
    const y = Math.min(Math.max(event.clientY - bounds.top, 0), bounds.height);

    overlay.style.backgroundPosition = `${(x / bounds.width) * 100}% ${(y / bounds.height) * 100}%`;
  }

  function openMagnifier(image, event) {
    const media = image.parentElement;
    if (!media || media.querySelector('.image-magnify-full-size')) return;

    const source = image.currentSrc || image.src;
    const preloadImage = new Image();
    const overlay = document.createElement('div');
    overlay.className = 'image-magnify-full-size';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.style.backgroundColor = 'var(--gradient-background)';
    overlay.style.backgroundImage = `url("${source.replaceAll('"', '\\"')}")`;
    overlay.style.backgroundSize = `${image.clientWidth * zoomRatio}px`;

    const close = () => overlay.remove();
    overlay.addEventListener('click', close);
    overlay.addEventListener('mousemove', (moveEvent) => positionOverlay(overlay, image, moveEvent));

    setSpinner(image, true);
    preloadImage.onload = () => {
      setSpinner(image, false);
      if (!image.isConnected || media.querySelector('.image-magnify-full-size')) return;
      media.insertBefore(overlay, image);
      positionOverlay(overlay, image, event);
    };
    preloadImage.onerror = () => setSpinner(image, false);
    preloadImage.src = source;
  }

  // Event delegation also covers product images injected later by Quick Detail.
  document.addEventListener('click', (event) => {
    const image = event.target.closest('.image-magnify-hover');
    if (!image || image.closest('.product__media-list')?.dataset.galleryDragEnded === 'true') return;
    openMagnifier(image, event);
  }, true);
})();
