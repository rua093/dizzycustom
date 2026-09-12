if (!customElements.get('media-gallery')) {
  customElements.define(
    'media-gallery',
    class MediaGallery extends HTMLElement {
      constructor() {
        super();
        this.elements = {
          liveRegion: this.querySelector('[id^="GalleryStatus"]'),
          viewer: this.querySelector('[id^="GalleryViewer"]'),
          thumbnails: this.querySelector('[id^="GalleryThumbnails"]'),
        };
        this.mql = window.matchMedia('(min-width: 750px)');
        this.enableDesktopViewerDrag();
        if (!this.elements.thumbnails) return;

        this.elements.viewer.addEventListener('slideChanged', debounce(this.onSlideChanged.bind(this), 500));
        this.elements.thumbnails.querySelectorAll('[data-target]').forEach((mediaToSwitch) => {
          mediaToSwitch
            .querySelector('button')
            .addEventListener('click', this.setActiveMedia.bind(this, mediaToSwitch.dataset.target, false));
        });
        this.enableDesktopThumbnailNavigation();
        if (this.dataset.desktopLayout.includes('thumbnail') && this.mql.matches) this.removeListSemantic();
      }

      enableDesktopViewerDrag() {
        const slider = this.elements.viewer?.querySelector('[id^="Slider-Gallery"]');
        if (!slider || !this.dataset.desktopLayout.includes('thumbnail')) return;

        let pointerId;
        let startX = 0;
        let startScrollLeft = 0;
        let lastDistance = 0;
        let hasDragged = false;

        const finishDrag = (event) => {
          if (pointerId === undefined) return;
          if (event.pointerId !== undefined && event.pointerId !== pointerId) return;
          pointerId = undefined;
          slider.classList.remove('is-dragging');

          if (!hasDragged) return;
          const visibleSlides = Array.from(slider.children).filter((slide) => slide.clientWidth > 0);
          if (!visibleSlides.length) return;
          const startSlide = visibleSlides.reduce((closest, slide) =>
            Math.abs(slide.offsetLeft - startScrollLeft) < Math.abs(closest.offsetLeft - startScrollLeft)
              ? slide
              : closest
          );
          const swipeThreshold = Math.min(slider.clientWidth * 0.2, 140);
          const startIndex = Math.max(visibleSlides.indexOf(startSlide), 0);
          const targetIndex =
            Math.abs(lastDistance) > swipeThreshold
              ? Math.min(Math.max(startIndex + (lastDistance < 0 ? 1 : -1), 0), visibleSlides.length - 1)
              : -1;
          const closestSlide = visibleSlides.reduce((closest, slide) =>
            Math.abs(slide.offsetLeft - slider.scrollLeft) < Math.abs(closest.offsetLeft - slider.scrollLeft)
              ? slide
              : closest
          );
          const targetSlide = targetIndex >= 0 ? visibleSlides[targetIndex] : closestSlide;
          slider.scrollTo({ left: targetSlide.offsetLeft });
        };

        slider.addEventListener('pointerdown', (event) => {
          if (!this.mql.matches || event.pointerType !== 'mouse' || event.button !== 0) return;
          if (event.target.closest('model-viewer, iframe')) return;

          event.preventDefault();
          pointerId = event.pointerId;
          startX = event.clientX;
          startScrollLeft = slider.scrollLeft;
          lastDistance = 0;
          hasDragged = false;
          slider.setPointerCapture(pointerId);
          slider.classList.add('is-dragging');
        });

        slider.addEventListener('pointermove', (event) => {
          if (event.pointerId !== pointerId) return;
          const distance = event.clientX - startX;
          lastDistance = distance;
          if (Math.abs(distance) > 5) hasDragged = true;
          if (!hasDragged) return;

          event.preventDefault();
          slider.scrollLeft = startScrollLeft - distance;
        });

        slider.addEventListener('pointerup', finishDrag);
        slider.addEventListener('pointercancel', finishDrag);
        slider.addEventListener('lostpointercapture', finishDrag);
        slider.addEventListener('dragstart', (event) => event.preventDefault());
        slider.addEventListener(
          'click',
          (event) => {
            if (!hasDragged) return;
            event.preventDefault();
            event.stopPropagation();
            hasDragged = false;
          },
          true
        );
      }

      enableDesktopThumbnailNavigation() {
        const thumbnailSlider = this.elements.thumbnails?.querySelector('[id^="Slider-Thumbnails"]');
        if (!thumbnailSlider || !this.dataset.desktopLayout.includes('thumbnail')) return;

        let pointerId;
        let startX = 0;
        let startScrollLeft = 0;
        let lastDistance = 0;
        let hasDragged = false;

        const finishDrag = (event) => {
          if (pointerId === undefined) return;
          if (event.pointerId !== undefined && event.pointerId !== pointerId) return;
          pointerId = undefined;
          thumbnailSlider.classList.remove('is-dragging');

          if (!hasDragged) return;
          if (Math.abs(thumbnailSlider.scrollLeft - startScrollLeft) < 1) {
            this.selectAdjacentThumbnail(lastDistance < 0 ? 1 : -1);
            return;
          }

          const thumbnail = this.getThumbnailClosestToCenter();
          if (thumbnail?.dataset.target) this.setActiveMedia(thumbnail.dataset.target, false);
        };

        this.elements.thumbnails.querySelectorAll(':scope > .slider-button').forEach((button) => {
          button.addEventListener(
            'click',
            (event) => {
              if (!this.mql.matches) return;
              event.preventDefault();
              event.stopImmediatePropagation();
              this.selectAdjacentThumbnail(event.currentTarget.name === 'next' ? 1 : -1);
            },
            true
          );
        });

        thumbnailSlider.addEventListener('pointerdown', (event) => {
          if (!this.mql.matches || event.pointerType !== 'mouse' || event.button !== 0) return;
          if (event.target.closest('button')) return;

          pointerId = event.pointerId;
          startX = event.clientX;
          startScrollLeft = thumbnailSlider.scrollLeft;
          lastDistance = 0;
          hasDragged = false;
          thumbnailSlider.setPointerCapture(pointerId);
          thumbnailSlider.classList.add('is-dragging');
        });

        thumbnailSlider.addEventListener('pointermove', (event) => {
          if (event.pointerId !== pointerId) return;
          const distance = event.clientX - startX;
          lastDistance = distance;
          if (Math.abs(distance) > 5) hasDragged = true;
          if (!hasDragged) return;

          event.preventDefault();
          thumbnailSlider.scrollLeft = startScrollLeft - distance;
        });

        thumbnailSlider.addEventListener('pointerup', finishDrag);
        thumbnailSlider.addEventListener('pointercancel', finishDrag);
        thumbnailSlider.addEventListener('lostpointercapture', finishDrag);
        thumbnailSlider.addEventListener('dragstart', (event) => event.preventDefault());
        thumbnailSlider.addEventListener(
          'click',
          (event) => {
            if (!hasDragged) return;
            event.preventDefault();
            event.stopPropagation();
            hasDragged = false;
          },
          true
        );

        this.updateThumbnailNavigation();
      }

      getVisibleThumbnails() {
        return Array.from(this.elements.thumbnails?.querySelectorAll('[data-target]') || []).filter(
          (thumbnail) => thumbnail.clientWidth > 0
        );
      }

      getActiveThumbnail(visibleThumbnails = this.getVisibleThumbnails()) {
        return (
          visibleThumbnails.find((thumbnail) => thumbnail.querySelector('button[aria-current]')) ||
          visibleThumbnails.find(
            (thumbnail) =>
              thumbnail.dataset.target === this.elements.viewer.querySelector('.product__media-item.is-active')?.dataset.mediaId
          ) ||
          visibleThumbnails[0]
        );
      }

      getThumbnailClosestToCenter() {
        const thumbnailSlider = this.elements.thumbnails?.querySelector('[id^="Slider-Thumbnails"]');
        const visibleThumbnails = this.getVisibleThumbnails();
        if (!thumbnailSlider || !visibleThumbnails.length) return null;

        const sliderRect = thumbnailSlider.getBoundingClientRect();
        const sliderCenter = sliderRect.left + sliderRect.width / 2;

        return visibleThumbnails.reduce((closest, thumbnail) => {
          const thumbnailRect = thumbnail.getBoundingClientRect();
          const thumbnailCenter = thumbnailRect.left + thumbnailRect.width / 2;
          const closestRect = closest.getBoundingClientRect();
          const closestCenter = closestRect.left + closestRect.width / 2;

          return Math.abs(thumbnailCenter - sliderCenter) < Math.abs(closestCenter - sliderCenter)
            ? thumbnail
            : closest;
        });
      }

      selectAdjacentThumbnail(direction) {
        const visibleThumbnails = this.getVisibleThumbnails();
        if (!visibleThumbnails.length) return;

        const activeThumbnail = this.getActiveThumbnail(visibleThumbnails);
        const activeIndex = Math.max(visibleThumbnails.indexOf(activeThumbnail), 0);
        const nextIndex = Math.min(Math.max(activeIndex + direction, 0), visibleThumbnails.length - 1);
        const nextThumbnail = visibleThumbnails[nextIndex];

        if (!nextThumbnail || nextThumbnail === activeThumbnail) return;
        this.setActiveMedia(nextThumbnail.dataset.target, false);
      }

      updateThumbnailNavigation() {
        if (!this.elements.thumbnails || !this.mql.matches) return;

        const visibleThumbnails = this.getVisibleThumbnails();
        const activeThumbnail = this.getActiveThumbnail(visibleThumbnails);
        const activeIndex = visibleThumbnails.indexOf(activeThumbnail);
        const previousButton = this.elements.thumbnails.querySelector(':scope > .slider-button--prev');
        const nextButton = this.elements.thumbnails.querySelector(':scope > .slider-button--next');

        if (!previousButton || !nextButton || activeIndex < 0) return;
        previousButton.toggleAttribute('disabled', activeIndex <= 0);
        nextButton.toggleAttribute('disabled', activeIndex >= visibleThumbnails.length - 1);
      }

      onSlideChanged(event) {
        const activeMedia = event.detail.currentElement;
        if (!activeMedia) return;

        this.elements.viewer.querySelectorAll('[data-media-id]').forEach((element) => {
          element.classList.remove('is-active');
        });
        activeMedia.classList.add('is-active');
        this.playActiveMedia(activeMedia);

        const thumbnail = this.elements.thumbnails.querySelector(
          `[data-target="${activeMedia.dataset.mediaId}"]`
        );
        this.setActiveThumbnail(thumbnail);
      }

      setActiveMedia(mediaId, prepend) {
        const activeMedia = this.elements.viewer.querySelector(`[data-media-id="${mediaId}"]`);
        this.elements.viewer.querySelectorAll('[data-media-id]').forEach((element) => {
          element.classList.remove('is-active');
        });
        activeMedia.classList.add('is-active');

        if (prepend) {
          activeMedia.parentElement.prepend(activeMedia);
          if (this.elements.thumbnails) {
            const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`);
            activeThumbnail.parentElement.prepend(activeThumbnail);
          }
          if (this.elements.viewer.slider) this.elements.viewer.resetPages();
        }

        this.preventStickyHeader();
        window.setTimeout(() => {
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
        this.setActiveThumbnail(activeThumbnail);
        this.announceLiveRegion(activeMedia, activeThumbnail.dataset.mediaPosition);
      }

      setActiveThumbnail(thumbnail) {
        if (!this.elements.thumbnails || !thumbnail) return;

        this.elements.thumbnails
          .querySelectorAll('button')
          .forEach((element) => element.removeAttribute('aria-current'));
        thumbnail.querySelector('button').setAttribute('aria-current', true);
        this.updateThumbnailNavigation();
        if (this.elements.thumbnails.isSlideVisible(thumbnail, 10)) return;

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
    }
  );
}
