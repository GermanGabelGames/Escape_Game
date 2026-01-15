// Copy to Clipboard Function
function copyToClipboard() {
    const ipText = document.getElementById('ipText').textContent;
    const ipBox = document.getElementById('ipBox');
    
    // Copy to clipboard
    navigator.clipboard.writeText(ipText).then(() => {
        // Visual feedback
        const originalText = ipBox.innerHTML;
        ipBox.innerHTML = '<span style="color: #00e6e6; font-weight: bold;">✓ Kopiert!</span>';
        
        // Reset nach 2 Sekunden
        setTimeout(() => {
            ipBox.innerHTML = originalText;
        }, 2000);
    }).catch(err => {
        // Fallback für ältere Browser
        const textArea = document.createElement('textarea');
        textArea.value = ipText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        ipBox.innerHTML = '<span style="color: #00e6e6; font-weight: bold;">✓ Kopiert!</span>';
        setTimeout(() => {
            location.reload();
        }, 2000);
    });
}

// Show Impressum Modal
function showImpressum() {
    const modal = document.getElementById('impressumModal');
    modal.classList.add('show');
}

// Show Datenschutz Modal
function showDatenschutz() {
    const modal = document.getElementById('datenschutzModal');
    modal.classList.add('show');
}

// Close Modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('show');
}

// Close modal wenn außerhalb geklickt wird
window.onclick = function(event) {
    const impressumModal = document.getElementById('impressumModal');
    const datenschutzModal = document.getElementById('datenschutzModal');
    
    if (event.target === impressumModal) {
        impressumModal.classList.remove('show');
    }
    if (event.target === datenschutzModal) {
        datenschutzModal.classList.remove('show');
    }
}

// Keyboard navigation
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const impressumModal = document.getElementById('impressumModal');
        const datenschutzModal = document.getElementById('datenschutzModal');
        impressumModal.classList.remove('show');
        datenschutzModal.classList.remove('show');
    }
});

// Smooth animations on page load
window.addEventListener('load', function() {
    const elements = document.querySelectorAll('.header, .info-card, .feature-card, .social-btn');
    elements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.animation = `fadeInUp 0.6s ease ${index * 0.1}s forwards`;
    });
});

// Add animation keyframe
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);
