if (!customElements.get('media-gallery')) {
  customElements.define(
    'media-gallery',
    class MediaGallery extends HTMLElement {
      constructor() {
        super();
        this.initialized = false;
        queueMicrotask(() => this.initialize());
      }

      connectedCallback() {
        this.initialize();
      }

      initialize() {
        if (this.initialized) return;

        this.elements = {
          liveRegion: this.querySelector('[id^="GalleryStatus"]'),
          viewer: this.querySelector('[id^="GalleryViewer"]'),
          thumbnails: this.querySelector('[id^="GalleryThumbnails"]'),
        };
        if (!this.elements.viewer || !this.elements.thumbnails) return;

        this.initialized = true;
        this.dataset.galleryControlsReady = 'true';
        this.pendingMediaId = undefined;
        this.mql = window.matchMedia('(min-width: 750px)');
        this.enableDesktopViewerDrag();
        this.enableDesktopThumbnailDrag();
        this.elements.thumbnails.querySelectorAll('[data-target] > button').forEach((button) => {
          button.addEventListener('click', (event) => {
            event.preventDefault();
            this.setActiveMedia(button.closest('[data-target]').dataset.target, false);
          });
        });

        this.elements.viewer.addEventListener('slideChanged', debounce(this.onSlideChanged.bind(this), 500));
        this.updateListSemantic();
        this.mql.addEventListener('change', () => this.updateListSemantic());
      }

      enableDesktopViewerDrag() {
        const slider = this.elements.viewer?.slider;
        if (!slider || !this.dataset.desktopLayout.includes('thumbnail')) return;

        this.enableDesktopMouseDrag(slider, {
          onPointerDown: () => {
            this.preserveThumbnailScroll = false;
          },
          canStart: (event) => {
            if (event.target.closest('.product-media-gallery__viewer-buttons, model-viewer, iframe')) return false;

            const video = event.target.closest('video');
            return !video || event.clientY < video.getBoundingClientRect().bottom - 56;
          },
          onDragEnd: ({ startScrollLeft, deltaX }) => {
            const slides = Array.from(slider.children).filter((slide) => slide.clientWidth > 0);
            if (!slides.length) return;

            const startSlide = slides.reduce((closest, slide) =>
              Math.abs(slide.offsetLeft - startScrollLeft) < Math.abs(closest.offsetLeft - startScrollLeft)
                ? slide
                : closest
            );
            const startIndex = slides.indexOf(startSlide);
            const swipeThreshold = Math.min(slider.clientWidth * 0.2, 140);
            const targetIndex =
              Math.abs(deltaX) > swipeThreshold
                ? Math.min(Math.max(startIndex + (deltaX < 0 ? 1 : -1), 0), slides.length - 1)
                : startIndex;

            slider.scrollTo({
              left: slides[targetIndex].offsetLeft,
              behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
            });
          },
        });
      }

      enableDesktopThumbnailDrag() {
        const slider = this.elements.thumbnails?.slider;
        if (!slider || !this.dataset.desktopLayout.includes('thumbnail')) return;

        this.enableDesktopMouseDrag(slider, {
          canStart: () => slider.scrollWidth > slider.clientWidth,
          onPointerDown: () => {
            this.thumbnailPointerActive = true;
          },
          onTap: (target) => {
            this.thumbnailPointerActive = false;
            const thumbnail = target.closest('[data-target]');
            if (thumbnail) this.setActiveMedia(thumbnail.dataset.target, false);
          },
          onDragEnd: () => {
            this.thumbnailPointerActive = false;
            this.preserveThumbnailScroll = true;
          },
        });
      }

      enableDesktopMouseDrag(slider, { canStart, onPointerDown = () => {}, onTap, onDragEnd = () => {} }) {
        let pointerId;
        let startX;
        let startScrollLeft;
        let deltaX;
        let pendingScrollLeft;
        let scrollFrame;
        let hasDragged = false;
        let pointerActionEnd;
        let pressTarget;
        let inlineScrollBehavior;

        const updateScrollPosition = () => {
          scrollFrame = undefined;
          slider.scrollLeft = pendingScrollLeft;
        };

        const flushScrollPosition = () => {
          if (scrollFrame === undefined) return;
          cancelAnimationFrame(scrollFrame);
          updateScrollPosition();
        };

        const finishDrag = (event) => {
          if (pointerId === undefined || (event.pointerId !== undefined && event.pointerId !== pointerId)) return;

          const activePointerId = pointerId;
          pointerId = undefined;
          if (slider.hasPointerCapture(activePointerId)) slider.releasePointerCapture(activePointerId);
          if (hasDragged) flushScrollPosition();
          slider.classList.remove('is-dragging');
          slider.style.scrollBehavior = inlineScrollBehavior;
          if (hasDragged) {
            slider.dataset.galleryDragEnded = 'true';
            pointerActionEnd = { x: event.clientX, y: event.clientY, time: performance.now() };
            onDragEnd({ startScrollLeft, deltaX });
          } else if (onTap) {
            pointerActionEnd = { x: event.clientX, y: event.clientY, time: performance.now() };
            onTap(pressTarget);
          }
        };

        slider.addEventListener('pointerdown', (event) => {
          if (!this.mql.matches || event.pointerType !== 'mouse' || event.button !== 0 || !canStart(event)) return;

          pointerActionEnd = undefined;
          delete slider.dataset.galleryDragEnded;
          pressTarget = event.target;
          this.pendingMediaId = undefined;
          inlineScrollBehavior = slider.style.scrollBehavior;
          slider.style.scrollBehavior = 'auto';
          slider.scrollTo({ left: slider.scrollLeft, behavior: 'auto' });
          onPointerDown();
          pointerId = event.pointerId;
          startX = event.clientX;
          startScrollLeft = slider.scrollLeft;
          deltaX = 0;
          pendingScrollLeft = startScrollLeft;
          hasDragged = false;
        });

        slider.addEventListener('pointermove', (event) => {
          if (event.pointerId !== pointerId) return;

          deltaX = event.clientX - startX;
          if (!hasDragged && Math.abs(deltaX) < 5) return;

          if (!hasDragged) {
            hasDragged = true;
            slider.setPointerCapture(pointerId);
          }
          event.preventDefault();
          slider.classList.add('is-dragging');
          pendingScrollLeft = startScrollLeft - deltaX;
          if (scrollFrame === undefined) scrollFrame = requestAnimationFrame(updateScrollPosition);
        });

        slider.addEventListener('pointerup', finishDrag);
        slider.addEventListener('pointercancel', finishDrag);
        slider.addEventListener('lostpointercapture', finishDrag);
        slider.addEventListener('dragstart', (event) => event.preventDefault());
        slider.addEventListener(
          'click',
          (event) => {
            if (!pointerActionEnd) return;

            const elapsed = performance.now() - pointerActionEnd.time;
            const distance = Math.hypot(event.clientX - pointerActionEnd.x, event.clientY - pointerActionEnd.y);
            pointerActionEnd = undefined;
            if (elapsed > 250 || distance > 12) return;

            event.preventDefault();
            event.stopImmediatePropagation();
            delete slider.dataset.galleryDragEnded;
          },
          true
        );
      }

      onSlideChanged(event) {
        const activeMedia = event.detail.currentElement;
        if (!activeMedia) return;

        // A smooth programmatic scroll can emit late slideChanged events. Ignore
        // events from an interrupted navigation so they cannot select an older
        // thumbnail and visually pull the gallery backwards.
        if (this.pendingMediaId && activeMedia.dataset.mediaId !== this.pendingMediaId) return;
        this.pendingMediaId = undefined;

        this.elements.viewer.querySelectorAll('[data-media-id]').forEach((element) => {
          element.classList.remove('is-active');
        });
        activeMedia.classList.add('is-active');
        this.playActiveMedia(activeMedia);

        const thumbnail = this.elements.thumbnails.querySelector(
          `[data-target="${activeMedia.dataset.mediaId}"]`
        );
        const shouldPreserveThumbnailScroll = this.thumbnailPointerActive || this.preserveThumbnailScroll;
        this.setActiveThumbnail(thumbnail, !shouldPreserveThumbnailScroll);
        if (!this.thumbnailPointerActive) this.preserveThumbnailScroll = false;
      }

      setActiveMedia(mediaId, prepend) {
        const activeMedia = this.elements.viewer.querySelector(`[data-media-id="${mediaId}"]`);
        if (!activeMedia) return;

        this.pendingMediaId = mediaId;
        this.preserveThumbnailScroll = false;
        this.elements.viewer.querySelectorAll('[data-media-id]').forEach((element) => {
          element.classList.remove('is-active');
        });
        activeMedia.classList.add('is-active');

        if (prepend) {
          activeMedia.parentElement.prepend(activeMedia);
          if (this.elements.thumbnails) {
            const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`);
            if (activeThumbnail) activeThumbnail.parentElement.prepend(activeThumbnail);
          }
          if (this.elements.viewer.slider) this.elements.viewer.resetPages();
        }

        this.preventStickyHeader();
        requestAnimationFrame(() => {
          if (this.elements.thumbnails) {
            activeMedia.parentElement.scrollTo({ left: activeMedia.offsetLeft });
          }
          if (!this.elements.thumbnails || this.dataset.desktopLayout === 'stacked') {
            activeMedia.scrollIntoView({ behavior: 'smooth' });
          }
        });
        this.playActiveMedia(activeMedia);

        if (!this.elements.thumbnails) return;
        const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`);
        if (!activeThumbnail) return;
        this.setActiveThumbnail(activeThumbnail);
        this.announceLiveRegion(activeMedia, activeThumbnail.dataset.mediaPosition);
      }

      setActiveThumbnail(thumbnail, scrollIntoView = true) {
        if (!this.elements.thumbnails || !thumbnail) return;

        this.elements.thumbnails
          .querySelectorAll('button')
          .forEach((element) => element.removeAttribute('aria-current'));
        thumbnail.querySelector('button').setAttribute('aria-current', true);
        if (!scrollIntoView || this.elements.thumbnails.isSlideVisible(thumbnail, 10)) return;

        this.elements.thumbnails.slider.scrollTo({ left: thumbnail.offsetLeft });
      }

      announceLiveRegion(activeItem, position) {
        const image = activeItem.querySelector('.product__modal-opener--image img');
        if (!image) return;
        image.onload = () => {
          this.elements.liveRegion.setAttribute('aria-hidden', false);
          this.elements.liveRegion.innerHTML = window.accessibilityStrings.imageAvailable.replace('[index]', position);
          setTimeout(() => {
            this.elements.liveRegion.setAttribute('aria-hidden', true);
          }, 2000);
        };
        image.src = image.src;
      }

      playActiveMedia(activeItem) {
        window.pauseAllMedia();
        const deferredMedia = activeItem.querySelector('.deferred-media');
        if (deferredMedia) deferredMedia.loadContent(false);
      }

      preventStickyHeader() {
        this.stickyHeader = this.stickyHeader || document.querySelector('sticky-header');
        if (!this.stickyHeader) return;
        this.stickyHeader.dispatchEvent(new Event('preventHeaderReveal'));
      }

      removeListSemantic() {
        if (!this.elements.viewer.slider) return;
        this.elements.viewer.slider.setAttribute('role', 'presentation');
        this.elements.viewer.sliderItems.forEach((slide) => slide.setAttribute('role', 'presentation'));
      }

      updateListSemantic() {
        if (!this.elements.viewer.slider || !this.dataset.desktopLayout.includes('thumbnail')) return;

        const role = this.mql.matches ? 'presentation' : 'list';
        const slideRole = this.mql.matches ? 'presentation' : 'listitem';
        this.elements.viewer.slider.setAttribute('role', role);
        this.elements.viewer.sliderItems.forEach((slide) => slide.setAttribute('role', slideRole));
      }
    }
  );
}
