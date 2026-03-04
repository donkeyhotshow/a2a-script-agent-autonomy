/**
 * iPhone/iMac Interactive Features
 * Enhanced JavaScript for iPhone/iMac design interactions
 */

class iPhoneImacInteractions {
    constructor() {
        this.init();
    }

    init() {
        this.setupStatusBar();
        this.setupWindowControls();
        this.setupEnhancedButtons();
        this.setupEnhancedInputs();
        this.setupGestures();
        this.setupAccessibility();
        this.setupDarkModeToggle();
        this.setupToasts();
        this.setupModals();
        this.setupProgressBars();
        this.setupSwitches();
        this.setupSegmentedControls();
        this.setupScrollEnhancements();
        this.setupFocusManagement();
        this.setupKeyboardShortcuts();
    }

    // Enhanced Status Bar with Time and Battery
    setupStatusBar() {
        const statusBar = document.createElement('div');
        statusBar.className = 'status-bar';
        statusBar.innerHTML = `
            <div class="status-bar-left">
                <div class="time-display">9:41 AM</div>
                <div class="network-status">
                    <div class="wifi-icon"></div>
                    <div class="cellular-icon"></div>
                </div>
            </div>
            <div class="status-tray" data-role="status-tray">
                <div class="status-tray-drop-target" data-role="status-tray-drop" aria-hidden="true"></div>
                <div class="status-tray-icons" data-role="status-tray-icons" aria-label="Panel tray"></div>
                <span class="status-tray-label">Taskbar</span>
            </div>
            <div class="status-bar-right">
                <div class="battery-icon">
                    <div class="battery-level"></div>
                </div>
                <div class="signal-strength">100%</div>
            </div>
        `;
        document.body.appendChild(statusBar);

        // Update time every minute
        setInterval(() => {
            const now = new Date();
            const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
            const timeDisplay = document.querySelector('.time-display');
            if (timeDisplay) {
                timeDisplay.textContent = timeString;
            }
        }, 60000);

        // Update battery level simulation
        setInterval(() => {
            const batteryLevel = Math.floor(Math.random() * 20) + 80; // 80-100%
            const batteryBar = document.querySelector('.battery-level');
            if (batteryBar) {
                batteryBar.style.width = batteryLevel + '%';
                batteryBar.style.background = batteryLevel > 20 ? '#ffffff' : '#ff3b30';
            }
        }, 30000);
    }

