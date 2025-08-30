"use client"

import { useEffect } from 'react'

export function ModalCenteringFix() {
  useEffect(() => {
    // Function to force center any wallet modal
    const centerModal = () => {
      // Look for all possible modal containers
      const modalSelectors = [
        '.wallet-adapter-modal-wrapper:not([class*="radix"])',
        '.wallet-adapter-modal-wrapper[data-reach-dialog-overlay]:not([class*="radix"])',
        '.wallet-adapter-modal[role="dialog"]:not([class*="radix"])',
        '.wallet-adapter-modal-overlay',
        'div[class*="wallet-adapter"][class*="modal-overlay"]',
        'div[class*="wallet-adapter"][class*="modal-wrapper"]'
      ]
      
      modalSelectors.forEach(selector => {
        const modal = document.querySelector(selector) as HTMLElement
        if (modal && modal.style.display !== 'none') {
          // Force full screen overlay with flexbox centering
          modal.style.setProperty('position', 'fixed', 'important')
          modal.style.setProperty('top', '0', 'important')
          modal.style.setProperty('left', '0', 'important')
          modal.style.setProperty('right', '0', 'important')
          modal.style.setProperty('bottom', '0', 'important')
          modal.style.setProperty('width', '100vw', 'important')
          modal.style.setProperty('height', '100vh', 'important')
          modal.style.setProperty('display', 'flex', 'important')
          modal.style.setProperty('align-items', 'center', 'important')
          modal.style.setProperty('justify-content', 'center', 'important')
          // Slight dim without blur so content remains crisp
          modal.style.setProperty('background', 'rgba(0, 0, 0, 0.55)', 'important')
          modal.style.setProperty('z-index', '9999', 'important')
          modal.style.setProperty('backdrop-filter', 'none', 'important')
          
          // Find the actual modal content and center it
          const modalContent = modal.querySelector('.wallet-adapter-modal, .wallet-adapter-modal-wrapper [data-reach-dialog-content], .wallet-adapter-modal[role="dialog"]') as HTMLElement
          if (modalContent) {
            modalContent.style.setProperty('position', 'relative', 'important')
            modalContent.style.setProperty('top', 'auto', 'important')
            modalContent.style.setProperty('left', 'auto', 'important')
            modalContent.style.setProperty('transform', 'none', 'important')
            modalContent.style.setProperty('margin', '0 auto', 'important')
            modalContent.style.setProperty('right', 'auto', 'important')
            modalContent.style.setProperty('bottom', 'auto', 'important')
            modalContent.style.setProperty('max-width', '450px', 'important')
            modalContent.style.setProperty('width', '100%', 'important')
            modalContent.style.setProperty('max-height', '90vh', 'important')
            modalContent.style.setProperty('overflow-y', 'auto', 'important')
            
            // Force visibility
            modalContent.style.setProperty('opacity', '1', 'important')
            modalContent.style.setProperty('visibility', 'visible', 'important')
            modalContent.style.setProperty('display', 'block', 'important')
            modalContent.style.setProperty('background', 'white', 'important')
            modalContent.style.setProperty('z-index', '1', 'important')
            
            // Force visibility of all child elements
            const allElements = modalContent.querySelectorAll('*') as NodeListOf<HTMLElement>
            allElements.forEach(el => {
              el.style.setProperty('opacity', '1', 'important')
              el.style.setProperty('visibility', 'visible', 'important')
            })
          }
        }
      })
    }

    // Create a mutation observer to watch for modal creation
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element
              // Check if the added node is a modal or contains a modal
              if ((element.classList.contains('wallet-adapter-modal-wrapper') && !element.classList.contains('radix')) ||
                  element.querySelector('.wallet-adapter-modal-wrapper:not([class*="radix"])') ||
                  (element.getAttribute('data-reach-dialog-overlay') !== null && element.classList.contains('wallet-adapter-modal-wrapper') && !element.classList.contains('radix')) ||
                  element.querySelector('.wallet-adapter-modal-wrapper[data-reach-dialog-overlay]:not([class*="radix"])')) {
                // Small delay to allow the modal to fully render
                setTimeout(centerModal, 50)
              }
            }
          })
        }
        
        // Also check for attribute changes that might affect modal positioning
        if (mutation.type === 'attributes' && 
            mutation.target instanceof Element &&
            (mutation.target.classList.contains('wallet-adapter-modal-wrapper') && !mutation.target.classList.contains('radix') ||
             (mutation.target.getAttribute('data-reach-dialog-overlay') !== null && mutation.target.classList.contains('wallet-adapter-modal-wrapper') && !mutation.target.classList.contains('radix')))) {
          setTimeout(centerModal, 50)
        }
      })
    })

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    })

    // Also run center modal on any existing modals
    centerModal()

    // Run centering periodically as a fallback
    const intervalId = setInterval(centerModal, 500)

    // Cleanup
    return () => {
      observer.disconnect()
      clearInterval(intervalId)
    }
  }, [])

  return null // This component doesn't render anything
}
