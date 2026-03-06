/**
 * Mobile-specific composable
 * Handles touch gestures, virtual keyboard, and responsive detection
 */

import { ref, computed, onMounted, onUnmounted } from 'vue';

export interface MobileOptions {
  touchTargetMin?: number;
  enableGestures?: boolean;
}

export function useMobile(options: MobileOptions = {}) {
  const { touchTargetMin = 44, enableGestures = true } = options;

  // Reactive state
  const isMobile = ref(false);
  const isTablet = ref(false);
  const isDesktop = ref(true);
  const isTouch = ref(false);
  const isKeyboardOpen = ref(false);
  const viewportHeight = ref(window.innerHeight);
  const sidebarOpen = ref(false);

  // Computed
  const touchTargetSize = computed(() => {
    return isTouch.value ? Math.max(touchTargetMin, 48) : touchTargetMin;
  });

  const safeAreaInsets = computed(() => {
    // Check for CSS env support
    const safeAreaTop = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--safe-area-top') || '0'
    );
    const safeAreaBottom = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--safe-area-bottom') || '0'
    );
    return { top: safeAreaTop, bottom: safeAreaBottom };
  });

  // Breakpoint detection
  const checkBreakpoints = () => {
    const width = window.innerWidth;
    isMobile.value = width < 768;
    isTablet.value = width >= 768 && width < 1024;
    isDesktop.value = width >= 1024;
  };

  // Touch detection
  const checkTouch = () => {
    isTouch.value = window.matchMedia('(pointer: coarse)').matches;
  };

  // Virtual keyboard detection
  const detectKeyboard = () => {
    const initialHeight = window.innerHeight;
    
    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const heightDiff = initialHeight - currentHeight;
      
      // If height decreased by more than 150px, keyboard is likely open
      isKeyboardOpen.value = heightDiff > 150;
      viewportHeight.value = currentHeight;
      
      // Emit event for components to handle
      document.body.classList.toggle('keyboard-open', isKeyboardOpen.value);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  };

  // Touch gestures
  const touchState = {
    startX: 0,
    startY: 0,
    startTime: 0,
  };

  const swipeThreshold = 50;
  const swipeTimeout = 300;

  const onTouchStart = (e: TouchEvent) => {
    if (!enableGestures) return;
    
    const touch = e.touches[0];
    touchState.startX = touch.clientX;
    touchState.startY = touch.clientY;
    touchState.startTime = Date.now();
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (!enableGestures) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchState.startX;
    const deltaY = touch.clientY - touchState.startY;
    const deltaTime = Date.now() - touchState.startTime;

    // Only process quick swipes
    if (deltaTime > swipeTimeout) return;

    // Horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > swipeThreshold) {
      if (deltaX > 0) {
        // Swipe right - open sidebar
        if (touchState.startX < 50) {
          sidebarOpen.value = true;
        }
      } else {
        // Swipe left - close sidebar
        sidebarOpen.value = false;
      }
    }
  };

  // Double tap to zoom prevention
  let lastTapTime = 0;
  const onTouchTap = (e: TouchEvent) => {
    const currentTime = Date.now();
    const tapInterval = currentTime - lastTapTime;
    
    if (tapInterval < 300 && tapInterval > 0) {
      // Double tap detected - prevent zoom
      e.preventDefault();
    }
    
    lastTapTime = currentTime;
  };

  // Pull to refresh
  let pullStartY = 0;
  let isPulling = false;
  const pullThreshold = 80;
  const isPullingDown = ref(false);
  const pullProgress = ref(0);

  const onPullStart = (e: TouchEvent) => {
    // Only enable at top of page
    if (window.scrollY === 0) {
      pullStartY = e.touches[0].clientY;
      isPulling = true;
    }
  };

  const onPullMove = (e: TouchEvent) => {
    if (!isPulling) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - pullStartY;
    
    if (deltaY > 0) {
      isPullingDown.value = true;
      pullProgress.value = Math.min(deltaY / pullThreshold, 1);
      e.preventDefault();
    }
  };

  const onPullEnd = () => {
    if (pullProgress.value >= 1) {
      // Trigger refresh
      window.location.reload();
    }
    isPulling = false;
    isPullingDown.value = false;
    pullProgress.value = 0;
  };

  // Lifecycle
  let keyboardCleanup: (() => void) | null = null;

  onMounted(() => {
    checkBreakpoints();
    checkTouch();
    keyboardCleanup = detectKeyboard();

    // Event listeners
    window.addEventListener('resize', checkBreakpoints);
    
    if (enableGestures) {
      document.addEventListener('touchstart', onTouchStart, { passive: true });
      document.addEventListener('touchend', onTouchEnd, { passive: true });
      document.addEventListener('touchstart', onTouchTap, { passive: false });
      
      // Pull to refresh
      document.addEventListener('touchstart', onPullStart, { passive: true });
      document.addEventListener('touchmove', onPullMove, { passive: false });
      document.addEventListener('touchend', onPullEnd, { passive: true });
    }
  });

  onUnmounted(() => {
    window.removeEventListener('resize', checkBreakpoints);
    keyboardCleanup?.();
    
    if (enableGestures) {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchstart', onTouchTap);
      document.removeEventListener('touchstart', onPullStart);
      document.removeEventListener('touchmove', onPullMove);
      document.removeEventListener('touchend', onPullEnd);
    }
  });

  // Methods
  const toggleSidebar = () => {
    sidebarOpen.value = !sidebarOpen.value;
  };

  const closeSidebar = () => {
    sidebarOpen.value = false;
  };

  return {
    // State
    isMobile,
    isTablet,
    isDesktop,
    isTouch,
    isKeyboardOpen,
    viewportHeight,
    sidebarOpen,
    isPullingDown,
    pullProgress,
    
    // Computed
    touchTargetSize,
    safeAreaInsets,
    
    // Methods
    toggleSidebar,
    closeSidebar,
    checkBreakpoints,
  };
}

// Standalone composable for swipe detection
export function useSwipe(
  element: HTMLElement | null,
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeUp?: () => void,
  onSwipeDown?: () => void
) {
  if (!element) return;

  let startX = 0;
  let startY = 0;
  const threshold = 50;

  const handleTouchStart = (e: TouchEvent) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: TouchEvent) => {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - startX;
    const deltaY = endY - startY;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
    } else if (Math.abs(deltaY) > threshold) {
      if (deltaY > 0) {
        onSwipeDown?.();
      } else {
        onSwipeUp?.();
      }
    }
  };

  element.addEventListener('touchstart', handleTouchStart, { passive: true });
  element.addEventListener('touchend', handleTouchEnd, { passive: true });

  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchend', handleTouchEnd);
  };
}