    // Enhanced Mac-style Window Controls
    setupWindowControls() {
        const windowControls = document.querySelector('.window-controls');
        if (!windowControls) return;

        const controls = windowControls.querySelectorAll('.window-control');
        
        controls.forEach(control => {
            control.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Haptic feedback simulation
                this.simulateHapticFeedback();
                
                // Visual feedback
                control.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    control.style.transform = '';
                }, 100);

                // Handle different control actions
                if (control.classList.contains('close')) {
                    this.handleWindowClose();
                } else if (control.classList.contains('minimize')) {
                    this.handleWindowMinimize();
                } else if (control.classList.contains('maximize')) {
                    this.handleWindowMaximize();
                }
            });

            // Hover effects
            control.addEventListener('mouseenter', () => {
                this.playSound('hover');
            });
        });
    }

    handleWindowClose() {
        // Simulate closing window with animation
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            appContainer.style.transform = 'scale(0)';
            appContainer.style.opacity = '0';
            setTimeout(() => {
                // Don't actually close, just show message
                this.showToast('Window close action simulated', 'info');
                appContainer.style.transform = 'scale(1)';
                appContainer.style.opacity = '1';
            }, 300);
        }
    }

    handleWindowMinimize() {
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            appContainer.style.transform = 'translateY(100vh)';
            setTimeout(() => {
                this.showToast('Window minimized', 'info');
                appContainer.style.transform = 'translateY(0)';
            }, 500);
        }
    }

    handleWindowMaximize() {
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            appContainer.style.transform = 'scale(1.05)';
            setTimeout(() => {
                this.showToast('Window maximized', 'info');
                appContainer.style.transform = 'scale(1)';
            }, 300);
        }
    }

    // Enhanced Button Interactions
    setupEnhancedButtons() {
        const buttons = document.querySelectorAll('.btn, .header-btn');
        
        buttons.forEach(btn => {
            // Add ripple effect
            btn.addEventListener('click', (e) => {
                this.createRipple(e, btn);
                this.simulateHapticFeedback();
                this.playSound('click');
            });

            // Hover effects
            btn.addEventListener('mouseenter', () => {
                this.playSound('hover');
            });
        });
    }

    createRipple(event, element) {
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        const ripple = document.createElement('span');
        ripple.style.position = 'absolute';
        ripple.style.borderRadius = '50%';
        ripple.style.background = 'rgba(255, 255, 255, 0.6)';
        ripple.style.transform = 'scale(0)';
        ripple.style.animation = 'ripple 0.6s linear';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.style.width = size + 'px';
        ripple.style.height = size + 'px';
        ripple.style.pointerEvents = 'none';

        // Add CSS animation if not exists
        if (!document.getElementById('ripple-animation')) {
            const style = document.createElement('style');
            style.id = 'ripple-animation';
            style.textContent = `
                @keyframes ripple {
                    to {
                        transform: scale(4);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        element.style.position = 'relative';
        element.style.overflow = 'hidden';
        element.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    // Enhanced Input Interactions
    setupEnhancedInputs() {
        const inputs = document.querySelectorAll('.form-input, .header-input');
        
        inputs.forEach(input => {
            // Focus effects
            input.addEventListener('focus', () => {
                input.parentElement?.classList.add('focused');
                this.playSound('focus');
            });

            input.addEventListener('blur', () => {
                input.parentElement?.classList.remove('focused');
            });

            // Typing effects
            input.addEventListener('input', () => {
                if (input.value.length > 0) {
                    input.classList.add('has-value');
                } else {
                    input.classList.remove('has-value');
                }
            });
        });
    }

    // Enhanced Gestures
    setupGestures() {
        // Swipe to dismiss panels
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;

        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, {passive: true});

        document.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            handleGesture();
        }, {passive: true});

        function handleGesture() {
            const diffX = touchStartX - touchEndX;
            const diffY = touchStartY - touchEndY;

            // Horizontal swipe
            if (Math.abs(diffX) > Math.abs(diffY)) {
                if (diffX > 50) {
                    // Swipe left - dismiss panel
                    const activePanel = document.querySelector('.pui-panel.active');
                    if (activePanel) {
                        activePanel.style.transform = 'translateX(100%)';
                        setTimeout(() => {
                            activePanel.style.display = 'none';
                        }, 300);
                    }
                } else if (diffX < -50) {
                    // Swipe right - show panel
                    const hiddenPanel = document.querySelector('.pui-panel[style*="display: none"]');
                    if (hiddenPanel) {
                        hiddenPanel.style.display = 'block';
                        hiddenPanel.style.transform = 'translateX(100%)';
                        setTimeout(() => {
                            hiddenPanel.style.transform = 'translateX(0)';
                        }, 10);
                    }
                }
            }
        }

        // Double-tap to refresh
        let lastTap = 0;
        document.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            if (tapLength < 300 && tapLength > 0) {
                this.handleRefresh();
                e.preventDefault();
            }
            lastTap = currentTime;
        }, {passive: true});
    }

    handleRefresh() {
        const refreshIndicator = document.createElement('div');
        refreshIndicator.className = 'pull-to-refresh pulling';
        refreshIndicator.innerHTML = '⟳ Refreshing...';
        document.body.appendChild(refreshIndicator);

        setTimeout(() => {
            refreshIndicator.remove();
            this.showToast('Page refreshed', 'success');
        }, 1000);
    }

    // Enhanced Accessibility
    setupAccessibility() {
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeActiveModal();
            } else if (e.key === 'Enter' && e.target.tagName === 'BUTTON') {
                e.target.click();
            } else if (e.key === 'Tab') {
                this.handleTabNavigation(e);
            }
        });

        // Screen reader improvements
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => {
            if (!btn.getAttribute('aria-label')) {
                btn.setAttribute('aria-label', btn.textContent || 'Button');
            }
        });
    }

    closeActiveModal() {
        const modal = document.querySelector('.modal-overlay.active');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    }

    handleTabNavigation(e) {
        const focusableElements = document.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const index = Array.from(focusableElements).indexOf(document.activeElement);
        
        if (e.shiftKey) {
            // Shift + Tab
            const prevElement = focusableElements[index - 1] || focusableElements[focusableElements.length - 1];
            prevElement.focus();
        } else {
            // Tab
            const nextElement = focusableElements[index + 1] || focusableElements[0];
            nextElement.focus();
        }
        
        e.preventDefault();
    }

    // Dark Mode Toggle
    setupDarkModeToggle() {
        // Create dark mode toggle if not exists
        if (!document.querySelector('.dark-mode-toggle')) {
            const toggleContainer = document.createElement('div');
            toggleContainer.className = 'dark-mode-toggle';
            toggleContainer.innerHTML = `
                <label class="ios-switch" id="dark-mode-switch">
                    <input type="checkbox" aria-label="Toggle dark mode">
                </label>
                <span class="toggle-label">Dark Mode</span>
            `;
            
            // Add to header or create floating button
            const header = document.querySelector('.app-header');
            if (header) {
                header.appendChild(toggleContainer);
            } else {
                document.body.appendChild(toggleContainer);
            }
        }

        const switchInput = document.querySelector('#dark-mode-switch input');
        if (switchInput) {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            switchInput.checked = prefersDark;

            switchInput.addEventListener('change', (e) => {
                const isDark = e.target.checked;
                document.body.classList.toggle('dark-mode', isDark);
                localStorage.setItem('dark-mode', isDark ? 'enabled' : 'disabled');
                this.playSound('toggle');
                this.showToast(isDark ? 'Dark mode enabled' : 'Light mode enabled', 'info');
            });
        }
    }

    // Enhanced Toast System
    setupToasts() {
        this.toastContainer = document.createElement('div');
        this.toastContainer.className = 'toast-container';
        document.body.appendChild(this.toastContainer);
    }

    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        this.toastContainer.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, duration);
    }

    // Enhanced Modal System
    setupModals() {
        // Add modal overlay
        this.modalOverlay = document.createElement('div');
        this.modalOverlay.className = 'modal-overlay';
        document.body.appendChild(this.modalOverlay);
    }

    showModal(content, title = 'Dialog') {
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.innerHTML = `
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" aria-label="Close">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary modal-cancel">Cancel</button>
                <button class="btn btn-primary modal-confirm">OK</button>
            </div>
        `;

        this.modalOverlay.innerHTML = '';
        this.modalOverlay.appendChild(modalContent);
        this.modalOverlay.classList.add('active');

        // Add event listeners
        const closeBtn = modalContent.querySelector('.modal-close');
        const cancelBtn = modalContent.querySelector('.modal-cancel');
        const confirmBtn = modalContent.querySelector('.modal-confirm');

        const closeModal = () => {
            this.modalOverlay.classList.remove('active');
            setTimeout(() => {
                this.modalOverlay.innerHTML = '';
            }, 300);
        };

        closeBtn?.addEventListener('click', closeModal);
        cancelBtn?.addEventListener('click', closeModal);
        confirmBtn?.addEventListener('click', () => {
            this.showToast('Action confirmed', 'success');
            closeModal();
        });

        // Click outside to close
        this.modalOverlay.addEventListener('click', (e) => {
            if (e.target === this.modalOverlay) {
                closeModal();
            }
        });
    }

    // Enhanced Progress Bars
    setupProgressBars() {
        const progressBars = document.querySelectorAll('.mac-progress');
        
        progressBars.forEach(progress => {
            const bar = progress.querySelector('.mac-progress-bar');
            if (bar) {
                // Animate progress bar
                const targetWidth = bar.style.width || '50%';
                bar.style.width = '0%';
                
                setTimeout(() => {
                    bar.style.width = targetWidth;
                }, 100);
            }
        });
    }

    // Enhanced Switches
    setupSwitches() {
        const switches = document.querySelectorAll('.ios-switch');
        
        switches.forEach(switchEl => {
            const input = switchEl.querySelector('input');
            if (input) {
                switchEl.addEventListener('click', () => {
                    input.checked = !input.checked;
                    switchEl.classList.toggle('checked', input.checked);
                    this.playSound('toggle');
                    this.simulateHapticFeedback();
                });
            }
        });
    }

    // Enhanced Segmented Controls
    setupSegmentedControls() {
        const segmentedControls = document.querySelectorAll('.ios-segmented');
        
        segmentedControls.forEach(control => {
            const segments = control.querySelectorAll('.ios-segment');
            
            segments.forEach(segment => {
                segment.addEventListener('click', () => {
                    // Remove active class from all segments
                    segments.forEach(s => s.classList.remove('active'));
                    
                    // Add active class to clicked segment
                    segment.classList.add('active');
                    
                    this.playSound('click');
                    this.simulateHapticFeedback();
                });
            });
        });
    }

    // Enhanced Scroll Behavior
    setupScrollEnhancements() {
        // Smooth scroll with momentum
        let isScrolling = false;
        let scrollTimeout;
        
        window.addEventListener('scroll', () => {
            isScrolling = true;
            
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                isScrolling = false;
            }, 100);
        });

        // Scroll to top button
        const scrollTopBtn = document.createElement('button');
        scrollTopBtn.className = 'scroll-top-btn';
        scrollTopBtn.innerHTML = '↑';
        scrollTopBtn.title = 'Scroll to top';
        scrollTopBtn.style.display = 'none';
        
        document.body.appendChild(scrollTopBtn);

        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                scrollTopBtn.style.display = 'block';
            } else {
                scrollTopBtn.style.display = 'none';
            }
        });

        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // Enhanced Focus Management
    setupFocusManagement() {
        // Focus ring animation
        document.addEventListener('focusin', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') {
                e.target.classList.add('focused');
            }
        });

        document.addEventListener('focusout', (e) => {
            e.target.classList.remove('focused');
        });
    }

    // Enhanced Keyboard Shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K: Focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.querySelector('.header-input');
                if (searchInput) {
                    searchInput.focus();
                }
            }
            
            // Ctrl/Cmd + N: New action
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.showToast('New action shortcut', 'info');
            }
            
            // Ctrl/Cmd + S: Save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.showToast('Save action', 'info');
            }
        });
    }

    // Sound Effects
    playSound(type) {
        // Only play sounds if user hasn't disabled them
        if (localStorage.getItem('disable-sounds') === 'true') return;

        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            switch (type) {
                case 'click':
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
                    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                    oscillator.start();
                    oscillator.stop(audioContext.currentTime + 0.1);
                    break;
                case 'hover':
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(500, audioContext.currentTime + 0.05);
                    gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
                    oscillator.start();
                    oscillator.stop(audioContext.currentTime + 0.05);
                    break;
                case 'toggle':
                    oscillator.type = 'square';
                    oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
                    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                    oscillator.start();
                    oscillator.stop(audioContext.currentTime + 0.1);
                    break;
                case 'focus':
                    oscillator.type = 'triangle';
                    oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.05);
                    gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
                    oscillator.start();
                    oscillator.stop(audioContext.currentTime + 0.05);
                    break;
            }
        } catch (error) {
            // AudioContext not supported or blocked
            console.log('Sound effect not available:', type);
        }
    }

    // Haptic Feedback Simulation
    simulateHapticFeedback() {
        // Only simulate if device supports vibration
        if ('vibrate' in navigator) {
            navigator.vibrate(50); // 50ms vibration
        }
        
        // Visual feedback
        document.body.style.transform = 'scale(0.995)';
        setTimeout(() => {
            document.body.style.transform = 'scale(1)';
        }, 50);
    }

    // Utility Methods
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
            touchSupport: 'ontouchstart' in window,
            screen: {
                width: screen.width,
                height: screen.height,
                availWidth: screen.availWidth,
                availHeight: screen.availHeight,
                pixelDepth: screen.pixelDepth
            }
        };
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.iphoneImacInteractions = new iPhoneImacInteractions();
    
    // Expose to window for debugging
    window.showModal = (content, title) => {
        window.iphoneImacInteractions.showModal(content, title);
    };
    
    window.showToast = (message, type) => {
        window.iphoneImacInteractions.showToast(message, type);
    };
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = iPhoneImacInteractions;
}
