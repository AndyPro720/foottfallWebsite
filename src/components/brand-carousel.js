export function initBrandCarousel() {
  const track = document.querySelector('.brands__track');

  if (!track || track.children.length <= 3) {
    return;
  }

  const step = () => {
    const firstItem = track.firstElementChild;
    if (!firstItem) {
      return;
    }

    const gap = parseFloat(window.getComputedStyle(track).columnGap) || 0;
    const distance = firstItem.getBoundingClientRect().width + gap;

    track.scrollBy({ left: distance, behavior: 'smooth' });

    window.setTimeout(() => {
      if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 2) {
        track.scrollTo({ left: 0, behavior: 'smooth' });
      }
    }, 650);
  };

  window.setInterval(step, 2800);
}
